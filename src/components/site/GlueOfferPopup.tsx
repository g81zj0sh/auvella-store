import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CircleCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { StarRow } from "@/components/site/RatingBadge";
import { useCartStore } from "@/stores/cartStore";
import { useDisplayPrice } from "@/lib/preferences";
import { fetchJudgemeData, useJudgemeReviews } from "@/lib/judgeme";
import { fetchProductByHandle, shopifyImg } from "@/lib/shopify";
import {
  BAG_ADD_EVENT,
  GLUE_CLAIMS,
  GLUE_HANDLE,
  GLUE_PAIRS,
  GLUE_POPUP_ATTRIBUTE,
  glueOfferSeen,
  markGlueOfferSeen,
} from "@/lib/glueOffer";

/*
 * Body Adhesive add-on popup (v163), opened by the first add of a piece in
 * GLUE_PAIRS (see lib/glueOffer.ts for the rules). Layout after the owner's
 * reference: photo, rating, "This glue was made for your …", price with the
 * saving, three ticks, the add button and a way out to checkout.
 *
 * - Price and "Save N%" come from the glue's own price and compare-at price,
 *   so they always match the product page and the bag.
 * - The stars only show once the real Judge.me average is 4.0 or more, and
 *   then show that real figure (owner's choice, 11 Oct 2026).
 * - Shoppers pick the type; Standard is preselected.
 * - It opens only once the glue has loaded and has a type in stock, so it
 *   never shows a spinner or a dead button; Buy now adds are quiet (see
 *   cartStore.addItem) because those shoppers are already off to checkout.
 * - It sits above the cookie banner (z-[80] vs z-[70]); the banner's taps
 *   would otherwise fall through onto the popup's buttons.
 */
const RATING_FLOOR = 4;

