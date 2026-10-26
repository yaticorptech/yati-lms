/**
 * Teachers, for the admin panel — /api/admin/teachers
 *
 *   GET    /                      the list, newest first; ?q= searches name, email, card, institution;
 *                                 ?status=active|inactive|pending; ?organizationId=<id>|none
 *   POST   /                      add a teacher with a card (the card's number, CVV and QR)
 *   POST   /bulk                  add teachers from the Excel template (multipart "file")
 *   GET    /settings              { approvalRequired }
 *   PUT    /settings              { approvalRequired } — self-registered teachers wait for approval
 *   GET    /:id                   one teacher, with their research progress (never their writing)
 *   PUT    /:id                   edit details; a new password ends their sessions; organization (superadmin)
 *   PATCH  /:id/status            { status: 'active' | 'inactive', reason? } — approve, turn down, block, unblock
 *   POST   /:id/send-password-reset   email them a one-use reset link
 *   DELETE /:id                   delete the account and its research records; the card can be used again
 *
 * Putting a teacher into an organization is for superadmins only, as it is
 * for students. Form mistakes are 400s: the admin panel signs out on any 401.
 */
const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { protectAdmin } = require('../middleware/authMiddleware');
const Card = require('../models/Card');
const Setting = require('../models/Setting');
const Organization = require('../organizations/models/Organization');
const { validatePasswordStrength } = require('../middleware/validatePassword');
const { Teacher, ResearchProject, Publication, Thesis, WritingPiece, WritingLog, PlagiarismReport, TextVersion, PlagiarismSource, TeacherOrgRequest } = require('./models');
const { AccountError, createTeacher, createFromSheet, sendWelcome, checkDetails, emailTaken, escapeRegExp } = require('./accounts');
const { summarise, detail } = require('./progress');

const router = express.Router();
router.use(protectAdmin);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const LIST_FIELDS = 'name email phone cardNumber institution department designation status statusReason createdBy organizationId organizationJoinedAt loginCount lastLoginAt createdAt';
const isSuper = (req) => req.admin?.role === 'superadmin';
const accountError = (res, error) => res.status(400).json({ field: error.field, ...(error.code ? { code: error.code } : {}), message: error.message });

/** An organization a teacher can be put into: one that exists and is not pending or rejected. */
const organizationFor = async (id) => {
    if (!id) return null;
    if (!mongoose.isValidObjectId(id)) throw new AccountError('Choose an organization from the list.', 'organizationId');
    const org = await Organization.findById(id).select('name orgCode status').lean();
    if (!org || ['pending', 'rejected'].includes(org.status)) throw new AccountError('Choose an approved organization from the list.', 'organizationId');
    return org;
};

const orgShape = (org) => (org ? { _id: org._id, name: org.name, orgCode: org.orgCode } : null);

router.get('/', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim().slice(0, 100);
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = 50;
        const filter = {};
        if (q) filter.$or = ['name', 'email', 'cardNumber', 'institution', 'department'].map((k) => ({ [k]: new RegExp(escapeRegExp(q), 'i') }));
        if (['active', 'inactive', 'pending'].includes(req.query.status)) filter.status = req.query.status;
        if (req.query.organizationId === 'none') filter.organizationId = null;
        else if (mongoose.isValidObjectId(req.query.organizationId)) filter.organizationId = req.query.organizationId;
        const [rows, total, pending, settings] = await Promise.all([
            Teacher.find(filter).select(LIST_FIELDS).populate('organizationId', 'name orgCode').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            Teacher.countDocuments(filter),
            Teacher.countDocuments({ status: 'pending' }),
            Setting.findOne().select('teacherApprovalRequired').lean()
        ]);
        const summaries = await summarise(rows);
        // Kept for the list's activity column, as before.
        const ids = rows.map((r) => r._id);
        const count = (Model) => Model.aggregate([{ $match: { teacherId: { $in: ids } } }, { $group: { _id: '$teacherId', n: { $sum: 1 } } }]);
        const [projects, theses, pieces] = await Promise.all([count(ResearchProject), count(Thesis), count(WritingPiece)]);
        const map = (list) => new Map(list.map((x) => [String(x._id), x.n]));
        const [mp, mt, mw] = [map(projects), map(theses), map(pieces)];
        res.json({
            total, page, pages: Math.max(1, Math.ceil(total / limit)),
            pending,
            approvalRequired: Boolean(settings?.teacherApprovalRequired),
            canAssignOrganization: isSuper(req),
            teachers: rows.map((r, i) => ({
                ...r,
                organizationId: r.organizationId?._id || null,
                organization: orgShape(r.organizationId),
                summary: summaries[i],
                activity: { projects: mp.get(String(r._id)) || 0, publications: summaries[i].publications.total, theses: mt.get(String(r._id)) || 0, writing: mw.get(String(r._id)) || 0 }
            }))
        });
    } catch (error) {
        console.error('[teacher-admin] list failed:', error.message);
        res.status(500).json({ message: 'Could not load teachers.' });
    }
});

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const org = isSuper(req) ? await organizationFor(body.organizationId) : null;
        const teacher = await createTeacher(body, { by: 'admin', organizationId: org?._id || null, adminId: req.admin._id });
        sendWelcome(teacher, body.password, 'The YATICORP administrator');
        res.status(201).json({ _id: teacher._id, name: teacher.name, email: teacher.email, cardNumber: teacher.cardNumber, status: teacher.status, organization: orgShape(org), message: `${teacher.name} was added. Their sign-in details were emailed to ${teacher.email}.` });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        console.error('[teacher-admin] add failed:', error.message);
        res.status(500).json({ message: 'Could not add the teacher just now. Please try again.' });
    }
});

