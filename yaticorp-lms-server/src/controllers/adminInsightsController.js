/**
 * @description The admin panel's two whole-platform pages: Overall analytics
 * (every part of the site in one place) and the Admin audit log (who did what).
 *
 * Analytics reads the collections directly by name, as counts and small
 * aggregates, so one page can cover modules that each keep their own models.
 */
const mongoose = require('mongoose');
const AdminAuditLog = require('../models/AdminAuditLog');
const Admin = require('../models/Admin');

const TZ = 'Asia/Kolkata';
const DAY = 86400000;
const dayKey = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD

// Where a student's activity is recorded, and the date that says when.
const ACTIVITY = [
    ['rewards_xp_transactions', 'createdAt'],
    ['rewards_learning_activities', 'createdAt'],
    ['progresses', 'updatedAt'],
    ['interview_sessions', 'createdAt'],
    ['linguistic_attempts', 'createdAt'],
    ['global_quiz_attempts', 'createdAt'],
    ['career_daily_activities', 'createdAt'],
    ['jobboard_searches', 'createdAt'],
    ['jobboard_job_applications', 'createdAt']
];

// Each feature: the collection, what to count, and the date field.
const FEATURES = [
    ['interviews', 'Mock interviews', 'interview_sessions', {}, 'createdAt'],
    ['career', 'Career Path day plans', 'career_daily_plans', {}, 'createdAt'],
    ['linguistic', 'Language practice attempts', 'linguistic_attempts', {}, 'createdAt'],
    ['globalQuiz', 'Global Quiz attempts', 'global_quiz_attempts', {}, 'createdAt'],
    ['games', 'Games played', 'competition_games', { status: 'finished' }, 'createdAt'],
    ['jobSearches', 'Job searches', 'jobboard_searches', {}, 'createdAt'],
    ['jobApplications', 'Part-time applications', 'jobboard_job_applications', {}, 'createdAt'],
    ['community', 'Community posts', 'communityposts', {}, 'createdAt'],
    ['theses', 'Teacher theses', 'theses', {}, 'createdAt'],
    ['publications', 'Teacher publications', 'publications', {}, 'createdAt'],
    ['writing', 'Teacher writing pieces', 'writingpieces', {}, 'createdAt'],
    ['plagiarism', 'Plagiarism checks', 'plagiarismreports', {}, 'createdAt'],
    ['nccnss', 'NCC / NSS events', 'nccnss_events', {}, 'createdAt']
];

let cache = null; // { at, data }

