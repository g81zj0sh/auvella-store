import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import tileBodysuits from "@/assets/tiles/tile-bodysuits.jpg";
import tileShapewear from "@/assets/tiles/tile-shapewear.jpg";
import tileBras from "@/assets/tiles/tile-bras.jpg";
import tileUnderwear from "@/assets/tiles/tile-underwear.jpg";
import tileLoungewear from "@/assets/tiles/tile-loungewear.jpg";
import tileSets from "@/assets/tiles/tile-sets.jpg";
import tileRobes from "@/assets/tiles/tile-robes.jpg";
import tileSleepAcc from "@/assets/tiles/tile-sleep-accessories.jpg";
import tileSwim from "@/assets/tiles/tile-swim.jpg";
import tileBikinis from "@/assets/tiles/tile-bikinis.jpg";
import tileDresses from "@/assets/tiles/tile-dresses.jpg";
import tileMiniDress from "@/assets/tiles/tile-mini-dresses.jpg";
import tileMidiDress from "@/assets/tiles/tile-midi-dresses.jpg";
import tileMaxiDress from "@/assets/tiles/tile-maxi-dresses.jpg";
import tileActivewear from "@/assets/tiles/tile-activewear.jpg";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import {
  fetchCollectionByHandle,
  fetchProducts,
  type ShopifyCollection,
  type ShopifyProduct,
} from "@/lib/shopify";
import {
  COLLECTION_FACETS,
  FACET_LABELS,
  facetValuesOf,
} from "@/lib/productFacets";

import { EditorialImage } from "@/components/site/EditorialImage";
import { Check } from "lucide-react";

import collectionBodysuitsAssetImg from "@/assets/collection-bodysuits-v2.png";
const collectionBodysuitsAsset = { url: collectionBodysuitsAssetImg };
import collectionActivewearAssetImg from "@/assets/collection-activewear-v3.png";
const collectionActivewearAsset = { url: collectionActivewearAssetImg };
import collectionPajamasAssetImg from "@/assets/collection-pajamas-v2.png";
const collectionPajamasAsset = { url: collectionPajamasAssetImg };
import collectionBrasAssetImg from "@/assets/collection-bras-v2.png";
const collectionBrasAsset = { url: collectionBrasAssetImg };
import shapewearPosterAssetImg from "@/assets/media/shapewear-poster.jpg";
const shapewearPosterAsset = { url: shapewearPosterAssetImg };
import sleepwearPosterAssetImg from "@/assets/media/sleepwear-poster.jpg";
const sleepwearPosterAsset = { url: sleepwearPosterAssetImg };
import leggingsPosterAssetImg from "@/assets/media/leggings-poster.jpg";
const leggingsPosterAsset = { url: leggingsPosterAssetImg };
import softEssentialsPosterAssetImg from "@/assets/media/soft-essentials-poster.jpg";
const softEssentialsPosterAsset = { url: softEssentialsPosterAssetImg };
import tileDressesAssetImg from "@/assets/tile-dresses.jpg";
const tileDressesAsset = { url: tileDressesAssetImg };
import tileRobesAssetImg from "@/assets/tile-robes.png";
const tileRobesAsset = { url: tileRobesAssetImg };
import featured from "@/assets/featured-bodysuit.jpg";
import bundle from "@/assets/bundle.jpg";
import heroLoungewearImg from "@/assets/heroes/loungewear.png";
const heroLoungewear = { url: heroLoungewearImg };
import heroUnderwearImg from "@/assets/heroes/underwear.png";
const heroUnderwear = { url: heroUnderwearImg };
import heroRobesImg from "@/assets/heroes/robes.png";
const heroRobes = { url: heroRobesImg };
import heroSetsImg from "@/assets/heroes/sets.png";
const heroSets = { url: heroSetsImg };
import heroActivewearImg from "@/assets/heroes/activewear.png";
const heroActivewear = { url: heroActivewearImg };
import heroSwimImg from "@/assets/heroes/swim.png";
const heroSwim = { url: heroSwimImg };
import heroBodysuitsImg from "@/assets/heroes/bodysuits.png";
const heroBodysuits = { url: heroBodysuitsImg };
import heroDressesImg from "@/assets/heroes/dresses.png";
const heroDresses = { url: heroDressesImg };
import heroBrasImg from "@/assets/heroes/bras.png";
const heroBras = { url: heroBrasImg };
import heroNewInImg from "@/assets/heroes/newin.png";
const heroNewIn = { url: heroNewInImg };
import shapewearHeroVideoImg from "@/assets/media/shapewear-hero.mp4";
const shapewearHeroVideo = { url: shapewearHeroVideoImg };
import loungewearHeroVideoImg from "@/assets/media/loungewear-hero.mp4";
const loungewearHeroVideo = { url: loungewearHeroVideoImg };
import loungewearHeroPosterImg from "@/assets/media/loungewear-hero-poster.jpg";
const loungewearHeroPoster = { url: loungewearHeroPosterImg };
import activewearHeroVideoImg from "@/assets/media/activewear-hero.mp4";
const activewearHeroVideo = { url: activewearHeroVideoImg };
import activewearHeroPosterImg from "@/assets/media/activewear-hero-poster.jpg";
const activewearHeroPoster = { url: activewearHeroPosterImg };
import bodysuitsHeroVideoImg from "@/assets/media/bodysuits-hero.mp4";
const bodysuitsHeroVideo = { url: bodysuitsHeroVideoImg };
import bodysuitsHeroPosterImg from "@/assets/media/bodysuits-hero-poster.jpg";
const bodysuitsHeroPoster = { url: bodysuitsHeroPosterImg };

