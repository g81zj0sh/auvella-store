import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import paymentMethodsAssetImg from "@/assets/payment-methods.png";
const paymentMethodsAsset = { url: paymentMethodsAssetImg };

/* Footer — SKIMS layout: white, three centred columns
   (HELP · STAY IN THE KNOW · MORE), slim legal bar with payment icons. */

const help = [
  { label: "Order Tracking", slug: "shipping" },
  { label: "Returns & Exchanges", slug: "returns" },
  { label: "Size Guide", slug: "size-guide" },
  { label: "Shipping", slug: "shipping" },
  { label: "FAQs", slug: "contact" },
  { label: "Contact Us", slug: "contact" },
];

const more: { label: string; slug?: string; href?: string }[] = [
  { label: "About Us", slug: "about" },
  { label: "Size Guide", slug: "size-guide" },
];

/* Social row — icons only, centred beneath the newsletter, the way SKIMS does
   it. Dead until real account URLs are supplied. */
const socials = ["Instagram", "Facebook", "YouTube", "X", "TikTok"] as const;

/* Back-to-top — appears once the page has scrolled, bottom right, SKIMS-style. */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-5 right-5 z-40 grid h-11 w-11 place-items-center bg-[#0a0a0a] text-white transition-opacity duration-300 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <ChevronUp className="h-4 w-4" strokeWidth={1.6} />
    </button>
  );
}

const socialPath: Record<(typeof socials)[number], React.ReactNode> = {
  Instagram: (
    <>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </>
  ),
  Facebook: (
    <path fill="currentColor" d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.2c0-.84.23-1.41 1.44-1.41h1.54V5.19c-.27-.04-1.18-.12-2.25-.12-2.22 0-3.74 1.36-3.74 3.85v2.19H8v2.9h2.47V21h3.03z" />
  ),
  YouTube: (
    <path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z" />
  ),
  X: (
    <path fill="currentColor" d="M17.2 3h3.06l-6.68 7.64L21.44 21h-6.15l-4.82-6.3L4.96 21H1.9l7.15-8.17L1.56 3h6.31l4.35 5.75L17.2 3zm-1.07 16.2h1.7L6.95 4.73H5.13L16.13 19.2z" />
  ),
  TikTok: (
    <path fill="currentColor" d="M16.6 3c.3 1.62 1.36 2.98 2.83 3.66.63.3 1.32.47 2.07.49v3.02a7.4 7.4 0 0 1-3.9-1.2v5.55A5.98 5.98 0 0 1 11.62 20 5.98 5.98 0 0 1 5.5 14.02c0-3.3 2.68-5.98 5.98-5.98.28 0 .56.02.83.06v3.1a2.9 2.9 0 0 0-.83-.12 2.94 2.94 0 1 0 2.94 2.94V3h2.18z" />
  ),
};

const shopLinks = [
  { label: "Shapewear", handle: "shapewear" },
  { label: "Bras", handle: "bras" },
  { label: "Lounge & Sleep", handle: "loungewear-sleepwear" },
  { label: "Dresses", handle: "dresses" },
  { label: "Swim", handle: "swim" },
  { label: "New In", handle: "new-in" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <footer className="border-t border-[#EBEBEB] bg-white">
      <div className="container-px grid gap-14 py-16 text-center md:grid-cols-3 md:gap-8 md:py-20">
        {/* HELP */}
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#0a0a0a]">Help</p>
          <ul className="mt-5 space-y-3">
            {help.map((l) => (
              <li key={l.label}>
                <Link
                  to="/pages/$slug"
                  params={{ slug: l.slug }}
                  className="text-[13px] text-[#555555] transition-colors hover:text-[#0a0a0a]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* STAY IN THE KNOW */}
        <div id="newsletter" className="scroll-mt-24">
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#0a0a0a]">
            Stay In The Know
          </p>
          <p className="mx-auto mt-4 max-w-xs text-[13px] leading-relaxed text-[#555555]">
            Be the first to discover new drops, private offers, and all things Auvella.
          </p>
          {done ? (
            <p className="mt-6 text-[13px] text-[#0a0a0a]">Thank you — you're on the list.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (email.trim()) setDone(true);
              }}
              className="mx-auto mt-6 flex max-w-xs border border-[#0a0a0a]"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-[16px] md:text-[13px] text-[#0a0a0a] placeholder:text-[#888888] focus:outline-none"
              />
              <button
                aria-label="Subscribe"
                className="flex items-center justify-center border-l border-[#0a0a0a] px-4 text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
              >
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </form>
          )}
          <p className="mx-auto mt-4 max-w-xs text-[11px] leading-relaxed text-[#888888]">
            By subscribing you agree to receive recurring marketing emails from Auvella. View{" "}
            <Link to="/pages/$slug" params={{ slug: "terms" }} className="underline underline-offset-2">Terms</Link> &{" "}
            <Link to="/pages/$slug" params={{ slug: "privacy" }} className="underline underline-offset-2">Privacy</Link>.
          </p>

          <div className="mt-9 flex items-center justify-center gap-7">
            {socials.map((name) => (
              <a
                key={name}
                href="#"
                aria-label={name}
                onClick={(e) => e.preventDefault()}
                className="text-[#0a0a0a] transition-opacity hover:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" xmlns="http://www.w3.org/2000/svg">
                  {socialPath[name]}
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* MORE */}
        <div>
          <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#0a0a0a]">More</p>
          <ul className="mt-5 space-y-3">
            {shopLinks.map((l) => (
              <li key={l.label}>
                <Link
                  to="/collections/$handle"
                  params={{ handle: l.handle }}
                  className="text-[13px] text-[#555555] transition-colors hover:text-[#0a0a0a]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            {more.map((l) => (
              <li key={l.label}>
                {l.slug ? (
                  <Link
                    to="/pages/$slug"
                    params={{ slug: l.slug }}
                    className="text-[13px] text-[#555555] transition-colors hover:text-[#0a0a0a]"
                  >
                    {l.label}
                  </Link>
                ) : (
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] text-[#555555] transition-colors hover:text-[#0a0a0a]"
                  >
                    {l.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-[#EBEBEB]">
        <div className="container-px flex flex-col items-center justify-between gap-5 py-6 text-[11px] uppercase tracking-[0.16em] text-[#888888] md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-start">
            <p>© {new Date().getFullYear()} AUVELLA</p>
            <span className="text-[#DDDDDD]">|</span>
            <Link to="/pages/$slug" params={{ slug: "privacy" }} className="transition-colors hover:text-[#0a0a0a]">Privacy</Link>
            <span className="text-[#DDDDDD]">|</span>
            <Link to="/pages/$slug" params={{ slug: "terms" }} className="transition-colors hover:text-[#0a0a0a]">Terms</Link>
            <span className="text-[#DDDDDD]">|</span>
            <Link to="/pages/$slug" params={{ slug: "returns" }} className="transition-colors hover:text-[#0a0a0a]">Returns</Link>
            <span className="text-[#DDDDDD]">|</span>
            <Link to="/pages/$slug" params={{ slug: "shipping" }} className="transition-colors hover:text-[#0a0a0a]">Shipping</Link>
          </div>
          <img
            src={paymentMethodsAsset.url}
            alt="Accepted payment methods"
            loading="lazy"
            className="h-6 w-auto"
          />
        </div>
      </div>
      <BackToTop />
    </footer>
  );
}
