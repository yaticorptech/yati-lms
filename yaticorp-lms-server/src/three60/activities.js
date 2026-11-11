/**
 * 360 activities (2026-10-31): the organization lists its activities in
 * categories (Academic Excellence → Handwritten Assignments, Presentations…),
 * each worth either "up to N marks" (mode max) or "N points per proof"
 * (mode each, e.g. Individual activities, 1 point each).
 *
 * Who takes part: once the organization opens 360 to students, the students
 * a 360 teacher has added to their "My students" list — only those — see the
 * activities and upload proof for each: a picture or PDF of what they got (a
 * corrected assignment sheet with its marks, a marks card, a certificate, a
 * fee receipt…). Only those teachers check it:
 *   "up to N"   the teacher looks at all the student's proof for the activity
 *               and gives ONE mark for it, 0–N (changed later if more comes);
 *   "per proof" each accepted proof adds N;
 *   any proof can be sent back with a reason, for the student to upload again.
 *
 * Limits (2026-11-06): a "per proof" activity can have a cap (1 per presentation,
 * at most 5): past it the teacher can still accept proof, so it is on the
 * student's record, but it gives 0 marks. An activity can also have a bonus
 * ("bonusMax"): on accepting proof the teacher may add bonus marks, up to that
 * much in all; bonus adds to the score, not to the total. An activity
 * marked "extra" (a bonus, or one for a single year such as Mock Interview)
 * adds to the student's score but not to the maximum, so the list adds up to
 * the organization's target (360) while those stay on top of it. One activity
 * name appears once in the whole list, so nothing is scored twice.
 *
 * Stored inside existing collections (the cluster is at its collection limit):
 *   Organization.three60.activityGroups   [{ name, activities: [{ name, mode, marks, cap, bonus }] }]
 *   Organization.three60.targetTotal      e.g. 360: what the list should add up to (a check only)
 *   User.activityProofs                   [{ activityId, fileUrl, status, … }]
 *   User.activityMarks                    [{ activityId, marks, by, byName, at }]  ("up to N")
 *
 * install() adds the routes to the three 360 routers in ./index.js:
 *   orgAdmin  PUT  /activities                         the whole list, saved at once
 *   student   POST /proofs (multipart: file, activityId, note), DELETE /proofs/:proofId
 *   mentor    GET  /proofs?status=                     proof of my students, to check
 *             PUT  /proofs/:studentId/:proofId         { decision: approve|reject, marks?, note? }
 *             GET  /students/:studentId/activities     one student: every activity, proof and mark
 *             PUT  /students/:studentId/activities/:activityId  { marks }   ("up to N")
 */
const mongoose = require('mongoose');
const multer = require('multer');
const axios = require('axios');
const User = require('../models/User');
const Organization = require('../organizations/models/Organization');
const { Teacher } = require('../teacher/models');
const { assertDriveLinked, storeInDrive, sendDriveError, removeFile } = require('../integrations/google/driveStore');

