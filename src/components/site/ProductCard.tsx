import { Link } from "@tanstack/react-router";
import { Heart, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useQuickAdd } from "@/stores/quickAddStore";
import { useFavorites } from "@/stores/favoritesStore";
import type { ShopifyProduct } from "@/lib/shopify";
import { useDisplayPrice } from "@/lib/preferences";
import { colorToHex } from "@/lib/colorMap";
import { EditorialImage } from "@/components/site/EditorialImage";

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

  return (
    <Link
      to="/product/$handle"
      params={{ handle: node.handle }}
      className="group block"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#f5f5f5]">
        {image && (
          <EditorialImage src={image.url} alt={image.altText ?? node.title} />
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
          {onSale && compareAt && (
            <span className="text-[#888888] line-through">
              {display(compareAt.amount, compareAt.currencyCode)}
            </span>
          )}
          <span className="text-[#0a0a0a]">
            {display(price.amount, price.currencyCode)}
          </span>
        </div>
        {colors.length > 1 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {colors.slice(0, 6).map((c) => (
              <span
                key={c}
                title={c}
                className="h-2.5 w-2.5 rounded-full border border-[#0a0a0a]/15"
                style={{ background: colorToHex(c) ?? "#cccccc" }}
              />
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
