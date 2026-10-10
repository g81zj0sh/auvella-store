import { useId } from "react";
import {
  ArrowUpToLine,
  Check,
  CircleDot,
  Feather,
  Flame,
  Hand,
  Layers,
  MoveVertical,
  Ruler,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Spline,
  Wind,
  type LucideIcon,
} from "lucide-react";
import type { BenefitTile } from "@/lib/productStory";

/*
 * The shaded benefits zone directly under the gallery (v154): the product's
 * own facts as a 2x2 icon grid, so the value reads at a glance instead of in
 * a paragraph. Tiles come from benefitTiles() in lib/productStory.ts, which
 * only restates the listing.
 *
 * On phones it sits between the gallery and the size picker, so it is kept
 * compact (icon beside text, two-line details) to keep Add to Bag close.
 */
const ICONS: Record<string, LucideIcon> = {
  front: Hand,
  zip: MoveVertical,
  seamless: Sparkles,
  soft: Feather,
  strapless: Shirt,
  back: Spline,
  warm: Flame,
  rise: ArrowUpToLine,
  adjust: SlidersHorizontal,
  cups: CircleDot,
  dry: Wind,
  sleeves: Shirt,
  fabric: Layers,
  sizes: Ruler,
};

export function BenefitsGrid({
  tiles,
  className = "",
}: {
  tiles: BenefitTile[];
  className?: string;
}) {
  // The page renders this twice (phone and desktop placements, one hidden),
  // so the heading id must be unique per instance.
  const headingId = useId();
  if (!tiles.length) return null;
  return (
    <section aria-labelledby={headingId} className={`bg-zone ${className}`}>
      <div className="mx-auto max-w-[1320px] px-5 py-4 md:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-center lg:gap-16 lg:py-16">
        <h2
          id={headingId}
          className="font-serif text-[18px] leading-tight text-[#0a0a0a] lg:text-[44px]"
        >
          At a glance
        </h2>
        <ul role="list" className="mt-3 grid grid-cols-2 gap-2 lg:mt-0 lg:gap-4">
          {tiles.map((t, i) => {
            const Icon = ICONS[t.icon] ?? Check;
            const spanLast = tiles.length % 2 === 1 && i === tiles.length - 1;
            return (
              <li
                key={t.icon}
                className={`flex items-start gap-2.5 bg-white p-3 lg:gap-4 lg:p-6 ${spanLast ? "col-span-2" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0a0a0a] text-white lg:h-11 lg:w-11"
                >
                  <Icon className="h-3.5 w-3.5 lg:h-5 lg:w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold leading-snug text-[#0a0a0a] lg:text-[16px]">
                    {t.title}
                  </span>
                  {t.detail && (
                    <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-[#555555] lg:mt-1 lg:line-clamp-none lg:text-[14px]">
                      {t.detail}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
