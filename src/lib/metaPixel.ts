// Meta pixel (dataset 1585250303102135, Auvella business portfolio).
//
// The storefront is a TanStack Start SPA, so the stock Meta snippet is not
// enough on its own: it only fires PageView on the initial document load.
// Client-side navigations need an explicit PageView, which is what
// trackMetaPageView() below is for. Path de-duplication stops the initial
// load being counted twice when the router resolves its first route.

const PIXEL_ID = "1585250303102135";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let initialised = false;
let lastTrackedPath: string | null = null;

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

/** Injects fbevents.js and fires the first PageView. Safe to call repeatedly. */
export function initMetaPixel(): void {
  if (typeof window === "undefined" || initialised) return;
  initialised = true;

  /* eslint-disable */
  // Meta's own loader stub, transcribed from the snippet in Events Manager.
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod
        ? n.callMethod.apply(n, arguments)
        : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode?.insertBefore(t, s);
  })(
    window,
    document,
    "script",
    "https://connect.facebook.net/en_US/fbevents.js",
  );
  /* eslint-enable */

  window.fbq?.("init", PIXEL_ID);
  window.fbq?.("track", "PageView");
  lastTrackedPath = currentPath();
}

/** Fires a standard or custom Meta event. No-ops before the pixel loads. */
export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}

/** Fires PageView for a client-side navigation, skipping repeat paths. */
export function trackMetaPageView(): void {
  if (typeof window === "undefined") return;
  const path = currentPath();
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;
  trackMetaEvent("PageView");
}
