import { toast } from "sonner";

export const SHOPIFY_API_VERSION = "2025-07";
export const SHOPIFY_STORE_PERMANENT_DOMAIN = "bys-store-2961694-648466.myshopify.com";
/*
 * Storefront API token — the "Headless" sales channel (Sept 2026).
 *
 * Previously this was Lovable's channel token, which is why the store broke
 * silently when collections weren't published to Lovable. Moved to our own
 * Headless channel so the storefront no longer depends on a third party's
 * app being installed. This token also carries
 * unauthenticated_read_product_inventory, which the Lovable one did not, so
 * quantityAvailable (the bag's low-stock line) now resolves.
 *
 * Public by design — it only grants unauthenticated read access to published
 * products and cart operations. It is not a secret.
 */
export const SHOPIFY_STOREFRONT_TOKEN = "73c1265bea52698126322f319090937c";
export const SHOPIFY_STOREFRONT_URL = `https://${SHOPIFY_STORE_PERMANENT_DOMAIN}/api/${SHOPIFY_API_VERSION}/graphql.json`;

export interface ShopifyProduct {
  node: {
    id: string;
    title: string;
    description: string;
    handle: string;
    /** Shopify's product type, e.g. "Bra" — drives the bra-only hover flip. */
    productType?: string;
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    images: { edges: Array<{ node: { url: string; altText: string | null } }> };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: { amount: string; currencyCode: string };
          compareAtPrice?: { amount: string; currencyCode: string } | null;
          availableForSale: boolean;
          selectedOptions: Array<{ name: string; value: string }>;
          image?: { url: string; altText: string | null } | null;
        };
      }>;
    };
    options: Array<{ name: string; values: string[] }>;
  };
}

/** Upscale/resize a Shopify CDN image via URL params. */
export function shopifyImg(url: string, width = 1600): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("width", String(width));
    return u.toString();
  } catch {
    return url;
  }
}

/*
 * Responsive srcset off the Shopify CDN.
 *
 * The CDN renders each width from the untouched master and caches it — the
 * uploaded file is never modified, replaced or re-encoded, and gallery order is
 * unaffected. This exists because several masters are 2.5–4 MB PNGs, and
 * shipping those whole to a 300px card wastes megabytes per tile. A browser
 * downscaling an oversized bitmap is also softer than the CDN's resample, so
 * serving the right width looks equal or better — never worse.
 *
 * Candidates run to 2x the painted size, so retina screens lose nothing.
 */
const SRCSET_WIDTHS = [240, 360, 480, 640, 800, 1000, 1200, 1600, 2000];

export function shopifySrcSet(url: string, maxWidth = 1600): string {
  if (!url) return "";
  return SRCSET_WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${shopifyImg(url, w)} ${w}w`)
    .join(", ");
}

export async function storefrontApiRequest(query: string, variables: any = {}) {
  const response = await fetch(SHOPIFY_STOREFRONT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.status === 402) {
    toast.error("Shopify: Payment required", {
      description: "Your Shopify store needs an active billing plan. Visit admin.shopify.com to upgrade.",
    });
    return;
  }

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data.errors) throw new Error(data.errors.map((e: any) => e.message).join(", "));
  return data;
}

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $query: String) {
    products(first: $first, query: $query) {
      edges {
        node {
          id title description handle productType
          priceRange { minVariantPrice { amount currencyCode } }
          images(first: 40) { edges { node { url altText } } }
          variants(first: 100) {
            edges {
              node {
                id title
                price { amount currencyCode }
                compareAtPrice { amount currencyCode }
                availableForSale
                selectedOptions { name value }
                image { url altText }
              }
            }
          }
          options { name values }

        }
      }
    }
  }
`;

export async function fetchProducts(first = 12, query?: string): Promise<ShopifyProduct[]> {
  const data = await storefrontApiRequest(PRODUCTS_QUERY, { first, query });
  return data?.data?.products?.edges ?? [];
}

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      id title description handle productType
      priceRange { minVariantPrice { amount currencyCode } }
      images(first: 120) { edges { node { url altText } } }
      variants(first: 250) {
        edges {
          node {
            id title
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            availableForSale
            selectedOptions { name value }
            image { url altText }
          }
        }
      }
      options { name values }
    }
  }
