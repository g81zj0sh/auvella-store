/*
 * The live "Buy 2, save 15%" automatic discount, mirrored for the storefront.
 *
 * Shopify rule DiscountAutomaticNode/1738471309607: 15% off every eligible
 * item once 2 or more eligible items are in the cart. Eligible items can be
 * mixed - two bras, or a bodysuit and a swimsuit - so the saving the page
 * shows is what checkout will apply. Keyed by handle so it survives
 * product-ID changes.
 *
 * Deliberately NOT applied to: the three underwear singles (they carry the
 * 3-for-£30 rule and two offers on one page fight), the co-ord and fleece
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