const MAX_BYTES = 10 * 1024 * 1024;
// As many as the student likes (2026-11-04); this only keeps the student record a safe size.
const MAX_PROOFS = 5000;
const idOk = (id) => mongoose.isValidObjectId(id);
const bad = (res, message, extra = {}) => res.status(400).json({ message, ...extra });
const fail = (res, what, error) => {
    console.error(`[360 activities] ${what} failed:`, error.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
/** Whether the platform's superadmin has unlocked 360 for the organization (2026-11-04). A 403, never a 401: that signs the panel out. */
const unlocked = (org) => Boolean(org?.three60?.allowed);
const locked = (res) => res.status(403).json({ code: 'THREE60_LOCKED', message: '360 is locked for your organization. Ask the YATICORP team to unlock it.' });
const same = (a, b) => String(a) === String(b);
const round = (n) => Math.round(n * 100) / 100;
const MAX_CAP = 100000;

/** The categories as the pages show them. */
const groupsView = (org) => (org?.three60?.activityGroups || []).map((g) => ({
    _id: g._id, name: g.name,
    activities: (g.activities || []).map((a) => ({
        _id: a._id, name: a.name, mode: a.mode || 'max', marks: a.marks ?? 0,
        cap: a.mode === 'each' && a.cap != null ? a.cap : null, bonus: Boolean(a.bonus), bonusMax: a.bonusMax || 0
    }))
}));
/** The most one activity can give: N for "up to N", the cap for "per proof" (null when it has none). */
const maxOf = (a) => (a.mode === 'each' ? (a.cap != null ? a.cap : null) : (a.marks || 0));
/**
 * What the list adds up to: { possible, extra, uncapped, target, groups: [{ name, possible, extra }] }.
 * `possible` leaves out extra activities; `uncapped` names the "per proof" activities without a
 * cap, which make the maximum open-ended (each counted once at its marks).
 */
const summaryOf = (org) => {
    let possible = 0; let extra = 0;
    const uncapped = [];
    const groups = (org?.three60?.activityGroups || []).map((g) => {
        let gp = 0; let ge = 0;
        for (const a of g.activities || []) {
            const top = maxOf(a);
            if (top == null) uncapped.push(a.name);
            const n = top == null ? (a.marks || 0) : top;
            if (a.bonus) ge += n; else gp += n;
            ge += a.bonusMax || 0;
        }
        possible += gp; extra += ge;
        return { _id: g._id, name: g.name, possible: round(gp), extra: round(ge) };
    });
    const target = org?.three60?.targetTotal;
    return { possible: round(possible), extra: round(extra), uncapped, target: target == null ? null : target, groups };
};
/** The activity by id, with its category. */
const findActivity = (org, activityId) => {
    for (const g of org?.three60?.activityGroups || []) {
        const a = (g.activities || []).find((x) => same(x._id, activityId));
        if (a) return { group: g, activity: a };
    }
    return {};
};
const markOf = (marks, activityId) => (marks || []).find((m) => same(m.activityId, activityId)) || null;
/**
 * What one activity gives a student: "per proof" is N for each accepted proof;
 * "up to N" is the marks given to each accepted proof, added up and never above
 * N (2026-11-04). A mark given the old way, on the whole activity, counts until
 * its proofs have marks of their own.
 */
const gotFor = (activity, proofs, marks) => {
    const accepted = (proofs || []).filter((p) => same(p.activityId, activity._id) && p.status === 'approved');
    return round(baseFor(activity, accepted, marks) + bonusOf(activity, accepted));
};
/** The bonus the teacher added on the accepted proof, never above the activity's bonusMax. */
const bonusOf = (activity, accepted) => Math.min(activity.bonusMax || 0, accepted.reduce((n, p) => n + (Number(p.bonusMarks) || 0), 0));
const baseFor = (activity, accepted, marks) => {
    if (activity.mode === 'each') {
        const got = accepted.reduce((n, p) => n + (Number(p.marks) || 0), 0);
        return activity.cap != null ? Math.min(activity.cap, got) : got;
    }
    const perProof = accepted.reduce((n, p) => n + (Number(p.marks) || 0), 0);
    if (perProof > 0) return Math.min(activity.marks || 0, perProof);
    const m = markOf(marks, activity._id);
    return m ? Math.min(activity.marks || 0, m.marks || 0) : 0;
};
/** Each activity's total for a student, and the whole. */
const totalsOf = (org, proofs, marks) => {
    const byActivity = {};
    let total = 0;
    for (const g of org?.three60?.activityGroups || []) {
        for (const a of g.activities || []) {
            const got = gotFor(a, proofs, marks);
            byActivity[String(a._id)] = got;
            total += got;
        }
    }
    return { byActivity, total: round(total) };
};
const proofView = (p) => ({
    _id: p._id, activityId: p.activityId, activityName: p.activityName, groupName: p.groupName,
    fileUrl: p.fileUrl, previewUrl: p.previewUrl || (p.fileType === 'image' && !p.driveFileId ? p.fileUrl : ''), inDrive: Boolean(p.driveFileId),
    fileType: p.fileType, fileName: p.fileName, note: p.note,
    status: p.status, marks: p.marks, bonusMarks: p.bonusMarks || 0, reviewerName: p.reviewerName, reviewNote: p.reviewNote, reviewedAt: p.reviewedAt, createdAt: p.createdAt
});
const markView = (m) => ({ activityId: m.activityId, marks: m.marks, byName: m.byName || '', at: m.at });

/** Whether a 360 teacher of the organization has this student on their list: only then do they take part. */
const isTracked = (orgId, userId) => Teacher.exists({ organizationId: orgId, mentor360: true, students360: userId });

/** { groups: [{ _id?, name, activities: [{ _id?, name, mode, marks }] }] } → the list to store, or { error }. */
const cleanGroups = (given) => {
    if (!Array.isArray(given)) return { error: { message: 'Send the list of activities.' } };
    if (given.length > 30) return { error: { message: 'You can have up to 30 categories.' } };
    const groups = [];
    const seenGroups = new Set();
    // Each activity once in the whole list: the same one in two categories would count twice.
    const seenAll = new Map();
    for (const [gi, g] of given.entries()) {
        const name = String(g?.name || '').trim();
        if (!name) return { error: { group: gi, field: 'name', message: 'Every category needs a name, e.g. Academic Excellence.' } };
        if (name.length > 80) return { error: { group: gi, field: 'name', message: 'Keep each category name under 80 characters.' } };
        if (seenGroups.has(name.toLowerCase())) return { error: { group: gi, field: 'name', message: `${name} is in the list twice.` } };
        seenGroups.add(name.toLowerCase());
        const list = Array.isArray(g.activities) ? g.activities : [];
        if (list.length > 60) return { error: { group: gi, message: `${name}: up to 60 activities.` } };
        const seen = new Set();
        const activities = [];
        for (const [ai, a] of list.entries()) {
            const an = String(a?.name || '').trim();
            const marks = Number(a?.marks);
            if (!an) return { error: { group: gi, activity: ai, field: 'name', message: `${name}: every activity needs a name.` } };
            if (an.length > 120) return { error: { group: gi, activity: ai, field: 'name', message: `${name}: keep each activity name under 120 characters.` } };
            if (seen.has(an.toLowerCase())) return { error: { group: gi, activity: ai, field: 'name', message: `${an} is in ${name} twice.` } };
            if (!Number.isFinite(marks) || marks < 0 || marks > 1000) return { error: { group: gi, activity: ai, field: 'marks', message: `${an}: marks from 0 to 1000.` } };
            if (seenAll.has(an.toLowerCase())) return { error: { group: gi, activity: ai, field: 'name', message: `${an} is already in ${seenAll.get(an.toLowerCase())}: keep each activity in one category, or it counts twice.` } };
            const mode = a?.mode === 'each' ? 'each' : 'max';
            // The cap of a "per proof" activity: blank for no limit.
            let cap = null;
            if (mode === 'each' && a?.cap != null && a.cap !== '') {
                cap = Number(a.cap);
                if (!Number.isFinite(cap) || cap < 0 || cap > MAX_CAP) return { error: { group: gi, activity: ai, field: 'cap', message: `${an}: the most it can give is from 0 to ${MAX_CAP}, or blank for no limit.` } };
                if (cap < marks) return { error: { group: gi, activity: ai, field: 'cap', message: `${an}: the most it can give (${cap}) is less than one proof's marks (${marks}).` } };
                cap = round(cap);
            }
            seen.add(an.toLowerCase());
            seenAll.set(an.toLowerCase(), name);
            const bonusMax = a?.bonusMax == null || a.bonusMax === '' ? 0 : Number(a.bonusMax);
            if (!Number.isFinite(bonusMax) || bonusMax < 0 || bonusMax > 1000) return { error: { group: gi, activity: ai, field: 'bonusMax', message: `${an}: bonus from 0 to 1000.` } };
            activities.push({ ...(idOk(a?._id) ? { _id: a._id } : {}), name: an, mode, marks: round(marks), cap, bonus: a?.bonus === true || a?.bonus === 'true', bonusMax: round(bonusMax) });
        }
        groups.push({ ...(idOk(g?._id) ? { _id: g._id } : {}), name, activities });
    }
    return { groups };
};
/** The target total: blank for none, or 0–100000. */
const cleanTarget = (given) => {
    if (given == null || given === '') return { target: null };
    const n = Number(given);
    if (!Number.isFinite(n) || n < 0 || n > MAX_CAP) return { error: { field: 'targetTotal', message: `The total to aim for is from 0 to ${MAX_CAP}, or blank.` } };
    return { target: round(n) };
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
        cb(ok ? null : new Error('Upload a picture or a PDF.'), ok);
    }
});
const storeFile = async (buffer, name) => {
    const { uploadToBunny } = require('../utils/bunnyStorage');
    const url = await uploadToBunny(buffer, name, 'lms_360_proofs');
    return { fileUrl: url, objectPath: url.split('/').slice(3).join('/') };
};
const dropFile = (objectPath) => {
    if (!objectPath || !process.env.BUNNY_STORAGE_ZONE) return Promise.resolve();
    return axios.delete(`https://${process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com'}/${process.env.BUNNY_STORAGE_ZONE}/${objectPath}`, { headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY } })
        .catch((e) => console.warn('[360 activities] proof file not removed:', e.message));
};

