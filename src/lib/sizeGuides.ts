/*
 * Auvella size-guide system — single source of truth.
 *
 * ✏️ EDIT CHART NUMBERS HERE and only here. The modal, fit labels and
 * product routing all read from this file. Current figures are the
 * corrected structure anchored to the inherited chart — verify against
 * real garments before treating them as gospel.
 */

export type GuideType =
  | "bra"
  | "bralette"
  | "sports-bra"
  | "shapewear"
  | "shapewear-bottoms"
  | "underwear"
  | "clothing"
  | "swim"
  | "swim-bottoms"
  | "lounge"
  | "none";

export type FitOverride =
  | "strapless"
  | "satin"
  | "built-in-bra"
  | "bodycon"
  | "tie-adjustable";

export interface SizeGuideDef {
  label: string;
  columns: string[];
  rows: string[][];
  fitNote: string;
  cupHelper?: string;
  overrides?: Partial<Record<FitOverride, string>>;
}

export const SIZE_GUIDES: Record<Exclude<GuideType, "none">, SizeGuideDef> = {
  bra: {
    label: "Bra Size Guide",
    columns: ["Size", "Band / Underbust (in)", "Bust / Overbust (in)", "Fits Bra Sizes"],
    rows: [
      ["S", "26–28", "32–34", "32A · 32B · 34A · 34B"],
      ["M", "28–30", "34–36", "34B · 34C · 36A · 36B"],
      ["L", "30–32", "36–38", "36C · 36D · 38B · 38C"],
      ["XL", "32–34", "38–40", "38D · 40B · 40C · 40D"],
    ],
    cupHelper:
      'Your cup is the difference between bust and underbust: 1" = A · 2" = B · 3" = C · 4" = D · 5" = DD',
    fitNote: "Choose by band (underbust), not bust — the band provides the support.",
    overrides: {
      strapless:
        "Band fit is critical on strapless styles — do not size up. If between band sizes, size down.",
    },
  },

  bralette: {
    label: "Bralette Size Guide",
    columns: ["Size", "Band (in)", "Fits Bands", "Cup Range"],
    rows: [
      ["S", "26–28", "30–32", "A–C"],
      ["M", "28–30", "32–34", "A–C"],
      ["L", "30–32", "34–36", "B–D"],
      ["XL", "32–34", "36–38", "C–DD"],
    ],
    fitNote:
      "Wireless, light support. If between sizes, size up for comfort. Fuller busts wanting security: stay true to band size.",
  },

  "sports-bra": {
    label: "Sports Bra Size Guide",
    columns: ["Size", "Underbust (in)", "Bust (in)"],
    rows: [
      ["S", "26–28", "32–34"],
      ["M", "28–30", "34–36"],
      ["L", "30–32", "36–38"],
      ["XL", "32–34", "38–40"],
    ],
    fitNote:
      "Snug performance fit — relaxes slightly with wear. True to size. Size down if between for high-impact support; size up for lounge.",
    overrides: {
      "built-in-bra": "Built-in pads included — choose by bust.",
    },
  },

  shapewear: {
    label: "Shapewear Size Guide",
    columns: ["Size", "Bust (in)", "Waist (in)", "Hip (in)"],
    rows: [
      ["XS", "31–32", "24–25", "34–35"],
      ["S", "33–34", "26–27", "36–37"],
      ["M", "35–36", "28–29", "38–39"],
      ["L", "37–39", "30–32", "40–42"],
      ["XL", "40–42", "33–35", "43–45"],
      ["2XL", "43–45", "36–38", "46–48"],
      ["3XL", "46–48", "39–41", "49–51"],
    ],
    fitNote:
      'Second-skin sculpting fit. If between sizes, size up — sizing down for "more control" is the most common mistake. Choose by your largest measurement.',
    overrides: {
      strapless: "Strapless: choose by bust — bust fit keeps the garment in place.",
    },
  },

  "shapewear-bottoms": {
    label: "Shaping Shorts Size Guide",
    columns: ["Size", "Waist (in)", "Hip (in)"], // no bust column
    rows: [
      ["S", "26–27", "36–37"],
      ["M", "28–29", "38–39"],
      ["L", "30–32", "40–42"],
      ["XL", "33–35", "43–45"],
      ["2XL", "36–38", "46–48"],
      ["3XL", "39–41", "49–51"],
    ],
    fitNote:
      "High-compression shaping — size up if between. Choose by hip; the waistband should sit firm without rolling.",
  },

  underwear: {
    label: "Underwear Size Guide",
    columns: ["Size", "Waist (in)", "Hip (in)"],
    rows: [
      ["S", "26–27", "36–37"],
      ["M", "28–29", "38–39"],
      ["L", "30–32", "40–42"],
      ["XL", "33–35", "43–45"],
    ],
    fitNote: "True to size — choose by hip. Underwear is cut for the hip, not the waist.",
  },

  clothing: {
    label: "Size Guide",
    columns: ["Size", "Bust (in)", "Waist (in)", "Hip (in)"],
    rows: [
      ["XS", "31–32", "24–25", "34–35"],
      ["S", "33–34", "26–27", "36–37"],
      ["M", "35–36", "28–29", "38–39"],
      ["L", "37–39", "30–32", "40–42"],
      ["XL", "40–42", "33–35", "43–45"],
      ["2XL", "43–45", "36–38", "46–48"],
      ["3XL", "46–48", "39–41", "49–51"],
    ],
    fitNote: "True to size.",
    overrides: {
      bodycon: "True to size with contouring stretch — size up for a looser look.",
    },
  },

  swim: {
    label: "Swimwear Size Guide",
    columns: ["Size", "Bust (in)", "Waist (in)", "Hip (in)"],
    rows: [
      ["S", "33–34", "26–27", "36–37"],
      ["M", "35–36", "28–29", "38–39"],
      ["L", "37–39", "30–32", "40–42"],
      ["XL", "40–42", "33–35", "43–45"],
      ["2XL", "43–45", "36–38", "46–48"],
    ],
    fitNote:
      "True to size with four-way stretch. Size up if between sizes for more coverage — swim fabric firms when wet.",
    overrides: {
      "tie-adjustable": "Adjustable ties make the fit forgiving — stay true to size.",
    },
  },

  "swim-bottoms": {
    label: "Swim Bottoms Size Guide",
    columns: ["Size", "Waist (in)", "Hip (in)"], // no bust column
    rows: [
      ["S", "26–27", "36–37"],
      ["M", "28–29", "38–39"],
      ["L", "30–32", "40–42"],
      ["XL", "33–35", "43–45"],
      ["2XL", "36–38", "46–48"],
    ],
    fitNote: "Size up for more coverage — swim fabric firms when wet.",
  },

  lounge: {
    label: "Loungewear Size Guide",
    columns: ["Size", "Bust (in)", "Waist (in)", "Hip (in)"],
    rows: [
      ["S", "33–34", "26–27", "36–37"],
      ["M", "35–36", "28–29", "38–39"],
      ["L", "37–39", "30–32", "40–42"],
      ["XL", "40–42", "33–35", "43–45"],
      ["2XL", "43–45", "36–38", "46–48"],
    ],
    fitNote: "Relaxed fit, true to size.",
    overrides: {
      satin: "Satin has minimal stretch — size up if between sizes.",
    },
  },
};

