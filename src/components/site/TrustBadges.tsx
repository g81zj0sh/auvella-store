import { Link } from "@tanstack/react-router";
import { PackageCheck, ShieldCheck, Shirt, Truck, type LucideIcon } from "lucide-react";
import { useShippingCountry } from "@/lib/shipping";
import { isFinalSale } from "@/lib/returnsPolicy";

/*
 * "Auvella Guarantee" badges under the Add to Bag button (v158).
 *
 * Every line is a promise the Shipping or Returns policy
 * (routes/pages.$slug.tsx) already makes, and each links to the policy that
 * makes it - if a policy changes, change its line here:
 * - Try-On Guarantee = the 30-day returns/exchanges (unworn, tags on); final-
 *   sale items (underwear, eye mask) show their final-sale line instead.
 * - Direct Shipping days = dispatch (PROCESSING_DAYS) + the courier time for
 *   the shopper's country, i.e. the same figure the site quotes elsewhere.
 * - Tracked delivery = lost or damaged parcels replaced or refunded.
 * No performance promise (e.g. "no-roll") without a wear test behind it, and
 * no insurance or sustainability claim.
 */
interface Badge {
  icon: LucideIcon;
  title: string;
  detail: string;
  slug: "shipping" | "returns";
}

export function TrustBadges({ handle }: { handle: string }) {
  const { country } = useShippingCountry();
  const days = country.days.replace(/\s*–\s*/, "–");
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
    {
      icon: Truck,
      title: "Tracked delivery",
      detail: "Lost or damaged parcels replaced or refunded",
      slug: "shipping",
    },
  ];

  return (
    <ul
      aria-label="Delivery and returns"
      className="mt-4 grid grid-cols-3 gap-3 border-y border-[#EBEBEB] py-4"
    >
      {badges.map(({ icon: Icon, title, detail, slug }) => (
        <li key={title}>
          <Link
            to="/pages/$slug"
            params={{ slug }}
            className="group flex flex-col items-center gap-1.5 text-center"
          >
            <Icon aria-hidden="true" className="h-5 w-5 text-[#0a0a0a]" strokeWidth={1.5} />
            <span className="text-[11px] font-medium leading-tight text-[#0a0a0a] underline-offset-2 group-hover:underline">
              {title}
            </span>
            <span className="text-[10px] leading-snug text-[#666666]">{detail}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
