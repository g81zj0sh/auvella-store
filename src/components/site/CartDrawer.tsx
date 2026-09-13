import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ShoppingBag, Minus, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { useDisplayPrice, useT } from "@/lib/preferences";
import { freeShippingThreshold, useShippingCountry } from "@/lib/shipping";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const { items, isLoading, isSyncing, updateQuantity, removeItem, getCheckoutUrl, syncCart } =
    useCartStore();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + parseFloat(i.price.amount) * i.quantity, 0);
  const display = useDisplayPrice();
  const t = useT();
  const baseCurrency = items[0]?.price.currencyCode ?? "GBP";

  /*
   * Free-shipping progress.
   *
   * The threshold comes from the same helper the announcement bar and PDP use,
   * so the drawer can never advertise a different number from the rest of the
   * site. Shopify's delivery profile is the real gate (75 GBP across all three
   * zones); this is the shopper-facing mirror of it, converted into whatever
   * currency they are browsing in.
   */
  const { country } = useShippingCountry();
  const threshold = freeShippingThreshold(baseCurrency);
  const remaining = Math.max(0, threshold - totalPrice);
  const qualified = totalPrice >= threshold;
  const progress = threshold > 0 ? Math.min(100, (totalPrice / threshold) * 100) : 0;

  useEffect(() => {
    if (open) syncCart();
  }, [open, syncCart]);

  const handleCheckout = () => {
    const url = getCheckoutUrl();
    if (url) {
      window.open(url, "_blank");
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button aria-label="Cart" className="relative transition-opacity hover:opacity-60">
          <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.5} />
          <span className="absolute -top-1.5 -right-2 text-[10px] bg-ink text-cream rounded-full h-4 min-w-4 px-1 grid place-items-center">
            {totalItems}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full bg-cream">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="font-serif text-2xl text-ink">{t("Your Bag")}</SheetTitle>
          <SheetDescription>
            {totalItems === 0 ? t("Your bag is empty") : `${totalItems} item${totalItems !== 1 ? "s" : ""}`}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col flex-1 pt-6 min-h-0">
          {items.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("Your bag is empty")}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                <div className="space-y-5">
                  {items.map((item) => (
                    <div key={item.variantId} className="flex gap-4">
                      <div className="w-20 h-24 bg-beige overflow-hidden flex-shrink-0">
                        {item.product.node.images?.edges?.[0]?.node && (
                          <img
                            src={item.product.node.images.edges[0].node.url}
                            alt={item.product.node.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-serif text-ink truncate">{item.product.node.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.selectedOptions.map((o) => o.value).join(" · ")}
                        </p>
                        <p className="font-medium text-ink mt-1">
                          {display(item.price.amount, item.price.currencyCode)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <button
                            className="ml-auto text-muted-foreground hover:text-ink"
                            onClick={() => removeItem(item.variantId)}
                            aria-label="Remove"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 space-y-4 pt-4 border-t border-border bg-cream">
                <div>
                  <p className="text-[11px] leading-relaxed text-cocoa">
                    {qualified ? (
                      <>
                        <span className="font-medium text-ink">Free shipping unlocked</span>
                        {" \u2014 your order is over "}
                        {display(threshold, baseCurrency)}
                        {country?.name ? ` to ${country.name}` : ""}.
                      </>
                    ) : (
                      <>
                        {"You're "}
                        <span className="font-medium text-ink">
                          {display(remaining, baseCurrency)}
                        </span>
                        {" away from free shipping"}
                        {country?.name ? ` to ${country.name}` : ""}.
                      </>
                    )}
                  </p>
                  <div
                    className="mt-2 h-[3px] w-full overflow-hidden bg-beige"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress)}
                    aria-label="Progress towards free shipping"
                  >
                    <div
                      className="h-full bg-ink transition-[width] duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm uppercase tracking-[0.2em] text-cocoa">{t("Subtotal")}</span>
                  <span className="text-xl font-serif text-ink">
                    {display(totalPrice, baseCurrency)}
                  </span>
                </div>
                <Button
                  onClick={handleCheckout}
                  className="w-full bg-ink text-cream hover:bg-cocoa uppercase tracking-[0.2em] text-xs py-6 rounded-none"
                  disabled={items.length === 0 || isLoading || isSyncing}
                >
                  {isLoading || isSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {t("Checkout")}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
