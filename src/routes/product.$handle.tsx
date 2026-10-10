import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { LEGACY_PRODUCT_HANDLES } from "@/lib/productHandles";
import { sizeLabel } from "@/lib/sizeLabels";
import { galleryUrls, indexedGhost, indexedHex, indexedSwatch, GALLERY_INDEX } from "@/lib/galleryIndex";
import { safeDescriptionHtml, hasStructure } from "@/lib/safeDescription";
import {
  inDuoDeal,
  MULTI_BUY_TIERS,
  MULTI_BUY_ATTRIBUTE,
  tierTotal,
  bestValueTier,
  type MultiBuyTier,
} from "@/lib/duoDeal";
import { MultiBuySelector } from "@/components/site/MultiBuySelector";
import { TrustBadges } from "@/components/site/TrustBadges";
import { isFinalSale } from "@/lib/returnsPolicy";
import { ProductStory } from "@/components/site/ProductStory";
import { descriptionParts, fitNote, fabricLine } from "@/lib/productStory";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reviews } from "@/components/site/Reviews";
import { useJudgemeReviews } from "@/lib/judgeme";
import { SizeGuide } from "@/components/site/SizeGuide";
import { resolveGuide, fitLabel, SIZE_GUIDES } from "@/lib/sizeGuides";
import { chartForHandle, isGuideHidden } from "@/lib/productSizeCharts";
import {
  fetchProductByHandle,
  fetchProductRecommendations,
  fetchProducts,
  shopifyImg,
  shopifySrcSet,
  type ShopifyProduct,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { metaContentId, trackMetaEvent } from "@/lib/metaPixel";
import { useFavorites } from "@/stores/favoritesStore";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { sampleBackdrop, cachedBackdrop, tableBackdrop, backdropCss, type Backdrop } from "@/lib/imageBackdrop";
import { Loader2, Star, Heart, ChevronLeft, ChevronRight, ScanSearch } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useDisplayPrice, usePreferences, useT } from "@/lib/preferences";
import { BUNDLE_DEAL, inBundleDeal, useBundleLabel } from "@/lib/bundleDeal";
import { freeShippingThresholdFmt, useShippingCountry, PROCESSING_LABEL, transitLabel } from "@/lib/shipping";

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
  /* Renamed products: old links get a permanent redirect to the new handle. */
  beforeLoad: ({ params }) => {
    const to = LEGACY_PRODUCT_HANDLES[params.handle];
    if (to) throw redirect({ to: "/product/$handle", params: { handle: to }, statusCode: 301 });
  },
  loader: async ({ params, context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["product", params.handle],
      queryFn: () => fetchProductByHandle(params.handle),
    }),
  head: ({ params, loaderData }) => {
    const node = loaderData?.node;
    if (!node) {
      return { meta: [{ title: `${params.handle} — Auvella` }] };
    }
    const title = `${node.title} — Auvella`;
    const rawDesc = (node.description || "").replace(/\s+/g, " ").trim();
    const description =
      rawDesc.length > 0
        ? rawDesc.slice(0, 155)
        : `${node.title} — built to hold where it helps and stay put all day. From Auvella.`;
    const image = node.images.edges[0]?.node.url;
    const price = node.priceRange.minVariantPrice;
    const url = `https://auvellawear.com/product/${params.handle}`;
    const variant = node.variants.edges[0]?.node;

    const jsonLd = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name: node.title,
      description: rawDesc || node.title,
      image: node.images.edges.map((e) => e.node.url),
      sku: variant?.id,
      brand: { "@type": "Brand", name: "Auvella" },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: price.currencyCode,
        price: price.amount,
        availability: variant?.availableForSale
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        ...(image ? [{ name: "twitter:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
});

const COLOR_MAP: Record<string, string> = {
  // neutrals
  black: "#0d0d0d", white: "#f5f3ee", offwhite: "#f2efe8", ivory: "#efe7d4",
  cream: "#f1ead9", ecru: "#ece3d0", oat: "#e8dfc9", bone: "#eae4d6",
  beige: "#e6d6b8", sand: "#dcc9a8", stone: "#cfc4b2", taupe: "#b3a38e",
  nude: "#e2c2a4", skin: "#d8b899", tan: "#c89a72", camel: "#b98a54",
  caramel: "#a8703f", cocoa: "#5c3b27", mocha: "#6b4a37", coffee: "#5a4232",
  espresso: "#3c2a1e", brown: "#6b3a2a", chocolate: "#4a2a1c",
  grey: "#8a8a8a", gray: "#8a8a8a", heather: "#9a9a94", charcoal: "#2d2d2d",
  silver: "#c9c9c9",
  // reds / pinks
  red: "#a8312b", cherry: "#7e1c22", maroon: "#5e1d22", burgundy: "#5e1d22",
  wine: "#5e1d22", rust: "#a14e2f", terracotta: "#b0603f", copper: "#a5643c",
  pink: "#e3a5b1", blush: "#e8c4c4", rose: "#c97a8a", fuchsia: "#b23a76",
  magenta: "#a92f6f", coral: "#e07a5f", melon: "#f2917e", watermelon: "#df5f6a",
  peach: "#f0b8a0", apricot: "#eeb98a", salmon: "#e99787",
  // purples
  plum: "#5c3a56", purple: "#5d3a6e", violet: "#6b4e8e", grape: "#563a67",
  aubergine: "#472b46", lavender: "#b9a7cf", lilac: "#c6aedc", mauve: "#a5789b",
  orchid: "#a56aa8",
  // blues / greens
  navy: "#1e2a44", blue: "#274b73", cobalt: "#2a4a8f", royal: "#2c3f8f",
  denim: "#3f5673", sky: "#a9c4d9", teal: "#2f5f5f", turquoise: "#3a8f8a",
  mint: "#bcd8c4", sage: "#9aab93", olive: "#5a5a3a", khaki: "#8a805a",
  green: "#3f5a3a", emerald: "#2f6b4f", forest: "#2c4a34",
  // yellows / oranges
  yellow: "#d9b13b", lemon: "#e4cf5e", mustard: "#c2932f", gold: "#b8913d",
  champagne: "#e3d3b1", orange: "#cf6a2e", amber: "#c07f2e",
};

/**
 * Accurate swatch hex for a variant colour name, or null when no confident
 * match exists (prints, novel names) — callers then fall back to an image
 * swatch cropped from the variant's own photo.
 */
function swatchHex(name: string): string | null {
  const key = name.toLowerCase().trim();
  let best: string | null = null;
  let bestLen = 0;
  for (const k of Object.keys(COLOR_MAP)) {
    if (key.includes(k) && k.length > bestLen) {
      best = COLOR_MAP[k];
      bestLen = k.length;
    }
  }
  return best;
}

function inferCollection(title: string): { handle: string; label: string; query: string } {
  const t = title.toLowerCase();
  if (/bodysuit/.test(t)) return { handle: "bodysuits", label: "Bodysuits", query: "bodysuit" };
  if (/bra|bralette|cami/.test(t))
    return { handle: "bras", label: "Bras", query: "bra OR bralette OR cami" };
  if (/legging/.test(t)) return { handle: "shapewear", label: "Shapewear", query: "legging OR shaping" };
  if (/short|shape|sculpt|brief/.test(t))
    return { handle: "shapewear", label: "Shapewear", query: "shape OR sculpt OR short OR control" };
  if (/pyjama|pajama/.test(t))
    return { handle: "loungewear-sleepwear", label: "Loungewear", query: "pajama OR satin OR lounge" };
  if (/robe/.test(t)) return { handle: "robes", label: "Robes", query: "robe OR satin" };
  if (/dress/.test(t)) return { handle: "dresses", label: "Dresses", query: "dress" };
  if (/bikini|swim/.test(t)) return { handle: "swim", label: "Swim", query: "bikini OR swim" };
  if (/active|sports/.test(t)) return { handle: "bras", label: "Bras", query: "sports OR bra" };
  if (/lounge|sleep|fleece/.test(t))
    return { handle: "loungewear-sleepwear", label: "Loungewear", query: "lounge OR fleece OR sleep" };
  return { handle: "new-in", label: "Shop", query: "" };
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < Math.round(rating) ? "fill-[#0a0a0a] text-[#0a0a0a]" : "fill-[#0a0a0a]/10 text-[#0a0a0a]/10"}`}
        />
      ))}
    </span>
  );
}

function ProductPage() {
  const { handle } = Route.useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle),
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ["recommendations", handle],
    queryFn: () =>
      product?.node?.id ? fetchProductRecommendations(product.node.id) : Promise.resolve([]),
    enabled: !!product?.node?.id,
  });

  const node = product?.node;

  const { data: judgeme, isLoading: reviewsLoading } = useJudgemeReviews(handle);
  const reviewAvg = judgeme?.average ?? 0;
  const reviewCount = judgeme?.count ?? 0;

  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);
  /* Multi-buy tier: 1, 2 or 3 units of this product (MULTI_BUY_TIERS). Only
     offered where the Shopify rule applies; everywhere else it stays 1. */
  const [pack, setPack] = useState<MultiBuyTier["quantity"]>(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [barVisible, setBarVisible] = useState(false);
  const favHandles = useFavorites((s) => s.handles);
  const toggleFav = useFavorites((s) => s.toggle);
  const liked = favHandles.includes(handle);
  const [visualOpen, setVisualOpen] = useState(false);
  const [tab, setTab] = useState<"details" | "fit" | "shipping">("details");
  const [readMore, setReadMore] = useState(false);
  useEffect(() => setReadMore(false), [handle]);
  const [sizePulse, setSizePulse] = useState(false);
  const sizeRegion = usePreferences((st) => st.sizeRegion);
  const atcRef = useRef<HTMLButtonElement>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const adding = useCartStore((s) => s.isLoading);
  const resolveCheckoutUrl = useCartStore((s) => s.resolveCheckoutUrl);
  const getCheckoutUrl = useCartStore((s) => s.getCheckoutUrl);
  const [buyingNow, setBuyingNow] = useState(false);
  const bagItems = useCartStore((s) => s.items);
  /* What the main button last put in the bag (tier + variants), so the sticky
     bar can go straight to checkout instead of adding the same items again. */
  const [addedKey, setAddedKey] = useState<string | null>(null);
  const mobileBarRef = useRef<HTMLDivElement>(null);
  const desktopBarRef = useRef<HTMLDivElement>(null);

  // Record this visit for the Recently Viewed rail (account page etc.).
  const recordViewed = useRecentlyViewed((s) => s.record);
  useEffect(() => {
    if (handle) recordViewed(handle);
  }, [handle, recordViewed]);

    // Meta ViewContent — one event per product, once its data has resolved.
  // Keyed on the product id rather than the handle so a re-render or a
  // colour change doesn't re-report the same view.
  const metaViewedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!node || metaViewedRef.current === node.id) return;
    metaViewedRef.current = node.id;
    const price = node.priceRange.minVariantPrice;
    const amount = Number(price.amount) || 0;
    const contentId = metaContentId(node.variants.edges[0]?.node.id);
    trackMetaEvent("ViewContent", {
      value: amount,
      currency: price.currencyCode,
      content_type: "product",
      content_name: node.title,
      content_ids: [contentId],
      contents: [{ id: contentId, quantity: 1, item_price: amount }],
    });
  }, [node]);

  // Initialize non-size options from the first variant; size stays an explicit choice.
  const initialSelected = useMemo(() => {
    if (!node) return {};
    const first = node.variants.edges[0]?.node;
    const init: Record<string, string> = {};
    first?.selectedOptions.forEach((o) => {
      if (!/size/i.test(o.name)) init[o.name] = o.value;
    });
    return init;
  }, [node]);

  const currentSelected = Object.keys(selected).length ? selected : initialSelected;

  const variant = useMemo(() => {
    if (!node) return undefined;
    return (
      node.variants.edges.find((v) =>
        v.node.selectedOptions.every((o) => currentSelected[o.name] === o.value),
      )?.node ?? undefined
    );
  }, [node, currentSelected]);

  const priceVariant = variant ?? node?.variants.edges[0]?.node;

  /* Multi-buy items #2 and #3: each has its own colour/size, editable in the
     panel under the tiers. Item #1 is the main selection. Only the options the
     shopper changes on a row are stored; the rest follow #1, so "2 of the
     same" needs no extra clicks and a size picked later on #1 carries over. */
  const [extraSel, setExtraSel] = useState<Record<string, string>[]>([]);
  /* Colour the gallery previews after the shopper changes item #2 or #3, so
     picking Nude for #2 shows Nude instead of #1's colour (Joshua, 10 Oct
     2026). Any change to #1 - the main selection - or to the tier hands the
     gallery back to #1. */
  const [previewColour, setPreviewColour] = useState<string | undefined>(undefined);
  // The route stays mounted between products: each one starts on a single
  // item with no picks left over from the last.
  useEffect(() => {
    setSelected({});
    setPack(1);
    setExtraSel([]);
    setPreviewColour(undefined);
    setAddedKey(null);
  }, [handle]);
  const extraSels = useMemo(
    () => [0, 1].map((i) => ({ ...currentSelected, ...(extraSel[i] ?? {}) })),
    [extraSel, currentSelected],
  );
  const extraVariants = useMemo(
    () =>
      extraSels.map(
        (sel) =>
          node?.variants.edges.find((v) =>
            v.node.selectedOptions.every((o) => sel[o.name] === o.value),
          )?.node,
      ),
    [node, extraSels],
  );

  // Dedupe images by URL (ignore CDN size params) and upscale via Shopify CDN.
  const images = useMemo(() => {
    if (!node) return [] as Array<{ node: { url: string; altText: string | null } }>;
    const seen = new Set<string>();
    const out: Array<{ node: { url: string; altText: string | null } }> = [];
    for (const img of node.images.edges) {
      try {
        const u = new URL(img.node.url);
        const key = u.origin + u.pathname;
        if (seen.has(key)) continue;
        seen.add(key);
      } catch {
        if (seen.has(img.node.url)) continue;
        seen.add(img.node.url);
      }
      out.push({ node: { url: shopifyImg(img.node.url, 1600), altText: img.node.altText } });
    }
    return out;
  }, [node]);

  // ---------- Variant-aware gallery ----------
  const colorOptName = useMemo(
    () => node?.options.find((o) => /colou?r/i.test(o.name))?.name,
    [node],
  );
  const activeColour = colorOptName ? currentSelected[colorOptName] : undefined;
  /** What the gallery shows: the multi-buy row last touched, else #1. */
  const galleryColour = previewColour ?? activeColour;

  /**
   * Images grouped per colour: the variant's featured image(s) first, then any
   * product image whose alt-text or filename names the colour. Colours with no
   * identifiable images fall back to the full gallery (graceful, never empty).
   */
  const colorImageMap = useMemo(() => {
    const map = new Map<string, typeof images>();
    if (!node || !colorOptName) return map;
    const values = node.options.find((o) => o.name === colorOptName)?.values ?? [];

    const pathOf = (url: string) => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    };

    // Each colour's featured image index in the ordered gallery — Shopify
    // galleries run [colourA front, colourA back, colourB front, ...], so a
    // colour's set is the slice from its lead image to the next colour's lead.
    const leadIdx = new Map<string, number>();
    for (const value of values) {
      const v = node.variants.edges.find(
        (vv) =>
          vv.node.selectedOptions.some(
            (o) => o.name === colorOptName && o.value === value,
          ) && vv.node.image?.url,
      );
      if (!v?.node.image?.url) continue;
      const p = pathOf(v.node.image.url);
      const idx = images.findIndex((im) => pathOf(im.node.url) === p);
      if (idx >= 0) leadIdx.set(value, idx);
    }
    // Positional slicing is only trustworthy when every colour leads at a
    // distinct gallery position.
    const idxList = [...leadIdx.values()];
    const positional = idxList.length === values.filter((v) => leadIdx.has(v)).length
      && new Set(idxList).size === idxList.length
      && idxList.length > 0;
    const sortedLeads = [...leadIdx.entries()].sort((a, b) => a[1] - b[1]);

    for (const value of values) {
      const phrase = value.toLowerCase().trim();
      const tokens = phrase.split(/[\s/_-]+/).filter((t) => t.length > 2);
      const set: typeof images = [];
      const seen = new Set<string>();
      const push = (url: string, altText: string | null) => {
        const key = pathOf(url);
        if (seen.has(key)) return;
        seen.add(key);
        set.push({ node: { url, altText } });
      };

      // 0) Hand-verified index: exact shots for this colour, no guessing.
      const indexed = galleryUrls(node.handle, value, images.map((im) => im.node));
      if (indexed && indexed.length > 0) {
        for (const n of indexed) push(n.url, n.altText);
        map.set(value, set);
        continue;
      }

      // 1) Positional slice: this colour's gallery run
      if (positional && leadIdx.has(value)) {
        const start = leadIdx.get(value)!;
        const pos = sortedLeads.findIndex(([v]) => v === value);
        const end = pos + 1 < sortedLeads.length ? sortedLeads[pos + 1][1] : images.length;
        for (const im of images.slice(start, end)) push(im.node.url, im.node.altText);
      } else {
        // Fallback lead: the variant's featured image
        const v = node.variants.edges.find(
          (vv) =>
            vv.node.selectedOptions.some(
              (o) => o.name === colorOptName && o.value === value,
            ) && vv.node.image?.url,
        );
        if (v?.node.image?.url) push(shopifyImg(v.node.image.url, 1600), value);
      }

      // 2) Plus any image naming the colour in alt text or filename
      for (const im of images) {
        const hay = `${im.node.altText ?? ""} ${im.node.url}`.toLowerCase();
        if (hay.includes(phrase) || (tokens.length && tokens.every((t) => hay.includes(t)))) {
          push(im.node.url, im.node.altText);
        }
      }
      map.set(value, set);
    }
    return map;
  }, [node, colorOptName, images]);

  const activeImages = useMemo(() => {
    if (!galleryColour) return images;
    const set = colorImageMap.get(galleryColour);
    return set && set.length > 0 ? set : images;
  }, [images, colorImageMap, galleryColour]);

  // Colour change: reset to that colour's first image, everywhere.
  const mobileGalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setImageIdx(0);
    mobileGalRef.current?.scrollTo({ left: 0 });
  }, [galleryColour]);

  /* Non-colour options (the Body Adhesive's Type, say) never changed the
     photo, so every variant looked like the first one. When the chosen
     variant has its own linked photo in the visible gallery, jump to it. */
  const variantImageUrl = variant?.image?.url;
  useEffect(() => {
    if (!variantImageUrl) return;
    const key = (u: string) => u.split("?")[0];
    const idx = activeImages.findIndex((i) => key(i.node.url) === key(variantImageUrl));
    if (idx >= 0) {
      setImageIdx(idx);
      mobileGalRef.current?.scrollTo({ left: idx * (mobileGalRef.current?.clientWidth ?? 0) });
    }
  }, [variantImageUrl, activeImages]);

  // Desktop drag state
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef({ active: false, startX: 0, moved: false });

  // Sticky bar appears once the main Add to Bag button has scrolled up past
  // the top of the screen - not while it is still below the fold on arrival.
  // The root is stretched far below the viewport, so "intersecting" means "not
  // yet above the top edge": the state flips exactly when the button crosses
  // that edge, even on a jump (an anchor link) that skips the viewport.
  useEffect(() => {
    const el = atcRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting), {
      rootMargin: "0px 0px 100000px 0px",
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [node?.id]);

  /* While a sticky bar is up, publish its height so fixed corner controls
     (the footer's back-to-top) can sit above it instead of over its button,
     and pad scrolling so keyboard focus never lands underneath it (WCAG 2.4.11).
     Only the bar for this screen size is displayed, so only it has a height;
     re-measured when the window is resized across the breakpoint. */
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const h = barVisible
        ? mobileBarRef.current?.offsetHeight || desktopBarRef.current?.offsetHeight || 0
        : 0;
      root.style.setProperty("--buy-bar-h", `${h}px`);
      root.style.scrollPaddingBottom = `${h}px`;
    };
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--buy-bar-h");
      root.style.removeProperty("scroll-padding-bottom");
    };
  }, [barVisible]);

  const display = useDisplayPrice();
  const t = useT();
  void t;
  const { country: shipCountry } = useShippingCountry();
  const activeCurrency = usePreferences((s) => s.currency);
  const shipThreshold = freeShippingThresholdFmt(activeCurrency);
  // Hook — must sit above the early returns below, not beside bundleDeal.
  const bundleLabel = useBundleLabel();
  const shipDest = `${shipCountry.the ? "the " : ""}${shipCountry.name}`;

  /*
   * These sit ABOVE the early returns on purpose.
   *
   * On a cold load the product query has not resolved yet, so the first
   * render takes the `isLoading` branch below and stops. When the data
   * arrived the component rendered again, reached this point and called three
   * more hooks than it had the first time — the one thing React refuses to
   * continue past. That took every product page down on any direct visit:
   * ad clicks, search results, shared links, refreshes. Clicking through from
   * a collection hid it, because the data was already cached and the first
   * render went straight through.
   *
   * Every hook must run on every render, before any branch that can return
   * early. `activeImages` and `imageIdx` both resolve above, so these are safe
   * here and simply compute over an empty gallery while the product loads.
   */
  const galleryLen = activeImages.length;
  const safeIdx = Math.min(imageIdx, Math.max(galleryLen - 1, 0));
  const prevImg = () => setImageIdx((i) => (Math.min(i, galleryLen - 1) - 1 + galleryLen) % galleryLen);
  const nextImg = () => setImageIdx((i) => (Math.min(i, galleryLen - 1) + 1) % galleryLen);
  const mainImg = activeImages[safeIdx]?.node;

  /* Paint the gallery frame with the active shot's own backdrop, so the photo
     reads edge-to-edge instead of floating on the site's cream. Model shots and
     ghost shots resolve to different greys, hence per-image rather than fixed. */
  /* Indexed images resolve synchronously from the build-time table, so the
     frame is painted the right colour in the same render that swaps the image —
     no fetch, no fade. The async sampler only runs for images the table lacks. */
  const [sampled, setSampled] = useState<Backdrop | undefined>(undefined);
  /* Render reads the build-time table only. The runtime cache is warm on the
     server (the Worker isolate is reused between visitors) but empty in a
     fresh browser, so consulting it here made the server paint a colour the
     client's first render could not reproduce. */
  const backdrop = backdropCss(tableBackdrop(mainImg?.url) ?? sampled);
  useEffect(() => {
    const url = mainImg?.url;
    if (!url) return;
    /* After mount the runtime cache is safe: this runs only in the browser. */
    const hit = cachedBackdrop(url);
    if (hit) {
      setSampled(hit);
      return;
    }
    let live = true;
    sampleBackdrop(url).then((c) => {
      if (live) setSampled(c);
    });
    return () => {
      live = false;
    };
  }, [mainImg?.url]);

  // Warm the next/previous shots so swiping doesn't flash the old colour.
  useEffect(() => {
    if (galleryLen < 2) return;
    [safeIdx + 1, safeIdx - 1].forEach((i) => {
      const url = activeImages[(i + galleryLen) % galleryLen]?.node.url;
      if (url && !cachedBackdrop(url)) void sampleBackdrop(url);
    });
  }, [safeIdx, galleryLen, activeImages]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container-px flex justify-center py-32">
          <Loader2 className="h-6 w-6 animate-spin text-[#888888]" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!node) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="container-px py-32 text-center">
          <h1 className="font-serif text-3xl font-light text-[#0a0a0a]">Product not found</h1>
          <Link to="/" className="mt-6 inline-block text-[#555555] underline underline-offset-4">
            Back to shop
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const sizeOption = node.options.find((o) => /size/i.test(o.name));
  const hasSize = !sizeOption || !!currentSelected[sizeOption.name];
  /* Any option that is neither colour nor size — a scent, a version, a pack
     size. Accessories need this; without it such variants were unselectable. */
  const otherOptions = node.options.filter(
    (o) => o !== colorOption && o !== sizeOption && o.values.length > 1,
  );

  const unitPrice = parseFloat(priceVariant?.price.amount ?? "0");
  const currency = priceVariant?.price.currencyCode ?? "GBP";
  const cur = (n: number) => display(n, currency);
  const compareAt = priceVariant?.compareAtPrice;
  const onSale = !!compareAt && parseFloat(compareAt.amount) > unitPrice;
  const bundleDeal = inBundleDeal(node.handle);
  const crumb = inferCollection(node.title);
  const sizeGuide = resolveGuide(node.title);
  /* UK size beside each letter ("S (8–10)") — see sizeLabels.ts. */
  const sizeLabelled =
    !!sizeOption && sizeOption.values.some((v) => sizeLabel(node.handle, v, sizeRegion, sizeGuide.guideType));
  const sizeFitLabel = fitLabel(sizeGuide.guideType, sizeGuide.fitOverride);
  // Real supplier chart (by handle) beats the category guide; the hide list
  // beats everything.
  const productChart = chartForHandle(handle);
  const guideHidden = isGuideHidden(handle);
  const showSizeGuide =
    !guideHidden && (productChart != null || sizeGuide.guideType !== "none");

  /** True if any purchasable variant carries this size value. */
  const sizeAvailable = (size: string) =>
    node.variants.edges.some(
      (v) =>
        v.node.availableForSale &&
        v.node.selectedOptions.some((o) => /size/i.test(o.name) && o.value === size),
    );

  const setOpt = (name: string, value: string) => {
    setSelected({ ...currentSelected, [name]: value });
    setPreviewColour(undefined);
  };

  const scrollToSizes = () => {
    sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setSizePulse(true);
    setTimeout(() => setSizePulse(false), 1200);
  };

  /* Multi-buy: which tier is chosen, and the units it puts in the bag (#1 is
     the main selection, #2/#3 their own colour/size). */
  const multiBuy = inDuoDeal(node.handle);
  const tier =
    MULTI_BUY_TIERS.find((t) => t.quantity === (multiBuy ? pack : 1)) ?? MULTI_BUY_TIERS[0];
  const units = [variant, ...extraVariants].slice(0, tier.quantity);
  /** Unit prices for a tier: each chosen item's own price, the shown price until it resolves. */
  const tierUnitPrices = (t: MultiBuyTier) =>
    [variant, ...extraVariants]
      .slice(0, t.quantity)
      .map((u) => (u ? parseFloat(u.price.amount) : unitPrice));
  const payTotal = tierTotal(tierUnitPrices(tier), tier.percent);

  /* This exact selection (tier + variants) is what the main button last added
     and it is still in the bag: the sticky bar then just goes to checkout. */
  const unitsKey = `${tier.quantity}:${units.map((u) => u?.id ?? "").join("|")}`;
  const inBag =
    addedKey === unitsKey && units.every((u) => !!u && bagItems.some((i) => i.variantId === u.id));

  const choosePack = (q: MultiBuyTier["quantity"]) => {
    setPack(q);
    // Items beyond the new tier are dropped, so a later tier starts as a copy of #1 again.
    setExtraSel((prev) => prev.slice(0, q - 1));
    setPreviewColour(undefined);
  };

  /** Whether some purchasable variant has this option value, given a row's other picks. */
  const optAvailable = (sel: Record<string, string>, name: string, value: string) =>
    node.variants.edges.some(
      ({ node: v }) =>
        v.availableForSale &&
        v.selectedOptions.every((o) =>
          o.name === name ? o.value === value : !sel[o.name] || sel[o.name] === o.value,
        ),
    );

  /** What stops a row of the multi-buy panel being added, if anything. */
  const rowProblem = (i: number): string | null => {
    const u = units[i];
    const sel = i === 0 ? currentSelected : extraSels[i - 1];
    if (sizeOption && !sel[sizeOption.name]) return `Choose a size for item #${i + 1}`;
    if (!u) return `Item #${i + 1}: that colour and size don't go together — pick another`;
    if (!u.availableForSale) return `Item #${i + 1} is sold out in that colour and size`;
    return null;
  };

  /** Size chosen and every item resolves to a purchasable variant; tells the shopper if not. */
  const readyToAdd = (): boolean => {
    if (!hasSize) {
      scrollToSizes();
      return false;
    }
    if (!variant || !variant.availableForSale) {
      toast.error(
        variant
          ? "That colour and size is sold out — choose another."
          : "That colour and size don't go together — choose another.",
        { position: "top-center" },
      );
      return false;
    }
    const problem = units.map((_, i) => rowProblem(i)).find(Boolean);
    if (problem) {
      toast.error(problem, { position: "top-center" });
      return false;
    }
    return true;
  };

  /**
   * Adds every unit of the chosen tier and reports how far it got. Stops at the
   * first line Shopify refuses, so a retry never doubles what already went in.
   */
  const addUnits = async (): Promise<"all" | "some" | "none"> => {
    // The bag keeps one line per variant: the same size/colour twice is one
    // line of 2. Different sizes/colours are separate lines - the Shopify
    // rule counts units per product, so every one still earns the rate.
    const lines = new Map<string, { v: NonNullable<typeof variant>; qty: number }>();
    for (const u of units) {
      if (!u) return "none";
      lines.set(u.id, { v: u, qty: (lines.get(u.id)?.qty ?? 0) + 1 });
    }
    const attributes = multiBuy
      ? [{ key: MULTI_BUY_ATTRIBUTE, value: String(tier.quantity) }]
      : undefined;
    let done = 0;
    for (const { v, qty } of lines.values()) {
      const added = await addItem({
        product,
        variantId: v.id,
        variantTitle: v.title,
        price: v.price,
        quantity: qty,
        selectedOptions: v.selectedOptions || [],
        attributes,
      });
      if (!added) return done ? "some" : "none";
      done++;
    }
    return "all";
  };

  const addFailed = (result: "some" | "none") =>
    toast.error(
      result === "some"
        ? "Only some of those went into your bag — please check it before checking out."
        : "We couldn't add that to your bag. Please try again.",
      { position: "top-center" },
    );

  const handleAdd = async () => {
    if (!readyToAdd()) return;
    const result = await addUnits();
    if (result !== "all") {
      setAddedKey(null);
      addFailed(result);
      return;
    }
    setAddedKey(unitsKey);
    toast.success(
      tier.quantity === 1
        ? "Added to bag"
        : tier.percent
          ? `${tier.quantity} added to bag — ${tier.percent}% off each applies at checkout`
          : `${tier.quantity} added to bag`,
      { position: "top-center" },
    );
  };

  /*
   * Sticky bar on phones. "Buy now" adds the chosen tier and goes straight to
   * checkout; once that selection is already in the bag it reads "Checkout"
   * and goes there without adding it again. Same new-tab pattern as the bag's
   * checkout (CartDrawer.handleCheckout): the tab opens synchronously inside
   * the tap, because mobile Safari blocks window.open after an await, and it
   * says what it's doing while the bag updates. Checkout shows the whole bag.
   */
  const handleBuyNow = async () => {
    if (buyingNow || !readyToAdd()) return;
    setBuyingNow(true);
    const win = window.open("", "_blank");
    if (win) {
      try {
        win.document.title = "Checkout";
        win.document.body.style.cssText =
          "font:15px -apple-system,system-ui,sans-serif;padding:32px;color:#0a0a0a";
        win.document.body.textContent = "Opening checkout…";
      } catch {
        // Not our document to write to - the blank tab still works.
      }
    }
    try {
      if (!inBag) {
        const result = await addUnits();
        if (result !== "all") {
          win?.close();
          setAddedKey(null);
          addFailed(result);
          return;
        }
        setAddedKey(unitsKey);
      }
      const url = (await resolveCheckoutUrl()) ?? getCheckoutUrl();
      if (!url) {
        win?.close();
        toast.error(
          "We couldn't open checkout. Your items are in your bag — open it to check out.",
          { position: "top-center" },
        );
        return;
      }
      if (win) win.location.href = url;
      else window.location.href = url;
    } catch {
      win?.close();
    } finally {
      setBuyingNow(false);
    }
  };


  // Desktop drag handlers — premium feel: track follows the pointer, then settles.
  const onPointerDown = (e: ReactPointerEvent) => {
    dragRef.current = { active: true, startX: e.clientX, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 4) dragRef.current.moved = true;
    setDragX(dx);
  };
  const onPointerUp = () => {
    if (!dragRef.current.active) return;
    const dx = dragX;
    const moved = dragRef.current.moved;
    dragRef.current.active = false;
    setDragX(0);
    void moved;
    if (dx < -60 && galleryLen > 1) nextImg();
    else if (dx > 60 && galleryLen > 1) prevImg();
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="lg:grid lg:grid-cols-[1.3fr_1fr]">
        {/* Mobile: title block above the gallery — selectors then sit
            directly under the image, SKIMS-style */}
        <div className="px-5 pb-4 pt-6 lg:hidden">
          <Link
            to="/collections/$handle"
            params={{ handle: crumb.handle }}
            className="text-[10px] uppercase tracking-[0.2em] text-[#888888]"
          >
            {crumb.label}
          </Link>
          <h1 className="mt-2 text-[17px] font-medium uppercase leading-snug tracking-[0.06em] text-[#0a0a0a]">
            {node.title}
          </h1>
          <div className="mt-1.5 flex items-center gap-3">
            <p className="text-[14px] text-[#0a0a0a]">
              {cur(unitPrice)}
              {onSale && compareAt && (
                <span className="ml-2 text-[12px] text-[#888888] line-through">
                  {cur(parseFloat(compareAt.amount))}
                </span>
              )}
            </p>
            {reviewCount > 0 && (
              <a href="#reviews" className="inline-flex items-center gap-1.5">
                <Stars rating={reviewAvg} />
                <span className="text-[10px] text-[#555555] underline underline-offset-4">
                  {reviewCount} {reviewCount === 1 ? "Review" : "Reviews"}
                </span>
              </a>
            )}
          </div>
          {bundleDeal && (
            <div className="mt-2.5">
              <span className="inline-block border border-[#0a0a0a] px-2 py-[3px] text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]">
                {bundleLabel}
              </span>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#555555]">
                {BUNDLE_DEAL.detail}
              </p>
            </div>
          )}
        </div>

        {/* ============ GALLERY — dominant, editorial ============ */}
        <section
          className="relative"
          style={{ background: backdrop }}
        >
          {/* Desktop: single immersive frame with subtle controls */}
          <div className="relative hidden overflow-hidden lg:sticky lg:top-[88px] lg:block lg:h-[calc(100vh-88px)]">
            <div
              className="absolute inset-0 flex touch-none"
              style={{
                cursor: dragRef.current.active ? "grabbing" : "grab",
                transform: `translateX(calc(${-safeIdx * 100}% + ${dragX}px))`,
                transition: dragRef.current.active
                  ? "none"
                  : "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {activeImages.map((im, i) => (
                <img
                  key={im.node.url + i}
                  src={shopifyImg(im.node.url, 1200)}
                  srcSet={shopifySrcSet(im.node.url, 2000)}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  alt={im.node.altText ?? node.title}
                  draggable={false}
                  className="h-full w-full shrink-0 select-none object-contain object-center"
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : undefined}
                  decoding="async"
                />
              ))}
            </div>
            <div className="absolute right-5 top-5 flex flex-col items-center gap-3">
              <button
                aria-label={liked ? "Remove from favourites" : "Add to favourites"}
                onClick={() => toggleFav(handle)}
                className="text-[#0a0a0a] transition-opacity hover:opacity-60"
              >
                <Heart className={`h-[18px] w-[18px] ${liked ? "fill-[#0a0a0a]" : ""}`} strokeWidth={1.2} />
              </button>
              <button
                aria-label="Visual search — find similar pieces"
                title="Visual search"
                onClick={() => setVisualOpen(true)}
                className="text-[#0a0a0a] transition-opacity hover:opacity-60"
              >
                <ScanSearch className="h-[18px] w-[18px]" strokeWidth={1.2} />
              </button>
            </div>
            {galleryLen > 1 && (
              <>
                <button
                  aria-label="Previous image"
                  onClick={prevImg}
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-[#0a0a0a] transition-opacity hover:opacity-60"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1} />
                </button>
                <button
                  aria-label="Next image"
                  onClick={nextImg}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-[#0a0a0a] transition-opacity hover:opacity-60"
                >
                  <ChevronRight className="h-6 w-6" strokeWidth={1} />
                </button>
                <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] tabular-nums tracking-[0.2em] text-[#555555]">
                  {safeIdx + 1} / {galleryLen}
                </p>
              </>
            )}
          </div>

          {/* Mobile: swipeable snap gallery */}
          <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-col items-center gap-3 lg:hidden">
            <button
              aria-label={liked ? "Remove from favourites" : "Add to favourites"}
              onClick={() => toggleFav(handle)}
              className="pointer-events-auto text-[#0a0a0a] transition-opacity hover:opacity-60"
            >
              <Heart className={`h-[18px] w-[18px] ${liked ? "fill-[#0a0a0a]" : ""}`} strokeWidth={1.2} />
            </button>
            <button
              aria-label="Visual search — find similar pieces"
              onClick={() => setVisualOpen(true)}
              className="pointer-events-auto text-[#0a0a0a] transition-opacity hover:opacity-60"
            >
              <ScanSearch className="h-[18px] w-[18px]" strokeWidth={1.2} />
            </button>
          </div>
          <div
            ref={mobileGalRef}
            className="flex snap-x snap-mandatory overflow-x-auto lg:hidden"
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / el.clientWidth);
              if (idx !== imageIdx) setImageIdx(idx);
            }}
          >
            {activeImages.map((im, i) => (
              <MobileSlide
                key={im.node.url + i}
                url={im.node.url}
                alt={im.node.altText ?? node.title}
                eager={i === 0}
              />
            ))}
          </div>
          {galleryLen > 1 && (
            <div className="flex justify-center gap-1.5 py-3 lg:hidden">
              {activeImages.map((_, i) => (
                <span
                  key={i}
                  className={`h-[5px] w-[5px] rounded-full ${i === safeIdx ? "bg-[#0a0a0a]" : "bg-[#0a0a0a]/20"}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* ============ INFO — disciplined hierarchy ============ */}
        <section className="px-5 pb-14 pt-4 lg:px-14 lg:pb-20 lg:pt-12 xl:px-20">
          <div className="mx-auto w-full max-w-[480px] lg:mx-0">
            <div className="hidden lg:block">
            <Link
              to="/collections/$handle"
              params={{ handle: crumb.handle }}
              className="text-[10px] uppercase tracking-[0.2em] text-[#888888] underline-offset-4 transition-colors hover:text-[#0a0a0a] hover:underline"
            >
              {crumb.label}
            </Link>

            <h1 className="mt-3 text-[19px] font-medium uppercase leading-snug tracking-[0.06em] text-[#0a0a0a] md:text-[21px]">
              {node.title}
            </h1>

            <p className="mt-2 text-[15px] text-[#0a0a0a]">
              {cur(unitPrice)}
              {onSale && compareAt && (
                <span className="ml-2 text-[13px] text-[#888888] line-through">
                  {cur(parseFloat(compareAt.amount))}
                </span>
              )}
            </p>

            {reviewCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2">
                <Stars rating={reviewAvg} />
                <span className="text-[11px] text-[#555555] underline underline-offset-4">
                  {reviewCount} {reviewCount === 1 ? "Review" : "Reviews"}
                </span>
              </a>
            )}

            {bundleDeal && (
              <div className="mt-3">
                <span className="inline-block border border-[#0a0a0a] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]">
                  {bundleLabel}
                </span>
                <p className="mt-2 text-[12px] leading-relaxed text-[#555555]">
                  {BUNDLE_DEAL.detail}
                </p>
              </div>
            )}
            </div>

            {/* Reassurance */}
            <div className="mt-0 space-y-1 text-[12px] leading-relaxed text-[#555555] lg:mt-6">
              <p className="font-medium text-[#0a0a0a]">
                Free shipping on orders {shipThreshold}+
              </p>
              <p>{transitLabel(shipCountry)} business day shipping</p>
              <p>
                {isFinalSale(node.handle)
                  ? "Final sale for hygiene — faulty or wrong items replaced or refunded"
                  : "Easy, tracked 30-day returns"}
              </p>
            </div>

            {/* Colour */}
            {colorOption && (
              <div className="mt-8">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
                  Colour
                  <span className="ml-2 normal-case tracking-normal text-[#888888]">
                    {currentSelected[colorOption.name]}
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {colorOption.values.map((v) => {
                    const active = currentSelected[colorOption.name] === v;
                    // Prints get a zoomed crop of the fabric — a flat dot would
                    // read as a solid colour and mislead. Everything else uses
                    // its measured hex, then the name map.
                    const crop = indexedSwatch(node.handle, v, images.map((i) => i.node));
                    const hex = crop ? null : indexedHex(node.handle, v) ?? swatchHex(v);
                    const imgSwatch = !hex && !crop
                      ? node.variants.edges.find(
                          (vv) =>
                            vv.node.selectedOptions.some(
                              (o) => o.name === colorOption.name && o.value === v,
                            ) && vv.node.image?.url,
                        )?.node.image?.url
                      : undefined;
                    return (
                      <button
                        key={v}
                        aria-label={v}
                        title={v}
                        onClick={() => setOpt(colorOption.name, v)}
                        className={`h-[26px] w-[26px] border bg-cover transition-all ${
                          active
                            ? "border-[#0a0a0a] ring-1 ring-[#0a0a0a] ring-offset-1"
                            : "border-[#0a0a0a]/15 hover:border-[#0a0a0a]/50"
                        }`}
                        style={
                          crop
                            ? {
                                backgroundImage: `url(${shopifyImg(crop.url, 400)})`,
                                backgroundPosition: crop.position,
                                backgroundSize: crop.size,
                              }
                            : hex
                              ? { backgroundColor: hex }
                              : imgSwatch
                                ? {
                                    backgroundImage: `url(${shopifyImg(imgSwatch, 96)})`,
                                    backgroundPosition: "center 30%",
                                  }
                                : { backgroundColor: "#c9b9a3" }
                        }
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size */}
            {sizeOption && (
              <div
                ref={sizesRef}
                className={`mt-7 transition-shadow duration-500 ${sizePulse ? "ring-1 ring-[#0a0a0a] ring-offset-4" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">Size</p>
                  {showSizeGuide && (
                    <button
                      onClick={() => setSizeGuideOpen(true)}
                      className="text-[12px] font-semibold text-[#0a0a0a] underline underline-offset-4 transition-opacity hover:opacity-60"
                    >
                      Size Guide
                    </button>
                  )}
                </div>
                <div className={`mt-3 grid gap-1.5 ${sizeLabelled ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-5"}`}>
                  {sizeOption.values.map((v) => {
                    const active = currentSelected[sizeOption.name] === v;
                    const available = sizeAvailable(v);
                    const regional = sizeLabel(node.handle, v, sizeRegion, sizeGuide.guideType);
                    return (
                      <button
                        key={v}
                        disabled={!available}
                        onClick={() => setOpt(sizeOption.name, v)}
                        className={`flex h-10 items-center justify-center whitespace-nowrap border px-1 text-[12px] transition-colors ${
                          active
                            ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                            : available
                              ? "border-[#DDDDDD] text-[#0a0a0a] hover:border-[#0a0a0a]"
                              : "cursor-not-allowed border-[#EEEEEE] text-[#C4C4C4] line-through"
                        }`}
                      >
                        {v}
                        {regional && <span className="ml-1">({regional})</span>}
                      </button>
                    );
                  })}
                </div>
                {sizeFitLabel && (
                  <p className="mt-2.5 text-[10px] uppercase tracking-[0.12em] text-[#888888]">
                    {sizeFitLabel}
                  </p>
                )}
              </div>
            )}
            {otherOptions.map((opt) => (
              <div key={opt.name} className="mt-7">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">{opt.name}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {opt.values.map((v) => {
                    const active = currentSelected[opt.name] === v;
                    return (
                      <button
                        key={v}
                        onClick={() => setOpt(opt.name, v)}
                        className={`flex h-10 items-center justify-center border px-4 text-[12px] transition-colors ${
                          active ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#DDDDDD] text-[#0a0a0a] hover:border-[#0a0a0a]"
                        }`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/*
              Multi-buy. True and plain: each tier's price is what checkout
              charges under the Shopify automatic rule (MULTI_BUY_TIERS), the
              struck figure is the same items at full price, and there is no
              timer, no "deal ends" and no popularity badge we can't back
              with order data. "Best value" appears only when one tier saves
              strictly more than the others.
            */}
            {multiBuy && (
              <div>
                <MultiBuySelector
                  name={`multibuy-${node.handle}`}
                  tiers={MULTI_BUY_TIERS}
                  value={tier.quantity}
                  onChange={choosePack}
                  bestValue={bestValueTier(MULTI_BUY_TIERS)}
                  price={(t) => {
                    const prices = tierUnitPrices(t);
                    const full = prices.reduce((s, p) => s + p, 0);
                    return {
                      total: cur(tierTotal(prices, t.percent)),
                      full: t.percent ? cur(full) : null,
                    };
                  }}
                />
                {tier.quantity > 1 && (
                  <div className="mt-3 space-y-2 border border-[#e6e4e0] bg-[#faf9f7] p-3">
                    {Array.from({ length: tier.quantity }, (_, i) => {
                      const sel = i === 0 ? currentSelected : extraSels[i - 1];
                      const set = (name: string, value: string) => {
                        if (i === 0) {
                          setOpt(name, value);
                          return;
                        }
                        setExtraSel((prev) => {
                          const next = [...prev];
                          next[i - 1] = { ...(prev[i - 1] ?? {}), [name]: value };
                          return next;
                        });
                        // Show this item's colour in the gallery (#1's when they match).
                        const rowColour = colorOptName
                          ? { ...sel, [name]: value }[colorOptName]
                          : undefined;
                        setPreviewColour(rowColour && rowColour !== activeColour ? rowColour : undefined);
                      };
                      /* Small picture of this item in its colour, so the choice
                         shows right beside the picker on phones too (where the
                         gallery is scrolled out of view). Garment shot first:
                         it reads more clearly than a model at this size. */
                      const rowColour = colorOption && colorOption.values.length > 1
                        ? sel[colorOption.name]
                        : undefined;
                      const rowThumb = rowColour
                        ? indexedGhost(node.handle, rowColour, images.map((im) => im.node)) ??
                          colorImageMap.get(rowColour)?.[0]?.node.url
                        : undefined;
                      return (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <span className="w-6 text-[11px] text-[#666666]">#{i + 1}</span>
                          {rowThumb && (
                            <img
                              src={shopifyImg(rowThumb, 120)}
                              alt=""
                              aria-hidden="true"
                              width={36}
                              height={36}
                              loading="lazy"
                              decoding="async"
                              className="h-9 w-9 shrink-0 object-contain"
                              style={{ background: backdropCss(tableBackdrop(rowThumb)) }}
                            />
                          )}
                          {node.options
                            .filter((o) => o.values.length > 1)
                            .map((o) => (
                              <select
                                key={o.name}
                                value={sel[o.name] ?? ""}
                                onChange={(e) => set(o.name, e.target.value)}
                                aria-label={`${o.name} for item ${i + 1}`}
                                className="h-9 border border-[#8a8a8a] bg-white px-2 text-[12px] text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a0a0a]"
                              >
                                {!sel[o.name] && (
                                  <option value="" disabled>
                                    {o.name}
                                  </option>
                                )}
                                {o.values.map((v) => {
                                  const ok = optAvailable(sel, o.name, v);
                                  return (
                                    <option key={v} value={v} disabled={!ok}>
                                      {ok ? v : `${v} — sold out`}
                                    </option>
                                  );
                                })}
                              </select>
                            ))}
                        </div>
                      );
                    })}
                    {hasSize &&
                      (() => {
                        const problem = units.map((_, i) => rowProblem(i)).find(Boolean);
                        return problem ? (
                          <p role="alert" className="text-[11px] text-[#b00020]">
                            {problem}
                          </p>
                        ) : null;
                      })()}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-[#666666]">
                  Any sizes or colours of this product — the saving applies automatically at
                  checkout.
                </p>
              </div>
            )}

            {/* Add to bag / Select a size */}
            <button
              ref={atcRef}
              onClick={handleAdd}
              disabled={adding}
              className={`mt-7 flex h-12 w-full items-center justify-center text-[12px] font-medium uppercase tracking-[0.18em] transition-colors disabled:opacity-60 ${
                hasSize
                  ? "bg-[#0a0a0a] text-white hover:bg-[#262626]"
                  : "border border-[#0a0a0a] bg-white text-[#0a0a0a] hover:bg-[#0a0a0a] hover:text-white"
              }`}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : hasSize ? (
                <>
                  {tier.quantity > 1 ? (
                    <>
                      Add {tier.quantity} to Bag — {cur(payTotal)}
                    </>
                  ) : (
                    <>Add to Bag — {cur(unitPrice)}</>
                  )}
                </>
              ) : (
                "Select a Size"
              )}
            </button>

            <TrustBadges handle={node.handle} />

            {/* Tabs */}
            <div className="mt-10">
              <div className="flex gap-8 border-b border-[#EBEBEB] md:gap-10">
                {(
                  [
                    { id: "details", label: "Details" },
                    { id: "fit", label: "Fit & Fabric" },
                    { id: "shipping", label: "Shipping & Returns" },
                  ] as const
                ).map((tb) => (
                  <button
                    key={tb.id}
                    onClick={() => setTab(tb.id)}
                    className={`-mb-px border-b-2 pb-3.5 text-[14px] font-semibold uppercase tracking-[0.08em] transition-colors md:text-[15px] ${
                      tab === tb.id
                        ? "border-[#0a0a0a] text-[#0a0a0a]"
                        : "border-transparent text-[#8a8a8a] hover:text-[#0a0a0a]"
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>
              <div className="pt-5 text-[13px] leading-[1.85] text-[#555555]">
                {tab === "details" &&
                  (() => {
                    /* Structured HTML when the description has it (every page
                       rewritten since September does); plain text otherwise. */
                    const html = safeDescriptionHtml(node.descriptionHtml);
                    if (!(html && hasStructure(html))) return (
                      <p className="whitespace-pre-line">
                        {node.description?.trim() ||
                          "Smooths and supports without digging in — and disappears under whatever you put on top."}
                      </p>
                    );
                    /* Mobile: long stories (more than hook + one paragraph)
                       collapse behind "Read more"; the Details bullets always
                       show. The fit note lives in the Fit & Fabric tab. */
                    const { intro, introParagraphs, sections } = descriptionParts(html);
                    const collapsible = introParagraphs > 2;
                    return (
                      <div className="[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-[11px] [&_h3]:font-semibold [&_h3]:uppercase [&_h3]:tracking-[0.14em] [&_h3]:text-[#0a0a0a] [&_p]:mt-3 [&_p:first-child]:mt-0 [&_p:first-child]:text-[#0a0a0a] [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-4 [&_li]:marker:text-[#bbbbbb] [&_strong]:font-medium [&_strong]:text-[#0a0a0a]">
                        <div
                          className={collapsible && !readMore ? "[&>p:nth-of-type(n+3)]:hidden md:[&>p:nth-of-type(n+3)]:block" : ""}
                          dangerouslySetInnerHTML={{ __html: intro }}
                        />
                        {collapsible && (
                          <button
                            type="button"
                            onClick={() => setReadMore((v) => !v)}
                            aria-expanded={readMore}
                            className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#0a0a0a] underline underline-offset-4 md:hidden"
                          >
                            {readMore ? "Read less" : "Read more"}
                          </button>
                        )}
                        {sections && <div dangerouslySetInnerHTML={{ __html: sections }} />}
                      </div>
                    );
                  })()}
                {tab === "fit" && (
                  <div className="space-y-3">
                    {/* The product's own fabric and fit note (was one generic
                        "seamless knit with four-way stretch" line for every
                        product, which was untrue for satin, cotton, lace, silk). */}
                    {(() => {
                      const fabric = fabricLine(node.descriptionHtml);
                      const note = fitNote(node.descriptionHtml);
                      return (
                        <>
                          {fabric && (
                            <p>
                              <span className="font-medium text-[#0a0a0a]">Fabric: </span>
                              {fabric.charAt(0).toUpperCase() + fabric.slice(1)}.
                            </p>
                          )}
                          <p>
                            {note && note.heading !== "How to use" ? (
                              <>
                                <span className="font-medium text-[#0a0a0a]">Fit: </span>
                                {note.text}
                              </>
                            ) : sizeGuide.guideType !== "none" ? (
                              SIZE_GUIDES[sizeGuide.guideType].fitNote
                            ) : (
                              "One size — designed to fit all."
                            )}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                )}
                {tab === "shipping" && (
                  <div className="space-y-3">
                    <p>
                      Free shipping to {shipDest} on orders over {shipThreshold}. Orders are
                      dispatched within {PROCESSING_LABEL} business days, then shipping takes{" "}
                      {transitLabel(shipCountry)} business days, tracked.
                    </p>
                    <p>
                      {isFinalSale(node.handle)
                        ? "For hygiene reasons this is final sale: it can't be returned or exchanged unless it's faulty or not what you ordered."
                        : "Easy, tracked 30-day returns — items must be unworn with tags attached."}{" "}
                      Duties and taxes are included.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============ PRODUCT STORY (Smooche-style long form) ============ */}
      <ProductStory
        handle={node.handle}
        title={node.title}
        descriptionHtml={node.descriptionHtml}
        colour={activeColour}
        imageUrls={images.map((i) => i.node.url)}
        country={shipCountry}
        sized={!/accessor|mask|adhesive/i.test(`${node.productType ?? ""} ${node.title}`)}
        reviews={judgeme?.reviews ?? []}
        productType={node.productType ?? ""}
      />

      {/* ============ RAIL ============
          One row only (Joshua, 28 Sept 2026): "Similar Styles" removed. */}
      <Rail
        title="We Think You'd Like"
        products={recommendations.length ? recommendations : undefined}
        queryKey={["rail-picks", handle]}
        queryFn={() => fetchProducts(30, "bra OR bodysuit OR short OR brief OR thong OR set OR dress OR swim OR bikini OR robe")}
        excludeHandle={handle}
      />

      {/* ============ REVIEWS ============ */}
      <Reviews
        reviews={judgeme?.reviews ?? []}
        average={reviewAvg}
        count={reviewCount}
        loading={reviewsLoading}
        productGid={node.id}
      />

      <Footer />
      {/* Room for the sticky bar, so it never covers the end of the footer. */}
      <div aria-hidden="true" style={{ height: "var(--buy-bar-h, 0px)" }} />

      {/* Sticky buy bar, phones: thumbnail, the price of the chosen tier and
          straight to checkout. Offscreen it is inert, so it can't take focus. */}
      <div
        ref={mobileBarRef}
        inert={!barVisible}
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#EBEBEB] bg-white pb-[env(safe-area-inset-bottom)] transition-transform duration-300 md:hidden ${
          barVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          {(variantImageUrl || node.images.edges[0]?.node.url) && (
            <img
              src={shopifyImg(variantImageUrl || node.images.edges[0].node.url, 160)}
              alt=""
              width={40}
              height={52}
              loading="lazy"
              decoding="async"
              className="h-[52px] w-10 shrink-0 object-cover object-[center_top]"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]">
              {node.title}
            </p>
            <p className="text-[12px] text-[#555555]">
              {cur(payTotal)}
              {tier.quantity > 1 ? ` · ${tier.quantity} items` : ""}
            </p>
          </div>
          <button
            onClick={handleBuyNow}
            disabled={adding || buyingNow}
            aria-label={
              !hasSize
                ? undefined
                : inBag
                  ? "Go to checkout"
                  : `Buy now: add ${tier.quantity === 1 ? "this item" : `${tier.quantity} items`} to your bag and go to checkout`
            }
            className="flex h-11 min-w-[112px] shrink-0 items-center justify-center bg-[#0a0a0a] px-5 text-[11px] font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#262626] disabled:opacity-60"
          >
            {buyingNow ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : !hasSize ? (
              "Select a Size"
            ) : inBag ? (
              "Checkout"
            ) : (
              "Buy now"
            )}
          </button>
        </div>
      </div>

      {/* Sticky purchase bar, tablet and desktop */}
      <div
        ref={desktopBarRef}
        inert={!barVisible}
        className={`fixed inset-x-0 bottom-0 z-40 hidden border-t border-[#EBEBEB] bg-white transition-transform duration-300 md:block ${
          barVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container-px flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]">
              {node.title}
            </p>
            <p className="text-[12px] text-[#555555]">
              {cur(payTotal)}
              {tier.quantity > 1 ? ` · ${tier.quantity} items` : ""}
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding}
            className="flex h-10 shrink-0 items-center justify-center bg-[#0a0a0a] px-6 text-[11px] font-medium uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#262626] disabled:opacity-60"
          >
            {hasSize ? "Add to Bag" : "Select a Size"}
          </button>
        </div>
      </div>

      {/* Visual search — pieces similar to this one */}
      <Sheet open={visualOpen} onOpenChange={setVisualOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-[#EBEBEB] bg-white p-0 sm:max-w-md"
        >
          <SheetTitle className="sr-only">Visual search</SheetTitle>
          <div className="flex items-center gap-4 border-b border-[#EBEBEB] px-5 py-4">
            {mainImg && (
              <img
                src={shopifyImg(mainImg.url, 160)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-14 w-11 shrink-0 object-cover object-[center_top]"
              />
            )}
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#888888]">
                Visual Search
              </p>
              <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]">
                Similar to this piece
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-10 pt-5">
            <VisualSearchResults
              recommendations={recommendations}
              query={crumb.query}
              excludeHandle={handle}
              onNavigate={() => setVisualOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      {showSizeGuide && (
        <SizeGuide
          open={sizeGuideOpen}
          onOpenChange={setSizeGuideOpen}
          guideType={sizeGuide.guideType}
          fitOverride={sizeGuide.fitOverride}
          productChart={productChart}
          handle={node.handle}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recommendation rail — SKIMS-style: centred title, pagination,       */
/* hairline-divided row of quiet product cards.                        */
/* ------------------------------------------------------------------ */

function RailCard({ p }: { p: ShopifyProduct }) {
  const display = useDisplayPrice();
  const favHandles = useFavorites((s) => s.handles);
  const toggleFav = useFavorites((s) => s.toggle);
  const liked = favHandles.includes(p.node.handle);
  const img = p.node.images.edges[0]?.node;
  const price = p.node.priceRange.minVariantPrice;
  const label = inferCollection(p.node.title).label;
  /* Garment first, model on hover (Joshua, 29 Sept 2026). The gallery index
     knows which shots are garment ("g") and which are on-model ("m") per
     colour: take the colour whose model shot is this card's hero image, so
     the two images are always the same colour. No garment shot -> model only. */
  const fileOf = (u: string) => u.split("/").pop()!.split("?")[0];
  const heroFile = img ? fileOf(img.url) : "";
  const index = GALLERY_INDEX[p.node.handle] ?? {};
  // 1) the colour whose shots include this card's hero image;
  // 2) else the colour of the first variant (what the card shows by default);
  // 3) else no garment - never pair a garment with a model in another colour.
  const firstColour = p.node.variants?.edges?.[0]?.node.selectedOptions?.find((o) => /colou?r/i.test(o.name))?.value;
  const match =
    Object.values(index).find((e) => e.m.includes(heroFile) || e.g.includes(heroFile)) ??
    (firstColour ? index[firstColour] : undefined);
  const garmentFile = match?.g[0];
  const garmentUrl = garmentFile ? `https://cdn.shopify.com/s/files/1/0988/0738/2311/files/${garmentFile}` : undefined;
  const garmentBg = tableBackdrop(garmentUrl);
  return (
    <div className="flex min-w-[70vw] snap-start flex-col sm:min-w-[42vw] lg:w-[calc((100%-80px)/6)] lg:min-w-0 lg:flex-none">
      <Link
        to="/product/$handle"
        params={{ handle: p.node.handle }}
        className="group relative flex h-52 items-center justify-center overflow-hidden rounded-[18px] bg-[#F6F3EF] md:h-60"
        style={garmentUrl && garmentBg ? { background: backdropCss(garmentBg) } : undefined}
      >
        {img && (
          <img
            src={shopifyImg(img.url, 700)}
            alt={img.altText ?? p.node.title}
            loading="lazy"
            className={`h-full w-full object-cover object-[center_top] transition-[opacity,transform] duration-500 ease-out ${
              garmentUrl ? "absolute inset-0 opacity-0 group-hover:scale-[1.03] group-hover:opacity-100" : "group-hover:scale-[1.03]"
            }`}
          />
        )}
        {garmentUrl && (
          <img
            src={shopifyImg(garmentUrl, 700)}
            alt={`${p.node.title} flat`}
            loading="lazy"
            className="relative h-full w-full object-contain p-3 transition-opacity duration-500 ease-out group-hover:opacity-0"
          />
        )}
      </Link>
      <div className="flex items-start justify-between gap-3 px-1 pb-7 pt-3">
        <Link to="/product/$handle" params={{ handle: p.node.handle }} className="block">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#888888]">{label}</p>
          <p className="mt-1 text-[12px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]">
            {p.node.title}
          </p>
          <p className="mt-1 text-[11px] text-[#555555]">
            {display(price.amount, price.currencyCode)}
          </p>
        </Link>
        <button
          aria-label={liked ? "Remove from favourites" : "Add to favourites"}
          onClick={() => toggleFav(p.node.handle)}
          className="mt-0.5 shrink-0 text-[#0a0a0a] transition-opacity hover:opacity-60"
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-[#0a0a0a]" : ""}`} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function Rail({
  title,
  products,
  queryKey,
  queryFn,
  excludeHandle,
}: {
  title: string;
  products?: ShopifyProduct[];
  queryKey: unknown[];
  queryFn: () => Promise<ShopifyProduct[]>;
  excludeHandle?: string;
}) {
  const PER_PAGE = 6;
  // Always fetch the pool as well: it tops up Shopify's recommendations
  // (usually ~10) so every page is a full row of six.
  const { data: fetched = [] } = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
  });
  const items = useMemo(() => {
    const src = [...(products ?? []), ...fetched];
    const seen = new Set<string>();
    const clothing = src.filter((p) => {
      if (p.node.handle === excludeHandle) return false;
      if (seen.has(p.node.id)) return false;
      // Clothing only: no accessories (body adhesive, sleep mask).
      if (/accessor/i.test(p.node.productType ?? "") || /adhesive|glue|eye mask|sleep mask/i.test(p.node.title)) return false;
      seen.add(p.node.id);
      return true;
    });
    // Whole rows only: 6 or 12. Under six, show what there is.
    const whole = Math.min(12, Math.floor(clothing.length / PER_PAGE) * PER_PAGE);
    return whole > 0 ? clothing.slice(0, whole) : clothing;
  }, [products, fetched, excludeHandle]);

  /* One continuous strip: swipe on mobile, trackpad-scroll on desktop, and
     the arrows scroll a full view at a time. The counter follows the
     scroll position. (Joshua, 29 Sept 2026: swipe instead of only arrows.) */
  const stripRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ page: 0, pages: 1 });
  // A "page" is however many cards fit in view: six on desktop, one on a
  // phone. The counter and arrows both work in those steps.
  const step = () => {
    const el = stripRef.current;
    const first = el?.firstElementChild as HTMLElement | null;
    if (!el || !first) return { el, stride: 1, perView: 1 };
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    const stride = first.offsetWidth + gap;
    const perView = Math.max(1, Math.round((el.clientWidth + gap) / stride));
    return { el, stride, perView };
  };
  const measure = useCallback(() => {
    const { el, stride, perView } = step();
    if (!el) return;
    const n = el.children.length;
    const pages = Math.max(1, Math.ceil(n / perView));
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const page = atEnd ? pages - 1 : Math.min(pages - 1, Math.round(el.scrollLeft / (stride * perView)));
    setView((v) => (v.page === page && v.pages === pages ? v : { page, pages }));
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);
  const scrollByView = (dir: 1 | -1) => {
    const { el, stride, perView } = step();
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const atStart = el.scrollLeft <= 4;
    // Wrap around at either end, like the old pager.
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
    else el.scrollBy({ left: dir * stride * perView, behavior: "smooth" });
  };
  /* Click-and-hold drag for mouse users (touch and trackpads scroll
     natively). Snap is paused while dragging, then the strip settles on the
     nearest card; a drag never counts as a click on the card underneath. */
  const drag = useRef<{ x: number; left: number; moved: boolean; id: number } | null>(null);
  const suppressClick = useRef(false);
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !stripRef.current) return;
    drag.current = { x: e.clientX, left: stripRef.current.scrollLeft, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const el = stripRef.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) {
      d.moved = true;
      el.setPointerCapture(d.id);
      el.style.scrollSnapType = "none";
      el.style.cursor = "grabbing";
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    const el = stripRef.current;
    drag.current = null;
    if (!d || !el || !d.moved) return;
    el.style.cursor = "";
    const { stride } = step();
    const target = Math.round(el.scrollLeft / stride) * stride;
    el.scrollTo({ left: target, behavior: "smooth" });
    // Restore snapping once the glide has settled.
    window.setTimeout(() => {
      if (!drag.current) el.style.scrollSnapType = "";
    }, 450);
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
  };
  if (items.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="relative flex h-16 items-center justify-center">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a]">
          {title}
        </h2>
        {view.pages > 1 && (
          <div className="absolute right-4 flex items-center gap-3 text-[12px] text-[#0a0a0a] md:right-8">
            <button aria-label="Previous" onClick={() => scrollByView(-1)} className="transition-opacity hover:opacity-60">
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <span className="tabular-nums text-[#555555]">
              {view.page + 1} / {view.pages}
            </span>
            <button aria-label="Next" onClick={() => scrollByView(1)} className="transition-opacity hover:opacity-60">
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
      <div
        ref={stripRef}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragStart={(e) => e.preventDefault()}
        onClickCapture={(e) => {
          if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
            suppressClick.current = false;
          }
        }}
        className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-4 select-none [scrollbar-width:none] md:cursor-grab md:scroll-px-8 md:gap-4 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p) => (
          <RailCard key={p.node.id} p={p} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Visual search results — Shopify's related-products engine first,    */
/* padded with same-category matches.                                  */
/* ------------------------------------------------------------------ */

function VisualSearchResults({
  recommendations,
  query,
  excludeHandle,
  onNavigate,
}: {
  recommendations: ShopifyProduct[];
  query: string;
  excludeHandle: string;
  onNavigate: () => void;
}) {
  const display = useDisplayPrice();
  const { data: categoryMatches = [] } = useQuery({
    queryKey: ["visual-search", query, excludeHandle],
    queryFn: () => fetchProducts(12, query || undefined),
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: ShopifyProduct[] = [];
    for (const p of [...recommendations, ...categoryMatches]) {
      if (p.node.handle === excludeHandle) continue;
      if (seen.has(p.node.id)) continue;
      seen.add(p.node.id);
      out.push(p);
      if (out.length >= 8) break;
    }
    return out;
  }, [recommendations, categoryMatches, excludeHandle]);

  if (items.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-[#555555]">
        No similar pieces found right now — explore{" "}
        <Link
          to="/collections/$handle"
          params={{ handle: "new-in" }}
          onClick={onNavigate}
          className="text-[#0a0a0a] underline underline-offset-4"
        >
          everything new
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7">
      {items.map((p) => {
        const img = p.node.images.edges[0]?.node;
        const price = p.node.priceRange.minVariantPrice;
        return (
          <Link
            key={p.node.id}
            to="/product/$handle"
            params={{ handle: p.node.handle }}
            onClick={onNavigate}
            className="group block"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-[#F6F3EF]">
              {img && (
                <img
                  src={shopifyImg(img.url, 600)}
                  alt={img.altText ?? p.node.title}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover object-[center_top] transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                />
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]">
              {p.node.title}
            </p>
            <p className="mt-0.5 text-[11px] text-[#555555]">
              {display(price.amount, price.currencyCode)}
            </p>
          </Link>
        );
      })}
    </div>
  );
}

/*
 * Mobile gallery slide.
 *
 * The catalogue mixes 2:3, 3:4 and square shots — sometimes within one product.
 * Cropping them to a fixed 3:4 frame cut ~12% off the bottom of every 2:3 shot
 * (feet on a full-length model) and ~25% off the sides of square ones, so the
 * slide contains the image instead and fills the leftover space with that
 * image's own backdrop. Nothing is cropped and no seam shows.
 */
function MobileSlide({ url, alt, eager }: { url: string; alt: string; eager: boolean }) {
  const [sampled, setSampled] = useState<Backdrop | undefined>(undefined);
  const backdrop = backdropCss(cachedBackdrop(url) ?? sampled);
  useEffect(() => {
    if (cachedBackdrop(url)) return;
    let live = true;
    sampleBackdrop(url).then((c) => {
      if (live) setSampled(c);
    });
    return () => {
      live = false;
    };
  }, [url]);

  return (
    <div
      className="aspect-[3/4] w-full shrink-0 snap-center"
      style={{ background: backdrop }}
    >
      <img
        src={shopifyImg(url, 1200)}
        srcSet={shopifySrcSet(url, 2000)}
        sizes="(min-width: 1024px) 55vw, 100vw"
        alt={alt}
        className="h-full w-full object-contain object-center"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
      />
    </div>
  );
}
