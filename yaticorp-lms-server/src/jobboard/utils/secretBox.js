/**
 * AES-256-GCM box for the few verification values that must be stored but
 * never be readable straight out of the database. Key: VERIFICATION_ENCRYPTION_KEY
 * (32 bytes, hex or base64), else derived from JWT_SECRET.
 */
const crypto = require('crypto');
const keyBytes = () => {
    const raw = process.env.VERIFICATION_ENCRYPTION_KEY;
    if (raw) {
        const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
        if (buf.length === 32) return buf;
        throw new Error('VERIFICATION_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64).');
    }
    return crypto.createHash('sha256').update(`verification:${process.env.JWT_SECRET || 'yati'}`).digest();
};
const seal = (plain) => {
    if (!plain) return '';
    const iv = crypto.randomBytes(12);
    const c = crypto.createCipheriv('aes-256-gcm', keyBytes(), iv);
    const body = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
    return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
};
const open = (sealed) => {
    if (!sealed) return '';
    try {
        const [v, iv, tag, body] = String(sealed).split('.');
        if (v !== 'v1') return null;
        const d = crypto.createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(iv, 'base64url'));
        d.setAuthTag(Buffer.from(tag, 'base64url'));
        return Buffer.concat([d.update(Buffer.from(body, 'base64url')), d.final()]).toString('utf8');
    } catch { return null; }
};
module.exports = { seal, open };
