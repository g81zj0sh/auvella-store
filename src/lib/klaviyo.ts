/*
 * Klaviyo client subscribe — used by the account page's "stay in the know"
 * opt-in. Public site key + list ID are browser-safe by design (this is the
 * same API Klaviyo's own signup forms use). Adds the profile to the
 * Newsletter list with SUBSCRIBED email consent, so campaigns and new-drop
 * sends actually reach them.
 */

const KLAVIYO_COMPANY_ID = "WCXDh5";
const NEWSLETTER_LIST_ID = "Swjk3e";

export async function subscribeToNewsletter(opts: {
  email: string;
  firstName?: string;
  lastName?: string;
  source?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(
      `https://a.klaviyo.com/client/subscriptions/?company_id=${KLAVIYO_COMPANY_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          revision: "2024-10-15",
        },
        body: JSON.stringify({
          data: {
            type: "subscription",
            attributes: {
              custom_source: opts.source ?? "Account page",
              profile: {
                data: {
                  type: "profile",
                  attributes: {
                    email: opts.email,
                    ...(opts.firstName ? { first_name: opts.firstName } : {}),
                    ...(opts.lastName ? { last_name: opts.lastName } : {}),
                  },
                },
              },
            },
            relationships: {
              list: { data: { type: "list", id: NEWSLETTER_LIST_ID } },
            },
          },
        }),
      },
    );
    return res.ok; // Klaviyo returns 202 on success
  } catch {
    return false;
  }
}
