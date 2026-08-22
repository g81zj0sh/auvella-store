import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShippingPopup } from "@/components/site/ShippingPopup";
import { freeShippingThresholdFmt, useShippingCountry } from "@/lib/shipping";
import { usePreferences } from "@/lib/preferences";
import { EditorialImage } from "@/components/site/EditorialImage";

import heroVideoAssetImg from "@/assets/media/hero.mp4";
const heroVideoAsset = { url: heroVideoAssetImg };
import heroPosterAssetImg from "@/assets/media/hero-poster.jpg";
const heroPosterAsset = { url: heroPosterAssetImg };
import madeForBodyVideoImg from "@/assets/media/made-for-your-body.mp4";
const madeForBodyVideo = { url: madeForBodyVideoImg };
import ugc1Img from "@/assets/ugc/ugc-1.png";
const ugc1 = { url: ugc1Img };
import ugc2Img from "@/assets/ugc/ugc-2.png";
const ugc2 = { url: ugc2Img };
import ugc3Black from "@/assets/ugc/ugc-3-black.jpg";
import ugc4Img from "@/assets/ugc/ugc-4.png";
const ugc4 = { url: ugc4Img };
import ugc5Img from "@/assets/ugc/ugc-5.png";
const ugc5 = { url: ugc5Img };
import ugc6Img from "@/assets/ugc/ugc-6.png";
const ugc6 = { url: ugc6Img };
import ugc7Img from "@/assets/ugc/ugc-7.png";
const ugc7 = { url: ugc7Img };
import ugc8Img from "@/assets/ugc/ugc-8.png";
const ugc8 = { url: ugc8Img };
import ugc9Img from "@/assets/ugc/ugc-9.png";
const ugc9 = { url: ugc9Img };
import homeShapewearV7Img from "@/assets/home/shapewear-v7.png";
const homeShapewearV7 = { url: homeShapewearV7Img };
import homeBestsellersV1Img from "@/assets/home/bestsellers-v1.png";
const homeBestsellersV1 = { url: homeBestsellersV1Img };

/* Campaign imagery — Higgsfield editorial set (hotlinked; migrate to Shopify CDN before launch) */
const PANEL_IMG = {
  bestsellers: homeBestsellersV1.url,
  shapewear: homeShapewearV7.url,
  bodysuits: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012320_e7dab76a-eaa0-438e-b764-1fbb07097dec.png",
  loungewear: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012342_32782653-7841-41de-b44f-631c287717c6.png",
  bras: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012334_ccd0b28e-a5d8-4d56-8b2d-b2811c93455b.png",
  activewear: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012834_6c3f6143-0be7-40b7-8dd8-587b1a5c5845.png",
  banner: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012841_d9e4e8cc-9579-40e2-9d11-f97a5a5596ba.png",
  sets: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_015333_ecdc5dfe-2246-4570-8b3f-4be0d5336583.png",
  shorts: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012327_9f7ade51-18e3-42c3-a333-a171ebff66f4.png",
  pyjamas: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012828_d1cd52c3-f6dd-4d96-a269-28600a7f8b8c.png",
  newArrivals: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_015341_8a13aeec-7d58-42a9-9d96-ff9803b8d85b.png",
};

const heroVideo = heroVideoAsset.url;
const heroPoster = heroPosterAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Auvella — Sculpted Comfort. Effortless Confidence." },
      {
        name: "description",
        content:
          "Premium shapewear, satin sleepwear and lounge essentials designed to flatter, smooth and move with you.",
      },
      { property: "og:title", content: "Auvella — Sculpted Comfort. Effortless Confidence." },
      {
        property: "og:description",
        content: "Premium shapewear, satin sleepwear and lounge essentials.",
      },
    ],
  }),
  component: Index,
});

/* ------------------------------------------------------------------ */
/* Panel text treatments                                               */
/*  - Large editorial tiles: SKIMS-style, refined, premium             */
/*  - Small 4-up category cards: original compact styling              */
/* ------------------------------------------------------------------ */

function PanelCaption({ name, sub, cta = "Shop Now" }: { name: string; sub?: string; cta?: string }) {
  return (
    <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 z-10">
      <h3 className="font-sans uppercase text-white text-[16px] md:text-[22px] font-semibold tracking-[0.14em] leading-tight">
        {name}
      </h3>
      {sub && (
        <p className="mt-1.5 text-white/80 text-[11px] md:text-[13px] font-normal leading-[1.5] max-w-[280px]">
          {sub}
        </p>
      )}
      <span className="group/cta relative mt-2.5 inline-block uppercase text-white text-[10px] md:text-[12px] tracking-[0.22em] font-medium">
        {cta}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 -bottom-0.5 h-px w-0 bg-white transition-all duration-300 ease-out group-hover/cta:w-full"
        />
      </span>
    </div>
  );
}

