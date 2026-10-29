import { type ConsentChoice } from "@/lib/consent";
import { SHOPIFY_STOREFRONT_TOKEN } from "@/lib/shopify";

/*
 * v220: the cookie choice goes to Shopify too, so checkout knows it. The
 * banner's answer lives in this site's own storage, which checkout on
 * www.auvellawear.com can't read - so Shopify's tags there (the "Meta
 * Purchase" pixel under Customer events, Marketing permission) never ran.
 *
 * Shopify's Customer Privacy API in headless mode: its script asks the
 * Storefront API on the checkout domain for a signed _tracking_consent value
 * and sets it as a cookie on auvellawear.com, which checkout reads. Accept
 * passes marketing only - what the banner asks about (ad measurement and
 * emails) - with analytics and preferences false. Decline passes all three
 * false.
 *
 * The script loads only when a choice is made or changed (Accept, Decline,
 * Cookie settings): never on page load, never for someone who hasn't chosen.
 * Checkout doesn't wait for it. Once a browser has been to checkout, Shopify
 * keeps that choice in its own cookies on www and goes by them, not this
 * cookie - so every checkout link carries the current choice as well
 * (visitorConsent, lib/shopify).
 */

const API_SCRIPT = "https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js";
const STOREFRONT_DOMAIN = "auvellawear.com";
const CHECKOUT_DOMAIN = "www.auvellawear.com";
// Whatever waits on Shopify (the reload after a withdrawal) waits this long
// at most.
const WAIT_MS = 2500;
// A request that never answers mustn't hold up the next choice.
const GIVE_UP_MS = 10_000;

type CustomerPrivacy = {
  setTrackingConsent: (
    consent: Record<string, unknown>,
    callback: (result?: { error?: string } | null) => void,
  ) => void;
};

declare global {
  interface Window {
    Shopify?: { customerPrivacy?: Partial<CustomerPrivacy> };
  }
}

let api: Promise<CustomerPrivacy | null> | null = null;
// One choice at a time, in order, so an earlier answer can't land after a
// later one.
let queue: Promise<void> = Promise.resolve();
let pending: { choice: ConsentChoice; done: Promise<void> } | null = null;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function loadApi(): Promise<CustomerPrivacy | null> {
  const ready = () => {
    const cp = window.Shopify?.customerPrivacy;
    return typeof cp?.setTrackingConsent === "function" ? (cp as CustomerPrivacy) : null;
  };
  if (!api) {
    api = new Promise((resolve) => {
      if (ready()) return resolve(ready());
      const script = document.createElement("script");
      script.src = API_SCRIPT;
      script.async = true;
      script.onload = () => resolve(ready());
      script.onerror = () => {
        // Blocked or offline: the next choice tries again.
        api = null;
        resolve(null);
      };
      document.head.appendChild(script);
    });
  }
  return api;
}

function send(choice: ConsentChoice): Promise<void> {
  return new Promise((resolve) => {
    const giveUp = setTimeout(resolve, GIVE_UP_MS);
    const finish = () => {
      clearTimeout(giveUp);
      resolve();
    };
    void loadApi().then((cp) => {
      if (!cp) return finish();
      try {
        cp.setTrackingConsent(
          {
            marketing: choice === "accepted",
            analytics: false,
            preferences: false,
            headlessStorefront: true,
            checkoutRootDomain: CHECKOUT_DOMAIN,
            storefrontRootDomain: STOREFRONT_DOMAIN,
            storefrontAccessToken: SHOPIFY_STOREFRONT_TOKEN,
          },
          (result) => {
            if (result?.error) console.debug("[shopify consent] not passed:", result.error);
            finish();
          },
        );
      } catch {
        finish();
      }
    });
  });
}

function enqueue(choice: ConsentChoice): Promise<void> {
  const done = (queue = queue.then(() => send(choice)));
  pending = { choice, done };
  void done.then(() => {
    if (pending?.done === done) pending = null;
  });
  return done;
}

/**
 * Passes a choice to Shopify. Resolves once Shopify has it, or after WAIT_MS
 * so nothing waiting on it ever hangs.
 */
export function passChoiceToShopify(choice: ConsentChoice): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.location.hostname !== STOREFRONT_DOMAIN) {
    console.debug("[shopify consent] not the live site. Would pass:", {
      marketing: choice === "accepted",
      analytics: false,
      preferences: false,
    });
    return Promise.resolve();
  }
  const done = pending?.choice === choice ? pending.done : enqueue(choice);
  return Promise.race([done, wait(WAIT_MS)]);
}
