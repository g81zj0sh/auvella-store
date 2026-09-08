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

/*
 * Product card — SKIMS spec:
 * no border, no shadow, no card background; 3:4 image; hover scale 1.04;
 * QUICK ADD bar slides up (black 70%, white 10px caps) — opens the
 * QuickAddSheet; name 12px caps; price 13px with sale
 * strike-through; colour swatches as 10px circles.
 */

interface Props {
  product: ShopifyProduct;
  badge?: string; // kept for API compatibility; rendered as minimal text label
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

export function ProductCard({ product, badge }: Props) {
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

  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const colors = colorOption?.values ?? [];

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
    openQuickAdd(product);
  };

  /* Colour runs, so a swatch can switch the tile to that colour's shots and a
     hover can reveal the garment on its own — the SKIMS pattern. */
  const colorMap = useMemo(() => buildColorImageMap(node), [node]);
  const optName = colorOptionName(node);
  const [activeColor, setActiveColor] = useState<string | null>(colors[0] ?? null);
  const [hovering, setHovering] = useState(false);
  const hoverCapable = useHoverCapable();
  const [ghost, setGhost] = useState<string | null>(null);

  const run = (activeColor && colorMap.get(activeColor)) || [];
  const primary = run[0]?.node ?? image;

  // Resolve the garment-only shot for the active colour, lazily and from tiny
  // thumbnails, so an unhovered grid costs nothing.
  useEffect(() => {
    setGhost(null);
    if (!hoverCapable || !hovering) return;
    let live = true;
    const want = activeColor ? colorToHex(activeColor) ?? null : null;
    const inRun = run.map((r) => r.node.url);
    (async () => {
      let g = inRun.length > 1 ? await findGhostForColor(inRun, want) : null;
      if (!g) {
        // Some galleries aren't grouped by colour, so the run can miss the
        // right garment. Widen to the whole gallery and match on colour.
        const all = node.images.edges.map((e) => e.node.url).slice(0, 40);
        g = await findGhostForColor(all, want);
      }
      if (live) setGhost(g);
    })();
    return () => {
      live = false;
    };
  }, [hoverCapable, hovering, activeColor, node.handle]);

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

  const onSwatch = (e: React.MouseEvent, c: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveColor(c);
  };

  return (
    <Link
      to="/product/$handle"
      params={{ handle: node.handle }}
      className="group block"
      onMouseEnter={hoverCapable ? () => setHovering(true) : undefined}
      onMouseLeave={hoverCapable ? () => setHovering(false) : undefined}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f5f5f5]">
        {primary && (
          <EditorialImage src={primary.url} alt={primary.altText ?? node.title} />
        )}
        {/* Garment-only shot, crossfaded in over the model shot on hover. */}
        {hoverCapable && ghost && (
          <img
            src={ghost}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover object-[center_top] transition-opacity duration-300 ease-out ${
              hovering ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
        <button
          aria-label={liked ? "Remove from favourites" : "Add to favourites"}
          onClick={onFav}
          className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center text-[#0a0a0a] transition-opacity hover:opacity-60"
        >
          <Heart className={`h-[16px] w-[16px] ${liked ? "fill-[#0a0a0a]" : ""}`} strokeWidth={1.4} />
        </button>
        {badge && (
          <span className="absolute left-3 top-3 bg-white px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#0a0a0a]">
            {badge}
          </span>
        )}

        {/* QUICK ADD — slides up from bottom on hover */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-[250ms] ease-out group-hover:translate-y-0">
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

      <div className="mt-2.5">
        <h3 className="text-[12px] uppercase tracking-wide text-[#0a0a0a] leading-snug">
          {node.title}
        </h3>
        <div className="mt-1 flex items-baseline gap-2 text-[13px]">
          {shownOnSale && shownCompare && (
            <span className="text-[#888888] line-through">
              {display(shownCompare.amount, shownCompare.currencyCode)}
            </span>
          )}
          <span className="text-[#0a0a0a]">
            {display(shownPrice.amount, shownPrice.currencyCode)}
          </span>
        </div>
        {colors.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {colors.slice(0, 6).map((c) => (
              <button
                key={c}
                title={c}
                aria-label={c}
                aria-pressed={c === activeColor}
                onClick={(e) => onSwatch(e, c)}
                className={`grid h-6 w-6 place-items-center rounded-full transition-shadow ${
                  c === activeColor ? "ring-1 ring-[#0a0a0a] ring-offset-2" : ""
                }`}
              >
                <span
                  className="h-4 w-4 rounded-full border border-[#0a0a0a]/15"
                  style={{ background: colorToHex(c) ?? "#cccccc" }}
                />
              </button>
            ))}
            {colors.length > 6 && (
              <span className="text-[10px] text-[#888888]">+{colors.length - 6}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
