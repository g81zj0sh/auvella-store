/*
 * GET /api/country (v237): the visitor's country, as Cloudflare sees it.
 *
 * The site used to ask ipapi.co from the browser, which sent every new
 * visitor's IP address to a third party and has a free daily cap; when it
 * failed, the browser's language decided (a UK phone set to US English got
 * US prices). Cloudflare already geolocates every request it serves, so the
 * Worker just reads it: request.cf.country (the request nitro hands
 * server.ts is Cloudflare's own, augmented), else the CF-IPCountry header.
 *
 * Answers { country: "GB" } or { country: null } when Cloudflare can't tell
 * ("XX" unknown, "T1" Tor). Never cached: it's per visitor.
 */

type CfRequest = { cf?: { country?: unknown } };

export function visitorCountry(request: Request): string | null {
  const fromCf = (request as unknown as CfRequest).cf?.country;
  const raw = (typeof fromCf === "string" && fromCf) || request.headers.get("cf-ipcountry") || "";
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1" ? code : null;
}

export function countryApi(request: Request, url: URL): Response | null {
  if (url.pathname !== "/api/country") return null;
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, private",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: { ...headers, allow: "GET, HEAD" } });
  }
  return new Response(request.method === "HEAD" ? null : JSON.stringify({ country: visitorCountry(request) }), { status: 200, headers });
}