router.post('/bulk', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ field: 'file', message: 'Choose the filled-in Excel file first.' });
        const org = isSuper(req) && req.body?.organizationId ? await organizationFor(req.body.organizationId) : null;
        const results = await createFromSheet(req.file.buffer, { by: 'admin', organizationId: org?._id || null, adminId: req.admin._id });
        for (const { teacher, password } of results.created) sendWelcome(teacher, password, 'The YATICORP administrator');
        delete results.created;
        res.json({ message: `${results.successCount} added, ${results.failedCount} could not be added.`, results });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        console.error('[teacher-admin] bulk failed:', error.message);
        res.status(500).json({ message: 'The upload could not be finished. Please try again.' });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const s = await Setting.findOne().select('teacherApprovalRequired').lean();
        res.json({ approvalRequired: Boolean(s?.teacherApprovalRequired) });
    } catch (error) {
        console.error('[teacher-admin] settings failed:', error.message);
        res.status(500).json({ message: 'Could not load the setting.' });
    }
});

router.put('/settings', async (req, res) => {
    try {
        if (typeof req.body?.approvalRequired !== 'boolean') return res.status(400).json({ message: 'Say whether approval is required (true or false).' });
        const s = await Setting.findOneAndUpdate({}, { $set: { teacherApprovalRequired: req.body.approvalRequired } }, { upsert: true, returnDocument: 'after' }).select('teacherApprovalRequired').lean();
        res.json({ approvalRequired: Boolean(s.teacherApprovalRequired) });
    } catch (error) {
        console.error('[teacher-admin] settings save failed:', error.message);
        res.status(500).json({ message: 'Could not save the setting.' });
    }
});

const findTeacher = (id) => (mongoose.isValidObjectId(id) ? Teacher.findById(id) : null);

