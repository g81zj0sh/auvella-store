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
  { code: "GB", name: "United Kingdom", the: true, days: "5 – 12", currency: "GBP" },
  { code: "US", name: "United States", the: true, days: "3 – 8", currency: "USD" },
  { code: "DE", name: "Germany", days: "5 – 12", currency: "EUR" },
  { code: "CA", name: "Canada", days: "5 – 12", currency: "CAD" },
  { code: "NZ", name: "New Zealand", days: "5 – 12", currency: "NZD" },
  { code: "AU", name: "Australia", days: "5 – 12", currency: "AUD" },
  { code: "IE", name: "Ireland", days: "5 – 12", currency: "EUR" },
  { code: "SE", name: "Sweden", days: "5 – 12", currency: "SEK" },
  { code: "NL", name: "Netherlands", the: true, days: "5 – 12", currency: "EUR" },
  { code: "SG", name: "Singapore", days: "5 – 12", currency: "SGD" },
  { code: "IT", name: "Italy", days: "5 – 12", currency: "EUR" },
  { code: "DK", name: "Denmark", days: "5 – 12", currency: "DKK" },
  { code: "BE", name: "Belgium", days: "5 – 12", currency: "EUR" },
  { code: "AT", name: "Austria", days: "5 – 12", currency: "EUR" },
  { code: "PL", name: "Poland", days: "5 – 12", currency: "PLN" },
  { code: "ES", name: "Spain", days: "5 – 12", currency: "EUR" },
  { code: "NO", name: "Norway", days: "5 – 12", currency: "NOK" },
  { code: "AE", name: "United Arab Emirates", the: true, days: "5 – 12", currency: "AED" },
  { code: "CH", name: "Switzerland", days: "5 – 12", currency: "CHF" },
];

export const DEFAULT_DAYS = "5 – 12";
const FREE_SHIPPING_GBP = 75;

export function countryFromCode(code?: string, fallbackName?: string): Country {
  const known = COUNTRIES.find((c) => c.code === (code ?? "").toUpperCase());
  if (known) return known;
  let name = fallbackName;
  if (!name && code) {
    try {
      name = new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? undefined;
    } catch {
      /* noop */
    }
  }
  if (!name) return COUNTRIES[0]; // UK default — Auvella's home market
  const needsThe = /^(united|netherlands|philippines|czech|bahamas|maldives|gambia)/i.test(name);
  return { code: code ?? "??", name, the: needsThe, days: DEFAULT_DAYS, currency: "GBP" };
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
