/*
 * The Worker's bindings and waitUntil, for server-only modules (server.ts and
 * what it calls). nitro's Cloudflare entry doesn't pass them as the fetch
 * arguments server.ts receives: it hangs them on the request
 * (request.runtime.cloudflare.{env, context}, request.waitUntil) and on
 * globalThis.__env__, so every place is tried (as videoRange's getAssets).
 */

export type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  first<T>(): Promise<T | null>;
};
export type D1Database = { prepare(sql: string): D1Statement };
export type WorkerBindings = { VIEWS_DB?: D1Database; SHOPIFY_CLIENT_SECRET?: string };
export type WaitUntil = (promise: Promise<unknown>) => void;

type CloudflareRequest = {
  runtime?: { cloudflare?: { env?: WorkerBindings; context?: { waitUntil?: WaitUntil } } };
  waitUntil?: WaitUntil;
};

export function workerBindings(request: Request, env: unknown): WorkerBindings {
  const candidates = [
    env as WorkerBindings | undefined,
    (request as unknown as CloudflareRequest).runtime?.cloudflare?.env,
    (globalThis as unknown as { __env__?: WorkerBindings }).__env__,
  ];
  const db = candidates.find((c) => c?.VIEWS_DB)?.VIEWS_DB;
  const secret =
    candidates.find((c) => c?.SHOPIFY_CLIENT_SECRET)?.SHOPIFY_CLIENT_SECRET ??
    (typeof process !== "undefined" ? process.env?.SHOPIFY_CLIENT_SECRET : undefined);
  return { VIEWS_DB: db, SHOPIFY_CLIENT_SECRET: secret };
}

/** Keeps work going after the response (background refreshes); undefined outside Workers. */
export function workerWaitUntil(request: Request, ctx: unknown): WaitUntil | undefined {
  const req = request as unknown as CloudflareRequest;
  if (typeof req.waitUntil === "function") return req.waitUntil;
  const context = req.runtime?.cloudflare?.context;
  if (context && typeof context.waitUntil === "function") return context.waitUntil.bind(context);
  const fromArgs = (ctx as { waitUntil?: WaitUntil } | undefined)?.waitUntil;
  if (typeof fromArgs === "function") return fromArgs.bind(ctx);
  return undefined;
}
