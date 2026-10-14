import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isHiddenHandle } from "@/lib/perks";

/*
 * Recently Viewed — product handles the customer has opened (PDP visit or
 * Quick Add), most recent first, capped. Persisted in localStorage like
 * Favourites so it survives visits without an account. Surfaced on the
 * account Order History tab (and reusable anywhere else later).
 */

const MAX_RECENT = 12;

interface RecentlyViewedStore {
  handles: string[];
  record: (handle: string) => void;
  clear: () => void;
}

export const useRecentlyViewed = create<RecentlyViewedStore>()(
  persist(
    (set) => ({
      handles: [],
      record: (handle) =>
        // The hidden perk products (lib/perks) never show as viewed.
        isHiddenHandle(handle)
          ? undefined
          : set((s) => ({
              handles: [handle, ...s.handles.filter((h) => h !== handle)].slice(0, MAX_RECENT),
            })),
      clear: () => set({ handles: [] }),
    }),
    { name: "auvella_recently_viewed_v1" },
  ),
);