const HERO_VIDEO: Record<string, { src: string; poster?: string }> = {
  "shapewear-1": { src: shapewearHeroVideo.url, poster: shapewearPosterAsset.url },
  "loungewear-sleepwear": { src: loungewearHeroVideo.url, poster: loungewearHeroPoster.url },
  activewear: { src: activewearHeroVideo.url, poster: activewearHeroPoster.url },
  bodysuits: { src: bodysuitsHeroVideo.url, poster: bodysuitsHeroPoster.url },
  // the "shapewear" handle serves the Bodysuits collection
  shapewear: { src: bodysuitsHeroVideo.url, poster: bodysuitsHeroPoster.url },
};

/* ------------------------------------------------------------------ */
/* Handle metadata + hero imagery                                      */
/* ------------------------------------------------------------------ */

const HANDLE_META: Record<string, { title: string; description: string; query?: string }> = {
  "best-sellers": {
    title: "Best Sellers",
    description: "The most-loved pieces — restocked and ready.",
  },
  "shapewear-1": {
    title: "Shapewear",
    description: "Smoothing shorts, briefs and sculpting layers that hold their shape all day.",
    query: "shapewear OR sculpt OR control OR shaper OR shaping",
  },
  "loungewear-sleepwear": {
    title: "Loungewear",
    description: "Soft sets made for slow mornings and easy nights.",
  },
  underwear: {
    title: "Underwear",
    description: "Everyday seamless essentials in warm neutral tones.",
    query: "brief OR thong OR underwear",
  },
  "new-in": {
    title: "New In",
    description: "The latest drops — fresh silhouettes, new tones, restocked favourites.",
  },
  sets: {
    title: "Sets",
    description: "Matching lounge and sleep sets — one decision, complete comfort.",
    query: "set OR pajama OR lounge",
  },
  bodysuits: {
    title: "Bodysuits",
    description: "Second-skin bodysuits engineered to smooth, contour and support.",
    query: "bodysuit OR sculpt",
  },
  shapewear: {
    title: "Shapewear",
    description: "Smoothing shorts, briefs and sculpting layers that hold their shape all day.",
    query: "shapewear OR shaping OR sculpt",
  },
  activewear: {
    title: "Activewear",
    description: "Support that moves with you — studio to street.",
    query: "activewear OR legging OR active",
  },
  leggings: {
    title: "Leggings",
    description: "High-rise sculpting leggings with a waistband that stays put.",
    query: "legging",
  },
  pajamas: {
    title: "Pyjamas",
    description: "Satin sets and soft separates made for slow mornings.",
    query: "pajama OR pyjama OR sleep",
  },
  "bras-and-tops": {
    title: "Bras & Tops",
    description: "Wireless support and smoothing tops in skin-inclusive tones.",
    query: "bra OR top OR bralette",
  },
  dresses: {
    title: "Dresses",
    description: "Sculpted silhouettes with built-in smoothing.",
    query: "dress",
  },
  bikinis: {
    title: "Bikinis",
    description: "Warm-tone bikinis — sets, tops and bottoms.",
    query: "bikini",
  },
  robes: {
    title: "Robes",
    description: "The finishing layer for everyday luxury.",
    query: "robe",
  },
  "soft-essentials": {
    title: "Soft Essentials",
    description: "Support made soft — the layers you'll reach for on repeat.",
    query: "essential OR soft",
  },
  sleepwear: {
    title: "Loungewear",
    description: "Soft sets made for slow mornings and easy nights.",
    query: "sleep OR lounge OR robe OR pajama",
  },
};

