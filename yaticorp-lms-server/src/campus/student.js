/**
 * Campus for the student — the Institution dashboard (2026-11-13). Mounted at
 * /api/organizations/student/campus, behind protectUser.
 *
 *   GET    /me                       whether the student has it (organization's Campus on, an AI card), for the menu
 *   GET    /dashboard                everything the page shows: admission, attendance, internal marks,
 *                                    fees and receipts, exams and applications, results, feedback
 *   POST   /exams/:id/apply          apply for a semester exam while applications are open
 *   DELETE /exams/:id/apply          withdraw an application not yet decided
 *   GET    /exams/:id/hall-ticket    the admit card, once released and the application approved
 *   POST   /feedback/:id             give feedback { subjectId?, answers: [] }
 *   GET    /marks-cards              my published marks cards (the profile shows them)
 *
 * Only the student's own record, from the signed-in account.
 */
const express = require('express');
const User = require('../models/User');
const Organization = require('../organizations/models/Organization');
const C = require('./core');

const { same, str } = C;
const bad = (res, message) => res.status(400).json({ message });

/** The admit card's contents — shared with the office's copy (./orgAdmin.js). */
const hallTicket = (org, campus, exam, u) => {
    const dept = C.find(campus, 'departments', exam.departmentId);
    const application = (u.campus?.applications || []).find((a) => same(a.e, exam._id));
    return {
        institution: { name: org.name, logo: org.logo || '', orgCode: org.orgCode, address: org.address || '', phone: org.phone || '', email: org.email || '' },
        exam: C.examView(campus, exam),
        department: dept ? { name: dept.name, code: dept.code } : null,
        student: { ...C.studentRow(u), details: undefined },
        attendance: C.attendanceSummary(u.campus?.attendance || []).percent,
        application: application ? { status: application.status, at: application.at } : null,
        ticketNo: `${(dept?.code || 'HT').toUpperCase()}${exam.semester}-${String(u.campus?.rollNo || String(u._id).slice(-6)).toUpperCase()}`,
        issuedAt: new Date()
    };
};

/** Whether the student has the Institution dashboard, and their organization's set-up when they do. */
const access = async (userId, fields = {}) => {
    const u = await User.findById(userId, { name: 1, email: 1, phone: 1, cardNumber: 1, profilePicture: 1, organizationId: 1, 'campus.departmentId': 1, 'campus.semester': 1, 'campus.section': 1, 'campus.rollNo': 1, 'campus.admissionNo': 1, 'campus.academicYear': 1, 'campus.admittedAt': 1, 'campus.status': 1, 'campus.endedAt': 1, 'campus.endReason': 1, ...fields }).lean();
    if (!u?.organizationId) return { available: false, reason: 'no-organization' };
    const org = await Organization.findById(u.organizationId).select('status campusAllowed').lean();
    if (!org || org.status !== 'active' || !org.campusAllowed) return { available: false, reason: 'not-enabled' };
    if (!u.cardNumber) return { available: false, reason: 'no-card' };
    const { org: full, campus } = await C.loadCampus(u.organizationId);
    const dept = u.campus?.departmentId ? C.find(campus, 'departments', u.campus.departmentId) : null;
    // Accepted but not admitted yet (2026-11-14): no Institution dashboard until the office admits them.
    const accepted = u.campus?.status === 'accepted';
    return { available: true, admitted: Boolean(dept) && !accepted, accepted, user: u, org: full, campus, dept };
};

const router = express.Router();
const safe = (fn) => async (req, res) => {
    try { await fn(req, res); } catch (error) {
        console.error('[campus] student failed:', req.method, req.originalUrl, error.message);
        res.status(500).json({ message: 'Something went wrong. Please try again.' });
    }
};
const institutionOf = (org) => ({ name: org.name, logo: org.logo || '', orgCode: org.orgCode });

