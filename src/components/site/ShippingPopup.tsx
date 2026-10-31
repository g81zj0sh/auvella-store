import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { COUNTRIES, freeShippingThresholdFmt, inEea, useShippingCountry } from "@/lib/shipping";
import { deliveryTimeLine, inFreeDeliveryCountry } from "@/lib/freeDelivery";
import { usePreferences } from "@/lib/preferences";
import { landedOnHome } from "@/lib/landing";

/*
 * ShippingPopup — SKIMS-style shipping-location modal.
 *  - Auto-detects country (ipapi.co, browser-locale fallback)
 *  - Hemisphere-aware seasonal offer bar: "40% Off Autumn · Ending soon 🔥🔥".
 *    No countdown since v149 - Joshua found the ticking timer too big, and a
 *    clock that restarts every season reads as false urgency.
 *  - Compact on phones (280px wide, tighter type/spacing); md: restores the
 *    desktop sizing. Joshua asked for roughly half the mobile footprint.
 *  - Fades in on open, fades out on dismiss
 *  - Shows once per session (sessionStorage)
 *  - Only for visitors whose session STARTED on the home page. Someone who
 *    lands on a collection or product and later navigates home is mid-browse,
 *    not arriving, so the modal stays out of their way.
 *  - Suppressed for 10 minutes after a dismissal, so a back-button bounce onto
 *    the home page can't resurrect it even in a fresh session.
 */

const SESSION_KEY = "auvella_shipping_popup_v1";
/* Dismissal timestamp. localStorage, not session: a back-navigation can start a
   fresh session in some browsers, which is exactly the bounce we're damping. */
const DISMISSED_AT_KEY = "auvella_shipping_popup_dismissed_at_v1";
const COOLDOWN_MS = 10 * 60 * 1000;
const FADE_MS = 300;

/** True while the 10-minute post-dismissal window is still open. */
function inCooldown(): boolean {
  try {
    const raw = localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    const then = Number(raw);
    if (!Number.isFinite(then)) return false;
    const delta = Date.now() - then;
    // A negative delta means the clock moved backwards; treat it as expired
    // rather than locking the modal out until the clock catches up.
    return delta >= 0 && delta < COOLDOWN_MS;
  } catch {
    return false;
  }
}


/** Meteorological season name, hemisphere-aware (AU/NZ southern). */
function seasonName(code: string): string {
  const southern = ["AU", "NZ"].includes((code ?? "").toUpperCase());
  const m = new Date().getMonth(); // 0-11
  const northName =
    m >= 2 && m <= 4 ? "Spring" : m >= 5 && m <= 7 ? "Summer" : m >= 8 && m <= 10 ? "Autumn" : "Winter";
  const southName =
    m >= 2 && m <= 4 ? "Autumn" : m >= 5 && m <= 7 ? "Winter" : m >= 8 && m <= 10 ? "Spring" : "Summer";
  return southern ? southName : northName;
}

