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
/** Per-item saving exactly as Shopify computes it: 15%, rounded DOWN to the
 *  penny (GBP19.99 -> GBP2.99 off, not GBP3.00). QA 28 Sept 2026: the page said
 *  GBP33.98 for two while checkout charged GBP34.00. */
export function duoUnitOff(unit: number): number {
  return unitOffAt(unit, DUO_DEAL.percent);
}

/** Per-item saving at any rate, rounded DOWN to the penny like the app. */
export function unitOffAt(unit: number, percent: number): number {
  return Math.floor(unit * (percent / 100) * 100 + 1e-6) / 100;
}

/** Price of two once the discount lands, from one or two unit prices. */
export function duoPrice(unit: number, second: number = unit): number {
  return Math.round((unit - duoUnitOff(unit) + second - duoUnitOff(second)) * 100) / 100;
}

/*
 * The product-page multi-buy: 1, 2, or 3+ of this product.
 *
 * Each tier must be what checkout charges for that many units of ONE product
 * under the Shopify rule above. That rule has a single break today - 15% once
 * 2+ units are in the bag - so 3 units also get 15% each. When the Simple
 * Discounts rule gains a 3+ break (e.g. 20%), change the 3+ tier's `percent`
 * here in the same change, after a test checkout confirms the new rate and
 * its rounding - never before. The page builds its labels, totals and "Best
 * value" badge from this list, so no saving can be shown that checkout
 * doesn't give.
 */
export interface MultiBuyTier {
  /** Units of this product the tier puts in the bag. */
  quantity: 1 | 2 | 3;
  /** % off each unit at checkout; 0 = full price. */
  percent: number;
  /** "3+": more units keep the same rate. */
  orMore?: boolean;
}

export const MULTI_BUY_TIERS: MultiBuyTier[] = [
  { quantity: 1, percent: 0 },
  { quantity: 2, percent: DUO_DEAL.percent },
  { quantity: 3, percent: DUO_DEAL.percent, orMore: true },
];

/*
 * Cart line attribute recording the tier the shopper picked, so orders can be
 * counted by tier. The leading underscore keeps it out of the shopper's view
 * at checkout. It is a label only: the discount comes from the Shopify rule,
 * which counts units of the product, not attributes.
 */
export const MULTI_BUY_ATTRIBUTE = "_multibuy_tier";

/** What checkout charges for these unit prices at a tier's rate. */
export function tierTotal(units: number[], percent: number): number {
  return Math.round(units.reduce((s, u) => s + u - unitOffAt(u, percent), 0) * 100) / 100;
}

/** The one tier with the strictly highest saving, if a single one has it. */
export function bestValueTier(tiers: MultiBuyTier[]): MultiBuyTier | undefined {
  const top = Math.max(...tiers.map((t) => t.percent));
  const atTop = tiers.filter((t) => t.percent === top);
  return top > 0 && atTop.length === 1 ? atTop[0] : undefined;
}
