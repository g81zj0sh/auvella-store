import process from "node:process";

// Server-only config. The .server.ts suffix prevents Vite from bundling
// this file into the client — values here never reach the browser.
//
// On Cloudflare Workers, env binds at REQUEST time. Module-scope reads
// (e.g. `const x = process.env.X`) resolve to undefined — always read
// process.env INSIDE a function or handler.
//
// When to use which env-access pattern:
//   - .server.ts module (this file): server-only helpers reused across
//     handlers. Wrap reads in a function so they run per-request.
//   - inline process.env inside a createServerFn handler: one-off reads
//     not reused elsewhere.
//   - import.meta.env.VITE_FOO: PUBLIC config readable from both client
//     and server (analytics IDs, public URLs). Define in .env with the
//     VITE_ prefix. Never put secrets here — they ship to the browser.

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    // Credentials for the guest order lookup on /tracking.
    //
    // Shopify retired admin-created custom apps (and their permanent shpat_
    // tokens) on 1 Jan 2026. Apps made in the Dev Dashboard authenticate to a
    // store in the same organisation with the client credentials grant, and
    // those tokens expire after 24 hours — so we store the app's credentials,
    // not a token, and mint tokens on demand.
    shopifyClientId: process.env.SHOPIFY_CLIENT_ID,
    shopifyClientSecret: process.env.SHOPIFY_CLIENT_SECRET,
    // Optional: a legacy shpat_ token, if one already exists. Used as-is when
    // present, skipping the exchange.
    shopifyAdminToken: process.env.SHOPIFY_ADMIN_TOKEN,
    // Add server-only values here, e.g.:
    //   databaseUrl: process.env.DATABASE_URL,
    //   stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  };
}