// My past admissions (institutions I left), kept for good: on my profile.
router.get('/history', safe(async (req, res) => {
    const u = await User.findById(req.user._id).select('+campusHistory').lean();
    res.json({ history: (u?.campusHistory || []).map((h) => ({
        organizationName: h.organizationName, orgCode: h.orgCode, department: h.department, departmentCode: h.departmentCode,
        admissionNo: h.admissionNo, rollNo: h.rollNo, semester: h.semester, section: h.section, academicYear: h.academicYear,
        admittedAt: h.admittedAt, endedAt: h.endedAt, status: h.status, endReason: h.endReason,
        attendance: h.summary || null, journey: h.journey || []
    })).sort((a, b) => new Date(b.endedAt || 0) - new Date(a.endedAt || 0)) });
}));
router.get('/me', safe(async (req, res) => {
    const a = await access(req.user._id);
    if (!a.available) return res.json({ available: false, reason: a.reason });
    res.json({ available: true, admitted: a.admitted, institution: institutionOf(a.org) });
}));

router.get('/dashboard', safe(async (req, res) => {
    const a = await access(req.user._id, { 'campus.details': 1, 'campus.attendance': 1, 'campus.marks': 1, 'campus.payments': 1, 'campus.applications': 1, 'campus.feedback': 1 });
    if (!a.available) return res.status(403).json({ code: 'NO_CAMPUS', reason: a.reason, message: 'Your institution’s dashboard is not open to you.' });
    if (!a.admitted) return res.json({ admitted: false, institution: institutionOf(a.org), student: { name: a.user.name } });
    const { user: u, campus, dept } = a;
    const c = u.campus;
    const today = C.today();
    const subjects = campus.subjects.filter((s) => same(s.departmentId, dept._id));
    const current = subjects.filter((s) => s.semester === c.semester);
    const att = C.attendanceSummary(c.attendance);
    const exams = campus.exams.filter((e) => same(e.departmentId, dept._id));
    const applied = (e) => (c.applications || []).find((x) => same(x.e, e._id)) || null;

    // Internal assessments, published, with this student's marks per subject.
    const internals = exams.filter((e) => e.kind === 'internal' && e.published).map((e) => ({
        _id: e._id, name: e.name, semester: e.semester, maxMarks: e.maxMarks, passMarks: e.passMarks,
        subjects: C.examSubjects(campus, e).map((s) => {
            const m = (c.marks || []).find((x) => same(x.e, e._id) && same(x.s, s._id));
            return { _id: s._id, name: s.name, code: s.code, marks: m ? (m.m ?? null) : undefined };
        })
    })).sort((x, y) => y.semester - x.semester);

    // Semester exams: this semester's, and any applied to.
    const semesterExams = exams.filter((e) => e.kind === 'semester' && (e.semester === c.semester || applied(e))).map((e) => {
        const app = applied(e);
        const paid = (c.payments || []).filter((p) => same(p.exam, e._id)).reduce((t, p) => t + p.amount, 0);
        return {
            ...C.examView(campus, e),
            application: app ? { status: app.status, at: app.at, note: app.note || '' } : null,
            canApply: !app && e.applicationsOpen && e.semester === c.semester && (!e.applyUntil || e.applyUntil >= today),
            feePaid: paid, feeDue: app && app.status !== 'rejected' ? Math.max(0, (e.fee || 0) - paid) : 0,
            hallTicket: Boolean(e.hallTickets && app?.status === 'approved')
        };
    });

    const results = exams.filter((e) => e.kind === 'semester' && e.published).map((e) => ({ _id: e._id, name: e.name, semester: e.semester, ...C.resultOf(campus, e, c.marks) }))
        .filter((r) => r.subjects.some((s) => s.marks !== undefined)).sort((x, y) => y.semester - x.semester);

    const given = c.feedback || [];
    const feedback = campus.feedback.filter((f) => same(f.departmentId, dept._id) && f.open && (!f.semester || f.semester === c.semester)).map((f) => ({
        _id: f._id, title: f.title, perSubject: f.perSubject, questions: f.questions,
        targets: f.perSubject
            ? current.map((s) => ({ subjectId: s._id, name: s.name, code: s.code, done: given.some((g) => same(g.f, f._id) && same(g.s, s._id)) }))
            : [{ subjectId: null, name: f.title, done: given.some((g) => same(g.f, f._id)) }]
    }));

    const fees = C.feesOf(campus, u);
    const recent = [...(c.attendance || [])].sort((x, y) => `${y.d}${y.p}`.localeCompare(`${x.d}${x.p}`)).slice(0, 12)
        .map((r) => ({ date: r.d, period: r.p, present: r.ok, excused: !r.ok && Boolean(r.x), remedial: Boolean(r.r), subject: subjects.find((s) => same(s._id, r.s))?.name || 'Subject' }));

    res.json({
        admitted: true,
        institution: institutionOf(a.org),
        timetable: C.timetableOf(campus, dept._id, c.semester, c.section),
        announcements: C.announcementsOf(campus, dept._id, c.semester, c.section),
        student: {
            name: u.name, email: u.email, phone: u.phone, cardNumber: u.cardNumber, picture: u.profilePicture || '',
            rollNo: c.rollNo, admissionNo: c.admissionNo, semester: c.semester, section: c.section, academicYear: c.academicYear, admittedAt: c.admittedAt, status: c.status, endedAt: c.endedAt || null, endReason: c.endReason || '',
            details: c.details || {}
        },
        detailFields: C.detailFieldsOf(campus),
        department: { _id: dept._id, name: dept.name, code: dept.code, semesters: dept.semesters, head: dept.head },
        attendance: {
            percent: att.percent, held: att.held, present: att.present,
            // Every subject of the semester (and any other with classes), with its register:
            // conducted, attended, the days absent and the last day present. Excused: leave granted
            // (counts as attended); remedial: extra classes attended (each makes up one missed). Allowed: how
            // many more classes can be missed while staying at 75%.
            subjects: subjects.filter((s) => s.semester === c.semester || att.bySubject[String(s._id)])
                .map((s) => {
                    const all = (c.attendance || []).filter((r) => same(r.s, s._id));
                    const rows = all.filter((r) => !r.r);   // regular classes
                    const held = rows.length;
                    const present = rows.filter((r) => r.ok).length;
                    const excused = rows.filter((r) => !r.ok && r.x).length;
                    const remedial = all.filter((r) => r.r && r.ok).length;
                    const absent = rows.filter((r) => !r.ok && !r.x).sort((x, y) => `${y.d}${y.p}`.localeCompare(`${x.d}${x.p}`)).map((r) => ({ date: r.d, period: r.p }));
                    const lastAttended = all.filter((r) => r.ok).map((r) => r.d).sort().pop() || null;
                    const credited = Math.min(held, present + excused + remedial);
                    return {
                        _id: s._id, name: s.name, code: s.code, semester: s.semester,
                        held, present, excused, remedial,
                        percent: held ? Math.round((credited / held) * 1000) / 10 : null,
                        allowed: Math.max(0, Math.floor(credited / 0.75 - held)),
                        absent, lastAttended
                    };
                })
                .sort((x, y) => y.semester - x.semester || String(x.code || x.name).localeCompare(String(y.code || y.name), 'en', { numeric: true })),
            recent
        },
        subjects: current.map((s) => ({ _id: s._id, name: s.name, code: s.code, credits: s.credits, kind: s.kind })),
        internals, exams: semesterExams, results, fees, feedback, today
    });
}));

