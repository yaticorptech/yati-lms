/**
 * An organization's teachers — mounted at /api/organizations/me/teachers,
 * behind protectOrgAdmin and requireActiveOrganization.
 *
 *   GET    /                    my teachers, with their research progress (?search=)
 *   POST   /                    add a teacher { access: { organization, teacher }, … }:
 *                                  teacher dashboard — with a card, my member at once;
 *                                  organization dashboard — a limited sign-in to this panel (email, password);
 *                                  both — the two, linked, so Research opens inside the panel
 *   DELETE /staff/:adminId       take away an organization-dashboard sign-in
 *   PUT    /staff/:adminId       edit one { name, email, password?, organization, teacher, + card details }:
 *                                  organization off takes the panel sign-in away; teacher on makes their
 *                                  teacher account with the card (Research), as Add teacher does
 *   PUT    /:teacherId          edit a teacher { name, phone, department, designation,
 *                                  organization: bool, panelEmail?, panelPassword?, teacher: bool }:
 *                                  organization on/off gives or takes their sign-in to this panel;
 *                                  teacher off takes them out of my organization (a panel sign-in stays)
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
const Admin = require('../models/Admin');
const { validatePasswordStrength } = require('../middleware/validatePassword');
const { EMAIL_PATTERN, checkDetails } = require('./accounts');

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
        const [summaries, staff] = await Promise.all([
            summarise(rows),
            Admin.find({ organizationId: req.organization._id, staff: true }).select('name email staffTeacherId createdAt').sort({ name: 1 }).lean()
        ]);
        const q = search.toLowerCase();
        res.json({
            // Each teacher with what they can open; organization-dashboard-only sign-ins listed after.
            teachers: rows.map((r, i) => {
                const panel = staff.find((a) => String(a.staffTeacherId) === String(r._id));
                return { ...r, summary: summaries[i], orgAccess: Boolean(panel), panelEmail: panel?.email || '' };
            }),
            staff: staff.filter((a) => !a.staffTeacherId && (!q || `${a.name} ${a.email}`.toLowerCase().includes(q))),
            pendingRequests: await countPending(req.organization._id),
            orgCode: req.organization.orgCode
        });
    } catch (error) {
        console.error('[org-teachers] list failed:', error.message);
        res.status(500).json({ message: 'Could not load your teachers.' });
    }
});

const madeBy = (req) => req.organization.name;

/** The organization-dashboard sign-in's details, checked; throws AccountError. */
const staffDetails = async (body) => {
    const name = String(body.name || '').trim().slice(0, 100);
    const email = String(body.email || '').trim().toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';
    if (!name) throw new AccountError('Enter the teacher\'s name.', 'name');
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new AccountError('Enter a valid email address.', 'email');
    if (!password) throw new AccountError('Please choose a password.', 'password');
    const weak = validatePasswordStrength(password);
    if (weak) throw new AccountError(weak, 'password');
    if (await Admin.exists({ email })) throw new AccountError('This email already signs in to an organization panel. Use another.', 'email', 'EMAIL_TAKEN');
    return { name, email, password };
};

router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const access = { organization: Boolean(body.access?.organization), teacher: body.access ? Boolean(body.access.teacher) : true };
        if (!access.organization && !access.teacher) return res.status(400).json({ field: 'access', message: 'Choose the organization dashboard, the teacher dashboard, or both.' });
        // Checked first, so "both" never leaves a teacher account without its sign-in.
        const staff = access.organization ? await staffDetails(body) : null;
        if (!access.teacher) {
            const admin = await Admin.create({ ...staff, role: 'orgadmin', organizationId: req.organization._id, staff: true });
            return res.status(201).json({ _id: admin._id, name: admin.name, message: `${admin.name} can now sign in to this panel with ${admin.email} and the password you set.` });
        }
        const teacher = await createTeacher({ ...body, institution: body.institution || req.organization.name }, { by: 'organization', organizationId: req.organization._id });
        sendWelcome(teacher, body.password, madeBy(req));
        if (staff) {
            try {
                await Admin.create({ ...staff, role: 'orgadmin', organizationId: req.organization._id, staff: true, staffTeacherId: teacher._id });
            } catch (error) {
                console.error('[org-teachers] panel sign-in failed:', error.message);
                return res.status(201).json({ _id: teacher._id, name: teacher.name, message: `${teacher.name} was added with the teacher dashboard, but their organization-dashboard sign-in could not be made. Try adding it again.` });
            }
            return res.status(201).json({ _id: teacher._id, name: teacher.name, message: `${teacher.name} was added. They sign in to this panel with ${staff.email} (Research is in its menu), and to the teacher dashboard with their card.` });
        }
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

