import { create } from "zustand";
import type { ShopifyProduct } from "@/lib/shopify";

interface QuickAddStore {
  product: ShopifyProduct | null;
  open: boolean;
  openFor: (p: ShopifyProduct) => void;
  setOpen: (v: boolean) => void;
}

export const useQuickAdd = create<QuickAddStore>((set) => ({
  product: null,
  open: false,
  openFor: (p) => set({ product: p, open: true }),
  setOpen: (v) => set((s) => ({ open: v, product: v ? s.product : s.product })),
}));
