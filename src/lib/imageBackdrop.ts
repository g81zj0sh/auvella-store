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

export const DEFAULT_BACKDROP = "#F6F3EF";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

/** Colour already resolved for this URL, if any — lets the first paint be correct. */
export function cachedBackdrop(url: string | undefined): string | undefined {
  return url ? cache.get(url) : undefined;
}

export function sampleBackdrop(url: string): Promise<string> {
  const hit = cache.get(url);
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
    img.src = url;
  });

  pending.set(url, job);
  job.then(() => pending.delete(url));
  return job;
}
