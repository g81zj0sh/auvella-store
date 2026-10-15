import { hasMarketingConsent, onConsentChange, readConsent } from "@/lib/consent";
import { metaContentId } from "@/lib/metaPixel";
import { isHiddenProduct, perkKindOf } from "@/lib/perks";
import { shopifyImg, type ShopifyProduct } from "@/lib/shopify";
import { cartLineImage } from "@/lib/cartImage";
// Type-only: cartStore imports this file, so a runtime import back would cycle.
import type { CartItem } from "@/stores/cartStore";

/*
 * Klaviyo onsite tracking - "bag tracking" (v186, owner-approved).
 *
 * klaviyo.js ties this browser to a Klaviyo profile (the __kla_id cookie) and
 * records Viewed Product and Added to Cart. These land in Klaviyo's
 * website/API-sourced metrics, NOT the Shopify-sourced ones of the same name
 * (this headless site never feeds those) - so a browse or "still in your bag"
 * flow must trigger on the API metric. It is non-essential tracking,
 * so it is gated exactly like the Meta pixel (lib/consent): nothing loads and
 * nothing is sent until the visitor accepts. Every export below is a no-op on
 * the server and without consent - except clearing the cookie, which only
 * ever removes data.
 *
 * Deliberately NOT here: an onsite "Started Checkout". Shopify's own
 * "Checkout Started" already drives the live abandoned-cart flow, and a
 * second metric for the same moment would split or double it.
 *
 * Perk lines (lib/perks: the free/paid shipping protection and the wash bag
 * gift) are never reported: they aren't something the shopper chose.
 */

const COMPANY_ID = "WCXDh5";
const SCRIPT_URL = `https://static.klaviyo.com/onsite/js/${COMPANY_ID}/klaviyo.js`;
const SITE = "https://auvellawear.com";
const BRAND = "Auvella";

type KlaviyoFn = (...args: unknown[]) => unknown;
interface KlaviyoObject {
  push: (...items: unknown[]) => void;
  [method: string]: KlaviyoFn;
}

declare global {
  interface Window {
    klaviyo?: KlaviyoObject;
    _klOnsite?: unknown[];
  }
}

let installed = false;
/** Product id + pathname of the last Viewed Product sent. */
let lastViewKey: string | null = null;
/** The latest product view while the banner is unanswered. Memory only. */
let pendingView: { product: ShopifyProduct; path: string } | null = null;
let watchingDecline = false;
let lastIdentity: string | null = null;

/*
 * Klaviyo's object-init snippet (developers.klaviyo.com, "Introduction to the
 * Klaviyo object"), transcribed: until klaviyo.js arrives, every
 * klaviyo.<method>(...) call is queued on window._klOnsite and replayed by
 * the script once it loads.
 */
function installKlaviyoObject(): void {
  if (window.klaviyo) return;
  window._klOnsite = window._klOnsite || [];
  const queue = (...items: unknown[]) => {
    window._klOnsite?.push(...items);
  };
  try {
    window.klaviyo = new Proxy({} as KlaviyoObject, {
      get(_target, method) {
        if (method === "push") return queue;
        return (...args: unknown[]) => {
          const callback =
            typeof args[args.length - 1] === "function"
              ? (args.pop() as (result: unknown) => void)
              : undefined;
          return new Promise((resolve) => {
            window._klOnsite?.push([
              method,
              ...args,
              (result: unknown) => {
                callback?.(result);
                resolve(result);
              },
            ]);
          });
        };
      },
    });
  } catch {
    // No Proxy: a bare queue, as Klaviyo's snippet falls back to.
    window.klaviyo = Object.assign([], { push: queue }) as unknown as KlaviyoObject;
  }
}

/** Installs the object and the one klaviyo.js tag. Consent is checked by callers. */
function ensureKlaviyo(): void {
  if (installed) return;
  installed = true;
  installKlaviyoObject();
  if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = SCRIPT_URL;
  document.head.appendChild(s);
}

