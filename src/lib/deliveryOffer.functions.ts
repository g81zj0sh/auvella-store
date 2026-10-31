import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "./config.server";
import { dropAdminToken, getAdminToken, SHOPIFY_SHOP_DOMAIN } from "./orderTracking.functions";
import { FREE_DELIVERY_COUNTRIES, OFFER_CODE_PREFIX, OFFER_ENDS, OFFER_MINUTES } from "./freeDelivery";

/*
 * v226: each bag's own code for the 10-minute free-delivery offer.
 *
 * v224 used one shared code, FREE-DELIVERY-OFFER-K7Q4. Checkout shows the
 * codes on an order and Shopify gives a discount one end date, so anyone who
 * had seen it could type it in until the offer's last day - including a
 * shopper whose own minutes had run out. The owner wants the code to stop
 * when the shopper's timer does (31 Oct 2026), so the bag asks here for a
 * code of its own: a Shopify free-shipping code for one order, in the
 * free-delivery countries, that Shopify itself ends with the bag's timer
 * (the bag takes it off at 00:00 too). Strict, by the owner's choice: a
 * checkout opened in time but paid after loses it too.
 *
 * Requires the `write_discounts` scope on the Dev Dashboard app version.
 *
 * This endpoint is reachable by anyone, so it only ever makes what the bag
 * would: one code, for one order, for at most OFFER_MINUTES, before the
 * offer's end.
 */

/* Written against the current schema (the site's other Admin calls still name
   2025-07, which Shopify no longer serves as such). */
const API_VERSION = "2026-10";
const OFFER_MS = OFFER_MINUTES * 60_000;
/** No 0/O or 1/I; 32 characters, so a random byte maps onto them evenly. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const CREATE = `
  mutation discountCodeFreeShippingCreate($input: DiscountCodeFreeShippingInput!) {
    discountCodeFreeShippingCreate(freeShippingCodeDiscount: $input) {
      codeDiscountNode { id }
      userErrors { field code message }
    }
  }
`;

/** "31 Oct, 19:42" in UK time, for the discount's title in Shopify admin. */
const ukTime = (ms: number) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(ms);

export const startDeliveryOffer = createServerFn({ method: "POST" })
  // The time the bag's timer has left, by the shopper's clock - so Shopify's
  // end (by Shopify's clock) lands on the bag's 00:00 whatever theirs says.
  // No margin (v227): the request's own travel time already puts it a moment
  // after 00:00, and v226's 30 s let a typed code work for those 30 s.
  .inputValidator(z.object({ leftMs: z.number().int().min(1000).max(OFFER_MS) }))
  .handler(async ({ data }): Promise<{ code: string } | null> => {
    const now = Date.now();
    const endsAt = Math.min(now + data.leftMs, OFFER_ENDS);
    if (endsAt <= now) return null;
    const code =
      OFFER_CODE_PREFIX + Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => ALPHABET[b % 32]).join("");
    const input = {
      title: `Free delivery 10-minute offer, one bag, ends ${ukTime(endsAt)} UK (made by the site)`,
      code,
      startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      context: { all: "ALL" },
      destination: { countries: { add: FREE_DELIVERY_COUNTRIES } },
      usageLimit: 1,
      appliesOncePerCustomer: false,
      combinesWith: { productDiscounts: true, orderDiscounts: true, shippingDiscounts: false },
    };

    const make = async (token: string) => {
      const res = await fetch(`https://${SHOPIFY_SHOP_DOMAIN}/admin/api/${API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query: CREATE, variables: { input } }),
      });
      const json = res.ok ? await res.json() : null;
      const made = !!json?.data?.discountCodeFreeShippingCreate?.codeDiscountNode?.id;
      if (!made) {
        const why = JSON.stringify(json?.errors ?? json?.data?.discountCodeFreeShippingCreate?.userErrors ?? null);
        console.error("Delivery offer code not made:", res.status, why.slice(0, 300));
      }
      const denied = res.status === 401 || res.status === 403 || /ACCESS_DENIED/.test(JSON.stringify(json?.errors ?? ""));
      return { made, denied };
    };

    try {
      const cfg = getServerConfig();
      let token = await getAdminToken(cfg);
      if (!token) return null;
      let r = await make(token);
      // A token minted before write_discounts was granted lacks it: mint one more.
      if (!r.made && r.denied) {
        dropAdminToken();
        token = await getAdminToken(cfg);
        if (!token) return null;
        r = await make(token);
      }
      return r.made ? { code } : null;
    } catch (e) {
      console.error("Delivery offer code not made:", e);
      return null;
    }
  });
