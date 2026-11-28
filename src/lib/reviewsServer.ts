import type { Review } from "@/components/site/Reviews";
import { JUDGEME_PUBLIC_TOKEN, JUDGEME_SHOP_DOMAIN, type JudgemeData } from "@/lib/judgeme";
import {
  workerBindings,
  workerWaitUntil,
  type D1Database,
  type WaitUntil,
  type WorkerBindings,
} from "@/lib/workerEnv";

/*
 * v210: product reviews, ready in the page (owner: "reviews need to load in
 * much quicker and be visible as soon as a customer goes onto the page").
 *
 * Judge.me's public widget API takes 1.3-1.5 s to answer, and the browser
 * only asked it after the page had loaded and started - so the rating badge
 * and the reviews arrived seconds after everything else. Now the Worker keeps
 * each product's reviews, already parsed, and the page arrives with them:
 *
 *  - in memory per isolate, and in D1 (table review_cache, the VIEWS_DB
 *    database) so every edge location has them without asking Judge.me;
 *  - fresh for 10 minutes; older copies are still served at once while a
 *    background refresh fetches the new ones (stale-while-revalidate), so a
 *    new review shows within minutes and no visitor waits on Judge.me;
 *  - only a product with no copy anywhere yet (its first ever view) waits,
 *    and then for at most 2.5 s before the page renders without them.
 *
 * Parsing happens here only (Cloudflare's HTMLRewriter), for the server
 * render and for the browser's /api/reviews/<handle> requests alike, so the
 * page and any later refresh always show the same reviews. It reads exactly
 * the fields the browser-side DOMParser version did.
 *
 * v240 (ads chat, 28 Nov 2026): the site shows only what Judge.me publishes
 * NOW. The 993 imported reviews were hidden in Judge.me on 28 Nov, but the
 * old cache kept serving them: a copy was only refreshed after someone viewed
 * the page, and that viewer still got the old copy. Now:
 *  - a fresh cache (table review_cache_v2; the old review_cache is dropped),
 *    so nothing from before this release is ever shown;
 *  - a copy under 2 minutes old is served as it is; 2-10 minutes old, it is
 *    served while a refresh runs; older than 10 minutes it is NOT served
 *    until Judge.me has been asked again (up to the page's wait) - and a copy
 *    over an hour old is never served, even when Judge.me can't be reached;
 *  - each server copy looks in D1 again after a minute, so a refresh made
 *    anywhere reaches every edge location;
 *  - any product view also refreshes, in the background, every other
 *    product's copy older than 2 minutes (one sweep at a time, site-wide);
 *  - a refresh that never finishes (cut-off background work) can't block the
 *    next one: after 20 seconds it no longer counts.
 * So a review hidden or published in Judge.me shows on the site within a few
 * minutes. The browser asks again when a page opens (lib/judgeme), so an
 * edge-cached page catches up too.
 */

const API = "https://judge.me/api/v1";
const TABLE = "review_cache_v2";
const FRESH_MS = 2 * 60 * 1000;
const MAX_STALE_MS = 10 * 60 * 1000;
const HARD_MAX_MS = 60 * 60 * 1000;
const MEMO_CHECK_MS = 60 * 1000;
const JOB_TIMEOUT_MS = 20 * 1000;
const SWEEP_EVERY_MS = 2 * 60 * 1000;
const SWEEP_MAX = 60;
const SWEEP_BATCH = 6;
const PER_PAGE = 30;
const MAX_PAGES = 10;
const PATH = /^\/api\/reviews\/([a-z0-9][a-z0-9-]{0,150})$/;

/** As stored: the timestamp, not the "3 weeks ago" it shows as, which ages. */
type StoredReview = Omit<Review, "date"> & { iso?: string };
type Stored = { reviews: StoredReview[]; average: number; count: number };

/** at = when Judge.me was asked; checked = when D1 was last looked at. */
const memo = new Map<string, { stored: Stored; at: number; checked: number }>();
const inflight = new Map<string, { job: Promise<void>; started: number }>();
let tableReady: Promise<unknown> | null = null;
let lastSweep = 0;

