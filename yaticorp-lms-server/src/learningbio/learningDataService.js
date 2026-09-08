/**
 * Everything the LMS knows about what a student has learned, in one shape
 * the bio generator, the strength score and the page all read.
 *
 * Nothing is invented here. Every number and name comes from a record the
 * student earned: a Progress row, a Certificate, a badge they unlocked, a
 * Career Path task they completed. The one interpretive step — turning
 * evidence into a skill status — is deliberately conservative (see
 * skillStatus): "Advanced" needs assessments or completed courses behind it,
 * not a roadmap that merely says so.
 */
const crypto = require('crypto');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const Achievement = require('../models/Achievement');
const LearningActivity = require('../rewards/models/LearningActivity');
const RewardUserBadge = require('../rewards/models/RewardUserBadge');
const RewardBadge = require('../rewards/models/RewardBadge');
const Streak = require('../rewards/models/Streak');
const CareerGoal = require('../career/models/Goal');
const SkillProgress = require('../career/models/SkillProgress');
const CareerTask = require('../career/models/Task');
const MilestoneBadge = require('../career/models/MilestoneBadge');
const CareerAchievement = require('../career/models/Achievement');
const { buildResumeData } = require('../services/atsResumeService');

const safe = (p, fallback) => p.catch(() => fallback);

/* ── Education level → how the bio should speak ─────────────────────── */

// Every account is created as 'school_student' by default, so that value on
// its own says nothing; only Career Path's education level, or a type an
// administrator changed away from the default, moves a learner out of the
// neutral "college" voice.
const audienceFor = (goal, user) => {
    const level = goal?.educationLevel || '';
    if (/primary|middle|high school|higher secondary/i.test(level)) return 'school';
    if (/working professional/i.test(level) || ['adult', 'professional', 'instructor'].includes(user?.accountType)) return 'professional';
    return 'college';
};

/* ── Skills: evidence → status ─────────────────────────────────────────── */

/**
 * A skill's status is earned, not declared.
 *   Learning    — seen on the roadmap or in a course, little progress yet
 *   Developing  — real progress: lessons done or roadmap past a third
 *   Proficient  — a completed course teaches it, or roadmap ≥ 70% with tasks done
 *   Advanced    — proficient AND assessment evidence: a passed quiz in a
 *                 course that teaches it, or a certificate for such a course
 */
const skillStatus = ({ progress, completedCourse, assessed, certified }) => {
    if ((certified || assessed) && (completedCourse || progress >= 70)) return 'Advanced';
    if (completedCourse || progress >= 70) return 'Proficient';
    if (progress >= 34) return 'Developing';
    return 'Learning';
};
const STATUS_PERCENT = { Learning: 25, Developing: 50, Proficient: 75, Advanced: 90 };

/* ── Projects: build-type Career Path work the student finished ───────── */

const PROJECT_WORDS = /\b(project|build|create|develop|design|implement|prototype|portfolio|app|website|dashboard|game|model|deploy)\b/i;

