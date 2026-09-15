import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerConfig } from "./config.server";

/*
 * Guest order lookup for /tracking.
 *
 * Neither the Storefront API nor the Customer Account API can look up an
 * order by number + email for a visitor who isn't logged in, so this runs
 * server-side against the Admin API with a token that never reaches the
 * browser. Only the .handler body is server-only (the rest of this module
 * is shared with the client), so credentials are read inside it via
 * getServerConfig().
 *
 * Shopify retired admin-created custom apps on 1 Jan 2026, so there is no
 * permanent shpat_ token to store any more. A Dev Dashboard app authenticates
 * to a store in the same organisation with the client credentials grant, and
 * the resulting token expires after 24 hours. We therefore hold the app's
 * credentials as Cloudflare Worker secrets and mint a token on demand,
 * caching it in the isolate until shortly before it expires:
 *
 *   SHOPIFY_CLIENT_ID      — Dev Dashboard app client ID
 *   SHOPIFY_CLIENT_SECRET  — Dev Dashboard app client secret
 *
 * The app version must have the read_orders scope released and be installed
 * on the store (read_all_orders too if orders older than 60 days should
 * resolve).
 *
 * Privacy: an order is only returned when the submitted email matches the
 * order's email exactly (case-insensitive). A mismatch is reported the same
 * way as "not found" so the endpoint can't be used to test whether an order
 * number exists.
 *
 * Honesty: if the token isn't configured, the lookup says so. It never
 * fabricates a status.
 */

const SHOP_DOMAIN = "bys-store-2961694-648466.myshopify.com";
const ADMIN_API_VERSION = "2025-07";

/*
 * Token cache. Module scope, so it lives as long as the Worker isolate —
 * a cold start just means one extra exchange, which is cheap. Renewed five
 * minutes before expiry to absorb clock skew and in-flight requests.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;
const RENEW_MARGIN_MS = 5 * 60 * 1000;

async function getAdminToken(
  cfg: { shopifyAdminToken?: string; shopifyClientId?: string; shopifyClientSecret?: string },
): Promise<string | null> {
  // A legacy permanent token, if one exists, is used as-is.
  if (cfg.shopifyAdminToken) return cfg.shopifyAdminToken;
  if (!cfg.shopifyClientId || !cfg.shopifyClientSecret) return null;

  if (cachedToken && cachedToken.expiresAt - RENEW_MARGIN_MS > Date.now()) {
    return cachedToken.value;
  }

  const res = await fetch(`https://${SHOP_DOMAIN}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: cfg.shopifyClientId,
      client_secret: cfg.shopifyClientSecret,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) {
    // shop_not_permitted here means the app and store aren't in the same
    // Shopify organisation; anything else is transient.
    console.error("Shopify token exchange failed:", res.status, await res.text().catch(() => ""));
    cachedToken = null;
    return null;
  }
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 86399) * 1000,
  };
  return cachedToken.value;
}

export type TrackingStage = 1 | 2 | 3 | 4 | 5;

export type TrackedOrder = {
  name: string; // "#1042"
  createdAt: string; // ISO
  stage: TrackingStage;
  stageLabel: string;
  businessDaysSinceOrder: number;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  orderStatusUrl: string | null;
  cancelled: boolean;
};

export type LookupResult =
  | { ok: true; order: TrackedOrder }
  | { ok: false; reason: "not-found" | "not-configured" | "invalid" | "error" };

/** Mon–Fri days elapsed between two instants. UK bank holidays are not excluded. */
export function businessDaysBetween(from: Date, to: Date): number {
  let days = 0;
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) days += 1;
  }
  return days;
}

function normaliseOrderNumber(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits || digits.length > 10) return null;
  return `#${digits}`;
}

/*
 * Checkout allows a phone number instead of an email, and orders placed that
 * way carry no email at all — so the lookup accepts email, phone OR postcode.
 * Postcode is the useful one: every order has a delivery address even when it
 * has neither an email nor a phone, and it's what UK shoppers are used to
 * being asked for.
 *
 * A phone is compared on its last 9 digits so "+447700900123", "07700900123"
 * and "7700900123" all match the same person without guessing at country
 * codes. A postcode is compared with case and spaces stripped.
 *
 * Any of these plus the exact order number identifies one order; none of them
 * is enough to go fishing with.
 */
type Contact =
  | { kind: "email"; value: string }
  | { kind: "phone"; value: string }
  | { kind: "postcode"; value: string };

function normaliseContact(raw: string): Contact | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.includes("@")) {
    const e = t.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? { kind: "email", value: e } : null;
  }
  const digits = t.replace(/[^0-9]/g, "");
  // A UK postcode always contains letters; a phone number never does.
  if (/[a-z]/i.test(t)) {
    const pc = t.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return pc.length >= 5 && pc.length <= 8 ? { kind: "postcode", value: pc } : null;
  }
  if (digits.length < 9 || digits.length > 15) return null;
  return { kind: "phone", value: digits.slice(-9) };
}

function postcodeMatches(candidate: string | null | undefined, pc: string): boolean {
  if (!candidate) return false;
  return candidate.toUpperCase().replace(/[^A-Z0-9]/g, "") === pc;
}

