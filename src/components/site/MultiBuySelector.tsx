import type { MultiBuyTier } from "@/lib/duoDeal";

/*
 * Multi-buy tiers as a native radio group: arrow keys move between tiers and
 * screen readers announce the choice; the visible cards are the labels.
 * Every rate and price comes in from MULTI_BUY_TIERS (lib/duoDeal.ts) via the
 * page - nothing here states a saving of its own.
 */
interface Props {
  tiers: MultiBuyTier[];
  /** The selected tier's quantity. */
  value: MultiBuyTier["quantity"];
  onChange: (quantity: MultiBuyTier["quantity"]) => void;
  /** Formatted price for a tier, and the full price it is struck against (none at full price). */
  price: (tier: MultiBuyTier) => { total: string; full: string | null };
  /** Badged "Best value" only when one tier saves strictly more than the rest. */
  bestValue?: MultiBuyTier;
  /** Radio group name, unique on the page. */
  name: string;
}

export function MultiBuySelector({ tiers, value, onChange, price, bestValue, name }: Props) {
  return (
    <fieldset className="mt-7">
      <legend className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
        Multi-buy
      </legend>
      {/* gap-3 leaves room for the "Best value" sticker, which sits across
          its card's top edge, so it never touches the card above. */}
      <div className="mt-4 grid grid-cols-1 gap-3">
        {tiers.map((t) => {
          const active = value === t.quantity;
          const { total, full } = price(t);
          const id = `${name}-${t.quantity}`;
          return (
            <label
              key={t.quantity}
              htmlFor={id}
              className={`relative flex cursor-pointer items-center justify-between border px-4 py-3.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0a0a0a] ${
                active
                  ? "border-[#0a0a0a] bg-[#faf9f7] ring-1 ring-inset ring-[#0a0a0a]"
                  : "border-[#8a8a8a] bg-white hover:border-[#0a0a0a]"
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
              {bestValue === t && (
                <span className="absolute -top-2.5 right-3 bg-[#0a0a0a] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em] text-white">
                  Best value
                </span>
              )}
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 ${
                    active ? "border-[#0a0a0a]" : "border-[#8a8a8a]"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-[#0a0a0a]" />}
                </span>
                <span>
                  <span className="block text-[14px] font-medium text-[#0a0a0a]">
                    Buy {t.quantity}
                    {t.orMore ? "+" : ""} {t.quantity === 1 ? "Item" : "Items"}
                  </span>
                  <span
                    className={`block text-[12px] ${t.percent ? "font-medium text-[#0a0a0a]" : "text-[#555555]"}`}
                  >
                    {t.percent ? `Save ${t.percent}% on each` : "Standard price"}
                  </span>
                </span>
              </span>
              <span className="text-right">
                <span className="block text-[15px] text-[#0a0a0a]">{total}</span>
                {full && (
                  <span className="block text-[11px] text-[#666666]">
                    <span className="sr-only">full price </span>
                    <s>{full}</s>
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
