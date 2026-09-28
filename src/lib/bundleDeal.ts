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
export function bundleLabel(currency: string): string {
  /* Only the UK price is a round "3 for GBP30". Other markets are charged
     Shopify's own market prices minus a converted saving (US: 3 x $18 - $12.12
     = $41.88), so a converted "3 for $38" would promise the wrong amount
     (QA 28 Sept 2026). Outside GBP the deal is named, never priced; the
     bag shows the exact saving from Shopify. */
  if (currency !== "GBP") return "3-pack underwear deal";
  return `${BUNDLE_DEAL.minQuantity} for ${formatPrice(BUNDLE_DEAL.bundleTotalGBP, "GBP").replace(/\.00$/, "")}`;
}

/** The Shopify automatic discount's title, as it appears in cart allocations. */
export const BUNDLE_SHOPIFY_TITLE = "Underwear 3-pack deal";

/** Hook form — follows the shopper's active display currency. */
export function useBundleLabel(): string {
  const currency = usePreferences((s) => s.currency);
  return bundleLabel(currency);
}