const HERO_IMG: Record<string, string> = {
  "one-piece-swimsuits": heroSwim.url,
  bikinis: heroSwim.url,
  bodysuits: heroBodysuits.url,
  shapewear: heroBodysuits.url, // real collection at this handle is BODYSUITS
  "shapewear-1": shapewearPosterAsset.url,
  "loungewear-sleepwear": heroLoungewear.url,
  "soft-essentials": heroBras.url,
  underwear: heroUnderwear.url,
  "best-sellers": collectionBodysuitsAsset.url,
  activewear: heroActivewear.url,
  pajamas: heroLoungewear.url,
  "bras-and-tops": heroBras.url,
  sleepwear: heroLoungewear.url,
  leggings: leggingsPosterAsset.url,
  dresses: heroDresses.url,
  robes: heroRobes.url,
  sets: heroSets.url,
  "new-in": heroNewIn.url,
};

/* ------------------------------------------------------------------ */
/* Category tiles — SKIMS-style sub-category row under the hero.      */
/* Curated per collection so every tile lands on genuinely matching   */
/* products; tiles pull their image live from the target collection's */
/* first product so the thumbnail always reflects real contents.      */
/* ------------------------------------------------------------------ */

const TILE_LABELS: Record<string, string> = {
  shapewear: "Bodysuits", // this handle holds the BODYSUITS collection
  "shapewear-1": "Shapewear",
  "soft-essentials": "Bras & Bralettes",
  underwear: "Underwear",
  "loungewear-sleepwear": "Loungewear",
  sets: "Sets",
  robes: "Robes",
  "sleep-accessories": "Sleep Accessories",
  "one-piece-swimsuits": "Swim",
  bikinis: "Bikinis",
  dresses: "Dresses",
  "mini-dresses-1": "Mini Dresses",
  "midi-dresses": "Midi Dresses",
  "maxi-dresses": "Maxi Dresses",
  activewear: "Activewear",
};

const TILE_SUBTEXT: Record<string, string> = {
  shapewear: "Sculpt & smooth",
  "shapewear-1": "Everyday control",
  "soft-essentials": "Wireless comfort",
  underwear: "Seamless basics",
  "loungewear-sleepwear": "Slow-morning soft",
  sets: "Matching pieces",
  robes: "The finishing layer",
  "sleep-accessories": "Silk essentials",
  "one-piece-swimsuits": "Pool to shore",
  bikinis: "Sets & separates",
  dresses: "Sculpted silhouettes",
  "mini-dresses-1": "Above the knee",
  "midi-dresses": "Effortless length",
  "maxi-dresses": "Floor-skimming",
  activewear: "Studio to street",
};

const TILE_IMG: Record<string, string> = {
  shapewear: tileBodysuits,
  "shapewear-1": tileShapewear,
  "soft-essentials": tileBras,
  underwear: tileUnderwear,
  "loungewear-sleepwear": tileLoungewear,
  sets: tileSets,
  robes: tileRobes,
  "sleep-accessories": tileSleepAcc,
  "one-piece-swimsuits": tileSwim,
  bikinis: tileBikinis,
  dresses: tileDresses,
  "mini-dresses-1": tileMiniDress,
  "midi-dresses": tileMidiDress,
  "maxi-dresses": tileMaxiDress,
  activewear: tileActivewear,
};

const OVERVIEW_TILES = [
  "shapewear",
  "shapewear-1",
  "soft-essentials",
  "underwear",
  "loungewear-sleepwear",
  "one-piece-swimsuits",
  "dresses",
  "activewear",
];

const LOUNGE_TILES = ["loungewear-sleepwear", "sets", "robes", "sleep-accessories"];
const DRESS_TILES = ["dresses", "mini-dresses-1", "midi-dresses", "maxi-dresses", "shapewear"];

