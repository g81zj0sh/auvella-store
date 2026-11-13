import { COUNTRIES, PROCESSING_DAYS, type Country } from "@/lib/shipping";

/*
 * Delivery window: when an order placed today arrives.
 *
 * Derived, not invented: order date → processing (PROCESSING_DAYS, working
 * days) → courier transit (COUNTRIES[].transit, working days) → a date range.
 * For the UK that is 4 to 9 working days from ordering - the same promise the
 * shipping page states, shown as dates.
 *
 * v235 (owner's brief, 13 Nov 2026: "arrives" dates instead of "4–9 working
 * days"): working days are Monday to Friday except England and Wales bank
 * holidays (UK_BANK_HOLIDAYS, the one list); an order placed on a weekend or
 * a bank holiday counts from the next working day. The product page (under
 * Add to Bag) and the bag show the same line from deliveryLines(), counted
 * from today's UK date (lib/ukDay).
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

/** England and Wales bank holidays (gov.uk/bank-holidays.json, read 13 Nov
 *  2026). No working day falls on these. Add the next year's when gov.uk
 *  publishes them. */
export const UK_BANK_HOLIDAYS: readonly string[] = [
  "2026-12-25", // Christmas Day
  "2026-12-28", // Boxing Day (substitute day)
  "2027-01-01", // New Year's Day
  "2027-03-26", // Good Friday
  "2027-03-29", // Easter Monday
  "2027-05-03", // Early May bank holiday
  "2027-05-31", // Spring bank holiday
  "2027-08-30", // Summer bank holiday
  "2027-12-27", // Christmas Day (substitute day)
  "2027-12-28", // Boxing Day (substitute day)
  "2028-01-03", // New Year's Day (substitute day)
];

/** The Christmas cut-off (UK dates, both days included): from
 *  CHRISTMAS_LINE_FROM to CHRISTMAS_CUTOFF the UK line adds "Order by Thu 10 Dec
 *  for delivery before Christmas". 10 Dec + 9 working days = Wed 23 Dec. */
export const CHRISTMAS_LINE_FROM = "2026-12-01";
export const CHRISTMAS_CUTOFF = "2026-12-10";

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
function fromIso(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return toUtcDay({ y, m, d });
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function isWorkingDay(d: Date): boolean {
  const w = d.getUTCDay();
  return w !== 0 && w !== 6 && !UK_BANK_HOLIDAYS.includes(iso(d));
}
function addWorkingDays(from: Date, n: number): Date {
  const d = new Date(from);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkingDay(d)) left -= 1;
  }
  return d;
}
function nextWorkingDay(d: Date): Date {
  const x = new Date(d);
  while (!isWorkingDay(x)) x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

export type DeliveryWindow = {
  /** Earliest and latest estimated arrival, as calendar days. */
  from: Date;
  to: Date;
  /** "Thu 19 – Thu 26 Nov", or "Fri 27 Nov – Fri 4 Dec" across months. */
  label: string;
  /** Minutes until today's cutoff, or null when there is no confirmed cutoff. */
  minutesToCutoff: number | null;
  /** Reads after "to": "the United Kingdom", "Germany". */
  countryName: string;
};

const part = (d: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(d);

/** "Thu 19 Nov". */
function fmt(d: Date): string {
  return `${part(d, { weekday: "short" })} ${d.getUTCDate()} ${part(d, { month: "short" })}`;
}

/** "Thu 19 – Thu 26 Nov" in one month, "Fri 27 Nov – Fri 4 Dec" across two. */
function rangeLabel(from: Date, to: Date): string {
  const sameMonth = from.getUTCFullYear() === to.getUTCFullYear() && from.getUTCMonth() === to.getUTCMonth();
  return sameMonth
    ? `${part(from, { weekday: "short" })} ${from.getUTCDate()} – ${fmt(to)}`
    : `${fmt(from)} – ${fmt(to)}`;
}

/** `now` is a moment, or a UK calendar date "YYYY-MM-DD" (lib/ukDay). */
export function estimateDelivery(
  country: Country | null | undefined,
  now: Date | string = new Date(),
): DeliveryWindow | null {
  // Resolve by code: the persisted preference object may predate `transit`.
  const code = country?.code ?? "GB";
  const c = COUNTRIES.find((x) => x.code === code) ?? COUNTRIES.find((x) => x.code === "GB");
  if (!c?.transit) return null; // no supply-partner figure for this country — say nothing

  // The order is treated as placed today - on a weekend or bank holiday, the
  // next working day - unless a confirmed cutoff has passed, in which case it
  // counts from the next working day.
  let start = typeof now === "string" ? fromIso(now) : toUtcDay(londonToday(now));
  let minutesToCutoff: number | null = null;
  if (DISPATCH_CUTOFF_LONDON && typeof now !== "string") {
    const [h, m] = DISPATCH_CUTOFF_LONDON.split(":").map(Number);
    const cutoff = h * 60 + m;
    const nowMin = londonMinutes(now);
    if (nowMin >= cutoff || !isWorkingDay(start)) {
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
    label: rangeLabel(from, to),
    minutesToCutoff,
    countryName: `${c.the ? "the " : ""}${c.name}`,
  };
}

/**
 * The delivery lines under Add to Bag and in the bag (v235), for an order
 * placed on `today` (UK date): "Tracked UK delivery: arrives Thu 19 – Thu 26 Nov"
 * (elsewhere "Tracked delivery to Germany: arrives …"), and in the UK, from
 * CHRISTMAS_LINE_FROM to CHRISTMAS_CUTOFF, "Order by Thu 10 Dec for delivery
 * before Christmas". No price, ever: delivery is priced at checkout.
 */
export function deliveryLines(
  country: Country | null | undefined,
  today: string,
): { arrives: string; christmas: string | null } | null {
  const w = estimateDelivery(country, today);
  if (!w) return null;
  const uk = (country?.code ?? "GB") === "GB";
  return {
    arrives: uk ? `Tracked UK delivery: arrives ${w.label}` : `Tracked delivery to ${w.countryName}: arrives ${w.label}`,
    christmas:
      uk && today >= CHRISTMAS_LINE_FROM && today <= CHRISTMAS_CUTOFF
        ? `Order by ${fmt(fromIso(CHRISTMAS_CUTOFF))} for delivery before Christmas`
        : null,
  };
}
