/**
 * Campus in the organization panel — mounted at /api/organizations/me/campus,
 * behind protectOrgAdmin and requireActiveOrganization. Who may do what:
 *
 *   admin       the organization's own sign-ins (and a superadmin viewing it):
 *               everything, for every department, and the departments themselves
 *   department  a department's sign-in (Admin.campusDepartmentId): its own
 *               department only — admissions, subjects, attendance, marks, fees,
 *               exams, admit cards, results, feedback
 *   board       the examination board's sign-in (Admin.campusExamBoard): the
 *               semester exams of every department — timetable, applications,
 *               admit cards, marks, marks cards — and publishing them, after
 *               which each student sees their own marks card
 *   admission   the admission office's sign-in (Admin.campusOffice): new admissions
 *               for every department — making the student's account from their AI
 *               card and their admission at once — the students' records, and fees
 *               collected at the counter. Departments then see their students' list.
 *   teacher     a teacher's panel sign-in (Admin.staff): attendance and internal
 *               marks for the subjects they are given (My classes)
 *
 *   GET    /context                         who I am here, and the departments I see
 *   GET    /overview?departmentId=          headline numbers
 *   *      /departments[/:id][/logins/:adminId]   (admin)
 *   GET    /teachers                        teachers who can be given subjects
 *   GET    /students?departmentId=&semester=&section=&search=&status=
 *   GET    /candidates?search=              the organization's students not admitted yet
 *   POST   /students                        admit one of the organization's students { userId, departmentId, semester, section, rollNo, … details }
 *   POST   /students/new                    a new student: { student: { name, email, phone, cardNumber, cvv, qrCodeNumber }, + the admission }
 *   POST   /students/bulk                   several at once { userIds, departmentId, semester, section, academicYear }
 *   POST   /students/promote                { departmentId, semester } → the next semester
 *   GET|PUT|DELETE /students/:id            the full record; edit; remove the admission
 *   POST   /students/:id/payments           record a fee received → receipt
 *   DELETE /students/:id/payments/:pid      cancel a receipt
 *   *      /subjects[/:id]
 *   GET|PUT /attendance/session?subjectId=&date=&period=&section=
 *   GET    /attendance/report?subjectId= | departmentId=&semester=  &section=
 *   GET|PUT /marks/sheet?examId=&subjectId=&section=
 *   *      /fees[/:id], GET /fees/ledger
 *   *      /exams[/:id], /exams/:id/applications[/:studentId|/bulk], /exams/:id/results, /exams/:id/hall-ticket/:studentId
 *   *      /feedback[/:id], GET /feedback/:id/report
 *   GET    /teach                           my subjects and their internal assessments
 *
 * The organization is req.organization, from the signed-in account, never from
 * the request; a department's sign-in never sees another department.
 */
const express = require('express');
const Admin = require('../models/Admin');
const User = require('../models/User');
const { validatePasswordStrength } = require('../middleware/validatePassword');
const C = require('./core');
const { hallTicket } = require('./student');

const router = express.Router();
const { str, int, num, idOk, same, ObjectId } = C;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODES = ['cash', 'upi', 'card', 'bank', 'cheque', 'dd', 'online'];
const bad = (res, message, field) => res.status(400).json({ message, ...(field ? { field } : {}) });
const nope = (res, message = 'You cannot do this here.') => res.status(403).json({ message });
const gone = (res, what = 'That') => res.status(404).json({ message: `${what} was not found.` });
const safe = (fn) => async (req, res, next) => {
    try { await fn(req, res, next); } catch (error) {
        console.error('[campus] failed:', req.method, req.originalUrl, error.message);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ── Who is asking ───────────────────────────────────────────────────────────
router.use(safe(async (req, res, next) => {
    if (!req.organization.campusAllowed) return res.status(403).json({ code: 'CAMPUS_LOCKED', message: 'Campus is not switched on for your organization. Ask YATICORPX3 to turn it on.' });
    const { org, campus } = await C.loadCampus(req.organization._id);
    req.campus = campus;
    req.campusOrg = org;
    req.campusRole = req.viewingAsSuperAdmin || !req.admin.staff ? 'admin' : req.admin.campusExamBoard ? 'board' : req.admin.campusOffice ? 'admission' : req.admin.campusDepartmentId ? 'department' : 'teacher';
    if (req.campusRole === 'department') {
        req.campusDept = C.find(campus, 'departments', req.admin.campusDepartmentId);
        if (!req.campusDept) return nope(res, 'Your department no longer exists. Ask your organization’s administrator.');
    }
    next();
}));
const office = (req, res, next) => (['teacher', 'board', 'admission'].includes(req.campusRole) ? nope(res, 'Only the department office can do this.') : next());
/** Students' records and fees at the counter: the department, the admission office, the administrator. */
const front = (req, res, next) => (['teacher', 'board'].includes(req.campusRole) ? nope(res, 'Only the office can do this.') : next());
/** New admissions: the admission office and the administrator. */
const intake = (req, res, next) => (['admin', 'admission'].includes(req.campusRole) ? next() : nope(res, 'New admissions are made by the admission office.'));
/** The exam pages: the office, and the examination board. */
const examDesk = (req, res, next) => (['teacher', 'admission'].includes(req.campusRole) ? nope(res, 'Only the department office or the examination board can do this.') : next());
/** Who may change an exam of this kind: semester exams are the board's, internal assessments the department's. */
const mayWriteExam = (req, kind) => req.campusRole === 'admin' || (req.campusRole === 'board' ? kind === 'semester' : req.campusRole === 'department' && kind !== 'semester');
const boardMsg = 'Semester exams are run by the examination board.';
const adminOnly = (req, res, next) => (req.campusRole === 'admin' ? next() : nope(res, 'Only your organization’s administrator can do this.'));

/** The department a request works in: a department's own, or the one an admin names. */
const deptOf = (req, given) => (req.campusRole === 'department' ? req.campusDept : C.find(req.campus, 'departments', given));
const needDept = (req, res) => {
    const d = deptOf(req, req.query.departmentId ?? req.body?.departmentId);
    if (!d) bad(res, 'Choose a department.', 'departmentId');
    return d;
};
/** A list item this sign-in may touch (its department's), or null. */
const ownItem = (req, list, id) => {
    const item = C.find(req.campus, list, id);
    if (!item) return null;
    return req.campusRole === 'department' && !same(item.departmentId, req.campusDept._id) ? null : item;
};
const canTeach = (req, subject) => req.campusRole === 'admin' || req.campusRole === 'board'
    || (req.campusRole === 'department' && same(subject.departmentId, req.campusDept._id))
    || (req.campusRole === 'teacher' && (subject.teacherIds || []).some((t) => same(t, req.admin._id)));
/** The departments this teacher heads: chosen as Head of department (by account, or by name for older set-ups). */
// By account only: a name can be changed or shared, so it never makes anyone a head.
/*
 * A demo card's teacher (services/demoDashboards.js; 2026-11-19, the owner: "in the teacher's dashboard show the
 * HOD tasks") works as a head too, so a presentation shows the Department (HOD) menu: of the department named in
 * DEMO_DEPARTMENT (its name or code) — or, unset, the one with the most subjects. The department's own head stays
 * its head: nothing is written to it, and its Head of department on the organization's pages does not change.
 */
const demoDepartment = (req) => {
    const all = req.campus.departments;
    if (!all.length) return null;
    const want = String(process.env.DEMO_DEPARTMENT || '').trim().toLowerCase();
    const named = want ? all.find((d) => String(d.name || '').toLowerCase() === want || String(d.code || '').toLowerCase() === want) : null;
    if (named) return named;
    const subjects = (d) => req.campus.subjects.filter((x) => same(x.departmentId, d._id)).length;
    return all.reduce((best, d) => (subjects(d) > subjects(best) ? d : best), all[0]);
};
const hodDepartments = (req) => {
    const mine = req.campus.departments.filter((d) => d.headId && same(d.headId, req.admin._id));
    const demo = req.campusRole === 'teacher' && req.admin?.demo ? demoDepartment(req) : null;
    return demo && !mine.some((d) => same(d._id, demo._id)) ? [...mine, demo] : mine;
};
// A degree department or a PUC stream (2026-11-19); an older one named "… PUC …" counts as PUC.
const programOf = (d) => (d.program === 'puc' || d.program === 'degree' ? d.program : /\bpuc\b/i.test(d.name || '') ? 'puc' : 'degree');
const deptView = (d) => ({ _id: d._id, name: d.name, code: d.code, semesters: d.semesters, sections: d.sections || [], program: programOf(d), stream: d.stream || '', pucYear: d.pucYear || null, pucSem: d.pucSem || null, sectionTeachers: (d.sectionTeachers || []).map((x) => ({ section: x.section, teacherId: x.teacherId || null, teacher: x.teacher || '' })), head: d.head, headId: d.headId || null });
const sectionOk = (dept, section) => !section || (dept.sections || []).includes(section);
/** A department with more than one section: every student is in one of them, and every class is one. */
const needsSection = (dept) => (dept.sections || []).length > 1;
const cleanSections = (v) => [...new Set((Array.isArray(v) ? v : String(v || '').split(','))
    .map((s) => str(s, 10).toUpperCase()).filter(Boolean))].slice(0, 12);

/** A student of this organization this sign-in may see (department's own), with the fields asked for. */
const studentFor = async (req, fields = {}) => {
    if (!idOk(req.params.id)) return null;
    const u = await User.findOne({ _id: req.params.id, organizationId: req.organization._id }, { ...C.STUDENT_FIELDS, ...fields }).lean();
    if (!u?.campus?.departmentId) return null;
    if (req.campusRole === 'department' && !same(u.campus.departmentId, req.campusDept._id)) return null;
    if (req.campusRole === 'teacher') return null;
    return u;
};

// ── Context ─────────────────────────────────────────────────────────────────
router.get('/context', safe(async (req, res) => {
    const { campus, campusOrg: org } = req;
    let departments = campus.departments;
    if (req.campusRole === 'department') departments = [req.campusDept];
    if (req.campusRole === 'teacher') {
        const mine = campus.subjects.filter((s) => canTeach(req, s)).map((s) => String(s.departmentId));
        departments = departments.filter((d) => mine.includes(String(d._id)));
    }
    res.json({
        role: req.campusRole,
        me: { name: req.admin.name },
        organization: { name: org.name, orgCode: org.orgCode, logo: org.logo || '' },
        department: req.campusDept ? deptView(req.campusDept) : null,
        departments: departments.map(deptView),
        detailFields: C.detailFieldsOf(req.campus),
        today: C.today()
    });
}));

// ── Overview ────────────────────────────────────────────────────────────────
router.get('/overview', office, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const filter = C.classFilter(req.organization._id, dept._id);
    const since = new Date(Date.now() + 5.5 * 3600e3 - 30 * 864e5).toISOString().slice(0, 10);   // India time
    const [students, attendance] = await Promise.all([
        User.find(filter, { name: 1, 'campus.semester': 1, 'campus.section': 1, 'campus.rollNo': 1, 'campus.departmentId': 1, 'campus.payments': 1, 'campus.applications': 1 }).lean(),
        User.aggregate([
            { $match: filter },
            { $project: { name: 1, rollNo: '$campus.rollNo', a: { $filter: { input: { $ifNull: ['$campus.attendance', []] }, cond: { $and: [{ $gte: ['$$this.d', since] }, { $ne: ['$$this.r', true] }] } } } } },
            { $project: { name: 1, rollNo: 1, held: { $size: '$a' }, present: { $size: { $filter: { input: '$a', cond: { $or: ['$$this.ok', '$$this.x'] } } } } } }
        ])
    ]);
    const bySemester = {};
    let collected = 0; let outstanding = 0; let pendingApplications = 0;
    const recent = [];
    const examIds = new Set(req.campus.exams.filter((e) => same(e.departmentId, dept._id)).map((e) => String(e._id)));
    for (const s of students) {
        bySemester[s.campus.semester] = (bySemester[s.campus.semester] || 0) + 1;
        const f = C.feesOf(req.campus, s);
        collected += f.paid; outstanding += f.balance;
        for (const p of s.campus.payments || []) recent.push({ ...p, student: s.name, studentId: s._id });
        pendingApplications += (s.campus.applications || []).filter((a) => a.status === 'applied' && examIds.has(String(a.e))).length;
    }
    let held = 0; let present = 0;
    const low = [];
    for (const a of attendance) {
        held += a.held; present += a.present;
        if (a.held >= 5 && a.present / a.held < 0.75) low.push({ _id: a._id, name: a.name, rollNo: a.rollNo, percent: Math.round((a.present / a.held) * 1000) / 10 });
    }
    const today = C.today();
    res.json({
        department: deptView(dept),
        students: students.length,
        bySemester,
        subjects: req.campus.subjects.filter((s) => same(s.departmentId, dept._id)).length,
        attendance30: held ? Math.round((present / held) * 1000) / 10 : null,
        lowAttendance: low.sort((a, b) => a.percent - b.percent).slice(0, 8),
        lowAttendanceCount: low.length,
        fees: { collected, outstanding },
        recentPayments: recent.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6),
        pendingApplications,
        upcomingExams: req.campus.exams.filter((e) => same(e.departmentId, dept._id))
            .map((e) => C.examView(req.campus, e))
            .filter((e) => e.schedule.some((x) => x.date >= today) || e.applicationsOpen)
            .slice(0, 5),
        openFeedback: req.campus.feedback.filter((f) => same(f.departmentId, dept._id) && f.open).length
    });
}));

// ── Departments (admin) ─────────────────────────────────────────────────────
const ORD = ['', '1st', '2nd'];
const deptBody = (b, d = {}) => {
    // A PUC class: its stream, year and semester make its name ("Commerce · 1st year · 1st sem"), so each is there once.
    if ((b.program || programOf(d)) === 'puc' && (b.stream !== undefined || d.stream)) {
        const stream = b.stream !== undefined ? str(b.stream, 40) : d.stream;
        if (!stream) return { error: ['Choose the stream: Arts, Commerce, Science…', 'stream'] };
        const pucYear = b.pucYear !== undefined ? int(b.pucYear, 1, 2) : d.pucYear;
        if (!pucYear) return { error: ['Choose the year: 1st or 2nd.', 'pucYear'] };
        const pucSem = b.pucSem !== undefined ? int(b.pucSem, 1, 2) : d.pucSem;
        if (!pucSem) return { error: ['Choose the semester: 1st or 2nd.', 'pucSem'] };
        const sections = b.sections !== undefined ? cleanSections(b.sections) : d.sections || ['A'];
        return { value: {
            name: `${stream} · ${ORD[pucYear]} year · ${ORD[pucSem]} sem`, code: b.code !== undefined ? str(b.code, 12).toUpperCase() : d.code || '',
            semesters: 1, sections: sections.length ? sections : ['A'], head: b.head !== undefined ? str(b.head, 100) : d.head || '',
            program: 'puc', stream, pucYear, pucSem
        } };
    }
    const name = b.name !== undefined ? str(b.name, 100) : d.name;
    if (!name) return { error: ['Enter the department’s name.', 'name'] };
    const semesters = b.semesters !== undefined ? int(b.semesters, 1, 12) : d.semesters ?? 6;
    if (!semesters) return { error: ['Semesters must be between 1 and 12.', 'semesters'] };
    const sections = b.sections !== undefined ? cleanSections(b.sections) : d.sections || ['A'];
    const program = b.program === 'puc' || b.program === 'degree' ? b.program : programOf(d);
    return { value: { name, code: b.code !== undefined ? str(b.code, 12).toUpperCase() : d.code || '', semesters, sections: sections.length ? sections : ['A'], head: b.head !== undefined ? str(b.head, 100) : d.head || '', program } };
};
/**
 * The head's teacher account shows them as HOD (designation "HOD", their department), and a
 * teacher no longer heading any department goes back to no designation.
 */
