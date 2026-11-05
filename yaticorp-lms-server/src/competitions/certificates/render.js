/**
 * A Certificate Builder certificate as a PDF page: the template's shapes (templates.js) drawn with pdfkit on an A4
 * landscape page. The admin app draws the very same shapes as its live preview.
 */
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const T = require('./templates');

const FONTS = {
    serif: 'Times-Roman', serifBold: 'Times-Bold', serifItalic: 'Times-Italic', script: 'Times-BoldItalic',
    sans: 'Helvetica', sansBold: 'Helvetica-Bold', sansItalic: 'Helvetica-Oblique', sansBoldItalic: 'Helvetica-BoldOblique',
    mono: 'Courier', monoBold: 'Courier-Bold', monoItalic: 'Courier-Oblique', monoBoldItalic: 'Courier-BoldOblique'
};
// Yaticorp's logo: white on the dark templates, dark on the light ones.
const LOGOS = {};
const defaultLogo = (dark) => {
    // Cropped to the word itself (no padding), so it sits where the design puts it.
    const file = path.join(__dirname, '..', '..', '..', 'public', 'assets', ...(dark ? ['YATICORP.png'] : ['certificates', 'yaticorp-logo.png']));
    if (!(file in LOGOS)) LOGOS[file] = fs.existsSync(file) ? fs.readFileSync(file) : null;
    return LOGOS[file];
};

/** A data URL (PNG or JPEG) → its bytes, or null. */
const bytesOf = (dataUrl) => {
    const m = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    return m ? Buffer.from(m[2], 'base64') : null;
};

const verifyUrl = (certId) => `${String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/verify/certificate/${certId}`;

/**
 * The details a page is drawn from: the design (shared by a batch) and one certificate.
 * design: { template, competition: { name }, description, date, venue, signatories: [{ name, designation, signature }],
 *           branding: { yaticorp, name, tagline, logo, seal } }
 * cert:   { certId, recipient: { name, institution }, award: { kind, title } }
 */
const inputOf = (design, cert) => {
    const b = design.branding || {};
    return {
        recipient: cert.recipient, award: cert.award, competition: design.competition?.name, description: design.description,
        details: design.details ? { type: design.details.mode, college: design.details.college, department: design.details.department, address: design.details.address, affiliation: design.details.affiliation, tagline: design.details.tagline, title: design.details.title, intro: design.details.intro } : undefined,
        date: design.date, venue: design.venue, certId: cert.certId,
        signatories: (design.signatories || []).map((s) => ({ name: s.name, designation: s.designation, signature: Boolean(s.signature) })),
        brand: { name: b.name || '', tagline: b.tagline || '', org: b.org || '' },
        hasLogo: Boolean(b.logo || b.yaticorp), ownLogo: Boolean(b.logo), hasSeal: Boolean(b.seal),
        // An organisation's certificates carry no QR code (2026-10-31).
        noQr: design.scope === 'organization' && !design.showQr,
        // Organisations' certificates show only what was typed, QR code or not.
        plain: design.scope === 'organization',
        elements: design.elements || null,
        logoAt: b.logoAt || null,
        logoShape: b.logoShape || 'original',
        sealAt: b.sealAt || null
    };
};

/** One page into `doc`. */
const BACKGROUNDS = {};
const background = (file) => {
    const full = path.join(__dirname, '..', '..', '..', 'public', 'assets', 'certificates', path.basename(file));
    if (!(full in BACKGROUNDS)) BACKGROUNDS[full] = fs.existsSync(full) ? fs.readFileSync(full) : null;
    return BACKGROUNDS[full];
};

