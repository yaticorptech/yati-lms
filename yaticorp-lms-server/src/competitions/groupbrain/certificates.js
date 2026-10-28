/**
 * Group Brain certificates: issued by itself when a player meets a rule
 * (awards.js), for a tournament place (tournaments.js), or by an admin; an
 * admin may also reissue (a new ID; the old one revoked) or revoke one.
 *
 * Each has a public ID, GB-XXXX-XXXX, printed on it with a QR code that
 * opens the verification page; anyone can check an ID there (`verify`),
 * which shows the holder, what it was for, when it was issued, and whether
 * it is still valid. The PDF is drawn from the saved record each time.
 */
const crypto = require('node:crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { GroupBrainCertificate } = require('./models');
const { audit } = require('./settings');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newId = () => {
    const part = () => Array.from({ length: 4 }, () => CHARS[crypto.randomInt(0, CHARS.length)]).join('');
    return `GB-${part()}-${part()}`;
};
const fail = (status, message) => Object.assign(new Error(message), { status });
const ORD = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 >= 11 && n % 100 <= 13) ? 0 : n % 10] || 'th'}`;

/** The page a certificate's QR code opens. */
const verifyUrl = (certId) => `${String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/verify/group-brain/${certId}`;

/** Issue one. A clash of IDs draws another; one valid per player and rule (the index). */
const issue = async ({ userId, name, title, line = '', eventName = 'Group Brain', rank = null, ruleKey, admin = null, reissueOf = null }) => {
    for (let tries = 0; tries < 5; tries += 1) {
        try {
            return (await GroupBrainCertificate.create({
                certId: newId(), userId, name, title, line, eventName, rank, ruleKey,
                issuedBy: admin ? 'admin' : 'auto', issuedByAdmin: admin?._id || null, reissueOf
            })).toObject();
        } catch (err) {
            if (err?.code === 11000 && /certId/.test(err.message)) continue;
            throw err;
        }
    }
    throw fail(503, 'Could not issue a certificate just now.');
};

/** An admin issues one by hand, to a student. */
const issueByAdmin = async ({ userId, title, line, eventName, rank }, admin, reason) => {
    const User = require('../../models/User');
    const user = await User.findById(userId).select('name').lean();
    if (!user) throw fail(404, 'Student not found.');
    if (!String(title || '').trim()) throw fail(400, 'Give the certificate a title.');
    const cert = await issue({
        userId, name: user.name, title: String(title).trim().slice(0, 80), line: String(line || '').trim().slice(0, 140),
        eventName: String(eventName || 'Group Brain').trim().slice(0, 80), rank: rank ? Number(rank) || null : null,
        ruleKey: `manual:${crypto.randomUUID()}`, admin
    });
    await audit(admin, 'certificate.issue', cert.certId, null, { userId: String(userId), title: cert.title }, reason);
    return cert;
};

/** Revoke: it stays on record, marked revoked, and verification says so. */
const revoke = async (certId, admin, reason) => {
    if (!String(reason || '').trim()) throw fail(400, 'Give a reason: it shows on verification and in the audit log.');
    const cert = await GroupBrainCertificate.findOneAndUpdate({ certId, status: 'valid' }, { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: String(reason).trim().slice(0, 200) } }, { returnDocument: 'after' }).lean();
    if (!cert) throw fail(404, 'No valid certificate has that ID.');
    await audit(admin, 'certificate.revoke', certId, { status: 'valid' }, { status: 'revoked' }, reason);
    return cert;
};

/** Reissue: a new ID for the same award (a name corrected, say); the old ID is revoked. */
const reissue = async (certId, admin, reason, changes = {}) => {
    const old = await GroupBrainCertificate.findOne({ certId }).lean();
    if (!old) throw fail(404, 'No certificate has that ID.');
    if (old.status === 'valid') await revoke(certId, admin, `Reissued: ${reason || 'replaced'}`);
    const User = require('../../models/User');
    const user = await User.findById(old.userId).select('name').lean();
    const cert = await issue({
        userId: old.userId, name: String(changes.name || user?.name || old.name).slice(0, 80), title: String(changes.title || old.title).slice(0, 80),
        line: changes.line != null ? String(changes.line).slice(0, 140) : old.line, eventName: old.eventName, rank: old.rank,
        ruleKey: old.ruleKey, admin, reissueOf: certId
    });
    await audit(admin, 'certificate.reissue', cert.certId, { certId }, { certId: cert.certId }, reason);
    return cert;
};

/** What anyone may learn from a certificate's ID. */
const verify = async (certId) => {
    const cert = await GroupBrainCertificate.findOne({ certId: String(certId || '').toUpperCase().trim() }).lean();
    if (!cert) return { found: false };
    return {
        found: true, certId: cert.certId, valid: cert.status === 'valid', status: cert.status,
        name: cert.name, title: cert.title, line: cert.line, eventName: cert.eventName, rank: cert.rank,
        issuedAt: cert.issuedAt, revokedAt: cert.revokedAt, revokedReason: cert.revokedReason, reissueOf: cert.reissueOf
    };
};

/** The certificate as a PDF, written to `res`. */
const pdf = async (cert, res) => {
    const qr = await QRCode.toBuffer(verifyUrl(cert.certId), { margin: 1, width: 240 });
    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Group_Brain_${cert.certId}.pdf"`);
    doc.pipe(res);
    const W = doc.page.width; const H = doc.page.height;
    const ink = '#1e1b4b'; const accent = '#4f46e5'; const gold = '#b7791f';
    doc.rect(0, 0, W, H).fill('#f8f7ff');
    doc.lineWidth(6).rect(24, 24, W - 48, H - 48).stroke(accent);
    doc.lineWidth(1.5).rect(36, 36, W - 72, H - 72).stroke(gold);
    doc.fillColor(accent).font('Helvetica-Bold').fontSize(14).text('YATI LMS · GROUP BRAIN', 0, 70, { width: W, align: 'center', characterSpacing: 3 });
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(34).text('Certificate of Achievement', 0, 100, { width: W, align: 'center' });
    doc.fillColor('#475569').font('Helvetica').fontSize(14).text('This is to certify that', 0, 160, { width: W, align: 'center' });
    doc.fillColor(ink).font('Helvetica-Bold').fontSize(30).text(cert.name, 60, 186, { width: W - 120, align: 'center' });
    doc.moveTo(W / 2 - 170, 228).lineTo(W / 2 + 170, 228).lineWidth(1).stroke(gold);
    doc.fillColor(gold).font('Helvetica-Bold').fontSize(22).text(cert.rank ? `${ORD(cert.rank)} place — ${cert.title}` : cert.title, 60, 244, { width: W - 120, align: 'center' });
    if (cert.line) doc.fillColor('#334155').font('Helvetica').fontSize(14).text(cert.line, 80, 280, { width: W - 160, align: 'center' });
    doc.fillColor('#334155').font('Helvetica').fontSize(13).text(`Event: ${cert.eventName}`, 80, 312, { width: W - 160, align: 'center' });
    const issued = new Date(cert.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.font('Helvetica').fontSize(11).fillColor('#475569');
    doc.text(`Issued on ${issued}`, 70, H - 140);
    doc.text(`Certificate ID: ${cert.certId}`, 70, H - 122);
    doc.text(`Verify at ${verifyUrl(cert.certId)}`, 70, H - 104, { width: W - 300 });
    doc.fontSize(8).fillColor('#94a3b8').text('Group Brain scores and the Brain Performance Score measure performance in these games; they are not IQ scores.', 70, H - 80, { width: W - 300 });
    doc.image(qr, W - 190, H - 200, { width: 120 });
    doc.fontSize(8).fillColor('#64748b').text('Scan to verify', W - 190, H - 76, { width: 120, align: 'center' });
    if (cert.status === 'revoked') {
        doc.save().rotate(-20, { origin: [W / 2, H / 2] }).fillColor('#dc2626').opacity(0.25).font('Helvetica-Bold').fontSize(90).text('REVOKED', 0, H / 2 - 50, { width: W, align: 'center' }).restore();
    }
    doc.end();
};

module.exports = { issue, issueByAdmin, revoke, reissue, verify, pdf, verifyUrl, newId };