const syncHodRole = async (req, deptId, prevId, nextId, deptName) => {
    if (same(prevId, nextId)) return;
    const { Teacher } = require('../teacher/models');
    if (nextId) await Teacher.updateOne({ _id: nextId, organizationId: req.organization._id }, { $set: { designation: 'HOD', department: deptName } });
    if (prevId) {
        const stillHead = req.campus.departments.some((d) => !same(d._id, deptId) && same(d.headId, prevId));
        if (!stillHead) await Teacher.updateOne({ _id: prevId, organizationId: req.organization._id, designation: 'HOD' }, { $set: { designation: '' } });
    }
};
/** The head of department is one of the organization's teachers: keep their account id with the name. */
const withHead = async (req, b, value) => {
    if (b.headId === undefined) return value;
    if (!b.headId) return { ...value, head: '', headId: null };
    const t = (await teachersOf(req.organization._id)).find((x) => same(x._id, b.headId));
    return t ? { ...value, head: t.name, headId: t._id } : value;
};

/**
 * The courses teachers pick from (Organization.three60.programs — 360, What I teach) follow the
 * departments (2026-11-14): Settings no longer lists courses. One course per department, with the same
 * _id, its sections as "Section A"…; what teachers marked in a section and the course's subjects stay.
 * A course matched by name the first time keeps its teachers. Written only when something changed.
 */
const syncPrograms = async (orgId) => {
    try {
        const Organization = require('../organizations/models/Organization');
        const org = await Organization.findById(orgId).select({ 'three60.programs': 1, 'campus.departments': 1 }).lean();
        if (!org || !(org.campus?.departments || []).length) return;   // never empties the courses
        const before = org.three60?.programs || [];
        const depts = org.campus?.departments || [];
        const label = (x) => (/^section\s/i.test(x) ? x : `Section ${x}`);
        const next = depts.map((d) => {
            const old = before.find((p) => same(p._id, d._id)) || before.find((p) => p.name.trim().toLowerCase() === d.name.trim().toLowerCase());
            const sections = (d.sections?.length ? d.sections : ['A']).map((x) => {
                const name = label(x);
                const was = (old?.sections || []).find((s) => s.name.toLowerCase() === name.toLowerCase());
                return was ? { _id: was._id, name, teachers: was.teachers || [] } : { name, teachers: [] };
            });
            return { _id: d._id, name: d.name, sections, subjects: old?.subjects || [] };
        });
        const key = (list) => JSON.stringify(list.map((p) => [String(p._id), p.name, p.sections.map((x) => x.name)]));
        if (key(next) === key(before)) return;
        await Organization.updateOne({ _id: orgId }, { $set: { 'three60.programs': next } });
    } catch (err) { console.error('[campus] sync courses:', err.message); }
};
// Admission numbers (2026-11-14, organization Settings): prefix and the number they start from.
const admissionFormatView = async (orgId) => {
    const Organization = require('../organizations/models/Organization');
    const org = await Organization.findById(orgId).select({ 'campus.admissionFormat': 1, 'campus.admissionSeq': 1 }).lean();
    const f = org?.campus?.admissionFormat || {};
    const set = f.start > 0;
    const seq = (org?.campus?.admissionSeq || 0) + 1;
    return { prefix: f.prefix || '', start: set ? f.start : '', digits: f.digits || 4, set, next: set ? `${f.prefix || ''}${String(f.start + seq - 1).padStart(f.digits || 1, '0')}` : '' };
};
router.get('/admission-numbers', adminOnly, safe(async (req, res) => res.json(await admissionFormatView(req.organization._id))));
router.put('/admission-numbers', adminOnly, safe(async (req, res) => {
    const prefix = str(req.body?.prefix, 20);
    const start = int(req.body?.start, 1, 999999999);
    const digits = int(req.body?.digits, 1, 9) || 4;
    if (!start) return bad(res, 'Enter the number admissions start from, e.g. 1001.', 'start');
    const Organization = require('../organizations/models/Organization');
    // The running count starts again from `start`; numbers already given stay as they are.
    await Organization.updateOne({ _id: req.organization._id }, { $set: { 'campus.admissionFormat': { prefix, start, digits }, 'campus.admissionSeq': 0 } });
    const view = await admissionFormatView(req.organization._id);
    res.json({ ...view, message: `Saved. The next admission gets ${view.next}.` });
}));

router.get('/departments', adminOnly, safe(async (req, res) => {
    // Heads chosen by name before accounts were linked: linked now to the one teacher of that name
    // (the organization picked them), and made HOD. Two of the same name stay unlinked: pick again.
    const legacy = req.campus.departments.filter((d) => d.head && !d.headId);
    if (legacy.length) {
        const teachers = await teachersOf(req.organization._id);
        for (const d of legacy) {
            const matches = teachers.filter((t) => t.name.trim().toLowerCase() === d.head.trim().toLowerCase());
            if (matches.length === 1) {
                await C.setItem(req.organization._id, 'departments', d._id, { headId: matches[0]._id });
                await syncHodRole(req, d._id, null, matches[0]._id, d.name);
                d.headId = matches[0]._id;
            }
        }
    }
    // Courses listed in Settings before departments took over (2026-11-14): each becomes a department
    // once, with the same _id, so teachers' 360 classes carry on.
    if (!req.campus.departments.length) {
        const Organization = require('../organizations/models/Organization');
        const org = await Organization.findById(req.organization._id).select('three60.programs').lean();
        for (const p of (org?.three60?.programs || []).slice(0, 100)) {
            const sections = (p.sections || []).map((x) => x.name.replace(/^section\s+/i, '').trim().slice(0, 10)).filter(Boolean);
            const d = await C.pushItem(req.organization._id, 'departments', { _id: p._id, name: p.name, code: '', semesters: 6, sections: sections.length ? sections : ['A'], head: '' });
            req.campus.departments.push(d);
        }
    }
    await syncPrograms(req.organization._id);
    const [counts, logins] = await Promise.all([
        User.aggregate([{ $match: { organizationId: req.organization._id, 'campus.departmentId': { $ne: null }, 'campus.status': 'studying' } }, { $group: { _id: { d: '$campus.departmentId', s: '$campus.section' }, n: { $sum: 1 } } }]),
        Admin.find({ organizationId: req.organization._id, campusDepartmentId: { $ne: null } }).select('name email campusDepartmentId createdAt').sort({ name: 1 }).lean()
    ]);
    res.json({
        departments: req.campus.departments.map((d) => ({
            ...deptView(d),
            students: counts.filter((c) => same(c._id.d, d._id)).reduce((t, c) => t + c.n, 0),
            // Per section (2026-11-19): a PUC class shows each section's own.
            sectionStudents: Object.fromEntries((d.sections || []).map((x) => [x, counts.filter((c) => same(c._id.d, d._id) && (c._id.s || '') === x).reduce((t, c) => t + c.n, 0)])),
            subjects: req.campus.subjects.filter((s) => same(s.departmentId, d._id)).length,
            logins: logins.filter((l) => same(l.campusDepartmentId, d._id)).map((l) => ({ _id: l._id, name: l.name, email: l.email, createdAt: l.createdAt }))
        }))
    });
}));
router.post('/departments', adminOnly, safe(async (req, res) => {
    const { value: v0, error } = deptBody(req.body || {});
    if (error) return bad(res, ...error);
    const value = await withHead(req, req.body || {}, v0);
    const same_ = req.campus.departments.find((d) => d.name.toLowerCase() === value.name.toLowerCase());
    // A PUC class is added one section at a time, each with its own class teacher (2026-11-19, the user: "don't make it
    // sections together, make it like classes, different sections"): the same class again adds its next section.
    if (value.program === 'puc') {
        const section = value.sections[0];
        const teacher = value.headId ? { section, teacherId: value.headId, teacher: value.head } : null;
        if (same_) {
            if ((same_.sections || []).includes(section)) return bad(res, `${same_.name} already has Section ${section}.`, 'sections');
            await C.setItem(req.organization._id, 'departments', same_._id, {
                sections: [...(same_.sections || []), section],
                sectionTeachers: [...(same_.sectionTeachers || []).filter((x) => x.section !== section), ...(teacher ? [teacher] : [])]
            });
            return res.status(201).json({ message: `Section ${section} added to ${same_.name}.` });
        }
        value.sections = [section]; value.sectionTeachers = teacher ? [teacher] : []; value.head = ''; value.headId = null;
    }
    if (same_) return bad(res, 'A department with this name already exists.', 'name');
    if (req.campus.departments.length >= 100) return bad(res, 'An organization can have up to 100 departments.');
    const d = await C.pushItem(req.organization._id, 'departments', value);
    // A PUC class's teacher is its class teacher, not a head of department (2026-11-19).
    if (value.headId && value.program !== 'puc') await syncHodRole(req, d._id, null, value.headId, d.name);
    await syncPrograms(req.organization._id);
    res.status(201).json({ message: value.program === 'puc' ? `${d.name} was added.` : `${d.name} was added. Give it a sign-in next, so its office can admit students.`, department: d });
}));
router.put('/departments/:id', adminOnly, safe(async (req, res) => {
    const d = C.find(req.campus, 'departments', req.params.id);
    if (!d) return gone(res, 'The department');
    const { value: v0, error } = deptBody(req.body || {}, d);
    if (error) return bad(res, ...error);
    const value = await withHead(req, req.body || {}, v0);
    if (value.program === 'puc' && req.campus.departments.some((x) => !same(x._id, d._id) && x.name.toLowerCase() === value.name.toLowerCase())) return bad(res, `${value.name} is already there.`, 'stream');
    // A degree department's sections changed (2026-11-19 QA): a section renamed in its place takes its students (and its
    // timetables) with it; a section taken away while students are in it is refused.
    let renamed = [];
    if (value.program !== 'puc') {
        const before = d.sections || [];
        const after = value.sections || [];
        renamed = before.length === after.length ? before.map((x, i) => [x, after[i]]).filter(([a, b]) => a !== b && !before.includes(b)) : [];
        const gone_ = before.filter((x) => !after.includes(x) && !renamed.some(([a]) => a === x));
        for (const x of gone_) {
            const n = await User.countDocuments({ organizationId: req.organization._id, 'campus.departmentId': d._id, 'campus.section': x });
            if (n) return bad(res, `Section ${x} still has ${n} student${n === 1 ? '' : 's'}. Move them first, or rename the section instead.`, 'sections');
        }
    }
    // A PUC section's own class teacher (2026-11-19): the section edited keeps its place; its teacher is set.
    if (value.program === 'puc') {
        const section = str(req.body?.section, 10).toUpperCase() || (d.sections || [])[0] || 'A';
        const teacher = value.headId ? { section, teacherId: value.headId, teacher: value.head } : null;
        value.sections = d.sections?.length ? d.sections : [section];
        value.sectionTeachers = [...(d.sectionTeachers || []).filter((x) => x.section !== section), ...(teacher ? [teacher] : [])];
        value.head = ''; value.headId = null;
        await C.setItem(req.organization._id, 'departments', d._id, value);
        await syncPrograms(req.organization._id);
        return res.json({ message: `${value.name} · Section ${section} saved.${teacher ? ` ${teacher.teacher} is its class teacher.` : ''}` });
    }
    await C.setItem(req.organization._id, 'departments', d._id, value);
    for (const [from, to] of renamed) {
        await User.updateMany({ organizationId: req.organization._id, 'campus.departmentId': d._id, 'campus.section': from }, { $set: { 'campus.section': to } });
        // Its timetables, only where there are any (an update on a missing list fails).
        if ((req.campus.timetables || []).some((t) => same(t.departmentId, d._id) && t.section === from)) {
            await require('../organizations/models/Organization').updateOne({ _id: req.organization._id }, { $set: { 'campus.timetables.$[t].section': to } }, { arrayFilters: [{ 't.departmentId': d._id, 't.section': from }] });
        }
    }
    if (value.headId !== undefined && value.program !== 'puc') await syncHodRole(req, d._id, d.headId, value.headId, value.name);
    await syncPrograms(req.organization._id);
    res.json({ message: `${value.name} saved.${value.headId && !same(d.headId, value.headId) ? ` ${value.head} is now its ${value.program === 'puc' ? 'class teacher' : 'HOD'}.` : ''}` });
}));
// The HOD's own dashboard, opened by the organization (2026-11-14): a one-time code, two minutes,
// traded in the student app for a two-hour session as that teacher which names who opened it.
router.post('/departments/:id/hod-dashboard', adminOnly, safe(async (req, res) => {
    const d = C.find(req.campus, 'departments', req.params.id);
    if (!d) return gone(res, 'The department');
    if (!d.headId) return bad(res, `${d.name} has no head yet. Choose one first.`);
    const { Teacher } = require('../teacher/models');
    const t = await Teacher.findOne({ _id: d.headId, organizationId: req.organization._id }).select('name status').lean();
    if (!t) return bad(res, 'The head of department is no longer one of your teachers.');
    if (t.status !== 'active') return bad(res, `${t.name} is not active, so their dashboard cannot be opened.`);
    const { hashAccessCode, ACCESS_CODE_TTL_MS } = require('../controllers/adminUserController');
    const code = require('crypto').randomBytes(24).toString('base64url');
    await require('../models/AdminAccessCode').create({
        codeHash: hashAccessCode(code), userId: t._id, kind: 'teacher',
        adminId: req.admin._id, adminName: req.campusOrg?.name || req.admin.name || 'Your organization',
        expiresAt: new Date(Date.now() + ACCESS_CODE_TTL_MS)
    });
    res.json({ code, name: t.name });
}));
// ── Classes (admin) — 2026-11-19 ────────────────────────────────────────────
// A class and its section (9th · A), how many students and subjects, and its class teacher (one of the organization's
// teachers). GET /classes · POST /classes · PUT /classes/:id · DELETE /classes/:id.
// Its number of students is counted, not typed (2026-11-19, the user: "the number of students will be increased
// automatically when a student joins the organization, based on the class he is in"): members with User.orgClassId.
const classBody = async (req, b) => {
    const name = str(b.name, 40);
    if (!name) return { error: ['Enter the class, e.g. 9th or Class 9.', 'name'] };
    const section = str(b.section, 10).toUpperCase();
    const students = 0;
    const subjects = b.subjects === '' || b.subjects == null ? 0 : int(b.subjects, 0, 50);
    if (subjects === null) return { error: ['Number of subjects: 0 to 50.', 'subjects'] };
    let teacherId = null; let teacher = '';
    if (b.teacherId) {
        const t = (await teachersOf(req.organization._id)).find((x) => same(x._id, b.teacherId));
        if (!t) return { error: ['Choose one of your teachers as the class teacher.', 'teacherId'] };
        teacherId = t._id; teacher = t.name;
    }
    return { value: { name, section, students, subjects, teacherId, teacher } };
};
const classTaken = (req, v, exceptId) => (req.campus.classes || []).some((c) => !same(c._id, exceptId) && c.name.toLowerCase() === v.name.toLowerCase() && (c.section || '').toLowerCase() === v.section.toLowerCase());
const classLabel = (v) => `${v.name}${v.section ? ` · Section ${v.section}` : ''}`;
// ── What the institution has (admin) — 2026-11-19 ─────────────────────────
// Degree departments, PUC classes and school classes, each switched on as the institution needs; until it chooses,
// from its type: a school has classes; a college or university, degree departments and PUC; others, degree departments.
const KINDS = ['degree', 'puc', 'classes'];
const kindsOf = (org, campus) => {
    if (Array.isArray(campus.kinds) && campus.kinds.length) return campus.kinds.filter((k) => KINDS.includes(k));
    const t = org?.organizationType;
    const base = t === 'school' ? ['classes'] : t === 'college' || t === 'university' ? ['degree', 'puc'] : ['degree'];
    // Whatever it already has stays on.
    if (campus.departments.some((d) => programOf(d) === 'degree') && !base.includes('degree')) base.push('degree');
    if (campus.departments.some((d) => programOf(d) === 'puc') && !base.includes('puc')) base.push('puc');
    if ((campus.classes || []).length && !base.includes('classes')) base.push('classes');
    return KINDS.filter((k) => base.includes(k));
};
router.get('/kinds', adminOnly, safe(async (req, res) => {
    const org = await require('../organizations/models/Organization').findById(req.organization._id).select('organizationType').lean();
    res.json({ kinds: kindsOf(org, req.campus), chosen: Array.isArray(req.campus.kinds) && req.campus.kinds.length > 0 });
}));
router.put('/kinds', adminOnly, safe(async (req, res) => {
    const kinds = KINDS.filter((k) => (Array.isArray(req.body?.kinds) ? req.body.kinds : []).includes(k));
    if (!kinds.length) return bad(res, 'Keep at least one: degree departments, PUC classes or classes.', 'kinds');
    await require('../organizations/models/Organization').updateOne({ _id: req.organization._id }, { $set: { 'campus.kinds': kinds } });
    res.json({ kinds, message: 'Saved.' });
}));
router.get('/classes', adminOnly, safe(async (req, res) => {
    const list = [...(req.campus.classes || [])].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }) || (a.section || '').localeCompare(b.section || ''));
    const counts = await User.aggregate([{ $match: { organizationId: req.organization._id, orgClassId: { $in: list.map((c) => c._id) } } }, { $group: { _id: '$orgClassId', n: { $sum: 1 } } }]);
    res.json({ classes: list.map((c) => ({ _id: c._id, name: c.name, section: c.section || '', students: counts.find((x) => same(x._id, c._id))?.n || 0, subjects: c.subjects || 0, teacherId: c.teacherId || null, teacher: c.teacher || '' })) });
}));
// The students in a class (2026-11-19, the user: "the students' names can be viewed"): its members who joined in it.
router.get('/classes/:id/students', adminOnly, safe(async (req, res) => {
    const c = C.find(req.campus, 'classes', req.params.id);
    if (!c) return gone(res, 'The class');
    const rows = await User.find({ organizationId: req.organization._id, orgClassId: c._id }, { name: 1, email: 1, phone: 1, cardNumber: 1, profilePicture: 1 }).sort({ name: 1 }).limit(2000).lean();
    res.json({ students: rows.map((u) => ({ _id: u._id, name: u.name, cardNumber: u.cardNumber || '', picture: u.profilePicture || '', email: u.email || '', phone: u.phone || '' })) });
}));
// Several sections at once (2026-11-19, the user: "section can be added together like A, B, C"): one class each.
router.post('/classes', adminOnly, safe(async (req, res) => {
    const b = req.body || {};
    const sections = [...new Set(String(b.section || '').split(',').map((x) => x.trim().toUpperCase().slice(0, 10)))].filter(Boolean);
    const values = [];
    for (const section of sections.length ? sections : ['']) {
        const { value, error } = await classBody(req, { ...b, section });
        if (error) return bad(res, ...error);
        if (classTaken(req, value)) return bad(res, `${classLabel(value)} is already there.`, 'section');
        values.push(value);
    }
    if ((req.campus.classes || []).length + values.length > 300) return bad(res, 'An organization can have up to 300 classes.');
    for (const v of values) await C.pushItem(req.organization._id, 'classes', v);
    res.status(201).json({ message: values.length > 1 ? `${values[0].name} added, with sections ${values.map((v) => v.section).join(', ')}.` : `${classLabel(values[0])} added.` });
}));
router.put('/classes/:id', adminOnly, safe(async (req, res) => {
    const c = C.find(req.campus, 'classes', req.params.id);
    if (!c) return gone(res, 'The class');
    if (String(req.body?.section || '').includes(',')) return bad(res, 'A class here is one section. Add the other sections with Add class.', 'section');
    const { value, error } = await classBody(req, req.body || {});
    if (error) return bad(res, ...error);
    if (classTaken(req, value, c._id)) return bad(res, `${classLabel(value)} is already there.`, 'section');
    await C.setItem(req.organization._id, 'classes', c._id, value);
    res.json({ message: `${classLabel(value)} saved.` });
}));
router.delete('/classes/:id', adminOnly, safe(async (req, res) => {
    const c = C.find(req.campus, 'classes', req.params.id);
    if (!c) return gone(res, 'The class');
    await C.pullItem(req.organization._id, 'classes', c._id);
    // Its students are in no class now.
    await User.updateMany({ organizationId: req.organization._id, orgClassId: c._id }, { $set: { orgClassId: null } });
    res.json({ message: `${classLabel(c)} removed.` });
}));

