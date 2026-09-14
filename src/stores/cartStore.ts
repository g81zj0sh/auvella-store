import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
} from "@/lib/shopify";
import { metaContentId, trackMetaEvent } from "@/lib/metaPixel";

export interface CartItem {
  lineId: string | null;
  product: ShopifyProduct;
  variantId: string;
  variantTitle: string;
  price: { amount: string; currencyCode: string };
  quantity: number;
  selectedOptions: Array<{ name: string; value: string }>;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  isSyncing: boolean;
  addItem: (item: Omit<CartItem, "lineId">) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  removeItem: (variantId: string) => Promise<void>;
  clearCart: () => void;
  syncCart: () => Promise<void>;
  getCheckoutUrl: () => string | null;
  /** Resolve a checkout URL that is valid right now, rebuilding the cart if needed. */
  resolveCheckoutUrl: () => Promise<string | null>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,
      isSyncing: false,

      addItem: async (item) => {
        const { items, cartId, clearCart } = get();
        const existing = items.find((i) => i.variantId === item.variantId);
        set({ isLoading: true });
        // Only report AddToCart to Meta once Shopify has actually accepted the
        // line — a failed or recovered-from-error add is not a cart addition.
        let added = false;
        try {
          if (!cartId) {
            const result = await createShopifyCart({ variantId: item.variantId, quantity: item.quantity });
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
            if (!existing.lineId) return;
            const result = await updateShopifyCartLine(cartId, existing.lineId, newQty);
            if (result.success) {
              const current = get().items;
              set({
                items: current.map((i) =>
                  i.variantId === item.variantId ? { ...i, quantity: newQty } : i,
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
            content_name: item.product?.title,
            content_ids: [contentId],
            contents: [
              { id: contentId, quantity: item.quantity, item_price: unitPrice },
            ],
          });
        }
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

      clearCart: () => set({ items: [], cartId: null, checkoutUrl: null }),
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

        if (cartId) {
          try {
            const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
            const cart = data?.data?.cart;
            if (cart?.checkoutUrl && cart.totalQuantity > 0) {
              const fresh = formatCheckoutUrl(cart.checkoutUrl);
              set({ checkoutUrl: fresh });
              return fresh;
            }
          } catch (e) {
            // Network failure is not proof the cart is dead — fall back to the
            // stored URL rather than rebuilding and orphaning a good cart.
            console.error("Checkout URL refresh failed:", e);
            return checkoutUrl;
          }
        }

        if (!items.length) return null;

        const rebuilt = await recreateShopifyCart(
          items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        );
        if (!rebuilt) return checkoutUrl;

        set({
          cartId: rebuilt.cartId,
          checkoutUrl: rebuilt.checkoutUrl,
          items: items.map((i) => ({
            ...i,
            lineId: rebuilt.lineIdByVariant[i.variantId] ?? i.lineId,
          })),
        });
        return rebuilt.checkoutUrl;
      },

      syncCart: async () => {
        const { cartId, isSyncing, clearCart } = get();
        if (!cartId || isSyncing) return;
        set({ isSyncing: true });
        try {
          const data = await storefrontApiRequest(CART_QUERY, { id: cartId });
          if (!data) return;
          const cart = data?.data?.cart;
          if (!cart || cart.totalQuantity === 0) clearCart();
        } catch (e) {
          console.error("Sync failed:", e);
        } finally {
          set({ isSyncing: false });
        }
      },
    }),
    {
      name: "auvella-cart",
      storage: createJSONStorage(() => localStorage),
      // Keep SSR and the first client render identical; persisted cart contents
      // are restored manually after mount from the root component.
      skipHydration: true,
      partialize: (state) => ({
        items: state.items,
        cartId: state.cartId,
        checkoutUrl: state.checkoutUrl,
      }),
    },
  ),
);
