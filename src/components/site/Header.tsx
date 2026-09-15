import { Link } from "@tanstack/react-router";
import { User, Menu, X, Globe, Check, ChevronDown, Heart } from "lucide-react";
import { useState, useEffect } from "react";

import { CartDrawer } from "@/components/site/CartDrawer";
import { isLoggedIn } from "@/lib/customerAuth";
import { FavouritesButton } from "@/components/site/FavouritesButton";
import { freeShippingThresholdFmt, useShippingCountry } from "@/lib/shipping";
import { SearchDrawer } from "@/components/site/SearchDrawer";
import auvellaWordmarkImg from "@/assets/auvella-wordmark.png";
const auvellaWordmark = { url: auvellaWordmarkImg };
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  LANGUAGES,
  CURRENCIES,
  usePreferences,
  type LanguageCode,
} from "@/lib/preferences";

/* ------------------------------------------------------------------ */
/* Nav model — handles match the Shopify collections after the Sept 2026 */
/* rename (bodysuits, shapewear, bras, swim, mini-dresses, ...). Legacy  */
/* handles 301 via src/lib/collectionHandles.ts.                         */
/* ------------------------------------------------------------------ */

type MegaLink = { label: string; handle: string };
type MegaColumn = { title: string; links: MegaLink[] };
type MegaImage = { src: string; label: string; desc: string; handle: string };

type NavItem = {
  label: string;
  handle: string; // where the top-level item itself links
  links?: MegaLink[]; // simple anchored dropdown (New In, Sets)
  primary?: MegaLink[]; // bold left rail in the mega panel
  columns?: MegaColumn[]; // labelled sub-columns
  images?: MegaImage[]; // captioned editorial tiles
};

// Campaign imagery (Higgsfield editorial set — migrate to Shopify CDN before launch)
const IMG = {
  bodysuits: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012320_e7dab76a-eaa0-438e-b764-1fbb07097dec.png",
  newArrivals: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_015341_8a13aeec-7d58-42a9-9d96-ff9803b8d85b.png",
  lounge: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012342_32782653-7841-41de-b44f-631c287717c6.png",
  pyjamas: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012828_d1cd52c3-f6dd-4d96-a269-28600a7f8b8c.png",
  bras: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012334_ccd0b28e-a5d8-4d56-8b2d-b2811c93455b.png",
  braSet: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_015323_7426e476-b793-4f04-b6b1-e7f4787b6f61.png",
  shorts: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012327_9f7ade51-18e3-42c3-a333-a171ebff66f4.png",
  activewear: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012834_6c3f6143-0be7-40b7-8dd8-587b1a5c5845.png",
  sculpt: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_015314_d1d265c5-5ef9-47f1-898d-3f92b2facce2.png",
  swimOnePiece: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260705_003232_97564614-1ab8-457c-9100-e556851449f4.png",
  swimBikini: "https://cdn.shopify.com/s/files/1/0988/0738/2311/collections/hf_20260705_003242_2023938c-1211-4052-aa92-b7febbde4279.png?v=1783297139",
  robe: "https://cdn.shopify.com/s/files/1/0988/0738/2311/collections/hf_20260705_233801_c1d750cb-1ce8-4b98-bfa1-6c1a82e7d58e.png?v=1783295099",
};

/*
 * Navigation — seven items, plain shopper nouns, ordered by what the brand
 * leads with. Every sub-link lands on a genuinely different set of products;
 * a sub-link that would show the same page as its sibling is not a sub-link.
 * Collections that don't exist yet (Nursing & Maternity, Warm Layers, Cool
 * Shapewear) are deliberately absent until they have stock — an empty page
 * reads worse than a shorter menu.
 */