/** The middle of a shape, in the design's units — what a rotation turns it about. */
const centreOf = (doc, s, k) => {
    if (s.t === 'text') {
        const font = FONTS[s.font] || FONTS.serif;
        let size = s.size;
        const width = (sz) => doc.font(font).fontSize(sz * k).widthOfString(s.text, { characterSpacing: (s.spacing || 0) * k }) / k;
        while (s.maxW && size > 8 && width(size) > s.maxW) size -= 1;
        const w = width(size);
        const left = s.align === 'center' ? s.x - w / 2 : s.align === 'right' ? s.x - w : s.x;
        return { x: left + w / 2, y: s.y + size / 2 };
    }
    if (s.t === 'para') {
        doc.font(FONTS[s.font] || FONTS.serif).fontSize(s.size * k);
        const n = T.wrap(s.text, s.w * k, (t) => doc.widthOfString(t), s.maxLines).length;
        return { x: s.align === 'center' ? s.x : s.x + s.w / 2, y: s.y + (n * s.lineH) / 2 };
    }
    if (s.t === 'rich') {
        const f = (b) => FONTS[s.italic ? (b ? 'script' : 'serifItalic') : (b ? 'serifBold' : 'serif')];
        const n = T.richLines(s.runs, s.w, (t, b) => doc.font(f(b)).fontSize(s.size * k).widthOfString(t) / k, s.maxLines).length;
        return { x: s.x, y: s.y + (n * s.lineH) / 2 };
    }
    if (s.t === 'line') return { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 };
    if (s.t === 'circle') return { x: s.cx, y: s.cy };
    return { x: s.x + (s.w || 0) / 2, y: s.y + (s.h || 0) / 2 };
};

