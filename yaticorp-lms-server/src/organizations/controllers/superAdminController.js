/**
 * @description What the platform's superadmin can do with organizations:
 *              see every one of them, approve, reject, suspend and reinstate.
 *
 * Guarded by protectAdmin + superAdminOnly, the pair that already guards admin
 * account management, so the existing role hierarchy decides who gets here and
 * an ordinary platform admin does not.
 *
 * A rejected or suspended organization keeps its document, its code, its
 * memberships and every student's learning record; only its access changes.
 * The single deletion (deleteOrganization) is for a registration that was
 * rejected without ever having been approved, with nobody and nothing in it —
 * it releases the ID and the email for someone else, and touches no student.
 *
 * Every change made here is written to the organization's audit log
 * (models/OrgAuditLog.js), readable at GET /admin/:id/audit.
 */
const Organization = require('../models/Organization');
const JoinRequest = require('../models/JoinRequest');
const Admin = require('../../models/Admin');
const User = require('../../models/User');
const Course = require('../../models/Course');
const { checkNewOrgCode, isDuplicateOrgCode } = require('../services/orgCode');
const { validatePasswordStrength } = require('../../middleware/validatePassword');
const { withSummaries, studentDetail } = require('../services/studentProgress');
const { sendEmail } = require('../../utils/emailService');
const { escapeHtml, plainHeader } = require('../../utils/escapeHtml');
const { checkEmailChange, applyEmailChange } = require('../services/orgEmail');
const OrgAuditLog = require('../models/OrgAuditLog');

/** Opt-in paging (`?page=`): 1-based page, limit 25 by default and at most 100. */
const pageParams = (query) => ({
    page: Math.max(1, parseInt(query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25))
});

/** A search box's text as a literal, case-insensitive pattern. */
const searchPattern = (text) => new RegExp(String(text).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields a superadmin may edit. `orgCode` is absent on purpose. */
const EDITABLE = ['name', 'organizationType', 'logo', 'email', 'phone', 'address', 'website', 'contactPerson', 'expectedStudents'];

/** How many students each of these organizations has, in one query. */
const studentCounts = async (organizationIds) => {
    const counts = await User.aggregate([
        { $match: { organizationId: { $in: organizationIds } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } }
    ]);
    return new Map(counts.map((c) => [String(c._id), c.count]));
};

/** How many join requests each of these organizations has waiting. */
const pendingCounts = async (organizationIds) => {
    const counts = await JoinRequest.aggregate([
        { $match: { organizationId: { $in: organizationIds }, status: 'pending' } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } }
    ]);
    return new Map(counts.map((c) => [String(c._id), c.count]));
};

