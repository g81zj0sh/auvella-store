import { useEffect, useRef, useState } from "react";
import { estimateDelivery, type DeliveryWindow } from "@/lib/deliveryEstimate";
import { useShippingCountry } from "@/lib/shipping";

/*
 * High-visibility line right above the Add to Bag button (v154): a pulsing
 * dot and the estimated delivery window for the shopper's country.
 *
 * It replaces the "Selling fast" / "Low stock" badge that was asked for:
 * Shopify's stock figures are placeholders (1,000 per variant) and there is no
 * sales-velocity data, so either badge would be false urgency, a banned
 * practice under the DMCC Act 2024. The window comes from estimateDelivery()
 * (real dispatch + courier times, "estimated" because bank holidays aren't
 * modelled) and uses the same wording as the bag. There is no "order today"
 * or countdown, because no daily dispatch cutoff is confirmed.
 *
 * The box reserves its height before the date is known, so the button below
 * doesn't jump. The dot pulses three times each time the line scrolls into
 * view (never for reduced motion), rather than looping beside the button.
 */
export function DeliveryPulse({ available = true }: { available?: boolean }) {
  const { country, ready } = useShippingCountry();
  const [win, setWin] = useState<DeliveryWindow | null>(null);
  const [checked, setChecked] = useState(false);
  const [pulse, setPulse] = useState(0);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!ready) return;
    setWin(estimateDelivery(country));
    setChecked(true);
  }, [country, ready]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !win || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setPulse((p) => p + 1);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [win]);

  // Sold out, or no courier figure for this country: say nothing.
  if (!available || (checked && !win)) return null;

  return (
    <p
      ref={ref}
      className="flex min-h-[40px] items-center gap-2.5 bg-zone px-3.5 py-2.5 text-[12px] leading-snug text-[#0a0a0a]"
    >
      {win ? (
        <>
          <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
            <span
              key={pulse}
              className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-[#1f8a4c]"
            />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#1f8a4c]" />
          </span>
          <span>
            Estimated delivery <span className="whitespace-nowrap font-semibold">{win.label}</span>{" "}
            to {win.countryName}
          </span>
        </>
      ) : (
        <span aria-hidden="true" className="invisible">
          Estimated delivery
        </span>
      )}
    </p>
  );
}
