import { BF_END, DEC_END, inBlackFriday, useSalePhase } from "@/lib/blackFriday";

/*
 * December 2026: second bodysuit half price (v238, the ads chat's brief of
 * 23 Nov 2026).
 *
 * One Shopify automatic discount, no code needed (checked 23 Nov 2026,
 * SCHEDULED): "December: second bodysuit half price"
 * (DiscountAutomaticNode/1759802556711), a Buy X Get Y on the Bodysuits
 * collection - buy 1, get 1 at 50% off, no limit per order, so every second
 * bodysuit is half price and, at different prices, the cheaper one is.
 * Tue 1 Dec 00:00 to Thu 31 Dec 23:59:59 UK (GMT, so UTC). It combines with
 * shipping discounts (free delivery on 2+ still works) but with no other
 * product or order discount: Shopify applies whichever saves the shopper more.
 *
 * The site's wording follows the same clock as Black Friday (lib/blackFriday:
 * the "december" phase, BF_END to DEC_END). While it runs, bodysuit pages
 * drop their Multi-buy cards (the half-price offer replaces them); other
 * products keep theirs. If the Shopify discount changes, change this file in
 * the same release.
 *
 * UK rules (CMA, DMCC Act): any saving is shown against today's price, never
 * the compare-at; the end is the real one; no countdown.
 */

export const DEC_START = BF_END;
export { DEC_END };

/** The bodysuits: the Shopify Bodysuits collection, the same 8 as Black Friday. */
export function isBodysuit(handle: string | null | undefined): boolean {
  return inBlackFriday(handle);
}

/** Shopify's title on the cart line (lower case for matching). */
export const DEC_SHOPIFY_TITLE = "december: second bodysuit half price";
export function isDecemberTitle(label: string): boolean {
  return label.trim().toLowerCase() === DEC_SHOPIFY_TITLE;
}
/** The bag's label for the saving: Shopify's own title. */
export const DEC_LABEL = "December: second bodysuit half price";

/** The real end, in UK time. */
export const DEC_ENDS = "Thu 31 Dec";

/** The brief's wording. */
export const DEC_BAR_MESSAGE = `Second bodysuit half price · until ${DEC_ENDS}`;
export const DEC_PDP_LINE = "Add a second bodysuit and it's half price.";
export const DEC_FAQ = `Until ${DEC_ENDS}: add a second bodysuit and it's half price. Any of our bodysuits count, in any sizes or colours; if the two cost different amounts, the cheaper one is half price. The saving is applied automatically in your bag.`;
/** The homepage still (ads chat, 24 Nov 2026), in place of the Multi-buy's
 *  "10% off two. 15% off three or more"; from Fri 1 Jan the Multi-buy's
 *  words come back by themselves. Its small print takes the brief's own rule,
 *  as the Multi-buy's "one style" doesn't apply to this offer. */
export const DEC_HERO_LINES = ["Second bodysuit half price.", `Until ${DEC_ENDS}.`] as const;
export const DEC_HERO_NOTE = "Mix any bodysuits. If they're different prices, the cheaper one is half price.";

/** The bag's line for the bodysuits in it (brief). */
export function decBagLine(bodysuits: number): string | null {
  if (bodysuits <= 0) return null;
  return bodysuits === 1 ? "Add another bodysuit and it's half price." : "Second bodysuit half price applied.";
}

/**
 * What the offer takes off these bodysuit unit prices, as Shopify does: one in
 * every two is half price, the cheapest ones first. Half of an odd penny
 * amount rounds the discount down (the brief's figure: two Long Sleeves at
 * £34.99 come to £52.49, £34.99 + £17.50) - re-checked against Shopify's
 * own checkout on 1 Dec, the first day the discount runs.
 */
export function decSaving(units: number[]): number {
  const pennies = units.map((u) => Math.round(u * 100)).sort((a, b) => a - b);
  const halves = Math.floor(pennies.length / 2);
  let off = 0;
  for (let i = 0; i < halves; i++) off += Math.floor(pennies[i] / 2);
  return off / 100;
}

/** True while the December offer runs (hydration-safe, by the clock). */
export function useDecemberOffer(): boolean {
  return useSalePhase() === "december";
}