// @desc    Every organization, with filters for the list page
// @route   GET /api/organizations/admin
// @access  Private/SuperAdmin
const listOrganizations = async (req, res) => {
    try {
        const { status, type, search } = req.query;
        const filter = {};

        if (status && Organization.STATUSES.includes(status)) filter.status = status;
        if (type && Organization.TYPES.includes(type)) filter.organizationType = type;
        if (search && String(search).trim()) {
            // Escaped, because an organization name may legitimately contain
            // characters a regular expression would otherwise read as syntax.
            const safe = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(safe, 'i');
            filter.$or = [{ name: pattern }, { orgCode: pattern }, { email: pattern }, { contactPerson: pattern }];
        }

        // Paging is opt-in: without `page` every organization comes back, as before.
        const paged = req.query.page !== undefined;
        const { page, limit } = pageParams(req.query);
        let listing = Organization.find(filter).select('-statusHistory').sort({ createdAt: -1, _id: 1 });
        if (paged) listing = listing.skip((page - 1) * limit).limit(limit);
        const [organizations, total] = await Promise.all([
            listing.lean(),
            paged ? Organization.countDocuments(filter) : null
        ]);

        const ids = organizations.map((o) => o._id);
        const [students, pending, courses] = await Promise.all([
            studentCounts(ids), pendingCounts(ids),
            Course.aggregate([{ $match: { organizationId: { $in: ids } } }, { $group: { _id: '$organizationId', count: { $sum: 1 } } }])
                .then((rows) => new Map(rows.map((r) => [String(r._id), r.count])))
        ]);

        // Counts across everything, not across the filtered set, so the status
        // chips show how many are waiting even while a filter is applied.
        const totals = await Organization.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            organizations: organizations.map((o) => ({
                ...o,
                typeLabel: Organization.TYPE_LABELS[o.organizationType] || 'Other',
                studentCount: students.get(String(o._id)) || 0,
                pendingRequests: pending.get(String(o._id)) || 0,
                // Whether it may publish its own courses, and how many it has.
                courseAccess: { enabled: Boolean(o.courseAccess?.enabled), limit: o.courseAccess?.limit || 5 },
                courseCount: courses.get(String(o._id)) || 0,
                canHostCompetitions: Boolean(o.canHostCompetitions)
            })),
            totals: Organization.STATUSES.reduce((acc, s) => {
                acc[s] = totals.find((t) => t._id === s)?.count || 0;
                return acc;
            }, { all: totals.reduce((sum, t) => sum + t.count, 0) }),
            types: Organization.TYPES.map((value) => ({ value, label: Organization.TYPE_LABELS[value] })),
            ...(paged ? { total, page, limit } : {})
        });
    } catch (error) {
        console.error('[organizations] list failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    One organization in full, for the review panel
// @route   GET /api/organizations/admin/:id
// @access  Private/SuperAdmin
const getOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).lean();
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        const [admins, studentCount, pendingRequests, courseCount] = await Promise.all([
            Admin.find({ organizationId: organization._id })
                .select('name email role isTwoFactorEnabled createdAt')
                .lean(),
            User.countDocuments({ organizationId: organization._id }),
            JoinRequest.countDocuments({ organizationId: organization._id, status: 'pending' }),
            Course.countDocuments({ organizationId: organization._id })
        ]);

        res.json({
            organization: {
                ...organization,
                typeLabel: Organization.TYPE_LABELS[organization.organizationType] || 'Other',
                courseAccess: { enabled: Boolean(organization.courseAccess?.enabled), limit: organization.courseAccess?.limit || 5 },
                canHostCompetitions: Boolean(organization.canHostCompetitions)
            },
            admins,
            studentCount,
            pendingRequests,
            courseCount
        });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Let an organization publish its own courses, and how many
// @route   PUT /api/organizations/admin/:id/course-access
// @access  Private/SuperAdmin
//
// Switching it off hides nothing and deletes nothing: the organization's
// courses stay with their students, but its administrator cannot add or edit
// courses until it is switched back on. A limit below the courses already
// made is allowed — it simply stops new ones — so a superadmin can cap an
// organization without deleting its work.
const setCourseAccess = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        const { enabled, limit } = req.body || {};
        if (enabled !== undefined && typeof enabled !== 'boolean') return res.status(400).json({ message: 'Say whether courses are on or off.' });
        if (limit !== undefined && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 500)) {
            return res.status(400).json({ message: 'The course limit must be a whole number from 1 to 500.' });
        }
        const current = organization.courseAccess || {};
        organization.courseAccess = {
            enabled: enabled !== undefined ? enabled : Boolean(current.enabled),
            limit: limit !== undefined ? Number(limit) : (current.limit || 5)
        };
        await organization.save();
        await OrgAuditLog.record({ orgId: organization._id, admin: req.admin, action: 'course-access', req, details: { ...organization.courseAccess } });
        const courseCount = await Course.countDocuments({ organizationId: organization._id });
        res.json({
            message: organization.courseAccess.enabled
                ? `${organization.name} can now have up to ${organization.courseAccess.limit} course${organization.courseAccess.limit === 1 ? '' : 's'}.`
                : `Courses are switched off for ${organization.name}.`,
            courseAccess: organization.courseAccess,
            courseCount
        });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Let an organization host its own competitions, or stop it
