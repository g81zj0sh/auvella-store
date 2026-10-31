import { create, type StateCreator, type StoreMutatorIdentifier } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import {
  CART_QUERY,
  ShopifyProduct,
  addLineToShopifyCart,
  createShopifyCart,
  removeLineFromShopifyCart,
  storefrontApiRequest,
  updateShopifyCartLine,
  recreateShopifyCart,
  formatCheckoutUrl,
  withoutVisitorConsent,
  storefrontCountry,
  cartLineKey,
  swapShopifyCartLine,
  setShopifyDiscountCodes,
  updateShopifyCartCountry,
  fetchCartTotals,
  type CartTotals,
  type CartLineAttributes,
} from "@/lib/shopify";
import { metaContentId, trackMetaEvent } from "@/lib/metaPixel";
import { trackAddedToCart } from "@/lib/klaviyoOnsite";
import { announceBagAdd } from "@/lib/glueOffer";
import { perkKindOf, type PerkKind } from "@/lib/perks";
import { bagTotals } from "@/lib/bagTotals";
import { freeShippingThreshold } from "@/lib/shipping";
import {
  FREE_DELIVERY_CODE,
  OFFER_ENDS,
  OFFER_MINUTES,
  deliveryCount,
  inFreeDeliveryCountry,
  offerEndsAt,
  wantedDelivery,
} from "@/lib/freeDelivery";
import { startDeliveryOffer } from "@/lib/deliveryOffer.functions";

export interface CartItem {
  lineId: string | null;
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
  /** Cart line attributes, e.g. the multi-buy tier picked on the product page. */
  attributes?: CartLineAttributes;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  /** Resolves true once Shopify has accepted the line. `quiet` skips the
   *  add announcement (Buy now: the shopper is already off to checkout, so no
   *  add-on popup should open behind them). */
  addItem: (item: Omit<CartItem, "lineId">, opts?: { quiet?: boolean }) => Promise<boolean>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCountry: (countryCode: string) => Promise<void>;
  /** Shopify's own totals and discount lines for the current cart. */
  totals: CartTotals | null;
  refreshTotals: () => Promise<void>;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
  /** Resolve a checkout URL that is valid right now, rebuilding the cart if needed. */
  resolveCheckoutUrl: () => Promise<string | null>;
  /** Change a line's variant in place (size/colour edit), keeping its quantity. */
  swapVariant: (
    variantId: string,
    next: { variantId: string; variantTitle: string; price: { amount: string; currencyCode: string }; selectedOptions: Array<{ name: string; value: string }> },
  ) => Promise<void>;
  /** Discount codes currently applied on the Shopify cart. */
  discountCodes: string[];
  applyDiscountCode: (code: string) => Promise<void>;
  removeDiscountCode: (code: string) => Promise<void>;
  /** Multi-buy perks (lib/perks, PerkSync): the perks the shopper took out
   *  (X or the toggle), so they aren't put back, and whether they switched
   *  the £3.49 shipping protection on. Both reset with the bag. */
  perksDismissed: PerkKind[];
  protectionOptIn: boolean;
  setPerkPrefs: (p: { perksDismissed?: PerkKind[]; protectionOptIn?: boolean }) => void;
  /** PerkSync only: make the bag's perk lines exactly these - the ones
   *  Shopify holds - leaving every other line alone. Writes nothing when they
   *  already match, so it can't loop. No Meta AddToCart, no add-on popup. */
  mirrorPerkLines: (perks: CartItem[]) => void;
  /** v224 (lib/freeDelivery): when this bag's 10-minute offer started - its
   *  first add of an item that counts. Never reset, not even by emptying the
   *  bag, so the minutes never restart. */
  offerStartedAt: number | null;
  /** v226: the bag's own offer code (lib/deliveryOffer.functions), which
   *  Shopify ends with the minutes. Kept, like offerStartedAt. */
  offerCode: string | null;
  /** v224: the site's free-delivery code on the Shopify cart, and whether
   *  Shopify applies it - the bag only says "free" when it does. */
  deliveryCode: string | null;
  deliveryCodeApplies: boolean;
  /** v224: puts the free-delivery code this bag should have on the cart (or
   *  takes it off). A Shopify call only when that changes. */
  syncDeliveryCode: () => Promise<void>;
}

