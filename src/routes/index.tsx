import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ShippingPopup } from "@/components/site/ShippingPopup";
import { freeShippingThresholdFmt, useShippingCountry } from "@/lib/shipping";
import { deliveryTimeLine, inFreeDeliveryCountry } from "@/lib/freeDelivery";
import { DUO_DEAL } from "@/lib/duoDeal";
import { usePreferences } from "@/lib/preferences";
import { EditorialImage } from "@/components/site/EditorialImage";
import { editorialSrc } from "@/lib/editorialImages";
import { smoothScrollToId } from "@/lib/smoothScroll";
import { useQuery } from "@tanstack/react-query";
import { fetchProductsByHandles, type ShopifyProduct } from "@/lib/shopify";
import { ProductCard } from "@/components/site/ProductCard";

import { mediaUrl } from "@/lib/videoRange";
/* Videos load from /media/ so they're answered in byte ranges (v198). */
import heroVideoAssetImg from "@/assets/media/hero.mp4";
const heroVideoAsset = { url: mediaUrl(heroVideoAssetImg) };
/* v228 (owner): the second hero clip, a 16:9 cut and a 4:5 phone cut. */
import heroStaircaseVideoImg from "@/assets/media/hero-staircase.mp4";
import heroStaircaseMobileVideoImg from "@/assets/media/hero-staircase-mobile.mp4";
const heroStaircaseVideo = { url: mediaUrl(heroStaircaseVideoImg), mobileUrl: mediaUrl(heroStaircaseMobileVideoImg) };
/** How long the next hero turn takes to slide in (v229, owner: a slide, not
    v228's fade). The outgoing one slides out to the left meanwhile. */
const HERO_SLIDE_MS = 900;
/* v229 (owner): a still between the two clips - the Long Sleeve worn in Black
   with the Bright Red on a hanger, for the multi-buy. A 16:9 cut and a 9:16
   phone cut, each at two widths. */
import heroStillImg from "@/assets/home/hero-rotation-desktop-1600.webp";
import heroStillLargeImg from "@/assets/home/hero-rotation-desktop-2560.webp";
import heroStillPhoneImg from "@/assets/home/hero-rotation-phone-960.webp";
import heroStillPhoneLargeImg from "@/assets/home/hero-rotation-phone-1440.webp";
/** How long the still stays up (its slide in included) before the next clip. */
const HERO_STILL_MS = 6000;
/** How far the still drifts in over its turn; none with reduced motion. */
const HERO_STILL_ZOOM = 1.06;
/** The product the still shows. */
const HERO_STILL_HANDLE = "seamless-shaping-long-sleeve-bodysuit";
/** The hero's turns: the bedroom film, the still, the staircase walk. */
type HeroTurn = 0 | 1 | 2;
/** Where a turn's layer is: showing, slid out to the left, or waiting on the right. */
type HeroSpot = "in" | "left" | "right";
/* Sliding in or out takes HERO_SLIDE_MS (set inline); going back to wait on
   the right is instant, out of sight. With reduced motion the turns just cut. */
const HERO_SPOT_CLASS: Record<HeroSpot, string> = {
  in: "translate-x-0 transition-transform motion-reduce:transition-none",
  left: "-translate-x-full transition-transform motion-reduce:transition-none",
  right: "translate-x-full transition-none",
};
import heroPosterAssetImg from "@/assets/media/hero-poster.jpg";
const heroPosterAsset = { url: heroPosterAssetImg };
import madeForBodyVideoImg from "@/assets/media/made-for-your-body.mp4";
const madeForBodyVideo = { url: mediaUrl(madeForBodyVideoImg) };
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
import homeShapewearV7Img from "@/assets/home/shapewear-v7.webp";
const homeShapewearV7 = { url: homeShapewearV7Img };
import homeBestsellersV1Img from "@/assets/home/bestsellers-v1.webp";
const homeBestsellersV1 = { url: homeBestsellersV1Img };

/* Campaign imagery — Higgsfield editorial set. v205: self-hosted WebP
   (lib/editorialImages) instead of the 4-6 MB PNGs hotlinked from CloudFront. */
