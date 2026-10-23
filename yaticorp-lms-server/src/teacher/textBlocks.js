/**
 * A chapter's plain text, read as a document: headings, bullet points and
 * paragraphs — the shape "Add these headings" gives an empty chapter — and
 * each piece of text split by script, so Kannada and Hindi are set in fonts
 * that have their letters. Used by both downloads (thesisPdf.js, thesisDocx.js).
 */

const BULLET = /^\s*[-•*]\s+/;

/** A short line with no closing punctuation, standing on its own: a heading. */
const looksLikeHeading = (line) => {
    const t = line.trim();
    return t.length > 0 && t.length <= 90 && t.split(/\s+/).length <= 12 && !/[.?!:;,]$/.test(t) && !BULLET.test(t);
};

/**
 * [{ type: 'heading' | 'bullet' | 'para', text }]. Blocks are separated by a
 * blank line; inside one, "- " lines are bullets and other lines run together
 * as a paragraph. A block's first line is a heading when it is short and
 * unpunctuated and is alone or followed only by bullets.
 */
const blocksOf = (content) => {
    const out = [];
    const blocks = String(content || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/);
    for (const block of blocks) {
        const lines = block.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
        if (!lines.length) continue;
        let rest = lines;
        if (looksLikeHeading(lines[0]) && lines.slice(1).every((l) => BULLET.test(l))) {
            out.push({ type: 'heading', text: lines[0].trim() });
            rest = lines.slice(1);
        }
        let para = [];
        const flush = () => { if (para.length) out.push({ type: 'para', text: para.join(' ').replace(/\s+/g, ' ').trim() }); para = []; };
        for (const line of rest) {
            if (BULLET.test(line)) { flush(); out.push({ type: 'bullet', text: line.replace(BULLET, '').trim() }); } else para.push(line.trim());
        }
        flush();
    }
    return out;
};

const KANNADA = /[ಀ-೿]/;
const DEVANAGARI = /[ऀ-ॣ०-ॿ꣠-ꣿ᳐-᳿]/;
// Spaces, digits, punctuation, dandas and joiners belong to whatever run they sit in.
const NEUTRAL = /[\s\d.,;:!?'"“”‘’()[\]{}\-–—/\\%&*+=<>|_~`^@#।॥‌‍]/;

const scriptOf = (ch) => (KANNADA.test(ch) ? 'kannada' : DEVANAGARI.test(ch) ? 'devanagari' : NEUTRAL.test(ch) ? null : 'latin');

/** [{ script: 'latin' | 'kannada' | 'devanagari', text }] — runs of one script each. */
const scriptRuns = (text) => {
    const runs = [];
    let current = null;
    for (const ch of String(text || '')) {
        const s = scriptOf(ch) || current?.script || 'latin';
        if (current && current.script === s) current.text += ch;
        else { current = { script: s, text: ch }; runs.push(current); }
    }
    return runs;
};

module.exports = { blocksOf, scriptRuns, looksLikeHeading };
