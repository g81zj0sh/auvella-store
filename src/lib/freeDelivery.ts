import { isHiddenProduct, perkKindOf } from "@/lib/perks";
import type { Country } from "@/lib/shipping";

/*
 * v224: free delivery on 2+ items, and the 10-minute free-delivery offer
 * (owner's brief from the ads chat, 31 Oct 2026).
 *
 * Delivery is priced only at checkout - Shopify's rate, £4.98, free from £60
 * (lib/shipping). On top of that:
 * - 2 or more items that count, or 5+ pairs of underwear: free, always
 *   (FREE_DELIVERY_CODE).
 * - Until OFFER_ENDS, a bag that would otherwise pay gets free delivery if
 *   checkout is started within OFFER_MINUTES of its first add of an item that
 *   counts (OFFER_CODE). The minutes start once per bag and never restart.
 *
 * Both are Shopify free-shipping discount codes that the bag puts on the
 * Shopify cart itself (cartStore.syncDeliveryCode) - the shopper never types
 * them. Shopify holds the countries, the offer's end date and, for the 2+
 * code, a 2-item minimum; the counting below is the site's. Known gap (owner
 * accepted, 31 Oct 2026): the codes show at checkout, so one typed by hand
 * isn't checked against these rules.
 */

/** Shopify: "Free delivery on 2+ items (put on the bag by the site)". */
export const FREE_DELIVERY_CODE = "FREE-DELIVERY-2PLUS";
/** Shopify: "Free delivery 10-minute offer, until 10 Nov 23:59 UK ...". */
export const OFFER_CODE = "FREE-DELIVERY-OFFER-K7Q4";
export const SITE_DELIVERY_CODES = [FREE_DELIVERY_CODE, OFFER_CODE];

/** The offer's last moment: Tue 10 Nov 2026, 23:59 UK time (GMT then). The
 *  Shopify code ends at the same moment. */
export const OFFER_ENDS = Date.parse("2026-11-10T23:59:59Z");
/** How long the offer runs from a bag's first add of an item that counts. */
export const OFFER_MINUTES = 10;

/*
 * Never counted towards the 2 - ONE list, so another type can be added: the
 * underwear, and the hidden add-ons (tagged hidden-addon in Shopify: the
 * shipping protection and the wash bag), by their Shopify product types.
 */
export const NOT_COUNTED_TYPES = ["Underwear", "Shipping Protection", "Laundry Bag"];
/** Underwear's own threshold (owner, 31 Oct 2026): free delivery from 5 pairs. */
export const UNDERWEAR_TYPE = "Underwear";
export const UNDERWEAR_PAIRS_FREE = 5;

/* The countries of Shopify's free-over-£60 rate (its Domestic and
   International zones). Australia keeps its own A$120 rate. Both codes carry
   the same list. */
export const FREE_DELIVERY_COUNTRIES = [
  "US", "GB", "AE", "AT", "BE", "CA", "CH", "DE", "DK", "ES", "IE", "IT", "NL", "NO", "NZ", "PL", "SE", "SG",
];

const OFFER_MS = OFFER_MINUTES * 60_000;

const isType = (type: string | null | undefined, list: string[]) =>
  !!type && list.some((t) => t.toLowerCase() === type.trim().toLowerCase());

export function isUnderwear(productType: string | null | undefined): boolean {
  return isType(productType, [UNDERWEAR_TYPE]);
}

export function inFreeDeliveryCountry(code: string | null | undefined): boolean {
  return !!code && FREE_DELIVERY_COUNTRIES.includes(code.toUpperCase());
}

type Line = {
  variantId: string;
  quantity: number;
  product: { node: { id?: string; handle?: string; productType?: string | null } };
};

/** What the bag counts for delivery: perk lines and hidden add-ons never. */
export function deliveryCount(items: Line[]) {
  let counted = 0;
  let underwearPairs = 0;
  for (const i of items) {
    if (perkKindOf(i.variantId) || isHiddenProduct(i.product.node)) continue;
    const type = i.product.node.productType;
    if (isUnderwear(type)) underwearPairs += i.quantity;
    if (!isType(type, NOT_COUNTED_TYPES)) counted += i.quantity;
  }
  return {
    counted,
    underwearPairs,
    freeByRule: counted >= 2 || underwearPairs >= UNDERWEAR_PAIRS_FREE,
  };
}

