/*
 * Product description HTML, reduced to structure only.
 *
 * Shopify stores descriptions as HTML. The product page used to render the
 * plain-text `description` field, which flattens paragraphs, headings and
 * bullet lists into one run of text ("held.This is…", "Fit noteAlpha-sized").
 *
 * Rendering the raw HTML is not safe either: older supplier descriptions carry
 * <img> tags pointing at the supplier's CDN, inline styles and other markup
 * that would expose the supplier and break the layout.
 *
 * So this keeps a short whitelist of structural tags, strips every attribute
 * from them, removes everything else (keeping its text), and drops the
 * contents of script/style/iframe entirely. It is a pure string function, so
 * the server and the browser produce identical output and hydration matches.
 */

const ALLOWED = new Set(["p", "h3", "h4", "ul", "ol", "li", "strong", "b", "em", "i", "br"]);

export function safeDescriptionHtml(html: string | null | undefined): string {
  if (!html) return "";
  let s = html;
  // Drop dangerous or presentational blocks with their contents.
  s = s.replace(/<(script|style|iframe|noscript|svg|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  // Rewrite every remaining tag: keep whitelisted ones bare, remove the rest.
  s = s.replace(/<\s*(\/?)\s*([a-zA-Z0-9]+)\b[^>]*>/g, (_m, close: string, name: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED.has(tag)) return tag === "div" && !close ? " " : "";
    if (tag === "h4") return close ? "</h3>" : "<h3>";
    if (tag === "b") return close ? "</strong>" : "<strong>";
    if (tag === "i") return close ? "</em>" : "<em>";
    if (tag === "br") return close ? "" : "<br>";
    return `<${close}${tag}>`;
  });
  // Tidy: empty paragraphs and runs of whitespace.
  s = s.replace(/<p>\s*<\/p>/g, "").replace(/[ \t]{2,}/g, " ").trim();
  return s;
}

/** True when the HTML has any block structure worth rendering as HTML. */
export function hasStructure(html: string): boolean {
  return /<(p|h3|ul|ol|li)>/.test(html);
}
