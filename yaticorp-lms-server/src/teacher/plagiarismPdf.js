/**
 * A plagiarism check's report as a PDF (asked 2026-10-27): the score and
 * what it is made of, where the matches were found, and the checked text
 * with every match marked, to keep with a draft or show a supervisor.
 *
 * It says plainly what it is: a check against writing on YATICORP and the
 * papers the teacher uploaded, not the internet or the journals, so not a
 * university's certificate. Marks are told apart by style as well as colour
 * (bold, italic, underline), so a black-and-white print still shows them.
 */
const PDFDocument = require('pdfkit');
const { fontRuns, fontName, registerFonts, write, INK, MUTED } = require('./thesisPdf');

const LEFT = 60;
const TONE = (score) => (score >= 25 ? { color: '#e11d48', soft: '#fff1f2', label: 'High similarity' }
    : score >= 10 ? { color: '#d97706', soft: '#fffbeb', label: 'Some similarity' }
        : { color: '#059669', soft: '#ecfdf5', label: 'Low similarity' });
const MARK = {
    other: { weight: 'bold', color: '#be123c' },
    own: { weight: 'italic', color: '#b45309' },
    flag: { weight: 'regular', color: INK, underline: true },
    plain: { weight: 'regular', color: INK }
};

/** The text cut into plain and marked pieces; where marks overlap, the first wins (as on screen). */
const segmentsOf = (text, matches = [], flags = []) => {
    const marks = [
        ...matches.map((m) => ({ start: m.start, end: m.end, kind: m.own ? 'own' : 'other' })),
        ...flags.map((f) => ({ start: f.start, end: f.end, kind: 'flag' }))
    ].sort((a, b) => a.start - b.start);
    const out = [];
    let at = 0;
    for (const m of marks) {
        if (m.start < at || m.end <= m.start) continue;
        if (m.start > at) out.push({ text: text.slice(at, m.start), kind: 'plain' });
        out.push({ text: text.slice(m.start, m.end), kind: m.kind });
        at = m.end;
    }
    if (at < text.length) out.push({ text: text.slice(at), kind: 'plain' });
    return out.filter((s) => s.text);
};

/** Pieces of text in their own styles, flowing as one paragraph. */
const styled = (doc, pieces, options = {}) => {
    const runs = pieces.flatMap((p) => fontRuns(p.text).map((r) => ({ ...r, kind: p.kind })));
    runs.forEach((r, i) => {
        const s = MARK[r.kind] || MARK.plain;
        doc.font(fontName(r.script, s.weight)).fillColor(s.color)
            .text(r.text, { ...options, underline: Boolean(s.underline), continued: i < runs.length - 1 });
    });
};

/**
 * The pieces split into lines at each line break: pdfkit sets a line break
 * inside a run of joined-up text off to the right, so each line is its own
 * flow. An empty line is a gap between paragraphs.
 */
const linesOf = (pieces) => {
    const lines = [[]];
    for (const p of pieces) {
        p.text.split('\n').forEach((part, i) => {
            if (i > 0) lines.push([]);
            if (part) lines.at(-1).push({ ...p, text: part });
        });
    }
    return lines;
};

const heading = (doc, text) => {
    doc.moveDown(1.1);
    doc.x = LEFT;
    write(doc, text, { weight: 'bold', size: 13 });
    doc.moveDown(0.4);
};

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const num = (n) => Number(n || 0).toLocaleString('en-IN');

