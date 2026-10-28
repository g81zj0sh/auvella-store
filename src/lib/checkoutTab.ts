import { metaEventsSent } from "@/lib/metaPixel";

/*
 * v218: where checkout opens. Every ad click lands inside Instagram's or
 * Facebook's own browser, and on a phone a new tab strands the shopper (the
 * in-app browsers can't hand it back), so phones open checkout in this tab.
 * Laptops and tablets keep the new tab.
 */
const IN_APP_BROWSER = /Instagram|FBAN|FBAV/i;

export function checkoutInSameTab(): boolean {
  if (typeof window === "undefined") return false;
  if (IN_APP_BROWSER.test(navigator.userAgent)) return true;
  // A touch screen narrower than the md breakpoint, where the phone layout and
  // its sticky buy bar show.
  return window.matchMedia("(pointer: coarse) and (max-width: 767px)").matches;
}

/** Opens checkout in this tab once the checkout event has gone to Meta. */
export async function openCheckoutHere(url: string): Promise<void> {
  await metaEventsSent();
  window.location.assign(url);
}
