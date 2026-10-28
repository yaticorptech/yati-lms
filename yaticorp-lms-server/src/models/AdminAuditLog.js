/**
 * @description The platform admin panel's audit trail: every change an
 * administrator makes (and every sign-in), for the super admin's "Admin audit
 * log" page.
 *
 * Rows live in the organizations' audit collection (org_audit_logs) rather
 * than a collection of their own: the Atlas cluster is at its collection limit.
 * They carry `scope: 'platform'` and no orgId, so OrgAuditLog's
 * per-organization view (which reads by orgId) never sees them. The audit page
 * reads both kinds.
 *
 * Written by `watch` from protectAdmin, so a new admin route is audited without
 * anyone remembering to. Best-effort: a failed write is logged and never fails
 * the action it describes. Request bodies are not stored, only a short list of
 * harmless fields (never passwords, tokens or codes).
 */
const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
    scope: { type: String, default: 'platform' },
    orgId: { type: mongoose.Schema.Types.ObjectId, default: null },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    // Copied at write time so the row still reads after the account is gone.
    adminName: { type: String, default: '' },
    adminEmail: { type: String, default: '' },
    role: { type: String, default: '' },
    action: { type: String, required: true, maxlength: 80 },
    label: { type: String, default: '', maxlength: 160 },
    area: { type: String, default: '' },
    method: { type: String, default: '' },
    path: { type: String, default: '', maxlength: 500 },
    status: { type: Number, default: null },
    ip: { type: String, default: '' },
    // What the action was done to, named at the time (a deleted student keeps their name here).
    target: { type: mongoose.Schema.Types.Mixed, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    // The same request again within a minute (an autosave, a double click) counts here instead of adding a row.
    repeats: { type: Number, default: 0 },
    at: { type: Date, default: Date.now }
}, { versionKey: false });

// The audit page: newest first across everything.
adminAuditLogSchema.index({ at: -1 });

const AdminAuditLog = mongoose.model('AdminAuditLog', adminAuditLogSchema, 'org_audit_logs');

// ── What a request did, in words ────────────────────────────────────────────
const AREAS = [
    [/^\/api\/auth\/admin/, 'Sign-in'],
    [/^\/api\/admin\/users/, 'Students'],
    [/^\/api\/admin\/teachers/, 'Teachers'],
    [/^\/api\/admin\/(courses|modules|lessons|bundles)/, 'Courses'],
    [/^\/api\/admin\/enrollments/, 'Enrollments'],
    [/^\/api\/admin\/cards/, 'Cards'],
    [/^\/api\/admin\/admins/, 'Admins'],
    [/^\/api\/(admin\/)?tickets/, 'Support'],
    [/^\/api\/admin\/settings/, 'Settings'],
    [/^\/api\/admin\/global-quiz/, 'Global Quiz'],
    [/^\/api\/admin\/announcements/, 'Announcements'],
    [/^\/api\/admin\/(reports|analytics)/, 'Analytics'],
    [/^\/api\/rewards\/admin\/recharge/, 'Wallet recharge'],
    [/^\/api\/rewards/, 'Rewards'],
    [/^\/api\/organizations/, 'Organizations'],
    [/^\/api\/competitions/, 'Competitions'],
    [/^\/api\/career/, 'Career Path'],
    [/^\/api\/jobs/, 'Jobs'],
    [/^\/api\/linguistic/, 'Linguistic'],
    [/^\/api\/community/, 'Community'],
    [/^\/api\/(bunny|vdocipher)/, 'Uploads']
];