// One PUC section (2026-11-19): taken off its class when no student is in it; the last section removes the class.
router.delete('/departments/:id/sections/:section', adminOnly, safe(async (req, res) => {
    const d = C.find(req.campus, 'departments', req.params.id);
    if (!d) return gone(res, 'The class');
    const section = str(req.params.section, 10).toUpperCase();
    if (!(d.sections || []).includes(section)) return gone(res, 'That section');
    if ((d.sections || []).length <= 1) return bad(res, 'This is its only section: remove the whole class instead.');
    const students = await User.countDocuments({ organizationId: req.organization._id, 'campus.departmentId': d._id, 'campus.section': section });
    if (students) return bad(res, `Section ${section} still has ${students} student${students === 1 ? '' : 's'}. Move them first.`);
    await C.setItem(req.organization._id, 'departments', d._id, { sections: d.sections.filter((x) => x !== section), sectionTeachers: (d.sectionTeachers || []).filter((x) => x.section !== section) });
    res.json({ message: `Section ${section} removed from ${d.name}.` });
}));
router.delete('/departments/:id', adminOnly, safe(async (req, res) => {
    const d = C.find(req.campus, 'departments', req.params.id);
    if (!d) return gone(res, 'The department');
    const students = await User.countDocuments({ organizationId: req.organization._id, 'campus.departmentId': d._id });
    if (students) return bad(res, `${d.name} still has ${students} admitted student${students === 1 ? '' : 's'}. Remove or move them first.`);
    const Organization = require('../organizations/models/Organization');
    await Organization.updateOne({ _id: req.organization._id }, {
        $pull: {
            'campus.departments': { _id: d._id },
            ...Object.fromEntries(['subjects', 'fees', 'exams', 'feedback', 'timetables', 'announcements'].map((k) => [`campus.${k}`, { departmentId: d._id }]))
        }
    });
    await Admin.deleteMany({ organizationId: req.organization._id, campusDepartmentId: d._id });
    if (d.headId) await syncHodRole(req, d._id, d.headId, null, '');   // the head is no longer HOD
    await syncPrograms(req.organization._id);
    res.json({ message: `${d.name} was removed, with its subjects, timetables, announcements, fees, exams, feedback forms and sign-ins.` });
}));
router.post('/departments/:id/logins', adminOnly, safe(async (req, res) => {
    const d = C.find(req.campus, 'departments', req.params.id);
    if (!d) return gone(res, 'The department');
    const b = req.body || {};
    const name = str(b.name, 100);
    const email = str(b.email, 254).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    if (!name) return bad(res, 'Enter a name for this sign-in.', 'name');
    if (!EMAIL.test(email)) return bad(res, 'Enter a valid email address.', 'email');
    const weak = validatePasswordStrength(password);
    if (weak) return bad(res, weak, 'password');
    if (await Admin.findByLoginEmail(email)) return bad(res, 'This email already signs in to an administrator panel. Use another.', 'email');
    try {
        await Admin.create({ name, email, password, role: 'orgadmin', organizationId: req.organization._id, staff: true, campusDepartmentId: d._id });
    } catch (error) {
        if (error?.code === 11000) return bad(res, 'This email already signs in to an administrator panel. Use another.', 'email');
        throw error;
    }
    res.status(201).json({ message: `${name} can now sign in on the organization sign-in page with ${email}, and sees only ${d.name}.` });
}));
router.put('/departments/:id/logins/:adminId', adminOnly, safe(async (req, res) => {
    if (!idOk(req.params.adminId)) return gone(res, 'The sign-in');
    const a = await Admin.findOne({ _id: req.params.adminId, organizationId: req.organization._id, campusDepartmentId: req.params.id });
    if (!a) return gone(res, 'The sign-in');
    const b = req.body || {};
    if (b.name !== undefined) { const n = str(b.name, 100); if (!n) return bad(res, 'Enter a name.', 'name'); a.name = n; }
    if (b.password) { const weak = validatePasswordStrength(String(b.password)); if (weak) return bad(res, weak, 'password'); a.password = String(b.password); }
    await a.save();
    res.json({ message: b.password ? `${a.name} saved. They sign in again with the new password.` : `${a.name} saved.` });
}));
router.delete('/departments/:id/logins/:adminId', adminOnly, safe(async (req, res) => {
    if (!idOk(req.params.adminId)) return gone(res, 'The sign-in');
    const a = await Admin.findOneAndDelete({ _id: req.params.adminId, organizationId: req.organization._id, campusDepartmentId: req.params.id });
    if (!a) return gone(res, 'The sign-in');
    res.json({ message: `${a.name} can no longer sign in.` });
}));

// ── Organization-wide sign-ins (admin): the examination board, the admission office ──
const STAFF_KINDS = {
    board: { flag: 'campusExamBoard', sees: 'the Examination board' },
    office: { flag: 'campusOffice', sees: 'Admissions for every department' }
};
for (const [kind, { flag, sees }] of Object.entries(STAFF_KINDS)) {
    router.get(`/${kind}/logins`, adminOnly, safe(async (req, res) => {
        res.json({ logins: await Admin.find({ organizationId: req.organization._id, [flag]: true }).select('name email createdAt').sort({ name: 1 }).lean() });
    }));
    router.post(`/${kind}/logins`, adminOnly, safe(async (req, res) => {
        const b = req.body || {};
        const name = str(b.name, 100);
        const email = str(b.email, 254).toLowerCase();
        const password = typeof b.password === 'string' ? b.password : '';
        if (!name) return bad(res, 'Enter a name for this sign-in.', 'name');
        if (!EMAIL.test(email)) return bad(res, 'Enter a valid email address.', 'email');
        const weak = validatePasswordStrength(password);
        if (weak) return bad(res, weak, 'password');
        if (await Admin.findByLoginEmail(email)) return bad(res, 'This email already signs in to an administrator panel. Use another.', 'email');
        try {
            await Admin.create({ name, email, password, role: 'orgadmin', organizationId: req.organization._id, staff: true, [flag]: true });
        } catch (error) {
            if (error?.code === 11000) return bad(res, 'This email already signs in to an administrator panel. Use another.', 'email');
            throw error;
        }
        res.status(201).json({ message: `${name} can now sign in to Campus with ${email}, and sees ${sees}.` });
    }));
    router.put(`/${kind}/logins/:adminId`, adminOnly, safe(async (req, res) => {
        if (!idOk(req.params.adminId)) return gone(res, 'The sign-in');
        const a = await Admin.findOne({ _id: req.params.adminId, organizationId: req.organization._id, [flag]: true });
        if (!a) return gone(res, 'The sign-in');
        const b = req.body || {};
        if (b.name !== undefined) { const n = str(b.name, 100); if (!n) return bad(res, 'Enter a name.', 'name'); a.name = n; }
        if (b.password) { const weak = validatePasswordStrength(String(b.password)); if (weak) return bad(res, weak, 'password'); a.password = String(b.password); }
        await a.save();
        res.json({ message: `${a.name} saved.` });
    }));
    router.delete(`/${kind}/logins/:adminId`, adminOnly, safe(async (req, res) => {
        if (!idOk(req.params.adminId)) return gone(res, 'The sign-in');
        const a = await Admin.findOneAndDelete({ _id: req.params.adminId, organizationId: req.organization._id, [flag]: true });
        if (!a) return gone(res, 'The sign-in');
        res.json({ message: `${a.name} can no longer sign in.` });
    }));
}

// ── Teachers who can be given subjects ──────────────────────────────────────
// The organization's teachers (their teacher dashboard accounts, organization panel → Teachers):
// a subject's teachers take its attendance from their own teacher dashboard (src/teacher, /campus).
// `complete` (2026-11-14): signed up and the profile filled in (email, mobile, department, designation) —
// only those can be chosen as a head of department.
const teachersOf = (organizationId) => require('../teacher/models').Teacher.find({ organizationId, status: { $ne: 'inactive' } }).select('name email phone department designation passwordPending').sort({ name: 1 }).collation({ locale: 'en', strength: 2 }).lean()
    .then((rows) => rows.map(({ passwordPending, phone, ...t }) => ({ ...t, complete: !passwordPending && [t.email, phone, t.department, t.designation].every((v) => String(v || '').trim()) })));
router.get('/teachers', office, safe(async (req, res) => {
    res.json({ teachers: await teachersOf(req.organization._id) });
}));

