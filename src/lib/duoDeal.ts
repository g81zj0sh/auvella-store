/*
 * The live "Buy 2, save 15%" quantity break, mirrored for the storefront.
 *
 * Shopify DiscountAutomaticNode/1738478518567, an app-managed automatic
 * discount from Simple Discounts (type "Tier/Quantity break discount"),
 * scoped to the "Buy 2, save 15% (eligible)" collection (duo-eligible) with
 * "Same product only": 15% off a product once 2+ units OF THAT PRODUCT are
 * in the cart. Counted per product, not across the bag - two different
 * products at one each get nothing. Verified at checkout 25 Sept 2026.
 * Keyed by handle so it survives product-ID changes; keep this list and the
 * collection in step.
 *
 * Deliberately NOT applied to: the three underwear singles (they carry the
 * 3-for-GBP30 rule and two offers on one page fight), the co-ord and fleece
 * sets (heavy shipping, thin margin on a multiple), accessories, and
 * single-purchase items with no natural "two of".
 *
 * If the Shopify rule changes, this file must change with it.
 */
export const DUO_DEAL = {
  percent: 15,
  minQuantity: 2,
  handles: [
    "auvella-long-sleeve-sculpting-bodysuit",
    "auvella-seamless-comfort-bralette",
    "high-waist-body-shaping-shorts",
    "high-waist-shaping-shorts-with-lace-trim",
    "high-waisted-tummy-control-shaping-pants",
    "invisible-front-buckle-strapless-bra",
    "jelly-cup-multi-way-strapless-bra",
    "lace-scoop-bralette-comfortable-seamless-underwear",
    "long-sleeve-zip-one-piece-swimsuit",
    "maternity-nursing-bra-front-opening-push-up",
    "one-piece-shapewear-bodysuit-with-tummy-control",
    "ribbed-cut-out-one-piece-swimsuit",
    "satin-tie-waist-robe",
    "seamless-sculpt-sports-bra",
    "seamless-sculpting-bodysuit",
    "seamless-shaping-long-sleeve-bodysuit",
    "seamless-support-bra-with-tummy-control",
    "seamless-wireless-full-cup-bra",
    "solid-colour-bikini-set",
    "strapless-slim-fit-bodysuit",
    "strapless-tummy-control-body-shaper",
    "womens-bra",
    "womens-high-waisted-ruched-bikini-bottoms",
    "womens-one-piece-diamond-swimsuit",
    "womens-swimwear",
    "womens-swimwear-1",
    "womens-tie-side-triangle-bikini-set",
    "womens-two-piece-swimsuit",
  ] as string[],
};

export function inDuoDeal(handle: string | undefined | null): boolean {
  return !!handle && DUO_DEAL.handles.includes(handle);
}

/** Price of two once the discount lands, from one unit price. */
export function duoPrice(unit: number): number {
  return Math.round(unit * 2 * (1 - DUO_DEAL.percent / 100) * 100) / 100;
}