const TILE_FAMILIES: Record<string, string[]> = {
  "new-in": OVERVIEW_TILES,
  "best-sellers": OVERVIEW_TILES,
  // Sculpt family
  shapewear: ["shapewear-1", "soft-essentials", "activewear", "dresses"],
  bodysuits: ["shapewear-1", "soft-essentials", "activewear", "dresses"],
  "shapewear-1": ["shapewear", "soft-essentials", "underwear", "activewear"],
  activewear: ["soft-essentials", "shapewear", "shapewear-1"],
  leggings: ["activewear", "shapewear-1", "shapewear"],
  // Intimates family
  "soft-essentials": ["underwear", "shapewear", "shapewear-1", "activewear"],
  "bras-and-tops": ["soft-essentials", "underwear", "shapewear", "activewear"],
  underwear: ["soft-essentials", "shapewear", "shapewear-1", "loungewear-sleepwear"],
  // Lounge family
  "loungewear-sleepwear": ["sets", "robes", "sleep-accessories", "soft-essentials"],
  sets: LOUNGE_TILES,
  robes: LOUNGE_TILES,
  "sleep-accessories": LOUNGE_TILES,
  pajamas: LOUNGE_TILES,
  sleepwear: LOUNGE_TILES,
  // Swim family
  "one-piece-swimsuits": ["bikinis", "activewear", "shapewear"],
  bikinis: ["one-piece-swimsuits", "activewear", "shapewear"],
  // Dresses family
  dresses: ["mini-dresses-1", "midi-dresses", "maxi-dresses", "shapewear"],
  "mini-dresses-1": DRESS_TILES,
  "midi-dresses": DRESS_TILES,
  "maxi-dresses": DRESS_TILES,
  "maxi-dresses-1": DRESS_TILES,
};

function CategoryTile({ handle }: { handle: string }) {
  const img = TILE_IMG[handle];
  const label = TILE_LABELS[handle] ?? titleize(handle);
  const sub = TILE_SUBTEXT[handle];
  return (
    <Link
      to="/collections/$handle"
      params={{ handle }}
      className="group w-[150px] shrink-0 snap-start transition-transform duration-300 ease-out hover:scale-[1.05] md:w-[196px]"
    >
      <div className="aspect-[4/5] w-full overflow-hidden bg-[#f5f5f5]">
        {img && (
          <img
            src={img}
            alt={label}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        )}
      </div>
      <p className="mt-2.5 text-[12px] font-medium uppercase tracking-[0.1em] text-[#0a0a0a]">{label}</p>
      {sub && <p className="mt-0.5 text-[12px] leading-snug text-[#8a8a8a]">{sub}</p>}
    </Link>
  );
}

function CategoryTiles({ handle }: { handle: string }) {
  const tiles = (TILE_FAMILIES[handle] ?? []).filter((h, i, arr) => h !== handle && arr.indexOf(h) === i);
  if (!tiles.length) return null;
  return (
    <section className="container-px border-b border-[#EBEBEB] py-7 md:py-9">
      <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto md:gap-6">
        {tiles.map((h) => (
          <CategoryTile key={h} handle={h} />
        ))}
      </div>
    </section>
  );
}

function titleize(handle: string) {
  return handle
    .replace(/-/g, " ")
    .replace(/\band\b/gi, "&")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function loadCollection(handle: string): Promise<ShopifyCollection> {
  const real = await fetchCollectionByHandle(handle, 96);
  if (real && real.products.length) return real;
  const meta = HANDLE_META[handle];
  const products = await fetchProducts(96, meta?.query);
  return {
    id: `fallback:${handle}`,
    title: meta?.title ?? titleize(handle),
    description: meta?.description ?? "",
    handle,
    image: real?.image ?? null,
    products,
  };
}

function collectionQueryOptions(handle: string) {
  return {
    queryKey: ["collection", handle],
    queryFn: () => loadCollection(handle),
  };
}

export const Route = createFileRoute("/collections/$handle")({
  component: CollectionPage,
  validateSearch: (search: Record<string, unknown>): { colour?: string } =>
    typeof search.colour === "string" ? { colour: search.colour } : {},
  loader: ({ params, context }) => context.queryClient.ensureQueryData(collectionQueryOptions(params.handle)),
  head: ({ params, loaderData }) => {
    const title = `${loaderData?.title ?? titleize(params.handle)} — Auvella`;
    const description =
      loaderData?.description ||
      `Shop ${loaderData?.title ?? titleize(params.handle)} at Auvella.`;
    const url = `https://auvellawear.com/collections/${params.handle}`;
    const image =
      loaderData?.image?.url ??
      HERO_IMG[params.handle] ??
      loaderData?.products?.[0]?.node.images.edges[0]?.node.url;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
});

/* ------------------------------------------------------------------ */
/* Filtering / sorting                                                 */
/* ------------------------------------------------------------------ */

type SortKey = "featured" | "price-asc" | "price-desc" | "title";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "title", label: "A – Z" },
];

