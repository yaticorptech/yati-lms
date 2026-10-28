/**
 * The platform in Hindi or Kannada, from our own hand-written translations
 * (public/i18n/<lang>.json: English text → its exact translation). No
 * machine translation.
 *
 * Every piece of text on the page is looked up as it appears and replaced in
 * place: text nodes, and the placeholder / title / aria-label / alt of
 * elements. A MutationObserver does it for whatever React renders next —
 * its callbacks run before the browser paints, so the English never shows.
 * When React changes a text again, it is looked up again. Text with no
 * translation stays in English. Anything inside `translate="no"` (joining
 * codes, the Language Ability lessons themselves) is left alone.
 *
 * Changing only a text node's value (never the nodes themselves) keeps
 * React's own bookkeeping intact.
 */
/** Raised whenever the translation files change, so browsers fetch them again. */
const DICT_VERSION = 16;

/** The API (as utils/api.js uses it), for reporting text with no translation yet. */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

let dict = null;
// Entries with a slot — "by {x}", "{n} players" — as patterns: [regex, slots, translation].
let patterns = [];
let observer = null;
// What we wrote into each node, so our own writes are not looked up again,
// and the English each node held before (for sentences made of several nodes).
const written = new WeakMap();
const original = new WeakMap();
/** A text node's English: what React last put there. */
const englishOf = (node) => (written.get(node) === node.nodeValue ? original.get(node) ?? node.nodeValue : node.nodeValue);

const norm = (s) => s.replace(/\s+/g, ' ').trim();

const skipped = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        if (SKIP.has(n.tagName) || n.getAttribute('translate') === 'no' || n.classList?.contains('notranslate') || n.isContentEditable) return true;
    }
    return false;
};

/**
 * The translation of one piece of text (already trimmed), or null.
 * Exact first; then the same words with a trailing mark ("Save:"); then text
 * the app builds from parts — "Chess · by YATICORP", "25 Questions",
 * "Starts 24 Oct", "Status: Open" — each part looked up on its own, numbers,
 * dates and names kept as they are.
 */
