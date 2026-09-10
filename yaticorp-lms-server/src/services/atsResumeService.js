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
const { expandSkillPhrase } = require('../jobboard/services/matchService');

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
    // Every skill the student is actually working on, not only the ones past
    // an arbitrary bar. A roadmap skill at 25% is a skill they are learning,
    // and a job search that ignores it ignores what the LMS is teaching them.
    // Only a skill nobody has started yet is left out.
    //
    // The names are written the way a syllabus writes them — "HTML5 / CSS3 /
    // Tailwind CSS" — so each one is opened out into the individual skills a
    // job listing is matched on.
    (skillRows || [])
        .filter((s) => (s.progress ?? 0) > 0 || ['Intermediate', 'Advanced', 'Expert'].includes(s.level))
        .forEach((s) => expandSkillPhrase(s.skillName).forEach((one) => add(one, 'career')));
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

/**
 * The page is a classic single-column serif resume: a monogram and a centred
 * name, then sections whose heading carries a rule out to the right margin.
 * Entries that have detail put the who-and-when in a narrow left column and
 * the bullets beside it, which is how a recruiter's eye reads a resume.
 *
 * It stays ATS-safe: every word is real selectable text in a standard font,
 * drawn top-to-bottom in reading order. Nothing is an image, nothing is in a
 * table, and no heading is invented — the only drawn shapes are the monogram
 * circle, the heading rules and the progress bars, none of which a parser
 * has to understand to read the resume.
 */

const SERIF = 'Times-Roman';
const SERIF_B = 'Times-Bold';
const SERIF_I = 'Times-Italic';

const INK = '#111111';        // body text
const MUTED = '#3d3d3d';      // dates, sub-labels
const RULE = '#8f8f8f';       // the line beside a heading
const BAR_BG = '#d6d6d6';
const BAR_FG = '#333333';

const PAGE = { top: 44, bottom: 52, left: 56, right: 56 };
const LEFT_RATIO = 0.34;      // width of an entry's who-and-when column
const COL_GAP = 16;

/** The two letters in the circle: first name and last name, or the first two. */
const monogram = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'YL';
    const first = parts[0][0] || '';
    const second = parts.length > 1 ? parts[parts.length - 1][0] : (parts[0][1] || '');
    return (first + second).toUpperCase();
};

