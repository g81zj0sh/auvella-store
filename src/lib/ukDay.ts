import { useSyncExternalStore } from "react";

/*
 * Today's date in the UK (Europe/London), as "YYYY-MM-DD" (v235).
 *
 * The delivery lines (lib/deliveryEstimate) count working days from it. The
 * server renders with its own UK date and writes it on <html> (data-uk-day,
 * __root), and the edge cache keeps one copy per UK day (server.ts), so no
 * page shows yesterday's dates. The browser hydrates with the date the page
 * was rendered with - never a mismatch - then follows its own clock: it moves
 * on at UK midnight (checked every minute and when the tab comes back).
 */

const ATTRIBUTE = "data-uk-day";

export function ukDayOf(now: Date | number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(now));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/* Read once, before React touches the attribute: route chunks that hydrate
   after the root has moved the date on must still hydrate with the date the
   page was rendered with, or React rejects the server's text (#418). */
let rendered: string | null = null;

function renderedDay(): string {
  if (typeof document === "undefined") return ukDayOf(Date.now());
  if (rendered === null) {
    const v = document.documentElement.getAttribute(ATTRIBUTE);
    rendered = v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ukDayOf(Date.now());
  }
  return rendered;
}

let day: string | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function currentDay(): string {
  // The Worker keeps modules between requests: the server never caches it.
  if (typeof document === "undefined") return ukDayOf(Date.now());
  if (day === null) day = renderedDay();
  return day;
}

function check() {
  const now = ukDayOf(Date.now());
  if (now !== currentDay()) {
    day = now;
    for (const l of listeners) l();
  }
}

function onVisible() {
  if (document.visibilityState === "visible") check();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    check();
    timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

/** Today in the UK, "YYYY-MM-DD", hydration-safe. */
export function useUkDay(): string {
  return useSyncExternalStore(subscribe, currentDay, renderedDay);
}

export { ATTRIBUTE as UK_DAY_ATTRIBUTE };
