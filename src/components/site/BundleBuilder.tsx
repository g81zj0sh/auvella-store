import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { fetchProductByHandle, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { indexedGhost } from "@/lib/galleryIndex";
import { useCatalogTables } from "@/lib/catalogTables";
import { backdropCss, tableBackdrop } from "@/lib/imageBackdrop";
import { BUNDLE_TIERS } from "@/lib/bundleDeal";
import { fetchJudgemeData } from "@/lib/judgeme";
import {
  bundleCanBuy as canBuy,
  bundleStyleName as styleName,
  bundleVariant,
  type BundlePick,
} from "@/lib/bundlePicks";
import { BundlePairView } from "@/components/site/BundlePairView";

/*
 * The underwear "Bundle & save" builder (v177), after Step One's flow
 * (stepone.life, sent by the owner 13 Oct 2026): pick how many pairs, then
 * either one colour for every pair or mix styles and colours - tap a colour
 * to drop it into the next pair, watch the bundle fill, change any pair's
 * size or take it out. The product page owns the state and the bag; these
 * only draw it.
 *
 * Prices are what the two Shopify rules charge (lib/bundleDeal.ts), struck
 * only against the single price, never the compare-at. Nothing here counts
 * down or claims popularity.
 *
 * v179: each pair's picture opens a quick view of that pair (BundlePairView):
 * phones get a small "View details" label on the picture, computers just
 * click it (owner's brief, 13 Oct 2026).
 */

export type BundleMode = "one" | "mix";

/** Garment shot of a style in a colour: it reads better than a model at thumbnail size. */
function thumbFor(p: ShopifyProduct, colour: string): string | undefined {
  const imgs = p.node.images.edges.map((e) => e.node);
  return (
    indexedGhost(p.node.handle, colour, imgs) ??
    bundleVariant(p, colour)?.image?.url ??
    imgs[0]?.url
  );
}

function Thumb({ url, className }: { url: string | undefined; className: string }) {
  return (
    <span
      className={`block overflow-hidden rounded-[8px] ${className}`}
      style={{ background: backdropCss(tableBackdrop(url)) }}
    >
      {url && (
        <img
          src={shopifyImg(url, 240)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain"
        />
      )}
    </span>
  );
}

/** 1 / 3 / 5 pairs, each with its per-pair price. */
export function BundleTiles({
  name,
  value,
  onChange,
  price,
}: {
  /** Radio group name, unique on the page. */
  name: string;
  value: number;
  onChange: (pairs: number) => void;
  /** Per-pair price, the pack total and the single-price total it beats.
   *  perPair null = not priced here (outside GBP): the bag shows it. */
  price: (pairs: number) => { perPair: string | null; total: string | null; full: string | null };
}) {
  return (
    <fieldset className="mt-7">
      <legend className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a]">
        Bundle &amp; save
      </legend>
      {/* pt-2.5 leaves room for the badges across the tiles' top edge. */}
      <div className="mt-3 grid grid-cols-3 gap-2 pt-2.5">
        {BUNDLE_TIERS.map((t) => {
          const active = value === t.pairs;
          const { perPair, total, full } = price(t.pairs);
          const id = `${name}-${t.pairs}`;
          return (
            <label
              key={t.pairs}
              htmlFor={id}
              className={`relative flex cursor-pointer flex-col items-center rounded-[12px] border-2 px-1.5 pb-3 pt-4 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#0a0a0a] ${
                active
                  ? "border-[#0a0a0a] bg-[#f0ede8]"
                  : "border-[#c9c9c9] bg-white hover:border-[#0a0a0a]"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={t.pairs}
                checked={active}
                onChange={() => onChange(t.pairs)}
                className="sr-only"
              />
              {t.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-[#0a0a0a] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-white">
                  {t.badge}
                </span>
              )}
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#0a0a0a]">
                {t.pairs === 1 ? "1 pair" : `${t.pairs} pairs`}
              </span>
              {perPair ? (
                <>
                  <span
                    className={`mt-2 text-[19px] font-semibold leading-none ${
                      t.pairs > 1 ? "text-[#166534]" : "text-[#0a0a0a]"
                    }`}
                  >
                    {perPair}
                  </span>
                  <span className="mt-1 text-[10px] text-[#555555]">a pair</span>
                </>
              ) : (
                <>
                  <span className="mt-2 text-[12px] font-semibold leading-tight text-[#166534]">
                    Bundle price
                  </span>
                  <span className="mt-1 text-[10px] text-[#555555]">shown in your bag</span>
                </>
              )}
              {total && (
                <span className="mt-1.5 text-[11px] text-[#0a0a0a]">
                  {total}
                  {full && (
                    <>
                      {" "}
                      <span className="sr-only">instead of </span>
                      <s className="text-[#6b6b6b]">{full}</s>
                    </>
                  )}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** "Single colour" for every pair, or mix them pair by pair. */
export function BundleModeToggle({
  name,
  value,
  onChange,
}: {
  name: string;
  value: BundleMode;
  onChange: (m: BundleMode) => void;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="sr-only">Colours in your bundle</legend>
      <div className="grid grid-cols-2 gap-1 rounded-pill bg-[#f0ede8] p-1">
        {(
          [
            { m: "one", label: "Single colour" },
            { m: "mix", label: "Mix styles & colours" },
          ] as const
        ).map(({ m, label }) => (
          <label
            key={m}
            className={`flex h-9 cursor-pointer items-center justify-center rounded-pill px-2 text-center text-[12px] font-medium leading-tight transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#0a0a0a] ${
              value === m
                ? "bg-white text-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "text-[#555555] hover:text-[#0a0a0a]"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={m}
              checked={value === m}
              onChange={() => onChange(m)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Mix mode: style tabs, that style's colours (tap to add), the bundle's
 * progress and one card per pair with its own size and a remove button. A
 * pair's picture opens its quick view.
 */
export function BundleMixer({
  styles,
  current,
  pairs,
  picks,
  size,
  priced,
  doneNote,
  onPick,
  onRemove,
  onSize,
  onUpdate,
}: {
  /** The bundle's styles, in a fixed order; ones still loading are left out. */
  styles: ShopifyProduct[];
  /** This page's handle: its tab is open first. */
  current: string;
  pairs: number;
  picks: BundlePick[];
  /** The page's size, used by every pair that hasn't its own. */
  size: string | undefined;
  /** Whether bundle prices can be shown (market and display currency GBP). */
  priced: boolean;
  /** What the progress line says once every pair is picked. */
  doneNote: string;
  onPick: (handle: string, colour: string) => void;
  onRemove: (i: number) => void;
  onSize: (i: number, size: string) => void;
  /** A pair's colour or size changed in its quick view. */
  onUpdate: (i: number, pick: BundlePick) => void;
}) {
  useCatalogTables(); // v205: other styles' rows come with the full tables
  const [tab, setTab] = useState(current);
  const [fullTap, setFullTap] = useState(false);
  const pairsRef = useRef<HTMLOListElement>(null);
  const headingRef = useRef<HTMLParagraphElement>(null);
  /** The pair whose quick view is showing, as it was when opened - kept
   *  while the popup closes, so it animates out with the same content even
   *  after the pair is updated or removed. */
  const [view, setView] = useState<{ i: number; open: boolean; pick?: BundlePick }>({
    i: 0,
    open: false,
  });
  /** Screen-reader note after a pair is removed from its quick view. */
  const [removedNote, setRemovedNote] = useState("");

  /* Load every style's full product and reviews as soon as mixing starts,
     so a pair's quick view opens with its photos and stars already there. */
  const queryClient = useQueryClient();
  const styleKey = styles.map((p) => p.node.handle).join("|");
  useEffect(() => {
    for (const h of styleKey.split("|").filter(Boolean)) {
      void queryClient.prefetchQuery({
        queryKey: ["product", h],
        queryFn: () => fetchProductByHandle(h),
        staleTime: 5 * 60_000,
      });
      void queryClient.prefetchQuery({
        queryKey: ["judgeme-reviews", h],
        queryFn: () => fetchJudgemeData(h),
        staleTime: 5 * 60_000,
      });
    }
  }, [queryClient, styleKey]);
  const open = styles.find((p) => p.node.handle === tab) ?? styles[0];
  const filled = Math.min(picks.length, pairs);
  const full = filled >= pairs;

  const add = (handle: string, colour: string) => {
    if (full) {
      setFullTap(true);
      return;
    }
    setFullTap(false);
    onPick(handle, colour);
  };

  const colours = open
    ? (open.node.options.find((o) => /colou?r/i.test(o.name))?.values ?? [])
    : [];

  return (
    <div className="mt-6 rounded-card border border-[#e6e4e0] bg-[#faf9f7] p-3">
      {/* Styles */}
      <div className="flex flex-wrap gap-1.5">
        {styles.map((p) => {
          const on = p === open;
          return (
            <button
              key={p.node.handle}
              type="button"
              aria-pressed={on}
              onClick={() => setTab(p.node.handle)}
              className={`h-8 rounded-pill border px-3 text-[12px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a0a0a] ${
                on
                  ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                  : "border-[#c9c9c9] bg-white text-[#0a0a0a] hover:border-[#0a0a0a]"
              }`}
            >
              {styleName(p)}
            </button>
          );
        })}
      </div>

      {/* That style's colours: tap one to add it as the next pair. */}
      {open && (
        // Swiped sideways on phones; wrapped from md up, where a mouse can't.
        <ul className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible">
          {colours.map((colour) => {
            const ok = canBuy(open, colour, size);
            const inBundle = picks.filter(
              (pk) => pk.handle === open.node.handle && pk.colour === colour,
            ).length;
            return (
              <li key={colour} className="w-[76px] shrink-0">
                <button
                  type="button"
                  disabled={!ok}
                  onClick={() => add(open.node.handle, colour)}
                  aria-label={`Add ${styleName(open)} in ${colour}${
                    ok ? "" : size ? `, sold out in ${size}` : ", sold out"
                  }${inBundle ? ` (${inBundle} in your bundle)` : ""}`}
                  className="group block w-full text-left disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
                >
                  <span className="relative block">
                    <Thumb
                      url={thumbFor(open, colour)}
                      className={`aspect-[4/5] w-full border transition-colors ${
                        inBundle
                          ? "border-[#0a0a0a]"
                          : "border-[#e6e4e0] group-hover:border-[#0a0a0a]"
                      } ${ok ? "" : "opacity-40"}`}
                    />
                    {inBundle > 0 && (
                      <span
                        aria-hidden="true"
                        className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#0a0a0a] px-1 text-[10px] font-semibold text-white"
                      >
                        {inBundle}
                      </span>
                    )}
                    {ok && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.18)]"
                      >
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-[#0a0a0a]">{colour}</span>
                  {!ok && (
                    <span className="block text-[10px] leading-tight text-[#888888]">
                      {size ? `Sold out in ${size}` : "Sold out"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p
            ref={headingRef}
            id="bundle-heading"
            tabIndex={-1}
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a] outline-none"
          >
            Your bundle
          </p>
          <p className="text-[12px] font-semibold tabular-nums text-[#0a0a0a]">
            {filled}/{pairs}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Pairs picked"
          aria-valuemin={0}
          aria-valuemax={pairs}
          aria-valuenow={filled}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e6e4e0]"
        >
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ${
              full ? "bg-[#166534]" : "bg-[#0a0a0a]"
            }`}
            style={{ width: `${(filled / pairs) * 100}%` }}
          />
        </div>
        <p aria-live="polite" className="mt-1.5 text-[11px] text-[#555555]">
          {full
            ? fullTap
              ? `All ${pairs} pairs picked. Remove one to swap it${pairs < 5 ? ", or choose 5 pairs" : ""}.`
              : doneNote
            : `${pairs - filled} more to go: tap a colour to add it`}
        </p>
      </div>

      {/* One card per pair */}
      <ol
        ref={pairsRef}
        className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] md:flex-wrap md:overflow-visible"
      >
        {Array.from({ length: pairs }, (_, i) => {
          const pk = picks[i];
          if (!pk)
            return (
              <li key={i} className="w-[92px] shrink-0">
                <span className="grid aspect-[4/5] w-full place-items-center rounded-[8px] border border-dashed border-[#bdbdbd] text-[11px] text-[#888888]">
                  Pair {i + 1}
                </span>
              </li>
            );
          const p = styles.find((s) => s.node.handle === pk.handle);
          const own = pk.size ?? size;
          const v = p && own ? bundleVariant(p, pk.colour, own) : undefined;
          const soldOut = !!p && !!own && !(v && v.availableForSale);
          const sizes = p?.node.options.find((o) => /size/i.test(o.name))?.values ?? [];
          return (
            // Keyed by position, so the picture that opened a quick view is
            // still there for focus to return to after the pair is changed.
            <li key={i} className="w-[92px] shrink-0">
              <span className="relative block">
                {/* The picture opens this pair's quick view. Phones (no hover)
                    always show a small "View details" label on it; with a
                    mouse it appears on hover (or keyboard focus), with the
                    hand cursor, so it's clear the picture can be clicked. */}
                <button
                  type="button"
                  onClick={() => setView({ i, open: true, pick: pk })}
                  data-pair-view={i}
                  aria-haspopup="dialog"
                  aria-label={`View details: pair ${i + 1}, ${p ? styleName(p) : ""} in ${pk.colour}`}
                  className="group/pv relative block w-full cursor-pointer rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
                >
                  <Thumb
                    url={p ? thumbFor(p, pk.colour) : undefined}
                    className="aspect-[4/5] w-full border border-[#e6e4e0] transition-colors group-hover/pv:border-[#0a0a0a]"
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-1 bottom-1 rounded-pill bg-white/95 py-[3px] text-center text-[10px] font-medium leading-none text-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.14)] pointer-fine:translate-y-1 pointer-fine:opacity-0 pointer-fine:transition pointer-fine:duration-200 pointer-fine:group-hover/pv:translate-y-0 pointer-fine:group-hover/pv:opacity-100 pointer-fine:group-focus-visible/pv:translate-y-0 pointer-fine:group-focus-visible/pv:opacity-100"
                  >
                    View details
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFullTap(false);
                    onRemove(i);
                    // This button goes with its pair: keep the keyboard on the
                    // pair that moves into its place, else the one before, else
                    // the bundle heading.
                    requestAnimationFrame(() => {
                      const xs =
                        pairsRef.current?.querySelectorAll<HTMLButtonElement>("[data-remove]");
                      (xs?.[i] ?? xs?.[i - 1] ?? headingRef.current)?.focus();
                    });
                  }}
                  data-remove=""
                  aria-label={`Remove pair ${i + 1}: ${p ? styleName(p) : ""} ${pk.colour}`}
                  className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-full bg-white text-[#0a0a0a] shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#0a0a0a] hover:text-white focus-visible:outline-2 focus-visible:outline-[#0a0a0a]"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                </button>
              </span>
              <span className="mt-1 block truncate text-[10px] uppercase tracking-[0.06em] text-[#555555]">
                {p ? styleName(p) : ""}
              </span>
              <span className="block truncate text-[11px] text-[#0a0a0a]">{pk.colour}</span>
              {p && sizes.length > 0 && (
                <select
                  value={own ?? ""}
                  onChange={(e) => onSize(i, e.target.value)}
                  aria-label={`Size for pair ${i + 1}`}
                  className={`mt-1 h-8 w-full rounded-control border bg-white px-1.5 text-[12px] text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#0a0a0a] ${
                    soldOut ? "border-[#b00020]" : "border-[#8a8a8a]"
                  }`}
                >
                  {!own && (
                    <option value="" disabled>
                      Size
                    </option>
                  )}
                  {sizes.map((s) => {
                    const ok = canBuy(p, pk.colour, s);
                    return (
                      <option key={s} value={s} disabled={!ok}>
                        {ok ? s : `${s} - sold out`}
                      </option>
                    );
                  })}
                </select>
              )}
              {soldOut && (
                <span className="mt-0.5 block text-[10px] leading-tight text-[#b00020]">
                  Sold out in {own}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <BundlePairView
        open={view.open}
        onOpenChange={(o) => setView((v) => ({ ...v, open: o }))}
        style={styles.find((s) => s.node.handle === view.pick?.handle)}
        pick={view.pick}
        index={view.i}
        pairs={pairs}
        size={size}
        priced={priced}
        onSave={(pk) => onUpdate(view.i, pk)}
        onRemove={() => {
          setFullTap(false);
          onRemove(view.i);
        }}
        onAfterRemove={() =>
          setRemovedNote(`Pair ${view.i + 1} removed. ${filled} of ${pairs} pairs picked.`)
        }
      />
      <p role="status" className="sr-only">
        {removedNote}
      </p>
    </div>
  );
}