function SmallPanelCaption({ name, sub, cta = "Shop Now" }: { name: string; sub?: string; cta?: string }) {
  return (
    <div className="absolute bottom-7 left-7 z-10">
      <p className="text-[11px] uppercase tracking-widest text-white">{name}</p>
      {sub && <p className="mt-1 text-[12px] text-white/85 max-w-[240px] leading-snug">{sub}</p>}
      <span className="group/cta mt-2 inline-block text-[11px] text-white relative">
        {cta}
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 -bottom-0.5 h-px w-full origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover/cta:scale-x-100"
        />
      </span>
    </div>
  );
}

function Panel({
  image,
  handle,
  name,
  sub,
  position,
  scale,
  className = "aspect-[3/4]",
  size = "large",
  cta = "Shop Now",
}: {
  image: string;
  handle: string;
  name: string;
  sub?: string;
  /** Override crop anchor ONLY if a model is being awkwardly cropped, e.g. "center 30%" */
  position?: string;
  /** Per-image art-direction zoom, e.g. 1.4 — zooms toward `position` */
  scale?: number;
  /** Container dimensions ONLY (aspect/height). The container rules; the image covers. */
  className?: string;
  /** "small" restores the original compact caption treatment used on 4-up category cards. */
  size?: "large" | "small";
  cta?: string;
}) {
  return (
    <Link
      to="/collections/$handle"
      params={{ handle }}
      className={`group relative block w-full overflow-hidden bg-[#f5f5f5] ${className}`}
    >
      <EditorialImage src={image} alt={name} position={position} scale={scale} zoom />
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
      {size === "small" ? <SmallPanelCaption name={name} sub={sub} cta={cta} /> : <PanelCaption name={name} sub={sub} cta={cta} />}
    </Link>
  );
}

/* ------------------------------------------------------------------ */



/** Runs a CSS marquee animation only while the row is on screen — giant
    continuously-animating layers are a scroll-jank tax otherwise. */
