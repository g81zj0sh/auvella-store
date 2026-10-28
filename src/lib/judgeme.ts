import { useQuery } from "@tanstack/react-query";
import type { Review } from "@/components/site/Reviews";

/**
 * Judge.me headless integration.
 *
 * Reading reviews uses Judge.me's public widget API (public token — it can only
 * read sanitized, published review HTML). Since v210 the Worker fetches and
 * parses it into our own Review shape (lib/reviewsServer), so the storefront
 * keeps Auvella's custom reviews UI instead of the stock Judge.me widget.
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

/*
 * v210: reviews come from the store's own Worker (GET /api/reviews/<handle>,
 * lib/reviewsServer), which keeps each product's Judge.me reviews parsed and
 * fresh - not from Judge.me directly, whose widget API takes 1.3-1.5 s and
 * needed parsing in the browser. A product page arrives with its reviews in
 * the page (seeded through `initial`); this fetch is for visits from another
 * page, the bundle quick view and the glue popup.
 */
export async function fetchJudgemeData(handle: string): Promise<JudgemeData> {
  if (!JUDGEME_ENABLED || typeof window === "undefined") return { reviews: [], average: 0, count: 0 };
  const res = await fetch(`/api/reviews/${encodeURIComponent(handle)}`);
  if (!res.ok) throw new Error(`reviews ${res.status}`);
  return (await res.json()) as JudgemeData;
}

export function useJudgemeReviews(handle: string | undefined, initial?: JudgemeData | null) {
  return useQuery({
    queryKey: ["judgeme-reviews", handle],
    queryFn: () => fetchJudgemeData(handle!),
    enabled: !!handle,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    initialData: initial ?? undefined,
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
  /** Publicly reachable image URLs, from uploadReviewPhoto. */
  pictureUrls?: string[];
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
  // Judge.me only accepts publicly fetchable URLs here — see reviewPhoto.functions.ts
  for (const u of s.pictureUrls ?? []) form.append("picture_urls[]", u);

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
