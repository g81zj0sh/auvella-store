import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SizeRegion } from "@/lib/sizeRegions";

export type LanguageCode =
  | "en" | "fr" | "es" | "de" | "it" | "nl" | "pt" | "ar" | "zh" | "ja";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  short: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", short: "English" },
  { code: "fr", label: "Français", short: "Français" },
  { code: "es", label: "Español", short: "Español" },
  { code: "de", label: "Deutsch", short: "Deutsch" },
  { code: "it", label: "Italiano", short: "Italiano" },
  { code: "nl", label: "Nederlands", short: "Nederlands" },
  { code: "pt", label: "Português", short: "Português" },
  { code: "ar", label: "العربية", short: "العربية" },
  { code: "zh", label: "中文", short: "中文" },
  { code: "ja", label: "日本語", short: "日本語" },
];

export interface CurrencyOption {
  code: string; // ISO currency
  country: string; // display country
  symbol: string;
  flag: string; // simple emoji flag for the label
}

export const CURRENCIES: CurrencyOption[] = [
  { code: "GBP", country: "United Kingdom", symbol: "£", flag: "🇬🇧" },
  { code: "USD", country: "United States", symbol: "$", flag: "🇺🇸" },
  { code: "CAD", country: "Canada", symbol: "CA$", flag: "🇨🇦" },
  { code: "AUD", country: "Australia", symbol: "A$", flag: "🇦🇺" },
  { code: "EUR", country: "Eurozone", symbol: "€", flag: "🇪🇺" },
  { code: "CHF", country: "Switzerland", symbol: "CHF", flag: "🇨🇭" },
  { code: "SEK", country: "Sweden", symbol: "SEK", flag: "🇸🇪" },
  { code: "NOK", country: "Norway", symbol: "NOK", flag: "🇳🇴" },
  { code: "DKK", country: "Denmark", symbol: "DKK", flag: "🇩🇰" },
  { code: "AED", country: "United Arab Emirates", symbol: "AED", flag: "🇦🇪" },
  { code: "SAR", country: "Saudi Arabia", symbol: "SAR", flag: "🇸🇦" },
  { code: "JPY", country: "Japan", symbol: "¥", flag: "🇯🇵" },
  { code: "NZD", country: "New Zealand", symbol: "NZ$", flag: "🇳🇿" },
  { code: "SGD", country: "Singapore", symbol: "S$", flag: "🇸🇬" },
  { code: "PLN", country: "Poland", symbol: "zł", flag: "🇵🇱" },
];

/**
 * Exchange rates relative to GBP (1 GBP = X currency).
 * Centralized so rates can be updated in one place, or replaced with a live
 * fetch later without touching call sites.
 */
export const RATES_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 1.27,
  CAD: 1.73,
  AUD: 1.92,
  EUR: 1.17,
  CHF: 1.12,
  SEK: 13.3,
  NOK: 13.6,
  DKK: 8.7,
  AED: 4.66,
  SAR: 4.76,
  JPY: 192,
  NZD: 2.15,
  SGD: 1.71,
  PLN: 5.05,
};

export function convertPrice(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = RATES_TO_GBP[fromCurrency.toUpperCase()];
  const to = RATES_TO_GBP[toCurrency.toUpperCase()];
  if (!from || !to) return amount;
  const inGbp = amount / from;
  return inGbp * to;
}

export function formatPrice(amount: number, currencyCode: string): string {
  const opt = CURRENCIES.find((c) => c.code === currencyCode.toUpperCase());
  const symbol = opt?.symbol ?? currencyCode + " ";
  const noDecimals = currencyCode.toUpperCase() === "JPY";
  const n = noDecimals ? Math.round(amount) : amount;
  const formatted = n.toLocaleString("en-US", {
    minimumFractionDigits: noDecimals ? 0 : 2,
    maximumFractionDigits: noDecimals ? 0 : 2,
  });
  // For multi-letter symbols add a space; for £ $ € use no space.
  const tight = /^[£$€¥]$/.test(symbol) || symbol.endsWith("$");
  return tight ? `${symbol}${formatted}` : `${symbol} ${formatted}`;
}

export interface ShippingCountry {
  code: string;
  name: string;
  the?: boolean;
  days: string;
  currency: string;
}

interface PreferencesState {
  language: LanguageCode;
  currency: string;
  shippingCountry: ShippingCountry | null;
  setLanguage: (l: LanguageCode) => void;
  sizeRegion: SizeRegion;
  setSizeRegion: (r: SizeRegion) => void;
  setCurrency: (c: string) => void;
  setShippingCountry: (c: ShippingCountry) => void;
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      language: "en",
      currency: "GBP",
      shippingCountry: null,
      setLanguage: (language) => set({ language }),
      sizeRegion: "UK",
      setSizeRegion: (sizeRegion) => set({ sizeRegion }),
      setCurrency: (currency) => set({ currency }),
      setShippingCountry: (shippingCountry) =>
        set({
          shippingCountry,
          // Currency follows the country at the moment it's chosen/detected —
          // manual currency picks afterwards are respected (no mount-time resync).
          currency: CURRENCIES.some((c) => c.code === shippingCountry.currency)
            ? shippingCountry.currency
            : "GBP",
        }),
    }),
    {
      name: "auvella-preferences",
      storage: createJSONStorage(() => localStorage),
      // Persisted values diverge from SSR defaults (GBP/en) and cause hydration
      // mismatches if applied during initial client render. Rehydrate manually
      // after mount (see RootComponent).
      skipHydration: true,
    },
  ),
);

