import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { ShopifyProduct } from "@/lib/shopify";
import { useDisplayPrice } from "@/lib/preferences";
import { colorToHex } from "@/lib/colorMap";

interface Props {
  product: ShopifyProduct;
  badge?: string;
}

export function BestsellerCard({ product, badge }: Props) {
  const node = product.node;
  const display = useDisplayPrice();

  // Find the color option (if any)
  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const colorName = colorOption?.name;

  // Group variants by color value
  const colorGroups = useMemo(() => {
    const map = new Map<string, { value: string; image?: string | null; variantId: string }>();
    if (!colorName) return map;
    for (const edge of node.variants.edges) {
      const v = edge.node;
      const opt = v.selectedOptions.find((o) => o.name === colorName);
      if (!opt) continue;
      if (!map.has(opt.value)) {
        map.set(opt.value, {
          value: opt.value,
          image: v.image?.url ?? null,
          variantId: v.id,
        });
      }
    }
    return map;
  }, [node, colorName]);

  const colors = Array.from(colorGroups.values());
  const [selected, setSelected] = useState<string | null>(colors[0]?.value ?? null);

  const allImages = node.images.edges.map((e) => e.node.url);
  const selectedColor = selected ? colorGroups.get(selected) : undefined;

  // Primary image: variant image for selected color, else first product image
  const primary = selectedColor?.image || allImages[0];
  // Secondary (hover) image: next product image that's different from primary
  const secondary =
    allImages.find((u) => u && u !== primary) || allImages[1] || primary;

  const price = node.variants.edges[0]?.node.price ?? node.priceRange.minVariantPrice;

  return (
    <div className="group block">
      <Link to="/product/$handle" params={{ handle: node.handle }} className="block">
        <div className="relative overflow-hidden bg-[#f3f3f1] aspect-[3/4]">
          {primary && (
            <img
              src={primary}
              alt={node.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500 group-hover:opacity-0"
            />
          )}
          {secondary && (
            <img
              src={secondary}
              alt={`${node.title} alternate`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          {badge && (
            <span className="absolute top-3 left-3 bg-[#b8312f] text-white text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 font-semibold">
              {badge}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-3">
        <Link to="/product/$handle" params={{ handle: node.handle }}>
          <h3 className="font-sans text-[13px] text-ink leading-snug">{node.title}</h3>
        </Link>
        <div className="mt-1 text-[12px] text-ink">
          {display(price.amount, price.currencyCode)}
        </div>
        {colors.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {colors.map((c) => {
              const hex = colorToHex(c.value) ?? "#cccccc";
              const active = c.value === selected;
              return (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.value}
                  title={c.value}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelected(c.value);
                  }}
                  className={`h-3.5 w-3.5 rounded-full border transition-all ${
                    active ? "ring-1 ring-ink ring-offset-1 ring-offset-cream border-transparent" : "border-ink/20"
                  }`}
                  style={{ background: hex }}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
