/*
 * v207: ad clicks on old /products/<handle> links, answered in place.
 *
 * The Meta ads link to /products/<handle> (the old Shopify-theme path), which
 * server.ts 301s to /product/<handle>. On a phone that redirect is one extra
 * round trip before the page even starts (about 0.6 s on slow 4G, 0.1-0.3 s on
 * a decent signal), on every paid click.
 *
 * For a request that carries an ad click id, the Worker renders
 * /product/<handle> straight away and the page's first script swaps the
 * address bar to /product/<handle> before anything else runs - the URL,
 * history entry, referrer and everything the router, pixel and analytics see
 * end up exactly as after the redirect. Anything else (crawlers, feed and
 * email links that only carry utm_* tags, typed URLs) still gets the 301, so
 * search engines see no change; so does any render that isn't a normal 200
 * page (server.ts), so error and 404 pages hydrate at /product/ as before.
 */

// Click ids are added by the ad network at click time only; utm_* tags are
// baked into feed and email links that crawlers fetch too, so they don't count.
const AD_PARAM = /^(?:fbclid|gclid|gbraid|wbraid|msclkid|ttclid)$/i;

type RewriterElement = { prepend(content: string, options: { html: boolean }): void };
type Rewriter = {
  on(selector: string, handlers: { element(el: RewriterElement): void }): Rewriter;
  transform(response: Response): Response;
};
// Cloudflare's streaming HTML rewriter; absent outside Workers (then: redirect as before).
const HTMLRewriterCtor = (globalThis as unknown as { HTMLRewriter?: new () => Rewriter }).HTMLRewriter;

/**
 * The /product/... path to answer in place, or null to send the redirect.
 * `location` is legacyRedirect's target for this request.
 */
export function adLandingTarget(url: URL, location: string): string | null {
  if (!HTMLRewriterCtor) return null;
  const target = new URL(location, url.origin);
  if (target.origin !== url.origin || !/^\/product\/[^/]+$/.test(target.pathname)) return null;
  for (const name of url.searchParams.keys()) {
    if (AD_PARAM.test(name)) return target.pathname;
  }
  return null;
}

/** A normal page we can answer in place; anything else falls back to the redirect. */
export function canSwapAddress(response: Response): boolean {
  const type = response.headers.get("content-type") ?? "";
  return !!HTMLRewriterCtor && response.status === 200 && type.includes("text/html");
}

/** The page with the address-bar swap as the very first thing in <head>. */
export function withAddressSwap(response: Response, path: string): Response {
  if (!HTMLRewriterCtor || !canSwapAddress(response)) return response;
  // JSON-quoted and "<"-escaped: the path comes from the request URL.
  const quoted = JSON.stringify(path).replace(/</g, "\\u003c");
  const script = `<script>history.replaceState(history.state,"",${quoted}+location.search+location.hash)</script>`;
  return new HTMLRewriterCtor()
    .on("head", {
      element(el) {
        el.prepend(script, { html: true });
      },
    })
    .transform(response);
}
