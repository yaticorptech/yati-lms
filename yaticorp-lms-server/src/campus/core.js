/**
 * Campus (2026-11-13): the pieces the organization panel's routes (./orgAdmin.js)
 * and the student's (./student.js) share — reading the set-up off the
 * organization, the class lists, attendance and marks summaries, grades and fees.
 *
 * Stored inside existing collections (the cluster is at its collection limit):
 *   Organization.campus   departments, subjects, fees, exams, feedback forms
 *   Organization.campusAllowed   switched on by the platform's superadmin
 *   User.campus           the student's admission and everything recorded about them
 *   Admin.campusDepartmentId     a department's sign-in
 */
const mongoose = require('mongoose');
const Organization = require('../organizations/models/Organization');
const User = require('../models/User');

const { ObjectId } = mongoose.Types;
const LISTS = ['classes', 'departments', 'subjects', 'fees', 'exams', 'feedback', 'timetables', 'announcements', 'applications'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The admission form's fields beyond the class: [key, label]. */
const DETAILS = [
    ['dob', 'Date of birth'], ['gender', 'Gender'], ['bloodGroup', 'Blood group'], ['category', 'Category'],
    ['nationality', 'Nationality'], ['religion', 'Religion'], ['motherTongue', 'Mother tongue'],
    ['fatherName', 'Father’s name'], ['fatherPhone', 'Father’s phone'], ['fatherOccupation', 'Father’s occupation'],
    ['motherName', 'Mother’s name'], ['motherPhone', 'Mother’s phone'], ['guardianName', 'Guardian'], ['guardianPhone', 'Guardian’s phone'],
    ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['pincode', 'PIN code'],
    ['previousInstitution', 'Previous institution'], ['previousBoard', 'Board / university'], ['previousPercentage', 'Previous marks (%)'],
    ['quota', 'Admission quota'], ['hostel', 'Hostel'], ['transport', 'Transport']
];

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/**
 * The college's own questions on its admission form (2026-11-16, Customize form): { id, label, type,
 * options, required }. type: text | long | number | date | select | multi | yesno. Answers are kept in
 * the details with the question's id as the key ('q_…'), so they follow the student into their record.
 */
const QUESTION_TYPES = ['text', 'long', 'number', 'date', 'select', 'multi', 'yesno'];
const customQuestions = (campus) => (campus?.admissionForm?.custom || []).filter((q) => q && /^q_[a-z0-9]{4,16}$/.test(q.id) && q.label);
/** Every detail field — the standard ones and the college's own: [{ key, label, type?, options?, custom? }]. */
const detailFieldsOf = (campus) => [
    ...DETAILS.map(([key, label]) => ({ key, label: str(campus?.admissionForm?.labels?.[key], 80) || label })),
    ...customQuestions(campus).map((q) => ({ key: q.id, label: q.label, type: q.type, options: q.options || [], required: !!q.required, custom: true }))
];
/** Details as sent, kept to the known fields (standard and the college's own). */
const cleanDetailsOf = (campus, d = {}) => Object.fromEntries(
    detailFieldsOf(campus).map((f) => [f.key, str(d?.[f.key], f.custom ? 1000 : 300)]).filter(([, v]) => v)
);
const int = (v, min, max, fallback = null) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};
const num = (v, min, max, fallback = null) => {
    const n = Number(v);
    return v !== '' && v !== null && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 100) / 100 : fallback;
};
const idOk = (id) => mongoose.isValidObjectId(id) && String(id).length === 24;
const same = (a, b) => a != null && b != null && String(a) === String(b);
const today = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);   // India time

/** The organization's campus set-up, every list present. */
const loadCampus = async (organizationId) => {
    const org = await Organization.findById(organizationId).select('name orgCode logo address phone email campusAllowed campus').lean();
    const campus = org?.campus || {};
    for (const k of LISTS) campus[k] = campus[k] || [];
    return { org, campus };
};

