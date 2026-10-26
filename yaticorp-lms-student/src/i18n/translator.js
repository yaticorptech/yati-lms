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
 * codes) is left alone.
 *
 * Changing only a text node's value (never the nodes themselves) keeps
 * React's own bookkeeping intact.
 */
/** Raised whenever the translation files change, so browsers fetch them again. */
const DICT_VERSION = 6;

const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE']);

let dict = null;
let observer = null;
// What we wrote into each node, so our own writes are not looked up again.
const written = new WeakMap();

const norm = (s) => s.replace(/\s+/g, ' ').trim();

const skipped = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        if (SKIP.has(n.tagName) || n.getAttribute('translate') === 'no' || n.classList?.contains('notranslate') || n.isContentEditable) return true;
    }
    return false;
};

/** The translation of a piece of text, keeping its surrounding spaces; null when there is none. */
const lookup = (text) => {
    const key = norm(text);
    if (!key) return null;
    let hit = dict[key];
    // "Save:" / "Back…" — the same words with a trailing mark.
    if (hit == null) {
        const m = key.match(/^(.*?)([:.…!?]+)$/);
        if (m && dict[m[1]]) hit = dict[m[1]] + m[2];
    }
    if (hit == null) return null;
    const lead = text.match(/^\s*/)[0];
    const trail = text.match(/\s*$/)[0];
    return lead + hit + trail;
};

const doText = (node) => {
    const v = node.nodeValue;
    if (!v || written.get(node) === v || !/[A-Za-z]/.test(v)) return;
    if (skipped(node.parentElement)) return;
    const t = lookup(v);
    if (t != null && t !== v) { written.set(node, t); node.nodeValue = t; }
};

const doAttrs = (el) => {
    if (skipped(el)) return;
    for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (!v || !/[A-Za-z]/.test(v)) continue;
        const t = lookup(v);
        if (t != null && t !== v) el.setAttribute(a, t);
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

/** Load a language's translations (cached by the browser). */
export const loadDictionary = (lang) => fetch(`${import.meta.env.BASE_URL || '/'}i18n/${lang}.json?v=${DICT_VERSION}`, { cache: 'no-cache' }).then((r) => {
    // Not the file (an older page, or the app's own page sent back instead): no translations.
    if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return {};
    return r.json().catch(() => ({}));
}).catch(() => ({}));

/** Show the whole page in `lang` from now on. */
export const startTranslating = async (lang) => {
    dict = await loadDictionary(lang);
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

export const stopTranslating = () => { observer?.disconnect(); observer = null; dict = null; };
