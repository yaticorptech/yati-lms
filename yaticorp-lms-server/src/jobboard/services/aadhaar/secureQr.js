/**
 * Reads an Aadhaar QR. Secure QR (2019+): one big decimal number → bytes →
 * gzip → 0xFF-separated fields (indicator, reference id, name, dob, gender,
 * address…, photo), then SHA-256 hashes of the linked email/mobile, then
 * UIDAI's 256-byte signature. Legacy XML: a <PrintLetterBarcodeData> tag.
 * Fields are located by shape (the reference id anchors everything), so
 * layout variants are read rather than refused. The mobile hash is SHA-256
 * of the mobile applied N times, N = last digit of the Aadhaar (min 1).
 */
const zlib = require('zlib');
const crypto = require('crypto');
class QrParseError extends Error { constructor(code, message) { super(message); this.code = code; } }
const bigDecimalToBytes = (d) => { let h = BigInt(d).toString(16); if (h.length % 2) h = `0${h}`; return Buffer.from(h, 'hex'); };
const splitFields = (buf, count) => { const out = []; let s = 0; for (let i = 0; i < buf.length && out.length < count; i++) if (buf[i] === 0xff) { out.push(buf.subarray(s, i)); s = i + 1; } return out; };
const text = (b) => { const u = b.toString('utf8'); return u.includes('�') ? b.toString('latin1') : u; };
const shape = (t) => (!t ? 'empty' : /^V\d+$/i.test(t) ? t.toUpperCase() : /^\d+$/.test(t) ? `digits:${t.length}` : `text:${t.length}`);
const REFERENCE = /^\d{4}\d{10,}$/;

const parseSecureQr = (payload) => {
    let bytes; try { bytes = bigDecimalToBytes(payload); } catch { throw new QrParseError('INVALID_QR', 'That is not an Aadhaar QR code.'); }
    let data; try { data = zlib.gunzipSync(bytes); } catch { throw new QrParseError('INVALID_QR', 'That is not an Aadhaar Secure QR code.'); }
    if (data.length < 300) throw new QrParseError('INVALID_QR', 'That is not an Aadhaar Secure QR code.');
    const texts = splitFields(data, 24).map((f) => text(f).trim());
    const ref = texts.findIndex((t, i) => i < 6 && REFERENCE.test(t));
    if (ref < 0) { console.warn(`[aadhaar] Secure QR not recognised (no reference id): ${data.length} bytes → [${texts.slice(0, 20).map(shape).join(', ')}]`); throw new QrParseError('INVALID_QR', 'This Aadhaar QR could not be read.'); }
    const flagField = ref > 0 ? texts[ref - 1] : '';
    const flagKnown = /^[0-3]$/.test(flagField); const flag = flagKnown ? Number(flagField) : null;
    const version = texts.slice(0, ref).find((t) => /^V\d+$/i.test(t)) || null;
    const name = texts[ref + 1] || '';
    if (!name || /^\d+$/.test(name)) { console.warn(`[aadhaar] Secure QR not recognised (no name): [${texts.slice(0, 20).map(shape).join(', ')}]`); throw new QrParseError('INVALID_QR', 'This Aadhaar QR could not be read.'); }
    const afterAddress = texts[ref + 15] || '';
    const slotA = data.subarray(data.length - 288, data.length - 256);
    const slotB = data.subarray(data.length - 320, data.length - 288);
    let mobileHash = null, emailHash = null;
    if (flag === 3) { emailHash = slotB; mobileHash = slotA; } else if (flag === 2) mobileHash = slotA; else if (flag === 1) emailHash = slotA; else if (flag === null) mobileHash = slotA;
    const last4 = texts[ref].slice(0, 4);
    return { format: version ? `secure-${version.toLowerCase()}` : 'secure-v1', last4, name, dob: texts[ref + 2] || '', mobileLast4: /^\d{4}$/.test(afterAddress) ? afterAddress : '', mobileHash: mobileHash ? mobileHash.toString('hex') : null, emailHash: emailHash ? emailHash.toString('hex') : null, flagKnown, hashRounds: Math.max(1, Number(last4[3])), signature: data.subarray(data.length - 256), signed: data.subarray(0, data.length - 256) };
};
const parseLegacyQr = (payload) => {
    const m = String(payload).match(/<PrintLetterBarcodeData\b([^>]*)\/?>/i);
    if (!m) throw new QrParseError('INVALID_QR', 'That is not an Aadhaar QR code.');
    const attrs = {}; for (const a of m[1].matchAll(/([A-Za-z]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    if (!/^\d{12}$/.test(attrs.uid || '') || !attrs.name) throw new QrParseError('INVALID_QR', 'This Aadhaar QR could not be read.');
    return { format: 'xml', last4: attrs.uid.slice(-4), name: attrs.name, dob: attrs.dob || attrs.yob || '', mobileLast4: '', mobileHash: null, emailHash: null, flagKnown: true, hashRounds: 1, signature: null, signed: null };
};
const parseAadhaarQr = (payload) => {
    const s = String(payload || '').trim();
    if (!s) throw new QrParseError('QR_UNREADABLE', 'The QR code could not be read.');
    if (/^\d+$/.test(s)) { if (s.length < 200) throw new QrParseError('INVALID_QR', 'That is not an Aadhaar QR code.'); return parseSecureQr(s); }
    if (/<PrintLetterBarcodeData/i.test(s)) return parseLegacyQr(s);
    throw new QrParseError('INVALID_QR', 'That is not an Aadhaar QR code.');
};
const hashMobile = (mobile, rounds) => { let h = String(mobile); for (let i = 0; i < Math.max(1, rounds); i++) h = crypto.createHash('sha256').update(h).digest('hex'); return h; };
const mobileMatches = (card, ten) => !!card.mobileHash && hashMobile(ten, card.hashRounds) === card.mobileHash;
const verifySignature = (card) => {
    const certPath = process.env.AADHAAR_UIDAI_CERT_PATH;
    if (!certPath || !card.signature) return null;
    try { return crypto.verify('sha256', card.signed, require('fs').readFileSync(certPath), card.signature); } catch (err) { console.warn('[aadhaar] signature check skipped:', err.message); return null; }
};
module.exports = { parseAadhaarQr, hashMobile, mobileMatches, verifySignature, QrParseError };