/** A class's timetable for a reader: periods and slots with each subject's name and code. */
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const timetableOf = (campus, departmentId, semester, section) => {
    const t = campus.timetables.find((x) => same(x.departmentId, departmentId) && x.semester === semester && (x.section || '') === (section || ''))
        || campus.timetables.find((x) => same(x.departmentId, departmentId) && x.semester === semester && !x.section);
    if (!t) return null;
    const subjects = campus.subjects;
    return {
        _id: t._id, semester: t.semester, section: t.section || '', updatedAt: t.updatedAt,
        periods: (t.periods || []).slice().sort((a, b) => a.n - b.n),
        slots: (t.slots || []).map((x) => {
            const sub = subjects.find((o) => same(o._id, x.subjectId));
            return sub ? { day: x.day, p: x.p, subjectId: x.subjectId, room: x.room || '', code: sub.code || '', name: sub.name, kind: sub.kind } : null;
        }).filter(Boolean)
    };
};

/** A class's announcements, newest first (pinned on top): the department's, for all or this semester/section. */
const announcementsOf = (campus, departmentId, semester, section) => campus.announcements
    .filter((a) => a.toStudents !== false && same(a.departmentId, departmentId) && (!a.semester || a.semester === semester) && (!a.section || a.section === (section || '')))
    .sort((a, b) => (b.pinned - a.pinned) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 30)
    .map((a) => ({ _id: a._id, title: a.title, body: a.body, pinned: a.pinned, by: a.by, semester: a.semester, section: a.section, at: a.createdAt }));

/**
 * Admit a member of the organization to a department's class (no admission yet), with the next
 * admission number. Returns the admission number, or null when they were already admitted.
 */
/**
 * The next `n` admission numbers (2026-11-14): from the organization's own format in Settings
 * (prefix + running number from its start), or the old DEPT/YEAR/0001 when none is set.
 */
const nextAdmissionNos = async (organizationId, dept, n = 1) => {
    const org = await Organization.findOneAndUpdate({ _id: organizationId }, { $inc: { 'campus.admissionSeq': n } }, { returnDocument: 'after', projection: { 'campus.admissionSeq': 1, 'campus.admissionFormat': 1 } }).lean();
    const last = org?.campus?.admissionSeq || n;
    const f = org?.campus?.admissionFormat;
    return Array.from({ length: n }, (_, i) => {
        const seq = last - n + 1 + i;
        if (f?.start > 0) return `${f.prefix || ''}${String(f.start + seq - 1).padStart(f.digits || 1, '0')}`;
        return `${dept.code || 'ADM'}/${new Date().getFullYear()}/${String(seq).padStart(4, '0')}`;
    });
};
// Since 2026-11-14 this ACCEPTS the application (Admissions → Accepted): the class is kept, but no admission
// number and no class lists until the office admits them (admitAccepted). Returns true when accepted.
const admitMember = async (organizationId, dept, userId, { semester, section = '' }) => {
    const campus = { departmentId: dept._id, status: 'accepted', acceptedAt: new Date(), semester, section, rollNo: '', academicYear: '', admissionNo: '', details: {}, attendance: [], marks: [], payments: [], applications: [], feedback: [] };
    const r = await User.updateOne({ _id: userId, organizationId, 'campus.departmentId': null }, { $set: { campus } });
    return r.modifiedCount > 0;
};
/**
 * An existing student joining with their card (2026-11-16): straight into their class (any semester) as
 * studying, with the next admission number — no application, no admission form. True when placed.
 */
