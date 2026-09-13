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
  label: "3 for £30",
  detail: "Mix & match any 3 — discount applies automatically at checkout",
  minQuantity: 3,
  handles: [
    "cotton-lace-brief",
    "lace-breathable-thong-underwear",
    "womens-high-waisted-breathable-traceless-thong-panties",
  ] as string[],
};

export function inBundleDeal(handle: string | undefined | null): boolean {
  return !!handle && BUNDLE_DEAL.handles.includes(handle);
}
