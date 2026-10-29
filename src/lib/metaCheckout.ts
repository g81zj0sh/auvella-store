import { bagTotals } from "@/lib/bagTotals";
import { metaContentId, trackMetaEvent } from "@/lib/metaPixel";
import { perkKindOf } from "@/lib/perks";
import { useCartStore } from "@/stores/cartStore";

/*
 * v214: tells Meta when someone taps a checkout button - the bag's Checkout,
 * the product page's Buy now (once its add has gone in) and the Body Adhesive
 * popup's checkout - just before checkout opens. Same consent rules as every
 * other event (lib/metaPixel): held until an Accept, never sent after a
 * Decline.
 *
 * The one place the event is named. v220: a custom "CheckoutTap" (fbq
 * trackCustom). Shopify now gets the cookie choice (lib/shopifyConsent), so
 * its "Meta Purchase" pixel sends the real InitiateCheckout from the checkout
 * page - keeping ours too would count every checkout twice.
 */
export const CHECKOUT_EVENT = "CheckoutTap";

/** Sends CHECKOUT_EVENT for the bag as it stands. Returns the event ID, or null. */
export function trackCheckoutTap(): string | null {
  const { items, totals, discountCodes } = useCartStore.getState();
  // The free Buy 2 / Buy 3 gifts are £0 lines, not things anyone chose to buy.
  const lines = items.filter((i) => !(perkKindOf(i.variantId) && !(Number(i.price.amount) > 0)));
  if (!lines.length) return null;
  // The subtotal the bag shows (after the multi-buy, bundle and code savings).
  const { payable, baseCurrency } = bagTotals(items, totals, items[0].price.currencyCode, discountCodes);
  const contents = lines.map((i) => ({
    id: metaContentId(i.variantId),
    quantity: i.quantity,
    item_price: Number(i.price.amount) || 0,
  }));
  return trackMetaEvent(
    CHECKOUT_EVENT,
    {
      value: Math.round(payable * 100) / 100,
      currency: baseCurrency,
      content_type: "product",
      content_ids: contents.map((c) => c.id),
      contents,
      num_items: lines.reduce((n, i) => n + i.quantity, 0),
    },
    { custom: true },
  );
}
