import type { ShopifyProduct } from "@/lib/shopify";
import { shopifyImg } from "@/lib/shopify";
import { galleryUrls } from "@/lib/galleryIndex";

/*
 * Thumbnail for a cart line — the colourway the shopper actually chose, not
 * the product's lead image. Resolution order mirrors the product page:
 *   1. the hand-verified gallery index (first model shot for that colour),
 *   2. the Shopify image attached to the chosen variant (or any variant of
 *      the same colour that has one — colour images are shared per colour),
 *   3. the product's first image, as before.
 */
export function cartLineImage(
  product: ShopifyProduct,
  variantId: string,
  selectedOptions: Array<{ name: string; value: string }>,
  width = 400,
): { url: string; alt: string } | null {
  const node = product.node;
  const images = (node.images?.edges ?? []).map((e) => e.node);
  const colour = selectedOptions.find((o) => /colou?r/i.test(o.name))?.value ?? null;

  let url: string | undefined;

  if (colour) {
    const indexed = galleryUrls(node.handle, colour, images);
    if (indexed && indexed.length) url = indexed[0].url;
  }

  if (!url) {
    const variants = node.variants?.edges ?? [];
    const own = variants.find((v) => v.node.id === variantId)?.node;
    url = own?.image?.url;
    if (!url && colour) {
      const sameColour = variants.find(
        (v) =>
          v.node.image?.url &&
          v.node.selectedOptions.some((o) => /colou?r/i.test(o.name) && o.value === colour),
      );
      url = sameColour?.node.image?.url;
    }
  }

  if (!url) url = images[0]?.url;
  if (!url) return null;

  return { url: shopifyImg(url, width), alt: colour ? `${node.title} — ${colour}` : node.title };
}
