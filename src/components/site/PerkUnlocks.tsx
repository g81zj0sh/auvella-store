import { Lock } from "lucide-react";
import { shopifyImg } from "@/lib/shopify";
import { PERK_UNLOCK, WASH_BAG } from "@/lib/perks";
import { usePerkValues } from "@/lib/usePerkValues";
import { ProtectionIcon } from "@/components/site/ProtectionIcon";

/*
 * "Free gifts unlocked" under the underwear's Bundle & save tiles (v185,
 * owner's brief after Smooche): the free shipping protection unlocks at 3
 * pairs, the wash bag at 5 (PERK_UNLOCK) - counting the pairs being chosen
 * plus any already in the bag, exactly as PerkSync will. Locked gifts show a
 * padlock and the pairs they need; tapping one picks the smallest bundle
 * that unlocks it. PerkSync adds unlocked gifts to the bag free with the
 * pairs, so the tiles only promise what the bag will hold. The struck value
 * is the gift's compare-at in the shopper's market (usePerkValues), left out
 * when there isn't a true one.
 */
export function PerkUnlocks({
  pairs,
  inBag,
  tiers,
  onChoose,
}: {
  /** Pairs in the bundle being chosen (the selected tile). */
  pairs: number;
  /** Underwear pairs already in the bag (any of the three styles). */
  inBag: number;
  /** The bundle sizes on offer (1 / 3 / 5). */
  tiers: number[];
  /** Pick a bundle size. */
  onChoose: (pairs: number) => void;
}) {
  const worth = usePerkValues();
  const total = pairs + inBag;
  const gifts = [
    {
      key: "protection",
      title: "Shipping protection",
      needs: PERK_UNLOCK.protection.bundle,
      value: worth.protection,
      icon: <ProtectionIcon size={40} className="rounded-[8px]" />,
    },
    {
      key: "washbag",
      title: "Anti-snag wash bag",
      needs: PERK_UNLOCK.washbag.bundle,
      value: worth.washBag,
      icon: (
        <span className="block h-10 w-10 overflow-hidden rounded-[8px] bg-white">
          <img
            src={shopifyImg(WASH_BAG.image, 120)}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        </span>
      ),
    },
  ];
  const unlocked = gifts.filter((g) => total >= g.needs).length;
  /** The smallest bundle that, with the bag, reaches a gift. */
  const tierFor = (needs: number) =>
    tiers.find((t) => t + inBag >= needs) ?? tiers[tiers.length - 1];

  return (
    <div className="mt-5">
      <p aria-live="polite" className="text-center text-[12px] text-[#0a0a0a]">
        {unlocked ? "Free gifts unlocked:" : "Unlock free gifts:"}
        <span className="sr-only">
          {" "}
          {unlocked} of {gifts.length}
        </span>
      </p>
      {/* pt-2.5 leaves room for the FREE badges across the tiles' top edge. */}
      <ul className="mt-2 grid grid-cols-2 gap-2.5 pt-2.5">
        {gifts.map((g) => {
          const on = total >= g.needs;
          const worthText = g.value ? `, worth ${g.value}` : "";
          return (
            <li key={g.key}>
              {/* Always a button, so focus stays put when a tap unlocks it. */}
              <button
                type="button"
                aria-disabled={on}
                onClick={() => {
                  if (!on) onChoose(tierFor(g.needs));
                }}
                aria-label={
                  on
                    ? `${g.title}, free${worthText}. Unlocked`
                    : `${g.title}, free${worthText}. Locked: needs ${g.needs} pairs in your bag`
                }
                className={`relative flex w-full flex-col items-center rounded-[12px] border-2 px-2 pb-3 pt-4 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] ${
                  on
                    ? "cursor-default border-[#0a0a0a] bg-white"
                    : "cursor-pointer border-[#e6e4e0] bg-[#faf9f7] hover:border-[#0a0a0a]"
                }`}
              >
                <span
                  className={`absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    on ? "bg-[#0a0a0a] text-white" : "bg-[#e6e4e0] text-[#555555]"
                  }`}
                >
                  Free
                  {g.value && <s className={on ? "text-white/65" : "text-[#555555]"}>{g.value}</s>}
                </span>
                <span className="grid h-10 place-items-center">
                  {on ? g.icon : <Lock className="h-5 w-5 text-[#8a8a8a]" aria-hidden="true" />}
                </span>
                <span className="mt-1.5 block text-[12px] font-medium leading-tight text-[#0a0a0a]">
                  {g.title}
                </span>
                <span
                  className={`mt-0.5 block text-[11px] leading-tight ${on ? "text-[#166534]" : "text-[#6b6b6b]"}`}
                >
                  {on ? "Unlocked" : `With ${g.needs} pairs`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