/** Convenience hook: takes a Shopify price and returns the localized display string. */
export function useDisplayPrice() {
  const currency = usePreferences((s) => s.currency);
  return (amount: string | number, fromCurrency: string) => {
    const n = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!isFinite(n)) return "";
    const converted = convertPrice(n, fromCurrency, currency);
    return formatPrice(converted, currency);
  };
}

// ---------------- i18n ----------------
import { getEnglishSource, translate } from "./translations";

export function useT() {
  const language = usePreferences((s) => s.language);
  return (key: string) => translate(key, language);
}

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
  "CODE", "PRE", "SVG", "PATH", "CIRCLE", "VIDEO", "AUDIO", "CANVAS",
]);

function shouldSkip(node: Node): boolean {
  let el: Node | null = node.parentNode;
  while (el && el.nodeType === 1) {
    const e = el as HTMLElement;
    if (SKIP_TAGS.has(e.tagName)) return true;
    if (e.hasAttribute("data-no-translate")) return true;
    if (e.getAttribute("contenteditable") === "true") return true;
    el = e.parentNode;
  }
  return false;
}

const ORIGINAL = new WeakMap<Text, string>();
const LAST_WRITTEN = new WeakMap<Text, string>();

let currentLang: LanguageCode = "en";

export function usePreferencesHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    typeof window === "undefined" ? false : (usePreferences.persist?.hasHydrated() ?? false),
  );
  useEffect(() => {
    const persistApi = usePreferences.persist;
    if (!persistApi) {
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) {
      setHydrated(true);
    }
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}

function computeTarget(orig: string, lang: LanguageCode): string {
  const trimmed = orig.trim();
  if (!trimmed) return orig;
  const leading = orig.match(/^\s*/)?.[0] ?? "";
  const trailing = orig.match(/\s*$/)?.[0] ?? "";
  const translated = lang === "en" ? trimmed : translate(trimmed, lang);
  return leading + translated + trailing;
}

function normalizeToEnglish(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  const english = getEnglishSource(trimmed);
  if (!english) return value;
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return leading + english + trailing;
}

function setNodeValue(node: Text, value: string) {
  LAST_WRITTEN.set(node, value);
  node.nodeValue = value;
}

function ensureBaseline(node: Text): string | null {
  if (shouldSkip(node)) return null;
  let orig = ORIGINAL.get(node);
  const current = node.nodeValue ?? "";
  if (orig === undefined) {
    if (!current.trim()) return null;
    orig = currentLang === "en" ? current : normalizeToEnglish(current);
    ORIGINAL.set(node, orig);
  } else {
    if (currentLang !== "en") {
      const normalizedOrig = normalizeToEnglish(orig);
      if (normalizedOrig !== orig) {
        orig = normalizedOrig;
        ORIGINAL.set(node, orig);
      }
    }
  }
  return orig;
}

function translateNode(node: Text) {
  const orig = ensureBaseline(node);
  if (orig === null) return;
  const next = computeTarget(orig, currentLang);
  if (node.nodeValue !== next) setNodeValue(node, next);
}

function walkAndTranslate(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = walker.nextNode();
  while (n) {
    translateNode(n as Text);
    n = walker.nextNode();
  }
}

function handleExternalMutation(node: Text) {
  if (shouldSkip(node)) return;
  const value = node.nodeValue ?? "";
  if (LAST_WRITTEN.get(node) === value) return;
  if (currentLang === "en") {
    ORIGINAL.set(node, value);
    return;
  }
  const prevOrig = ORIGINAL.get(node);
  if (prevOrig !== undefined) {
    const normalizedValue = normalizeToEnglish(value);
    const normalizedPrevOrig = normalizeToEnglish(prevOrig);
    // If React just wrote the English source or its current-lang translation,
    // baseline is still valid — just re-apply translation.
    if (normalizedValue === normalizedPrevOrig || value === computeTarget(normalizedPrevOrig, currentLang)) {
      ORIGINAL.set(node, normalizedPrevOrig);
      translateNode(node);
      return;
    }
    // Genuine new English source — reset baseline.
    ORIGINAL.delete(node);
  }
  translateNode(node);
}

/**
 * Global DOM translator. Walks text nodes and swaps them to the selected
 * language. Layout always stays LTR.
 */
export function useDomTranslation() {
  const language = usePreferences((s) => s.language);
  const hydrated = usePreferencesHydrated();
  useEffect(() => {
    if (!hydrated) return;
    if (typeof document === "undefined") return;
    currentLang = language;
    document.documentElement.lang = language;
    document.documentElement.dir = "ltr";

    walkAndTranslate(document.body);

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData" && r.target.nodeType === 3) {
          handleExternalMutation(r.target as Text);
        } else if (r.type === "childList") {
          r.addedNodes.forEach((n) => {
            if (n.nodeType === 3) translateNode(n as Text);
            else if (n.nodeType === 1) walkAndTranslate(n);
          });
        }
      }
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => mo.disconnect();
  }, [hydrated, language]);
}



