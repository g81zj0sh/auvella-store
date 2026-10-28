import "./lib/error-capture";
import { installCatalogTables } from "./lib/catalogTables";
import { FULL_CATALOG_TABLES } from "./lib/catalogTablesFull";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { legacyRedirect } from "./lib/legacyRedirects";
import { adLandingTarget, canSwapAddress, withAddressSwap } from "./lib/adLanding";
import { productViews } from "./lib/productViewsApi";
import { primeReviews, productPageHandle, reviewsApi } from "./lib/reviewsServer";
import { workerBindings, workerWaitUntil } from "./lib/workerEnv";
import { serveMedia } from "./lib/videoRange";
import {
  edgeCacheKey,
  forBrowser,
  forEdge,
  isCacheableRequest,
  isCacheableResponse,
} from "./lib/edgeCache";

// v205: every server render sees the full catalogue tables (lib/catalogTables).
installCatalogTables(FULL_CATALOG_TABLES);

type WaitUntil = { waitUntil?: (promise: Promise<unknown>) => void };

/** Cloudflare's per-colo edge cache; absent outside Workers (Node, tests). */
function edgeCache(): Cache | null {
  try {
    const c = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
    return c ?? null;
  } catch {
    return null;
  }
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/** A page: a recent render from the edge cache, or a fresh one. `source` is
 *  the request as it arrived (bindings ride on it) when `request` is a rewrite. */
async function renderPage(request: Request, env: unknown, ctx: unknown, source: Request = request): Promise<Response> {
  // v196: reuse a recent render from the edge (lib/edgeCache) - most
  // visitors then cost no render at all, which is what kept tipping the
  // Worker over its resource limits (Cloudflare 1102) under load.
  const url = new URL(request.url);
  const cache = isCacheableRequest(request, url) ? edgeCache() : null;
  const key = cache ? edgeCacheKey(url) : null;
  if (cache && key) {
    try {
      const hit = await cache.match(key);
      if (hit) return forBrowser(hit, "HIT");
    } catch (error) {
      console.error("edge cache read failed", error);
    }
  }

  // v210: a product page renders with its reviews (lib/reviewsServer).
  const reviewHandle = productPageHandle(url);
  if (reviewHandle) {
    await primeReviews(reviewHandle, workerBindings(source, env), workerWaitUntil(source, ctx));
  }

  const handler = await getServerEntry();
  const response = await normalizeCatastrophicSsrResponse(
    await handler.fetch(request, env, ctx),
  );

  if (cache && key && isCacheableResponse(response)) {
    try {
      const put = cache.put(key, forEdge(response.clone()));
      const wait = (ctx as WaitUntil | undefined)?.waitUntil;
      if (wait) wait.call(ctx, put.catch((e) => console.error("edge cache write failed", e)));
      else void put.catch(() => {});
    } catch (error) {
      console.error("edge cache write failed", error);
    }
    return forBrowser(response, "MISS");
  }
  return response;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // v208: "people viewed this in the last 24 hours" counts (D1).
      const views = await productViews(request, new URL(request.url), env);
      if (views) return views;
      // v210: a product's reviews, parsed and cached (lib/reviewsServer).
      const reviews = await reviewsApi(request, new URL(request.url), env, ctx);
      if (reviews) return reviews;

      // Old Shopify-theme URLs the www host forwards here (v186) go on before
      // the router, which would 404 them. Static files are served before the
      // Worker runs, and /_serverFn/* (POST, too) matches no rule.
      if (request.method === "GET" || request.method === "HEAD") {
        const url = new URL(request.url);
        // Videos, answered in byte ranges so iPhone Safari plays them (v198).
        const media = await serveMedia(request, url, env);
        if (media) return media;

        const legacy = legacyRedirect(url);
        if (legacy) {
          // v207: an ad click on /products/<handle> skips the redirect's round
          // trip; the page swaps its own address bar (lib/adLanding).
          const inPlace = adLandingTarget(url, legacy.location);
          if (inPlace) {
            const target = new Request(new URL(legacy.location, url.origin), request);
            const page = await renderPage(target, env, ctx, request);
            if (canSwapAddress(page)) return withAddressSwap(page, inPlace);
            // A 404, error or redirect: answer exactly as before, with the 301.
            void page.body?.cancel().catch(() => {});
          }
          return new Response(null, {
            status: legacy.status,
            headers: { Location: legacy.location },
          });
        }
      }
      return await renderPage(request, env, ctx);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