const PRICE_RANGES = [
  { label: "Under £25", min: 0, max: 25 },
  { label: "£25 – £50", min: 25, max: 50 },
  { label: "£50 – £75", min: 50, max: 75 },
  { label: "Over £75", min: 75, max: Infinity },
];

const PAGE_SIZE = 16;

/* ------------------------------------------------------------------ */
/* Primary colour palette — supplier colour names ("Peacock Blue",    */
/* "Black polka dots triangular style", "Liquid foundation skin")     */
/* bucket into one clean primary each, so the Colour filter stays     */
/* a short curated palette. Keyword groups are checked in order and   */
/* the first hit wins: "Black Floral" → Black, "Gray Blue" → Blue.    */
/* ------------------------------------------------------------------ */

const PRIMARY_COLOUR_GROUPS: { name: string; hex: string; words: string[] }[] = [
  { name: "Black", hex: "#0a0a0a", words: ["black"] },
  { name: "White", hex: "#f7f5f0", words: ["white", "ivory", "cream", "milky", "powder"] },
  {
    name: "Nude",
    hex: "#d9b48f",
    words: ["nude", "skin", "apricot", "beige", "khaki", "clay", "champagne", "flesh", "sand", "foundation", "oatmeal"],
  },
  { name: "Brown", hex: "#6f4e37", words: ["brown", "coffee", "chocolate", "mocha", "taupe", "coco"] },
  { name: "Pink", hex: "#e7a4b8", words: ["pink", "rose", "barbie", "blush", "rouge", "fuchsia", "magenta"] },
  {
    name: "Red",
    hex: "#a52a2a",
    words: ["red", "burgundy", "wine", "berry", "scarlet", "cherry", "maroon", "crimson", "watermelon"],
  },
  { name: "Purple", hex: "#7b5aa6", words: ["purple", "lavender", "plum", "lilac", "violet"] },
  {
    name: "Green",
    hex: "#55705a",
    words: ["green", "olive", "army", "emerald", "mint", "grass", "sage", "teal"],
  },
  {
    name: "Blue",
    hex: "#33517e",
    words: ["blue", "navy", "sky", "royal", "denim", "haze", "lake", "peacock", "aqua", "turquoise"],
  },
  { name: "Grey", hex: "#9c9c9c", words: ["grey", "gray", "silver"] },
  { name: "Orange", hex: "#cf7f45", words: ["orange", "rust", "terracotta", "coral"] },
  { name: "Yellow", hex: "#d4af5a", words: ["yellow", "gold", "lemon", "mustard"] },
  { name: "Print", hex: "#b8a88f", words: ["print", "floral", "polka", "leopard", "glitter", "pattern", "dot"] },
];

function primaryColourOf(value: string): string | null {
  const v = value.toLowerCase();
  for (const g of PRIMARY_COLOUR_GROUPS) {
    if (g.words.some((w) => v.includes(w))) return g.name;
  }
  return null;
}

function productColourValues(p: ShopifyProduct): string[] {
  const opt = p.node.options.find((o) => /colou?r/i.test(o.name));
  return opt?.values ?? [];
}

function minPrice(p: ShopifyProduct): number {
  const v =
    p.node.variants.edges[0]?.node.price.amount ??
    p.node.priceRange.minVariantPrice.amount;
  return parseFloat(v || "0");
}

function optionValues(products: ShopifyProduct[], matcher: RegExp): string[] {
  const set = new Set<string>();
  for (const p of products) {
    const opt = p.node.options.find((o) => matcher.test(o.name));
    opt?.values.forEach((v) => set.add(v));
  }
  return Array.from(set);
}

