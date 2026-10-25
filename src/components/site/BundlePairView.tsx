import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { StarRow } from "@/components/site/RatingBadge";
import { SizeGuide } from "@/components/site/SizeGuide";
import { fetchProductByHandle, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { galleryUrls } from "@/lib/galleryIndex";
import { useCatalogTables } from "@/lib/catalogTables";
import { backdropCss, cachedBackdrop, sampleBackdrop, type Backdrop } from "@/lib/imageBackdrop";
import { buildColorImageMap } from "@/lib/colorImages";
import { colourSwatchStyle } from "@/lib/swatch";
import { sizeLabel } from "@/lib/sizeLabels";
import { resolveGuide } from "@/lib/sizeGuides";
import { chartForHandle, isGuideHidden } from "@/lib/productSizeCharts";
import { useJudgemeReviews } from "@/lib/judgeme";
import { useDisplayPrice, usePreferences } from "@/lib/preferences";
import { bundleUnitOffGBP } from "@/lib/bundleDeal";
import { fitNote, introText } from "@/lib/productStory";
import { bundleCanBuy, bundleVariant, type BundlePick } from "@/lib/bundlePicks";

/*
 * Quick view of one pair in a mixed underwear bundle (v179, owner's brief
 * 13 Oct 2026): tap "View details" on a pair card (phones) or click its
 * picture (computers) and this opens over the page - that style in that
 * colour on the model, its stars, the pair's bundle price, and the pair's
 * colour and size, which can be changed here. A bottom sheet on phones, a
 * centred two-column popup from md up.
 *
 * - Photos: the colour's hand-indexed model shots first, then its garment
 *   shots (galleryIndex), so it is always the exact colour, on the model.
 * - Stars: the style's own Judge.me average, never the review count (owner's
 *   ask), and nothing at all while a style has no reviews - no stars are
 *   ever shown that customers didn't give.
 * - Price: the pair's share of the bundle (£10 / £9) struck against its
 *   single price only; outside GBP the bag shows Shopify's figure instead.
 * - Nothing here links away: leaving the page would lose the bundle.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The pair's style as the builder has it (bag data, 6 photos) - shown
   *  until the full product, with every photo, has loaded. */
  style: ShopifyProduct | undefined;
  pick: BundlePick | undefined;
  /** 0-based position of the pair in the bundle. */
  index: number;
  pairs: number;
  /** The page's size, which a pair follows unless it has its own. */
  size: string | undefined;
  /** Whether bundle prices can be shown (market and display currency GBP). */
  priced: boolean;
  onSave: (pick: BundlePick) => void;
  onRemove: () => void;
  /** Runs once the popup has closed after "Remove pair N", to announce it. */
  onAfterRemove: () => void;
}

