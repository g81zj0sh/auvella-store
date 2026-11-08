import { useSyncExternalStore } from "react";
import type { MultiBuyTier } from "@/lib/duoDeal";

/*
 * Black Friday 2026 (v231, owner's brief of 7 Nov 2026 from the ads chat).
 *
 * Three Shopify automatic discounts on the Bodysuits collection, no code
 * needed (checked in Shopify 8 Nov 2026, all SCHEDULED):
 *   "Black Friday: 20% off bodysuits"    any bodysuit  DiscountAutomaticNode/1757049618727
 *   "Black Friday: 30% off 2 bodysuits"  2+ bodysuits  DiscountAutomaticNode/1757049651495
 *   "Black Friday: 40% off 3+ bodysuits" 3+ bodysuits  DiscountAutomaticNode/1757049684263
 * Fri 20 Nov 00:00 to Mon 30 Nov 23:59:59 UK time (GMT then, so UTC).
 * Shopify gives the best tier; only bodysuits count towards the 2 or 3, and
 * different bodysuits count together. They combine with shipping discounts
 * (the 2+ free delivery) and with product discounts on other lines - not
 * with order discounts (WELCOME10, AUVELLA10) or the creator codes; the
 * shopper gets whichever saving is bigger. The normal Multi-buy (10% / 15%,
 * lib/duoDeal) stays on: the Black Friday tier beats it at every quantity.
 * The free gifts (lib/perks) work as they always do.
 *
 * The site shows the Black Friday wording only between those times. The
 * clock below switches it - never a hand - and the normal wording comes back
 * by itself at 00:00 on Tue 1 Dec; nothing to do in Shopify then either. If
 * the Shopify discounts change, change this file in the same release.
 *
 * UK rules (CMA, DMCC Act): the saving is shown against today's price, never
 * the compare-at; the end is the real one and is never extended; no countdown
 * or stock claims.
 */

export const BF_START = Date.parse("2026-11-20T00:00:00Z");
/** The first moment after the sale (Shopify's discounts end at 23:59:59). */
export const BF_END = Date.parse("2026-12-01T00:00:00Z");

/** The Bodysuits collection the three discounts cover (Shopify, 8 Nov 2026). */
export const BF_HANDLES: readonly string[] = [
  "seamless-shaping-long-sleeve-bodysuit",
  "strapless-tummy-control-body-shaper",
  "seamless-tummy-control-body-shaper-cami",
  "waist-shaping-fitness-body-shaper",
  "seamless-sculpting-bodysuit",
  "strapless-slim-fit-bodysuit",
  "auvella-long-sleeve-sculpting-bodysuit",
  "one-piece-shapewear-bodysuit-with-tummy-control",
];

export function inBlackFriday(handle: string | null | undefined): boolean {
  return !!handle && BF_HANDLES.includes(handle);
}

/** The tiers, as the product page's multi-buy cards show them. */
export const BF_TIERS: MultiBuyTier[] = [
  { quantity: 1, percent: 20 },
  { quantity: 2, percent: 30 },
  { quantity: 3, percent: 40, orMore: true },
];

/** The rate on every bodysuit when the bag holds this many bodysuits. */
export function bfPercentFor(bodysuits: number): number {
  if (bodysuits >= 3) return 40;
  if (bodysuits === 2) return 30;
  return bodysuits === 1 ? 20 : 0;
}

/** What checkout charges for these unit prices at a rate: Shopify takes the
 *  percentage off the line and rounds to the penny. The brief's own figures:
 *  Long Sleeve £34.99 is £27.99 for one, £48.99 for two, £62.98 for three. */
export function bfTotal(units: number[], percent: number): number {
  const pennies = Math.round(units.reduce((s, u) => s + u, 0) * 100);
  return (pennies - Math.round((pennies * percent) / 100)) / 100;
}

/** The three discounts' titles as Shopify puts them on cart lines (lower case). */
export const BF_SHOPIFY_TITLES = [
  "black friday: 20% off bodysuits",
  "black friday: 30% off 2 bodysuits",
  "black friday: 40% off 3+ bodysuits",
];

