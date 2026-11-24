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

/*
 * v238 (owner, 24 Nov 2026): hygiene items - the Stick-On Push-Up Bra, the
 * Lift Tape and any like them listed later (nipple covers, pasties, tape).
 * Not final sale: they keep the 30 days, but only unused and in their
 * original packaging; once worn, only if faulty. The Returns & Refund Policy
 * takes back unworn items only, so it's the same rule, said for these.
 * Bodysuits and everything else keep the Try-On Guarantee.
 *
 * The two by handle (a title can change in Shopify), plus any product whose
 * name says stick-on, nipple, pasties or tape, so a new one is covered the
 * day it's listed. No other live product's name matches (24 Nov 2026); the
 * Body Adhesive (clothing glue) is left as it is - the owner hasn't ruled on it.
 */
const HYGIENE_HANDLES: string[] = ["stick-on-push-up-bra", "lift-tape"];
const HYGIENE_NAME = /\b(stick[- ]on|nipples?|pasties|tape)\b/i;

export function isHygieneItem(handle: string | undefined | null, title = ""): boolean {
  if (!handle || isFinalSale(handle)) return false;
  return HYGIENE_HANDLES.includes(handle) || HYGIENE_NAME.test(title);
}

/** The owner's wording for them (24 Nov 2026). */
export const HYGIENE_RETURNS_LINE = "30-day returns if unused";
export const HYGIENE_TITLE = "Hygiene item";
export const HYGIENE_DETAIL =
  "Return it within 30 days if it's unused and in its original packaging. Once worn, it can't be returned unless it's faulty.";
