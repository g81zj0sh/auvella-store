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
 * is shared with the client), so the token is read inside it via
 * getServerConfig(). The token is a Cloudflare Worker secret:
 *
 *   SHOPIFY_ADMIN_TOKEN   — Admin API access token from a custom app with
 *                           the read_orders scope (read_all_orders too if
 *                           orders older than 60 days should resolve)
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

export type TrackingStage = 1 | 2 | 3 | 4;

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

function normaliseEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

const ORDER_QUERY = `
  query trackOrder($q: String!) {
    orders(first: 1, query: $q) {
      nodes {
        name
        email
        createdAt
        cancelledAt
        displayFulfillmentStatus
        statusPageUrl
        fulfillments(first: 5) {
          displayStatus
          trackingInfo(first: 1) { company number url }
        }
      }
    }
  }
`;

type AdminOrder = {
  name: string;
  email: string | null;
  createdAt: string;
  cancelledAt: string | null;
  displayFulfillmentStatus: string;
  statusPageUrl: string | null;
  fulfillments: Array<{
    displayStatus: string | null;
    trackingInfo: Array<{ company: string | null; number: string | null; url: string | null }>;
  }>;
};

function deriveStage(o: AdminOrder): { stage: TrackingStage; label: string } {
  const delivered = o.fulfillments.some((f) => f.displayStatus === "DELIVERED");
  if (delivered) return { stage: 4, label: "Delivered" };
  const dispatched =
    o.fulfillments.length > 0 ||
    o.displayFulfillmentStatus === "FULFILLED" ||
    o.displayFulfillmentStatus === "PARTIALLY_FULFILLED";
  if (dispatched) return { stage: 3, label: "Dispatched & in transit" };
  return { stage: 2, label: "Being prepared" };
}

export const lookupOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderNumber: z.string().max(20), email: z.string().max(254) }))
  .handler(async ({ data }): Promise<LookupResult> => {
    const name = normaliseOrderNumber(data.orderNumber);
    const email = normaliseEmail(data.email);
    if (!name || !email) return { ok: false, reason: "invalid" };

    const token = getServerConfig().shopifyAdminToken;
    if (!token) return { ok: false, reason: "not-configured" };

    try {
      const res = await fetch(`https://${SHOP_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query: ORDER_QUERY, variables: { q: `name:${name}` } }),
      });
      if (!res.ok) return { ok: false, reason: "error" };
      const json = (await res.json()) as { data?: { orders?: { nodes?: AdminOrder[] } } };
      const o = json.data?.orders?.nodes?.[0];
      if (!o || o.name !== name) return { ok: false, reason: "not-found" };
      if ((o.email ?? "").toLowerCase() !== email) return { ok: false, reason: "not-found" };

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
