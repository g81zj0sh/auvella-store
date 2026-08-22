import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { ProductCard } from "@/components/site/ProductCard";
import type { ShopifyProduct } from "@/lib/shopify";

interface Props {
  products: ShopifyProduct[];
  badge: string;
}

export function ProductCarousel({ products, badge }: Props) {
  const [emblaRef, embla] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    breakpoints: {
      "(min-width: 768px)": { slidesToScroll: 2 },
      "(min-width: 1024px)": { slidesToScroll: 4 },
    },
  });
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const onScroll = useCallback(() => {
    if (!embla) return;
    setProgress(Math.max(0, Math.min(1, embla.scrollProgress())));
    setCanPrev(embla.canScrollPrev());
    setCanNext(embla.canScrollNext());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    onScroll();
    embla.on("scroll", onScroll);
    embla.on("reInit", onScroll);
    embla.on("select", onScroll);
    return () => {
      embla.off("scroll", onScroll);
      embla.off("reInit", onScroll);
      embla.off("select", onScroll);
    };
  }, [embla, onScroll]);

  const indicatorWidth = (() => {
    if (!embla) return 50;
    const slideNodes = embla.slideNodes().length || 1;
    const inView = embla.slidesInView().length || 4;
    return Math.max(10, Math.min(100, (inView / slideNodes) * 100));
  })();
  const indicatorOffset = (100 - indicatorWidth) * progress;

  return (
    <div className="mx-auto w-full max-w-[1680px]">
      <div className="overflow-hidden -mr-5 md:mr-0" ref={emblaRef}>
        <div className="flex -mr-3 md:-mr-3">
          {products.map((p) => (
            <div
              key={p.node.id}
              className="shrink-0 grow-0 pr-3 md:pr-3 basis-[82%] sm:basis-[46%] md:basis-1/3 lg:basis-1/4"
            >
              <ProductCard product={p} badge={badge} />
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar + arrows */}
      <div className="mt-5 md:mt-8 flex items-center gap-4 md:gap-6">
        <div className="relative h-[2px] bg-ink/15 overflow-hidden flex-1">
          <div
            className="absolute top-0 h-full bg-ink transition-[left,width] duration-300 ease-out"
            style={{ left: `${indicatorOffset}%`, width: `${indicatorWidth}%` }}
          />
        </div>
        <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
          <button
            type="button"
            aria-label="Previous"
            onClick={() => embla?.scrollPrev()}
            disabled={!canPrev}
            className="h-11 w-11 rounded-full grid place-items-center border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => embla?.scrollNext()}
            disabled={!canNext}
            className="h-11 w-11 rounded-full grid place-items-center border border-ink/20 text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
