import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fetchProductsByHandles, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { BF_HANDLES, BF_TIERS, bfTotal } from "@/lib/blackFriday";
import { useDisplayPrice } from "@/lib/preferences";
import { useQuickAdd } from "@/stores/quickAddStore";

/*
 * v233 (owner, 9 Nov 2026): "add another bodysuit" - the other bodysuits in a
 * row under Add to bag, each one tap from the quick-add sheet (colour and
 * size there), after HeyShape's "Buy more & save more!". On the 8 bodysuit
 * pages only (lib/blackFriday BF_HANDLES).
 *
 * While Black Friday runs, any bodysuits count together - 30% off two, 40%
 * off three or more - so the row says that, and each bodysuit shows its Black
 * Friday price for one struck against today's price (never the compare-at),
 * as on its own page. The rest of the year it offers the 2+ free delivery,
 * with prices as the product cards show them. Cheapest first: the easiest
 * second piece. Sold-out bodysuits are left out; the row reserves its height
 * while loading, so nothing below it jumps.
 */

type Variant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];

function shownVariant(p: ShopifyProduct): Variant | undefined {
  const edges = p.node.variants.edges;
  return edges.find((v) => v.node.availableForSale)?.node ?? edges[0]?.node;
}

export function BodysuitMixRow({
  handle,
  blackFriday,
  freeFromTwo,
}: {
  /** This page's bodysuit, left out of the row. */
  handle: string;
  /** Black Friday runs now (lib/blackFriday). */
  blackFriday: boolean;
  /** Delivery is free on 2+ items where the shopper is (lib/freeDelivery). */
  freeFromTwo: boolean;
}) {
  const others = BF_HANDLES.filter((h) => h !== handle);
  const { data, isPending } = useQuery({
    queryKey: ["bodysuit-mix", others],
    queryFn: () => fetchProductsByHandles(others),
    staleTime: 5 * 60 * 1000,
  });
  const display = useDisplayPrice();
  const openQuickAdd = useQuickAdd((s) => s.openFor);

  const items = (data ?? [])
    .filter((p) => p.node.variants.edges.some((v) => v.node.availableForSale))
    .sort((a, b) => parseFloat(shownVariant(a)?.price.amount ?? "0") - parseFloat(shownVariant(b)?.price.amount ?? "0"));
  if (!isPending && items.length === 0) return null;

  const headingId = `bodysuit-mix-${handle}`;
  return (
    <section aria-labelledby={headingId} className="mt-8">
      <h2 id={headingId} className="font-sans text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
        {blackFriday ? "Mix any bodysuits" : "Add another bodysuit"}
      </h2>
      {(blackFriday || freeFromTwo) && (
        <p className="mt-1 text-[12px] text-[#555555]">
          {blackFriday
            ? `${BF_TIERS[1].percent}% off 2 · ${BF_TIERS[2].percent}% off 3 or more, taken off in your bag`
            : "Free delivery on 2+ items (excludes underwear)"}
        </p>
      )}
      {/* relative: the screen-reader-only price labels are absolutely placed,
          and without a positioned scroller they stretched the whole page
          sideways on phones (to 956px wide - the page zoomed out).
          scroll-pl-5: cards snap to the page's 20px margin, not the screen edge. */}
      <div className="no-scrollbar relative -mx-5 mt-4 flex snap-x snap-mandatory scroll-pl-5 gap-3 overflow-x-auto px-5 pb-1 lg:mx-0 lg:scroll-pl-0 lg:px-0">
        {isPending
          ? [0, 1, 2].map((i) => (
              <div key={i} aria-hidden="true" className="w-[136px] shrink-0">
                <div className="aspect-[3/4] w-full animate-pulse rounded-[10px] bg-[#f2f2f2]" />
                <div className="mt-2 h-[34px] w-full animate-pulse rounded bg-[#f2f2f2]" />
                <div className="mt-1 h-[18px] w-1/2 animate-pulse rounded bg-[#f2f2f2]" />
                <div className="mt-2 h-9 w-full animate-pulse rounded-control bg-[#f2f2f2]" />
              </div>
            ))
          : items.map((p) => {
              const n = p.node;
              const v = shownVariant(p);
              const price = v?.price ?? n.priceRange.minVariantPrice;
              const amount = parseFloat(price.amount);
              const compare = v?.compareAtPrice;
              const onSale = !blackFriday && !!compare && parseFloat(compare.amount) > amount;
              const img = n.images.edges[0]?.node;
              return (
                <div key={n.id} className="flex w-[136px] shrink-0 snap-start flex-col">
                  {/* The picture opens the same sheet; the Add button below is
                      the one keyboards and screen readers get. */}
                  <button
                    type="button"
                    onClick={() => openQuickAdd(p)}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="block aspect-[3/4] w-full overflow-hidden rounded-[10px] bg-[#f5f5f5]"
                  >
                    {img && (
                      <img
                        src={shopifyImg(img.url, 360)}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                  <p className="mt-2 line-clamp-2 min-h-[34px] text-[12px] leading-[17px] text-[#0a0a0a]">{n.title}</p>
                  <p className="mt-1 text-[13px] font-semibold leading-[18px] text-[#0a0a0a]">
                    {blackFriday ? (
                      <>
                        <span className="sr-only">Black Friday price </span>
                        {display(bfTotal([amount], BF_TIERS[0].percent), price.currencyCode)}
                        <span className="ml-1.5 text-[11px] font-normal text-[#6b6b6b] line-through">
                          <span className="sr-only">Today's price </span>
                          {display(price.amount, price.currencyCode)}
                        </span>
                      </>
                    ) : (
                      <>
                        {display(price.amount, price.currencyCode)}
                        {onSale && compare && (
                          <span className="ml-1.5 text-[11px] font-normal text-[#6b6b6b] line-through">
                            <span className="sr-only">Was </span>
                            {display(compare.amount, compare.currencyCode)}
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => openQuickAdd(p)}
                    aria-label={`Add ${n.title}: choose colour and size`}
                    className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control border border-[#0a0a0a] text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    Add
                  </button>
                </div>
              );
            })}
      </div>
    </section>
  );
}
