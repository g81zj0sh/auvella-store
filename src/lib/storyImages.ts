/*
 * Optional per-product image for the second story section: a UGC-style,
 * phone-shot image showing how the piece behaves when worn. Brand imagery
 * made from briefs - never presented as a customer photo, and never paired
 * with an invented name or quote (DMCC Act).
 *
 * callouts: labels drawn over the image with a thin pointer line, as on
 * smooche.com. x/y and toX/toY are percentages of the image box: the label
 * sits at (x, y) and its line runs to the feature at (toX, toY).
 */
export type StoryCallout = { label: string; x: number; y: number; toX: number; toY: number };
export type StoryImage = { src: string; alt: string; callouts?: StoryCallout[] };

export const STORY_IMAGES: Record<string, StoryImage> = {
  // Anchor (29 Sept 2026): Soul 2.0 candid mirror shot, garment put on by
  // Seedream from the product photos. Awaiting Joshua's go before the rest.
  "high-waist-shaping-shorts-with-lace-trim": {
    src: "/story/lace-trim-shorts-mirror.webp",
    alt: "Lace-Trim High-Waist Shaping Shorts worn with a white crop top, mirror photo",
  },
};
