import { Star } from "lucide-react";

/*
 * Rating badge on the line above the product title (v154), linking to the
 * reviews.
 *
 * It shows the product's own Judge.me average and review count exactly as
 * published - the figures the reviews section uses - and nothing when there
 * are none. No rounding up, no averages borrowed from other products, no
 * claims about who the reviewers are.
 */
function StarRow({ rating }: { rating: number }) {
  const pct = `${Math.max(0, Math.min(100, (rating / 5) * 100))}%`;
  const row = (cls: string) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`h-3.5 w-3.5 shrink-0 ${cls}`} strokeWidth={0} />
    ));
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <span className="flex">{row("fill-[#0a0a0a]/30")}</span>
      <span className="absolute inset-0 flex overflow-hidden" style={{ width: pct }}>
        {row("fill-[#0a0a0a]")}
      </span>
    </span>
  );
}

export function RatingBadge({
  average,
  count,
  className = "",
}: {
  average: number;
  count: number;
  className?: string;
}) {
  if (!(count > 0) || !(average > 0)) return null;
  const avg = (Math.round(average * 10) / 10).toFixed(1);
  return (
    <a
      href="#reviews"
      className={`flex w-fit items-center gap-2 bg-zone px-2.5 py-1 transition-colors hover:bg-zone-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] ${className}`}
    >
      <StarRow rating={average} />
      <span className="text-[13px] font-semibold tabular-nums text-[#0a0a0a]">
        {avg}
        <span aria-hidden="true">/5</span>
        <span className="sr-only"> out of 5 stars,</span>
      </span>
      <span className="text-[12px] text-[#0a0a0a] underline underline-offset-4">
        {count} {count === 1 ? "review" : "reviews"}
      </span>
    </a>
  );
}
