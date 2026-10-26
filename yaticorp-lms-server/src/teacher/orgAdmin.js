/**
 * An organization's teachers — mounted at /api/organizations/me/teachers,
 * behind protectOrgAdmin and requireActiveOrganization.
 *
 *   GET    /                    my teachers, with their research progress (?search=)
 *   POST   /                    add a teacher with a card; they are my member at once
 *   POST   /bulk                add teachers from the Excel template (multipart "file")
 *   GET    /requests            teachers asking to join (?status=pending|approved|rejected|cancelled)
 *   GET    /requests/count      { pending } for the navigation badge
 *   PUT    /requests/:requestId { decision: 'approve' | 'reject', reason? }
 *   GET    /:teacherId          one of my teachers, in full (never their writing)
 *   DELETE /:teacherId          remove them from my organization (the account stays theirs)
 *
 * The same rule as the rest of the organization panel: the organization is
 * req.organization, from the signed-in account, never from the request — a
 * teacher id from another organization answers 404.
 */
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const { Teacher, TeacherOrgRequest, TEACHER_REQUEST_STATUSES } = require('./models');
const { AccountError, createTeacher, createFromSheet, sendWelcome, escapeRegExp } = require('./accounts');
const { summarise, detail } = require('./progress');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const FIELDS = 'name email phone cardNumber institution department designation status createdBy organizationJoinedAt loginCount lastLoginAt createdAt';
const accountError = (res, error) => res.status(400).json({ field: error.field, ...(error.code ? { code: error.code } : {}), message: error.message });
const notMine = (res) => res.status(404).json({ message: 'No such teacher in your organization' });

/** Pending requests from teachers whose accounts still exist — the list and the badge agree. */
const countPending = async (organizationId) => {
    const ids = await TeacherOrgRequest.find({ organizationId, status: 'pending' }).distinct('teacherId');
    return ids.length ? Teacher.countDocuments({ _id: { $in: ids } }) : 0;
};

router.get('/', async (req, res) => {
    try {
        const filter = { organizationId: req.organization._id };
        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search) filter.$or = ['name', 'email', 'cardNumber', 'department'].map((k) => ({ [k]: new RegExp(escapeRegExp(search), 'i') }));
        const rows = await Teacher.find(filter).select(FIELDS).sort({ name: 1 }).collation({ locale: 'en', strength: 2 }).lean();
        const summaries = await summarise(rows);
        res.json({
            teachers: rows.map((r, i) => ({ ...r, summary: summaries[i] })),
            pendingRequests: await countPending(req.organization._id),
            orgCode: req.organization.orgCode
        });
    } catch (error) {
        console.error('[org-teachers] list failed:', error.message);
        res.status(500).json({ message: 'Could not load your teachers.' });
    }
});

const madeBy = (req) => req.organization.name;

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const teacher = await createTeacher({ ...body, institution: body.institution || req.organization.name }, { by: 'organization', organizationId: req.organization._id });
        sendWelcome(teacher, body.password, madeBy(req));
        res.status(201).json({ _id: teacher._id, name: teacher.name, message: `${teacher.name} was added to your organization. Their sign-in details were emailed to ${teacher.email}.` });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        console.error('[org-teachers] add failed:', error.message);
        res.status(500).json({ message: 'Could not add the teacher just now. Please try again.' });
    }
});

router.post('/bulk', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ field: 'file', message: 'Choose the filled-in Excel file first.' });
        const results = await createFromSheet(req.file.buffer, { by: 'organization', organizationId: req.organization._id });
        for (const { teacher, password } of results.created) {
            if (!teacher.institution) await Teacher.updateOne({ _id: teacher._id }, { $set: { institution: req.organization.name } });
            sendWelcome(teacher, password, madeBy(req));
        }
        delete results.created;
        res.json({ message: `${results.successCount} added, ${results.failedCount} could not be added.`, results });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        console.error('[org-teachers] bulk failed:', error.message);
        res.status(500).json({ message: 'The upload could not be finished. Please try again.' });
    }
});

