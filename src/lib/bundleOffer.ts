import { BUNDLE_DEAL } from "@/lib/bundleDeal";

/*
 * "Pick any 3 for £30" builder popup (v176): settings and memory.
 *
 * Opens a couple of seconds after a shopper lands on the Underwear
 * collection or on one of the deal's own products, and lets them build
 * their three (any mix of the BUNDLE_DEAL products, each with its own colour
 * and size) and add all three at once. The £30 is the live Shopify automatic
 * discount (lib/bundleDeal.ts): £2.99 off each eligible item once 3 are in
 * the bag, so 3 x £12.99 = £30.00 exactly - nothing extra to set up.
 *
 * - UK prices only: outside GBP the deal is named, never priced
 *   (bundleLabel), so the popup only opens when prices are in GBP.
 * - Not when the bag already holds 3+ deal items, or another popup is open.
 * - Once seen it stays away for a week, whether they used it or not.
 */
export const BUNDLE_OFFER_PATHS = [
  "/collections/underwear",
  ...BUNDLE_DEAL.handles.map((h) => `/product/${h}`),
];

/** Wait this long on the page before offering, so they see it first. */
export const BUNDLE_OFFER_DELAY_MS = 2500;

/** Hidden cart-line tag, so orders can be counted by where they came from. */
export const BUNDLE_POPUP_ATTRIBUTE = { key: "_bundle", value: "3for30-popup" };

const SEEN_KEY = "auvella_bundle_offer_seen";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
let seenThisVisit = false;

export function bundleOfferSnoozed(): boolean {
  if (seenThisVisit) return true;
  try {
    const at = Number(localStorage.getItem(SEEN_KEY));
    return at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

export function markBundleOfferSeen() {
  seenThisVisit = true;
  try {
    localStorage.setItem(SEEN_KEY, String(Date.now()));
  } catch {
    /* storage blocked: the in-memory flag covers this visit */
  }
}

/*
 * Tiles that wear a small "Sale" sticker (owner's pick, 13 Oct 2026). The
 * sticker only shows while the tile itself shows a reduced price, so it can
 * never say "Sale" next to a full price.
 */
export const SALE_STICKER_HANDLES = ["cotton-lace-brief"];