function phoneMatches(candidate: string | null | undefined, last9: string): boolean {
  if (!candidate) return false;
  const d = candidate.replace(/[^0-9]/g, "");
  return d.length >= 9 && d.slice(-9) === last9;
}

function contactMatchesOrder(o: AdminOrder, c: Contact): boolean {
  if (c.kind === "email") {
    return [o.email, o.customer?.email].some((e) => (e ?? "").toLowerCase() === c.value);
  }
  if (c.kind === "phone") {
    return [o.phone, o.customer?.phone, o.shippingAddress?.phone, o.billingAddress?.phone].some((p) =>
      phoneMatches(p, c.value),
    );
  }
  return [o.shippingAddress?.zip, o.billingAddress?.zip].some((z) => postcodeMatches(z, c.value));
}

const ORDER_QUERY = `
  query trackOrder($q: String!) {
    orders(first: 1, query: $q) {
      nodes {
        name
        email
        phone
        customer { email phone }
        shippingAddress { phone zip }
        billingAddress { phone zip }
        createdAt
        cancelledAt
        displayFulfillmentStatus
        statusPageUrl
        fulfillments(first: 5) {
          displayStatus
          inTransitAt
          deliveredAt
          trackingInfo(first: 1) { company number url }
        }
      }
    }
  }
`;

type AdminOrder = {
  name: string;
  email: string | null;
  phone: string | null;
  customer: { email: string | null; phone: string | null } | null;
  shippingAddress: { phone: string | null; zip: string | null } | null;
  billingAddress: { phone: string | null; zip: string | null } | null;
  createdAt: string;
  cancelledAt: string | null;
  displayFulfillmentStatus: string;
  statusPageUrl: string | null;
  fulfillments: Array<{
    displayStatus: string | null;
    inTransitAt: string | null;
    deliveredAt: string | null;
    trackingInfo: Array<{ company: string | null; number: string | null; url: string | null }>;
  }>;
};

/*
 * A tracking number existing is NOT the same as a parcel moving. Our supply
 * partner books the shipment and Shopify records a fulfilment the moment a
 * label is generated — often a couple of days before the courier physically
 * collects anything. Treating that as "in transit" tells the customer
 * something untrue on the exact page that promises not to.
 *
 * So "booked" and "in transit" are separate stages, and we only claim
 * movement when Shopify has an inTransitAt timestamp or a courier status
 * that says so.
 */
const MOVING_STATUSES = new Set(["IN_TRANSIT", "OUT_FOR_DELIVERY", "ATTEMPTED_DELIVERY"]);

function deriveStage(o: AdminOrder): { stage: TrackingStage; label: string } {
  const f = o.fulfillments;
  if (f.some((x) => x.deliveredAt || x.displayStatus === "DELIVERED")) {
    return { stage: 5, label: "Delivered" };
  }
  if (f.some((x) => x.inTransitAt || MOVING_STATUSES.has(x.displayStatus ?? ""))) {
    return { stage: 4, label: "In transit" };
  }
  if (f.length > 0) return { stage: 3, label: "Shipment booked" };
  return { stage: 2, label: "Being prepared" };
}

export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().max(20), email: z.string().max(254) })) // `email` carries an email OR a phone number
  .handler(async ({ data }): Promise<LookupResult> => {
    const name = normaliseOrderNumber(data.orderNumber);
    const contact = normaliseContact(data.email);
    if (!name || !contact) return { ok: false, reason: "invalid" };

    const cfg = getServerConfig();
    let token: string | null;
    try {
      token = await getAdminToken(cfg);
    } catch {
      return { ok: false, reason: "error" };
    }
    if (!token) return { ok: false, reason: "not-configured" };

    const ask = (t: string) =>
      fetch(`https://${SHOP_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": t },
        body: JSON.stringify({ query: ORDER_QUERY, variables: { q: `name:${name}` } }),
      });

    try {
      let res = await ask(token);
      // A cached token can expire mid-flight: drop it and mint one more.
      if (res.status === 401) {
        cachedToken = null;
        const fresh = await getAdminToken(cfg);
        if (!fresh) return { ok: false, reason: "not-configured" };
        res = await ask(fresh);
      }
      if (!res.ok) return { ok: false, reason: "error" };
      const json = (await res.json()) as { data?: { orders?: { nodes?: AdminOrder[] } } };
      const o = json.data?.orders?.nodes?.[0];
      if (!o || o.name !== name) return { ok: false, reason: "not-found" };
      // Mismatches read as not-found so the endpoint can't confirm which
      // order numbers exist or brute-force a contact detail against one.
      if (!contactMatchesOrder(o, contact)) return { ok: false, reason: "not-found" };

      const { stage, label } = deriveStage(o);
      const t = o.fulfillments.flatMap((f) => f.trackingInfo)[0];
      return {
        ok: true,
        order: {
          name: o.name,
          createdAt: o.createdAt,
          stage,
          stageLabel: label,
          businessDaysSinceOrder: businessDaysBetween(new Date(o.createdAt), new Date()),
          courier: t?.company ?? null,
          trackingNumber: t?.number ?? null,
          trackingUrl: t?.url ?? null,
          orderStatusUrl: o.statusPageUrl ?? null,
          cancelled: !!o.cancelledAt,
        },
      };
    } catch {
      return { ok: false, reason: "error" };
    }
  });