/** When a bag's offer stops: its 10 minutes, or the offer's end if sooner. */
export function offerEndsAt(startedAt: number | null): number {
  return startedAt == null ? 0 : Math.min(startedAt + OFFER_MS, OFFER_ENDS);
}

export function offerRunning(startedAt: number | null, now = Date.now()): boolean {
  return startedAt != null && now < offerEndsAt(startedAt);
}

/** Whole minutes left, rounded up: 10 just after the start, 1 in the last. */
export function offerMinutesLeft(startedAt: number | null, now = Date.now()): number {
  return Math.max(0, Math.ceil((offerEndsAt(startedAt) - now) / 60_000));
}

/**
 * The free-delivery code this bag should carry, if any. `payable` and
 * `threshold` are the bag's total after discounts and the free-rate figure,
 * in the bag's currency: from £60 the rate is free anyway, no offer needed.
 */
export function wantedDeliveryCode(bag: {
  items: Line[];
  country: string | null | undefined;
  payable: number;
  threshold: number;
  startedAt: number | null;
  checkoutAt: number | null;
  now?: number;
}): string | null {
  const now = bag.now ?? Date.now();
  if (!inFreeDeliveryCountry(bag.country)) return null;
  const { counted, freeByRule } = deliveryCount(bag.items);
  if (freeByRule) return FREE_DELIVERY_CODE;
  if (counted < 1 || bag.payable >= bag.threshold) return null;
  if (offerRunning(bag.startedAt, now)) return OFFER_CODE;
  // Checkout was opened inside the minutes: the code stays on, so that
  // checkout stays free however long they take to pay.
  if (bag.checkoutAt != null && bag.checkoutAt < offerEndsAt(bag.startedAt) && now < OFFER_ENDS) return OFFER_CODE;
  return null;
}

/** v225 (owner, 31 Oct 2026: a timer like the old "reserved" one): the bag's
 *  countdown. True as it stands - Shopify holds the free delivery on this bag
 *  until the time runs out. */
export const OFFER_TIMER_LABEL = "Free delivery reserved for";

/** The countdown's time left: "09:42", ... "00:01", then "00:00" at the end. */
export function offerClock(startedAt: number | null, now = Date.now()): string {
  const s = Math.max(0, Math.ceil((offerEndsAt(startedAt) - now) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* The offer's end in UK time, spelt out from fixed names so the server and
   every browser write it the same (no hydration mismatch). */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const END = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(OFFER_ENDS)
    .map((p) => [p.type, p.value]),
);
const END_MONTH = MONTHS[Number(END.month) - 1];
/** "23:59 UK time on Tuesday 10 November 2026" (the shipping policy). */
export const OFFER_END_TEXT = `${END.hour}:${END.minute} UK time on ${DAYS[END.weekday]} ${Number(END.day)} ${END_MONTH} ${END.year}`;

export const OFFER_TERMS = `Start checkout within ${OFFER_MINUTES} min of your first add to bag. Until ${Number(END.day)} ${END_MONTH.slice(0, 3)}. Not for underwear-only orders.`;

/** The "added to bag" toast: with the offer while Shopify has it on the bag. */
export function addedToBagText(bag: {
  deliveryCode: string | null;
  deliveryCodeApplies: boolean;
  offerStartedAt: number | null;
}): string {
  if (bag.deliveryCode !== OFFER_CODE || !bag.deliveryCodeApplies || !offerRunning(bag.offerStartedAt)) {
    return "Added to bag";
  }
  const m = offerMinutesLeft(bag.offerStartedAt);
  return `Added to bag · free delivery if you check out within ${m <= 1 ? "the next minute" : `${m} min`}`;
}

/** One delivery time everywhere: order to door in working days (the UK's 4–9). */
export function deliveryTimeLine(country: Country): string {
  const days = country.days.replace(/\s*–\s*/, "–");
  return country.code === "GB" ? `UK delivery in ${days} working days` : `Delivery in ${days} working days`;
}
