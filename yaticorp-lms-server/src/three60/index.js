/**
 * The organization's courses and their sections, and 360 (2026-10-30).
 *
 * The organization lists its courses (BBA, BCA…) and how many sections each
 * has — organization panel → Teachers → Courses & sections, one list saved
 * at once — and opens 360 to its students. Each teacher with 360 turned on
 * marks, in their 360 dashboard, the classes they teach: a course, one of its
 * sections and the subject (a course has many subjects, each with its own
 * teacher). Separately, each teacher keeps their own set of the
 * organization's students, whose activities they will track — what is
 * tracked is still to be decided. A student sees the teachers tracking them
 * once 360 is open.
 *
 * Stored inside existing collections (the cluster is at its collection limit):
 *   Organization.three60   { enabled, programs: [{ name, sections: [{ name, teachers: [{ teacherId, subject }] }] }] }
 *                          ("programs" are the courses)
 *   Teacher.mentor360      360 on for the teacher (Teachers → the switches)
 *   Teacher.students360    the students that teacher tracks
 *
 * Three routers:
 *   orgAdmin  /api/organizations/me/classes   (protectOrgAdmin + an active organization)
 *   mentor    /api/teacher/360                (protectTeacher, 360 on)
 *   student   /api/user/360                   (protectUser)
 * Form mistakes answer 400 — a 401 signs the organization panel out.
 */
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../organizations/models/Organization');
const { Teacher } = require('../teacher/models');

const bad = (res, message, field) => res.status(400).json({ message, ...(field ? { field } : {}) });
const fail = (res, what, error) => {
    console.error(`[360] ${what} failed:`, error.message);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
};
const idOk = (id) => mongoose.isValidObjectId(id);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAX_PROGRAMS = 100;
const MAX_SECTIONS = 26;
const MAX_STUDENTS = 500;

/** The course and section by id in this organization, or nothing. */
const locate = (org, programId, sectionId) => {
    const program = idOk(programId) ? org.three60?.programs?.id(programId) || null : null;
    const section = program && idOk(sectionId) ? program.sections.id(sectionId) : null;
    return { program, section };
};

/** The organization's list: each course, its sections, and how many teachers marked each course. */
const overview = (org) => ({
    // Unlocked by the platform's superadmin (2026-11-04); until then the 360 Activities page is locked.
    allowed: require('./activities').unlocked(org),
    enabled: Boolean(org.three60?.enabled),
    // The 360 activities, in their categories (./activities.js).
    activityGroups: require('./activities').groupsView(org),
    programs: (org.three60?.programs || []).map((p) => ({
        _id: p._id, name: p.name,
        sections: p.sections.map((s) => ({ _id: s._id, name: s.name })),
        teachers: new Set(p.sections.flatMap((s) => (s.teachers || []).map((t) => String(t.teacherId)))).size
    }))
});

// ── The organization panel ─────────────────────────────────────────────────
const orgAdmin = express.Router();
const loadOrg = (req) => Organization.findById(req.organization._id);

orgAdmin.get('/', async (req, res) => {
    try { res.json(overview(await loadOrg(req))); } catch (error) { fail(res, 'overview', error); }
});

// { enabled }: whether its students see 360.
orgAdmin.put('/', async (req, res) => {
    try {
        const org = await loadOrg(req);
        const { unlocked, locked } = require('./activities');
        if (!unlocked(org)) return locked(res);
        if (typeof req.body?.enabled === 'boolean') org.set('three60.enabled', req.body.enabled);
        await org.save();
        res.json(overview(org));
    } catch (error) { fail(res, 'settings', error); }
});

/**
 * { programs: [{ _id?, name, sections }] }: the whole list, saved at once.
 * A course keeps its _id, and its first sections keep theirs — and the
 * classes teachers marked in them; more sections are added after (Section
 * C, D…), fewer drop the last ones. A course left out is removed.
 */
