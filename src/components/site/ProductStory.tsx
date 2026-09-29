import { useState } from "react";
import {
  introText, fitNote, sizesLine, fabricLine, fabrics, specificPoints, comparisonRows,
  whyPoints, constructionBullets, actionHeadline, beforeYouAsk,
} from "@/lib/productStory";
import { GALLERY_INDEX } from "@/lib/galleryIndex";
import { STORY_IMAGES } from "@/lib/storyImages";
import { COUNTRIES, PROCESSING_LABEL, transitLabel, type Country } from "@/lib/shipping";
import { inDuoDeal, DUO_DEAL } from "@/lib/duoDeal";
import { inBundleDeal } from "@/lib/bundleDeal";
import type { Review } from "@/components/site/Reviews";

/*
 * Long-form product story after smooche.com product pages, at their scale
 * (Joshua, 29 Sept 2026): two large alternating image/text sections, a
 * "Find your fit" strip, a large "Why Auvella?" table and a two-column FAQ.
 * Derived per product from its own data and store policy.
 *
 * Honest differences from Smooche: no customer-panel percentages (Auvella
 * has none yet); "Others" shows a "not always" dash, never a cross; the
 * second section's image is UGC-style brand imagery, never passed off as a
 * customer photo; no duties answer until duties handling is confirmed.
 */

const CDN = "https://cdn.shopify.com/s/files/1/0988/0738/2311/files/";
const img = (fileOrUrl: string, w: number) =>
  fileOrUrl.startsWith("/")
    ? fileOrUrl // bundled with the site (story images)
    : `${fileOrUrl.startsWith("http") ? fileOrUrl.split("?")[0] : CDN + fileOrUrl}?width=${w}`;

