import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useFavorites } from "@/stores/favoritesStore";

/*
 * Header Favourites heart — SKIMS-style, next to search/account/bag.
 * Count badge matches the cart badge. Hydration-safe: the count comes
 * from localStorage, so render it only after mount to avoid an
 * SSR/client mismatch.
 */
export function FavouritesButton() {
  const count = useFavorites((s) => s.handles.length);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Link
      to="/favourites"
      aria-label="Favourites"
      className="relative transition-opacity hover:opacity-60"
    >
      <Heart className="h-[18px] w-[18px]" strokeWidth={1.5} />
      {mounted && count > 0 && (
        <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] text-cream">
          {count}
        </span>
      )}
    </Link>
  );
}
