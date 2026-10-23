/**
 * Linguistic Ability — the level certificate, drawn as a PDF with pdfkit (as
 * the course and competition certificates are). Issued only when a level is
 * complete under the configured criteria (service.checkLevel); this only
 * draws one that has been issued.
 */
const PDFDocument = require('pdfkit');

const LEVEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const INDIGO = '#3730a3', VIOLET = '#6d28d9', INK = '#1e293b', MUTED = '#64748b', GOLD = '#b45309';

/** Fit text to a width by shrinking it, down to `min` points. */
const fit = (doc, text, font, size, width, min = 14) => {
    let s = size;
    doc.font(font);
    while (s > min && doc.fontSize(s).widthOfString(text) > width) s -= 1;
    return s;
};

const draw = (res, { name, level, number, issuedAt, average, courseName = 'English' }) => {
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    const safe = String(name || 'Student').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Student';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${courseName}_${LEVEL[level] || level}_Certificate_${safe}.pdf"`);
    doc.pipe(res);
    const W = doc.page.width, H = doc.page.height;

    // Frame
    doc.rect(0, 0, W, H).fill('#f8fafc');
    doc.lineWidth(10).strokeColor(INDIGO).rect(24, 24, W - 48, H - 48).stroke();
    doc.lineWidth(1.5).strokeColor(VIOLET).rect(40, 40, W - 80, H - 80).stroke();

    const center = (text, y, font, size, color, opts = {}) => doc.font(font).fontSize(size).fillColor(color).text(text, 60, y, { width: W - 120, align: 'center', ...opts });
    center('YATICORP LMS', 78, 'Helvetica-Bold', 14, MUTED, { characterSpacing: 4 });
    center('Certificate of Achievement', 108, 'Helvetica-Bold', 38, INDIGO);
    center(`Linguistic Ability · ${courseName}`, 160, 'Helvetica', 16, VIOLET, { characterSpacing: 1 });
    center('This is to certify that', 214, 'Times-Italic', 18, INK);
    const nameSize = fit(doc, String(name || 'Student'), 'Helvetica-Bold', 34, W - 200, 18);
    center(String(name || 'Student'), 246, 'Helvetica-Bold', nameSize, INK);
    doc.moveTo(W / 2 - 180, 296).lineTo(W / 2 + 180, 296).lineWidth(1).strokeColor('#cbd5e1').stroke();
    center(`has completed every lesson of the ${LEVEL[level] || level} level`, 316, 'Helvetica', 17, INK);
    center(`in Vocabulary, Grammar, Reading and Writing, Speaking and Listening, and Translation${average !== undefined && average !== null ? `, with an average quiz score of ${average}%` : ''}.`, 342, 'Helvetica', 13, MUTED);

    // Level seal
    doc.circle(W / 2, 430, 40).lineWidth(3).strokeColor(GOLD).stroke();
    center(LEVEL[level] || level, 422, 'Helvetica-Bold', 13, GOLD);

    const date = new Date(issuedAt || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(`Issued on ${date}`, 90, H - 110, { width: 300, align: 'left' });
    doc.font('Helvetica').fontSize(11).fillColor(MUTED).text(`Certificate No. ${number}`, W - 390, H - 110, { width: 300, align: 'right' });
    doc.end();
};

module.exports = { draw };
