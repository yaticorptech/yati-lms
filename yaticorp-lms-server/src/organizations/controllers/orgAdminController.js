/**
 * @description Everything an organization administrator can see and do — their
 *              dashboard, their students, their join requests, their settings.
 *
 * The single rule every function in this file obeys: the organization is
 * `req.organization`, set by protectOrgAdmin from the authenticated account, and
 * no query is ever built from an organization id in the URL, the query string or
 * the body. A route that takes a student id or a request id re-reads that
 * document with the organization in the filter, so asking for someone else's
 * student answers 404 and not their data.
 *
 * Nothing here can read or write another organization's rows, and nothing here
 * deletes a student or their learning record — removing a student from an
 * organization clears the membership and leaves the account whole.
 */
const Organization = require('../models/Organization');
const JoinRequest = require('../models/JoinRequest');
const User = require('../../models/User');
const Admin = require('../../models/Admin');
const { validatePasswordStrength } = require('../../middleware/validatePassword');
const { withSummaries, studentDetail } = require('../services/studentProgress');

/** Fields an organization admin may change about itself. */
const EDITABLE = ['name', 'logo', 'contactPerson', 'email', 'phone', 'address', 'website'];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The organization as its own admin sees it. */
const shape = (organization) => ({
    _id: organization._id,
    orgCode: organization.orgCode,
    name: organization.name,
    organizationType: organization.organizationType,
    typeLabel: Organization.TYPE_LABELS[organization.organizationType] || 'Other',
    logo: organization.logo || '',
    email: organization.email,
    phone: organization.phone || '',
    address: organization.address || '',
    website: organization.website || '',
    contactPerson: organization.contactPerson || '',
    expectedStudents: organization.expectedStudents ?? null,
    status: organization.status,
    statusReason: organization.statusReason || '',
    approvedAt: organization.approvedAt,
    createdAt: organization.createdAt
});

// @desc    My organization
// @route   GET /api/organizations/me
// @access  Private/OrgAdmin
const getMyOrganization = async (req, res) => {
    res.json({ organization: shape(req.organization) });
};