function ensureTable(db: D1Database): Promise<unknown> {
  tableReady ??= (async () => {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${TABLE} (
           handle TEXT PRIMARY KEY,
           data TEXT NOT NULL,
           fetched_at INTEGER NOT NULL
         ) WITHOUT ROWID`,
      )
      .run();
    await db
      .prepare("CREATE TABLE IF NOT EXISTS review_meta (key TEXT PRIMARY KEY, at INTEGER NOT NULL) WITHOUT ROWID")
      .run();
    // v240: the old cache still held the imported reviews hidden in Judge.me.
    await db.prepare("DROP TABLE IF EXISTS review_cache").run();
  })().catch((error: unknown) => {
    tableReady = null;
    throw error;
  });
  return tableReady;
}

/* ---------------- parsing (same fields as the old browser parser) ---------------- */

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", sbquo: "‚", bdquo: "„",
  hellip: "…", ndash: "–", mdash: "—", bull: "•", middot: "·",
  pound: "£", euro: "€", copy: "©", reg: "®", trade: "™", deg: "°",
  eacute: "é", egrave: "è", aacute: "á", agrave: "à", iacute: "í",
  oacute: "ó", uacute: "ú", ntilde: "ñ", ccedil: "ç", uuml: "ü",
  ouml: "ö", auml: "ä", szlig: "ß", times: "×",
};

/** Text as the browser's textContent / getAttribute give it: character
 *  references decoded (HTMLRewriter hands both over raw - a photo link's
 *  "&amp;width=160" stays "&amp;" until decoded here). */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z][a-z0-9]*);/gi, (match, ref: string) => {
    if (ref[0] === "#") {
      const cp = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : match;
    }
    return NAMED[ref.toLowerCase()] ?? match;
  });
}

type RewriterElement = {
  getAttribute(name: string): string | null;
  onEndTag(handler: () => void): void;
};
type Rewriter = {
  on(selector: string, handlers: { element(el: RewriterElement): void }): Rewriter;
  onDocument(handlers: { text(chunk: { text: string }): void }): Rewriter;
  transform(response: Response): Response;
};
const HTMLRewriterCtor = (globalThis as unknown as { HTMLRewriter?: new () => Rewriter }).HTMLRewriter;

type TextField = "body" | "title" | "author" | "reply" | "replier";
type Draft = Record<TextField, string> & {
  rating: string | null;
  iso: string;
  verified: boolean;
  imported: boolean;
  photos: string[];
};

async function parseWidgetHtml(html: string): Promise<StoredReview[]> {
  if (!HTMLRewriterCtor) return [];
  const out: StoredReview[] = [];
  let cur: Draft | null = null;
  const capturing: TextField[] = [];
  const anchors: (string | null)[] = [];

  const finish = () => {
    if (!cur) return;
    const d = cur;
    cur = null;
    const rating = parseFloat(d.rating ?? "");
    const body = decodeEntities(d.body).trim();
    if (!body && isNaN(rating)) return;
    const reply = decodeEntities(d.reply).trim() || undefined;
    const replier = decodeEntities(d.replier).trim() || undefined;
    out.push({
      reply,
      replier,
      imported: d.imported,
      name: decodeEntities(d.author).trim() || "Anonymous",
      rating: isNaN(rating) ? 5 : rating,
      title: decodeEntities(d.title).trim() || undefined,
      body,
      verified: d.verified,
      iso: d.iso || undefined,
      photos: d.photos.length ? d.photos : undefined,
    });
  };
  const capture = (field: TextField) => ({
    element(el: RewriterElement) {
      if (!cur) return;
      capturing.push(field);
      el.onEndTag(() => {
        const i = capturing.lastIndexOf(field);
        if (i >= 0) capturing.splice(i, 1);
      });
    },
  });
  const attr = (el: RewriterElement, name: string): string | null => {
    const raw = el.getAttribute(name);
    return raw === null ? null : decodeEntities(raw);
  };
  const photo = {
    element(el: RewriterElement) {
      if (!cur) return;
      const href = anchors.length ? anchors[anchors.length - 1] : null;
      const src = attr(el, "data-src") || attr(el, "src");
      const url = href && /^https?:/.test(href) ? href : src;
      if (url && !cur.photos.includes(url)) cur.photos.push(url);
    },
  };

  await new HTMLRewriterCtor()
    .on(".jdgm-rev", {
      element(el) {
        finish();
        cur = {
          body: "", title: "", author: "", reply: "", replier: "",
          rating: null, iso: "", photos: [], imported: false,
          verified: el.getAttribute("data-verified-buyer") === "true",
        };
        capturing.length = 0;
        anchors.length = 0;
        el.onEndTag(finish);
      },
    })
    .on(".jdgm-rev__rating", {
      element(el) {
        if (cur && cur.rating === null) cur.rating = attr(el, "data-score");
      },
    })
    .on(".jdgm-rev__timestamp", {
      element(el) {
        if (cur && !cur.iso) cur.iso = attr(el, "data-content") ?? "";
      },
    })
    .on(".jdgm-rev__buyer-badge", {
      element() {
        if (cur) cur.verified = true;
      },
    })
    .on('[data-badge-type="review_collected_from_another_provider"]', {
      element() {
        if (cur) cur.imported = true;
      },
    })
    .on(".jdgm-rev a", {
      element(el) {
        if (!cur) return;
        anchors.push(attr(el, "href"));
        el.onEndTag(() => {
          anchors.pop();
        });
      },
    })
    .on(".jdgm-rev__pics img", photo)
    .on(".jdgm-rev__pic-img", photo)
    .on(".jdgm-rev__pic img", photo)
    .on(".jdgm-rev__body", capture("body"))
    .on(".jdgm-rev__title", capture("title"))
    .on(".jdgm-rev__author", capture("author"))
    .on(".jdgm-rev__reply-content", capture("reply"))
    .on(".jdgm-rev__replier", capture("replier"))
    .onDocument({
      text(chunk) {
        if (!cur || !capturing.length) return;
        for (const field of new Set(capturing)) cur[field] += chunk.text;
      },
    })
    .transform(new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }))
    .arrayBuffer();
  finish();
  return out;
}

function parseBadgeHtml(html: string): { average: number; count: number } {
  const average = parseFloat(html.match(/data-average-rating=['"]?([\d.]+)/)?.[1] ?? "0") || 0;
  const count = parseInt(html.match(/data-number-of-reviews=['"]?(\d+)/)?.[1] ?? "0", 10) || 0;
  return { average, count };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return "Today";
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  if (days < 30) {
    const w = Math.floor(days / 7);
    return `${w} ${w === 1 ? "week" : "weeks"} ago`;
  }
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} ${m === 1 ? "month" : "months"} ago`;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/* ---------------- fetching and caching ---------------- */

async function fetchFromJudgeme(handle: string): Promise<Stored> {
  const params = (extra: string) =>
    `api_token=${encodeURIComponent(JUDGEME_PUBLIC_TOKEN)}&shop_domain=${encodeURIComponent(
      JUDGEME_SHOP_DOMAIN,
    )}&handle=${encodeURIComponent(handle)}${extra}`;
  const pageUrl = (n: number) => `${API}/widgets/product_review?${params(`&per_page=${PER_PAGE}&page=${n}`)}`;
  const get = (url: string) => fetch(url, { signal: AbortSignal.timeout(8000) });
  const parsePage = async (res: Response): Promise<StoredReview[]> => {
    const json = (await res.json()) as { widget?: unknown };
    return typeof json?.widget === "string" ? parseWidgetHtml(json.widget) : [];
  };

  const [widgetRes, badgeRes] = await Promise.allSettled([get(pageUrl(1)), get(`${API}/widgets/preview_badge?${params("")}`)]);
  // Without the reviews themselves there's nothing to keep: the old copy stays.
  if (widgetRes.status !== "fulfilled" || !widgetRes.value.ok) throw new Error("Judge.me reviews unavailable");
  let reviews: StoredReview[] = await parsePage(widgetRes.value);

  let average = 0;
  let count = reviews.length;
  if (badgeRes.status === "fulfilled" && badgeRes.value.ok) {
    const json = (await badgeRes.value.json()) as { badge?: unknown };
    if (typeof json?.badge === "string") {
      const parsed = parseBadgeHtml(json.badge);
      if (parsed.count > 0) {
        average = parsed.average;
        count = parsed.count;
      }
    }
  }
  if (reviews.length === PER_PAGE && count > PER_PAGE) {
    const pages = Math.min(MAX_PAGES, Math.ceil(count / PER_PAGE));
    const rest = await Promise.allSettled(
      Array.from({ length: pages - 1 }, (_, k) =>
        get(pageUrl(k + 2)).then((r): Promise<StoredReview[]> | StoredReview[] => (r.ok ? parsePage(r) : [])),
      ),
    );
    for (const r of rest) if (r.status === "fulfilled") reviews = reviews.concat(r.value);
  }
  if (!average && reviews.length) {
    average = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;
  }
  return { reviews, average, count };
}

function refresh(handle: string, b: WorkerBindings): Promise<void> {
  const running = inflight.get(handle);
  // A refresh still under way is shared; one that never finished isn't.
  if (running && Date.now() - running.started < JOB_TIMEOUT_MS) return running.job;
  const started = Date.now();
  const job = (async () => {
    const stored = await fetchFromJudgeme(handle);
    const at = Date.now();
    memo.set(handle, { stored, at, checked: at });
    if (b.VIEWS_DB) {
      await ensureTable(b.VIEWS_DB);
      await b.VIEWS_DB
        .prepare(`INSERT OR REPLACE INTO ${TABLE} (handle, data, fetched_at) VALUES (?, ?, ?)`)
        .bind(handle, JSON.stringify(stored), at)
        .run();
    }
  })()
    .catch((error: unknown) => console.error("review refresh failed", handle, error))
    .finally(() => {
      if (inflight.get(handle)?.started === started) inflight.delete(handle);
    });
  inflight.set(handle, { job, started });
  return job;
}

function refreshLater(handle: string, b: WorkerBindings, waitUntil?: WaitUntil) {
  const job = refresh(handle, b);
  if (waitUntil) waitUntil(job);
}

/* Every other product's copy older than FRESH_MS, refreshed in the
   background - at most one sweep every 2 minutes, site-wide (a row in
   review_meta is claimed first), so all products stay current while anyone
   views any product. */
async function sweep(db: D1Database, b: WorkerBindings, now: number): Promise<void> {
  await ensureTable(db);
  await db.prepare("INSERT OR IGNORE INTO review_meta (key, at) VALUES ('sweep', 0)").run();
  const claim = (await db
    .prepare("UPDATE review_meta SET at = ? WHERE key = 'sweep' AND at < ?")
    .bind(now, now - SWEEP_EVERY_MS)
    .run()) as { meta?: { changes?: number } } | null;
  if (!claim?.meta?.changes) return;
  const rows = await db
    .prepare(`SELECT handle FROM ${TABLE} WHERE fetched_at < ? ORDER BY fetched_at LIMIT ${SWEEP_MAX}`)
    .bind(now - FRESH_MS)
    .all<{ handle: string }>();
  const handles = (rows.results ?? []).map((r) => r.handle);
  for (let i = 0; i < handles.length; i += SWEEP_BATCH) {
    await Promise.allSettled(handles.slice(i, i + SWEEP_BATCH).map((h) => refresh(h, b)));
  }
}

function sweepLater(b: WorkerBindings, waitUntil?: WaitUntil) {
  const now = Date.now();
  if (!b.VIEWS_DB || !waitUntil || now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  waitUntil(sweep(b.VIEWS_DB, b, now).catch((error: unknown) => console.error("review sweep failed", error)));
}

/**
 * Makes sure this isolate holds the product's current reviews before the page
 * renders (v240 rules above): from memory, D1 looked at again after a minute,
 * and Judge.me itself whenever the copy is 10+ minutes old or there is none -
 * waiting at most `blockMs` for it.
 */
export async function primeReviews(
  handle: string,
  b: WorkerBindings,
  waitUntil?: WaitUntil,
  blockMs = 2500,
): Promise<void> {
  const now = Date.now();
  let held = memo.get(handle);
  if (b.VIEWS_DB && (!held || now - held.checked >= MEMO_CHECK_MS)) {
    try {
      await ensureTable(b.VIEWS_DB);
      const row = await b.VIEWS_DB
        .prepare(`SELECT data, fetched_at FROM ${TABLE} WHERE handle = ?`)
        .bind(handle)
        .first<{ data: string; fetched_at: number }>();
      if (row && (!held || row.fetched_at > held.at)) {
        held = { stored: JSON.parse(row.data) as Stored, at: row.fetched_at, checked: now };
        memo.set(handle, held);
      } else if (held) {
        held.checked = now;
      }
    } catch (error) {
      console.error("review cache read failed", handle, error);
    }
  }
  sweepLater(b, waitUntil);
  const age = held ? now - held.at : Infinity;
  if (age < FRESH_MS) return;
  if (age < MAX_STALE_MS) {
    refreshLater(handle, b, waitUntil);
    return;
  }
  const job = refresh(handle, b);
  if (waitUntil) waitUntil(job);
  await Promise.race([job, new Promise((resolve) => setTimeout(resolve, blockMs))]);
}

/** The product's reviews this isolate holds, as the page shows them; null if
 *  none - or if the copy is over an hour old (Judge.me unreachable that long:
 *  better no reviews than ones that may have been hidden since). */
export function peekReviews(handle: string): JudgemeData | null {
  const held = memo.get(handle);
  if (!held || Date.now() - held.at >= HARD_MAX_MS) return null;
  const { reviews, average, count } = held.stored;
  return {
    reviews: reviews.map(({ iso, ...r }) => ({ ...r, date: iso ? formatDate(iso) : undefined })),
    average,
    count,
  };
}

/** GET /api/reviews/<handle> for the browser (client-side visits, the bundle quick view). */
export async function reviewsApi(request: Request, url: URL, env: unknown, ctx?: unknown): Promise<Response | null> {
  const match = url.pathname.match(PATH);
  if (!match) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "method" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }
  const handle = match[1];
  await primeReviews(handle, workerBindings(request, env), workerWaitUntil(request, ctx), 6000);
  const data = peekReviews(handle);
  return new Response(JSON.stringify(data ?? { error: "unavailable" }), {
    status: data ? 200 : 503,
    headers: {
      "content-type": "application/json",
      "cache-control": data ? "public, max-age=60" : "no-store",
    },
  });
}

/** For server.ts: a product page's handle, if this request is one. */
export function productPageHandle(url: URL): string | null {
  return url.pathname.match(/^\/product\/([a-z0-9][a-z0-9-]{0,150})$/)?.[1] ?? null;
}
