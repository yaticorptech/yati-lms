/**
 * Job descriptions as plain words.
 *
 * Boards send HTML, and some (Greenhouse) send it entity-escaped:
 * "&lt;h1&gt;&lt;strong&gt;…". Entities are decoded first (twice, for
 * "&amp;lt;"), then tags removed — the other way round leaves the tag names
 * behind as words ("h1 strong Product Intern /strong").
 *
 * repairText() cleans text that was already saved that way.
 */
const ENTITIES = { lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·" };

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, name) => (name.toLowerCase() === "amp" ? "&" : ENTITIES[name.toLowerCase()] ?? m));

function plainText(html) {
  let s = String(html ?? "");
  for (let i = 0; i < 3 && /&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(s); i++) s = decode(s);
  return s.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
}

// Tag names and attributes left behind by the old importer.
// Two kinds (2026-11-16: removing every tag-shaped word also took real words — "strong", "span", "table",
// "section", "header" — out of good descriptions):
//   NEVER_WORDS  never an English word on its own ("h3", "li", "div", "p"): removed wherever they stand;
//   PAIRED       also real words ("strong", "table", "a"): removed only when their closer ("/strong") is in the text.
const NEVER_WORDS = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "ul", "ol", "li", "br", "div", "tbody", "thead", "tr", "td", "th", "hr", "sup", "img", "blockquote", "nbsp"];
const PAIRED = ["strong", "span", "table", "section", "article", "header", "footer", "font", "center", "figure", "small", "code"];
// Short ones ("a", "i") are common words even in a garbled text: only "a … /a" as a pair goes.
const PAIRED_SHORT = ["a", "i", "b", "u", "em", "sub"];
const ATTRS = /(^|\s)(?:class|style|href|id|target|rel|title|dir|lang|align|role|aria-[\w-]+|data-[\w-]+)=\s*(?:"[^"]*"|'[^']*'|\S*)/gi;
// Lower-case only: the importer left tags as written ("p", "strong"); a capital "P" is a word or a code.
const token = (names) => new RegExp(`(^|\\s)\\/?(?:${names.join("|")})(?=\\s|$)`, "g");
const NEVER_RE = token(NEVER_WORDS);

function repairText(text) {
  let s = plainText(text)
    .replace(/(^|\s)(amp|nbsp|quot|apos|lt|gt|rsquo|lsquo|rdquo|ldquo|ndash|mdash);/gi, (m, sp, name) => sp + ({ amp: "&", nbsp: " ", quot: '"', apos: "'", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "–", mdash: "—" }[name.toLowerCase()] ?? " "))
    .replace(/(\w)\s?amp;/g, "$1 &");
  // The paired tags this text really has: those whose closer ("/strong") stands in it as a word.
  for (const t of PAIRED_SHORT) s = s.replace(new RegExp(`(^|\\s)${t}\\s+([^/]{1,80}?)\\s+\\/${t}(?=\\s|$)`, "gi"), "$1$2");
  const closed = PAIRED.filter((t) => new RegExp(`(^|\\s)\\/${t}(?=\\s|$)`, "i").test(s));
  const pairedRe = closed.length ? token(closed) : null;
  for (let i = 0; i < 3; i++) {
    s = s.replace(ATTRS, "$1").replace(NEVER_RE, "$1");
    if (pairedRe) s = s.replace(pairedRe, "$1");
  }
  return s.replace(/\s+/g, " ").trim();
}

// Garbled by the old importer: a tag that is never a word, a paired tag's closer, or a left-over entity or attribute.
const looksBroken = (text) => {
  const s = String(text || "");
  return /(^|\s)\/?(?:h[1-6]|li|ul|ol|div|tbody|tr|td)(\s|$)|(^|\s)p\s/.test(s) || /amp;|nbsp;|class=/i.test(s)
    || new RegExp(`(^|\\s)\\/(?:${[...PAIRED, ...PAIRED_SHORT].join("|")})(\\s|$)`, "i").test(s);
};

module.exports = { plainText, repairText, looksBroken };