const r = (s) => new RegExp(`^${s.replace(/:id/g, '[^/]+')}$`);
const RULES = [
    ['POST', r('/api/admin/users'), 'Added a student'],
    ['POST', r('/api/admin/users/bulk'), 'Bulk-uploaded students'],
    ['PUT', r('/api/admin/users/:id'), 'Edited a student'],
    ['DELETE', r('/api/admin/users/:id'), 'Deleted a student'],
    ['PUT', r('/api/admin/users/:id/status'), "Changed a student's status"],
    ['GET', r('/api/admin/users/:id/password'), "Viewed a student's password"],
    ['POST', r('/api/admin/users/:id/dashboard-access'), "Opened a student's dashboard"],
    ['PUT', r('/api/admin/users/:id/progress/:id'), "Changed a student's course progress"],
    ['DELETE', r('/api/admin/users/:id/progress/:id'), "Reset a student's course progress"],
    ['POST', r('/api/admin/courses'), 'Created a course'],
    ['PUT', r('/api/admin/courses/:id'), 'Edited a course'],
    ['DELETE', r('/api/admin/courses/:id'), 'Deleted a course'],
    ['POST', r('/api/admin/modules'), 'Added a module'],
    ['PUT', r('/api/admin/modules/reorder'), 'Reordered modules'],
    ['PUT', r('/api/admin/modules/:id'), 'Edited a module'],
    ['DELETE', r('/api/admin/modules/:id'), 'Deleted a module'],
    ['POST', r('/api/admin/lessons'), 'Added a lesson'],
    ['PUT', r('/api/admin/lessons/reorder'), 'Reordered lessons'],
    ['PUT', r('/api/admin/lessons/:id'), 'Edited a lesson'],
    ['DELETE', r('/api/admin/lessons/:id'), 'Deleted a lesson'],
    ['POST', /^\/api\/admin\/(courses|bundles)\/thumbnail$|^\/api\/admin\/lessons\/(upload|attachments)$/, 'Uploaded a file'],
    ['POST', r('/api/admin/bundles'), 'Created a bundle'],
    ['PUT', r('/api/admin/bundles/:id'), 'Edited a bundle'],
    ['DELETE', r('/api/admin/bundles/:id'), 'Deleted a bundle'],
    ['POST', r('/api/admin/enrollments'), 'Enrolled a student'],
    ['DELETE', r('/api/admin/enrollments/:id'), 'Removed an enrollment'],
    ['POST', r('/api/admin/cards/verify'), 'Verified cards'],
    ['POST', r('/api/admin/cards/scan'), 'Scanned cards'],
    ['POST', r('/api/admin/cards/verify-all'), 'Verified all waiting cards'],
    ['POST', r('/api/admin/cards/unverify-all'), 'Took back verification from cards'],
    ['POST', r('/api/admin/cards/:id/unverify'), "Took back a card's verification"],
    ['POST', r('/api/admin/admins'), 'Added an admin'],
    ['PUT', r('/api/admin/admins/:id'), 'Edited an admin'],
    ['DELETE', r('/api/admin/admins/:id'), 'Removed an admin'],
    ['PUT', r('/api/admin/tickets/:id'), 'Updated a support ticket'],
    ['PUT', r('/api/admin/settings'), 'Changed platform settings'],
    ['POST', r('/api/admin/global-quiz/quizzes'), 'Created a Global Quiz'],
    ['PUT', r('/api/admin/global-quiz/quizzes/:id'), 'Edited a Global Quiz'],
    ['DELETE', r('/api/admin/global-quiz/quizzes/:id'), 'Deleted a Global Quiz'],
    ['POST', r('/api/admin/global-quiz/quizzes/:id/publish'), 'Published a Global Quiz'],
    ['POST', r('/api/admin/global-quiz/quizzes/:id/unpublish'), 'Unpublished a Global Quiz'],
    ['POST', r('/api/admin/global-quiz/quizzes/:id/duplicate'), 'Duplicated a Global Quiz'],
    ['POST', r('/api/admin/announcements'), 'Posted an announcement'],
    ['PUT', r('/api/admin/announcements/:id'), 'Edited an announcement'],
    ['DELETE', r('/api/admin/announcements/:id'), 'Deleted an announcement'],
    ['GET', /^\/api\/admin\/reports\/export\//, 'Exported course analytics'],
    ['PUT', r('/api/rewards/admin/config'), 'Changed reward rules'],
    ['POST', r('/api/rewards/admin/badges'), 'Created a badge'],
    ['PUT', r('/api/rewards/admin/badges/:id'), 'Edited a badge'],
    ['DELETE', r('/api/rewards/admin/badges/:id'), 'Deleted a badge'],
    ['POST', r('/api/rewards/admin/users/:id/adjust'), "Adjusted a student's rewards"],
    ['POST', r('/api/rewards/admin/recharge/:id'), "Recharged a student's wallet"],
    ['PUT', r('/api/rewards/admin/withdrawals/:id'), 'Decided a withdrawal'],
    ['POST', r('/api/rewards/admin/jobs/run'), 'Ran the reward payouts'],
    ['POST', r('/api/auth/admin/setup-2fa'), 'Started two-factor setup'],
    ['POST', r('/api/auth/admin/enable-2fa'), 'Turned on two-factor sign-in']
];
const VERB = { POST: 'Created', PUT: 'Updated', PATCH: 'Updated', DELETE: 'Deleted', GET: 'Opened' };
const isId = (s) => /^[a-f0-9]{24}$/i.test(s) || /^\d{3,}$/.test(s);

const describe = (method, path) => {
    const area = (AREAS.find(([rx]) => rx.test(path)) || [null, 'Other'])[1];
    const rule = RULES.find(([m, rx]) => m === method && rx.test(path));
    if (rule) return { action: `${method} ${path.replace(/\/[a-f0-9]{24}|\/\d{3,}/gi, '/:id')}`.slice(0, 80), label: rule[2], area };
    // Anything without its own words: the verb and the last plain word of the path.
    const noun = path.split('/').filter((s) => s && !isId(s) && s !== 'api' && s !== 'admin').pop() || 'something';
    return { action: `${method} ${path.replace(/\/[a-f0-9]{24}|\/\d{3,}/gi, '/:id')}`.slice(0, 80), label: `${VERB[method] || method} ${noun.replace(/-/g, ' ')}`, area };
};

// ── What it was done to ─────────────────────────────────────────────────────
// The word before the first id in the path says where to look the name up.
const NAMED = {
    users: ['users', 'name', 'student'], recharge: ['users', 'name', 'student'],
    teachers: ['teachers', 'name', 'teacher'], admins: ['admins', 'name', 'admin'],
    organizations: ['organizations', 'name', 'organization'],
    courses: ['courses', 'title', 'course'], lessons: ['lessons', 'title', 'lesson'], modules: ['modules', 'title', 'module'],
    bundles: ['bundles', 'title', 'bundle'], announcements: ['announcements', 'title', 'announcement'],
    quizzes: ['global_quizzes', 'title', 'quiz'], badges: ['rewards_badges', 'name', 'badge'],
    tickets: ['tickets', 'subject', 'ticket'], competitions: ['competitions', 'title', 'competition'],
    cards: ['cards', 'CardNumber', 'card']
};
const lookupTarget = async (path) => {
    const parts = path.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
        const id = parts[i];
        if (!isId(id)) continue;
        let key = parts[i - 1];
        if (key === 'admin' && parts[1] === 'organizations') key = 'organizations';
        const spec = NAMED[key];
        if (!spec) return { id };
        const [collection, field, kind] = spec;
        const ids = /^[a-f0-9]{24}$/i.test(id) ? [id, new mongoose.Types.ObjectId(id)] : [id];
        const doc = await mongoose.connection.db.collection(collection).findOne({ _id: { $in: ids } }, { projection: { [field]: 1 } });
        return { id, kind, name: doc?.[field] ? String(doc[field]).slice(0, 120) : '' };
    }
    return null;
};

