import type { ShopifyProduct } from "@/lib/shopify";
import { BUNDLE_STYLE_NAMES } from "@/lib/bundleDeal";

/*
 * Pairs in a mixed underwear bundle (v177 builder, v179 pair quick view):
 * which style and colour each pair is, and the variant lookups both the
 * builder and the quick view use, so they always agree on stock.
 */

/** One pair in a mixed bundle. `size` is set only when the shopper changed
 *  this pair's size; otherwise it follows the page's size. */
export interface BundlePick {
  handle: string;
  colour: string;
  size?: string;
}

export type BundleVariant = ShopifyProduct["node"]["variants"]["edges"][number]["node"];

const optName = (p: ShopifyProduct, re: RegExp) =>
  p.node.options.find((o) => re.test(o.name))?.name;

const matches = (p: ShopifyProduct, v: BundleVariant, colour: string, size?: string) => {
  const c = optName(p, /colou?r/i);
  const s = optName(p, /size/i);
  return v.selectedOptions.every((o) =>
    o.name === c ? o.value === colour : o.name === s ? !size || o.value === size : true,
  );
};

/** The variant of `p` in this colour (and size, when given). */
export function bundleVariant(
  p: ShopifyProduct,
  colour: string,
  size?: string,
): BundleVariant | undefined {
  return p.node.variants.edges.find(({ node: v }) => matches(p, v, colour, size))?.node;
}

/** Whether any variant in this colour (and size, when given) can be bought. */
export function bundleCanBuy(p: ShopifyProduct, colour: string, size?: string): boolean {
  return p.node.variants.edges.some(
    ({ node: v }) => v.availableForSale && matches(p, v, colour, size),
  );
}

/** Short style name for tabs and pair cards ("Cotton Brief"). */
export const bundleStyleName = (p: ShopifyProduct) =>
  BUNDLE_STYLE_NAMES[p.node.handle] ?? p.node.title;