export function isBlackFridayTitle(label: string): boolean {
  return BF_SHOPIFY_TITLES.includes(label.trim().toLowerCase());
}

/** The bag's label for a mirrored saving, before Shopify's own lines arrive. */
export function bfLabel(percent: number): string {
  return percent >= 40
    ? "Black Friday: 40% off 3+ bodysuits"
    : percent >= 30
      ? "Black Friday: 30% off 2 bodysuits"
      : "Black Friday: 20% off bodysuits";
}

/** The real end, in UK time. */
export const BF_ENDS = "Mon 30 Nov, 23:59 UK";

/** The announcement bar: the brief's line in parts that fit a phone. */
export const BF_BAR_MESSAGES = [
  "Black Friday: 20% off any bodysuit",
  "30% off 2 · 40% off 3+ bodysuits",
  `Black Friday ends ${BF_ENDS}`,
];

/** The bag's tier progress, from the bodysuits in it. */
export function bfBagLine(bodysuits: number): string | null {
  if (bodysuits <= 0) return null;
  if (bodysuits === 1) return "Add 1 more bodysuit for 30% off both";
  if (bodysuits === 2) return "Add 1 more for 40% off all 3";
  return "40% off unlocked: your best Black Friday price";
}

/** When a shopper's code loses to the Black Friday price (brief). */
export const BF_CODE_NOTE = "Your Black Friday price is already better than this code.";

/* ------------------------------------------------------------------ */
/* The switch                                                          */
/* ------------------------------------------------------------------ */

export type SalePhase = "before" | "on" | "after";

export function salePhaseAt(now: number): SalePhase {
  return now < BF_START ? "before" : now < BF_END ? "on" : "after";
}

const ORDER: Record<SalePhase, number> = { before: 0, on: 1, after: 2 };

/* The server renders with its own clock and writes the phase on <html>
   (data-sale, __root), and the edge cache keeps one copy per phase
   (server.ts), so no cached page outlives a switch. The browser starts from
   the phase the page was rendered with - so hydration always matches, even
   on a device whose clock is wrong - and moves on by itself at the switch if
   the page is still open. It never moves back. */
const ATTRIBUTE = "data-sale";

function renderedPhase(): SalePhase {
  if (typeof document === "undefined") return salePhaseAt(Date.now());
  const v = document.documentElement.getAttribute(ATTRIBUTE);
  return v === "before" || v === "on" || v === "after" ? v : salePhaseAt(Date.now());
}

let phase: SalePhase | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | undefined;

function currentPhase(): SalePhase {
  // The Worker keeps modules between requests: the server never caches it.
  if (typeof document === "undefined") return salePhaseAt(Date.now());
  if (phase === null) phase = renderedPhase();
  return phase;
}

function schedule() {
  clearTimeout(timer);
  const p = currentPhase();
  const at = p === "before" ? BF_START : p === "on" ? BF_END : null;
  if (at === null) return;
  // Long waits are capped (setTimeout's limit); a recheck simply schedules again.
  timer = setTimeout(recheck, Math.min(Math.max(0, at - Date.now()) + 50, 2 ** 31 - 1));
}

function recheck() {
  const p = currentPhase();
  const clock = salePhaseAt(Date.now());
  if (ORDER[clock] > ORDER[p]) {
    phase = clock;
    for (const l of listeners) l();
  }
  schedule();
}

function onVisible() {
  // A phone asleep over the switch: its timer can fire late, or not at all.
  if (document.visibilityState === "visible") recheck();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    recheck();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", recheck);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", recheck);
    }
  };
}

/** "before", "on" or "after" Black Friday, hydration-safe. */
export function useSalePhase(): SalePhase {
  return useSyncExternalStore(subscribe, currentPhase, renderedPhase);
}

/** True while the Black Friday discounts run. */
export function useBlackFriday(): boolean {
  return useSalePhase() === "on";
}

export { ATTRIBUTE as SALE_PHASE_ATTRIBUTE };
