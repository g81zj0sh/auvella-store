import { useEffect } from "react";
import {
  convertPrice,
  usePreferences,
  type ShippingCountry,
} from "@/lib/preferences";

/*
 * Shared shipping-destination logic: one detection, one country list,
 * one threshold calculation — consumed by the announcement bar, the
 * shipping popup, and anything else that needs the shopper's market.
 */

export type Country = ShippingCountry;

export const COUNTRIES: Country[] = [
  { code: "GB", name: "United Kingdom", the: true, days: "5 – 12", transit: [3, 6], currency: "GBP" },
  { code: "US", name: "United States", the: true, days: "3 – 8", currency: "USD" },
  { code: "DE", name: "Germany", days: "5 – 12", transit: [6, 9], currency: "EUR" },
  { code: "CA", name: "Canada", days: "5 – 12", transit: [6, 10], currency: "CAD" },
  { code: "NZ", name: "New Zealand", days: "5 – 12", transit: [5, 10], currency: "NZD" },
  { code: "AU", name: "Australia", days: "5 – 12", transit: [6, 10], currency: "AUD" },
  { code: "IE", name: "Ireland", days: "5 – 12", transit: [6, 10], currency: "EUR" },
  { code: "SE", name: "Sweden", days: "5 – 12", transit: [3, 5], currency: "SEK" },
  { code: "NL", name: "Netherlands", the: true, days: "5 – 12", transit: [3, 5], currency: "EUR" },
  { code: "SG", name: "Singapore", days: "5 – 12", transit: [3, 5], currency: "SGD" },
  { code: "IT", name: "Italy", days: "5 – 12", transit: [6, 10], currency: "EUR" },
  { code: "DK", name: "Denmark", days: "5 – 12", transit: [6, 10], currency: "DKK" },
  { code: "BE", name: "Belgium", days: "5 – 12", transit: [5, 8], currency: "EUR" },
  { code: "AT", name: "Austria", days: "5 – 12", transit: [3, 5], currency: "EUR" },
  { code: "PL", name: "Poland", days: "5 – 12", transit: [3, 5], currency: "PLN" },
  { code: "ES", name: "Spain", days: "5 – 12", transit: [6, 10], currency: "EUR" },
  { code: "NO", name: "Norway", days: "5 – 12", transit: [4, 9], currency: "NOK" },
  { code: "AE", name: "United Arab Emirates", the: true, days: "5 – 12", transit: [6, 9], currency: "AED" },
  { code: "CH", name: "Switzerland", days: "5 – 12", currency: "CHF" },
];

export const DEFAULT_DAYS = "5 – 12";

/*
 * Supply-partner figures (Sept 2026). Processing is the time between the order
 * and the courier booking; transit is per country in COUNTRIES. The two are
 * kept separate on purpose: the popup quotes transit as "shipping", while the
 * "receive your order in" copy elsewhere is a total and stays on `days` until
 * the processing side is settled.
 */
export const PROCESSING_DAYS: [number, number] = [1, 3];

/** "3 – 6" for the popup, from transit; falls back to the total if unset. */
export function transitLabel(c: Country): string {
  return c.transit ? `${c.transit[0]} – ${c.transit[1]}` : c.days;
}
const FREE_SHIPPING_GBP = 75;