// ── Admissions ──────────────────────────────────────────────────────────────
const searchFilter = (search) => {
    const q = str(search, 80);
    if (!q) return {};
    const r = new RegExp(escape(q), 'i');
    return { $or: [{ name: r }, { email: r }, { cardNumber: r }, { 'campus.rollNo': r }, { 'campus.admissionNo': r }] };
};
router.get('/students', front, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const filter = { organizationId: req.organization._id, 'campus.departmentId': dept._id, ...searchFilter(req.query.search) };
    const semester = int(req.query.semester, 1, 12);
    // The batch (2026-11-14): 1st year is semesters 1–2, 2nd year 3–4, 3rd year 5–6.
    const year = int(req.query.year, 1, 6);
    if (semester) filter['campus.semester'] = semester;
    else if (year) filter['campus.semester'] = { $in: [year * 2 - 1, year * 2] };
    if (req.query.section) filter['campus.section'] = str(req.query.section, 10);
    const status = ['accepted', 'studying', 'completed', 'left'].includes(req.query.status) ? req.query.status : req.query.status === 'all' ? null : 'studying';
    if (status) filter['campus.status'] = status;
    const [rows, perSemester] = await Promise.all([
        User.find(filter, { ...C.STUDENT_FIELDS, 'campus.academicYear': 1, 'campus.admittedAt': 1 }).limit(2000).lean(),
        // How many in each semester (same status), for the batch tabs' counts.
        User.aggregate([{ $match: { organizationId: req.organization._id, 'campus.departmentId': dept._id, ...(status ? { 'campus.status': status } : {}) } }, { $group: { _id: '$campus.semester', n: { $sum: 1 } } }])
    ]);
    res.json({ students: rows.sort(C.byRoll).map((u) => ({ ...C.studentRow(u), academicYear: u.campus.academicYear, admittedAt: u.campus.admittedAt })), perSemester: Object.fromEntries(perSemester.map((x) => [x._id, x.n])) });
}));
// Alumni (2026-11-14): passed out or left — still members, and those who left the organization
// (their record kept in their history). Nothing about a student is ever deleted by ending.
// The organization's alumni, every department (2026-11-14: the organization's alone, not departments').
const alumniGet = safe(async (req, res) => {
    const deptName = (id) => C.find(req.campus, 'departments', id)?.name || '';
    const [current, past] = await Promise.all([
        User.find({ organizationId: req.organization._id, 'campus.departmentId': { $ne: null }, 'campus.status': { $in: ['completed', 'left'] } }, { ...C.STUDENT_FIELDS, 'campus.endedAt': 1, 'campus.endReason': 1, 'campus.admittedAt': 1 }).limit(10000).lean(),
        User.find({ 'campusHistory.organizationId': req.organization._id }, { name: 1, email: 1, phone: 1, cardNumber: 1, profilePicture: 1, campusHistory: 1 }).limit(10000).lean()
    ]);
    const rows = [
        ...current.map((u) => ({ ...C.studentRow(u), departmentId: u.campus.departmentId, department: deptName(u.campus.departmentId), endedAt: u.campus.endedAt, endReason: u.campus.endReason || '', admittedAt: u.campus.admittedAt, member: true })),
        ...past.flatMap((u) => (u.campusHistory || []).filter((h) => same(h.organizationId, req.organization._id)).map((h) => ({
            departmentId: h.departmentId, department: deptName(h.departmentId) || h.department || '',
            _id: u._id, name: u.name, email: u.email, phone: u.phone, cardNumber: u.cardNumber || '', picture: u.profilePicture || '',
            rollNo: h.rollNo || '', admissionNo: h.admissionNo || '', semester: h.semester, section: h.section || '', status: h.status,
            endedAt: h.endedAt, endReason: h.endReason || '', admittedAt: h.admittedAt, member: false, attendance: h.summary?.percent ?? null
        })))
    ].sort((a, b) => new Date(b.endedAt || 0) - new Date(a.endedAt || 0));
    res.json({ departments: req.campus.departments.map(deptView), alumni: rows });
});
router.get('/alumni', adminOnly, alumniGet);
router.get('/candidates', intake, safe(async (req, res) => {
    const q = str(req.query.search, 80);
    const filter = { organizationId: req.organization._id, 'campus.departmentId': null };
    if (q) {
        const r = new RegExp(escape(q), 'i');
        filter.$or = [{ name: r }, { email: r }, { cardNumber: r }, { phone: r }, { qrNumber: q }];
        // A scanned card (2026-11-14): its QR code or number, matched to the student who registered with it.
        const card = await require('../organizations/services/cardLink').findCard(q).catch(() => null);
        if (card) {
            const { normaliseCardNumber } = require('../utils/cardNumber');
            filter.$or.push({ cardNumber: { $in: [card.CardNumber, normaliseCardNumber(card.CardNumber)] } });
            if (card.qrCodeNumber) filter.$or.push({ qrNumber: card.qrCodeNumber });
        }
    }
    // ?limit= up to 1000 for the "Not admitted yet" list; 25 for the quick picker.
    const limit = int(req.query.limit, 1, 1000, 25);
    const [rows, total] = await Promise.all([
        User.find(filter).select('name email phone cardNumber profilePicture className organizationJoinedAt').sort({ name: 1 }).limit(limit).lean(),
        User.countDocuments({ organizationId: req.organization._id, 'campus.departmentId': null })
    ]);
    res.json({
        total,
        students: rows.map((u) => ({ _id: u._id, name: u.name, email: u.email, phone: u.phone, cardNumber: u.cardNumber || '', picture: u.profilePicture || '', className: u.className || '', joinedAt: u.organizationJoinedAt || null }))
    });
}));
// Several of the organization's students at once, into one semester and section
// { userIds, departmentId, semester, section, academicYear }: each gets an admission
// number; roll numbers and the admission form can be filled in later on each record.
router.post('/students/bulk', intake, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const ids = (Array.isArray(req.body?.userIds) ? req.body.userIds : []).filter(idOk).slice(0, 1000);
    if (!ids.length) return bad(res, 'Choose the students to accept.');
    const semester = int(req.body?.semester, 1, C.firstYear(dept));
    if (!semester) return bad(res, 'New admissions are into the 1st year: semester 1 or 2.', 'semester');
    const section = str(req.body?.section, 10).toUpperCase() || dept.sections?.[0] || '';
    if (!sectionOk(dept, section)) return bad(res, 'Choose one of the department’s sections.', 'section');
    const users = await User.find({ _id: { $in: ids }, organizationId: req.organization._id, 'campus.departmentId': null }).select('_id').lean();
    if (!users.length) return bad(res, 'These students already have a class.');
    // Accepted (2026-11-14): the class is set; the admission number comes when they are admitted.
    const academicYear = str(req.body?.academicYear, 20);
    const ops = users.map((u) => ({
        updateOne: {
            filter: { _id: u._id, 'campus.departmentId': null },
            update: { $set: { campus: {
                departmentId: dept._id, semester, section, rollNo: '', academicYear, status: 'accepted', acceptedAt: new Date(), admissionNo: '',
                details: {}, attendance: [], marks: [], payments: [], applications: [], feedback: []
            } } }
        }
    }));
    const r = await User.bulkWrite(ops, { ordered: false });
    users.forEach((u) => require('../services/orgEvents').organizationChanged(u._id));
    const n = r.modifiedCount || 0;
    res.status(201).json({ message: `${n} student${n === 1 ? '' : 's'} accepted for ${dept.name}, semester ${semester}${section && dept.sections.length > 1 ? ` ${section}` : ''}. Admit them from the Accepted tab.` });
}));
// Existing students (2026-11-14): already studying here, added by their card — straight into their class, any
// semester, with the next admission number; no application and no admission form.
// { userIds, departmentId, semester, section, academicYear }
router.post('/students/place', intake, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const ids = (Array.isArray(req.body?.userIds) ? req.body.userIds : []).filter(idOk).slice(0, 1000);
    if (!ids.length) return bad(res, 'Choose the students.');
    const semester = int(req.body?.semester, 1, dept.semesters);
    if (!semester) return bad(res, `Choose a semester from 1 to ${dept.semesters}.`, 'semester');
    const section = str(req.body?.section, 10).toUpperCase() || (dept.sections?.length === 1 ? dept.sections[0] : '');
    if (!sectionOk(dept, section) || (needsSection(dept) && !section)) return bad(res, 'Choose one of the department’s sections.', 'section');
    const users = await User.find({ _id: { $in: ids }, organizationId: req.organization._id, 'campus.departmentId': null }).select('name').lean();
    if (!users.length) return bad(res, 'These students already have a class.');
    const numbers = await C.nextAdmissionNos(req.organization._id, dept, users.length);
    const academicYear = str(req.body?.academicYear, 20);
    const now = new Date();
    const r = await User.bulkWrite(users.map((u, i) => ({ updateOne: {
        filter: { _id: u._id, 'campus.departmentId': null },
        update: { $set: { campus: { departmentId: dept._id, semester, section, rollNo: '', academicYear, status: 'studying', admittedAt: now, admissionNo: numbers[i], details: {}, attendance: [], marks: [], payments: [], applications: [], feedback: [] } } }
    } })), { ordered: false });
    users.forEach((u) => require('../services/orgEvents').organizationChanged(u._id));
    const n = r.modifiedCount || 0;
    res.status(201).json({ message: n === 1 ? `${users[0].name} added to ${dept.name}, semester ${semester}${section && dept.sections.length > 1 ? ` ${section}` : ''}.` : `${n} students added to ${dept.name}, semester ${semester}.` });
}));

// The admission pipeline, organization-wide (2026-11-14): Applications → Accepted → Admitted. The accepted
// carry their department, semester and section; the office checks them, then admits.
const acceptedFilter = (req, ids) => ({ organizationId: req.organization._id, 'campus.status': 'accepted', ...(ids ? { _id: { $in: ids } } : {}), ...(req.campusRole === 'department' ? { 'campus.departmentId': req.campusDept._id } : {}) });
const idsOf = (req) => (Array.isArray(req.body?.userIds) ? req.body.userIds : []).filter(idOk).slice(0, 1000);
// Every admitted student, organization-wide (2026-11-14, Campus → Students): by department and semester.
router.get('/students/all', intake, safe(async (req, res) => {
    const filter = { organizationId: req.organization._id, 'campus.departmentId': { $ne: null }, 'campus.status': 'studying', ...searchFilter(req.query.search) };
    const rows = await User.find(filter, { ...C.STUDENT_FIELDS, 'campus.admittedAt': 1 }).limit(10000).lean();
    res.json({
        departments: req.campus.departments.map(deptView),
        students: rows.sort(C.byRoll).map((u) => ({ ...C.studentRow(u), departmentId: u.campus.departmentId, admittedAt: u.campus.admittedAt }))
    });
}));
router.get('/admissions/accepted', intake, safe(async (req, res) => {
    const rows = await User.find(acceptedFilter(req), { ...C.STUDENT_FIELDS, 'campus.acceptedAt': 1 }).sort({ 'campus.acceptedAt': 1 }).limit(3000).lean();
    res.json({
        departments: req.campus.departments.map(deptView),
        students: rows.map((u) => ({ ...C.studentRow(u), departmentId: u.campus.departmentId, acceptedAt: u.campus.acceptedAt || null }))
    });
}));
// Correct an accepted student's class before admitting { departmentId, semester, section }.
router.put('/admissions/:id/class', intake, safe(async (req, res) => {
    if (!idOk(req.params.id)) return gone(res, 'The student');
    const dept = C.find(req.campus, 'departments', req.body?.departmentId);
    if (!dept) return bad(res, 'Choose a department.', 'departmentId');
    const semester = int(req.body?.semester, 1, C.firstYear(dept));
    if (!semester) return bad(res, 'New admissions are into the 1st year: semester 1 or 2.', 'semester');
    const section = str(req.body?.section, 10).toUpperCase() || (dept.sections?.length === 1 ? dept.sections[0] : '');
    if (!sectionOk(dept, section) || (needsSection(dept) && !section)) return bad(res, 'Choose one of the department’s sections.', 'section');
    const r = await User.updateOne({ ...acceptedFilter(req), _id: req.params.id }, { $set: { 'campus.departmentId': dept._id, 'campus.semester': semester, 'campus.section': section } });
    if (!r.matchedCount) return gone(res, 'That accepted student');
    res.json({ message: `Class set: ${dept.name}, semester ${semester}${section && dept.sections.length > 1 ? ` ${section}` : ''}.` });
}));
// Admit { userIds }: each gets the next admission number and joins their department's class (HOD lists, registers).
router.post('/students/admit', intake, safe(async (req, res) => {
    const users = await User.find(acceptedFilter(req, idsOf(req))).select('name campus.departmentId').lean();
    if (!users.length) return bad(res, 'Choose students from the Accepted list.');
    const now = new Date();
    const done = [];
    for (const u of users) {
        const dept = C.find(req.campus, 'departments', u.campus.departmentId);
        if (!dept) continue;
        const [no] = await C.nextAdmissionNos(req.organization._id, dept);
        const r = await User.updateOne({ _id: u._id, 'campus.status': 'accepted' }, { $set: { 'campus.status': 'studying', 'campus.admittedAt': now, 'campus.admissionNo': no } });
        if (r.modifiedCount) done.push({ name: u.name, no, dept: dept.name });
    }
    if (!done.length) return bad(res, 'Nobody was admitted: check their departments.');
    res.json({ message: done.length === 1 ? `${done[0].name} was admitted to ${done[0].dept}. Admission no. ${done[0].no}.` : `${done.length} students admitted, admission no. ${done[0].no} to ${done[done.length - 1].no}.` });
}));
// Send the accepted back to Applications { userIds }: the class comes off again.
router.post('/students/send-back', intake, safe(async (req, res) => {
    const r = await User.updateMany(acceptedFilter(req, idsOf(req)), { $unset: { campus: 1 } });
    res.json({ message: `${r.modifiedCount} sent back to Applications.` });
}));
// The standard fields and the college's own questions (2026-11-16).
const cleanDetails = (d = {}, campus) => C.cleanDetailsOf(campus, d);
const admissionBody = async (req, dept, current = null) => {
    const b = req.body || {};
    // A new admission is into the 1st year (2026-11-14); an existing record can be any semester.
    const top = current ? dept.semesters : C.firstYear(dept);
    const semester = b.semester !== undefined ? int(b.semester, 1, top) : current?.semester;
    if (!semester) return { error: [current ? `Choose a semester from 1 to ${dept.semesters}.` : 'New admissions are into the 1st year: semester 1 or 2.', 'semester'] };
    const section = b.section !== undefined ? str(b.section, 10).toUpperCase() : current?.section || dept.sections?.[0] || '';
    if (!sectionOk(dept, section) || (needsSection(dept) && !section)) return { error: ['Choose one of the department’s sections.', 'section'] };
    const rollNo = b.rollNo !== undefined ? str(b.rollNo, 40) : current?.rollNo || '';
    if (rollNo) {
        const clash = await User.findOne({ organizationId: req.organization._id, 'campus.departmentId': dept._id, 'campus.rollNo': rollNo, ...(current ? { _id: { $ne: req.params.id } } : {}) }).select('name').lean();
        if (clash) return { error: [`Roll number ${rollNo} is already ${clash.name}’s.`, 'rollNo'] };
    }
    const value = {
        semester, section, rollNo,
        academicYear: b.academicYear !== undefined ? str(b.academicYear, 20) : current?.academicYear || '',
        ...(b.details !== undefined ? { details: cleanDetails(b.details, req.campus) } : {})
    };
    if (b.status !== undefined && ['studying', 'completed', 'left'].includes(b.status)) value.status = b.status;
    // Given automatically on admission (2026-11-14); only an existing record's can be corrected.
    if (current && b.admissionNo !== undefined) value.admissionNo = str(b.admissionNo, 40);
    if (b.admittedAt !== undefined && C.DATE.test(String(b.admittedAt))) value.admittedAt = new Date(b.admittedAt);
    return { value };
};
/** Admit `user` (this organization's, not admitted yet) to `dept` with the form in req.body. Answers the request. */
const admit = async (req, res, dept, user, extra = '') => {
    const { value, error } = await admissionBody(req, dept);
    if (error) return bad(res, ...error);
    [value.admissionNo] = await C.nextAdmissionNos(req.organization._id, dept);
    const campus = { departmentId: dept._id, status: 'studying', admittedAt: value.admittedAt || new Date(), details: {}, attendance: [], marks: [], payments: [], applications: [], feedback: [], ...value };
    await User.updateOne({ _id: user._id, 'campus.departmentId': null }, { $set: { campus } });
    return res.status(201).json({ message: `${user.name} was admitted to ${dept.name}, semester ${value.semester}${value.section ? ` ${value.section}` : ''}. Admission no. ${value.admissionNo}.${extra}`, studentId: user._id });
};
// ── Admission requests (2026-11-14) ───────────────────────────────────────
// Students asking to join with the organization ID, with the department and semester they chose.
// The office (or the organization) approves — editing the class if need be — or rejects.
router.get('/requests', intake, safe(async (req, res) => {
    const JoinRequest = require('../organizations/models/JoinRequest');
    const rows = await JoinRequest.find({ organizationId: req.organization._id, status: 'pending' }).sort({ createdAt: 1 })
        .populate('userId', 'name email phone cardNumber profilePicture').lean();
    res.json({
        departments: req.campus.departments.map(deptView),
        requests: rows.filter((r) => r.userId).map((r) => {
            const d = r.campus?.departmentId ? C.find(req.campus, 'departments', r.campus.departmentId) : null;
            return {
                _id: r._id, at: r.createdAt,
                student: { _id: r.userId._id, name: r.userId.name, email: r.userId.email || '', phone: r.userId.phone || '', cardNumber: r.userId.cardNumber || '', picture: r.userId.profilePicture || '' },
                choice: r.campus ? { departmentId: r.campus.departmentId, department: d?.name || '', semester: r.campus.semester, section: r.campus.section || '' } : null
            };
        })
    });
}));
router.post('/requests/:id', intake, safe(async (req, res) => {
    req.params.requestId = req.params.id;
    if (req.body?.decision === 'approve') {
        const d = C.find(req.campus, 'departments', req.body.departmentId);
        if (!d) return bad(res, 'Choose the department.', 'departmentId');
        if (!int(req.body.semester, 1, d.semesters)) return bad(res, `Choose a semester from 1 to ${d.semesters}.`, 'semester');
        const section = str(req.body.section, 10).toUpperCase();
        if (!sectionOk(d, section) || (needsSection(d) && !section)) return bad(res, 'Choose the section.', 'section');
        req.body.section = section;
    }
    return require('../organizations/controllers/orgAdminController').decideRequest(req, res);
}));

// ── Online applications (2026-11-16) ─────────────────────────────────────
// New students who applied through the college's public admission link (src/campus/apply.js).
// Admit: the office opens the admission form filled with the application and adds the student's AI
// card (POST /students/new with applicationId), which removes it from here. Reject: removed.
router.get('/applications', intake, safe(async (req, res) => {
    const list = [...(req.campus.applications || [])].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json({
        open: req.campus.admissionsOpen !== false,
        orgCode: req.organization.orgCode,
        // The college's version of the public form (2026-11-16): its note and each field's mode.
        form: require('./apply').formOf(req.campus),
        applications: list.map((a) => ({
            _id: a._id, at: a.createdAt, departmentId: a.departmentId, department: C.find(req.campus, 'departments', a.departmentId)?.name || '',
            section: a.section || '', name: a.name, email: a.email, phone: a.phone, details: a.details || {}
        }))
    });
}));
router.get('/applications/count', safe(async (req, res) => {
    res.json({ pending: (req.campus.applications || []).length });
}));
router.post('/applications/:id/reject', intake, safe(async (req, res) => {
    if (!idOk(req.params.id)) return bad(res, 'That application was not found.');
    const a = C.find(req.campus, 'applications', req.params.id);
    if (!a) return bad(res, 'That application was already handled.');
    await C.pullItem(req.organization._id, 'applications', req.params.id);
    res.json({ message: `${a.name}’s application was rejected.` });
}));
router.put('/applications/open', intake, safe(async (req, res) => {
    const open = Boolean(req.body?.open);
    await require('../organizations/models/Organization').updateOne({ _id: req.organization._id }, { $set: { 'campus.admissionsOpen': open } });
    res.json({ open, message: open ? 'Your admission link is taking applications.' : 'Your admission link is closed. Students who open it are told so.' });
}));
// Customize the public form: { intro, fields: { key: 'off' | 'optional' | 'required' } }.
router.put('/applications/form', intake, safe(async (req, res) => {
    const form = require('./apply').cleanForm(req.body || {});
    await require('../organizations/models/Organization').updateOne({ _id: req.organization._id }, { $set: { 'campus.admissionForm': form } });
    res.json({ form, message: 'Your admission form was saved. New applicants see it at once.' });
}));
// Correct an application before admitting it (2026-11-16): name, contact, course, section and details.
// Not held to the public form's required fields — the office may fill what the student left out later.
router.put('/applications/:id', intake, safe(async (req, res) => {
    if (!idOk(req.params.id)) return bad(res, 'That application was not found.');
    if (!C.find(req.campus, 'applications', req.params.id)) return bad(res, 'That application was already handled.');
    const { value, error } = require('./apply').readApplication(req.campus, req.body || {}, { strict: false });
    if (error) return bad(res, ...error);
    await C.setItem(req.organization._id, 'applications', req.params.id, { ...value, updatedAt: new Date() });
    res.json({ message: `${value.name}’s application was updated.` });
}));

