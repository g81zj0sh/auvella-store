import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  type ShopifyProduct,
} from "@/lib/shopify";
import { useCartStore } from "@/stores/cartStore";
import { useFavorites } from "@/stores/favoritesStore";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { Loader2, Star, Heart, ChevronLeft, ChevronRight, ScanSearch } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useDisplayPrice, usePreferences, useT } from "@/lib/preferences";
import { freeShippingThresholdFmt, useShippingCountry } from "@/lib/shipping";

export const Route = createFileRoute("/product/$handle")({
  component: ProductPage,
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
        : `${node.title} — sculpted comfort and effortless confidence from Auvella.`;
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
  if (/bodysuit/.test(t)) return { handle: "shapewear", label: "Bodysuits", query: "bodysuit" };
  if (/bra|bralette|cami/.test(t))
    return { handle: "soft-essentials", label: "Bras & Bralettes", query: "bra OR bralette OR cami" };
  if (/legging/.test(t)) return { handle: "activewear", label: "Activewear", query: "legging OR yoga OR sports" };
  if (/short|shape|sculpt|brief/.test(t))
    return { handle: "shapewear-1", label: "Shapewear", query: "shape OR sculpt OR short OR control" };
  if (/pyjama|pajama/.test(t))
    return { handle: "loungewear-sleepwear", label: "Loungewear", query: "pajama OR satin OR lounge" };
  if (/robe/.test(t)) return { handle: "robes", label: "Robes", query: "robe OR satin" };
  if (/dress/.test(t)) return { handle: "dresses", label: "Dresses", query: "dress" };
  if (/bikini|swim/.test(t)) return { handle: "bikinis", label: "Swim", query: "bikini OR swim" };
  if (/active|sports/.test(t)) return { handle: "activewear", label: "Activewear", query: "sports OR yoga" };
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
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [barVisible, setBarVisible] = useState(false);
  const favHandles = useFavorites((s) => s.handles);
  const toggleFav = useFavorites((s) => s.toggle);
  const liked = favHandles.includes(handle);
  const [visualOpen, setVisualOpen] = useState(false);
  const [tab, setTab] = useState<"details" | "fit" | "shipping">("details");
  const [sizePulse, setSizePulse] = useState(false);
  const atcRef = useRef<HTMLButtonElement>(null);
  const sizesRef = useRef<HTMLDivElement>(null);
  const addItem = useCartStore((s) => s.addItem);
  const adding = useCartStore((s) => s.isLoading);

  // Record this visit for the Recently Viewed rail (account page etc.).
  const recordViewed = useRecentlyViewed((s) => s.record);
  useEffect(() => {
    if (handle) recordViewed(handle);
  }, [handle, recordViewed]);

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
    if (!activeColour) return images;
    const set = colorImageMap.get(activeColour);
    return set && set.length > 0 ? set : images;
  }, [images, colorImageMap, activeColour]);

  // Colour change: reset to that colour's first image, everywhere.
  const mobileGalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setImageIdx(0);
    mobileGalRef.current?.scrollTo({ left: 0 });
  }, [activeColour]);

  // Desktop drag state
  const [dragX, setDragX] = useState(0);
  const dragRef = useRef({ active: false, startX: 0, moved: false });

  // Sticky bar appears once the main Add to Bag button leaves the viewport.
  useEffect(() => {
    const el = atcRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) => setBarVisible(!entry.isIntersecting), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [node?.id]);

  const display = useDisplayPrice();
  const t = useT();
  void t;
  const { country: shipCountry } = useShippingCountry();
  const activeCurrency = usePreferences((s) => s.currency);
  const shipThreshold = freeShippingThresholdFmt(activeCurrency);
  const shipDest = `${shipCountry.the ? "the " : ""}${shipCountry.name}`;

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

  const unitPrice = parseFloat(priceVariant?.price.amount ?? "0");
  const currency = priceVariant?.price.currencyCode ?? "GBP";
  const cur = (n: number) => display(n, currency);
  const compareAt = priceVariant?.compareAtPrice;
  const onSale = !!compareAt && parseFloat(compareAt.amount) > unitPrice;
  const crumb = inferCollection(node.title);
  const sizeGuide = resolveGuide(node.title);
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
  };

  const scrollToSizes = () => {
    sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setSizePulse(true);
    setTimeout(() => setSizePulse(false), 1200);
  };

  const handleAdd = async () => {
    if (!hasSize) {
      scrollToSizes();
      return;
    }
    if (!variant) return;
    await addItem({
      product,
      variantId: variant.id,
      variantTitle: variant.title,
      price: variant.price,
      quantity: 1,
      selectedOptions: variant.selectedOptions || [],
    });
    toast.success("Added to bag", { position: "top-center" });
  };

  const galleryLen = activeImages.length;
  const safeIdx = Math.min(imageIdx, Math.max(galleryLen - 1, 0));
  const prevImg = () => setImageIdx((i) => (Math.min(i, galleryLen - 1) - 1 + galleryLen) % galleryLen);
  const nextImg = () => setImageIdx((i) => (Math.min(i, galleryLen - 1) + 1) % galleryLen);
  const mainImg = activeImages[safeIdx]?.node;

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
        </div>

        {/* ============ GALLERY — dominant, editorial ============ */}
        <section className="relative bg-[#F6F3EF]">
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
                  src={im.node.url}
                  alt={im.node.altText ?? node.title}
                  draggable={false}
                  className="h-full w-full shrink-0 select-none object-contain object-center"
                  loading={i === 0 ? "eager" : "lazy"}
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
              <img
                key={im.node.url + i}
                src={im.node.url}
                alt={im.node.altText ?? node.title}
                className="aspect-[3/4] w-full shrink-0 snap-center object-cover object-[center_top]"
                loading={i === 0 ? "eager" : "lazy"}
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
            </div>

            {/* Reassurance */}
            <div className="mt-0 space-y-1 text-[12px] leading-relaxed text-[#555555] lg:mt-6">
              <p className="font-medium text-[#0a0a0a]">
                Free shipping on orders {shipThreshold}+
              </p>
              <p>Receive your order in {shipCountry.days} business days</p>
              <p>Easy, tracked 30-day returns</p>
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
                    const hex = swatchHex(v);
                    // No confident colour match (prints, novel names): the
                    // swatch becomes a crop of that variant's own photo.
                    const imgSwatch = !hex
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
                          hex
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
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                  {sizeOption.values.map((v) => {
                    const active = currentSelected[sizeOption.name] === v;
                    const available = sizeAvailable(v);
                    return (
                      <button
                        key={v}
                        disabled={!available}
                        onClick={() => setOpt(sizeOption.name, v)}
                        className={`flex h-10 items-center justify-center border text-[12px] transition-colors ${
                          active
                            ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                            : available
                              ? "border-[#DDDDDD] text-[#0a0a0a] hover:border-[#0a0a0a]"
                              : "cursor-not-allowed border-[#EEEEEE] text-[#C4C4C4] line-through"
                        }`}
                      >
                        {v}
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
                <>Add to Bag — {cur(unitPrice)}</>
              ) : (
                "Select a Size"
              )}
            </button>


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
                {tab === "details" && (
                  <p className="whitespace-pre-line">
                    {node.description?.trim() ||
                      "Sculpted comfort in a second-skin fit — designed to smooth, support and disappear under everything."}
                  </p>
                )}
                {tab === "fit" && (
                  <div className="space-y-3">
                    <p>
                      Second-skin compression knit with four-way stretch — smooths without
                      squeezing, and holds its shape through the day.
                    </p>
                    <p>
                      {sizeGuide.guideType !== "none"
                        ? SIZE_GUIDES[sizeGuide.guideType].fitNote
                        : "One size — designed to fit all."}
                    </p>
                  </div>
                )}
                {tab === "shipping" && (
                  <div className="space-y-3">
                    <p>
                      Free shipping to {shipDest} on orders over {shipThreshold}. Orders are
                      processed within 1–2 business days and typically arrive in{" "}
                      {shipCountry.days} business days, tracked.
                    </p>
                    <p>
                      Easy, tracked 30-day returns — items must be unworn with tags attached.
                      Duties and taxes are included.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ============ RAILS ============ */}
      <Rail
        title="Similar Styles"
        queryKey={["rail-similar", handle]}
        queryFn={() => fetchProducts(13, crumb.query || undefined)}
        excludeHandle={handle}
      />
      <Rail
        title="We Think You'd Like"
        products={recommendations.length ? recommendations : undefined}
        queryKey={["rail-picks", handle]}
        queryFn={() => fetchProducts(13, "bra OR bodysuit OR set OR short")}
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

      {/* Sticky purchase bar */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#EBEBEB] bg-white transition-transform duration-300 ${
          barVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="container-px flex items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium uppercase tracking-[0.06em] text-[#0a0a0a]">
              {node.title}
            </p>
            <p className="text-[12px] text-[#555555]">{cur(unitPrice)}</p>
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
                src={mainImg.url}
                alt=""
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
  return (
    <div className="flex min-w-[70vw] flex-col sm:min-w-[42vw] lg:min-w-0 lg:flex-1">
      <Link
        to="/product/$handle"
        params={{ handle: p.node.handle }}
        className="group flex h-52 items-center justify-center overflow-hidden bg-[#F6F3EF] md:h-60"
      >
        {img && (
          <img
            src={shopifyImg(img.url, 700)}
            alt={img.altText ?? p.node.title}
            loading="lazy"
            className="h-full w-full object-cover object-[center_top] transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="flex items-start justify-between gap-3 px-4 pb-7 pt-3">
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
  const [page, setPage] = useState(0);
  const { data: fetched = [] } = useQuery({
    queryKey,
    queryFn,
    enabled: !products,
    staleTime: 5 * 60 * 1000,
  });
  const items = useMemo(() => {
    const src = products ?? fetched;
    const seen = new Set<string>();
    return src.filter((p) => {
      if (p.node.handle === excludeHandle) return false;
      if (seen.has(p.node.id)) return false;
      seen.add(p.node.id);
      return true;
    });
  }, [products, fetched, excludeHandle]);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const visible = items.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  if (items.length === 0) return null;

  return (
    <section className="bg-white">
      <div className="relative flex h-16 items-center justify-center">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.2em] text-[#0a0a0a]">
          {title}
        </h2>
        {pages > 1 && (
          <div className="absolute right-4 flex items-center gap-3 text-[12px] text-[#0a0a0a] md:right-8">
            <button
              aria-label="Previous"
              onClick={() => setPage((p) => (p - 1 + pages) % pages)}
              className="transition-opacity hover:opacity-60"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <span className="tabular-nums text-[#555555]">
              {page + 1} / {pages}
            </span>
            <button
              aria-label="Next"
              onClick={() => setPage((p) => (p + 1) % pages)}
              className="transition-opacity hover:opacity-60"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
      <div className="flex divide-x divide-[#EBEBEB] overflow-x-auto border-y border-[#EBEBEB]">
        {visible.map((p) => (
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
