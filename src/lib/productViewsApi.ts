/*
 * v208: real "people viewed this in the last 24 hours" counts (owner's ask,
 * after Gymshark's product page). Server side, used by server.ts only.
 *
 *   POST /api/views/<handle>  counts this visitor, then answers { count }
 *   GET  /api/views/<handle>  just answers { count }
 *
 * count = distinct visitors of that product page in the last 24 hours, kept
 * in Cloudflare D1 (binding VIEWS_DB, database "auvella-product-views").
 *
 * Honest by construction: a visitor is counted once per product however many
 * times they look, only from the page's own script (so crawlers that don't run
 * it never count), never for bots, headless browsers or Lighthouse, and never
 * from another site. Nothing is stored on the visitor's device. The visitor
 * key is an HMAC of IP + browser string under a server secret - it can't be
 * turned back into either - and rows are deleted after about two days.
 */

type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
};
type D1Database = { prepare(sql: string): D1Statement };
type ViewsEnv = { VIEWS_DB?: D1Database; SHOPIFY_CLIENT_SECRET?: string };

const PATH = /^\/api\/views\/([a-z0-9][a-z0-9-]{0,150})$/;
/** Ten-minute buckets; the window is the last 144 of them (24 hours). */
const BUCKET_MS = 10 * 60 * 1000;
const WINDOW = 144;
/** Rows older than this many buckets (~2 days) are deleted. */
const KEEP = 300;
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pagespeed|gtmetrix|python|curl|wget|httpclient/i;

let tableReady: Promise<unknown> | null = null;

function ensureTable(db: D1Database): Promise<unknown> {
  tableReady ??= db
    .prepare(
      `CREATE TABLE IF NOT EXISTS product_views (
         handle TEXT NOT NULL,
         bucket INTEGER NOT NULL,
         visitor TEXT NOT NULL,
         PRIMARY KEY (handle, bucket, visitor)
       ) WITHOUT ROWID`,
    )
    .run()
    .catch((error: unknown) => {
      tableReady = null;
      throw error;
    });
  return tableReady;
}

async function visitorKey(request: Request, secret: string): Promise<string> {
  const ip = request.headers.get("cf-connecting-ip") ?? "";
  const ua = request.headers.get("user-agent") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ip}|${ua}`));
  return [...new Uint8Array(mac).slice(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** The Worker's bindings, wherever this runtime hands them over (as videoRange's getAssets). */
function bindings(request: Request, env: unknown): ViewsEnv {
  const candidates = [
    env as ViewsEnv | undefined,
    (request as unknown as { runtime?: { cloudflare?: { env?: ViewsEnv } } }).runtime?.cloudflare?.env,
    (globalThis as unknown as { __env__?: ViewsEnv }).__env__,
  ];
  const db = candidates.find((c) => c?.VIEWS_DB)?.VIEWS_DB;
  const secret =
    candidates.find((c) => c?.SHOPIFY_CLIENT_SECRET)?.SHOPIFY_CLIENT_SECRET ??
    (typeof process !== "undefined" ? process.env?.SHOPIFY_CLIENT_SECRET : undefined);
  return { VIEWS_DB: db, SHOPIFY_CLIENT_SECRET: secret };
}

function sameSite(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

/** The answer for /api/views/<handle>, or null for any other path. */
export async function productViews(request: Request, url: URL, env: unknown): Promise<Response | null> {
  const match = url.pathname.match(PATH);
  if (!match) return null;
  if (request.method !== "GET" && request.method !== "POST") return json({ error: "method" }, 405);
  const { VIEWS_DB: db, SHOPIFY_CLIENT_SECRET: secret } = bindings(request, env);
  if (!db) return json({ count: 0 });
  const handle = match[1];
  const now = Math.floor(Date.now() / BUCKET_MS);

  try {
    await ensureTable(db);
    if (request.method === "POST") {
      const ua = request.headers.get("user-agent") ?? "";
      // Only this site's own page script counts a view - not bots, not
      // headless browsers, not a form or script on another site. (Compared
      // with the Host the browser asked for, not request.url: dev servers and
      // proxies rewrite the latter.)
      if (!BOT.test(ua) && sameSite(request)) {
        const visitor = await visitorKey(request, secret || "auvella-product-views");
        await db
          .prepare("INSERT OR IGNORE INTO product_views (handle, bucket, visitor) VALUES (?, ?, ?)")
          .bind(handle, now, visitor)
          .run();
        // Now and then, drop what's older than two days.
        if (Math.random() < 0.01) {
          await db.prepare("DELETE FROM product_views WHERE bucket < ?").bind(now - KEEP).run();
        }
      }
    }
    const row = await db
      .prepare("SELECT COUNT(DISTINCT visitor) AS n FROM product_views WHERE handle = ? AND bucket > ?")
      .bind(handle, now - WINDOW)
      .first<{ n: number }>();
    return json({ count: row?.n ?? 0 });
  } catch (error) {
    console.error("product views failed", error);
    return json({ count: 0 });
  }
}