// @desc    Edit my organization's details
// @route   PUT /api/organizations/me
// @access  Private/OrgAdmin
const updateMyOrganization = async (req, res) => {
    try {
        const organization = req.organization;

        // Only these fields are read. `orgCode` is immutable in the schema and
        // absent from this list, and `status` is a platform decision — an
        // organization cannot approve or reinstate itself by sending a payload.
        for (const field of EDITABLE) {
            if (req.body[field] === undefined) continue;

            if (field === 'email') {
                const cleanEmail = String(req.body.email).trim().toLowerCase();
                if (!EMAIL_PATTERN.test(cleanEmail)) {
                    return res.status(400).json({ message: 'Enter a valid email address.' });
                }
                if (cleanEmail !== organization.email) {
                    const taken = await Organization.findOne({ email: cleanEmail, _id: { $ne: organization._id } });
                    if (taken) return res.status(400).json({ message: 'Another organization already uses that email address.' });
                }
                organization.email = cleanEmail;
                continue;
            }

            const value = String(req.body[field]).trim();
            if (field === 'name' && value.length < 2) {
                return res.status(400).json({ message: 'Enter the organization name.' });
            }
            organization[field] = value;
        }

        await organization.save();
        res.json({ message: 'Your organization details were saved.', organization: shape(organization) });
    } catch (error) {
        // Past a length limit is the caller's mistake, and the schema already
        // says which field. Anything else is genuinely ours.
        if (error.name === 'ValidationError') return res.status(400).json({ message: error.message });
        console.error('[organizations] org self-update failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Change my own sign-in password
 * @route   PUT /api/organizations/me/password
 * @access  Private/OrgAdmin
 *
 * The current password is required as well as the new one. Without it, anyone
 * who reached an unattended screen could lock the organization out of its own
 * account, and the session alone is not evidence that the person at the keyboard
 * is the administrator.
 *
 * The account is the ordinary Admin document, so `save()` runs the same bcrypt
 * hook every other administrator's password goes through.
 */
const changeMyPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Enter your current password and the new one.' });
        }
        if (confirmPassword !== undefined && newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'The two new passwords do not match.' });
        }

        const strengthError = validatePasswordStrength(newPassword);
        if (strengthError) return res.status(400).json({ message: strengthError });

        // Re-read with the password, which protectOrgAdmin deliberately omits.
        const admin = await Admin.findById(req.admin._id);
        if (!admin) return res.status(404).json({ message: 'Your account could not be found.' });

        if (!(await admin.matchPassword(currentPassword))) {
            return res.status(401).json({ message: 'That is not your current password.' });
        }
        if (await admin.matchPassword(newPassword)) {
            return res.status(400).json({ message: 'The new password is the same as the current one.' });
        }

        admin.password = newPassword;
        await admin.save();

        res.json({ message: 'Your password was changed. Use it the next time you sign in.' });
    } catch (error) {
        console.error('[organizations] password change failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Dashboard headline numbers and recent student activity
// @route   GET /api/organizations/me/dashboard
// @access  Private/OrgAdmin
const getDashboard = async (req, res) => {
    try {
        const organizationId = req.organization._id;

        const students = await User.find({ organizationId })
            .select('-password')
            .lean();

        const rows = await withSummaries(students);

        // "Active" means the account is usable and the student has actually done
        // something in the last 30 days — an enrolled student who has never
        // opened a lesson is a member, not an active learner.
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const activeStudents = rows.filter((r) => r.status === 'active' && r.lastActive && r.lastActive >= cutoff).length;

        const withCourses = rows.filter((r) => r.coursesEnrolled > 0);
        const averageProgress = withCourses.length
            ? Math.round(withCourses.reduce((sum, r) => sum + r.progressPercent, 0) / withCourses.length)
            : 0;

        const pendingRequests = await JoinRequest.countDocuments({ organizationId, status: 'pending' });

        const recentActivity = rows
            .filter((r) => r.lastActive)
            .sort((a, b) => b.lastActive - a.lastActive)
            .slice(0, 8)
            .map((r) => ({
                _id: r._id,
                name: r.name,
                progressPercent: r.progressPercent,
                coursesEnrolled: r.coursesEnrolled,
                lastActive: r.lastActive
            }));

        res.json({
            organization: shape(req.organization),
            stats: {
                students: rows.length,
                activeStudents,
                averageProgress,
                coursesCompleted: rows.reduce((sum, r) => sum + r.coursesCompleted, 0),
                certificates: rows.reduce((sum, r) => sum + r.certificates, 0),
                totalXp: rows.reduce((sum, r) => sum + r.xp, 0),
                pendingRequests
            },
            recentActivity
        });
    } catch (error) {
        console.error('[organizations] dashboard failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    My organization's students
// @route   GET /api/organizations/me/students
// @access  Private/OrgAdmin
const getStudents = async (req, res) => {
    try {
        const students = await User.find({ organizationId: req.organization._id })
            .select('-password')
            .sort({ name: 1 })
            .lean();

        res.json({ students: await withSummaries(students) });
    } catch (error) {
        console.error('[organizations] student list failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    One of my students, with their full learning record
 * @route   GET /api/organizations/me/students/:studentId
 * @access  Private/OrgAdmin
 *
 * The organization is part of the lookup, not checked after it. Putting another
 * organization's student id in the URL matches nothing and answers 404 —
 * indistinguishable from an id that does not exist, so the endpoint cannot even
 * be used to confirm that some student belongs to a rival institution.
 */
const getStudent = async (req, res) => {
    try {
        const student = await User.findOne({
            _id: req.params.studentId,
            organizationId: req.organization._id
        }).select('-password').lean();

        if (!student) {
            return res.status(404).json({ message: 'No such student in your organization' });
        }

        res.json(await studentDetail(student));
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'No such student in your organization' });
        }
        console.error('[organizations] student detail failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Remove a student from my organization
 * @route   DELETE /api/organizations/me/students/:studentId
 * @access  Private/OrgAdmin
 *
 * Clears the membership only. The account, its enrollments, progress, XP,
 * certificates and Career Path data are the student's own and are untouched —
 * the student simply stops appearing in this organization's lists.
 */
const removeStudent = async (req, res) => {
    try {
        const student = await User.findOne({
            _id: req.params.studentId,
            organizationId: req.organization._id
        }).select('name');

        if (!student) {
            return res.status(404).json({ message: 'No such student in your organization' });
        }

        student.organizationId = null;
        student.organizationJoinedAt = null;
        await student.save();

        // The old decision stays on the record; this marks that the membership
        // it granted has ended, so the student may apply again.
        await JoinRequest.updateMany(
            { userId: student._id, organizationId: req.organization._id, status: 'approved' },
            { $set: { status: 'cancelled', decisionReason: 'Removed by the organization', decidedAt: new Date(), decidedBy: req.admin._id } }
        );

        res.json({ message: `${student.name} was removed from your organization.` });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'No such student in your organization' });
        }
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Students asking to join my organization
// @route   GET /api/organizations/me/requests
// @access  Private/OrgAdmin
const getRequests = async (req, res) => {
    try {
        const status = JoinRequest.STATUSES.includes(req.query.status) ? req.query.status : 'pending';

        const requests = await JoinRequest.find({ organizationId: req.organization._id, status })
            .populate('userId', 'name email phone profilePicture status createdAt')
            .sort({ createdAt: status === 'pending' ? 1 : -1 })
            .lean();

        const pendingCount = await JoinRequest.countDocuments({
            organizationId: req.organization._id,
            status: 'pending'
        });

        res.json({
            // A request whose student account has since been deleted is dropped
            // rather than rendered as a blank row with working buttons.
            requests: requests.filter((r) => r.userId).map((r) => ({
                _id: r._id,
                status: r.status,
                requestedAt: r.createdAt,
                decidedAt: r.decidedAt,
                decisionReason: r.decisionReason || '',
                student: {
                    _id: r.userId._id,
                    name: r.userId.name,
                    email: r.userId.email,
                    phone: r.userId.phone,
                    profilePicture: r.userId.profilePicture || '',
                    status: r.userId.status,
                    joinedPlatformAt: r.userId.createdAt
                }
            })),
            pendingCount
        });
    } catch (error) {
        console.error('[organizations] request list failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Approve or reject a join request
 * @route   PUT /api/organizations/me/requests/:requestId
 * @access  Private/OrgAdmin
 *
 * Approving is what actually creates a membership: it is the only place in the
 * codebase that sets `User.organizationId`.
 */
const decideRequest = async (req, res) => {
    try {
        const { decision, reason } = req.body;
        if (!['approve', 'reject'].includes(decision)) {
            return res.status(400).json({ message: 'Say whether to approve or reject.' });
        }

        // Scoped by organization and by status, so one admin cannot decide
        // another organization's request, and two clicks cannot decide the same
        // request twice.
        const request = await JoinRequest.findOne({
            _id: req.params.requestId,
            organizationId: req.organization._id,
            status: 'pending'
        });

        if (!request) {
            return res.status(404).json({ message: 'That request is no longer waiting for a decision' });
        }

        const student = await User.findById(request.userId).select('name email organizationId');
        if (!student) {
            await JoinRequest.deleteOne({ _id: request._id });
            return res.status(404).json({ message: 'That student account no longer exists' });
        }

        if (decision === 'reject') {
            request.status = 'rejected';
            request.decisionReason = String(reason || '').trim().slice(0, 500);
            request.decidedAt = new Date();
            request.decidedBy = req.admin._id;
            await request.save();
            return res.json({ message: `${student.name}'s request was rejected.` });
        }

        // One student belongs to one organization. If they were admitted
        // elsewhere while this request sat in the queue, say so plainly rather
        // than silently moving them.
        if (student.organizationId && String(student.organizationId) !== String(req.organization._id)) {
            return res.status(409).json({
                message: `${student.name} has already joined another organization.`
            });
        }

        student.organizationId = req.organization._id;
        student.organizationJoinedAt = new Date();
        await student.save();

        request.status = 'approved';
        request.decisionReason = '';
        request.decidedAt = new Date();
        request.decidedBy = req.admin._id;
        await request.save();

        res.json({ message: `${student.name} is now a member of your organization.` });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'That request is no longer waiting for a decision' });
        }
        console.error('[organizations] request decision failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getMyOrganization,
    updateMyOrganization,
    changeMyPassword,
    getDashboard,
    getStudents,
    getStudent,
    removeStudent,
    getRequests,
    decideRequest
};
