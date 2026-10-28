// Meta pixel (dataset 1585250303102135, Auvella business portfolio).
//
// The storefront is a TanStack Start SPA, so the stock Meta snippet is not
// enough on its own: it only fires PageView on the initial document load.
// Client-side navigations need an explicit PageView, which is what
// trackMetaPageView() below is for. Path de-duplication stops the initial
// load being counted twice when the router resolves its first route.

import { readConsent } from "@/lib/consent";

const PIXEL_ID = "1585250303102135";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

let initialised = false;
let lastTrackedPath: string | null = null;

/* v213: events from before the banner is answered - the landing ViewContent,
   an early Add to bag - wait here, in page memory only (never storage or a
   cookie), and go out in order once the pixel starts after an Accept. A
   Decline drops them, and so does leaving the site. */
type HeldEvent = { event: string; params: Record<string, unknown>; eventID: string };
const HELD_MAX = 20;
let held: HeldEvent[] = [];

/* v211: the pixel only runs on the live store. Local and preview builds
   (localhost, 127.0.0.1, *.workers.dev) log what they would have sent
   instead, so test traffic never reaches Meta. */
const LIVE_HOST = "auvellawear.com";

function isLiveSite(): boolean {
  return window.location.hostname === LIVE_HOST;
}

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

/* v212: every event Meta gets carries its own event ID (eid), so a later
   server-side copy of the same event can be matched to it and counted once. */
function newEventId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Older in-app browsers: the same 128-bit random v4 shape.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function send({ event, params, eventID }: HeldEvent): void {
  if (!isLiveSite()) {
    console.debug(`[meta pixel] not the live site. Would send: ${event}`, params, { eventID });
    return;
  }
  window.fbq?.("track", event, params, { eventID });
}

/**
 * Injects fbevents.js and fires the first PageView, then (v213) the events
 * held from before the Accept. Safe to call repeatedly.
 */
export function initMetaPixel(): void {
  if (typeof window === "undefined" || initialised) return;
  initialised = true;
  if (isLiveSite()) loadPixel();
  else {
    console.debug(`[meta pixel] not the live site, so not loaded. Would send: init ${PIXEL_ID}, PageView`, {
      eventID: newEventId(),
    });
  }
  lastTrackedPath = currentPath();
  const queued = held;
  held = [];
  for (const e of queued) send(e);
}

/** v213: a Decline drops whatever was held for an Accept. */
export function dropHeldMetaEvents(): void {
  held = [];
}

function loadPixel(): void {
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

  // v215: one PageView per page change, and it's the router's
  // (trackMetaPageView, with our event ID). Meta's own history tracking sent
  // one on every pushState and swallowed ours as a duplicate. v216: with that
  // off, fbevents counts the whole visit as one page and drops every later
  // PageView, so it's told they aren't duplicates (trackMetaPageView already
  // skips a repeat of the same path).
  const flags = window.fbq as unknown as { disablePushState?: boolean; allowDuplicatePageViews?: boolean };
  flags.disablePushState = true;
  flags.allowDuplicatePageViews = true;
  window.fbq?.("init", PIXEL_ID);
  window.fbq?.("track", "PageView", {}, { eventID: newEventId() });
}

/**
 * Fires a standard or custom Meta event. Before the pixel has started it is
 * held for an Accept (v213). Returns the event's ID (v212), or null when it
 * was dropped.
 */
export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): string | null {
  if (typeof window === "undefined") return null;
  // v188: consent withdrawn in another tab - this tab's pixel is still loaded
  // but must go quiet. An explicit "declined" only: with storage blocked the
  // choice reads null, and that tab's Accept still counts for its own page.
  if (readConsent() === "declined") {
    held = [];
    return null;
  }
  const e: HeldEvent = { event, params: params ?? {}, eventID: newEventId() };
  if (initialised) {
    send(e);
    return e.eventID;
  }
  // Unanswered, or accepted but not started yet (a returning visitor's landing
  // view can run before the root starts the pixel). Never a PageView: the
  // start sends its own.
  if (event === "PageView") return null;
  held.push(e);
  if (held.length > HELD_MAX) held.shift();
  if (!isLiveSite()) console.debug(`[meta pixel] held until the cookie choice: ${event}`, e.params, { eventID: e.eventID });
  return e.eventID;
}

/**
 * v188: removes the cookies fbevents.js sets - _fbp (the browser id) and _fbc
 * (an ad click) - when a shopper withdraws consent. Meta sets them on the
 * whole domain, so clear that as well as this host. Only ever removes data.
 */
export function clearMetaPixelCookies(): void {
  if (typeof window === "undefined") return;
  const expired = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/";
  for (const name of ["_fbp", "_fbc"]) {
    try {
      document.cookie = name + expired;
      if (window.location.hostname.endsWith("auvellawear.com")) {
        document.cookie = `${name}${expired}; domain=.auvellawear.com`;
      }
    } catch {
      /* ignore */
    }
  }
}

/** Fires PageView for a client-side navigation, skipping repeat paths. */
export function trackMetaPageView(): void {
  if (typeof window === "undefined") return;
  const path = currentPath();
  if (path === lastTrackedPath) return;
  lastTrackedPath = path;
  trackMetaEvent("PageView");
}

/**
 * Shopify hands out global IDs ("gid://shopify/ProductVariant/123") but the
 * Merchant/catalogue feed keys on the bare numeric id. Meta can only match an
 * event to a catalogue item when the two agree, so strip to the last segment.
 */
export function metaContentId(gid: string | null | undefined): string {
  const raw = String(gid ?? "");
  const parts = raw.split("/");
  return parts[parts.length - 1] || raw;
}