/* v224: free-delivery code syncs run one at a time, in order. v227: one that
   fails (Shopify busy, say) is tried again a few times, so the bag's code
   isn't left stale until the next change. */
let deliveryQueue: Promise<void> = Promise.resolve();
let deliveryRetries = 0;
/* The exact bag Shopify last refused the code for, so it isn't asked again
   until something changes. */
let refusedKey: string | null = null;

/* v226: the bag's own offer code, asked for once per offer (by its start
   time, so a code always ends with the timer it was made for) - an add that
   starts the offer asks alongside its own Shopify call. syncDeliveryCode
   keeps it with the bag. A failed ask isn't repeated for a minute. */
type OfferAsk = { startedAt: number; code: Promise<string | null> };
let offerAsk: OfferAsk | null = null;
let offerAskFailedAt = 0;
function askOfferCode(startedAt: number): Promise<string | null> {
  if (offerAsk?.startedAt === startedAt) return offerAsk.code;
  const leftMs = Math.round(offerEndsAt(startedAt) - Date.now());
  if (leftMs < 1000 || Date.now() - offerAskFailedAt < 60_000) return Promise.resolve(null);
  const ask: OfferAsk = { startedAt, code: Promise.resolve(null) };
  ask.code = startDeliveryOffer({ data: { leftMs: Math.min(leftMs, OFFER_MINUTES * 60_000) } })
    .then((r) => r?.code ?? null, () => null)
    .then((code) => {
      if (!code) {
        offerAskFailedAt = Date.now();
        if (offerAsk === ask) offerAsk = null;
      }
      return code;
    });
  offerAsk = ask;
  return ask.code;
}

/*
 * v225: one bag across tabs. Each tab keeps its own copy of the bag in memory
 * and saves the whole of it (auvella-cart) on every change, so a tab working
 * from an old copy - opened before another tab's first add, or in the
 * background while another tab changed the bag - started a second Shopify
 * cart or put back lines that had gone, and its save replaced the bag. Now
 * every read and save the bag's actions make starts from the latest save
 * (latestFirst), and a tab on screen takes another tab's save at once.
 */
const BAG_KEY = "auvella-cart";
/** The save this tab last wrote or read. */
let seenBag: string | null = null;

/** localStorage, noting what this tab saved or loaded. */
function trackSaves(ls: Storage): StateStorage {
  return {
    getItem: (name) => (seenBag = ls.getItem(name)),
    setItem: (name, value) => {
      ls.setItem(name, value);
      seenBag = value;
    },
    removeItem: (name) => {
      ls.removeItem(name);
      seenBag = null;
    },
  };
}

/** Take another tab's save, if there has been one since this tab's last. */
function catchUp() {
  try {
    if (localStorage.getItem(BAG_KEY) === seenBag) return;
  } catch {
    return; // storage blocked: this tab's bag is the only one
  }
  void useCartStore.persist?.rehydrate();
}

type LatestFirst = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = [],
>(
  f: StateCreator<T, Mps, Mcs>,
) => StateCreator<T, Mps, Mcs>;
/** The store's own get and set, each after catchUp. */
const latestFirst = ((f: StateCreator<unknown, [], []>): StateCreator<unknown, [], []> =>
  (set, get, api) => {
    const freshSet = ((...a: Parameters<typeof set>) => {
      catchUp();
      set(...a);
    }) as typeof set;
    const freshGet: typeof get = () => {
      catchUp();
      return get();
    };
    return f(freshSet, freshGet, api);
  }) as unknown as LatestFirst;

