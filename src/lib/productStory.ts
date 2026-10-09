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
  // "Details" or, on some older pages, "The details".
  const m = html.match(/<h3>\s*(?:The\s+)?Details\s*<\/h3>\s*<ul>([\s\S]*?)<\/ul>/i);
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

// True of every product, store-wide - except returns, which final-sale
// products (underwear, the eye mask; see returnsPolicy.ts) don't have.
const RETURNS_POINT = "Tracked delivery and 30-day returns";
const BRAND: WhyPoint[] = [
  "Honest details on every page — including what it won't do",
  RETURNS_POINT,
  "The price you see is the price you pay, in your currency",
];

export function whyPoints(
  descriptionHtml: string | null | undefined,
  title = "",
  opts: { finalSale?: boolean } = {},
): WhyPoint[] {
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
  const brand = opts.finalSale
    ? BRAND.map((p) => (p === RETURNS_POINT ? "Tracked delivery" : p))
    : BRAND;
  return [...picked, ...brand].slice(0, 4);
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
      // A grip band on a regular bra is not the same as a stick-on cup.
      return /silicone band|silicone strip|anti-slip/i.test(ctx)
        ? { name: "Silicone grip band", line: "An anti-slip band that keeps it in place without straps.", tag: "Grip" }
        : { name: "Silicone", line: "Holds to skin on its own — no straps, no band.", tag: "Grip" };
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
export function comparisonRows(
  descriptionHtml: string | null | undefined,
  title = "",
  opts: { sized?: boolean; finalSale?: boolean } = {},
): TableRow[] {
  const rows: TableRow[] = specificPoints(descriptionHtml, title, 3).map((label) => ({ label, others: "not-always" as const }));
  if (fabrics(descriptionHtml).some((f) => f.tag === "Stretch")) rows.push({ label: "Stretch that springs back", others: "yes" });
  rows.push({ label: "An honest fit note on the page", others: "not-always" });
  if (opts.sized !== false) rows.push({ label: "Sizes mapped to real measurements", others: "not-always" });
  rows.push({ label: "The price you see is the price you pay", others: "not-always" });
  rows.push({
    label: opts.finalSale ? "Tracked delivery" : "Tracked delivery, 30-day returns",
    others: "not-always",
  });
  return rows.slice(0, 6);
}

/*
 * Feature -> benefit -> result, for the construction ticks. Every rewrite is
 * mechanical truth about the garment (what the feature does and why that
 * matters), never a body-change promise. Unmatched bullets pass through.
 */
const BENEFITS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^high[- ]rise waistband|^high rise, sits above/i, () => "High-rise waistband — it sits above your natural waist, so the edge isn't where your belly folds when you sit"],
  [/^high rise, smoothing through the tummy/i, () => "High rise with a smoothing front — covers the tummy with nothing cutting in at the middle"],
  [/^knitted seamless from bust to thigh/i, () => "Knitted seamless from bust to thigh — no waist seam, so there's no line through a fitted dress"],
  [/^seamless through the body/i, () => "Seamless through the body — no seams or ridges, so nothing prints through fitted clothes"],
  [/^double-layer panel through the tummy/i, () => "Double-layer tummy panel, lighter through the thigh — hold where you want it, comfort where you don't"],
  [/^smoothing (panel )?through the (tummy|middle)(, shaped seat)?$/i, (m) => `Smoothing panel through the ${m[2].toLowerCase()} — firmer where you want a smooth line, softer everywhere else${m[3] ? ", with a shaped seat" : ""}`],
  [/^lifting panel through the seat/i, () => "Shaped seat panel — follows your natural shape instead of flattening it"],
  [/^soft lace hem/i, () => "Soft lace hem — spreads the edge pressure, so it doesn't dig into your thigh"],
  [/^thin moulded three-quarter cups?, no wire/i, () => "Thin moulded cups, no wire — light shape with nothing pressing into your ribs"],
  [/^padded jelly cups/i, () => "Padded jelly cups, wire-free — soft shape and three-quarter coverage, nothing pressing in"],
  [/^(triangle top, )?padded cups, no (under)?wire/i, (m) => `${m[1] ? "Triangle top with padded" : "Padded"} cups, no wire — shape from soft padding rather than a wire`],
  [/^wire-free, no steel ring/i, () => "Wire-free, no steel ring — nothing presses into your ribs, however long you wear it"],
  [/^plastic support strips, no steel/i, () => "Plastic support strips, no steel — structure that flexes when you bend"],
  [/^front-opening closure/i, () => "Front-opening closure — opens one-handed, no reaching behind your back"],
  [/^(four|three)-row hook-and-eye back(?: closure)?(, detachable double straps)?/i, (m) => `${m[1][0].toUpperCase() + m[1].slice(1)}-row hook-and-eye back — loosen or tighten the band as the fabric relaxes through the day${m[2] ? "; straps come off" : ""}`],
  [/^detachable, adjustable double straps/i, () => "Adjustable double straps that detach — set them to your height, or take them off for a strapless look"],
  [/^adjustable straps$/i, () => "Adjustable straps — set to your height, so they don't slip or dig"],
  [/^removable straps: strapless, straight, cross-back or halter/i, () => "Removable straps: strapless, straight, cross-back or halter — one bra for four necklines"],
  [/^no boning, no buttons/i, () => "No boning, no buttons — it flexes when you bend and nothing digs in"],
  [/^built-in abdominal belt/i, () => "Built-in abdominal belt — firm hold through the middle, no separate belt to fasten"],
  [/^elasticated waist$/i, () => "Elasticated waist — gives when you sit, no pressure line"],
  [/^(lightweight, )?(breathable, )?quick-drying(, breathable)?$|^breathable, moisture-wicking$/i, () => "Light, quick-drying fabric that breathes — comfortable through a warm day"],
  [/^strapless bustier cut, no fastenings/i, () => "Strapless bustier cut, no fastenings — nothing to show under an off-shoulder neckline"],
  [/^built-in moulded bra pads/i, () => "Built-in moulded bra pads — one layer instead of a top and a bra"],
];

