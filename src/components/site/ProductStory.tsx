import { useState } from "react";
import {
  introText, fitNote, sizesLine, fabricLine, fabricHeadline, fabrics,
  specificPoints, comparisonRows, whyPoints, constructionBullets,
} from "@/lib/productStory";
import { GALLERY_INDEX } from "@/lib/galleryIndex";
import { COUNTRIES, PROCESSING_LABEL, transitLabel, type Country } from "@/lib/shipping";
import { inDuoDeal, DUO_DEAL } from "@/lib/duoDeal";
import { inBundleDeal } from "@/lib/bundleDeal";

/*
 * Long-form product story, laid out after Smooche's product pages (Joshua,
 * 29 Sept 2026): two large alternating image/text sections, a "Find your fit"
 * strip, three number cards, a "Why Auvella?" comparison table and a
 * two-column FAQ. Every line is derived from the product's own data or from
 * store policy, so it's specific per product and stays true.
 *
 * Deliberate differences from Smooche:
 * - Number cards show facts (fabric share, shipping days, return window),
 *   not customer-panel percentages, which Auvella doesn't have yet.
 * - The table's "Others" column uses a dash for "not always", not a cross:
 *   other brands' versions often do have these features.
 * - No duties answer until duties handling is confirmed per market.
 */

const CDN = "https://cdn.shopify.com/s/files/1/0988/0738/2311/files/";
const img = (fileOrUrl: string, w: number) => {
  const base = fileOrUrl.startsWith("http") ? fileOrUrl.split("?")[0] : CDN + fileOrUrl;
  return `${base}?width=${w}`;
};

