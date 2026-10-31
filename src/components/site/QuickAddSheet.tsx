import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCartStore } from "@/stores/cartStore";
import { addedToBagText } from "@/lib/freeDelivery";
import { useDisplayPrice, usePreferences } from "@/lib/preferences";
import { sizeLabel } from "@/lib/sizeLabels";
import { fetchProductByHandle, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { buildColorImageMap } from "@/lib/colorImages";
import { colourSwatchStyle } from "@/lib/swatch";
import { SizeGuide } from "@/components/site/SizeGuide";
import { resolveGuide } from "@/lib/sizeGuides";
import { chartForHandle, isGuideHidden } from "@/lib/productSizeCharts";
import { installCatalogTables } from "@/lib/catalogTables";
import { FULL_CATALOG_TABLES } from "@/lib/catalogTablesFull";

// v205: the full catalogue tables (lib/catalogTables), in before this renders.
installCatalogTables(FULL_CATALOG_TABLES);

/*
 * QuickAddSheet — richer quick add opened from product cards.
 * Right-side sheet on desktop, bottom sheet on mobile.
 * Gallery + thumbnails · colour swatches · size grid · quantity ·
 * Size Guide (same real charts as the PDP) · Add to Bag · View full details.
 *
 * v160: the sheet loads the full product (the product page's own query, so
 * it's usually cached) instead of relying on the card that opened it - the
 * bag's grids fetch only 6 photos per product, so most colours had no photo
 * to switch to (e.g. the Satin Tie-Waist Robe changed only for its first two
 * colours). Picking a colour shows that colour's photos and thumbnails via
 * buildColorImageMap, the same mapping the product cards use, and swatches
 * share the product page's colours (lib/swatch.ts).
 */

type VariantNode = ShopifyProduct["node"]["variants"]["edges"][number]["node"];

interface Props {
  product: ShopifyProduct | null;
  /** Colour to open on (the one the tile was showing); else the first in stock. */
  color?: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QuickAddSheet({ product, color, open, onOpenChange }: Props) {
  if (!product) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col overflow-y-auto bg-white p-0 sm:max-w-md [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Quick add — {product.node.title}</SheetTitle>
        {/* key on handle + colour so state resets when a different tile opens */}
        <QuickAddBody
          key={`${product.node.handle}|${color ?? ""}`}
          product={product}
          color={color ?? undefined}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function QuickAddBody({
  product: card,
  color: tileColor,
  onClose,
}: {
  product: ShopifyProduct;
  color?: string;
  onClose: () => void;
}) {
  const { data: full } = useQuery({
    queryKey: ["product", card.node.handle],
    queryFn: () => fetchProductByHandle(card.node.handle),
    staleTime: 5 * 60_000,
  });
  const product = full ?? card;
  const node = product.node;
  const sizeRegion = usePreferences((st) => st.sizeRegion);
  const addItem = useCartStore((s) => s.addItem);
  const isSyncing = useCartStore((s) => s.isSyncing);
  const displayPrice = useDisplayPrice();

  const allImages = useMemo(() => node.images.edges.map((e) => e.node), [node]);
  const [imgIdx, setImgIdx] = useState(0);

  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const sizeOption = node.options.find((o) => /size/i.test(o.name));

  const firstAvailable =
    node.variants.edges.find((v) => v.node.availableForSale)?.node ?? node.variants.edges[0]?.node;
  const initialColor =
    (tileColor && colorOption?.values.includes(tileColor) ? tileColor : undefined) ??
    firstAvailable?.selectedOptions.find((o) => o.name === colorOption?.name)?.value ??
    colorOption?.values[0];

  const [selColor, setSelColor] = useState<string | undefined>(initialColor);
  const [selSize, setSelSize] = useState<string | undefined>(
    sizeOption && sizeOption.values.length === 1 ? sizeOption.values[0] : undefined,
  );
  const [qty, setQty] = useState(1);
  /* Any option that is neither colour nor size (the Body Adhesive's Type).
     The sheet used to ignore these, so every Body Adhesive went in as its
     first type, whichever one the shopper wanted (v160). */
  const otherOptions = node.options.filter(
    (o) => o !== colorOption && o !== sizeOption && o.values.length > 1,
  );
  const [selOther, setSelOther] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      otherOptions.map((o) => [
        o.name,
        firstAvailable?.selectedOptions.find((x) => x.name === o.name)?.value ?? o.values[0],
      ]),
    ),
  );
  const matchesOther = (v: VariantNode, sel: Record<string, string>) =>
    otherOptions.every((opt) =>
      v.selectedOptions.some((o) => o.name === opt.name && o.value === sel[opt.name]),
    );
  /* The picked colour's own photos when the product has them mapped, else
     the whole gallery (never empty). */
  const colorMap = useMemo(() => buildColorImageMap(node), [node]);
  const images = useMemo(() => {
    const set = selColor ? colorMap.get(selColor) : undefined;
    return set && set.length > 0 ? set.map((im) => im.node) : allImages;
  }, [colorMap, selColor, allImages]);
  // A new colour (or the full product arriving) starts at that set's first photo.
  useEffect(() => {
    setImgIdx(0);
  }, [images]);
  const shown = images[Math.min(imgIdx, images.length - 1)];
  const [guideOpen, setGuideOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const variantFor = (color?: string, size?: string): VariantNode | undefined =>
    node.variants.edges.find(({ node: v }) => {
      const okColor =
        !colorOption ||
        !color ||
        v.selectedOptions.some((o) => o.name === colorOption.name && o.value === color);
      const okSize =
        !sizeOption ||
        !size ||
        v.selectedOptions.some((o) => o.name === sizeOption.name && o.value === size);
      return okColor && okSize && matchesOther(v, selOther);
    })?.node;

  const sizeInStock = (size: string) =>
    node.variants.edges.some(
      ({ node: v }) =>
        v.availableForSale &&
        matchesOther(v, selOther) &&
        v.selectedOptions.some((o) => o.name === sizeOption?.name && o.value === size) &&
        (!colorOption ||
          !selColor ||
          v.selectedOptions.some((o) => o.name === colorOption.name && o.value === selColor)),
    );

  const selected = variantFor(selColor, selSize);
  const priceVariant = selected ?? firstAvailable;
  const needsSize = !!sizeOption && sizeOption.values.length > 1 && !selSize;
  const canAdd =
    !!priceVariant && priceVariant.availableForSale && !needsSize && !adding && !isSyncing;

  const price = priceVariant
    ? displayPrice(priceVariant.price.amount, priceVariant.price.currencyCode)
    : "";
  const compare =
    priceVariant?.compareAtPrice &&
    parseFloat(priceVariant.compareAtPrice.amount) > parseFloat(priceVariant.price.amount)
      ? displayPrice(priceVariant.compareAtPrice.amount, priceVariant.compareAtPrice.currencyCode)
      : null;

  const guide = resolveGuide(node.title);
  const productChart = chartForHandle(node.handle);
  const showGuide =
    !isGuideHidden(node.handle) && (productChart != null || guide.guideType !== "none");

  const onPickColor = (c: string) => setSelColor(c);

  /** Pick a value of an extra option; show that variant's own photo when it has one. */
  const onPickOther = (name: string, value: string) => {
    const next = { ...selOther, [name]: value };
    setSelOther(next);
    const v = node.variants.edges.find(
      ({ node: vv }) =>
        matchesOther(vv, next) &&
        (!colorOption ||
          !selColor ||
          vv.selectedOptions.some((o) => o.name === colorOption.name && o.value === selColor)),
    )?.node;
    const url = v?.image?.url;
    if (!url) return;
    const key = (u: string) => u.split("?")[0];
    const i = images.findIndex((im) => key(im.url) === key(url));
    if (i >= 0) setImgIdx(i);
  };
  const otherInStock = (name: string, value: string) =>
    node.variants.edges.some(
      ({ node: v }) =>
        v.availableForSale &&
        matchesOther(v, { ...selOther, [name]: value }) &&
        (!colorOption ||
          !selColor ||
          v.selectedOptions.some((o) => o.name === colorOption.name && o.value === selColor)),
    );

  const onAdd = async () => {
    if (!priceVariant || !canAdd) return;
    setAdding(true);
    try {
      await addItem({
        product,
        variantId: priceVariant.id,
        variantTitle: priceVariant.title,
        price: priceVariant.price,
        quantity: qty,
        selectedOptions: priceVariant.selectedOptions || [],
      });
      // v224: with the free-delivery offer once Shopify has it on the bag.
      toast.success(addedToBagText(useCartStore.getState()), { position: "top-center" });
      onClose();
    } finally {
      setAdding(false);
    }
  };

  const category = ((node as { productType?: string }).productType ?? "").trim();

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-6">
        <div>
          {category && (
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#888888]">{category}</p>
          )}
          <h2 className="mt-1 font-serif text-lg leading-snug text-[#0a0a0a]">{node.title}</h2>
          <p className="mt-1.5 text-[14px] text-[#0a0a0a]">
            {compare && <span className="mr-2 text-[#999999] line-through">{compare}</span>}
            {price}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 -mt-2 p-2 text-[#0a0a0a] transition-opacity hover:opacity-60"
        >
          <X className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Gallery */}
      <div className="mt-5 px-6">
        <div className="aspect-[4/5] w-full overflow-hidden bg-[#f5f5f5]">
          {shown && (
            <img
              src={shopifyImg(shown.url, 900)}
              alt={shown.altText ?? node.title}
              className="h-full w-full object-cover object-top"
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto">
            {images.slice(0, 8).map((im, i) => (
              <button
                key={im.url}
                onClick={() => setImgIdx(i)}
                className={`h-16 w-12 shrink-0 overflow-hidden border transition ${
                  im === shown ? "border-[#0a0a0a]" : "border-transparent hover:border-[#cccccc]"
                }`}
              >
                <img
                  src={shopifyImg(im.url, 200)}
                  alt=""
                  className="h-full w-full object-cover object-top"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      <div className="flex-1 px-6 pb-6 pt-6">
        {colorOption && colorOption.values.length > 0 && (
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
              Colour
              <span className="ml-2 font-normal normal-case tracking-normal text-[#888888]">
                {selColor}
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {colorOption.values.map((c) => {
                const active = c === selColor;
                return (
                  <button
                    key={c}
                    onClick={() => onPickColor(c)}
                    aria-label={c}
                    title={c}
                    className={`h-7 w-7 rounded-full border-2 p-[2px] transition ${
                      active ? "border-[#0a0a0a]" : "border-transparent hover:border-[#bbbbbb]"
                    }`}
                  >
                    <span
                      className="block h-full w-full rounded-full border border-[#0a0a0a]/10 bg-cover"
                      style={colourSwatchStyle(node, colorOption.name, c, allImages)}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizeOption && sizeOption.values.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
                Size
              </p>
              {showGuide && (
                <button
                  onClick={() => setGuideOpen(true)}
                  className="text-[12px] font-semibold text-[#0a0a0a] underline underline-offset-4 transition-opacity hover:opacity-60"
                >
                  Size Guide
                </button>
              )}
            </div>
            <div
              className={`mt-2.5 grid gap-1.5 ${sizeOption.values.some((v) => sizeLabel(node.handle, v, sizeRegion, guide.guideType)) ? "grid-cols-3" : "grid-cols-5"}`}
            >
              {sizeOption.values.map((sz) => {
                const regional = sizeLabel(node.handle, sz, sizeRegion, guide.guideType);
                const active = sz === selSize;
                const inStock = sizeInStock(sz);
                return (
                  <button
                    key={sz}
                    disabled={!inStock}
                    onClick={() => setSelSize(sz)}
                    className={`relative h-10 whitespace-nowrap rounded-control border px-1 text-[11px] uppercase tracking-[0.06em] transition ${
                      active
                        ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                        : inStock
                          ? "border-[#EBEBEB] text-[#0a0a0a] hover:border-[#0a0a0a]"
                          : "cursor-not-allowed border-[#EBEBEB] text-[#c4c4c4] line-through"
                    }`}
                  >
                    {sz}
                    {regional && <span className="ml-1 normal-case">({regional})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {otherOptions.map((opt) => (
          <div key={opt.name} className="mt-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
              {opt.name}
              <span className="ml-2 font-normal normal-case tracking-normal text-[#888888]">
                {selOther[opt.name]}
              </span>
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {opt.values.map((val) => {
                const active = selOther[opt.name] === val;
                const inStock = otherInStock(opt.name, val);
                return (
                  <button
                    key={val}
                    disabled={!inStock}
                    aria-pressed={active}
                    onClick={() => onPickOther(opt.name, val)}
                    className={`h-10 rounded-control border px-2 text-[11px] uppercase tracking-[0.06em] transition ${
                      active
                        ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                        : inStock
                          ? "border-[#EBEBEB] text-[#0a0a0a] hover:border-[#0a0a0a]"
                          : "cursor-not-allowed border-[#EBEBEB] text-[#c4c4c4] line-through"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
            Quantity
          </p>
          <div className="mt-2.5 inline-flex h-10 items-center rounded-control border border-[#EBEBEB]">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-full w-10 place-items-center transition-opacity hover:opacity-60"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
            <span className="w-8 text-center text-[13px]">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="grid h-full w-10 place-items-center transition-opacity hover:opacity-60"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 border-t border-[#EBEBEB] bg-white px-6 pb-6 pt-4">
        <button
          onClick={onAdd}
          disabled={!canAdd}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-control text-[11px] uppercase tracking-[0.18em] transition ${
            canAdd
              ? "bg-[#0a0a0a] text-white hover:opacity-90"
              : "cursor-not-allowed border border-[#0a0a0a] bg-white text-[#0a0a0a]"
          }`}
        >
          {adding || isSyncing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : needsSize ? (
            "Select a size"
          ) : !priceVariant?.availableForSale ? (
            "Sold out"
          ) : (
            <>Add to Bag · {price}</>
          )}
        </button>
        <Link
          to="/product/$handle"
          params={{ handle: node.handle }}
          onClick={onClose}
          className="mt-3 block text-center text-[11px] uppercase tracking-[0.14em] text-[#0a0a0a] underline underline-offset-4 transition-opacity hover:opacity-60"
        >
          View full details
        </Link>
      </div>

      {showGuide && (
        <SizeGuide
          open={guideOpen}
          onOpenChange={setGuideOpen}
          guideType={guide.guideType}
          fitOverride={guide.fitOverride}
          productChart={productChart}
          handle={node.handle}
        />
      )}
    </div>
  );
}
