/*
 * UK size shown beside each letter size in the size picker, quick add and size
 * guide ("S (8–10)"), per product. Derived on 7 Oct 2026 from each product's
 * OWN supplier chart in productSizeCharts.ts, never from a blanket table:
 *   1. a UK / AUS / US / EU column or a UK number in the size name, converted
 *      (US +4, EU-DE −26, AUS = UK);
 *   2. body-measurement ranges (bust / waist / hip) matched to a standard UK
 *      body-size table — kept only when every row converts and sizes rise;
 *   3. bras: the chart's "fits bra sizes", shown as UK band + cups.
 * Products whose charts only give garment measurements (relaxed, stretch or
 * laid flat) are deliberately absent: turning those into a UK size means
 * guessing the stretch, so their sizes show as plain letters until a body or
 * UK chart is supplied. The old fixed letter table (L = UK 16–18 everywhere)
 * mislabelled small cuts and is no longer used for labels.
 */
import type { SizeRegion } from "@/lib/sizeRegions";

export const UK_SIZE_LABELS: Record<string, Record<string, string>> = {
  // chart's bra fits (EU 70A–C → UK 32A–C)
  "invisible-front-buckle-strapless-bra": { "S": "32A–C", "M": "34A–C", "L": "36A–C", "XL": "38A–C" },
  // chart's UK Dress Size column
  "seamless-tummy-control-body-shaper-cami": { "S": "6–8", "M": "10–12", "L": "14–16", "XL": "18–20", "2XL": "22–24", "3XL": "26", "4XL": "28" },
  // UK size in the chart's size names (S/8 …)
  "seamless-sculpt-sports-bra": { "XS": "6", "S": "8", "M": "10", "L": "12", "XL": "14" },
  // chart's body ranges (bust, waist, hip)
  "v-neck-bodycon-mini-dress": { "S": "8–10", "M": "10", "L": "12–14" },
  // chart's US Size column (+4)
  "seamless-strapless-sculpting-bodysuit": { "XXS/XS": "4–8", "S/M": "10–14", "L/XL": "16–20", "2XL/3XL": "22–26", "4XL/5XL": "28–32" },
  // chart's UK Size column
  "sleeveless-ribbed-midi-dress": { "S": "8–10", "M": "12–14", "L": "16–18", "XL": "20–22", "2XL": "24–26" },
  // chart's body ranges (bust, waist)
  "u-neck-slit-maxi-dress": { "XXS": "4–6", "XS": "8", "S": "10–12", "M": "12–14", "L": "16", "XL": "18–20", "2XL": "22", "3XL": "24–26" },
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
  // chart's body ranges (bust, waist, hip)
  "solid-colour-bikini-set": { "S": "8", "M": "10", "L": "12", "XL": "14", "XXL": "16", "3XL": "18" },
  // chart's UK / AUS Size column
  "seamless-backless-adjustable-bodysuit": { "S": "10", "M": "12", "L": "14", "XL": "16", "2XL": "18", "3XL": "20" },
  // chart's AUS Size column (= UK)
  "womens-swimwear": { "S": "8", "M": "10", "L": "12", "XL": "14", "2XL": "16", "3XL": "18" },
};

const norm = (s: string) =>
  s.toUpperCase().replace(/\s+/g, "").replace(/^XXXL$/, "3XL").replace(/^XXL$/, "2XL");

const BAND_EU: Record<number, number> = { 28: 60, 30: 65, 32: 70, 34: 75, 36: 80, 38: 85, 40: 90, 42: 95, 44: 100 };

/** The UK size (in the shopper's chosen region) for one size of one product,
    or null when that product's own chart doesn't support one. */
export function sizeLabel(handle: string, size: string, region: SizeRegion): string | null {
  const table = UK_SIZE_LABELS[handle];
  if (!table) return null;
  const uk = table[size] ?? Object.entries(table).find(([k]) => norm(k) === norm(size))?.[1];
  if (!uk) return null;
  const bra = uk.match(/^(\d{2})([A-G]{1,2})(?:–([A-G]{1,2}))?$/);
  if (bra) {
    if (region !== "EU") return uk; // UK, US and AUS share band numbers
    const cup = (c?: string) => (c === "DD" ? "E" : c);
    return `${BAND_EU[Number(bra[1])] ?? bra[1]}${cup(bra[2])}${bra[3] ? `–${cup(bra[3])}` : ""}`;
  }
  const shift = region === "US" ? -4 : region === "EU" ? 28 : 0;
  return uk.replace(/\d+/g, (n) => String(Number(n) + shift));
}

export function hasSizeLabels(handle: string | undefined): boolean {
  return !!handle && !!UK_SIZE_LABELS[handle];
}
