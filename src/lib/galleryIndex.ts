import { canonicalColour } from "@/lib/colourAliases";
/* Gallery index: every gallery image on the store, assigned to its colourway
 * and split into model shots (m) and garment-only shots (g), keyed by image
 * filename. The generated table is lib/galleryIndexData.ts (v205). */

/** sw: for prints and patterns, where a flat dot would mislead — the swatch is
    a zoomed crop of the fabric itself. f is the source image, x/y the CSS
    background-position percentages and z the background-size percentage,
    chosen offline as the most patterned square that sits entirely on cloth. */
export type SwatchCrop = { f: string; x: number; y: number; z: number };
export type GalleryEntry = { m: string[]; g: string[]; hex: string | null; sw?: SwatchCrop };

/* v205: filled from lib/galleryIndexData.ts - in full on the server, and in the
   browser from the page's own seed and then the whole table once the page is
   interactive (lib/catalogTables). Starts empty in the browser. */
export const GALLERY_INDEX: Record<string, Record<string, GalleryEntry>> = {};

type Img = { url: string; altText?: string | null };

const fileOf = (url: string) => {
  try {
    return new URL(url).pathname.split("/").pop() ?? url;
  } catch {
    return url.split("?")[0].split("/").pop() ?? url;
  }
};

export function indexedEntry(handle: string, color: string | null | undefined): GalleryEntry | null {
  if (!color) return null;
  return GALLERY_INDEX[handle]?.[canonicalColour(handle, color)] ?? null;
}

/** Ordered model-then-garment image list for a colour, restricted to images
    actually present in the fetched gallery. null when the product isn't indexed. */
export function galleryUrls<T extends Img>(handle: string, color: string | null | undefined, images: T[]): T[] | null {
  const e = indexedEntry(handle, color);
  if (!e) return null;
  const byFile = new Map<string, T>();
  for (const im of images) byFile.set(fileOf(im.url), im);
  const out: T[] = [];
  for (const f of [...e.m, ...e.g]) {
    const im = byFile.get(f);
    if (im) out.push(im);
  }
  return out;
}

/** First garment-only shot for a colour, if the gallery has one. */
export function indexedGhost(handle: string, color: string | null | undefined, images: Img[]): string | null {
  const e = indexedEntry(handle, color);
  if (!e || e.g.length === 0) return null;
  for (const im of images) if (fileOf(im.url) === e.g[0]) return im.url;
  return STORE_FILES + e.g[0];
}

/** Model photo a collection tile should rest on for a colour. Keeps Shopify's
    own pick when it is one of that colour's model shots; otherwise uses the
    colour's first indexed model shot that was fetched. Some colours have no
    Shopify colour-to-image link, which left the tile showing another colour's
    photo (e.g. Purple swatch, red bralette). */
export function indexedRestImage(handle: string, color: string | null | undefined, images: Img[], current: string): string {
  const e = indexedEntry(handle, color);
  if (!e || e.m.length === 0) return current;
  if (e.m.includes(fileOf(current))) return current;
  const byFile = new Map<string, string>();
  for (const im of images) byFile.set(fileOf(im.url), im.url);
  for (const f of e.m) {
    const u = byFile.get(f);
    if (u) return u;
  }
  // Not in the fetched batch (collection queries only fetch a product's first
  // images): every indexed file lives in the store's one Files folder.
  return STORE_FILES + e.m[0];
}

/** The store's Shopify Files folder; every indexed filename lives here. */
const STORE_FILES = "https://cdn.shopify.com/s/files/1/0988/0738/2311/files/";

/** Measured swatch colour, or null to fall back to the name map. */
export function indexedHex(handle: string, color: string | null | undefined): string | null {
  return indexedEntry(handle, color)?.hex ?? null;
}

/** Swatch crop for a print colourway, resolved against the images actually
    fetched. null when the colour has a measurable flat colour instead. */
export function indexedSwatch(
  handle: string,
  color: string | null | undefined,
  images: Img[],
): { url: string; position: string; size: string } | null {
  const sw = indexedEntry(handle, color)?.sw;
  if (!sw) return null;
  const position = `${sw.x}% ${sw.y}%`;
  const size = `${sw.z}%`;
  for (const im of images) {
    if (fileOf(im.url) === sw.f) return { url: im.url, position, size };
  }
  // Not in the fetched batch (the bag's grids fetch 6 photos a product), so a
  // print showed as a flat dot - 'Black Floral' as plain black - until the
  // full product loaded. Every indexed file lives in the store's Files folder.
  return { url: STORE_FILES + sw.f, position, size };
}