// An existing student of the organization (they joined with their AI card).
router.post('/students', intake, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    if (!idOk(req.body?.userId)) return bad(res, 'Choose the student to admit.', 'userId');
    const user = await User.findOne({ _id: req.body.userId, organizationId: req.organization._id }).select('name campus.departmentId').lean();
    if (!user) return bad(res, 'That student is not in your organization.', 'userId');
    if (user.campus?.departmentId) return bad(res, `${user.name} is already admitted. Open their record to change it.`, 'userId');
    return admit(req, res, dept, user);
}));
// A new student: their account is made from their AI card, then admitted. The
// form's class and admission fields are checked first, so a mistake there does
// not leave an account behind without an admission.
router.post('/students/new', intake, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const check = await admissionBody(req, dept);
    if (check.error) return bad(res, ...check.error);
    const s = req.body.student || {};
    // From an online application whose applicant already has an account (2026-11-16): admitted on that
    // account — joined to this organization if they are in none — instead of a new one from a card.
    if (idOk(req.body?.applicationId) && C.find(req.campus, 'applications', req.body.applicationId)) {
        const email = str(s.email, 254).toLowerCase();
        const existing = email ? await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).select('name email organizationId campus.departmentId').lean() : null;
        if (existing) {
            if (existing.organizationId && String(existing.organizationId) !== String(req.organization._id)) return bad(res, `${existing.name} already belongs to another organization. They must leave it first.`, 'email');
            if (existing.campus?.departmentId) return bad(res, `${existing.name} already has a class here. Open their record to change it.`, 'email');
            if (!existing.organizationId) await User.updateOne({ _id: existing._id, organizationId: null }, { $set: { organizationId: req.organization._id, organizationJoinedAt: new Date() } });
            await C.pullItem(req.organization._id, 'applications', req.body.applicationId).catch(() => {});
            return admit(req, res, dept, existing, ' They already had an account, so they sign in with it as before.');
        }
    }
    const { createCardStudent, sendStudentWelcome } = require('../organizations/controllers/orgAdminController');
    let made;
    try {
        made = await createCardStudent(req.organization, { name: s.name, email: s.email, phone: s.phone, CardNumber: s.cardNumber, CVV: s.cvv, qrCodeNumber: s.qrCodeNumber });
    } catch (error) {
        if (error.status === 400) return res.status(400).json({ field: error.field, code: error.code, message: error.message });
        throw error;
    }
    sendStudentWelcome(made.user, made.password, req.organization);
    // Admitted from an online application: it leaves Applications.
    if (idOk(req.body?.applicationId)) await C.pullItem(req.organization._id, 'applications', req.body.applicationId).catch(() => {});
    return admit(req, res, dept, made.user, ` Their sign-in details were emailed to ${made.user.email}.`);
}));
router.post('/students/promote', office, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const semester = int(req.body?.semester, 1, 12);
    if (!semester) return bad(res, 'Choose the semester to promote.', 'semester');
    const filter = C.classFilter(req.organization._id, dept._id, semester);
    const step = { semester, at: new Date(), by: req.admin?.name || '' };
    if (semester >= dept.semesters) {
        const r = await User.updateMany(filter, { $set: { 'campus.status': 'completed', 'campus.endedAt': new Date(), 'campus.endReason': 'Passed out' }, $push: { 'campus.journey': { ...step, to: 0, note: 'Passed out' } } });
        return res.json({ message: `${r.modifiedCount} student${r.modifiedCount === 1 ? '' : 's'} of the final semester passed out. They are kept under Alumni.` });
    }
    const r = await User.updateMany(filter, { $set: { 'campus.semester': semester + 1 }, $push: { 'campus.journey': { ...step, to: semester + 1 } } });
    res.json({ message: `${r.modifiedCount} student${r.modifiedCount === 1 ? '' : 's'} moved to semester ${semester + 1}.` });
}));
router.get('/students/:id', front, safe(async (req, res) => {
    const u = await studentFor(req, { 'campus.details': 1, 'campus.academicYear': 1, 'campus.admittedAt': 1, 'campus.attendance': 1, 'campus.marks': 1, 'campus.payments': 1, 'campus.applications': 1 });
    if (!u) return gone(res, 'The student');
    const dept = C.find(req.campus, 'departments', u.campus.departmentId);
    const att = C.attendanceSummary(u.campus.attendance);
    const subjects = req.campus.subjects.filter((s) => same(s.departmentId, u.campus.departmentId));
    const exams = req.campus.exams.filter((e) => same(e.departmentId, u.campus.departmentId));
    res.json({
        student: { ...C.studentRow(u), academicYear: u.campus.academicYear, admittedAt: u.campus.admittedAt, details: u.campus.details || {} },
        department: dept ? deptView(dept) : null,
        attendance: {
            percent: att.percent, held: att.held, present: att.present,
            subjects: subjects.filter((s) => att.bySubject[String(s._id)]).map((s) => ({ _id: s._id, name: s.name, code: s.code, semester: s.semester, ...att.bySubject[String(s._id)] }))
        },
        fees: C.feesOf(req.campus, u),
        exams: exams.map((e) => ({
            _id: e._id, name: e.name, kind: e.kind, semester: e.semester, published: e.published, hallTickets: e.hallTickets,
            application: (u.campus.applications || []).find((a) => same(a.e, e._id)) || null,
            result: C.resultOf(req.campus, e, u.campus.marks)
        })).filter((e) => e.application || e.result.subjects.some((s) => s.marks !== undefined))
    });
}));
router.put('/students/:id', front, safe(async (req, res) => {
    const u = await studentFor(req, { 'campus.academicYear': 1, 'campus.status': 1 });
    if (!u) return gone(res, 'The student');
    let dept = C.find(req.campus, 'departments', u.campus.departmentId);
    if (['admin', 'admission'].includes(req.campusRole) && req.body?.departmentId && !same(req.body.departmentId, dept?._id)) {
        dept = C.find(req.campus, 'departments', req.body.departmentId);
        if (!dept) return bad(res, 'Choose a department.', 'departmentId');
    }
    if (!dept) return bad(res, 'Choose a department.', 'departmentId');
    const { value, error } = await admissionBody(req, dept, u.campus);
    if (error) return bad(res, ...error);
    const $set = { 'campus.departmentId': dept._id };
    for (const [k, v] of Object.entries(value)) $set[`campus.${k}`] = v;
    // Passed out or left: dated, and kept (they move to the alumni list). Back to studying: undated.
    if (value.status && value.status !== u.campus.status) {
        $set['campus.endedAt'] = value.status === 'studying' ? null : new Date();
        $set['campus.endReason'] = value.status === 'studying' ? '' : str(req.body?.endReason, 300) || (value.status === 'completed' ? 'Passed out' : 'Left the institution');
    }
    await User.updateOne({ _id: u._id }, { $set });
    res.json({ message: `${u.name}’s admission was saved.` });
}));
router.delete('/students/:id', intake, safe(async (req, res) => {
    const u = await studentFor(req);
    if (!u) return gone(res, 'The student');
    await User.updateOne({ _id: u._id }, { $unset: { campus: 1 } });
    res.json({ message: `${u.name}’s admission and campus record were removed. They stay in your organization.` });
}));

// ── Fee payments ────────────────────────────────────────────────────────────
router.post('/students/:id/payments', front, safe(async (req, res) => {
    const u = await studentFor(req);
    if (!u) return gone(res, 'The student');
    const b = req.body || {};
    const amount = num(b.amount, 0.01, 1e8);
    if (!amount) return bad(res, 'Enter the amount received.', 'amount');
    const mode = MODES.includes(b.mode) ? b.mode : 'cash';
    let title = str(b.title, 120);
    let fee = null; let exam = null;
    if (b.feeId) {
        const f = ownItem(req, 'fees', b.feeId);
        if (!f || !same(f.departmentId, u.campus.departmentId)) return bad(res, 'Choose one of the department’s fees.', 'feeId');
        fee = f._id; title = title || f.title;
    } else if (b.examId) {
        const e = ownItem(req, 'exams', b.examId);
        if (!e || !same(e.departmentId, u.campus.departmentId)) return bad(res, 'Choose one of the department’s exams.', 'examId');
        exam = e._id; title = title || `${e.name} — exam fee`;
    }
    if (!title) return bad(res, 'Say what this payment is for.', 'title');
    const seq = await C.nextSeq(req.organization._id, 'receiptSeq');
    const receipt = `${String(req.campusOrg.orgCode || 'RCPT').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)}-R${String(seq).padStart(5, '0')}`;
    const payment = { _id: new ObjectId(), fee, exam, title, amount, mode, ref: str(b.ref, 80), receipt, at: C.DATE.test(String(b.date)) ? new Date(`${b.date}T12:00:00+05:30`) : new Date(), by: req.admin.name };
    await User.updateOne({ _id: u._id }, { $push: { 'campus.payments': payment } });
    res.status(201).json({ message: `₹${amount.toLocaleString('en-IN')} received from ${u.name}. Receipt ${receipt}.`, payment });
}));
router.delete('/students/:id/payments/:paymentId', front, safe(async (req, res) => {
    const u = await studentFor(req);
    if (!u || !idOk(req.params.paymentId)) return gone(res, 'The payment');
    const r = await User.updateOne({ _id: u._id }, { $pull: { 'campus.payments': { _id: new ObjectId(req.params.paymentId) } } });
    if (!r.modifiedCount) return gone(res, 'The payment');
    res.json({ message: 'The receipt was cancelled.' });
}));

// ── Subjects ────────────────────────────────────────────────────────────────
const subjectBody = async (req, dept, s = {}) => {
    const b = req.body || {};
    const name = b.name !== undefined ? str(b.name, 120) : s.name;
    if (!name) return { error: ['Enter the subject’s name.', 'name'] };
    const semester = b.semester !== undefined ? int(b.semester, 1, dept.semesters) : s.semester;
    if (!semester) return { error: [`Choose a semester from 1 to ${dept.semesters}.`, 'semester'] };
    let teacherIds = s.teacherIds || [];
    if (b.teacherIds !== undefined) {
        const ok = (await teachersOf(req.organization._id)).map((t) => String(t._id));
        teacherIds = (Array.isArray(b.teacherIds) ? b.teacherIds : []).filter((t) => ok.includes(String(t))).map((t) => new ObjectId(String(t)));
    }
    return {
        value: {
            departmentId: dept._id, semester, name,
            code: b.code !== undefined ? str(b.code, 20).toUpperCase() : s.code || '',
            credits: b.credits !== undefined ? num(b.credits, 0, 20, 4) : s.credits ?? 4,
            kind: b.kind !== undefined ? (b.kind === 'practical' ? 'practical' : 'theory') : s.kind || 'theory',
            teacherIds
        }
    };
};
const subjectView = (s, teachers) => ({ ...s, teachers: (s.teacherIds || []).map((id) => teachers.find((t) => same(t._id, id))).filter(Boolean) });
const subjectsGet = safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const teachers = await teachersOf(req.organization._id);
    const rows = req.campus.subjects.filter((s) => same(s.departmentId, dept._id)).sort((a, b) => a.semester - b.semester || String(a.code).localeCompare(String(b.code)));
    res.json({ subjects: rows.map((s) => subjectView(s, teachers)), teachers, department: deptView(dept) });
});
router.get('/subjects', examDesk, subjectsGet);
const subjectPost = safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const { value, error } = await subjectBody(req, dept);
    if (error) return bad(res, ...error);
    if (req.campus.subjects.length >= 3000) return bad(res, 'Your organization has reached the limit of subjects.');
    await C.pushItem(req.organization._id, 'subjects', value);
    res.status(201).json({ message: `${value.name} was added to semester ${value.semester}.` });
});
router.post('/subjects', office, subjectPost);
const subjectPut = safe(async (req, res) => {
    const s = ownItem(req, 'subjects', req.params.id);
    if (!s) return gone(res, 'The subject');
    const dept = C.find(req.campus, 'departments', s.departmentId);
    const { value, error } = await subjectBody(req, dept, s);
    if (error) return bad(res, ...error);
    await C.setItem(req.organization._id, 'subjects', s._id, value);
    res.json({ message: `${value.name} saved.` });
});
router.put('/subjects/:id', office, subjectPut);
const subjectDelete = safe(async (req, res) => {
    const s = ownItem(req, 'subjects', req.params.id);
    if (!s) return gone(res, 'The subject');
    await C.pullItem(req.organization._id, 'subjects', s._id);
    res.json({ message: `${s.name} was removed.` });
});
router.delete('/subjects/:id', office, subjectDelete);

// ── Timetable ───────────────────────────────────────────────────────────────
// One weekly timetable a class (department, semester, section), set by the department (HOD).
const PERIOD_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const classArgs = (req, res, src) => {
    const dept = needDept(req, res); if (!dept) return null;
    const semester = int(src.semester, 1, dept.semesters);
    if (!semester) { bad(res, `Choose a semester from 1 to ${dept.semesters}.`, 'semester'); return null; }
    const section = str(src.section, 10).toUpperCase();
    if (!sectionOk(dept, section)) { bad(res, 'Choose one of the sections.', 'section'); return null; }
    return { dept, semester, section };
};
const timetableGet = safe(async (req, res) => {
    const a = classArgs(req, res, req.query); if (!a) return;
    const own = req.campus.timetables.find((t) => same(t.departmentId, a.dept._id) && t.semester === a.semester && (t.section || '') === a.section);
    const subjects = req.campus.subjects.filter((s) => same(s.departmentId, a.dept._id) && s.semester === a.semester)
        .map((s) => ({ _id: s._id, code: s.code, name: s.name, kind: s.kind })).sort((x, y) => String(x.code).localeCompare(String(y.code), 'en', { numeric: true }));
    res.json({ timetable: own ? C.timetableOf(req.campus, a.dept._id, a.semester, a.section) : null, subjects });
});
router.get('/timetable', examDesk, timetableGet);
const timetablePut = safe(async (req, res) => {
    const b = req.body || {};
    const a = classArgs(req, res, b); if (!a) return;
    const periods = [];
    for (const [i, p] of (Array.isArray(b.periods) ? b.periods : []).slice(0, 12).entries()) {
        const start = String(p?.start || ''); const end = String(p?.end || '');
        if ((start && !PERIOD_TIME.test(start)) || (end && !PERIOD_TIME.test(end))) return bad(res, `Period ${i + 1}: enter times as hh:mm.`, 'periods');
        if (start && end && end <= start) return bad(res, `Period ${i + 1} must end after it starts.`, 'periods');
        periods.push({ n: i + 1, start, end });
    }
    if (!periods.length) return bad(res, 'Add at least one period.', 'periods');
    const ok = new Set(req.campus.subjects.filter((s) => same(s.departmentId, a.dept._id) && s.semester === a.semester).map((s) => String(s._id)));
    const seen = new Set();
    const slots = [];
    for (const x of Array.isArray(b.slots) ? b.slots : []) {
        const day = int(x?.day, 1, 6); const p = int(x?.p, 1, periods.length);
        if (!day || !p || !ok.has(String(x?.subjectId)) || seen.has(`${day}-${p}`)) continue;
        seen.add(`${day}-${p}`);
        slots.push({ day, p, subjectId: new ObjectId(String(x.subjectId)), room: str(x.room, 30) });
    }
    const own = req.campus.timetables.find((t) => same(t.departmentId, a.dept._id) && t.semester === a.semester && (t.section || '') === a.section);
    if (own) await C.setItem(req.organization._id, 'timetables', own._id, { periods, slots, updatedAt: new Date() });
    else {
        if (req.campus.timetables.length >= 2000) return bad(res, 'Your organization has reached the limit of timetables.');
        await C.pushItem(req.organization._id, 'timetables', { departmentId: a.dept._id, semester: a.semester, section: a.section, periods, slots, createdAt: new Date(), updatedAt: new Date() });
    }
    res.json({ message: `Timetable saved for semester ${a.semester}${a.section ? `, section ${a.section}` : ''}. Students see it on their Institution page.` });
});
router.put('/timetable', office, timetablePut);