/** How-to-measure copy; the modal filters rows to the active chart's columns. */
export const HOW_TO_MEASURE: [string, string][] = [
  ["Bust", "Measure around the fullest part of your bust, tape level and relaxed."],
  ["Underbust", "Measure directly under your bust where the band sits, snug."],
  ["Waist", "Measure the narrowest part of your torso, usually just above the navel."],
  ["Hip", "Measure around the fullest part of your hips and seat."],
];

/* ------------------------------------------------------------------ */
/* Routing — override map first (encodes the audited 40-product table  */
/* incl. the 5 Shopify-metafield products), keyword inference second,  */
/* 'clothing' default.                                                 */
/* ------------------------------------------------------------------ */

const norm = (s: string) => s.toLowerCase().replace(/['’]/g, "").replace(/\s+/g, " ").trim();

/** Audited per-product routing (Appendix B). Keys are normalised titles. */
const EXACT_MAP: Record<string, { guideType: GuideType; fitOverride?: FitOverride }> = {
  [norm("Invisible Front Buckle Strapless Bra")]: { guideType: "bra", fitOverride: "strapless" },
  [norm("Auvella Seamless Comfort Bralette")]: { guideType: "bralette" },
  [norm("Seamless Sculpt Sports Bra")]: { guideType: "sports-bra" },
  [norm("Built-In Bra Yoga Tank Top")]: { guideType: "sports-bra", fitOverride: "built-in-bra" },
  [norm("Sculpt Seamless Bodysuit")]: { guideType: "shapewear" },
  [norm("One-Piece Shapewear Bodysuit with Tummy Control")]: { guideType: "shapewear" },
  [norm("Auvella Long Sleeve Sculpting Bodysuit")]: { guideType: "shapewear" },
  [norm("Lace Adjustable Sculpting Bodysuit")]: { guideType: "shapewear" },
  [norm("Strapless Slim Fit Bodysuit")]: { guideType: "shapewear", fitOverride: "strapless" },
  [norm("Seamless Strapless Sculpting Bodysuit")]: { guideType: "shapewear", fitOverride: "strapless" },
  [norm("Seamless Sculpting Bodysuit")]: { guideType: "shapewear" },
  [norm("Seamless Shaping Long Sleeve Bodysuit")]: { guideType: "shapewear" },
  [norm("Seamless Tummy Control Body Shaper Cami")]: { guideType: "shapewear" },
  [norm("Strapless Tummy Control Body Shaper")]: { guideType: "shapewear", fitOverride: "strapless" },
  [norm("High-Waist Shaping Shorts with Lace Trim")]: { guideType: "shapewear-bottoms" },
  [norm("High Waist Body Shaping Shorts")]: { guideType: "shapewear-bottoms" },
  [norm("Cotton Lace Brief")]: { guideType: "underwear" },
  [norm("Lace Breathable Thong Underwear")]: { guideType: "underwear" },
  [norm("Soft Cotton Boxer Briefs")]: { guideType: "underwear" },
  [norm("Womens High-Waisted Breathable Traceless Briefs")]: { guideType: "underwear" },
  [norm("V-Neck Bodycon Mini Dress")]: { guideType: "clothing", fitOverride: "bodycon" },
  [norm("Ribbed Short Sleeve Mini Dress")]: { guideType: "clothing" },
  [norm("Square Neck Bodycon Mini Dress")]: { guideType: "clothing", fitOverride: "bodycon" },
  [norm("Sleeveless Ribbed Midi Dress")]: { guideType: "clothing" },
  [norm("U-Neck Slit Maxi Dress")]: { guideType: "clothing" },
  [norm("Long Sleeve Sculpt Maxi Dress")]: { guideType: "clothing", fitOverride: "bodycon" },
  [norm("Off-Shoulder Sculpt Midi Dress")]: { guideType: "clothing", fitOverride: "bodycon" },
  [norm("Slim Fit Long Sleeve Top")]: { guideType: "clothing" },
  [norm("Women's Velvet Jumpsuit Long Sleeve Square Neck")]: { guideType: "clothing" },
  [norm("Long Sleeve Zip One-Piece Swimsuit")]: { guideType: "swim" },
  [norm("Solid Colour Bikini Set")]: { guideType: "swim" },
  [norm("Ribbed Cut-Out One-Piece Swimsuit")]: { guideType: "swim" },
  [norm("Women's Tie Side Triangle Bikini Set")]: { guideType: "swim", fitOverride: "tie-adjustable" },
  [norm("Women's High Waisted Ruched Bikini Bottoms")]: { guideType: "swim-bottoms" },
  [norm("Fleece-Lined Drawstring Lounge Set")]: { guideType: "lounge" },
  [norm("Long Sleeve Lounge Set with Built-In Bra")]: { guideType: "lounge", fitOverride: "built-in-bra" },
  [norm("Satin Cami Pajama Set")]: { guideType: "lounge", fitOverride: "satin" },
  [norm("Satin Long Sleeve Pajama Set")]: { guideType: "lounge", fitOverride: "satin" },
  [norm("Satin Tie-Waist Robe")]: { guideType: "lounge" },
  [norm("Silk Sleep Eye Mask")]: { guideType: "none" },
};

/** Keyword inference for products added after the audit. */
export function inferGuideType(title: string): { guideType: GuideType; fitOverride?: FitOverride } {
  const t = norm(title);
  const strapless = /strapless/.test(t) ? ("strapless" as const) : undefined;
  if (/eye mask|accessor|scrunchie|hair/.test(t)) return { guideType: "none" };
  if (/bikini bottom/.test(t)) return { guideType: "swim-bottoms" };
  if (/tie side|tie-side/.test(t) && /bikini|swim/.test(t))
    return { guideType: "swim", fitOverride: "tie-adjustable" };
  if (/bikini|swimsuit|swim/.test(t)) return { guideType: "swim" };
  if (/sports bra|yoga tank/.test(t))
    return { guideType: "sports-bra", fitOverride: /built-in/.test(t) ? "built-in-bra" : undefined };
  if (/bralette/.test(t)) return { guideType: "bralette" };
  if (/\bbra\b/.test(t)) return { guideType: "bra", fitOverride: strapless };
  if (/shaping short|shapewear short|shaping brief/.test(t)) return { guideType: "shapewear-bottoms" };
  if (/bodysuit|body shaper|shapewear|sculpting cami|control cami|tummy control/.test(t))
    return { guideType: "shapewear", fitOverride: strapless };
  if (/thong|brief|boxer|knicker|pantie/.test(t)) return { guideType: "underwear" };
  if (/pajama|pyjama|robe|lounge|fleece|sleep/.test(t))
    return { guideType: "lounge", fitOverride: /satin|silk/.test(t) ? "satin" : undefined };
  if (/bodycon|sculpt (mini|midi|maxi)|sculpt dress/.test(t))
    return { guideType: "clothing", fitOverride: "bodycon" };
  return { guideType: "clothing" };
}

/** Resolve a product to its guide: audited map → inference → clothing. */
export function resolveGuide(title: string): { guideType: GuideType; fitOverride?: FitOverride } {
  return EXACT_MAP[norm(title)] ?? inferGuideType(title);
}

/** Small fit label under the size selector. Empty string = hide. */
export function fitLabel(guideType: GuideType, fitOverride?: FitOverride): string {
  if (guideType === "none") return "";
  if (guideType === "bra")
    return fitOverride === "strapless"
      ? "Band fit is critical — do not size up"
      : "Choose by band size";
  if (guideType === "bralette") return "Wireless comfort — size up if between";
  if (guideType === "sports-bra") return "Snug performance fit";
  if (guideType === "shapewear" || guideType === "shapewear-bottoms")
    return "Second-skin fit — size up if between";
  if (guideType === "lounge" && fitOverride === "satin")
    return "Minimal stretch — size up if between";
  if (guideType === "swim" || guideType === "swim-bottoms") return "Size up for more coverage";
  return "True to size";
}
