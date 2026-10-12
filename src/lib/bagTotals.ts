import type { CartItem } from "@/stores/cartStore";
import { cartLineKey, type CartTotals } from "@/lib/shopify";
import { BUNDLE_DEAL, BUNDLE_PER_UNIT_OFF_GBP, inBundleDeal } from "@/lib/bundleDeal";
import { DUO_DEAL, duoUnitOff, inDuoDeal } from "@/lib/duoDeal";

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
  /* "Buy 2, save 15%": mirrors the Simple Discounts quantity break so the bag
     shows the figure checkout will. Counted PER PRODUCT: units of one product
     across its sizes, not across the bag. */
  /* Shopify rounds the 15% per unit, then multiplies (£19.99 → £2.99 off each,
     not £5.997 → £6.00 on the pair). Match it, or the bag and checkout
     disagree by pennies (QA re-check, 27 Sept 2026). */
  const perProduct = new Map<string, { qty: number; saving: number }>();
  for (const i of items) {
    const h = i.product.node.handle;
    if (!inDuoDeal(h)) continue;
    const cur = perProduct.get(h) ?? { qty: 0, saving: 0 };
    const unitOff = duoUnitOff(parseFloat(i.price.amount));
    cur.qty += i.quantity;
    cur.saving += unitOff * i.quantity;
    perProduct.set(h, cur);
  }
  let duoSaving = 0;
  let duoOneShort = 0;
  for (const v of perProduct.values()) {
    if (v.qty >= DUO_DEAL.minQuantity) duoSaving += v.saving;
    else duoOneShort += 1;
  }
  duoSaving = Math.round(duoSaving * 100) / 100;
  /* "3 for £30": Shopify's rule is £2.99 off EVERY eligible item once 3+ eligible
     items are in the bag (3 × £12.99 → £30.00). The bag showed the nudge but
     never the saving (QA, 27 Sept 2026). Mirrored in the bag's base currency. */
  const bundleUnits = items
    .filter((i) => inBundleDeal(i.product.node.handle))
    .reduce((s, i) => s + i.quantity, 0);
  const bundlePerUnitOff = BUNDLE_PER_UNIT_OFF_GBP;
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
    bundleSaving,
    shopifyTotals,
    payable,
    pending,
  };
}