`;

export async function fetchProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
  const node = data?.data?.product;
  return node ? { node } : null;
}

// ---------- Collections ----------
export interface ShopifyCollection {
  id: string;
  title: string;
  description: string;
  handle: string;
  image: { url: string; altText: string | null } | null;
  products: ShopifyProduct[];
}

const COLLECTION_BY_HANDLE_QUERY = `
  query GetCollection($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      id title description handle
      image { url altText }
      products(first: $first) {
        edges {
          node {
            id title description handle productType
            priceRange { minVariantPrice { amount currencyCode } }
            images(first: 40) { edges { node { url altText } } }
            variants(first: 100) {
              edges {
                node {
                  id title
                  price { amount currencyCode }
                  compareAtPrice { amount currencyCode }
                  availableForSale
                  selectedOptions { name value }
                  image { url altText }
                }
              }
            }
            options { name values }
          }
        }
      }
    }
  }
`;

/**
 * Fetch a Shopify collection by handle. Returns null if the store has no
 * collection with that handle — callers can then fall back to fetchProducts().
 */
export async function fetchCollectionByHandle(
  handle: string,
  first = 48,
): Promise<ShopifyCollection | null> {
  const data = await storefrontApiRequest(COLLECTION_BY_HANDLE_QUERY, { handle, first });
  const c = data?.data?.collection;
  if (!c) return null;
  return {
    id: c.id,
    title: c.title,
    description: c.description ?? "",
    handle: c.handle,
    image: c.image ?? null,
    products: c.products?.edges ?? [],
  };
}

// ---------- Product recommendations (Complete the Look) ----------
const PRODUCT_RECOMMENDATIONS_QUERY = `
  query GetRecommendations($productId: ID!) {
    productRecommendations(productId: $productId) {
      id title description handle productType
      priceRange { minVariantPrice { amount currencyCode } }
      images(first: 40) { edges { node { url altText } } }
      variants(first: 100) {
        edges {
          node {
            id title
            price { amount currencyCode }
            compareAtPrice { amount currencyCode }
            availableForSale
            selectedOptions { name value }
            image { url altText }
          }
        }
      }
      options { name values }
    }
  }
`;

/** Shopify's native "customers also bought" recommendations for a product id. */
export async function fetchProductRecommendations(productId: string): Promise<ShopifyProduct[]> {
  try {
    const data = await storefrontApiRequest(PRODUCT_RECOMMENDATIONS_QUERY, { productId });
    const recs = data?.data?.productRecommendations ?? [];
    return recs.map((node: any) => ({ node })) as ShopifyProduct[];
  } catch {
    return [];
  }
}

// ---------- Cart mutations ----------
export const CART_QUERY = `query cart($id: ID!) { cart(id: $id) { id totalQuantity checkoutUrl } }`;

const CART_CREATE_MUTATION = `
  mutation cartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id checkoutUrl
        lines(first: 100) { edges { node { id merchandise { ... on ProductVariant { id } } } } }
      }
      userErrors { field message }
    }
  }
`;

const CART_LINES_ADD_MUTATION = `
  mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart { id lines(first: 100) { edges { node { id merchandise { ... on ProductVariant { id } } } } } }
      userErrors { field message }
    }
  }
`;

const CART_LINES_UPDATE_MUTATION = `
  mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { id }
      userErrors { field message }
    }
  }
`;

const CART_LINES_REMOVE_MUTATION = `
  mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart { id }
      userErrors { field message }
    }
  }
