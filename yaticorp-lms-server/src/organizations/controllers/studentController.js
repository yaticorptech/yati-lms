/**
 * @description The student's half: looking an organization up by its ID, asking
 *              to join, and seeing where the request stands.
 *
 * Typing a code never joins anything. It looks the organization up so the
 * student can check they have the right one, and the organization's own admin
 * decides the rest. Only active organizations can be found at all, so a pending,
 * rejected or suspended organization cannot collect members.
 *
 * Leaving is deliberately absent. A student cannot take themselves out of an
 * organization: membership is the institution's record of who its students are,
 * so ending it belongs to that organization, from its own students page, or to a
 * superadmin. A student may still withdraw a request that has not been decided —
 * that is their own request, not a membership.
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

// @desc    My organization, or my request if I am still waiting
// @route   GET /api/organizations/student/me
// @access  Private/Student
const getMyMembership = async (req, res) => {
    try {
        const student = await User.findById(req.user._id).select('organizationId organizationJoinedAt').lean();

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
            } : null
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
                message: 'That does not look like an Organization ID. They start with your organization\'s name, like ABC-2026-0001.'
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
            return res.status(400).json({ message: 'Enter a valid Organization ID, such as ABC-2026-0001.' });
        }

        const organization = await Organization.findOne({ orgCode: code, status: 'active' }).lean();
        if (!organization) {
            return res.status(404).json({
                code: 'ORGANIZATION_NOT_FOUND',
                message: "We couldn't find an active organization with that ID."
            });
        }

        const student = await User.findById(req.user._id).select('organizationId');
        if (student.organizationId) {
            const same = String(student.organizationId) === String(organization._id);
            return res.status(409).json({
                message: same
                    ? 'You are already a member of this organization.'
                    : 'You already belong to an organization. Leave it before joining another one.'
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

module.exports = {
    getMyMembership,
    lookupOrganization,
    createRequest,
    cancelRequest
};
