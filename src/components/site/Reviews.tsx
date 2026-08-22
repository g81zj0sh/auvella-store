import { Star, BadgeCheck, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { submitJudgemeReview } from "@/lib/judgeme";

export interface Review {
  name: string;
  rating: number; // 1–5
  title?: string;
  body: string;
  /** Fit-confidence fields — shown when the reviews source provides them. */
  height?: string;
  size?: string;
  fit?: "Runs small" | "True to size" | "Runs large";
  verified?: boolean;
  date?: string;
}

function Stars({ rating, size = 3 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${i < Math.round(rating) ? "fill-[#0a0a0a] text-[#0a0a0a]" : "fill-[#0a0a0a]/10 text-[#0a0a0a]/10"}`}
          style={{ height: size * 4, width: size * 4 }}
        />
      ))}
    </span>
  );
}

/** Thin fit scale: Runs Small — True to Size — Runs Large, marker at `pos` (0–1). */
function FitScale({ pos, compact = false }: { pos: number; compact?: boolean }) {
  return (
    <div className={compact ? "max-w-[260px]" : "max-w-[340px]"}>
      <div className="relative h-px w-full bg-[#DDDDDD]">
        <span
          className="absolute top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full bg-[#0a0a0a]"
          style={{ left: `calc(${Math.min(Math.max(pos, 0), 1) * 100}% - 3px)` }}
        />
        <span className="absolute left-0 top-1/2 h-[5px] w-px -translate-y-1/2 bg-[#C4C4C4]" />
        <span className="absolute left-1/2 top-1/2 h-[5px] w-px -translate-y-1/2 bg-[#C4C4C4]" />
        <span className="absolute right-0 top-1/2 h-[5px] w-px -translate-y-1/2 bg-[#C4C4C4]" />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-[0.1em] text-[#888888]">
        <span>Runs Small</span>
        <span>True to Size</span>
        <span>Runs Large</span>
      </div>
    </div>
  );
}

const FIT_POS: Record<string, number> = {
  "Runs small": 0.15,
  "True to size": 0.5,
  "Runs large": 0.85,
};

/* ---------------- Write a review ---------------- */

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="p-0.5"
        >
          <Star
            className={
              n <= shown
                ? "fill-[#0a0a0a] text-[#0a0a0a]"
                : "fill-[#0a0a0a]/10 text-[#0a0a0a]/10"
            }
            style={{ height: 20, width: 20 }}
          />
        </button>
      ))}
    </div>
  );
}

const inputCls =
  "w-full border border-[#DDDDDD] bg-white px-3 py-2.5 text-[16px] md:text-[13px] text-[#0a0a0a] placeholder:text-[#AAAAAA] focus:border-[#0a0a0a] focus:outline-none";

function WriteReviewForm({ productGid, onDone }: { productGid: string; onDone: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState("");

  const valid =
    name.trim().length > 0 &&
    /.+@.+\..+/.test(email.trim()) &&
    rating >= 1 &&
    body.trim().length > 0;

  const submit = async () => {
    if (!valid || state === "sending") return;
    setState("sending");
    setError("");
    try {
      await submitJudgemeReview({
        productGid,
        name: name.trim(),
        email: email.trim(),
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
      });
      onDone();
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Something went wrong — please try again.");
    }
  };

  return (
    <div className="mt-6 max-w-[560px] space-y-4">
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.1em] text-[#555555]">Rating</p>
        <StarPicker value={rating} onChange={setRating} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <input
          className={inputCls}
          placeholder="Email (not published)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>
      <input
        className={inputCls}
        placeholder="Review title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className={`${inputCls} min-h-[110px] resize-y`}
        placeholder="Your review"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {state === "error" && <p className="text-[12px] text-[#B3261E]">{error}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={!valid || state === "sending"}
        className="inline-flex h-11 items-center justify-center gap-2 bg-[#0a0a0a] px-8 text-[11px] font-medium uppercase tracking-[0.16em] text-white transition-opacity disabled:opacity-40"
      >
        {state === "sending" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Submit review
      </button>
    </div>
  );
}

/*
 * Reviews — SKIMS structure: rating summary and fit distribution up top,
 * then meta-column review rows separated by hairline dividers.
 * Data comes from Judge.me (see src/lib/judgeme.ts) — no placeholder content.
 */
export function Reviews({
  reviews = [],
  average = 0,
  count = 0,
  loading = false,
  productGid,
}: {
  reviews?: Review[];
  average?: number;
  count?: number;
  loading?: boolean;
  productGid?: string;
}) {
  const [writing, setWriting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fitAvg = useMemo(() => {
    const vals = reviews.filter((r) => r.fit).map((r) => FIT_POS[r.fit!] ?? 0.5);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [reviews]);

  const hasReviews = count > 0 && reviews.length > 0;

  return (
    <section id="reviews" className="scroll-mt-24 bg-white">
      <div className="container-px py-16 md:py-24">
        <div className="mx-auto w-full max-w-[980px]">
          {/* Summary */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-[14px] font-medium uppercase tracking-[0.16em] text-[#0a0a0a]">
                Reviews
              </h2>
              {hasReviews ? (
                <div className="mt-5 flex items-center gap-3">
                  <span className="text-[30px] font-light leading-none text-[#0a0a0a]">
                    {average.toFixed(1)}
                  </span>
                  <div>
                    <Stars rating={average} size={3.5} />
                    <p className="mt-1 text-[11px] text-[#888888]">
                      Based on {count} {count === 1 ? "review" : "reviews"}
                    </p>
                  </div>
                </div>
              ) : loading ? (
                <p className="mt-5 flex items-center gap-2 text-[12px] text-[#888888]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading reviews…
                </p>
              ) : (
                <p className="mt-5 text-[13px] leading-relaxed text-[#555555]">
                  No reviews yet — be the first to share how it fits.
                </p>
              )}
            </div>
            {productGid && !writing && !submitted && (
              <button
                type="button"
                onClick={() => setWriting(true)}
                className="inline-flex h-11 items-center justify-center border border-[#0a0a0a] px-7 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
              >
                Write a review
              </button>
            )}
          </div>

          {submitted && (
            <p className="mt-6 max-w-[560px] text-[13px] leading-relaxed text-[#555555]">
              Thank you — your review has been submitted and will appear once it's approved.
            </p>
          )}
          {writing && !submitted && productGid && (
            <WriteReviewForm
              productGid={productGid}
              onDone={() => {
                setWriting(false);
                setSubmitted(true);
              }}
            />
          )}

          {fitAvg != null && (
            <div className="mt-6">
              <FitScale pos={fitAvg} />
            </div>
          )}

          {/* Review rows */}
          {hasReviews && (
            <div className="mt-10 border-t border-[#EBEBEB] md:mt-12">
              {reviews.map((r, i) => (
                <article
                  key={i}
                  className="grid gap-4 border-b border-[#EBEBEB] py-8 md:grid-cols-[220px_1fr] md:gap-10 md:py-10"
                >
                  {/* Reviewer meta */}
                  <div className="text-[11px] leading-relaxed text-[#888888]">
                    <p className="flex items-center gap-1.5 text-[13px] text-[#0a0a0a]">
                      {r.name}
                      {r.verified && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] text-[#888888]">
                          <BadgeCheck className="h-3 w-3" /> Verified
                        </span>
                      )}
                    </p>
                    <dl className="mt-3 space-y-1">
                      {r.height && (
                        <div className="flex gap-2">
                          <dt>Height:</dt>
                          <dd className="text-[#0a0a0a]">{r.height}</dd>
                        </div>
                      )}
                      {r.size && (
                        <div className="flex gap-2">
                          <dt>Size Purchased:</dt>
                          <dd className="text-[#0a0a0a]">{r.size}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Review content */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Stars rating={r.rating} />
                      {r.date && <span className="text-[11px] text-[#888888]">{r.date}</span>}
                    </div>
                    {r.title && (
                      <h3 className="mt-2.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#0a0a0a]">
                        {r.title}
                      </h3>
                    )}
                    <p className="mt-2 max-w-[620px] text-[13px] leading-[1.8] text-[#555555]">
                      {r.body}
                    </p>
                    {r.fit && (
                      <div className="mt-4">
                        <FitScale pos={FIT_POS[r.fit] ?? 0.5} compact />
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