export function GlueOfferPopup() {
  const queryClient = useQueryClient();
  /* The noun outlives `open` so the content stays put during the close
     animation instead of collapsing to an empty card. */
  const [noun, setNoun] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const checking = useRef(false);

  useEffect(() => {
    const onAdd = async (e: Event) => {
      const handle = (e as CustomEvent<{ handle: string }>).detail?.handle;
      const forNoun = handle ? GLUE_PAIRS[handle] : undefined;
      // A multi-buy add fires once per line: handle only the first.
      if (!forNoun || checking.current) return;
      const { items, cartId } = useCartStore.getState();
      if (glueOfferSeen(cartId)) return;
      // Glue already in the bag, or another listed piece was in it before
      // this one (an older or rebuilt bag): they've had their chance.
      if (
        items.some(
          (i) =>
            i.product.node.handle === GLUE_HANDLE ||
            (i.product.node.handle !== handle && GLUE_PAIRS[i.product.node.handle]),
        )
      ) {
        markGlueOfferSeen(cartId);
        return;
      }
      checking.current = true;
      try {
        void queryClient.prefetchQuery({
          queryKey: ["judgeme-reviews", GLUE_HANDLE],
          queryFn: () => fetchJudgemeData(GLUE_HANDLE),
          staleTime: 5 * 60_000,
        });
        const glue = await queryClient.fetchQuery({
          queryKey: ["product", GLUE_HANDLE],
          queryFn: () => fetchProductByHandle(GLUE_HANDLE),
          staleTime: 5 * 60_000,
        });
        // Nothing to offer: say nothing, and keep the chance for later.
        if (!glue?.node.variants.edges.some((v) => v.node.availableForSale)) return;
        const now = useCartStore.getState().cartId;
        if (glueOfferSeen(now)) return;
        markGlueOfferSeen(now);
        setNoun(forNoun);
        setOpen(true);
      } catch {
        /* glue lookup failed: no popup */
      } finally {
        checking.current = false;
      }
    };
    window.addEventListener(BAG_ADD_EVENT, onAdd);
    return () => window.removeEventListener(BAG_ADD_EVENT, onAdd);
  }, [queryClient]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="z-[80]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[80] max-h-[92dvh] w-[calc(100%-32px)] max-w-[400px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-card bg-white p-4 shadow-lg duration-200 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          {noun && <GlueOfferBody noun={noun} onClose={() => setOpen(false)} />}
          <DialogPrimitive.Close className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-[#0a0a0a] shadow-sm transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]">
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function GlueOfferBody({ noun, onClose }: { noun: string; onClose: () => void }) {
  const { data: glue } = useQuery({
    queryKey: ["product", GLUE_HANDLE],
    queryFn: () => fetchProductByHandle(GLUE_HANDLE),
    staleTime: 5 * 60_000,
  });
  const { data: reviews } = useJudgemeReviews(GLUE_HANDLE);
  const addItem = useCartStore((s) => s.addItem);
  const resolveCheckoutUrl = useCartStore((s) => s.resolveCheckoutUrl);
  const getCheckoutUrl = useCartStore((s) => s.getCheckoutUrl);
  const display = useDisplayPrice();

  const variants = glue?.node.variants.edges.map((e) => e.node) ?? [];
  const [variantId, setVariantId] = useState<string | null>(null);
  const variant =
    variants.find((v) => v.id === variantId) ??
    variants.find((v) => v.availableForSale) ??
    variants[0];
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const image = variant?.image?.url ?? glue?.node.images.edges[0]?.node.url;
  const price = variant ? parseFloat(variant.price.amount) : 0;
  const compare = variant?.compareAtPrice ? parseFloat(variant.compareAtPrice.amount) : 0;
  const savePct =
    compare > price && price > 0 ? Math.floor(((compare - price) / compare) * 100) : 0;
  const average = reviews?.average ?? 0;
  // Same rounding as the product page's RatingBadge, so both show one figure.
  const rating = (Math.round(average * 10) / 10).toFixed(1);

  const onAdd = async () => {
    if (!glue || !variant || adding) return;
    setAdding(true);
    try {
      const ok = await addItem({
        product: glue,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        quantity: 1,
        selectedOptions: variant.selectedOptions,
        attributes: [GLUE_POPUP_ATTRIBUTE],
      });
      if (ok) {
        toast.success("Body Adhesive added to your bag");
        onClose();
      } else {
        toast.error("That didn't go through. Please try again.");
      }
    } finally {
      setAdding(false);
    }
  };

  // Same as the bag's checkout button: open the tab inside the tap (mobile
  // Safari blocks it after an await), then point it at a live checkout URL.
  const onCheckout = async () => {
    if (leaving) return;
    setLeaving(true);
    const win = window.open("", "_blank");
    try {
      const url = (await resolveCheckoutUrl()) ?? getCheckoutUrl();
      if (!url) {
        win?.close();
        return;
      }
      if (win) win.location.href = url;
      else window.location.href = url;
      onClose();
    } catch {
      win?.close();
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div>
      <div className="h-[180px] w-full overflow-hidden rounded-control bg-white sm:h-[240px]">
        {image ? (
          <img
            src={shopifyImg(image, 800)}
            alt={glue?.node.title ?? "Body Adhesive"}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />
          </div>
        )}
      </div>

      {average >= RATING_FLOOR && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#0a0a0a]">
          <StarRow rating={average} />
          <span aria-hidden="true">({rating}/5)</span>
          <span className="sr-only">Rated {rating} out of 5</span>
        </p>
      )}

      <DialogTitle className="mt-2 text-[19px] font-semibold leading-snug tracking-normal text-[#0a0a0a]">
        This glue was made for your {noun}
      </DialogTitle>

      {variant && (
        <p className="mt-2 flex items-center gap-2">
          {savePct > 0 && (
            <s className="text-[14px] text-[#6b6b6b]">
              <span className="sr-only">was </span>
              {display(compare, variant.price.currencyCode)}
            </s>
          )}
          <span className="text-[20px] font-semibold text-[#0a0a0a]">
            {display(price, variant.price.currencyCode)}
          </span>
          {savePct > 0 && (
            <span className="rounded-pill border border-[#94E374] bg-[#DCFFD3] px-2.5 py-0.5 text-[12px] font-semibold text-[#166534]">
              Save {savePct}%
            </span>
          )}
        </p>
      )}

      <DialogDescription asChild>
        <ul className="mt-3 space-y-2">
          {GLUE_CLAIMS.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[13px] leading-snug text-[#0a0a0a]">
              <CircleCheck
                aria-hidden="true"
                className="mt-px h-4 w-4 shrink-0 fill-[#0a0a0a] text-white"
                strokeWidth={2}
              />
              {c}
            </li>
          ))}
        </ul>
      </DialogDescription>

      {variants.length > 1 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
            Type
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {variants.map((v) => {
              const active = v.id === variant?.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={active}
                  disabled={!v.availableForSale}
                  onClick={() => setVariantId(v.id)}
                  className={`h-9 rounded-control border px-2 text-[11px] uppercase tracking-[0.06em] transition ${
                    active
                      ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                      : v.availableForSale
                        ? "border-[#EBEBEB] text-[#0a0a0a] hover:border-[#0a0a0a]"
                        : "cursor-not-allowed border-[#EBEBEB] text-[#c4c4c4] line-through"
                  }`}
                >
                  {v.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onAdd}
        disabled={!variant || !variant.availableForSale || adding}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-pill bg-[#0a0a0a] text-[15px] font-semibold text-white transition-colors hover:bg-[#262626] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:opacity-60"
      >
        {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add to order with discount"}
      </button>
      <button
        type="button"
        onClick={onCheckout}
        disabled={leaving}
        className="mx-auto mt-3 block text-[13px] text-[#555555] underline underline-offset-2 transition-colors hover:text-[#0a0a0a] disabled:opacity-60"
      >
        No thanks, continue to checkout
      </button>
    </div>
  );
}