orgAdmin.put('/programs', async (req, res) => {
    try {
        const given = Array.isArray(req.body?.programs) ? req.body.programs : null;
        if (!given) return bad(res, 'Send the list of courses.');
        if (given.length > MAX_PROGRAMS) return bad(res, `You can add up to ${MAX_PROGRAMS} courses.`);
        const seen = new Set();
        const rows = [];
        for (const [i, p] of given.entries()) {
            const name = String(p?.name || '').trim();
            const count = Math.round(Number(p?.sections));
            if (!name) return res.status(400).json({ row: i, field: 'name', message: 'Every course needs a name, e.g. BBA.' });
            if (name.length > 80) return res.status(400).json({ row: i, field: 'name', message: 'Keep each course name under 80 characters.' });
            if (seen.has(name.toLowerCase())) return res.status(400).json({ row: i, field: 'name', message: `${name} is in the list twice.` });
            if (!Number.isFinite(count) || count < 1 || count > MAX_SECTIONS) return res.status(400).json({ row: i, field: 'sections', message: `${name}: 1 to ${MAX_SECTIONS} sections.` });
            seen.add(name.toLowerCase());
            rows.push({ _id: idOk(p?._id) ? String(p._id) : null, name, count });
        }
        const org = await loadOrg(req);
        const before = org.three60?.programs || [];
        const next = rows.map(({ _id, name, count }) => {
            const old = _id ? before.find((p) => String(p._id) === _id) : null;
            const kept = (old?.sections || []).slice(0, count).map((s) => s.toObject());
            const used = new Set(kept.map((s) => s.name.toLowerCase()));
            const added = [];
            for (const l of LETTERS) {
                if (kept.length + added.length >= count) break;
                if (!used.has(`section ${l}`.toLowerCase())) added.push({ name: `Section ${l}` });
            }
            return { ...(old ? { _id: old._id } : {}), name, sections: [...kept, ...added] };
        });
        org.set('three60.programs', next);
        await org.save();
        res.json(overview(org));
    } catch (error) { fail(res, 'save courses', error); }
});

/** A teacher who leaves the organization stops teaching its sections, and tracks none of its students. */
const forgetTeacher = async (organizationId, teacherId) => {
    try {
        await Organization.updateOne({ _id: organizationId }, { $pull: { 'three60.programs.$[].sections.$[].teachers': { teacherId } } });
        await Teacher.updateOne({ _id: teacherId }, { $set: { students360: [] } });
    } catch (error) { console.error('[classes] forget teacher failed:', error.message); }
};

// ── A teacher's 360 ────────────────────────────────────────────────────────
const mentor = express.Router();
// While 360 is locked (2026-11-04) a teacher keeps What I teach — the dashboard
// and its classes — and nothing else: no students, proof or marks.
mentor.use(async (req, res, next) => {
    if (req.path === '/' || req.path.startsWith('/classes')) return next();
    try {
        const { unlocked, locked } = require('./activities');
        const org = req.teacher.organizationId ? await Organization.findById(req.teacher.organizationId).select('three60.allowed').lean() : null;
        return unlocked(org) ? next() : locked(res);
    } catch (error) { return fail(res, 'check 360', error); }
});
const STUDENT_FIELDS = 'name email cardNumber phone profilePicture';
const studentView = (st) => ({ _id: st._id, name: st.name, email: st.email || '', phone: st.phone == null ? '' : String(st.phone), cardNumber: st.cardNumber == null ? '' : String(st.cardNumber), profilePicture: st.profilePicture || '' });
const myOrg = (req) => (req.teacher.organizationId ? Organization.findById(req.teacher.organizationId) : null);
const noOrg = (res) => res.status(400).json({ code: 'NO_ORGANIZATION', message: 'You are not a teacher of an organization yet.' });