export function ShippingPopup() {
  const [render, setRender] = useState(false); // mounted in DOM
  const [visible, setVisible] = useState(false); // drives the fade
  const [view, setView] = useState<"main" | "picker">("main");
  const [pickerQuery, setPickerQuery] = useState("");
  const { country, setCountry, ready } = useShippingCountry();
  const displayCurrency = usePreferences((s) => s.currency);
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!landedOnHome()) return;
    if (inCooldown()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* storage unavailable — still show */
    }
    if (!ready) return;
    const t = window.setTimeout(() => setRender(true), 400);
    return () => {
      window.clearTimeout(t);
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, [ready]);

  // Fade in on the frame after mount
  useEffect(() => {
    if (!render) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [render]);

  useEffect(() => {
    if (!render) return;
    document.body.style.overflow = "hidden";
    // Always release fully — restoring a remembered value can re-freeze the
    // page when two overlays (intro, menu, popup) overlap in time.
    return () => {
      document.body.style.overflow = "";
    };
  }, [render]);

  const season = seasonName(country.code);

  const dismiss = () => {
    setVisible(false); // fade out…
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* noop */
    }
    try {
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
    closeTimer.current = window.setTimeout(() => setRender(false), FADE_MS);
  };

  const goToNewsletter = () => {
    dismiss();
    setTimeout(() => {
      document.getElementById("newsletter")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, FADE_MS);
  };

  if (!render) return null;

  const headline = `You're shopping in ${country.the ? "the " : ""}${country.name}.`;
  const thresholdFmt = freeShippingThresholdFmt(displayCurrency);
  // v197: Shopify shows EEA shoppers no "was" prices (lib/shipping inEea),
  // so no percentage is promised there; the owner's wording instead.
  const saleLine = inEea(country.code) ? "New Season Sale" : `40% Off ${season}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Dimmed, softly blurred page behind — fades with the modal */}
      <button
        aria-label="Close"
        onClick={dismiss}
        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal — fades and settles in, fades out on dismiss */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shipping information"
        className={`relative w-full max-w-[280px] overflow-hidden rounded-card bg-white px-4 pb-4 pt-0 transition-all duration-300 ease-out md:max-w-[380px] md:px-7 md:pb-7 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.97] opacity-0"
        }`}
      >
        {/* Seasonal bar. The figure must match the compare-at discount every
            product actually shows: 40% since 5 Oct 2026 (compare-at = price /
            0.6; live check: every product 40-43% off). EEA: "New Season Sale". */}
        <div className="-mx-4 bg-[#0a0a0a] py-1.5 pl-4 pr-9 text-center text-[9px] uppercase tracking-[0.12em] text-white md:-mx-7 md:py-2 md:text-[10px] md:tracking-[0.14em]">
          {saleLine} · Ending soon <span aria-hidden="true">🔥🔥</span>
        </div>
        <button
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-2.5 top-1.5 text-white transition-opacity hover:opacity-60 md:right-3 md:top-2"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {view === "main" ? (
          <>
            <p className="mt-3 text-center text-[8px] uppercase tracking-[0.4em] text-[#888888] md:mt-5 md:text-[9px]">
              Auvella
            </p>
            <h2 className="mt-1.5 text-center font-serif text-[14px] font-semibold uppercase leading-[1.2] tracking-[0.05em] text-[#0a0a0a] md:mt-2 md:text-[21px]">
              {headline}
            </h2>
            <div className="mx-auto mt-2 h-px w-8 bg-[#0a0a0a] md:mt-3 md:w-10" />
            <p className="mt-1.5 text-center text-[8px] uppercase tracking-[0.2em] text-[#888888] md:mt-2 md:text-[9px]">
              Prices shown in {displayCurrency}
            </p>

            <ul className="mt-3 space-y-0.5 md:mt-4 md:space-y-1">
              {[
                <span key="ship" className="font-semibold">
                  {/* v224: free delivery on 2+ items where it applies. */}
                  {inFreeDeliveryCountry(country.code)
                    ? "Free delivery on 2+ items (excludes underwear)"
                    : `Free Shipping On Orders ${thresholdFmt}+`}
                </span>,
                <button
                  key="list"
                  onClick={goToNewsletter}
                  className="text-left underline underline-offset-4 transition-opacity hover:opacity-60"
                >
                  Join the Auvella List for 10% off
                </button>,
                <span key="pay">Secure checkout with Apple&nbsp;Pay, Google&nbsp;Pay &amp; Shop&nbsp;Pay</span>,
                <span key="days">{deliveryTimeLine(country)}</span>,
                <span key="returns">Easy, tracked 30-day returns</span>,
              ].map((content, i) => (
                <li
                  key={i}
                  className="flex gap-1.5 text-[10.5px] font-medium leading-[1.45] text-[#0a0a0a] md:gap-2 md:text-[12px] md:leading-[1.55]"
                >
                  <span aria-hidden className="mt-[1px] select-none">
                    •
                  </span>
                  <span>{content}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={dismiss}
              className="mt-3.5 flex h-9 w-full items-center justify-center rounded-control bg-[#0a0a0a] text-[10px] font-medium uppercase tracking-[0.16em] md:mt-5 md:h-10 md:text-[11px] md:tracking-[0.18em] text-white transition-colors hover:bg-[#262626]"
            >
              Continue Shopping
            </button>

            <div className="mt-2 text-center md:mt-3">
              <button
                onClick={() => { setPickerQuery(""); setView("picker"); }}
                className="text-[9px] uppercase tracking-[0.12em] text-[#555555] underline underline-offset-4 transition-colors hover:text-[#0a0a0a] md:text-[10px] md:tracking-[0.14em]"
              >
                Choose Your Shipping Destination
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-4 pr-5 text-center font-serif text-[14px] md:mt-5 md:text-[17px] font-semibold uppercase tracking-[0.06em] text-[#0a0a0a]">
              Choose Your Shipping Destination
            </h2>
            <input
              autoFocus
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="Search country…"
              className="mt-4 w-full border-b border-[#0a0a0a] bg-transparent pb-2 text-[16px] md:text-[13px] text-[#0a0a0a] placeholder:text-[#888888] focus:outline-none"
            />
            <ul className="mt-2 max-h-[40vh] overflow-y-auto">
              {COUNTRIES.filter((c) => {
                const q = pickerQuery.trim().toLowerCase();
                if (!q) return true;
                return c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q;
              }).map((c) => (
                <li key={c.code}>
                  <button
                    onClick={() => {
                      setCountry(c);
                      setView("main");
                    }}
                    className={`flex w-full items-center justify-between border-b border-[#EBEBEB] py-2.5 text-left text-[12px] transition-opacity hover:opacity-60 ${
                      c.code === country.code ? "font-medium text-[#0a0a0a]" : "text-[#555555]"
                    }`}
                  >
                    <span>
                      {c.the ? "the " : ""}
                      {c.name}
                    </span>
                    <span className="text-[11px] text-[#888888]">{c.days.replace(/\s*–\s*/, "–")} working days</span>
                  </button>
                </li>
              ))}
            </ul>
            {pickerQuery.trim() &&
              COUNTRIES.filter((c) =>
                c.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
              ).length === 0 && (
                <p className="mt-3 text-[12px] leading-relaxed text-[#555555]">
                  We don't ship to "{pickerQuery.trim()}" yet.
                </p>
              )}
            <div className="mt-5 text-center">
              <button
                onClick={() => setView("main")}
                className="text-[11px] uppercase tracking-[0.12em] text-[#0a0a0a] underline underline-offset-4 transition-opacity hover:opacity-60"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