// ── What it was given ───────────────────────────────────────────────────────
const SAFE = ['name', 'email', 'title', 'subject', 'status', 'role', 'decision', 'kind', 'source', 'type', 'amount', 'note', 'reason', 'isPublished', 'published', 'state'];
const safeBody = (body) => {
    if (!body || typeof body !== 'object') return {};
    const out = {};
    for (const k of SAFE) {
        const v = body[k];
        if (v == null || v === '') continue;
        if (['string', 'number', 'boolean'].includes(typeof v)) out[k] = typeof v === 'string' ? v.slice(0, 120) : v;
    }
    // A list (cards to verify, students to enroll): how many, not the list.
    for (const [k, v] of Object.entries(body)) if (Array.isArray(v) && Object.keys(out).length < 20) out[`${k}Count`] = v.length;
    return out;
};

const clientIp = (req) => String(req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req?.ip || '';

/**
 * Record one action. Never throws. `action`/`label`/`area` may be given (a
 * sign-in); otherwise they are worked out from the request.
 */
AdminAuditLog.record = async ({ admin, req, action, label, area, status = null, target = null, details = {} }) => {
    try {
        const method = req?.method || '';
        const path = String(req?.originalUrl || '').split('?')[0].slice(0, 500);
        const d = action ? { action, label: label || action, area: area || 'Other' } : describe(method, path);
        const adminId = admin?._id || null;
        const merged = await AdminAuditLog.findOneAndUpdate(
            { scope: 'platform', adminId, action: d.action, path, status, at: { $gte: new Date(Date.now() - 60000) } },
            { $set: { at: new Date() }, $inc: { repeats: 1 } }
        );
        if (merged) return;
        await AdminAuditLog.create({
            adminId, adminName: admin?.name || admin?.email || '', adminEmail: admin?.email || '', role: admin?.role || '',
            ...d, method, path, status, ip: clientIp(req), target, details
        });
    } catch (error) {
        console.error('[audit] write failed:', error.message);
    }
};

const WRITES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Rows still being written (each lands just after its response has gone out).
const pending = new Set();
/** Wait for every row still being written (tests clean up after them). */
AdminAuditLog.settle = () => Promise.allSettled([...pending]);
const SENSITIVE_READS = [r('/api/admin/users/:id/password'), /^\/api\/admin\/reports\/export\//];

/**
 * Called by protectAdmin once the admin is known: a change (or a sensitive
 * read) is recorded when its response has gone out. The name of what it was
 * done to is looked up now, before a delete can remove it.
 */
AdminAuditLog.watch = (req, res) => {
    if (req.auditWatched) return;
    const path = String(req.originalUrl || '').split('?')[0];
    if (!WRITES.has(req.method) && !(req.method === 'GET' && SENSITIVE_READS.some((rx) => rx.test(path)))) return;
    req.auditWatched = true;
    const target = lookupTarget(path).catch(() => null);
    res.on('finish', () => {
        // Organization actions write their own, better-worded row (OrgAuditLog).
        if (req.orgAudited) return;
        const write = target.then((t) => AdminAuditLog.record({ admin: req.admin, req, status: res.statusCode, target: t, details: safeBody(req.body) }));
        pending.add(write);
        write.finally(() => pending.delete(write));
    });
};

AdminAuditLog.describe = describe;
module.exports = AdminAuditLog;