`;

export function formatCheckoutUrl(checkoutUrl: string): string {
  try {
    const url = new URL(checkoutUrl);
    url.searchParams.set("channel", "online_store");
    return url.toString();
  } catch {
    return checkoutUrl;
  }
}

function isCartNotFoundError(userErrors: Array<{ field: string[] | null; message: string }>): boolean {
  return userErrors.some(
    (e) =>
      e.message.toLowerCase().includes("cart not found") ||
      e.message.toLowerCase().includes("does not exist"),
  );
}

export async function createShopifyCart(item: { variantId: string; quantity: number }) {
  const data = await storefrontApiRequest(CART_CREATE_MUTATION, {
    input: { lines: [{ quantity: item.quantity, merchandiseId: item.variantId }] },
  });
  const errs = data?.data?.cartCreate?.userErrors ?? [];
  if (errs.length) {
    console.error("Cart creation failed:", errs);
    return null;
  }
  const cart = data?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) return null;
  const lineId = cart.lines.edges[0]?.node?.id;
  if (!lineId) return null;
  return { cartId: cart.id, checkoutUrl: formatCheckoutUrl(cart.checkoutUrl), lineId };
}

/*
 * Rebuild a whole cart in one mutation. Used when the stored cart has expired or
 * been completed: its checkout URL then 404s, and the shopper has to be given a
 * live cart built from the lines still in their bag.
 */
export async function recreateShopifyCart(lines: Array<{ variantId: string; quantity: number }>) {
  if (!lines.length) return null;
  const data = await storefrontApiRequest(CART_CREATE_MUTATION, {
    input: { lines: lines.map((l) => ({ quantity: l.quantity, merchandiseId: l.variantId })) },
  });
  const errs = data?.data?.cartCreate?.userErrors ?? [];
  if (errs.length) {
    console.error("Cart rebuild failed:", errs);
    return null;
  }
  const cart = data?.data?.cartCreate?.cart;
  if (!cart?.checkoutUrl) return null;
  // Key line IDs by variant, not by position: Shopify merges lines that share a
  // merchandise ID, so the returned order need not match the order sent.
  const lineIdByVariant: Record<string, string> = {};
  for (const e of cart.lines?.edges ?? []) {
    const vid = e?.node?.merchandise?.id;
    if (vid && !lineIdByVariant[vid]) lineIdByVariant[vid] = e.node.id;
  }
  return { cartId: cart.id, checkoutUrl: formatCheckoutUrl(cart.checkoutUrl), lineIdByVariant };
}

export async function addLineToShopifyCart(cartId: string, item: { variantId: string; quantity: number }) {
  const data = await storefrontApiRequest(CART_LINES_ADD_MUTATION, {
    cartId,
    lines: [{ quantity: item.quantity, merchandiseId: item.variantId }],
  });
  const errs = data?.data?.cartLinesAdd?.userErrors ?? [];
  if (isCartNotFoundError(errs)) return { success: false, cartNotFound: true } as const;
  if (errs.length) {
    console.error("Add line failed:", errs);
    return { success: false } as const;
  }
  const lines = data?.data?.cartLinesAdd?.cart?.lines?.edges ?? [];
  const newLine = lines.find((l: any) => l.node.merchandise.id === item.variantId);
  return { success: true, lineId: newLine?.node?.id as string | undefined } as const;
}

export async function updateShopifyCartLine(cartId: string, lineId: string, quantity: number) {
  const data = await storefrontApiRequest(CART_LINES_UPDATE_MUTATION, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  const errs = data?.data?.cartLinesUpdate?.userErrors ?? [];
  if (isCartNotFoundError(errs)) return { success: false, cartNotFound: true } as const;
  if (errs.length) return { success: false } as const;
  return { success: true } as const;
}

export async function removeLineFromShopifyCart(cartId: string, lineId: string) {
  const data = await storefrontApiRequest(CART_LINES_REMOVE_MUTATION, { cartId, lineIds: [lineId] });
  const errs = data?.data?.cartLinesRemove?.userErrors ?? [];
  if (isCartNotFoundError(errs)) return { success: false, cartNotFound: true } as const;
  if (errs.length) return { success: false } as const;
  return { success: true } as const;
}

// ---------- Bag drawer helpers ----------

/*
 * Compact product selection for grids inside the bag (recommendations,
 * recently viewed). Same shape as ShopifyProduct so the cards and the quick
 * add flow work unchanged; fewer images because the drawer only shows one.
 */
const BAG_PRODUCT_FIELDS = `
  id title description handle productType
  priceRange { minVariantPrice { amount currencyCode } }
  images(first: 6) { edges { node { url altText } } }
  variants(first: 100) {
    edges { node {
      id title
      price { amount currencyCode }
      compareAtPrice { amount currencyCode }
      availableForSale
      selectedOptions { name value }
      image { url altText }
    } }
  }
  options { name values }
