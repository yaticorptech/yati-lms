/**
 * @description The student's half: looking an organization up by its ID, asking
 *              to join, and seeing where the request stands.
 *
 * Typing a code never joins anything. It looks the organization up so the
 * student can check they have the right one, and the organization's own admin
 * decides the rest. Only active organizations can be found at all, so a pending,
 * rejected or suspended organization cannot collect members.
 *
 * Leaving an active organization is deliberately absent. Membership is the
 * institution's record of who its students are, so ending it belongs to that
 * organization, from its own students page, or to a superadmin. The one
 * exception is an organization that is no longer active (suspended, inactive,
 * rejected) or no longer exists: nobody there can remove the student, and
 * without a way out they could never join another — see leaveOrganization. A
 * student may also withdraw a request that has not been decided — that is
 * their own request, not a membership.
 */
const Organization = require('../models/Organization');
const JoinRequest = require('../models/JoinRequest');
const User = require('../../models/User');
const { normalizeOrgCode, isValidOrgCodeFormat } = require('../services/orgCode');

/** The little an organization shows to someone who is not in it yet. */
const publicShape = (organization) => ({
    _id: organization._id,
    orgCode: organization.orgCode,
    name: organization.name,
    organizationType: organization.organizationType,
    typeLabel: Organization.TYPE_LABELS[organization.organizationType] || 'Other',
    logo: organization.logo || '',
    // Deliberately no email, phone, address or student list: a code is easy to
    // guess at, and it should not read out an institution's contact details.
    website: organization.website || ''
});

/**
 * Reasons that mean a membership ended. A withdrawn request, or one closed
 * because the organization stopped accepting members, was never a membership
 * — the request itself (status and decisionReason) already says so.
 */
const REMOVAL_REASONS = [
    'Removed by the organization',
    'Removed by a platform administrator',
    'Left the organization'
];

/** `{ organizationName, reason, at }` when the newest request records a removal. */
const removedFrom = (request, organization) => {
    if (!request || request.status !== 'cancelled' || organization) return null;
    if (!REMOVAL_REASONS.includes(request.decisionReason)) return null;
    return {
        organizationName: request.organizationId?.name || 'your organization',
        reason: request.decisionReason,
        at: request.decidedAt || request.updatedAt || null
    };
};

