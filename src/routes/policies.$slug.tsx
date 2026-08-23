import { createFileRoute, redirect } from "@tanstack/react-router";

/*
 * Shopify's system emails and checkout link to its standard policy URLs
 * (/policies/privacy-policy etc.). Our policy pages live at /pages/<slug>,
 * so map every standard Shopify policy path onto ours.
 */

const POLICY_MAP: Record<string, string> = {
  "privacy-policy": "privacy",
  "terms-of-service": "terms",
  "refund-policy": "returns",
  "shipping-policy": "shipping",
  "contact-information": "contact",
  "subscription-policy": "terms",
  "legal-notice": "terms",
};

export const Route = createFileRoute("/policies/$slug")({
  loader: ({ params }) => {
    const target = POLICY_MAP[params.slug] ?? "privacy";
    throw redirect({ to: "/pages/$slug", params: { slug: target }, replace: true });
  },
  component: () => null,
});
