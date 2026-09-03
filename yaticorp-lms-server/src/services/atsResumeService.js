/**
 * @description The student's ATS resume, assembled from what the LMS knows
 *              and rendered as a single-column PDF.
 *
 * "ATS" means the file is built for the parsers recruiters run resumes
 * through: one column, real text (no images, tables or icons), standard
 * section headings, plain Helvetica. Everything decorative is left out on
 * purpose.
 *
 * Skills come from four places and are merged: the resume the student
 * uploaded (parsed), Career Path skills they have progressed, and — the
 * point of building it here — the courses they have taken on the LMS,
 * including the ones only half done. A course at 40% still taught the
 * lessons that are ticked, so those lessons' topics count, while the
 * course's headline skills only count once it is at least half complete.
 */
const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const Achievement = require('../models/Achievement');
const ResumeProfile = require('../jobboard/models/ResumeProfile');
const CareerGoal = require('../career/models/Goal');
const SkillProgress = require('../career/models/SkillProgress');
const { ALL_SKILLS } = require('../jobboard/data/roles');

const COURSE_SKILL_THRESHOLD = 50;   // % complete before a course's headline skills count

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const matches = (haystack, skill) => {
    const needle = String(skill).toLowerCase();
    if (needle.length < 3) return false;
    if (/^[a-z0-9]+(?: [a-z0-9]+)*$/.test(needle)) return new RegExp(`\\b${escapeRx(needle)}\\b`, 'i').test(haystack);
    return haystack.includes(needle);
};
const skillsIn = (text) => {
    const hay = String(text || '').toLowerCase();
    return hay ? ALL_SKILLS.filter((s) => matches(hay, s)) : [];
};
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const safe = (p) => p.catch(() => null);

/** Everything the resume will say, as data. Also what the UI previews. */
const buildResumeData = async (userId) => {
    const [user, resume, progressRows, certs, achievements, goal, skillRows] = await Promise.all([
        User.findById(userId).select('name email phone').lean(),
        safe(ResumeProfile.findOne({ userId }).lean()),
        Progress.find({ userId }).lean(),
        Certificate.find({ userId }).lean(),
        safe(Achievement.find({ userId }).sort({ issuedOn: -1, createdAt: -1 }).lean()),
        safe(CareerGoal.findOne({ userId }).lean()),
        safe(SkillProgress.find({ userId, progress: { $gt: 0 } }).lean())
    ]);

    // ── Courses, with what each one has taught so far ──
    const courseIds = [...new Set(progressRows.map((p) => String(p.courseId)))];
    const [courseDocs, moduleDocs] = courseIds.length
        ? await Promise.all([
            Course.find({ _id: { $in: courseIds } }).select('title description').lean(),
            Module.find({ courseId: { $in: courseIds } }).select('courseId title').lean()
        ])
        : [[], []];
    const lessonDocs = moduleDocs.length
        ? await Lesson.find({ moduleId: { $in: moduleDocs.map((m) => m._id) } }).select('moduleId title type').lean()
        : [];
    const moduleById = new Map(moduleDocs.map((m) => [String(m._id), m]));
    const certByCourse = new Map(certs.map((c) => [String(c.courseId), c]));

    const courses = progressRows
        .map((p) => {
            const course = courseDocs.find((c) => String(c._id) === String(p.courseId));
            if (!course) return null;
            const done = new Set((p.completedLessons || []).map(String));
            const completedLessons = lessonDocs.filter((l) => {
                const mod = moduleById.get(String(l.moduleId));
                return mod && String(mod.courseId) === String(p.courseId) && done.has(String(l._id));
            });
            const percentage = Math.min(100, Math.round(p.percentage || 0));
            const lessonSkills = completedLessons.flatMap((l) => skillsIn(`${l.title} ${moduleById.get(String(l.moduleId))?.title || ''}`));
            const headlineSkills = percentage >= COURSE_SKILL_THRESHOLD ? skillsIn(`${course.title} ${course.description}`) : [];
            return {
                id: String(course._id),
                title: course.title,
                percentage,
                completed: percentage >= 100,
                certificate: certByCourse.get(String(p.courseId)) || null,
                topics: completedLessons.filter((l) => l.type !== 'quiz').map((l) => l.title).slice(0, 8),
                lessonsDone: completedLessons.length,
                skills: [...new Set([...lessonSkills, ...headlineSkills])],
                updatedAt: p.updatedAt
            };
        })
        .filter(Boolean)
        .filter((c) => c.percentage > 0 || c.completed)
        .sort((a, b) => b.percentage - a.percentage);

    // ── Skills, merged, each remembering where it came from ──
    const skillMap = new Map();
    const add = (name, source) => {
        const clean = String(name || '').trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (!skillMap.has(key)) skillMap.set(key, { name: clean, sources: new Set() });
        skillMap.get(key).sources.add(source);
    };
    (resume?.skills || []).forEach((s) => add(s, 'resume'));
    (skillRows || [])
        .filter((s) => (s.progress ?? 0) >= 40 || (['Intermediate', 'Advanced', 'Expert'].includes(s.level) && s.progress > 0))
        .forEach((s) => add(s.skillName, 'career'));
    courses.forEach((c) => c.skills.forEach((s) => add(s, 'course')));
    const skills = [...skillMap.values()].map((s) => ({ name: s.name, sources: [...s.sources] }));

    // ── Education ──
    const education = [];
    if (goal?.educationLevel) {
        const line = [goal.degree, goal.specialization].filter(Boolean).join(' in ')
            || goal.currentClass || goal.educationLevel;
        const detail = [
            goal.degree || goal.currentClass ? goal.educationLevel : null,
            goal.stream, goal.board,
            goal.currentYear ? `${goal.currentYear}` : null,
            goal.semester ? `Semester ${goal.semester}` : null
        ].filter(Boolean).join(' · ');
        education.push({ title: line, detail, source: 'career' });
    }
    if (resume?.education?.degree || resume?.education?.level) {
        const line = [resume.education.degree, resume.education.specialization].filter(Boolean).join(' in ') || resume.education.level;
        if (!education.some((e) => e.title.toLowerCase() === line.toLowerCase())) {
            education.push({ title: line, detail: resume.education.degree ? resume.education.level : '', source: 'resume' });
        }
    }

    // ── Experience ──
    const experience = [];
    if (goal?.currentJob) experience.push({ title: goal.currentJob, detail: goal.experience ? `${goal.experience} years` : '' });
    (resume?.pastRoles || []).forEach((r) => { if (!experience.some((e) => e.title === r)) experience.push({ title: r, detail: '' }); });

    // ── Certifications ──
    const certifications = [
        ...courses.filter((c) => c.certificate).map((c) => ({
            title: c.title, issuer: 'YATI LMS', date: c.certificate.issuedAt, number: c.certificate.certificateNumber || ''
        })),
        ...(achievements || []).map((a) => ({ title: a.title, issuer: a.issuer || '', date: a.issuedOn || a.createdAt, number: '' }))
    ];

    const completedCount = courses.filter((c) => c.completed).length;
    const target = goal?.careerGoal ? `Aspiring ${goal.careerGoal}` : null;
    const level = resume?.seniority && resume.seniority !== 'Fresher' ? resume.seniority : null;
    const summaryBits = [
        resume?.headline || [level, target].filter(Boolean).join(' · ') || target || 'Student',
        courses.length
            ? `${courses.length} course${courses.length === 1 ? '' : 's'} on YATI LMS${completedCount ? ` (${completedCount} completed)` : ' in progress'}`
            : null,
        skills.length ? `Skills include ${skills.slice(0, 6).map((s) => s.name).join(', ')}` : null
    ].filter(Boolean);

    return {
        name: user?.name || 'Student',
        email: user?.email || '',
        phone: user?.phone || '',
        headline: resume?.headline || target || '',
        summary: summaryBits.join('. ') + '.',
        skills,
        education,
        experience,
        courses,
        certifications,
        stats: {
            skills: skills.length,
            fromCourses: skills.filter((s) => s.sources.includes('course')).length,
            courses: courses.length,
            completed: completedCount,
            certifications: certifications.length
        },
        generatedAt: new Date()
    };
};