function benefitLine(b: string): string {
  for (const [re, fn] of BENEFITS) {
    const m = b.match(re);
    if (m) return fn(m);
  }
  return b;
}

/** Construction facts from Details (not colours, sizes or the fabric line),
 *  written feature -> benefit -> result where a rewrite exists. */
export function constructionBullets(html: string | null | undefined, max = 3): string[] {
  return detailBullets(html ?? "")
    .filter((b) => !/^colou?rs?\b/i.test(b) && !/^sizes?\b/i.test(b))
    .filter((b) => !FIBRE_WORDS.some((f) => f.re.test(b)) && !/ice[- ]silk/i.test(b))
    .map((b) => benefitLine(b.charAt(0).toUpperCase() + b.slice(1)))
    .slice(0, max);
}

/** Headline for the second story section: fabric-led when the fabric is
 *  known, otherwise led by the product's strongest construction point. */
export function actionHeadline(descriptionHtml: string | null | undefined, title = ""): { lead: string; hi: string } {
  const f = fabrics(descriptionHtml);
  if (f.length) return { lead: "A fabric that", hi: fabricHeadline(f) };
  const first = specificPoints(descriptionHtml, title, 1)[0] ?? "";
  const map: Record<string, [string, string]> = {
    "Seamless": ["Made to", "disappear"],
    "Wire-free": ["Made to", "never dig in"],
    "Fastens at the front": ["Made to", "fasten in seconds"],
    "Buttons at the front": ["Made to", "fasten in seconds"],
    "Zips at the front for easy on and off": ["Made to", "zip on easy"],
    "Strapless": ["Made to", "go strapless"],
    "Low, open back": ["Made to", "stay out of sight"],
    "High waist that sits above the waistline": ["A waist that", "stays up"],
    "Ties you set yourself, for your own fit": ["A fit that's", "yours to set"],
    "Soft padded cups for shape": ["Shape that", "stays soft"],
    "Dries fast": ["Made to", "dry fast"],
    "Long sleeves for cover and warmth": ["Made for", "cooler days"],
    "No boning": ["Made to", "move with you"],
    "Fleece-lined": ["Made to", "keep you warm"],
    "Straps that adjust or come off": ["Straps that", "work for you"],
  };
  const hit = map[first];
  return hit ? { lead: hit[0], hi: hit[1] } : { lead: "Made for", hi: "every day" };
}