const collect = async (userId) => {
    const [user, resume, enrollments, progressRows, certs, uploads, activities, ownedBadges, badgeCatalogue, streak, goal, skillRows, tasks, milestones, careerAchievements, published] = await Promise.all([
        User.findById(userId).select('name email phone profilePicture accountType institution className xp level createdAt').lean(),
        safe(buildResumeData(userId), null),
        Enrollment.find({ userId }).lean(),
        Progress.find({ userId }).lean(),
        Certificate.find({ userId }).sort({ issuedAt: -1 }).lean(),
        safe(Achievement.find({ userId }).sort({ issuedOn: -1, createdAt: -1 }).lean(), []),
        safe(LearningActivity.find({ userId, type: { $in: ['quiz_pass', 'quiz_complete', 'course_complete', 'lesson_complete'] } }).select('type courseId meta createdAt').lean(), []),
        safe(RewardUserBadge.find({ userId }).lean(), []),
        safe(RewardBadge.find({ isActive: true }).lean(), []),
        safe(Streak.findOne({ userId }).lean(), null),
        safe(CareerGoal.findOne({ userId }).lean(), null),
        safe(SkillProgress.find({ userId }).lean(), []),
        safe(CareerTask.find({ userId, status: 'Completed' }).select('title description skill completedAt updatedAt').lean(), []),
        safe(MilestoneBadge.find({ userId }).sort({ createdAt: -1 }).lean(), []),
        safe(CareerAchievement.find({ userId }).sort({ unlockedAt: -1 }).lean(), []),
        safe(Course.find({ isPublished: true }).select('title description').lean(), [])
    ]);
    if (!user) return null;

    /* Courses — the ATS builder already joined progress to lessons and skills. */
    const courses = (resume?.courses || []).map((c) => ({
        id: c.id, title: c.title, percentage: c.percentage, completed: c.completed,
        certificate: c.certificate ? { id: String(c.certificate._id), number: c.certificate.certificateNumber || '', issuedAt: c.certificate.issuedAt, pdfUrl: c.certificate.pdfUrl } : null,
        topics: c.topics, skills: c.skills, updatedAt: c.updatedAt
    }));
    // A course enrolled but not yet opened still counts as "currently learning".
    const seen = new Set(courses.map((c) => c.id));
    const idleIds = enrollments.map((e) => String(e.courseId || '')).filter((id) => id && !seen.has(id));
    const idle = idleIds.length ? await Course.find({ _id: { $in: idleIds } }).select('title').lean() : [];
    for (const c of idle) courses.push({ id: String(c._id), title: c.title, percentage: 0, completed: false, certificate: null, topics: [], skills: [], updatedAt: null });

    const completedCourses = courses.filter((c) => c.completed);
    const ongoingCourses = courses.filter((c) => !c.completed);
    const enrolledIds = new Set(courses.map((c) => c.id));
    const recommendedCourses = published.filter((c) => !enrolledIds.has(String(c._id))).slice(0, 4).map((c) => ({ id: String(c._id), title: c.title }));

    /* Assessments — quiz passes and scores from the rewards ledger. */
    const quizPasses = activities.filter((a) => a.type === 'quiz_pass');
    const scores = activities.filter((a) => a.type === 'quiz_complete' && Number.isFinite(Number(a.meta?.score))).map((a) => Number(a.meta.score));
    const assessments = {
        attempted: activities.filter((a) => a.type === 'quiz_complete').length || progressRows.reduce((n, p) => n + (p.attemptedQuizzesForCredit || []).length, 0),
        passed: quizPasses.length || progressRows.reduce((n, p) => n + (p.passedQuizzes || []).length, 0),
        averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        bestScore: scores.length ? Math.max(...scores) : null,
        assessedCourseIds: [...new Set(quizPasses.map((a) => String(a.courseId || '')).filter(Boolean))]
    };
    const assessedCourses = new Set(assessments.assessedCourseIds);
    if (!assessments.assessedCourseIds.length) progressRows.forEach((p) => { if ((p.passedQuizzes || []).length) assessedCourses.add(String(p.courseId)); });

    /* Skills — merged from resume, courses and Career Path, then graded. */
    const roadmap = new Map(skillRows.map((s) => [s.skillName.toLowerCase(), s]));
    const skillFromCourses = new Map();
    for (const c of courses) for (const s of c.skills || []) {
        const k = s.toLowerCase();
        const cur = skillFromCourses.get(k) || { completed: false, assessed: false, certified: false, courses: [] };
        cur.courses.push(c.title);
        if (c.completed) cur.completed = true;
        if (assessedCourses.has(c.id)) cur.assessed = true;
        if (c.certificate) cur.certified = true;
        skillFromCourses.set(k, cur);
    }
    const skills = (resume?.skills || []).map((s) => {
        const k = s.name.toLowerCase();
        const r = roadmap.get(k);
        const ev = skillFromCourses.get(k) || { completed: false, assessed: false, certified: false, courses: [] };
        const progress = Math.max(r?.progress || 0, ev.completed ? 100 : ev.courses.length ? 40 : 0);
        const status = skillStatus({ progress, completedCourse: ev.completed, assessed: ev.assessed, certified: ev.certified });
        return {
            name: s.name, sources: s.sources, status,
            percent: Math.max(STATUS_PERCENT[status] === 25 ? Math.min(progress, 33) : STATUS_PERCENT[status], Math.min(progress, 100)),
            evidence: { completedCourse: ev.completed, assessed: ev.assessed, certified: ev.certified, roadmap: !!r, courses: ev.courses.slice(0, 3) }
        };
    }).sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name));

    /* Certificates — issued by the LMS, plus ones the student uploaded. */
    const certificates = [
        ...certs.map((c) => {
            const course = courses.find((x) => x.id === String(c.courseId));
            return { id: String(c._id), title: course ? `${course.title} — Certificate of Completion` : 'Certificate of Completion', course: course?.title || '', issuer: 'YATI LMS', date: c.issuedAt, number: c.certificateNumber || '', url: c.pdfUrl, source: 'lms' };
        }),
        ...uploads.filter((u) => u.kind === 'certificate').map((u) => ({ id: String(u._id), title: u.title, course: '', issuer: u.issuer || '', date: u.issuedOn || u.createdAt, number: '', url: u.fileUrl, source: 'uploaded' }))
    ];

    /* Projects — completed Career Path tasks that were build work. */
    const projects = tasks
        .filter((t) => PROJECT_WORDS.test(`${t.title} ${t.description || ''}`))
        .map((t) => ({ id: String(t._id), name: t.title, description: (t.description || '').slice(0, 240), skills: t.skill ? [t.skill] : [], completedAt: t.completedAt || t.updatedAt, status: 'Completed', source: 'career-task' }))
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 12);

    /* Achievements — reward badges, Career Path milestones and awards. */
    const catalogue = new Map(badgeCatalogue.map((b) => [b.key, b]));
    const achievements = [
        ...ownedBadges.map((o) => { const b = catalogue.get(o.badgeKey); return b ? { id: o.badgeKey, title: b.title, description: b.description, emoji: b.emoji || '🎖️', earnedAt: o.unlockedAt, source: 'rewards' } : null; }).filter(Boolean),
        ...milestones.map((m) => ({ id: String(m._id), title: `${m.phaseTitle} — milestone`, description: m.careerGoal ? `Roadmap phase towards ${m.careerGoal}` : 'Roadmap phase completed', emoji: '🎯', earnedAt: m.createdAt, source: 'career' })),
        ...careerAchievements.map((a) => ({ id: String(a._id), title: a.title, description: a.description || '', emoji: '⭐', earnedAt: a.unlockedAt, source: 'career' })),
        ...uploads.filter((u) => u.kind === 'award').map((u) => ({ id: String(u._id), title: u.title, description: u.issuer ? `Awarded by ${u.issuer}` : '', emoji: '🏅', earnedAt: u.issuedOn || u.createdAt, source: 'uploaded' }))
    ].sort((a, b) => new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0));

    /* Timeline — dated events, newest first. */
    const timeline = [
        ...completedCourses.map((c) => ({ date: c.updatedAt, kind: 'course', title: `Completed ${c.title}` })),
        ...ongoingCourses.filter((c) => c.percentage > 0).map((c) => ({ date: c.updatedAt, kind: 'started', title: `Started ${c.title}`, detail: `${c.percentage}% so far` })),
        ...certs.map((c) => { const course = courses.find((x) => x.id === String(c.courseId)); return { date: c.issuedAt, kind: 'certificate', title: `Earned ${course?.title || 'course'} certificate` }; }),
        ...projects.map((p) => ({ date: p.completedAt, kind: 'project', title: `Built ${p.name}` })),
        ...achievements.filter((a) => a.source !== 'uploaded').slice(0, 8).map((a) => ({ date: a.earnedAt, kind: 'achievement', title: `${a.emoji} ${a.title}` })),
        ...(goal?.createdAt ? [{ date: goal.createdAt, kind: 'goal', title: `Set the goal: ${goal.careerGoal || 'Career Path started'}` }] : []),
        { date: user.createdAt, kind: 'joined', title: 'Joined YATICORP LMS' }
    ].filter((e) => e.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 40);

    /* Interests — detected from what the student actually chose to do. */
    const interestsAuto = detectInterests({ courses: { completed: completedCourses, ongoing: ongoingCourses }, skills, goal, projects });

    const data = {
        // email and phone are the student's own, for their own popup; the
        // public share shape (index.js publicShape) never copies them.
        user: { id: String(user._id), name: user.name, email: user.email || '', phone: user.phone || '', avatar: user.profilePicture || '', accountType: user.accountType, institution: user.institution || '', className: user.className || '', xp: user.xp || 0, level: user.level || 1, joinedAt: user.createdAt },
        audience: audienceFor(goal, user),
        education: resume?.education || [],
        experience: resume?.experience || [],
        learningGoal: goal?.careerGoal || '',
        headlineHint: resume?.headline || (goal?.careerGoal ? `Aspiring ${goal.careerGoal}` : ''),
        courses: { completed: completedCourses, ongoing: ongoingCourses, recommended: recommendedCourses },
        assessments,
        skills,
        certificates,
        projects,
        achievements,
        streak: { current: streak?.current || 0, longest: streak?.longest || 0 },
        timeline,
        interestsAuto
    };
    data.hash = fingerprint(data);
    return data;
};

