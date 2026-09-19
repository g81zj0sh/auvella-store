import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { setConsent, readConsent, type ConsentChoice } from "@/lib/consent";

/*
 * Cookie banner.
 *
 * Sits quietly at the foot of the page rather than blocking the store, and
 * gives Accept and Decline equal visual weight — refusing has to be as easy
 * as agreeing, and a single prominent "Accept all" against a faint link is
 * the pattern regulators object to.
 *
 * Renders nothing until mounted, so the server HTML and the first client
 * render match and a returning visitor never sees it flash.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (readConsent() === null) {
      // Let the page settle first; the shipping popup takes the opening beat.
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const choose = (choice: ConsentChoice) => {
    setConsent(choice);
    setClosing(true);
    setTimeout(() => setVisible(false), 260);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-0 z-[70] transition-all duration-300 ease-out ${
        closing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="border-t border-[#e6e4e0] bg-[#faf9f7]">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-5 px-6 py-6 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-7">
          <div className="max-w-[640px]">
            <p className="font-serif text-[17px] font-light leading-snug text-[#0a0a0a] md:text-[18px]">
              A note about cookies
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.7] text-[#555555]">
              We use a few to keep your bag and size preferences, which we need to run the shop. We'd also like to
              use them to measure how our ads perform. That second part is entirely up to you, and the store works
              exactly the same either way.{" "}
              <Link
                to="/pages/$slug"
                params={{ slug: "privacy" }}
                className="border-b border-[#8a8a8a] text-[#0a0a0a] transition-colors hover:border-[#0a0a0a]"
              >
                Privacy policy
              </Link>
            </p>
          </div>

          {/* Equal weight, side by side — declining is not the harder path. */}
          <div className="flex flex-shrink-0 gap-3">
            <button
              type="button"
              onClick={() => choose("declined")}
              className="h-11 flex-1 border border-[#0a0a0a] px-7 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-[#faf9f7] md:flex-none"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="h-11 flex-1 border border-[#0a0a0a] bg-[#0a0a0a] px-7 text-[11px] font-medium uppercase tracking-[0.18em] text-[#faf9f7] transition-colors hover:bg-[#555555] hover:border-[#555555] md:flex-none"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
