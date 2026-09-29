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
    src: "/story/lace-trim-shorts-mirror-v2.webp",
    alt: "Lace-Trim High-Waist Shaping Shorts worn with a white crop top, mirror photo",
  },
  // 30 Sept 2026 test pair (Joshua reviews before the rest): Soul 2.0 candid,
  // garment applied by Seedream from the product photos; checked against the
  // product shots; bodysuit fabric cleaned in a second Seedream pass.
  "one-piece-shapewear-bodysuit-with-tummy-control": {
    src: "/story/tummy-control-bodysuit-mirror-v2.webp",
    alt: "Tummy Control Sculpting Bodysuit in black, mirror photo in a sunlit bedroom",
  },
  "invisible-front-buckle-strapless-bra": {
    src: "/story/front-buckle-bra-mirror-v2.webp",
    alt: "Front-Buckle Strapless Bra in nude worn with light-wash jeans, mirror photo",
  },
  // Situational, posed-for-camera shots (Joshua, 30 Sept 2026: real moments
  // where the piece belongs, looking into the camera, not mirror selfies).
  "off-shoulder-sculpt-midi-dress": {
    src: "/story/off-shoulder-dress-evening.webp",
    alt: "Off-Shoulder Sculpt Dress in deep wine red, on a city street at dusk before dinner",
  },
  "solid-colour-bikini-set": {
    src: "/story/bikini-beach-holiday.webp",
    alt: "Solid Colour Bikini Set in hot pink, at the edge of the sea on holiday",
  },
  // Batch 1 (30 Sept 2026): mixed posed moments and mirror shots at real
  // places, neutral and slight-smile expressions; garments applied by Seedream.
  "seamless-shaping-long-sleeve-bodysuit": {
    src: "/story/long-sleeve-bodysuit-brunch.webp",
    alt: "Seamless Long Sleeve Shaping Bodysuit in black worn with jeans at a café terrace",
  },
  "satin-cami-pajama-set": {
    src: "/story/satin-cami-pyjamas-morning.webp",
    alt: "Satin Cami Pyjama Set in deep red, morning coffee by sunlit windows at home",
  },
  "fleece-lined-drawstring-lounge-set": {
    src: "/story/fleece-lounge-set-autumn-walk.webp",
    alt: "Fleece Drawstring Lounge Set in cream on an autumn walk with a coffee",
  },
  "v-neck-bodycon-mini-dress": {
    src: "/story/v-neck-mini-restaurant-mirror-v2.webp",
    alt: "V-Neck Bodycon Mini Dress in powder blue, mirror photo in a restaurant",
  },
  "long-sleeve-zip-one-piece-swimsuit": {
    src: "/story/zip-swimsuit-boat.webp",
    alt: "Long Sleeve Zip-Front Swimsuit in palm print on a boat on holiday",
  },
  "satin-tie-waist-robe": {
    src: "/story/satin-robe-hotel-balcony.webp",
    alt: "Satin Tie-Waist Robe in pink at a hotel balcony door in the morning",
  },
  "seamless-sculpt-sports-bra": {
    src: "/story/sports-bra-rooftop.webp",
    alt: "Seamless Sculpt Sports Bra in cherry red after a workout on a sunny rooftop",
  },
  "ribbed-short-sleeve-mini-dress": {
    src: "/story/ribbed-mini-hotel-lift-v2.webp",
    alt: "Ribbed Short Sleeve Mini Dress in white, mirror photo in a hotel lift",
  },
};