const PANEL_IMG = {
  bestsellers: homeBestsellersV1.url,
  shapewear: homeShapewearV7.url,
  bodysuits: editorialSrc("bodysuits"),
  loungewear: editorialSrc("lounge"),
  bras: editorialSrc("bras"),
  /* Soul 2.0, 11 Oct 2026 — replaces the old activewear shot (crop top and
     leggings) that had been standing in on the Dresses tile. Has a thin 35mm
     film border like the rest of the set; the tile's scale crops it out. */
  dresses: editorialSrc("dresses"),
  banner: "https://d8j0ntlcm91z4.cloudfront.net/user_3Dp2fhCoTBHUndmGqb1QOGhGNcb/hf_20260703_012841_d9e4e8cc-9579-40e2-9d11-f97a5a5596ba.png",
  sets: editorialSrc("sets"),
  shorts: editorialSrc("shorts"),
  pyjamas: editorialSrc("pyjamas"),
  newArrivals: editorialSrc("new-arrivals"),
};

const heroVideo = heroVideoAsset.url;
const heroPoster = heroPosterAsset.url;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Auvella — Built for the day, not the photo." },
      {
        name: "description",
        content:
          "Shapewear, bras and lounge built to hold where it helps and stay put all day. Our shapewear runs S–4XL.",
      },
      { property: "og:title", content: "Auvella — Built for the day, not the photo." },
      {
        property: "og:description",
        content: "Shapewear, bras and lounge built to hold where it helps and stay put all day.",
      },
    ],
  }),
  // Server-rendered so the row is in the first paint and nothing below it
  // shifts - but never at the hero's expense: if Shopify fails or is slow the
  // page renders without it and the client fetches it instead.
  loader: ({ context }): Promise<ShopifyProduct[]> =>
    Promise.race([
      context.queryClient.ensureQueryData(essentialsQuery).catch(() => []),
      new Promise<ShopifyProduct[]>((resolve) => setTimeout(() => resolve([]), 2500)),
    ]),
  component: Index,
});

/* ------------------------------------------------------------------ */
/* Start with the essentials — the three launch bodysuits under the    */
/* hero (v186, owner's brief 14 Oct 2026). Labels and lines are the    */
/* owner's; each line is backed by the product's own description.      */
/* ------------------------------------------------------------------ */
const ESSENTIALS = [
  {
    handle: "one-piece-shapewear-bodysuit-with-tummy-control",
    label: "Best for everyday",
    line: "Open gusset. No waist seam. All-day hold.",
  },
  {
    handle: "seamless-shaping-long-sleeve-bodysuit",
    label: "Best for easy dressing",
    line: "Front buttons. No makeup on the collar.",
  },
  {
    handle: "seamless-sculpting-bodysuit",
    label: "Best for low-back outfits",
    line: "Low U-back. Shape without showing.",
  },
];

const essentialsQuery = {
  queryKey: ["home-essentials"],
  // fetchProductsByHandles swallows errors as []; throw instead, so a failed
  // refetch (e.g. after a Ship-to switch) keeps the cards already on screen.
  queryFn: async () => {
    const products = await fetchProductsByHandles(ESSENTIALS.map((e) => e.handle));
    if (!products.length) throw new Error("essentials unavailable");
    return products;
  },
  staleTime: 5 * 60_000,
};

