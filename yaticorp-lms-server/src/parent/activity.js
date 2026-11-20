/**
 * Everything a child does, for their parent (2026-11-19). Read only: nothing here writes to the child's records (the
 * students' own summary endpoints often do — the Multilingo dashboard, the rewards summary — so their parts are read
 * from the models directly). Each part is read on its own: one that fails (a section the platform does not use, an
 * old record of another shape) is left out, never the whole page.
 */
const mongoose = require('mongoose');
const User = require('../models/User');

const idOf = (x) => String(x?._id ?? x);
const part = async (name, fn) => {
    try { return await fn(); } catch (error) { console.error(`[parent] ${name}:`, error.message); return null; }
};
const latest = (...dates) => dates.filter(Boolean).map((d) => new Date(d)).filter((d) => !Number.isNaN(d.getTime())).sort((a, b) => b - a)[0] || null;
const dayDate = (day) => (day ? new Date(`${day}T12:00:00`) : null);

/** The child's organization, or the demo institution for a demo card (services/demoInstitution.js). */
const orgOf = async (user) => {
    const Organization = require('../organizations/models/Organization');
    let id = user.organizationId;
    if (!id) id = await require('../services/demoInstitution').orgIdFor(user._id).catch(() => null);
    return id ? Organization.findById(id).lean() : null;
};

