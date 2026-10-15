import { TILE_IMAGES, TILE_DEFAULT_COLOUR } from "@/lib/tileImages";
import { Link } from "@tanstack/react-router";
import { Heart, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useQuickAdd } from "@/stores/quickAddStore";
import { useFavorites } from "@/stores/favoritesStore";
import type { ShopifyProduct } from "@/lib/shopify";
import { useDisplayPrice } from "@/lib/preferences";
import { colorToHex } from "@/lib/colorMap";
import { EditorialImage } from "@/components/site/EditorialImage";
import { useMemo, useState, useEffect } from "react";
import { buildColorImageMap, colorOptionName } from "@/lib/colorImages";
import { findGhostForColor } from "@/lib/imageBackdrop";
import { indexedEntry, indexedGhost, indexedHex, indexedRestImage, indexedSwatch } from "@/lib/galleryIndex";
import { shopifyImg, shopifySrcSet } from "@/lib/shopify";
import { inBundleDeal, SALE_STICKER_HANDLES, useBundleLabel } from "@/lib/bundleDeal";

/*
 * Product card — SKIMS spec:
 * no border, no shadow, no card background; 3:4 image; hover scale 1.04;
 * QUICK ADD bar slides up (black 70%, white 10px caps) — opens the
 * QuickAddSheet; name 12px caps; price 13px with sale
 * strike-through; colour swatches as 10px circles.
 *
 * Phones (v175, measured off skims.com at 440 px wide): the heart sits in a
 * rail with a bag-plus quick add (40 x 72 px, 32 px buttons, 16 px icons,
 * white at 50% with a blur), swatches are 24 px with the selected ring 4 px
 * out, and in `bleed` grids the photo is 9:13, edge to edge.
 */

interface Props {
  product: ShopifyProduct;
  badge?: string; // kept for API compatibility; rendered as minimal text label
  /** Edge-to-edge two-column grid on phones (collection pages, favourites):
      9:13 photo, text inset 16 px. Desktop is unchanged. */
  bleed?: boolean;
  /** One short line under the title (the homepage essentials row). */
  note?: string;
}

/* Bag with a plus at its corner - the quick-add mark. Drawn on the header
   bag's outline (lucide ShoppingBag) so the two read as one family. */
function BagPlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 22H5a2 2 0 0 1-2-2V6.667a2 2 0 0 1 .4-1.2l2-2.667A2 2 0 0 1 7 2h10a2 2 0 0 1 1.6.8l2 2.667a2 2 0 0 1 .4 1.2V13" />
      <path d="M3.103 6.034h17.794" />
      <path d="M16 10a4 4 0 0 1-8 0" />
      <path d="M18 16v6" />
      <path d="M15 19h6" />
    </svg>
  );
}

/*
 * True only on devices with a real hovering pointer.
 *
 * Touch browsers synthesise mouseenter on tap, so gating the garment swap on
 * hover alone would flip the image the moment a finger lands on the tile. The
 * swap is a desktop affordance — on a phone the garment shots belong to the
 * product page, reached by tapping through.
 *
 * Starts false so server and first client render agree, then resolves.
 */
function useHoverCapable(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setCan(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);
  return can;
}

