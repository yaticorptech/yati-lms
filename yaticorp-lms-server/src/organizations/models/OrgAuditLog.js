/**
 * @description Who did what to an organization from the platform side.
 *
 * A superadmin can approve, suspend, edit, restock and even delete an
 * organization, and can work inside its panel as if they were it (the
 * X-View-Organization header). None of that left a trace beyond a console line,
 * so an organization asking "who removed our student?" had no answer. One row
 * per action, written best-effort: a failed audit write is logged and never
 * fails the action it describes.
 *
 * Additive and append-only — nothing reads it except the superadmin's audit
 * view (GET /api/organizations/admin/:id/audit), and nothing updates a row.
 */
const mongoose = require('mongoose');

const orgAuditLogSchema = new mongoose.Schema({
    // Not a ref the app relies on: a deleted organization keeps its rows.
    orgId: { type: mongoose.Schema.Types.ObjectId, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    // Copied at write time so the row still reads after the account is gone.
    adminName: { type: String, default: '' },
    action: { type: String, required: true, maxlength: 80 },
    method: { type: String, default: '' },
    path: { type: String, default: '', maxlength: 500 },
    at: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { versionKey: false });

// The audit view: one organization's newest rows first.
orgAuditLogSchema.index({ orgId: 1, at: -1 });

const OrgAuditLog = mongoose.model('OrgAuditLog', orgAuditLogSchema, 'org_audit_logs');

/**
 * Record one action. Never throws: an audit row that cannot be written must not
 * turn a completed approval or removal into a 500.
 */
OrgAuditLog.record = async ({ orgId, admin, action, req, details = {} }) => {
    try {
        if (!orgId || !action) return;
        await OrgAuditLog.create({
            orgId,
            adminId: admin?._id || null,
            adminName: admin?.name || admin?.email || '',
            action,
            method: req?.method || '',
            path: String(req?.originalUrl || '').slice(0, 500),
            details
        });
    } catch (error) {
        console.error('[organizations] audit write failed:', error.message);
    }
};

/**
 * What a change made in an organization's panel was, in words, from its
 * method and path: "Added a teacher", "Edited a Scouts unit". The most
 * specific matching rule wins; anything unlisted reads as its verb and the
 * section it was in, so a new route is still recorded, just plainly.
 */
const VERB = { POST: 'Added', PUT: 'Edited', PATCH: 'Edited', DELETE: 'Removed' };
const RULES = [
    [/\/me\/users(\/|$)/, 'a user'],
    [/\/me\/password$/, null, 'Changed their password'],
    [/\/me\/logo$/, null, 'Changed the logo'],
    [/\/me$/, null, 'Edited the organization\'s details'],
    [/\/me\/requests\//, null, 'Decided a student\'s request to join'],
    [/\/me\/teachers\/requests\//, null, 'Decided a teacher\'s request to join'],
    [/\/me\/teachers\/bulk$/, null, 'Uploaded teachers from a spreadsheet'],
    [/\/me\/teachers\/[^/]+\/card$/, null, 'Gave a teacher an AI card'],
    [/\/me\/teachers(\/|$)/, 'a teacher'],
    [/\/me\/students(\/|$)/, 'a student'],
    [/\/me\/cards(\/|$)/, 'student cards'],
    [/\/me\/nccnss\/units(\/|$)/, 'a Scouts & Guides unit'],
    [/\/me\/nccnss\/members\/[^/]+\/transfer$/, null, 'Transferred a member to another unit'],
    [/\/me\/nccnss\/members\/[^/]+\/awards$/, null, 'Recorded a rank, badge or training'],
    [/\/me\/nccnss\/awards(\/|$)/, 'a rank, badge or training'],
    [/\/me\/nccnss\/members(\/|$)/, 'an extra-curricular member'],
    [/\/me\/nccnss\/activities(\/|$)/, 'an extra-curricular activity'],
    [/\/me\/nccnss\/events\/[^/]+\/attendance$/, null, 'Took attendance'],
    [/\/me\/nccnss\/events(\/|$)/, 'an event'],
    [/\/me\/nccnss\/clubs(\/|$)/, 'a club'],
    [/\/me\/nccnss\/settings$/, null, 'Changed extra-curricular targets'],
    [/\/me\/(courses|modules|lessons)(\/|$)/, 'course content'],
    [/\/me\/bsg\/notices\/[^/]+\/attendance$/, null, 'Took attendance at an exam, camp or training'],
    [/\/me\/bsg\/notices(\/|$)/, 'a BSG notice'],
    [/\/competitions\/org(\/|$)/, 'a competition entry'],
    [/\/linguistic\//, 'English content']
];
OrgAuditLog.describe = (req) => {
    const path = String(req.originalUrl || '').split('?')[0].replace(/\/+$/, '');
    const verb = VERB[req.method] || 'Changed';
    for (const [pattern, noun, whole] of RULES) {
        if (pattern.test(path)) return whole || `${verb} ${noun}`;
    }
    const section = path.replace(/^\/api\/(organizations\/me\/)?/, '').split('/')[0] || 'something';
    return `${verb} ${section.replace(/-/g, ' ')}`;
};

module.exports = OrgAuditLog;
