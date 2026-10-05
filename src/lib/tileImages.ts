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
    "Black": "/tiles/invisible-front-buckle-strapless-bra-black.webp",
    "Nude": "/tiles/invisible-front-buckle-strapless-bra-nude.webp",
  },
  "high-waist-shaping-shorts-with-lace-trim": {
    "Nude": "/tiles/high-waist-shaping-shorts-with-lace-trim-nude.webp",
    "Black": "/tiles/high-waist-shaping-shorts-with-lace-trim-black.webp",
  },
  "auvella-long-sleeve-sculpting-bodysuit": {
    "Nude": "/tiles/auvella-long-sleeve-sculpting-bodysuit-nude.webp",
    "Coffee": "/tiles/auvella-long-sleeve-sculpting-bodysuit-coffee.webp",
    "Black": "/tiles/auvella-long-sleeve-sculpting-bodysuit-black.webp",
    "White": "/tiles/auvella-long-sleeve-sculpting-bodysuit-white.webp",
  },
  "auvella-seamless-comfort-bralette": {
    "Nude": "/tiles/auvella-seamless-comfort-bralette-nude.webp",
    "Black": "/tiles/auvella-seamless-comfort-bralette-black.webp",
    "Grey": "/tiles/auvella-seamless-comfort-bralette-grey.webp",
    "Brown": "/tiles/auvella-seamless-comfort-bralette-brown.webp",
  },
  "fleece-lined-drawstring-lounge-set": {
    "Black": "/tiles/fleece-lined-drawstring-lounge-set-black.webp",
    "Grey": "/tiles/fleece-lined-drawstring-lounge-set-grey.webp",
    "Pink": "/tiles/fleece-lined-drawstring-lounge-set-pink.webp",
    "White": "/tiles/fleece-lined-drawstring-lounge-set-white.webp",
  },
  "satin-cami-pajama-set": {
    "Pink": "/tiles/satin-cami-pajama-set-pink.webp",
    "Navy Blue": "/tiles/satin-cami-pajama-set-navy-blue.webp",
    "Black": "/tiles/satin-cami-pajama-set-black.webp",
    "Red": "/tiles/satin-cami-pajama-set-red.webp",
  },
  "satin-long-sleeve-pajama-set": {
    "Champagne": "/tiles/satin-long-sleeve-pajama-set-champagne.webp",
    "Berry Fuchsia": "/tiles/satin-long-sleeve-pajama-set-berry-fuchsia.webp",
    "Navy": "/tiles/satin-long-sleeve-pajama-set-navy.webp",
    "Black": "/tiles/satin-long-sleeve-pajama-set-black.webp",
  },
  "seamless-sculpt-sports-bra": {
    "Navy Blue": "/tiles/seamless-sculpt-sports-bra-navy-blue.webp",
    "Clay": "/tiles/seamless-sculpt-sports-bra-clay.webp",
    "Plum Purple": "/tiles/seamless-sculpt-sports-bra-plum-purple.webp",
    "Cherry Red": "/tiles/seamless-sculpt-sports-bra-cherry-red.webp",
  },
  "v-neck-bodycon-mini-dress": {
    "Aqua Blue": "/tiles/v-neck-bodycon-mini-dress-aqua-blue.webp",
    "Black": "/tiles/v-neck-bodycon-mini-dress-black.webp",
    "Blue": "/tiles/v-neck-bodycon-mini-dress-blue.webp",
  },
  "ribbed-short-sleeve-mini-dress": {
    "Brown": "/tiles/ribbed-short-sleeve-mini-dress-brown.webp",
    "Black": "/tiles/ribbed-short-sleeve-mini-dress-black.webp",
    "Dark Grey": "/tiles/ribbed-short-sleeve-mini-dress-dark-grey.webp",
    "White": "/tiles/ribbed-short-sleeve-mini-dress-white.webp",
  },
  "long-sleeve-sculpt-maxi-dress": {
    "Coffee": "/tiles/long-sleeve-sculpt-maxi-dress-coffee.webp",
    "Black": "/tiles/long-sleeve-sculpt-maxi-dress-black.webp",
    "Navy Blue": "/tiles/long-sleeve-sculpt-maxi-dress-navy-blue.webp",
  },
  "strapless-slim-fit-bodysuit": {
    "Brown": "/tiles/strapless-slim-fit-bodysuit-brown.webp",
    "White": "/tiles/strapless-slim-fit-bodysuit-white.webp",
    "Black": "/tiles/strapless-slim-fit-bodysuit-black.webp",
  },
  "cotton-lace-brief": {
    "Blue": "/tiles/cotton-lace-brief-blue.webp",
    "Pink": "/tiles/cotton-lace-brief-pink.webp",
    "White": "/tiles/cotton-lace-brief-white.webp",
    "Black": "/tiles/cotton-lace-brief-black.webp",
  },
  "long-sleeve-zip-one-piece-swimsuit": {
    "Green": "/tiles/long-sleeve-zip-one-piece-swimsuit-green.webp",
    "Brown": "/tiles/long-sleeve-zip-one-piece-swimsuit-brown.webp",
    "Black": "/tiles/long-sleeve-zip-one-piece-swimsuit-black.webp",
    "Print": "/tiles/long-sleeve-zip-one-piece-swimsuit-print.webp",
  },
  "high-waist-body-shaping-shorts": {
    "Nude": "/tiles/high-waist-body-shaping-shorts-nude.webp",
    "Black": "/tiles/high-waist-body-shaping-shorts-black.webp",
  },
  "womens-velvet-jumpsuit-long-sleeve-square-neck": {
    "Apricot": "/tiles/womens-velvet-jumpsuit-long-sleeve-squar-apricot.webp",
    "Brown": "/tiles/womens-velvet-jumpsuit-long-sleeve-squar-brown.webp",
    "White": "/tiles/womens-velvet-jumpsuit-long-sleeve-squar-white.webp",
    "Black": "/tiles/womens-velvet-jumpsuit-long-sleeve-squar-black.webp",
  },
  "strapless-tummy-control-body-shaper": {
    "White": "/tiles/strapless-tummy-control-body-shaper-white.webp",
    "Coffee": "/tiles/strapless-tummy-control-body-shaper-coffee.webp",
    "Nude": "/tiles/strapless-tummy-control-body-shaper-nude.webp",
    "Black": "/tiles/strapless-tummy-control-body-shaper-black.webp",
  },
  "lace-breathable-thong-underwear": {
    "Iris Purple": "/tiles/lace-breathable-thong-underwear-iris-purple.webp",
    "Nude": "/tiles/lace-breathable-thong-underwear-nude.webp",
    "Brown": "/tiles/lace-breathable-thong-underwear-brown.webp",
    "White": "/tiles/lace-breathable-thong-underwear-white.webp",
  },
  "seamless-sculpting-bodysuit": {
    "Coffee": "/tiles/seamless-sculpting-bodysuit-coffee.webp",
    "Nude": "/tiles/seamless-sculpting-bodysuit-nude.webp",
    "Black": "/tiles/seamless-sculpting-bodysuit-black.webp",
  },
  "slim-fit-long-sleeve-top": {
    "White": "/tiles/slim-fit-long-sleeve-top-white.webp",
    "Light Grey": "/tiles/slim-fit-long-sleeve-top-light-grey.webp",
    "Grey": "/tiles/slim-fit-long-sleeve-top-grey.webp",
    "Black": "/tiles/slim-fit-long-sleeve-top-black.webp",
  },
  "sleeveless-ribbed-midi-dress": {
    "Light Blue": "/tiles/sleeveless-ribbed-midi-dress-light-blue.webp",
    "Green": "/tiles/sleeveless-ribbed-midi-dress-green.webp",
    "Khaki": "/tiles/sleeveless-ribbed-midi-dress-khaki.webp",
    "White": "/tiles/sleeveless-ribbed-midi-dress-white.webp",
  },
  "u-neck-slit-maxi-dress": {
    "Haze Blue": "/tiles/u-neck-slit-maxi-dress-haze-blue.webp",
    "Baby Pink": "/tiles/u-neck-slit-maxi-dress-baby-pink.webp",
    "Brown": "/tiles/u-neck-slit-maxi-dress-brown.webp",
    "Black": "/tiles/u-neck-slit-maxi-dress-black.webp",
  },
  "off-shoulder-sculpt-midi-dress": {
    "Navy Blue": "/tiles/off-shoulder-sculpt-midi-dress-navy-blue.webp",
    "Apricot": "/tiles/off-shoulder-sculpt-midi-dress-apricot.webp",
    "Brown": "/tiles/off-shoulder-sculpt-midi-dress-brown.webp",
    "Black": "/tiles/off-shoulder-sculpt-midi-dress-black.webp",
  },
  "solid-colour-bikini-set": {
    "Yellow": "/tiles/solid-colour-bikini-set-yellow.webp",
    "Apricot": "/tiles/solid-colour-bikini-set-apricot.webp",
    "Purple": "/tiles/solid-colour-bikini-set-purple.webp",
    "White": "/tiles/solid-colour-bikini-set-white.webp",
  },
  "ribbed-cut-out-one-piece-swimsuit": {
    "Red": "/tiles/ribbed-cut-out-one-piece-swimsuit-red.webp",
    "Blue": "/tiles/ribbed-cut-out-one-piece-swimsuit-blue.webp",
    "Black": "/tiles/ribbed-cut-out-one-piece-swimsuit-black.webp",
  },
  "long-sleeve-lounge-set-with-built-in-bra": {
    "Red": "/tiles/long-sleeve-lounge-set-with-built-in-bra-red.webp",
    "Black": "/tiles/long-sleeve-lounge-set-with-built-in-bra-black.webp",
    "White": "/tiles/long-sleeve-lounge-set-with-built-in-bra-white.webp",
    "Grey": "/tiles/long-sleeve-lounge-set-with-built-in-bra-grey.webp",
  },
  "womens-tie-side-triangle-bikini-set": {
    "Red": "/tiles/womens-tie-side-triangle-bikini-set-red.webp",
    "Yellow": "/tiles/womens-tie-side-triangle-bikini-set-yellow.webp",
    "Pink": "/tiles/womens-tie-side-triangle-bikini-set-pink.webp",
    "White": "/tiles/womens-tie-side-triangle-bikini-set-white.webp",
  },
  "womens-high-waisted-ruched-bikini-bottoms": {
    "Deep Red": "/tiles/womens-high-waisted-ruched-bikini-bottom-deep-red.webp",
    "Sky Blue": "/tiles/womens-high-waisted-ruched-bikini-bottom-sky-blue.webp",
    "Orange": "/tiles/womens-high-waisted-ruched-bikini-bottom-orange.webp",
    "Black": "/tiles/womens-high-waisted-ruched-bikini-bottom-black.webp",
  },
  "satin-tie-waist-robe": {
    "Champagne Gold": "/tiles/satin-tie-waist-robe-champagne-gold.webp",
    "Champagne Yellow": "/tiles/satin-tie-waist-robe-champagne-yellow.webp",
    "Sunset Red": "/tiles/satin-tie-waist-robe-sunset-red.webp",
    "Watermelon Red": "/tiles/satin-tie-waist-robe-watermelon-red.webp",
  },
  "seamless-shaping-long-sleeve-bodysuit": {
    "Bright Red": "/tiles/seamless-shaping-long-sleeve-bodysuit-bright-red.webp",
    "Brown": "/tiles/seamless-shaping-long-sleeve-bodysuit-brown.webp",
    "Nude": "/tiles/seamless-shaping-long-sleeve-bodysuit-nude.webp",
    "Black": "/tiles/seamless-shaping-long-sleeve-bodysuit-black.webp",
  },
  "womens-high-waisted-breathable-traceless-thong-panties": {
    "Coffee": "/tiles/womens-high-waisted-breathable-traceless-coffee.webp",
    "Clay": "/tiles/womens-high-waisted-breathable-traceless-clay.webp",
    "White": "/tiles/womens-high-waisted-breathable-traceless-white.webp",
    "Black": "/tiles/womens-high-waisted-breathable-traceless-black.webp",
  },
  "maternity-nursing-bra-front-opening-push-up": {
    "Dusty Rose": "/tiles/maternity-nursing-bra-front-opening-push-dusty-rose.webp",
    "Grey": "/tiles/maternity-nursing-bra-front-opening-push-grey.webp",
    "Nude": "/tiles/maternity-nursing-bra-front-opening-push-nude.webp",
    "Black": "/tiles/maternity-nursing-bra-front-opening-push-black.webp",
  },
  "womens-swimwear": {
    "Red": "/tiles/womens-swimwear-red.webp",
    "Yellow": "/tiles/womens-swimwear-yellow.webp",
    "Pink": "/tiles/womens-swimwear-pink.webp",
    "Beige": "/tiles/womens-swimwear-beige.webp",
  },
  "lace-scoop-bralette-comfortable-seamless-underwear": {
    "Dream Blue": "/tiles/lace-scoop-bralette-comfortable-seamless-dream-blue.webp",
    "Pink": "/tiles/lace-scoop-bralette-comfortable-seamless-pink.webp",
  },
  "womens-one-piece-diamond-swimsuit": {
    "Black": "/tiles/womens-one-piece-diamond-swimsuit-black.webp",
    "Pink": "/tiles/womens-one-piece-diamond-swimsuit-pink.webp",
  },
  "womens-two-piece-swimsuit": {
    "Green": "/tiles/womens-two-piece-swimsuit-green.webp",
    "Black": "/tiles/womens-two-piece-swimsuit-black.webp",
    "Red": "/tiles/womens-two-piece-swimsuit-red.webp",
    "White": "/tiles/womens-two-piece-swimsuit-white.webp",
  },
  "womens-lace-long-sleeve-dress": {
    "Wine Red": "/tiles/womens-lace-long-sleeve-dress-wine-red.webp",
    "Black": "/tiles/womens-lace-long-sleeve-dress-black.webp",
    "White": "/tiles/womens-lace-long-sleeve-dress-white.webp",
  },
  "jelly-cup-multi-way-strapless-bra": {
    "Brown": "/tiles/jelly-cup-multi-way-strapless-bra-brown.webp",
    "Nude": "/tiles/jelly-cup-multi-way-strapless-bra-nude.webp",
    "Black": "/tiles/jelly-cup-multi-way-strapless-bra-black.webp",
  },
  "womens-bra": {
    "Green": "/tiles/womens-bra-green.webp",
    "Black": "/tiles/womens-bra-black.webp",
    "Off-White": "/tiles/womens-bra-off-white.webp",
  },
  "waist-shaping-fitness-body-shaper": {
    "Nude": "/tiles/waist-shaping-fitness-body-shaper-nude.webp",
    "Pink": "/tiles/waist-shaping-fitness-body-shaper-pink.webp",
    "Black": "/tiles/waist-shaping-fitness-body-shaper-black.webp",
  },
  "high-waisted-tummy-control-shaping-pants": {
    "Mint": "/tiles/high-waisted-tummy-control-shaping-pants-mint.webp",
    "Nude": "/tiles/high-waisted-tummy-control-shaping-pants-nude.webp",
    "Black": "/tiles/high-waisted-tummy-control-shaping-pants-black.webp",
  },
  "women-asymmetric-long-sleeve-t-shirt-and-wide-leg-pants-set": {
    "Dark Grey": "/tiles/women-asymmetric-long-sleeve-t-shirt-and-dark-grey.webp",
    "Dark Green": "/tiles/women-asymmetric-long-sleeve-t-shirt-and-dark-green.webp",
    "Brick Red": "/tiles/women-asymmetric-long-sleeve-t-shirt-and-brick-red.webp",
    "Black": "/tiles/women-asymmetric-long-sleeve-t-shirt-and-black.webp",
  },
  "seamless-tummy-control-body-shaper-cami": {
    "Brown": "/tiles/seamless-tummy-control-body-shaper-cami-brown.webp",
    "Nude": "/tiles/seamless-tummy-control-body-shaper-cami-nude.webp",
    "White": "/tiles/seamless-tummy-control-body-shaper-cami-white.webp",
    "Black": "/tiles/seamless-tummy-control-body-shaper-cami-black.webp",
  },
  "womens-menstrual-period-panties": {
    "Denim Blue": "/tiles/womens-menstrual-period-panties-denim-blue.webp",
    "Watermelon Red": "/tiles/womens-menstrual-period-panties-watermelon-red.webp",
    "Black": "/tiles/womens-menstrual-period-panties-black.webp",
  },
  "seamless-support-bra-with-tummy-control": {
    "Enchanted Red": "/tiles/seamless-support-bra-with-tummy-control-enchanted-red.webp",
    "Light Green": "/tiles/seamless-support-bra-with-tummy-control-light-green.webp",
    "Light Brown": "/tiles/seamless-support-bra-with-tummy-control-light-brown.webp",
    "Nude": "/tiles/seamless-support-bra-with-tummy-control-nude.webp",
  },
  "women-waist-training-compression-garment": {
    "Black": "/tiles/women-waist-training-compression-garment-black.webp",
  },
};