/** The teacher's mark for an "up to N" activity: replaced if there is one, added if not. */
const setMark = async (studentId, activityId, marks, teacher) => {
    const entry = { activityId, marks, by: teacher._id, byName: teacher.name || '', at: new Date() };
    const r = await User.updateOne({ _id: studentId, 'activityMarks.activityId': activityId }, { $set: { 'activityMarks.$': entry } });
    if (!r.matchedCount) await User.updateOne({ _id: studentId, 'activityMarks.activityId': { $ne: activityId } }, { $push: { activityMarks: entry } });
};
const reviewed = (teacher, extra = {}) => ({
    'activityProofs.$[p].reviewedBy': teacher._id, 'activityProofs.$[p].reviewerName': teacher.name || '', 'activityProofs.$[p].reviewedAt': new Date(), ...extra
});

/** One student, as their 360 teacher sees them: every activity with its proof and mark. */
const sheetOf = async (org, studentId) => {
    const st = await User.findOne({ _id: studentId, organizationId: org._id }).select('name cardNumber profilePicture +activityProofs +activityMarks').lean();
    if (!st) return null;
    const proofs = st.activityProofs || [];
    const marks = st.activityMarks || [];
    return {
        student: { _id: st._id, name: st.name, cardNumber: st.cardNumber == null ? '' : String(st.cardNumber), profilePicture: st.profilePicture || '' },
        groups: groupsView(org).map((g) => ({
            ...g,
            activities: g.activities.map((a) => {
                const m = a.mode === 'each' ? null : markOf(marks, a._id);
                return { ...a, got: gotFor(a, proofs, marks), mark: m ? markView(m) : null,
                    proofs: proofs.filter((p) => same(p.activityId, a._id)).sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt)).map(proofView) };
            })
        })),
        total: totalsOf(org, proofs, marks).total,
        waiting: proofs.filter((p) => p.status === 'pending').length
    };
};

