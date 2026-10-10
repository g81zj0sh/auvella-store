/*
 * Friendly free-shipping progress right above Add to Bag (v158).
 *
 * Shows the bag's own standing - the page passes the bag's value after
 * discounts (bagTotals) and the threshold from bagFreeShipping(), the same
 * figures the bag drawer uses - so the box and the bag always agree, and
 * "unlocked" only shows when checkout will offer the free rate. "Free Express Delivery" is the Shipping
 * policy's own wording ("free express shipping on all orders of £60 or
 * more"). Unlocked turns the box and bar green.
 */
export function FreeShippingProgress({
  value,
  threshold,
  cur,
  pending = false,
}: {
  /** The bag's value after discounts (what checkout charges for the goods), in the bag's currency. */
  value: number;
  /** Free-shipping threshold in the same currency. */
  threshold: number;
  /** Formats an amount in that currency. */
  cur: (n: number) => string;
  /** A discount code is still being priced: no claim either way until then. */
  pending?: boolean;
}) {
  if (pending || !(threshold > 0)) return null;
  const unlocked = value >= threshold;
  const pct = Math.min(100, Math.max(0, (value / threshold) * 100));
  const remaining = Math.max(0, threshold - value);
  return (
    <div
      className={`rounded-[12px] border px-4 py-3 transition-colors duration-500 ${
        unlocked ? "border-[#94E374] bg-[#DCFFD3]" : "border-[#e0ddd8] bg-zone"
      }`}
    >
      <p
        aria-live="polite"
        className={`text-[13px] leading-snug ${unlocked ? "font-semibold text-[#166534]" : "text-[#0a0a0a]"}`}
      >
        {unlocked ? (
          <>✨ Free Shipping Unlocked! We've got this covered.</>
        ) : (
          <>
            🌱 You're only <span className="font-semibold">{cur(remaining)}</span> away from Free
            Express Delivery!
          </>
        )}
      </p>
      <div
        className="mt-2.5 h-3 overflow-hidden rounded-pill bg-white"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        aria-label="Progress towards free shipping"
      >
        <div
          className={`h-full rounded-pill transition-[width,background-color] duration-500 ease-out ${
            unlocked ? "bg-[#2f9e44]" : "bg-[#0a0a0a]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={`mt-1.5 text-[11px] ${unlocked ? "text-[#166534]" : "text-[#555555]"}`}>
        {unlocked
          ? `Your bag has reached ${cur(threshold)}`
          : `In your bag: ${cur(value)} of ${cur(threshold)}`}
      </p>
    </div>
  );
}
