/*
 * Edge HTML cache (v196).
 *
 * The live audit (16 Oct 2026) caught Cloudflare "error code: 1102" (Worker
 * exceeded resource limits) on up to 1 in 5 page loads while traffic was
 * heavy. Every page is server-rendered, and a render costs real CPU and
 * memory (a collection page pulls ~100 products of data). The rendered HTML
 * doesn't depend on the visitor - the server reads no cookies or headers and
 * always renders the default GB market; the browser personalises market,
 * currency and bag after it loads - so one render can serve everyone for a
 * few minutes. Pages come from Cloudflare's edge cache instead of being
 * rendered for every visitor.
 *
 * Safety:
 *  - The key carries the build id, so a new deploy never serves HTML that
 *    points at the previous build's hashed /assets (they 404 once it ships).
 *  - Only 200 text/html without Set-Cookie is stored: never errors, 404s,
 *    redirects, server functions or anything personal.
 *  - Browsers are told not to keep their own copy, so they always come back.
 *  - Ad and email tracking params don't split the cache (they don't change
 *    the HTML); every other param does.
 */

declare const __AUVELLA_BUILD_ID__: string | undefined;

/** How long a rendered page is reused at the edge. Prices, stock and copy
 *  changes reach shoppers within this window. */
export const EDGE_TTL_SECONDS = 300;

/** Per-build id baked in by vite.config.ts; null when missing (then: no cache). */
export const BUILD_ID: string | null =
  typeof __AUVELLA_BUILD_ID__ === "string" && __AUVELLA_BUILD_ID__ ? __AUVELLA_BUILD_ID__ : null;

const TRACKING_PARAM =
  /^(?:utm_[a-z0-9_]+|fbclid|gclid|gbraid|wbraid|dclid|msclkid|ttclid|twclid|li_fat_id|_kx|mc_cid|mc_eid|igshid|srsltid|_gl)$/i;

/** GET page requests only: no server functions, API calls or files. */
export function isCacheableRequest(request: Request, url: URL): boolean {
  if (request.method !== "GET") return false;
  const path = url.pathname;
  if (path.startsWith("/_serverFn") || path.startsWith("/api/")) return false;
  // Anything that looks like a file (sitemap.xml, robots.txt, assets) renders
  // as is; only extension-less page routes are cached.
  const last = path.slice(path.lastIndexOf("/") + 1);
  if (last.includes(".")) return false;
  const accept = request.headers.get("accept");
  if (accept && !accept.includes("text/html") && !accept.includes("*/*")) return false;
  return true;
}

/** The cache key: same origin, a path no route uses, the build id, the page
 *  path and its non-tracking params in a fixed order. */
export function edgeCacheKey(url: URL, buildId: string | null = BUILD_ID): string | null {
  if (!buildId) return null;
  const params = [...url.searchParams]
    .filter(([name]) => !TRACKING_PARAM.test(name))
    .sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  const query = new URLSearchParams(params).toString();
  return `${url.origin}/__edge/${encodeURIComponent(buildId)}${url.pathname}${query ? `?${query}` : ""}`;
}

/** Only complete, impersonal HTML pages are stored. */
export function isCacheableResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (response.headers.has("set-cookie")) return false;
  return (response.headers.get("content-type") ?? "").includes("text/html");
}

/** The copy stored at the edge: kept for EDGE_TTL_SECONDS. */
export function forEdge(response: Response): Response {
  const stored = new Response(response.body, response);
  stored.headers.set("Cache-Control", `public, max-age=${EDGE_TTL_SECONDS}`);
  return stored;
}

/** What the shopper's browser gets: never reused without asking again. */
export function forBrowser(response: Response, state: "HIT" | "MISS" | "BYPASS"): Response {
  const out = new Response(response.body, response);
  out.headers.set("Cache-Control", "no-cache");
  out.headers.delete("Age");
  out.headers.set("x-auvella-cache", state);
  return out;
}
