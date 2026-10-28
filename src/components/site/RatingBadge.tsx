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
export function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  const pct = `${Math.max(0, Math.min(100, (rating / 5) * 100))}%`;
  const row = (cls: string) =>
    Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`shrink-0 ${cls}`} style={{ width: size, height: size }} strokeWidth={0} />
    ));
  return (
    <span className="relative inline-flex" aria-hidden="true">
      <span className="flex">{row("fill-star/25")}</span>
      <span className="absolute inset-0 flex overflow-hidden" style={{ width: pct }}>
        {row("fill-star")}
      </span>
    </span>
  );
}

export function RatingBadge({
  average,
  count,
  large = false,
  className = "",
}: {
  average: number;
  count: number;
  /** v210: the product page's bigger, easier-to-read stars (owner's ask). */
  large?: boolean;
  className?: string;
}) {
  if (!(count > 0) || !(average > 0)) return null;
  const avg = (Math.round(average * 10) / 10).toFixed(1);
  /* Glide down to the reviews rather than jump (v156); an instant jump for
     anyone who has asked for reduced motion. Focus moves to the reviews too,
     as the plain anchor jump would have done for keyboard users. The URL hash
     is left alone: changing it makes the router jump straight to #reviews,
     cutting the glide short. */
  const scrollToReviews = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("reviews");
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  };
  return (
    <a
      href="#reviews"
      onClick={scrollToReviews}
      className={`flex w-fit items-center rounded-pill bg-zone transition-colors hover:bg-zone-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] ${
        large ? "gap-2.5 px-3.5 py-1.5" : "gap-2 px-3 py-1"
      } ${className}`}
    >
      <StarRow rating={average} size={large ? 19 : 14} />
      <span className={`${large ? "text-[15px]" : "text-[13px]"} font-semibold tabular-nums text-[#0a0a0a]`}>
        {avg}
        <span aria-hidden="true">/5</span>
        <span className="sr-only"> out of 5 stars,</span>
      </span>
      <span className={`${large ? "text-[13px]" : "text-[12px]"} text-[#0a0a0a] underline underline-offset-4`}>
        {count} {count === 1 ? "review" : "reviews"}
      </span>
    </a>
  );
}
