/*
 * v205: the Higgsfield campaign shots, self-hosted.
 *
 * They were hotlinked from Higgsfield's CloudFront as the 1536x2048 PNG
 * masters, 4-6 MB each. EditorialImage's ?width= srcset only resizes on
 * Shopify's CDN - CloudFront ignores it - so a phone downloaded the whole
 * master for every ~200px tile: about 40 MB down the homepage, 5 MB per
 * mega-menu tile. These are the same images, resized (lanczos) and encoded
 * to WebP at the widths the tiles actually paint at. Nothing is cropped.
 */
const FILES = import.meta.glob<string>("../assets/editorial/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const WIDTHS = [480, 800, 1200] as const;

export type EditorialName =
  | "bodysuits"
  | "bras"
  | "dresses"
  | "lounge"
  | "new-arrivals"
  | "pyjamas"
  | "sculpt"
  | "sets"
  | "shorts"
  | "swim-one-piece";

function fileUrl(name: EditorialName, width: number): string {
  const url = FILES[`../assets/editorial/${name}-${width}.webp`];
  if (!url) throw new Error(`Missing editorial image ${name}-${width}.webp`);
  return url;
}

/** srcset per image, keyed by its `src` (the largest rendition). */
const SRCSETS = new Map<string, string>();

/** The largest rendition: what `src` carries, and the key for the srcset. */
export function editorialSrc(name: EditorialName): string {
  const src = fileUrl(name, WIDTHS[WIDTHS.length - 1]);
  if (!SRCSETS.has(src)) {
    SRCSETS.set(src, WIDTHS.map((w) => `${fileUrl(name, w)} ${w}w`).join(", "));
  }
  return src;
}

/** srcset for a self-hosted editorial image, or undefined for anything else. */
export function editorialSrcSet(src: string): string | undefined {
  return SRCSETS.get(src);
}