function useMarqueeInView() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    el.style.animationPlayState = "paused";
    const obs = new IntersectionObserver(
      ([entry]) => {
        el.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
      },
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/** Plays the video only while on screen — off-screen videos pause and stop
    burning decode time, which is what makes scrolling past them feel snappy. */
function useVideoInView() {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Index() {
  const [videoReady, setVideoReady] = useState(false);
  const [introGone, setIntroGone] = useState(true);
  const [minIntroDone, setMinIntroDone] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pause the hero video once it leaves the viewport — it otherwise keeps
  // decoding frames for the entire scroll.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.05 },
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = 0.2;
    let cancelled = false;

    const markReady = () => {
      if (cancelled) return;
      setVideoReady(true);
    };

    const tryPlay = () => {
      try {
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch(() => {
            // Autoplay blocked (common on mobile) — reveal the page so the user
            // can see the poster + tap-to-play overlay instead of being stuck on intro.
            markReady();
          });
        }
      } catch {
        markReady();
      }
    };

    // Only treat the hero as "ready" when it is actually rendering frames
    // (currentTime advances). This prevents the intro from fading on mobile
    // before the video has truly started playing.
    const onTimeUpdate = () => {
      if (v.currentTime > 0.05 && !v.paused) markReady();
    };
    const onPlaying = () => {
      window.setTimeout(() => {
        if (v.currentTime > 0.05 && !v.paused) markReady();
      }, 120);
    };
    const onCanPlay = () => tryPlay();

    tryPlay();
    v.addEventListener("loadeddata", onCanPlay);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("canplaythrough", onCanPlay);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("timeupdate", onTimeUpdate);

    // Retry play on the first user interaction in case autoplay was blocked
    const retryOnInteract = () => tryPlay();
    window.addEventListener("touchstart", retryOnInteract, { once: true, passive: true });
    window.addEventListener("click", retryOnInteract, { once: true });

    // Minimum brand moment so the intro never flashes by on fast devices
    const minTimer = window.setTimeout(() => setMinIntroDone(true), 2800);
    // Hard safety net — never trap the user longer than 9s even on very slow networks
    const failsafe = window.setTimeout(markReady, 9000);

    return () => {
      cancelled = true;
      v.removeEventListener("loadeddata", onCanPlay);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("canplaythrough", onCanPlay);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("timeupdate", onTimeUpdate);
      window.removeEventListener("touchstart", retryOnInteract);
      window.removeEventListener("click", retryOnInteract);
      window.clearTimeout(minTimer);
      window.clearTimeout(failsafe);
    };
  }, []);

  // Remove intro from the DOM after the fade-out finishes
  const introReadyToFade = videoReady && minIntroDone;
  useEffect(() => {
    if (!introReadyToFade) return;
    const t = window.setTimeout(() => setIntroGone(true), 1100);
    return () => window.clearTimeout(t);
  }, [introReadyToFade]);

  // Lock page scroll while the intro overlay is on screen so mobile users
  // can't scroll the store behind the splash.
  useEffect(() => {
    if (introGone) return;
    const { body, documentElement: html } = document;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevTouch = body.style.touchAction;
    body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    body.style.touchAction = "none";
    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.touchAction = prevTouch;
    };
  }, [introGone]);

  return (
    <div className="min-h-screen bg-white">
      <ShippingPopup />


      <Header transparent />


      {/* HERO */}
      <section className="relative w-full overflow-hidden">
        {/* Full-width landscape video */}
        <div className="relative w-full h-screen md:aspect-[21/9] md:h-auto lg:aspect-auto lg:h-screen">
          {/* Poster image shown until the video can play — avoids the black box on slow mobile connections */}
          <img
            src={heroPoster}
            alt=""
            aria-hidden="true"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <video
            ref={videoRef}
            src={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={heroPoster}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? "opacity-100" : "opacity-0"}`}
          />
          {/* Bottom-right gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-l from-ink/70 via-ink/30 to-transparent" />
        </div>

        {/* Bottom-right text overlay */}
        <div className="absolute bottom-0 right-0 p-6 md:p-12 lg:p-16 max-w-xl text-right">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cream/80 mb-4">The Auvella Edit</p>
          <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl text-cream leading-[1.05]">
            Sculpted Comfort.
            <br />
            <em className="not-italic font-light italic">Effortless Confidence.</em>
          </h1>
          <p className="mt-4 text-sm md:text-base text-cream/80 leading-relaxed max-w-md ml-auto">
            Premium shapewear, soft lounge essentials and satin sleepwear designed to
            flatter, smooth and move with you.
          </p>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <a href="#bestsellers" className="inline-flex items-center justify-center bg-cream text-ink px-6 py-3.5 text-[12px] uppercase tracking-[0.2em] hover:bg-white transition-colors">
              Shop Best Sellers
            </a>
            <a href="#sleep" className="inline-flex items-center justify-center bg-transparent text-cream border border-cream/40 px-6 py-3.5 text-[12px] uppercase tracking-[0.2em] hover:bg-cream/10 transition-colors">
              Explore Sleep &amp; Lounge
            </a>
          </div>
          <p className="mt-4 text-xs text-cream/60 max-w-md ml-auto leading-relaxed">
            Loved by women for everyday comfort, sculpting support and elevated softness.
          </p>
        </div>

      </section>

      {/* SECTION 2 — TWO-PANEL EDITORIAL SPLIT */}
      <section id="bestsellers" className="grid grid-cols-1 md:grid-cols-2 scroll-mt-24">
        <Panel
          image={PANEL_IMG.bestsellers}
          handle="new-in"
          name="Best Sellers"
          sub="Smooths instantly, feels like second skin -no rolling, no squeezing."
          position="55% 38%"
          scale={1.18}
          className="h-[60vh] md:h-[calc(100vh-88px)]"
        />
        <Panel
          image={PANEL_IMG.shapewear}
          handle="shapewear-1"
          name="Shapewear"
          sub="Sculpted comfort, second-skin feel."
          position="center 18%"
          scale={1.08}
          className="h-[60vh] md:h-[calc(100vh-88px)]"
        />
      </section>

      {/* SECTION 3 — FOUR-PANEL CATEGORY ROW (small cards keep original caption styling) */}
      <section id="sleep" className="mt-3 grid grid-cols-2 gap-3 px-3 md:mt-4 md:gap-4 md:px-4 lg:grid-cols-4 scroll-mt-24">
        <Panel image={PANEL_IMG.bodysuits} handle="shapewear" name="Bodysuits" position="center 15%" scale={1.18} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.loungewear} handle="loungewear-sleepwear" name="Loungewear" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.bras} handle="soft-essentials" name="Bras" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.activewear} handle="activewear" name="Activewear" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
      </section>

      {/* SECTION 4 — FULL-WIDTH EDITORIAL BANNER */}
      <section className="group relative mt-3 aspect-[16/9] w-full overflow-hidden bg-[#f5f5f5] md:mt-4 md:aspect-[21/9]">
        <BannerVideo />
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <h2 className="font-serif text-3xl font-light tracking-[0.15em] text-white md:text-[56px] md:leading-tight">
            MADE FOR YOUR BODY
          </h2>
          <p className="mt-4 text-[12px] uppercase tracking-[0.18em] text-white/80">
            Seamless. Supportive. Sculpted.
          </p>
          <Link
            to="/collections/$handle"
            params={{ handle: "shapewear-1" }}
            className="mt-7 inline-flex h-12 w-40 items-center justify-center border border-white bg-transparent text-[11px] uppercase tracking-[0.16em] text-white transition-colors duration-[250ms] hover:bg-white hover:text-[#0a0a0a]"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* SECTION 5 — FOUR-PANEL SECOND CATEGORY ROW (small cards keep original caption styling) */}
      <section className="mt-3 grid grid-cols-2 gap-3 px-3 md:mt-4 md:gap-4 md:px-4 lg:grid-cols-4">
        <Panel image={PANEL_IMG.sets} handle="sets" name="Sets" position="center 60%" scale={1.15} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.shorts} handle="shapewear-1" name="Shorts" scale={1.15} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.pyjamas} handle="loungewear-sleepwear" name="Pyjamas" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.newArrivals} handle="new-in" name="New Arrivals" scale={1.22} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
      </section>

      {/* SECTION 6 — TRUST MARQUEE STRIP */}
      <MarqueeStrip />

      {/* BRAND QUOTE — statement */}
      <BrandStatement />

      {/* SECTION 7 — THE AUVELLA EDIT (lifestyle strip)
          Honest brand-content treatment: product captions linking to
          collections. Rename to "As Worn By You" ONLY once populated with
          real customer content you have permission to use. */}
      <UgcStrip />

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section 6 — black scrolling marquee                                 */
/* ------------------------------------------------------------------ */

function MarqueeStrip() {
  const marqueeRef = useMarqueeInView();
  // Country-aware: threshold and delivery window come from the same shared
  // state as the announcement bar and shipping popup.
  const { country } = useShippingCountry();
  const displayCurrency = usePreferences((s) => s.currency);
  const text = `FREE SHIPPING ON ORDERS OVER ${freeShippingThresholdFmt(
    displayCurrency,
  )} · RECEIVE YOUR ORDER IN ${country.days.toUpperCase()} BUSINESS DAYS · 30-DAY RETURNS · NEW DROPS WEEKLY · AUVELLA · `;
  const loop = Array(4).fill(text);
  return (
    <section className="mt-3 overflow-hidden bg-[#0a0a0a] md:mt-4">
      <style>{`@keyframes auvella-marquee { from { transform: translateX(0); } to { transform: translateX(-25%); } }`}</style>
      <div className="flex h-11 items-center">
        <div
          ref={marqueeRef}
          className="flex w-max whitespace-nowrap will-change-transform"
          style={{ animation: "auvella-marquee 36s linear infinite" }}
        >
          {loop.map((t, i) => (
            <span key={i} className="text-[11px] uppercase tracking-widest text-white">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Section 7 — UGC strip (HeyShape-inspired). PLACEHOLDER content.     */
/* ------------------------------------------------------------------ */

const ugcItems = [
  /* Verified product matches — each image links to the exact piece it features */
  { image: ugc1.url, handle: "seamless-strapless-sculpting-bodysuit", label: "@maelinaaa" },
  { image: ugc2.url, handle: "long-sleeve-zip-one-piece-swimsuit", label: "@sofiarrx" },
  { image: ugc3Black, handle: "high-waist-body-shaping-shorts", label: "@ellavayne" },
  { image: ugc4.url, handle: "satin-tie-waist-robe", label: "@zara.renn" },
  { image: ugc5.url, handle: "strapless-tummy-control-body-shaper", label: "@noraluxe" },
  { image: ugc6.url, handle: "womens-tie-side-triangle-bikini-set", label: "@chloemerritt" },
  { image: ugc7.url, handle: "seamless-backless-adjustable-bodysuit", label: "@tessavibes" },
  { image: ugc8.url, handle: "auvella-long-sleeve-sculpting-bodysuit", label: "@oliviaarc" },
  { image: ugc9.url, handle: "seamless-strapless-sculpting-bodysuit", label: "@briellxo" },
];

/* UGC entries whose handle is a product (not a collection) */
const PRODUCT_UGC_HANDLES = new Set([
  "seamless-strapless-sculpting-bodysuit",
  "long-sleeve-zip-one-piece-swimsuit",
  "high-waist-body-shaping-shorts",
  "satin-tie-waist-robe",
  "strapless-tummy-control-body-shaper",
  "womens-tie-side-triangle-bikini-set",
  "seamless-backless-adjustable-bodysuit",
  "auvella-long-sleeve-sculpting-bodysuit",
]);

function UgcStrip() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
    // NOTE: do NOT capture the pointer here — capturing on pointerdown
    // redirects the eventual click to the container, so taps on the
    // product links never navigate. Capture only once a drag begins.
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragState.current;
    const el = scrollerRef.current;
    if (!s.active || !el) return;
    const dx = e.clientX - s.startX;
    if (!s.moved && Math.abs(dx) > 8) {
      s.moved = true;
      el.setPointerCapture(e.pointerId);
    }
    if (s.moved) el.scrollLeft = s.startScroll - dx;
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (el && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    dragState.current.active = false;
  };
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  return (
    <section className="bg-white">
      <div className="container-px pt-4 pb-14 md:pt-6 md:pb-20">
        <h2 className="text-center font-serif text-[28px] font-light text-[#0a0a0a]">
          The Auvella Edit
        </h2>
        <div
          ref={scrollerRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          className="mt-6 -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:px-0 md:gap-4 no-scrollbar cursor-grab active:cursor-grabbing select-none touch-pan-x"
        >
          {ugcItems.map((u, i) => (
            <Link
              key={i}
              to={PRODUCT_UGC_HANDLES.has(u.handle) ? "/product/$handle" : "/collections/$handle"}
              params={{ handle: u.handle }}
              draggable={false}
              className="group relative block w-[42vw] shrink-0 md:w-[calc((100%-1.25rem)/6)]"
            >
              <div className="relative aspect-square overflow-hidden bg-[#f5f5f5]">
                <EditorialImage src={u.image} alt={u.label} position="center" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-[250ms] group-hover:bg-black/35 group-hover:opacity-100">
                  <span className="text-[10px] uppercase tracking-widest text-white">Shop This Look</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-[#888888]">{u.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}


function BrandStatement() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
        <Reveal>
          <p className="font-serif text-[30px] font-light leading-tight text-[#0a0a0a] md:text-[44px]">
            "You were never the problem.
            <br />
            The fit was."
          </p>
        </Reveal>
        <Reveal delay={200}>
          <p className="mx-auto mt-7 max-w-xl text-[13px] leading-relaxed text-[#555555] md:text-[15px]">
            Auvella is made for the body you already have — sculpting comfort
            that moves with you, smooths where you want it, and lets you walk
            in feeling like yourself. Only surer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Scroll reveal — fades content up as it enters the viewport (once).  */
/* ------------------------------------------------------------------ */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        show ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Our Story — brand statement, revealed line by line on scroll.       */
/* ------------------------------------------------------------------ */

function OurStory() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-6 pt-24 pb-6 text-center md:pt-32 md:pb-8">
        <Reveal>
          <p className="text-[10px] uppercase tracking-[0.25em] text-[#888888]">Our Story</p>
        </Reveal>
        <Reveal delay={150}>
          <h2 className="mt-6 font-serif text-3xl font-light leading-tight text-[#0a0a0a] md:text-[44px]">
            Not just shapewear.
          </h2>
        </Reveal>
        <Reveal delay={300}>
          <p className="mt-3 font-serif text-3xl font-light leading-tight text-[#0a0a0a] md:text-[44px]">
            Auvella is confidence, comfort and calm.
          </p>
        </Reveal>
        <Reveal delay={450}>
          <p className="mx-auto mt-8 max-w-xl font-serif text-lg font-light leading-relaxed text-[#555555] md:text-2xl">
            Designed to move with you — from slow mornings to standout moments —
            so you feel powerful in every layer.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
function BannerVideo() {
  const ref = useVideoInView();
  return (
    <video
      ref={ref}
      src={madeForBodyVideo.url}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className="absolute inset-0 block h-full w-full scale-[1.12] object-cover"
    />
  );
}
