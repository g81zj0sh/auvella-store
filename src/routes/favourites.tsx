import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ProductCard } from "@/components/site/ProductCard";
import { fetchProductByHandle, type ShopifyProduct } from "@/lib/shopify";
import { useFavorites } from "@/stores/favoritesStore";
import { isLoggedIn, startLogin, ACCOUNTS_READY } from "@/lib/customerAuth";

/*
 * Favourites — the customer's saved pieces (never "wishlist" in the UI).
 *
 * Sharing: SKIMS-style "Share Favourites" top-right, gated behind an
 * account. The link encodes product handles (?shared=h1,h2), and the
 * recipient sees a read-only "Shared Favourites" view of those pieces
 * with hearts to save them into their own list.
 */

interface FavSearch {
  shared?: string;
}

export const Route = createFileRoute("/favourites")({
  validateSearch: (search: Record<string, unknown>): FavSearch => ({
    shared: typeof search.shared === "string" && search.shared.length > 0 ? search.shared : undefined,
  }),
  component: FavouritesPage,
});

function useProductsByHandles(handles: string[]) {
  return useQuery({
    queryKey: ["favourites-products", handles],
    queryFn: async () => {
      const results = await Promise.all(handles.map((h) => fetchProductByHandle(h)));
      return results.filter((p): p is ShopifyProduct => p !== null);
    },
    enabled: handles.length > 0,
    staleTime: 60 * 1000,
  });
}

function FavouritesPage() {
  const { shared } = Route.useSearch();
  return shared ? <SharedView sharedParam={shared} /> : <OwnView />;
}

/* ------------------------------ Own list ------------------------------ */

function OwnView() {
  const handles = useFavorites((s) => s.handles);
  const { data: products, isLoading } = useProductsByHandles(handles);
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (handles.length === 0) return;
    if (ACCOUNTS_READY && !isLoggedIn()) {
      // Straight to the hosted sign-in (SKIMS behaviour) — and come back
      // here afterwards rather than landing on the account page.
      startLogin("/favourites");
      return;
    }
    setSharing(true);
    const url = `${window.location.origin}/favourites?shared=${encodeURIComponent(handles.join(","))}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Auvella Favourites", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied — send it to anyone", { position: "top-center" });
      }
    } catch {
      /* user dismissed the share sheet */
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-7xl pb-24 pt-32 md:pt-40">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-[30px] font-semibold tracking-[0.04em] text-[#0a0a0a] md:text-5xl">
            FAVOURITES
          </h1>
          {handles.length > 0 && (
            <button
              onClick={onShare}
              disabled={sharing}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0a0a0a] transition-opacity hover:opacity-60 md:text-[11px]"
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" strokeWidth={1.6} />
              )}
              Share Favourites
            </button>
          )}
        </div>
        <p className="mt-2.5 text-[12px] uppercase tracking-[0.14em] text-[#888888]">
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
          <SkeletonGrid count={handles.length} />
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

/* --------------------------- Shared (recipient) ------------------------ */

function SharedView({ sharedParam }: { sharedParam: string }) {
  const handles = sharedParam
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
    .slice(0, 60);
  const { data: products, isLoading } = useProductsByHandles(handles);
  const favHandles = useFavorites((s) => s.handles);
  const toggle = useFavorites((s) => s.toggle);

  const saveAll = () => {
    let added = 0;
    for (const h of handles) {
      if (!favHandles.includes(h)) {
        toggle(h);
        added++;
      }
    }
    toast.success(
      added > 0 ? `Saved ${added} ${added === 1 ? "piece" : "pieces"} to your favourites` : "Already in your favourites",
      { position: "top-center" },
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-7xl pb-24 pt-32 md:pt-40">
        <div>
          <h1 className="font-serif text-[30px] font-semibold tracking-[0.05em] text-[#0a0a0a] md:text-5xl">
            SHARED FAVOURITES
          </h1>
          <p className="mt-2.5 text-[12px] uppercase tracking-[0.14em] text-[#888888]">
            A friend sent you their Auvella picks — {handles.length}{" "}
            {handles.length === 1 ? "Item" : "Items"}
          </p>
          <button
            onClick={saveAll}
            className="mt-5 inline-flex h-10 items-center whitespace-nowrap border border-[#0a0a0a] px-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a0a0a] transition hover:bg-[#0a0a0a] hover:text-white"
          >
            Save All To My Favourites
          </button>
        </div>

        {isLoading ? (
          <SkeletonGrid count={handles.length} />
        ) : !products || products.length === 0 ? (
          <p className="mt-16 text-[13px] text-[#888888]">
            This shared list doesn't seem to have any available pieces right now.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.node.handle} product={p} />
            ))}
          </div>
        )}

        <div className="mt-16 border-t border-[#EBEBEB] pt-8 text-center">
          <Link
            to="/favourites"
            className="text-[11px] uppercase tracking-[0.16em] text-[#0a0a0a] underline underline-offset-4 transition-opacity hover:opacity-60"
          >
            View My Own Favourites
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse bg-[#f5f5f5]" />
      ))}
    </div>
  );
}
