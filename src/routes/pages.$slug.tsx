import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/* ------------------------------------------------------------------ */
/* Store information & policy pages.                                   */
/* Content is specific to Auvella's real setup: email-only support     */
/* (support@auvellawear.com), USD store, US free shipping ≥ $70,       */
/* international free ≥ $95 USD-equivalent, 30-day returns.           */
/* Keep these in sync with the Shopify Settings → Policies documents. */
/* ------------------------------------------------------------------ */

const SUPPORT_EMAIL = "support@auvellawear.com";

function H2({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mt-10 font-serif text-xl font-light text-[#0a0a0a]">{children}</h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-[14px] leading-relaxed text-[#444444]">{children}</p>;
}
function LI({ children }: { children: React.ReactNode }) {
  return <li className="mt-2 text-[14px] leading-relaxed text-[#444444]">{children}</li>;
}
function Email() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
      {SUPPORT_EMAIL}
    </a>
  );
}

const PAGES: Record<string, { title: string; body: React.ReactNode }> = {
  contact: {
    title: "Contact Us",
    body: (
      <>
        <P>
          We're here to help with orders, sizing, shipping, returns and anything else. The
          fastest way to reach us is by email — we respond to every message.
        </P>
        <H2>Email</H2>
        <P>
          <Email /> — we aim to reply within 24–48 hours, Monday to Friday.
        </P>
        <H2>Before you write — quick answers</H2>
        <ul className="mt-2 list-disc pl-5">
          <LI>
            <strong>Where's my order?</strong> You'll receive a shipping confirmation email
            with tracking as soon as your order is dispatched. Allow up to 48 hours for
            tracking to activate.
          </LI>
          <LI>
            <strong>Can I change or cancel my order?</strong> Email us as soon as possible
            with your order number. We can change or cancel any order that hasn't been
            dispatched yet.
          </LI>
          <LI>
            <strong>How do I start a return?</strong> Email us within 30 days of delivery
            with your order number and the item(s) you'd like to return — full details on
            our <Link to="/pages/$slug" params={{ slug: "returns" }} className="underline underline-offset-2">Returns &amp; Refunds</Link> page.
          </LI>
          <LI>
            <strong>Sizing help?</strong> Every product page has a size guide specific to
            that piece. If you're between sizes, email us with your measurements and we'll
            recommend the best fit.
          </LI>
        </ul>
        <H2>When you email, please include</H2>
        <ul className="mt-2 list-disc pl-5">
          <LI>Your order number (in your confirmation email, e.g. #1234)</LI>
          <LI>The email address used at checkout</LI>
          <LI>Photos, if your message is about a damaged or incorrect item</LI>
        </ul>
        <P>
          Auvella is an online-only store; we don't offer phone support, but email reaches
          our whole support team and keeps a written record of everything we agree — which
          means faster, more reliable resolutions for you.
        </P>
      </>
    ),
  },

  about: {
    title: "About Auvella",
    body: (
      <>
        <P>
          Auvella makes sculpting essentials for real life — shapewear, bodysuits,
          intimates, swim and loungewear designed to smooth where you want it and move
          with you everywhere else.
        </P>
        <P>
          We started with a simple frustration: shapewear that felt like a compromise.
          Pieces that rolled, dug in, or looked like equipment rather than clothing. So we
          set out to build a line where every piece earns its place — seamless
          construction, considered compression levels from light smoothing to maximum
          sculpt, and fabrics chosen for how they feel at hour ten, not just in the
          mirror.
        </P>
        <P>
          Every silhouette in our range is specced deliberately: wireless bras that
          actually support, bodysuits with genuinely adjustable fits, swim with proper
          lining, lounge sets you'll reach for daily. We keep the collection tight rather
          than endless — if it's on the site, it's because it does its job.
        </P>
        <P>
          We ship worldwide from our fulfilment partners, offer a 30-day return window,
          and answer every email at <Email />. You were never the problem — the fit was.
        </P>
      </>
    ),
  },

  shipping: {
    title: "Shipping Policy",
    body: (
      <>
        <P>
          All prices on auvellawear.com are set in US Dollars (USD) and displayed in your
          local currency at current exchange rates. Shipping is calculated at checkout in
          the same way.
        </P>
        <H2>Processing time</H2>
        <P>
          Orders are processed and dispatched within 1–2 business days (Monday–Friday,
          excluding public holidays). During launch periods or promotions this can extend
          slightly; if your order will be delayed we'll email you.
        </P>
        <H2>Shipping rates</H2>
        <P>
          We offer a single express shipping service to every country we ship to — no
          slower option to choose between, and no surprise upgrades at checkout.
        </P>
        <ul className="mt-2 list-disc pl-5">
          <LI>
            <strong>United States and international</strong> — $6.74 flat rate
          </LI>
          <LI>
            <strong>Australia</strong> — $9.99 flat rate
          </LI>
          <LI>
            <strong>Free express shipping on all orders over $95 USD</strong>{" "}
            (approximately £75 / €85, converted automatically at checkout) — this applies
            everywhere we ship, including Australia
          </LI>
        </ul>
        <H2>Delivery times</H2>
        <P>
          Delivery times are counted in business days from dispatch, not from the moment
          you order — add the 1–2 day processing window above.
        </P>
        <ul className="mt-2 list-disc pl-5">
          <LI>
            <strong>United States</strong> — typically 3–8 business days after dispatch
          </LI>
          <LI>
            <strong>International and Australia</strong> — typically 5–12 business days
            after dispatch, depending on destination and customs processing
          </LI>
        </ul>
        <P>
          These are estimates, not guarantees. Carrier delays, customs inspections,
          weather and peak periods can extend them. If your parcel is running
          significantly past these windows, email <Email /> and we'll chase it with the
          carrier.
        </P>
        <H2>Where we ship</H2>
        <P>
          We currently ship to the United States, Australia, the United Kingdom, Canada,
          New Zealand, most of Western and Northern Europe, and selected countries in Asia
          and the Middle East. If your country isn't available at checkout, we don't ship
          there yet — email us and we'll let you know when that changes.
        </P>
        <H2>Duties &amp; taxes</H2>
        <P>
          Depending on your country, imported goods may be subject to local duties, taxes
          or handling fees charged by your customs authority or carrier on delivery. These
          charges are set by your government, are outside our control, and are the
          responsibility of the recipient unless taxes were collected at checkout.
        </P>
        <H2>Tracking</H2>
        <P>
          Every order receives a tracking number by email once dispatched. Please allow up
          to 48 hours for tracking to activate. If your tracking hasn't updated for more
          than 7 days, contact us at <Email /> and we'll investigate with the carrier.
        </P>
        <H2>Incorrect addresses &amp; failed delivery</H2>
        <P>
          Please double-check your shipping address at checkout — we can only change an
          address before dispatch. Orders returned to us because of an incorrect or
          incomplete address, or because delivery was refused or not collected, can be
          reshipped (shipping charges apply) or refunded for the item cost less original
          shipping.
        </P>
        <H2>Lost or damaged in transit</H2>
        <P>
          If your order arrives damaged, or tracking shows it as lost, email <Email />{" "}
          within 7 days of the delivery estimate with your order number (and photos for
          damage). We'll replace the item or refund you in full — you will never be left
          out of pocket for a parcel that didn't arrive in good condition.
        </P>
      </>
    ),
  },

  returns: {
    title: "Returns & Refund Policy",
    body: (
      <>
        <P>
          We want you to love what you ordered. If something isn't right, you have{" "}
          <strong>30 days from the day your order is delivered</strong> to request a
          return.
        </P>
        <H2>Return conditions</H2>
        <ul className="mt-2 list-disc pl-5">
          <LI>Items must be unworn, unwashed and undamaged, with all tags attached</LI>
          <LI>Swimwear must have the hygiene liner intact</LI>
          <LI>
            For hygiene reasons, <strong>underwear (briefs, thongs and underwear sets)
            and the silk sleep mask are final sale</strong> and can't be returned unless
            faulty or incorrect
          </LI>
          <LI>Items returned in a non-resalable condition may be refused or partially refunded</LI>
        </ul>
        <H2>How to start a return</H2>
        <ul className="mt-2 list-disc pl-5">
          <LI>
            Email <Email /> within 30 days of delivery with your order number and the
            item(s) you want to return
          </LI>
          <LI>
            We'll reply within 24–48 hours with your return authorisation and the return
            address — <strong>please don't ship anything back before receiving this</strong>,
            as unauthorised returns can't be tracked to your order and may not be refundable
          </LI>
          <LI>
            Return shipping is paid by the customer, except where the item is faulty,
            damaged or not what you ordered — in those cases we cover it
          </LI>
          <LI>We recommend a tracked service; the parcel is your responsibility until it reaches us</LI>
        </ul>
        <H2>Refunds</H2>
        <P>
          Once your return is received and inspected we'll email you, and your refund will
          be issued to the original payment method within 5–10 business days. Original
          shipping charges are non-refundable except for faulty or incorrect items. If
          your refund hasn't appeared after 10 business days, check with your bank or card
          issuer first, then contact us.
        </P>
        <H2>Exchanges</H2>
        <P>
          Need a different size or colour? Email us — if the item is in stock we'll set up
          an exchange; otherwise we'll refund you so you can reorder.
        </P>
        <H2>Faulty, damaged or incorrect items</H2>
        <P>
          If anything arrives faulty, damaged or different from what you ordered, email{" "}
          <Email /> within 7 days of delivery with photos and your order number. We'll
          make it right with a replacement or full refund including any shipping — at no
          cost to you.
        </P>
        <H2>Order cancellation</H2>
        <P>
          You can cancel any order free of charge <strong>before it has been
          dispatched</strong> — email us as soon as possible with your order number. Once
          an order has shipped it can no longer be cancelled, but you can return it under
          this policy after delivery.
        </P>
        <H2>Your statutory rights</H2>
        <P>
          Nothing in this policy limits your statutory rights. If you are a consumer in
          the UK or EU you additionally have a legal 14-day cooling-off right to cancel a
          distance purchase from the day you receive it — our 30-day policy already
          exceeds this. Statutory remedies for faulty goods also apply in full.
        </P>
        <H2>A note on disputes</H2>
        <P>
          If anything ever goes wrong with your order, please contact us first at{" "}
          <Email /> — we resolve genuine issues quickly with replacements or refunds, and
          it's always faster than a card dispute.
        </P>
      </>
    ),
  },

  privacy: {
    title: "Privacy Policy",
    body: (
      <>
        <P>
          This policy explains what personal information Auvella ("we", "us") collects
          through auvellawear.com, how we use it, and the rights you have over it. We keep
          it plain-English on purpose.
        </P>
        <H2>What we collect</H2>
        <ul className="mt-2 list-disc pl-5">
          <LI>
            <strong>Order information</strong> — your name, email, shipping and billing
            address, and the items you buy, collected when you place an order
          </LI>
          <LI>
            <strong>Payment information</strong> — processed securely by Shopify Payments
            and its wallet partners (Shop&nbsp;Pay, Apple&nbsp;Pay, Google&nbsp;Pay). We
            never see or store your full card number
          </LI>
          <LI>
            <strong>Marketing information</strong> — your email address if you subscribe
            to our newsletter or opt in at checkout
          </LI>
          <LI>
            <strong>Review information</strong> — the name, email and content you submit
            when leaving a product review
          </LI>
          <LI>
            <strong>Device information</strong> — cookies and similar technologies collect
            your IP address, browser and the pages you visit, used to run the site,
            remember your cart and currency, and understand how the store is used
          </LI>
        </ul>
        <H2>How we use it</H2>
        <ul className="mt-2 list-disc pl-5">
          <LI>To fulfil orders: processing payment, arranging shipping, sending order and tracking confirmations</LI>
          <LI>To provide support when you contact us</LI>
          <LI>To send marketing emails only where you've opted in — every email includes an unsubscribe link</LI>
          <LI>To publish product reviews you choose to submit</LI>
          <LI>To prevent fraud and keep the store secure</LI>
        </ul>
        <H2>Who we share it with</H2>
        <P>
          We share personal information only with the service providers who run the store
          on our behalf: <strong>Shopify</strong> (e-commerce platform and payments),{" "}
          <strong>Klaviyo</strong> (email), <strong>Judge.me</strong> (reviews), and our
          shipping and fulfilment partners (name and delivery address only, to deliver
          your order). Each processes your data under its own privacy safeguards and our
          instructions. <strong>We do not sell your personal information.</strong>
        </P>
        <H2 id="cookies">Cookies</H2>
        <P>
          We use essential cookies to run the site (cart, checkout, currency preferences)
          and analytics cookies to understand site usage. You can control or delete
          cookies in your browser settings; blocking essential cookies may stop parts of
          the store (like the cart) from working.
        </P>
        <H2>How long we keep it</H2>
        <P>
          Order records are kept as long as needed for accounting, tax and legal
          obligations. Marketing data is kept until you unsubscribe. You can ask us to
          delete your data at any time (see below).
        </P>
        <H2>Your rights</H2>
        <P>
          Depending on where you live (including under UK/EU GDPR and California's CCPA),
          you may have the right to access, correct, delete, or receive a copy of your
          personal information, to object to or restrict processing, and to withdraw
          marketing consent at any time. To exercise any of these rights, email{" "}
          <Email /> — we'll respond within 30 days. You also have the right to complain to
          your local data protection authority.
        </P>
        <H2>Changes</H2>
        <P>
          We may update this policy as the store or the law changes; the latest version
          will always be on this page. Questions? <Email />.
        </P>
      </>
    ),
  },

  terms: {
    title: "Terms of Service",
    body: (
      <>
        <P>
          These terms govern your use of auvellawear.com and any purchase you make from
          Auvella ("we", "us"). By using the site or placing an order you agree to them.
          Nothing in these terms affects your statutory rights as a consumer.
        </P>
        <H2>Products &amp; accuracy</H2>
        <P>
          We work hard to display products, colours, sizing and pricing accurately. Screens
          vary, so colours may differ slightly in person. Size guides are provided on each
          product page; measurements are of the garment or recommended body range as
          stated. If we discover a material error in a product description or price after
          you order, we'll contact you with the option to reconfirm at the correct price
          or cancel for a full refund.
        </P>
        <H2>Orders &amp; acceptance</H2>
        <P>
          Your order is an offer to buy. We accept it when we dispatch your items — until
          then we may decline or cancel an order (for example for suspected fraud, pricing
          errors, or stock issues), in which case you'll be refunded in full. Prices are
          in USD; your card is charged in your selected display currency at your payment
          provider's rate.
        </P>
        <H2>Shipping, returns &amp; cancellation</H2>
        <P>
          Delivery timelines and costs are set out in our{" "}
          <Link to="/pages/$slug" params={{ slug: "shipping" }} className="underline underline-offset-2">
            Shipping Policy
          </Link>
          , and our 30-day return window, refund process and pre-dispatch cancellation
          rights are set out in our{" "}
          <Link to="/pages/$slug" params={{ slug: "returns" }} className="underline underline-offset-2">
            Returns &amp; Refund Policy
          </Link>
          . Both form part of these terms.
        </P>
        <H2>Reviews &amp; submitted content</H2>
        <P>
          By submitting a review or other content you grant us a non-exclusive, royalty-free
          licence to display it on the store. Don't submit anything unlawful, misleading or
          infringing; we may decline or remove such content.
        </P>
        <H2>Intellectual property</H2>
        <P>
          All content on this site — the Auvella name, imagery, text and design — belongs
          to us or our licensors and may not be reproduced for commercial purposes without
          permission.
        </P>
        <H2>Liability</H2>
        <P>
          We are responsible for losses that are a foreseeable result of our breach of
          these terms or our negligence. We are not liable for losses that were not
          foreseeable, for business losses, or for events outside our reasonable control.
          Nothing in these terms excludes or limits liability where it would be unlawful
          to do so, including for death or personal injury caused by negligence, fraud, or
          your statutory consumer rights in respect of faulty goods.
        </P>
        <H2>Chargebacks &amp; disputes</H2>
        <P>
          If there's any problem with your order, contact <Email /> first — we resolve
          genuine issues promptly with replacements or refunds under our published
          policies. We retain order, delivery-tracking and correspondence records and will
          contest card disputes raised for items that tracking shows as delivered or that
          fall outside our published policies, where we believe the dispute is not
          legitimate.
        </P>
        <H2>General</H2>
        <P>
          If any part of these terms is found unenforceable, the rest remain in effect.
          These terms are governed by the laws of England and Wales, and you may bring
          proceedings in your local courts where consumer law gives you that right. We may
          update these terms from time to time; the version on this page at the time of
          your order applies to it.
        </P>
        <H2>Contact</H2>
        <P>
          Auvella — <Email />
        </P>
      </>
    ),
  },
};

export const Route = createFileRoute("/pages/$slug")({
  loader: ({ params }) => {
    if (!PAGES[params.slug]) throw notFound();
    return { slug: params.slug };
  },
  component: PolicyPage,
});

function PolicyPage() {
  const { slug } = Route.useLoaderData();
  const page = PAGES[slug];
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container-px mx-auto max-w-2xl pb-24 pt-32 md:pt-40">
        <h1 className="font-serif text-3xl font-light text-[#0a0a0a] md:text-4xl">
          {page.title}
        </h1>
        <div className="mt-2 h-px w-12 bg-[#0a0a0a]/20" />
        {page.body}
      </main>
      <Footer />
    </div>
  );
}
