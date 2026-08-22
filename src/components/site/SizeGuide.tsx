import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ruler } from "lucide-react";
import {
  SIZE_GUIDES,
  HOW_TO_MEASURE,
  type GuideType,
  type FitOverride,
} from "@/lib/sizeGuides";
import type { ProductChart } from "@/lib/productSizeCharts";
import { usePreferences } from "@/lib/preferences";
import {
  SIZE_REGIONS,
  detectRegionSupport,
  letterEquivalent,
  normalizeLetter,
  convertBraTokens,
  type SizeRegion,
} from "@/lib/sizeRegions";

/*
 * Size & Fit Guide modal — same shell and styling as before; the content
 * (fit notes, table, cup helper, how-to-measure) renders dynamically from
 * SIZE_GUIDES per product type. guideType "none" renders nothing.
 */
/** Strip internal supplier-verification annotations from display copy —
    the data file keeps them; customers never see them. */
function displayText(v: string): string {
  return v.replace(/\s*\[CHECK[^\]]*\]/g, "").trim();
}

export function SizeGuide({
  open,
  onOpenChange,
  guideType,
  fitOverride,
  productChart,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guideType: GuideType;
  fitOverride?: FitOverride;
  /** Real supplier chart for this product — takes priority over the
      category guide when present. */
  productChart?: ProductChart | null;
}) {
  if (!productChart && guideType === "none") return null;
  const category =
    guideType !== "none" ? SIZE_GUIDES[guideType] : undefined;
  const guide = productChart
    ? {
        label:
          (SIZE_GUIDES as Record<string, { label: string }>)[productChart.guideType]?.label ??
          "Size & Fit Guide",
        columns: productChart.columns,
        rows: productChart.rows,
        fitNote: productChart.fitNote,
        cupHelper: undefined as string | undefined,
      }
    : category!;
  // Category override notes only apply to category guides — a product's own
  // fitNote already carries its specific warnings.
  const overrideNote =
    !productChart && fitOverride ? category?.overrides?.[fitOverride] : undefined;

  // ---------- Regional size labelling (labels only; measurements never change) ----------
  const region = usePreferences((st) => st.sizeRegion);
  const setRegion = usePreferences((st) => st.setSizeRegion);
  const support = detectRegionSupport(guide.columns, guide.rows);

  /** Cell display: strip internal notes, then translate the SIZE column in
      place — letter sizes gain their regional number ("S (8–10)"), bra
      band/cup tokens convert per region. Measurement cells never change. */
  const renderCell = (cell: string, colIdx: number) => {
    const txt = displayText(cell);
    const isSizeCol = colIdx === 0;
    if (isSizeCol && support.letters.length > 0) {
      const letter = normalizeLetter(txt);
      if (letter) {
        return (
          <>
            {txt}
            <span className="ml-1.5 text-cocoa">
              ({letterEquivalent(letter, region)})
            </span>
          </>
        );
      }
    }
    const isConvertible = isSizeCol || /bra/i.test(guide.columns[colIdx] ?? "");
    return support.hasBraTokens && isConvertible
      ? convertBraTokens(txt, region)
      : txt;
  };

  // Only show how-to-measure rows relevant to this chart's columns.
  // "Underbust" must be matched before the broader "Bust" check.
  const colText = guide.columns.join(" ").toLowerCase();
  const steps = HOW_TO_MEASURE.filter(([label]) => {
    const l = label.toLowerCase();
    if (l === "bust") return /(^|[^r])bust/.test(colText); // bust but not only "underbust"
    return colText.includes(l);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none border-border bg-cream p-0">
        <div className="max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border px-6 py-5 md:px-8">
            <DialogTitle className="flex items-center gap-2 font-serif text-2xl text-ink">
              <Ruler className="h-5 w-5 text-cocoa" strokeWidth={1.5} /> {guide.label}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-6 md:px-8">
            {/* Region toggle — converts size labels only */}
            {support.supported && (
              <div className="mb-5 flex flex-wrap gap-1.5">
                {SIZE_REGIONS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRegion(r.value as SizeRegion)}
                    className={`h-8 border px-3 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                      region === r.value
                        ? "border-ink bg-ink text-cream"
                        : "border-ink/20 text-cocoa hover:border-ink"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Fit note — the single most reassuring line */}
            <div className="mb-4 border border-ink/15 bg-beige/50 p-4">
              <p className="text-sm leading-relaxed text-cocoa">{displayText(guide.fitNote)}</p>
            </div>

            {/* Product-specific override note */}
            {overrideNote && (
              <div className="mb-6 border border-ink/40 bg-beige/50 p-4">
                <p className="text-sm font-medium leading-relaxed text-ink">{overrideNote}</p>
              </div>
            )}

            {/* Chart — columns render dynamically per guide */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/20 text-left text-[11px] uppercase tracking-[0.16em] text-cocoa">
                    {guide.columns.map((c) => (
                      <th key={c} className="py-2.5 pr-4 font-medium">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((row) => (
                    <tr key={row[0]} className="border-b border-ink/10 text-ink">
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className={`py-2.5 pr-4 ${i === 0 ? "font-medium" : "text-cocoa"}`}
                        >
                          {renderCell(cell, i)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bra-only cup helper */}
            {guide.cupHelper && (
              <details className="mt-5 border border-ink/15 bg-beige/50 p-4">
                <summary className="cursor-pointer text-sm font-medium text-ink">
                  Find your cup
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-cocoa">{guide.cupHelper}</p>
              </details>
            )}

            {/* How to measure — filtered to this chart's measurements */}
            {steps.length > 0 && (
              <>
                <h3 className="mt-8 font-serif text-lg text-ink">How to measure</h3>
                <ul className="mt-3 space-y-3">
                  {steps.map(([label, how]) => (
                    <li key={label} className="flex gap-3 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
                      <span className="text-cocoa">
                        <span className="font-medium text-ink">{label}.</span> {how}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 text-xs leading-relaxed text-clay">
                  Use a soft tape, keep it snug but not tight, and measure over bare skin or
                  light clothing.
                </p>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