router.delete('/staff/:adminId', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.adminId)) return notMine(res);
        const gone = await Admin.findOneAndDelete({ _id: req.params.adminId, organizationId: req.organization._id, staff: true });
        if (!gone) return notMine(res);
        res.json({ message: `${gone.name} can no longer sign in to this panel.` });
    } catch (error) {
        console.error('[org-teachers] staff remove failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

/** A new or changed panel password, checked; '' when none was given. Throws AccountError. */
const panelPassword = (v, required) => {
    const password = typeof v === 'string' ? v : '';
    if (!password) { if (required) throw new AccountError('Choose a password for their sign-in to this panel.', 'panelPassword'); return ''; }
    const weak = validatePasswordStrength(password);
    if (weak) throw new AccountError(weak, 'panelPassword');
    return password;
};
/** A panel email not used by any other panel sign-in. Throws AccountError. */
const panelEmail = async (v, exceptId) => {
    const email = String(v || '').trim().toLowerCase();
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new AccountError('Enter a valid email address.', 'panelEmail');
    if (await Admin.exists({ email, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })) throw new AccountError('This email already signs in to an organization panel. Use another.', 'panelEmail', 'EMAIL_TAKEN');
    return email;
};

router.put('/staff/:adminId', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.adminId)) return notMine(res);
        const admin = await Admin.findOne({ _id: req.params.adminId, organizationId: req.organization._id, staff: true });
        if (!admin) return notMine(res);
        const b = req.body || {};
        const keepPanel = b.organization === undefined ? true : Boolean(b.organization);
        const addTeacher = Boolean(b.teacher) && !admin.staffTeacherId;
        if (!keepPanel && !addTeacher) {
            await admin.deleteOne();
            return res.json({ message: `${admin.name} can no longer sign in to this panel.` });
        }
        const name = String(b.name || '').trim().slice(0, 100);
        if (!name) throw new AccountError('Enter the teacher\'s name.', 'name');
        const email = await panelEmail(b.email, admin._id);
        const password = panelPassword(b.password, false);

        // The teacher dashboard: a teacher account with their card, as Add teacher makes it.
        if (addTeacher) {
            const teacher = await createTeacher({
                name, email, phone: b.phone, password: b.teacherPassword,
                CardNumber: b.CardNumber, CVV: b.CVV, qrCodeNumber: b.qrCodeNumber,
                institution: req.organization.name, department: b.department, designation: b.designation
            }, { by: 'organization', organizationId: req.organization._id });
            sendWelcome(teacher, b.teacherPassword, madeBy(req));
            admin.staffTeacherId = teacher._id;
        }
        if (!keepPanel) {
            await admin.deleteOne();
            return res.json({ message: `${name} now has the teacher dashboard only. Their sign-in details were emailed to ${email}.` });
        }
        admin.name = name;
        admin.email = email;
        if (password) admin.password = password;
        await admin.save();
        res.json({ message: addTeacher ? `${name} now has both dashboards: Research is in their menu here.` : `${name} saved.` });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        console.error('[org-teachers] staff edit failed:', error.message);
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
        for (const k of ['password', 'resetPasswordToken', 'resetPasswordExpiry', 'guideRead']) delete o[k];
        res.json({ teacher: o, progress: await detail(t) });
    } catch (error) {
        console.error('[org-teachers] detail failed:', error.message);
        res.status(500).json({ message: 'Could not load this teacher.' });
    }
});

router.put('/:teacherId', async (req, res) => {
    try {
        const t = await mine(req);
        if (!t) return notMine(res);
        const b = req.body || {};
        // Their own details; the email stays — it is their teacher sign-in.
        const { name, phone } = checkDetails({ name: b.name, email: t.email, phone: b.phone });
        t.name = name;
        t.phone = phone;
        if (b.department !== undefined) t.department = String(b.department).trim().slice(0, 200);
        if (b.designation !== undefined) t.designation = String(b.designation).trim().slice(0, 100);

        const admin = await Admin.findOne({ organizationId: req.organization._id, staff: true, staffTeacherId: t._id });
        const wantPanel = Boolean(b.organization);
        const keepTeacher = b.teacher === undefined ? true : Boolean(b.teacher);
        // Checked before anything is written, so a refusal changes nothing.
        let panel = null;
        if (wantPanel) {
            panel = {
                email: await panelEmail(b.panelEmail || admin?.email || t.email, admin?._id),
                password: panelPassword(b.panelPassword, !admin)
            };
        }
        await t.save();

        if (wantPanel && admin) {
            admin.name = name;
            admin.email = panel.email;
            if (panel.password) admin.password = panel.password;
            if (!keepTeacher) admin.staffTeacherId = null;
            await admin.save();
        } else if (wantPanel) {
            await Admin.create({ name, email: panel.email, password: panel.password, role: 'orgadmin', organizationId: req.organization._id, staff: true, staffTeacherId: keepTeacher ? t._id : null });
        } else if (admin) {
            await admin.deleteOne();
        }

        if (!keepTeacher) {
            // Out of my organization, as Remove does; a panel sign-in, if kept, stays on its own.
            t.organizationId = null;
            t.organizationJoinedAt = null;
            await t.save();
            await TeacherOrgRequest.updateMany(
                { teacherId: t._id, organizationId: req.organization._id, status: 'approved' },
                { $set: { status: 'cancelled', decisionReason: 'Teacher dashboard taken away by the organization', decidedAt: new Date(), decidedBy: req.admin._id } }
            );
        }
        res.json({ message: `${name} saved.` });
    } catch (error) {
        if (error instanceof AccountError) return accountError(res, error);
        console.error('[org-teachers] edit failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.delete('/:teacherId', async (req, res) => {
    try {
        const t = await mine(req);
        if (!t) return notMine(res);
        t.organizationId = null;
        t.organizationJoinedAt = null;
        await t.save();
        // Their sign-in to this panel goes with them.
        await Admin.deleteMany({ organizationId: req.organization._id, staff: true, staffTeacherId: t._id });
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