/**
 * My marks cards — for the student's profile: the semester exams the examination
 * board has published, each with this student's own marks only.
 */
router.get('/marks-cards', safe(async (req, res) => {
    const a = await access(req.user._id, { 'campus.marks': 1 });
    if (!a.available || !a.admitted) return res.json({ cards: [] });
    const { user: u, campus, dept, org } = a;
    const cards = campus.exams.filter((e) => e.kind === 'semester' && e.published && same(e.departmentId, dept._id))
        .map((e) => ({ _id: e._id, name: e.name, semester: e.semester, maxMarks: e.maxMarks, passMarks: e.passMarks, publishedAt: e.publishedAt || e.updatedAt, ...C.resultOf(campus, e, u.campus.marks) }))
        .filter((r) => r.subjects.some((s) => s.marks !== undefined))
        .sort((x, y) => y.semester - x.semester);
    res.json({
        institution: { name: org.name, logo: org.logo || '', address: org.address || '' },
        department: { name: dept.name, code: dept.code },
        student: { name: u.name, rollNo: u.campus.rollNo, admissionNo: u.campus.admissionNo, semester: u.campus.semester, section: u.campus.section, cardNumber: u.cardNumber, picture: u.profilePicture || '' },
        cards
    });
}));

const myExam = async (req, res) => {
    const a = await access(req.user._id, { 'campus.applications': 1, 'campus.attendance': 1 });
    if (!a.available || !a.admitted) { res.status(403).json({ message: 'Your institution’s dashboard is not open to you.' }); return null; }
    const e = C.find(a.campus, 'exams', req.params.id);
    if (!e || !same(e.departmentId, a.dept._id)) { res.status(404).json({ message: 'That exam was not found.' }); return null; }
    return { ...a, exam: e };
};

