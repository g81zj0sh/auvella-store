import { BF_TIERS, bfTotal, inBlackFriday, useBlackFriday } from "@/lib/blackFriday";

/*
 * v239 (the ads chat's pricing brief, 26 Nov 2026): one rule for every price
 * the site shows for a single item - product cards, collection grids, search,
 * "We Think You'd Like", quick add, the bag's suggestions and the product page.
 *
 * - Never Shopify's compare-at price: it made every product look permanently
 *   on sale (£58.99 struck beside £34.99), which shoppers read as a fake sale.
 * - Today's price, unless a live automatic discount applies to ONE item: Black
 *   Friday's 20% off a bodysuit (lib/blackFriday, until Mon 30 Nov 23:59 UK).
 *   Then that price, with today's price struck - the product page's own sum
 *   (bfTotal: Shopify's per-item rounding, so £34.99 shows £28.00).
 * - From Tue 1 Dec nothing applies to a single item - December's second
 *   bodysuit half price needs two and shows in the bag - so nothing is struck.
 * - Bag lines show today's price; the bag's discount lines carry the saving.
 */
export function oneItemPrice(
  handle: string | null | undefined,
  unit: number,
  blackFriday: boolean,
): number | null {
  if (!blackFriday || !inBlackFriday(handle) || !(unit > 0)) return null;
  return bfTotal([unit], BF_TIERS[0].percent);
}

/** The hook form, hydration-safe (lib/blackFriday's clock): (handle, today's
 *  unit price) -> the live price for one, or null when nothing applies. */
export function useOneItemPrice(): (handle: string | null | undefined, unit: number) => number | null {
  const blackFriday = useBlackFriday();
  return (handle, unit) => oneItemPrice(handle, unit, blackFriday);
}

/** Screen-reader words for the two figures, as on the product page. */
export const LIVE_PRICE_LABEL = "Black Friday price ";
export const TODAY_PRICE_LABEL = "Today's price ";
