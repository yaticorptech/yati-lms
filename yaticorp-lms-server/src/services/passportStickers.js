/**
 * AI Passport QR stickers: generate N new passport IDs, and print them as an
 * A4 sheet of stickers (QR + ID) to stick on each book's last page.
 *
 * IDs are random, not sequential, so nobody can guess a neighbour's book:
 * <prefix> + 8 characters from an alphabet without look-alikes (no 0/O, 1/I/L).
 * The QR holds a link to <student app>/passport/<ID>: a phone camera opens the
 * app straight at the claim, and the in-app scanners read the ID off its end.
 */
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Passport = require('../models/Passport');

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const randomPart = (n = 8) => Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % ALPHABET.length]).join('');
const MAX_GENERATE = 2000;

const defaultLinkBase = () => (process.env.PASSPORT_QR_BASE || process.env.FRONTEND_URL || '').replace(/\/+$/, '');
const cleanBase = (raw) => {
    const s = String(raw ?? '').trim().replace(/\/+$/, '');
    if (!s) return '';
    if (!/^https?:\/\/[^\s/]+/i.test(s)) throw Object.assign(new Error('The QR link must start with http:// or https://'), { status: 400 });
    return s.slice(0, 200);
};
const qrTextFor = (base, code) => (base ? `${base}/passport/${code}` : code);
/** "AIP7K3M9Q2X" → "AIP 7K3M 9Q2X", for the eye; the server ignores spaces. */
const pretty = (code) => (code.length > 8 ? `${code.slice(0, code.length - 8)} ${code.slice(-8, -4)} ${code.slice(-4)}` : code);

const generate = async ({ count, prefix, batch, linkBase, adminId }) => {
    const n = Math.floor(Number(count));
    if (!(n >= 1 && n <= MAX_GENERATE)) throw Object.assign(new Error(`Generate between 1 and ${MAX_GENERATE} QR codes at a time.`), { status: 400 });
    const pre = String(prefix ?? 'AIP').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    const base = cleanBase(linkBase ?? defaultLinkBase());
    const label = String(batch || '').trim().slice(0, 60)
        || `Batch ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}`;
    if (await Passport.exists({ batch: label })) throw Object.assign(new Error(`A batch called "${label}" already exists. Use another name.`), { status: 400 });

    const codes = new Set();
    // Draw until there are n codes nobody has; a clash is all but impossible.
    for (let round = 0; codes.size < n && round < 5; round += 1) {
        const want = new Set();
        while (want.size < (n - codes.size)) want.add(pre + randomPart());
        const taken = new Set((await Passport.find({ code: { $in: [...want] } }).select('code').lean()).map((p) => p.code));
        want.forEach((c) => { if (!taken.has(c)) codes.add(c); });
    }
    const docs = [...codes].map((code) => ({ code, batch: label, addedBy: adminId || null, qrText: qrTextFor(base, code) }));
    await Passport.insertMany(docs, { ordered: false });
    return { batch: label, count: docs.length, linkBase: base, sample: docs.slice(0, 3).map((d) => d.code) };
};

const batches = async () => {
    const rows = await Passport.aggregate([
        { $group: { _id: '$batch', total: { $sum: 1 }, linked: { $sum: { $cond: [{ $eq: ['$status', 'linked'] }, 1, 0] } }, rewarded: { $sum: { $cond: [{ $ne: ['$rewardedAt', null] }, 1, 0] } }, createdAt: { $min: '$createdAt' }, sample: { $first: '$qrText' } } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 }
    ]);
    return rows.map((r) => ({ batch: r._id || '', total: r.total, linked: r.linked, rewarded: r.rewarded, createdAt: r.createdAt, qrLink: /^https?:/i.test(r.sample || '') }));
};

/**
 * The stickers of a batch (or of the given codes) as an A4 PDF: 4 across and
 * 6 down, each a cut-line box with the QR, the ID under it and a short line.
 */
const MM = 72 / 25.4;
const stickersPdf = async ({ batch, codes, onlyFree = false }) => {
    const filter = codes?.length ? { code: { $in: codes } } : { batch: String(batch || '') };
    if (onlyFree) filter.status = 'free';
    const rows = await Passport.find(filter).sort({ createdAt: 1, _id: 1 }).select('code qrText').lean();
    if (!rows.length) throw Object.assign(new Error('No QR codes to print for that batch.'), { status: 404 });
    if (rows.length > 5000) throw Object.assign(new Error('Print up to 5000 stickers at a time.'), { status: 400 });

    const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `AI Passport QR stickers — ${batch || 'selection'}` } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));

    const cols = 4, rowsPer = 6;
    const pageW = 210 * MM, pageH = 297 * MM, margin = 10 * MM, gap = 4 * MM;
    const cellW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
    const cellH = (pageH - margin * 2 - gap * (rowsPer - 1)) / rowsPer;
    const qrSize = Math.min(cellW - 8 * MM, cellH - 14 * MM);

    for (let i = 0; i < rows.length; i += 1) {
        const at = i % (cols * rowsPer);
        if (i > 0 && at === 0) doc.addPage();
        const x = margin + (at % cols) * (cellW + gap);
        const y = margin + Math.floor(at / cols) * (cellH + gap);
        const { code, qrText } = rows[i];
        // A light, dashed cut line.
        doc.save().lineWidth(0.5).dash(2, { space: 2 }).strokeColor('#c7ccd4').roundedRect(x, y, cellW, cellH, 6).stroke().undash().restore();
        doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(6.5).text('AI PASSPORT · SCAN TO CLAIM', x, y + 2.6 * MM, { width: cellW, align: 'center', characterSpacing: 0.6 });
        const png = await QRCode.toBuffer(qrText || code, { errorCorrectionLevel: 'M', margin: 1, width: 360, color: { dark: '#0f172a', light: '#ffffff' } });
        doc.image(png, x + (cellW - qrSize) / 2, y + 6 * MM, { width: qrSize, height: qrSize });
        doc.fillColor('#0f172a').font('Courier-Bold').fontSize(9.5).text(pretty(code), x, y + 6.6 * MM + qrSize, { width: cellW, align: 'center' });
    }
    doc.end();
    return { pdf: await done, count: rows.length };
};

module.exports = { generate, batches, stickersPdf, defaultLinkBase, MAX_GENERATE };
