import "./lib/error-capture";
import { installCatalogTables } from "./lib/catalogTables";
import { FULL_CATALOG_TABLES } from "./lib/catalogTablesFull";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { legacyRedirect } from "./lib/legacyRedirects";
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

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Old Shopify-theme URLs the www host forwards here (v186) go on before
      // the router, which would 404 them. Static files are served before the
      // Worker runs, and /_serverFn/* (POST, too) matches no rule.
      if (request.method === "GET" || request.method === "HEAD") {
        // Videos, answered in byte ranges so iPhone Safari plays them (v198).
        const media = await serveMedia(request, new URL(request.url), env);
        if (media) return media;

        const legacy = legacyRedirect(new URL(request.url));
        if (legacy) {
          return new Response(null, {
            status: legacy.status,
            headers: { Location: legacy.location },
          });
        }
      }
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
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
