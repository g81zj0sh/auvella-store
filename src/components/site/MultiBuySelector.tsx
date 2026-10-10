import type { MultiBuyTier } from "@/lib/duoDeal";

/*
 * Multi-buy "power cards" (v158): large, full-width cards - Just One /
 * The Daily Rotation (Buy 2) / The Full Refresh (Buy 3+) - with the saving
 * in pounds made big. Still a native radio group underneath: arrow keys move
 * between cards and screen readers announce the choice.
 *
 * Every rate, price and saving comes in from MULTI_BUY_TIERS (lib/duoDeal.ts)
 * via the page, and the badges are built from those rates, so a card can only
 * promise what checkout gives. No popularity badge: there is no order data to
 * back "most popular" yet.
 */
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
}

const NAMES: Record<MultiBuyTier["quantity"], { title: string; sub?: string }> = {
  1: { title: "Just One" },
  2: { title: "The Daily Rotation", sub: "Buy 2" },
  3: { title: "The Full Refresh", sub: "Buy 3+" },
};

function badgeFor(t: MultiBuyTier): string | null {
  if (!t.percent) return null;
  return t.quantity >= 3 ? `🔥 Stock up · Save ${t.percent}%` : `Save ${t.percent}%`;
}

export function MultiBuySelector({ tiers, value, onChange, price, name }: Props) {
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
          return (
            <label
              key={t.quantity}
              htmlFor={id}
              className={`relative flex min-h-[76px] cursor-pointer items-center justify-between gap-3 rounded-[12px] px-4 py-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0a0a0a] ${
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
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
