/*
 * Regional size labelling — SKIMS-style conversion for the size guide modal.
 *
 * Converts SIZE LABELS only. Measurements (cm/inches) are physical facts and
 * render identically in every region — the toggle never touches them.
 */

export type SizeRegion = "UK" | "US" | "EU" | "AUS";

export const SIZE_REGIONS: { value: SizeRegion; label: string }[] = [
  { value: "UK", label: "UK" },
  { value: "US", label: "US" },
  { value: "EU", label: "EU" },
  { value: "AUS", label: "AUS-NZ" },
];

/* ------------------------------------------------------------------ */
/* Letter sizes: S/M/L stay as-is; the strip shows the regional        */
/* dress-size equivalent. AUS-NZ mirrors UK; US = UK − 4; EU = UK + 28.*/
/* ------------------------------------------------------------------ */

const LETTER_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "3XL"] as const;
type Letter = (typeof LETTER_ORDER)[number];

const LETTER_MAP: Record<Letter, Record<SizeRegion, string>> = {
  XXS: { UK: "4", US: "0", EU: "32", AUS: "4" },
  XS: { UK: "6", US: "2", EU: "34", AUS: "6" },
  S: { UK: "8–10", US: "4–6", EU: "36–38", AUS: "8–10" },
  M: { UK: "12–14", US: "8–10", EU: "40–42", AUS: "12–14" },
  L: { UK: "16–18", US: "12–14", EU: "44–46", AUS: "16–18" },
  XL: { UK: "20", US: "16", EU: "48", AUS: "20" },
  "2XL": { UK: "22–24", US: "18–20", EU: "50–52", AUS: "22–24" },
  "3XL": { UK: "26", US: "22", EU: "54", AUS: "26" },
};

/** Normalise a row's size label to a canonical letter, or null.
    Handles "S", "2XL", "XXL", "XXXL", and combined labels like "S/8". */
export function normalizeLetter(raw: string): Letter | null {
  const t = raw.toUpperCase().split("/")[0].trim();
  const alias: Record<string, Letter> = { XXL: "2XL", XXXL: "3XL" };
  const key = (alias[t] ?? t) as Letter;
  return (LETTER_ORDER as readonly string[]).includes(key) ? key : null;
}

export function letterEquivalent(letter: Letter, region: SizeRegion): string {
  return LETTER_MAP[letter][region];
}

/* ------------------------------------------------------------------ */
/* Bra band/cup: UK 32 = US 32 = EU 70 = AUS-NZ 10; bands step +2 UK/  */
/* US/AUS and +5 EU. Cups map 1:1 UK/US/AUS up to DD; EU shows DD as E.*/
/* ------------------------------------------------------------------ */

function convertBand(ukBand: number, region: SizeRegion): number {
  if (region === "UK" || region === "US") return ukBand;
  if (region === "EU") return 70 + ((ukBand - 32) / 2) * 5;
  return 10 + (ukBand - 32); // AUS-NZ: 32→10, stepping +2 per band
}

function convertCup(cup: string, region: SizeRegion): string {
  if (region === "EU" && cup === "DD") return "E";
  return cup;
}

/** Convert every band+cup token (e.g. "34B") in a text cell.
    Leaves measurements untouched — the pattern requires an UPPERCASE cup
    letter directly after the two-digit band, so "34 cm" never matches. */
export function convertBraTokens(text: string, region: SizeRegion): string {
  return text.replace(/\b(2[68]|3[02468]|4[024])(A|B|C|D|DD)\b/g, (_, band, cup) => {
    return `${convertBand(parseInt(band, 10), region)}${convertCup(cup, region)}`;
  });
}

/* ------------------------------------------------------------------ */
/* Support detection — rule 4: no toggle for charts that can't sensibly */
/* carry a regional mapping (one-size, waist-cm-keyed, weight-only).    */
/* ------------------------------------------------------------------ */

export function detectRegionSupport(
  columns: string[],
  rows: string[][],
): { letters: Letter[]; hasBraTokens: boolean; supported: boolean } {
  const letters: Letter[] = [];
  for (const row of rows) {
    const l = row[0] ? normalizeLetter(row[0]) : null;
    if (l && !letters.includes(l)) letters.push(l);
  }
  letters.sort((a, b) => LETTER_ORDER.indexOf(a) - LETTER_ORDER.indexOf(b));
  const braPattern = /\b(2[68]|3[02468]|4[024])(A|B|C|D|DD)\b/;
  const hasBraTokens =
    rows.some((r) => r.some((c) => braPattern.test(c))) ||
    columns.some((c) => braPattern.test(c));
  // Charts whose rows already carry explicit regional columns don't need a
  // conversion layer on top, but the letter strip still helps; charts with
  // neither letters nor bra tokens (one-size, cm-keyed) hide the toggle.
  return { letters, hasBraTokens, supported: letters.length > 0 || hasBraTokens };
}
