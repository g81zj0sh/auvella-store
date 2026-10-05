/*
 * Renamed product handles. Shopify's own redirects only apply on the
 * Shopify-hosted www domain; the apex storefront resolves /product/:handle
 * itself, so a renamed product also needs its old handle here, or old links
 * (ads, shares, search results) 404. Old handle -> current handle.
 */
export const LEGACY_PRODUCT_HANDLES: Record<string, string> = {
  // Renamed 5 Oct 2026 from the supplier import title.
  "pure-color-tube-top-short-skirt-slim-backless-small-dress-dress": "cowl-neck-lace-up-back-mini-dress",
};