const NAV_ALL: NavItem[] = [
  {
    label: "Shapewear",
    handle: "shapewear",
    primary: [
      { label: "All Shapewear", handle: "shapewear" },
      { label: "Bodysuits", handle: "bodysuits" },
      { label: "Shorts & Waist", handle: "shorts-and-waist" },
      { label: "The Everyday Support Edit", handle: "everyday-support-edit" },
    ],
    images: [
      {
        src: IMG.sculpt,
        label: "The Everyday Support Edit",
        desc: "Held where it helps, free where it doesn't. The pieces we'd put in your bag first.",
        handle: "everyday-support-edit",
      },
      {
        src: IMG.bodysuits,
        label: "Bodysuits",
        desc: "One continuous knit, no waistband to dig in — and an open gusset on the one-piece.",
        handle: "bodysuits",
      },
    ],
  },
  {
    label: "Bras",
    handle: "bras",
    images: [
      {
        src: IMG.bras,
        label: "Bras",
        desc: "Wide straps, wide bands, nothing that digs. Strapless that stays where you put it.",
        handle: "bras",
      },
    ],
  },
  {
    label: "Underwear",
    handle: "underwear",
  },
  {
    label: "Lounge & Sleep",
    handle: "loungewear-sleepwear",
    primary: [
      { label: "All Lounge & Sleep", handle: "loungewear-sleepwear" },
      { label: "Sets", handle: "sets" },
      { label: "Robes & Sleep", handle: "robes-and-sleep" },
    ],
    images: [
      {
        src: IMG.lounge,
        label: "Sets",
        desc: "One thing to put on, nothing underneath it. The set with the bra built in.",
        handle: "sets",
      },
      {
        src: IMG.robe,
        label: "Robes & Sleep",
        desc: "For the part of the day after the bra comes off.",
        handle: "robes-and-sleep",
      },
    ],
  },
  {
    label: "Dresses",
    handle: "dresses",
    primary: [
      { label: "All Dresses", handle: "dresses" },
      { label: "Maxi", handle: "maxi-dresses" },
      { label: "Midi", handle: "midi-dresses" },
      { label: "Mini", handle: "mini-dresses" },
    ],
  },
  {
    label: "Swim",
    handle: "swim",
    primary: [
      { label: "All Swim", handle: "swim" },
      { label: "One-Piece", handle: "one-piece" },
      { label: "Bikinis & Bottoms", handle: "bikinis" },
    ],
    images: [
      { src: IMG.swimOnePiece, label: "One-Piece", desc: "Cut to hold its line in and out of the water.", handle: "one-piece" },
      { src: IMG.swimBikini, label: "Bikinis & Bottoms", desc: "Sets and separates.", handle: "bikinis" },
    ],
  },
  {
    label: "New In",
    handle: "new-in",
  },
];

/*
 * Swim is a summer category in the UK. From 1 November to the end of February
 * it drops out of the menu (still reachable by URL, search and footer). The
 * check uses the UTC month on both server and client so SSR and hydration
 * agree; month granularity means the 1s of clock skew across the boundary
 * can't produce a mismatch in practice.
 */
function swimInSeason(now: Date = new Date()): boolean {
  const m = now.getUTCMonth(); // 0 = Jan … 11 = Dec
  return !(m === 10 || m === 11 || m === 0 || m === 1);
}

function currentNav(): NavItem[] {
  return swimInSeason() ? NAV_ALL : NAV_ALL.filter((item) => item.handle !== "swim");
}

/* Shop by Colour palette — main catalogue colours plus primaries.
   Links pre-filter the collection the shopper is already browsing; the
   fuzzy colour filter handles naming drift, and unstocked colours render
   a clean empty state. */
const NAV_PALETTE: { name: string; hex: string; border?: boolean }[] = [
  { name: "Black", hex: "#0d0d0d" },
  { name: "White", hex: "#f5f3ee", border: true },
  { name: "Nude", hex: "#e2c2a4" },
  { name: "Beige", hex: "#e6d6b8" },
  { name: "Brown", hex: "#6b3a2a" },
  { name: "Grey", hex: "#8a8a8a" },
  { name: "Red", hex: "#a8312b" },
  { name: "Blue", hex: "#274b73" },
  { name: "Yellow", hex: "#d9b13b" },
  { name: "Green", hex: "#3f5a3a" },
  { name: "Pink", hex: "#e3a5b1" },
  { name: "Purple", hex: "#5d3a6e" },
];

