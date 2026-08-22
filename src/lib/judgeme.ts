import { useQuery } from "@tanstack/react-query";
import type { Review } from "@/components/site/Reviews";

/**
 * Judge.me headless integration.
 *
 * Reading reviews uses Judge.me's public widget API (public token — safe to ship
 * client-side; it can only read sanitized, published review HTML). We parse the
 * widget HTML into our own Review shape so the storefront keeps Auvella's custom
 * reviews UI instead of the stock Judge.me widget.
 *
 * Submitting reviews uses Judge.me's public create endpoint (no token needed —
 * equivalent to their public review form). Submissions enter Judge.me moderation
 * and appear once approved.
 */

export const JUDGEME_SHOP_DOMAIN = "bys-store-2961694-648466.myshopify.com";

/**
 * ⬇️ PASTE THE JUDGE.ME **PUBLIC** API TOKEN HERE (Judge.me admin → Settings →
 * scroll to "API" / "Integrations" → Public API Token). This is the public,
 * browser-safe token — NOT the private one. Until it's set, the site simply
 * shows the "No reviews yet" state and the write-a-review form still works.
 */
export const JUDGEME_PUBLIC_TOKEN = "Iy0XbIavoo7umbf3LrA_GRwnBrQ";

export const JUDGEME_ENABLED = JUDGEME_PUBLIC_TOKEN.length > 0;

const API = "https://judge.me/api/v1";

export interface JudgemeData {
  reviews: Review[];
  average: number;
  count: number;
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function parseWidgetHtml(html: string): Review[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: Review[] = [];
  doc.querySelectorAll(".jdgm-rev").forEach((rev) => {
    const rating = parseFloat(
      rev.querySelector(".jdgm-rev__rating")?.getAttribute("data-score") ?? "",
    );
    const body = text(rev.querySelector(".jdgm-rev__body"));
    if (!body && isNaN(rating)) return;
    const iso =
      rev.querySelector(".jdgm-rev__timestamp")?.getAttribute("data-content") ?? "";
    const verified =
      rev.getAttribute("data-verified-buyer") === "true" ||
      !!rev.querySelector(".jdgm-rev__buyer-badge");
    out.push({
      name: text(rev.querySelector(".jdgm-rev__author")) || "Anonymous",
      rating: isNaN(rating) ? 5 : rating,
      title: text(rev.querySelector(".jdgm-rev__title")) || undefined,
      body,
      verified,
      date: iso ? formatDate(iso) : undefined,
    });
  });
  return out;
}

function parseBadgeHtml(html: string): { average: number; count: number } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const badge = doc.querySelector("[data-average-rating]");
  const average = parseFloat(badge?.getAttribute("data-average-rating") ?? "0") || 0;
  const count =
    parseInt(badge?.getAttribute("data-number-of-reviews") ?? "0", 10) || 0;
  return { average, count };
}

export async function fetchJudgemeData(handle: string): Promise<JudgemeData> {
  if (!JUDGEME_ENABLED) return { reviews: [], average: 0, count: 0 };
  const params = (extra: string) =>
    `api_token=${encodeURIComponent(JUDGEME_PUBLIC_TOKEN)}&shop_domain=${encodeURIComponent(
      JUDGEME_SHOP_DOMAIN,
    )}&handle=${encodeURIComponent(handle)}${extra}`;
  const [widgetRes, badgeRes] = await Promise.allSettled([
    fetch(`${API}/widgets/product_review?${params("&per_page=24")}`),
    fetch(`${API}/widgets/preview_badge?${params("")}`),
  ]);

  let reviews: Review[] = [];
  if (widgetRes.status === "fulfilled" && widgetRes.value.ok) {
    const json = await widgetRes.value.json();
    if (typeof json?.widget === "string") reviews = parseWidgetHtml(json.widget);
  }

  let average = 0;
  let count = reviews.length;
  if (badgeRes.status === "fulfilled" && badgeRes.value.ok) {
    const json = await badgeRes.value.json();
    if (typeof json?.badge === "string") {
      const parsed = parseBadgeHtml(json.badge);
      if (parsed.count > 0) {
        average = parsed.average;
        count = parsed.count;
      }
    }
  }
  if (!average && reviews.length) {
    average = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  }
  return { reviews, average, count };
}

export function useJudgemeReviews(handle: string | undefined) {
  return useQuery({
    queryKey: ["judgeme-reviews", handle],
    queryFn: () => fetchJudgemeData(handle!),
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/** Extract numeric Shopify product ID from a Storefront API gid. */
export function numericProductId(gid: string): string {
  const m = gid.match(/(\d+)$/);
  return m ? m[1] : gid;
}

export interface ReviewSubmission {
  productGid: string;
  name: string;
  email: string;
  rating: number;
  title?: string;
  body: string;
}

/**
 * Submit a review via Judge.me's public create endpoint (no auth required —
 * same as their on-page form). The review appears after Judge.me moderation.
 *
 * NOTE: must be form-encoded, not JSON. A JSON POST triggers a CORS preflight
 * (OPTIONS) which Judge.me's API answers with a 404 and no CORS headers, so
 * browsers abort with "Failed to fetch". A form-encoded POST is a CORS
 * "simple request" (no preflight) and the response carries
 * `access-control-allow-origin: *`, so it works from the storefront.
 */
export async function submitJudgemeReview(s: ReviewSubmission): Promise<void> {
  const form = new URLSearchParams();
  form.set("shop_domain", JUDGEME_SHOP_DOMAIN);
  form.set("platform", "shopify");
  form.set("id", numericProductId(s.productGid));
  form.set("name", s.name);
  form.set("email", s.email);
  form.set("rating", String(s.rating));
  if (s.title) form.set("title", s.title);
  form.set("body", s.body);

  const res = await fetch(`${API}/reviews`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    let msg = "Something went wrong — please try again.";
    try {
      const json = await res.json();
      if (typeof json?.error === "string") msg = json.error;
      else if (typeof json?.message === "string") msg = json.message;
    } catch {
      /* keep default message */
    }
    throw new Error(msg);
  }
}
