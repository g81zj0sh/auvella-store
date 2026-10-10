import { Link } from "@tanstack/react-router";
import { BadgeCheck, PackageCheck, ShieldCheck, Shirt, Truck, type LucideIcon } from "lucide-react";
import { useShippingCountry } from "@/lib/shipping";
import { isFinalSale } from "@/lib/returnsPolicy";

/*
 * "Auvella Guarantee" badges under the Add to Bag button (v158, copy v159).
 *
 * - Try-On Guarantee = the 30-day returns/exchanges (unworn, tags on); final-
 *   sale items (underwear, eye mask) show their final-sale line instead.
 * - "5–12 Day Direct Shipping", except where the shopper's own delivery
 *   window (dispatch + courier, the figure the bag and shipping popup quote)
 *   runs past 12 days: those countries see their real range (10 Oct 2026:
 *   7–13 for CA, AU, IE, IT, DK and ES; 6–13 for NZ), so the badge never
 *   promises less than the bag.
 * - No-Roll Waistband Promise on items with a waistband (see hasWaistband),
 *   backed by the supplier's (Teemdrop) testing and customer base, per the
 *   owner, 10 Oct 2026. Everything else keeps Tracked delivery in that slot.
 */
interface Badge {
  icon: LucideIcon;
  title: string;
  detail: string;
  slug?: "shipping" | "returns";
}

/*
 * Shorts, trousers and pants, briefs and thongs, and lounge, pyjama and
 * trouser sets. Not swimwear (bikini bottoms), bras, bodysuits, dresses, the
 * robe, the jumpsuit or the waist shapers. Matches 12 of the 51 live products
 * (10 Oct 2026).
 */
const WAISTBAND =
  /\b(shorts|trousers?|pants|leggings|briefs?|thongs?|lounge set|pyjama set|pajama set)\b/i;

function hasWaistband(title: string, productType = ""): boolean {
  return !/swim/i.test(productType) && WAISTBAND.test(title);
}

export function TrustBadges({
  handle,
  title,
  productType,
}: {
  handle: string;
  title: string;
  productType?: string;
}) {
  const { country } = useShippingCountry();
  const [, max] = country.days.split(/\s*–\s*/).map(Number);
  const days = max > 12 ? country.days.replace(/\s*–\s*/, "–") : "5–12";
  const badges: Badge[] = [
    isFinalSale(handle)
      ? {
          icon: ShieldCheck,
          title: "Final sale for hygiene",
          detail: "Faulty or wrong items replaced or refunded at no cost",
          slug: "returns",
        }
      : {
          icon: Shirt,
          title: "Try-On Guarantee",
          detail: "30 days to return or exchange, unworn with tags on",
          slug: "returns",
        },
    {
      icon: PackageCheck,
      title: `${days} Day Direct Shipping`,
      detail: `Order to delivery, in business days, to ${country.name}`,
      slug: "shipping",
    },
    hasWaistband(title, productType)
      ? {
          icon: BadgeCheck,
          title: "No-Roll Waistband Promise",
          detail: "Stays in place as you move",
        }
      : {
          icon: Truck,
          title: "Tracked delivery",
          detail: "Lost or damaged parcels replaced or refunded",
          slug: "shipping",
        },
  ];

  return (
    <ul
      aria-label="Our promises"
      className="mt-4 grid grid-cols-3 gap-3 border-y border-[#EBEBEB] py-4"
    >
      {badges.map(({ icon: Icon, title, detail, slug }) => {
        const body = (
          <>
            <Icon aria-hidden="true" className="h-5 w-5 text-[#0a0a0a]" strokeWidth={1.5} />
            <span
              className={`text-[11px] font-medium leading-tight text-[#0a0a0a] ${
                slug ? "underline-offset-2 group-hover:underline" : ""
              }`}
            >
              {title}
            </span>
            <span className="text-[10px] leading-snug text-[#666666]">{detail}</span>
          </>
        );
        return (
          <li key={title}>
            {slug ? (
              <Link
                to="/pages/$slug"
                params={{ slug }}
                className="group flex flex-col items-center gap-1.5 text-center"
              >
                {body}
              </Link>
            ) : (
              <div className="flex flex-col items-center gap-1.5 text-center">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