// @desc    Everything on the platform in one view
// @route   GET /api/admin/overall-analytics?fresh=1
// @access  Private/Admin
const getOverallAnalytics = async (req, res) => {
    try {
        if (cache && !req.query.fresh && Date.now() - cache.at < 60000) return res.json(cache.data);
        const db = mongoose.connection.db;
        const c = (name) => db.collection(name);
        const count = (name, q = {}) => c(name).countDocuments(q).catch(() => 0);
        const sum = (name, match, field) => c(name).aggregate([{ $match: match }, { $group: { _id: null, v: { $sum: `$${field}` } } }]).toArray().then((r) => r[0]?.v || 0).catch(() => 0);
        const groupBy = (name, field, match = {}) => c(name).aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $sort: { n: -1 } }]).toArray().catch(() => []);
        const now = Date.now();
        const since7 = new Date(now - 7 * DAY);
        const since30 = new Date(now - 30 * DAY);
        // 30 days of buckets, oldest first, ending today.
        const days = Array.from({ length: 30 }, (_, i) => dayKey(now - (29 - i) * DAY));

        const [
            students, new7, new30, inOrg, accountTypes, teachers, teachersNew30, orgStatus, adminRoles,
            courses, publishedCourses, enrollments, enrollments30, completions, completions30, avgProgress, certificates, certificates30,
            topCourseRows, topOrgRows, signupRows,
            xp30, xpTotal, walletAvailable, walletSpent, recharged, charges30, badges, streaks,
            cardStatus, cardsVerified, ticketStatus
        ] = await Promise.all([
            count('users'), count('users', { createdAt: { $gte: since7 } }), count('users', { createdAt: { $gte: since30 } }),
            count('users', { organizationId: { $ne: null } }), groupBy('users', 'accountType'),
            count('teachers'), count('teachers', { createdAt: { $gte: since30 } }), groupBy('organizations', 'status'), groupBy('admins', 'role'),
            count('courses'), count('courses', { isPublished: true }), count('enrollments'), count('enrollments', { createdAt: { $gte: since30 } }),
            count('progresses', { percentage: { $gte: 100 } }), count('progresses', { percentage: { $gte: 100 }, updatedAt: { $gte: since30 } }),
            c('progresses').aggregate([{ $group: { _id: null, v: { $avg: '$percentage' } } }]).toArray().then((r) => Math.round(r[0]?.v || 0)).catch(() => 0),
            count('certificates'), count('certificates', { createdAt: { $gte: since30 } }),
            c('enrollments').aggregate([{ $group: { _id: '$courseId', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 }]).toArray().catch(() => []),
            c('users').aggregate([{ $match: { organizationId: { $ne: null } } }, { $group: { _id: '$organizationId', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 5 }]).toArray().catch(() => []),
            c('users').aggregate([{ $match: { createdAt: { $gte: new Date(now - 31 * DAY) } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } }]).toArray().catch(() => []),
            sum('rewards_xp_transactions', { createdAt: { $gte: since30 } }, 'amount'), sum('users', {}, 'xp'),
            sum('rewards_wallets', {}, 'available'), sum('rewards_wallets', {}, 'totalSpent'),
            sum('rewards_wallet_transactions', { source: 'wallet_recharge', type: 'credit', status: 'completed' }, 'amount'),
            sum('rewards_wallet_transactions', { source: 'feature_charge', type: 'debit', createdAt: { $gte: since30 } }, 'amount'),
            count('rewards_user_badges'), count('rewards_streaks', { current: { $gte: 2 } }),
            groupBy('cards', 'status'), count('cards', { verified: true }), groupBy('tickets', 'status')
        ]);

        // Active students: anyone with any recorded activity, per day for 30 days.
        const perDay = Object.fromEntries(days.map((d) => [d, new Set()]));
        await Promise.all(ACTIVITY.map(([name, field]) => c(name).aggregate([
            { $match: { [field]: { $gte: new Date(now - 31 * DAY) }, userId: { $ne: null } } },
            { $group: { _id: { d: { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: TZ } }, u: '$userId' } } }
        ]).toArray().then((rows) => rows.forEach(({ _id }) => perDay[_id.d]?.add(String(_id.u)))).catch(() => {})));
        const union = (list) => list.reduce((all, d) => { perDay[d].forEach((u) => all.add(u)); return all; }, new Set()).size;

        const features = await Promise.all(FEATURES.map(([key, label, name, q, field]) => Promise.all([count(name, q), count(name, { ...q, [field]: { $gte: since30 } })])
            .then(([total, last30]) => ({ key, label, total, last30 }))));

        // Names for the top lists.
        const courseIds = topCourseRows.map((r) => r._id).filter((v) => v != null);
        const courseNames = Object.fromEntries((await c('courses').find({ _id: { $in: courseIds } }, { projection: { title: 1 } }).toArray().catch(() => [])).map((x) => [String(x._id), x.title]));
        const orgNames = Object.fromEntries((await c('organizations').find({ _id: { $in: topOrgRows.map((r) => r._id) } }, { projection: { name: 1 } }).toArray().catch(() => [])).map((x) => [String(x._id), x.name]));
        const signups = Object.fromEntries(signupRows.map((r) => [r._id, r.n]));
        const byKey = (rows) => Object.fromEntries(rows.map((r) => [r._id ?? 'none', r.n]));

        const data = {
            generatedAt: new Date(),
            people: {
                students, new7, new30, inOrganizations: inOrg,
                // An account from before the field existed counts as the default type.
                accountTypes: Object.entries(accountTypes.reduce((all, r) => { const t = r._id || 'school_student'; all[t] = (all[t] || 0) + r.n; return all; }, {}))
                    .map(([type, n]) => ({ type, n })).sort((x, y) => y.n - x.n),
                teachers, teachersNew30,
                organizations: byKey(orgStatus),
                admins: byKey(adminRoles)
            },
            active: { today: perDay[days[29]].size, week: union(days.slice(-7)), month: union(days) },
            daily: days.map((d) => ({ day: d, signups: signups[d] || 0, active: perDay[d].size })),
            learning: {
                courses, publishedCourses, enrollments, enrollments30, completions, completions30, avgProgress, certificates, certificates30,
                topCourses: topCourseRows.map((r) => ({ id: r._id, title: courseNames[String(r._id)] || 'Removed course', enrollments: r.n }))
            },
            features,
            rewards: { xp30, xpTotal, walletAvailable, walletSpent, recharged, charges30, badges, streaks },
            cards: { byStatus: byKey(cardStatus), verified: cardsVerified },
            support: byKey(ticketStatus),
            topOrganizations: topOrgRows.map((r) => ({ id: r._id, name: orgNames[String(r._id)] || 'Removed organization', students: r.n }))
        };
        cache = { at: Date.now(), data };
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Organization rows (OrgAuditLog) keep a short action key; these are its words.
const ORG_ACTIONS = {
    status: "Changed an organization's status",
    edit: 'Edited an organization',
    'course-access': "Changed an organization's course access",
    'access-hours': "Changed an organization's access hours",
    'assign-student': 'Assigned a student to an organization',
    'unassign-student': 'Removed a student from an organization',
    'add-student': 'Added a student to an organization',
    'send-password-reset': "Sent an organization admin a password reset",
    'view-mode-write': "Made a change inside an organization's panel",
    'link-cards': 'Linked cards to an organization',
    'unlink-card': 'Unlinked a card from an organization',
    delete: 'Deleted an organization'
};
const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    What the admin panel's admins did, newest first (2026-10-28:
//          super admins and admins; organization admins' own rows are kept,
//          not shown)
// @route   GET /api/admin/audit-log?q=&adminId=&area=&scope=&days=&skip=&limit=
// @access  Private/Superadmin
const getAuditLog = async (req, res) => {
    try {
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
        const skip = Math.max(0, Number(req.query.skip) || 0);
        // A platform admin's row: its stored role says so, or (organization
        // rows, which kept no role before) its account is a platform admin's.
        const PLATFORM_ROLES = ['superadmin', 'admin'];
        const [liveIds, platform] = await Promise.all([Admin.distinct('_id'), Admin.find({ role: { $in: PLATFORM_ROLES } }).select('name email role').lean()]);
        const SUPER = { $or: [{ role: { $in: PLATFORM_ROLES } }, { adminId: { $in: platform.map((a) => a._id) } }] };
        const and = [SUPER];
        // `removed`: admins whose account has since been deleted.
        if (req.query.adminId === 'removed') and.push({ adminId: { $nin: liveIds, $ne: null } });
        if (req.query.scope === 'platform') and.push({ scope: 'platform' });
        if (req.query.scope === 'organizations') and.push({ orgId: { $ne: null } });
        if (req.query.adminId && mongoose.isValidObjectId(req.query.adminId)) and.push({ adminId: new mongoose.Types.ObjectId(req.query.adminId) });
        if (req.query.area) and.push(req.query.area === 'Organizations' ? { $or: [{ area: 'Organizations' }, { orgId: { $ne: null } }] } : { area: String(req.query.area) });
        const daysBack = Number(req.query.days);
        if (daysBack > 0) and.push({ at: { $gte: new Date(Date.now() - daysBack * DAY) } });
        if (req.query.q && String(req.query.q).trim()) {
            const rx = new RegExp(escape(String(req.query.q).trim()), 'i');
            const orgKeys = Object.entries(ORG_ACTIONS).filter(([, v]) => rx.test(v)).map(([k]) => k);
            and.push({ $or: [{ adminName: rx }, { adminEmail: rx }, { label: rx }, { path: rx }, { 'target.name': rx }, { 'details.studentName': rx }, ...(orgKeys.length ? [{ action: { $in: orgKeys } }] : [])] });
        }
        const q = and.length ? { $and: and } : {};
        const coll = AdminAuditLog.collection;
        const [rows, total, actorIds] = await Promise.all([
            coll.find(q).sort({ at: -1 }).skip(skip).limit(limit).toArray(),
            coll.countDocuments(q),
            coll.distinct('adminId', { $and: [SUPER, { adminId: { $ne: null } }] })
        ]);
        // The admin filter: every platform admin account, super admins first,
        // each with its email (two people can share a name). Deleted accounts
        // are one choice, "removed", rather than a name each.
        const admins = platform.sort((a, b) => (a.role === b.role ? 0 : a.role === 'superadmin' ? -1 : 1) || (a.name || '').localeCompare(b.name || '') || (a.email || '').localeCompare(b.email || ''));
        const live = new Set(liveIds.map(String));
        const removed = actorIds.filter((id) => !live.has(String(id))).length;
        const orgIds = [...new Set(rows.filter((r) => r.orgId).map((r) => String(r.orgId)))].map((id) => new mongoose.Types.ObjectId(id));
        const orgNames = Object.fromEntries((await mongoose.connection.db.collection('organizations').find({ _id: { $in: orgIds } }, { projection: { name: 1 } }).toArray()).map((o) => [String(o._id), o.name]));
        res.json({
            total, skip, limit,
            admins: admins.map((a) => ({ _id: a._id, name: a.name || a.email, email: a.email, role: a.role || '' })), removed,
            rows: rows.map((r) => {
                const org = r.orgId ? { id: r.orgId, name: orgNames[String(r.orgId)] || 'Removed organization' } : null;
                // An HTTP status; an organization row's details.status may be the organization's new status instead.
                const status = typeof r.status === 'number' ? r.status : typeof r.details?.status === 'number' ? r.details.status : null;
                return {
                    _id: r._id, at: r.at, adminId: r.adminId, adminName: r.adminName || 'Unknown admin', role: r.role || '',
                    label: r.label || ORG_ACTIONS[r.action] || r.action, area: r.area || (org ? 'Organizations' : 'Other'),
                    method: r.method, path: r.path, status, ip: r.ip || '', repeats: r.repeats || 0,
                    target: r.target || (r.details?.studentName ? { kind: 'student', name: r.details.studentName } : null),
                    org, details: r.details || {}
                };
            })
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getOverallAnalytics, getAuditLog };
