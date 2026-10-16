import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { fetchProducts, storefrontApiRequest } from "@/lib/shopify";

const BASE_URL = "https://auvellawear.com";

/* v196: the sitemap listed only home and the products. It now has the
   collection pages and the info pages too - every one answered 200 on the
   live site (16 Oct 2026). */
const INFO_PATHS = [
  "/pages/shipping",
  "/pages/returns",
  "/pages/privacy",
  "/pages/terms",
  "/pages/contact",
  "/pages/about",
  "/pages/size-guide",
  "/tracking",
];

/* Published to the storefront but not pages to index: laundry-bag and
   duo-eligible 404 on purpose (collections route), cool-shapewear has
   nothing in it. Empty collections are dropped below as well. */
const UNLISTED_COLLECTIONS = new Set(["all", "laundry-bag", "duo-eligible", "cool-shapewear"]);

// Handles plus one product id each - just enough to skip empty collections.
const SITEMAP_COLLECTIONS_QUERY = `
  query SitemapCollections {
    collections(first: 100) {
      nodes { handle products(first: 1) { nodes { id } } }
    }
  }
`;

async function collectionPaths(): Promise<string[]> {
  const data = await storefrontApiRequest(SITEMAP_COLLECTIONS_QUERY);
  const nodes: Array<{ handle: string; products: { nodes: unknown[] } }> =
    data?.data?.collections?.nodes ?? [];
  return nodes
    .filter((c) => c.products.nodes.length > 0 && !UNLISTED_COLLECTIONS.has(c.handle))
    .map((c) => `/collections/${c.handle}`);
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Either Shopify call can fail on its own; the rest still lists.
        const [productPaths, collections] = await Promise.all([
          fetchProducts(100)
            .then((products) => products.map((p) => `/product/${p.node.handle}`))
            .catch(() => [] as string[]),
          collectionPaths().catch(() => [] as string[]),
        ]);
        const paths = ["/", "/collections/all", ...collections, ...productPaths, ...INFO_PATHS];

        const urls = paths.map(
          (path) =>
            `  <url>\n    <loc>${BASE_URL}${path}</loc>\n    <changefreq>weekly</changefreq>\n  </url>`,
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
