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

/*
 * Names in Kannada, Hindi or any letter the PDF's built-in fonts lack (they cover Latin-1 only, and printed the rest
 * as gibberish): those letters are set in the Noto fonts the thesis PDFs ship (src/teacher/fonts), the rest as before.
 */
const NOTO_DIR = path.join(__dirname, '..', '..', 'teacher', 'fonts');
const NOTO = {
    kannada: { regular: 'NotoSerifKannada-Regular.ttf', bold: 'NotoSerifKannada-Bold.ttf' },
    devanagari: { regular: 'NotoSerifDevanagari-Regular.ttf', bold: 'NotoSerifDevanagari-Bold.ttf' },
    latin: { regular: 'NotoSerif-Regular.ttf', bold: 'NotoSerif-Bold.ttf', italic: 'NotoSerif-Italic.ttf' }
};
const WIN_ANSI = new Set([...'€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ']);
const scriptOf = (ch) => {
    const cp = ch.codePointAt(0);
    if (cp <= 0xff || WIN_ANSI.has(ch)) return 'base';
    if (cp >= 0x0c80 && cp <= 0x0cff) return 'kannada';
    if ((cp >= 0x0900 && cp <= 0x097f) || (cp >= 0xa8e0 && cp <= 0xa8ff)) return 'devanagari';
    if (cp === 0x200c || cp === 0x200d) return 'join';
    return 'latin';
};
const registerNoto = (doc) => {
    for (const [script, set] of Object.entries(NOTO)) {
        for (const [style, file] of Object.entries(set)) {
            const full = path.join(NOTO_DIR, file);
            if (fs.existsSync(full)) { doc.registerFont(`cert-${script}-${style}`, full); (doc.certNoto ||= new Set()).add(`cert-${script}-${style}`); }
        }
    }
};
/** `text` as runs, each with the font to set it in: the built-in `base` where it can, a Noto font where it cannot. */
const runsOf = (doc, text, base) => {
    const str = String(text ?? '');
    if (!doc.certNoto || [...str].every((ch) => scriptOf(ch) === 'base')) return [{ text: str, font: base }];
    const style = /Bold/.test(base) ? 'bold' : /Italic|Oblique/.test(base) ? 'italic' : 'regular';
    const fontFor = (script) => {
        if (script === 'base') return base;
        const set = NOTO[script];
        const name = `cert-${script}-${set[style] ? style : 'regular'}`;
        return doc.certNoto.has(name) ? name : base;
    };
    const out = [];
    let cur = null;
    for (const ch of str) {
        let script = scriptOf(ch);
        // Joiners stay with the letters they join; spaces with the run they are in.
        if (script === 'join' || (ch === ' ' && cur)) script = cur?.script || 'base';
        if (cur && cur.script === script) cur.text += ch;
        else { cur = { script, text: ch }; out.push(cur); }
    }
    return out.map((r) => ({ text: r.text, font: fontFor(r.script) }));
};
/** The width of runs at `size` (in points). */
const runsWidth = (doc, runs, size, spacing = 0) => runs.reduce((w, r) => w + doc.font(r.font).fontSize(size).widthOfString(r.text, { characterSpacing: spacing }), 0);
/** Runs drawn left to right from x, every font on the same baseline as `base` would have it at y. */
const drawRuns = (doc, runs, base, x, y, size, color, spacing = 0) => {
    const ascent = (f) => ((doc.font(f).fontSize(size)._font?.ascender || 0) / 1000) * size;
    const baseAscent = ascent(base);
    let px = x;
    for (const r of runs) {
        const dy = r.font === base ? 0 : baseAscent - ascent(r.font);
        doc.fillColor(color).font(r.font).fontSize(size).text(r.text, px, y + dy, { lineBreak: false, characterSpacing: spacing });
        px += runsWidth(doc, [r], size, spacing);
    }
};

/** A data URL (PNG or JPEG) → its bytes, or null. */
const bytesOf = (dataUrl) => {
    const m = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
    return m ? Buffer.from(m[2], 'base64') : null;
};

/**
 * A picture made no bigger than it is drawn (2026-11-06): logos, seals and signatures saved as phone screenshots
 * were 0.4-0.5 MB each, so a certificate PDF came to 1.4 MB and was slow to fetch and open. Anything over 120 KB is
 * scaled to fit `max` px (PNG kept as PNG when it has see-through parts, else JPEG) - once, then kept in memory.
 */
