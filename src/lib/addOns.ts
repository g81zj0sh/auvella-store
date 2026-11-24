/*
 * The add-ons (v238, the ads chat's brief of 23 Nov 2026): small items shown
 * as "Complete the look" on bodysuit pages and in the bag
 * (components/site/AddOns). Their cup sizes and tape widths don't use the
 * clothing size guide, so their pages and quick add show none.
 */
export const ADD_ON_HANDLES: readonly string[] = ["stick-on-push-up-bra", "lift-tape"];

export function isAddOn(handle: string | null | undefined): boolean {
  return !!handle && ADD_ON_HANDLES.includes(handle);
}
