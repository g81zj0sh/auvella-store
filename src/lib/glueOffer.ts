/*
 * Body Adhesive add-on popup (v163): settings and the "show once" memory.
 *
 * When a shopper adds one of the pieces below - strapless, backless,
 * off-shoulder or open-back, where a garment wants to slide - a popup offers
 * the glue (components/site/GlueOfferPopup.tsx). It shows on the FIRST such
 * add for a bag only: once it has been seen, adding a second piece from the
 * list doesn't bring it back, whether or not they took the glue. A new bag
 * (after an order, or a cleared bag) can see it once again.
 *
 * Chosen by the owner, 11 Oct 2026. The word after "made for your" is the
 * popup's title, so keep it short.
 */

export const GLUE_HANDLE = "body-adhesive-glue-for-clothing-security";

export const GLUE_PAIRS: Record<string, string> = {
  "invisible-front-buckle-strapless-bra": "strapless bra",
  "jelly-cup-multi-way-strapless-bra": "strapless bra",
  "womens-bra": "backless bra",
  "strapless-slim-fit-bodysuit": "strapless bodysuit",
  "strapless-tummy-control-body-shaper": "strapless bodysuit",
  "off-shoulder-sculpt-midi-dress": "off-shoulder dress",
  "cowl-neck-lace-up-back-mini-dress": "mini dress",
  "v-neck-bodycon-mini-dress": "mini dress",
  "women-asymmetric-long-sleeve-t-shirt-and-wide-leg-pants-set": "asymmetric top",
  "seamless-sculpting-bodysuit": "open-back bodysuit",
};

/* The three ticks. Each is taken from the Body Adhesive's own listing (what
   it's for, the skin-friendly formula and fabric range, how it comes off);
   change them only if the listing changes. */
export const GLUE_CLAIMS = [
  "Keeps strapless and off-shoulder pieces in place",
  "Skin-friendly formula for a range of fabrics",
  "Washes off with warm water and soap",
];

/*
 * Popup-only price with a real 10-minute window (v164) - OFF until set.
 *
 * To switch it on: create a discount CODE (not an automatic discount) for the
 * Body Adhesive only, in Shopify or Simple Discounts, ticked to combine with
 * product discounts (so a dress's Buy 2 saving still applies). Then fill in
 * its code and the SAME amount below, e.g.
 *   export const GLUE_OFFER: GlueOfferDeal | null = { code: "GLUEADDON", percentOff: 60 };
 *   export const GLUE_OFFER: GlueOfferDeal | null = { code: "GLUEADDON", amountOff: 2 };
 *
 * With it set, the popup shows the lower price and "Discount expires in",
 * counting down from 10:00; "Add to order with discount" adds the glue and
 * applies the code. At 00:00 the timer stays at 00:00 and the popup offer
 * ends: normal price, no code. Use a code, not an automatic discount (that
 * would apply after 00:00 too), and set it to ONE USE PER CUSTOMER in Shopify
 * so a shopper who claimed it can't reuse it on later orders. The window
 * itself lives in the popup: someone who already knows the code could still
 * type it in the bag once, as with any promo code.
 * Prefer percentOff: amountOff is taken off the shopper's market price as-is,
 * while Shopify converts a GBP fixed amount, so it only matches for GBP.
 * While it's null the popup shows the normal price and no countdown, since
 * there is nothing to expire.
 */
export type GlueOfferDeal = { code: string; percentOff?: number; amountOff?: number };
/* Live since 11 Oct 2026: Shopify code GLUEADDON (DiscountCodeNode
   1749591032103) - 40% off the Body Adhesive only, one use per customer,
   combines with product and shipping discounts (so Buy 2 / 3-pack savings
   still apply), not with order codes. The glue's own price is £15.00 with no
   compare-at (accessories carry none), so the popup shows £15.00 -> £9.00,
   "Save 40%". Checked on a test cart: £9.00 alongside Buy 2 save 15%.
   Change the amount in Shopify AND here together. */
export const GLUE_OFFER: GlueOfferDeal | null = { code: "GLUEADDON", percentOff: 40 };
export const GLUE_OFFER_MINUTES = 10;

/** Hidden cart-line tag, so orders can be counted by where the glue came from. */
export const GLUE_POPUP_ATTRIBUTE = { key: "_upsell", value: "glue-popup" };

/* cartStore.addItem announces every successful add; the popup listens. An
   event rather than an import keeps the cart store free of popup code. */
export const BAG_ADD_EVENT = "auvella:bag-add";

export function announceBagAdd(handle: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(BAG_ADD_EVENT, { detail: { handle } }));
}

/* Which bag has already seen the popup. Keyed to the Shopify cart id so it
   survives reloads and coming back later, and resets with a new bag. Kept in
   memory too, so blocked storage (private mode) still means once per visit. */
const SEEN_KEY = "auvella_glue_offer_cart";
let seenThisVisit: string | null = null;

export function glueOfferSeen(cartId: string | null): boolean {
  if (!cartId) return false;
  if (seenThisVisit === cartId) return true;
  try {
    return localStorage.getItem(SEEN_KEY) === cartId;
  } catch {
    return false;
  }
}

export function markGlueOfferSeen(cartId: string | null) {
  if (!cartId) return;
  seenThisVisit = cartId;
  try {
    localStorage.setItem(SEEN_KEY, cartId);
  } catch {
    /* storage blocked: the in-memory copy covers this visit */
  }
}