export function BundlePairView({
  open,
  onOpenChange,
  style,
  pick,
  index,
  onAfterRemove,
  ...rest
}: Props) {
  useCatalogTables(); // v205: other styles' rows come with the full tables
  /* On close, focus goes back to the pair's picture (data-pair-view, in
     BundleMixer) - Radix only does that for its own Dialog.Trigger. If the
     pair was removed its card is gone, so the bundle heading takes it. */
  const removed = useRef(false);
  return (
    <Dialog open={open && !!pick} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[80] bg-[#0a0a0a]/35 backdrop-blur-[8px] motion-reduce:animate-none" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => {
            removed.current = false;
          }}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const back = removed.current
              ? document.getElementById("bundle-heading")
              : document.querySelector<HTMLElement>(`[data-pair-view="${index}"]`);
            back?.focus({ preventScroll: true });
            // Said now: while the popup was open the page was hidden from
            // screen readers, so the bundle's own live line went unheard.
            if (removed.current) onAfterRemove();
          }}
          className="fixed inset-x-0 bottom-0 z-[80] flex max-h-[92dvh] flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.18)] duration-300 focus:outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:grid md:h-[min(640px,88dvh)] md:max-h-none md:w-[min(880px,calc(100%-48px))] md:-translate-x-1/2 md:-translate-y-1/2 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto] md:overflow-hidden md:rounded-card md:shadow-lg md:duration-200 md:data-[state=closed]:fade-out-0 md:data-[state=closed]:zoom-out-95 md:data-[state=closed]:slide-out-to-bottom-0 md:data-[state=open]:fade-in-0 md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-bottom-0 motion-reduce:animate-none"
        >
          {pick && (
            <PairViewBody
              // A different pair (or a changed one) starts fresh.
              key={`${index}|${pick.handle}|${pick.colour}|${pick.size ?? ""}`}
              style={style}
              pick={pick}
              index={index}
              {...rest}
              onClose={() => onOpenChange(false)}
              onRemoved={() => {
                removed.current = true;
              }}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

function PairViewBody({
  style,
  pick,
  index,
  pairs,
  size: pageSize,
  priced,
  onSave,
  onRemove,
  onClose,
  onRemoved,
}: Omit<Props, "open" | "onOpenChange" | "pick" | "onAfterRemove"> & {
  pick: BundlePick;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const { data: full, isError } = useQuery({
    queryKey: ["product", pick.handle],
    queryFn: () => fetchProductByHandle(pick.handle),
    staleTime: 5 * 60_000,
  });
  const product = full ?? style;
  /* Where the photos come from: the full product (every photo). If that
     can't load, the builder's copy rather than a spinner that never ends. */
  const photoSource = full ?? (isError || full === null ? style : undefined);
  const { data: reviews } = useJudgemeReviews(pick.handle);
  const displayPrice = useDisplayPrice();
  const sizeRegion = usePreferences((s) => s.sizeRegion);

  const [colour, setColour] = useState(pick.colour);
  const [size, setSize] = useState<string | undefined>(pick.size ?? pageSize);
  const [sizeTouched, setSizeTouched] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const node = product?.node;
  const allImages = useMemo(() => node?.images.edges.map((e) => e.node) ?? [], [node]);
  /* The colour's model shots, then its garment shots. Waits for the full
     product: the builder's copy has 6 photos, which would show a partial
     (or another colour's) set for a moment. */
  const photos = useMemo(() => {
    if (!photoSource) return [];
    const n = photoSource.node;
    const imgs = n.images.edges.map((e) => e.node);
    const indexed = galleryUrls(n.handle, colour, imgs);
    if (indexed && indexed.length) return indexed;
    const set = buildColorImageMap(n).get(colour);
    return set && set.length ? set.map((s) => s.node) : imgs;
  }, [photoSource, colour]);

  if (!product || !node) {
    return (
      <div className="grid h-64 place-items-center md:col-span-2 md:row-span-2 md:h-full">
        <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />
      </div>
    );
  }

  const colorOption = node.options.find((o) => /colou?r/i.test(o.name));
  const sizeOption = node.options.find((o) => /size/i.test(o.name));
  const guide = resolveGuide(node.title);
  const productChart = chartForHandle(node.handle);
  const showGuide =
    !isGuideHidden(node.handle) && (productChart != null || guide.guideType !== "none");

  const variant = bundleVariant(product, colour, size) ?? bundleVariant(product, colour);
  const unit = variant ? parseFloat(variant.price.amount) : NaN;
  const priceCurrency = variant?.price.currencyCode ?? "GBP";
  const money = (n: number) => displayPrice(n, priceCurrency).replace(/\.00$/, "");
  const each =
    priced && pairs > 1 && isFinite(unit)
      ? Math.round((unit - bundleUnitOffGBP(pairs)) * 100) / 100
      : null;

  const average = reviews && reviews.count > 0 ? reviews.average : 0;
  // Same rounding as the product page's RatingBadge, so both show one figure.
  const rating = (Math.round(average * 10) / 10).toFixed(1);

  const soldOut = !!size && !bundleCanBuy(product, colour, size);
  const changed = colour !== pick.colour || (sizeTouched && size !== (pick.size ?? pageSize));
  const intro = introText(node.descriptionHtml)[0];
  const fit = fitNote(node.descriptionHtml);
  const n = index + 1;

  const save = () => {
    if (changed) onSave({ handle: pick.handle, colour, size: sizeTouched ? size : pick.size });
    onClose();
  };

  return (
    <>
      {/* Close sits first so it takes the opening focus, not a photo arrow. */}
      <DialogPrimitive.Close className="absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#0a0a0a] shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]">
        <X className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>

      {/* Photos and details scroll together on phones, under a close button
          and actions that stay put; from md up this wrapper steps aside
          (display: contents) so both sit in the popup's two columns. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain md:contents">
        <Gallery
          photos={photos}
          alt={`${node.title} in ${colour}, on the model`}
          className="shrink-0 md:row-span-2 md:h-full"
        />

        {/* Details */}
        <div className="px-5 pb-5 pt-5 md:min-h-0 md:overflow-y-auto md:px-7 md:pt-7">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b]">
            Pair {n} of {pairs} · Your bundle
          </p>
          <DialogPrimitive.Title className="mt-1.5 pr-10 text-[18px] font-semibold uppercase leading-snug tracking-[0.06em] text-[#0a0a0a]">
            {node.title}
          </DialogPrimitive.Title>

          {average > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-[#0a0a0a]">
              <StarRow rating={average} />
              <span aria-hidden="true">{rating}/5</span>
              <span className="sr-only">Rated {rating} out of 5</span>
            </p>
          )}

          {isFinite(unit) && (
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {each != null ? (
                <>
                  <span className="text-[22px] font-semibold leading-none text-[#166534]">
                    {money(each)}
                  </span>
                  <s className="text-[14px] text-[#6b6b6b]">
                    <span className="sr-only">instead of </span>
                    {money(unit)}
                  </s>
                  <span className="basis-full text-[12px] text-[#555555]">
                    a pair in your {pairs}-pair bundle
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[20px] font-semibold leading-none text-[#0a0a0a]">
                    {money(unit)}
                  </span>
                  {pairs > 1 && (
                    <span className="text-[12px] text-[#555555]">
                      Bundle price shown in your bag
                    </span>
                  )}
                </>
              )}
            </p>
          )}

          {colorOption && colorOption.values.length > 1 && (
            <div className="mt-6">
              <p
                id={`pv-colour-${n}`}
                className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]"
              >
                Colour
                <span className="ml-2 font-normal normal-case tracking-normal text-[#6b6b6b]">
                  {colour}
                </span>
              </p>
              <div
                role="group"
                aria-labelledby={`pv-colour-${n}`}
                className="mt-2.5 flex flex-wrap gap-2"
              >
                {colorOption.values.map((c) => {
                  const active = c === colour;
                  const ok = bundleCanBuy(product, c, size);
                  return (
                    <button
                      key={c}
                      type="button"
                      disabled={!ok}
                      onClick={() => setColour(c)}
                      aria-label={`${c}${ok ? "" : size ? `, sold out in ${size}` : ", sold out"}`}
                      aria-pressed={active}
                      title={c}
                      className={`h-[28px] w-[28px] rounded-full border bg-cover transition-all disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] ${
                        active
                          ? "border-[#0a0a0a] ring-1 ring-[#0a0a0a] ring-offset-1"
                          : "border-[#0a0a0a]/15 hover:border-[#0a0a0a]/50"
                      }`}
                      style={colourSwatchStyle(node, colorOption.name, c, allImages)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {sizeOption && sizeOption.values.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p
                  id={`pv-size-${n}`}
                  className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]"
                >
                  Size
                  {!size && (
                    <span className="ml-2 font-normal normal-case tracking-normal text-[#6b6b6b]">
                      choose one
                    </span>
                  )}
                </p>
                {showGuide && (
                  <button
                    type="button"
                    onClick={() => setGuideOpen(true)}
                    className="text-[12px] font-semibold text-[#0a0a0a] underline underline-offset-4 transition-opacity hover:opacity-60"
                  >
                    Size Guide
                  </button>
                )}
              </div>
              <div
                role="group"
                aria-labelledby={`pv-size-${n}`}
                className="mt-2.5 grid grid-cols-4 gap-1.5"
              >
                {sizeOption.values.map((s) => {
                  const active = s === size;
                  const ok = bundleCanBuy(product, colour, s);
                  const regional = sizeLabel(node.handle, s, sizeRegion, guide.guideType);
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={!ok}
                      aria-pressed={active}
                      onClick={() => {
                        setSize(s);
                        setSizeTouched(true);
                      }}
                      className={`flex h-10 flex-col items-center justify-center whitespace-nowrap rounded-control border px-0.5 text-[12px] leading-tight transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a0a0a] ${
                        active
                          ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                          : ok
                            ? "border-[#DDDDDD] text-[#0a0a0a] hover:border-[#0a0a0a]"
                            : "cursor-not-allowed border-[#EEEEEE] text-[#C4C4C4] line-through"
                      }`}
                    >
                      {s}
                      {regional && <span className="text-[9px] opacity-75">{regional}</span>}
                      {!ok && <span className="sr-only">, sold out in {colour}</span>}
                    </button>
                  );
                })}
              </div>
              {soldOut && (
                <p role="alert" className="mt-2 text-[11px] text-[#b00020]">
                  {colour} is sold out in {size}. Choose another colour or size.
                </p>
              )}
            </div>
          )}

          {(intro || fit) && (
            <div className="mt-6 space-y-2 border-t border-[#EBEBEB] pt-5 text-[12px] leading-relaxed text-[#555555]">
              {intro && <p className="line-clamp-3">{intro}</p>}
              {fit && (
                <p className="line-clamp-2">
                  <span className="font-semibold text-[#0a0a0a]">{fit.heading}: </span>
                  {fit.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions: pinned to the bottom of the sheet on phones, under the
          details column from md up. */}
      <div className="shrink-0 border-t border-[#EBEBEB] bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 md:col-start-2 md:px-7 md:pb-6 md:pt-4">
        <button
          type="button"
          onClick={save}
          disabled={changed && soldOut}
          className="flex h-12 w-full items-center justify-center rounded-control bg-cta text-[12px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-cta-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {changed ? `Update pair ${n}` : "Done"}
        </button>
        <button
          type="button"
          onClick={() => {
            onRemoved();
            onRemove();
            onClose();
          }}
          className="mx-auto mt-1 flex min-h-11 w-fit items-center px-3 text-[11px] uppercase tracking-[0.14em] text-[#555555] underline underline-offset-4 transition-colors hover:text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-[#0a0a0a]"
        >
          Remove pair {n} from bundle
        </button>
      </div>

      {showGuide && (
        <SizeGuide
          open={guideOpen}
          onOpenChange={setGuideOpen}
          guideType={guide.guideType}
          fitOverride={guide.fitOverride}
          productChart={productChart}
          handle={node.handle}
          stacked
        />
      )}
    </>
  );
}

/** Swipeable photos, with arrows wherever there's a mouse, starting on the
 *  first model shot. */
function Gallery({
  photos,
  alt,
  className,
}: {
  photos: Array<{ url: string; altText: string | null }>;
  alt: string;
  className: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const key = photos.map((p) => p.url).join("|");
  // A new colour starts on its first photo.
  useEffect(() => {
    scroller.current?.scrollTo({ left: 0 });
    setIdx(0);
  }, [key]);
  /* Each photo's own backdrop colour, measured off the image when the table
     doesn't have it (the product page does the same), so a contained shot
     sits on a matching ground with no visible edge. Client-only: this popup
     only ever opens from a click. */
  const [sampled, setSampled] = useState<Record<string, Backdrop>>({});
  useEffect(() => {
    let live = true;
    for (const url of key.split("|").filter(Boolean)) {
      if (cachedBackdrop(url)) continue;
      void sampleBackdrop(url).then((b) => {
        if (live) setSampled((s) => ({ ...s, [url]: b }));
      });
    }
    return () => {
      live = false;
    };
  }, [key]);
  const ground = (url: string | undefined) =>
    backdropCss(url ? (cachedBackdrop(url) ?? sampled[url]) : undefined);

  const go = (i: number) => {
    const el = scroller.current;
    if (!el) return;
    const next = (i + photos.length) % photos.length;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: still ? "auto" : "smooth" });
  };

  return (
    <div
      className={`relative aspect-[4/5] max-h-[56dvh] w-full overflow-hidden md:aspect-auto md:max-h-none ${className}`}
      style={{ background: ground(photos[idx]?.url ?? photos[0]?.url) }}
    >
      {photos.length === 0 ? (
        <div className="grid h-full place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-[#888888]" />
        </div>
      ) : (
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Whole photo, never cropped (the catalogue mixes 2:3, 3:4 and
              square shots), on its own measured backdrop so the edges of a
              contained shot don't show - as the product page does. */}
          {photos.map((p, i) => (
            <div
              key={p.url}
              className="h-full w-full shrink-0 snap-center"
              style={{ background: ground(p.url) }}
            >
              <img
                src={shopifyImg(p.url, 1100)}
                alt={i === 0 ? alt : ""}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className="h-full w-full object-contain object-center"
              />
            </div>
          ))}
        </div>
      )}

      {photos.length > 1 && (
        <>
          {/* Arrows by input, not width: a zoomed or narrow desktop window
              still has them; touch screens swipe instead. */}
          <button
            type="button"
            onClick={() => go(idx - 1)}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0a0a0a] shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[#0a0a0a] pointer-coarse:hidden"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(idx + 1)}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0a0a0a] shadow-[0_1px_4px_rgba(0,0,0,0.18)] transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[#0a0a0a] pointer-coarse:hidden"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <p aria-live="polite" className="sr-only">
            Photo {idx + 1} of {photos.length}
          </p>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5"
          >
            {photos.map((p, i) => (
              <span
                key={p.url}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? "w-4 bg-[#0a0a0a]" : "w-1.5 bg-[#0a0a0a]/30"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