const placeMember = async (organizationId, dept, userId, { semester, section = '' }) => {
    const [admissionNo] = await nextAdmissionNos(organizationId, dept, 1);
    const campus = { departmentId: dept._id, status: 'studying', admittedAt: new Date(), semester, section, rollNo: '', academicYear: '', admissionNo, details: {}, attendance: [], marks: [], payments: [], applications: [], feedback: [] };
    const r = await User.updateOne({ _id: userId, organizationId, 'campus.departmentId': null }, { $set: { campus } });
    return r.modifiedCount > 0;
};
/**
 * Before a student leaves the organization: their whole Campus record goes into their own history
 * (campusHistory) with the institution's and department's names, and the current admission is
 * cleared so they can be admitted elsewhere. Nothing is deleted. A no-op without an admission.
 */
const archiveCampus = async (userId, organizationId, reason = 'Left the institution') => {
    const u = await User.findById(userId).select('+campus name').lean();
    if (!u?.campus?.departmentId) return false;
    const { org, campus } = await loadCampus(organizationId);
    const dept = campus.departments.find((d) => String(d._id) === String(u.campus.departmentId));
    const record = {
        ...u.campus,
        organizationId, organizationName: org?.name || '', orgCode: org?.orgCode || '',
        department: dept?.name || '', departmentCode: dept?.code || '',
        status: u.campus.status === 'completed' ? 'completed' : 'left',
        endedAt: u.campus.endedAt || new Date(), endReason: u.campus.endReason || reason,
        archivedAt: new Date(),
        summary: attendanceSummary(u.campus.attendance || []),
        subjects: campus.subjects.filter((s) => String(s.departmentId) === String(u.campus.departmentId)).map((s) => ({ _id: s._id, code: s.code, name: s.name, semester: s.semester }))
    };
    await User.updateOne({ _id: userId }, { $push: { campusHistory: record }, $unset: { campus: 1 } });
    return true;
};
/** The departments a student may choose from when asking to join (Campus on). */
// New admissions are into the 1st year only (2026-11-14): semesters 1–2 (or 1 when the course has one).
const firstYear = (dept) => Math.min(2, dept?.semesters || 1);
// What a student picks from when asking to join (2026-11-16): an existing student of the institution,
// so any semester of the course — they are placed in their class, not admitted afresh.
const joinChoices = (campus) => campus.departments.map((d) => ({ _id: d._id, name: d.name, code: d.code || '', semesters: d.semesters || 1, sections: d.sections || [] }));

/** One list item by id, or undefined. */
const find = (campus, list, id) => (idOk(id) ? campus[list].find((x) => same(x._id, id)) : undefined);

/** Atomic changes to one list, so two people editing do not overwrite each other. */
const pushItem = (organizationId, list, item) => {
    const doc = { _id: new ObjectId(), ...item };
    return Organization.updateOne({ _id: organizationId }, { $push: { [`campus.${list}`]: doc } }).then(() => doc);
};
const setItem = (organizationId, list, id, fields) => {
    const $set = {};
    for (const [k, v] of Object.entries(fields)) if (v !== undefined) $set[`campus.${list}.$[x].${k}`] = v;
    if (!Object.keys($set).length) return Promise.resolve();
    return Organization.updateOne({ _id: organizationId }, { $set }, { arrayFilters: [{ 'x._id': new ObjectId(String(id)) }] });
};
const pullItem = (organizationId, list, id) => Organization.updateOne({ _id: organizationId }, { $pull: { [`campus.${list}`]: { _id: new ObjectId(String(id)) } } });
/** The next number of a counter on the organization (receipts, admissions). */
const nextSeq = async (organizationId, key) => {
    const org = await Organization.findOneAndUpdate({ _id: organizationId }, { $inc: { [`campus.${key}`]: 1 } }, { returnDocument: 'after', projection: { [`campus.${key}`]: 1 } }).lean();
    return org?.campus?.[key] || 1;
};

