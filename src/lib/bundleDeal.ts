import { formatPrice, usePreferences } from "@/lib/preferences";

/*
 * The live "3 for £30 Underwear" automatic discount, mirrored for the storefront.
 *
 * Shopify rule DiscountAutomaticNode/1726543560999: £2.99 off EACH eligible item
 * once 3 or more eligible items are in the cart — so 3 x £12.99 lands at exactly
 * £30. Keyed by handle so it survives product-ID changes.
 *
 * If the Shopify rule changes, this file must change with it. An advertised
 * offer the checkout does not honour is worse than no badge at all.
 */
export const BUNDLE_DEAL = {
  minQuantity: 3,
  /** What 3 eligible items cost once the discount lands, in store currency. */
  bundleTotalGBP: 30,
  detail: "Mix & match any 3 — discount applies automatically at checkout",
  handles: [
    "cotton-lace-brief",
    "lace-breathable-thong-underwear",
    "womens-high-waisted-breathable-traceless-thong-panties",
  ] as string[],
};

/*
 * The two live Shopify automatic rules on these products (13 Oct 2026):
 * - "Underwear 3-pack deal" (DiscountAutomaticNode/1726543560999): 3+ pairs,
 *   £2.99 off each - 3 x £12.99 = £30, £10 a pair.
 * - "Underwear 5-pack deal" (DiscountAutomaticNode/1749989785895): 5+ pairs,
 *   £3.99 off each - 5 x £12.99 = £45, £9 a pair.
 * Both combine with product and shipping discounts (so Buy 2 still applies to
 * other lines) and not with order codes such as AUVELLA10. Shopify gives each
 * pair only the better of the two, never both - checked on test carts: 3 =
 * £30, 4 = £40, 5 = £45, 6 = £54, and alongside Buy 2 bras.
 * Mix and match across the three products. Change these with the rules.
 */
export const BUNDLE_BREAKS = [
  { min: 5, unitOffGBP: 3.99 },
  { min: 3, unitOffGBP: 2.99 },
];

/** GBP off each pair for this many pairs in the bag (0 under 3). */
export function bundleUnitOffGBP(pairs: number): number {
  return BUNDLE_BREAKS.find((b) => pairs >= b.min)?.unitOffGBP ?? 0;
}

/** The product-page "Bundle & save" tiles (3 pairs preselected). Each tile's
 *  price comes from bundleUnitOffGBP, so it can't drift from the rules. */
export const BUNDLE_TIERS: Array<{ pairs: number; badge?: string }> = [
  { pairs: 1 },
  { pairs: 3, badge: "Recommended" },
  { pairs: 5, badge: "Best Value" },
];
export const BUNDLE_DEFAULT_PAIRS = 3;
/** Cart line attribute on pairs added as a bundle (value: pairs picked), kept
 *  apart from Buy 2's _multibuy_tier so orders can tell the two deals apart. */
export const BUNDLE_ATTRIBUTE = "_bundle_pairs";

/** Short style names for the bundle builder's tabs and pair cards. */
export const BUNDLE_STYLE_NAMES: Record<string, string> = {
  "cotton-lace-brief": "Cotton Brief",
  "lace-breathable-thong-underwear": "Lace Thong",
  "womens-high-waisted-breathable-traceless-thong-panties": "Ice Silk Thong",
};

/*
 * Tiles that wear a small "Sale" sticker (owner's pick, 13 Oct 2026). The
 * sticker only shows while the tile itself shows a reduced price, so it can
 * never say "Sale" next to a full price.
 */
export const SALE_STICKER_HANDLES = ["cotton-lace-brief"];

export function inBundleDeal(handle: string | undefined | null): boolean {
  return !!handle && BUNDLE_DEAL.handles.includes(handle);
}

/*
 * "3 for £30" in whatever currency the shopper is browsing in.
 *
 * Converted, then rounded to a clean figure — a bundle price reads as an offer
 * only when the number is tidy, and Shopify converts at checkout within a
 * rounding step of this. Trailing .00 is dropped so the badge stays short.
 */
export function bundleLabel(currency: string, pairs = BUNDLE_DEAL.minQuantity): string {
  /* Only the UK price is a round "3 for GBP30". Other markets are charged
     Shopify's own market prices minus a converted saving (US: 3 x $18 - $12.12
     = $41.88), so a converted "3 for $38" would promise the wrong amount
     (QA 28 Sept 2026). Outside GBP the deal is named, never priced; the
     bag shows the exact saving from Shopify. */
  if (pairs >= 5) {
    if (currency !== "GBP") return "5-pack underwear deal";
    return `5 for ${formatPrice(5 * (12.99 - 3.99), "GBP").replace(/\.00$/, "")}`;
  }
  if (currency !== "GBP") return "3-pack underwear deal";
  return `${BUNDLE_DEAL.minQuantity} for ${formatPrice(BUNDLE_DEAL.bundleTotalGBP, "GBP").replace(/\.00$/, "")}`;
}

/** The Shopify automatic discounts' titles, as they appear in cart allocations. */
export const BUNDLE_SHOPIFY_TITLE = "Underwear 3-pack deal";
export const BUNDLE5_SHOPIFY_TITLE = "Underwear 5-pack deal";

/** Both breaks in one line for the product page: "3 for £30 · 5 for £45". */
export function bundleHeadline(currency: string): string {
  if (currency !== "GBP") return "Underwear bundle deal";
  return `${bundleLabel(currency)} · ${bundleLabel(currency, 5)}`;
}

/** Hook form — follows the shopper's active display currency. */
export function useBundleLabel(): string {
  const currency = usePreferences((s) => s.currency);
  return bundleLabel(currency);
}