// @route   PUT /api/organizations/admin/:id/competition-hosting { enabled }
// @access  Private/SuperAdmin
// Switching it off keeps the competitions it already made; the platform
// admin runs them from then on.
const setCompetitionHosting = async (req, res) => {
    try {
        const { enabled } = req.body || {};
        if (typeof enabled !== 'boolean') return res.status(400).json({ message: 'Say whether hosting is on or off.' });
        const organization = await Organization.findByIdAndUpdate(req.params.id, { $set: { canHostCompetitions: enabled } }, { returnDocument: 'after' });
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        res.json({
            message: enabled
                ? `${organization.name} can now host competitions.`
                : `${organization.name} can no longer host competitions.`,
            canHostCompetitions: organization.canHostCompetitions
        });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create an organization directly, with its administrator
// @route   POST /api/organizations/admin
// @access  Private/SuperAdmin
const createOrganization = async (req, res) => {
    try {
        const { name, organizationType, contactPerson, email, phone, address, website, expectedStudents, password } = req.body;

        if (!name || String(name).trim().length < 2) return res.status(400).json({ message: 'Enter the organization name.' });
        if (String(name).trim().length > 150) return res.status(400).json({ message: 'The organization name is too long.' });
        if (!organizationType || !Organization.TYPES.includes(organizationType)) {
            return res.status(400).json({ message: 'Choose the kind of organization.' });
        }
        if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
            return res.status(400).json({ message: 'Enter a valid official email address.' });
        }
        const passwordError = validatePasswordStrength(password);
        if (passwordError) return res.status(400).json({ message: passwordError });

        // Typed by the superadmin, as the organization would choose it — never generated.
        const chosen = await checkNewOrgCode(req.body.orgCode);
        if (chosen.error) return res.status(chosen.taken ? 409 : 400).json({ message: chosen.error, field: 'orgCode' });

        const cleanEmail = String(email).trim().toLowerCase();
        if (await Organization.findOne({ email: cleanEmail })) {
            return res.status(400).json({ message: 'An organization is already registered with that email address.' });
        }
        // Case-insensitive, like the login, so a case variant is refused too.
        if (await Admin.findByLoginEmail(cleanEmail)) {
            return res.status(400).json({ message: 'That email address is already in use on this platform.' });
        }

        // A superadmin creating an organization by hand has already decided to
        // admit it, so it opens active rather than waiting for its own approval.
        const organization = await Organization.create({
            orgCode: chosen.code,
            name: String(name).trim(),
            organizationType,
            email: cleanEmail,
            phone: phone ? String(phone).trim() : '',
            address: address ? String(address).trim().slice(0, 400) : '',
            website: website ? String(website).trim().slice(0, 200) : '',
            contactPerson: contactPerson ? String(contactPerson).trim().slice(0, 120) : '',
            expectedStudents: expectedStudents ? Number(expectedStudents) : null,
            status: 'active',
            approvedAt: new Date(),
            statusHistory: [{
                status: 'active',
                reason: 'Created by a platform superadmin',
                at: new Date(),
                byAdminId: req.admin._id,
                byName: req.admin.name
            }]
        });

        try {
            await Admin.create({
                name: contactPerson ? String(contactPerson).trim().slice(0, 120) : String(name).trim().slice(0, 120),
                email: cleanEmail,
                password,
                role: 'orgadmin',
                organizationId: organization._id
            });
        } catch (error) {
            await Organization.deleteOne({ _id: organization._id }).catch(() => {});
            throw error;
        }

        res.status(201).json({
            message: `${organization.name} was created with organization ID ${organization.orgCode}.`,
            organization
        });
    } catch (error) {
        console.error('[organizations] create failed:', error);
        if (isDuplicateOrgCode(error)) return res.status(409).json({ message: 'That organization ID already exists. Try another.', field: 'orgCode' });
        if (error.code === 11000) return res.status(400).json({ message: 'That email address is already in use.' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Edit an organization's details
// @route   PUT /api/organizations/admin/:id
// @access  Private/SuperAdmin
const updateOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        let emailChange = null;

        // Only the listed fields are read from the body. `orgCode` and `status`
        // cannot be changed here even if they are sent — the code is permanent,
        // and a status change goes through setOrganizationStatus so that it is
        // always recorded with a reason and an author.
        for (const field of EDITABLE) {
            if (req.body[field] === undefined) continue;
            if (field === 'expectedStudents') {
                const raw = req.body[field];
                organization.expectedStudents = raw === '' || raw === null ? null : Number(raw);
                continue;
            }
            if (field === 'organizationType') {
                if (!Organization.TYPES.includes(req.body[field])) {
                    return res.status(400).json({ message: 'Unknown organization type.' });
                }
                organization.organizationType = req.body[field];
                continue;
            }
            if (field === 'email') {
                // Also the organization admin's sign-in: checked against every
                // account and written to both together, after the loop.
                emailChange = await checkEmailChange(organization, String(req.body.email));
                if (emailChange.error) return res.status(emailChange.status).json({ message: emailChange.error });
                continue;
            }
            const value = String(req.body[field]).trim();
            // `name` is required by the schema; blanking it here would surface as
            // a ValidationError and a 500 rather than as the mistake it is.
            if (field === 'name' && value.length < 2) {
                return res.status(400).json({ message: 'Enter the organization name.' });
            }
            organization[field] = value;
        }

        const changed = organization.modifiedPaths().filter((f) => EDITABLE.includes(f));
        if (emailChange && !emailChange.unchanged) { await applyEmailChange(organization, emailChange); changed.push('email'); }
        else await organization.save();
        await OrgAuditLog.record({ orgId: organization._id, admin: req.admin, action: 'edit', req, details: { fields: changed } });
        res.json({ message: 'Organization updated.', organization });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        // A field past its length limit is the caller's mistake, and the schema
        // already says which field and why.
        if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
        // Someone took the address between the check and the write.
        if (error.code === 11000) return res.status(400).json({ message: 'That email address is already in use on this platform.' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Email an organization's admin a link to choose a new password
 * @route   POST /api/organizations/admin/:id/send-password-reset
 * @access  Private/SuperAdmin
 *
 * For an organization that has lost its password and cannot get the email to
 * itself. The superadmin never sees or sets the password: the one-hour,
 * one-use link goes to the account's own sign-in address, the same link the
 * public "Forgot password?" form sends. There is deliberately no way here to
 * type a password in for them.
 */
const sendAdminPasswordReset = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).select('name email').lean();
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        const admins = await Admin.find({ role: 'orgadmin', organizationId: organization._id });
        const admin = admins.find((a) => a.email === organization.email) || (admins.length === 1 ? admins[0] : null);
        if (!admin) return res.status(404).json({ message: 'This organization has no administrator account to reset.' });

        const { issueAdminPasswordReset } = require('../../services/adminPasswordReset');
        try {
            await issueAdminPasswordReset(admin);
        } catch (error) {
            console.error('[organizations] reset email failed:', error.message);
            return res.status(502).json({ message: 'The reset email could not be sent. Check the email settings and try again.' });
        }
        console.log(`[organizations] ${req.admin.name || req.admin.email} (${req.admin._id}) sent a password reset link to the admin of ${organization.name} (${organization._id})`);
        await OrgAuditLog.record({ orgId: organization._id, admin: req.admin, action: 'send-password-reset', req, details: { to: admin.email } });
        res.json({ message: `A password reset link was sent to ${admin.email}. It works once, for one hour.` });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/** What each decision is called in the email and the history entry. */
const STATUS_WORDING = {
    active: { subject: 'Your organization has been approved', verb: 'approved' },
    rejected: { subject: 'About your organization registration', verb: 'not approved' },
    suspended: { subject: 'Your organization has been suspended', verb: 'suspended' },
    inactive: { subject: 'Your organization has been deactivated', verb: 'deactivated' }
};

/**
 * Which status may follow which — the same moves the admin app offers:
 * a new application is approved or rejected; an active organization is
 * suspended or deactivated; anything closed can be reinstated. Nothing goes
 * back to pending, and nothing jumps between closed states (a rejected
 * application is not "suspended").
 */
const ALLOWED_TRANSITIONS = {
    pending: ['active', 'rejected'],
    active: ['suspended', 'inactive'],
    suspended: ['active'],
    inactive: ['active'],
    rejected: ['active']
};

/** Said to a student whose request was waiting when the organization closed. */
const NOT_ACCEPTING = 'Organization is not accepting members';

// @desc    Approve, reject, suspend or reinstate an organization
// @route   PUT /api/organizations/admin/:id/status
// @access  Private/SuperAdmin
const setOrganizationStatus = async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!Organization.STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Unknown status.' });
        }
        // Nothing may be pushed back into the queue it has already left; that
        // would leave an approved organization looking like a new application.
        if (status === 'pending') {
            return res.status(400).json({ message: 'An organization cannot be put back into review.' });
        }
        if (status === 'rejected' && !String(reason || '').trim()) {
            return res.status(400).json({ message: 'Give a reason for the rejection so the organization can be told why.' });
        }

        const organization = await Organization.findById(req.params.id);
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        if (organization.status === status) {
            return res.status(400).json({ message: `This organization is already ${status}.` });
        }
        if (!(ALLOWED_TRANSITIONS[organization.status] || []).includes(status)) {
            return res.status(400).json({
                code: 'ILLEGAL_TRANSITION',
                message: `A ${organization.status} organization cannot be made ${status}.`
            });
        }

        const previousStatus = organization.status;
        organization.status = status;
        organization.statusReason = String(reason || '').trim().slice(0, 500);
        // Set once and kept, so "approved on" survives a later suspension.
        if (status === 'active' && !organization.approvedAt) organization.approvedAt = new Date();
        organization.statusHistory.push({
            status,
            reason: organization.statusReason,
            at: new Date(),
            byAdminId: req.admin._id,
            byName: req.admin.name
        });

        await organization.save();

        // Requests waiting for an organization that can no longer decide them
        // would sit pending forever and block the student from asking anywhere
        // else (one pending request per student). They are closed with a
        // reason the student is shown.
        let cancelledRequests = 0;
        if (status !== 'active') {
            const closed = await JoinRequest.updateMany(
                { organizationId: organization._id, status: 'pending' },
                { $set: { status: 'cancelled', decisionReason: NOT_ACCEPTING, decidedAt: new Date(), decidedBy: req.admin._id } }
            );
            cancelledRequests = closed.modifiedCount || 0;
        }
        await OrgAuditLog.record({
            orgId: organization._id, admin: req.admin, action: 'status', req,
            details: { from: previousStatus, to: status, reason: organization.statusReason, cancelledRequests }
        });

        // Existing memberships and every student's learning record are left
        // exactly as they are. Suspension withdraws access, it does not undo
        // anything that has happened.
        // Name, contact and reason are typed by people (the name by whoever
        // registered), so every one is escaped; the platform must not mail out
        // markup or links on their behalf.
        const wording = STATUS_WORDING[status];
        if (wording) {
            const greetName = escapeHtml(organization.contactPerson || organization.name);
            sendEmail({
                to: organization.email,
                toName: plainHeader(organization.contactPerson || organization.name),
                subject: wording.subject,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <h2 style="color: #4F46E5;">${wording.subject}</h2>
                        <p>Hi <strong>${greetName}</strong>,</p>
                        <p><strong>${escapeHtml(organization.name)}</strong> has been ${wording.verb}.</p>
                        ${organization.statusReason ? `<p><strong>Reason:</strong> ${escapeHtml(organization.statusReason)}</p>` : ''}
                        ${status === 'active' ? `
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p style="margin: 0 0 8px 0;"><strong>Organization ID:</strong> ${escapeHtml(organization.orgCode)}</p>
                                <p style="margin: 0; font-size: 0.9em; color: #6b7280;">Share this ID with your students so
                                   they can ask to join your organization.</p>
                            </div>` : ''}
                    </div>`
            }).catch((error) => console.error('[organizations] status email failed:', error.message));
        }

        res.json({ message: `${organization.name} is now ${status}.`, organization });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        console.error('[organizations] status change failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    One organization's students, with their progress
// @route   GET /api/organizations/admin/:id/students
// @access  Private/SuperAdmin
const getOrganizationStudents = async (req, res) => {
    try {
        // `status` travels with it so the popup knows whether assigning into this
        // organization is possible at all — the assign endpoint refuses anything
        // that is not active.
        const organization = await Organization.findById(req.params.id).select('name orgCode status').lean();
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        // Opt-in paging and search (`?page=&limit=&search=`), by name, in the
        // database, so only the returned page is summarised. Without `page`
        // the whole list comes back, as before.
        if (req.query.page !== undefined) {
            const { page, limit } = pageParams(req.query);
            const query = { organizationId: organization._id };
            if (String(req.query.search || '').trim()) {
                const pattern = searchPattern(req.query.search);
                query.$or = [{ name: pattern }, { email: pattern }, { cardNumber: pattern }];
            }
            const [total, students] = await Promise.all([
                User.countDocuments(query),
                User.find(query).select('-password').sort({ name: 1, _id: 1 })
                    .collation({ locale: 'en', strength: 2 })
                    .skip((page - 1) * limit).limit(limit).lean()
            ]);
            return res.json({ organization, students: await withSummaries(students, organization._id), total, page, limit });
        }

        const students = await User.find({ organizationId: req.params.id })
            .select('-password')
            .sort({ name: 1 })
            .lean();

        // Numbers as this organization sees them, without other organizations'
        // private courses a student may have taken before moving here.
        res.json({ organization, students: await withSummaries(students, organization._id) });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Students a superadmin could put into this organization
 * @route   GET /api/organizations/admin/:id/assignable?search=
 * @access  Private/SuperAdmin
 *
 * Everyone who is not already in it, so a student can be moved from another
 * organization as well as picked up from none. Which of those it would be is
 * said per row, because moving someone out of their current institution is not
 * something to do without noticing.
 *
 * Capped and search-driven: a platform with thousands of students should not
 * send all of them to fill a picker.
 */
const getAssignableStudents = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).select('_id').lean();
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        const filter = { organizationId: { $ne: organization._id } };
        const search = String(req.query.search || '').trim();
        if (search) {
            const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(safe, 'i');
            filter.$or = [{ name: pattern }, { email: pattern }, { cardNumber: pattern }];
        }

        const students = await User.find(filter)
            .select('name email cardNumber status organizationId')
            .populate('organizationId', 'name orgCode')
            .sort({ name: 1 })
            .limit(50)
            .lean();

        res.json({
            students: students.map(({ organizationId: current, ...student }) => ({
                ...student,
                organizationId: current?._id || null,
                currentOrganization: current ? { name: current.name, orgCode: current.orgCode } : null
            })),
            // So the picker can say "showing the first 50 — narrow your search".
            capped: students.length === 50
        });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        console.error('[organizations] assignable list failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Put a student into this organization
 * @route   POST /api/organizations/admin/:id/students
 * @access  Private/SuperAdmin
 *
 * The one way a membership is created without the organization approving a
 * request. It is a superadmin doing it deliberately, so it is allowed to move a
 * student who already belongs somewhere else — and it says which organization
 * they were taken from, so the decision is visible rather than silent.
 *
 * Any request the student had waiting is settled at the same time, because
 * leaving one open would show them "waiting for approval" for a membership they
 * already have.
 *
 * A pending or rejected organization is refused: it has to be approved before
 * anyone is put into it (a rejected one never was). Other statuses are not gated — a suspended organization can still be
 * stocked — and the response says when the organization is not active, so the
 * caller can pass that on: its administrator cannot sign in and will not see
 * these students until it is.
 */
const assignStudent = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).select('name orgCode status').lean();
        if (!organization) return res.status(404).json({ message: 'Organization not found' });
        if (organization.status === 'pending') {
            return res.status(400).json({ message: `${organization.name} is still pending. Approve it before assigning students to it.` });
        }
        if (organization.status === 'rejected') {
            return res.status(400).json({ message: `${organization.name} was rejected. Reinstate it before assigning students to it.` });
        }

        const student = await User.findById(req.body.studentId).select('name organizationId');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (String(student.organizationId || '') === String(organization._id)) {
            return res.status(400).json({ message: `${student.name} is already in ${organization.name}.` });
        }

        const previous = student.organizationId
            ? await Organization.findById(student.organizationId).select('name').lean()
            : null;

        student.organizationId = organization._id;
        student.organizationJoinedAt = new Date();
        await student.save();

        // Settle whatever was outstanding: an approved row for the organization
        // they left, and any request still waiting anywhere.
        await JoinRequest.updateMany(
            { userId: student._id, status: { $in: ['pending', 'approved'] } },
            {
                $set: {
                    status: 'cancelled',
                    decisionReason: `Assigned to ${organization.name} by a platform administrator`,
                    decidedAt: new Date(),
                    decidedBy: req.admin._id
                }
            }
        );

        await OrgAuditLog.record({
            orgId: organization._id, admin: req.admin, action: 'assign-student', req,
            details: { studentId: student._id, studentName: student.name, movedFrom: previous ? { _id: previous._id, name: previous.name } : null }
        });
        if (previous) {
            await OrgAuditLog.record({
                orgId: previous._id, admin: req.admin, action: 'unassign-student', req,
                details: { studentId: student._id, studentName: student.name, movedTo: { _id: organization._id, name: organization.name } }
            });
        }

        const moved = previous
            ? `${student.name} was moved from ${previous.name} to ${organization.name}.`
            : `${student.name} was added to ${organization.name}.`;

        res.json({
            message: organization.status === 'active'
                ? moved
                : `${moved} ${organization.name} is ${organization.status}, so its administrator cannot see them yet.`,
            movedFrom: previous?.name || null,
            organizationStatus: organization.status
        });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Student not found' });
        console.error('[organizations] assign failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Take a student out of this organization
 * @route   DELETE /api/organizations/admin/:id/students/:studentId
 * @access  Private/SuperAdmin
 *
 * The counterpart to assigning, so a superadmin who put someone in the wrong
 * organization can undo it without asking that organization to do it. Clears the
 * membership and nothing else — the account and every bit of learning are the
 * student's own.
 */
const unassignStudent = async (req, res) => {
    try {
        const student = await User.findOne({
            _id: req.params.studentId,
            organizationId: req.params.id
        }).select('name');
        if (!student) return res.status(404).json({ message: 'No such student in that organization' });

        student.organizationId = null;
        student.organizationJoinedAt = null;
        await student.save();

        await JoinRequest.updateMany(
            { userId: student._id, organizationId: req.params.id, status: 'approved' },
            {
                $set: {
                    status: 'cancelled',
                    decisionReason: 'Removed by a platform administrator',
                    decidedAt: new Date(),
                    decidedBy: req.admin._id
                }
            }
        );

        await OrgAuditLog.record({
            orgId: req.params.id, admin: req.admin, action: 'unassign-student', req,
            details: { studentId: student._id, studentName: student.name }
        });
        res.json({ message: `${student.name} was removed from the organization. Their courses and progress are unchanged.` });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'No such student in that organization' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Any student's full learning record
// @route   GET /api/organizations/admin/students/:studentId
// @access  Private/SuperAdmin
const getAnyStudentProgress = async (req, res) => {
    try {
        const student = await User.findById(req.params.studentId).select('-password').lean();
        if (!student) return res.status(404).json({ message: 'Student not found' });

        const detail = await studentDetail(student);
        const organization = student.organizationId
            ? await Organization.findById(student.organizationId).select('name orgCode status').lean()
            : null;

        res.json({ ...detail, organization });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Student not found' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Just enough about every organization to fill a filter dropdown
 * @route   GET /api/organizations/admin/options
 * @access  Private/Admin
 *
 * Open to platform admins as well as superadmins, because the student list they
 * already use gains an organization filter and would otherwise show ids.
 */
const getOrganizationOptions = async (req, res) => {
    try {
        const organizations = await Organization.find({})
            .select('name orgCode status')
            .sort({ name: 1 })
            .lean();
        res.json({ organizations });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Delete a rejected registration, releasing its ID and email
 * @route   DELETE /api/organizations/admin/:id
 * @access  Private/SuperAdmin
 *
 * Only for an application that was rejected and never approved, with no
 * members and no courses — a mistaken or squatted registration holding an
 * organization ID (and an email) someone else needs. Anything that ever
 * operated as an organization keeps its record: 409. Removes the organization,
 * its orgadmin account and its join requests; no student account or learning
 * record is touched (there are no members, by the rule above). Logged.
 */
const deleteOrganization = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id).select('name orgCode email status approvedAt').lean();
        if (!organization) return res.status(404).json({ message: 'Organization not found' });

        if (organization.status !== 'rejected' || organization.approvedAt) {
            return res.status(409).json({
                code: 'NOT_DELETABLE',
                message: 'Only a rejected registration that was never approved can be deleted. Suspend or deactivate an organization instead.'
            });
        }
        const [members, courses] = await Promise.all([
            User.countDocuments({ organizationId: organization._id }),
            Course.countDocuments({ organizationId: organization._id })
        ]);
        if (members || courses) {
            return res.status(409).json({
                code: 'NOT_DELETABLE',
                message: `${organization.name} still has ${members} student${members === 1 ? '' : 's'} and ${courses} course${courses === 1 ? '' : 's'}, so it cannot be deleted.`
            });
        }

        const [admins, requests] = await Promise.all([
            Admin.deleteMany({ role: 'orgadmin', organizationId: organization._id }),
            JoinRequest.deleteMany({ organizationId: organization._id })
        ]);
        await Organization.deleteOne({ _id: organization._id, status: 'rejected', approvedAt: null });

        // Written after the delete, keyed by the old id, so the trail survives.
        await OrgAuditLog.record({
            orgId: organization._id, admin: req.admin, action: 'delete', req,
            details: { name: organization.name, orgCode: organization.orgCode, email: organization.email, adminsDeleted: admins.deletedCount, requestsDeleted: requests.deletedCount }
        });
        console.log(`[organizations] ${req.admin.name || req.admin.email} (${req.admin._id}) deleted rejected organization ${organization.name} (${organization.orgCode}, ${organization._id})`);

        res.json({ message: `${organization.name} was deleted. The organization ID ${organization.orgCode} and its email are free again.` });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'Organization not found' });
        console.error('[organizations] delete failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    The latest 100 audit rows for one organization
// @route   GET /api/organizations/admin/:id/audit
// @access  Private/SuperAdmin
//
// Works for a deleted organization too: its rows are kept under its old id.
const getAuditLog = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Organization not found' });
        const entries = await OrgAuditLog.find({ orgId: req.params.id }).sort({ at: -1, _id: -1 }).limit(100).lean();
        res.json({ entries });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    deleteOrganization,
    getAuditLog,
    listOrganizations,
    getOrganization,
    setCourseAccess,
    setCompetitionHosting,
    createOrganization,
    updateOrganization,
    sendAdminPasswordReset,
    setOrganizationStatus,
    getOrganizationStudents,
    getAssignableStudents,
    assignStudent,
    unassignStudent,
    getAnyStudentProgress,
    getOrganizationOptions
};
