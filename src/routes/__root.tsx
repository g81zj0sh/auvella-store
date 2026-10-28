import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { clearMetaPixelCookies, dropHeldMetaEvents, initMetaPixel, trackMetaPageView } from "../lib/metaPixel";
import { clearKlaviyoIdentity, loadKlaviyo } from "@/lib/klaviyoOnsite";
import { usePreferences } from "../lib/preferences";
import { CookieConsent } from "@/components/site/CookieConsent";
import { hasMarketingConsent, onConsentChange, readConsent } from "@/lib/consent";
import { Toaster } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { GlueOfferPopup } from "@/components/site/GlueOfferPopup";
import { PerkSync } from "@/components/site/PerkSync";
import { useQuickAdd } from "@/stores/quickAddStore";
import { useCartSync } from "@/hooks/useCartSync";
import { useDomTranslation } from "@/lib/preferences";
import { useCartStore } from "@/stores/cartStore";
import { installImageProtection } from "@/lib/imageProtection";
// Side-effect import: captures the session's entry path before any route renders.
import "@/lib/landing";

/* v196: the 404 was a bare screen with no way on but "Go home". It keeps the
   404 status; this just gives it the site's header, footer and somewhere to
   shop. The title comes from the root head (match._notFound), not a <title>
   here - HeadContent already prints one and React would add a second. */
const NOT_FOUND_LINKS = [
  { handle: "all", label: "Shop all" },
  { handle: "shapewear", label: "Shapewear" },
  { handle: "bras", label: "Bras" },
];

