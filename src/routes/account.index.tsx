import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import {
  ACCOUNTS_READY,
  fetchCustomerOrders,
  fetchCustomerProfile,
  isLoggedIn,
  logout,
  startLogin,
  updateCustomerName,
} from "@/lib/customerAuth";
import { subscribeToNewsletter } from "@/lib/klaviyo";
import { useDisplayPrice } from "@/lib/preferences";
import { ProductCard } from "@/components/site/ProductCard";
import { fetchProductByHandle, type ShopifyProduct } from "@/lib/shopify";
import { useRecentlyViewed } from "@/stores/recentlyViewedStore";

/*
 * /account — SKIMS-style account area in Auvella's language.
 * Left nav: About You · Order History · Log Out.
 * Signed out → sign-in prompt that kicks off Shopify's hosted
 * email → 6-digit-code login (the SKIMS flow).
 */

export const Route = createFileRoute("/account/")({
  component: AccountPage,
});

type Section = "about" | "orders";

function AccountPage() {
  const [mounted, setMounted] = useState(false);
  const [section, setSection] = useState<Section>("about");
  useEffect(() => setMounted(true), []);

  const loggedIn = mounted && isLoggedIn();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-5xl pb-24 pt-32 md:pt-40">
        {!mounted ? null : !ACCOUNTS_READY ? (
          <NotReady />
        ) : !loggedIn ? (
          <SignedOut />
        ) : (
          <div className="md:flex md:gap-16">
            <nav className="flex gap-8 border-b border-[#EBEBEB] pb-4 md:block md:w-48 md:shrink-0 md:space-y-5 md:border-0 md:pb-0">
              <NavItem label="About You" active={section === "about"} onClick={() => setSection("about")} />
              <NavItem label="Order History" active={section === "orders"} onClick={() => setSection("orders")} />
              <button
                onClick={logout}
                className="text-[12px] uppercase tracking-[0.14em] text-[#888888] transition-colors hover:text-[#0a0a0a]"
              >
                Log Out
              </button>
            </nav>
            <div className="mt-8 min-w-0 flex-1 md:mt-0">
              {section === "about" ? <AboutYou /> : <OrderHistory />}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`block text-[12px] uppercase tracking-[0.14em] transition-colors ${
        active ? "text-[#0a0a0a] underline underline-offset-[6px]" : "text-[#888888] hover:text-[#0a0a0a]"
      }`}
    >
      {label}
    </button>
  );
}

function NotReady() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="font-serif text-3xl font-light text-[#0a0a0a]">Accounts</h1>
      <p className="mt-4 text-[13px] leading-relaxed text-[#888888]">
        Customer accounts are almost ready — we're switching this on shortly.
        In the meantime your bag and favourites are saved right here in your
        browser.
      </p>
      <Link
        to="/collections/$handle"
        params={{ handle: "best-sellers" }}
        className="mt-8 inline-flex h-11 items-center bg-[#0a0a0a] px-8 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        Continue Shopping
      </Link>
    </div>
  );
}

function SignedOut() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="font-serif text-3xl font-light tracking-[0.06em] text-[#0a0a0a]">
        YOUR ACCOUNT
      </h1>
      <p className="mt-4 text-[13px] leading-relaxed text-[#888888]">
        Sign in with your email — we'll send you a one-time code, no password
        to remember. New here? The same step creates your account.
      </p>
      <button
        onClick={() => startLogin()}
        className="mt-8 inline-flex h-11 items-center bg-[#0a0a0a] px-10 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
      >
        Sign In / Create Account
      </button>
    </div>
  );
}

/* ------------------------------ About You ------------------------------ */

