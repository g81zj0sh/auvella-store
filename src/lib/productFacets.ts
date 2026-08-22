/* ------------------------------------------------------------------ */
/* Product facet data — powers the SKIMS-style filter bar on          */
/* collection pages. Every value below is taken from the product's    */
/* actual specification sheet (material %, cup construction, wiring,  */
/* closure, thickness), not guessed. If a product lacks a facet it    */
/* simply doesn't participate in that filter.                        */
/* ------------------------------------------------------------------ */

export type FacetValues = Record<string, string | string[]>;

export const FACET_LABELS: Record<string, string> = {
  category: "Collection",
  style: "Style",
  wiring: "Wiring",
  lining: "Lining",
  cup: "Cup",
  support: "Support Level",
  target: "Target Area",
  sleeve: "Sleeve Length",
  neckline: "Neckline",
  length: "Length",
  rise: "Rise",
  fabric: "Fabric",
  material: "Material",
};

export const PRODUCT_FACETS: Record<string, FacetValues> = {
  /* ---------------- Bras & Bralettes ---------------- */
  "invisible-front-buckle-strapless-bra": {
    category: "Bras & Bralettes",
    style: "Strapless",
    wiring: "Wireless",
    lining: "Padded",
    cup: "3/4 Cup",
    material: "Cotton",
  },
  "auvella-seamless-comfort-bralette": {
    category: "Bras & Bralettes",
    style: "Bralette",
    wiring: "Wireless",
    lining: "Lightly Lined",
    cup: "3/4 Cup",
    material: "Nylon",
  },
  "lace-scoop-bralette-comfortable-seamless-underwear": {
    category: "Bras & Bralettes",
    style: "Bralette",
    wiring: "Wireless",
    lining: "Lightly Lined",
    cup: "3/4 Cup",
    material: "Nylon Blend",
  },
  "womens-bra": {
    category: "Bras & Bralettes",
    style: "Strapless",
    wiring: "Wireless",
    lining: "Moulded",
    cup: "Silicone",
    material: "Silicone",
  },
  "seamless-sculpt-sports-bra": {
    category: "Activewear",
    style: "Sports",
    wiring: "Wireless",
    material: "Nylon Blend",
    support: "Light",
  },
  "maternity-nursing-bra-front-opening-push-up": {
    category: "Bras & Bralettes",
    style: "Nursing",
    wiring: "Wireless",
    lining: "Lightly Lined",
    cup: "Moulded",
    material: "Nylon Blend",
  },

  /* ---------------- Bodysuits ---------------- */
  "one-piece-shapewear-bodysuit-with-tummy-control": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Sleeveless",
    support: "Medium",
    target: ["Tummy", "Waist", "Bust", "Butt"],
    material: "Nylon",
  },
  "seamless-sculpting-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Sleeveless",
    support: "Firm",
    target: ["Tummy", "Butt"],
    material: "Nylon",
  },
  "lace-adjustable-sculpting-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Sleeveless",
    support: "Light",
    target: ["Tummy", "Butt"],
    material: "Nylon",
  },
  "seamless-strapless-sculpting-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Strapless",
    support: "Medium",
    target: ["Tummy", "Bust"],
    material: "Nylon",
  },
  "auvella-long-sleeve-sculpting-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Long Sleeve",
    support: "Medium",
    target: ["Tummy"],
    material: "Nylon",
  },
  "strapless-slim-fit-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Strapless",
    support: "Light",
    target: ["Waist"],
    material: "Polyester",
  },
  "seamless-shaping-long-sleeve-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Long Sleeve",
    support: "Medium",
    target: ["Waist"],
    material: "Nylon",
  },
  "seamless-backless-adjustable-bodysuit": {
    category: "Bodysuits",
    style: "Bodysuit",
    sleeve: "Sleeveless",
    support: "Medium",
    target: ["Waist"],
    material: "Nylon Blend",
  },

  /* ---------------- Shapewear ---------------- */
  "high-waist-body-shaping-shorts": {
    category: "Shapewear",
    style: "Shorts",
    support: "Medium",
    target: ["Tummy", "Butt"],
    material: "Nylon",
  },
  "high-waist-shaping-shorts-with-lace-trim": {
    category: "Shapewear",
    style: "Shorts",
    support: "Medium",
    target: ["Tummy", "Butt"],
    material: "Nylon Blend",
  },
  "strapless-tummy-control-body-shaper": {
    category: "Shapewear",
    style: "Bodysuit",
    sleeve: "Strapless",
    support: "Medium",
    target: ["Tummy", "Butt"],
    material: "Nylon",
  },
  "waist-shaping-fitness-body-shaper": {
    category: "Shapewear",
    style: "Waist Trainer",
    support: "Firm",
    target: ["Waist", "Tummy"],
    material: "Polyester",
  },
  "women-waist-training-compression-garment": {
    category: "Shapewear",
    style: "Waist Trainer",
    support: "Maximum",
    target: ["Waist", "Tummy"],
    material: "Polyester",
  },

  /* ---------------- Underwear ---------------- */
  "cotton-lace-brief": {
    category: "Underwear",
    style: "Brief",
    rise: "Mid Rise",
    material: "Cotton",
  },
  "lace-breathable-thong-underwear": {
    category: "Underwear",
    style: "Thong",
    rise: "Mid Rise",
    material: "Lace",
  },
  "womens-high-waisted-breathable-traceless-thong-panties": {
    category: "Underwear",
    style: "Thong",
    rise: "High Rise",
    material: "Nylon Blend",
  },
  "womens-lace-underwear-set": {
    category: "Underwear",
    style: "Set",
    material: "Lace",
  },

  /* ---------------- Swim ---------------- */
  "long-sleeve-zip-one-piece-swimsuit": {
    category: "Swim",
    style: "One-Piece",
    sleeve: "Long Sleeve",
    material: "Polyester Blend",
  },
  "ribbed-cut-out-one-piece-swimsuit": {
    category: "Swim",
    style: "One-Piece",
    sleeve: "Sleeveless",
    material: "Polyester",
  },
  "womens-one-piece-diamond-swimsuit": {
    category: "Swim",
    style: "One-Piece",
    sleeve: "Sleeveless",
    material: "Nylon Blend",
  },
  "solid-colour-bikini-set": {
    category: "Swim",
    style: "Bikini Set",
    sleeve: "Sleeveless",
    material: "Nylon Blend",
  },
  "womens-tie-side-triangle-bikini-set": {
    category: "Swim",
    style: "Bikini Set",
    sleeve: "Sleeveless",
    material: "Polyester Blend",
  },
  "womens-two-piece-swimsuit": {
    category: "Swim",
    style: "Bikini Set",
    sleeve: "Short Sleeve",
    material: "Polyester",
  },
  "womens-swimwear": {
    category: "Swim",
    style: "Bikini Set",
    sleeve: "Sleeveless",
    material: "Nylon Blend",
  },
  "womens-swimwear-1": {
    category: "Swim",
    style: "Bikini Set",
    sleeve: "Sleeveless",
    material: "Nylon Blend",
  },
  "womens-high-waisted-ruched-bikini-bottoms": {
    category: "Swim",
    style: "Bottoms",
    material: "Polyester",
  },

  /* ---------------- Dresses ---------------- */
  "v-neck-bodycon-mini-dress": {
    category: "Dresses",
    length: "Mini",
    sleeve: "3/4 Sleeve",
    neckline: "V-Neck",
    material: "Polyester Blend",
  },
  "ribbed-short-sleeve-mini-dress": {
    category: "Dresses",
    length: "Mini",
    sleeve: "Short Sleeve",
    neckline: "V-Neck",
    material: "Polyester",
  },
  "square-neck-bodycon-mini-dress": {
    category: "Dresses",
    length: "Mini",
    sleeve: "Sleeveless",
    neckline: "Square Neck",
    material: "Polyester Blend",
  },
  "sleeveless-ribbed-midi-dress": {
    category: "Dresses",
    length: "Midi",
    sleeve: "Sleeveless",
    neckline: "U-Neck",
    material: "Polyester",
  },
  "off-shoulder-sculpt-midi-dress": {
    category: "Dresses",
    length: "Midi",
    sleeve: "Off-Shoulder",
    neckline: "Off-Shoulder",
    material: "Polyester Blend",
  },
  "long-sleeve-sculpt-maxi-dress": {
    category: "Dresses",
    length: "Maxi",
    sleeve: "Long Sleeve",
    neckline: "Round Neck",
    material: "Polyester",
  },
  "u-neck-slit-maxi-dress": {
    category: "Dresses",
    length: "Maxi",
    sleeve: "Sleeveless",
    neckline: "U-Neck",
    material: "Poly-Cotton",
  },
  "womens-lace-long-sleeve-dress": {
    category: "Dresses",
    length: "Maxi",
    sleeve: "Long Sleeve",
    neckline: "Round Neck",
    material: "Polyester Blend",
  },

  /* ---------------- Lounge & Sleep ---------------- */
  "satin-cami-pajama-set": {
    category: "Loungewear",
    style: "Pajama Set",
    fabric: "Satin",
    sleeve: "Sleeveless",
    material: "Polyester",
  },
  "satin-long-sleeve-pajama-set": {
    category: "Loungewear",
    style: "Pajama Set",
    fabric: "Satin",
    sleeve: "Long Sleeve",
    material: "Polyester Blend",
  },
  "satin-tie-waist-robe": {
    category: "Loungewear",
    style: "Robe",
    fabric: "Satin",
    material: "Polyester",
  },
  "fleece-lined-drawstring-lounge-set": {
    category: "Loungewear",
    style: "Lounge Set",
    fabric: "Fleece",
    sleeve: "Long Sleeve",
    material: "Cotton Blend",
  },
  "long-sleeve-lounge-set-with-built-in-bra": {
    category: "Loungewear",
    style: "Lounge Set",
    fabric: "Cotton-Feel",
    sleeve: "Long Sleeve",
    material: "Cotton-Feel",
  },
  "womens-velvet-jumpsuit-long-sleeve-square-neck": {
    category: "Loungewear",
    style: "Jumpsuit",
    fabric: "Velvet",
    sleeve: "Long Sleeve",
    material: "Polyester Blend",
  },
  "slim-fit-long-sleeve-top": {
    category: "Loungewear",
    style: "Top",
    fabric: "Knit",
    sleeve: "Long Sleeve",
    material: "Polyester",
  },
  "silk-sleep-eye-mask": {
    category: "Sleep Accessories",
    material: "Mulberry Silk",
  },
};

