import { useQuery } from "@tanstack/react-query";
import { fetchProductsByHandles } from "@/lib/shopify";
import { HIDDEN_HANDLES, PROTECTION, WASH_BAG } from "@/lib/perks";
import { useDisplayPrice, usePreferences } from "@/lib/preferences";

/*
 * The perks' prices in the shopper's market, formatted (lib/perks), or null
 * when there's no true figure to show:
 * - protection / washBag: what each free gift is worth, struck beside
 *   "FREE" - the gift variant's compare-at in Shopify (£3.49 / £10). Markets
 *   with their own fixed prices (EUR, SEK...) return no compare-at for the
 *   gifts, so there it's the market's real price for the same item (the paid
 *   protection, the £10 Large bag). Shopify is the on/off switch: clear the
 *   compare-at and the paid sibling's price is all that remains, and if
 *   neither exists nothing is struck at all.
 * - paidProtection: the price the opt-in toggle charges.
 * Before Shopify answers, the GBP figures stand in - but only for a shopper
 * seeing GBP; anywhere else nothing shows until the market's figure arrives,
 * so no converted guess is ever struck or agreed to.
 */
export function usePerkValues(enabled = true) {
  const display = useDisplayPrice();
  const currency = usePreferences((s) => s.currency);
  const { data } = useQuery({
    queryKey: ["perk-products"],
    queryFn: () => fetchProductsByHandles(HIDDEN_HANDLES, { includeHidden: true }),
    enabled,
    staleTime: 10 * 60_000,
  });
  const loaded = !!data?.length;
  const variant = (handle: string, id: string) =>
    data?.find((p) => p.node.handle === handle)?.node.variants.edges.find((e) => e.node.id === id)
      ?.node;
  type Money = { amount: string; currencyCode: string } | null | undefined;
  const fmt = (m: Money) =>
    m && parseFloat(m.amount) > 0 ? display(m.amount, m.currencyCode).replace(/\.00$/, "") : null;
  const placeholder = (gbp: string) =>
    !loaded && currency === "GBP" ? display(gbp, "GBP").replace(/\.00$/, "") : null;

  const paid = variant(PROTECTION.handle, PROTECTION.paidVariantId)?.price;
  return {
    protection:
      fmt(variant(PROTECTION.handle, PROTECTION.freeVariantId)?.compareAtPrice) ??
      fmt(paid) ??
      placeholder(PROTECTION.valueGBP),
    washBag:
      fmt(variant(WASH_BAG.handle, WASH_BAG.giftVariantId)?.compareAtPrice) ??
      fmt(variant(WASH_BAG.handle, WASH_BAG.largeVariantId)?.price) ??
      placeholder(WASH_BAG.valueGBP),
    paidProtection: fmt(paid) ?? placeholder(PROTECTION.valueGBP),
  };
}