const renderPlagiarismPdf = (report, teacherName, out) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 60, bottom: 66, left: LEFT, right: LEFT }, bufferPages: true, info: { Title: `Similarity report: ${report.title}`, Author: teacherName || '' } });
    registerFonts(doc);
    doc.pipe(out);
    const width = doc.page.width - LEFT * 2;
    const tone = TONE(report.score || 0);
    const others = Math.round(((report.score || 0) - (report.ownScore || 0)) * 10) / 10;

    write(doc, 'Similarity report', { weight: 'bold', size: 22 });
    write(doc, 'YATICORP Plagiarism Check', { size: 10, color: MUTED });
    doc.moveDown(1);

    // What was checked, by whom and when.
    const details = [
        ['Document', report.title || 'Pasted text'],
        ['Checked by', teacherName || ''],
        ['Date of check', when(report.createdAt)],
        ['Words checked', num(report.words)],
        ['Documents compared', num(report.documentsCompared)],
        ['Report ID', String(report._id)]
    ].filter(([, v]) => v);
    for (const [label, value] of details) {
        const y = doc.y;
        doc.font('latin-bold').fontSize(10).fillColor(MUTED).text(label, LEFT, y, { width: 130 });
        doc.x = LEFT + 140; doc.y = y;
        write(doc, value, { size: 10.5, width: width - 140 });
        doc.x = LEFT;
        doc.moveDown(0.35);
    }

    // The score, in a box of its colour.
    doc.moveDown(0.6);
    const top = doc.y;
    doc.roundedRect(LEFT, top, width, 84, 10).lineWidth(1).fillAndStroke(tone.soft, tone.color);
    doc.font('latin-bold').fontSize(34).fillColor(tone.color).text(`${report.score ?? 0}%`, LEFT + 20, top + 16, { width: 130 });
    doc.font('latin-regular').fontSize(9).fillColor(MUTED).text('similar', LEFT + 22, top + 60, { width: 130 });
    doc.font('latin-bold').fontSize(14).fillColor(tone.color).text(tone.label, LEFT + 160, top + 16, { width: width - 180 });
    doc.font('latin-regular').fontSize(10).fillColor(INK)
        .text(`In others' work (YATICORP, uploaded papers): ${others}%`, LEFT + 160, top + 40, { width: width - 180 })
        .text(`In the author's own documents: ${report.ownScore ?? 0}%`, { width: width - 180 });
    doc.x = LEFT; doc.y = top + 98;
    write(doc, `Citations found: ${num(report.citations?.found)}     Quotations without a citation: ${num(report.flags?.length)}`, { size: 10.5 });

    // Where the matches were found.
    if (report.sources?.length) {
        heading(doc, 'Where the matches are');
        for (const s of report.sources) {
            const y = doc.y;
            doc.x = LEFT;
            write(doc, `${s.own ? 'Own work: ' : ''}${s.label}`, { size: 10.5, width: width - 100, color: s.own ? MARK.own.color : MARK.other.color });
            const after = doc.y;
            doc.font('latin-regular').fontSize(10).fillColor(MUTED).text(`${num(s.words)} words`, LEFT + width - 90, y, { width: 90, align: 'right' });
            doc.x = LEFT; doc.y = Math.max(after, doc.y);
            doc.moveDown(0.25);
        }
    }

    // The text, marked.
    if (report.text) {
        heading(doc, 'The checked text');
        doc.fontSize(9.5);
        styled(doc, [{ text: 'Bold red', kind: 'other' }, { text: ': found in others\' work.   ', kind: 'plain' }, { text: 'Italic brown', kind: 'own' }, { text: ': found in your own documents.   ', kind: 'plain' }, { text: 'Underlined', kind: 'flag' }, { text: ': a quotation with no citation in its sentence.', kind: 'plain' }], { width });
        doc.moveDown(0.8);
        doc.x = LEFT;
        doc.fontSize(10.5);
        for (const line of linesOf(segmentsOf(report.text, report.matches, report.flags))) {
            doc.x = LEFT;
            if (!line.some((p) => p.text.trim())) { doc.moveDown(0.5); continue; }
            styled(doc, line, { width, lineGap: 3, align: 'left' });
        }
    }

    // What this report is, and is not.
    doc.moveDown(1.4);
    doc.x = LEFT;
    write(doc, 'About this report', { weight: 'bold', size: 10.5 });
    write(doc, 'This check compares the text with writing on YATICORP (other teachers\' theses and writing, and the author\'s own) and with the papers the author uploaded. It does not search the internet or published journals, so it is not a university\'s plagiarism certificate. Use your university\'s checker (such as Turnitin, Urkund or DrillBit) before you submit.', { size: 9.5, color: MUTED, width, lineGap: 2 });

    // Page numbers on every page.
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
        doc.switchToPage(range.start + i);
        const bottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        doc.font('latin-regular').fontSize(8.5).fillColor(MUTED)
            .text(`YATICORP similarity report · page ${i + 1} of ${range.count}`, LEFT, doc.page.height - 44, { width, align: 'center', lineBreak: false });
        doc.page.margins.bottom = bottom;
    }
    doc.end();
};

module.exports = { renderPlagiarismPdf, segmentsOf };
