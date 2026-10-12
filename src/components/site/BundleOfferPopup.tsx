import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCartStore } from "@/stores/cartStore";
import { useDisplayPrice, usePreferences } from "@/lib/preferences";
import { fetchProductsByHandles, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { BUNDLE_DEAL, BUNDLE_PER_UNIT_OFF_GBP, inBundleDeal } from "@/lib/bundleDeal";
import {
  BUNDLE_OFFER_DELAY_MS,
  BUNDLE_OFFER_PATHS,
  BUNDLE_POPUP_ATTRIBUTE,
  bundleOfferSnoozed,
  markBundleOfferSeen,
} from "@/lib/bundleOffer";
import { colourSwatchStyle } from "@/lib/swatch";

/*
 * "Pick any 3 for £30" builder popup (v176). Rules in lib/bundleOffer.ts.
 *
 * Three slots at the top fill as the shopper adds pieces - any mix of the
 * deal's products, each in its own colour and size - and "Add my 3" puts all
 * three in the bag, where the live Shopify automatic discount brings them to
 * £30. Every price shown is worked out from the products' own prices and the
 * deal's £2.99-per-item saving, so it is what checkout charges.
 */
type Variant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];
type Pick = { product: ShopifyProduct; variant: Variant };

const optionValue = (v: Variant, re: RegExp) =>
  v.selectedOptions.find((o) => re.test(o.name))?.value;
const COLOUR = /colou?r/i;
const SIZE = /size/i;

