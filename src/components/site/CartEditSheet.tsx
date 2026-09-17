import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { useDisplayPrice } from "@/lib/preferences";
import { colorToHex } from "@/lib/colorMap";
import { cartLineImage } from "@/lib/cartImage";

/*
 * CartEditSheet — change the colour or size of a line already in the bag.
 *
 * Opens pre-selected to the line's current variant, mirrors QuickAddSheet's
 * option logic (colour × size → variant, greyed sizes when out of stock for
 * the chosen colour), and on save swaps the Shopify line's merchandise in
 * place so quantity survives. Shopify merges lines that share a variant, so
 * the store looks the surviving line up by variant rather than by position.
 */

type Props = {
  item: CartItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartEditSheet({ item, open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[440px] bg-cream p-0 flex flex-col"
      >
        <SheetTitle className="sr-only">Edit item</SheetTitle>
        {item && <EditBody key={item.variantId} item={item} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function EditBody({ item, onDone }: { item: CartItem; onDone: () => void }) {
  const node = item.product.node;
  const display = useDisplayPrice();
  const { swapVariant, isLoading } = useCartStore();

  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const sizeOption = node.options.find((o) => /size/i.test(o.name));

  const currentColor = item.selectedOptions.find((o) => o.name === colorOption?.name)?.value;
  const currentSize = item.selectedOptions.find((o) => o.name === sizeOption?.name)?.value;

  const [selColor, setSelColor] = useState<string | undefined>(currentColor);
  const [selSize, setSelSize] = useState<string | undefined>(currentSize);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const variantFor = (color?: string, size?: string) =>
    node.variants.edges.find(({ node: v }) => {
      const okColor =
        !colorOption || !color || v.selectedOptions.some((o) => o.name === colorOption.name && o.value === color);
      const okSize =
        !sizeOption || !size || v.selectedOptions.some((o) => o.name === sizeOption.name && o.value === size);
      return okColor && okSize;
    })?.node;

  const sizeInStock = (size: string) =>
    node.variants.edges.some(
      ({ node: v }) =>
        v.availableForSale &&
        v.selectedOptions.some((o) => o.name === sizeOption?.name && o.value === size) &&
        (!colorOption ||
          !selColor ||
          v.selectedOptions.some((o) => o.name === colorOption.name && o.value === selColor)),
    );

  const selected = useMemo(() => variantFor(selColor, selSize), [selColor, selSize]);
  const unchanged = selected?.id === item.variantId;
  const canSave = !!selected && selected.availableForSale && !unchanged && !saving && !isLoading;

  const onPickColor = (c: string) => {
    setSelColor(c);
    // If the current size isn't stocked in the new colour, drop it so the
    // shopper picks again rather than saving something unavailable.
    if (selSize && !node.variants.edges.some(
      ({ node: v }) =>
        v.availableForSale &&
        v.selectedOptions.some((o) => o.name === colorOption?.name && o.value === c) &&
        v.selectedOptions.some((o) => o.name === sizeOption?.name && o.value === selSize),
    )) {
      setSelSize(undefined);
    }
  };

  const save = async () => {
    if (!canSave || !selected) return;
    setSaving(true);
    setError("");
    try {
      await swapVariant(item.variantId, {
        variantId: selected.id,
        variantTitle: selected.title,
        price: selected.price,
        selectedOptions: selected.selectedOptions,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update that item — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const thumb = cartLineImage(item.product, selected?.id ?? item.variantId, selected?.selectedOptions ?? item.selectedOptions, 300);
  const price = selected?.price ?? item.price;
  const compare = selected?.compareAtPrice ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink">Edit item</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex gap-4">
          <div className="h-28 w-[88px] flex-shrink-0 overflow-hidden bg-beige">
            {thumb && <img src={thumb.url} alt={thumb.alt} className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            {node.productType && (
              <p className="text-[10px] uppercase tracking-[0.18em] text-cocoa">{node.productType}</p>
            )}
            <p className="mt-1 font-serif text-[17px] leading-snug text-ink">{node.title}</p>
            <p className="mt-1.5 text-[14px] text-ink">
              {display(price.amount, price.currencyCode)}
              {compare && parseFloat(compare.amount) > parseFloat(price.amount) && (
                <span className="ml-2 text-[13px] text-cocoa line-through">
                  {display(compare.amount, compare.currencyCode)}
                </span>
              )}
            </p>
          </div>
        </div>

        {colorOption && colorOption.values.length > 0 && (
          <div className="mt-7">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
              Colour
              <span className="ml-2 font-normal normal-case tracking-normal text-cocoa">{selColor}</span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {colorOption.values.map((c) => {
                const hex = colorToHex(c) ?? "#cccccc";
                const active = c === selColor;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onPickColor(c)}
                    aria-label={c}
                    title={c}
                    className={`h-7 w-7 rounded-sm border-2 p-[2px] transition ${
                      active ? "border-ink" : "border-transparent hover:border-[#bbbbbb]"
                    }`}
                  >
                    <span className="block h-full w-full rounded-[2px] border border-ink/10" style={{ background: hex }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizeOption && sizeOption.values.length > 0 && (
          <div className="mt-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">
              Size
              <span className="ml-2 font-normal normal-case tracking-normal text-cocoa">{selSize}</span>
            </p>
            <div className="mt-2.5 grid grid-cols-5 gap-1.5">
              {sizeOption.values.map((sz) => {
                const active = sz === selSize;
                const inStock = sizeInStock(sz);
                return (
                  <button
                    key={sz}
                    type="button"
                    disabled={!inStock}
                    onClick={() => setSelSize(sz)}
                    className={`h-10 border text-[11px] uppercase tracking-[0.06em] transition ${
                      active
                        ? "border-ink bg-ink text-cream"
                        : inStock
                          ? "border-border text-ink hover:border-ink"
                          : "cursor-not-allowed border-border text-[#c4c4c4] line-through"
                    }`}
                  >
                    {sz}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-[12px] text-[#B3261E]">{error}</p>}
      </div>

      <div className="border-t border-border bg-cream px-6 py-4">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="flex h-12 w-full items-center justify-center gap-2 bg-ink text-[11px] font-medium uppercase tracking-[0.2em] text-cream transition-colors hover:bg-cocoa disabled:opacity-40"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : unchanged ? "No changes" : "Update bag"}
        </button>
      </div>
    </div>
  );
}
