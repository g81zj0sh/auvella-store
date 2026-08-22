import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import paymentMethodsAssetImg from "@/assets/payment-methods.png";
const paymentMethodsAsset = { url: paymentMethodsAssetImg };

/* Footer — SKIMS layout: white, three centred columns
   (HELP · STAY IN THE KNOW · MORE), slim legal bar with payment icons. */

const help = [
  { label: "Order Tracking", slug: "shipping" },
  { label: "Returns & Exchanges", slug: "returns" },
  { label: "Shipping", slug: "shipping" },
  { label: "FAQs", slug: "contact" },
  { label: "Contact Us", slug: "contact" },
];

const more: { label: string; slug?: string; href?: string }[] = [
  { label: "About Us", slug: "about" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "TikTok", href: "https://tiktok.com" },
  { label: "Pinterest", href: "https://pinterest.com" },
];

const shopLinks = [
  { label: "Bodysuits", handle: "shapewear" },
  { label: "Shapewear", handle: "shapewear-1" },
  { label: "Loungewear", handle: "loungewear-sleepwear" },
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
    </footer>
  );
}
