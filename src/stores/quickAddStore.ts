import { create } from "zustand";
import type { ShopifyProduct } from "@/lib/shopify";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";
import { isHiddenProduct } from "@/lib/perks";

interface QuickAddStore {
  product: ShopifyProduct | null;
  /** The colour the tile was showing, so the sheet opens on it (v175). */
  color: string | null;
  open: boolean;
  openFor: (p: ShopifyProduct, color?: string | null) => void;
  setOpen: (v: boolean) => void;
}

export const useQuickAdd = create<QuickAddStore>((set) => ({
  product: null,
  color: null,
  open: false,
  openFor: (p, color) => {
    // The hidden perk products (lib/perks) can't be bought on their own.
    if (isHiddenProduct(p.node)) return;
    useRecentlyViewed.getState().record(p.node.handle);
    set({ product: p, color: color ?? null, open: true });
  },
  setOpen: (v) => set((s) => ({ open: v, product: v ? s.product : s.product })),
}));