function EssentialsSection() {
  // Seeded from the loader; a live query so a Ship-to switch refetches it in
  // the shopper's currency like every other price on the site (root route).
  // An empty loader result (Shopify down/slow) seeds nothing, so it retries.
  const initial = Route.useLoaderData();
  const { data = [] } = useQuery({
    ...essentialsQuery,
    initialData: initial.length ? initial : undefined,
  });
  const cards = ESSENTIALS.flatMap((e) => {
    const product = data.find((p) => p.node.handle === e.handle);
    return product ? [{ ...e, product }] : [];
  });
  if (!cards.length) return null;

  return (
    <section aria-labelledby="essentials-heading" className="bg-white">
      <div className="container-px pt-10 pb-12 md:pt-14 md:pb-16">
        <div className="text-center">
          <h2 id="essentials-heading" className="font-serif text-[28px] font-light text-[#0a0a0a]">
            Start with the essentials
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-[#555555]">
            Three ways to feel held, smooth and comfortable all day.
          </p>
        </div>
        {/* Phones: a swipe row with the next card peeking (pb-2 keeps the
            selected swatch's ring from being clipped by the scroller).
            Desktop: three columns. */}
        <ul className="no-scrollbar -mx-5 mt-7 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
          {cards.map(({ product, label, line }) => (
            <li key={product.node.id} className="w-[78%] shrink-0 snap-start md:w-auto">
              <ProductCard product={product} badge={label} note={line} />
            </li>
          ))}
        </ul>
        <div className="mt-8 text-center">
          <Link
            to="/collections/$handle"
            params={{ handle: "bodysuits" }}
            className="inline-flex items-center justify-center rounded-control border border-[#0a0a0a] px-6 py-3.5 text-[12px] uppercase tracking-[0.2em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
          >
            Shop all bodysuits
          </Link>
        </div>
      </div>
    </section>
  );
}

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
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [introGone, setIntroGone] = useState(true);
  const [minIntroDone, setMinIntroDone] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  /* v228: the second hero clip. v229: the still between the clips, whose
     turn it is, where each turn's layer is, the bars and the pause button. */
  const video2Ref = useRef<HTMLVideoElement>(null);
  const stillRef = useRef<HTMLImageElement>(null);
  const stillBoxRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const turnRef = useRef<HeroTurn>(0);
  const [turn, setTurn] = useState<HeroTurn>(0);
  const [spots, setSpots] = useState<HeroSpot[]>(["in", "right", "right"]);
  const [loadStill, setLoadStill] = useState(false);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const pauseHeroRef = useRef<(paused: boolean) => void>(() => {});
  const { country } = useShippingCountry();
  const freeFromTwo = inFreeDeliveryCountry(country.code);

  /* v228/v229 (owner): the hero takes three turns - the bedroom film, the
     Daily Rotation still, then the staircase walk - like a slideshow: the
     next turn slides in from the right over HERO_SLIDE_MS as the last one
     slides out to the left, so the loop never stops on a frame. A film's turn
     ends HERO_SLIDE_MS before its clip does (it plays out as it leaves); the
     still's lasts HERO_STILL_MS. The still and the staircase clip (phone cuts
     below 768px) only load once the first clip is playing, so they never hold
     up the opening frame; one that isn't ready in time is skipped. One bar
     per turn fills as it plays. Off screen, in a hidden tab or paused,
     nothing moves on (the hero video used to decode frames for the entire
     scroll). */
  useEffect(() => {
    const a = videoRef.current;
    const b = video2Ref.current;
    if (!a || !b) return;
    const slideS = HERO_SLIDE_MS / 1000;
    const drift = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clip = (t: HeroTurn) => (t === 0 ? a : t === 2 ? b : null);
    const stillReady = () => {
      const img = stillRef.current;
      return !!img && img.complete && img.naturalWidth > 0;
    };
    let inView = true;
    let sliding = false;
    let slideTimer: number | undefined;
    let raf = 0;
    let last = 0;
    /** How long the still has been up this turn, its slide in included. */
    let stillMs = 0;
    let stillUp = false;
    let restAsked = false;

    /* On the first clip's first timeupdate, not its "playing" event: the clip
       usually starts before this effect is listening, and the rest then only
       loaded once it had looped (v228 played it twice before the staircase). */
    const loadRest = () => {
      restAsked = true;
      setLoadStill(true);
      if (b.getAttribute("src")) return;
      b.src = window.matchMedia("(min-width: 768px)").matches ? heroStaircaseVideo.url : heroStaircaseVideo.mobileUrl;
      b.load();
    };

    const handTo = (next: HeroTurn) => {
      const from = turnRef.current;
      const out = clip(from);
      const into = clip(next);
      sliding = true;
      if (out) out.loop = false; // ends on its last frame instead of jumping back to the first
      if (into) {
        into.loop = true; // keeps going if the next turn can't happen
        into.currentTime = 0;
        if (inView && !pausedRef.current) into.play().catch(() => {});
      }
      if (next === 1) {
        stillMs = 0;
        stillUp = true;
        if (stillBoxRef.current) stillBoxRef.current.style.transform = "";
      }
      turnRef.current = next;
      setTurn(next);
      setSpots((s) => s.map((spot, i) => (i === next ? "in" : i === from ? "left" : spot)));
      slideTimer = window.setTimeout(() => {
        if (out) {
          out.pause();
          out.currentTime = 0;
        }
        if (from === 1) stillUp = false;
        // Out of sight, back round to the right for its next turn.
        setSpots((s) => s.map((spot, i) => (i === from && spot === "left" ? "right" : spot)));
        sliding = false;
      }, HERO_SLIDE_MS);
      return true;
    };
    /** After the first clip the still, else the staircase, else nothing (the
        clip loops); after the still the staircase, else the first clip. */
    const advance = () => {
      const t = turnRef.current;
      if (t === 0) {
        if (stillReady()) return handTo(1);
        if (b.readyState >= 3) return handTo(2);
        return false;
      }
      return handTo(t === 1 && b.readyState >= 3 ? 2 : 0);
    };
    const onTime = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      if (!restAsked && v === a && v.currentTime > 0) loadRest();
      if (sliding || v !== clip(turnRef.current) || !v.duration) return;
      if (v.duration - v.currentTime <= slideS) advance();
    };
    const onEnded = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      if (v !== clip(turnRef.current) || advance()) return;
      v.currentTime = 0;
      v.play().catch(() => {});
    };

    // Once a frame while running: the still's clock and drift, and the bars.
    const filled = (v: HTMLVideoElement) => (v.duration > slideS ? Math.min(1, v.currentTime / (v.duration - slideS)) : 0);
    const tick = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(now - last, 100) : 0;
      last = now;
      const t = turnRef.current;
      if (stillUp) {
        stillMs += dt;
        const box = stillBoxRef.current;
        if (box && drift) box.style.transform = `scale(${1 + (HERO_STILL_ZOOM - 1) * Math.min(1, stillMs / (HERO_STILL_MS + HERO_SLIDE_MS))})`;
      }
      if (t === 1 && !sliding && stillMs >= HERO_STILL_MS) advance();
      const fill = t === 0 ? [filled(a), 0, 0] : t === 1 ? [1, Math.min(1, stillMs / HERO_STILL_MS), 0] : [1, 1, filled(b)];
      barRefs.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleX(${fill[i]})`;
      });
      run();
    };
    const run = () => {
      if (!raf && inView && !pausedRef.current && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const halt = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };
    /** Play or stop what's showing and the clock together. */
    const sync = () => {
      const v = clip(turnRef.current);
      if (inView && !pausedRef.current) {
        v?.play().catch(() => {});
        run();
      } else {
        v?.pause();
        halt();
      }
    };
    pauseHeroRef.current = (p) => {
      pausedRef.current = p;
      sync();
    };
    const obs =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              sync();
            },
            { threshold: 0.05 },
          );
    // The hero box, not a turn's layer: those slide out of sight in turn.
    obs?.observe(a.parentElement ?? a);
    const onVisibility = () => (document.hidden ? halt() : run());

    for (const v of [a, b]) {
      v.addEventListener("timeupdate", onTime);
      v.addEventListener("ended", onEnded);
    }
    document.addEventListener("visibilitychange", onVisibility);
    run();
    return () => {
      window.clearTimeout(slideTimer);
      halt();
      obs?.disconnect();
      for (const v of [a, b]) {
        v.removeEventListener("timeupdate", onTime);
        v.removeEventListener("ended", onEnded);
      }
      document.removeEventListener("visibilitychange", onVisibility);
      pauseHeroRef.current = () => {};
    };
  }, []);

  const togglePaused = () => {
    setPaused(!pausedRef.current);
    pauseHeroRef.current(!pausedRef.current);
  };

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
      // v228: not while another turn is on (rewinding this one for its next
      // turn fires canplay again). v229: nor once the hero is paused.
      if (turnRef.current !== 0 || pausedRef.current) return;
      try {
        const p = v.play();
        if (p && typeof p.catch === "function") {
          p.catch((e: unknown) => {
            // Autoplay blocked (common on mobile) — reveal the page so the user
            // can see the poster + tap-to-play overlay instead of being stuck on intro.
            if ((e as { name?: string } | null)?.name === "NotAllowedError" && !cancelled) setAutoplayBlocked(true);
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
      if (!cancelled) setAutoplayBlocked(false);
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
        {/* v203 (owner): straight into the video - no still poster first. Until
            the first frame arrives the box is the video's own opening colour
            (average of frame 0); the still shows only if the browser refuses
            to autoplay (iPhone Low Power Mode, data saver). v229: 4:3 on
            tablets, not 21:9 - the words ran up into the header there. */}
        <div className="relative w-full h-screen overflow-hidden bg-[#7c6952] md:aspect-[4/3] md:h-auto md:max-h-screen lg:aspect-auto lg:h-screen">
          {/* v229: each turn's layer slides in and out (HERO_SPOT_CLASS). */}
          <video
            ref={videoRef}
            src={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{ transitionDuration: `${HERO_SLIDE_MS}ms` }}
            className={`absolute inset-0 h-full w-full object-cover will-change-transform ease-[cubic-bezier(0.77,0,0.175,1)] ${HERO_SPOT_CLASS[spots[0]]}`}
          />
          {/* v229: the still, waiting on the right until its turn. Not loaded
              until the first clip plays (see above). Wide screens keep her
              left of the words. */}
          <div
            aria-hidden="true"
            style={{ transitionDuration: `${HERO_SLIDE_MS}ms` }}
            className={`absolute inset-0 overflow-hidden will-change-transform ease-[cubic-bezier(0.77,0,0.175,1)] ${HERO_SPOT_CLASS[spots[1]]}`}
          >
            {loadStill && (
              <div ref={stillBoxRef} className="absolute inset-0 will-change-transform">
                <picture>
                  <source
                    media="(min-width: 768px)"
                    srcSet={`${heroStillImg} 1600w, ${heroStillLargeImg} 2560w`}
                    sizes="100vw"
                  />
                  <img
                    ref={stillRef}
                    src={heroStillPhoneImg}
                    srcSet={`${heroStillPhoneImg} 960w, ${heroStillPhoneLargeImg} 1440w`}
                    sizes="125vw"
                    alt=""
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover md:object-[80%_50%]"
                  />
                </picture>
              </div>
            )}
            {/* Phones: the words sit over her cream trousers, so a deeper shade there. */}
            <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink/85 via-ink/55 via-45% to-transparent md:hidden" />
          </div>
          {/* v228: the staircase clip, waiting on the right until its turn. No
              src until the first clip plays (see above). */}
          <video
            ref={video2Ref}
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            style={{ transitionDuration: `${HERO_SLIDE_MS}ms` }}
            className={`absolute inset-0 h-full w-full object-cover will-change-transform ease-[cubic-bezier(0.77,0,0.175,1)] ${HERO_SPOT_CLASS[spots[2]]}`}
          />
          {autoplayBlocked && (
            <img
              src={heroPoster}
              alt=""
              aria-hidden="true"
              decoding="async"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* Bottom-right gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-l from-ink/70 via-ink/30 to-transparent" />
        </div>

        {/* Bottom-right text overlay. v229: the films' words and the still's
            share the spot and swap with the turn (the hidden set is inert);
            the bottom padding leaves room for the bars. */}
        <div className="absolute bottom-0 right-0 grid max-w-xl px-6 pt-6 pb-14 text-right md:p-12 md:pb-16 lg:p-16 lg:pb-20">
          <div
            inert={turn === 1}
            className={`col-start-1 row-start-1 self-end transition-opacity duration-500 ${turn === 1 ? "opacity-0" : "opacity-100 delay-300"}`}
          >
            <p className="text-[11px] uppercase tracking-[0.28em] text-cream/80 mb-4">The Auvella Edit</p>
            <h1 className="font-serif text-3xl md:text-5xl lg:text-6xl text-cream leading-[1.05]">
              Built for the day, not the photo.
            </h1>
            <p className="mt-4 text-sm md:text-base text-cream/80 leading-relaxed max-w-md ml-auto">
              Shapewear, bras and lounge built to hold where it helps and stay put all day.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              {/* Straight into the collection, same as the bag/favourites/account
                  buttons — not a scroll down to the tile that links there. */}
              <Link
                to="/collections/$handle"
                params={{ handle: "everyday-support-edit" }}
                className="inline-flex items-center justify-center rounded-control bg-cream text-ink px-6 py-3.5 text-[12px] uppercase tracking-[0.2em] hover:bg-white transition-colors"
              >
                Shop Best Sellers
              </Link>
              <a
                href="#sleep"
                onClick={(e) => {
                  // Glide down to the four tiles instead of the instant anchor jump.
                  if (smoothScrollToId("sleep")) e.preventDefault();
                }}
                className="inline-flex items-center justify-center rounded-control bg-transparent text-cream border border-cream/40 px-6 py-3.5 text-[12px] uppercase tracking-[0.2em] hover:bg-cream/10 transition-colors"
              >
                Explore Sleep &amp; Lounge
              </a>
            </div>
            <p className="mt-4 text-xs text-cream/60 max-w-md ml-auto leading-relaxed">
              Loved by women for everyday comfort, sculpting support and elevated softness.
            </p>
          </div>
          {/* v229: the still's words - the multi-buy (lib/duoDeal, lib/perks:
              the wash bag comes with 3+ of one style), no deadline. */}
          <div
            inert={turn !== 1}
            className={`col-start-1 row-start-1 self-end transition-opacity duration-500 ${turn === 1 ? "opacity-100 delay-300" : "opacity-0"}`}
          >
            <p className="text-[11px] uppercase tracking-[0.28em] text-cream/80 mb-3">The Daily Rotation</p>
            <p className="font-serif text-[44px] italic leading-[0.98] text-cream md:text-5xl xl:text-[52px] 2xl:text-[64px]">
              One on.
              <br />
              One in the wash.
            </p>
            <p className="mt-4 text-[15px] leading-snug text-cream md:text-[17px]">
              {DUO_DEAL.percent}% off two. {DUO_DEAL.stockUpPercent}% off three or more,
              <br />
              plus a free wash bag.
            </p>
            <div className="mt-6 flex justify-end">
              <Link
                to="/product/$handle"
                params={{ handle: HERO_STILL_HANDLE }}
                className="inline-flex items-center justify-center rounded-control bg-cream text-ink px-6 py-3.5 text-[12px] uppercase tracking-[0.2em] hover:bg-white transition-colors"
              >
                Shop the Long Sleeve
              </Link>
            </div>
            <p className="mt-4 text-xs text-cream/60 leading-relaxed">
              Mix sizes and colours of one style. Selected styles.
              {freeFromTwo && (
                <>
                  <br />
                  Free delivery on 2+ items (excl. underwear).
                </>
              )}
            </p>
          </div>
        </div>

        {/* v229 (owner): one bar per turn, filling as it plays, and a pause. */}
        <div className="absolute left-6 right-6 bottom-5 flex items-center gap-3 md:left-auto md:right-12 md:bottom-7 md:w-72 lg:right-16 lg:bottom-9 lg:w-80">
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span key={i} className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-cream/30">
                <span
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                  style={{ transform: "scaleX(0)" }}
                  className="absolute inset-0 origin-left bg-cream"
                />
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={togglePaused}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="-m-2 flex h-8 w-8 items-center justify-center text-cream/80 transition-colors hover:text-cream"
          >
            {paused ? (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
                <path d="M0 0.8v10.4a.6.6 0 0 0 .9.5l8.6-5.2a.6.6 0 0 0 0-1L.9.3A.6.6 0 0 0 0 .8z" />
              </svg>
            ) : (
              <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" aria-hidden="true">
                <rect x="0" y="0" width="3" height="12" rx="0.5" />
                <rect x="7" y="0" width="3" height="12" rx="0.5" />
              </svg>
            )}
          </button>
        </div>
      </section>

      <EssentialsSection />

      {/* SECTION 2 — TWO-PANEL EDITORIAL SPLIT */}
      <section id="bestsellers" className="grid grid-cols-1 md:grid-cols-2 scroll-mt-24">
        <Panel
          image={PANEL_IMG.bestsellers}
          handle="everyday-support-edit"
          name="The Everyday Support Edit"
          sub="Holds where it helps. No roll-down, no digging, no adjusting."
          position="55% 38%"
          scale={1.18}
          className="h-[60vh] md:h-[calc(100vh-88px)]"
        />
        <Panel
          image={PANEL_IMG.shapewear}
          handle="shapewear"
          name="Shapewear"
          sub="Holds where it helps. Nowhere else."
          position="center 18%"
          scale={1.08}
          className="h-[60vh] md:h-[calc(100vh-88px)]"
        />
      </section>

      {/* SECTION 3 — FOUR-PANEL CATEGORY ROW (small cards keep original caption styling) */}
      <section id="sleep" className="mt-3 grid grid-cols-2 gap-3 px-3 md:mt-4 md:gap-4 md:px-4 lg:grid-cols-4 scroll-mt-24">
        <Panel image={PANEL_IMG.bodysuits} handle="bodysuits" name="Bodysuits" position="center 15%" scale={1.18} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.loungewear} handle="loungewear-sleepwear" name="Lounge & Sleep" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.bras} handle="bras" name="Bras" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.dresses} handle="dresses" name="Dresses" position="center 30%" scale={1.07} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
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
            Stays put. Doesn't dig. Disappears under white.
          </p>
          <Link
            to="/collections/$handle"
            params={{ handle: "shapewear" }}
            className="mt-7 inline-flex h-12 w-40 items-center justify-center rounded-control border border-white bg-transparent text-[11px] uppercase tracking-[0.16em] text-white transition-colors duration-[250ms] hover:bg-white hover:text-[#0a0a0a]"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* SECTION 5 — FOUR-PANEL SECOND CATEGORY ROW (small cards keep original caption styling) */}
      <section className="mt-3 grid grid-cols-2 gap-3 px-3 md:mt-4 md:gap-4 md:px-4 lg:grid-cols-4">
        <Panel image={PANEL_IMG.sets} handle="sets" name="Sets" position="center 60%" scale={1.15} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.shorts} handle="shorts-and-waist" name="Shorts & Waist" scale={1.15} className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
        <Panel image={PANEL_IMG.pyjamas} handle="robes-and-sleep" name="Robes & Sleep" className="aspect-[3/4] lg:aspect-auto lg:h-[56vh]" size="small" />
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
  // v224: free delivery on 2+ items where it applies, one delivery time.
  const { country } = useShippingCountry();
  const displayCurrency = usePreferences((s) => s.currency);
  const free = inFreeDeliveryCountry(country.code)
    ? "FREE DELIVERY ON 2+ ITEMS (EXCL. UNDERWEAR)"
    : `FREE SHIPPING ON ORDERS OVER ${freeShippingThresholdFmt(displayCurrency)}`;
  const text = `${free} · ${deliveryTimeLine(country).toUpperCase()} · 30-DAY RETURNS · NEW DROPS WEEKLY · AUVELLA · `;
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
  /* Three of these pointed at products deleted in September; re-matched by
     eye against the live catalogue on 26 Sept 2026. */
  { image: ugc1.url, handle: "one-piece-shapewear-bodysuit-with-tummy-control", label: "@maelinaaa" },
  { image: ugc2.url, handle: "long-sleeve-zip-one-piece-swimsuit", label: "@sofiarrx" },
  { image: ugc3Black, handle: "high-waist-body-shaping-shorts", label: "@ellavayne" },
  { image: ugc4.url, handle: "satin-tie-waist-robe", label: "@zara.renn" },
  { image: ugc5.url, handle: "strapless-tummy-control-body-shaper", label: "@noraluxe" },
  { image: ugc6.url, handle: "womens-tie-side-triangle-bikini-set", label: "@chloemerritt" },
  { image: ugc7.url, handle: "seamless-sculpting-bodysuit", label: "@tessavibes" },
  { image: ugc8.url, handle: "auvella-long-sleeve-sculpting-bodysuit", label: "@oliviaarc" },
  { image: ugc9.url, handle: "one-piece-shapewear-bodysuit-with-tummy-control", label: "@briellxo" },
];

/* UGC entries whose handle is a product (not a collection) */
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
              to="/product/$handle"
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
