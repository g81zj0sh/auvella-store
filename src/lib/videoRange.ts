/*
 * Byte-range serving for the site's videos (v198).
 *
 * Workers Static Assets ignore `Range` and always answer 200 with the whole
 * file (checked on the live site, 17 Oct 2026). iPhone Safari only plays a
 * video if the server answers byte ranges with 206 Partial Content, so the
 * hero videos were showing their posters on iPhones.
 *
 * Every <video> on the site points at /media/<file>.mp4 instead of
 * /assets/<file>.mp4. /media/ is not a static file, so the request reaches
 * the Worker (src/server.ts), which reads the built asset through the ASSETS
 * binding and streams back just the requested bytes.
 *
 * Cost: the file is streamed, never held in memory, and a request that
 * starts at byte 0 is piped straight through (no per-chunk JavaScript), so
 * this adds almost no CPU - the v196 edge cache exists because the Worker
 * was hitting its resource limits.
 */

const MEDIA_PATH = /^\/media\/([A-Za-z0-9_-]+\.mp4)$/;

type AssetsBinding = { fetch: (request: Request) => Promise<Response> };

/** "/assets/x-Hash.mp4" -> "/media/x-Hash.mp4". Anything else passes through. */
export function mediaUrl(assetUrl: string): string {
  if (assetUrl.startsWith("/assets/") && assetUrl.endsWith(".mp4")) {
    return "/media/" + assetUrl.slice("/assets/".length);
  }
  return assetUrl;
}

/** Parse a single `bytes=` range. null = ignore the header and send the whole file. */
export function parseRange(
  header: string | null,
  size: number,
): [number, number] | "unsatisfiable" | null {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m) return null; // multi-range or another unit
  const [, a, b] = m;
  if (a === "" && b === "") return null;
  if (a === "") {
    // suffix range: the last N bytes
    const n = Number(b);
    if (n === 0) return "unsatisfiable";
    return [Math.max(0, size - n), size - 1];
  }
  const start = Number(a);
  if (b !== "" && Number(b) < start) return null; // inverted
  if (start >= size) return "unsatisfiable";
  const end = b === "" ? size - 1 : Math.min(Number(b), size - 1);
  return [start, end];
}

function getAssets(request: Request, env: unknown): AssetsBinding | undefined {
  const fromArgs = (env as { ASSETS?: AssetsBinding } | undefined)?.ASSETS;
  if (fromArgs) return fromArgs;
  const fromReq = (
    request as unknown as { runtime?: { cloudflare?: { env?: { ASSETS?: AssetsBinding } } } }
  ).runtime?.cloudflare?.env?.ASSETS;
  if (fromReq) return fromReq;
  return (globalThis as unknown as { __env__?: { ASSETS?: AssetsBinding } }).__env__?.ASSETS;
}

/* File sizes, per Worker isolate. Static asset responses don't always carry
   Content-Length; when one doesn't, the file is counted once and remembered. */
const sizes = new Map<string, number>();

async function countBytes(body: ReadableStream<Uint8Array>): Promise<number> {
  const reader = body.getReader();
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return n;
    n += value.byteLength;
  }
}

/** Bytes [start, start + length) of `body`, without buffering the file. */
function sliceStream(
  body: ReadableStream<Uint8Array>,
  start: number,
  length: number,
): ReadableStream<Uint8Array> {
  const reader = body.getReader();
  let pos = 0;
  let sent = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        if (sent >= length) {
          controller.close();
          reader.cancel().catch(() => {});
          return;
        }
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
          return;
        }
        const chunkStart = pos;
        pos += value.byteLength;
        if (pos <= start) continue; // still before the range
        const from = Math.max(0, start - chunkStart);
        const to = Math.min(value.byteLength, from + (length - sent));
        sent += to - from;
        controller.enqueue(value.subarray(from, to));
        return;
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });
}

/** Give a stream an exact Content-Length (Workers' FixedLengthStream), so the
 *  browser gets a sized 206 instead of a chunked one. */
function withLength(stream: ReadableStream<Uint8Array>, length: number): ReadableStream<Uint8Array> {
  const FLS = (globalThis as unknown as {
    FixedLengthStream?: new (n: number) => { readable: ReadableStream<Uint8Array>; writable: WritableStream<Uint8Array> };
  }).FixedLengthStream;
  if (typeof FLS !== "function") return stream;
  const { readable, writable } = new FLS(length);
  stream.pipeTo(writable).catch(() => {});
  return readable;
}

/** Answer GET/HEAD /media/<file>.mp4, or return null for any other path. */
export async function serveMedia(request: Request, url: URL, env: unknown): Promise<Response | null> {
  const m = MEDIA_PATH.exec(url.pathname);
  if (!m) return null;

  const assets = getAssets(request, env);
  if (!assets) return new Response("Not found", { status: 404 });

  const assetUrl = new URL(`/assets/${m[1]}`, url.origin).toString();
  let upstream = await assets.fetch(new Request(assetUrl));
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

  let size = sizes.get(assetUrl);
  if (size === undefined) {
    const declared = Number(upstream.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > 0) {
      size = declared;
    } else {
      size = await countBytes(upstream.body);
      upstream = await assets.fetch(new Request(assetUrl));
      if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });
    }
    sizes.set(assetUrl, size);
  }
  const body = upstream.body as ReadableStream<Uint8Array>;

  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    // File names carry a content hash, same as /assets/*.
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);

  const range = parseRange(request.headers.get("range"), size);
  const [start, end] = Array.isArray(range) ? range : [0, size - 1];
  const length = end - start + 1;

  if (range === "unsatisfiable") {
    body.cancel().catch(() => {});
    headers.set("Content-Range", `bytes */${size}`);
    return new Response(null, { status: 416, headers });
  }

  const status = range ? 206 : 200;
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  headers.set("Content-Length", String(length));

  if (request.method === "HEAD") {
    body.cancel().catch(() => {});
    return new Response(null, { status, headers });
  }
  const out = start === 0 && length === size ? body : sliceStream(body, start, length);
  return new Response(withLength(out, length), { status, headers });
}