router.post('/exams/:id/apply', safe(async (req, res) => {
    const a = await myExam(req, res); if (!a) return;
    const { exam: e, user: u } = a;
    if (e.kind !== 'semester' || e.semester !== u.campus.semester) return bad(res, 'This exam is not for your semester.');
    if (!e.applicationsOpen || (e.applyUntil && e.applyUntil < C.today())) return bad(res, 'Applications for this exam are closed.');
    const r = await User.updateOne({ _id: u._id, 'campus.applications.e': { $ne: e._id } }, { $push: { 'campus.applications': { e: e._id, at: new Date(), status: 'applied', note: '' } } });
    if (!r.modifiedCount) return bad(res, 'You have already applied for this exam.');
    res.status(201).json({ message: e.fee ? `Applied. Pay the exam fee of ₹${e.fee.toLocaleString('en-IN')} at the office; your department then approves the application.` : 'Applied. Your department approves the application next.' });
}));
router.delete('/exams/:id/apply', safe(async (req, res) => {
    const a = await myExam(req, res); if (!a) return;
    const r = await User.updateOne({ _id: a.user._id }, { $pull: { 'campus.applications': { e: a.exam._id, status: 'applied' } } });
    if (!r.modifiedCount) return bad(res, 'Only an application not yet decided can be withdrawn.');
    res.json({ message: 'Your application was withdrawn.' });
}));
router.get('/exams/:id/hall-ticket', safe(async (req, res) => {
    const a = await myExam(req, res); if (!a) return;
    const app = (a.user.campus.applications || []).find((x) => same(x.e, a.exam._id));
    if (!a.exam.hallTickets) return bad(res, 'Admit cards for this exam are not out yet.');
    if (app?.status !== 'approved') return bad(res, 'Your admit card comes once your application is approved.');
    res.json(hallTicket(a.org, a.campus, a.exam, a.user));
}));

router.post('/feedback/:id', safe(async (req, res) => {
    const a = await access(req.user._id, { 'campus.feedback': 1 });
    if (!a.available || !a.admitted) return res.status(403).json({ message: 'Your institution’s dashboard is not open to you.' });
    const f = C.find(a.campus, 'feedback', req.params.id);
    const c = a.user.campus;
    if (!f || !same(f.departmentId, a.dept._id) || (f.semester && f.semester !== c.semester)) return res.status(404).json({ message: 'That form was not found.' });
    if (!f.open) return bad(res, 'This form is closed.');
    let subjectId = null;
    if (f.perSubject) {
        const s = C.find(a.campus, 'subjects', req.body?.subjectId);
        if (!s || !same(s.departmentId, a.dept._id) || s.semester !== c.semester) return bad(res, 'Choose one of your subjects.');
        subjectId = s._id;
    }
    const raw = Array.isArray(req.body?.answers) ? req.body.answers : [];
    const answers = [];
    for (let i = 0; i < f.questions.length; i += 1) {
        const q = f.questions[i];
        if (q.kind === 'text') { answers.push(str(raw[i], 1000)); continue; }
        const n = Math.round(Number(raw[i]));
        if (!(n >= 1 && n <= 5)) return bad(res, `Rate “${q.text}” from 1 to 5.`);
        answers.push(n);
    }
    const r = await User.updateOne(
        { _id: a.user._id, 'campus.feedback': { $not: { $elemMatch: { f: f._id, s: subjectId } } } },
        { $push: { 'campus.feedback': { f: f._id, s: subjectId, ans: answers, at: new Date() } } }
    );
    if (!r.modifiedCount) return bad(res, 'You have already given this feedback.');
    res.status(201).json({ message: 'Thank you. Your feedback was sent without your name.' });
}));

module.exports = router;
module.exports.hallTicket = hallTicket;
