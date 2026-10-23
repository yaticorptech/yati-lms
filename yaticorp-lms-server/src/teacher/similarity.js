/**
 * The plagiarism check's engine: overlapping word sequences, and citations.
 *
 * Text is cut into "shingles" — every run of seven consecutive words, case
 * and punctuation ignored. A shingle found in another document is copied
 * text, not coincidence: seven words in the same order are very rarely
 * written twice by chance. Every word covered by a shared shingle counts as
 * matched; the score is the share of the text's words that are.
 *
 * Its reach is honest: it compares against the documents on this platform
 * (theses and writing on YATICORP), not the whole internet — the page says so.
 */

const SHINGLE = 7;
// Letters with their marks: Kannada and Hindi vowel signs and the virama are
// marks (\p{M}), and without them "ಕನ್ನಡ" counted as two words.
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;

/** Words with where each sits in the original text. */
const tokenize = (text) => {
    const tokens = [];
    for (const m of String(text || '').matchAll(WORD)) {
        tokens.push({ w: m[0].toLowerCase().replace(/['’]/g, ''), start: m.index, end: m.index + m[0].length });
    }
    return tokens;
};

const wordCount = (text) => {
    let n = 0;
    for (const _ of String(text || '').matchAll(WORD)) n += 1;
    return n;
};

/**
 * Compare `text` with `sources` ([{ label, own, text }]).
 * Another person's document wins a word over the teacher's own: copying from
 * someone else is the finding that matters; reusing one's own words is noted.
 */
const compare = (text, sources, { k = SHINGLE } = {}) => {
    const tokens = tokenize(text);
    const words = tokens.map((t) => t.w);
    const empty = { words: words.length, score: 0, ownScore: 0, matches: [], sources: [] };
    if (words.length < k || !sources.length) return empty;

    const index = new Map();
    for (let i = 0; i + k <= words.length; i += 1) {
        const key = words.slice(i, i + k).join(' ');
        const at = index.get(key);
        if (at) at.push(i); else index.set(key, [i]);
    }

    const ordered = [...sources].sort((a, b) => Number(a.own) - Number(b.own));
    const owner = new Array(words.length).fill(-1);
    ordered.forEach((src, si) => {
        const sw = tokenize(src.text).map((t) => t.w);
        for (let j = 0; j + k <= sw.length; j += 1) {
            const at = index.get(sw.slice(j, j + k).join(' '));
            if (!at) continue;
            for (const i of at) for (let x = i; x < i + k; x += 1) if (owner[x] === -1) owner[x] = si;
        }
    });

    const matches = [];
    const perSource = new Map();
    let matched = 0;
    let ownMatched = 0;
    for (let i = 0; i < owner.length;) {
        if (owner[i] === -1) { i += 1; continue; }
        const si = owner[i];
        let j = i;
        while (j + 1 < owner.length && owner[j + 1] === si) j += 1;
        const n = j - i + 1;
        const src = ordered[si];
        matches.push({ start: tokens[i].start, end: tokens[j].end, words: n, source: src.label, own: !!src.own });
        perSource.set(si, (perSource.get(si) || 0) + n);
        matched += n;
        if (src.own) ownMatched += n;
        i = j + 1;
    }
    const pct = (n) => Math.round((n / words.length) * 1000) / 10;
    return {
        words: words.length,
        score: pct(matched),
        ownScore: pct(ownMatched),
        matches,
        sources: [...perSource.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([si, n]) => ({ label: ordered[si].label, own: !!ordered[si].own, words: n }))
    };
};

/* ── Citations ─────────────────────────────────────────────────────────── */

// (Rao, 2021) (Rao & Iyer, 2019) (Rao et al., 2020, p. 4) · Rao (2021) · [12] [3, 7] [4–6]
const CITATION = /\((?:[A-Z][\p{L}'-]+(?:\s+(?:et\s+al\.?|and|&)\s*[\p{L}'.-]*)*,?\s*(?:\d{4}[a-z]?|n\.d\.)(?:[,;][^()]{0,40})?)\)|\b[A-Z][\p{L}'-]+(?:\s+et\s+al\.?)?\s+\(\d{4}[a-z]?\)|\[\d+(?:\s*[,–-]\s*\d+)*\]/gu;
const QUOTE = /[“"]([^”"]{20,}?)[”"]/g;

/** How many citations the text has, and quoted passages with none beside them. */
const citationCheck = (text) => {
    const t = String(text || '');
    const cites = [...t.matchAll(CITATION)].map((m) => ({ start: m.index, end: m.index + m[0].length }));
    const flags = [];
    for (const m of t.matchAll(QUOTE)) {
        if (wordCount(m[1]) < 8) continue;
        const start = m.index;
        const end = m.index + m[0].length;
        // Its citation belongs in the same sentence: after the quote and before
        // the sentence ends — "…words" (Rao, 2021). — or just before it opens.
        const after = /[.!?](?=\s|$)/.exec(t.slice(end));
        const sentenceEnd = after ? end + after.index + 1 : t.length;
        const sentenceStart = Math.max(t.lastIndexOf('. ', start), t.lastIndexOf('? ', start), t.lastIndexOf('! ', start), t.lastIndexOf('\n', start)) + 1;
        const near = cites.some((c) => (c.start >= end - 1 && c.start <= sentenceEnd) || (c.end <= start + 1 && c.start >= sentenceStart));
        if (!near) flags.push({ start, end, kind: 'quote-no-citation', message: 'A quotation with no citation beside it. Add the source, e.g. (Author, Year).' });
    }
    return { found: cites.length, flags };
};

module.exports = { compare, citationCheck, tokenize, wordCount, SHINGLE };
