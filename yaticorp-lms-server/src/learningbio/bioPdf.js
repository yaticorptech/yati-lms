/**
 * The Learning Bio as a one-page PDF: the photo when there is one, the
 * name, the headline and the bio's paragraphs, in the same lavender-and-
 * violet look as the popup. Built with the PDFKit the ATS resume uses.
 */
const PDFDocument = require('pdfkit');
const axios = require('axios');

const VIOLET = '#6d28d9';
const INK = '#1e1b4b';
const MUTED = '#475569';
const LAVENDER = '#ede9fe';

/** The profile picture as a buffer PDFKit can draw (JPEG or PNG), or null. */
const fetchPhoto = async (url) => {
    if (!/^https?:\/\//i.test(String(url || ''))) return null;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 6000, maxContentLength: 6 * 1024 * 1024 });
        const type = String(res.headers['content-type'] || '');
        if (!/image\/(jpeg|jpg|png)/i.test(type)) return null;
        return Buffer.from(res.data);
    } catch {
        return null;
    }
};

/** Streams the PDF to `res`. `full` is the object the API builds for the student. */
const renderBioPdf = async (full, res) => {
    const photo = await fetchPhoto(full.user.avatar);
    const doc = new PDFDocument({ size: 'A4', margins: { top: 0, bottom: 56, left: 56, right: 56 } });
    const safeName = String(full.user.name || 'student').replace(/[^A-Za-z0-9]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Learning_Bio_${safeName}.pdf"`);
    doc.pipe(res);

    const W = doc.page.width;
    // Header band
    doc.rect(0, 0, W, 96).fill(LAVENDER);
    doc.fillColor(VIOLET).font('Helvetica-Bold').fontSize(11).text('MY LEARNING BIO', 56, 40, { characterSpacing: 2 });

    // Portrait
    let y = 130;
    const left = 56;
    if (photo) {
        const size = 132;
        doc.save();
        doc.circle(left + size / 2, y + size / 2, size / 2).clip();
        try { doc.image(photo, left, y, { width: size, height: size, cover: [size, size], align: 'center', valign: 'center' }); } catch { /* unreadable image */ }
        doc.restore();
        doc.circle(left + size / 2, y + size / 2, size / 2).lineWidth(3).stroke('#c4b5fd');
    }

    // Name and headline, beside the photo when there is one
    const textX = photo ? left + 132 + 28 : left;
    const textW = W - textX - 56;
    doc.fillColor(MUTED).font('Helvetica').fontSize(16).text("Hi, I'm", textX, y + (photo ? 22 : 0));
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(30).text(`${full.user.name}.`, textX, doc.y - 2, { width: textW });
    if (full.bio.headline) doc.fillColor(VIOLET).font('Helvetica-Bold').fontSize(12).text(full.bio.headline, textX, doc.y + 4, { width: textW });
    doc.moveTo(textX, doc.y + 10).lineTo(textX + 56, doc.y + 10).lineWidth(3).stroke(VIOLET);

    // Bio paragraphs
    y = Math.max(doc.y + 34, photo ? 130 + 132 + 30 : doc.y + 34);
    // The download is the student's own document: no platform name on it,
    // even where the writer worked one into a sentence.
    const clean = String(full.bio.bio || '').replace(/\*\*/g, '')
        .replace(/\s*(?:on|with|through|via|at)\s+(?:the\s+)?YATICORP\s+LMS(?:\s+(?:platform|courses))?/gi, '')
        .replace(/\s*YATICORP\s+LMS\s*/gi, ' ')
        .replace(/\s+([.,])/g, '$1');
    const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    doc.fillColor('#334155').font('Helvetica').fontSize(12.5);
    for (const p of paragraphs) {
        doc.text(p, left, y, { width: W - 112, lineGap: 4 });
        y = doc.y + 14;
    }

    // Footer
    // Inside the bottom margin on purpose, and without a line break, so the
    // footer can never spill onto a page of its own.
    const when = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.page.margins.bottom = 0;
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(9)
        .text(when, left, doc.page.height - 40, { width: W - 112, align: 'center', lineBreak: false });
    doc.end();
};

module.exports = { renderBioPdf };