export const useCartStore = create<CartStore>()(
  persist(
    latestFirst((set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      totals: null,
      isLoading: false,
      isSyncing: false,
      discountCodes: [],
      perksDismissed: [],
      protectionOptIn: false,
      offerStartedAt: null,
      offerCode: null,
      deliveryCode: null,
      deliveryCodeApplies: false,

      setPerkPrefs: (p) => set(p),

      syncDeliveryCode: () => {
        if (typeof window === "undefined") return Promise.resolve();
        const run = async () => {
          let s = get();
          if (!s.cartId) {
            if (s.deliveryCode || s.deliveryCodeApplies) set({ deliveryCode: null, deliveryCodeApplies: false });
            return;
          }
          const country = storefrontCountry();
          const kindOf = (bag: CartStore) => {
            const { payable, baseCurrency } = bagTotals(bag.items, bag.totals, "GBP", bag.discountCodes);
            return wantedDelivery({
              items: bag.items,
              country,
              payable,
              threshold: freeShippingThreshold(baseCurrency),
              startedAt: bag.offerStartedAt,
            });
          };
          // v226: the offer's code is this bag's own (askOfferCode) - unless
          // another tab already got one for it.
          if (kindOf(s) === "offer" && !s.offerCode && s.offerStartedAt != null) {
            const code = await askOfferCode(s.offerStartedAt);
            s = get();
            if (code && !s.offerCode) {
              set({ offerCode: code });
              s = get();
            }
          }
          const cartId = s.cartId;
          if (!cartId) return;
          const kind = kindOf(s);
          const want = kind === "2plus" ? FREE_DELIVERY_CODE : kind === "offer" ? s.offerCode : null;
          if (want === s.deliveryCode && (want === null || s.deliveryCodeApplies)) return;
          const key = [cartId, want, cartLineKey(s.items), country, s.discountCodes.join(",")].join("|");
          if (want && key === refusedKey) return;
          try {
            const res = await setShopifyDiscountCodes(cartId, s.discountCodes, want ? [want] : []);
            const applies = !!want && res.kept.some((k) => k.code.toUpperCase() === want && k.applicable);
            refusedKey = want && !applies ? key : null;
            const sameCodes = res.applied.join("|") === s.discountCodes.join("|");
            deliveryRetries = 0;
            set({
              deliveryCode: applies ? want : null,
              deliveryCodeApplies: applies,
              ...(sameCodes ? {} : { discountCodes: res.applied }),
            });
          } catch (e) {
            console.warn("Free delivery code not updated:", e);
            if (deliveryRetries++ < 3) setTimeout(() => void get().syncDeliveryCode(), 3000);
          }
        };
        deliveryQueue = deliveryQueue.then(run, run);
        return deliveryQueue;
      },

      mirrorPerkLines: (perks) => {
        const items = get().items;
        const current = items.filter((i) => perkKindOf(i.variantId));
        const same =
          current.length === perks.length &&
          current.every((c) =>
            perks.some(
              (p) =>
                p.variantId === c.variantId &&
                p.lineId === c.lineId &&
                p.quantity === c.quantity &&
                p.price.amount === c.price.amount,
            ),
          );
        if (same) return;
        set({ items: [...items.filter((i) => !perkKindOf(i.variantId)), ...perks] });
      },

      addItem: async (item, opts) => {
        // v225: the latest save (latestFirst) - a cart another tab made since
        // this one loaded is this tab's too, and so is the offer's start time.
        const { items, cartId, clearCart, offerStartedAt } = get();
        // v226: an add that starts the offer starts it as it's tapped, and
        // asks for the offer's code alongside its own Shopify call.
        const offerStart = Date.now();
        if (
          offerStartedAt == null &&
          offerStart < OFFER_ENDS &&
          deliveryCount([item]).counted === 1 &&
          inFreeDeliveryCountry(storefrontCountry())
        ) {
          void askOfferCode(offerStart);
        }
        const existing = items.find((i) => i.variantId === item.variantId);
        set({ isLoading: true });
        // Only report AddToCart to Meta once Shopify has actually accepted the
        // line — a failed or recovered-from-error add is not a cart addition.
        let added = false;
        try {
          if (!cartId) {
            const result = await createShopifyCart({
              variantId: item.variantId,
              quantity: item.quantity,
              attributes: item.attributes,
            });
            if (result) {
              set({
                cartId: result.cartId,
                checkoutUrl: result.checkoutUrl,
                items: [{ ...item, lineId: result.lineId }],
              });
              added = true;
            }
          } else if (existing) {
            const newQty = existing.quantity + item.quantity;
            if (!existing.lineId) return false;
            // A new attribute (the latest tier picked) replaces the line's old one.
            const result = await updateShopifyCartLine(
              cartId,
              existing.lineId,
              newQty,
              item.attributes,
            );
            if (result.success) {
              const current = get().items;
              set({
                items: current.map((i) =>
                  i.variantId === item.variantId
                    ? {
                        ...i,
                        quantity: newQty,
                        ...(item.attributes ? { attributes: item.attributes } : {}),
                      }
                    : i,
                ),
              });
              added = true;
            } else if (result.cartNotFound) {
              clearCart();
            }
          } else {
            const result = await addLineToShopifyCart(cartId, {
              variantId: item.variantId,
              quantity: item.quantity,
              attributes: item.attributes,
            });
            if (result.success) {
              const current = get().items;
              set({ items: [...current, { ...item, lineId: result.lineId ?? null }] });
              added = true;
            } else if (result.cartNotFound) {
              clearCart();
            }
          }
        } catch (e) {
          console.error("Failed to add item:", e);
        } finally {
          set({ isLoading: false });
        }

        if (added) {
          const unitPrice = Number(item.price.amount) || 0;
          const contentId = metaContentId(item.variantId);
          trackMetaEvent("AddToCart", {
            value: unitPrice * item.quantity,
            currency: item.price.currencyCode,
            content_type: "product",
            content_name: item.product?.node?.title,
            content_ids: [contentId],
            contents: [
              { id: contentId, quantity: item.quantity, item_price: unitPrice },
            ],
          });
          // Klaviyo Added to Cart (v186) - shopper adds only: perk lines,
          // quantity steps, swaps and checkout rebuilds don't come through here.
          trackAddedToCart(item, get().items, get().checkoutUrl);
          // Lets the Body Adhesive popup react to strapless/backless adds.
          if (!opts?.quiet) announceBagAdd(item.product.node.handle);
          // v224: the offer's minutes start with the bag's first item that
          // counts (lib/freeDelivery) - once, ever, for this bag.
          if (get().offerStartedAt == null && offerStart < OFFER_ENDS && deliveryCount([item]).counted > 0) {
            set({ offerStartedAt: offerStart });
          }
          // v224: the right free-delivery code on the cart before the caller
          // toasts. Buy now (quiet) doesn't wait here: checkout's link waits
          // for it alongside its own call (resolveCheckoutUrl).
          if (opts?.quiet) void get().syncDeliveryCode();
          else await get().syncDeliveryCode();
        }
        return added;
      },

      updateQuantity: async (variantId, quantity) => {
        if (quantity <= 0) {
          await get().removeItem(variantId);
          return;
        }
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item?.lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const result = await updateShopifyCartLine(cartId, item.lineId, quantity);
          if (result.success) {
            const current = get().items;
            set({
              items: current.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
            });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      removeItem: async (variantId) => {
        const { items, cartId, clearCart } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item?.lineId || !cartId) return;
        set({ isLoading: true });
        try {
          const result = await removeLineFromShopifyCart(cartId, item.lineId);
          if (result.success) {
            const current = get().items;
            const next = current.filter((i) => i.variantId !== variantId);
            if (next.length === 0) clearCart();
            else set({ items: next });
          } else if (result.cartNotFound) {
            clearCart();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      swapVariant: async (variantId, next) => {
        const { items, cartId } = get();
        const item = items.find((i) => i.variantId === variantId);
        if (!item || next.variantId === variantId) return;
        // Local-only cart (no Shopify id yet): just rewrite the line.
        if (!cartId || !item.lineId) {
          set({
            items: items.map((i) => (i.variantId === variantId ? { ...i, ...next } : i)),
          });
          return;
        }
        set({ isLoading: true });
        try {
          /*
           * The new variant already has its own line. Shopify merges two lines
           * only when their attributes match too, and lines from the product
           * page carry the multi-buy tier, so a swap could leave two lines for
           * one variant while the bag shows one. Remove this line and add its
           * quantity to the existing one instead.
           */
          const target = get().items.find((i) => i.variantId === next.variantId);
          if (target?.lineId) {
            const removed = await removeLineFromShopifyCart(cartId, item.lineId);
            if (!removed.success) return;
            const qty = target.quantity + item.quantity;
            const updated = await updateShopifyCartLine(cartId, target.lineId, qty);
            set({
              items: get()
                .items.filter((i) => i.variantId !== variantId)
                .map((i) =>
                  i.variantId === next.variantId && updated.success ? { ...i, quantity: qty } : i,
                ),
            });
            return;
          }
          const res = await swapShopifyCartLine(cartId, item.lineId, next.variantId, item.quantity);
          const current = get().items;
          // If the new variant was already in the bag Shopify merged the two
          // lines; reflect that by dropping the old entry and taking Shopify's
          // quantity for the survivor rather than adding ours on top.
          const existing = current.find((i) => i.variantId === next.variantId);
          const merged = current
            .filter((i) => i.variantId !== variantId)
            .map((i) =>
              i.variantId === next.variantId && res
                ? { ...i, lineId: res.lineId, quantity: res.quantity }
                : i,
            );
          if (!existing) {
            merged.splice(current.findIndex((i) => i.variantId === variantId), 0, {
              ...item,
              ...next,
              lineId: res?.lineId ?? item.lineId,
              quantity: res?.quantity ?? item.quantity,
            });
          }
          set({ items: merged });
        } finally {
          set({ isLoading: false });
        }
      },

      applyDiscountCode: async (code) => {
        const { cartId, discountCodes, deliveryCode } = get();
        const clean = code.trim().toUpperCase();
        if (!cartId || !clean) throw new Error("Add something to your bag first.");
        const next = [...new Set([...discountCodes, clean])];
        // v224: the site's free-delivery code rides along (lib/shopify).
        const res = await setShopifyDiscountCodes(cartId, next, deliveryCode ? [deliveryCode] : []);
        set({ discountCodes: res.applied, ...deliveryAfter(res, deliveryCode) });
      },

      removeDiscountCode: async (code) => {
        const { cartId, discountCodes, deliveryCode } = get();
        if (!cartId) return;
        const res = await setShopifyDiscountCodes(
          cartId,
          discountCodes.filter((c) => c !== code),
          deliveryCode ? [deliveryCode] : [],
        );
        set({ discountCodes: res.applied, ...deliveryAfter(res, deliveryCode) });
      },

      // v224: offerStartedAt stays - emptying the bag never restarts the offer
      // (v226: nor gets it a new code).
      clearCart: () =>
        set({
          items: [],
          cartId: null,
          checkoutUrl: null,
          discountCodes: [],
          perksDismissed: [],
          protectionOptIn: false,
          deliveryCode: null,
          deliveryCodeApplies: false,
        }),
      /* The shopper changed country: move the existing Shopify cart to that
         market so checkout opens in the right currency. */
      syncCountry: async (countryCode: string) => {
        const { cartId } = get();
        if (!cartId) return;
        const url = await updateShopifyCartCountry(cartId, countryCode);
        if (url) set({ checkoutUrl: url });
        await get().refreshTotals();
      },
      refreshTotals: async () => {
        const { cartId } = get();
        if (!cartId) {
          if (get().totals) set({ totals: null });
          return;
        }
        try {
          const t = await fetchCartTotals(cartId);
          if (!t) return;
          // Line prices come back in the market's currency: keep the bag's
          // lines on the same numbers checkout will use. Only write when
          // something changed, so this can't loop.
          // Merge into the lines as they are NOW: a line added during the
          // fetch (a perk) must not be dropped by an older copy (v184).
          let changed = false;
          const next = get().items.map((i) => {
            const p = t.linePrices[i.variantId];
            if (p && (p.amount !== i.price.amount || p.currencyCode !== i.price.currencyCode)) {
              changed = true;
              return { ...i, price: p };
            }
            return i;
          });
          set(changed ? { totals: t, items: next, ...(t.checkoutUrl ? { checkoutUrl: t.checkoutUrl } : {}) } : { totals: t, ...(t.checkoutUrl ? { checkoutUrl: t.checkoutUrl } : {}) });
        } catch (e) {
          console.warn("Cart totals unavailable:", e);
        }
      },
      getCheckoutUrl: () => get().checkoutUrl,

      /*
       * The persisted checkoutUrl is written once, when the cart is created, and
       * then survives in localStorage indefinitely. Shopify carts expire (and are
       * consumed once an order completes), after which that URL answers 404 —
       * which is what a shopper sees if they come back to an old bag and press
       * checkout. So resolve the URL at click time instead of trusting the stored
       * one: ask Shopify for the cart's current URL, and if the cart is gone,
       * rebuild it from the lines still in the bag.
       */
      resolveCheckoutUrl: async () => {
        const { cartId, items, checkoutUrl } = get();
        // v224: the bag's free-delivery code is put right (a Shopify call only
        // if it changes) alongside the link's own call, so the tap waits no
        // longer.
        const delivery = get().syncDeliveryCode().catch(() => {});

        // v220: this tap's link carries the cookie choice (lib/shopify,
        // visitorConsent). The stored copy doesn't: it can outlive a change
        // of mind, and Klaviyo's bag emails use it.
        const linkFor = async (id: string) => {
          const data = await storefrontApiRequest(CART_QUERY, { id }, { visitorConsent: true });
          const cart = data?.data?.cart;
          if (!cart?.checkoutUrl || !(cart.totalQuantity > 0)) return null;
          const fresh = formatCheckoutUrl(cart.checkoutUrl);
          set({ checkoutUrl: withoutVisitorConsent(fresh) });
          return fresh;
        };

        if (cartId) {
          try {
            const [fresh] = await Promise.all([linkFor(cartId), delivery]);
            if (fresh) return fresh;
          } catch (e) {
            // Network failure is not proof the cart is dead — fall back to the
            // stored URL rather than rebuilding and orphaning a good cart.
            console.error("Checkout URL refresh failed:", e);
            return checkoutUrl;
          }
        }

        if (!items.length) return null;

        const rebuilt = await recreateShopifyCart(
          items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            attributes: i.attributes,
          })),
        );
        if (!rebuilt) return checkoutUrl;

        set({
          cartId: rebuilt.cartId,
          checkoutUrl: rebuilt.checkoutUrl,
          items: items.map((i) => ({
            ...i,
            lineId: rebuilt.lineIdByVariant[i.variantId] ?? i.lineId,
          })),
          deliveryCode: null,
          deliveryCodeApplies: false,
        });
        // v224: a new cart has no codes - its free-delivery code first.
        await delivery;
        await get().syncDeliveryCode().catch(() => {});
        // v220: the rebuilt cart's link with the choice too.
        return (await linkFor(rebuilt.cartId).catch(() => null)) ?? rebuilt.checkoutUrl;
      },

      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;
        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
          if (!data) return;
          const cart = data?.data?.cart;
          // v225: only while it is still the bag's cart - another tab may
          // have moved the bag to a new one meanwhile.
          if ((!cart || cart.totalQuantity === 0) && get().cartId === cartId) clearCart();
        } catch (e) {
          console.error("Sync failed:", e);
        } finally {
          set({ isSyncing: false });
        }
      },
    })),
    {
      name: BAG_KEY,
      storage: createJSONStorage(() => trackSaves(localStorage)),
      // Keep SSR and the first client render identical; persisted cart contents
      // are restored manually after mount from the root component.
      skipHydration: true,
      partialize: (state) => ({
        discountCodes: state.discountCodes,
        items: state.items,
        cartId: state.cartId,
        checkoutUrl: state.checkoutUrl,
        perksDismissed: state.perksDismissed,
        protectionOptIn: state.protectionOptIn,
        offerStartedAt: state.offerStartedAt,
        offerCode: state.offerCode,
        deliveryCode: state.deliveryCode,
        deliveryCodeApplies: state.deliveryCodeApplies,
      }),
    },
  ),
);

