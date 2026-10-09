import { Link } from "@tanstack/react-router";
import { PackageCheck, Repeat2, ShieldCheck, Truck, type LucideIcon } from "lucide-react";
import { PROCESSING_LABEL } from "@/lib/shipping";
import { isFinalSale } from "@/lib/returnsPolicy";

/*
 * Delivery and returns reassurance under the Add to Bag button.
 *
 * Every line is a promise the Shipping or Returns policy
 * (routes/pages.$slug.tsx) already makes, and each links to the policy that
 * makes it - if a policy changes, change its line here. The wording stops
 * where the policies stop: nothing is insured (we replace or refund a lost or
 * damaged parcel ourselves), exchanges aren't free or fuss-free (unworn, tags
 * on, by email, subject to stock, and none on final-sale items), and there is
 * no sourcing or sustainability claim we could stand behind.
 */
interface Badge {
  icon: LucideIcon;
  title: string;
  detail: string;
  slug: "shipping" | "returns";
}

export function TrustBadges({ handle }: { handle: string }) {
  const badges: Badge[] = [
    {
      icon: Truck,
      title: "Tracked delivery",
      detail: "Lost or damaged parcels replaced or refunded",
      slug: "shipping",
    },
    isFinalSale(handle)
      ? {
          icon: ShieldCheck,
          title: "Final sale for hygiene",
          detail: "Faulty or wrong items replaced or refunded at no cost",
          slug: "returns",
        }
      : {
          icon: Repeat2,
          title: "30-day size exchanges",
          detail: "Unworn with tags on, subject to stock",
          slug: "returns",
        },
    {
      icon: PackageCheck,
      title: `Dispatched within ${PROCESSING_LABEL} business days`,
      detail: "Tracking number emailed on dispatch",
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