function Tick({ muted = false }: { muted?: boolean }) {
  return (
    <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${muted ? "bg-[#cfcfcf]" : "bg-[#0a0a0a]"}`} aria-hidden>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6l4.6-5.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
function NotAlways() {
  return (
    <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-[#cfcfcf]" aria-label="Not always">
      <span className="h-px w-2 bg-[#b5b5b5]" />
    </span>
  );
}
function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="box-decoration-clone bg-[#0a0a0a] px-2 text-white">{children}</span>;
}

type Props = {
  handle: string;
  title: string;
  descriptionHtml?: string | null;
  colour?: string;
  imageUrls: string[];
  country: Country;
};

export function ProductStory({ handle, title, descriptionHtml, colour, imageUrls, country }: Props) {
  const html = descriptionHtml ?? "";
  const entry = colour ? GALLERY_INDEX[handle]?.[colour] : undefined;
  const model = entry?.m?.length ? entry.m : imageUrls.slice(0, 3);
  const flat = entry?.g?.length ? entry.g : imageUrls.slice(-2);
  const shotA = model[1] ?? model[0] ?? imageUrls[0];
  const shotB = flat[0] ?? imageUrls[imageUrls.length - 1];
  const thumbs = [model[0], flat[0] ?? model[1], model[2] ?? flat[1] ?? model[0]].filter(Boolean) as string[];

  const intro = introText(html);
  const points = specificPoints(html, title, 2);
  const fab = fabrics(html);
  const fit = fitNote(html);
  const sizes = sizesLine(html);
  const fabricText = fabricLine(html);
  const rows = comparisonRows(html, title);
  const transit = transitLabel(country);
  const brandPoints = whyPoints(html, title).slice(points.length, points.length + (2 - points.length));
  const featureA = [...points, ...brandPoints].slice(0, 2).map((p) => p.split(" — ")[0]);

  const faqs: Array<{ q: string; a: string }> = [
    ...(fit ? [{ q: fit.heading === "How to use" ? "How do I use it?" : "How does it fit?", a: fit.text }] : []),
    ...(fabricText ? [{ q: "What's it made of?", a: fabricText.charAt(0).toUpperCase() + fabricText.slice(1) + "." }] : []),
    ...(sizes ? [{ q: "What sizes does it come in?", a: sizes.replace(/\s*\(.*\)$/, "") + ". Tap Size Guide next to the sizes for measurements." }] : []),
    { q: "How do I find my size?", a: "Tap Size Guide next to the sizes at the top of this page: each size is mapped to real measurements. If you're between two, the fit note says which way to go." },
    { q: "How long does delivery take?", a: `Orders are dispatched within ${PROCESSING_LABEL} business days, then shipping to ${country.name} takes ${transit} business days, tracked.` },
    { q: "Where do you ship to?", a: `We ship to ${COUNTRIES.length} countries, including the UK, the US, Canada, Australia and most of Europe. Choose yours with Ship to in the globe menu.` },
    { q: "Can I return it?", a: "Yes — within 30 days of delivery. Email us to start a return. Return postage is paid by you unless the item is faulty." },
    ...(inDuoDeal(handle)
      ? [{ q: "Is there a multi-buy?", a: `Buy two of this product and save ${DUO_DEAL.percent}% — any sizes or colours. The saving is applied automatically in your bag.` }]
      : inBundleDeal(handle)
        ? [{ q: "Is there a multi-buy?", a: "It's part of our underwear 3-pack deal: add any three eligible pieces and the saving is applied automatically in your bag." }]
        : []),
  ];
  const mainFabric = fab.find((f) => f.share) ?? null;
  const built = constructionBullets(html, 3);

  return (
    <div className="bg-white">
      {/* ── 1. Meet it: image left, story right ───────────────────────── */}
      <section className="container-px mx-auto grid max-w-[1200px] items-center gap-8 py-14 md:grid-cols-2 md:gap-14 md:py-24">
        <div className="relative aspect-[4/5] overflow-hidden bg-[#f4f4f2]">
          {shotA && <img src={img(shotA, 900)} alt={`${title} worn`} loading="lazy" className="h-full w-full object-cover" />}
          {colour && (
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-1.5 font-serif text-[17px] font-light tracking-wide text-[#0a0a0a]">
              {colour}
            </span>
          )}
        </div>
        <div>
          <h2 className="font-serif text-[30px] font-light leading-[1.25] text-[#0a0a0a] md:text-[40px]">
            The <Highlight>{title}</Highlight>
          </h2>
          {intro.map((p) => (
            <p key={p} className="mt-5 max-w-[520px] text-[14px] leading-[1.8] text-[#555555]">{p}</p>
          ))}
          <div className="mt-8 grid max-w-[520px] grid-cols-2 gap-4">
            {featureA.map((f) => (
              <span key={f} className="flex items-center gap-2.5 text-[13px] font-medium text-[#0a0a0a]"><Tick />{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. The fabric: story left, image right ────────────────────── */}
      {fab.length > 0 && (
        <section className="container-px mx-auto grid max-w-[1200px] items-center gap-8 pb-14 md:grid-cols-2 md:gap-14 md:pb-24">
          <div className="order-2 md:order-1">
            <h2 className="font-serif text-[30px] font-light leading-[1.25] text-[#0a0a0a] md:text-[40px]">
              A fabric that <Highlight>{fabricHeadline(fab)}</Highlight>
            </h2>
            <p className="mt-5 max-w-[520px] text-[14px] leading-[1.8] text-[#555555]">
              {fab.map((f) => `${f.share ? f.share + " " : ""}${f.name.toLowerCase()}: ${f.line.charAt(0).toLowerCase()}${f.line.slice(1)}`).join(" ")}
            </p>
            <ul className="mt-8 max-w-[520px] space-y-3">
              {(built.length ? built : fab.slice(0, 2).map((f) => f.tag)).map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[13px] font-medium leading-snug text-[#0a0a0a]"><span className="mt-px"><Tick /></span>{b}</li>
              ))}
            </ul>
          </div>
          <div className="relative order-1 aspect-[4/5] overflow-hidden bg-[#f4f4f2] md:order-2">
            {shotB && <img src={img(shotB, 900)} alt={`${title} detail`} loading="lazy" className="h-full w-full object-cover" />}
            {mainFabric && (
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 px-4 py-1.5 font-serif text-[17px] font-light tracking-wide text-[#0a0a0a]">
                {fab.filter((f) => f.share).map((f) => `${f.share} ${f.name.split(" ")[0].toLowerCase()}`).join(" · ")}
              </span>
            )}
          </div>
        </section>
      )}

      {/* ── 3. Find your fit ───────────────────────────────────────────── */}
      <section className="container-px mx-auto max-w-[1200px] pb-8">
        <div className="grid items-center gap-6 bg-[#f5f4f2] px-6 py-8 md:grid-cols-[180px_1fr_1fr_1fr] md:px-10">
          <h2 className="font-serif text-[28px] font-light leading-tight text-[#0a0a0a]">Find your<br className="hidden md:block" /> fit</h2>
          {[
            { t: "1. Measure", d: "Bust, waist and hips — a soft tape and two minutes." },
            { t: "2. Check the guide", d: "Tap Size Guide: every size mapped to real measurements." },
            { t: "3. Try it at home", d: "Not right? Returns are open for 30 days from delivery." },
          ].map((s, i) => (
            <div key={s.t} className="flex items-center gap-4">
              {thumbs[i] && <img src={img(thumbs[i], 200)} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-full object-cover object-top" />}
              <div>
                <p className="text-[15px] font-medium text-[#0a0a0a]">{s.t}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[#666666]">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Numbers: facts, not panel percentages ──────────────────── */}
      <section className="container-px mx-auto grid max-w-[1200px] gap-3 pb-16 md:grid-cols-3 md:pb-24">
        {[
          mainFabric
            ? { n: mainFabric.share!, l: mainFabric.name, c: mainFabric.line }
            : sizes
              ? { n: sizes.replace(/^sizes?\s*/i, "").replace(/\s*\(.*\)$/, "").replace(/\s+to\s+/i, "–"), l: "Sizes", c: "Every size mapped to real measurements in the guide." }
              : { n: "1–3", l: "Days to dispatch", c: "Business days from your order to it leaving us." },
          { n: transit.replace(/\s/g, ""), l: `Business day shipping to ${country.name}`, c: `Tracked, after dispatch within ${PROCESSING_LABEL} business days.` },
          { n: "30", l: "Days to return", c: "From delivery. Email us and we'll sort it." },
        ].map((c) => (
          <div key={c.l} className="bg-[#f5f4f2] px-6 py-10 text-center">
            <p className="font-serif text-[64px] font-light leading-none text-[#0a0a0a] md:text-[76px]">{c.n}</p>
            <p className="mt-4 text-[15px] font-medium text-[#0a0a0a]">{c.l}</p>
            <p className="mx-auto mt-2 max-w-[280px] text-[12px] leading-relaxed text-[#777777]">{c.c}</p>
          </div>
        ))}
      </section>

      {/* ── 5. Why Auvella? ────────────────────────────────────────────── */}
      <section className="bg-[#f5f4f2]" aria-labelledby="why-auvella">
        <div className="container-px mx-auto max-w-[1000px] py-16 md:py-24">
          <h2 id="why-auvella" className="text-center font-serif text-[30px] font-light text-[#0a0a0a] md:text-[38px]">Why Auvella?</h2>
          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="w-1/2 border-b-2 border-[#0a0a0a]" />
                  <th className="border-b-2 border-[#0a0a0a] bg-[#0a0a0a] py-4 font-serif text-[18px] font-light uppercase tracking-[0.18em] text-white">Auvella</th>
                  <th className="border-b-2 border-[#0a0a0a] py-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0a0a0a]">Others</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-b border-[#e3e1dd]">
                    <td className="py-4 pl-3 font-medium text-[#0a0a0a]">{r.label}</td>
                    <td className="bg-[#ebe8e3] py-4"><span className="flex justify-center"><Tick /></span></td>
                    <td className="py-4"><span className="flex justify-center">{r.others === "yes" ? <Tick muted /> : <NotAlways />}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center text-[11px] text-[#888888]">— not always included</p>
        </div>
      </section>

      {/* ── 6. FAQ ─────────────────────────────────────────────────────── */}
      <section className="container-px mx-auto max-w-[1200px] py-16 md:py-24" aria-labelledby="product-faq">
        <h2 id="product-faq" className="text-center font-serif text-[30px] font-light text-[#0a0a0a] md:text-[38px]">Frequently asked questions</h2>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {[faqs.filter((_, i) => i % 2 === 0), faqs.filter((_, i) => i % 2 === 1)].map((col, ci) => (
            <div key={ci} className="space-y-3">
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
        className="flex w-full items-center justify-between px-5 py-4 text-left text-[14px] text-[#0a0a0a]"
      >
        {q}
        <span className="ml-4 text-[18px] font-light leading-none text-[#0a0a0a]">{open ? "−" : "+"}</span>
      </button>
      {open && <p className="px-5 pb-5 text-[13px] leading-[1.75] text-[#555555]">{a}</p>}
    </div>
  );
}
