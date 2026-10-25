import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, Loader2, ChevronDown, X } from "lucide-react";
import { toast } from "@/lib/toast";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { useFavorites } from "@/stores/favoritesStore";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useQuickAdd } from "@/stores/quickAddStore";
import { useDisplayPrice, usePreferences, useT } from "@/lib/preferences";
import { bagFreeShipping, useShippingCountry } from "@/lib/shipping";
import { cartLineImage } from "@/lib/cartImage";
import { useCatalogTables } from "@/lib/catalogTables";
import {
  BUNDLE_DEAL,
  BUNDLE5_SHOPIFY_TITLE,
  BUNDLE_SHOPIFY_TITLE,
  bundleLabel,
  inBundleDeal,
} from "@/lib/bundleDeal";
import { DUO_DEAL, DUO_SHOPIFY_TITLES, duoLabel } from "@/lib/duoDeal";
import { bagTotals } from "@/lib/bagTotals";
import { estimateDelivery, DISPATCH_CUTOFF_LONDON } from "@/lib/deliveryEstimate";
import {
  fetchProductRecommendations,
  fetchProductsByHandles,
  fetchVariantStock,
  shopifyImg,
  type ShopifyProduct,
} from "@/lib/shopify";
import { CartEditSheet } from "@/components/site/CartEditSheet";
import { BagTimer } from "@/components/site/BagTimer";
import { ensurePerks } from "@/components/site/PerkSync";
import { ProtectionIcon } from "@/components/site/ProtectionIcon";
import { usePerkValues } from "@/lib/usePerkValues";
import {
  PROTECTION,
  WASH_BAG,
  countedItems,
  isHiddenProduct,
  perkKindOf,
  perkPlan,
  type PerkKind,
} from "@/lib/perks";
/*
 * Bag drawer.
 *
 * Every persuasive line in here is derived from live data and renders nothing
 * when the data is missing. There is no timer, no invented stock figure, and
 * no "X people are looking at this". Under the UK DMCC Act fake scarcity is
 * a direct-fine offence; more to the point, this brand's whole position is
 * that it doesn't overstate.
 *
 *   Free-shipping bar   — bagFreeShipping(), same rule as the product page
 *   "Only N left"       — Storefront quantityAvailable, < 40 only; the query
 *                         is rejected outright until the inventory scope is
 *                         enabled on the headless app, in which case nothing
 *                         renders
 *   Delivery window     — processing + per-country transit in working days,
 *                         Europe/London; no countdown while no cutoff is
 *                         confirmed (DISPATCH_CUTOFF_LONDON is null)
 *   Bundle nudge        — mirrors the live 3-for-£30 automatic discount
 *   Multi-buy perks     — the free shipping protection / wash bag lines and
 *                         the opt-in "Shipping insurance" toggle (lib/perks,
 *                         PerkSync): the toggle starts off, and a free perk
 *                         only ever shows while the bag earns it
 */

const LOW_STOCK_BELOW = 40;

