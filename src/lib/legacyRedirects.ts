import { LEGACY_PRODUCT_HANDLES } from "@/lib/productHandles";

/*
 * Old Shopify-theme URLs (v186, 15 Oct 2026). The www host is still Shopify,
 * and its theme forwards any path it doesn't own to the apex with the same
 * path — so links to the old theme's pages (/pages/shipping-policy,
 * /blogs/news, /account/login, /collections/x/products/y...) land here, where
 * no route answers them and they 404. server.ts sends them on before the
 * router sees them; pages.$slug.tsx follows PAGE_ALIASES on client-side
 * navigation too.
 */

/** Shopify's checkout, cart permalinks and discount links only work there. */
const SHOPIFY_HOST = "https://www.auvellawear.com";

/** Old Shopify page slug -> the page that replaced it. */
export const PAGE_ALIASES: Record<string, string> = {
  "shipping-policy": "/pages/shipping",
  "return-policy": "/pages/returns",
  "refund-policy": "/pages/returns",
  "terms-and-conditions": "/pages/terms",
  "terms-of-service": "/pages/terms",
  "privacy-policy": "/pages/privacy",
  "data-sharing-opt-out": "/pages/privacy",
  "about-us": "/pages/about",
  faqs: "/pages/contact",
  faq: "/pages/contact",
  "contact-us": "/pages/contact",
  "track-order": "/tracking",
  "best-sellers": "/collections/everyday-support-edit",
  shop: "/collections/all",
  // No "reviews" (owner ruling): nothing about product reviews changes here.
};

// Own keys only, so "constructor" or "toString" never reads as a match.
function lookup(map: Record<string, string>, key: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;
}

/** Where an old /pages/<slug> now lives, if it was renamed. */
export function pageAlias(slug: string): string | undefined {
  return lookup(PAGE_ALIASES, slug.toLowerCase());
}

// h has no "." so Shopify's /products/<h>.js / .json / .oembed are left alone.
const PRODUCT = /^\/(?:collections\/[^/]+\/)?products\/([^/.]+)$/;
const SHOP_INDEX = /^\/(?:products|collections|collections\/vendors|collections\/types|search)$/;
// Cart permalinks, checkouts, abandoned-checkout recovery, discount links -
// only the forms carrying a token. A bare /checkout(s) on Shopify opens a new,
// empty Shop Pay checkout (our bag is a Storefront cart it can't see).
const SHOPIFY_ONLY = /^\/(?:cart\/.+|checkouts\/.+|\d+\/checkouts\/.+|discount\/.+)$/;
// The old theme's account pages; /account and /account/callback are ours.
const ACCOUNT_PAGES = /^\/account\/(?:login|register|addresses|logout|orders|activate|reset)(?:\/.*)?$/;

/**
 * The redirect for an old Shopify-theme URL, or null to let the router answer.
 * Every location is a fixed path, "/product/" plus one path segment, or the
 * fixed Shopify host plus this request's own path — none can leave the site.
 * The query always rides along: old emails and ads carry utm_*, fbclid and
 * Klaviyo's _kx, and the target routes ignore params they don't use.
 */
export function legacyRedirect(url: URL): { location: string; status: 301 | 302 } | null {
  // "/Pages/Shipping-Policy/" is the same page as "/pages/shipping-policy".
  const path = url.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  const q = url.search;

  const page = path.match(/^\/pages\/([^/]+)$/);
  if (page) {
    const to = pageAlias(page[1]);
    if (to) return { location: `${to}${q}`, status: 301 };
  }

  const product = path.match(PRODUCT);
  if (product) {
    const handle = lookup(LEGACY_PRODUCT_HANDLES, product[1]) ?? product[1];
    return { location: `/product/${handle}${q}`, status: 301 };
  }

  if (SHOP_INDEX.test(path)) return { location: `/collections/all${q}`, status: 301 };
  if (path === "/blogs" || path.startsWith("/blogs/")) return { location: `/${q}`, status: 301 };
  // The bag is a drawer here, not a page; same for a bare checkout link.
  if (path === "/cart" || path === "/checkout" || path === "/checkouts") {
    return { location: `/${q}`, status: 302 };
  }

  // Tokens are case-sensitive, so the original path goes over unchanged.
  if (SHOPIFY_ONLY.test(path)) {
    return { location: `${SHOPIFY_HOST}${url.pathname}${q}`, status: 302 };
  }

  if (ACCOUNT_PAGES.test(path)) return { location: `/account${q}`, status: 302 };
  return null;
}