const translateKey = (key, depth = 0) => {
    if (!key) return null;
    const hit = dict[key];
    if (hit != null) return hit;
    if (depth > 2) return null;
    const m = key.match(/^(.*?)([:.…!?]+)$/);
    if (m && dict[m[1]]) return dict[m[1]] + m[2];
    // A sentence with a slot: the words around it in the right order.
    for (const [re, slots, out] of patterns) {
        const pm = key.match(re);
        if (!pm) continue;
        let res = out;
        slots.forEach((slot, i) => {
            const v = pm[i + 1];
            res = res.replace(`{${slot}}`, slot.startsWith('x') ? (translateKey(v, depth + 1) ?? translateDate(v) ?? v) : v);
        });
        return res;
    }
    // A date: its month and weekday names.
    const d = translateDate(key);
    if (d) return d;
    // Parts joined by a separator.
    for (const sep of [' · ', ' — ', ' – ', ' | ', ' • ']) {
        if (!key.includes(sep)) continue;
        const parts = key.split(sep);
        const out = parts.map((p) => translateKey(p.trim(), depth + 1));
        if (out.some((x) => x != null)) return parts.map((p, i) => out[i] ?? p).join(sep);
    }
    // "Label: value".
    const lv = key.match(/^([^:]{2,40}):\s+(.+)$/);
    if (lv) {
        const head = translateKey(lv[1], depth + 1);
        if (head != null) return `${head}: ${translateKey(lv[2], depth + 1) ?? lv[2]}`;
    }
    // A number (or amount, time, date) in front or behind.
    const lead = key.match(/^([₹#+-]?[\d][\d.,:%/]*\s*)(.+)$/);
    if (lead) { const t = translateKey(lead[2], depth + 1); if (t != null) return lead[1] + t; }
    const tail = key.match(/^(.+?)(\s*[₹#]?[\d][\d.,:%/]*(\s*(am|pm|AM|PM))?)$/);
    if (tail) { const t = translateKey(tail[1], depth + 1); if (t != null) return t + tail[2]; }
    return null;
};

/** "24 Oct 2026, 4:45 pm": the month (and day) names in the language, numbers kept; null if it is not a date. */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATE = new RegExp(`^(?:\\d|${MONTHS.join('|')})[\\w ,:.]*$`);
function translateDate(key) {
    if (!/\d/.test(key) || !DATE.test(key)) return null;
    let changed = false;
    const out = key.replace(/[A-Za-z]+/g, (w) => {
        const t = dict[w] ?? dict[w.toLowerCase()];
        if (t != null) { changed = true; return t; }
        return w;
    });
    return changed ? out : null;
}

/** The translation of a piece of text, keeping its surrounding spaces; null when there is none. */
const lookup = (text) => {
    const hit = translateKey(norm(text));
    if (hit == null) return null;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return lead + hit + trail;
};

/*
 * Text with no translation yet: noted, and sent to the server every few
 * seconds (logs/i18n-missing.json there), so it can be translated next.
 */
let lang = null;
const missing = new Set();
const sent = new Set();
const note = (text) => {
    const t = norm(text);
    if (t.length < 2 || t.length > 300 || !/[A-Za-z]{2}/.test(t) || /[\u0900-\u0DFF]/.test(t) || sent.has(t)) return;
    missing.add(t);
};
setInterval(() => {
    if (!missing.size || !lang) return;
    const texts = [...missing].slice(0, 200);
    texts.forEach((t) => { missing.delete(t); sent.add(t); });
    fetch(`${API}/i18n/missing`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lang, texts }), keepalive: true }).catch(() => {});
}, 8000);

const doText = (node) => {
    const v = node.nodeValue;
    if (!v || written.get(node) === v || !/[A-Za-z]/.test(v)) return;
    if (skipped(node.parentElement)) return;
    // Part of a sentence React built from several pieces: the whole sentence.
    if (doSentence(node.parentElement)) return;
    const t = lookup(v);
    if (t != null && t !== v) { original.set(node, v); written.set(node, t); node.nodeValue = t; }
    else if (t == null) note(v);
};

/**
 * An element whose content is only text, in several pieces ("1", " of ",
 * "5", " stages complete"): translated as one sentence — the first piece
 * gets the sentence, the others are emptied. True when it was.
 */
function doSentence(el) {
    if (!el || el.childNodes.length < 2) return false;
    const nodes = [...el.childNodes];
    if (!nodes.every((n) => n.nodeType === 3)) return false;
    const english = nodes.map(englishOf);
    const full = english.join('');
    if (!/[A-Za-z]/.test(full)) return false;
    const t = lookup(full);
    if (t == null) return false;
    nodes.forEach((n, i) => {
        const value = i === 0 ? t : '';
        original.set(n, english[i]);
        written.set(n, value);
        if (n.nodeValue !== value) n.nodeValue = value;
    });
    return true;
}

const doAttrs = (el) => {
    if (skipped(el)) return;
    for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v || !/[A-Za-z]/.test(v)) continue;
        const t = lookup(v);
        if (t != null && t !== v) el.setAttribute(a, t);
        else if (t == null) note(v);
    }
};

const walk = (root) => {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.tagName)) return;
    doAttrs(root);
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.nodeType === 3) doText(n);
        else doAttrs(n);
    }
};

/** The slotted entries ("by {x}", "{n} players") as patterns: [regex, slots, translation]. */
const buildPatterns = (d) => {
    const escape = (t) => t.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    // Slots are named {x}, {x2}… (a name or words) and {n}, {n2}… (a number), so a
    // translation can put them in its own order.
    return Object.entries(d).filter(([k]) => /\{[xn]\d?\}/.test(k)).map(([k, v]) => {
        const slots = [...k.matchAll(/\{([xn]\d?)\}/g)].map((m) => m[1]);
        const re = new RegExp(`^${escape(k).replace(/\{x\d?\}/g, '(.+?)').replace(/\{n\d?\}/g, '([\\d.,]+)')}$`);
        return [re, slots, v];
    });
};

/** Load a language's translations (cached by the browser). */
export const loadDictionary = (lang) => fetch(`${import.meta.env.BASE_URL || '/'}i18n/${lang}.json?v=${DICT_VERSION}`, { cache: 'no-cache' }).then((r) => {
    // Not the file (an older page, or the app's own page sent back instead): no translations.
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return {};
    return r.json().catch(() => ({}));
}).catch(() => ({}));

/** Show the whole page in `lang` from now on. */
export const startTranslating = async (to) => {
    lang = to;
    dict = await loadDictionary(lang);
    patterns = buildPatterns(dict);
    document.documentElement.lang = lang;
    walk(document.body);
    observer?.disconnect();
    observer = new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === 'characterData') doText(r.target);
            else if (r.type === 'attributes') doAttrs(r.target);
            else for (const n of r.addedNodes) walk(n);
        }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
};

/** The chosen language as a locale for dates ("kn-IN"), or undefined for English. */
export const uiLocale = () => {
    let l = 'en';
    try { l = localStorage.getItem('yati-language') || 'en'; } catch { /* private mode */ }
    return l === 'hi' ? 'hi-IN' : l === 'kn' ? 'kn-IN' : undefined;
};

export const stopTranslating = () => { observer?.disconnect(); observer = null; dict = null; };
