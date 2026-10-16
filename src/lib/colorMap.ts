// Map common color names to hex values for swatch rendering.
const MAP: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f0",
  cream: "#efe6d6",
  ivory: "#efe6d6",
  beige: "#d8c5a8",
  nude: "#d8b89a",
  sand: "#cdb89a",
  tan: "#c9a17a",
  mocha: "#7a5240",
  cocoa: "#5a3a2a",
  brown: "#5a3a2a",
  chocolate: "#3d2418",
  coffee: "#4b2e22",
  taupe: "#a08778",
  grey: "#7a7a7a",
  gray: "#7a7a7a",
  charcoal: "#363636",
  navy: "#1d2a44",
  blue: "#2b4a7a",
  sky: "#9bc4e2",
  teal: "#2c7a7b",
  green: "#3f6a44",
  olive: "#6b6b3a",
  sage: "#a8b89a",
  mint: "#a8d8c0",
  yellow: "#e8c84a",
  gold: "#c9a84c",
  orange: "#d97a3a",
  red: "#b8312f",
  burgundy: "#6b1f24",
  wine: "#6b1f24",
  pink: "#e89ab0",
  rose: "#d4708a",
  blush: "#f0c9c9",
  hotpink: "hotpink",
  fuchsia: "#c4317a",
  purple: "#5d3a7a",
  lilac: "#b9a8d4",
  lavender: "#b9a8d4",
};

export function colorToHex(name?: string | null): string | null {
  if (!name) return null;
  const key = name.toLowerCase().replace(/[\s_-]+/g, "");
  if (MAP[key]) return MAP[key];
  // Try first word
  for (const k of Object.keys(MAP)) {
    if (key.includes(k)) return MAP[k];
  }
  return null;
}

/* v196: two-tone colourways are named "<trim> & <body>" - the Two-Tone
   Bikini Set's "Brown & Blue" is a sky-blue bikini with brown trim. A single
   name-matched dot showed Black & White and White & Black both as black, and
   the tile and product page picked different words for Yellow & Black.
   Hexes measured off the variant photos (model shot and flat lay). */
const TWO_TONE: Record<string, string> = {
  white: "#ebe8e1",
  black: "#101316",
  blue: "#a9dcec",
  brown: "#3a1e1a",
  yellow: "#f5df55",
};

/** Split-dot CSS background for a "<trim> & <body>" colour - trim in the
    top-left wedge, the garment body filling the rest - or null for any other
    name. One helper for the product page (lib/swatch) and the tile dots. */
export function twoToneSwatch(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.split(" & ");
  if (parts.length !== 2) return null;
  const [trim, body] = parts.map((p) => {
    const k = p.trim().toLowerCase();
    return TWO_TONE[k] ?? colorToHex(k);
  });
  if (!trim || !body) return null;
  return `linear-gradient(135deg, ${trim} 0 40%, ${body} 40% 100%)`;
}
