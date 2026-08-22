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