export function ProductCard({ product, badge, bleed = false, note }: Props) {
  const node = product.node;
  const image = node.images.edges[0]?.node;
  const firstAvailable =
    node.variants.edges.find((v) => v.node.availableForSale)?.node ??
    node.variants.edges[0]?.node;
  const price = firstAvailable?.price ?? node.priceRange.minVariantPrice;
  const compareAt = firstAvailable?.compareAtPrice;
  const onSale =
    !!compareAt && parseFloat(compareAt.amount) > parseFloat(price.amount);

  const isLoading = useCartStore((s) => s.isLoading);
  const display = useDisplayPrice();

  /* The offer has to be legible from the grid, not only the PDP — a shopper
     who never taps in never learns it exists. */
  const bundleDeal = inBundleDeal(node.handle);
  const bundleLabel = useBundleLabel();

  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const colors = colorOption?.values ?? [];
  /* Opening colour: the TILE_DEFAULT_COLOUR pick while it's in stock, else
     the first. It leads the swatch row, so it's always one you can see. */
  const preferred = TILE_DEFAULT_COLOUR[node.handle];
  const preferredOk =
    !!preferred &&
    colors.includes(preferred) &&
    node.variants.edges.some(
      ({ node: v }) =>
        v.availableForSale &&
        v.selectedOptions.some((o) => o.name === colorOption?.name && o.value === preferred),
    );
  const startColor = preferredOk ? preferred : (colors[0] ?? null);
  const swatchColors = preferredOk ? [preferred, ...colors.filter((c) => c !== preferred)] : colors;
  // The product page opens on its first variant's colour unless told otherwise.
  const pageColor = node.variants.edges[0]?.node.selectedOptions.find(
    (o) => o.name === colorOption?.name,
  )?.value;

  const favHandles = useFavorites((s) => s.handles);
  const toggleFav = useFavorites((s) => s.toggle);
  const liked = favHandles.includes(node.handle);
  const onFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(node.handle);
  };

  const openQuickAdd = useQuickAdd((s) => s.openFor);
  const onQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Opens on the colour the tile is showing.
    openQuickAdd(product, activeColor);
  };

  /* Colour runs, so a swatch can switch the tile to that colour's shots and a
     hover can reveal the garment on its own — the SKIMS pattern. */
  const colorMap = useMemo(() => buildColorImageMap(node), [node]);
  const optName = colorOptionName(node);
  const [activeColor, setActiveColor] = useState<string | null>(startColor);
  const [hovering, setHovering] = useState(false);
  const hoverCapable = useHoverCapable();

  const run = (activeColor && colorMap.get(activeColor)) || [];
  const primary = run[0]?.node ?? image;

  /* Garment-only shot for the active colour, shown on hover. Indexed products resolve the ghost
     synchronously and render both layers from first paint, so the hover is a
     pure opacity flip. Unindexed products fall back to the sampler, run on
     mount rather than on hover so the cost is paid early. */
  /* Posed tile shot for the active colour, when one exists: it rests on top
     and the garment comes up on hover, for every category. */
  const posed = activeColor ? TILE_IMAGES[node.handle]?.[activeColor] : undefined;
  /* Every category, bras included, rests on the model (the posed shot where
     there is one, otherwise that colour's model photo) and shows the garment
     on hover. Bras used to lead with the garment; Joshua wants the model. */
  const isIndexed = !!indexedEntry(node.handle, activeColor);
  const staticGhost = indexedGhost(node.handle, activeColor, node.images.edges.map((e) => e.node));
  const [sampledGhost, setSampledGhost] = useState<string | null>(null);
  const ghost = isIndexed ? staticGhost : sampledGhost;

  useEffect(() => {
    setSampledGhost(null);
    if (!hoverCapable || isIndexed) return;
    let live = true;
    const want = activeColor ? colorToHex(activeColor) ?? null : null;
    const inRun = run.map((r) => r.node.url);
    (async () => {
      let g = inRun.length > 1 ? await findGhostForColor(inRun, want) : null;
      if (!g) {
        const all = node.images.edges.map((e) => e.node.url).slice(0, 40);
        g = await findGhostForColor(all, want);
      }
      if (live) setSampledGhost(g);
    })();
    return () => {
      live = false;
    };
  }, [hoverCapable, isIndexed, activeColor, node.handle]);

  // Price follows the selected colour.
  const colorVariant = activeColor && optName
    ? node.variants.edges.find((v) =>
        v.node.selectedOptions.some((o) => o.name === optName && o.value === activeColor),
      )?.node
    : undefined;
  const shownPrice = colorVariant?.price ?? price;
  const shownCompare = colorVariant ? colorVariant.compareAtPrice : compareAt;
  const shownOnSale =
    !!shownCompare && parseFloat(shownCompare.amount) > parseFloat(shownPrice.amount);
  const saleSticker = shownOnSale && SALE_STICKER_HANDLES.includes(node.handle);

  const onSwatch = (e: React.MouseEvent, c: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColor(c);
  };

  return (
    <Link
      to="/product/$handle"
      params={{ handle: node.handle }}
      // Lands on the colour the tile is showing.
      search={activeColor && activeColor !== pageColor ? { colour: activeColor } : {}}
      className="block"
    >
      {/*
        Hover state belongs to the image, not the whole card. The title, price
        and colour swatches sit inside this same Link, so tracking hover on the
        Link meant picking a colour counted as hovering the product — the card
        stayed on its alternate shot and you couldn't see the colour you'd just
        chosen until you moved the cursor away entirely.

        `group` lives here too so the Quick Add slide-up follows the same
        boundary.
      */}
      <div
        className={`group relative ${bleed ? "aspect-[9/13] md:aspect-[3/4]" : "aspect-[3/4]"} w-full overflow-hidden bg-[#f5f5f5]`}
        onMouseEnter={hoverCapable ? () => setHovering(true) : undefined}
        onMouseLeave={hoverCapable ? () => setHovering(false) : undefined}
      >
        {/* Resting layer: the garment alone for bras, the model everywhere else. */}
        {(primary || ghost) && (
          <EditorialImage
            src={posed ?? indexedRestImage(node.handle, activeColor, node.images.edges.map((e) => e.node), primary.url)}
            alt={primary?.altText ?? node.title}
            maxWidth={1000}
          />
        )}
        {/* Hover layer: whichever of the two isn't resting. */}
        {hoverCapable && ghost && primary && (
          <img
            src={shopifyImg(ghost, 800)}
            srcSet={shopifySrcSet(ghost, 1000)}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-cover object-[center_top] transition-opacity duration-300 ease-out ${
              hovering ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        {/* Desktop: the heart on its own; quick add is the hover bar below. */}
        <button
          aria-label={liked ? "Remove from favourites" : "Add to favourites"}
          onClick={onFav}
          className="absolute right-2.5 top-2.5 z-10 hidden h-8 w-8 place-items-center text-[#0a0a0a] transition-opacity hover:opacity-60 md:grid"
        >
          <Heart className={`h-[16px] w-[16px] ${liked ? "fill-[#0a0a0a]" : ""}`} strokeWidth={1.4} />
        </button>
        {/* Phones: SKIMS's rail where the heart sat - heart over a bag-plus
            quick add. 40 x 72 px: p-1 around two 32 px buttons. */}
        <div className="absolute right-3 top-2 z-10 flex flex-col rounded-full bg-white/50 p-1 backdrop-blur-md md:hidden">
          <button
            type="button"
            aria-label={liked ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={liked}
            onClick={onFav}
            className="grid h-8 w-8 place-items-center text-[#0a0a0a]"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-[#0a0a0a]" : ""}`} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label={
              firstAvailable?.availableForSale ? `Quick add ${node.title}` : `${node.title} is sold out`
            }
            onClick={onQuickAdd}
            disabled={!firstAvailable?.availableForSale}
            className="grid h-8 w-8 place-items-center text-[#0a0a0a] disabled:opacity-35"
          >
            <BagPlusIcon className="h-4 w-4" />
          </button>
        </div>
        {/* Left-top labels: the carousel's badge, then a small "Sale" sticker
            on the owner's picks (SALE_STICKER_HANDLES, lib/bundleDeal.ts) - only while this tile
            shows a reduced price, so it never sits beside a full price. */}
        {(badge || saleSticker) && (
          <span className="absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
            {badge && (
              <span className="rounded-pill bg-white px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]">
                {badge}
              </span>
            )}
            {saleSticker && (
              <span className="rounded-pill bg-[#0a0a0a] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-[0_2px_6px_rgba(0,0,0,0.18)]">
                Sale
              </span>
            )}
          </span>
        )}

        {/* QUICK ADD — slides up from bottom on hover (desktop) */}
        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full transition-transform duration-[250ms] ease-out group-hover:translate-y-0 md:block">
            <button
              onClick={onQuickAdd}
              disabled={isLoading || !firstAvailable?.availableForSale}
              className="flex h-10 w-full items-center justify-center bg-[#0a0a0a]/70 text-[10px] uppercase tracking-widest text-white backdrop-blur-[2px] transition-opacity hover:bg-[#0a0a0a]/80 disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : firstAvailable?.availableForSale ? (
                "Quick Add"
              ) : (
                "Sold Out"
              )}
            </button>
        </div>
      </div>

      <div className={bleed ? "mt-2.5 px-4 md:px-0" : "mt-2.5"}>
        <h3 className="text-[12px] uppercase tracking-wide text-[#0a0a0a] leading-snug">
          {node.title}
        </h3>
        {note && <p className="mt-0.5 text-[12px] leading-snug text-[#555555]">{note}</p>}
        <div className="mt-1 flex items-baseline gap-2 text-[13px]">
          {shownOnSale && shownCompare && (
            <span className="text-[#888888] line-through">
              {display(shownCompare.amount, shownCompare.currencyCode)}
            </span>
          )}
          <span className="text-[#0a0a0a]">
            {display(shownPrice.amount, shownPrice.currencyCode)}
          </span>
          {bundleDeal && (
            <span className="rounded-pill border border-[#0a0a0a] px-1.5 py-[1px] text-[10px] uppercase leading-none tracking-[0.08em] text-[#0a0a0a]">
              {bundleLabel}
            </span>
          )}
        </div>
        {/* Phones: 24 px dots, 8 px apart, ring 4 px out - SKIMS's sizes -
            five then "+N" so the row fits a half-width tile. Desktop: 16 px
            dots, six then "+N". */}
        {colors.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-2 md:gap-1.5">
            {swatchColors.slice(0, 6).map((c, i) => (
              <button
                key={c}
                title={c}
                aria-label={c}
                aria-pressed={c === activeColor}
                onClick={(e) => onSwatch(e, c)}
                className={`${i === 5 ? "max-md:hidden " : ""}grid h-6 w-6 place-items-center rounded-full transition-shadow ${
                  c === activeColor ? "ring-1 ring-[#0a0a0a] ring-offset-4 md:ring-offset-2" : ""
                }`}
              >
                <span
                  className="h-6 w-6 rounded-full border border-[#0a0a0a]/15 md:h-4 md:w-4"
                  style={((): React.CSSProperties => {
                    // Prints show a crop of the fabric rather than a flat dot.
                    const crop = indexedSwatch(node.handle, c, node.images.edges.map((e) => e.node));
                    if (crop)
                      return {
                        backgroundImage: `url(${shopifyImg(crop.url, 200)})`,
                        backgroundPosition: crop.position,
                        backgroundSize: crop.size,
                      };
                    return { background: indexedHex(node.handle, c) ?? colorToHex(c) ?? "#cccccc" };
                  })()}
                />
              </button>
            ))}
            {colors.length > 5 && (
              <span className="text-[10px] text-[#888888] md:hidden">+{colors.length - 5}</span>
            )}
            {colors.length > 6 && (
              <span className="hidden text-[10px] text-[#888888] md:inline">+{colors.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
