import { whyPoints, fabrics } from "@/lib/productStory";

/*
 * Sits under the product, before the recommendations rail and reviews.
 * Everything in it is derived from the product's own title and Details (see
 * productStory.ts), so it's specific to the product and stays true.
 */

function Check() {
  return (
    <span className="mt-[1px] grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-[#0a0a0a]" aria-hidden>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 6.2 5 8.6l4.6-5.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function WhyAuvella({ descriptionHtml, title }: { descriptionHtml?: string | null; title: string }) {
  const points = whyPoints(descriptionHtml, title);
  const fab = fabrics(descriptionHtml);
  const cols = fab.length >= 3 ? "sm:grid-cols-3 max-w-[1000px]" : fab.length === 2 ? "sm:grid-cols-2 max-w-[700px]" : "max-w-[340px]";
  return (
    <section className="border-t border-[#EBEBEB] bg-[#faf9f7]" aria-labelledby="why-auvella">
      <div className="container-px mx-auto max-w-[1100px] py-14 md:py-20">
        <h2 id="why-auvella" className="text-center font-serif text-[26px] font-light text-[#0a0a0a] md:text-[32px]">
          Why Auvella?
        </h2>
        <ul className="mx-auto mt-8 grid max-w-[880px] gap-x-12 gap-y-4 sm:grid-cols-2">
          {points.map((p) => {
            const [lead, rest] = p.split(" — ");
            return (
              <li key={p} className="flex items-start gap-3 text-[14px] leading-snug text-[#0a0a0a]">
                <Check />
                <span>
                  <span className="font-medium">{lead}</span>
                  {rest && <span className="text-[#666666]"> — {rest}</span>}
                </span>
              </li>
            );
          })}
        </ul>

        {fab.length > 0 && (
          <>
            <p className="mt-14 text-center text-[11px] uppercase tracking-[0.2em] text-[#888888]">What it's made of</p>
            <div className={`mx-auto mt-6 grid gap-3 ${cols}`}>
              {fab.map((f) => (
                <div key={f.name} className="border border-[#EBEBEB] bg-white px-6 py-7 text-center">
                  <p className="font-serif text-[20px] font-light leading-tight text-[#0a0a0a]">
                    {f.share && <span className="mr-1.5">{f.share}</span>}
                    {f.name}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[#666666]">{f.line}</p>
                  <span className="mt-4 inline-block border border-[#0a0a0a] px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.18em] text-[#0a0a0a]">
                    {f.tag}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