function productHasOption(p: ShopifyProduct, matcher: RegExp, values: Set<string>): boolean {
  const opt = p.node.options.find((o) => matcher.test(o.name));
  if (!opt) return false;
  return opt.values.some((v) => values.has(v));
}

/* Filter bar trigger — text button, underlined when active */
function FilterButton({
  label,
  active,
  open,
  onToggle,
  children,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-14 shrink-0">
      <button
        onClick={onToggle}
        className={`flex h-14 cursor-pointer items-center whitespace-nowrap text-[12px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a] transition-opacity hover:opacity-60 ${
          active ? "underline underline-offset-[6px]" : ""
        }`}
      >
        {label}
      </button>
      {/* Desktop floating panel; on mobile the parent renders the panel
          as a strip below the bar instead (this one stays hidden) */}
      <div
        className={`absolute left-0 top-full z-50 hidden w-64 border border-[#EBEBEB] bg-white p-5 shadow-[0_16px_40px_-20px_rgba(0,0,0,0.18)] ${
          open ? "md:block" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CollectionPage() {
  const { handle } = Route.useParams();
  const { colour: paletteParam } = Route.useSearch();
  const data = Route.useLoaderData();

  const products: ShopifyProduct[] = data?.products ?? [];
  const meta = HANDLE_META[handle];
  const title = data?.title ?? meta?.title ?? titleize(handle);
  const description = data?.description ?? meta?.description ?? "";
  const heroImage =
    HERO_IMG[handle] ?? data?.image?.url ?? products[0]?.node.images.edges[0]?.node.url;

  const colorOpts = useMemo(() => {
    const present = new Set<string>();
    for (const p of products) {
      for (const v of productColourValues(p)) {
        const primary = primaryColourOf(v);
        if (primary) present.add(primary);
      }
    }
    return PRIMARY_COLOUR_GROUPS.filter((g) => present.has(g.name));
  }, [products]);
  const sizeOpts = useMemo(() => optionValues(products, /size/i), [products]);

  /* Attribute facets (Style, Wiring, Support Level, …) for this page.
     A facet only renders when the products actually on the page carry
     at least two distinct values for it — no useless dropdowns. */
  const facetKeys = COLLECTION_FACETS[handle] ?? ["category", "material"];
  const facetOptions = useMemo(() => {
    const out: { key: string; values: string[] }[] = [];
    for (const key of facetKeys) {
      const set = new Set<string>();
      for (const p of products) {
        facetValuesOf(p.node.handle, key).forEach((v) => set.add(v));
      }
      if (set.size >= 2) out.push({ key, values: Array.from(set).sort() });
    }
    return out;
  }, [products, facetKeys]);

  const [sort, setSort] = useState<SortKey>("featured");
  const [palette, setPalette] = useState<string | undefined>(paletteParam);
  useEffect(() => setPalette(paletteParam), [paletteParam]);
  const [selSizes, setSelSizes] = useState<Set<string>>(new Set());
  const [selColors, setSelColors] = useState<Set<string>>(new Set());
  const [selPrices, setSelPrices] = useState<Set<number>>(new Set()); // indices into PRICE_RANGES
  const [selFacets, setSelFacets] = useState<Record<string, Set<string>>>({});
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const toggleFacet = (key: string, val: string) => {
    setSelFacets((prev) => {
      const next = { ...prev };
      const set = new Set(next[key] ?? []);
      set.has(val) ? set.delete(val) : set.add(val);
      if (set.size) next[key] = set;
      else delete next[key];
      return next;
    });
    setVisibleCount(PAGE_SIZE);
  };
  const facetActiveCount = Object.values(selFacets).reduce((n, s) => n + s.size, 0);

  const toggleStr = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(val) ? next.delete(val) : next.add(val);
    setter(next);
    setVisibleCount(PAGE_SIZE);
  };
  const togglePrice = (i: number) => {
    const next = new Set(selPrices);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelPrices(next);
    setVisibleCount(PAGE_SIZE);
  };

  const activeCount =
    selSizes.size + selColors.size + selPrices.size + facetActiveCount + (palette ? 1 : 0);

  /* One definition per filter — rendered as dropdown triggers in the bar
     (desktop: floating panel; mobile: full-width strip under the bar so
     the sticky bar itself stays one fixed 56px line). */
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const filterDefs: { key: string; label: string; active: boolean; panel: React.ReactNode }[] = [
    {
      key: "sort",
      label: "Sort By",
      active: sort !== "featured",
      panel: (
        <div className="space-y-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`flex w-full items-center justify-between py-1.5 text-[12px] transition-opacity hover:opacity-60 ${
                s.key === sort ? "text-[#0a0a0a]" : "text-[#888888]"
              }`}
            >
              {s.label}
              {s.key === sort && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      ),
    },
    ...(sizeOpts.length > 0
      ? [
          {
            key: "size",
            label: "Size",
            active: selSizes.size > 0,
            panel: (
              <div className="grid grid-cols-4 gap-1.5">
                {sizeOpts.map((s) => {
                  const active = selSizes.has(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStr(selSizes, s, setSelSizes)}
                      className={`h-9 border text-[11px] uppercase tracking-[0.06em] transition ${
                        active
                          ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                          : "border-[#EBEBEB] text-[#0a0a0a] hover:border-[#0a0a0a]"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            ),
          },
        ]
      : []),
    ...facetOptions.map(({ key, values }) => {
      const sel = selFacets[key] ?? new Set<string>();
      return {
        key,
        label: FACET_LABELS[key] ?? key,
        active: sel.size > 0,
        panel: (
          <div className="space-y-0.5">
            {values.map((v) => {
              const active = sel.has(v);
              return (
                <button
                  key={v}
                  onClick={() => toggleFacet(key, v)}
                  className={`flex w-full items-center justify-between py-1.5 text-[12px] transition-opacity hover:opacity-60 ${
                    active ? "text-[#0a0a0a]" : "text-[#888888]"
                  }`}
                >
                  {v}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        ),
      };
    }),
    ...(colorOpts.length > 0
      ? [
          {
            key: "colour",
            label: "Colour",
            active: selColors.size > 0,
            panel: (
              <div className="space-y-0.5">
                {colorOpts.map((g) => {
                  const active = selColors.has(g.name);
                  return (
                    <button
                      key={g.name}
                      onClick={() => toggleStr(selColors, g.name, setSelColors)}
                      className={`flex w-full items-center justify-between py-1.5 text-[12px] transition-opacity hover:opacity-60 ${
                        active ? "text-[#0a0a0a]" : "text-[#888888]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-[#0a0a0a]/15"
                          style={{ background: g.hex }}
                        />
                        {g.name}
                      </span>
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
            ),
          },
        ]
      : []),
    {
      key: "price",
      label: "Price",
      active: selPrices.size > 0,
      panel: (
        <div className="space-y-0.5">
          {PRICE_RANGES.map((r, i) => {
            const active = selPrices.has(i);
            return (
              <button
                key={r.label}
                onClick={() => togglePrice(i)}
                className={`flex w-full items-center justify-between py-1.5 text-[12px] transition-opacity hover:opacity-60 ${
                  active ? "text-[#0a0a0a]" : "text-[#888888]"
                }`}
              >
                {r.label}
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            );
          })}
        </div>
      ),
    },
  ];
  const openDef = filterDefs.find((f) => f.key === openFilter) ?? null;

  const filtered = useMemo(() => {
    let list = products.slice();
    // Palette filter (from homepage Shop by Colour): fuzzy match so
    // "Black" catches "Classic black", "black triangle", etc.
    if (palette) {
      const q = palette.toLowerCase();
      list = list.filter((p) => {
        const opt = p.node.options.find((o) => /colou?r/i.test(o.name));
        return opt?.values.some((v) => v.toLowerCase().includes(q));
      });
    }
    if (selSizes.size) list = list.filter((p) => productHasOption(p, /size/i, selSizes));
    if (selColors.size) {
      list = list.filter((p) =>
        productColourValues(p).some((v) => {
          const primary = primaryColourOf(v);
          return primary !== null && selColors.has(primary);
        }),
      );
    }
    for (const [key, sel] of Object.entries(selFacets)) {
      if (!sel.size) continue;
      list = list.filter((p) =>
        facetValuesOf(p.node.handle, key).some((v) => sel.has(v)),
      );
    }
    if (selPrices.size) {
      list = list.filter((p) => {
        const price = minPrice(p);
        return Array.from(selPrices).some((i) => {
          const r = PRICE_RANGES[i];
          return price >= r.min && price < r.max;
        });
      });
    }
    switch (sort) {
      case "price-asc": list.sort((a, b) => minPrice(a) - minPrice(b)); break;
      case "price-desc": list.sort((a, b) => minPrice(b) - minPrice(a)); break;
      case "title": list.sort((a, b) => a.node.title.localeCompare(b.node.title)); break;
    }
    return list;
  }, [products, palette, selSizes, selColors, selPrices, selFacets, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Collection hero — full-width, 45vh, name bottom-left */}
      <section className="relative h-[45vh] w-full overflow-hidden bg-[#f5f5f5]">
        {HERO_VIDEO[handle] ? (
          <video
            src={HERO_VIDEO[handle].src}
            poster={HERO_VIDEO[handle].poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 block h-full w-full object-cover"
          />
        ) : heroImage ? (
          <EditorialImage src={heroImage} alt={title} position="center" hover={false} eager />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <div className="absolute bottom-7 left-7 z-10 max-w-lg">
          <h1 className="text-[11px] uppercase tracking-widest text-white">{title}</h1>
          {description && (
            <p className="mt-1.5 text-[12px] leading-snug text-white/85">{description}</p>
          )}
        </div>
      </section>

      {/* SKIMS-style category tile row */}
      <CategoryTiles handle={handle} />

      {/* Sticky filter bar — 56px, white, hairline border */}
      <div className="sticky top-[88px] z-30 border-b border-[#EBEBEB] bg-white">
        <div className="container-px flex h-14 items-center justify-between gap-4">
          <div className="no-scrollbar -mx-5 flex min-w-0 flex-1 items-center gap-6 overflow-x-auto px-5 md:mx-0 md:gap-8 md:overflow-visible md:px-0">
            {filterDefs.map((f) => (
              <FilterButton
                key={f.key}
                label={f.label}
                active={f.active}
                open={openFilter === f.key}
                onToggle={() => setOpenFilter((k) => (k === f.key ? null : f.key))}
              >
                {f.panel}
              </FilterButton>
            ))}

            {palette && (
              <button
                onClick={() => setPalette(undefined)}
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border border-[#0a0a0a] px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-[#0a0a0a] transition-opacity hover:opacity-60"
              >
                Colour: {palette} ✕
              </button>
            )}
            {activeCount > 0 && (
              <button
                onClick={() => {
                  setSelSizes(new Set());
                  setSelColors(new Set());
                  setSelPrices(new Set());
                  setSelFacets({});
                  setPalette(undefined);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="shrink-0 whitespace-nowrap text-[11px] uppercase tracking-[0.14em] text-[#888888] transition-colors hover:text-[#0a0a0a]"
              >
                Clear
              </button>
            )}
          </div>

          <span className="hidden shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#888888] md:inline">
            {filtered.length} {filtered.length === 1 ? "Item" : "Items"}
          </span>
        </div>

        {/* Mobile: open filter renders as a full-width strip below the bar,
            keeping the bar itself a fixed single line */}
        {openDef && (
          <div className="border-t border-[#EBEBEB] bg-white px-5 pb-5 pt-4 md:hidden">
            {openDef.panel}
          </div>
        )}
      </div>

      {/* Product grid — 4 col / 2 col, 12px / 8px gaps, no chrome */}
      <section className="container-px py-10 md:py-14">
        {visible.length === 0 ? (
          <div className="py-24 text-center">
            <h2 className="font-serif text-2xl font-light text-[#0a0a0a]">
              Nothing matches those filters
            </h2>
            <p className="mt-2 text-[13px] text-[#888888]">
              Try removing a filter to see more of the collection.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: item count lives here, out of the way of the filter row */}
            <p className="mb-5 text-[11px] uppercase tracking-[0.14em] text-[#888888] md:hidden">
              {filtered.length} {filtered.length === 1 ? "Item" : "Items"}
            </p>
            <div className="grid grid-cols-2 gap-x-2 gap-y-8 md:grid-cols-4 md:gap-x-3 md:gap-y-12">
              {visible.map((p) => (
                <ProductCard key={p.node.id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-14 flex justify-center">
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="inline-flex h-12 w-[200px] items-center justify-center border border-[#0a0a0a] bg-transparent text-[11px] uppercase tracking-[0.16em] text-[#0a0a0a] transition-colors duration-[250ms] hover:bg-[#0a0a0a] hover:text-white"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
