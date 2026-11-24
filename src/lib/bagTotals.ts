import type { CartItem } from "@/stores/cartStore";
import { cartLineKey, type CartTotals } from "@/lib/shopify";
import { BUNDLE_DEAL, bundleUnitOffGBP, inBundleDeal } from "@/lib/bundleDeal";
import { DUO_DEAL, duoPercentFor, duoUnitOff, inDuoDeal, unitOffAt } from "@/lib/duoDeal";
import { bfPercentFor, inBlackFriday } from "@/lib/blackFriday";
import { decSaving as decemberSaving, isBodysuit } from "@/lib/decemberOffer";

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
 *
 * v231 `blackFriday` (the bag drawer passes it while Black Friday runs,
 * lib/blackFriday): the bodysuits take its rate - 20 / 30 / 40% by the number
 * of bodysuits across the bag, Shopify's rounding (v238: down, per item) -
 * instead of the Buy 2 one, which it beats at every quantity.
 *
 * v238 `december` (lib/decemberOffer): one bodysuit in every two half price.
 * It combines with no other product discount, so Shopify applies either it
 * or the others (Buy 2, 3-for-£30) - whichever saves more - and so does this.
 */
export function bagTotals(
  items: CartItem[],
  totals: CartTotals | null,
  fallbackCurrency = "GBP",
  codes: string[] = [],
  blackFriday = false,
  december = false,
) {
  const baseCurrency = items[0]?.price.currencyCode ?? fallbackCurrency;
  const totalPrice = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const bfLines = blackFriday ? items.filter((i) => inBlackFriday(i.product.node.handle)) : [];
  const bfUnits = bfLines.reduce((s, i) => s + i.quantity, 0);
  const bfPercent = bfPercentFor(bfUnits);
  /* v238: per item, rounded down to the penny, then times the quantity - what
     Shopify does (real carts, 23 Nov 2026: one Long Sleeve -£6.99, not -£7.00). */
  const bfSaving =
    Math.round(bfLines.reduce((s, i) => s + unitOffAt(parseFloat(i.price.amount), bfPercent) * i.quantity, 0) * 100) /
    100;
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
    if (!inDuoDeal(h) || (blackFriday && inBlackFriday(h))) continue;
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
  let duoPercents: number[] = [];
  for (const [h, qty] of perProduct) {
    if (qty >= DUO_DEAL.minQuantity) duoPercents.push(duoPercentFor(qty));
    // v238: in December a lone bodysuit's nudge is the half-price one.
    else if (!(december && isBodysuit(h))) duoOneShort += 1;
  }
  duoSaving = Math.round(duoSaving * 100) / 100;
  /* "3 for £30": Shopify's rule is £2.99 off EVERY eligible item once 3+ eligible
     items are in the bag (3 × £12.99 → £30.00). The bag showed the nudge but
     never the saving (QA, 27 Sept 2026). Mirrored in the bag's base currency. */
  const bundleUnits = items
    .filter((i) => inBundleDeal(i.product.node.handle))
    .reduce((s, i) => s + i.quantity, 0);
  const bundlePerUnitOff = bundleUnitOffGBP(bundleUnits);
  let bundleSaving =
    bundleUnits >= BUNDLE_DEAL.minQuantity
      ? Math.round(bundleUnits * bundlePerUnitOff * 100) / 100
      : 0;
  /* v238: December's half price on the bodysuits, or the others - never both. */
  const decLines = december ? items.filter((i) => isBodysuit(i.product.node.handle)) : [];
  const decUnits = decLines.reduce((s, i) => s + i.quantity, 0);
  const decOff = decemberSaving(
    decLines.flatMap((i) => Array.from({ length: i.quantity }, () => parseFloat(i.price.amount))),
  );
  const decWins = decOff > 0 && decOff > duoSaving + bundleSaving;
  const decSaving = decWins ? decOff : 0;
  if (decWins) {
    duoSaving = 0;
    duoPercents = [];
    bundleSaving = 0;
    // A second of another product wouldn't get its 10% alongside it either.
    duoOneShort = 0;
  }
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
  const payable = shopifyTotals ? shopifyTotals.total : totalPrice - duoSaving - bundleSaving - bfSaving - decSaving;
  const pending = !shopifyTotals && items.length > 0 && appliedCodes.length > 0;
  return {
    baseCurrency,
    totalPrice,
    duoSaving,
    duoOneShort,
    /* Rate per qualifying product (10 or 15), for the bag's label. */
    duoPercents,
    bundleSaving,
    /* v231: Black Friday - bodysuits in the bag, their rate, the saving. */
    bfUnits,
    bfPercent,
    bfSaving,
    /* v238: December - bodysuits in the bag, the half-price saving (0 when
       the other discounts save more, as Shopify decides). */
    decUnits,
    decSaving,
    shopifyTotals,
    payable,
    pending,
  };
}
