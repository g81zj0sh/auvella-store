/*
 * Collection handle canonicalisation.
 *
 * The Shopify handles were renamed in Sept 2026 to match what the collections
 * actually are (the bras page used to live at /collections/soft-essentials, the
 * bodysuits page at /collections/shapewear). Old links live on in emails,
 * social posts, search results and bookmarks, so the storefront must keep
 * answering them.
 *
 * Shopify's own URL redirects only apply on Shopify-hosted domains
 * (www.auvellawear.com). This storefront resolves /collections/:handle itself,
 * so the redirect has to happen here too.
 */

/** Old handle → current handle. Requests for an old handle 301 to the new one. */
export const LEGACY_COLLECTION_HANDLES: Record<string, string> = {
  "shapewear-1": "shapewear",
  "soft-essentials": "bras",
  "bras-and-tops": "bras",
  "one-piece-swimsuits": "swim",
  "mini-dresses-1": "mini-dresses",
  "maxi-dresses-1": "maxi-dresses",
  "best-sellers": "everyday-support-edit",
};

/**
 * Current handle → the handle Shopify may still be using if the rename hasn't
 * landed yet. Lets the loader fall back so the site works in either state and
 * there is no broken window between the code deploy and the Shopify change.
 */
export const PREVIOUS_SHOPIFY_HANDLE: Record<string, string> = {
  shapewear: "shapewear-1",
  bodysuits: "shapewear",
  bras: "soft-essentials",
  swim: "one-piece-swimsuits",
  "mini-dresses": "mini-dresses-1",
  "everyday-support-edit": "best-sellers",
};

export function canonicalCollectionHandle(handle: string): string {
  return LEGACY_COLLECTION_HANDLES[handle] ?? handle;
}