const install = ({ orgAdmin, mentor, student }) => {
    // ── The organization: the whole list, saved at once ──────────────────
    orgAdmin.put('/activities', async (req, res) => {
        try {
            const { groups, error } = cleanGroups(req.body?.groups);
            if (error) return bad(res, error.message, error);
            // The total to aim for comes with the list; left as it is when not sent.
            const target = 'targetTotal' in (req.body || {}) ? cleanTarget(req.body.targetTotal) : null;
            if (target?.error) return bad(res, target.error.message, target.error);
            const org = await Organization.findById(req.organization._id);
            if (!unlocked(org)) return locked(res);
            org.set('three60.activityGroups', groups);
            if (target) org.set('three60.targetTotal', target.target);
            await org.save();
            res.json({ activityGroups: groupsView(org), summary: summaryOf(org) });
        } catch (error) { fail(res, 'save', error); }
    });

    /*
     * The top three students by 360 score in each department (course) the organization added (2026-11-05, on the
     * 360 Activities page). A student has no department of their own: they are in a course when a 360 teacher who
     * teaches one of its sections has them on their list. Only scores above 0 are ranked.
     */
    orgAdmin.get('/toppers', async (req, res) => {
        try {
            const org = await Organization.findById(req.organization._id).select('three60').lean();
            if (!unlocked(org)) return res.json({ departments: [] });
            const programs = org.three60?.programs || [];
            const teachers = await Teacher.find({ organizationId: org._id, mentor360: true }).select('name students360').lean();
            const nameOf = new Map(teachers.map((t) => [String(t._id), t.name || '']));
            const listOf = new Map(teachers.map((t) => [String(t._id), (t.students360 || []).map(String)]));
            // Per course: each student → the course's 360 teachers (mentors) who have them on their list.
            const mentorsOf = programs.map((p) => {
                const byStudent = new Map();
                for (const sec of p.sections || []) for (const t of sec.teachers || []) {
                    const tid = String(t.teacherId);
                    for (const id of listOf.get(tid) || []) {
                        if (!byStudent.has(id)) byStudent.set(id, new Set());
                        byStudent.get(id).add(tid);
                    }
                }
                return byStudent;
            });
            const studentsOf = mentorsOf.map((m) => new Set(m.keys()));
            const all = [...new Set(studentsOf.flatMap((ids) => [...ids]))];
            const users = all.length
                ? await User.find({ _id: { $in: all }, organizationId: org._id }).select('name cardNumber profilePicture +activityProofs +activityMarks').lean()
                : [];
            const scored = new Map(users.map((u) => [String(u._id), {
                _id: u._id, name: u.name, cardNumber: u.cardNumber == null ? '' : String(u.cardNumber), profilePicture: u.profilePicture || '',
                score: totalsOf(org, u.activityProofs, u.activityMarks).total
            }]));
            const departments = programs.map((p, i) => {
                const rows = [...studentsOf[i]].map((id) => scored.get(id) && {
                    ...scored.get(id), mentors: [...mentorsOf[i].get(id)].map((tid) => nameOf.get(tid)).filter(Boolean).sort()
                }).filter(Boolean);
                return {
                    _id: p._id, name: p.name, students: rows.length,
                    top: rows.filter((r) => r.score > 0).sort((x, y) => y.score - x.score || x.name.localeCompare(y.name)).slice(0, 3)
                };
            });
            res.json({ departments });
        } catch (error) { fail(res, 'toppers', error); }
    });

    // ── A student: proof for an activity ─────────────────────────────────
    student.post('/proofs', (req, res) => {
        upload.single('file')(req, res, async (uploadErr) => {
            try {
                if (uploadErr) return bad(res, uploadErr.code === 'LIMIT_FILE_SIZE' ? 'That file is over 10 MB — choose a lighter one.' : uploadErr.message);
                if (!req.file) return bad(res, 'Attach the proof: a picture or a PDF.');
                const user = await User.findById(req.user._id).select('organizationId +activityProofs').lean();
                const org = user?.organizationId ? await Organization.findById(user.organizationId).select('three60').lean() : null;
                if (!org?.three60?.enabled || !unlocked(org)) return res.status(403).json({ message: '360 is not open for you yet.' });
                if (!(await isTracked(org._id, req.user._id))) return res.status(403).json({ code: 'NOT_ADDED', message: 'Your 360 teacher has not added you yet.' });
                const { group, activity } = idOk(req.body?.activityId) ? findActivity(org, req.body.activityId) : {};
                if (!activity) return bad(res, 'Choose the activity this proof is for.');
                if ((user.activityProofs || []).length >= MAX_PROOFS) return bad(res, `You can keep up to ${MAX_PROOFS} proofs.`);
                // Kept in the student's own Google Drive (2026-11-02): linked first, or no upload.
                const toDrive = await assertDriveLinked(req.user._id);
                const isPdf = req.file.mimetype === 'application/pdf' || /\.pdf$/i.test(req.file.originalname || '');
                const fileName = String(req.file.originalname || (isPdf ? 'proof.pdf' : 'proof.jpg')).slice(0, 200);
                // Their Drive, shared by link: the view link is what their 360 teacher opens to check it.
                const stored = toDrive
                    ? await storeInDrive(req.user._id, req.file.buffer, { name: fileName, mimeType: isPdf ? 'application/pdf' : req.file.mimetype, description: `360 proof: ${group.name} › ${activity.name}` })
                        .then((d) => ({ fileUrl: d.viewUrl, previewUrl: d.previewUrl, driveFileId: d.driveFileId, objectPath: '' }))
                    : await storeFile(req.file.buffer, fileName);
                const proof = {
                    _id: new mongoose.Types.ObjectId(), activityId: activity._id, activityName: activity.name, groupName: group.name,
                    ...stored, fileType: isPdf ? 'pdf' : 'image', fileName, note: String(req.body?.note || '').trim().slice(0, 300), status: 'pending', marks: 0, createdAt: new Date(), updatedAt: new Date()
                };
                await User.updateOne({ _id: req.user._id }, { $push: { activityProofs: proof } });
                res.status(201).json({ proof: proofView(proof) });
            } catch (error) { if (!sendDriveError(res, error)) fail(res, 'upload proof', error); }
        });
    });

    // Proof not yet accepted can be taken back.
    student.delete('/proofs/:proofId', async (req, res) => {
        try {
            if (!idOk(req.params.proofId)) return res.status(404).json({ message: 'That proof was not found.' });
            const user = await User.findById(req.user._id).select('+activityProofs').lean();
            const proof = (user?.activityProofs || []).find((p) => same(p._id, req.params.proofId));
            if (!proof) return res.status(404).json({ message: 'That proof was not found.' });
            if (proof.status === 'approved') return bad(res, 'Your teacher has accepted this proof, so it stays.');
            await User.updateOne({ _id: req.user._id }, { $pull: { activityProofs: { _id: proof._id } } });
            if (proof.driveFileId) removeFile(req.user._id, proof.driveFileId); else dropFile(proof.objectPath);
            res.json({ message: 'Proof removed.' });
        } catch (error) { fail(res, 'remove proof', error); }
    });

    // ── A teacher: the proof of the students on their list ───────────────
    const mine = (req, studentId) => (req.teacher.students360 || []).some((id) => same(id, studentId));
    const notMine = (res) => res.status(403).json({ message: 'Only this student\'s 360 teachers check their proof.' });
    const orgOf = (req) => Organization.findById(req.teacher.organizationId).select('three60').lean();

    mentor.get('/proofs', async (req, res) => {
        try {
            const orgId = req.teacher.organizationId;
            const ids = req.teacher.students360 || [];
            if (!orgId || !ids.length) return res.json({ proofs: [], pending: 0 });
            const org = await orgOf(req);
            const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
            const students = await User.find({ _id: { $in: ids }, organizationId: orgId }).select('name cardNumber profilePicture +activityProofs +activityMarks').lean();
            const rows = [];
            let pending = 0;
            for (const st of students) {
                for (const p of st.activityProofs || []) {
                    if (p.status === 'pending') pending += 1;
                    if (p.status !== status) continue;
                    const { activity } = findActivity(org, p.activityId);
                    const m = activity && activity.mode !== 'each' ? markOf(st.activityMarks, activity._id) : null;
                    rows.push({ ...proofView(p), student: { _id: st._id, name: st.name, cardNumber: st.cardNumber == null ? '' : String(st.cardNumber), profilePicture: st.profilePicture || '' },
                        activity: activity ? { mode: activity.mode || 'max', marks: activity.marks ?? 0, ...(activity.mode === 'each' && activity.cap != null ? { cap: activity.cap } : {}), ...(activity.bonusMax ? { bonusMax: activity.bonusMax } : {}) } : null,
                        // "Up to N": the mark given so far, and how much proof it was given on.
                        mark: m ? markView(m) : null,
                        accepted: (st.activityProofs || []).filter((x) => same(x.activityId, p.activityId) && x.status === 'approved').length });
                }
            }
            rows.sort((a, b) => (status === 'pending' ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0)));
            res.json({ proofs: rows, pending });
        } catch (error) { fail(res, 'list proofs', error); }
    });

    /*
     * One proof: { decision: 'approve' | 'reject', marks?, bonus?, note? }.
     *   approve, "up to N"   marks for this proof: 0 to what is left of N after the other accepted proofs
     *                        (again on an accepted proof changes its marks);
     *   approve, "per proof" adds N, or what is left below its most (0 once full: kept for the record);
     *   bonus                optional, 0 to what is left of the activity's bonusMax;
     *   reject               a reason is needed; the proof stops counting.
     */
    mentor.put('/proofs/:studentId/:proofId', async (req, res) => {
        try {
            const { studentId, proofId } = req.params;
            if (!idOk(studentId) || !idOk(proofId)) return res.status(404).json({ message: 'That proof was not found.' });
            if (!mine(req, studentId)) return notMine(res);
            const user = await User.findOne({ _id: studentId, organizationId: req.teacher.organizationId }).select('+activityProofs').lean();
            const proof = (user?.activityProofs || []).find((p) => same(p._id, proofId));
            if (!proof) return res.status(404).json({ message: 'That proof was not found.' });
            const decision = req.body?.decision;
            if (!['approve', 'reject'].includes(decision)) return bad(res, 'Accept the proof or send it back.');
            const org = await orgOf(req);
            const { activity } = findActivity(org, proof.activityId);
            if (!activity) return bad(res, 'This activity is no longer on the list.');
            const note = String(req.body?.note || '').trim().slice(0, 300);
            const at = { arrayFilters: [{ 'p._id': proof._id }] };
            if (decision === 'reject') {
                if (!note) return bad(res, 'Say why, so the student can upload the right proof.', { field: 'note' });
                await User.updateOne({ _id: studentId }, { $set: reviewed(req.teacher, { 'activityProofs.$[p].status': 'rejected', 'activityProofs.$[p].marks': 0, 'activityProofs.$[p].bonusMarks': 0, 'activityProofs.$[p].reviewNote': note }) }, at);
                return res.json({ message: 'Sent back to the student.' });
            }
            const acceptedHere = (user.activityProofs || []).filter((p) => same(p.activityId, activity._id) && p.status === 'approved' && !same(p._id, proof._id));
            // Bonus (2026-11-06): optional, within what is left of the activity's bonusMax.
            const bonusRoom = round(Math.max(0, (activity.bonusMax || 0) - acceptedHere.reduce((n, p) => n + (Number(p.bonusMarks) || 0), 0)));
            const givenBonus = req.body?.bonus;
            const bonus = givenBonus === '' || givenBonus == null ? 0 : Number(givenBonus);
            if (!Number.isFinite(bonus) || bonus < 0 || bonus > bonusRoom) {
                return bad(res, activity.bonusMax ? `Bonus from 0 to ${bonusRoom}${bonusRoom < activity.bonusMax ? ` (${round(activity.bonusMax - bonusRoom)} of ${activity.bonusMax} already given)` : ''}.` : `${activity.name} has no bonus.`, { field: 'bonus' });
            }
            const bonusText = bonus ? ` + ${round(bonus)} bonus` : '';
            if (activity.mode === 'each') {
                // Past its most (2026-11-06) the proof is still accepted, for the record, with 0 marks (or what is left).
                const given = acceptedHere.reduce((n, p) => n + (Number(p.marks) || 0), 0);
                const room = activity.cap != null ? Math.max(0, activity.cap - given) : Infinity;
                const gets = round(Math.min(activity.marks || 0, room));
                await User.updateOne({ _id: studentId }, { $set: reviewed(req.teacher, { 'activityProofs.$[p].status': 'approved', 'activityProofs.$[p].marks': gets, 'activityProofs.$[p].bonusMarks': round(bonus), 'activityProofs.$[p].reviewNote': note }) }, at);
                if (gets < (activity.marks || 0)) {
                    return res.json({ full: true, message: `Accepted with ${gets ? `+${gets}` : 'no'} marks${bonusText}: ${activity.name} has its most, ${activity.cap} marks.` });
                }
                return res.json({ message: `Accepted: +${gets} mark${gets === 1 ? '' : 's'}${bonusText}.` });
            }
            // This proof's own marks: what is left of the top once the other accepted proofs are counted.
            const others = acceptedHere.reduce((n, p) => n + (Number(p.marks) || 0), 0);
            const room = round(Math.max(0, (activity.marks || 0) - others));
            const marks = Number(req.body?.marks);
            if (req.body?.marks === '' || req.body?.marks == null || !Number.isFinite(marks) || marks < 0 || marks > room) {
                return bad(res, room < (activity.marks || 0) ? `Give 0 to ${room} marks: the other proofs here already have ${round(others)} of ${activity.marks}.` : `Give 0 to ${activity.marks} marks.`, { field: 'marks' });
            }
            await User.updateOne({ _id: studentId }, {
                $set: reviewed(req.teacher, { 'activityProofs.$[p].status': 'approved', 'activityProofs.$[p].marks': round(marks), 'activityProofs.$[p].bonusMarks': round(bonus), 'activityProofs.$[p].reviewNote': note }),
                // Marked by proof from now on: the old whole-activity mark goes.
                $pull: { activityMarks: { activityId: activity._id } }
            }, at);
            res.json({ message: `Accepted: ${round(marks)} marks${bonusText} (${round(others + marks)} / ${activity.marks} for ${activity.name}).` });
        } catch (error) { fail(res, 'check proof', error); }
    });

    // One student: every activity, with their proof and marks.
    mentor.get('/students/:studentId/activities', async (req, res) => {
        try {
            if (!idOk(req.params.studentId) || !mine(req, req.params.studentId)) return notMine(res);
            const sheet = await sheetOf(await orgOf(req), req.params.studentId);
            if (!sheet) return res.status(404).json({ message: 'That student was not found.' });
            res.json(sheet);
        } catch (error) { fail(res, 'student sheet', error); }
    });

    // The mark for an "up to N" activity, from all the proof seen: proof still waiting is accepted with it.
    mentor.put('/students/:studentId/activities/:activityId', async (req, res) => {
        try {
            const { studentId, activityId } = req.params;
            if (!idOk(studentId) || !mine(req, studentId)) return notMine(res);
            const org = await orgOf(req);
            const { activity } = idOk(activityId) ? findActivity(org, activityId) : {};
            if (!activity) return res.status(404).json({ message: 'That activity is not on the list.' });
            if (activity.mode === 'each') return bad(res, `${activity.name} gives ${activity.marks} for each proof: accept the proof instead.`);
            const user = await User.findOne({ _id: studentId, organizationId: req.teacher.organizationId }).select('+activityProofs').lean();
            if (!user) return res.status(404).json({ message: 'That student was not found.' });
            const proofs = (user.activityProofs || []).filter((p) => same(p.activityId, activity._id) && p.status !== 'rejected');
            if (!proofs.length) return bad(res, 'Marks are given on proof: there is none for this activity yet.');
            const marks = Number(req.body?.marks);
            if (req.body?.marks === '' || req.body?.marks == null || !Number.isFinite(marks) || marks < 0 || marks > (activity.marks || 0)) return bad(res, `Give 0 to ${activity.marks} marks.`, { field: 'marks' });
            await setMark(user._id, activity._id, round(marks), req.teacher);
            const waiting = proofs.filter((p) => p.status === 'pending').map((p) => p._id);
            if (waiting.length) {
                await User.updateOne({ _id: user._id }, { $set: reviewed(req.teacher, { 'activityProofs.$[p].status': 'approved' }) }, { arrayFilters: [{ 'p._id': { $in: waiting } }] });
            }
            res.json(await sheetOf(org, user._id));
        } catch (error) { fail(res, 'give marks', error); }
    });
};

/** The student's own view: the categories, their proofs, marks and totals (for GET /api/user/360). */
const studentActivities = async (org, userId) => {
    const user = await User.findById(userId).select('+activityProofs +activityMarks').lean();
    const proofs = user?.activityProofs || [];
    const marks = user?.activityMarks || [];
    const { possible, extra } = summaryOf(org);
    return { activityGroups: groupsView(org), proofs: proofs.map(proofView), marks: marks.map(markView), totals: { ...totalsOf(org, proofs, marks), possible, extra } };
};

module.exports = { install, groupsView, summaryOf, maxOf, studentActivities, totalsOf, cleanGroups, cleanTarget, isTracked, unlocked, locked };
