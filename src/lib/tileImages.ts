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
  "invisible-front-buckle-strapless-bra": {
    "Nude": "/tiles/invisible-front-buckle-strapless-bra-nude.webp",
  },
  "high-waist-shaping-shorts-with-lace-trim": {
    "Black": "/tiles/high-waist-shaping-shorts-with-lace-trim-black.webp",
  },
  "auvella-long-sleeve-sculpting-bodysuit": {
    "White": "/tiles/auvella-long-sleeve-sculpting-bodysuit-white.webp",
  },
  "auvella-seamless-comfort-bralette": {
    "Brown": "/tiles/auvella-seamless-comfort-bralette-brown.webp",
  },
  "fleece-lined-drawstring-lounge-set": {
    "White": "/tiles/fleece-lined-drawstring-lounge-set-white.webp",
  },
  "satin-cami-pajama-set": {
    "Red": "/tiles/satin-cami-pajama-set-red.webp",
  },
  "satin-long-sleeve-pajama-set": {
    "Black": "/tiles/satin-long-sleeve-pajama-set-black.webp",
  },
  "seamless-sculpt-sports-bra": {
    "Cherry Red": "/tiles/seamless-sculpt-sports-bra-cherry-red.webp",
  },
  "v-neck-bodycon-mini-dress": {
    "Blue": "/tiles/v-neck-bodycon-mini-dress-blue.webp",
  },
  "ribbed-short-sleeve-mini-dress": {
    "White": "/tiles/ribbed-short-sleeve-mini-dress-white.webp",
  },
  "long-sleeve-sculpt-maxi-dress": {
    "Navy Blue": "/tiles/long-sleeve-sculpt-maxi-dress-navy-blue.webp",
  },
  "strapless-slim-fit-bodysuit": {
    "Black": "/tiles/strapless-slim-fit-bodysuit-black.webp",
  },
  "cotton-lace-brief": {
    "Black": "/tiles/cotton-lace-brief-black.webp",
  },
  "long-sleeve-zip-one-piece-swimsuit": {
    "Print": "/tiles/long-sleeve-zip-one-piece-swimsuit-print.webp",
  },
  "high-waist-body-shaping-shorts": {
    "Black": "/tiles/high-waist-body-shaping-shorts-black.webp",
  },
  "womens-velvet-jumpsuit-long-sleeve-square-neck": {
    "Black": "/tiles/womens-velvet-jumpsuit-long-sleeve-squar-black.webp",
  },
  "strapless-tummy-control-body-shaper": {
    "Black": "/tiles/strapless-tummy-control-body-shaper-black.webp",
  },
  "lace-breathable-thong-underwear": {
    "White": "/tiles/lace-breathable-thong-underwear-white.webp",
  },
  "seamless-sculpting-bodysuit": {
    "Black": "/tiles/seamless-sculpting-bodysuit-black.webp",
  },
  "slim-fit-long-sleeve-top": {
    "Black": "/tiles/slim-fit-long-sleeve-top-black.webp",
  },
  "sleeveless-ribbed-midi-dress": {
    "White": "/tiles/sleeveless-ribbed-midi-dress-white.webp",
  },
  "u-neck-slit-maxi-dress": {
    "Black": "/tiles/u-neck-slit-maxi-dress-black.webp",
  },
  "off-shoulder-sculpt-midi-dress": {
    "Black": "/tiles/off-shoulder-sculpt-midi-dress-black.webp",
  },
  "solid-colour-bikini-set": {
    "White": "/tiles/solid-colour-bikini-set-white.webp",
  },
  "ribbed-cut-out-one-piece-swimsuit": {
    "Black": "/tiles/ribbed-cut-out-one-piece-swimsuit-black.webp",
  },
  "long-sleeve-lounge-set-with-built-in-bra": {
    "Grey": "/tiles/long-sleeve-lounge-set-with-built-in-bra-grey.webp",
  },
  "womens-tie-side-triangle-bikini-set": {
    "White": "/tiles/womens-tie-side-triangle-bikini-set-white.webp",
  },
  "womens-high-waisted-ruched-bikini-bottoms": {
    "Black": "/tiles/womens-high-waisted-ruched-bikini-bottom-black.webp",
  },
  "satin-tie-waist-robe": {
    "Watermelon Red": "/tiles/satin-tie-waist-robe-watermelon-red.webp",
  },
  "seamless-shaping-long-sleeve-bodysuit": {
    "Black": "/tiles/seamless-shaping-long-sleeve-bodysuit-black.webp",
  },
  "womens-high-waisted-breathable-traceless-thong-panties": {
    "Black": "/tiles/womens-high-waisted-breathable-traceless-black.webp",
  },
  "maternity-nursing-bra-front-opening-push-up": {
    "Black": "/tiles/maternity-nursing-bra-front-opening-push-black.webp",
  },
  "womens-swimwear": {
    "Beige": "/tiles/womens-swimwear-beige.webp",
  },
  "lace-scoop-bralette-comfortable-seamless-underwear": {
    "Pink": "/tiles/lace-scoop-bralette-comfortable-seamless-pink.webp",
  },
  "womens-one-piece-diamond-swimsuit": {
    "Pink": "/tiles/womens-one-piece-diamond-swimsuit-pink.webp",
  },
  "womens-two-piece-swimsuit": {
    "White": "/tiles/womens-two-piece-swimsuit-white.webp",
  },
  "womens-lace-long-sleeve-dress": {
    "White": "/tiles/womens-lace-long-sleeve-dress-white.webp",
  },
  "jelly-cup-multi-way-strapless-bra": {
    "Black": "/tiles/jelly-cup-multi-way-strapless-bra-black.webp",
  },
  "womens-bra": {
    "Off-White": "/tiles/womens-bra-off-white.webp",
  },
  "waist-shaping-fitness-body-shaper": {
    "Black": "/tiles/waist-shaping-fitness-body-shaper-black.webp",
  },
  "high-waisted-tummy-control-shaping-pants": {
    "Black": "/tiles/high-waisted-tummy-control-shaping-pants-black.webp",
  },
  "women-asymmetric-long-sleeve-t-shirt-and-wide-leg-pants-set": {
    "Black": "/tiles/women-asymmetric-long-sleeve-t-shirt-and-black.webp",
  },
  "seamless-tummy-control-body-shaper-cami": {
    "Black": "/tiles/seamless-tummy-control-body-shaper-cami-black.webp",
  },
  "womens-menstrual-period-panties": {
    "Black": "/tiles/womens-menstrual-period-panties-black.webp",
  },
  "seamless-support-bra-with-tummy-control": {
    "Nude": "/tiles/seamless-support-bra-with-tummy-control-nude.webp",
  },
};