/* ── PDF ───────────────────────────────────────────────────────────────── */

const renderAtsPdf = (data, res) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 48, left: 52, right: 52 } });
    const fileName = `ATS_Resume_${String(data.name).replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const heading = (text) => {
        doc.moveDown(0.9);
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111').text(text.toUpperCase(), doc.page.margins.left, doc.y, { characterSpacing: 0.8 });
        const y = doc.y + 2;
        doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + width, y).lineWidth(0.6).strokeColor('#444444').stroke();
        doc.moveDown(0.5);
        doc.font('Helvetica').fontSize(10).fillColor('#111111');
    };
    const bullet = (text, indent = 0) => {
        doc.font('Helvetica').fontSize(10).fillColor('#111111')
            .text(`•  ${text}`, doc.page.margins.left + indent, doc.y, { width: width - indent, lineGap: 1.5 });
    };
    const line = (text, opts = {}) => doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.size || 10).fillColor(opts.color || '#111111')
        .text(text, doc.page.margins.left, doc.y, { width, lineGap: 1.5 });

    // Header — name and contact, plain text so a parser reads it as text.
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111111').text(data.name, doc.page.margins.left, doc.y, { width });
    if (data.headline) line(data.headline, { size: 11, color: '#333333' });
    line([data.email, data.phone].filter(Boolean).join('  |  '), { size: 10, color: '#333333' });

    heading('Summary');
    line(data.summary);

    if (data.skills.length) {
        heading('Skills');
        line(data.skills.map((s) => s.name).join(' · '));
    }

    if (data.education.length) {
        heading('Education');
        data.education.forEach((e) => {
            line(e.title, { bold: true });
            if (e.detail) line(e.detail, { color: '#333333' });
            doc.moveDown(0.3);
        });
    }

    if (data.experience.length) {
        heading('Experience');
        data.experience.forEach((e) => bullet(e.detail ? `${e.title} — ${e.detail}` : e.title));
    }

    if (data.courses.length) {
        heading('Courses & Training');
        data.courses.forEach((c) => {
            line(`${c.title} — YATI LMS`, { bold: true });
            line(c.completed
                ? `Completed${c.certificate?.certificateNumber ? ` · Certificate ${c.certificate.certificateNumber}` : ''}`
                : `In progress · ${c.percentage}% complete · ${c.lessonsDone} lesson${c.lessonsDone === 1 ? '' : 's'} done`, { color: '#333333' });
            if (c.skills.length) bullet(`Skills: ${c.skills.join(', ')}`, 8);
            if (c.topics.length) bullet(`Topics covered: ${c.topics.join('; ')}`, 8);
            doc.moveDown(0.4);
        });
    }

    if (data.certifications.length) {
        heading('Certifications');
        data.certifications.forEach((c) => bullet([c.title, c.issuer, c.date ? fmtDay(c.date) : '', c.number ? `No. ${c.number}` : ''].filter(Boolean).join(' — ')));
    }

    doc.moveDown(1.2);
    line(`Generated from YATI LMS on ${fmtDay(data.generatedAt)}.`, { size: 8, color: '#777777' });
    doc.end();
};

module.exports = { buildResumeData, renderAtsPdf };
