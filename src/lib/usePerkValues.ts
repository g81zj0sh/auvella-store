import { useQuery } from "@tanstack/react-query";
import { fetchProductsByHandles } from "@/lib/shopify";
import { HIDDEN_HANDLES, PROTECTION } from "@/lib/perks";
import { useDisplayPrice, usePreferences } from "@/lib/preferences";

/*
 * The perks' prices in the shopper's market, formatted (lib/perks), or null
 * when there's no true figure to show:
 * - protection: what the free Shipping Protection is worth, struck beside
 *   "FREE" - v239 (owner, 26 Nov 2026): the real price the bag's opt-in
 *   charges for it (£3.49), never a compare-at.
 * - washBag: always null - v239 (owner): the wash bag is never sold on its
 *   own, so it has no real price to strike; it shows just "FREE".
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
  const protection = fmt(paid) ?? placeholder(PROTECTION.valueGBP);
  return {
    protection,
    washBag: null as string | null,
    paidProtection: protection,
  };
}
