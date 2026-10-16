import type { CSSProperties } from "react";
import type { ShopifyProduct } from "@/lib/shopify";
import { shopifyImg } from "@/lib/shopify";
import { indexedHex, indexedSwatch } from "@/lib/galleryIndex";
import { twoToneSwatch } from "@/lib/colorMap";

/*
 * Colour swatches, shared by the product page and the quick-add sheet so a
 * colour looks the same in both (v160: quick add used a cruder name map, so
 * e.g. the robe's Champagne Gold dot didn't match the page's).
 */

const COLOR_MAP: Record<string, string> = {
  // neutrals
  black: "#0d0d0d",
  white: "#f5f3ee",
  offwhite: "#f2efe8",
  ivory: "#efe7d4",
  cream: "#f1ead9",
  ecru: "#ece3d0",
  oat: "#e8dfc9",
  bone: "#eae4d6",
  beige: "#e6d6b8",
  sand: "#dcc9a8",
  stone: "#cfc4b2",
  taupe: "#b3a38e",
  nude: "#e2c2a4",
  skin: "#d8b899",
  tan: "#c89a72",
  camel: "#b98a54",
  caramel: "#a8703f",
  cocoa: "#5c3b27",
  mocha: "#6b4a37",
  coffee: "#5a4232",
  espresso: "#3c2a1e",
  brown: "#6b3a2a",
  chocolate: "#4a2a1c",
  grey: "#8a8a8a",
  gray: "#8a8a8a",
  heather: "#9a9a94",
  charcoal: "#2d2d2d",
  silver: "#c9c9c9",
  // reds / pinks
  red: "#a8312b",
  cherry: "#7e1c22",
  maroon: "#5e1d22",
  burgundy: "#5e1d22",
  wine: "#5e1d22",
  rust: "#a14e2f",
  terracotta: "#b0603f",
  copper: "#a5643c",
  pink: "#e3a5b1",
  blush: "#e8c4c4",
  rose: "#c97a8a",
  fuchsia: "#b23a76",
  magenta: "#a92f6f",
  coral: "#e07a5f",
  melon: "#f2917e",
  watermelon: "#df5f6a",
  peach: "#f0b8a0",
  apricot: "#eeb98a",
  salmon: "#e99787",
  // purples
  plum: "#5c3a56",
  purple: "#5d3a6e",
  violet: "#6b4e8e",
  grape: "#563a67",
  aubergine: "#472b46",
  lavender: "#b9a7cf",
  lilac: "#c6aedc",
  mauve: "#a5789b",
  orchid: "#a56aa8",
  // blues / greens
  navy: "#1e2a44",
  blue: "#274b73",
  cobalt: "#2a4a8f",
  royal: "#2c3f8f",
  denim: "#3f5673",
  sky: "#a9c4d9",
  teal: "#2f5f5f",
  turquoise: "#3a8f8a",
  mint: "#bcd8c4",
  sage: "#9aab93",
  olive: "#5a5a3a",
  khaki: "#8a805a",
  green: "#3f5a3a",
  emerald: "#2f6b4f",
  forest: "#2c4a34",
  // yellows / oranges
  yellow: "#d9b13b",
  lemon: "#e4cf5e",
  mustard: "#c2932f",
  gold: "#b8913d",
  champagne: "#e3d3b1",
  orange: "#cf6a2e",
  amber: "#c07f2e",
};

/**
 * Accurate swatch hex for a variant colour name, or null when no confident
 * match exists (prints, novel names) — callers then fall back to an image
 * swatch cropped from the variant's own photo.
 */
export function swatchHex(name: string): string | null {
  const key = name.toLowerCase().trim();
  let best: string | null = null;
  let bestLen = 0;
  for (const k of Object.keys(COLOR_MAP)) {
    if (key.includes(k) && k.length > bestLen) {
      best = COLOR_MAP[k];
      bestLen = k.length;
    }
  }
  return best;
}

/**
 * Background for one colour's swatch. Prints get a zoomed crop of the fabric
 * — a flat dot would read as a solid colour and mislead. Everything else uses
 * its measured hex, then the name map, then a crop of the variant's photo.
 */
export function colourSwatchStyle(
  node: ShopifyProduct["node"],
  optionName: string,
  value: string,
  images: Array<{ url: string; altText: string | null }>,
): CSSProperties {
  const crop = indexedSwatch(node.handle, value, images);
  if (crop)
    return {
      backgroundImage: `url(${shopifyImg(crop.url, 400)})`,
      backgroundPosition: crop.position,
      backgroundSize: crop.size,
    };
  const measured = indexedHex(node.handle, value);
  if (measured) return { backgroundColor: measured };
  // v196: "<trim> & <body>" colours get a split dot, same helper as the tiles.
  const split = twoToneSwatch(value);
  if (split) return { backgroundImage: split };
  const hex = swatchHex(value);
  if (hex) return { backgroundColor: hex };
  const imgSwatch = node.variants.edges.find(
    (vv) =>
      vv.node.selectedOptions.some((o) => o.name === optionName && o.value === value) &&
      vv.node.image?.url,
  )?.node.image?.url;
  if (imgSwatch)
    return {
      backgroundImage: `url(${shopifyImg(imgSwatch, 96)})`,
      backgroundPosition: "center 30%",
    };
  return { backgroundColor: "#c9b9a3" };
}
