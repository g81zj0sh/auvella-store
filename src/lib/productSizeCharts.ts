// Auvella (auvellawear.com) — supplier size charts: typed access helpers.
// The transcribed charts are lib/productSizeChartsData.ts (v205).

export const NO_CHART_HIDE_GUIDE = [
  "silk-sleep-eye-mask",
];


// ============================================================
// Typed access helpers (added for the Auvella codebase)
// ============================================================

export interface ProductChart {
  guideType: string;
  unit?: string;
  columns: string[];
  rows: string[][];
  fitNote: string;
  fitOverride?: string;
  hasUKConversion?: boolean;
  missingChart?: boolean;
  /** false = show S/M/L without UK/US/EU equivalents (for cuts the
      standard letter table would mislabel). */
  regionLabels?: false;
  /** false = no "How to measure" steps: for garment-only charts where a body
      measurement can't be read against the columns. */
  howToMeasure?: false;
}

/* v205: filled from lib/productSizeChartsData.ts - in full on the server, and in
   the browser from the page's own seed and then every chart once the page is
   interactive (lib/catalogTables). Starts empty in the browser. */
const CHARTS: Record<string, ProductChart> = {};

export function addCharts(entries: Record<string, ProductChart>): void {
  Object.assign(CHARTS, entries);
}

/** The table's entry as transcribed, usable or not (for a page's seed). */
export function rawChart(handle: string): ProductChart | undefined {
  return Object.prototype.hasOwnProperty.call(CHARTS, handle) ? CHARTS[handle] : undefined;
}

/** The product's REAL supplier chart, or null if none usable. */
export function chartForHandle(handle: string): ProductChart | null {
  const c = CHARTS[handle];
  if (!c || c.missingChart || !c.columns || c.columns.length === 0 || !c.rows || c.rows.length === 0)
    return null;
  return c;
}

/** True when this product must show NO size guide at all.
    A usable chart always wins — a product with real chart data is never
    hidden by a stale hide-list entry. */
export function isGuideHidden(handle: string): boolean {
  if (chartForHandle(handle)) return false;
  const c = CHARTS[handle];
  if (c?.missingChart) return true;
  return NO_CHART_HIDE_GUIDE.includes(handle);
}