function ColourColumn({ handle }: { handle: string }) {
  return (
    <div>
      <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-[#888888]">
        Shop by Colour
      </p>
      <div className="grid grid-cols-4 gap-x-3 gap-y-3">
        {NAV_PALETTE.map((c) => (
          <Link
            key={c.name}
            to="/collections/$handle"
            params={{ handle }}
            search={{ colour: c.name }}
            aria-label={c.name}
            title={c.name}
            className={`h-6 w-6 rounded-full transition-transform duration-200 hover:scale-110 ${
              c.border ? "border border-[#0a0a0a]/15" : ""
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown panels                                                     */
/* ------------------------------------------------------------------ */

const panelTransition =
  "invisible opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:visible group-hover:opacity-100 group-hover:translate-y-0";

/** Full-width SKIMS-density panel: bold rail + Shop by Colour left,
    labelled sub-columns centre, large captioned editorial tiles right. */
function MegaPanel({ item }: { item: NavItem }) {
  return (
    <div className={`fixed left-0 right-0 top-[var(--header-h,56px)] z-50 ${panelTransition}`}>
      <div className="border-b border-[#EBEBEB]/70 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur-xl shadow-[0_24px_48px_-32px_rgba(0,0,0,0.15)]">
        <div className="flex items-start gap-12 px-10 py-11 xl:gap-16">
          {/* Bold primary rail + colour palette (left side) */}
          <div className="w-[200px] shrink-0">
            <ul className="space-y-4">
              {item.primary?.map((l) => (
                <li key={l.label}>
                  <Link
                    to="/collections/$handle"
                    params={{ handle: l.handle }}
                    className="text-[14px] font-medium text-[#0a0a0a] transition-opacity hover:opacity-60"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-9">
              <ColourColumn handle={item.handle} />
            </div>
          </div>

          {/* Labelled sub-columns */}
          {item.columns?.map((col) => (
            <div key={col.title} className="w-[168px] shrink-0">
              <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-[#888888]">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((l) => (
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
              </ul>
            </div>
          ))}

          {/* Captioned editorial tiles */}
          {item.images && (
            <div className="ml-auto flex shrink-0 gap-4">
              {item.images.map((img) => (
                <Link
                  key={img.label}
                  to="/collections/$handle"
                  params={{ handle: img.handle }}
                  className="group/tile block w-48 xl:w-56"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-[#f5f5f5]">
                    <img
                      src={img.src}
                      alt={img.label}
                      loading="lazy"
                      className="block h-full w-full scale-[1.12] object-cover object-[center_top] transition-transform duration-[400ms] ease-out group-hover/tile:scale-[1.16]"
                    />
                  </div>
                  <p className="mt-2.5 text-[12px] font-medium text-[#0a0a0a]">{img.label}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-[#888888]">{img.desc}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small anchored dropdown for link-only items (New In, Sets). */
function SimplePanel({ item }: { item: NavItem }) {
  return (
    <div className={`absolute left-0 top-full z-50 ${panelTransition}`}>
      <div className="min-w-[220px] border border-[#EBEBEB]/70 bg-white supports-[backdrop-filter]:bg-white/80 backdrop-blur-xl p-5 shadow-[0_24px_48px_-32px_rgba(0,0,0,0.15)]">
        <ul className="space-y-3">
          {item.links?.map((l, i) => (
            <li key={l.label}>
              <Link
                to="/collections/$handle"
                params={{ handle: l.handle }}
                className={`whitespace-nowrap text-[13px] transition-colors ${
                  i === 0
                    ? "text-[#0a0a0a] underline underline-offset-4"
                    : "text-[#555555] hover:text-[#0a0a0a]"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Globe — currency + language behind one icon                         */
/* ------------------------------------------------------------------ */

function GlobePicker({ light }: { light: boolean }) {
  const currency = usePreferences((s) => s.currency);
  const setCurrency = usePreferences((s) => s.setCurrency);
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Region and language"
          className={`transition-opacity hover:opacity-60 ${light ? "text-white" : "text-[#0a0a0a]"}`}
        >
          <Globe className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={14}
        className="w-72 rounded-none border-[#EBEBEB] bg-white p-0 shadow-lg"
      >
        <div className="max-h-[70vh] overflow-y-auto p-4" data-no-translate>
          <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[#888888]">Currency</p>
          <div className="grid grid-cols-3 gap-1">
            {CURRENCIES.map((c) => {
              const active = c.code === currency;
              return (
                <button
                  key={c.code}
                  onClick={() => setCurrency(c.code)}
                  className={`flex h-9 items-center justify-center gap-1 border text-[11px] tracking-[0.08em] transition ${
                    active
                      ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                      : "border-[#EBEBEB] text-[#0a0a0a] hover:border-[#0a0a0a]"
                  }`}
                >
                  {c.code}
                </button>
              );
            })}
          </div>
          <p className="mb-2 mt-5 text-[10px] uppercase tracking-[0.18em] text-[#888888]">Language</p>
          <div className="grid grid-cols-2 gap-1">
            {LANGUAGES.map((l) => {
              const active = l.code === language;
              return (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code as LanguageCode)}
                  className={`flex h-9 items-center justify-between border px-3 text-[11px] tracking-[0.06em] transition ${
                    active
                      ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                      : "border-[#EBEBEB] text-[#0a0a0a] hover:border-[#0a0a0a]"
                  }`}
                >
                  {l.label}
                  {active && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */


/* Rotating announcement bar — SKIMS-style: one message at a time,
   fading out/in on a 5-second cycle, country-aware. */
function AnnouncementBar() {
  const { country } = useShippingCountry();
  const displayCurrency = usePreferences((s) => s.currency);
  const messages = [
    "Duties And Taxes Are Included",
    `Receive Your Order In ${country.days} Business Days`,
    `Free Shipping On Orders Over ${freeShippingThresholdFmt(displayCurrency)}`,
  ];
  const [idx, setIdx] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const cycle = setInterval(() => {
      setShown(false); // fade out…
      setTimeout(() => {
        setIdx((i) => (i + 1) % messages.length);
        setShown(true); // …fade the next one in
      }, 500);
    }, 5000);
    return () => clearInterval(cycle);
  }, [messages.length]);

  return (
    <div className="flex h-8 items-center justify-center border-b border-[#EBEBEB] bg-white px-4">
      <p
        className={`text-center text-[10px] uppercase tracking-[0.16em] text-[#0a0a0a] transition-opacity duration-500 ease-out ${
          shown ? "opacity-100" : "opacity-0"
        }`}
      >
        {messages[idx]}
      </p>
    </div>
  );
}

export function Header({ transparent = false }: { transparent?: boolean }) {
  const [open, setOpen] = useState(false); // drawer mounted
  const [menuVisible, setMenuVisible] = useState(false); // drives the slide
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setMenuVisible(true));
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = "";
    };
  }, [open]);

  const closeMenu = () => {
    setMenuVisible(false); // slide out…
    window.setTimeout(() => {
      setOpen(false);
      setExpanded(null);
    }, 300);
  };

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const overlay = transparent && !scrolled;
  const light = overlay;

  return (
    <>
      <header
        className={
          transparent
            ? `fixed left-0 right-0 top-0 z-40 transition-colors duration-300 ${
                overlay ? "bg-transparent" : "bg-white shadow-[0_1px_0_#EBEBEB]"
              }`
            : "sticky top-0 z-40 bg-white shadow-[0_1px_0_#EBEBEB] transition-colors duration-300"
        }
        style={{ ["--header-h" as string]: "88px" }}
      >
        <AnnouncementBar />
        <div className="relative flex h-14 items-center px-5 md:px-10">
          {/* Mobile: hamburger left */}
          <button
            className={`lg:hidden -ml-1 p-1.5 ${light ? "text-white" : "text-[#0a0a0a]"}`}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>

          {/* Desktop: left nav */}
          <nav className="hidden lg:block">
            <ul
              className={`flex items-center gap-6 xl:gap-7 text-[11px] uppercase tracking-[0.14em] ${
                light ? "text-white" : "text-[#0a0a0a]"
              }`}
            >
              {currentNav().map((item) => (
                <li key={item.label} className="group relative">
                  <Link
                    to="/collections/$handle"
                    params={{ handle: item.handle }}
                    className="inline-block py-4 transition-opacity hover:opacity-60"
                  >
                    {item.label}
                  </Link>
                  {item.columns || item.primary || item.images ? (
                    <MegaPanel item={item} />
                  ) : item.links ? (
                    <SimplePanel item={item} />
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>

          {/* Logo — always centred */}
          <Link
            to="/"
            onClick={(e) => {
              if (window.scrollY > 0 && window.location.pathname === "/") {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            className={`absolute left-1/2 -translate-x-1/2 flex items-center ${
              light ? "text-white" : "text-[#0a0a0a]"
            }`}
            aria-label="Auvella"
          >
            <img
              src={auvellaWordmark.url}
              alt="Auvella"
              className={`h-[34px] w-auto ${light ? "" : "invert"}`}
            />
          </Link>


          {/* Right cluster */}
          <div
            className={`ml-auto flex items-center gap-4 md:gap-5 ${
              light ? "text-white" : "text-[#0a0a0a]"
            }`}
          >
            <div className="hidden lg:block">
              <GlobePicker light={light} />
            </div>
            <SearchDrawer light={light} />
            <FavouritesButton />
            <Link to="/account" aria-label="Account" className="hidden sm:block transition-opacity hover:opacity-60">
              <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </Link>
            <CartDrawer />
          </div>
        </div>
      </header>

      {/* Mobile menu — slides in from the left over a dimmed backdrop */}
      {open && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            onClick={closeMenu}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-out ${
              menuVisible ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Drawer */}
          <div
            className={`absolute inset-y-0 left-0 flex w-[86%] max-w-[400px] flex-col bg-white text-[#0a0a0a] shadow-[24px_0_48px_-32px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out ${
              menuVisible ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[#EBEBEB] px-5">
              <span className="font-serif text-[17px] font-semibold uppercase tracking-[0.3em]">
                Auvella
              </span>
              <button onClick={closeMenu} aria-label="Close menu" className="-mr-2 p-2">
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-5 pb-12">
              <ul>
                {currentNav().map((item, i) => {
                  const hasSub = !!(item.links || item.columns || item.primary);
                  const isOpen = expanded === item.label;
                  return (
                    <li
                      key={item.label}
                      style={{ transitionDelay: menuVisible ? `${80 + i * 40}ms` : "0ms" }}
                      className={`border-b border-[#EBEBEB] transition-all duration-300 ease-out ${
                        menuVisible ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="w-8 shrink-0 text-[10px] tabular-nums tracking-[0.14em] text-[#B5B5B5]">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <Link
                          to="/collections/$handle"
                          params={{ handle: item.handle }}
                          onClick={closeMenu}
                          className="flex-1 py-[17px] font-serif text-[21px] font-semibold uppercase tracking-[0.08em]"
                        >
                          {item.label}
                        </Link>
                        {hasSub && (
                          <button
                            aria-label={isOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                            aria-expanded={isOpen}
                            onClick={() => setExpanded(isOpen ? null : item.label)}
                            className="-mr-3 p-3"
                          >
                            <ChevronDown
                              className={`h-4 w-4 text-[#555555] transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                              strokeWidth={1.5}
                            />
                          </button>
                        )}
                      </div>

                      {isOpen && (
                        <div className="pb-5 pl-8">
                          {(item.primary ?? item.links ?? []).map((l) => (
                            <Link
                              key={l.label}
                              to="/collections/$handle"
                              params={{ handle: l.handle }}
                              onClick={closeMenu}
                              className="block py-2 text-[13px] font-semibold text-[#0a0a0a]"
                            >
                              {l.label}
                            </Link>
                          ))}
                          {item.columns?.map((col) => (
                            <div key={col.title} className="mt-3">
                              <p className="mb-1.5 text-[10px] uppercase tracking-[0.18em] text-[#888888]">
                                {col.title}
                              </p>
                              {col.links.map((l) => (
                                <Link
                                  key={l.label}
                                  to="/collections/$handle"
                                  params={{ handle: l.handle }}
                                  onClick={closeMenu}
                                  className="block py-1.5 text-[13px] font-medium text-[#555555]"
                                >
                                  {l.label}
                                </Link>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <MobileRegionRows />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

function MobileRegionRows() {
  const currency = usePreferences((s) => s.currency);
  const setCurrency = usePreferences((s) => s.setCurrency);
  const language = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const active = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];

  // Client-only login check to avoid hydration mismatch.
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  return (
    <div className="mt-8 border-t border-[#EBEBEB] pt-6" data-no-translate>
      {/* Currency — SKIMS-style single row, native picker underneath */}
      <label className="relative flex h-10 w-fit cursor-pointer items-center gap-2 text-[13px] text-[#0a0a0a]">
        <span className="text-[#888888]">Currency:</span>
        <span aria-hidden="true">{active.flag}</span>
        <span className="tracking-[0.04em]">{active.code}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#0a0a0a]" strokeWidth={1.5} />
        <select
          aria-label="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} — {c.country}
            </option>
          ))}
        </select>
      </label>

      {/* Login / My Account */}
      <Link
        to="/account"
        className="mt-2 flex h-10 w-fit items-center text-[13px] tracking-[0.04em] text-[#0a0a0a] transition-opacity hover:opacity-60"
      >
        {loggedIn ? "My Account" : "Login"}
      </Link>

      <p className="mt-5 text-[10px] uppercase tracking-[0.18em] text-[#888888]">Language</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {LANGUAGES.slice(0, 6).map((l) => (
          <button
            key={l.code}
            onClick={() => setLanguage(l.code as LanguageCode)}
            className={`h-8 border px-2.5 text-[11px] tracking-[0.06em] ${
              l.code === language
                ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                : "border-[#EBEBEB] text-[#0a0a0a]"
            }`}
          >
            {l.short}
          </button>
        ))}
      </div>

      {/* Socials — placeholders, URLs to be wired later */}
      <div className="mt-8 flex items-center justify-center gap-8 border-t border-[#EBEBEB] pt-6 pb-2">
        <SocialIcon label="Instagram">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
        </SocialIcon>
        <SocialIcon label="Facebook">
          <path
            fill="currentColor"
            d="M13.5 21v-7h2.4l.4-2.9h-2.8V9.2c0-.84.23-1.41 1.44-1.41h1.54V5.19c-.27-.04-1.18-.12-2.25-.12-2.22 0-3.74 1.36-3.74 3.85v2.19H8v2.9h2.47V21h3.03z"
          />
        </SocialIcon>
        <SocialIcon label="YouTube">
          <path
            fill="currentColor"
            d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.28 5 12 5 12 5s-6.28 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.72 19 12 19 12 19s6.28 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15.2V8.8L15.5 12 10 15.2z"
          />
        </SocialIcon>
        <SocialIcon label="X">
          <path
            fill="currentColor"
            d="M17.2 3h3.06l-6.68 7.64L21.44 21h-6.15l-4.82-6.3L4.96 21H1.9l7.15-8.17L1.56 3h6.31l4.35 5.75L17.2 3zm-1.07 16.2h1.7L6.95 4.73H5.13L16.13 19.2z"
          />
        </SocialIcon>
        <SocialIcon label="TikTok">
          <path
            fill="currentColor"
            d="M16.6 3c.3 1.62 1.36 2.98 2.83 3.66.63.3 1.32.47 2.07.49v3.02a7.4 7.4 0 0 1-3.9-1.2v5.55A5.98 5.98 0 0 1 11.62 20 5.98 5.98 0 0 1 5.5 14.02c0-3.3 2.68-5.98 5.98-5.98.28 0 .56.02.83.06v3.1a2.9 2.9 0 0 0-.83-.12 2.94 2.94 0 1 0 2.94 2.94V3h2.18z"
          />
        </SocialIcon>
      </div>
    </div>
  );
}

/* Dead-link social icon — no navigation until real URLs are provided. */
function SocialIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <a
      href="#"
      aria-label={label}
      onClick={(e) => e.preventDefault()}
      className="text-[#0a0a0a] transition-opacity hover:opacity-60"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
        {children}
      </svg>
    </a>
  );
}