/** True once it is safe to send: in a browser, consent given, object installed. */
function klaviyoReady(): boolean {
  if (typeof window === "undefined" || !hasMarketingConsent()) return false;
  ensureKlaviyo();
  return !!window.klaviyo;
}

/** klaviyo.<method>(...args); a rejected promise must not surface as an error. */
function call(method: string, ...args: unknown[]): void {
  const k = window.klaviyo;
  if (!k) return;
  const fn = k[method];
  if (typeof fn !== "function") {
    k.push([method, ...args]);
    return;
  }
  const result = fn.apply(k, args);
  if (result instanceof Promise) result.catch(() => {});
}

/**
 * Loads klaviyo.js. Safe to call repeatedly. Called from the root once the
 * visitor has accepted - and if they accepted on the product page they were
 * reading, the view held while the banner was up is sent now.
 */
export function loadKlaviyo(): void {
  if (!klaviyoReady()) return;
  const held = pendingView;
  pendingView = null;
  if (held && held.path === window.location.pathname) sendViewed(held.product, held.path);
}

/** Links this browser to a Klaviyo profile (newsletter signup, account login). */
export function identifyKlaviyo(person: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): void {
  const email = person.email?.trim();
  if (!email || !klaviyoReady()) return;
  const props: Record<string, string> = { email };
  if (person.firstName?.trim()) props.first_name = person.firstName.trim();
  if (person.lastName?.trim()) props.last_name = person.lastName.trim();
  // The account page re-runs its effect on every profile refetch.
  const key = JSON.stringify(props);
  if (key === lastIdentity) return;
  lastIdentity = key;
  try {
    call("identify", props);
  } catch {
    /* analytics must never break the page */
  }
}

/** Drops the browser's link to a profile and its viewed-items history - on
 *  logout, so the next person on a shared device isn't tracked as the last
 *  one. Mirrors what klaviyo.js's own clearIdentity removes. */
export function clearKlaviyoIdentity(): void {
  if (typeof window === "undefined") return;
  lastIdentity = null;
  lastViewKey = null;
  try {
    const expired = "__kla_id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=/";
    document.cookie = expired;
    // klaviyo.js may have set it for the whole domain (www checkout too).
    if (window.location.hostname.endsWith("auvellawear.com")) {
      document.cookie = `${expired}; domain=.auvellawear.com`;
    }
  } catch {
    /* ignore */
  }
  // trackViewedItem keeps the last 20 views here and re-sends them as
  // $viewed_items on the next identify - i.e. to the next person's profile.
  for (const key of ["__kla_viewed", "__kla_viewed_reviewed_items", "$referrer", "$last_referrer"]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage can be blocked */
    }
  }
  try {
    window.sessionStorage.removeItem("_kx");
  } catch {
    /* ignore */
  }
}

const productUrl = (handle: string) => `${SITE}/product/${handle}`;
const categoriesOf = (node: ShopifyProduct["node"]) =>
  node.productType?.trim() ? [node.productType.trim()] : [];