// ── Announcements ───────────────────────────────────────────────────────────
// A department's notices to its students, posted by its office or its HOD (teacher dashboard).
const announcementsGet = safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const rows = req.campus.announcements.filter((a) => same(a.departmentId, dept._id))
        .sort((a, b) => (b.pinned - a.pinned) || new Date(b.createdAt) - new Date(a.createdAt))
        .map((a) => ({ _id: a._id, title: a.title, body: a.body, pinned: a.pinned, by: a.by, semester: a.semester, section: a.section, toStudents: a.toStudents !== false, toTeachers: Boolean(a.toTeachers), at: a.createdAt }));
    res.json({ announcements: rows, department: deptView(dept) });
});
const announcementPost = safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const b = req.body || {};
    const title = str(b.title, 150);
    if (!title) return bad(res, 'Enter a title.', 'title');
    const semester = b.semester ? int(b.semester, 1, dept.semesters) : 0;
    if (semester === null) return bad(res, 'Choose a semester.', 'semester');
    const section = str(b.section, 10).toUpperCase();
    if (!sectionOk(dept, section)) return bad(res, 'Choose one of the sections.', 'section');
    const toStudents = b.toStudents === undefined ? true : Boolean(b.toStudents);
    const toTeachers = Boolean(b.toTeachers);
    if (!toStudents && !toTeachers) return bad(res, 'Choose who it is for: students, teachers or both.', 'audience');
    if (req.campus.announcements.length >= 3000) return bad(res, 'Remove some old announcements first.');
    const now = new Date();
    await C.pushItem(req.organization._id, 'announcements', { departmentId: dept._id, semester, section, title, body: str(b.body, 3000), pinned: Boolean(b.pinned), toStudents, toTeachers, by: req.admin.name || '', createdAt: now, updatedAt: now });
    const who = toStudents && toTeachers ? 'Students and teachers' : toStudents ? 'Students' : 'Teachers';
    res.status(201).json({ message: `Announcement posted. ${who} see it${toStudents ? ' (students on their Institution page)' : ''}${toTeachers ? `${toStudents ? ',' : ''} teachers on their Attendance page` : ''}.` });
});
const ownAnnouncement = (req, res) => {
    const a = C.find(req.campus, 'announcements', req.params.id);
    const dept = a && deptOf(req, a.departmentId);
    if (!a || !dept || !same(dept._id, a.departmentId)) { gone(res, 'The announcement'); return null; }
    return a;
};
const announcementPin = safe(async (req, res) => {
    const a = ownAnnouncement(req, res); if (!a) return;
    await C.setItem(req.organization._id, 'announcements', a._id, { pinned: !a.pinned });
    res.json({ message: a.pinned ? 'Unpinned.' : 'Pinned to the top.' });
});
const announcementDelete = safe(async (req, res) => {
    const a = ownAnnouncement(req, res); if (!a) return;
    await C.pullItem(req.organization._id, 'announcements', a._id);
    res.json({ message: 'Announcement removed.' });
});
router.get('/announcements', front, announcementsGet);
router.post('/announcements', front, announcementPost);
router.put('/announcements/:id/pin', front, announcementPin);
router.delete('/announcements/:id', front, announcementDelete);

// ── Attendance ──────────────────────────────────────────────────────────────
const subjectAccess = (req, res, id) => {
    const s = C.find(req.campus, 'subjects', id);
    if (!s || !canTeach(req, s)) { gone(res, 'The subject'); return null; }
    return s;
};
const sessionArgs = (req, res, src) => {
    if (req.campusRole === 'board') { nope(res, 'Attendance is marked by teachers and the department.'); return null; }
    const s = subjectAccess(req, res, src.subjectId); if (!s) return null;
    const dept = C.find(req.campus, 'departments', s.departmentId);
    const date = String(src.date || '');
    if (!C.DATE.test(date)) { bad(res, 'Choose the date.', 'date'); return null; }
    if (date > C.today()) { bad(res, 'Attendance cannot be marked for a day still to come.', 'date'); return null; }
    if (req.campusRole === 'teacher' && date !== C.today()) { bad(res, 'Teachers can mark attendance for today only.', 'date'); return null; }
    const period = int(src.period, 1, 12);
    if (!period) { bad(res, 'Choose the period (hour).', 'period'); return null; }
    const section = str(src.section, 10).toUpperCase();
    if (!sectionOk(dept, section) || (needsSection(dept) && !section)) { bad(res, 'Choose the section.', 'section'); return null; }
    return { s, dept, date, period, section };
};
// Periods of this class on this date already taken by another subject: { period: 'CODE Name' }.
const periodsHeldByOthers = async (req, a) => {
    const rows = await User.aggregate([
        { $match: C.classFilter(req.organization._id, a.dept._id, a.s.semester, a.section) },
        { $project: { att: { $filter: { input: { $ifNull: ['$campus.attendance', []] }, cond: { $and: [{ $eq: ['$$this.d', a.date] }, { $ne: ['$$this.s', a.s._id] }] } } } } },
        { $unwind: '$att' },
        { $group: { _id: '$att.p', s: { $first: '$att.s' } } }
    ]);
    const out = {};
    rows.forEach((r) => { const o = C.find(req.campus, 'subjects', r.s); out[r._id] = o ? `${o.code ? `${o.code} ` : ''}${o.name}` : 'another subject'; });
    return out;
};
const attendanceSessionGet = safe(async (req, res) => {
    const a = sessionArgs(req, res, req.query); if (!a) return;
    const rows = await User.aggregate([
        { $match: C.classFilter(req.organization._id, a.dept._id, a.s.semester, a.section) },
        { $project: {
            name: 1, cardNumber: 1, profilePicture: 1, rollNo: '$campus.rollNo', section: '$campus.section',
            mark: { $filter: { input: { $ifNull: ['$campus.attendance', []] }, cond: { $and: [{ $eq: ['$$this.s', a.s._id] }, { $eq: ['$$this.d', a.date] }, { $eq: ['$$this.p', a.period] }] } } },
            periods: { $filter: { input: { $ifNull: ['$campus.attendance', []] }, cond: { $and: [{ $eq: ['$$this.s', a.s._id] }, { $eq: ['$$this.d', a.date] }] } } }
        } }
    ]);
    const marked = [...new Set(rows.flatMap((r) => r.periods.map((p) => p.p)))].sort((x, y) => x - y);
    const heldBy = await periodsHeldByOthers(req, a);
    const students = rows.map((r) => ({ _id: r._id, name: r.name, rollNo: r.rollNo || '', section: r.section || '', picture: r.profilePicture || '', status: r.mark[0] ? (r.mark[0].ok ? 'present' : r.mark[0].x ? 'excused' : 'absent') : null }))
        .sort((x, y) => String(x.rollNo).localeCompare(String(y.rollNo), 'en', { numeric: true }) || x.name.localeCompare(y.name));
    res.json({ subject: { _id: a.s._id, name: a.s.name, code: a.s.code, semester: a.s.semester }, department: deptView(a.dept), date: a.date, period: a.period, section: a.section, students, taken: students.some((x) => x.status), remedial: rows.some((r) => r.mark[0]?.r), markedPeriods: marked, heldBy });
});
router.get('/attendance/session', attendanceSessionGet);
const attendanceSessionPut = safe(async (req, res) => {
    const a = sessionArgs(req, res, req.body || {}); if (!a) return;
    const absent = new Set((Array.isArray(req.body.absent) ? req.body.absent : []).map(String));
    const excused = new Set((Array.isArray(req.body.excused) ? req.body.excused : []).map(String));
    const remedial = req.body.remedial === true;
    const students = await User.find(C.classFilter(req.organization._id, a.dept._id, a.s.semester, a.section)).select('_id').lean();
    if (!students.length) return bad(res, 'There are no students in this class yet.');
    const held = (await periodsHeldByOthers(req, a))[a.period];
    if (held) return bad(res, `Period ${a.period} is already marked for ${held}. Choose another period.`, 'period');
    const key = { s: a.s._id, d: a.date, p: a.period };
    const ops = students.flatMap((u) => [
        { updateOne: { filter: { _id: u._id }, update: { $pull: { 'campus.attendance': key } } } },
        { updateOne: { filter: { _id: u._id }, update: { $push: { 'campus.attendance': { ...key, ok: !absent.has(String(u._id)) && !excused.has(String(u._id)), ...(excused.has(String(u._id)) && !absent.has(String(u._id)) ? { x: true } : {}), ...(remedial ? { r: true } : {}) } } } } }
    ]);
    await User.bulkWrite(ops, { ordered: true });
    const nAbsent = students.filter((u) => absent.has(String(u._id))).length;
    const nExcused = students.filter((u) => !absent.has(String(u._id)) && excused.has(String(u._id))).length;
    const nPresent = students.length - nAbsent - nExcused;
    res.json({ message: `${remedial ? 'Remedial class' : 'Attendance'} saved: ${nPresent} present, ${nAbsent} absent${nExcused ? `, ${nExcused} excused` : ''}.`, present: nPresent, absent: nAbsent, excused: nExcused });
});
router.put('/attendance/session', attendanceSessionPut);
const attendanceReport = safe(async (req, res) => {
    let dept; let semester; let subjects;
    if (req.query.subjectId) {
        const s = subjectAccess(req, res, req.query.subjectId); if (!s) return;
        dept = C.find(req.campus, 'departments', s.departmentId); semester = s.semester; subjects = [s];
    } else {
        if (!['admin', 'department'].includes(req.campusRole)) return nope(res);
        dept = needDept(req, res); if (!dept) return;
        semester = int(req.query.semester, 1, dept.semesters);
        if (!semester) return bad(res, 'Choose a semester.', 'semester');
        subjects = req.campus.subjects.filter((s) => same(s.departmentId, dept._id) && s.semester === semester);
    }
    const section = str(req.query.section, 10).toUpperCase();
    const ids = new Set(subjects.map((s) => String(s._id)));
    const rows = await C.classList(req.organization._id, dept._id, semester, section, { 'campus.attendance': 1 });
    res.json({
        subjects: subjects.map((s) => ({ _id: s._id, name: s.name, code: s.code })),
        students: rows.map((u) => {
            const sum = C.attendanceSummary(u.campus.attendance, ids);
            return { ...C.studentRow(u), percent: sum.percent, held: sum.held, present: sum.present, bySubject: sum.bySubject };
        })
    });
});
router.get('/attendance/report', attendanceReport);

// ── Marks ───────────────────────────────────────────────────────────────────
const sheetArgs = (req, res, src) => {
    const exam = C.find(req.campus, 'exams', src.examId);
    if (!exam) { gone(res, 'The exam'); return null; }
    const s = subjectAccess(req, res, src.subjectId); if (!s) return null;
    if (!same(s.departmentId, exam.departmentId) || s.semester !== exam.semester) { bad(res, 'This subject is not part of that exam.', 'subjectId'); return null; }
    if (exam.kind === 'semester' && !['admin', 'board'].includes(req.campusRole)) { nope(res, 'Semester exam marks are entered by the examination board.'); return null; }
    if (exam.kind !== 'semester' && req.campusRole === 'board') { nope(res, 'Internal assessment marks are entered by teachers.'); return null; }
    if (req.campusRole === 'department' && !same(exam.departmentId, req.campusDept._id)) { gone(res, 'The exam'); return null; }
    const dept = C.find(req.campus, 'departments', exam.departmentId);
    const section = str(src.section, 10).toUpperCase();
    if (!sectionOk(dept, section)) { bad(res, 'Choose one of the sections.', 'section'); return null; }
    return { exam, s, dept, section };
};
const marksSheetGet = safe(async (req, res) => {
    const a = sheetArgs(req, res, req.query); if (!a) return;
    const rows = await User.aggregate([
        { $match: C.classFilter(req.organization._id, a.dept._id, a.exam.semester, a.section) },
        { $project: { name: 1, profilePicture: 1, rollNo: '$campus.rollNo', section: '$campus.section', mark: { $filter: { input: { $ifNull: ['$campus.marks', []] }, cond: { $and: [{ $eq: ['$$this.e', a.exam._id] }, { $eq: ['$$this.s', a.s._id] }] } } } } }
    ]);
    res.json({
        exam: C.examView(req.campus, a.exam), subject: { _id: a.s._id, name: a.s.name, code: a.s.code }, section: a.section,
        students: rows.map((r) => ({ _id: r._id, name: r.name, rollNo: r.rollNo || '', section: r.section || '', picture: r.profilePicture || '', marks: r.mark[0] ? (r.mark[0].m ?? null) : undefined, entered: Boolean(r.mark[0]) }))
            .sort((x, y) => String(x.rollNo).localeCompare(String(y.rollNo), 'en', { numeric: true }) || x.name.localeCompare(y.name))
    });
});
router.get('/marks/sheet', marksSheetGet);
const marksSheetPut = safe(async (req, res) => {
    const a = sheetArgs(req, res, req.body || {}); if (!a) return;
    const entries = Array.isArray(req.body.marks) ? req.body.marks : [];
    const students = new Set((await User.find(C.classFilter(req.organization._id, a.dept._id, a.exam.semester, a.section)).select('_id').lean()).map((u) => String(u._id)));
    const key = { e: a.exam._id, s: a.s._id };
    const ops = [];
    let saved = 0;
    for (const x of entries) {
        if (!students.has(String(x.studentId))) continue;
        const id = new ObjectId(String(x.studentId));
        ops.push({ updateOne: { filter: { _id: id }, update: { $pull: { 'campus.marks': key } } } });
        if (x.marks === '' || x.marks === undefined) continue;   // cleared
        let m = null;
        if (x.marks !== null && x.marks !== 'AB') {
            m = num(x.marks, 0, a.exam.maxMarks);
            if (m === null) return bad(res, `Marks must be between 0 and ${a.exam.maxMarks}.`);
        }
        ops.push({ updateOne: { filter: { _id: id }, update: { $push: { 'campus.marks': { ...key, m } } } } });
        saved += 1;
    }
    if (ops.length) await User.bulkWrite(ops, { ordered: true });
    res.json({ message: `Marks saved for ${saved} student${saved === 1 ? '' : 's'}.` });
});
router.put('/marks/sheet', marksSheetPut);