export function CartDrawer() {
  /* v205: lines from other products than this page's need the full catalogue
     tables; this also starts loading them once the page is idle. */
  useCatalogTables();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CartItem | null>(null);
  const {
    items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, resolveCheckoutUrl, syncCart,
    discountCodes, applyDiscountCode, removeDiscountCode,
    perksDismissed, protectionOptIn, setPerkPrefs,
  } = useCartStore();
  const favourites = useFavorites();
  const recentHandles = useRecentlyViewed((s) => s.handles);
  const openQuickAdd = useQuickAdd((s) => s.openFor);

  const display = useDisplayPrice();
  const t = useT();
  // Perks aren't products the shopper chose: left out of the counts.
  const totalItems = countedItems(items);
  const plan = perkPlan(items);
  const protectionLine = items.find((i) => perkKindOf(i.variantId) === "protection");
  /* The perks' prices in the shopper's market: the toggle's £3.49 and what
     each free gift is worth, struck beside "FREE". */
  const perkValues = usePerkValues(open && items.length > 0);
  const protectionPrice = perkValues.paidProtection;

  /** The shopper took a perk out (X or the toggle): it stays out. */
  const dropPerk = async (kind: PerkKind) => {
    setPerkPrefs({
      perksDismissed: [...new Set([...useCartStore.getState().perksDismissed, kind])],
      ...(kind === "protection" ? { protectionOptIn: false } : {}),
    });
    try {
      for (const i of useCartStore.getState().items) {
        if (perkKindOf(i.variantId) === kind) await removeItem(i.variantId);
      }
    } catch {
      // PerkSync takes it out on its next pass.
    }
  };
  /* The switch shows the shopper's choice at once; the bag catches up. */
  const [protectionPending, setProtectionPending] = useState<boolean | null>(null);
  const setProtection = async (on: boolean) => {
    setProtectionPending(on);
    try {
      if (!on) return await dropPerk("protection");
      /* Consent to pay: only a tap made while £3.49 is the price shown
         counts as opting in to it (reg 40). Switching it back on while it
         reads FREE just undoes the shopper's earlier X - so dropping below
         Buy 2 later takes the free one out and never swaps in a paid one. */
      const paid = !plan.protectionFree;
      setPerkPrefs({
        perksDismissed: useCartStore.getState().perksDismissed.filter((k) => k !== "protection"),
        ...(paid ? { protectionOptIn: true } : {}),
      });
      await ensurePerks();
      if (!useCartStore.getState().items.some((i) => perkKindOf(i.variantId) === "protection")) {
        if (paid) setPerkPrefs({ protectionOptIn: false });
        toast.error("We couldn't add shipping insurance. Please try again.", {
          position: "top-center",
        });
      }
    } finally {
      setProtectionPending(null);
    }
  };
  /* The bag's arithmetic (full price, the mirrored Buy 2 and 3-for-£30 savings,
     Shopify's own totals once they're in) lives in lib/bagTotals.ts, so the
     product page's free-shipping box uses exactly the same figures. An empty
     bag quotes in the shopper's currency, like the header. */
  const displayCurrency = usePreferences((s) => s.currency);
  const totals = useCartStore((s) => s.totals);
  const { baseCurrency, duoSaving, duoOneShort, duoPercents, bundleSaving, shopifyTotals, payable, pending } =
    bagTotals(items, totals, displayCurrency, discountCodes);
  /* Bundle: how many eligible underwear lines are in the bag. */
  const bundleQty = items.filter((i) => inBundleDeal(i.product.node.handle)).reduce((s, i) => s + i.quantity, 0);
  const savingLines: Array<{ label: string; amount: number }> = shopifyTotals
    ? shopifyTotals.discounts.map((d) =>
        d.label.toLowerCase() === BUNDLE_SHOPIFY_TITLE.toLowerCase()
          ? { ...d, label: bundleLabel(baseCurrency) }
          : d.label.toLowerCase() === BUNDLE5_SHOPIFY_TITLE.toLowerCase()
            ? { ...d, label: bundleLabel(baseCurrency, 5) }
            : /* The Simple Discounts rule keeps one title for both breaks, so
                 name the rate actually in play (v204). */
              DUO_SHOPIFY_TITLES.includes(d.label.toLowerCase()) && duoPercents.length > 0
              ? { ...d, label: duoLabel(duoPercents) }
              : d,
      )
    : [
        ...(bundleSaving > 0 ? [{ label: bundleLabel(baseCurrency, bundleQty), amount: bundleSaving }] : []),
        ...(duoSaving > 0 ? [{ label: duoLabel(duoPercents), amount: duoSaving }] : []),
      ];

  const { country } = useShippingCountry();
  /* Judged on what checkout charges (after discounts), with the same rule as
     the product page's progress box (lib/shipping.ts). While a code is still
     being priced (pending) the bar is left out rather than guess. */
  const { threshold, remaining, qualified, progress } = bagFreeShipping(payable, baseCurrency);

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

  /* Delivery window, re-derived every 30s while open so a shopper who leaves
     the drawer up over midnight (or a future cutoff) sees it move. */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [open]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const delivery = useMemo(() => estimateDelivery(country), [country, tick]);

  /* Live stock — resolves to {} (and shows nothing) until the scope exists. */
  const variantIds = items.map((i) => i.variantId);
  const { data: stock } = useQuery({
    queryKey: ["bag-stock", variantIds],
    queryFn: () => fetchVariantStock(variantIds),
    enabled: open && variantIds.length > 0,
    staleTime: 60_000,
  });

  /* Frequently bought together — anchored on the first line, minus what's in the bag. */
  const inBag = new Set(items.map((i) => i.product.node.handle));
  const anchorId = items.find((i) => !isHiddenProduct(i.product.node))?.product.node.id;
  const { data: recos } = useQuery({
    queryKey: ["bag-recos", anchorId],
    queryFn: () => fetchProductRecommendations(anchorId!),
    enabled: open && !!anchorId,
    staleTime: 5 * 60_000,
  });
  const together = (recos ?? []).filter((p) => !inBag.has(p.node.handle)).slice(0, 4);

  /* Recently viewed — by handle, aliased lookups (search ignores handle: filters). */
  const recentWanted = recentHandles.filter((h) => !inBag.has(h)).slice(0, 4);
  const { data: recent } = useQuery({
    queryKey: ["bag-recent", recentWanted],
    queryFn: () => fetchProductsByHandles(recentWanted),
    enabled: open && recentWanted.length > 0,
    staleTime: 5 * 60_000,
  });


  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    // Synchronous window.open inside the gesture: mobile Safari blocks it after an await.
    const win = window.open("", "_blank");
    try {
      // Perks in step with the bag before Shopify sees it.
      await ensurePerks();
      const url = (await resolveCheckoutUrl()) ?? getCheckoutUrl();
      if (!url) { win?.close(); return; }
      if (win) win.location.href = url; else window.location.href = url;
      setOpen(false);
    } catch {
      win?.close();
    } finally {
      setIsCheckingOut(false);
    }
  };

  const moveToFavourites = async (item: CartItem) => {
    const h = item.product.node.handle;
    if (!favourites.has(h)) favourites.toggle(h);
    await removeItem(item.variantId);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label={t("Open bag")}>
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-ink text-cream text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>
        </SheetTrigger>

        <SheetContent className="w-full sm:max-w-[440px] bg-cream p-0 flex flex-col">
          {/* Compact header (v157): less space above and under the title so
              the bag's contents sit higher. */}
          <SheetHeader className="px-6 pt-5 pb-0 text-left">
            <SheetTitle className="font-serif text-[22px] font-light leading-tight text-ink">
              {t("Your Bag")} {totalItems > 0 && <span className="text-cocoa">({totalItems})</span>}
            </SheetTitle>
            <SheetDescription className="sr-only">Items in your bag</SheetDescription>
          </SheetHeader>
          {totalItems > 0 && <BagTimer />}
          {totalItems === 0 ? (
            /*
             * Empty bag. An empty drawer is still a shopper who opened the bag,
             * so it gives them a place to go and, if they've been browsing,
             * the pieces they already looked at with quick-add. Everything on
             * it is true: the free-shipping threshold is the live one for their
             * country, returns are the real policy, no urgency, no timers.
             */
            <div className="flex-1 overflow-y-auto">
              <div className="px-6 pt-10 pb-8 text-center">
                <p className="font-serif text-[22px] font-light leading-tight text-ink">Nothing in here yet.</p>
                <p className="mx-auto mt-3 max-w-[280px] text-[13px] leading-relaxed text-cocoa">
                  Free delivery from {display(threshold, baseCurrency)}
                  {country?.name ? ` to ${country.the ? "the " : ""}${country.name}` : ""}, and easy 30-day returns either way.
                </p>
                <div className="mx-auto mt-6 flex max-w-[300px] flex-col gap-2">
                  <Button asChild className="h-11 w-full rounded-control bg-ink text-[11px] font-medium uppercase tracking-[0.18em] text-white hover:bg-ink/85">
                    <Link to="/collections/$handle" params={{ handle: "everyday-support-edit" }} onClick={() => setOpen(false)}>
                      {t("Shop Best Sellers")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 w-full rounded-control border-ink text-[11px] font-medium uppercase tracking-[0.18em] text-ink hover:bg-ink hover:text-white">
                    <Link to="/collections/$handle" params={{ handle: "new-in" }} onClick={() => setOpen(false)}>
                      New In
                    </Link>
                  </Button>
                </div>
              </div>
              {recent && recent.length > 0 && (
                <div className="border-t border-border px-6 pb-8">
                  <ProductGrid title="Pick up where you left off" products={recent} onPick={openQuickAdd} display={display} />
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ── Free shipping — top of the drawer ─────────────────────
                  v157: a 6px rounded bar with a 🚚 badge riding at the
                  progress point. Once free shipping is unlocked the badge
                  sits at the end and takes the timer's light green. The bar
                  is inset by half the badge so the badge never clips. */}
              {!pending && (
              <div className="px-6 pt-3 pb-3.5 border-b border-border">
                <p className="text-[13px] leading-snug text-cocoa">
                  {qualified ? (
                    <>
                      <span className="font-semibold text-ink">Free shipping unlocked</span>
                      {country?.name ? ` to ${country.the ? "the " : ""}${country.name}` : ""}
                    </>
                  ) : (
                    <>
                      You're <span className="font-semibold text-ink">{display(remaining, baseCurrency)}</span> away from free shipping
                      {country?.name ? ` to ${country.the ? "the " : ""}${country.name}` : ""}
                    </>
                  )}
                </p>
                <div className="relative mx-3.5 mt-1.5 h-7">
                  <div
                    className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-pill bg-sand"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label="Progress towards free shipping"
                  >
                    <div
                      className="h-full rounded-pill bg-ink transition-[width] duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[14px] leading-none shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition-[left,background-color,border-color] duration-500 ease-out ${
                      qualified ? "border-[#94E374] bg-[#DCFFD3]" : "border-ink bg-white"
                    }`}
                    style={{ left: `${progress}%` }}
                  >
                    🚚
                  </span>
                </div>
              </div>
              )}

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* ── Lines ───────────────────────────────────────────── */}
                <ul className="px-6 divide-y divide-border">
                  {items.map((item) => {
                    const perk = perkKindOf(item.variantId);
                    if (perk)
                      return (
                        <PerkLine
                          key={item.variantId}
                          item={item}
                          kind={perk}
                          free={parseFloat(item.price.amount) === 0}
                          worth={perk === "protection" ? perkValues.protection : perkValues.washBag}
                          display={display}
                          disabled={isLoading}
                          onRemove={() => void dropPerk(perk)}
                        />
                      );
                    const node = item.product.node;
                    const variant = node.variants.edges.find((v) => v.node.id === item.variantId)?.node;
                    // v196: the "was" price Shopify gives this line in the cart's
                    // market, so it follows a Ship-to switch like the price does.
                    // The product snapshot (priced where it was added) is only a
                    // fallback until the totals are in.
                    const marketCompare = totals?.lineCompareAt;
                    const compare = marketCompare && item.variantId in marketCompare
                      ? marketCompare[item.variantId]
                      : variant?.compareAtPrice ?? null;
                    const onSale = !!compare && parseFloat(compare.amount) > parseFloat(item.price.amount);
                    const size = item.selectedOptions.find((o) => /size/i.test(o.name))?.value;
                    const colour = item.selectedOptions.find((o) => /colou?r/i.test(o.name))?.value;
                    // Any other option the shopper picked (Body Adhesive "Type").
                    const otherOptions = item.selectedOptions.filter(
                      (o) => !/size|colou?r|title/i.test(o.name) && o.value !== "Default Title",
                    );
                    const thumb = cartLineImage(item.product, item.variantId, item.selectedOptions, 300);
                    const qty = stock?.[item.variantId];
                    const lowStock = typeof qty === "number" && qty > 0 && qty < LOW_STOCK_BELOW;
                    const bundleShort = inBundleDeal(node.handle) && bundleQty < BUNDLE_DEAL.minQuantity
                      ? BUNDLE_DEAL.minQuantity - bundleQty
                      : 0;

                    return (
                      <li key={item.variantId} className="flex gap-4 py-5">
                        <Link
                          to="/product/$handle"
                          params={{ handle: node.handle }}
                          onClick={() => setOpen(false)}
                          className="h-28 w-[88px] flex-shrink-0 overflow-hidden bg-beige"
                        >
                          {thumb && <img src={thumb.url} alt={thumb.alt} className="h-full w-full object-cover" />}
                        </Link>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              {node.productType && (
                                <p className="text-[10px] uppercase tracking-[0.18em] text-cocoa">{node.productType}</p>
                              )}
                              <Link
                                to="/product/$handle"
                                params={{ handle: node.handle }}
                                onClick={() => setOpen(false)}
                                className="mt-0.5 block font-serif text-[16px] leading-snug text-ink"
                              >
                                {node.title}
                              </Link>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditing(item)}
                              className="flex-shrink-0 text-[12px] text-ink underline underline-offset-4 hover:opacity-60"
                            >
                              Edit
                            </button>
                          </div>

                          <p className="mt-1.5 text-[14px] text-ink">
                            {display(item.price.amount, item.price.currencyCode)}
                            {onSale && (
                              <span className="ml-2 text-[13px] text-cocoa line-through">
                                {display(compare!.amount, compare!.currencyCode)}
                              </span>
                            )}
                          </p>

                          {bundleShort > 0 && (
                            <p className="mt-1.5 text-[12px] text-ink">
                              Add {bundleShort} more to get {bundleLabel(baseCurrency)}
                            </p>
                          )}

                          <div className="mt-2 space-y-0.5 text-[12px] text-cocoa">
                            {size && <p>Size <span className="text-ink">{size}</span></p>}
                            {colour && <p>Colour <span className="text-ink">{colour}</span></p>}
                            {otherOptions.map((o) => (
                              <p key={o.name}>{o.name} <span className="text-ink">{o.value}</span></p>
                            ))}
                          </div>

                          {lowStock && (
                            <p className="mt-1.5 text-[12px] text-ink">Only {qty} left</p>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            {/* SKIMS-style quantity box: bin replaces minus at qty 1.
                                Off while Shopify updates the bag, so a quick second
                                tap isn't counted from the old quantity and lost. */}
                            <div className="inline-flex h-9 items-center overflow-hidden rounded-control border border-border">
                              <button
                                type="button"
                                aria-label={item.quantity === 1 ? "Remove" : "Decrease quantity"}
                                onClick={() =>
                                  item.quantity === 1 ? removeItem(item.variantId) : updateQuantity(item.variantId, item.quantity - 1)
                                }
                                disabled={isLoading}
                                className="flex h-full w-9 items-center justify-center text-ink hover:bg-beige focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
                              >
                                {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                              </button>
                              <span className="w-8 text-center text-[13px] text-ink">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                disabled={isLoading}
                                className="flex h-full w-9 items-center justify-center text-ink hover:bg-beige focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => moveToFavourites(item)}
                              className="text-[12px] text-cocoa underline underline-offset-4 hover:text-ink"
                            >
                              Move to Favourites
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {plan.hasProducts && (
                  <ShippingInsurance
                    on={protectionPending ?? !!protectionLine}
                    free={plan.protectionFree}
                    price={protectionPrice}
                    busy={isLoading || protectionPending !== null || !protectionPrice}
                    onChange={(on) => void setProtection(on)}
                  />
                )}

                <PromoCode codes={discountCodes} onApply={applyDiscountCode} onRemove={removeDiscountCode} />

                {together.length > 0 && (
                  <ProductGrid title="Frequently bought together" products={together} onPick={openQuickAdd} display={display} />
                )}
                {(recent ?? []).length > 0 && (
                  <ProductGrid title="Recently viewed" products={recent!} onPick={openQuickAdd} display={display} />
                )}

                {/* ── Policies ────────────────────────────────────────── */}
                <div className="px-6 pt-8 pb-6">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cocoa">Our policies</p>
                  <ul className="mt-3 divide-y divide-border border-t border-b border-border">
                    {[["Shipping & Processing", "shipping"], ["Returns", "returns"], ["Terms & Conditions", "terms"]].map(([label, slug]) => (
                      <li key={slug}>
                        <Link to="/pages/$slug" params={{ slug }} onClick={() => setOpen(false)} className="flex items-center justify-between py-3 text-[13px] text-ink hover:opacity-60">
                          {label}<ChevronDown className="h-3.5 w-3.5 -rotate-90 text-cocoa" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* ── Sticky footer ───────────────────────────────────── */}
              <div className="flex-shrink-0 border-t border-border bg-cream px-6 pt-4 pb-5 space-y-3">
                {delivery && (
                  <p className="text-[12px] leading-relaxed text-cocoa">
                    {DISPATCH_CUTOFF_LONDON && delivery.minutesToCutoff !== null ? (
                      <>Order within <span className="text-ink">{Math.floor(delivery.minutesToCutoff / 60)}h {delivery.minutesToCutoff % 60}m</span> for delivery </>
                    ) : (
                      <>Estimated delivery </>
                    )}
                    <span className="text-ink">{delivery.label}</span> to {delivery.countryName}
                  </p>
                )}
                {savingLines.map((l) => (
                  <div key={l.label} className="mb-2 flex items-center justify-between text-[12px]">
                    <span className="text-cocoa">{l.label} — applied at checkout</span>
                    <span className="text-ink">−{display(l.amount, baseCurrency)}</span>
                  </div>
                ))}
                {duoSaving === 0 && duoOneShort > 0 ? (
                  <p className="mb-2 text-[12px] text-cocoa">Add a second of the same product to save {DUO_DEAL.percent}% on both.</p>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-cocoa">{t("Subtotal")}</span>
                  <span className="font-serif text-[20px] text-ink">{display(payable, baseCurrency)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-cta text-cream hover:bg-cta-hover uppercase tracking-[0.2em] text-[11px] py-6 rounded-control"
                  disabled={totalItems === 0 || isLoading || isSyncing || isCheckingOut}
                >
                  {isLoading || isSyncing || isCheckingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>{t("Checkout securely")} — {display(payable, baseCurrency)}</>
                  )}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CartEditSheet item={editing} open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }} />
    </>
  );
}

/* ── Multi-buy perk line ───────────────────────────────────────────────── */

/** A perk in the bag: no product page, no Edit, quantity fixed at 1, an X
 *  to take it out. "FREE" (its value struck beside it, the gift variant's
 *  compare-at) only while Shopify's line price really is £0. */
function PerkLine({
  item,
  kind,
  free,
  worth,
  display,
  disabled,
  onRemove,
}: {
  item: CartItem;
  kind: PerkKind;
  free: boolean;
  /** What the free gift is worth, formatted (£3.49 / £10). */
  worth: string | null;
  display: (amount: string | number, currency: string) => string;
  disabled: boolean;
  onRemove: () => void;
}) {
  const info = kind === "protection" ? PROTECTION : WASH_BAG;
  const thumb = cartLineImage(item.product, item.variantId, item.selectedOptions, 300);
  const note =
    kind === "protection"
      ? free
        ? "Included free with your multi-buy"
        : "Damage, loss & theft cover"
      : "Included free with your multi-buy · Large 50x60cm";
  return (
    <li className="flex gap-4 py-5">
      <div className="grid h-28 w-[88px] flex-shrink-0 place-items-center overflow-hidden bg-beige">
        {kind === "protection" ? (
          <ProtectionIcon size={56} className="rounded-[8px]" />
        ) : (
          <img
            src={thumb?.url ?? shopifyImg(info.image, 300)}
            alt=""
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-cocoa">
              {free ? "Free gift" : "Added by you"}
            </p>
            <p className="mt-0.5 font-serif text-[16px] leading-snug text-ink">{info.title}</p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={`Remove ${info.title}`}
            className="-mr-1 -mt-1 grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-ink transition-colors hover:bg-beige disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {free ? (
          <p className="mt-1.5 flex items-baseline gap-2 text-[14px]">
            {worth && (
              <s className="text-[13px] text-cocoa">
                <span className="sr-only">worth </span>
                {worth}
              </s>
            )}
            <span className="font-semibold text-[#166534]">FREE</span>
          </p>
        ) : (
          <p className="mt-1.5 text-[14px] font-semibold text-ink">
            {display(item.price.amount, item.price.currencyCode)}
          </p>
        )}
        <p className="mt-2 text-[12px] text-cocoa">{note}</p>
      </div>
    </li>
  );
}

/* ── Shipping insurance toggle (opt-in, starts off) ────────────────────── */

/** Owner's wording (14 Oct 2026). Off unless the shopper turns it on - or
 *  the bag earns it free with a Buy 2. */
function ShippingInsurance({
  on,
  free,
  price,
  busy,
  onChange,
}: {
  on: boolean;
  free: boolean;
  /** null until the shopper's market price has loaded (never a guess). */
  price: string | null;
  busy: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="mx-6 mb-5 flex items-start gap-3 rounded-card border border-border bg-white p-4">
      <ProtectionIcon size={36} className="mt-0.5 rounded-[8px] ring-1 ring-border" />
      <div className="min-w-0 flex-1">
        <p id="shipping-insurance-label" className="text-[13px] font-semibold leading-snug text-ink">
          Shipping insurance
        </p>
        <p id="shipping-insurance-price" className="mt-0.5 text-[12px] leading-snug text-ink">
          from Damage, Loss &amp; Theft{price ? " for " : ""}
          {!price ? null : free ? (
            <>
              <s className="text-cocoa">
                <span className="sr-only">normally </span>
                {price}
              </s>{" "}
              <span className="font-semibold">FREE</span>
              <span className="sr-only"> with your multi-buy</span>
            </>
          ) : (
            price
          )}
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-cocoa">
          Get peace of mind with Auvella&apos;s Delivery Guarantee in the event your delivery is
          damaged, stolen, or lost during transit.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="shipping-insurance-label"
        aria-describedby="shipping-insurance-price"
        disabled={busy}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          on ? "bg-ink" : "bg-[#8a8a8a]"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-200 ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ── Promo code accordion ──────────────────────────────────────────────── */

function PromoCode({
  codes, onApply, onRemove,
}: { codes: string[]; onApply: (c: string) => Promise<void>; onRemove: (c: string) => Promise<void> }) {
  const [openAcc, setOpenAcc] = useState(codes.length > 0);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const apply = async () => {
    if (!code.trim() || busy) return;
    setBusy(true); setError("");
    try { await onApply(code); setCode(""); }
    catch (e) { setError(e instanceof Error ? e.message : "That code couldn't be applied."); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-6 border-t border-border">
      <button type="button" onClick={() => setOpenAcc((v) => !v)} className="flex w-full items-center justify-between py-4 text-[13px] text-ink">
        Promo code
        <ChevronDown className={`h-4 w-4 text-cocoa transition-transform ${openAcc ? "rotate-180" : ""}`} />
      </button>
      {openAcc && (
        <div className="pb-4">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void apply(); }}
              placeholder="Enter code"
              autoCapitalize="characters"
              className="h-10 flex-1 rounded-control border border-border bg-cream px-3 text-[13px] text-ink outline-none placeholder:text-cocoa/70 focus:border-ink"
            />
            <button type="button" onClick={apply} disabled={busy || !code.trim()} className="h-10 rounded-control border border-ink px-4 text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-ink hover:text-cream disabled:opacity-40">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px] text-[#B3261E]">{error}</p>}
          {codes.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {codes.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5 rounded-pill border border-border px-2.5 py-1 text-[12px] text-ink">
                  {c}
                  <button type="button" aria-label={`Remove ${c}`} onClick={() => onRemove(c)} className="text-cocoa hover:text-ink"><X className="h-3 w-3" /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-cocoa">Applied at checkout.</p>
        </div>
      )}
    </div>
  );
}

/* ── Compact product grid (recommendations / recently viewed) ─────────── */

function ProductGrid({
  title, products, onPick, display,
}: {
  title: string;
  products: ShopifyProduct[];
  onPick: (p: ShopifyProduct) => void;
  display: (amount: string | number, currency: string) => string;
}) {
  return (
    <div className="pt-8">
      <p className="px-6 text-[11px] uppercase tracking-[0.18em] text-cocoa">{title}</p>
      {/* Hairline grid; bg-border only shows through the gaps, and only once
          there is a second column to make a gap — a lone card gets no grey cell. */}
      <div className={`mt-4 grid grid-cols-2 gap-px ${products.length > 1 ? "bg-border" : ""}`}>
        {products.map((p) => {
          const n = p.node;
          const img = n.images.edges[0]?.node;
          const v = n.variants.edges.find((x) => x.node.availableForSale)?.node ?? n.variants.edges[0]?.node;
          const price = v?.price ?? n.priceRange.minVariantPrice;
          return (
            /* Column flex + mt-auto pins every button to the card's foot, so a
               two-line title doesn't push one lower than its neighbour (v160). */
            <div key={n.id} className="flex flex-col bg-cream p-4">
              <button type="button" onClick={() => onPick(p)} className="block w-full aspect-[3/4] overflow-hidden bg-beige">
                {img && <img src={shopifyImg(img.url, 500)} alt={img.altText ?? n.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />}
              </button>
              {n.productType && <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-cocoa">{n.productType}</p>}
              <p className="mt-0.5 font-serif text-[14px] leading-snug text-ink line-clamp-2">{n.title}</p>
              <p className="mt-1 text-[13px] text-ink">{display(price.amount, price.currencyCode)}</p>
              <div className="mt-auto pt-3">
                <button type="button" onClick={() => onPick(p)} className="h-10 w-full rounded-control border border-ink text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-cream">
                  Add to bag
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
