import { Truck } from "lucide-react";
import type { MultiBuyTier } from "@/lib/duoDeal";
import { shopifyImg } from "@/lib/shopify";
import { PROTECTION, WASH_BAG } from "@/lib/perks";
import { ProtectionIcon } from "@/components/site/ProtectionIcon";
import { usePerkValues } from "@/lib/usePerkValues";

/*
 * Multi-buy "power cards" (v158): large, full-width cards - Just One /
 * The Daily Rotation (Buy 2) / The Full Refresh (Buy 3+) - with the saving
 * in pounds made big. Still a native radio group underneath: arrow keys move
 * between cards and screen readers announce the choice.
 *
 * Every rate, price and saving comes in from MULTI_BUY_TIERS (lib/duoDeal.ts)
 * via the page, and the badges are built from those rates, so a card can only
 * promise what checkout gives. The 3+ card is badged "Best value" (owner's
 * call, 10 Oct 2026; it carries the largest saving in pounds). No popularity
 * badge: there is no order data to back "most popular" yet.
 *
 * v184 (owner's brief, after Smooche): Buy 2 lists "+ FREE Shipping
 * Protection", Buy 3+ also "+ FREE Anti-Snag Shapewear Wash Bag", each with
 * its picture. The bag adds them free while it qualifies (lib/perks,
 * PerkSync).
 *
 * v185 (owner, after Smooche): the gifts sit in a band across the foot of
 * the card, each with its value struck on the right (the gift variant's
 * compare-at, £3.49 / £10); the selected card's band turns ink, so what the
 * shopper is getting stands out.
 *
 * v210 (owner): "You unlock free shipping" heads the band on a card whose own
 * total - after its multi-buy saving, the figure Shopify checks - reaches the
 * free-shipping threshold in the shopper's currency. A card that doesn't get
 * there on its own says nothing, so the line is always true.
 */

const PERKS: Record<
  MultiBuyTier["quantity"],
  Array<{ key: "protection" | "washBag"; title: string; image: string }>
> = {
  1: [],
  2: [{ key: "protection", title: PROTECTION.title, image: PROTECTION.image }],
  3: [
    { key: "protection", title: PROTECTION.title, image: PROTECTION.image },
    { key: "washBag", title: WASH_BAG.title, image: WASH_BAG.image },
  ],
};
interface Props {
  tiers: MultiBuyTier[];
  /** The selected tier's quantity. */
  value: MultiBuyTier["quantity"];
  onChange: (quantity: MultiBuyTier["quantity"]) => void;
  /** Formatted price for a tier, the full price it is struck against and the
   *  saving (null at full price). */
  price: (tier: MultiBuyTier) => { total: string; full: string | null; saving: string | null };
  /** Radio group name, unique on the page. */
  name: string;
  /** True when this tier alone, after its saving, ships free (v210). */
  freeShipping?: (tier: MultiBuyTier) => boolean;
}

const NAMES: Record<MultiBuyTier["quantity"], { title: string; sub?: string }> = {
  1: { title: "Just One" },
  2: { title: "The Daily Rotation", sub: "Buy 2" },
  3: { title: "The Full Refresh", sub: "Buy 3+" },
};

function badgeFor(t: MultiBuyTier): string | null {
  if (!t.percent) return null;
  return t.quantity >= 3 ? `🔥 Best value · Save ${t.percent}%` : `Save ${t.percent}%`;
}

export function MultiBuySelector({ tiers, value, onChange, price, name, freeShipping }: Props) {
  const worth = usePerkValues();
  return (
    <fieldset className="mt-7">
      <legend className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
        Multi-buy
      </legend>
      {/* gap-4 leaves room for the badges, which sit across each card's top
          edge, so they never touch the card above. */}
      <div className="mt-5 grid grid-cols-1 gap-4">
        {tiers.map((t) => {
          const active = value === t.quantity;
          const { total, full, saving } = price(t);
          const id = `${name}-${t.quantity}`;
          const label = NAMES[t.quantity];
          const badge = badgeFor(t);
          const bold = t.quantity >= 3;
          const shipsFree = !!freeShipping?.(t);
          return (
            <label
              key={t.quantity}
              htmlFor={id}
              className={`relative flex min-h-[76px] cursor-pointer flex-col justify-center rounded-[12px] px-4 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0a0a0a] ${
                bold ? "border-[3px]" : "border-2"
              } ${
                active
                  ? "border-[#0a0a0a] bg-[#f0ede8]"
                  : bold
                    ? "border-[#0a0a0a] bg-white"
                    : "border-[#c9c9c9] bg-white hover:border-[#0a0a0a]"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={t.quantity}
                checked={active}
                onChange={() => onChange(t.quantity)}
                className="sr-only"
              />
              {badge && (
                <span
                  className={`absolute -top-3 right-3 rounded-pill px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
                    bold
                      ? "bg-[#0a0a0a] text-white"
                      : "border border-[#0a0a0a] bg-white text-[#0a0a0a]"
                  }`}
                >
                  {badge}
                </span>
              )}
              <span className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                      active ? "border-[#0a0a0a]" : "border-[#8a8a8a]"
                    }`}
                  >
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-[#0a0a0a]" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold leading-tight text-[#0a0a0a]">
                      {label.title}
                      {label.sub && (
                        <span className="ml-1.5 text-[12px] font-medium text-[#555555]">
                          ({label.sub})
                        </span>
                      )}
                    </span>
                    {saving ? (
                      <span className="mt-1 block text-[16px] font-semibold leading-tight text-[#166534]">
                        Save {saving}
                      </span>
                    ) : (
                      <span className="mt-1 block text-[12px] text-[#555555]">Standard price</span>
                    )}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[16px] font-semibold text-[#0a0a0a]">{total}</span>
                  {full && (
                    <span className="block text-[12px] text-[#6b6b6b]">
                      <span className="sr-only">full price </span>
                      <s>{full}</s>
                    </span>
                  )}
                </span>
              </span>
              {PERKS[t.quantity].length > 0 && (
                /* Gift band, full width across the card's foot (inner radius:
                   12px card minus its 2/3px border). */
                <span
                  className={`-mx-4 -mb-4 mt-4 block divide-y transition-colors ${
                    bold ? "rounded-b-[9px]" : "rounded-b-[10px]"
                  } ${
                    active
                      ? "divide-white/15 bg-[#0a0a0a] text-white"
                      : "divide-[#0a0a0a]/10 bg-[#f3f1ee] text-[#0a0a0a]"
                  }`}
                >
                  {shipsFree && (
                    <span className="flex items-center gap-3 px-4 py-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] bg-white text-[#0a0a0a]">
                        <Truck aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] font-semibold uppercase leading-snug tracking-[0.04em]">
                        You unlock free shipping
                      </span>
                    </span>
                  )}
                  {PERKS[t.quantity].map((p) => (
                    <span key={p.title} className="flex items-center gap-3 px-4 py-2.5">
                      {p.key === "protection" ? (
                        <ProtectionIcon size={28} className="rounded-[6px]" />
                      ) : (
                        <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-[6px] bg-white">
                          <img
                            src={shopifyImg(p.image, 96)}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </span>
                      )}
                      <span className="min-w-0 flex-1 text-[12px] font-semibold uppercase leading-snug tracking-[0.04em]">
                        + Free {p.title}
                      </span>
                      {worth[p.key] && (
                        <s
                          className={`shrink-0 text-[12px] ${active ? "text-white/65" : "text-[#6b6b6b]"}`}
                        >
                          <span className="sr-only">worth </span>
                          {worth[p.key]}
                        </s>
                      )}
                    </span>
                  ))}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