/** The 360 dashboard: the courses to choose from, what I teach, and the students I track. */
const dashboard = async (org, teacherId) => {
    const me = String(teacherId);
    const programs = org.three60?.programs || [];
    const classes = [];
    for (const p of programs) {
        for (const s of p.sections) {
            for (const t of s.teachers || []) {
                if (String(t.teacherId) === me) classes.push({ _id: t._id, programId: p._id, sectionId: s._id, course: p.name, section: s.name, subject: t.subject || '' });
            }
        }
    }
    const { totalsOf, unlocked } = require('./activities');
    const isLocked = !unlocked(org);
    const t = await Teacher.findById(teacherId).select('students360').lean();
    // While locked, no students, activities or marks: only What I teach.
    const students = !isLocked && t?.students360?.length
        ? await User.find({ _id: { $in: t.students360 }, organizationId: org._id }).select(`${STUDENT_FIELDS} +activityProofs +activityMarks`).sort({ name: 1 }).lean()
        : [];
    return {
        organization: { name: org.name, logo: org.logo || '' },
        // Not unlocked by the platform yet: the 360 page says so (What I teach still works).
        locked: isLocked,
        courses: programs.map((p) => ({ _id: p._id, name: p.name, sections: p.sections.map((s) => ({ _id: s._id, name: s.name })) })),
        // The 360 activities its students upload proof for (./activities.js).
        activityGroups: isLocked ? [] : require('./activities').groupsView(org),
        classes,
        // Each with their activity marks so far and the proof waiting to be checked.
        students: students.map((st) => ({ ...studentView(st), marks: totalsOf(org, st.activityProofs, st.activityMarks).total,
            waiting: (st.activityProofs || []).filter((x) => x.status === 'pending').length }))
    };
};

mentor.get('/', async (req, res) => {
    try {
        const org = await myOrg(req);
        if (!org) return res.json({ organization: null, courses: [], classes: [], students: [] });
        res.json(await dashboard(org, req.teacher._id));
    } catch (error) { fail(res, 'dashboard', error); }
});

// { programId, sectionId, subject }: a class I teach — this course's section, this subject.
mentor.post('/classes', async (req, res) => {
    try {
        const org = await myOrg(req);
        if (!org) return noOrg(res);
        const subject = String(req.body?.subject || '').trim();
        const { program, section } = locate(org, req.body?.programId, req.body?.sectionId);
        if (!program) return bad(res, 'Choose the course.', 'programId');
        if (!section) return bad(res, 'Choose the section.', 'sectionId');
        if (!subject) return bad(res, 'Enter the subject you teach.', 'subject');
        if (subject.length > 80) return bad(res, 'Keep the subject under 80 characters.', 'subject');
        const me = String(req.teacher._id);
        if (section.teachers.some((t) => String(t.teacherId) === me && (t.subject || '').toLowerCase() === subject.toLowerCase())) {
            return bad(res, `You already teach ${subject} in ${program.name} ${section.name}.`, 'subject');
        }
        if (section.teachers.length >= 40) return bad(res, 'This section has as many teachers as it can take.');
        section.teachers.push({ teacherId: req.teacher._id, subject });
        await org.save();
        res.status(201).json(await dashboard(org, req.teacher._id));
    } catch (error) { fail(res, 'add class', error); }
});

// One of my classes off my list.
mentor.delete('/classes/:classId', async (req, res) => {
    try {
        const org = await myOrg(req);
        if (!org) return noOrg(res);
        let found = null;
        for (const p of org.three60?.programs || []) {
            for (const s of p.sections) {
                const row = idOk(req.params.classId) ? s.teachers.id(req.params.classId) : null;
                if (row && String(row.teacherId) === String(req.teacher._id)) found = row;
            }
        }
        if (!found) return res.status(404).json({ message: 'That class is not on your list.' });
        found.deleteOne();
        await org.save();
        res.json(await dashboard(org, req.teacher._id));
    } catch (error) { fail(res, 'remove class', error); }
});

