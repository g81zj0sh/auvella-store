import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { lookupOrder, type LookupResult, type TrackedOrder } from "@/lib/orderTracking.functions";

/* ------------------------------------------------------------------ */
/* Copy — every line here is meant to be true.                         */
/* ------------------------------------------------------------------ */

const DELIVERY_WINDOW = "5 to 12 business days";
const SUPPORT_EMAIL = "support@auvellawear.com";

const STAGES: { n: 1 | 2 | 3 | 4; title: string; detail: string }[] = [
  { n: 1, title: "Order confirmed", detail: "Payment taken and your order logged." },
  { n: 2, title: "Being prepared", detail: "Picked and packed by our supply partner." },
  { n: 3, title: "Dispatched & in transit", detail: "With the courier and on its way to you." },
  { n: 4, title: "Delivered", detail: "At your door." },
];

/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/tracking")({
  head: () => ({
    meta: [
      { title: "Track your order — Auvella" },
      {
        name: "description",
        content: `Check where your Auvella order is. Standard delivery is ${DELIVERY_WINDOW}; we'd rather say so than promise faster.`,
      },
      { property: "og:title", content: "Track your order — Auvella" },
    ],
  }),
  component: TrackingPage,
});

function TrackingPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setResult(null);
    try {
      const r = await lookupOrder({ data: { orderNumber, email } });
      setResult(r);
    } catch {
      setResult({ ok: false, reason: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="mx-auto max-w-[680px] px-5 pb-24 pt-14 md:pt-20">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#8a8a8a]">Order tracking</p>
          <h1 className="mt-4 font-serif text-[34px] font-light leading-[1.1] text-[#0a0a0a] md:text-[42px]">
            Where's my order?
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-[1.7] text-[#555555]">
            Enter your order number, then any one of the email address, phone number or postcode you used at checkout.
          </p>
        </header>

        {/* ---------- Lookup form ---------- */}
        <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-[440px]" noValidate>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#0a0a0a]">Order number</span>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="#1042"
              inputMode="numeric"
              autoComplete="off"
              required
              className="mt-2 h-12 w-full border border-[#ebebeb] bg-white px-4 text-[15px] text-[#0a0a0a] outline-none placeholder:text-[#b5b5b5] focus:border-[#0a0a0a]"
            />
          </label>
          <label className="mt-5 block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#0a0a0a]">
              Email, phone or postcode
            </span>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com, 07700 900000 or B90 4UF"
              autoComplete="email"
              required
              className="mt-2 h-12 w-full border border-[#ebebeb] bg-white px-4 text-[15px] text-[#0a0a0a] outline-none placeholder:text-[#b5b5b5] focus:border-[#0a0a0a]"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="mt-7 flex h-12 w-full items-center justify-center bg-[#0a0a0a] text-[11px] font-medium uppercase tracking-[0.22em] text-white transition-colors hover:bg-[#555555] disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Track my order"}
          </button>
        </form>

        {/* ---------- Result ---------- */}
        {result && (
          <section className="mt-12" aria-live="polite">
            {result.ok ? <OrderResult order={result.order} /> : <LookupFailure reason={result.reason} orderNumber={orderNumber} />}
          </section>
        )}

        {/* ---------- Delivery window, said plainly ---------- */}
        <aside className="mt-14 border border-[#0a0a0a] px-6 py-7 md:px-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#8a8a8a]">The honest version</p>
          <p className="mt-3 text-[15px] leading-[1.75] text-[#0a0a0a]">
            Our garments ship directly from our supply partner rather than a UK warehouse, so standard delivery is a
            steady <strong className="font-medium">{DELIVERY_WINDOW}</strong>. We'd rather tell you that here than
            print "3–5 days" and let you find out otherwise. Tracking appears on this page as soon as the courier
            issues it.
          </p>
        </aside>
      </main>

      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OrderResult({ order }: { order: TrackedOrder }) {
  const overWindow = order.businessDaysSinceOrder > 12;
  const placed = new Date(order.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[#ebebeb] pb-4">
        <p className="font-serif text-[22px] font-light text-[#0a0a0a]">Order {order.name}</p>
        <p className="text-[12px] text-[#8a8a8a]">Placed {placed}</p>
      </div>

      {order.cancelled ? (
        <p className="mt-6 text-[15px] leading-[1.7] text-[#555555]">
          This order was cancelled. If that's not what you expected, email{" "}
          <SupportLink orderName={order.name} /> and we'll sort it.
        </p>
      ) : (
        <>
          <StageTracker current={order.stage} />

          {/* Tracking details, only when real */}
          {(order.trackingNumber || order.trackingUrl) && (
            <div className="mt-8 border border-[#ebebeb] px-5 py-4 text-[14px] leading-[1.7] text-[#555555]">
              {order.courier && <p>Courier: <span className="text-[#0a0a0a]">{order.courier}</span></p>}
              {order.trackingNumber && <p>Tracking number: <span className="text-[#0a0a0a]">{order.trackingNumber}</span></p>}
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block border-b border-[#0a0a0a] text-[#0a0a0a]">
                  Open courier tracking
                </a>
              )}
            </div>
          )}

          {/* On schedule vs. over the window */}
          {order.stage < 4 && (
            <div className="mt-8 bg-[#f4f4f2] px-5 py-5 text-[14px] leading-[1.7] text-[#555555]">
              {overWindow ? (
                <>
                  <p className="text-[#0a0a0a]">
                    It's been {order.businessDaysSinceOrder} business days, which is past our usual window.
                  </p>
                  <p className="mt-2">
                    That's on us to chase, not you. Email us and we'll find out where it is:{" "}
                    <SupportLink orderName={order.name} />
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[#0a0a0a]">Your order is moving on schedule.</p>
                  <p className="mt-2">
                    Day {order.businessDaysSinceOrder} of a {DELIVERY_WINDOW} window. We'll add tracking here as soon as the
                    courier issues it.
                  </p>
                </>
              )}
            </div>
          )}

          {order.orderStatusUrl && (
            <p className="mt-6 text-[13px] text-[#8a8a8a]">
              You can also view the full order on{" "}
              <a href={order.orderStatusUrl} className="border-b border-[#8a8a8a] text-[#555555]">your order page</a>.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StageTracker({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Order progress">
      {STAGES.map((s) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="min-w-0">
            <div className={`h-[3px] w-full ${done || active ? "bg-[#0a0a0a]" : "bg-[#ebebeb]"}`} />
            <p className={`mt-3 text-[11px] uppercase tracking-[0.12em] ${done || active ? "text-[#0a0a0a]" : "text-[#b5b5b5]"}`}>
              {s.title}
            </p>
            <p className={`mt-1 hidden text-[12px] leading-[1.5] md:block ${active ? "text-[#555555]" : "text-[#b5b5b5]"}`}>
              {s.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function LookupFailure({ reason, orderNumber }: { reason: Exclude<LookupResult, { ok: true }>["reason"]; orderNumber: string }) {
  const name = orderNumber.trim() ? `#${orderNumber.replace(/[^0-9]/g, "")}` : "";
  const copy: Record<typeof reason, string> = {
    invalid: "Check the order number (it's the one starting with #) and your email, phone or postcode, then try again.",
    "not-found": "We couldn't find a matching order. Check the order number, and try a different detail — the email, phone number or postcode from your order all work.",
    "not-configured":
      "Order lookup isn't switched on yet. Email us with your order number and we'll tell you exactly where it is.",
    error: "Something went wrong on our side, not yours. Try again in a minute, or email us with your order number.",
  };
  return (
    <div className="border border-[#ebebeb] px-5 py-5 text-[14px] leading-[1.7] text-[#555555]">
      <p>{copy[reason]}</p>
      {reason !== "invalid" && (
        <p className="mt-2">
          <SupportLink orderName={name || undefined} />
        </p>
      )}
    </div>
  );
}

function SupportLink({ orderName }: { orderName?: string }) {
  const subject = orderName ? `Order ${orderName}` : "My order";
  return (
    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`} className="border-b border-[#0a0a0a] text-[#0a0a0a]">
      {SUPPORT_EMAIL}
    </a>
  );
}