router.get('/requests', async (req, res) => {
    try {
        const status = TEACHER_REQUEST_STATUSES.includes(req.query.status) ? req.query.status : 'pending';
        const list = await TeacherOrgRequest.find({ organizationId: req.organization._id, status })
            .populate('teacherId', 'name email phone institution department designation status createdAt organizationId')
            .sort({ createdAt: status === 'pending' ? 1 : -1 })
            .limit(500)
            .lean();
        // Contact details are for deciding: shown while pending, or for someone
        // still a member; a turned-down or departed teacher keeps only a name.
        const shape = (r) => {
            const t = r.teacherId;
            const member = String(t.organizationId || '') === String(req.organization._id);
            if (r.status !== 'pending' && !member) return { _id: t._id, name: t.name, contactHidden: true };
            return { _id: t._id, name: t.name, email: t.email, phone: t.phone, institution: t.institution || '', department: t.department || '', designation: t.designation || '', joinedPlatformAt: t.createdAt };
        };
        res.json({
            requests: list.filter((r) => r.teacherId).map((r) => ({ _id: r._id, status: r.status, requestedAt: r.createdAt, decidedAt: r.decidedAt, decisionReason: r.decisionReason || '', teacher: shape(r) })),
            pendingCount: await countPending(req.organization._id)
        });
    } catch (error) {
        console.error('[org-teachers] requests failed:', error.message);
        res.status(500).json({ message: 'Could not load the requests.' });
    }
});

router.get('/requests/count', async (req, res) => {
    try { res.json({ pending: await countPending(req.organization._id) }); } catch (error) {
        console.error('[org-teachers] request count failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/requests/:requestId', async (req, res) => {
    try {
        const { decision, reason } = req.body || {};
        if (!['approve', 'reject'].includes(decision)) return res.status(400).json({ message: 'Say whether to approve or reject.' });
        if (!mongoose.isValidObjectId(req.params.requestId)) return res.status(404).json({ message: 'That request is no longer waiting for a decision' });
        // Claimed in one step, scoped by organization and status: two clicks,
        // or an approve racing a reject, cannot both decide it.
        const request = await TeacherOrgRequest.findOneAndUpdate(
            { _id: req.params.requestId, organizationId: req.organization._id, status: 'pending' },
            { $set: { status: decision === 'reject' ? 'rejected' : 'approved', decisionReason: decision === 'reject' ? String(reason || '').trim().slice(0, 500) : '', decidedAt: new Date(), decidedBy: req.admin._id } },
            { returnDocument: 'after' }
        );
        if (!request) return res.status(404).json({ message: 'That request is no longer waiting for a decision' });
        const teacher = await Teacher.findById(request.teacherId).select('name organizationId').lean();
        if (!teacher) {
            await TeacherOrgRequest.deleteOne({ _id: request._id });
            return res.status(404).json({ message: 'That teacher account no longer exists' });
        }
        if (decision === 'reject') return res.json({ message: `${teacher.name}'s request was rejected.` });

        // Joined only if they belong nowhere at this moment — the condition is
        // in the write, so a superadmin placing them elsewhere is not overwritten.
        const joined = (await Teacher.updateOne({ _id: teacher._id, organizationId: null }, { $set: { organizationId: req.organization._id, organizationJoinedAt: new Date() } })).modifiedCount === 1;
        if (!joined) {
            const fresh = await Teacher.findById(teacher._id).select('organizationId').lean();
            if (String(fresh?.organizationId || '') === String(req.organization._id)) return res.json({ message: `${teacher.name} is now a member of your organization.` });
            await TeacherOrgRequest.updateOne({ _id: request._id }, { $set: { status: 'cancelled', decisionReason: 'Joined another organization', decidedAt: new Date() } });
            return res.status(409).json({ code: 'JOINED_ELSEWHERE', message: `${teacher.name} has already joined another organization.` });
        }
        res.json({ message: `${teacher.name} is now a member of your organization.` });
    } catch (error) {
        console.error('[org-teachers] decision failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

const mine = (req) => (mongoose.isValidObjectId(req.params.teacherId)
    ? Teacher.findOne({ _id: req.params.teacherId, organizationId: req.organization._id })
    : null);

router.get('/:teacherId', async (req, res) => {
    try {
        const t = await mine(req);
        if (!t) return notMine(res);
        const o = t.toObject();
        for (const k of ['password', 'resetPasswordToken', 'resetPasswordExpiry']) delete o[k];
        res.json({ teacher: o, progress: await detail(t) });
    } catch (error) {
        console.error('[org-teachers] detail failed:', error.message);
        res.status(500).json({ message: 'Could not load this teacher.' });
    }
});

router.delete('/:teacherId', async (req, res) => {
    try {
        const t = await mine(req);
        if (!t) return notMine(res);
        t.organizationId = null;
        t.organizationJoinedAt = null;
        await t.save();
        // The old approval stays on record, marked as ended, so they may apply again.
        await TeacherOrgRequest.updateMany(
            { teacherId: t._id, organizationId: req.organization._id, status: 'approved' },
            { $set: { status: 'cancelled', decisionReason: 'Removed by the organization', decidedAt: new Date(), decidedBy: req.admin._id } }
        );
        res.json({ message: `${t.name} was removed from your organization. Their account and research stay theirs.` });
    } catch (error) {
        console.error('[org-teachers] remove failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
module.exports.countPending = countPending;
