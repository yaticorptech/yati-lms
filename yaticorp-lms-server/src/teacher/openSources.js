/**
 * Free outside sources for the plagiarism check (2026-11-04): open research
 * (OpenAlex, 250M+ papers: abstracts, and the whole paper when it has a free
 * open-access PDF) and Wikipedia. All free, no key. Distinctive sentences from the text are searched; what comes back
 * is compared by the same shingle match as YATICORP's own documents
 * (./similarity.js), so a match is real overlap, not a search hit.
 *
 * Fails soft: a slow or unreachable service only means fewer sources, never a
 * failed check. Each request has its own timeout and the whole step a budget.
 */
const { tokenize } = require('./similarity');

const UA = `YATICORP-LMS plagiarism check (${process.env.ADMIN_EMAIL || 'support@yaticorp.com'})`;
const MAX_QUERIES = 6;          // sentences searched
const PER_QUERY = 3;            // results kept per search
const TIMEOUT = 6000;           // one request
const BUDGET = 20000;           // the whole step
const MAX_PDFS = 4;             // open-access papers read in full, per check
const PDF_MAX_BYTES = 8 * 1024 * 1024;
const PDF_TIMEOUT = 10000;

const getJson = async (url) => {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
};

/** The sentences most likely to be copied: long, wordy, spread through the text. */
const queriesFrom = (text) => {
    const sentences = String(text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
    const scored = sentences
        .map((s, i) => ({ s, i, n: tokenize(s).length }))
        .filter((x) => x.n >= 10 && !/^[“"]/.test(x.s));   // quoted text is cited text
    if (!scored.length) return [];
    // Spread: the longest sentence from each part of the text.
    const parts = Math.min(MAX_QUERIES, scored.length);
    const size = Math.ceil(scored.length / parts);
    const picks = [];
    for (let p = 0; p < parts; p += 1) {
        const chunk = scored.slice(p * size, (p + 1) * size);
        if (chunk.length) picks.push(chunk.reduce((a, b) => (b.n > a.n ? b : a)));
    }
    // A search wants a phrase, not a paragraph: the first dozen or so words.
    return picks.map((x) => tokenize(x.s).slice(0, 14).map((t) => t.w).join(' '));
};

/**
 * The whole text of an open-access paper, from its free PDF (OpenAlex says
 * where it is: arXiv, PubMed Central, a university repository). '' when it
 * cannot be had: too big, too slow, not a PDF, or a scan with no text.
 */
const pdfText = async (url) => {
    try {
        const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/pdf' }, redirect: 'follow', signal: AbortSignal.timeout(PDF_TIMEOUT) });
        if (!r.ok) return '';
        if (Number(r.headers.get('content-length') || 0) > PDF_MAX_BYTES) return '';
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > PDF_MAX_BYTES || buf.subarray(0, 5).toString() !== '%PDF-') return '';
        const { extractText, getDocumentProxy } = await import('unpdf');
        const pdf = await getDocumentProxy(new Uint8Array(buf));
        const { text } = await extractText(pdf, { mergePages: true });
        return String(text || '').replace(/-\n(?=\p{Ll})/gu, '').replace(/\s+/g, ' ').slice(0, 400000);
    } catch { return ''; }
};

/** An OpenAlex abstract, from its inverted index ({ word: [positions] }). */
const abstractOf = (inv) => {
    if (!inv) return '';
    const at = [];
    for (const [w, ps] of Object.entries(inv)) for (const p of ps) at[p] = w;
    return at.filter(Boolean).join(' ');
};

const openAlex = async (q) => {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${PER_QUERY}&select=id,doi,title,publication_year,abstract_inverted_index,best_oa_location,open_access`
        + (process.env.ADMIN_EMAIL ? `&mailto=${encodeURIComponent(process.env.ADMIN_EMAIL)}` : '');
    const data = await getJson(url);
    return (data.results || []).map((w) => ({
        key: `oa:${w.id}`,
        label: `Research paper: “${String(w.title || 'Untitled').slice(0, 160)}”${w.publication_year ? ` (${w.publication_year})` : ''}`,
        url: w.doi || w.id || '',
        // A free PDF of the whole paper, when it is open access: read in full later (up to MAX_PDFS).
        pdf: w.best_oa_location?.pdf_url || (w.open_access?.oa_url && /\.pdf($|\?)/i.test(w.open_access.oa_url) ? w.open_access.oa_url : ''),
        text: `${w.title || ''}. ${abstractOf(w.abstract_inverted_index)}`
    })).filter((s) => s.pdf || tokenize(s.text).length >= 20);
};

const wikipedia = async (q) => {
    const found = await getJson(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=2&srsearch=${encodeURIComponent(q)}`);
    const titles = (found.query?.search || []).map((x) => x.title);
    // A whole article's text comes one title at a time.
    const pages = await Promise.all(titles.map((t) => getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&format=json&redirects=1&titles=${encodeURIComponent(t)}`)
        .then((d) => Object.values(d.query?.pages || {})[0]).catch(() => null)));
    return pages.filter((p) => p?.extract).map((p) => ({
        key: `wp:${p.pageid}`,
        label: `Wikipedia: “${p.title}”`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, '_'))}`,
        text: String(p.extract).slice(0, 200000)
    }));
};

/**
 * Outside documents for `text`: { sources: [{ label, url, text, own: false }], searched, services }.
 * `services` says which answered, so the report can say what was compared.
 */
const openSourcesFor = async (text) => {
    const queries = queriesFrom(text);
    const services = { openalex: false, wikipedia: false };
    if (!queries.length) return { sources: [], searched: 0, services };
    // Kept as each answer comes, so what arrived before the budget runs out still counts.
    const got = [];
    const jobs = queries.flatMap((q) => [
        openAlex(q).then((r) => { services.openalex = true; got.push(...r); }).catch(() => {}),
        wikipedia(q).then((r) => { services.wikipedia = true; got.push(...r); }).catch(() => {})
    ]);
    let timer;
    await Promise.race([Promise.all(jobs), new Promise((resolve) => { timer = setTimeout(resolve, BUDGET); })]);
    clearTimeout(timer);
    const seen = new Map();
    for (const s of got) if (!seen.has(s.key)) seen.set(s.key, s);
    // The open-access papers, read in full: the first few with a free PDF, side by side, in the time left.
    const withPdf = [...seen.values()].filter((s) => s.pdf).slice(0, MAX_PDFS);
    let fullText = 0;
    if (withPdf.length) {
        let t2;
        await Promise.race([
            Promise.all(withPdf.map((s) => pdfText(s.pdf).then((full) => { if (tokenize(full).length >= 50) { s.text = full; s.full = true; fullText += 1; } }))),
            new Promise((resolve) => { t2 = setTimeout(resolve, PDF_TIMEOUT + 2000); })
        ]);
        clearTimeout(t2);
    }
    const sources = [...seen.values()]
        .filter((s) => tokenize(s.text).length >= 20)
        .map((s) => ({ label: s.full ? `${s.label} · full text` : s.label, url: s.url, text: s.text, own: false, outside: true }));
    return { sources, searched: queries.length, services, fullText };
};

module.exports = { openSourcesFor, queriesFrom };