`;

/*
 * Fetch several products by handle in one round trip.
 *
 * Storefront product search silently ignores a `handle:` filter and returns
 * the whole catalogue, so the only reliable way to resolve a list of handles
 * is one aliased product(handle:) lookup per handle. Order of the result
 * matches the order of the input; missing handles are dropped.
 */
export async function fetchProductsByHandles(handles: string[]): Promise<ShopifyProduct[]> {
  const clean = [...new Set(handles.filter(Boolean))].slice(0, 12);
  if (!clean.length) return [];
  const query = `query BagProducts { ${clean
    .map((h, i) => `p${i}: product(handle: ${JSON.stringify(h)}) { ${BAG_PRODUCT_FIELDS} }`)
    .join("\n")} }`;
  try {
    const data = await storefrontApiRequest(query);
    return clean
      .map((_, i) => data?.data?.[`p${i}`])
      .filter(Boolean)
      .map((node: any) => ({ node })) as ShopifyProduct[];
  } catch {
    return [];
  }
}

/*
 * Live stock for a set of variants.
 *
 * quantityAvailable needs the unauthenticated_read_product_inventory scope on
 * the Storefront token. Without it Shopify rejects the whole query, so this
 * resolves to an empty map rather than throwing, and the drawer shows no
 * stock line at all — which is the correct behaviour for a claim we can't
 * back with data.
 */
export async function fetchVariantStock(variantIds: string[]): Promise<Record<string, number>> {
  const ids = [...new Set(variantIds)].slice(0, 50);
  if (!ids.length) return {};
  const query = `query VariantStock($ids: [ID!]!) {
    nodes(ids: $ids) { ... on ProductVariant { id quantityAvailable } }
  }`;
  try {
    const data = await storefrontApiRequest(query, { ids });
    if (data?.errors?.length) return {};
    const out: Record<string, number> = {};
    for (const n of data?.data?.nodes ?? []) {
      if (n?.id && typeof n.quantityAvailable === "number") out[n.id] = n.quantityAvailable;
    }
    return out;
  } catch {
    return {};
  }
}

const CART_LINES_SWAP_MUTATION = `
  mutation cartLinesSwap($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart { id lines(first: 100) { edges { node { id quantity merchandise { ... on ProductVariant { id } } } } } }
      userErrors { field message }
    }
  }
`;

/*
 * Change a line's variant in place (the "Edit" flow), keeping its quantity.
 *
 * Shopify merges lines that share a variant, so after the update the line for
 * the new variant may not be the one we updated — look it up by merchandise
 * id in the returned cart rather than assuming position.
 */
export async function swapShopifyCartLine(
  cartId: string,
  lineId: string,
  merchandiseId: string,
  quantity: number,
): Promise<{ lineId: string; quantity: number } | null> {
  const data = await storefrontApiRequest(CART_LINES_SWAP_MUTATION, {
    cartId,
    lines: [{ id: lineId, merchandiseId, quantity }],
  });
  const errs = data?.data?.cartLinesUpdate?.userErrors ?? [];
  if (errs.length) throw new Error(errs[0]?.message ?? "Couldn't update that item.");
  const edges = data?.data?.cartLinesUpdate?.cart?.lines?.edges ?? [];
  const hit = edges.find((e: any) => e?.node?.merchandise?.id === merchandiseId)?.node;
  return hit ? { lineId: hit.id, quantity: hit.quantity } : null;
}

const CART_DISCOUNT_CODES_MUTATION = `
  mutation cartDiscountCodesUpdate($cartId: ID!, $codes: [String!]) {
    cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $codes) {
      cart {
        id
        discountCodes { code applicable }
        cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
      }
      userErrors { field message }
    }
  }
`;

export type DiscountResult = {
  applied: string[];
  subtotal?: { amount: string; currencyCode: string };
  total?: { amount: string; currencyCode: string };
};

/*
 * Apply (or clear) discount codes on the cart.
 *
 * Shopify keeps an inapplicable code attached to the cart, so a wrong code
 * would otherwise sit there silently. If the code comes back applicable:false
 * we strip it straight back off and report failure, leaving only codes that
 * actually do something.
 */
export async function setShopifyDiscountCodes(cartId: string, codes: string[]): Promise<DiscountResult> {
  const run = async (list: string[]) => {
    const data = await storefrontApiRequest(CART_DISCOUNT_CODES_MUTATION, { cartId, codes: list });
    const errs = data?.data?.cartDiscountCodesUpdate?.userErrors ?? [];
    if (errs.length) throw new Error(errs[0]?.message ?? "That code couldn't be applied.");
    return data?.data?.cartDiscountCodesUpdate?.cart;
  };
  const cart = await run(codes);
  const rows: Array<{ code: string; applicable: boolean }> = cart?.discountCodes ?? [];
  const good = rows.filter((r) => r.applicable).map((r) => r.code);
  const bad = rows.filter((r) => !r.applicable).map((r) => r.code);
  if (bad.length) {
    const cleaned = await run(good);
    if (bad.length && codes.length) throw new Error("That code isn't valid for this bag.");
    return { applied: good, subtotal: cleaned?.cost?.subtotalAmount, total: cleaned?.cost?.totalAmount };
  }
  return { applied: good, subtotal: cart?.cost?.subtotalAmount, total: cart?.cost?.totalAmount };
}
