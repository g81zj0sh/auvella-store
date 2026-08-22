import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { COUNTRIES, freeShippingThresholdFmt, useShippingCountry } from "@/lib/shipping";
import { usePreferences } from "@/lib/preferences";

/*
 * ShippingPopup — SKIMS-style shipping-location modal.
 *  - Auto-detects country (ipapi.co, browser-locale fallback)
 *  - Hemisphere-aware seasonal urgency bar with live countdown
 *  - Fades in on open, fades out on dismiss
 *  - Shows once per session (sessionStorage)
 */

const SESSION_KEY = "auvella_shipping_popup_v1";
const FADE_MS = 300;


/** Meteorological season + end DATE, hemisphere-aware (AU/NZ southern). */
function seasonInfo(code: string): { name: string; endDate: Date } {
  const southern = ["AU", "NZ"].includes((code ?? "").toUpperCase());
  const m = new Date().getMonth(); // 0-11
  const northName =
    m >= 2 && m <= 4 ? "Spring" : m >= 5 && m <= 7 ? "Summer" : m >= 8 && m <= 10 ? "Autumn" : "Winter";
  const southName =
    m >= 2 && m <= 4 ? "Autumn" : m >= 5 && m <= 7 ? "Winter" : m >= 8 && m <= 10 ? "Spring" : "Summer";
  // Season boundaries: May 31, Aug 31, Nov 30, Feb 28 (both hemispheres share dates)
  const [endMonth, endDay] =
    m >= 2 && m <= 4 ? [4, 31] : m >= 5 && m <= 7 ? [7, 31] : m >= 8 && m <= 10 ? [10, 30] : [1, 28];
  const now = new Date();
  let endDate = new Date(now.getFullYear(), endMonth, endDay, 23, 59, 59);
  if (endDate.getTime() < now.getTime()) {
    endDate = new Date(now.getFullYear() + 1, endMonth, endDay, 23, 59, 59);
  }
  return { name: southern ? southName : northName, endDate };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Live "Xd hh:mm:ss" countdown to a target date. */
function useCountdown(target: Date, active: boolean) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    if (!active) return;
    const tick = () => {
      const ms = Math.max(0, target.getTime() - Date.now());
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const mi = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1000);
      setLeft(`${d}d ${pad(h)}:${pad(mi)}:${pad(s)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target.getTime(), active]);
  return left;
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

  const season = seasonInfo(country.code);
  const countdown = useCountdown(season.endDate, render);

  const dismiss = () => {
    setVisible(false); // fade out…
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
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
        className={`relative w-full max-w-[350px] bg-white px-6 pb-6 pt-0 transition-all duration-300 ease-out md:max-w-[380px] md:px-7 md:pb-7 ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.97] opacity-0"
        }`}
      >
        {/* Urgency bar — REAL offer required: create the matching 20% code in
            Shopify (with this expiry) before shipping this banner live. */}
        <div className="-mx-6 bg-[#0a0a0a] py-2 pl-4 pr-10 text-center text-[10px] uppercase tracking-[0.14em] text-white md:-mx-7">
          20% Off {season.name} · Ends in{" "}
          <span className="font-semibold tabular-nums">{countdown}</span>
        </div>
        <button
          aria-label="Close"
          onClick={dismiss}
          className="absolute right-3 top-2 text-white transition-opacity hover:opacity-60"
        >
          <X className="h-4 w-4" strokeWidth={1.5} />
        </button>

        {view === "main" ? (
          <>
            <p className="mt-5 text-center text-[9px] uppercase tracking-[0.4em] text-[#888888]">
              Auvella
            </p>
            <h2 className="mt-2 text-center font-serif text-[19px] font-semibold uppercase leading-[1.2] tracking-[0.05em] text-[#0a0a0a] md:text-[21px]">
              {headline}
            </h2>
            <div className="mx-auto mt-3 h-px w-10 bg-[#0a0a0a]" />
            <p className="mt-2 text-center text-[9px] uppercase tracking-[0.2em] text-[#888888]">
              Prices shown in {displayCurrency}
            </p>

            <ul className="mt-4 space-y-1">
              {[
                <span key="ship" className="font-semibold">
                  Free Shipping On Orders {thresholdFmt}+
                </span>,
                <button
                  key="list"
                  onClick={goToNewsletter}
                  className="text-left underline underline-offset-4 transition-opacity hover:opacity-60"
                >
                  Join the Auvella List for 10% off
                </button>,
                <span key="pay">Secure checkout with Apple&nbsp;Pay, Google&nbsp;Pay &amp; Shop&nbsp;Pay</span>,
                <span key="days">
                  Receive Your Order in <span className="font-semibold">{country.days}</span>{" "}
                  Business Days
                </span>,
                <span key="duty">Duties And Taxes Are Included</span>,
                <span key="returns">Easy, tracked 30-day returns</span>,
              ].map((content, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-[12px] font-medium leading-[1.55] text-[#0a0a0a]"
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
              className="mt-5 flex h-10 w-full items-center justify-center bg-[#0a0a0a] text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#262626]"
            >
              Continue Shopping
            </button>

            <div className="mt-3 text-center">
              <button
                onClick={() => { setPickerQuery(""); setView("picker"); }}
                className="text-[10px] uppercase tracking-[0.14em] text-[#555555] underline underline-offset-4 transition-colors hover:text-[#0a0a0a]"
              >
                Choose Your Shipping Destination
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-5 pr-6 text-center font-serif text-[17px] font-semibold uppercase tracking-[0.06em] text-[#0a0a0a]">
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
                    <span className="text-[11px] text-[#888888]">{c.days} days</span>
                  </button>
                </li>
              ))}
            </ul>
            {pickerQuery.trim() &&
              COUNTRIES.filter((c) =>
                c.name.toLowerCase().includes(pickerQuery.trim().toLowerCase()),
              ).length === 0 && (
                <p className="mt-3 text-[12px] leading-relaxed text-[#555555]">
                  We don't ship to "{pickerQuery.trim()}" yet — orders outside our
                  listed destinations default to 5 – 10 business days.
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