/** A class: the students of a department's semester (and section) still studying. */
const classFilter = (organizationId, departmentId, semester, section) => ({
    organizationId,
    'campus.departmentId': new ObjectId(String(departmentId)),
    ...(semester ? { 'campus.semester': Number(semester) } : {}),
    ...(section ? { 'campus.section': section } : {}),
    'campus.status': 'studying'
});
const STUDENT_FIELDS = { name: 1, email: 1, phone: 1, cardNumber: 1, profilePicture: 1, 'campus.rollNo': 1, 'campus.admissionNo': 1, 'campus.semester': 1, 'campus.section': 1, 'campus.departmentId': 1, 'campus.status': 1 };
const byRoll = (a, b) => String(a.campus?.rollNo || '').localeCompare(String(b.campus?.rollNo || ''), 'en', { numeric: true }) || String(a.name).localeCompare(String(b.name));
const classList = (organizationId, departmentId, semester, section, extra = {}) =>
    User.find(classFilter(organizationId, departmentId, semester, section), { ...STUDENT_FIELDS, ...extra }).lean().then((rows) => rows.sort(byRoll));
const studentRow = (u) => ({
    _id: u._id, name: u.name, email: u.email, phone: u.phone, cardNumber: u.cardNumber || '', picture: u.profilePicture || '',
    rollNo: u.campus?.rollNo || '', admissionNo: u.campus?.admissionNo || '', semester: u.campus?.semester || 1, section: u.campus?.section || '', status: u.campus?.status || 'studying'
});

/** Attendance per subject: { subjectId: { held, present, percent } } and overall. */
const pct = (n, d) => (d ? Math.min(100, Math.round((n / d) * 1000) / 10) : null);
/**
 * Attendance by subject. `held`: regular classes conducted; `present`: credited — attended, excused
 * (leave granted) and remedial classes attended (each makes up for one missed), never above held.
 */
const attendanceSummary = (rows = [], subjectIds = null) => {
    const by = {};
    for (const r of rows) {
        if (subjectIds && !subjectIds.has(String(r.s))) continue;
        const k = String(r.s);
        by[k] = by[k] || { held: 0, present: 0 };
        if (!r.r) { by[k].held += 1; if (r.ok || r.x) by[k].present += 1; }
        else if (r.ok) by[k].present += 1;   // a remedial class attended makes up one missed — in its own subject only
    }
    // Each subject capped at its own classes, then added up: remedial in one subject never covers another.
    let held = 0; let present = 0;
    for (const v of Object.values(by)) { v.present = Math.min(v.present, v.held); v.percent = pct(v.present, v.held); held += v.held; present += v.present; }
    return { bySubject: by, held, present, percent: pct(present, held) };
};

/** Grade and grade points for a percentage (10-point scale). */
const gradeOf = (percent, passed) => {
    if (!passed) return { grade: 'F', points: 0 };
    if (percent >= 90) return { grade: 'O', points: 10 };
    if (percent >= 80) return { grade: 'A+', points: 9 };
    if (percent >= 70) return { grade: 'A', points: 8 };
    if (percent >= 60) return { grade: 'B+', points: 7 };
    if (percent >= 55) return { grade: 'B', points: 6 };
    if (percent >= 50) return { grade: 'C', points: 5 };
    return { grade: 'P', points: 4 };
};

/** The subjects an exam covers: its timetable's, else every subject of its semester. */
const examSubjects = (campus, exam) => {
    const all = campus.subjects.filter((s) => same(s.departmentId, exam.departmentId) && s.semester === exam.semester);
    const listed = (exam.schedule || []).map((x) => String(x.subjectId));
    return listed.length ? all.filter((s) => listed.includes(String(s._id))) : all;
};