const renderAtsPdf = (data, res) => {
    const doc = new PDFDocument({ size: 'A4', margins: PAGE });
    const fileName = `ATS_Resume_${String(data.name).replace(/[^A-Za-z0-9]+/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    const L = doc.page.margins.left;
    const W = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftW = Math.round(W * LEFT_RATIO);
    const rightW = W - leftW - COL_GAP;
    const rightX = L + leftW + COL_GAP;
    const floor = () => doc.page.height - doc.page.margins.bottom;

    /** Start a new page when `height` will not fit under the current cursor. */
    const room = (height) => { if (doc.y + height > floor()) doc.addPage(); };

    const set = (o = {}) => doc.font(o.font || SERIF).fontSize(o.size || 10.5).fillColor(o.color || INK);

    /** How tall this text will be, without drawing it. */
    const measure = (text, o = {}) => {
        set(o);
        return doc.heightOfString(String(text), { width: o.width || W, lineGap: o.lineGap ?? 2 });
    };

    /** One block of text on its own line(s), advancing the cursor. */
    const write = (text, o = {}) => {
        set(o);
        doc.text(String(text), o.x ?? L, doc.y, {
            width: o.width ?? W, lineGap: o.lineGap ?? 2,
            align: o.align || 'left', characterSpacing: o.spacing || 0
        });
    };

    const BULLET_INDENT = 11;
    /** A bulleted line that hangs its wrapped text under the first word. */
    const bullet = (text, x = L, w = W) => {
        const y = doc.y;
        set();
        doc.text('•', x, y, { width: BULLET_INDENT, lineGap: 2 });
        doc.y = y;
        doc.text(String(text), x + BULLET_INDENT, y, { width: w - BULLET_INDENT, lineGap: 2 });
        doc.y += 1.5;
    };
    const bulletHeight = (text, w = W) => measure(text, { width: w - BULLET_INDENT }) + 1.5;

    /** A section title with a hairline running from it to the right margin. */
    const heading = (label) => {
        doc.moveDown(1.1);
        set({ font: SERIF_B, size: 13.5 });
        room(doc.currentLineHeight() + 14);
        const y = doc.y;
        doc.text(label, L, y, { width: W });
        const mid = y + doc.currentLineHeight() / 2;
        doc.moveTo(L + doc.widthOfString(label) + 14, mid).lineTo(L + W, mid)
            .lineWidth(0.7).strokeColor(RULE).stroke();
        doc.y = y + doc.currentLineHeight() + 8;
        doc.fillColor(INK);
    };

    /** A thin completion bar, the way the template shows a level. */
    const progressBar = (x, w, percent) => {
        const y = doc.y + 1.5;
        const h = 3.5;
        doc.rect(x, y, w, h).fill(BAR_BG);
        const filled = (w * Math.max(0, Math.min(100, percent))) / 100;
        if (filled > 0) doc.rect(x, y, Math.max(1.5, filled), h).fill(BAR_FG);
        doc.fillColor(INK);
        doc.y = y + h + 4;
    };

    /**
     * One resume entry. `lines` are the who-and-when, `bullets` the detail
     * beside them. With no bullets the lines simply run the full width.
     */
    const entry = ({ lines = [], bullets = [], percent = null }) => {
        const wide = !bullets.length;
        const lw = wide ? W : leftW;
        const leftH = lines.reduce((h, l) => h + measure(l.text, { ...l, width: lw }), 0) + (percent === null ? 0 : 9);
        const rightH = bullets.reduce((h, b) => h + bulletHeight(b, rightW), 0);

        room(Math.min(Math.max(leftH, rightH), floor() - doc.page.margins.top));
        const startY = doc.y;

        lines.forEach((l) => write(l.text, { ...l, width: lw }));
        if (percent !== null) progressBar(L, Math.round(lw * 0.72), percent);
        const leftEnd = doc.y;

        if (bullets.length) {
            doc.y = startY;
            bullets.forEach((b) => bullet(b, rightX, rightW));
        }
        doc.y = Math.max(leftEnd, doc.y) + 9;
    };

    /* ── Header ──────────────────────────────────────────────────────── */

    const RADIUS = 25;
    const cy = doc.y + RADIUS;
    doc.circle(L + W / 2, cy, RADIUS).lineWidth(0.9).strokeColor('#5a5a5a').stroke();
    set({ font: SERIF_B, size: 16 });
    doc.text(monogram(data.name), L, cy - doc.currentLineHeight() / 2 + 1, { width: W, align: 'center', characterSpacing: 1.2 });
    doc.y = cy + RADIUS + 12;

    write(String(data.name).toUpperCase(), { font: SERIF_B, size: 27, align: 'center', spacing: 1.4, lineGap: 0 });
    if (data.headline) write(data.headline, { font: SERIF_I, size: 11.5, color: MUTED, align: 'center' });
    doc.moveDown(0.35);

    const contact = [data.email, data.phone].filter(Boolean);
    if (contact.length) write(contact.join('   |   '), { size: 10.5, color: MUTED, align: 'center' });
    doc.moveDown(0.5);

    /* ── Sections ────────────────────────────────────────────────────── */

    if (data.summary) {
        heading('Summary');
        write(data.summary);
    }

    if (data.skills.length) {
        heading('Skills');
        // Two bulleted columns, filled down the left one first, a row at a
        // time so a long list breaks across pages without losing alignment.
        const names = data.skills.map((s) => s.name);
        const rows = Math.ceil(names.length / 2);
        const colW = (W - 24) / 2;
        for (let r = 0; r < rows; r++) {
            room(16);
            const y = doc.y;
            bullet(names[r], L + 12, colW - 12);
            const leftEnd = doc.y;
            if (names[r + rows]) {
                doc.y = y;
                bullet(names[r + rows], L + colW + 24 + 12, colW - 12);
            }
            doc.y = Math.max(leftEnd, doc.y);
        }
    }

    if (data.experience.length) {
        heading('Experience');
        data.experience.forEach((e) => entry({
            lines: [
                { text: e.title, font: SERIF_B },
                ...(e.detail ? [{ text: e.detail, font: SERIF_I, color: MUTED }] : [])
            ]
        }));
    }

    if (data.education.length) {
        heading('Education and Training');
        data.education.forEach((e) => entry({
            lines: [
                { text: e.title, font: SERIF_B },
                ...(e.detail ? [{ text: e.detail, font: SERIF_I, color: MUTED }] : [])
            ]
        }));
    }

    if (data.courses.length) {
        heading('Courses and Training');
        data.courses.forEach((c) => {
            const bullets = [];
            if (c.skills.length) bullets.push(`Skills applied: ${c.skills.join(', ')}.`);
            if (c.topics.length) bullets.push(`Topics covered: ${c.topics.join('; ')}.`);
            if (c.certificate?.certificateNumber) bullets.push(`Certificate ${c.certificate.certificateNumber}, issued ${fmtDay(c.certificate.issuedAt)}.`);
            entry({
                lines: [
                    { text: 'YATI LMS', color: MUTED },
                    { text: c.title, font: SERIF_B },
                    {
                        text: c.completed
                            ? 'Completed'
                            : `${c.percentage}% complete · ${c.lessonsDone} lesson${c.lessonsDone === 1 ? '' : 's'} done`,
                        font: SERIF_I, color: MUTED
                    }
                ],
                bullets,
                // The bar is there to show how far along an unfinished course
                // is; on a completed one it would only repeat the word.
                percent: c.completed ? null : c.percentage
            });
        });
    }

    if (data.certifications.length) {
        heading('Certifications');
        data.certifications.forEach((c) => {
            room(16);
            bullet([c.title, c.issuer, c.date ? fmtDay(c.date) : '', c.number ? `No. ${c.number}` : '']
                .filter(Boolean).join(' — '));
        });
    }

    doc.moveDown(1.1);
    write(`Generated from YATI LMS on ${fmtDay(data.generatedAt)}.`, { size: 8, color: '#777777' });
    doc.end();
};

module.exports = { buildResumeData, renderAtsPdf, monogram };