// @desc    My organization, or my request if I am still waiting
// @route   GET /api/organizations/student/me
// @access  Private/Student
const getMyMembership = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).select('organizationId organizationJoinedAt').lean();

        // A pointer to an organization that no longer exists reads as no
        // organization here, in createRequest and in leaveOrganization alike.
        const organization = student?.organizationId
            ? await Organization.findById(student.organizationId).lean()
            : null;

        // The newest request of any kind, so a student who was rejected sees the
        // rejection rather than an untouched form.
        const request = await JoinRequest.findOne({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate('organizationId', 'name orgCode status')
            .lean();

        res.json({
            member: Boolean(organization),
            organization: organization ? {
                ...publicShape(organization),
                status: organization.status,
                joinedAt: student.organizationJoinedAt || null,
                // A student whose organization was suspended keeps their
                // membership and their work; they are told, not cut off.
                accessNote: organization.status === 'active'
                    ? ''
                    : 'This organization is not currently active on the platform.'
            } : null,
            request: request ? {
                _id: request._id,
                status: request.status,
                requestedAt: request.createdAt,
                decidedAt: request.decidedAt,
                decisionReason: request.decisionReason || '',
                organization: request.organizationId ? {
                    name: request.organizationId.name,
                    orgCode: request.organizationId.orgCode
                } : null
            } : null,
            // Added only when it applies: the newest request is a membership
            // that was ended for them (removed, or the organization stopped
            // taking members), so the app can say "You are no longer a member
            // of X" instead of showing an empty form with no explanation.
            ...(removedFrom(request, organization) ? { removed: removedFrom(request, organization) } : {})
        });
    } catch (error) {
        console.error('[organizations] membership read failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Find an active organization by its ID
// @route   GET /api/organizations/student/lookup/:code
// @access  Private/Student
const lookupOrganization = async (req, res) => {
    try {
        const code = normalizeOrgCode(req.params.code);

        if (!code) return res.status(400).json({ message: 'Enter an Organization ID.' });
        if (!isValidOrgCodeFormat(code)) {
            return res.status(400).json({
                message: 'That does not look like an Organization ID. Ask your organization for it, like st_agnes_college.'
            });
        }

        // Only active organizations are findable. A pending or suspended one
        // answers exactly like a code that was never issued, so this cannot be
        // used to discover which institutions have applied.
        const organization = await Organization.findOne({ orgCode: code, status: 'active' }).lean();

        if (!organization) {
            return res.status(404).json({
                code: 'ORGANIZATION_NOT_FOUND',
                message: "We couldn't find an active organization with that ID."
            });
        }

        const student = await User.findById(req.user._id).select('organizationId').lean();
        const pending = await JoinRequest.findOne({ userId: req.user._id, status: 'pending' }).lean();

        res.json({
            organization: publicShape(organization),
            // The client uses these to decide whether to offer the button at all,
            // but the POST below re-checks both — the frontend is never the gate.
            alreadyMember: String(student?.organizationId || '') === String(organization._id),
            hasPendingRequest: Boolean(pending),
            pendingElsewhere: Boolean(pending) && String(pending.organizationId) !== String(organization._id)
        });
    } catch (error) {
        console.error('[organizations] lookup failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Ask to join an organization
// @route   POST /api/organizations/student/requests
// @access  Private/Student
const createRequest = async (req, res) => {
    try {
        const code = normalizeOrgCode(req.body.orgCode);
        if (!isValidOrgCodeFormat(code)) {
            return res.status(400).json({ message: 'Enter a valid Organization ID, such as st_agnes_college.' });
        }

        const organization = await Organization.findOne({ orgCode: code, status: 'active' }).lean();
        if (!organization) {
            return res.status(404).json({
                code: 'ORGANIZATION_NOT_FOUND',
                message: "We couldn't find an active organization with that ID."
            });
        }

        const student = await User.findById(req.user._id).select('organizationId');
        // A dangling pointer (the organization was deleted) is no membership,
        // the same reading getMyMembership gives the student.
        const current = student.organizationId
            ? await Organization.findById(student.organizationId).select('status').lean()
            : null;
        if (current) {
            const same = String(student.organizationId) === String(organization._id);
            if (same) return res.status(409).json({ message: 'You are already a member of this organization.' });
            return res.status(409).json({
                code: 'ALREADY_MEMBER',
                currentStatus: current.status,
                message: current.status === 'active'
                    ? 'You already belong to an organization. Ask your organization to remove you before joining another one.'
                    : 'You still belong to an organization that is no longer active. Choose "Leave organization" first, then join another one.'
            });
        }

        const existing = await JoinRequest.findOne({ userId: req.user._id, status: 'pending' })
            .populate('organizationId', 'name')
            .lean();
        if (existing) {
            return res.status(409).json({
                message: String(existing.organizationId?._id) === String(organization._id)
                    ? 'You have already asked to join this organization. It is waiting for their approval.'
                    : `You have a request waiting with ${existing.organizationId?.name || 'another organization'}. Cancel it first.`
            });
        }

        const request = await JoinRequest.create({
            userId: req.user._id,
            organizationId: organization._id,
            status: 'pending'
        });

        res.status(201).json({
            message: `Your request to join ${organization.name} has been sent.`,
            request: { _id: request._id, status: request.status, requestedAt: request.createdAt }
        });
    } catch (error) {
        // The partial unique index is what actually settles two taps arriving
        // together; one of them lands here.
        if (error.code === 11000) {
            return res.status(409).json({ message: 'You already have a request waiting for a decision.' });
        }
        console.error('[organizations] join request failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Withdraw my own pending request
// @route   DELETE /api/organizations/student/requests/:requestId
// @access  Private/Student
const cancelRequest = async (req, res) => {
    try {
        const request = await JoinRequest.findOne({
            _id: req.params.requestId,
            userId: req.user._id,
            status: 'pending'
        });

        if (!request) return res.status(404).json({ message: 'You have no such request waiting.' });

        request.status = 'cancelled';
        request.decidedAt = new Date();
        request.decisionReason = 'Withdrawn by the student';
        await request.save();

        res.json({ message: 'Your request was withdrawn.' });
    } catch (error) {
        if (error.name === 'CastError') return res.status(404).json({ message: 'You have no such request waiting.' });
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/**
 * @desc    Leave my organization — only one that is no longer active
 * @route   POST /api/organizations/student/leave
 * @access  Private/Student
 *
 * A suspended, inactive or rejected organization has no administrator who can
 * sign in to remove anyone, and a deleted one has nobody at all, so without
 * this the student would be held there forever and could never join another.
 * An active organization answers 409: ending that membership stays with the
 * organization (its students page) or a superadmin.
 *
 * Clears the membership only. Courses, progress, XP and certificates are the
 * student's own and stay; the approved request is marked as ended so the
 * history reads truthfully.
 */
const leaveOrganization = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).select('organizationId').lean();
        if (!student?.organizationId) {
            return res.status(400).json({ message: 'You do not belong to an organization.' });
        }

        const organization = await Organization.findById(student.organizationId).select('name status').lean();
        if (organization && organization.status === 'active') {
            return res.status(409).json({
                code: 'ORGANIZATION_ACTIVE',
                message: `${organization.name} is active. Ask your organization to remove you; you cannot leave it yourself.`
            });
        }

        // Conditional on the same organization still being set, so a superadmin
        // assigning them somewhere at this moment is not undone.
        const result = await User.updateOne(
            { _id: req.user._id, organizationId: student.organizationId },
            { $set: { organizationId: null, organizationJoinedAt: null } }
        );
        if (result.modifiedCount !== 1) {
            return res.status(409).json({ message: 'Your membership changed just now. Refresh and try again.' });
        }

        await JoinRequest.updateMany(
            { userId: req.user._id, organizationId: student.organizationId, status: 'approved' },
            { $set: { status: 'cancelled', decisionReason: 'Left the organization', decidedAt: new Date(), decidedBy: null } }
        );

        res.json({
            message: organization
                ? `You have left ${organization.name}. Your courses and progress are unchanged.`
                : 'You have left your organization. Your courses and progress are unchanged.'
        });
    } catch (error) {
        console.error('[organizations] leave failed:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    leaveOrganization,
    getMyMembership,
    lookupOrganization,
    createRequest,
    cancelRequest
};