const drawPage = async (doc, design, cert) => {
    const k = doc.page.width / T.sizeOf(design.template)[0];
    const b = design.branding || {};
    const images = {
        logo: bytesOf(b.logo) || (b.yaticorp ? defaultLogo(false) : null),
        seal: bytesOf(b.seal),
        background: bytesOf(b.background),
        qr: await QRCode.toBuffer(verifyUrl(cert.certId), { margin: 0, width: 360, errorCorrectionLevel: 'M' })
    };
    (design.signatories || []).forEach((s, i) => { images[`sig${i}`] = bytesOf(s.signature); });

    for (const s of T.layout(design.template, inputOf(design, cert))) {
        doc.save();
        if (s.opacity != null) { doc.fillOpacity(s.opacity); doc.strokeOpacity(s.opacity); }
        // Turned about its own centre (the Smart Certificate Builder, 2026-10-31).
        if (s.rot) { const c = centreOf(doc, s, k); doc.rotate(s.rot, { origin: [c.x * k, c.y * k] }); }
        if (s.t === 'bg') {
            const pic = s.slot ? images[s.slot] : background(s.src);
            if (pic) doc.image(pic, 0, 0, { width: doc.page.width, height: doc.page.height });
        } else if (s.t === 'pic') {
            const pic = background(s.src);
            if (pic) doc.image(pic, s.x * k, s.y * k, { fit: [s.w * k, s.h * k], align: 'center', valign: 'center' });
        } else if (s.t === 'rect') {
            const shape = s.r ? doc.roundedRect(s.x * k, s.y * k, s.w * k, s.h * k, s.r * k) : doc.rect(s.x * k, s.y * k, s.w * k, s.h * k);
            if (s.fill && s.stroke) shape.lineWidth(s.sw * k).fillAndStroke(s.fill, s.stroke);
            else if (s.fill) shape.fill(s.fill);
            else if (s.stroke) shape.lineWidth((s.sw || 1) * k).stroke(s.stroke);
        } else if (s.t === 'grad') {
            const [x2, y2] = s.dir === 'h' ? [s.x + s.w, s.y] : s.dir === 'v' ? [s.x, s.y + s.h] : [s.x + s.w, s.y + s.h];
            const g = doc.linearGradient(s.x * k, s.y * k, x2 * k, y2 * k).stop(0, s.from).stop(1, s.to);
            doc.rect(s.x * k, s.y * k, s.w * k, s.h * k).fill(g);
        } else if (s.t === 'poly') {
            doc.polygon(...s.pts.map(([x, y]) => [x * k, y * k])).fill(s.fill);
        } else if (s.t === 'circle') {
            const c = doc.circle(s.cx * k, s.cy * k, s.r * k);
            if (s.fill && s.stroke) c.lineWidth(s.sw * k).fillAndStroke(s.fill, s.stroke);
            else if (s.fill) c.fill(s.fill);
            else c.lineWidth((s.sw || 1) * k).stroke(s.stroke);
        } else if (s.t === 'line') {
            doc.moveTo(s.x1 * k, s.y1 * k).lineTo(s.x2 * k, s.y2 * k).lineWidth(s.sw * k).stroke(s.stroke);
        } else if (s.t === 'text') {
            const font = FONTS[s.font] || FONTS.serif;
            let size = s.size;
            const width = (sz) => doc.font(font).fontSize(sz * k).widthOfString(s.text, { characterSpacing: (s.spacing || 0) * k });
            while (s.maxW && size > 8 && width(size) > s.maxW * k) size -= 1;
            const w = width(size);
            const x = s.align === 'center' ? s.x * k - w / 2 : s.align === 'right' ? s.x * k - w : s.x * k;
            doc.fillColor(s.color).font(font).fontSize(size * k).text(s.text, x, s.y * k, { lineBreak: false, characterSpacing: (s.spacing || 0) * k });
        } else if (s.t === 'para') {
            const font = FONTS[s.font] || FONTS.serif;
            doc.font(font).fontSize(s.size * k);
            const lines = T.wrap(s.text, s.w * k, (t) => doc.widthOfString(t), s.maxLines);
            lines.forEach((line, i) => {
                const w = doc.widthOfString(line);
                const x = s.align === 'center' ? s.x * k - w / 2 : s.align === 'right' ? s.x * k - w : s.x * k;
                doc.fillColor(s.color).text(line, x, (s.y + i * s.lineH) * k, { lineBreak: false });
            });
        } else if (s.t === 'rich') {
            // Plain and bold words, wrapped and centred the way the previews do it (templates.js richLines).
            const font = (bold) => (s.italic ? (bold ? FONTS.script : FONTS.serifItalic) : (bold ? FONTS.serifBold : FONTS.serif));
            const measure = (t, bold) => doc.font(font(bold)).fontSize(s.size * k).widthOfString(t) / k;
            T.richLines(s.runs, s.w, measure, s.maxLines).forEach((line, i) => {
                line.words.forEach((w) => {
                    doc.fillColor(w.color || (w.bold ? s.boldColor : s.color)).font(font(w.bold)).fontSize(s.size * k)
                        .text(w.text, (s.x + w.x) * k, (s.y + i * s.lineH) * k, { lineBreak: false });
                });
            });
        } else if (s.t === 'img' && images[s.slot] && s.shape && s.shape !== 'original') {
            // A logo cut to a circle or a square: the picture covers the box, clipped to the shape.
            try {
                if (s.shape === 'circle') doc.circle((s.x + s.w / 2) * k, (s.y + s.h / 2) * k, (s.w / 2) * k).clip();
                else doc.rect(s.x * k, s.y * k, s.w * k, s.h * k).clip();
                doc.image(images[s.slot], s.x * k, s.y * k, { cover: [s.w * k, s.h * k], align: 'center', valign: 'center' });
            } catch { /* a picture pdfkit cannot read: left out */ }
        } else if (s.t === 'img' && images[s.slot]) {
            try { doc.image(images[s.slot], s.x * k, s.y * k, { fit: [s.w * k, s.h * k], align: 'center', valign: 'center' }); } catch { /* a picture pdfkit cannot read: left out */ }
        }
        doc.restore();
    }
};

/** A PDF of these certificates, one a page, piped to `res` (or returned as a Buffer when res is null). */
const pdf = async (res, design, certs, fileName = 'certificate.pdf') => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, autoFirstPage: false, info: { Title: fileName.replace(/\.pdf$/, ''), Author: design.branding?.name || 'Yaticorp' } });
    const chunks = [];
    if (res) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/[^\w.-]+/g, '_')}"`);
        doc.pipe(res);
    } else doc.on('data', (c) => chunks.push(c));
    for (const cert of certs) {
        const d = typeof design === 'function' ? design(cert) : design;
        // The design's own shape: its picture's width to height, on a page 11 inches wide.
        const [w, h] = T.sizeOf(d.template);
        doc.addPage({ size: [792, Math.round((792 * h) / w)], margin: 0 });
        await drawPage(doc, d, cert);
    }
    const done = new Promise((resolve) => doc.on('end', resolve));
    doc.end();
    await done;
    return res ? null : Buffer.concat(chunks);
};

module.exports = { pdf, verifyUrl, bytesOf };
