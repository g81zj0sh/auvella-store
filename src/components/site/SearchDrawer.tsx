import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { fetchProducts, shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { useDisplayPrice } from "@/lib/preferences";

/* Popular intents — one tap starts a converting search */
const SUGGESTIONS = ["Bodysuit", "Shapewear", "Bra", "Lounge Set", "Pyjamas", "Thong"];

function useDebounced(value: string, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ResultCard({
  p,
  onNavigate,
}: {
  p: ShopifyProduct;
  onNavigate: () => void;
}) {
  const display = useDisplayPrice();
  const img = p.node.images.edges[0]?.node;
  const price = p.node.priceRange.minVariantPrice;
  return (
    <Link
      to="/product/$handle"
      params={{ handle: p.node.handle }}
      onClick={onNavigate}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f5f5]">
        {img && (
          <img
            src={shopifyImg(img.url, 600)}
            alt={img.altText ?? p.node.title}
            loading="lazy"
            className="absolute inset-0 block h-full w-full object-cover object-[center_top] transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
          />
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] uppercase tracking-[0.08em] text-[#0a0a0a]">
        {p.node.title}
      </p>
      <p className="mt-0.5 text-[12px] text-[#555555]">
        {display(price.amount, price.currencyCode)}
      </p>
    </Link>
  );
}

export function SearchDrawer({ light = false }: { light?: boolean }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const q = useDebounced(term.trim());
  const searching = q.length >= 2;

  // Default grid — sell before they type
  const { data: featured = [] } = useQuery({
    queryKey: ["search-default"],
    queryFn: () => fetchProducts(4),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // Live results
  const { data: results = [], isFetching } = useQuery({
    queryKey: ["search", q],
    queryFn: () => fetchProducts(8, q),
    enabled: open && searching,
    staleTime: 60 * 1000,
  });

  const showEmpty = searching && !isFetching && results.length === 0;
  const grid = useMemo(
    () => (searching ? results : featured),
    [searching, results, featured],
  );

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) setTerm("");
  }, [open]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Search"
          className={`transition-opacity hover:opacity-60 ${light ? "text-white" : "text-[#0a0a0a]"}`}
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-[#EBEBEB] bg-white p-0 sm:max-w-md"
      >
        <SheetTitle className="sr-only">Search</SheetTitle>

        {/* Input */}
        <div className="flex items-center gap-3 border-b border-[#EBEBEB] px-5 py-4">
          <Search className="h-[18px] w-[18px] shrink-0 text-[#888888]" strokeWidth={1.5} />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search…"
            className="h-9 w-full bg-transparent text-[16px] md:text-[15px] text-[#0a0a0a] placeholder:text-[#888888] focus:outline-none"
          />
        </div>


        <div className="flex-1 overflow-y-auto px-5 pb-10">
          {/* Suggestions */}
          <div className="pt-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#888888]">Suggestions</p>
            <ul className="mt-3 space-y-2.5">
              {SUGGESTIONS.map((sg) => (
                <li key={sg}>
                  <button
                    onClick={() => setTerm(sg)}
                    className="text-[13px] text-[#555555] transition-colors hover:text-[#0a0a0a] hover:underline hover:underline-offset-4"
                  >
                    {sg}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Results / featured */}
          <div className="pt-8">
            <p className="flex items-center gap-2 text-[13px] font-medium text-[#0a0a0a]">
              {searching ? `Results for “${q}”` : "Are you looking for…"}
              {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#888888]" />}
            </p>

            {showEmpty ? (
              <p className="mt-4 text-[13px] leading-relaxed text-[#555555]">
                Nothing matches “{q}”. Try one of the suggestions above — or browse{" "}
                <Link
                  to="/collections/$handle"
                  params={{ handle: "new-in" }}
                  onClick={close}
                  className="text-[#0a0a0a] underline underline-offset-4"
                >
                  everything new
                </Link>
                .
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-7">
                {grid.map((p) => (
                  <ResultCard key={p.node.id} p={p} onNavigate={close} />
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
