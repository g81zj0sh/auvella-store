import { PRODUCT_FACETS } from "@/lib/productFacets";

/*
 * Products the Returns & Refund Policy (routes/pages.$slug.tsx, "returns")
 * makes final sale for hygiene: underwear (briefs, thongs and underwear sets)
 * and the silk sleep mask. They can't be returned or exchanged for size unless
 * faulty or incorrect, so product pages must not offer either on them.
 *
 * Anything filed as Underwear in productFacets.ts is covered automatically, so
 * a new brief or set can't slip through; the list below adds products with no
 * Underwear facet. Keep both in step with the policy text.
 */
const FINAL_SALE_EXTRA_HANDLES: string[] = [
  "cotton-lace-brief",
  "lace-breathable-thong-underwear",
  "womens-high-waisted-breathable-traceless-thong-panties",
  "womens-lace-underwear-set",
  "womens-menstrual-period-panties",
  "silk-sleep-eye-mask",
];

export function isFinalSale(handle: string | undefined | null): boolean {
  if (!handle) return false;
  return (
    FINAL_SALE_EXTRA_HANDLES.includes(handle) || PRODUCT_FACETS[handle]?.category === "Underwear"
  );
}