// ── Fees ────────────────────────────────────────────────────────────────────
const feeBody = (b, dept, f = {}) => {
    const title = b.title !== undefined ? str(b.title, 120) : f.title;
    if (!title) return { error: ['Enter what the fee is for.', 'title'] };
    const amount = b.amount !== undefined ? num(b.amount, 0, 1e8) : f.amount;
    if (amount === null || amount === undefined) return { error: ['Enter the amount.', 'amount'] };
    const semester = b.semester !== undefined ? int(b.semester, 0, dept.semesters, 0) : f.semester ?? 0;
    const kinds = ['admission', 'tuition', 'exam', 'hostel', 'transport', 'other'];
    return { value: { departmentId: dept._id, title, amount, semester, kind: kinds.includes(b.kind) ? b.kind : f.kind || 'tuition', dueDate: b.dueDate !== undefined ? (C.DATE.test(String(b.dueDate)) ? b.dueDate : '') : f.dueDate || '' } };
};
router.get('/fees', front, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    res.json({ fees: req.campus.fees.filter((f) => same(f.departmentId, dept._id)).sort((a, b) => a.semester - b.semester || a.title.localeCompare(b.title)) });
}));
router.get('/fees/ledger', front, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const filter = { ...C.classFilter(req.organization._id, dept._id, int(req.query.semester, 1, 12), str(req.query.section, 10).toUpperCase()), ...searchFilter(req.query.search) };
    const rows = await User.find(filter, { ...C.STUDENT_FIELDS, 'campus.payments': 1, 'campus.applications': 1 }).limit(2000).lean();
    let students = rows.sort(C.byRoll).map((u) => {
        const f = C.feesOf(req.campus, u);
        return { ...C.studentRow(u), total: f.total, paid: f.paid, balance: f.balance, overdue: f.items.some((i) => i.status === 'overdue') };
    });
    if (req.query.status === 'due') students = students.filter((s) => s.balance > 0);
    if (req.query.status === 'paid') students = students.filter((s) => s.balance === 0);
    res.json({ students, totals: { total: students.reduce((t, s) => t + s.total, 0), paid: students.reduce((t, s) => t + s.paid, 0), balance: students.reduce((t, s) => t + s.balance, 0) } });
}));
router.post('/fees', office, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const { value, error } = feeBody(req.body || {}, dept);
    if (error) return bad(res, ...error);
    await C.pushItem(req.organization._id, 'fees', value);
    res.status(201).json({ message: `${value.title} was added.` });
}));
router.put('/fees/:id', office, safe(async (req, res) => {
    const f = ownItem(req, 'fees', req.params.id);
    if (!f) return gone(res, 'The fee');
    const { value, error } = feeBody(req.body || {}, C.find(req.campus, 'departments', f.departmentId), f);
    if (error) return bad(res, ...error);
    await C.setItem(req.organization._id, 'fees', f._id, value);
    res.json({ message: `${value.title} saved.` });
}));
router.delete('/fees/:id', office, safe(async (req, res) => {
    const f = ownItem(req, 'fees', req.params.id);
    if (!f) return gone(res, 'The fee');
    await C.pullItem(req.organization._id, 'fees', f._id);
    res.json({ message: `${f.title} was removed. Payments already received for it stay on record.` });
}));

// ── Exams ───────────────────────────────────────────────────────────────────
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const examBody = (req, dept, e = {}) => {
    const b = req.body || {};
    const name = b.name !== undefined ? str(b.name, 120) : e.name;
    if (!name) return { error: ['Enter the exam’s name.', 'name'] };
    const semester = b.semester !== undefined ? int(b.semester, 1, dept.semesters) : e.semester;
    if (!semester) return { error: [`Choose a semester from 1 to ${dept.semesters}.`, 'semester'] };
    const maxMarks = b.maxMarks !== undefined ? num(b.maxMarks, 1, 1000) : e.maxMarks ?? 100;
    if (!maxMarks) return { error: ['Maximum marks must be between 1 and 1000.', 'maxMarks'] };
    const passMarks = b.passMarks !== undefined ? num(b.passMarks, 0, maxMarks) : e.passMarks ?? Math.round(maxMarks * 0.35);
    if (passMarks === null) return { error: ['Pass marks must be between 0 and the maximum.', 'passMarks'] };
    const value = {
        departmentId: dept._id, name, semester, maxMarks, passMarks,
        kind: b.kind !== undefined ? (b.kind === 'semester' ? 'semester' : 'internal') : e.kind || 'internal',
        fee: b.fee !== undefined ? num(b.fee, 0, 1e7, 0) : e.fee ?? 0,
        applyUntil: b.applyUntil !== undefined ? (C.DATE.test(String(b.applyUntil)) ? b.applyUntil : '') : e.applyUntil || '',
        venue: b.venue !== undefined ? str(b.venue, 200) : e.venue || '',
        instructions: b.instructions !== undefined ? str(b.instructions, 2000) : e.instructions || ''
    };
    for (const k of ['applicationsOpen', 'hallTickets', 'published']) if (typeof b[k] === 'boolean') value[k] = b[k];
    if (b.schedule !== undefined) {
        const ok = req.campus.subjects.filter((s) => same(s.departmentId, dept._id) && s.semester === semester).map((s) => String(s._id));
        value.schedule = (Array.isArray(b.schedule) ? b.schedule : [])
            .filter((x) => ok.includes(String(x?.subjectId)))
            .map((x) => ({ subjectId: new ObjectId(String(x.subjectId)), date: C.DATE.test(String(x.date)) ? x.date : '', start: TIME.test(String(x.start)) ? x.start : '', end: TIME.test(String(x.end)) ? x.end : '' }));
    }
    return { value };
};
router.get('/exams', safe(async (req, res) => {
    let rows;
    if (req.campusRole === 'admission') return nope(res);
    if (req.campusRole === 'teacher') {
        const mine = req.campus.subjects.filter((s) => canTeach(req, s));
        rows = req.campus.exams.filter((e) => e.kind === 'internal' && mine.some((s) => same(s.departmentId, e.departmentId) && s.semester === e.semester));
    } else if (req.campusRole !== 'department' && !req.query.departmentId) {
        rows = req.campus.exams;   // the board and the admin: every department's
    } else {
        const dept = needDept(req, res); if (!dept) return;
        rows = req.campus.exams.filter((e) => same(e.departmentId, dept._id));
    }
    if (['internal', 'semester'].includes(req.query.kind)) rows = rows.filter((e) => e.kind === req.query.kind);
    const ids = rows.map((e) => e._id);
    const counts = ids.length ? await User.aggregate([
        { $match: { organizationId: req.organization._id, 'campus.applications.e': { $in: ids } } },
        { $unwind: '$campus.applications' },
        { $match: { 'campus.applications.e': { $in: ids } } },
        { $group: { _id: { e: '$campus.applications.e', s: '$campus.applications.status' }, n: { $sum: 1 } } }
    ]) : [];
    const count = (e, s) => counts.find((c) => same(c._id.e, e) && c._id.s === s)?.n || 0;
    res.json({
        exams: rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((e) => ({
            ...C.examView(req.campus, e),
            department: (() => { const d = C.find(req.campus, 'departments', e.departmentId); return d ? { _id: d._id, name: d.name, code: d.code } : null; })(),
            subjects: C.examSubjects(req.campus, e).map((s) => ({ _id: s._id, name: s.name, code: s.code })),
            applications: { applied: count(e._id, 'applied'), approved: count(e._id, 'approved'), rejected: count(e._id, 'rejected') }
        }))
    });
}));
router.post('/exams', examDesk, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const { value, error } = examBody(req, dept);
    if (error) return bad(res, ...error);
    if (!mayWriteExam(req, value.kind)) return nope(res, value.kind === 'semester' ? boardMsg : 'Internal assessments are set by the department.');
    await C.pushItem(req.organization._id, 'exams', { applicationsOpen: false, hallTickets: false, published: false, schedule: [], ...value });
    res.status(201).json({ message: `${value.name} was created.` });
}));
router.put('/exams/:id', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e) return gone(res, 'The exam');
    if (!mayWriteExam(req, e.kind)) return nope(res, e.kind === 'semester' ? boardMsg : 'Internal assessments are set by the department.');
    const { value, error } = examBody(req, C.find(req.campus, 'departments', e.departmentId), e);
    if (error) return bad(res, ...error);
    if (value.kind !== e.kind && !mayWriteExam(req, value.kind)) return nope(res, boardMsg);
    if (value.published === true && !e.published) value.publishedAt = new Date();
    if (value.published === false) value.publishedAt = null;
    await C.setItem(req.organization._id, 'exams', e._id, value);
    const says = value.published === true && !e.published ? (e.kind === 'semester' ? 'Marks cards published. Each student now sees their own marks card in their profile.' : 'Marks published. Students can see them now.')
        : value.published === false && e.published ? 'Unpublished. Students no longer see these marks.'
        : value.hallTickets === true && !e.hallTickets ? 'Admit cards released to approved students.'
            : value.applicationsOpen === true && !e.applicationsOpen ? 'Applications are open. Students can apply from their Institution dashboard.'
                : `${value.name} saved.`;
    res.json({ message: says });
}));
router.delete('/exams/:id', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e) return gone(res, 'The exam');
    if (!mayWriteExam(req, e.kind)) return nope(res, boardMsg);
    await C.pullItem(req.organization._id, 'exams', e._id);
    await User.updateMany({ organizationId: req.organization._id, 'campus.departmentId': e.departmentId }, { $pull: { 'campus.marks': { e: e._id }, 'campus.applications': { e: e._id } } });
    res.json({ message: `${e.name} was deleted, with its marks and applications.` });
}));
router.get('/exams/:id/applications', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e) return gone(res, 'The exam');
    const rows = await C.classList(req.organization._id, e.departmentId, e.semester, str(req.query.section, 10).toUpperCase(), { 'campus.applications': 1, 'campus.payments': 1, 'campus.attendance': 1 });
    res.json({
        exam: C.examView(req.campus, e),
        students: rows.map((u) => {
            const a = (u.campus.applications || []).find((x) => same(x.e, e._id));
            const paid = (u.campus.payments || []).filter((p) => same(p.exam, e._id)).reduce((t, p) => t + p.amount, 0);
            return { ...C.studentRow(u), application: a ? { status: a.status, at: a.at, note: a.note || '' } : null, feePaid: paid, feeDue: Math.max(0, (e.fee || 0) - paid), attendance: C.attendanceSummary(u.campus.attendance).percent };
        })
    });
}));
const setApplication = async (req, e, studentIds, status, note) => {
    const ids = (await User.find({ ...C.classFilter(req.organization._id, e.departmentId, e.semester), _id: { $in: studentIds.filter(idOk) } }).select('_id campus.applications').lean());
    const ops = ids.flatMap((u) => {
        const had = (u.campus.applications || []).find((x) => same(x.e, e._id));
        return [
            { updateOne: { filter: { _id: u._id }, update: { $pull: { 'campus.applications': { e: e._id } } } } },
            { updateOne: { filter: { _id: u._id }, update: { $push: { 'campus.applications': { e: e._id, at: had?.at || new Date(), status, note } } } } }
        ];
    });
    if (ops.length) await User.bulkWrite(ops, { ordered: true });
    return ids.length;
};
router.put('/exams/:id/applications/:studentId', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e) return gone(res, 'The exam');
    if (!mayWriteExam(req, e.kind)) return nope(res, boardMsg);
    const status = ['approved', 'rejected', 'applied'].includes(req.body?.status) ? req.body.status : null;
    if (!status) return bad(res, 'Approve or reject the application.');
    const n = await setApplication(req, e, [req.params.studentId], status, str(req.body?.note, 300));
    if (!n) return gone(res, 'The student');
    res.json({ message: status === 'approved' ? 'Application approved.' : status === 'rejected' ? 'Application rejected.' : 'Application saved.' });
}));
router.post('/exams/:id/applications/bulk', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e) return gone(res, 'The exam');
    if (!mayWriteExam(req, e.kind)) return nope(res, boardMsg);
    const status = ['approved', 'rejected'].includes(req.body?.status) ? req.body.status : null;
    if (!status) return bad(res, 'Approve or reject the applications.');
    const n = await setApplication(req, e, (Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).map(String), status, '');
    res.json({ message: `${n} application${n === 1 ? '' : 's'} ${status}.` });
}));
router.get('/exams/:id/results', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e) return gone(res, 'The exam');
    const rows = await C.classList(req.organization._id, e.departmentId, e.semester, str(req.query.section, 10).toUpperCase(), { 'campus.marks': 1 });
    const results = rows.map((u) => ({ ...C.studentRow(u), ...C.resultOf(req.campus, e, u.campus.marks) }));
    const complete = results.filter((r) => r.complete);
    const dept = C.find(req.campus, 'departments', e.departmentId);
    res.json({
        exam: C.examView(req.campus, e),
        institution: { name: req.campusOrg.name, logo: req.campusOrg.logo || '', address: req.campusOrg.address || '' },
        department: dept ? { name: dept.name, code: dept.code } : null,
        subjects: C.examSubjects(req.campus, e).map((s) => ({ _id: s._id, name: s.name, code: s.code, credits: s.credits })),
        students: results,
        summary: { students: results.length, complete: complete.length, passed: complete.filter((r) => !r.failed).length }
    });
}));
router.get('/exams/:id/hall-ticket/:studentId', examDesk, safe(async (req, res) => {
    const e = ownItem(req, 'exams', req.params.id);
    if (!e || !idOk(req.params.studentId)) return gone(res, 'The admit card');
    const u = await User.findOne({ _id: req.params.studentId, organizationId: req.organization._id, 'campus.departmentId': e.departmentId }, { ...C.STUDENT_FIELDS, 'campus.attendance': 1, 'campus.applications': 1 }).lean();
    if (!u) return gone(res, 'The student');
    res.json(hallTicket(req.campusOrg, req.campus, e, u));
}));

// ── Feedback ────────────────────────────────────────────────────────────────
const feedbackBody = (b, dept, f = {}) => {
    const title = b.title !== undefined ? str(b.title, 150) : f.title;
    if (!title) return { error: ['Give the form a title.', 'title'] };
    const questions = b.questions !== undefined
        ? (Array.isArray(b.questions) ? b.questions : []).map((q) => ({ text: str(q?.text, 300), kind: q?.kind === 'text' ? 'text' : 'rating' })).filter((q) => q.text).slice(0, 30)
        : f.questions || [];
    if (!questions.length) return { error: ['Add at least one question.', 'questions'] };
    const value = { departmentId: dept._id, title, questions, semester: b.semester !== undefined ? int(b.semester, 0, dept.semesters, 0) : f.semester ?? 0, perSubject: b.perSubject !== undefined ? Boolean(b.perSubject) : f.perSubject ?? true };
    if (typeof b.open === 'boolean') value.open = b.open;
    return { value };
};
const responseCounts = async (organizationId, ids) => (ids.length ? User.aggregate([
    { $match: { organizationId, 'campus.feedback.f': { $in: ids } } },
    { $unwind: '$campus.feedback' }, { $match: { 'campus.feedback.f': { $in: ids } } },
    { $group: { _id: '$campus.feedback.f', n: { $sum: 1 }, people: { $addToSet: '$_id' } } }
]) : []);
router.get('/feedback', office, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const rows = req.campus.feedback.filter((f) => same(f.departmentId, dept._id));
    const counts = await responseCounts(req.organization._id, rows.map((f) => f._id));
    res.json({ forms: rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((f) => { const c = counts.find((x) => same(x._id, f._id)); return { ...f, responses: c?.n || 0, students: c?.people.length || 0 }; }) });
}));
router.post('/feedback', office, safe(async (req, res) => {
    const dept = needDept(req, res); if (!dept) return;
    const { value, error } = feedbackBody(req.body || {}, dept);
    if (error) return bad(res, ...error);
    await C.pushItem(req.organization._id, 'feedback', { open: true, ...value });
    res.status(201).json({ message: `${value.title} is open to students now.` });
}));
router.put('/feedback/:id', office, safe(async (req, res) => {
    const f = ownItem(req, 'feedback', req.params.id);
    if (!f) return gone(res, 'The form');
    const { value, error } = feedbackBody(req.body || {}, C.find(req.campus, 'departments', f.departmentId), f);
    if (error) return bad(res, ...error);
    await C.setItem(req.organization._id, 'feedback', f._id, value);
    res.json({ message: value.open === false ? `${value.title} is closed.` : value.open === true && !f.open ? `${value.title} is open again.` : `${value.title} saved.` });
}));
router.delete('/feedback/:id', office, safe(async (req, res) => {
    const f = ownItem(req, 'feedback', req.params.id);
    if (!f) return gone(res, 'The form');
    await C.pullItem(req.organization._id, 'feedback', f._id);
    await User.updateMany({ organizationId: req.organization._id, 'campus.feedback.f': f._id }, { $pull: { 'campus.feedback': { f: f._id } } });
    res.json({ message: `${f.title} and its responses were deleted.` });
}));
router.get('/feedback/:id/report', office, safe(async (req, res) => {
    const f = ownItem(req, 'feedback', req.params.id);
    if (!f) return gone(res, 'The form');
    const rows = await User.aggregate([
        { $match: { organizationId: req.organization._id, 'campus.feedback.f': f._id } },
        { $unwind: '$campus.feedback' }, { $match: { 'campus.feedback.f': f._id } },
        { $project: { _id: 0, s: '$campus.feedback.s', ans: '$campus.feedback.ans' } }
    ]);
    const groups = {};
    for (const r of rows) {
        const k = f.perSubject ? String(r.s || '') : '';
        groups[k] = groups[k] || [];
        groups[k].push(r.ans || []);
    }
    const summarise = (answers) => f.questions.map((q, i) => {
        const vals = answers.map((a) => a[i]);
        if (q.kind === 'text') return { text: q.text, kind: 'text', comments: vals.map((v) => str(v, 1000)).filter(Boolean).slice(0, 200) };
        const nums = vals.map(Number).filter((n) => n >= 1 && n <= 5);
        const spread = [1, 2, 3, 4, 5].map((n) => nums.filter((x) => x === n).length);
        return { text: q.text, kind: 'rating', average: nums.length ? Math.round((nums.reduce((t, n) => t + n, 0) / nums.length) * 100) / 100 : null, count: nums.length, spread };
    });
    res.json({
        form: f, responses: rows.length,
        groups: Object.entries(groups).map(([k, answers]) => {
            const s = k ? C.find(req.campus, 'subjects', k) : null;
            return { subject: s ? { _id: s._id, name: s.name, code: s.code, teachers: s.teacherIds?.length || 0 } : null, responses: answers.length, questions: summarise(answers) };
        }).sort((a, b) => String(a.subject?.name || '').localeCompare(String(b.subject?.name || '')))
    });
}));

