import type { CartItem } from "@/stores/cartStore";
import { cartLineKey, type CartTotals } from "@/lib/shopify";
import { BUNDLE_DEAL, bundleUnitOffGBP, inBundleDeal } from "@/lib/bundleDeal";
import { DUO_DEAL, duoPercentFor, duoUnitOff, inDuoDeal } from "@/lib/duoDeal";

/*
 * The bag's arithmetic, shared by the bag drawer and the product page's
 * free-shipping box so the two always show the same figure (v159).
 *
 * `payable` is what checkout charges for the goods: Shopify's own total when
 * it was priced for exactly this bag (same units per variant, same applied
 * codes, same currency), else the local mirrors of the live automatic
 * discounts below. Totals for an earlier bag are never used: they lag every
 * change by the 300 ms debounce plus a round trip, and stay put if the
 * refresh fails. Free shipping is judged on THIS figure, not the
 * full price: Shopify checks the £60 rate against the cart value after
 * discounts. Verified 10 Oct 2026 with throwaway Storefront carts to a UK
 * address: 2 x £32.99 bodysuits (£65.98 full, £56.10 after Buy 2 save 15%)
 * were offered only the £4.98 rate; 2 x £32.99 lounge sets (no discount) got
 * £0; AUVELLA10 on a £65.98 bag also lost the free rate. The app's carts carry
 * no delivery address, so Shopify's total there excludes shipping.
 *
 * `pending`: a discount code is applied but Shopify hasn't priced this exact
 * bag yet. The local mirrors can't model codes, so the free-shipping standing
 * is unknown until the totals arrive - callers show no claim meanwhile.
 */
export function bagTotals(
  items: CartItem[],
  totals: CartTotals | null,
  fallbackCurrency = "GBP",
  codes: string[] = [],
) {
  const baseCurrency = items[0]?.price.currencyCode ?? fallbackCurrency;
  const totalPrice = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  /* "Buy 2, save 10% / Buy 3+, save 15%": mirrors the Simple Discounts
     quantity breaks so the bag shows the figure checkout will. Counted PER
     PRODUCT: units of one product across its sizes, not across the bag. */
  /* Shopify rounds the rate per unit, then multiplies (£19.99 → £2.99 off each,
     not £5.997 → £6.00 on the pair). Match it, or the bag and checkout
     disagree by pennies (QA re-check, 27 Sept 2026). The rate follows the
     product's unit count: 10% at 2, 15% at 3+ (v204). */
  const perProduct = new Map<string, number>();
  for (const i of items) {
    const h = i.product.node.handle;
    if (!inDuoDeal(h)) continue;
    perProduct.set(h, (perProduct.get(h) ?? 0) + i.quantity);
  }
  let duoSaving = 0;
  for (const i of items) {
    const qty = perProduct.get(i.product.node.handle);
    if (!qty) continue;
    const pct = duoPercentFor(qty);
    if (pct > 0) duoSaving += duoUnitOff(parseFloat(i.price.amount), pct) * i.quantity;
  }
  let duoOneShort = 0;
  const duoPercents: number[] = [];
  for (const qty of perProduct.values()) {
    if (qty >= DUO_DEAL.minQuantity) duoPercents.push(duoPercentFor(qty));
    else duoOneShort += 1;
  }
  duoSaving = Math.round(duoSaving * 100) / 100;
  /* "3 for £30": Shopify's rule is £2.99 off EVERY eligible item once 3+ eligible
     items are in the bag (3 × £12.99 → £30.00). The bag showed the nudge but
     never the saving (QA, 27 Sept 2026). Mirrored in the bag's base currency. */
  const bundleUnits = items
    .filter((i) => inBundleDeal(i.product.node.handle))
    .reduce((s, i) => s + i.quantity, 0);
  const bundlePerUnitOff = bundleUnitOffGBP(bundleUnits);
  const bundleSaving =
    bundleUnits >= BUNDLE_DEAL.minQuantity
      ? Math.round(bundleUnits * bundlePerUnitOff * 100) / 100
      : 0;
  /* Shopify's own numbers win whenever they describe this exact bag; the
     local mirrors above cover the moments before they arrive. */
  const appliedCodes = codes.map((c) => c.toUpperCase()).sort();
  const shopifyTotals =
    totals &&
    items.length > 0 &&
    totals.currency === baseCurrency &&
    totals.lineKey === cartLineKey(items) &&
    (totals.codes ?? []).join("|") === appliedCodes.join("|")
      ? totals
      : null;
  const payable = shopifyTotals ? shopifyTotals.total : totalPrice - duoSaving - bundleSaving;
  const pending = !shopifyTotals && items.length > 0 && appliedCodes.length > 0;
  return {
    baseCurrency,
    totalPrice,
    duoSaving,
    duoOneShort,
    /* Rate per qualifying product (10 or 15), for the bag's label. */
    duoPercents,
    bundleSaving,
    shopifyTotals,
    payable,
    pending,
  };
}