/** One student's result in an exam: each subject's marks and grade, SGPA and pass/fail. */
const resultOf = (campus, exam, marks = []) => {
    const subjects = examSubjects(campus, exam);
    let credits = 0; let weighted = 0; let failed = 0; let complete = true; let total = 0;
    const rows = subjects.map((s) => {
        const row = marks.find((m) => same(m.e, exam._id) && same(m.s, s._id));
        if (!row) { complete = false; return { subjectId: s._id, code: s.code, name: s.name, credits: s.credits, marks: undefined }; }
        const absent = row.m === null || row.m === undefined;
        const passed = !absent && row.m >= exam.passMarks;
        const percent = absent ? 0 : (row.m / exam.maxMarks) * 100;
        const g = gradeOf(percent, passed);
        if (!passed) failed += 1;
        credits += s.credits || 0; weighted += (s.credits || 0) * g.points; total += absent ? 0 : row.m;
        return { subjectId: s._id, code: s.code, name: s.name, credits: s.credits, marks: absent ? null : row.m, max: exam.maxMarks, passed, ...g };
    });
    return {
        subjects: rows, complete, failed, total, max: exam.maxMarks * subjects.length,
        sgpa: complete && credits ? Math.round((weighted / credits) * 100) / 100 : null,
        result: !complete ? 'Pending' : failed ? `Fail (${failed} subject${failed === 1 ? '' : 's'})` : 'Pass'
    };
};

/** The fees a student owes: the department's fee items for their semester, and exam fees for exams they applied to. */
const feesOf = (campus, student) => {
    const c = student.campus || {};
    const payments = c.payments || [];
    const paidFor = (key, id) => payments.filter((p) => same(p[key], id)).reduce((t, p) => t + (p.amount || 0), 0);
    const items = campus.fees
        .filter((f) => same(f.departmentId, c.departmentId) && (!f.semester || f.semester === c.semester))
        .map((f) => ({ _id: f._id, kind: f.kind, title: f.title, amount: f.amount, dueDate: f.dueDate, paid: paidFor('fee', f._id) }));
    for (const a of c.applications || []) {
        if (a.status === 'rejected') continue;
        const exam = find(campus, 'exams', a.e);
        if (exam && exam.fee > 0) items.push({ examId: exam._id, kind: 'exam', title: `${exam.name} — exam fee`, amount: exam.fee, dueDate: exam.applyUntil || '', paid: paidFor('exam', exam._id) });
    }
    for (const i of items) {
        i.balance = Math.max(0, i.amount - i.paid);
        i.status = i.balance === 0 ? 'paid' : i.paid > 0 ? 'partial' : i.dueDate && i.dueDate < today() ? 'overdue' : 'due';
    }
    const total = items.reduce((t, i) => t + i.amount, 0);
    const paid = payments.reduce((t, p) => t + (p.amount || 0), 0);
    const balance = items.reduce((t, i) => t + i.balance, 0);
    return { items, total, paid, balance, payments: [...payments].sort((a, b) => new Date(b.at) - new Date(a.at)) };
};

const examView = (campus, e) => ({
    _id: e._id, departmentId: e.departmentId, semester: e.semester, name: e.name, kind: e.kind, maxMarks: e.maxMarks, passMarks: e.passMarks,
    fee: e.fee, applyUntil: e.applyUntil, applicationsOpen: e.applicationsOpen, hallTickets: e.hallTickets, published: e.published, publishedAt: e.publishedAt || null,
    venue: e.venue, instructions: e.instructions,
    schedule: (e.schedule || []).map((x) => ({ ...x, subject: find(campus, 'subjects', x.subjectId)?.name || '', code: find(campus, 'subjects', x.subjectId)?.code || '' }))
        .sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`)),
    createdAt: e.createdAt
});

module.exports = {
    DETAILS, DATE, str, int, num, idOk, same, today, ObjectId, QUESTION_TYPES, customQuestions, detailFieldsOf, cleanDetailsOf,
    DAYS, timetableOf, announcementsOf, admitMember, placeMember, joinChoices, firstYear, archiveCampus,
    loadCampus, find, pushItem, setItem, pullItem, nextSeq, nextAdmissionNos,
    classFilter, classList, studentRow, STUDENT_FIELDS, byRoll,
    attendanceSummary, gradeOf, examSubjects, resultOf, feesOf, examView
};