/** The child as a card on the parent's home: who they are, how active, and a few numbers. */
const childSummary = async (user) => {
    const userId = user._id;
    const Streak = require('../rewards/models/Streak');
    const Progress = require('../models/Progress');
    const { LinguisticProgress } = require('../linguistic/models');
    const LearningActivity = require('../rewards/models/LearningActivity');
    const [full, streak, lastCourse, lingo, lastAct, att] = await Promise.all([
        User.findById(userId).select('name cardNumber profilePicture organizationId xp level status institution className updatedAt').lean(),
        part('streak', () => Streak.findOne({ userId }).select('current lastActivityDay').lean()),
        part('course', () => Progress.findOne({ userId }).sort({ updatedAt: -1 }).select('updatedAt').lean()),
        part('lingo', () => LinguisticProgress.findOne({ userId }).select('lastActiveAt').lean()),
        part('activity', () => LearningActivity.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt').lean()),
        // Absent from a class today (2026-11-19): shown on the child's card on the parent's home.
        part('attendance', () => User.findById(userId, { 'campus.attendance': 1 }).lean())
    ]);
    const classDay = require('../campus/core').today();
    const absentToday = (att?.campus?.attendance || []).filter((r) => r.d === classDay && !r.ok && !r.x && !r.r).length;
    const u = full || user;
    const Organization = require('../organizations/models/Organization');
    // A demo card's institution too (2026-11-19 QA: the switcher said "Not in an institution" for a demo child).
    const orgId = u.organizationId || await part('demo org', () => require('../services/demoInstitution').orgIdFor(u._id));
    const org = orgId ? await part('org', () => Organization.findById(orgId).select('name').lean()) : null;
    const { dayKey, addDays } = require('../rewards/config/constants');
    const today = dayKey();
    const alive = streak && (streak.lastActivityDay === today || streak.lastActivityDay === addDays(today, -1));
    return {
        _id: u._id,
        name: u.name,
        cardNumber: String(u.cardNumber || ''),
        profilePicture: u.profilePicture || '',
        organization: org?.name || u.institution || '',
        className: u.className || '',
        xp: u.xp || 0,
        level: u.level || 1,
        streak: alive ? streak.current || 0 : 0,
        lastActive: latest(lastCourse?.updatedAt, lingo?.lastActiveAt, lastAct?.createdAt, dayDate(streak?.lastActivityDay)),
        active: u.status !== 'inactive' && u.status !== 'blocked',
        absentToday
    };
};

/* ── The parts ─────────────────────────────────────────────────────────── */

const coursesOf = async (user) => {
    const { studentDetail } = require('../organizations/services/studentProgress');
    const d = await studentDetail(user, null);
    return { overview: d.overview, courses: d.courses || [], certificates: (d.certificates || []).map((c) => ({ title: c.courseTitle || 'Course', number: c.certificateNumber || '', issuedAt: c.issuedAt })) };
};

const rewardsOf = async (userId) => {
    const Streak = require('../rewards/models/Streak');
    const UserBadge = require('../rewards/models/RewardUserBadge');
    const Badge = require('../rewards/models/RewardBadge');
    const { dayKey, addDays } = require('../rewards/config/constants');
    const [streak, mine] = await Promise.all([
        Streak.findOne({ userId }).lean(),
        UserBadge.find({ userId }).sort({ unlockedAt: -1 }).lean()
    ]);
    const badges = mine.length ? await Badge.find({ key: { $in: mine.map((b) => b.badgeKey) } }).select('key title emoji description').lean() : [];
    const today = dayKey();
    const active = new Set(streak?.activeDays || []);
    const alive = streak && (streak.lastActivityDay === today || streak.lastActivityDay === addDays(today, -1));
    return {
        streak: alive ? streak.current || 0 : 0,
        longestStreak: streak?.longest || 0,
        // The last 28 days, oldest first: the days they learned.
        days: Array.from({ length: 28 }, (_, i) => { const day = addDays(today, i - 27); return { day, active: active.has(day) }; }),
        activeDaysThisMonth: [...active].filter((d) => d >= addDays(today, -29)).length,
        badges: mine.map((m) => { const b = badges.find((x) => x.key === m.badgeKey); return { title: b?.title || m.badgeKey, emoji: b?.emoji || '🏅', description: b?.description || '', unlockedAt: m.unlockedAt }; })
    };
};

/** Which part of the app an XP row came from, for the day-by-day list. */
const AREAS = [
    [/^linguistic/, 'Multilingo'], [/^(course|lesson|quiz_pass|certificate)/, 'Courses'], [/^career/, 'Career Path'],
    [/interview/, 'Interview practice'], [/^(game|group_brain)/, 'Games'], [/^competition/, 'Competitions'],
    [/^streak/, 'Streak'], [/^(daily|global_quiz|quiz)/, 'Quizzes'], [/^(opportunity|job)/, 'Jobs']
];
const areaOf = (source) => (AREAS.find(([re]) => re.test(String(source || ''))) || [null, 'Other'])[1];
/**
 * The last two weeks, day by day: what they did in each part of the app, how many times and the XP — grouped, so
 * twenty correct translations read as one line ("Multilingo · 20 activities · +40 XP"), with a few of their own words.
 * Entry fees and refunds (not learning) are left out.
 */
const timelineOf = async (userId) => {
    const Xp = require('../rewards/models/XpTransaction');
    const { dayKey } = require('../rewards/config/constants');
    const since = new Date(Date.now() - 14 * 864e5);
    const rows = await Xp.find({ userId, amount: { $gt: 0 }, createdAt: { $gte: since }, source: { $nin: ['game_entry', 'game_refund'] } })
        .sort({ createdAt: -1 }).limit(1500).select('amount source description createdAt').lean();
    const days = new Map();
    for (const r of rows) {
        const day = dayKey(new Date(r.createdAt));
        if (!days.has(day)) days.set(day, { day, xp: 0, count: 0, areas: new Map() });
        const d = days.get(day);
        d.xp += r.amount; d.count += 1;
        const area = areaOf(r.source);
        if (!d.areas.has(area)) d.areas.set(area, { area, count: 0, xp: 0, examples: [], last: r.createdAt });
        const g = d.areas.get(area);
        g.count += 1; g.xp += r.amount;
        const text = String(r.description || '').replace(/^for /, '').trim();
        if (text && g.examples.length < 3 && !g.examples.includes(text)) g.examples.push(text);
    }
    return [...days.values()].map((d) => ({ day: d.day, xp: d.xp, count: d.count, areas: [...d.areas.values()].sort((x, y) => y.count - x.count) }));
};

const multilingoOf = async (userId) => {
    const { LinguisticProgress, LinguisticAttempt } = require('../linguistic/models');
    const p = await LinguisticProgress.findOne({ userId }).lean();
    if (!p) return null;
    const { courseInfo } = require('../linguistic/courses');
    const name = (code) => { try { return courseInfo(code || 'en').name; } catch { return code || 'English'; } };
    const done = (p.lessons || []).filter((l) => l.status === 'completed');
    const scores = done.map((l) => l.bestScore).filter((x) => typeof x === 'number');
    const since = new Date(Date.now() - 7 * 864e5);
    const week = await LinguisticAttempt.countDocuments({ userId, createdAt: { $gte: since }, kind: 'quiz' });
    return {
        course: name(p.course),
        lessonsCompleted: done.length,
        averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        quizzesThisWeek: week,
        levelsCompleted: (p.levelsCompleted || []).map((l) => ({ level: l.level, course: name(l.course), average: l.average, at: l.completedAt })),
        certificates: (p.certificates || []).map((c) => ({ level: c.level, course: name(c.course), number: c.number, average: c.average, at: c.issuedAt })),
        lastActive: p.lastActiveAt || null
    };
};

const careerOf = async (userId) => {
    const Goal = require('../career/models/Goal');
    const Roadmap = require('../career/models/Roadmap');
    const Task = require('../career/models/Task');
    const [goal, roadmap, counts, recent] = await Promise.all([
        Goal.findOne({ userId }).lean(),
        Roadmap.findOne({ userId }).lean(),
        Task.aggregate([{ $match: { userId: new mongoose.Types.ObjectId(String(userId)) } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
        Task.find({ userId, status: 'Completed' }).sort({ completedAt: -1 }).limit(5).select('title category completedAt').lean()
    ]);
    if (!goal && !roadmap && !counts.length) return null;
    const phases = roadmap?.roadmapData?.educationRoadmap || [];
    const n = (s) => counts.find((c) => c._id === s)?.n || 0;
    return {
        goal: goal?.careerGoal || '',
        dreamCompany: goal?.dreamCompany || '',
        roadmapPercent: phases.length ? Math.round(((roadmap.completedPhases || []).length / phases.length) * 100) : null,
        tasks: { completed: n('Completed'), pending: n('Pending'), skipped: n('Skipped') },
        recentTasks: recent.map((t) => ({ title: t.title, category: t.category, at: t.completedAt }))
    };
};

const interviewsOf = async (userId) => {
    const { InterviewSession, InterviewPrep } = require('../interview/models');
    const [sessions, prep] = await Promise.all([
        InterviewSession.find({ userId, status: 'completed' }).sort({ completedAt: -1 }).limit(10).select('type role completedAt report.overall report.recommendation').lean(),
        InterviewPrep.findOne({ userId }).select('readiness role').lean()
    ]);
    if (!sessions.length && !prep) return null;
    return {
        readiness: typeof prep?.readiness === 'number' ? Math.round(prep.readiness) : null,
        role: prep?.role || '',
        mocks: sessions.map((s) => ({ type: s.type, role: s.role || '', score: typeof s.report?.overall === 'number' ? Math.round(s.report.overall) : null, at: s.completedAt }))
    };
};

const quizzesOf = async (userId) => {
    const Attempt = require('../models/GlobalQuizAttempt');
    const GlobalQuiz = require('../models/GlobalQuiz');
    const rows = await Attempt.find({ userId, finishedAt: { $ne: null } }).sort({ finishedAt: -1 }).limit(10).select('quizId score correctCount totalQuestions won finishedAt').lean();
    const quizzes = await GlobalQuiz.find({ _id: { $in: rows.map((r) => r.quizId) } }).select('title').lean();
    return rows.map((r) => ({ title: quizzes.find((q) => idOf(q) === idOf(r.quizId))?.title || 'Global Quiz', score: r.score, correct: r.correctCount, total: r.totalQuestions, won: r.won === true, at: r.finishedAt }));
};

/**
 * Competitions and their certificates (2026-11-19, the user: "display the certificate the child has received also"):
 * team competitions, Quiz Arena and Group Brain. A certificate is shown only where the child's own app gives one —
 * the same checks as their download (competitions/services/certificate.js, arena certificateFor) — with its number in
 * the child's series, given now if they never opened it (as their own app does), so the parent can view it through
 * the public certificate check. Results not published yet show no place.
 */
const competitionsOf = async (userId) => {
    const Team = require('../competitions/models/Team');
    const Competition = require('../competitions/models/Competition');
    const cert = require('../competitions/services/certificate');
    const { resultsHidden } = require('../competitions/services/views');
    const rows = [];
    const wanted = [];   // [{ key, added, row }]: certificates to number
    const ORD = { 1: '1st place', 2: '2nd place', 3: '3rd place' };

    const teams = await Team.find({ 'players.userId': userId, status: { $in: ['pending', 'approved'] } }).select('competitionId teamName collegeName status place').lean();
    const comps = teams.length ? await Competition.find({ _id: { $in: teams.map((t) => t.competitionId) } }).select('name title status completedAt resultsPublishedAt certificates participationCertificates game').lean() : [];
    for (const t of teams) {
        const c = comps.find((x) => idOf(x) === idOf(t.competitionId));
        if (!c) continue;
        const done = c.status === 'completed' && !resultsHidden(c);
        const row = { kind: 'Competition', title: c.name || c.title || 'Competition', team: t.teamName || '', status: c.status, place: done ? t.place || null : null, at: c.completedAt || null, certificate: null };
        rows.push(row);
        if (done && t.status === 'approved' && cert.eligible(c, t) && await cert.tookPart(c, userId).catch(() => false)) {
            wanted.push({ key: `competition-${c._id}`, added: c.completedAt, row, title: t.place ? ORD[t.place] || `${t.place}th place` : 'Certificate of Participation' });
        }
    }

    const { ArenaCompetition, ArenaEntry } = require('../competitions/arena/models');
    const entries = await ArenaEntry.find({ userId }).lean();
    if (entries.length) {
        const arenas = await ArenaCompetition.find({ _id: { $in: entries.map((e) => e.competitionId) } }).lean();
        const { certificateFor } = require('../competitions/arena/student');
        for (const e of entries) {
            const c = arenas.find((x) => idOf(x) === idOf(e.competitionId));
            if (!c) continue;
            const published = Boolean(c.resultsPublishedAt);
            const row = { kind: 'Quiz Arena', title: c.title || 'Quiz Arena', team: e.collegeName || '', status: published ? 'completed' : c.status, place: published && e.rank && e.rank <= 3 ? e.rank : null, score: published ? e.score : null, at: c.resultsPublishedAt || null, certificate: null };
            rows.push(row);
            const award = published ? certificateFor(c, e) : null;
            if (award) wanted.push({ key: `competition-arena-${c._id}`, added: c.resultsPublishedAt, row, title: award.place ? ORD[award.place] : 'Certificate of Participation' });
        }
    }

    if (wanted.length) {
        const numbers = await require('../services/certificateNumbers').numbersFor(userId, wanted.map((w) => ({ key: w.key, added: w.added }))).catch(() => ({}));
        for (const w of wanted) if (numbers[w.key]) w.row.certificate = { number: numbers[w.key], title: w.title };
    }

    // Group Brain: its certificates carry their own number (GB-XXXX-XXXX).
    const { GroupBrainCertificate } = require('../competitions/groupbrain/models');
    const gb = await GroupBrainCertificate.find({ userId, status: 'valid' }).sort({ issuedAt: -1, createdAt: -1 }).lean().catch(() => []);
    for (const g of gb) {
        rows.push({ kind: 'Group Brain', title: g.eventName || 'Group Brain', team: '', status: 'completed', place: g.rank && g.rank <= 3 ? g.rank : null, at: g.issuedAt || g.createdAt, certificate: { number: g.certId, title: g.title } });
    }
    return rows.sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0));
};

const jobsOf = async (userId) => {
    const App = require('../jobboard/models/JobApplication');
    const rows = await App.find({ userId }).sort({ requestedAt: -1 }).limit(10).select('job status requestedAt').lean();
    return rows.map((r) => ({ title: r.job?.title || '', company: r.job?.company || '', status: r.status, at: r.requestedAt }));
};

const ranking360Of = async (user, org) => {
    if (!org?.three60?.enabled) return null;
    const { studentActivities } = require('../three60/activities');
    const a = await studentActivities(org, user._id);
    return {
        name: org.three60.name || 'Student Ranking',
        total: a.totals.total, possible: a.totals.possible,
        proofs: (a.proofs || []).map((p) => ({ activity: p.activityName, group: p.groupName, status: p.status, marks: p.marks, note: p.note || p.reviewNote || '', at: p.createdAt }))
    };
};

const extraCurricularOf = async (userId, org) => {
    const { NccNssMember, schemeName, LIVE_STATUSES } = require('../nccnss/models');
    const members = await NccNssMember.find({ userId, status: { $in: LIVE_STATUSES } }).lean();
    if (!members.length) return [];
    const { NccNssClub } = require('../nccnss/models');
    const clubs = await NccNssClub.find({ _id: { $in: members.map((m) => m.clubId).filter(Boolean) } }).select('name').lean();
    const { summarise } = require('../nccnss/progress');
    const sums = await part('nccnss progress', () => summarise(members, org?._id || members[0].organizationId)) || [];
    return members.map((m, i) => ({ scheme: schemeName({ ...m, clubId: clubs.find((c) => idOf(c) === idOf(m.clubId)) }), unit: m.unit || '', role: m.role || '', status: m.status, hours: sums[i]?.hours ?? null, requiredHours: sums[i]?.requiredHours ?? null, events: sums[i]?.eventsAttended ?? null }));
};

/**
 * Their institution (Campus): the class timetable, attendance — the last class attended and every absence of the last
 * 30 days, newest first (2026-11-19, the user: "time table, attendance, last attended, absent notification, result,
 * fees") — published marks and results subject by subject, and fees item by item with the receipts.
 */
const campusOf = async (user) => {
    const { access } = require('../campus/student');
    const C = require('../campus/core');
    const a = await access(user._id, { 'campus.attendance': 1, 'campus.marks': 1, 'campus.payments': 1, 'campus.applications': 1 });
    if (!a.available || !a.admitted) return null;
    const { campus, dept } = a;
    const c = a.user.campus;
    const same = (x, y) => idOf(x) === idOf(y);
    const att = C.attendanceSummary(c.attendance || []);
    const subjects = campus.subjects.filter((s) => same(s.departmentId, dept._id));
    const subjectName = (id) => campus.subjects.find((s) => same(s._id, id))?.name || 'Class';
    const exams = campus.exams.filter((e) => same(e.departmentId, dept._id) && e.published);
    const internals = exams.filter((e) => e.kind === 'internal').map((e) => ({
        name: e.name, maxMarks: e.maxMarks, passMarks: e.passMarks,
        subjects: C.examSubjects(campus, e).map((s) => ({ name: s.name, marks: (c.marks || []).find((x) => same(x.e, e._id) && same(x.s, s._id))?.m ?? null }))
    }));
    const results = exams.filter((e) => e.kind === 'semester').map((e) => ({ name: e.name, semester: e.semester, ...C.resultOf(campus, e, c.marks) }))
        .filter((r) => r.subjects.some((s) => s.marks !== undefined))
        .map((r) => ({ name: r.name, semester: r.semester, sgpa: r.sgpa ?? null, result: r.result || '', total: r.total, max: r.max,
            subjects: r.subjects.filter((s) => s.marks !== undefined).map((s) => ({ name: s.name, marks: s.marks, max: s.max, grade: s.grade || '', passed: s.passed })) }));
    const fees = C.feesOf(campus, a.user);
    // Attendance, class by class: the newest first.
    const rows = (c.attendance || []).filter((r) => r.d).slice().sort((x, y) => `${y.d}${String(y.p || 0).padStart(2, '0')}`.localeCompare(`${x.d}${String(x.p || 0).padStart(2, '0')}`));
    const today = C.today();
    const since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const last = rows.find((r) => r.ok);
    const absences = rows.filter((r) => !r.ok && !r.x && !r.r && r.d >= since).slice(0, 30).map((r) => ({ date: r.d, period: r.p || null, subject: subjectName(r.s) }));
    const tt = C.timetableOf(campus, dept._id, c.semester, c.section);
    return {
        institution: a.org.name,
        department: dept.name, semester: c.semester, section: c.section || '', rollNo: c.rollNo || '',
        attendance: {
            percent: att.percent, held: att.held, present: att.present,
            bySubject: subjects.map((s) => { const b = (att.bySubject || {})[idOf(s._id)]; return b ? { name: s.name, percent: b.percent ?? null, held: b.held, present: b.present } : null; }).filter(Boolean),
            lastPresent: last ? { date: last.d, period: last.p || null, subject: subjectName(last.s) } : null,
            absentToday: absences.filter((x) => x.date === today).length,
            absences
        },
        timetable: tt ? {
            days: C.DAYS.slice(1),
            periods: tt.periods.map((p) => ({ n: p.n, start: p.start || '', end: p.end || '', label: p.label || '' })),
            slots: tt.slots.map((x) => ({ day: x.day, p: x.p, subject: x.name, code: x.code, room: x.room, kind: x.kind || '' }))
        } : null,
        internals, results,
        fees: {
            total: fees.total, paid: fees.paid, balance: fees.balance,
            items: fees.items.map((i) => ({ title: i.title, amount: i.amount, paid: i.paid, balance: i.balance, dueDate: i.dueDate || '', status: i.status })),
            payments: fees.payments.slice(0, 20).map((p) => ({ title: p.title || '', amount: p.amount, receipt: p.receipt || '', at: p.at }))
        }
    };
};

/**
 * Every certificate the child has, each with its number: the parent opens it through the public certificate check
 * (GET /api/certificates/verify/:number/pdf), which draws it exactly as the child downloads it (2026-11-19, the user:
 * "parents can watch certificates of child"). Ones the child uploaded open their own file (a picture or a PDF).
 */
const certificatesOf = async (userId) => {
    const Certificate = require('../models/Certificate');
    const Course = require('../models/Course');
    const Achievement = require('../models/Achievement');
    const { LinguisticProgress } = require('../linguistic/models');
    const [course, lingo, uploads] = await Promise.all([
        Certificate.find({ userId }).select('courseId certificateNumber issuedAt').sort({ issuedAt: -1 }).lean(),
        LinguisticProgress.findOne({ userId }).select('certificates').lean(),
        Achievement.find({ userId }).select('title issuer kind issuedOn fileUrl fileType certificateNumber createdAt').sort({ createdAt: -1 }).lean()
    ]);
    const titles = await Course.find({ _id: { $in: course.map((c) => c.courseId) } }).select('title').lean().catch(() => []);
    const { courseInfo } = require('../linguistic/courses');
    const lang = (code) => { try { return courseInfo(code || 'en').name; } catch { return 'English'; } };
    const out = [
        ...course.filter((c) => c.certificateNumber).map((c) => ({ kind: 'Course', title: titles.find((t) => idOf(t) === idOf(c.courseId))?.title || 'Course', number: c.certificateNumber, at: c.issuedAt })),
        ...(lingo?.certificates || []).filter((c) => c.number).map((c) => ({ kind: 'Multilingo', title: `${lang(c.course)} · ${String(c.level || '').replace(/^\w/, (x) => x.toUpperCase())}`, number: c.number, at: c.issuedAt })),
        ...uploads.map((u) => ({ kind: u.kind === 'award' ? 'Award' : 'Uploaded', title: u.title, issuer: u.issuer || '', number: u.certificateNumber || '', fileUrl: /^https:\/\//.test(u.fileUrl || '') ? u.fileUrl : '', at: u.issuedOn || u.createdAt }))
    ];
    return out.sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0));
};

/** The whole page for one child. */
const childActivity = async (user) => {
    const userId = user._id;
    const org = await part('organization', () => orgOf(user));
    const [summary, courses, rewards, timeline, multilingo, career, interviews, quizzes, competitions, jobs, ranking360, extra, campus, certificates] = await Promise.all([
        childSummary(user),
        part('courses', () => coursesOf(user)),
        part('rewards', () => rewardsOf(userId)),
        part('timeline', () => timelineOf(userId)),
        part('multilingo', () => multilingoOf(userId)),
        part('career', () => careerOf(userId)),
        part('interviews', () => interviewsOf(userId)),
        part('quizzes', () => quizzesOf(userId)),
        part('competitions', () => competitionsOf(userId)),
        part('jobs', () => jobsOf(userId)),
        part('360', () => ranking360Of(user, org)),
        part('extra-curricular', () => extraCurricularOf(userId, org)),
        part('campus', () => campusOf(user)),
        part('certificates', () => certificatesOf(userId))
    ]);
    // Competition certificates in the list of all certificates too (2026-11-19).
    const allCertificates = [...(certificates || []), ...(competitions || []).filter((r) => r.certificate).map((r) => ({ kind: r.kind, title: `${r.certificate.title} · ${r.title}`, number: r.certificate.number, at: r.at }))]
        .sort((x, y) => new Date(y.at || 0) - new Date(x.at || 0));
    return { child: { ...summary, organization: org?.name || summary.organization }, courses, rewards, timeline: timeline || [], multilingo, career, interviews, quizzes: quizzes || [], competitions: competitions || [], jobs: jobs || [], ranking360, extraCurricular: extra || [], campus, certificates: allCertificates };
};

module.exports = { childSummary, childActivity };