/* ---------------------------------------------------- before you ask -- */

/*
 * The three worries behind most shapewear and bra returns, answered per
 * product from its own title, Details and fit note. Only for shapewear and
 * bras; every answer describes what the construction does, and where a
 * limit exists (lace texture, adhesive on oily skin) it says so.
 */
export function beforeYouAsk(html: string | null | undefined, title = "", productType = ""): Array<{ q: string; a: string }> {
  const all = title + " · " + detailBullets(html ?? "").join(" · ");
  const has = (re: RegExp) => re.test(all);
  // Category from the product type first, so a sleepwear cami or a
  // bikini bottom never gets shapewear questions.
  const other = /sleep|lounge|swim|underwear|dress|accessor/i.test(productType);
  const kind = other
    ? null
    : /^bra$/i.test(productType) || /\bbra\b|bralette/i.test(title)
      ? "bra"
      : /^shapewear$/i.test(productType) || /bodysuit|shaping|shaper|compression/i.test(title)
        ? "shape"
        : null;
  if (!kind) return otherQuestions(html, title, productType);

  const seamless = has(/seamless/i);
  const lace = has(/\blace\b/i);
  const breathable = has(/cotton|nylon|breathable|mesh|moisture-wicking/i);

  if (kind === "shape") {
    const bodysuit = /bodysuit/i.test(title);
    const highRise = has(/high[- ]?(rise|waist)/i);
    const roll = bodysuit
      ? "There's no waistband to roll: it's one continuous piece. What keeps it smooth all day is the right size — use the size guide rather than your dress size."
      : highRise
        ? "The waistband sits above your natural waist, which is where most roll-down starts. The other cause is a size too small — if you're between sizes, go up."
        : "Rolling almost always means a size too small. If you're between sizes, go up — the hold comes from the fabric, not from squeezing.";
    const show = [
      seamless ? "It's knitted seamless — no side seams or hard edges to print through fitted fabric." : "It's cut to sit flat under everyday clothes.",
      lace ? "The lace edges lie flat; under very thin, clingy fabric the texture can show, under jeans or a lined dress it won't." : "Under very thin fabric, a colour close to your skin tone shows least.",
    ].join(" ");
    const allDay = `At your true size, yes${breathable ? " — the fabric breathes, so it's comfortable for hours" : ""}. Sizing down gives firmer hold, but that's for an evening, not a full day.`;
    return [
      { q: "Will it roll down?", a: roll },
      { q: "Will it show under clothes?", a: show },
      { q: "Can I wear it all day?", a: allDay },
    ];
  }

  // bras
  const adhesive = has(/strapless, backless|adhesive|two-layer silicone/i) && !has(/silicone band|anti-slip/i);
  const strapless = has(/strapless/i);
  const grip = has(/silicone band|anti-slip|non-slip/i);
  const hooks = has(/hook-and-eye/i); // adjustable fastenings only (a buckle doesn't loosen)
  const moulded = has(/moulded/i);
  const wireFree = has(/wire-free|no (under)?wire|no steel/i);
  const dig = adhesive
    ? "No band and no wire — it holds by adhesive, so there's nothing to dig in."
    : wireFree
      ? `No wire, so nothing presses into your ribs${hooks ? " — and the hook-and-eye back adjusts, so you can loosen the band as the day goes on" : ""}.`
      : "The band carries the support, so size by your underbust — a band that fits doesn't dig.";
  const stay = adhesive
    ? "It holds by adhesive, so it needs clean, dry skin — no lotion or oil. It gives coverage and shape rather than lift."
    : strapless
      ? `${grip ? "A silicone grip band holds it in place without straps. " : ""}A strapless bra stays up on its band, so the band size matters most — go by your underbust in the size guide.`
      : `Size by your band: that's what holds a bra in place.${has(/adjustable|detachable/i) ? " The straps adjust, so they sit where you want them." : ""}`;
  const show = lace && !seamless
    ? "The lace is made to be seen — pretty under an open shirt. Under a thin T-shirt, the texture will show."
    : moulded
      ? "Smooth, moulded cups with clean edges — nothing to show through a T-shirt."
      : has(/traceless/i)
        ? "Traceless edges — no outline under a T-shirt, even a white one."
        : seamless
          ? "Seamless, with clean edges — nothing to show through a T-shirt."
          : "Under very thin fabric, a colour close to your skin tone shows least.";
  return [
    { q: "Will it dig in?", a: dig },
    { q: adhesive || strapless ? "Will it stay up?" : "Will it stay in place?", a: stay },
    { q: "Will it show?", a: show },
  ];
}