function NotFoundComponent() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-2xl pb-24 pt-32 text-center md:pt-40">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#888888]">404</p>
        <h1 className="mt-3 font-serif text-3xl font-light text-[#0a0a0a] md:text-4xl">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-[#888888]">
          This page has moved or no longer exists. Everything else is still here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {NOT_FOUND_LINKS.map((l) => (
            <Link
              key={l.handle}
              to="/collections/$handle"
              params={{ handle: l.handle }}
              className="inline-flex h-11 items-center rounded-control bg-[#0a0a0a] px-6 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Link
          to="/"
          className="mt-6 inline-block text-[11px] uppercase tracking-[0.18em] text-[#0a0a0a] underline underline-offset-4 hover:opacity-60"
        >
          Back to home
        </Link>
      </main>
      <Footer />
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    console.error("Auvella root route error", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      route: window.location.pathname,
    });
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-control bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-control border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: ({ match }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // v196: the root match carries _notFound whenever the 404 page renders.
      { title: match._notFound ? "Page not found — Auvella" : "Auvella" },
      { name: "description", content: "Shapewear, bras and lounge built to hold where it helps and stay put all day. Our shapewear runs S–4XL." },
      { name: "author", content: "Auvella" },
      { property: "og:title", content: "Auvella — Built for the day, not the photo." },
      { property: "og:description", content: "Shapewear, bras and lounge built to hold where it helps and stay put all day. Our shapewear runs S–4XL." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Auvella — Built for the day, not the photo." },
      { name: "twitter:description", content: "Shapewear, bras and lounge built to hold where it helps and stay put all day. Our shapewear runs S–4XL." },
      { property: "og:image", content: "https://auvellawear.com/og-image.png" },
      { name: "twitter:image", content: "https://auvellawear.com/og-image.png" },
    ],
    links: [
      { rel: "preconnect", href: "https://connect.facebook.net" },
      // v205: the fonts are self-hosted (styles.css), not fonts.googleapis.com.
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/** v188: the cookies and storage the Meta pixel and klaviyo.js leave behind. */
function clearMarketingData() {
  clearMetaPixelCookies();
  clearKlaviyoIdentity();
  // klaviyo.js's own onsite state, seen in the browser after an Accept
  // (15 Oct 2026). Logout keeps these; a withdrawal drops everything.
  const drop = (store: () => Storage, keys: string[]) => {
    for (const key of keys) {
      try {
        store().removeItem(key);
      } catch {
        /* storage can be blocked */
      }
    }
  };
  drop(() => window.localStorage, ["__kl_key", "klaviyoOnsite", "kl-post-identification-sync"]);
  // fbevents.js's referrer memo.
  drop(() => window.localStorage, ["lastExternalReferrer", "lastExternalReferrerTime"]);
  drop(() => window.sessionStorage, ["klaviyoPagesVisitCountV2", "klaviyoPagesVisitCount"]);
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useCartSync();
  useDomTranslation();
  useEffect(() => {
    // Rehydrate persisted preferences after mount so SSR HTML matches the
    // initial client render (avoids hydration mismatches from currency/lang).
    void import("@/lib/preferences").then((m) => m.usePreferences.persist?.rehydrate());
    void useCartStore.persist?.rehydrate();
  }, []);
  // v192: no right-click / long-press "Save image" or dragging on photos and videos.
  useEffect(() => installImageProtection(), []);
  useEffect(() => {
    // The Meta pixel is non-essential tracking, so it may not load until the
    // visitor has agreed — nothing fires on an unanswered or declined banner.
    // Accepting starts it immediately without a reload.
    let unsubscribeRouter: (() => void) | undefined;

    const start = () => {
      if (unsubscribeRouter) return;
      initMetaPixel();
      // Klaviyo bag tracking (v186) sits behind the same consent.
      loadKlaviyo();
      unsubscribeRouter = router.subscribe("onResolved", () => {
        trackMetaPageView();
      });
    };

    if (hasMarketingConsent()) start();
    // v188: after a decline none of the tags' cookies should be here. Also
    // catches one a tag re-wrote while the withdrawal reload was under way.
    else if (readConsent() === "declined") clearMarketingData();

    // Market: the server rendered GB prices. If this shopper's country is
    // anything else - or changes - refetch everything in their market.
    let lastCountry = "GB";
    const syncMarket = () => {
      const code = usePreferences.getState().shippingCountry?.code ?? "GB";
      if (code === lastCountry) return;
      lastCountry = code;
      // Zustand notifies subscribers before persist writes to localStorage,
      // and the request layer reads the country from there - so refetch on
      // the next tick, or it asks Shopify for the OLD market (QA 28 Sept).
      setTimeout(() => void queryClient.invalidateQueries(), 0);
    };
    syncMarket();
    const unsubscribePrefs = usePreferences.subscribe(syncMarket);
    const unsubscribeConsent = onConsentChange((state) => {
      if (state === "accepted") start();
      if (state !== "declined") return;
      // v213: nothing held from before the answer ever goes out.
      dropHeldMetaEvents();
      // v188: a yes taken back via Cookie settings. fbevents.js and klaviyo.js
      // can't be unloaded, so clear what they stored and reload once - the
      // fresh page never injects them. If nothing started on this page (a
      // first decline, or declining again) there is nothing to unload.
      clearMarketingData();
      // klaviyo.js can also arrive without start() (a bag add or signup after
      // an Accept in another tab), so go by what's actually on the page.
      if (unsubscribeRouter || window.fbq || window.klaviyo) window.location.reload();
    });

    return () => {
      unsubscribePrefs();
      unsubscribeConsent();
      unsubscribeRouter?.();
    };
  }, [router]);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <GlobalQuickAdd />
      <GlueOfferPopup />
      <PerkSync />
      <CookieConsent />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}


/* v205: quick add is its own chunk, warmed once the page is idle and mounted
   from the first time it opens - not part of the main bundle. Closed, it
   rendered nothing, so the page is the same. */
const loadQuickAdd = () => import("@/components/site/QuickAddSheet");
const QuickAddSheet = lazy(() =>
  loadQuickAdd().then(
    (m) => ({ default: m.QuickAddSheet }),
    // A failed download (bad signal, or a page left open across a deploy)
    // must not take the page down: quick add just doesn't open.
    () => ({ default: () => null }),
  ),
);

function GlobalQuickAdd() {
  const product = useQuickAdd((s) => s.product);
  const color = useQuickAdd((s) => s.color);
  const open = useQuickAdd((s) => s.open);
  const setOpen = useQuickAdd((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);
  useEffect(() => {
    const warm = () => void loadQuickAdd().catch(() => {});
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, []);
  if (!mounted && !open) return null;
  return (
    <Suspense fallback={null}>
      <QuickAddSheet product={product} color={color} open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