// ── My classes (teachers; the office sees its department's) ─────────────────
const myClasses = safe(async (req, res) => {
    const teachers = await teachersOf(req.organization._id);
    const subjects = req.campus.subjects.filter((s) => (req.campusRole === 'teacher' ? canTeach(req, s) : req.campusRole === 'department' ? same(s.departmentId, req.campusDept._id) : true));
    const counts = await User.aggregate([
        { $match: { organizationId: req.organization._id, 'campus.departmentId': { $ne: null }, 'campus.status': 'studying' } },
        { $group: { _id: { d: '$campus.departmentId', s: '$campus.semester', x: '$campus.section' }, n: { $sum: 1 } } }
    ]);
    res.json({
        hodOf: req.campusRole === 'teacher' ? hodDepartments(req).map(deptView) : [],
        // What the organization calls Student Ranking (Organization.three60.title), for the teacher's menu.
        rankingName: String((await require('../organizations/models/Organization').findById(req.organization._id).select('three60.title').lean())?.three60?.title || '').trim() || 'Student Ranking',
        subjects: subjects.map((s) => {
            const d = C.find(req.campus, 'departments', s.departmentId);
            return {
                ...subjectView(s, teachers),
                department: d ? deptView(d) : null,
                sections: (d?.sections || []).map((x) => ({ name: x, students: counts.find((c) => same(c._id.d, s.departmentId) && c._id.s === s.semester && c._id.x === x)?.n || 0 })),
                students: counts.filter((c) => same(c._id.d, s.departmentId) && c._id.s === s.semester).reduce((t, c) => t + c.n, 0),
                exams: req.campus.exams.filter((e) => same(e.departmentId, s.departmentId) && e.semester === s.semester && (e.kind === 'internal' || req.campusRole !== 'teacher'))
                    .map((e) => ({ _id: e._id, name: e.name, kind: e.kind, maxMarks: e.maxMarks, published: e.published }))
            };
        }).sort((a, b) => String(a.department?.name).localeCompare(String(b.department?.name)) || a.semester - b.semester || a.name.localeCompare(b.name))
    });
});
router.get('/teach', myClasses);

router.use((req, res) => res.status(404).json({ message: `No such endpoint: ${req.method} ${req.originalUrl}` }));

/**
 * The subject teacher's side, in their own teacher dashboard — mounted at
 * /api/teacher/campus behind protectTeacher (src/teacher/index.js):
 *   GET  /                      my subjects, their classes and internal assessments
 *   GET|PUT /attendance/session the register for a subject, day, period and section
 *   GET  /attendance/report     my subject's attendance, student by student
 *   GET|PUT /marks/sheet        internal marks for my subject
 * Only the subjects the department gave this teacher (Subject.teacherIds).
 */
const teacher = express.Router();
teacher.use(safe(async (req, res, next) => {
    const t = req.teacher;
    const org = t.organizationId ? await require('../organizations/models/Organization').findById(t.organizationId).select('status campusAllowed').lean() : null;
    if (!org || org.status !== 'active' || !org.campusAllowed) return res.status(403).json({ code: 'CAMPUS_LOCKED', message: 'Attendance is not switched on for your organization yet.' });
    const { org: full, campus } = await C.loadCampus(t.organizationId);
    req.campus = campus;
    req.campusOrg = full;
    req.campusRole = 'teacher';
    // `demo`: a demo card's teacher, who works as a head of department too (hodDepartments).
    req.admin = { _id: t._id, name: t.name, demo: Boolean(t.demoCard) };
    req.organization = { _id: t.organizationId };
    next();
}));
// Keep the teacher's designation in step with being a head of department (also heals
// heads chosen before accounts were linked): HOD while heading one, cleared after.
teacher.get('/', safe(async (req, res, next) => {
    const { Teacher } = require('../teacher/models');
    const heads = hodDepartments(req);
    if (heads.length) await Teacher.updateOne({ _id: req.admin._id, designation: { $ne: 'HOD' } }, { $set: { designation: 'HOD', department: heads[0].name } });
    else await Teacher.updateOne({ _id: req.admin._id, designation: 'HOD' }, { $set: { designation: '' } });
    next();
}), myClasses);
// Announcements for teachers from the departments they teach in (or head).
teacher.get('/announcements', (req, res) => {
    const mine = new Set([
        ...req.campus.subjects.filter((s) => canTeach(req, s)).map((s) => String(s.departmentId)),
        ...hodDepartments(req).map((d) => String(d._id))
    ]);
    const rows = req.campus.announcements.filter((a) => a.toTeachers && mine.has(String(a.departmentId)))
        .sort((a, b) => (b.pinned - a.pinned) || new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30)
        .map((a) => ({ _id: a._id, title: a.title, body: a.body, pinned: a.pinned, by: a.by, at: a.createdAt, department: C.find(req.campus, 'departments', a.departmentId)?.name || '' }));
    res.json({ announcements: rows });
});
teacher.get('/attendance/session', attendanceSessionGet);
teacher.put('/attendance/session', attendanceSessionPut);
teacher.get('/attendance/report', attendanceReport);
teacher.get('/marks/sheet', marksSheetGet);
teacher.put('/marks/sheet', marksSheetPut);

// The head of a department (Departments → Head of department) works as its office for the
// timetable and announcements: ?departmentId= / body.departmentId names which of theirs.
const hod = express.Router();
hod.use((req, res, next) => {
    const mine = hodDepartments(req);
    const id = req.query.departmentId ?? req.body?.departmentId;
    req.campusDept = (id && mine.find((d) => same(d._id, id))) || (!id && mine.length === 1 ? mine[0] : null);
    if (!mine.length) return nope(res, 'Only the head of a department can do this.');
    if (!req.campusDept && id) return nope(res, 'You are not the head of this department.');
    req.campusDept = req.campusDept || mine[0];
    req.campusRole = 'department';
    next();
});
// The HOD's view of the department (read-only): its students, section by section, with every
// admission detail; and its teachers with the subjects each takes.
hod.get('/students', safe(async (req, res) => {
    const dept = req.campusDept;
    const filter = { organizationId: req.organization._id, 'campus.departmentId': dept._id, 'campus.status': 'studying' };
    const semester = int(req.query.semester, 1, 12);
    if (semester) filter['campus.semester'] = semester;
    const rows = await User.find(filter, { ...C.STUDENT_FIELDS, 'campus.academicYear': 1, 'campus.admittedAt': 1, 'campus.details': 1, 'campus.attendance': 1 }).limit(3000).lean();
    res.json({
        department: deptView(dept),
        detailFields: C.detailFieldsOf(req.campus),
        students: rows.sort(C.byRoll).map((u) => ({
            ...C.studentRow(u), academicYear: u.campus.academicYear || '', admittedAt: u.campus.admittedAt || null,
            details: u.campus.details || {}, attendance: C.attendanceSummary(u.campus.attendance || []).percent
        }))
    });
}));
// One student's whole attendance, subject by subject (the HOD's view; attendance is open).
hod.get('/students/:id/attendance', safe(async (req, res) => {
    const dept = req.campusDept;
    if (!idOk(req.params.id)) return gone(res, 'The student');
    const u = await User.findOne({ _id: req.params.id, organizationId: req.organization._id, 'campus.departmentId': dept._id }, { ...C.STUDENT_FIELDS, 'campus.attendance': 1 }).lean();
    if (!u) return gone(res, 'The student');
    const att = u.campus.attendance || [];
    const subjects = req.campus.subjects.filter((x) => same(x.departmentId, dept._id) && (x.semester === u.campus.semester || att.some((r) => same(r.s, x._id))));
    res.json({
        student: C.studentRow(u),
        summary: C.attendanceSummary(att),
        subjects: subjects.map((x) => {
            const all = att.filter((r) => same(r.s, x._id));
            const rows = all.filter((r) => !r.r);
            const held = rows.length;
            const present = rows.filter((r) => r.ok).length;
            const excused = rows.filter((r) => !r.ok && r.x).length;
            const remedial = all.filter((r) => r.r && r.ok).length;
            const credited = Math.min(held, present + excused + remedial);
            return {
                _id: x._id, code: x.code, name: x.name, semester: x.semester, held, present, excused, remedial,
                percent: held ? Math.round((credited / held) * 1000) / 10 : null,
                allowed: Math.max(0, Math.floor(credited / 0.75 - held)),
                absent: rows.filter((r) => !r.ok && !r.x).map((r) => ({ date: r.d, period: r.p })).sort((a, b) => `${b.date}${b.period}`.localeCompare(`${a.date}${a.period}`)),
                lastAttended: all.filter((r) => r.ok).map((r) => r.d).sort().pop() || null
            };
        }).sort((a, b) => b.semester - a.semester || String(a.code || a.name).localeCompare(String(b.code || b.name), 'en', { numeric: true }))
    });
}));
// Mentors (2026-11-14): the HOD chooses which teacher mentors which of the department's students —
// their Student Ranking mentor (Teacher.students360, src/three60). A teacher given students is
// switched on as a mentor, so Student Ranking shows in their dashboard.
hod.get('/mentors', safe(async (req, res) => {
    const dept = req.campusDept;
    const { Teacher } = require('../teacher/models');
    const [students, teachers] = await Promise.all([
        User.find(C.classFilter(req.organization._id, dept._id), { ...C.STUDENT_FIELDS }).lean(),
        Teacher.find({ organizationId: req.organization._id, status: { $ne: 'inactive' } }).select('name email designation profilePicture students360').sort({ name: 1 }).collation({ locale: 'en', strength: 2 }).lean()
    ]);
    const ids = new Set(students.map((u) => String(u._id)));
    const teaching = new Set(req.campus.subjects.filter((x) => same(x.departmentId, dept._id)).flatMap((x) => (x.teacherIds || []).map(String)));
    res.json({
        students: students.sort(C.byRoll).map(C.studentRow),
        teachers: teachers.map((t) => ({
            _id: t._id, name: t.name, email: t.email || '', designation: t.designation || '', picture: t.profilePicture || '',
            inDepartment: teaching.has(String(t._id)) || same(dept.headId, t._id),
            studentIds: (t.students360 || []).map(String).filter((id) => ids.has(id))
        })).sort((a, b) => (b.inDepartment - a.inDepartment) || a.name.localeCompare(b.name))
    });
}));
hod.put('/mentors/:teacherId', safe(async (req, res) => {
    const dept = req.campusDept;
    if (!idOk(req.params.teacherId)) return gone(res, 'The teacher');
    const { Teacher } = require('../teacher/models');
    const t = await Teacher.findOne({ _id: req.params.teacherId, organizationId: req.organization._id }).select('name students360').lean();
    if (!t) return gone(res, 'The teacher');
    const students = await User.find(C.classFilter(req.organization._id, dept._id)).select('_id').lean();
    const deptIds = new Set(students.map((u) => String(u._id)));
    const picked = [...new Set((Array.isArray(req.body?.studentIds) ? req.body.studentIds : []).map(String))].filter((id) => deptIds.has(id));
    // Their mentees from other departments stay; this department's become exactly the ones picked.
    const keep = (t.students360 || []).map(String).filter((id) => !deptIds.has(id));
    const next = [...keep, ...picked].map((id) => new ObjectId(id));
    await Teacher.updateOne({ _id: t._id }, { $set: { students360: next, ...(next.length ? { mentor360: true } : {}) } });
    res.json({ message: `${t.name} now mentors ${picked.length} student${picked.length === 1 ? '' : 's'} of ${dept.name}.` });
}));
// Student Ranking for the department (2026-11-14), read-only: each student's ranking marks (given
// by their mentor on checking proof, src/three60), the top three, and who mentors whom.
hod.get('/ranking', safe(async (req, res) => {
    const dept = req.campusDept;
    const Organization = require('../organizations/models/Organization');
    const org = await Organization.findById(req.organization._id).select('three60').lean();
    const { totalsOf, unlocked } = require('../three60/activities');
    const title = String(org?.three60?.title || '').trim() || 'Student Ranking';
    if (!unlocked(org)) return res.json({ enabled: false, title, students: [] });
    const { Teacher } = require('../teacher/models');
    const [students, mentors] = await Promise.all([
        User.find(C.classFilter(req.organization._id, dept._id), { ...C.STUDENT_FIELDS, activityProofs: 1, activityMarks: 1 }).lean(),
        Teacher.find({ organizationId: req.organization._id, students360: { $exists: true, $ne: [] } }).select('name students360').lean()
    ]);
    const mentorOf = {};
    mentors.forEach((t) => (t.students360 || []).forEach((id) => { (mentorOf[String(id)] = mentorOf[String(id)] || []).push(t.name); }));
    const rows = students.map((u) => ({
        ...C.studentRow(u),
        marks: totalsOf(org, u.activityProofs, u.activityMarks).total,
        waiting: (u.activityProofs || []).filter((x) => x.status === 'pending').length,
        mentors: mentorOf[String(u._id)] || []
    })).sort((a, b) => b.marks - a.marks || a.name.localeCompare(b.name));
    res.json({ enabled: true, title, students: rows });
}));
hod.get('/teachers', safe(async (req, res) => {
    const dept = req.campusDept;
    const subjects = req.campus.subjects.filter((x) => same(x.departmentId, dept._id));
    const ids = new Set(subjects.flatMap((x) => (x.teacherIds || []).map(String)));
    if (dept.headId) ids.add(String(dept.headId));
    const all = await teachersOf(req.organization._id);
    // And every teacher who put this department in their profile (2026-11-14), subjects or not yet.
    const names = [dept.name, dept.code].filter(Boolean).map((x) => x.trim().toLowerCase());
    for (const t of all) if (String(t.department || '').split(',').some((x) => names.includes(x.trim().toLowerCase()))) ids.add(String(t._id));
    const { Teacher } = require('../teacher/models');
    const extra = await Teacher.find({ _id: { $in: [...ids] } }).select('phone profilePicture').lean();
    res.json({
        teachers: all.filter((t) => ids.has(String(t._id))).map((t) => {
            const x = extra.find((e) => same(e._id, t._id)) || {};
            return {
                _id: t._id, name: t.name, email: t.email || '', phone: x.phone || '', picture: x.profilePicture || '', designation: t.designation || '',
                hod: same(dept.headId, t._id),
                subjects: subjects.filter((sub) => (sub.teacherIds || []).some((id) => same(id, t._id)))
                    .map((sub) => ({ _id: sub._id, code: sub.code, name: sub.name, semester: sub.semester })).sort((a, b) => a.semester - b.semester)
            };
        }).sort((a, b) => (b.hod - a.hod) || a.name.localeCompare(b.name))
    });
}));
// The HOD runs the department's subjects: what is taught each semester and by which teacher.
hod.get('/subjects', subjectsGet);
hod.post('/subjects', subjectPost);
hod.put('/subjects/:id', subjectPut);
hod.delete('/subjects/:id', subjectDelete);
hod.get('/timetable', timetableGet);
hod.put('/timetable', timetablePut);
hod.get('/announcements', announcementsGet);
hod.post('/announcements', announcementPost);
hod.put('/announcements/:id/pin', announcementPin);
hod.delete('/announcements/:id', announcementDelete);
teacher.use('/hod', hod);

module.exports = router;
module.exports.teacher = teacher;
