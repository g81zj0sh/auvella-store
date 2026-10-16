/*
 * Renamed colour options (v197, 17 Oct 2026). The supplier's names didn't
 * match its own photos (its original shots show the same colours as ours),
 * so these were renamed in Shopify to what the garment actually is. Old
 * name -> new name, per product. The site's colour-keyed data (GALLERY_INDEX,
 * TILE_IMAGES) uses the new names; every lookup goes through canonicalColour,
 * so the site works the same before and after the Shopify rename and old
 * ?colour= links (ads, emails, shares) still open the right colour.
 */
export const RENAMED_COLOURS: Record<string, Record<string, string>> = {
  "womens-high-waisted-ruched-bikini-bottoms": { "Sky Blue": "Turquoise", "Royal Blue": "Petrol Blue", "Glitter": "Hot Pink" },
  "seamless-sculpt-sports-bra": { "Navy Blue": "Petrol Blue" },
  "sleeveless-ribbed-midi-dress": { "Khaki": "Beige" },
  "long-sleeve-zip-one-piece-swimsuit": { "Royal Blue": "Navy Palm" },
};

/** The current name for a colour, given either its old or its new name. */
export function canonicalColour(handle: string, colour: string): string {
  const map = RENAMED_COLOURS[handle];
  return map && Object.prototype.hasOwnProperty.call(map, colour) ? map[colour] : colour;
}
