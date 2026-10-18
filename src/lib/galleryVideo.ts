/*
 * Gallery videos (v200).
 *
 * Some products carry a short clip (a slow turn around the garment) as the
 * last item of their Shopify gallery. The product page builds a separate
 * gallery per colour (galleryIndex.ts), so the clip never showed. For the
 * products listed here it is the last slide of every colour's gallery, after
 * the back flat lay, whichever colour is picked.
 *
 * It streams straight from Shopify's video CDN, which answers byte ranges
 * (206), so iPhones play it - unlike our own Static Assets (see videoRange.ts).
 *
 * 18 Oct 2026: the Lace Scoop Bralette first (v200), then every bra and
 * underwear piece with a clip (v201). A new clip needs its handle here and
 * its background in imageBackdrops.ts (keyed by the 720p MP4's filename,
 * measured off decoded frames) so the slide's edges match it exactly; the
 * fallback reads it off the first frame in the browser.
 */
import type { ShopifyMediaNode } from "@/lib/shopify";

export const GALLERY_VIDEO_HANDLES: ReadonlySet<string> = new Set([
  // Bras
  "lace-scoop-bralette-comfortable-seamless-underwear",
  "invisible-front-buckle-strapless-bra",
  "jelly-cup-multi-way-strapless-bra",
  "auvella-seamless-comfort-bralette",
  "seamless-sculpt-sports-bra",
  "maternity-nursing-bra-front-opening-push-up",
  // Underwear
  "high-waisted-tummy-control-shaping-pants",
  "womens-high-waisted-breathable-traceless-thong-panties",
  "lace-breathable-thong-underwear",
  "cotton-lace-brief",
]);

export type GalleryVideo = {
  /** The sharpest MP4 rendition up to 1080p (Shopify makes 480p and 720p). */
  src: string;
  /** Shopify's first-frame still, shown only until the first frame has loaded
      (it comes out darker than the clip plays - see GalleryVideoSlide). */
  poster: string | null;
  alt: string;
};

const MAX_EDGE = 1080;

/** The Storefront API hands video files out on the store's own domain
    (www.auvellawear.com/cdn/shop/videos/…), which only works while that
    domain points at Shopify. Their canonical home (the files' own
    rel="canonical") is cdn.shopify.com. */
function canonicalVideoUrl(url: string): string {
  return url.replace(/^https?:\/\/[^/]+\/cdn\/shop\/videos\//, "https://cdn.shopify.com/videos/");
}

/** The first video in the product's gallery with an MP4 rendition, or null. */
export function galleryVideoFrom(media: ShopifyMediaNode[] | undefined, title: string): GalleryVideo | null {
  for (const m of media ?? []) {
    if (m.mediaContentType !== "VIDEO") continue;
    const mp4 = (m.sources ?? [])
      .filter((s) => s.mimeType === "video/mp4" || s.format === "mp4")
      .filter((s) => Math.max(s.width ?? 0, s.height ?? 0) <= MAX_EDGE)
      .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
    if (!mp4) continue;
    return {
      src: canonicalVideoUrl(mp4.url),
      poster: m.previewImage?.url ?? null,
      alt: m.alt?.trim() || `${title} video`,
    };
  }
  return null;
}