/** v224: the delivery-code state after a shopper's code change (lib/shopify). */
function deliveryAfter(res: { kept: Array<{ code: string; applicable: boolean }> }, code: string | null) {
  if (!code) return {};
  const applies = res.kept.some((k) => k.code.toUpperCase() === code.toUpperCase() && k.applicable);
  return { deliveryCode: applies ? code : null, deliveryCodeApplies: applies };
}

/* After any change to the bag's lines or codes, ask Shopify for its totals.
   Debounced so a run of quantity taps costs one request. */
let totalsTimer: ReturnType<typeof setTimeout> | undefined;
useCartStore.subscribe((state, prev) => {
  if (state.items === prev.items && state.cartId === prev.cartId && state.discountCodes === prev.discountCodes) return;
  if (typeof window === "undefined") return;
  clearTimeout(totalsTimer);
  totalsTimer = setTimeout(() => void useCartStore.getState().refreshTotals(), 300);
});

/* v224: keep the free-delivery code right as the bag changes (lines, codes,
   Shopify's totals, the shipping country - which re-prices the totals), and
   take the offer's code off the moment its minutes end. A tab that slept
   through the end catches up when it is shown again. */
let deliveryTimer: ReturnType<typeof setTimeout> | undefined;
let offerEndTimer: ReturnType<typeof setTimeout> | undefined;
useCartStore.subscribe((state, prev) => {
  if (typeof window === "undefined") return;
  if (state.offerStartedAt !== prev.offerStartedAt) {
    clearTimeout(offerEndTimer);
    const ms = offerEndsAt(state.offerStartedAt) - Date.now();
    if (ms > 0 && ms < 2 ** 31) {
      offerEndTimer = setTimeout(() => void useCartStore.getState().syncDeliveryCode(), ms + 250);
    }
  }
  if (
    state.items === prev.items &&
    state.cartId === prev.cartId &&
    state.totals === prev.totals &&
    state.discountCodes === prev.discountCodes &&
    state.offerStartedAt === prev.offerStartedAt
  )
    return;
  clearTimeout(deliveryTimer);
  deliveryTimer = setTimeout(() => void useCartStore.getState().syncDeliveryCode(), 400);
});
/* v225: a tab on screen takes another tab's save at once, one in the
   background when it is shown again (its own reads and saves catch up
   anyway). Not before the root component's first restore, so the first render
   still matches the server's. */
const catchUpOnScreen = () => {
  if (document.visibilityState === "visible" && useCartStore.persist?.hasHydrated()) catchUp();
};
if (typeof document !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === BAG_KEY || e.key === null) catchUpOnScreen();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    catchUpOnScreen();
    void useCartStore.getState().syncDeliveryCode();
  });
}