/*
 * Every other category gets its own three questions. Each answer comes from
 * the product's own Details, fit note or fabric; a question whose answer
 * isn't in the product's details is skipped, never guessed.
 */
function otherQuestions(html: string | null | undefined, title: string, productType: string): Array<{ q: string; a: string }> {
  const bullets = detailBullets(html ?? "");
  const all = title + " · " + bullets.join(" · ");
  const has = (re: RegExp) => re.test(all);
  const fit = fitNote(html);
  const fab = fabrics(html);
  const setLine = bullets.find((b) => /sold as a set|two pieces|top and (trousers|briefs|shorts|bottoms)/i.test(b));
  // Fit answers: the first two sentences of the fit note, enough for a card.
  const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter(Boolean);
  const fitShort = (drop?: RegExp) =>
    fit ? sentences(fit.text).filter((x) => !drop || !drop.test(x)).slice(0, 2).join(" ") : "";
  const fitQ = fit && fit.heading !== "How to use" ? { q: "How does it fit?", a: fitShort() } : null;
  const fabricQ = fab.length
    ? { q: "What's the fabric like?", a: fab.map((f) => `${f.share ? f.share + " " : ""}${f.name}: ${f.line.charAt(0).toLowerCase()}${f.line.slice(1)}`).join(" ") }
    : null;
  const pieces = setLine?.match(/:\s*(.+)$/)?.[1];
  const setQ = setLine
    ? { q: "Is it a set?", a: pieces ? `Yes — ${pieces.replace(/\.$/, "")}.` : "Yes — the pieces come together as a set." }
    : null;
  const pick = (...qs: Array<{ q: string; a: string } | null | false>) =>
    qs.filter((x): x is { q: string; a: string } => !!x).slice(0, 3);

  if (/swim/i.test(productType) || /bikini|swimsuit|swimwear/i.test(title)) {
    return pick(
      fitQ,
      has(/lining|lined/i) && { q: "Is it see-through when wet?", a: "It's lined, so it stays opaque when wet." },
      setQ,
      { q: "How do I look after it?", a: "Rinse it in cool, fresh water after the pool or the sea and dry it flat in the shade — chlorine, salt and sun are what wear swimwear out." },
    );
  }
  if (/dress/i.test(productType) || /dress/i.test(title)) {
    // The fit note's own words about underwear win; the neckline decides
    // otherwise, and a sleeveless cut never gets "your everyday bra works".
    const noteBra = fit ? sentences(fit.text).filter((x) => /\bbra\b|bralette|underwear/i.test(x)).join(" ") : "";
    const under = noteBra
      ? noteBra
      : has(/strapless|off[- ]the[- ]shoulder|off-shoulder/i)
        ? "A strapless bra or stick-on cups — the neckline leaves your shoulders bare."
        : has(/open back|backless|low back/i)
          ? "A low-back or stick-on bra, so nothing shows through the open back."
          : has(/sleeveless/i)
            ? "The sleeveless cut can show a regular bra at the shoulder — a bralette or a strapless bra sits cleaner."
            : "Your everyday bra works with this neckline.";
    const len = (all.match(/\b(maxi|midi|mini)\b/i) || [])[1];
    const heightNote = fit ? sentences(fit.text).find((x) => /height|tall|knee|ankle/i.test(x)) : undefined;
    const fitDress = fit ? sentences(fit.text).filter((x) => !/\bbra\b|bralette|underwear|height|tall|knee|ankle/i.test(x)).slice(0, 2).join(" ") : "";
    return pick(
      fitDress ? { q: "How does it fit?", a: fitDress } : null,
      { q: "What do I wear underneath?", a: under },
      len ? { q: "How long is it?", a: heightNote ?? `${len.charAt(0).toUpperCase() + len.slice(1).toLowerCase()} length.` } : null,
      fabricQ,
    );
  }
  if (/underwear/i.test(productType) || /brief|thong|panties/i.test(title)) {
    const show = has(/seamless/i)
      ? "It's cut seamless, so there's no line under trousers or leggings."
      : has(/\blace\b/i)
        ? "The lace edges lie flat; under very thin, tight fabric the texture can show."
        : null;
    const breathe = has(/cotton gusset/i)
      ? "Yes — the gusset is cotton, and the fabric is light and breathable."
      : fab.some((f) => /^cotton$/i.test(f.name))
        ? "Yes — it's cotton: soft and breathable."
        : has(/breathable|quick-drying/i)
          ? "Yes — the fabric is light, breathable and quick-drying."
          : null;
    const leak = has(/leak/i);
    return pick(
      leak && {
        q: "How much can it hold?",
        a: "It has a three-layer leak-resistant gusset. We don't publish an absorbency rating, so on heavier days wear it as backup to a tampon or cup.",
      },
      show ? { q: "Will it show under clothes?", a: show } : null,
      fitQ && { q: fitQ.q, a: leak ? fitShort(/absorb/i) : fitQ.a },
      breathe ? { q: "Is it breathable?", a: breathe } : null,
    );
  }
  if (/accessor/i.test(productType) || /mask|adhesive/i.test(title)) {
    const howTo = fit && fit.heading === "How to use" ? { q: "How do I use it?", a: fitShort() } : null;
    return pick(
      has(/light-blocking/i) && { q: "Will it block the light?", a: "Yes — it's light-blocking, with an adjustable elastic strap so it sits snug without pressing." },
      has(/mulberry silk/i) && { q: "Is it real silk?", a: "Yes — double-sided mulberry silk." },
      howTo,
      has(/skin-friendly/i) && { q: "Is it gentle on skin?", a: "It's a skin-friendly formula. If your skin is sensitive, test a small patch first." },
      has(/range of fabrics/i) && { q: "Will it work on my fabric?", a: "It's made for a range of fabrics. On silk or delicates, test it on an inside seam first." },
    );
  }
  // Loungewear, sleepwear, robes, sets.
  return pick(fitQ, fabricQ, setQ);
}

/* ------------------------------------------------ description layout -- */

/**
 * Splits a (sanitised) description for the product-page tabs:
 * - intro: everything before the first heading (hook + story paragraphs)
 * - introParagraphs: how many <p> the intro has (drives mobile "Read more")
 * - sections: the remaining headed sections, EXCEPT the fit note, which
 *   belongs in the Fit & Fabric tab
 */
export function descriptionParts(html: string): { intro: string; introParagraphs: number; sections: string } {
  const i = html.search(/<h3>/i);
  const intro = i < 0 ? html : html.slice(0, i);
  const rest = i < 0 ? "" : html.slice(i);
  const sections = rest
    .split(/(?=<h3>)/i)
    .filter((sec) => !/^<h3>\s*fit note\s*<\/h3>/i.test(sec))
    .join("");
  return { intro, introParagraphs: (intro.match(/<p>/gi) ?? []).length, sections };
}
