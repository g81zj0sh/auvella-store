import { create } from "zustand";
import { persist } from "zustand/middleware";

/*
 * Favourites ("wishlist", but the customer-facing word is always Favourites).
 * Stored as product handles in localStorage so it survives visits without an
 * account. Sharing (which will require an account) comes later.
 */

interface FavoritesStore {
  handles: string[];
  toggle: (handle: string) => void;
  has: (handle: string) => boolean;
  remove: (handle: string) => void;
}

export const useFavorites = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      handles: [],
      toggle: (handle) =>
        set((s) => ({
          handles: s.handles.includes(handle)
            ? s.handles.filter((h) => h !== handle)
            : [...s.handles, handle],
        })),
      has: (handle) => get().handles.includes(handle),
      remove: (handle) => set((s) => ({ handles: s.handles.filter((h) => h !== handle) })),
    }),
    { name: "auvella_favourites_v1" },
  ),
);
