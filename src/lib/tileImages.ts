/*
 * Collection-tile photos: the product's own model in a natural pose (hand on
 * hip, weight on one leg...) rather than standing square to the camera, as on
 * skims.com. One per product and colour, made by editing that colour's own
 * model front shot so the woman and the garment stay the same. Used ONLY by
 * the collection tile; the product page keeps its normal photos.
 *
 * TILE_IMAGES[handle][colour] = path under /public.
 */
export const TILE_IMAGES: Record<string, Record<string, string>> = {
  // Test product (4 Oct 2026), pending Joshua's go for the rest.
  "one-piece-shapewear-bodysuit-with-tummy-control": {
    Black: "/tiles/tummy-control-bodysuit-black.webp",
    Nude: "/tiles/tummy-control-bodysuit-nude.webp",
    Brown: "/tiles/tummy-control-bodysuit-brown.webp",
  },
};