/* ── Interests ─────────────────────────────────────────────────────────── */

const INTEREST_RULES = [
    ['💻', 'Web Development', /\b(html|css|javascript|react|node|web|frontend|front-end|backend|full[\s-]?stack|mern|next\.?js|tailwind)\b/i],
    ['🐍', 'Python', /\bpython|django|flask\b/i],
    ['🤖', 'Artificial Intelligence', /\b(ai|machine learning|deep learning|ml|neural|llm|data science|nlp)\b/i],
    ['📊', 'Data & Analytics', /\b(data|analytics|sql|excel|power ?bi|tableau|statistics)\b/i],
    ['🎨', 'UI/UX Design', /\b(ui|ux|design|figma|graphic)\b/i],
    ['📱', 'Mobile Apps', /\b(android|ios|flutter|react native|mobile)\b/i],
    ['☁️', 'Cloud & DevOps', /\b(cloud|aws|azure|gcp|devops|docker|kubernetes|linux)\b/i],
    ['🔐', 'Cybersecurity', /\b(security|cyber|ethical hacking|network)\b/i],
    ['🧮', 'Mathematics', /\b(math|mathematics|algebra|calculus|statistics)\b/i],
    ['🔬', 'Science', /\b(physics|chemistry|biology|science)\b/i],
    ['📣', 'Marketing', /\b(marketing|seo|social media|branding|sales)\b/i],
    ['💼', 'Business & Finance', /\b(business|finance|accounting|management|entrepreneur)\b/i],
    ['🗣️', 'Communication', /\b(communication|english|writing|public speaking|presentation)\b/i]
];

