import { COUNTRIES, PROCESSING_DAYS, type Country } from "@/lib/shipping";

/*
 * Delivery window for the bag drawer.
 *
 * Derived, not invented: order date → processing (PROCESSING_DAYS, working
 * days) → courier transit (COUNTRIES[].transit, working days) → a date range.
 * Weekends are skipped at every step. UK bank holidays are not, and the copy
 * says "estimated" for exactly that reason.
 *
 * All wall-clock arithmetic is done in Europe/London so a shopper in Sydney
 * sees the same window the warehouse side would compute — the day boundary
 * that matters is ours, not theirs.
 *
 * There is deliberately NO "order within Xh Ym" countdown. That needs a real
 * daily dispatch cutoff at the supply partner, which hasn't been confirmed.
 * DISPATCH_CUTOFF_LONDON stays null until it is; while null, no countdown
 * renders anywhere, so nothing on the page implies a deadline that doesn't
 * exist.
 */

/** "HH:MM" in Europe/London, or null while unconfirmed. */
export const DISPATCH_CUTOFF_LONDON: string | null = null;

const LONDON = "Europe/London";

type Ymd = { y: number; m: number; d: number };

/** The calendar date it currently is in London, as plain numbers. */
function londonToday(now: Date): Ymd {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Minutes past midnight in London. */
function londonMinutes(now: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return get("hour") * 60 + get("minute");
}

/* Date arithmetic on a UTC-midnight "calendar day" so DST can't shift it. */
function toUtcDay(x: Ymd): Date {
  return new Date(Date.UTC(x.y, x.m - 1, x.d));
}
function isWeekend(d: Date): boolean {
  const w = d.getUTCDay();
  return w === 0 || w === 6;
}
function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (!isWeekend(d)) left -= 1;
  }
  return d;
}
function nextWorkingDay(d: Date): Date {
  const x = new Date(d);
  while (isWeekend(x)) x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

export type DeliveryWindow = {
  /** Earliest and latest estimated arrival, as calendar days. */
  from: Date;
  to: Date;
  /** "Thu 25 Sep – Fri 3 Oct" */
  label: string;
  /** Minutes until today's cutoff, or null when there is no confirmed cutoff. */
  minutesToCutoff: number | null;
  countryName: string;
};

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

export function estimateDelivery(country: Country | null | undefined, now: Date = new Date()): DeliveryWindow | null {
  // Resolve by code: the persisted preference object may predate `transit`.
  const code = country?.code ?? "GB";
  const c = COUNTRIES.find((x) => x.code === code) ?? COUNTRIES.find((x) => x.code === "GB");
  if (!c?.transit) return null; // no supply-partner figure for this country — say nothing

  // The order is treated as placed today, unless a confirmed cutoff has
  // passed, in which case it counts from the next working day.
  let start = toUtcDay(londonToday(now));
  let minutesToCutoff: number | null = null;
  if (DISPATCH_CUTOFF_LONDON) {
    const [h, m] = DISPATCH_CUTOFF_LONDON.split(":").map(Number);
    const cutoff = h * 60 + m;
    const nowMin = londonMinutes(now);
    if (nowMin >= cutoff || isWeekend(start)) {
      start.setUTCDate(start.getUTCDate() + 1);
      minutesToCutoff = null;
    } else {
      minutesToCutoff = cutoff - nowMin;
    }
  }
  start = nextWorkingDay(start);

  const [pMin, pMax] = PROCESSING_DAYS;
  const [tMin, tMax] = c.transit;
  const from = addWorkingDays(start, pMin + tMin);
  const to = addWorkingDays(start, pMax + tMax);

  return {
    from,
    to,
    label: `${fmt(from)} – ${fmt(to)}`,
    minutesToCutoff,
    countryName: c.name,
  };
}
