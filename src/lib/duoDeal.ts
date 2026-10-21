/*
 * The live multi-buy quantity breaks (Buy 2 save 10%, Buy 3+ save 15%),
 * mirrored for the storefront.
 *
 * Shopify DiscountAutomaticNode/1738478518567, an app-managed automatic
 * discount from Simple Discounts (type "Tier/Quantity break discount"),
 * scoped to the "Buy 2, save 15% (eligible)" collection (duo-eligible) with
 * "Same product only": 10% off a product once 2 units OF THAT PRODUCT are
 * in the cart, 15% once 3+ are (v204, owner 21 Oct 2026; it was 15% at 2+,
 * verified at checkout 25 Sept 2026). Counted per product, not across the
 * bag - two different products at one each get nothing.
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
  percent: 10,
  minQuantity: 2,
  /* v204 (owner, 21 Oct 2026): 2 units save 10%, 3+ units of the same product
     save 15%. Two breaks in the same Simple Discounts rule (same product
     only); Shopify gives the higher break, not both. */
  stockUpPercent: 15,
  stockUpQuantity: 3,
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

/** The rate Shopify gives each unit when the bag holds `quantity` units of one
 *  Buy 2 product: 0 below 2, 10% at 2, 15% at 3 or more. */
export function duoPercentFor(quantity: number): number {
  if (quantity >= DUO_DEAL.stockUpQuantity) return DUO_DEAL.stockUpPercent;
  if (quantity >= DUO_DEAL.minQuantity) return DUO_DEAL.percent;
  return 0;
}

/** Titles the Simple Discounts rule has carried, as Shopify reports them on
 *  cart lines (lower case). The bag swaps them for the rate actually in play. */
export const DUO_SHOPIFY_TITLES = ["buy 2, save 15%", "multi-buy saving"];

/** Bag label for the multi-buy saving at the rates in play. */
export function duoLabel(percents: number[]): string {
  const rates = [...new Set(percents.filter((p) => p > 0))];
  if (rates.length === 1 && rates[0] === DUO_DEAL.stockUpPercent) return `Buy 3+, save ${DUO_DEAL.stockUpPercent}%`;
  if (rates.length === 1) return `Buy 2, save ${rates[0]}%`;
  return "Multi-buy savings";
}

/** Price of two once the discount lands, from one unit price. */
/** Per-item saving exactly as Shopify computes it: the rate, rounded DOWN to the
 *  penny (GBP19.99 -> GBP2.99 off, not GBP3.00). QA 28 Sept 2026: the page said
 *  GBP33.98 for two while checkout charged GBP34.00. */
export function duoUnitOff(unit: number, percent: number = DUO_DEAL.percent): number {
  return unitOffAt(unit, percent);
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
 * The product-page multi-buy "power cards": Just One / Buy 2 / Buy 3+.
 *
 * Each tier must be what checkout charges for that many units of ONE product
 * under the Shopify rule above: 10% at 2 units, 15% at 3+ (v204, owner 21 Oct
 * 2026 - the breaks were changed in Simple Discounts and checked with a test
 * cart before this changed; before v204 both cards were 15%). If the Simple
 * Discounts breaks change, change DUO_DEAL in the same release - never before.
 * The cards build their labels, savings and badges from this list, so no
 * saving can be shown that checkout doesn't give.
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
  { quantity: 3, percent: DUO_DEAL.stockUpPercent, orMore: true },
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
