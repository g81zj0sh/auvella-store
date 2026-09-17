import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, Loader2, ChevronDown, X } from "lucide-react";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import { useFavorites } from "@/stores/favoritesStore";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { useQuickAdd } from "@/stores/quickAddStore";
import { useDisplayPrice, useT } from "@/lib/preferences";
import { freeShippingThreshold, useShippingCountry } from "@/lib/shipping";
import { cartLineImage } from "@/lib/cartImage";
import { BUNDLE_DEAL, bundleLabel, inBundleDeal } from "@/lib/bundleDeal";
import { estimateDelivery, DISPATCH_CUTOFF_LONDON } from "@/lib/deliveryEstimate";
import {
  fetchProductRecommendations,
  fetchProductsByHandles,
  fetchVariantStock,
  shopifyImg,
  type ShopifyProduct,
} from "@/lib/shopify";
import { CartEditSheet } from "@/components/site/CartEditSheet";

/*
 * Bag drawer.
 *
 * Every persuasive line in here is derived from live data and renders nothing
 * when the data is missing. There is no timer, no invented stock figure, and
 * no "X people are looking at this". Under the UK DMCC Act fake scarcity is
 * a direct-fine offence; more to the point, this brand's whole position is
 * that it doesn't overstate.
 *
 *   Free-shipping bar   — freeShippingThreshold(), same number as the site
 *   "Only N left"       — Storefront quantityAvailable, < 40 only; the query
 *                         is rejected outright until the inventory scope is
 *                         enabled on the headless app, in which case nothing
 *                         renders
 *   Delivery window     — processing + per-country transit in working days,
 *                         Europe/London; no countdown while no cutoff is
 *                         confirmed (DISPATCH_CUTOFF_LONDON is null)
 *   Bundle nudge        — mirrors the live 3-for-£30 automatic discount
 */

