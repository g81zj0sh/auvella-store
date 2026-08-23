import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { fetchProductByHandle, type ShopifyProduct } from "@/lib/shopify";
import { useFavorites } from "@/stores/favoritesStore";

/*
 * Favourites — the customer's saved pieces (never call it "wishlist" in the
 * UI). Products are stored as handles in localStorage and fetched fresh so
 * prices/stock are always current. Sharing comes later and will require an
 * account.
 */

export const Route = createFileRoute("/favourites")({
  component: FavouritesPage,
});

function FavouritesPage() {
  const handles = useFavorites((s) => s.handles);

  const { data: products, isLoading } = useQuery({
    queryKey: ["favourites", handles],
    queryFn: async () => {
      const results = await Promise.all(handles.map((h) => fetchProductByHandle(h)));
      return results.filter((p): p is ShopifyProduct => p !== null);
    },
    enabled: handles.length > 0,
    staleTime: 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-7xl pb-24 pt-32 md:pt-40">
        <h1 className="font-serif text-4xl font-light tracking-[0.08em] text-[#0a0a0a] md:text-5xl">
          FAVOURITES
        </h1>
        <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-[#888888]">
          {handles.length} {handles.length === 1 ? "Item" : "Items"}
        </p>

        {handles.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <Heart className="h-8 w-8 text-[#cccccc]" strokeWidth={1.2} />
            <p className="mt-5 font-serif text-xl font-light text-[#0a0a0a]">
              Nothing saved yet
            </p>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#888888]">
              Tap the heart on any piece to keep it here — your favourites stay
              saved for whenever you're ready.
            </p>
            <Link
              to="/collections/$handle"
              params={{ handle: "best-sellers" }}
              className="mt-8 inline-flex h-11 items-center bg-[#0a0a0a] px-8 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
            >
              Shop Best Sellers
            </Link>
          </div>
        ) : isLoading ? (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {handles.map((h) => (
              <div key={h} className="aspect-[3/4] animate-pulse bg-[#f5f5f5]" />
            ))}
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {(products ?? []).map((p) => (
              <ProductCard key={p.node.handle} product={p} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
