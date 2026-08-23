/*
 * Auvella customer accounts — Shopify "new customer accounts" (the SKIMS flow).
 *
 * Login: we redirect to Shopify's hosted login (email → 6-digit code email →
 * verified) via OAuth 2.0 + PKCE, then exchange the returned code for tokens
 * and talk to the Customer Account API for profile + orders.
 *
 * ⬇️ ONE VALUE NEEDED FROM SHOPIFY ADMIN (see setup instructions):
 * Headless channel → Customer Account API → "Client ID". Until it's pasted,
 * the account page shows a friendly "almost ready" notice instead of a
 * broken login.
 */

export const CUSTOMER_CLIENT_ID = "b7537e6a-d931-4623-a8d6-90aaf3417392";
export const ACCOUNTS_READY = CUSTOMER_CLIENT_ID.length > 0;

const SHOP_ID = "98807382311";
const AUTH_BASE = `https://shopify.com/authentication/${SHOP_ID}`;
const API_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/2025-04/graphql`;
const TOKENS_KEY = "auvella_customer_tokens_v1";
const PKCE_KEY = "auvella_pkce_v1";

interface Tokens {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_at: number; // epoch ms
}

/* ---------------------------- PKCE helpers ---------------------------- */

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomString(length = 64): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return b64url(bytes).slice(0, length);
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function redirectUri(): string {
  return `${window.location.origin}/account/callback`;
}

/* ------------------------------ Login flow ---------------------------- */

export async function startLogin() {
  const verifier = randomString(64);
  const state = randomString(24);
  const challenge = b64url(await sha256(verifier));
  localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, state }));

  const params = new URLSearchParams({
    scope: "openid email customer-account-api:full",
    client_id: CUSTOMER_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  window.location.href = `${AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

export async function completeLogin(code: string, state: string): Promise<boolean> {
  const stored = localStorage.getItem(PKCE_KEY);
  if (!stored) return false;
  const { verifier, state: expectedState } = JSON.parse(stored);
  if (state !== expectedState) return false;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: CUSTOMER_CLIENT_ID,
    redirect_uri: redirectUri(),
    code,
    code_verifier: verifier,
  });
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return false;
  const data = await res.json();
  saveTokens(data);
  localStorage.removeItem(PKCE_KEY);
  return true;
}

function saveTokens(data: {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
}) {
  const tokens: Tokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    id_token: data.id_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

function readTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return readTokens() !== null;
}

async function refreshTokens(refresh_token: string): Promise<Tokens | null> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: CUSTOMER_CLIENT_ID,
    refresh_token,
  });
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const data = await res.json();
  saveTokens(data);
  return readTokens();
}

async function getValidAccessToken(): Promise<string | null> {
  let tokens = readTokens();
  if (!tokens) return null;
  if (Date.now() >= tokens.expires_at) {
    tokens = await refreshTokens(tokens.refresh_token);
    if (!tokens) {
      localStorage.removeItem(TOKENS_KEY);
      return null;
    }
  }
  return tokens.access_token;
}

export function logout() {
  const tokens = readTokens();
  localStorage.removeItem(TOKENS_KEY);
  const idToken = tokens?.id_token;
  if (idToken) {
    const params = new URLSearchParams({
      id_token_hint: idToken,
      post_logout_redirect_uri: window.location.origin,
    });
    window.location.href = `${AUTH_BASE}/logout?${params.toString()}`;
  } else {
    window.location.href = "/";
  }
}

/* -------------------------- Customer API calls ------------------------- */

async function customerFetch(query: string, variables: Record<string, unknown> = {}) {
  const token = await getValidAccessToken();
  if (!token) throw new Error("not_logged_in");
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0]?.message ?? "customer_api_error");
  return json.data;
}

export interface CustomerProfile {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

export async function fetchCustomerProfile(): Promise<CustomerProfile> {
  const data = await customerFetch(`
    query {
      customer {
        firstName
        lastName
        emailAddress { emailAddress }
      }
    }
  `);
  return {
    firstName: data.customer?.firstName ?? null,
    lastName: data.customer?.lastName ?? null,
    email: data.customer?.emailAddress?.emailAddress ?? null,
  };
}

export async function updateCustomerName(firstName: string, lastName: string) {
  const data = await customerFetch(
    `
    mutation update($input: CustomerUpdateInput!) {
      customerUpdate(input: $input) {
        customer { firstName lastName }
        userErrors { message }
      }
    }
  `,
    { input: { firstName, lastName } },
  );
  const errs = data.customerUpdate?.userErrors;
  if (errs?.length) throw new Error(errs[0].message);
  return data.customerUpdate?.customer;
}

export interface CustomerOrder {
  id: string;
  name: string;
  processedAt: string;
  totalAmount: string;
  totalCurrency: string;
  items: { title: string; quantity: number; imageUrl: string | null }[];
}

export async function fetchCustomerOrders(): Promise<CustomerOrder[]> {
  const data = await customerFetch(`
    query {
      customer {
        orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
          nodes {
            id
            name
            processedAt
            totalPrice { amount currencyCode }
            lineItems(first: 10) {
              nodes { title quantity image { url } }
            }
          }
        }
      }
    }
  `);
  const nodes = data.customer?.orders?.nodes ?? [];
  return nodes.map((o: any) => ({
    id: o.id,
    name: o.name,
    processedAt: o.processedAt,
    totalAmount: o.totalPrice?.amount ?? "0",
    totalCurrency: o.totalPrice?.currencyCode ?? "USD",
    items: (o.lineItems?.nodes ?? []).map((li: any) => ({
      title: li.title,
      quantity: li.quantity,
      imageUrl: li.image?.url ?? null,
    })),
  }));
}