/*
 * Country → display currency.
 *
 * COUNTRIES above is the shipping-destination picker: a short, curated list.
 * It is NOT the set of places people browse from, so it can't drive currency —
 * doing so left every unlisted country (France, Japan, Brazil…) reading the
 * GBP fallback while the modal cheerfully announced their own country name.
 *
 * This map covers every country whose real currency the store can actually
 * convert into, i.e. the ones present in RATES_TO_GBP. Anything outside it has
 * no exchange rate, so it resolves to USD — the international default — rather
 * than showing a British shopper's prices to someone in São Paulo.
 */
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  GB: "GBP", IM: "GBP", JE: "GBP", GG: "GBP",
  // USD: the United States, its territories, and countries that use the dollar directly
  US: "USD", PR: "USD", VI: "USD", GU: "USD", AS: "USD", MP: "USD",
  EC: "USD", SV: "USD", PA: "USD", TL: "USD",
  CA: "CAD",
  AU: "AUD", CX: "AUD", CC: "AUD", NF: "AUD", KI: "AUD", NR: "AUD", TV: "AUD",
  // Eurozone, plus the microstates and territories that use the euro
  AT: "EUR", BE: "EUR", HR: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR",
  DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR",
  MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
  AD: "EUR", MC: "EUR", SM: "EUR", VA: "EUR", ME: "EUR", XK: "EUR",
  RE: "EUR", YT: "EUR", GP: "EUR", MQ: "EUR", GF: "EUR",
  CH: "CHF", LI: "CHF",
  SE: "SEK",
  NO: "NOK", SJ: "NOK",
  DK: "DKK", FO: "DKK", GL: "DKK",
  AE: "AED",
  SA: "SAR",
  JP: "JPY",
  NZ: "NZD", CK: "NZD", NU: "NZD", TK: "NZD", PN: "NZD",
  SG: "SGD",
  PL: "PLN",
};

/** The store's display currency for a country code, USD where we have no rate. */
export function currencyForCountry(code?: string): string {
  return CURRENCY_BY_COUNTRY[(code ?? "").toUpperCase()] ?? "USD";
}

export function countryFromCode(code?: string, fallbackName?: string): Country {
  const upper = (code ?? "").toUpperCase();
  const known = COUNTRIES.find((c) => c.code === upper);
  if (known) return known;
  let name = fallbackName;
  if (!name && code) {
    try {
      name = new Intl.DisplayNames(["en"], { type: "region" }).of(upper) ?? undefined;
    } catch {
      /* noop */
    }
  }
  // No code and no name means detection failed outright — fall back to the
  // home market rather than guessing at a country we were never given.
  if (!name && !upper) return COUNTRIES[0];
  const needsThe = /^(united|netherlands|philippines|czech|bahamas|maldives|gambia)/i.test(name ?? "");
  return {
    code: upper || "??",
    name: name ?? COUNTRIES[0].name,
    the: needsThe,
    days: DEFAULT_DAYS,
    currency: currencyForCountry(upper),
  };
}

export async function detectCountry(): Promise<Country> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
    clearTimeout(t);
    if (res.ok) {
      const data = (await res.json()) as { country_code?: string; country_name?: string };
      if (data.country_code) return countryFromCode(data.country_code, data.country_name);
    }
  } catch {
    /* fall through */
  }
  try {
    const region = new Intl.Locale(navigator.language).region;
    if (region) return countryFromCode(region);
  } catch {
    /* fall through */
  }
  return COUNTRIES[0];
}

/** £75 base converted via the store's rate table, rounded to a clean figure. */
export function freeShippingThreshold(currency: string): number {
  const raw = convertPrice(FREE_SHIPPING_GBP, "GBP", currency);
  const step = raw >= 500 ? 25 : 5;
  return Math.round(raw / step) * step;
}

export function freeShippingThresholdFmt(currency: string): string {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(freeShippingThreshold(currency));
}

// Single in-flight detection shared across all consumers
let detectPromise: Promise<Country> | null = null;

/**
 * The shopper's shipping country: detects once (persisted thereafter),
 * keeps the store's display currency in sync, and lets any component
 * (popup picker, etc.) update it.
 */
export function useShippingCountry() {
  const country = usePreferences((s) => s.shippingCountry);
  const setShippingCountry = usePreferences((s) => s.setShippingCountry);

  useEffect(() => {
    if (country) return;
    if (!detectPromise) detectPromise = detectCountry();
    let cancelled = false;
    detectPromise.then((c) => {
      if (!cancelled) setShippingCountry(c);
    });
    return () => {
      cancelled = true;
    };
  }, [country, setShippingCountry]);

  return {
    country: country ?? COUNTRIES[0],
    ready: country !== null,
    setCountry: setShippingCountry,
  };
}