function Tick({ muted = false, size = 22 }: { muted?: boolean; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full ${muted ? "bg-[#cfcfcf]" : "bg-[#0a0a0a]"}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6l4.6-5.2" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
function NotAlways() {
  // Filled grey disc with a white dash: as visible as the tick, reads "not always".
  return (
    <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#cfcccc]" aria-label="Not always">
      <span className="h-[2px] w-3 rounded-full bg-white" />
    </span>
  );
}
function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="box-decoration-clone bg-[#0a0a0a] px-2.5 text-white">{children}</span>;
}
const H2 = "font-serif text-[40px] font-normal leading-[1.15] text-[#0a0a0a] md:text-[56px]";
const BODY = "text-[16px] leading-[1.8] text-[#555555]";

type Props = {
  handle: string;
  title: string;
  descriptionHtml?: string | null;
  colour?: string;
  imageUrls: string[];
  country: Country;
  sized?: boolean;
  reviews?: Review[];
  productType?: string;
};

export function ProductStory({ handle, title, descriptionHtml, colour, imageUrls, country, sized = true, reviews = [], productType = "" }: Props) {
  const html = descriptionHtml ?? "";
  const entry = colour ? GALLERY_INDEX[handle]?.[colour] : undefined;
  const model = entry?.m?.length ? entry.m : imageUrls.slice(0, 3);
  const flat = entry?.g?.length ? entry.g : imageUrls.slice(-2);
  const shotA = model[1] ?? model[0] ?? imageUrls[0];
  const story = STORY_IMAGES[handle];
  const shotB = story?.src ?? flat[0] ?? model[2] ?? imageUrls[imageUrls.length - 1];
  const thumbs = [model[0], flat[0] ?? model[1], model[2] ?? flat[1] ?? model[0]].filter(Boolean) as string[];

  const intro = introText(html);
  const points = specificPoints(html, title, 2);
  const fab = fabrics(html);
  const fit = fitNote(html);
  const sizes = sizesLine(html);
  const fabricText = fabricLine(html);
  const rows = comparisonRows(html, title, { sized });
  const transit = transitLabel(country);
  const featureA = [...points, ...whyPoints(html, title).slice(points.length)].slice(0, 2).map((p) => p.split(" — ")[0]);
  const built = constructionBullets(html, 3);
  const worries = beforeYouAsk(html, title, productType);
  const head = actionHeadline(html, title);
  const shareLabel = fab.filter((f) => f.share).map((f) => `${f.share} ${f.name.split(" ")[0].toLowerCase()}`).join(" · ");
  const actionCopy = fab.length
    ? fab.map((f) => `${f.share ? f.share + " " : ""}${f.name}: ${f.line.charAt(0).toLowerCase()}${f.line.slice(1)}`).join(" ")
    : fit?.text ?? "";

  // Real results, counted from VERIFIED-BUYER reviews only (Auvella's own
  // customers via Judge.me's post-delivery requests). The imported reviews
  // came from other stores' customers, so they don't count towards
  // "results". Hidden until 5+ verified reviews exist.
  const results: Array<{ value: string; label: string; basis: string }> = [];
  const verified = reviews.filter((r) => r.verified);
  const n = verified.length;
  if (n >= 5) {
    reviews = verified;
    const pct = (k: number, of: number) => `${Math.round((k / of) * 100)}%`;
    const high = reviews.filter((r) => r.rating >= 4).length;
    results.push({ value: pct(high, n), label: "Rated it 4 or 5 stars", basis: `Based on ${n} verified reviews` });
    const fits = reviews.filter((r) => r.fit);
    if (fits.length >= 5) {
      const tts = fits.filter((r) => r.fit === "True to size").length;
      results.push({ value: pct(tts, fits.length), label: "Said it fits true to size", basis: `Based on ${fits.length} verified reviews that rated the fit` });
    }
    const mentions = (re: RegExp) => reviews.filter((r) => re.test(`${r.title ?? ""} ${r.body}`)).length;
    const topics: Array<[RegExp, string]> = [
      [/comfort|comfy/i, "Mentioned comfort"],
      [/quality|well made|well-made/i, "Mentioned the quality"],
      [/stay(s|ed)? (up|put|in place)|doesn'?t roll|didn'?t roll|no roll/i, "Said it stays in place"],
    ];
    for (const [re, label] of topics) {
      if (results.length >= 3) break;
      const k = mentions(re);
      if (k >= 3) results.push({ value: pct(k, n), label, basis: `Of ${n} verified reviews, in their own words` });
    }
    if (results.length < 3) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / n;
      results.push({ value: avg.toFixed(1), label: "Average rating out of 5", basis: `Based on ${n} verified reviews` });
    }
  }

  const faqs: Array<{ q: string; a: string }> = [
    ...(fit ? [{ q: fit.heading === "How to use" ? "How do I use it?" : "How does it fit?", a: fit.text }] : []),
    ...(fabricText ? [{ q: "What's it made of?", a: fabricText.charAt(0).toUpperCase() + fabricText.slice(1) + "." }] : []),
    ...(sizes ? [{ q: "What sizes does it come in?", a: sizes.replace(/\s*\(.*\)$/, "") + ". Tap Size Guide next to the sizes for measurements." }] : []),
    ...(sized ? [{ q: "How do I find my size?", a: "Tap Size Guide next to the sizes at the top of this page: each size is mapped to real measurements. If you're between two, the fit note says which way to go." }] : []),
    { q: "How long does delivery take?", a: `Orders are dispatched within ${PROCESSING_LABEL} business days, then shipping to ${country.name} takes ${transit} business days, tracked.` },
    { q: "Where do you ship to?", a: `We ship to ${COUNTRIES.length} countries, including the UK, the US, Canada, Australia and most of Europe. Choose yours with Ship to in the globe menu.` },
    { q: "Can I return it?", a: "Yes — within 30 days of delivery. Email us to start a return. Return postage is paid by you unless the item is faulty." },
    ...(inDuoDeal(handle)
      ? [{ q: "Is there a multi-buy?", a: `Buy two of this product and save ${DUO_DEAL.percent}% — any sizes or colours. The saving is applied automatically in your bag.` }]
      : inBundleDeal(handle)
        ? [{ q: "Is there a multi-buy?", a: "It's part of our underwear 3-pack deal: add any three eligible pieces and the saving is applied automatically in your bag." }]
        : []),
  ];

  return (
    <div className="bg-white">
      {/* ── 2. How it acts: story left, image right ─────────────────────── */}
      <section className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 pb-16 pt-24 md:grid-cols-2 md:gap-20 md:px-10 md:pb-28 md:pt-40">
        <div className="order-2 md:order-1">
          <h2 className={H2}>
            {head.lead} <Highlight>{head.hi}</Highlight>
          </h2>
          {actionCopy && <p className={`mt-6 max-w-[560px] ${BODY}`}>{actionCopy}</p>}
          <ul className="mt-10 max-w-[560px] space-y-4">
            {(built.length ? built : fab.length ? fab.slice(0, 2).map((f) => f.tag) : specificPoints(html, title, 4).filter((p) => !featureA.includes(p))).map((b) => (
              <li key={b} className="flex items-start gap-3 text-[16px] font-medium leading-snug text-[#0a0a0a]"><Tick />{b}</li>
            ))}
          </ul>
        </div>
        <div className="relative order-1 aspect-[4/5] overflow-hidden rounded-[20px] bg-[#f4f4f2] md:order-2">
          {shotB && <img src={img(shotB, 1100)} alt={story?.alt ?? `${title} detail`} loading="lazy" className="h-full w-full object-cover" />}
          {story?.callouts?.length ? (
            <>
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {story.callouts.map((c) => (
                  <line key={c.label} x1={c.x} y1={c.y} x2={c.toX} y2={c.toY} stroke="#fff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
              {story.callouts.map((c) => (
                <span
                  key={c.label}
                  className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap pb-1 font-serif text-[26px] text-white [text-shadow:0_2px_14px_rgba(0,0,0,0.5)] md:text-[34px]"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  {c.label}
                </span>
              ))}
            </>
          ) : shareLabel && !story ? (
            <span className="absolute bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 px-5 py-2 font-serif text-[22px] text-[#0a0a0a]">
              {shareLabel}
            </span>
          ) : null}
        </div>
      </section>

      {/* ── Before you ask: the three worries behind most returns ────── */}
      {worries.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-5 pb-20 md:px-10 md:pb-28" aria-labelledby="before-you-ask">
          <h2 id="before-you-ask" className="text-center font-serif text-[44px] font-normal text-[#0a0a0a] md:text-[60px]">Before you ask</h2>
          <div className={`mt-12 grid gap-4 md:mt-16 ${worries.length >= 3 ? "md:grid-cols-3" : "mx-auto max-w-[880px] md:grid-cols-2"}`}>
            {worries.map((w) => (
              <div key={w.q} className="rounded-[20px] bg-[#f5f4f2] px-8 py-12 transition-[transform,box-shadow] duration-300 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_14px_34px_-10px_rgba(0,0,0,0.16)] md:px-10 md:py-14">
                <p className="font-serif text-[28px] font-normal leading-tight text-[#0a0a0a] md:text-[32px]">{w.q}</p>
                <p className="mt-5 text-[16px] leading-[1.8] text-[#555555]">{w.a}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. Real results: counted from this product's reviews ─────────
          Smooche's percentages come from a customer panel; Auvella has
          none, and invented or cherry-picked figures would be illegal
          (DMCC Act). Every number is counted from verified-buyer reviews,
          with the count shown; the section appears with 5+ of them. */}
      {results.length > 0 && (
        <section className="mx-auto max-w-[1320px] px-5 pb-20 md:px-10 md:pb-28" aria-labelledby="real-results">
          <h2 id="real-results" className="text-center font-serif text-[44px] font-normal text-[#0a0a0a] md:text-[60px]">Real results</h2>
          <div className={`mt-12 grid gap-4 md:mt-16 ${results.length >= 3 ? "md:grid-cols-3" : results.length === 2 ? "md:grid-cols-2" : "mx-auto max-w-[440px]"}`}>
            {results.map((r) => (
              <div key={r.label} className="rounded-[20px] bg-[#f5f4f2] px-8 py-14 text-center transition-[transform,box-shadow] duration-300 ease-out will-change-transform hover:-translate-y-1 hover:shadow-[0_14px_34px_-10px_rgba(0,0,0,0.16)] md:py-16">
                <p className="font-serif text-[88px] font-normal leading-none text-[#0a0a0a] md:text-[112px]">{r.value}</p>
                <p className="mx-auto mt-6 max-w-[300px] text-[18px] font-medium leading-snug text-[#0a0a0a]">{r.label}</p>
                <p className="mt-3 text-[13px] text-[#888888]">{r.basis}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 4. Why Auvella? ────────────────────────────────────────────
          Wide on desktop (fills the screen like smooche.com); on phones the
          same three columns shrink to fit the screen - no sideways scroll. */}
      <section className="bg-[#f5f4f2]" aria-labelledby="why-auvella">
        <div className="mx-auto max-w-[1580px] px-4 py-16 md:px-10 md:py-24">
          <h2 id="why-auvella" className="text-center font-serif text-[40px] font-normal text-[#0a0a0a] md:text-[60px]">Why Auvella?</h2>
          <div className="mt-10 md:mt-12">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[46%] md:w-[44%]" />
                <col className="w-[27%] md:w-[28%]" />
                <col className="w-[27%] md:w-[28%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b-2 border-[#0a0a0a]" />
                  <th className="rounded-t-[14px] border-b-2 border-[#0a0a0a] bg-[#0a0a0a] py-4 font-serif text-[15px] font-normal uppercase tracking-[0.12em] text-white md:rounded-t-[18px] md:py-5 md:text-[26px] md:tracking-[0.2em]">
                    Auvella
                  </th>
                  <th className="border-b-2 border-[#0a0a0a] py-4 font-serif text-[15px] font-normal uppercase tracking-[0.12em] text-[#0a0a0a] md:py-5 md:text-[26px] md:tracking-[0.2em]">
                    Others
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const last = i === rows.length - 1;
                  return (
                    <tr key={r.label} className="border-b border-[#e0ddd8]">
                      <td className="py-4 pl-2 pr-2 text-[13px] font-medium leading-snug text-[#0a0a0a] md:py-[18px] md:pl-4 md:text-[18px]">{r.label}</td>
                      <td className={`bg-[#ebe8e3] py-4 md:py-[18px] ${last ? "rounded-b-[14px] md:rounded-b-[18px]" : ""}`}>
                        <span className="flex justify-center"><span className="scale-[0.85] md:scale-100"><Tick size={26} /></span></span>
                      </td>
                      <td className="py-4 md:py-[18px]">
                        <span className="flex justify-center"><span className="scale-[0.85] md:scale-100">{r.others === "yes" ? <Tick muted size={26} /> : <NotAlways />}</span></span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-[12px] text-[#888888]"><span className="inline-block origin-center scale-[0.7]"><NotAlways /></span> not always included</p>
        </div>
      </section>

      {/* ── 5. FAQ ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1320px] px-5 py-20 md:px-10 md:py-28" aria-labelledby="product-faq">
        <h2 id="product-faq" className="text-center font-serif text-[40px] font-normal text-[#0a0a0a] md:text-[52px]">Frequently asked questions</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {[faqs.filter((_, i) => i % 2 === 0), faqs.filter((_, i) => i % 2 === 1)].map((col, ci) => (
            <div key={ci} className="space-y-4">
              {col.map((f) => (
                <Faq key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#f5f4f2]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-6 py-5 text-left text-[15px] text-[#0a0a0a]"
      >
        {q}
        <span className="ml-4 text-[20px] font-light leading-none text-[#0a0a0a]">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="px-6 pb-6 text-[14px] leading-[1.8] text-[#555555]">{a}</p>}
    </div>
  );
}
