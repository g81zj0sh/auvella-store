/*
 * "Why Auvella" for every product page, derived from the product's own
 * description rather than written by hand, so each product gets points that
 * are true of it and they stay true if the description changes.
 *
 * Rules this module keeps (Joshua, 28 Sept 2026 + standing brand rules):
 * - Say what Auvella does. No "Others" column: a tick-versus-cross table
 *   against unnamed competitors isn't objectively verifiable (CAP Code
 *   3.33+) and the brand doesn't make claims it can't show.
 * - Fabric lines describe the fibre, never the body: no health, slimming or
 *   skin-benefit claims.
 * - Pure string functions: server and client produce identical output.
 */

export type WhyPoint = string;
export type Fabric = { name: string; share?: string; line: string; tag: string };

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The Details bullets, where fabric and construction facts live. */
function detailBullets(html: string): string[] {
  const m = html.match(/<h3>\s*Details\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i);
  if (!m) return [];
  return [...m[1].matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((x) => strip(x[1]));
}

/* ---------------------------------------------------------------- why -- */

// Product-specific points, in priority order: first match wins a slot.
const SPECIFIC: Array<{ test: RegExp; point: string }> = [
  { test: /front[- ]opening|opens at the front|fastens at the front|front[- ]buckle|front closure/i, point: "Fastens at the front — no reaching behind your back" },
  { test: /hidden (front )?buttons|button closure/i, point: "Buttons at the front — nothing to pull over your head" },
  { test: /zip[- ]front|front zip/i, point: "Zips at the front for easy on and off" },
  { test: /\bseamless\b/i, point: "Seamless — no lines under fitted clothes" },
  { test: /wire-free|no underwire|no wire\b/i, point: "Wire-free — nothing to dig in" },
  { test: /\bstrapless\b/i, point: "Strapless — made for off-shoulder and bandeau necklines" },
  { test: /backless|open[- ]back|low u-back|\bu-back/i, point: "Low, open back" },
  { test: /no boning/i, point: "No boning — it flexes when you bend" },
  { test: /fleece-lined|fleece lined/i, point: "Fleece-lined — warm the moment it's on" },
  { test: /high waist|high-waist|high rise|high-rise/i, point: "High waist that sits above the waistline" },
  { test: /drawstring|tie waist|tie-waist|tie-side|lace-up/i, point: "Ties you set yourself, for your own fit" },
  { test: /adjustable straps|straps adjust|detachable/i, point: "Straps that adjust or come off" },
  { test: /padded cups/i, point: "Soft padded cups for shape" },
  { test: /quick-dry|quick dry|dries fast|dries quickly/i, point: "Dries fast" },
  { test: /long sleeves|long-sleeve|long sleeve/i, point: "Long sleeves for cover and warmth" },
];

// True of every product, store-wide.
const BRAND: WhyPoint[] = [
  "Honest details on every page — including what it won't do",
  "Tracked delivery and 30-day returns",
  "The price you see is the price you pay, in your currency",
];

export function whyPoints(descriptionHtml: string | null | undefined, title = ""): WhyPoint[] {
  // Only the product's own facts: its title and its Details bullets. The
  // prose and fit notes mention OTHER products ("wear it with a strapless
  // bra"), which produced false points when the whole text was read.
  const text = title + " · " + detailBullets(descriptionHtml ?? "").join(" · ");
  const picked: WhyPoint[] = [];
  for (const s of SPECIFIC) {
    if (picked.length === 2) break;
    if (s.test.test(text)) picked.push(s.point);
  }
  // Two specific + two brand points; fewer specific means more brand.
  return [...picked, ...BRAND].slice(0, 4);
}

/* ------------------------------------------------------------- fabrics -- */

type FibreKey = "nylon" | "spandex" | "cotton" | "polyester" | "silk" | "silicone";

const FIBRE_WORDS: Array<{ key: FibreKey; re: RegExp }> = [
  { key: "spandex", re: /\b(spandex|elastane|lycra)\b/i },
  { key: "cotton", re: /\bcotton\b/i },
  { key: "silicone", re: /\bsilicone\b/i },
  { key: "nylon", re: /\bnylon\b/i },
  { key: "polyester", re: /\bpolyester\b/i },
  // "ice silk" is a nylon finish, not silk - only mulberry / pure silk counts.
  { key: "silk", re: /\bmulberry silk\b|\b100% silk\b/i },
];

function fibreCard(key: FibreKey, ctx: string): Omit<Fabric, "share"> {
  switch (key) {
    case "nylon":
      return /ice[- ]silk/i.test(ctx)
        ? { name: "Ice-silk nylon", line: "Fine and thin, cool to the touch, and quick to dry.", tag: "Cool" }
        : { name: "Nylon", line: "Smooth and light; it holds its shape and dries quickly.", tag: "Smooth" };
    case "spandex":
      return { name: "Spandex", line: "The stretch — it moves with you and springs back, so it doesn't bag out.", tag: "Stretch" };
    case "cotton":
      return /gusset/i.test(ctx) && !/\d+\s*(–|-)?\s*\d*%\s*cotton(?! gusset)/i.test(ctx.replace(/100% cotton gusset/i, ""))
        ? { name: "Cotton gusset", line: "Soft, breathable cotton where it matters most.", tag: "Breathable" }
        : /fleece/i.test(ctx)
          ? { name: "Cotton, fleece-lined", line: "Soft cotton outside, warm fleece inside.", tag: "Warm" }
          : { name: "Cotton", line: "Soft and breathable next to skin.", tag: "Breathable" };
    case "polyester":
      // Only a lining? Say so, rather than implying the whole garment.
      if (/polyester lining/i.test(ctx) && !/polyester/i.test(ctx.replace(/polyester lining/gi, "")))
        return { name: "Polyester lining", line: "A smooth lining that keeps its shape.", tag: "Lined" };
      return /satin/i.test(ctx)
        ? { name: "Satin-finish polyester", line: "Smooth and cool with a soft sheen, and it doesn't crease.", tag: "Smooth" }
        : /velvet/i.test(ctx)
          ? { name: "Velvet-finish polyester", line: "A soft pile that holds warmth and keeps its colour.", tag: "Warm" }
          : { name: "Polyester", line: "Light and hard-wearing; keeps its colour and shape wash after wash.", tag: "Easy care" };
    case "silk":
      return { name: "Mulberry silk", line: "Smooth against skin and hair.", tag: "Smooth" };
    case "silicone":
      return { name: "Silicone", line: "Holds to skin on its own — no straps, no band.", tag: "Grip" };
  }
}

/** Fabrics named in the product's Details bullets, with shares where given. */
export function fabrics(descriptionHtml: string | null | undefined): Fabric[] {
  const bullets = detailBullets(descriptionHtml ?? "");
  const ctx = bullets.join(" · ");
  if (!ctx) return [];
  const found = new Map<FibreKey, Fabric>();
  for (const { key, re } of FIBRE_WORDS) {
    if (!re.test(ctx)) continue;
    // A share written right before the fibre word: "82% nylon", "90–95% cotton".
    const word = key === "spandex" ? "(?:spandex|elastane|lycra)" : key === "silk" ? "mulberry silk" : key;
    const share = ctx.match(new RegExp(`(\\d{1,3}(?:\\s*[–-]\\s*\\d{1,3})?)%\\s*${word}`, "i"))?.[1]?.replace(/\s*-\s*/, "–");
    const card = fibreCard(key, ctx);
    found.set(key, { ...card, ...(share && !/gusset/i.test(card.name) ? { share: `${share}%` } : {}) });
  }
  // Largest share first; unknown shares after, in the order above.
  return [...found.values()]
    .sort((a, b) => (parseInt(b.share ?? "0") || 0) - (parseInt(a.share ?? "0") || 0))
    .slice(0, 3);
}


/* ----------------------------------------------------- page sections -- */

/** Opening paragraphs of the description (everything before the first h3). */
export function introText(html: string | null | undefined): string[] {
  const head = (html ?? "").split(/<h3>/i)[0];
  return [...head.matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((m) => strip(m[1])).filter(Boolean).slice(0, 2);
}

/** The fit note (or "How to use" on accessories), as plain text. */
export function fitNote(html: string | null | undefined): { heading: string; text: string } | null {
  const m = (html ?? "").match(/<h3>\s*(Fit note|How to use)\s*<\/h3>\s*([\s\S]*?)(?=<h3>|$)/i);
  if (!m) return null;
  const text = strip(m[2]);
  return text ? { heading: m[1], text } : null;
}

/** "Sizes S to XL" style line from the Details list, if present. */
export function sizesLine(html: string | null | undefined): string | null {
  return detailBullets(html ?? "").find((b) => /^sizes?\b/i.test(b)) ?? null;
}

/** The Details bullet(s) that describe the fabric. */
export function fabricLine(html: string | null | undefined): string | null {
  const b = detailBullets(html ?? "").filter((x) => FIBRE_WORDS.some((f) => f.re.test(x)) || /ice[- ]silk/i.test(x));
  return b.length ? b.join("; ") : null;
}

/** Highlighted phrase for the fabric section headline, from the main fabric's tag. */
export function fabricHeadline(f: Fabric[]): string {
  const tag = f[0]?.tag ?? "";
  const byTag: Record<string, string> = {
    Stretch: "moves with you", Smooth: "stays smooth", Breathable: "breathes", Cool: "stays cool",
    "Easy care": "keeps its shape", Warm: "keeps you warm", Grip: "stays put", Lined: "keeps its shape",
  };
  // Any stretch in the mix is the most tangible benefit to lead with.
  if (f.some((x) => x.tag === "Stretch")) return "moves with you";
  return byTag[tag] ?? "keeps its shape";
}

/** Product-specific points only (no store-wide fill), lead text before " — ". */
export function specificPoints(descriptionHtml: string | null | undefined, title = "", max = 3): string[] {
  const text = title + " · " + detailBullets(descriptionHtml ?? "").join(" · ");
  const out: string[] = [];
  for (const s of SPECIFIC) {
    if (out.length === max) break;
    if (s.test.test(text)) out.push(s.point.split(" — ")[0]);
  }
  return out;
}

export type TableRow = { label: string; others: "yes" | "not-always" };

/** Rows for the Why Auvella? table. Others is ticked only where it's true of
 *  the category (stretch fabric); everything else is "not always" - never a
 *  cross, because other brands' versions often do have these features. */
export function comparisonRows(descriptionHtml: string | null | undefined, title = ""): TableRow[] {
  const rows: TableRow[] = specificPoints(descriptionHtml, title, 3).map((label) => ({ label, others: "not-always" as const }));
  if (fabrics(descriptionHtml).some((f) => f.tag === "Stretch")) rows.push({ label: "Stretch that springs back", others: "yes" });
  rows.push({ label: "Honest fit note on the page", others: "not-always" });
  rows.push({ label: "Price shown is the price you pay", others: "not-always" });
  return rows.slice(0, 5);
}

/** Construction facts from Details: not colours, sizes or the fabric line. */
export function constructionBullets(html: string | null | undefined, max = 3): string[] {
  return detailBullets(html ?? "")
    .filter((b) => !/^colou?rs?\b/i.test(b) && !/^sizes?\b/i.test(b))
    .filter((b) => !FIBRE_WORDS.some((f) => f.re.test(b)) && !/ice[- ]silk/i.test(b))
    .map((b) => b.charAt(0).toUpperCase() + b.slice(1))
    .slice(0, max);
}