function sendViewed(product: ShopifyProduct, path: string): void {
  const node = product.node;
  const key = `${node.id}|${path}`;
  if (key === lastViewKey || !klaviyoReady()) return;
  lastViewKey = key;
  try {
    const min = node.priceRange.minVariantPrice;
    const price = Number(min.amount) || 0;
    // The compare-at of the variant the "from" price belongs to.
    const atPrice = node.variants.edges.find((v) => Number(v.node.price.amount) === price)?.node;
    const compareAt = Number(atPrice?.compareAtPrice?.amount) || 0;
    const image = node.images.edges[0]?.node.url;
    const item = {
      ProductName: node.title,
      ProductID: metaContentId(node.id),
      Categories: categoriesOf(node),
      ImageURL: image ? shopifyImg(image, 800) : undefined,
      URL: productUrl(node.handle),
      Brand: BRAND,
      Price: price,
      ...(compareAt > price ? { CompareAtPrice: compareAt } : {}),
      Currency: min.currencyCode,
    };
    call("track", "Viewed Product", item);
    call("trackViewedItem", {
      Title: item.ProductName,
      ItemId: item.ProductID,
      Categories: item.Categories,
      ImageUrl: item.ImageURL,
      Url: item.URL,
      Metadata: {
        Brand: BRAND,
        Price: price,
        ...(compareAt > price ? { CompareAtPrice: compareAt } : {}),
      },
    });
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * Viewed Product, once per product per page. Before the banner is answered
 * the latest view waits in memory (loadKlaviyo sends it if they accept on
 * that page); a decline holds nothing.
 */
export function trackViewedProduct(product: ShopifyProduct): void {
  if (typeof window === "undefined") return;
  if (!product?.node || isHiddenProduct(product.node)) return;
  const path = window.location.pathname;
  const consent = readConsent();
  if (consent === null) {
    pendingView = { product, path };
    if (!watchingDecline) {
      watchingDecline = true;
      onConsentChange((state) => {
        if (state === "declined") pendingView = null;
      });
    }
    return;
  }
  pendingView = null;
  if (consent === "accepted") sendViewed(product, path);
}

type BagLine = Omit<CartItem, "lineId">;

const isPerkLine = (line: BagLine) =>
  !!perkKindOf(line.variantId) || isHiddenProduct(line.product?.node);

/**
 * Added to Cart, with Klaviyo's documented properties, once Shopify has
 * accepted the line (cartStore.addItem). `items` is the whole bag after the
 * add; perk lines are left out of it and of $value.
 */
export function trackAddedToCart(
  added: BagLine,
  items: BagLine[],
  checkoutUrl: string | null,
): void {
  try {
    if (isPerkLine(added) || !klaviyoReady()) return;
    const lines = items.filter((i) => !isPerkLine(i));
    const lineImage = (l: BagLine) =>
      cartLineImage(l.product, l.variantId, l.selectedOptions ?? [], 800)?.url;
    const round = (n: number) => Math.round(n * 100) / 100;
    const node = added.product.node;
    const price = Number(added.price.amount) || 0;
    const bagValue = round(
      lines.reduce((sum, l) => sum + (Number(l.price.amount) || 0) * l.quantity, 0),
    );
    // Klaviyo reads $value in the account's currency (GBP) and ignores any
    // currency property, so a $60 US bag would report as £60. Only GBP bags
    // get $value; others keep the figure beside its currency.
    const value =
      added.price.currencyCode === "GBP" ? { $value: bagValue } : { ValueInCurrency: bagValue };
    call("track", "Added to Cart", {
      ...value,
      AddedItemProductName: node.title,
      AddedItemProductID: metaContentId(node.id),
      AddedItemCategories: categoriesOf(node),
      AddedItemImageURL: lineImage(added),
      AddedItemURL: productUrl(node.handle),
      AddedItemPrice: price,
      AddedItemQuantity: added.quantity,
      AddedItemVariantID: metaContentId(added.variantId),
      AddedItemVariantName: added.variantTitle,
      ItemNames: lines.map((l) => l.product.node.title),
      CheckoutURL: checkoutUrl ?? undefined,
      Currency: added.price.currencyCode,
      Items: lines.map((l) => {
        const each = Number(l.price.amount) || 0;
        return {
          ProductID: metaContentId(l.product.node.id),
          ProductName: l.product.node.title,
          Quantity: l.quantity,
          ItemPrice: each,
          RowTotal: round(each * l.quantity),
          ProductURL: productUrl(l.product.node.handle),
          ImageURL: lineImage(l),
          ProductCategories: categoriesOf(l.product.node),
          VariantID: metaContentId(l.variantId),
          VariantName: l.variantTitle,
        };
      }),
    });
  } catch {
    /* analytics must never break the bag */
  }
}