const LOW_STOCK_BELOW = 40;

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CartItem | null>(null);
  const {
    items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, resolveCheckoutUrl, syncCart,
    discountCodes, applyDiscountCode, removeDiscountCode,
  } = useCartStore();
  const favourites = useFavorites();
  const recentHandles = useRecentlyViewed((s) => s.handles);
  const openQuickAdd = useQuickAdd((s) => s.openFor);

  const display = useDisplayPrice();
  const t = useT();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const baseCurrency = items[0]?.price.currencyCode ?? "GBP";

  const { country } = useShippingCountry();
  const threshold = freeShippingThreshold(baseCurrency);
  const remaining = Math.max(0, threshold - totalPrice);
  const qualified = totalPrice >= threshold;
  const progress = threshold > 0 ? Math.min(100, (totalPrice / threshold) * 100) : 0;

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
  const anchorId = items[0]?.product.node.id;
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

  /* Bundle: how many eligible underwear lines are in the bag. */
  const bundleQty = items.filter((i) => inBundleDeal(i.product.node.handle)).reduce((s, i) => s + i.quantity, 0);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const handleCheckout = async () => {
    if (isCheckingOut) return;
    setIsCheckingOut(true);
    // Synchronous window.open inside the gesture: mobile Safari blocks it after an await.
    const win = window.open("", "_blank");
    try {
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
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle className="font-serif text-[22px] font-light text-ink">
              {t("Your Bag")} {totalItems > 0 && <span className="text-cocoa">({totalItems})</span>}
            </SheetTitle>
            <SheetDescription className="sr-only">Items in your bag</SheetDescription>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center px-6">
              <div className="text-center">
                <ShoppingBag className="h-10 w-10 text-cocoa/60 mx-auto mb-4" strokeWidth={1.25} />
                <p className="text-cocoa">{t("Your bag is empty")}</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Free shipping — top of the drawer ─────────────────── */}
              <div className="px-6 pt-4 pb-4 border-b border-border">
                <p className="text-[12px] leading-relaxed text-cocoa text-center">
                  {qualified ? (
                    <>
                      <span className="font-medium text-ink">Free shipping unlocked</span>
                      {country?.name ? ` to ${country.name}` : ""}.
                    </>
                  ) : (
                    <>
                      You're <span className="font-medium text-ink">{display(remaining, baseCurrency)}</span> away from free shipping
                      {country?.name ? ` to ${country.name}` : ""}.
                    </>
                  )}
                </p>
                <div className="mt-2 h-[3px] w-full overflow-hidden bg-beige" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Progress towards free shipping">
                  <div className="h-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* ── Lines ───────────────────────────────────────────── */}
                <ul className="px-6 divide-y divide-border">
                  {items.map((item) => {
                    const node = item.product.node;
                    const variant = node.variants.edges.find((v) => v.node.id === item.variantId)?.node;
                    const compare = variant?.compareAtPrice ?? null;
                    const onSale = !!compare && parseFloat(compare.amount) > parseFloat(item.price.amount);
                    const size = item.selectedOptions.find((o) => /size/i.test(o.name))?.value;
                    const colour = item.selectedOptions.find((o) => /colou?r/i.test(o.name))?.value;
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
                          </div>

                          {lowStock && (
                            <p className="mt-1.5 text-[12px] text-ink">Only {qty} left</p>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            {/* SKIMS-style quantity box: bin replaces minus at qty 1 */}
                            <div className="inline-flex h-9 items-center border border-border">
                              <button
                                type="button"
                                aria-label={item.quantity === 1 ? "Remove" : "Decrease quantity"}
                                onClick={() =>
                                  item.quantity === 1 ? removeItem(item.variantId) : updateQuantity(item.variantId, item.quantity - 1)
                                }
                                className="flex h-full w-9 items-center justify-center text-ink hover:bg-beige"
                              >
                                {item.quantity === 1 ? <Trash2 className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                              </button>
                              <span className="w-8 text-center text-[13px] text-ink">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                                className="flex h-full w-9 items-center justify-center text-ink hover:bg-beige"
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-[0.2em] text-cocoa">{t("Subtotal")}</span>
                  <span className="font-serif text-[20px] text-ink">{display(totalPrice, baseCurrency)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-ink text-cream hover:bg-cocoa uppercase tracking-[0.2em] text-[11px] py-6 rounded-none"
                  disabled={items.length === 0 || isLoading || isSyncing || isCheckingOut}
                >
                  {isLoading || isSyncing || isCheckingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>{t("Checkout")} — {display(totalPrice, baseCurrency)}</>
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
              className="h-10 flex-1 border border-border bg-cream px-3 text-[13px] text-ink outline-none placeholder:text-cocoa/70 focus:border-ink"
            />
            <button type="button" onClick={apply} disabled={busy || !code.trim()} className="h-10 border border-ink px-4 text-[11px] uppercase tracking-[0.16em] text-ink hover:bg-ink hover:text-cream disabled:opacity-40">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
            </button>
          </div>
          {error && <p className="mt-2 text-[12px] text-[#B3261E]">{error}</p>}
          {codes.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {codes.map((c) => (
                <li key={c} className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-[12px] text-ink">
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
      <div className="mt-4 grid grid-cols-2 gap-px bg-border">
        {products.map((p) => {
          const n = p.node;
          const img = n.images.edges[0]?.node;
          const v = n.variants.edges.find((x) => x.node.availableForSale)?.node ?? n.variants.edges[0]?.node;
          const price = v?.price ?? n.priceRange.minVariantPrice;
          return (
            <div key={n.id} className="bg-cream p-4">
              <button type="button" onClick={() => onPick(p)} className="block w-full aspect-[3/4] overflow-hidden bg-beige">
                {img && <img src={shopifyImg(img.url, 500)} alt={img.altText ?? n.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />}
              </button>
              {n.productType && <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-cocoa">{n.productType}</p>}
              <p className="mt-0.5 font-serif text-[14px] leading-snug text-ink line-clamp-2">{n.title}</p>
              <p className="mt-1 text-[13px] text-ink">{display(price.amount, price.currencyCode)}</p>
              <button type="button" onClick={() => onPick(p)} className="mt-3 h-10 w-full border border-ink text-[11px] uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-cream">
                Add to bag
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
