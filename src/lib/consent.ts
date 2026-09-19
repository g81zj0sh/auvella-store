/*
 * Cookie consent.
 *
 * The storefront loads the Meta Pixel, which is a non-essential tracking
 * technology. Under UK PECR (and the GDPR standard of consent it borrows),
 * that may only load AFTER the visitor has agreed — so initMetaPixel() is
 * gated on hasMarketingConsent() and nothing fires until a choice is made.
 *
 * Two things this deliberately does NOT do:
 *
 *  - It does not treat "no answer yet" as consent. Silence is not consent and
 *    a closed banner is not acceptance.
 *  - It does not make declining harder than accepting. The ICO has been
 *    explicit that refusing must be as easy as agreeing, so both buttons sit
 *    together with equal weight. Several large retailers show a prominent
 *    "Accept all" against a faint "Settings" link; that is not a pattern to
 *    copy.
 *
 * Essential storage (the bag, shipping country, currency) is exempt — it is
 * strictly necessary to provide a service the visitor asked for — so it keeps
 * working regardless of the answer here.
 */

const KEY = "auvella_cookie_consent_v1";

export type ConsentChoice = "accepted" | "declined";
export type ConsentState = ConsentChoice | null;

type Listener = (state: ConsentState) => void;
const listeners = new Set<Listener>();

export function readConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(KEY, choice);
  } catch {
    /* private mode — consent lasts the session only, which is acceptable */
  }
  for (const l of listeners) l(choice);
}

/** Clears the stored answer so the banner is shown again. */
export function resetConsent(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  for (const l of listeners) l(null);
}

export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True only on an explicit yes. Unanswered means no. */
export function hasMarketingConsent(): boolean {
  return readConsent() === "accepted";
}