// ?search=: the organization's students to choose from; `mine` when I already track them.
mentor.get('/students', async (req, res) => {
    try {
        const org = await myOrg(req);
        if (!org) return noOrg(res);
        const q = { organizationId: org._id };
        const search = String(req.query.search || '').trim().slice(0, 100);
        if (search) {
            const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            q.$or = [{ name: rx }, { email: rx }, { cardNumber: rx }, { phone: rx }];
        }
        const mine = new Set((req.teacher.students360 || []).map(String));
        const students = await User.find(q).select(STUDENT_FIELDS).sort({ name: 1 }).limit(300).lean();
        res.json({ students: students.map((st) => ({ ...studentView(st), mine: mine.has(String(st._id)) })) });
    } catch (error) { fail(res, 'students', error); }
});

// { studentIds }: these of the organization's students into my set.
mentor.post('/students', async (req, res) => {
    try {
        const org = await myOrg(req);
        if (!org) return noOrg(res);
        const ids = Array.isArray(req.body?.studentIds) ? req.body.studentIds.filter(idOk).slice(0, 300) : [];
        if (!ids.length) return bad(res, 'Choose the students to add.');
        const ours = await User.find({ _id: { $in: ids }, organizationId: org._id }).distinct('_id');
        const have = new Set((req.teacher.students360 || []).map(String));
        const fresh = ours.filter((id) => !have.has(String(id)));
        if (have.size + fresh.length > MAX_STUDENTS) return bad(res, `You can track up to ${MAX_STUDENTS} students.`);
        await Teacher.updateOne({ _id: req.teacher._id }, { $addToSet: { students360: { $each: fresh } } });
        res.json(await dashboard(org, req.teacher._id));
    } catch (error) { fail(res, 'add students', error); }
});

// One student out of my set.
mentor.delete('/students/:studentId', async (req, res) => {
    try {
        const org = await myOrg(req);
        if (!org) return noOrg(res);
        if (!idOk(req.params.studentId)) return res.status(404).json({ message: 'That student is not on your list.' });
        await Teacher.updateOne({ _id: req.teacher._id }, { $pull: { students360: new mongoose.Types.ObjectId(req.params.studentId) } });
        res.json(await dashboard(org, req.teacher._id));
    } catch (error) { fail(res, 'remove student', error); }
});

// ── The student ────────────────────────────────────────────────────────────
const student = express.Router();

// Whether their organization has opened 360, and the teachers tracking them, with what they teach.
student.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('organizationId').lean();
        const org = user?.organizationId ? await Organization.findById(user.organizationId).select('name three60').lean() : null;
        if (!org?.three60?.enabled || !require('./activities').unlocked(org)) return res.json({ enabled: false });
        const teachers = await Teacher.find({ organizationId: org._id, mentor360: true, students360: req.user._id }).select('name email phone').sort({ name: 1 }).lean();
        // Only the students a 360 teacher has added take part (2026-10-31): for the others 360 stays shut.
        if (!teachers.length) return res.json({ enabled: false, notAdded: true });
        const subjectsOf = {};
        for (const p of org.three60.programs || []) {
            for (const s of p.sections || []) {
                for (const t of s.teachers || []) if (t.subject) (subjectsOf[String(t.teacherId)] ||= new Set()).add(t.subject);
            }
        }
        res.json({
            enabled: true,
            organization: org.name,
            teachers: teachers.map((t) => ({ name: t.name, email: t.email || '', phone: t.phone || '', subjects: [...(subjectsOf[String(t._id)] || [])] })),
            // The activities, the student's proofs and their marks (./activities.js).
            ...(await require('./activities').studentActivities(org, req.user._id))
        });
    } catch (error) { fail(res, 'student 360', error); }
});

// The 360 activities: the organization's list, students' proofs, teachers' marks.
require('./activities').install({ orgAdmin, mentor, student });

module.exports = { orgAdmin, mentor, student, forgetTeacher, overview };