const SHRUNK = new Map();
const smaller = async (buf, max) => {
    if (!buf || buf.length < 120 * 1024) return buf;
    const key = `${max}:${require('crypto').createHash('sha1').update(buf).digest('hex')}`;
    if (SHRUNK.has(key)) return SHRUNK.get(key);
    let out = buf;
    try {
        const Jimp = require('jimp');
        const img = await Jimp.read(buf);
        if (img.bitmap.width > max || img.bitmap.height > max) img.scaleToFit(max, max);
        const next = img.hasAlpha() ? await img.deflateLevel(9).getBufferAsync(Jimp.MIME_PNG) : await img.quality(82).getBufferAsync(Jimp.MIME_JPEG);
        if (next.length < buf.length) out = next;
    } catch { /* unreadable here: drawn as it is */ }
    if (SHRUNK.size > 200) SHRUNK.clear();
    SHRUNK.set(key, out);
    return out;
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
        hasLogo: Boolean(b.logo || b.yaticorp), ownLogo: Boolean(b.logo), hasSeal: Boolean(b.seal), hasBg: Boolean(b.background),
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
        const runs = runsOf(doc, s.text, font);
        const width = (sz) => runsWidth(doc, runs, sz * k, (s.spacing || 0) * k) / k;
        while (s.maxW && size > 8 && width(size) > s.maxW) size -= 1;
        const w = width(size);
        const left = s.align === 'center' ? s.x - w / 2 : s.align === 'right' ? s.x - w : s.x;
        return { x: left + w / 2, y: s.y + size / 2 };
    }
    if (s.t === 'para') {
        const font = FONTS[s.font] || FONTS.serif;
        const n = T.wrap(s.text, s.w * k, (t) => runsWidth(doc, runsOf(doc, t, font), s.size * k), s.maxLines).length;
        return { x: s.align === 'center' ? s.x : s.x + s.w / 2, y: s.y + (n * s.lineH) / 2 };
    }
    if (s.t === 'rich') {
        const f = (b) => FONTS[s.italic ? (b ? 'script' : 'serifItalic') : (b ? 'serifBold' : 'serif')];
        const n = T.richLines(s.runs, s.w, (t, b) => runsWidth(doc, runsOf(doc, t, f(b)), s.size * k) / k, s.maxLines).length;
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
        logo: (await smaller(bytesOf(b.logo), 700)) || (b.yaticorp ? defaultLogo(false) : null),
        seal: await smaller(bytesOf(b.seal), 700),
        background: await smaller(bytesOf(b.background), 2200),
        qr: await QRCode.toBuffer(verifyUrl(cert.certId), { margin: 0, width: 360, errorCorrectionLevel: 'M' })
    };
    for (const [i, sg] of (design.signatories || []).entries()) images[`sig${i}`] = await smaller(bytesOf(sg.signature), 600);

    for (const s of T.layout(design.template, inputOf(design, cert))) {
        doc.save();
        if (s.opacity != null) { doc.fillOpacity(s.opacity); doc.strokeOpacity(s.opacity); }
        // Turned about its own centre (the Smart Certificate Builder, 2026-10-31).
        if (s.rot) { const c = centreOf(doc, s, k); doc.rotate(s.rot, { origin: [c.x * k, c.y * k] }); }
        if (s.t === 'bg') {
            const pic = s.slot ? images[s.slot] : background(s.src);
            // A picture pdfkit cannot read is left out, rather than breaking the PDF half-sent.
            if (pic) { try { doc.image(pic, 0, 0, { width: doc.page.width, height: doc.page.height }); } catch { /* left out */ } }
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
            const runs = runsOf(doc, s.text, font);
            const width = (sz) => runsWidth(doc, runs, sz * k, (s.spacing || 0) * k);
            while (s.maxW && size > 8 && width(size) > s.maxW * k) size -= 1;
            const w = width(size);
            const x = s.align === 'center' ? s.x * k - w / 2 : s.align === 'right' ? s.x * k - w : s.x * k;
            drawRuns(doc, runs, font, x, s.y * k, size * k, s.color, (s.spacing || 0) * k);
        } else if (s.t === 'para') {
            const font = FONTS[s.font] || FONTS.serif;
            const lines = T.wrap(s.text, s.w * k, (t) => runsWidth(doc, runsOf(doc, t, font), s.size * k), s.maxLines);
            lines.forEach((line, i) => {
                const runs = runsOf(doc, line, font);
                const w = runsWidth(doc, runs, s.size * k);
                const x = s.align === 'center' ? s.x * k - w / 2 : s.align === 'right' ? s.x * k - w : s.x * k;
                drawRuns(doc, runs, font, x, (s.y + i * s.lineH) * k, s.size * k, s.color);
            });
        } else if (s.t === 'rich') {
            // Plain and bold words, wrapped and centred the way the previews do it (templates.js richLines).
            const font = (bold) => (s.italic ? (bold ? FONTS.script : FONTS.serifItalic) : (bold ? FONTS.serifBold : FONTS.serif));
            const measure = (t, bold) => runsWidth(doc, runsOf(doc, t, font(bold)), s.size * k) / k;
            T.richLines(s.runs, s.w, measure, s.maxLines).forEach((line, i) => {
                line.words.forEach((w) => {
                    drawRuns(doc, runsOf(doc, w.text, font(w.bold)), font(w.bold), (s.x + w.x) * k, (s.y + i * s.lineH) * k, s.size * k, w.color || (w.bold ? s.boldColor : s.color));
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
    registerNoto(doc);
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
