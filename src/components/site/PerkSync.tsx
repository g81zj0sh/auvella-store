import { useEffect } from "react";
import { useCartStore, type CartItem } from "@/stores/cartStore";
import {
  addLineToShopifyCart,
  fetchCartLines,
  fetchProductsByHandles,
  removeLineFromShopifyCart,
  updateShopifyCartLine,
  type LiveCartLine,
  type ShopifyProduct,
} from "@/lib/shopify";
import {
  HIDDEN_HANDLES,
  PERK_ATTRIBUTE,
  PROTECTION,
  WASH_BAG,
  perkKindOf,
  perkPlan,
} from "@/lib/perks";

/*
 * Keeps the multi-buy perks in the bag in step with what the bag qualifies
 * for (lib/perks.ts). Mounted once in the root; renders nothing.
 *
 * - Buy 2 of one eligible product: the £0 "Included free" shipping
 *   protection goes in, unless the shopper took it out.
 * - Buy 3+: the £0 Large wash bag gift goes in too, unless taken out.
 * - Toggle on at £3.49 (protectionOptIn): the paid protection - or the free
 *   one while the bag qualifies.
 * - The moment the bag stops qualifying a free perk comes out, never left in
 *   to be charged; with no products left every perk comes out and the bag
 *   empties.
 *
 * Every pass works from the lines Shopify actually holds (fetchCartLines),
 * not the bag's saved copy, so another tab, a lost response or Shopify's own
 * /cart page can't double a perk or leave one that no longer applies; then
 * it mirrors Shopify's perk lines into the bag. One pass at a time, debounced
 * so a two-line Buy 2 add settles first, never while the bag is mid-update,
 * and only on a cart that already exists. A pass that can't reach Shopify
 * tries again with a growing delay instead of hammering it. Checkout paths
 * call ensurePerks() so the cart is right before Shopify takes payment.
 */

/** The _perk attribute each perk variant carries (an order label only). */
const PERK_VALUE: Record<string, string> = {
  [PROTECTION.freeVariantId]: "protection-free",
  [PROTECTION.paidVariantId]: "protection-optin",
  [WASH_BAG.giftVariantId]: "washbag-gift",
};

let perkProducts: Promise<ShopifyProduct[]> | null = null;
/** The two perk products (hidden everywhere else), fetched once. */
function loadPerkProducts(): Promise<ShopifyProduct[]> {
  if (!perkProducts) {
    perkProducts = fetchProductsByHandles(HIDDEN_HANDLES, { includeHidden: true }).then((p) => {
      if (p.length < HIDDEN_HANDLES.length) perkProducts = null; // retry next time
      return p;
    });
  }
  return perkProducts;
}

/** The bag's copy of a perk line Shopify holds. */
function bagLine(products: ShopifyProduct[], line: LiveCartLine): CartItem | null {
  for (const product of products) {
    const v = product.node.variants.edges.find((e) => e.node.id === line.variantId)?.node;
    if (v)
      return {
        lineId: line.id,
        product,
        variantId: line.variantId,
        variantTitle: v.title,
        price: v.price,
        quantity: line.quantity,
        selectedOptions: v.selectedOptions ?? [],
        attributes: [{ key: PERK_ATTRIBUTE, value: PERK_VALUE[line.variantId] ?? "perk" }],
      };
  }
  return null;
}

/** Adds Shopify definitely refused for a bag (sold out, rejected) - so a pass
 *  can't loop on them. Network failures aren't recorded: they're retried. */
const refused = new Set<string>();

type Pass = "done" | "retry";

