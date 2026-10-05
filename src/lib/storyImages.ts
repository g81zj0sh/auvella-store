/*
 * Optional per-product image for the second story section: a UGC-style,
 * phone-shot image showing how the piece behaves when worn. Brand imagery
 * made from briefs - never presented as a customer photo, and never paired
 * with an invented name or quote (DMCC Act).
 *
 * callouts: labels drawn over the image with a thin pointer line, as on
 * smooche.com. x/y and toX/toY are percentages of the image box: the label
 * sits at (x, y) and its line runs to the feature at (toX, toY).
 */
export type StoryCallout = { label: string; x: number; y: number; toX: number; toY: number };
export type StoryImage = { src: string; alt: string; callouts?: StoryCallout[] };

export const STORY_IMAGES: Record<string, StoryImage> = {
  // Anchor (29 Sept 2026): Soul 2.0 candid mirror shot, garment put on by
  // Seedream from the product photos. Awaiting Joshua's go before the rest.
  "high-waist-shaping-shorts-with-lace-trim": {
    src: "/story/lace-trim-shorts-mirror-v2.webp",
    alt: "Lace-Trim High-Waist Shaping Shorts worn with a white crop top, mirror photo",
  },
  // 30 Sept 2026 test pair (Joshua reviews before the rest): Soul 2.0 candid,
  // garment applied by Seedream from the product photos; checked against the
  // product shots; bodysuit fabric cleaned in a second Seedream pass.
  "one-piece-shapewear-bodysuit-with-tummy-control": {
    src: "/story/tummy-control-bodysuit-mirror-v2.webp",
    alt: "Tummy Control Sculpting Bodysuit in black, mirror photo in a sunlit bedroom",
  },
  "invisible-front-buckle-strapless-bra": {
    src: "/story/front-buckle-bra-mirror-v2.webp",
    alt: "Front-Buckle Strapless Bra in nude worn with light-wash jeans, mirror photo",
  },
  // Situational, posed-for-camera shots (Joshua, 30 Sept 2026: real moments
  // where the piece belongs, looking into the camera, not mirror selfies).
  "off-shoulder-sculpt-midi-dress": {
    src: "/story/off-shoulder-dress-evening.webp",
    alt: "Off-Shoulder Sculpt Dress in deep wine red, on a city street at dusk before dinner",
  },
  "solid-colour-bikini-set": {
    src: "/story/bikini-beach-holiday.webp",
    alt: "Solid Colour Bikini Set in hot pink, at the edge of the sea on holiday",
  },
  // Batch 1 (30 Sept 2026): mixed posed moments and mirror shots at real
  // places, neutral and slight-smile expressions; garments applied by Seedream.
  "seamless-shaping-long-sleeve-bodysuit": {
    src: "/story/long-sleeve-bodysuit-brunch.webp",
    alt: "Seamless Long Sleeve Shaping Bodysuit in black worn with jeans at a café terrace",
  },
  "satin-cami-pajama-set": {
    src: "/story/satin-cami-pyjamas-morning.webp",
    alt: "Satin Cami Pyjama Set in deep red, morning coffee by sunlit windows at home",
  },
  "fleece-lined-drawstring-lounge-set": {
    src: "/story/fleece-lounge-set-autumn-walk.webp",
    alt: "Fleece Drawstring Lounge Set in cream on an autumn walk with a coffee",
  },
  "v-neck-bodycon-mini-dress": {
    src: "/story/v-neck-mini-restaurant-mirror-v2.webp",
    alt: "V-Neck Bodycon Mini Dress in powder blue, mirror photo in a restaurant",
  },
  "long-sleeve-zip-one-piece-swimsuit": {
    src: "/story/zip-swimsuit-boat.webp",
    alt: "Long Sleeve Zip-Front Swimsuit in palm print on a boat on holiday",
  },
  "satin-tie-waist-robe": {
    src: "/story/satin-robe-hotel-balcony.webp",
    alt: "Satin Tie-Waist Robe in pink at a hotel balcony door in the morning",
  },
  "seamless-sculpt-sports-bra": {
    src: "/story/sports-bra-rooftop.webp",
    alt: "Seamless Sculpt Sports Bra in cherry red after a workout on a sunny rooftop",
  },
  "ribbed-short-sleeve-mini-dress": {
    src: "/story/ribbed-mini-hotel-lift-v2.webp",
    alt: "Ribbed Short Sleeve Mini Dress in white, mirror photo in a hotel lift",
  },
  // Batch 2 (30 Sept 2026): influencer mood - posed, flattering light,
  // styled; mirror shots at real places with different phones.
  "long-sleeve-sculpt-maxi-dress": {
    src: "/story/long-sleeve-maxi-wedding-garden.webp",
    alt: "Long Sleeve Sculpt Maxi Dress in navy, wedding guest in a country-house garden",
  },
  "u-neck-slit-maxi-dress": {
    src: "/story/slit-maxi-seafront-sunset.webp",
    alt: "U-Neck Slit Maxi Dress in haze blue on a seafront terrace at sunset",
  },
  "ribbed-cut-out-one-piece-swimsuit": {
    src: "/story/cut-out-swimsuit-villa-pool.webp",
    alt: "Ribbed Cut-Out Swimsuit in red at a villa infinity pool",
  },
  "womens-swimwear": {
    src: "/story/padded-bikini-beach-club.webp",
    alt: "Padded Bikini Set in sand beige on a beach club lounger",
  },
  "satin-long-sleeve-pajama-set": {
    src: "/story/satin-long-sleeve-pyjamas-window.webp",
    alt: "Satin Long Sleeve Pyjama Set in champagne, drawing the curtains on a bright morning",
  },
  "womens-velvet-jumpsuit-long-sleeve-square-neck": {
    src: "/story/velvet-hotel-lobby-mirror.webp",
    alt: "Velvet Square Neck top in black with a satin skirt, hotel lobby mirror photo",
  },
  "seamless-sculpting-bodysuit": {
    src: "/story/open-back-bodysuit-hotel-mirror.webp",
    alt: "Open-Back Sculpting Bodysuit in black, over-the-shoulder mirror photo in a hotel suite",
  },
  "auvella-seamless-comfort-bralette": {
    src: "/story/comfort-bralette-flower-market.webp",
    alt: "Seamless Comfort Bralette in black under an open linen shirt at a flower market",
  },
  // Batch 3 (30 Sept 2026): influencer mood; mirror shots with new phones.
  "sleeveless-ribbed-midi-dress": {
    src: "/story/ribbed-midi-rooftop-bar.webp",
    alt: "Sleeveless Ribbed Midi Dress in white at a rooftop bar at golden hour",
  },
  "womens-lace-long-sleeve-dress": {
    src: "/story/lace-maxi-gallery-evening.webp",
    alt: "Lace Long Sleeve Maxi Dress in black at an evening gallery opening",
  },
  "long-sleeve-lounge-set-with-built-in-bra": {
    src: "/story/lounge-set-window-seat.webp",
    alt: "Long Sleeve Built-In Bra Lounge Set in grey on a window seat at home",
  },
  "women-asymmetric-long-sleeve-t-shirt-and-wide-leg-pants-set": {
    src: "/story/asymmetric-set-city-break.webp",
    alt: "Asymmetric Top and Wide Leg Trouser Set in black on a city break",
  },
  "slim-fit-long-sleeve-top": {
    src: "/story/long-sleeve-top-fitting-room.webp",
    alt: "Slim Fit Long Sleeve Top in black with jeans, boutique fitting-room mirror photo",
  },
  "womens-tie-side-triangle-bikini-set": {
    src: "/story/tie-side-bikini-cove.webp",
    alt: "Tie-Side Triangle Bikini Set in white by a turquoise cove at golden hour",
  },
  "womens-high-waisted-ruched-bikini-bottoms": {
    src: "/story/ruched-bottoms-hotel-pool.webp",
    alt: "High-Waist Ruched Bikini Bottoms in black by a hotel pool",
  },
  "womens-one-piece-diamond-swimsuit": {
    src: "/story/embellished-swimsuit-yacht.webp",
    alt: "Embellished Backless Swimsuit in pale pink on a yacht at sunset",
  },
  "womens-two-piece-swimsuit": {
    src: "/story/puff-sleeve-bikini-jetty.webp",
    alt: "Puff Sleeve Lace-Up Bikini Set in white on a tropical jetty",
  },
  "womens-swimwear-1": {
    src: "/story/two-tone-bikini-cabana.webp",
    alt: "Two-Tone Bikini Set in black and white on a poolside daybed",
  },
  "auvella-long-sleeve-sculpting-bodysuit": {
    src: "/story/long-sleeve-bodysuit-cocktail-mirror.webp",
    alt: "Long Sleeve Sculpting Bodysuit in white with a leather skirt, cocktail-bar mirror photo",
  },
  "seamless-tummy-control-body-shaper-cami": {
    src: "/story/cami-terrace-lunch.webp",
    alt: "Seamless Tummy Control Cami in black with linen trousers at a terrace lunch",
  },
  // Batch 4 (30 Sept 2026): shapewear, bras, underwear and accessories in
  // getting-ready and in-use moments; influencer mood.
  "strapless-slim-fit-bodysuit": {
    src: "/story/strapless-bodysuit-wedding-prep.webp",
    alt: "Strapless Slim-Fit Bodysuit in black, getting ready for a wedding in a hotel room",
  },
  "high-waist-body-shaping-shorts": {
    src: "/story/ice-silk-shorts-getting-dressed.webp",
    alt: "Ice Silk High-Waist Shaping Shorts in black, getting dressed with a summer dress",
  },
  "strapless-tummy-control-body-shaper": {
    src: "/story/strapless-tummy-bodysuit-boutique-mirror.webp",
    alt: "Strapless Tummy Control Bodysuit in nude, boutique dressing-room mirror photo",
  },
  "women-waist-training-compression-garment": {
    src: "/story/waist-shaper-bakery-morning.webp",
    alt: "Compression Waist Shaper in nude worn over a white T-shirt outside a bakery",
  },
  "waist-shaping-fitness-body-shaper": {
    src: "/story/zip-front-shaper-wardrobe.webp",
    alt: "Zip-Front Waist Shaper in black worn as a corset top in a walk-in wardrobe",
  },
  "high-waisted-tummy-control-shaping-pants": {
    src: "/story/tummy-control-shorts-bedroom.webp",
    alt: "High-Waist Tummy Control Shaping Shorts in mint, getting dressed by the window",
  },
  "maternity-nursing-bra-front-opening-push-up": {
    src: "/story/nursing-bra-nursery.webp",
    alt: "Front-Opening Nursing Bra in dusty rose with an open cardigan in a bright nursery",
  },
  "lace-scoop-bralette-comfortable-seamless-underwear": {
    src: "/story/lace-bralette-wine-bar.webp",
    alt: "Lace Scoop Bralette in pink under a cream blazer at a wine bar",
  },
  "womens-bra": {
    src: "/story/silicone-bra-hotel-mirror.webp",
    alt: "Silicone Strapless Backless Bra in off-white, hotel mirror photo before a night out",
  },
  "seamless-support-bra-with-tummy-control": {
    src: "/story/tummy-control-bra-vanity.webp",
    alt: "Seamless Tummy Control Bra in nude at a bright bathroom vanity",
  },
  "cotton-lace-brief": {
    src: "/story/cotton-lace-brief-sunday.webp",
    alt: "Cotton Lace Brief in black with an oversized tee on a lazy Sunday morning",
  },
  "lace-breathable-thong-underwear": {
    src: "/story/lace-thong-striped-shirt.webp",
    alt: "Lace Thong in white under an oversized striped shirt, getting dressed",
  },
  "womens-high-waisted-breathable-traceless-thong-panties": {
    src: "/story/ice-silk-thong-bathroom-mirror.webp",
    alt: "Ice Silk High-Waist Thong in clay with a white tank, bathroom mirror photo",
  },
  "womens-menstrual-period-panties": {
    src: "/story/period-briefs-cosy-sofa.webp",
    alt: "Leak-Proof Period Briefs in black with a cropped hoodie on a cosy day at home",
  },
  "silk-sleep-eye-mask": {
    src: "/story/silk-eye-mask-hotel-morning.webp",
    alt: "Silk Eye Mask in light pink, waking up in a hotel bed",
  },
  "body-adhesive-glue-for-clothing-security": {
    src: "/story/body-glue-getting-ready.webp",
    alt: "Body Adhesive being used to hold the neckline of a strapless dress",
  },
  "jelly-cup-multi-way-strapless-bra": {
    src: "/story/jelly-cup-bra-wardrobe.webp",
    alt: "Jelly Cup Multi-Way Strapless Bra in black with a satin skirt, getting ready at her wardrobe",
  },
  "cowl-neck-lace-up-back-mini-dress": {
    src: "/story/lace-up-mini-dress-sea-terrace.webp",
    alt: "Cowl Neck Lace-Up Back Mini Dress in burgundy, showing the open lace-up back on a sea-view terrace at golden hour",
  },
};
