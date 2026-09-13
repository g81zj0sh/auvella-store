/*
 * Image backdrop sampling.
 *
 * Product photography doesn't share one backdrop: model shots sit on a grey
 * around #D6D4D5–#E1E1E3 and ghost shots on a near-white #FEFEFE, and those
 * drift slightly per shot. The PDP gallery uses object-contain, so whenever the
 * frame is a different shape to the image you see the site's cream through the
 * gap — a visible seam around the photo.
 *
 * Rather than hardcode a colour or re-cut every asset, we read the backdrop off
 * the image itself and paint the frame to match. Shopify's CDN serves
 * `access-control-allow-origin: *`, so the canvas stays untainted.
 */

import { BACKDROPS } from "./imageBackdrops";

export const DEFAULT_BACKDROP = "#F6F3EF";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function fileKey(url: string): string {
  const path = url.split("?")[0];
  return path.slice(path.lastIndexOf("/") + 1);
}

/** Small CDN rendition for sampling — the colour is a 64px median, so pulling
    the full-size asset into a canvas just to read its edges is pure waste. */
function sampleUrl(url: string): string {
  const [path, query] = url.split("?");
  const params = new URLSearchParams(query ?? "");
  params.set("width", "64");
  return `${path}?${params.toString()}`;
}

/** Colour known for this URL without any network — the build-time table first,
    then anything the runtime sampler has already resolved. Lets the first paint
    be correct and makes image swaps instant. */
export function cachedBackdrop(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return BACKDROPS[fileKey(url)] ?? cache.get(url);
}

export function sampleBackdrop(url: string): Promise<string> {
  const hit = cachedBackdrop(url);
  if (hit) return Promise.resolve(hit);

  const inflight = pending.get(url);
  if (inflight) return inflight;

  const job = new Promise<string>((resolve) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return resolve(DEFAULT_BACKDROP);
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = () => {
      try {
        // Downscale to a small square first: cheap to read back, and the
        // averaging smooths out JPEG noise in flat backdrop areas.
        const N = 64;
        const canvas = document.createElement("canvas");
        canvas.width = N;
        canvas.height = N;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(DEFAULT_BACKDROP);
        ctx.drawImage(img, 0, 0, N, N);

        const { data } = ctx.getImageData(0, 0, N, N);

        // Sample a ring just inside the edge — that band is backdrop in every
        // shot, since the subject is always framed with margin around it.
        const rs: number[] = [];
        const gs: number[] = [];
        const bs: number[] = [];
        const take = (x: number, y: number) => {
          const i = (y * N + x) * 4;
          rs.push(data[i]);
          gs.push(data[i + 1]);
          bs.push(data[i + 2]);
        };
        for (let x = 2; x < N - 2; x++) {
          take(x, 2);
          take(x, N - 3);
        }
        for (let y = 2; y < N - 2; y++) {
          take(2, y);
          take(N - 3, y);
        }

        // Median per channel, not mean: if hair, a shadow or a dark garment
        // clips the edge, the median ignores it where an average would be
        // dragged darker.
        const mid = (xs: number[]) => {
          xs.sort((a, b) => a - b);
          return xs[Math.floor(xs.length / 2)];
        };
        const hex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
        const colour = `#${hex(mid(rs))}${hex(mid(gs))}${hex(mid(bs))}`;

        cache.set(url, colour);
        resolve(colour);
      } catch {
        resolve(DEFAULT_BACKDROP);
      }
    };

    img.onerror = () => resolve(DEFAULT_BACKDROP);
    img.src = sampleUrl(url);
  });

  pending.set(url, job);
  job.then(() => pending.delete(url));
  return job;
}

/*
 * Garment-only ("ghost") shot detection.
 *
 * Model shots sit on the grey studio backdrop (~#D5D3D5–#DCDAE0); garment-only
 * shots sit on near-white (~#FEFEFE). That gap is wide and consistent — it held
 * on every image of the reference set — so the backdrop alone tells the two
 * apart without relying on filenames or a fixed shot count.
 *
 * Sampling uses a 64px CDN thumbnail, so classifying a whole grid costs about a
 * kilobyte per image rather than a full download.
 */

export function isGhostBackdrop(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return false;
  const r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return r >= 246 && g >= 246 && b >= 246 && spread <= 6;
}

/** Cheap CDN thumbnail of an image, for sampling only. */
export function thumbUrl(url: string, width = 64): string {
  if (!url) return url;
  return url + (url.includes("?") ? "&" : "?") + `width=${width}`;
}

/**
 * First garment-only shot in an ordered colour run, or null if there isn't one.
 * Resolves from cache instantly on repeat calls.
 */
export async function findGhost(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    try {
      const c = await sampleBackdrop(thumbUrl(url));
      if (isGhostBackdrop(c)) return url;
    } catch {
      /* keep looking */
    }
  }
  return null;
}

/** Median colour of the middle of the frame — the garment itself, ignoring the
    backdrop around it. Used to check a shot really is the colour we think. */
export async function sampleGarment(url: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const N = 64;
        const canvas = document.createElement("canvas");
        canvas.width = N;
        canvas.height = N;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, N, N);
        const { data } = ctx.getImageData(0, 0, N, N);
        const rs: number[] = [], gs: number[] = [], bs: number[] = [];
        for (let y = 18; y < 50; y++) {
          for (let x = 20; x < 44; x++) {
            const i = (y * N + x) * 4;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            // Skip backdrop pixels so a small garment can't be washed out by it.
            if (r > 240 && g > 240 && b > 240) continue;
            rs.push(r); gs.push(g); bs.push(b);
          }
        }
        if (rs.length < 40) return resolve(null);
        const mid = (xs: number[]) => { xs.sort((a, b) => a - b); return xs[Math.floor(xs.length / 2)]; };
        const hex = (n: number) => n.toString(16).padStart(2, "0");
        resolve(`#${hex(mid(rs))}${hex(mid(gs))}${hex(mid(bs))}`);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = thumbUrl(url);
  });
}

function dist(a: string, b: string): number {
  const p = (h: string) => {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Garment-only shot for a specific colour.
 *
 * Galleries aren't always cleanly grouped — some products had their later
 * colours uploaded interleaved by time rather than in colour blocks, so a
 * positional slice can hand back another colour's garment. This checks the
 * candidate actually looks like the colour on the swatch, and takes the closest
 * match rather than the first one found. Returns null rather than guessing, so
 * a hover shows nothing instead of the wrong colour.
 */
export async function findGhostForColor(
  urls: string[],
  expectedHex: string | null,
): Promise<string | null> {
  const ghosts: string[] = [];
  for (const url of urls) {
    try {
      if (isGhostBackdrop(await sampleBackdrop(thumbUrl(url)))) ghosts.push(url);
    } catch {
      /* skip */
    }
  }
  if (ghosts.length === 0) return null;
  if (!expectedHex) return ghosts[0];

  let best: string | null = null;
  let bestD = Infinity;
  for (const g of ghosts) {
    const c = await sampleGarment(g);
    if (!c) continue;
    const d = dist(c, expectedHex);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }
  // Generous threshold: swatch hexes are nominal, real fabric shifts under
  // studio light. Beyond this it's a different colourway, not a lighting shift.
  return bestD <= 110 ? best : null;
}
