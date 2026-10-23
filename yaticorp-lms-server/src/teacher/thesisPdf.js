/**
 * A thesis as a PDF: a title page, the contents, then each chapter on a new
 * page — the draft to print, share with a supervisor or keep as a backup.
 *
 * Set in Noto Serif, with Noto Serif Kannada and Noto Serif Devanagari for
 * Kannada and Hindi (and Marathi, Sanskrit…) and Noto Sans Math for symbols
 * such as ≤ ≥ ≠ √ — the standard PDF fonts have none of these, and printed
 * them as gibberish. The fonts ship in ./fonts (SIL Open Font License).
 */
const path = require('path');
const PDFDocument = require('pdfkit');
const { wordCount } = require('./similarity');
const { blocksOf, scriptRuns } = require('./textBlocks');

const FONT_DIR = path.join(__dirname, 'fonts');
const FONTS = {
    latin: { regular: 'NotoSerif-Regular.ttf', bold: 'NotoSerif-Bold.ttf', italic: 'NotoSerif-Italic.ttf' },
    kannada: { regular: 'NotoSerifKannada-Regular.ttf', bold: 'NotoSerifKannada-Bold.ttf' },
    devanagari: { regular: 'NotoSerifDevanagari-Regular.ttf', bold: 'NotoSerifDevanagari-Bold.ttf' },
    math: { regular: 'NotoSansMath-Regular.ttf' }
};
const INK = '#111827';
const MUTED = '#4b5563';

// Which letters the Latin font lacks, so they are set from the math font
// instead. fontkit comes with pdfkit; without it, symbols just stay as they are.
let coverage = null;
try {
    const fontkit = require('fontkit');
    const latin = fontkit.openSync(path.join(FONT_DIR, FONTS.latin.regular));
    const math = fontkit.openSync(path.join(FONT_DIR, FONTS.math.regular));
    coverage = { latin: (cp) => latin.hasGlyphForCodePoint(cp), math: (cp) => math.hasGlyphForCodePoint(cp) };
} catch { /* no fallback */ }

/** Runs of text with the font each should be set in. */
const fontRuns = (text) => {
    const out = [];
    for (const run of scriptRuns(text)) {
        if (run.script !== 'latin' || !coverage) { out.push(run); continue; }
        let current = null;
        for (const ch of run.text) {
            const cp = ch.codePointAt(0);
            const script = !coverage.latin(cp) && coverage.math(cp) ? 'math' : 'latin';
            if (current && current.script === script) current.text += ch;
            else { current = { script, text: ch }; out.push(current); }
        }
    }
    return out;
};

const fontName = (script, weight) => {
    const set = FONTS[script] || FONTS.latin;
    const style = set[weight] ? weight : 'regular';
    return `${script}-${style}`;
};

/** Text in mixed scripts, each run in its own font, as one flowing paragraph. */
const write = (doc, text, { weight = 'regular', size = 12, color = INK, ...options } = {}) => {
    const runs = fontRuns(text);
    if (!runs.length) return;
    doc.fontSize(size).fillColor(color);
    runs.forEach((run, i) => {
        doc.font(fontName(run.script, weight)).text(run.text, { ...options, continued: i < runs.length - 1 });
    });
};

const renderThesisPdf = (thesis, author, out) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 72, bottom: 72, left: 90, right: 72 }, bufferPages: true, info: { Title: thesis.title, Author: author || '' } });
    for (const [script, set] of Object.entries(FONTS)) {
        for (const [style, file] of Object.entries(set)) doc.registerFont(`${script}-${style}`, path.join(FONT_DIR, file));
    }
    doc.pipe(out);

    // Title page
    write(doc, thesis.title, { weight: 'bold', size: 24, align: 'center' });
    doc.moveDown(1.5);
    if (thesis.degree) write(doc, `A thesis submitted for the degree of ${thesis.degree}`, { weight: 'italic', size: 13, color: MUTED, align: 'center' });
    if (thesis.field) { doc.moveDown(0.3); write(doc, thesis.field, { color: MUTED, align: 'center' }); }
    doc.moveDown(3);
    if (author) write(doc, author, { weight: 'bold', size: 14, align: 'center' });
    if (thesis.supervisor) { doc.moveDown(0.6); write(doc, `Supervisor: ${thesis.supervisor}`, { color: MUTED, align: 'center' }); }
    if (thesis.university) { doc.moveDown(0.3); write(doc, thesis.university, { color: MUTED, align: 'center' }); }
    doc.moveDown(2);
    write(doc, `Draft of ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, { weight: 'italic', size: 10, color: MUTED, align: 'center' });

    // Contents
    doc.addPage();
    write(doc, 'Contents', { weight: 'bold', size: 18 });
    doc.moveDown(0.8);
    thesis.chapters.forEach((c, i) => {
        write(doc, `${i + 1}.  ${c.title}`, { size: 12, width: doc.page.width - 90 - 72 - 110 });
        const y = doc.y - doc.currentLineHeight(true);
        doc.font('latin-regular').fontSize(10).fillColor(MUTED)
            .text(`${wordCount(c.content).toLocaleString('en-IN')} words`, doc.page.width - 72 - 110, y, { width: 110, align: 'right' });
        doc.x = 90;
        doc.moveDown(0.3);
    });

    // Chapters
    thesis.chapters.forEach((c, i) => {
        doc.addPage();
        write(doc, `${i + 1}. ${c.title}`, { weight: 'bold', size: 18 });
        doc.moveDown(0.8);
        const blocks = blocksOf(c.content);
        if (!blocks.length) write(doc, '(Not written yet.)', { weight: 'italic', size: 11, color: MUTED });
        let previous = null;
        for (const b of blocks) {
            if (previous === 'bullet' && b.type !== 'bullet') doc.moveDown(0.4);
            previous = b.type;
            if (b.type === 'heading') {
                doc.moveDown(0.4);
                write(doc, b.text, { weight: 'bold', size: 13.5 });
                doc.moveDown(0.4);
            } else if (b.type === 'bullet') {
                const x = doc.x;
                write(doc, `•  ${b.text}`, { size: 12, lineGap: 3, indent: 0, align: 'left' });
                doc.x = x;
                doc.moveDown(0.25);
            } else {
                // Justified only in one script: pdfkit spaces each font's run
                // on its own, and mixed lines came out unevenly spaced.
                const mixed = new Set(scriptRuns(b.text).map((r) => r.script)).size > 1;
                write(doc, b.text, { size: 12, align: mixed ? 'left' : 'justify', lineGap: 4 });
                doc.moveDown(0.6);
            }
        }
    });

    // Page numbers, after the title page
    const range = doc.bufferedPageRange();
    for (let i = 1; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        // Written inside the bottom margin, which pdfkit would otherwise take
        // as running off the page and answer with a blank new one.
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('latin-regular').fontSize(9).fillColor(MUTED).text(String(i), 0, doc.page.height - 50, { align: 'center', width: doc.page.width });
        doc.page.margins.bottom = bottom;
    }
    doc.end();
};

module.exports = { renderThesisPdf, fontRuns };
