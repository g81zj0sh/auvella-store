import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { setConsent, readConsent, onCookieSettingsOpen, type ConsentChoice } from "@/lib/consent";

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
 *
 * v188: the footer's "Cookie settings" reopens it whatever was chosen before.
 * Taking back a yes is handled where the tags start (__root): it clears their
 * cookies and reloads once.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  // v188: bumped on each reopen so focus moves into the banner.
  const [reopened, setReopened] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (readConsent() === null) {
      // Let the page settle first; the shipping popup takes the opening beat.
      // v188: re-checked, in case it was answered from Cookie settings meanwhile.
      const t = setTimeout(() => {
        if (readConsent() === null) setVisible(true);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(
    () =>
      onCookieSettingsOpen(() => {
        clearTimeout(closeTimer.current);
        const active = document.activeElement;
        returnFocus.current = active instanceof HTMLElement ? active : null;
        setClosing(false);
        setVisible(true);
        setReopened((n) => n + 1);
      }),
    [],
  );

  // Keyboard users land in the banner, not back at the top of the page.
  useEffect(() => {
    if (reopened) ref.current?.focus({ preventScroll: true });
  }, [reopened]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // v218: while the banner is up, phones' sticky buy bar sits just above it
  // (it was hidden underneath), so Add to bag and Buy now stay tappable. The
  // bar reads the banner's height from these two properties.
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    const clear = () => {
      root.style.removeProperty("--cookie-banner-h");
      root.style.removeProperty("--cookie-banner-safe");
    };
    if (!visible || closing || !el) {
      clear();
      return;
    }
    const measure = () => {
      root.style.setProperty("--cookie-banner-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
      root.style.setProperty("--cookie-banner-safe", "0px");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
      clear();
    };
  }, [visible, closing]);

  const choose = (choice: ConsentChoice) => {
    setConsent(choice);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      // Hand focus back to "Cookie settings" rather than losing it to the page.
      const back = returnFocus.current;
      returnFocus.current = null;
      if (back?.isConnected && ref.current?.contains(document.activeElement)) {
        back.focus({ preventScroll: true });
      }
      setVisible(false);
    }, 260);
  };

  if (!visible) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label="Cookies"
      aria-live="polite"
      className={`fixed inset-x-0 bottom-0 z-[70] transition-all duration-300 ease-out focus:outline-none ${
        closing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      }`}
    >
      <div className="border-t border-[#e6e4e0] bg-[#faf9f7]">
        {/* v218: tighter on phones (same words, same two equal buttons), so
            less of the page sits under it. */}
        <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5 px-5 py-4 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-7">
          <div className="max-w-[640px]">
            <p className="font-serif text-[16px] font-light leading-snug text-[#0a0a0a] md:text-[18px]">
              A note about cookies
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.6] text-[#555555] md:mt-1.5 md:text-[13px] md:leading-[1.7]">
              We use a few to keep your bag and size preferences, which we need to run the shop. We'd also like to
              use them to measure how our ads perform and to personalise our emails, like a reminder about your
              bag. That second part is entirely up to you, and the store works
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
              className="h-11 flex-1 rounded-control border border-[#0a0a0a] px-7 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-[#faf9f7] md:flex-none"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="h-11 flex-1 rounded-control border border-[#0a0a0a] bg-[#0a0a0a] px-7 text-[11px] font-medium uppercase tracking-[0.18em] text-[#faf9f7] transition-colors hover:bg-[#555555] hover:border-[#555555] md:flex-none"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
