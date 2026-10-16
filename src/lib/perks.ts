import { inDuoDeal } from "@/lib/duoDeal";
import { inBundleDeal } from "@/lib/bundleDeal";

/*
 * Multi-buy perks (v184, owner's brief 14 Oct 2026, after Smooche's offer
 * cards): Buy 2 of a product ("The Daily Rotation") comes with FREE shipping
 * protection, Buy 3+ ("The Full Refresh") also with a FREE Anti-Snag
 * Shapewear Wash Bag. Every bag also offers the protection as an opt-in
 * toggle at £3.49 (off by default - a pre-ticked paid extra isn't consent in
 * the UK, Consumer Contracts Regs 2013 reg 40).
 *
 * How the "free" works: Shopify's own Buy X Get Y discounts don't stack with
 * the Buy 2 15% (tested 14 Oct 2026: Shopify keeps only the bigger one), so
 * each perk has a £0 gift variant in Shopify, and PerkSync puts that variant
 * in the bag while the bag qualifies and takes it out the moment it doesn't -
 * nobody is ever charged for a "free" item. The two products are UNLISTED in
 * Shopify (no search, collections or recommendations), and the storefront
 * hides them everywhere too (isHiddenProduct), so a shopper can't find or
 * buy them on their own here.
 *
 * Known gap (owner accepted, 14 Oct 2026): the qualifying rule lives in the
 * storefront only. Shopify itself will take a £0 gift variant in any cart
 * built directly against its API or a cart permalink. Closing that needs a
 * Shopify cart/checkout validation Function (an app); until then, check
 * orders where a gift ships without 2-3 of one eligible product.
 *
 * Qualifying (PERK_UNLOCK): units of ONE Buy 2 product (DUO_DEAL, same
 * product only, like the 15% rule) - 2+ for the protection, 3+ for the bag -
 * or, on the underwear (v185), pairs across the three bundle styles (any
 * mix, like the 3 for £30 rule) - 3+ for the protection, 5+ for the bag.
 *
 * v185: each gift variant carries its value as Shopify's compare-at price
 * (£3.49 / £10), shown struck beside "FREE" on the cards, the underwear
 * "Free gifts unlocked" tiles, the bag and checkout (owner's ask).
 */

/** When each perk is free: units of one Buy 2 product, or underwear pairs. */
export const PERK_UNLOCK = {
  protection: { duo: 2, bundle: 3 },
  washbag: { duo: 3, bundle: 5 },
} as const;

export const PROTECTION = {
  productId: "gid://shopify/Product/10482166530343",
  handle: "auvella-shipping-protection",
  /** "Standard", £3.49 - the opt-in toggle. */
  paidVariantId: "gid://shopify/ProductVariant/52325730844967",
  /** "Included free", £0 - with Buy 2+. */
  freeVariantId: "gid://shopify/ProductVariant/52326276858151",
  title: "Shipping Protection",
  /** What it's worth (the gift variant's compare-at) until Shopify's figure loads. */
  valueGBP: "3.49",
  image:
    "https://cdn.shopify.com/s/files/1/0988/0738/2311/files/MinimalBeigePackageCheckmarkIcon.png",
};

export const WASH_BAG = {
  productId: "gid://shopify/Product/10482195464487",
  handle: "fine-mesh-laundry-bag-anti-deformation-washer-safe-for-sweaters-and-intimates",
  /** "Large 50x60cm - Free gift" (renamed from "- Buy 3 gift" on 17 Oct
   *  2026: it is earned with 3 of a style or 5 underwear pairs), £0, same
   *  SKU as the £10 Large. Matched by variant id, never by name. */
  giftVariantId: "gid://shopify/ProductVariant/52326276956455",
  /** The £10 Large bag itself: its market price stands in where a market has
   *  no compare-at for the gift (usePerkValues). */
  largeVariantId: "gid://shopify/ProductVariant/52325766332711",
  title: "Anti-Snag Shapewear Wash Bag",
  valueGBP: "10.00",
  /** The single Large bag (the gift), not the lifestyle shot of the set. */
  image:
    "https://cdn.shopify.com/s/files/1/0988/0738/2311/files/cd08fb40-fa8f-453e-a550-52ee4e2a8f77.jpg",
};

/** The products shoppers must never find or buy on their own. */
const HIDDEN_IDS = [PROTECTION.productId, WASH_BAG.productId];
export const HIDDEN_HANDLES = [PROTECTION.handle, WASH_BAG.handle];
const HIDDEN_TYPES = ["shipping protection", "laundry bag"];

type ProductLike = { id?: string; handle?: string; productType?: string | null } | null | undefined;

export function isHiddenProduct(node: ProductLike): boolean {
  if (!node) return false;
  return (
    (!!node.id && HIDDEN_IDS.includes(node.id)) ||
    (!!node.handle && HIDDEN_HANDLES.includes(node.handle)) ||
    (!!node.productType && HIDDEN_TYPES.includes(node.productType.trim().toLowerCase()))
  );
}

export function isHiddenHandle(handle: string | null | undefined): boolean {
  return !!handle && HIDDEN_HANDLES.includes(handle);
}

/** A product list without the hidden perk products. */
export function withoutHidden<T extends { node: ProductLike }>(list: T[]): T[] {
  return list.filter((p) => !isHiddenProduct(p.node));
}

export type PerkKind = "protection" | "washbag";

/** Which perk a bag line is, if any (by variant). */
export function perkKindOf(variantId: string): PerkKind | null {
  if (variantId === PROTECTION.paidVariantId || variantId === PROTECTION.freeVariantId)
    return "protection";
  if (variantId === WASH_BAG.giftVariantId) return "washbag";
  return null;
}

/** Cart line attribute naming the perk (leading underscore: hidden at checkout). */
export const PERK_ATTRIBUTE = "_perk";

type LineLike = {
  variantId: string;
  quantity: number;
  product: { node: { handle: string; id?: string; productType?: string } };
};

/** What the bag qualifies for, from its real products (perk lines ignored). */
export function perkPlan(items: LineLike[]) {
  const perUnit = new Map<string, number>();
  let hasProducts = false;
  let bundlePairs = 0;
  for (const i of items) {
    if (perkKindOf(i.variantId) || isHiddenProduct(i.product.node)) continue;
    hasProducts = true;
    const h = i.product.node.handle;
    if (inDuoDeal(h)) perUnit.set(h, (perUnit.get(h) ?? 0) + i.quantity);
    if (inBundleDeal(h)) bundlePairs += i.quantity;
  }
  const maxUnits = Math.max(0, ...perUnit.values());
  const earns = (k: PerkKind) =>
    maxUnits >= PERK_UNLOCK[k].duo || bundlePairs >= PERK_UNLOCK[k].bundle;
  return {
    hasProducts,
    /** Units of the best-stocked eligible product (Buy 2 counts one product). */
    maxUnits,
    /** Underwear pairs in the bag, any mix of the three styles. */
    bundlePairs,
    protectionFree: earns("protection"),
    washBagFree: earns("washbag"),
  };
}

/** Items that count towards the bag badge and "Your Bag (n)": perks don't. */
export function countedItems<T extends { variantId: string; quantity: number }>(
  items: T[],
): number {
  return items.reduce((s, i) => s + (perkKindOf(i.variantId) ? 0 : i.quantity), 0);
}
