import type { ShopifyProduct } from "@/lib/shopify";

/*
 * Colour → gallery-slice mapping.
 *
 * Galleries are ordered by colour: every shot of colour A, then every shot of
 * colour B, and so on. Each variant carries a featured image, which is the
 * first shot of its colour — so a colour's run is the slice from its own lead
 * image up to the next colour's lead.
 *
 * Verified against the catalogue: on a 4-colour, 20-image product the leads sit
 * at 1/6/11/16, exactly the group boundaries.
 *
 * Within a run the model shots come first and the garment-only ("ghost") shots
 * last. How many of each varies — some sets have a side view, some are just
 * front and back — so the split is detected from the backdrop rather than
 * assumed from a fixed stride (see isGhostBackdrop).
 */

export type GalleryImage = { node: { url: string; altText: string | null } };

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

export function colorOptionName(node: ShopifyProduct["node"]): string | null {
  return node.options.find((o) => /colou?r/i.test(o.name))?.name ?? null;
}

/** Ordered gallery slice for each colour value. */
export function buildColorImageMap(
  node: ShopifyProduct["node"],
): Map<string, GalleryImage[]> {
  const map = new Map<string, GalleryImage[]>();
  const optName = colorOptionName(node);
  if (!optName) return map;

  const images: GalleryImage[] = node.images.edges.map((e) => ({ node: e.node }));
  const values = node.options.find((o) => o.name === optName)?.values ?? [];

  const leadIdx = new Map<string, number>();
  for (const value of values) {
    const v = node.variants.edges.find(
      (vv) =>
        vv.node.selectedOptions.some((o) => o.name === optName && o.value === value) &&
        vv.node.image?.url,
    );
    if (!v?.node.image?.url) continue;
    const idx = images.findIndex((im) => pathOf(im.node.url) === pathOf(v.node.image!.url));
    if (idx >= 0) leadIdx.set(value, idx);
  }

  // Only slice positionally when every colour has its own distinct lead —
  // otherwise the runs would overlap and we'd show the wrong colour.
  const idxList = [...leadIdx.values()];
  const positional =
    idxList.length > 0 &&
    idxList.length === values.filter((v) => leadIdx.has(v)).length &&
    new Set(idxList).size === idxList.length;

  const sortedLeads = [...leadIdx.entries()].sort((a, b) => a[1] - b[1]);

  for (const value of values) {
    if (positional && leadIdx.has(value)) {
      const start = leadIdx.get(value)!;
      const pos = sortedLeads.findIndex(([v]) => v === value);
      const end = pos + 1 < sortedLeads.length ? sortedLeads[pos + 1][1] : images.length;
      map.set(value, images.slice(start, end));
    } else {
      // No trustworthy ordering: fall back to just the variant's own image.
      const v = node.variants.edges.find(
        (vv) =>
          vv.node.selectedOptions.some((o) => o.name === optName && o.value === value) &&
          vv.node.image?.url,
      );
      map.set(
        value,
        v?.node.image?.url ? [{ node: { url: v.node.image.url, altText: value } }] : [],
      );
    }
  }
  return map;
}
