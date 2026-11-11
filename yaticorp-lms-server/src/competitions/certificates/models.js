/**
 * The Certificate Builder's records (2026-10-31).
 *
 *   CertificateDesign   what one Generate made: the template, the competition, the wording, the signatories and the
 *                       branding (logo, signatures and seal as PNG/JPEG data URLs) — shared by every certificate of
 *                       that batch, so a bulk run stores its pictures once
 *   IssuedCertificate   one certificate: its unique ID (on the QR code), the recipient and the award
 *
 * `scope` is who made it — 'platform' (the super admin) or 'organization' (an organization admin, organizationId) —
 * and decides who may list, download and revoke it.
 */
const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
    scope: { type: String, enum: ['platform', 'organization'], required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    createdBy: { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' } },
    template: { type: String, required: true },
    competition: {
        // 'game': a competition type (2026-10-31) — every Chess, Rapid Fire, Code Clash, Brain Sprint or Quiz Arena
        // competition (`game`); 'competition' / 'arena': one competition (`id`), as the first designs were.
        // 'template' (2026-11-03): a saved certificate (Certificate 1, 2, …) that a competition picks when it is created.
        kind: { type: String, enum: ['template', 'game', 'competition', 'arena', 'none'], default: 'none' },
        game: { type: String, default: '' },
        id: { type: mongoose.Schema.Types.ObjectId, default: null },
        // Typed by the organiser; empty: each competition's own name.
        name: { type: String, default: '', maxlength: 160 }
    },
    // A template's name in the lists: "Certificate 1", "Certificate 2", …
    label: { type: String, default: '', maxlength: 80 },
    description: { type: String, default: '', maxlength: 600 },
    // The formal certificate (Certificate Configuration): intra- or inter-college, the organising college and department.
    details: {
        mode: { type: String, enum: ['intra', 'inter', ''], default: '' },
        college: { type: String, default: '', maxlength: 160 },
        department: { type: String, default: '', maxlength: 160 },
        // The two lines under the college's name (the College Classic design): its place, its affiliation.
        address: { type: String, default: '', maxlength: 120 },
        affiliation: { type: String, default: '', maxlength: 120 },
        // The line under CERTIFICATE, in place of "Of Achievement" (2026-10-31).
        tagline: { type: String, default: '', maxlength: 80 },
        // The title ("Certificate") and the line before the name ("This is to certify that"), as typed.
        title: { type: String, default: '', maxlength: 80 },
        intro: { type: String, default: '', maxlength: 80 }
    },
    date: { type: String, default: '', maxlength: 60 },
    venue: { type: String, default: '', maxlength: 120 },
    signatories: { type: [{ _id: false, name: { type: String, maxlength: 80 }, designation: { type: String, maxlength: 80 }, signature: { type: String, default: '' } }], default: [] },
    branding: {
        yaticorp: { type: Boolean, default: false },
        name: { type: String, default: '', maxlength: 80 },
        tagline: { type: String, default: '', maxlength: 80 },
        // The organisation's (college / institute's) name, by its logo; and who "digitally signed" it.
        org: { type: String, default: '', maxlength: 100 },
        logo: { type: String, default: '' },
        seal: { type: String, default: '' },
        // The organiser's own certificate picture, for the 'custom' template.
        background: { type: String, default: '' },
        // Where the organiser dragged the logo: its centre, as shares of the page (null: the template's own place).
        logoAt: { type: { _id: false, fx: Number, fy: Number, fs: Number }, default: null },
        logoShape: { type: String, enum: ['original', 'circle', 'square'], default: 'original' },
        sealAt: { type: { _id: false, fx: Number, fy: Number, fs: Number }, default: null }
    },
    // Issued by itself from the competition's results (auto.js): 1st, 2nd and 3rd always, everyone else who took
    // part when `participation` is on. One saved design per competition for each side.
    auto: { type: Boolean, default: false },
    participation: { type: Boolean, default: true },
    // Which places get a winner's certificate (each can be switched off, 2026-10-31).
    places: { type: [Number], default: [1, 2, 3] },
    // The Smart Certificate Builder (2026-10-31): each element's edits by key ({ dx, dy, s, rot, z, text, family, bold,
    // italic, color, align, hidden, locked }), and whether the QR code is on the organisation's certificates.
    elements: { type: mongoose.Schema.Types.Mixed, default: {} },
    showQr: { type: Boolean, default: false },
    count: { type: Number, default: 0 }
}, { timestamps: true });
designSchema.index({ 'competition.kind': 1, 'competition.id': 1, scope: 1, organizationId: 1 });

const certificateSchema = new mongoose.Schema({
    certId: { type: String, required: true, unique: true },
    designId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateDesign', required: true, index: true },
    scope: { type: String, enum: ['platform', 'organization'], required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    recipient: {
        name: { type: String, required: true, maxlength: 100 },
        institution: { type: String, default: '', maxlength: 140 },
        // Course / department / year, as the organiser typed it (the formal certificate).
        course: { type: String, default: '', maxlength: 160 },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
    },
    award: { kind: { type: String, enum: ['first', 'second', 'third', 'participation', 'custom'], required: true }, title: { type: String, default: '', maxlength: 80 } },
    // 'competition:<id>' or 'arena:<id>': what a student's certificate is looked up by.
    competitionKey: { type: String, default: '', index: true },
    // The competition's own name and date, for a design that leaves them to it.
    competitionName: { type: String, default: '' },
    date: { type: String, default: '' },
    revokedAt: { type: Date, default: null },
    // 'auto': revoked by the automatic issue (auto.js), its holder never having played — given back by it should the
    // results show they did. '': revoked by an admin (or never), and left to them.
    revokedBy: { type: String, default: '' }
}, { timestamps: true });
certificateSchema.index({ createdAt: -1 });
// One certificate per player per competition per design: an automatic issue run twice cannot make two.
certificateSchema.index({ designId: 1, competitionKey: 1, 'recipient.userId': 1 }, { unique: true, partialFilterExpression: { 'recipient.userId': { $type: 'objectId' } } });

const CertificateDesign = mongoose.models.CertificateDesign || mongoose.model('CertificateDesign', designSchema, 'certificate_designs');
const IssuedCertificate = mongoose.models.IssuedCertificate || mongoose.model('IssuedCertificate', certificateSchema, 'issued_certificates');

// The one-per-design index of before (a type's design certifies a student once per competition): dropped.
mongoose.connection.once('open', () => IssuedCertificate.collection.dropIndex('designId_1_recipient.userId_1').catch(() => {}));
if (mongoose.connection.readyState === 1) IssuedCertificate.collection.dropIndex('designId_1_recipient.userId_1').catch(() => {});

module.exports = { CertificateDesign, IssuedCertificate };