router.get('/:id', async (req, res) => {
    try {
        const t = await findTeacher(req.params.id);
        if (!t) return res.status(404).json({ message: 'Teacher not found.' });
        const org = t.organizationId ? await Organization.findById(t.organizationId).select('name orgCode status').lean() : null;
        const o = t.toObject();
        delete o.password; delete o.resetPasswordToken; delete o.resetPasswordExpiry;
        res.json({ teacher: { ...o, organization: orgShape(org) }, progress: await detail(t), canAssignOrganization: isSuper(req) });
    } catch (error) {
        console.error('[teacher-admin] detail failed:', error.message);
        res.status(500).json({ message: 'Could not load this teacher.' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const t = await findTeacher(req.params.id);
        if (!t) return res.status(404).json({ message: 'Teacher not found.' });
        const body = req.body || {};
        const details = checkDetails({ name: body.name ?? t.name, email: body.email ?? t.email, phone: body.phone ?? t.phone });
        if (details.email !== t.email && await emailTaken(details.email, t._id)) {
            return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'Another teacher account already uses this email address.' });
        }
        Object.assign(t, details);
        for (const [key, max] of [['institution', 200], ['department', 200], ['designation', 100]]) {
            if (body[key] !== undefined) t[key] = String(body[key] ?? '').trim().slice(0, max);
        }
        let passwordChanged = false;
        if (typeof body.password === 'string' && body.password) {
            const weak = validatePasswordStrength(body.password);
            if (weak) return res.status(400).json({ field: 'password', message: weak });
            t.password = body.password;            // hashed on save
            t.passwordChangedAt = new Date();
            passwordChanged = true;
        }
        if (body.organizationId !== undefined) {
            if (!isSuper(req)) return res.status(403).json({ message: 'Only a super admin can change a teacher’s organization.' });
            const org = await organizationFor(body.organizationId || null);
            const before = t.organizationId ? String(t.organizationId) : '';
            const after = org ? String(org._id) : '';
            if (before !== after) {
                t.organizationId = org?._id || null;
                t.organizationJoinedAt = org ? new Date() : null;
                // A request waiting anywhere is settled; an old membership is marked as ended.
                await TeacherOrgRequest.updateMany({ teacherId: t._id, status: 'pending' }, { $set: { status: 'cancelled', decisionReason: 'Placed by a platform administrator', decidedAt: new Date() } });
                if (before) await TeacherOrgRequest.updateMany({ teacherId: t._id, organizationId: before, status: 'approved' }, { $set: { status: 'cancelled', decisionReason: 'Removed by a platform administrator', decidedAt: new Date() } });
            }
        }
        await t.save();
        res.json({ message: passwordChanged ? `Saved. ${t.name} can now sign in with the new password; other sessions were signed out.` : 'Saved.', _id: t._id });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        if (error?.code === 11000 && error.keyPattern?.email) return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: 'Another teacher account already uses this email address.' });
        console.error('[teacher-admin] edit failed:', error.message);
        res.status(500).json({ message: 'Could not save the changes.' });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Teacher not found.' });
        const status = req.body?.status;
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ message: 'Status must be active or inactive.' });
        const reason = status === 'inactive' ? String(req.body?.reason || '').trim().slice(0, 500) : '';
        const before = await Teacher.findById(req.params.id).select('status').lean();
        if (!before) return res.status(404).json({ message: 'Teacher not found.' });
        const t = await Teacher.findByIdAndUpdate(req.params.id, { $set: { status, statusReason: reason } }, { returnDocument: 'after' }).select('name email status statusReason');
        // Approved after waiting: tell them they can sign in now.
        if (before.status === 'pending' && status === 'active') {
            const url = process.env.FRONTEND_URL || 'http://localhost:5173';
            require('../utils/emailService').sendEmail({
                to: t.email, toName: t.name, subject: 'Your YATICORP teacher account is approved',
                htmlContent: `<div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;"><h2 style="color:#059669">You're approved</h2><p>Hi ${t.name.replace(/[<>&"]/g, '')}, your teacher account is ready. Choose <strong>Teacher</strong> on the sign-in page and sign in with your card number and password.</p><p><a href="${url}/login?as=teacher" style="background:#059669;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">Sign in</a></p></div>`
            }).catch((error) => console.error('[teacher-admin] approval email failed:', error.message));
        }
        res.json({ _id: t._id, status: t.status, statusReason: t.statusReason });
    } catch (error) {
        console.error('[teacher-admin] status failed:', error.message);
        res.status(500).json({ message: 'Could not change the status.' });
    }
});

router.post('/:id/send-password-reset', async (req, res) => {
    try {
        const t = await findTeacher(req.params.id);
        if (!t) return res.status(404).json({ message: 'Teacher not found.' });
        const token = crypto.randomBytes(32).toString('hex');
        await Teacher.updateOne({ _id: t._id }, { $set: { resetPasswordToken: crypto.createHash('sha256').update(token).digest('hex'), resetPasswordExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) } });
        const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?as=teacher&token=${token}`;
        await require('../utils/emailService').sendEmail({
            to: t.email, toName: t.name, subject: 'Set a new password for your YATICORP teacher account',
            htmlContent: `<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;"><h2 style="color:#059669">Set a new password</h2><p>Hi ${t.name.replace(/[<>&"]/g, '')}, the administrator sent you this link to set a new password.</p><a href="${url}" style="display:inline-block;margin:20px 0;padding:12px 24px;background:#059669;color:#fff;font-weight:bold;text-decoration:none;border-radius:8px">Set my password</a><p style="color:#94a3b8;font-size:13px">The link works once and expires in 24 hours.</p></div>`
        });
        res.json({ message: `A reset link was emailed to ${t.email}. It works once, for 24 hours.` });
    } catch (error) {
        console.error('[teacher-admin] reset link failed:', error.message);
        res.status(500).json({ message: 'The email could not be sent just now. Try again, or set a new password with Edit.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const t = await findTeacher(req.params.id);
        if (!t) return res.status(404).json({ message: 'Teacher not found.' });
        await Promise.all([ResearchProject, Publication, Thesis, WritingPiece, WritingLog, PlagiarismReport, TextVersion, PlagiarismSource, TeacherOrgRequest]
            .map((M) => M.deleteMany({ teacherId: t._id })));
        // The card can open a new account again, as when a student is deleted.
        if (t.cardNumber) await Card.updateOne({ CardNumber: String(t.cardNumber).replace(/\D/g, ''), status: 'used' }, { $set: { status: 'unactivated' } });
        await t.deleteOne();
        res.json({ message: `${t.name}'s account and research records were deleted.` });
    } catch (error) {
        console.error('[teacher-admin] delete failed:', error.message);
        res.status(500).json({ message: 'Could not delete the teacher.' });
    }
});

module.exports = router;