export function BundleOfferPopup() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  // Outlives `open` so the content stays during the close animation.
  const [products, setProducts] = useState<ShopifyProduct[] | null>(null);
  const currentPath = useRef(pathname);
  currentPath.current = pathname;

  useEffect(() => {
    if (!BUNDLE_OFFER_PATHS.includes(pathname) || bundleOfferSnoozed()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let waits = 0;
    const dealUnits = () =>
      useCartStore
        .getState()
        .items.filter((i) => inBundleDeal(i.product.node.handle))
        .reduce((s, i) => s + i.quantity, 0);
    /* Something else is on screen: an open sheet or dialog (bag, quick add,
       another offer), the cookie banner, the review photo viewer or the
       phone menu (data-overlay). Wait for it rather than stack on top. */
    const busy = () =>
      !!document.querySelector(
        '[role="dialog"][data-state="open"], [role="dialog"]:not([data-state]), [data-overlay="open"]',
      );
    // The £30 is a UK price: the shopper must be shown GBP, not just sent it.
    const ukPrices = () => usePreferences.getState().currency === "GBP";
    const stillWanted = () =>
      !cancelled &&
      !bundleOfferSnoozed() &&
      currentPath.current === pathname &&
      ukPrices() &&
      dealUnits() < BUNDLE_DEAL.minQuantity;
    const attempt = async () => {
      if (!stillWanted()) return;
      if (busy()) {
        if (++waits < 15) timer = setTimeout(attempt, 2000);
        return;
      }
      try {
        const list = await queryClient.fetchQuery({
          queryKey: ["bundle-offer-products"],
          queryFn: () => fetchProductsByHandles(BUNDLE_DEAL.handles),
          staleTime: 5 * 60_000,
        });
        const inStock = list.filter((p) =>
          p.node.variants.edges.some((e) => e.node.availableForSale),
        );
        const currency = inStock[0]?.node.variants.edges[0]?.node.price.currencyCode;
        // Elsewhere the deal is named, never priced (bundleLabel).
        if (!inStock.length || currency !== "GBP") return;
        // Re-check everything: the bag or the page may have changed meanwhile.
        if (!stillWanted()) return;
        if (busy()) {
          if (++waits < 15) timer = setTimeout(attempt, 2000);
          return;
        }
        markBundleOfferSeen();
        setProducts(inStock);
        setOpen(true);
      } catch {
        /* products didn't load: no popup this time */
      }
    };
    timer = setTimeout(attempt, BUNDLE_OFFER_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname, queryClient]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="z-[80] bg-[#0a0a0a]/35 backdrop-blur-[8px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[80] flex max-h-[92dvh] w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-card bg-white shadow-lg duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          {products && <BundleOfferBody products={products} onClose={() => setOpen(false)} />}
          <DialogPrimitive.Close className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#0a0a0a] shadow-sm transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]">
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function BundleOfferBody({
  products,
  onClose,
}: {
  products: ShopifyProduct[];
  onClose: () => void;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const display = useDisplayPrice();
  const [picks, setPicks] = useState<Pick[]>([]);
  /* Slots already in the bag after a partly failed add - kept, locked, and
     skipped on the retry, so nothing goes in twice. */
  const [inBag, setInBag] = useState<boolean[]>([]);
  const [adding, setAdding] = useState(false);
  const need = BUNDLE_DEAL.minQuantity;
  const full = picks.length >= need;
  const ctaRef = useRef<HTMLButtonElement>(null);
  // The third pick locks every Add: hand focus to the button that's next.
  useEffect(() => {
    if (full) ctaRef.current?.focus();
  }, [full]);

  const cur = products[0]?.node.variants.edges[0]?.node.price.currencyCode ?? "GBP";
  const unit = (v: Variant) => parseFloat(v.price.amount);
  const cheapest = Math.min(
    ...products.flatMap((p) =>
      p.node.variants.edges.filter((e) => e.node.availableForSale).map((e) => unit(e.node)),
    ),
  );
  // Three of what they picked, topped up with the cheapest while picking.
  const units3 = Array.from({ length: need }, (_, i) =>
    picks[i] ? unit(picks[i].variant) : cheapest,
  );
  const fullPrice = Math.round(units3.reduce((s, u) => s + u, 0) * 100) / 100;
  const dealPrice =
    Math.round(units3.reduce((s, u) => s + u - BUNDLE_PER_UNIT_OFF_GBP, 0) * 100) / 100;
  const saving = Math.round((fullPrice - dealPrice) * 100) / 100;

  const onAddAll = async () => {
    if (!full || adding) return;
    setAdding(true);
    const done = [...inBag];
    try {
      // One add per slot; the bag merges the same colour and size into one line.
      for (let i = 0; i < need; i++) {
        if (done[i]) continue;
        const pick = picks[i];
        const ok = await addItem({
          product: pick.product,
          variantId: pick.variant.id,
          variantTitle: pick.variant.title,
          price: pick.variant.price,
          quantity: 1,
          selectedOptions: pick.variant.selectedOptions,
          attributes: [BUNDLE_POPUP_ATTRIBUTE],
        });
        if (!ok) break;
        done[i] = true;
      }
      setInBag(done);
      const count = done.filter(Boolean).length;
      if (count === need) {
        toast.success(`Your 3 are in the bag - ${display(dealPrice, cur)} at checkout`);
        onClose();
      } else {
        toast.error(
          count > 0
            ? `${count} of your 3 went in. Tap the button again to add the rest.`
            : "We couldn't add those. Please try again.",
        );
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">
          Underwear deal
        </p>
        <DialogTitle className="mt-1 pr-8 font-sans text-[24px] font-bold leading-tight tracking-normal text-[#0a0a0a]">
          Pick any 3 for {display(dealPrice, cur).replace(/\.00$/, "")}
        </DialogTitle>
        <DialogDescription className="mt-1.5 text-[13px] leading-snug text-[#555555]">
          Mix styles, colours and sizes. The saving is applied automatically at checkout.
        </DialogDescription>

        {/* Your three */}
        <p className="sr-only" aria-live="polite">
          {Math.min(picks.length, need)} of {need} picked
        </p>
        <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Your 3">
          {Array.from({ length: need }, (_, i) => {
            const p = picks[i];
            if (!p)
              return (
                <li
                  key={`empty-${i}`}
                  className="grid aspect-[4/5] place-items-center rounded-control border border-dashed border-[#cfcfcf] bg-[#fafafa] text-center"
                >
                  <span className="text-[12px] text-[#8a8a8a]">
                    <span className="block text-[20px] font-semibold text-[#c4c4c4]">{i + 1}</span>
                    Pick one
                  </span>
                </li>
              );
            const img = p.variant.image?.url ?? p.product.node.images.edges[0]?.node.url;
            return (
              <li key={`${p.variant.id}-${i}`} className="relative">
                <div className="aspect-[4/5] overflow-hidden rounded-control bg-[#f5f4f2]">
                  {img && (
                    <img
                      src={shopifyImg(img, 300)}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] leading-tight text-[#0a0a0a]">
                  {p.product.node.title}
                </p>
                <p className="truncate text-[11px] leading-tight text-[#6b6b6b]">
                  {[optionValue(p.variant, COLOUR), optionValue(p.variant, SIZE)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {inBag[i] ? (
                  <span className="absolute left-1 top-1 rounded-pill bg-[#0a0a0a] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    In bag
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => setPicks((all) => all.filter((_, j) => j !== i))}
                    aria-label={`Remove ${p.product.node.title}, ${p.variant.title}`}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-white/90 text-[#0a0a0a] shadow-sm"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ol>

        <ul className="mt-5 space-y-3 pb-2">
          {products.map((p) => (
            <PickRow
              key={p.node.id}
              product={p}
              disabled={full}
              formatPrice={(v) => display(unit(v), cur)}
              onPick={(variant) =>
                setPicks((all) => (all.length >= need ? all : [...all, { product: p, variant }]))
              }
            />
          ))}
        </ul>
      </div>

      <div className="shrink-0 border-t border-[#efefef] px-4 pb-4 pt-3">
        <p className="flex flex-wrap items-center justify-center gap-2">
          <s className="text-[15px] text-[#6b6b6b]">
            <span className="sr-only">was </span>
            {display(fullPrice, cur)}
          </s>
          <span className="text-[22px] font-bold text-[#0a0a0a]">{display(dealPrice, cur)}</span>
          <span className="rounded-pill border border-[#94E374] bg-[#DCFFD3] px-2.5 py-0.5 text-[13px] font-bold text-[#166534]">
            Save {display(saving, cur)}
          </span>
        </p>
        <button
          type="button"
          ref={ctaRef}
          onClick={onAddAll}
          disabled={!full || adding}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-pill bg-[#0a0a0a] text-[16px] font-bold text-white transition-colors hover:bg-[#262626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:bg-[#9a9a9a]"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : full ? (
            `Add my 3 - ${display(dealPrice, cur)}`
          ) : (
            `Pick ${need - picks.length} more`
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-2.5 block text-[14px] text-[#555555] underline underline-offset-2 transition-colors hover:text-[#0a0a0a]"
        >
          No thanks
        </button>
        <p className="mt-2 text-center text-[11px] text-[#8a8a8a]">
          Underwear is final sale for hygiene.
        </p>
      </div>
    </>
  );
}

/** One product: its photo in the chosen colour, colour dots, sizes, Add. */
function PickRow({
  product,
  formatPrice,
  disabled,
  onPick,
}: {
  product: ShopifyProduct;
  formatPrice: (v: Variant) => string;
  disabled: boolean;
  onPick: (v: Variant) => void;
}) {
  const node = product.node;
  const variants = node.variants.edges.map((e) => e.node);
  const colourName = node.options.find((o) => COLOUR.test(o.name))?.name;
  const sizeOpt = node.options.find((o) => SIZE.test(o.name));
  const colours = node.options.find((o) => COLOUR.test(o.name))?.values ?? [];
  const firstInStock = variants.find((v) => v.availableForSale) ?? variants[0];
  const [colour, setColour] = useState(optionValue(firstInStock, COLOUR));
  const [size, setSize] = useState<string | undefined>(undefined);
  const [askSize, setAskSize] = useState(false);
  const sizesRef = useRef<HTMLDivElement>(null);

  const variantFor = (c?: string, s?: string) =>
    variants.find(
      (v) => (!c || optionValue(v, COLOUR) === c) && (!s || !sizeOpt || optionValue(v, SIZE) === s),
    );
  const chosen = size || !sizeOpt ? variantFor(colour, size) : undefined;
  const photo = variantFor(colour)?.image?.url ?? node.images.edges[0]?.node.url;
  const images = node.images.edges.map((e) => e.node);

  /* Add stays enabled without a size (so focus never drops); it asks for
     one instead and moves focus to the first size on offer. */
  const add = () => {
    if (!chosen || !chosen.availableForSale) {
      setAskSize(true);
      sizesRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
      return;
    }
    onPick(chosen);
    setSize(undefined);
    setAskSize(false);
  };
  const shown = chosen ?? variantFor(colour) ?? firstInStock;

  return (
    <li className="flex gap-3 rounded-control border border-[#ececec] p-2.5">
      <div className="h-[92px] w-[72px] shrink-0 overflow-hidden rounded-[8px] bg-[#f5f4f2]">
        {photo && (
          <img
            src={shopifyImg(photo, 240)}
            alt=""
            className="h-full w-full object-cover object-top"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[14px] font-semibold text-[#0a0a0a]">{node.title}</p>
          <p className="shrink-0 text-[13px] text-[#6b6b6b]">{formatPrice(shown)}</p>
        </div>
        {colourName && colours.length > 1 && (
          <div
            className="mt-1.5 flex flex-wrap gap-1.5"
            role="group"
            aria-label={`${node.title} colour`}
          >
            {colours.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                aria-label={c}
                aria-pressed={c === colour}
                onClick={() => {
                  setColour(c);
                  setSize(undefined);
                }}
                className={`h-6 w-6 rounded-full border-2 p-[2px] transition ${
                  c === colour ? "border-[#0a0a0a]" : "border-transparent hover:border-[#bbbbbb]"
                }`}
              >
                <span
                  className="block h-full w-full rounded-full border border-[#0a0a0a]/10 bg-cover"
                  style={colourSwatchStyle(node, colourName, c, images)}
                />
              </button>
            ))}
          </div>
        )}
        <div ref={sizesRef} className="mt-2 flex flex-wrap items-center gap-1.5">
          {sizeOpt?.values.map((s) => {
            const v = variantFor(colour, s);
            const ok = !!v?.availableForSale;
            return (
              <button
                key={s}
                type="button"
                disabled={!ok}
                aria-pressed={s === size}
                onClick={() => {
                  setSize(s);
                  setAskSize(false);
                }}
                className={`h-8 min-w-8 rounded-control border px-1.5 text-[12px] transition ${
                  s === size
                    ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                    : ok
                      ? "border-[#e2e2e2] text-[#0a0a0a] hover:border-[#0a0a0a]"
                      : "cursor-not-allowed border-[#eeeeee] text-[#c4c4c4] line-through"
                }`}
              >
                {s}
              </button>
            );
          })}
          <button
            type="button"
            onClick={add}
            disabled={disabled}
            aria-disabled={!chosen?.availableForSale || undefined}
            aria-label={`Add ${node.title}${colour ? `, ${colour}` : ""}${size ? `, ${size}` : ""} to your 3`}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-pill border border-[#0a0a0a] px-3 text-[12px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white disabled:border-[#d6d6d6] disabled:text-[#b5b5b5] disabled:hover:bg-transparent"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add
          </button>
        </div>
        {askSize && !disabled && (
          <p className="mt-1.5 text-[12px] text-[#9b2c2c]" role="status">
            Choose a size first
          </p>
        )}
      </div>
    </li>
  );
}