async function reconcile(): Promise<Pass> {
  const st = useCartStore.getState();
  if (!st.cartId || st.isLoading) return "done"; // the subscriber runs it again
  const cartId = st.cartId;

  const live = await fetchCartLines(cartId);
  if (!live) return "retry";
  if (live.gone) return "done"; // a dead cart is rebuilt at checkout (resolveCheckoutUrl)

  const plan = perkPlan(live.lines);
  const want = new Map<string, string>(); // variant -> _perk value
  if (plan.hasProducts) {
    if (plan.protectionFree && (st.protectionOptIn || !st.perksDismissed.includes("protection")))
      want.set(PROTECTION.freeVariantId, "protection-free");
    else if (st.protectionOptIn) want.set(PROTECTION.paidVariantId, "protection-optin");
    if (plan.washBagFree && !st.perksDismissed.includes("washbag"))
      want.set(WASH_BAG.giftVariantId, "washbag-gift");
  }

  let changed = false;
  for (const line of live.lines) {
    if (!perkKindOf(line.variantId)) continue;
    if (!want.has(line.variantId)) {
      const r = await removeLineFromShopifyCart(cartId, line.id);
      if (!r.success) return r.cartNotFound ? "done" : "retry";
      changed = true;
    } else if (line.quantity !== 1) {
      const r = await updateShopifyCartLine(cartId, line.id, 1);
      if (!r.success) return r.cartNotFound ? "done" : "retry";
      changed = true;
    }
  }

  const bagKey = live.lines
    .filter((l) => !perkKindOf(l.variantId))
    .map((l) => `${l.variantId}:${l.quantity}`)
    .sort()
    .join(",");
  for (const [variantId, value] of want) {
    if (live.lines.some((l) => l.variantId === variantId)) continue;
    const key = `${cartId}|${bagKey}|${variantId}`;
    if (refused.has(key)) continue;
    const r = await addLineToShopifyCart(cartId, {
      variantId,
      quantity: 1,
      attributes: [{ key: PERK_ATTRIBUTE, value }],
    });
    if (r.success) changed = true;
    else if (r.cartNotFound) return "done";
    else refused.add(key);
  }

  // Mirror what Shopify now holds into the bag.
  const after = changed ? await fetchCartLines(cartId) : live;
  if (!after) return "retry";
  if (after.gone) return "done";
  if (useCartStore.getState().cartId !== cartId) return "done";
  if (after.lines.length === 0) {
    useCartStore.getState().clearCart();
    return "done";
  }
  const perkLines = after.lines.filter((l) => perkKindOf(l.variantId));
  if (perkLines.length) {
    const products = await loadPerkProducts();
    const mirrored = perkLines.map((l) => bagLine(products, l));
    if (mirrored.some((m) => !m)) return "retry";
    useCartStore.getState().mirrorPerkLines(mirrored as CartItem[]);
  } else {
    useCartStore.getState().mirrorPerkLines([]);
  }
  return "done";
}

let running: Promise<void> | null = null;
let again = false;
let timer: ReturnType<typeof setTimeout> | undefined;
let backoff = 0;

function runNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let result: Pass = "done";
    do {
      again = false;
      try {
        result = await reconcile();
      } catch (e) {
        console.error("Perk sync failed:", e);
        result = "retry";
      }
    } while (again && result === "done");
    if (result === "retry") {
      // Couldn't reach Shopify: try again, waiting longer each time (max 30s).
      backoff = Math.min(30_000, backoff ? backoff * 2 : 1_000);
      schedule(backoff);
    } else backoff = 0;
  })().finally(() => {
    running = null;
  });
  return running;
}

function schedule(delay = 350) {
  clearTimeout(timer);
  timer = setTimeout(() => void runNow(), delay);
}

/** Bring the cart's perks up to date now - call before opening checkout.
 *  Gives every perk a fresh attempt, even one refused earlier. */
export async function ensurePerks(): Promise<void> {
  clearTimeout(timer);
  refused.clear();
  // A bag mid-update can't be reconciled yet: wait for it to settle.
  for (let i = 0; i < 40 && useCartStore.getState().isLoading; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (running) await running;
  await runNow();
}

export function PerkSync() {
  useEffect(() => {
    const unsub = useCartStore.subscribe((s, prev) => {
      if (
        s.items !== prev.items ||
        s.cartId !== prev.cartId ||
        s.perksDismissed !== prev.perksDismissed ||
        s.protectionOptIn !== prev.protectionOptIn ||
        (prev.isLoading && !s.isLoading)
      )
        schedule();
    });
    // The persisted bag is restored after mount (root component).
    const unsubHydrate = useCartStore.persist.onFinishHydration(() => schedule());
    if (useCartStore.persist.hasHydrated()) schedule();
    // Back from another tab or Shopify's cart page: check against Shopify.
    const onFocus = () => schedule();
    window.addEventListener("focus", onFocus);
    return () => {
      unsub();
      unsubHydrate();
      window.removeEventListener("focus", onFocus);
      clearTimeout(timer);
    };
  }, []);
  return null;
}