/* Which facets appear on which collection page, in display order.    */
/* Facets auto-hide when the products on the page share fewer than    */
/* two distinct values, so nothing renders as a useless one-option    */
/* dropdown.                                                          */
export const COLLECTION_FACETS: Record<string, string[]> = {
  // Bras
  "soft-essentials": ["style", "cup", "wiring", "lining", "material"],
  "bras-and-tops": ["style", "cup", "wiring", "lining", "material"],
  // Bodysuits
  shapewear: ["sleeve", "support", "target", "material"],
  bodysuits: ["sleeve", "support", "target", "material"],
  // Shapewear (all)
  "shapewear-1": ["style", "support", "target", "material"],
  // Underwear
  underwear: ["style", "rise", "material"],
  // Swim
  "one-piece-swimsuits": ["style", "sleeve", "material"],
  bikinis: ["style", "sleeve", "material"],
  // Dresses
  dresses: ["length", "sleeve", "neckline", "material"],
  "mini-dresses-1": ["sleeve", "neckline", "material"],
  "midi-dresses": ["sleeve", "neckline", "material"],
  "maxi-dresses": ["sleeve", "neckline", "material"],
  "maxi-dresses-1": ["sleeve", "neckline", "material"],
  // Lounge family
  "loungewear-sleepwear": ["style", "fabric", "sleeve", "material"],
  sets: ["fabric", "sleeve", "material"],
  robes: ["fabric", "material"],
  "sleep-accessories": ["material"],
  pajamas: ["style", "fabric", "sleeve", "material"],
  sleepwear: ["style", "fabric", "sleeve", "material"],
  // Activewear
  activewear: ["style", "support", "material"],
  leggings: ["style", "support", "material"],
  // Overview pages
  "new-in": ["category", "material"],
  "best-sellers": ["category", "material"],
};

export function facetValuesOf(handle: string, key: string): string[] {
  const v = PRODUCT_FACETS[handle]?.[key];
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}
