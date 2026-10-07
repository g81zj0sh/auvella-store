/*
 * UK size shown beside each letter size in the size picker, quick add and size
 * guide ("S (8–10)"), per product.
 *
 * Joshua's default size chart is UK sizing (set Aug 2026): S = UK 8–10,
 * M = 12–14 … with US = UK − 4, EU = UK + 28, AUS-NZ = UK (LETTER_MAP in
 * sizeRegions.ts, extended to 4XL = 28 / 5XL = 30). Every letter-sized product
 * uses it, translated per region — EXCEPT where the product's own supplier
 * chart prints a regional size (UK / AUS / US / EU column, or a UK number in
 * the size name): those products show that stated size, so the picker never
 * contradicts the chart in their size guide. Bras show the chart's band + cup
 * ("32A–C"); a dress size never decides a bra size, so structured bras without
 * band data stay plain. A chart can opt out entirely with regionLabels: false.
 */
import { chartForHandle } from "@/lib/productSizeCharts";
import { letterEquivalent, normalizeLetter, type SizeRegion } from "@/lib/sizeRegions";

export const UK_SIZE_LABELS: Record<string, Record<string, string>> = {
  // chart's bra fits (EU 70A–C → UK 32A–C)
  "invisible-front-buckle-strapless-bra": { "S": "32A–C", "M": "34A–C", "L": "36A–C", "XL": "38A–C" },
  // chart's UK Dress Size column
  "seamless-tummy-control-body-shaper-cami": { "S": "6–8", "M": "10–12", "L": "14–16", "XL": "18–20", "2XL": "22–24", "3XL": "26", "4XL": "28" },
  // UK size in the chart's size names (S/8 …)
  "seamless-sculpt-sports-bra": { "XS": "6", "S": "8", "M": "10", "L": "12", "XL": "14" },
  // chart's US Size column (+4)
  "seamless-strapless-sculpting-bodysuit": { "XXS/XS": "4–8", "S/M": "10–14", "L/XL": "16–20", "2XL/3XL": "22–26", "4XL/5XL": "28–32" },
  // chart's UK Size column
  "sleeveless-ribbed-midi-dress": { "S": "8–10", "M": "12–14", "L": "16–18", "XL": "20–22", "2XL": "24–26" },
  // chart's AUS Size column (= UK)
  "womens-swimwear-1": { "S": "8", "M": "10", "L": "12", "XL": "14", "2XL": "16", "3XL": "18" },
  // chart's UK Size column
  "high-waisted-silicone-shapewear-pants": { "XS-S": "6–8", "M-L": "10–20", "XL-2XL": "22–28", "3XL": "30", "4XL": "32" },
  // chart's bra fits
  "jelly-cup-multi-way-strapless-bra": { "XS": "30A–C", "S": "32A–C", "M": "34B–C", "L": "36B–C", "XL": "38A–B" },
  // chart's bra fits
  "seamless-wireless-full-cup-bra": { "S": "32B–D", "M": "34B–DD", "L": "36C–D", "XL": "38C–D", "2XL": "40C–D", "3XL": "42C–D" },
  // chart's EU (DE) column (−26)
  "womens-two-piece-swimsuit": { "S": "6–8", "M": "8–10", "L": "10–12" },
  // chart's bra fits
  "womens-bra": { "M": "34A–B", "L": "36A–C", "XL": "38A–C" },
  // chart's UK / AUS Size column
  "seamless-backless-adjustable-bodysuit": { "S": "10", "M": "12", "L": "14", "XL": "16", "2XL": "18", "3XL": "20" },
  // chart's AUS Size column (= UK)
  "womens-swimwear": { "S": "8", "M": "10", "L": "12", "XL": "14", "2XL": "16", "3XL": "18" },
};

const norm = (s: string) =>
  s.toUpperCase().replace(/\s+/g, "").replace(/^XXXL$/, "3XL").replace(/^XXL$/, "2XL");

const BAND_EU: Record<number, number> = { 28: 60, 30: 65, 32: 70, 34: 75, 36: 80, 38: 85, 40: 90, 42: 95, 44: 100 };

/** Joshua's default UK chart for a letter size, translated to the region.
    Handles combined sizes ("XS/S" → 6–10, "M-L" → 12–18). Null if any part
    isn't a letter size. */
export function defaultSizeLabel(size: string, region: SizeRegion): string | null {
  const parts = size.split(/[/-]/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return null;
  const nums: number[] = [];
  for (const part of parts) {
    const letter = normalizeLetter(part);
    if (!letter) return null;
    nums.push(...letterEquivalent(letter, region).split("–").map(Number));
  }
  const lo = Math.min(...nums);
  const hi = Math.max(...nums);
  return lo === hi ? String(lo) : `${lo}–${hi}`;
}

/** The size label for one size of one product in the shopper's region:
    the product chart's stated size or bra fit if it has one, otherwise the
    default UK chart. Null when the product opts out or is a structured bra
    without band data. */
export function sizeLabel(
  handle: string,
  size: string,
  region: SizeRegion,
  guideType?: string,
): string | null {
  const table = UK_SIZE_LABELS[handle];
  const uk = table ? (table[size] ?? Object.entries(table).find(([k]) => norm(k) === norm(size))?.[1]) : undefined;
  if (uk) {
    const bra = uk.match(/^(\d{2})([A-G]{1,2})(?:–([A-G]{1,2}))?$/);
    if (bra) {
      if (region !== "EU") return uk; // UK, US and AUS share band numbers
      const cup = (c?: string) => (c === "DD" ? "E" : c);
      return `${BAND_EU[Number(bra[1])] ?? bra[1]}${cup(bra[2])}${bra[3] ? `–${cup(bra[3])}` : ""}`;
    }
    const shift = region === "US" ? -4 : region === "EU" ? 28 : 0;
    return uk.replace(/\d+/g, (n) => String(Number(n) + shift));
  }
  const chart = chartForHandle(handle);
  if (chart?.regionLabels === false) return null;
  if ((chart?.guideType ?? guideType) === "bra") return null;
  return defaultSizeLabel(size, region);
}

export function hasSizeLabels(handle: string | undefined): boolean {
  return !!handle && !!UK_SIZE_LABELS[handle];
}
