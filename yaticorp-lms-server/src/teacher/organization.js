/**
 * The teacher's half of organizations — /api/teacher/organization, the same
 * steps a student takes (src/organizations/controllers/studentController.js):
 *
 *   GET    /                    my organization, or my latest request
 *   GET    /lookup/:code        find an active organization by its ID
 *   POST   /requests            { orgCode } ask to join
 *   DELETE /requests/:id        withdraw my request
 *   POST   /leave               leave an organization that is no longer active
 *
 * Typing an ID never joins anything: the organization's admin decides. An
 * active organization's membership ends from its side (its Teachers page).
 */
const express = require('express');
const mongoose = require('mongoose');
const { lookupLimiter } = require('../middleware/rateLimiter');
const Organization = require('../organizations/models/Organization');
const { normalizeOrgCode, isValidOrgCodeFormat } = require('../organizations/services/orgCode');
const { Teacher, TeacherOrgRequest } = require('./models');

const router = express.Router();
const fail = (res, where, error) => {
    console.error(`[teacher-org] ${where}:`, error.message);
    res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
};
const NOT_FOUND = { code: 'ORGANIZATION_NOT_FOUND', message: "We couldn't find an active organization with that ID." };

/** The little an organization shows to someone not in it yet — no contact details. */
const publicShape = (o) => ({
    _id: o._id, orgCode: o.orgCode, name: o.name,
    typeLabel: Organization.TYPE_LABELS?.[o.organizationType] || 'Other',
    logo: o.logo || '', website: o.website || ''
});

router.get('/', async (req, res) => {
    try {
        const t = await Teacher.findById(req.teacher._id).select('organizationId organizationJoinedAt').lean();
        const org = t?.organizationId ? await Organization.findById(t.organizationId).lean() : null;
        const request = await TeacherOrgRequest.findOne({ teacherId: req.teacher._id }).sort({ createdAt: -1 }).populate('organizationId', 'name orgCode').lean();
        const removed = request && request.status === 'cancelled' && !org
            && ['Removed by the organization', 'Removed by a platform administrator', 'Left the organization'].includes(request.decisionReason)
            ? { organizationName: request.organizationId?.name || 'your organization', reason: request.decisionReason, at: request.decidedAt }
            : null;
        res.json({
            member: Boolean(org),
            organization: org ? { ...publicShape(org), status: org.status, joinedAt: t.organizationJoinedAt || null, accessNote: org.status === 'active' ? '' : 'This organization is not currently active on the platform.' } : null,
            request: request ? {
                _id: request._id, status: request.status, requestedAt: request.createdAt, decidedAt: request.decidedAt,
                decisionReason: request.decisionReason || '',
                organization: request.organizationId ? { name: request.organizationId.name, orgCode: request.organizationId.orgCode } : null
            } : null,
            ...(removed ? { removed } : {})
        });
    } catch (error) { fail(res, 'membership', error); }
});

router.get('/lookup/:code', lookupLimiter, async (req, res) => {
    try {
        const code = normalizeOrgCode(req.params.code);
        if (!code) return res.status(400).json({ message: 'Enter an Organization ID.' });
        if (!isValidOrgCodeFormat(code)) return res.status(400).json({ message: 'That does not look like an Organization ID. Ask your organization for it, like xxx_college.' });
        // Only active organizations can be found: a pending one answers like an unknown ID.
        const org = await Organization.findOne({ orgCode: code, status: 'active' }).lean();
        if (!org) return res.status(404).json(NOT_FOUND);
        const pending = await TeacherOrgRequest.findOne({ teacherId: req.teacher._id, status: 'pending' }).lean();
        res.json({
            organization: publicShape(org),
            alreadyMember: String(req.teacher.organizationId || '') === String(org._id),
            hasPendingRequest: Boolean(pending),
            pendingElsewhere: Boolean(pending) && String(pending.organizationId) !== String(org._id)
        });
    } catch (error) { fail(res, 'lookup', error); }
});

router.post('/requests', async (req, res) => {
    try {
        const code = normalizeOrgCode(req.body?.orgCode);
        if (!isValidOrgCodeFormat(code)) return res.status(400).json({ message: 'Enter a valid Organization ID, such as xxx_college.' });
        const org = await Organization.findOne({ orgCode: code, status: 'active' }).lean();
        if (!org) return res.status(404).json(NOT_FOUND);

        const current = req.teacher.organizationId ? await Organization.findById(req.teacher.organizationId).select('status').lean() : null;
        if (current) {
            if (String(req.teacher.organizationId) === String(org._id)) return res.status(409).json({ message: 'You are already a member of this organization.' });
            return res.status(409).json({
                code: 'ALREADY_MEMBER',
                message: current.status === 'active'
                    ? 'You already belong to an organization. Ask your organization to remove you before joining another one.'
                    : 'You still belong to an organization that is no longer active. Choose "Leave organization" first, then join another one.'
            });
        }
        const existing = await TeacherOrgRequest.findOne({ teacherId: req.teacher._id, status: 'pending' }).populate('organizationId', 'name').lean();
        if (existing) {
            return res.status(409).json({
                message: String(existing.organizationId?._id) === String(org._id)
                    ? 'You have already asked to join this organization. It is waiting for their approval.'
                    : `You have a request waiting with ${existing.organizationId?.name || 'another organization'}. Withdraw it first.`
            });
        }
        const request = await TeacherOrgRequest.create({ teacherId: req.teacher._id, organizationId: org._id });
        res.status(201).json({ message: `Your request to join ${org.name} has been sent.`, request: { _id: request._id, status: request.status, requestedAt: request.createdAt } });
    } catch (error) {
        if (error?.code === 11000) return res.status(409).json({ message: 'You already have a request waiting for a decision.' });
        fail(res, 'request', error);
    }
});

router.delete('/requests/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'You have no such request waiting.' });
        const r = await TeacherOrgRequest.findOneAndUpdate(
            { _id: req.params.id, teacherId: req.teacher._id, status: 'pending' },
            { $set: { status: 'cancelled', decidedAt: new Date(), decisionReason: 'Withdrawn by the teacher' } }
        );
        if (!r) return res.status(404).json({ message: 'You have no such request waiting.' });
        res.json({ message: 'Your request was withdrawn.' });
    } catch (error) { fail(res, 'withdraw', error); }
});

router.post('/leave', async (req, res) => {
    try {
        const orgId = req.teacher.organizationId;
        if (!orgId) return res.status(400).json({ message: 'You do not belong to an organization.' });
        const org = await Organization.findById(orgId).select('name status').lean();
        if (org && org.status === 'active') {
            return res.status(409).json({ code: 'ORGANIZATION_ACTIVE', message: `${org.name} is active. Ask your organization to remove you; you cannot leave it yourself.` });
        }
        await Teacher.updateOne({ _id: req.teacher._id, organizationId: orgId }, { $set: { organizationId: null, organizationJoinedAt: null } });
        await TeacherOrgRequest.updateMany({ teacherId: req.teacher._id, organizationId: orgId, status: 'approved' }, { $set: { status: 'cancelled', decisionReason: 'Left the organization', decidedAt: new Date() } });
        res.json({ message: org ? `You have left ${org.name}.` : 'You have left your organization.' });
    } catch (error) { fail(res, 'leave', error); }
});

module.exports = router;