function AboutYou() {
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["customer-profile"],
    queryFn: fetchCustomerProfile,
    staleTime: 60_000,
    retry: 1,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
    }
  }, [profile]);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateCustomerName(firstName.trim(), lastName.trim());
      qc.invalidateQueries({ queryKey: ["customer-profile"] });
      setDirty(false);
      toast.success("Saved", { position: "top-center" });
    } catch (e) {
      toast.error("Couldn't save — please try again", { position: "top-center" });
    } finally {
      setSaving(false);
    }
  };

  const onSubscribe = async () => {
    if (!profile?.email) return;
    setSubscribing(true);
    const ok = await subscribeToNewsletter({
      email: profile.email,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      source: "Account — Stay in the Know",
    });
    setSubscribing(false);
    if (ok) {
      setSubscribed(true);
      toast.success("You're on the list", { position: "top-center" });
    } else {
      toast.error("Couldn't subscribe — please try again", { position: "top-center" });
    }
  };

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-[#0a0a0a]" />;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-light tracking-[0.06em] text-[#0a0a0a]">
        ABOUT YOU
      </h1>

      <div className="mt-8 grid max-w-lg gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#888888]">First Name</span>
          <input
            value={firstName}
            onChange={(e) => { setFirstName(e.target.value); setDirty(true); }}
            className="mt-1.5 h-11 w-full border border-[#EBEBEB] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#888888]">Last Name</span>
          <input
            value={lastName}
            onChange={(e) => { setLastName(e.target.value); setDirty(true); }}
            className="mt-1.5 h-11 w-full border border-[#EBEBEB] bg-white px-3 text-[14px] text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-[0.14em] text-[#888888]">Email</span>
          <input
            value={profile?.email ?? ""}
            disabled
            className="mt-1.5 h-11 w-full border border-[#EBEBEB] bg-[#FAFAF8] px-3 text-[14px] text-[#888888]"
          />
        </label>
      </div>

      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className={`mt-6 inline-flex h-11 items-center px-8 text-[11px] uppercase tracking-[0.18em] transition ${
          dirty && !saving
            ? "bg-[#0a0a0a] text-white hover:opacity-90"
            : "cursor-not-allowed border border-[#EBEBEB] text-[#bbbbbb]"
        }`}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
      </button>

      {/* Stay in the know */}
      <div className="mt-12 max-w-lg border-t border-[#EBEBEB] pt-8">
        <h2 className="font-serif text-lg font-light tracking-[0.06em] text-[#0a0a0a]">
          STAY IN THE KNOW
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">
          New drops, restocks and Auvella-only offers, straight to your inbox.
          Unsubscribe anytime with one click.
        </p>
        {subscribed ? (
          <p className="mt-4 inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-[#0a0a0a]">
            <Check className="h-4 w-4" /> You're on the list
          </p>
        ) : (
          <button
            onClick={onSubscribe}
            disabled={subscribing}
            className="mt-4 inline-flex h-11 items-center border border-[#0a0a0a] px-8 text-[11px] uppercase tracking-[0.18em] text-[#0a0a0a] transition hover:bg-[#0a0a0a] hover:text-white"
          >
            {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Me Up"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------------------- Order History ---------------------------- */

function OrderHistory() {
  const display = useDisplayPrice();
  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders"],
    queryFn: fetchCustomerOrders,
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-[#0a0a0a]" />;
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-light tracking-[0.06em] text-[#0a0a0a]">
        ORDER HISTORY
      </h1>

      {!orders || orders.length === 0 ? (
        <div className="mt-8">
          <p className="text-[13px] text-[#888888]">You haven't placed any orders yet.</p>
          <Link
            to="/collections/$handle"
            params={{ handle: "best-sellers" }}
            className="mt-6 inline-flex h-11 items-center bg-[#0a0a0a] px-8 text-[11px] uppercase tracking-[0.18em] text-white transition-opacity hover:opacity-90"
          >
            Shop Best Sellers
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((o) => (
            <div key={o.id} className="border border-[#EBEBEB] p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0a0a0a]">
                  Order {o.name}
                </p>
                <p className="text-[12px] text-[#888888]">
                  {new Date(o.processedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="mt-4 space-y-3">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {it.imageUrl && (
                      <img src={it.imageUrl} alt="" className="h-14 w-11 object-cover object-top" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[12px] uppercase tracking-[0.04em] text-[#0a0a0a]">
                        {it.title}
                      </p>
                      <p className="text-[11px] text-[#888888]">Qty {it.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-[#0a0a0a]">
                Total: {display(o.totalAmount, o.totalCurrency)}
              </p>
            </div>
          ))}
        </div>
      )}

      <RecentlyViewed />
    </div>
  );
}

/*
 * Recently Viewed — pieces the customer has opened (PDP or Quick Add),
 * newest first, straight from the persisted recently-viewed store.
 * Renders nothing until there's something to show.
 */
function RecentlyViewed() {
  const handles = useRecentlyViewed((s) => s.handles);
  const { data: products } = useQuery({
    queryKey: ["recently-viewed-products", handles],
    queryFn: async () => {
      const results = await Promise.all(handles.map((h) => fetchProductByHandle(h)));
      // Keep store order (newest first); drop anything unpublished/deleted.
      return results.filter((p): p is ShopifyProduct => p !== null);
    },
    enabled: handles.length > 0,
    staleTime: 60 * 1000,
  });

  if (!products || products.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="font-serif text-xl font-light tracking-[0.06em] text-[#0a0a0a]">
        RECENTLY VIEWED
      </h2>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.node.handle} product={p} />
        ))}
      </div>
    </section>
  );
}