function detectInterests({ courses, skills, goal, projects }) {
    const text = [
        ...[...courses.completed, ...courses.ongoing].map((c) => `${c.title} ${(c.skills || []).join(' ')}`),
        ...skills.map((s) => s.name),
        goal?.careerGoal || '',
        ...projects.map((p) => `${p.name} ${p.description}`)
    ].join(' \n ');
    const hits = [];
    for (const [emoji, label, rx] of INTEREST_RULES) {
        const count = (text.match(new RegExp(rx.source, 'gi')) || []).length;
        if (count) hits.push({ emoji, label, weight: count });
    }
    return hits.sort((a, b) => b.weight - a.weight).slice(0, 6).map(({ emoji, label }) => ({ emoji, label }));
}

/* ── Fingerprint ─────────────────────────────────────────────────────── */

function fingerprint(d) {
    const stable = {
        c: d.courses.completed.map((c) => c.id).sort(),
        o: d.courses.ongoing.map((c) => `${c.id}:${Math.floor(c.percentage / 25)}`).sort(),
        s: d.skills.map((s) => `${s.name}:${s.status}`).sort(),
        a: d.assessments.passed,
        ce: d.certificates.map((c) => c.id).sort(),
        p: d.projects.map((p) => p.id).sort(),
        ac: d.achievements.map((a) => a.id).sort(),
        g: d.learningGoal, au: d.audience, n: d.user.name,
        i: d.interestsAuto.map((i) => i.label),
        style: 'three-para-v4'
    };
    return crypto.createHash('sha1').update(JSON.stringify(stable)).digest('hex');
}

module.exports = { collect, detectInterests, skillStatus, audienceFor };
