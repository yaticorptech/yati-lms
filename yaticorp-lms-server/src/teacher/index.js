/**
 * The teacher dashboard's API — /api/teacher
 *
 *   auth/*              register a card, sign in, card scan, forgotten password
 *   me                  the teacher's own details, photo and password
 *   overview            the dashboard's summary of everything below
 *   projects            Research Path: projects, stages, tasks
 *   publications        Publications Map
 *   theses              Thesis Writing: chapters, PDF (the chapter guides are in the app)
 *   writing             Independent Writing: pieces, daily goal, the last 14 days
 *   plagiarism          the similarity check, its reports, and the teacher's uploaded sources
 *   organization        joining a college or school (organization.js)
 *   clubs               the organization's clubs this teacher is in charge of: their events (../nccnss/teacher.js)
 *   scout-units         the Scouts & Guides units this teacher leads: requests, events, attendance (../nccnss/leader.js)
 *
 * Every route past auth/ reads req.teacher only: a teacher can never reach
 * another's records (the plagiarism check compares against other documents,
 * but never shows whose they are or what they say beyond the overlap).
 */
const express = require('express');
const mongoose = require('mongoose');
const { authLimiter, cardLookupLimiter, loginLimiter, loginCardLimiter } = require('../middleware/rateLimiter');
const { dayKey, addDays } = require('../rewards/config/constants');
const auth = require('./auth');
const { Teacher, ResearchProject, Publication, Thesis, WritingPiece, WritingLog, PlagiarismReport, TextVersion, PlagiarismSource, PUBLICATION_TYPES, PUBLICATION_STATUSES, INDEXING, CHAPTER_STATUSES, WRITING_KINDS } = require('./models');
const { newStages, fitToTopic, pathKey, progressOf, STAGES, KINDS } = require('./researchPath');
const { compare, citationCheck, wordCount, SHINGLE } = require('./similarity');
const { renderThesisPdf } = require('./thesisPdf');
const { renderThesisDocx } = require('./thesisDocx');
const { references, referencesDocx, publicationsXlsx } = require('./apa');
const { unzip } = require('./zip');
require('../organizations/models/Organization');

const router = express.Router();
const { protectTeacher } = auth;

/* ── Helpers ───────────────────────────────────────────────────────────── */

const validId = (id) => mongoose.isValidObjectId(id);
const text = (v, max) => String(v ?? '').trim().slice(0, max);
const optionalDate = (v) => {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
};
const bad = (res, message, field) => res.status(400).json({ message, ...(field ? { field } : {}) });
const notFound = (res, what = 'That') => res.status(404).json({ message: `${what} was not found.` });
const fail = (res, where, error) => {
    console.error(`[teacher] ${where}:`, error.message);
    return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
};

/** Words added today, from any save of a chapter or a writing piece. Never throws. */
const logWords = async (teacherId, added) => {
    if (!(added > 0)) return;
    const day = dayKey();
    try {
        await WritingLog.updateOne({ teacherId, day }, { $inc: { words: added } }, { upsert: true });
    } catch (error) {
        // Two saves creating today's row at once: the second just adds.
        if (error?.code === 11000) await WritingLog.updateOne({ teacherId, day }, { $inc: { words: added } }).catch(() => {});
        else console.error('[teacher] could not log words:', error.message);
    }
};

/* ── Version history ───────────────────────────────────────────────────── */

const VERSION_GAP_MS = 10 * 60 * 1000;
const KEEP_VERSIONS = 60;

/** Keep `content` as a version of a document; the oldest beyond 60 go. */
const keepVersion = async (key, { title, content, reason = 'auto', label = '' }) => {
    await TextVersion.create({ ...key, title, content, words: wordCount(content), reason, label });
    const old = await TextVersion.find(key).sort({ createdAt: -1 }).skip(KEEP_VERSIONS).select('_id').lean();
    if (old.length) await TextVersion.deleteMany({ _id: { $in: old.map((o) => o._id) } });
};

/**
 * Before a save replaces the text: keep the text as it was, if the newest
 * version is ten minutes old (or there is none). So a long session leaves a
 * version every ten minutes, and each new day starts with one. Never throws.
 */
const versionBeforeSave = async (key, title, before, after) => {
    try {
        if (!String(before || '').trim() || before === after) return;
        const last = await TextVersion.findOne(key).sort({ createdAt: -1 }).select('createdAt content').lean();
        if (last && (Date.now() - new Date(last.createdAt).getTime() < VERSION_GAP_MS || last.content === before)) return;
        await keepVersion(key, { title, content: before });
    } catch (error) {
        console.error('[teacher] could not keep a version:', error.message);
    }
};

/** Today's words, the daily goal and the last 14 days. */
const writingStats = async (teacher) => {
    const today = dayKey();
    const from = addDays(today, -59);
    const rows = await WritingLog.find({ teacherId: teacher._id, day: { $gte: from } }).lean();
    const byDay = new Map(rows.map((r) => [r.day, r.words]));
    const last14 = Array.from({ length: 14 }, (_, i) => { const day = addDays(today, i - 13); return { day, words: byDay.get(day) || 0 }; });
    return { today: byDay.get(today) || 0, goal: teacher.dailyWordGoal || 500, last14, total60: rows.reduce((n, r) => n + r.words, 0) };
};

/* ── Auth (no token) ───────────────────────────────────────────────────── */

router.post('/auth/register', authLimiter, auth.register);
router.post('/auth/login', loginLimiter, loginCardLimiter, auth.login);
router.post('/auth/card-scan', cardLookupLimiter, auth.cardScan);
router.post('/auth/forgot-password/preview', cardLookupLimiter, auth.forgotPasswordPreview);
router.post('/auth/forgot-password', authLimiter, auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, auth.resetPassword);

router.use(protectTeacher);

/* ── Account ───────────────────────────────────────────────────────────── */

router.get('/me', auth.me);
router.put('/me', auth.updateMe);
router.put('/me/password', auth.changePassword);
// A file over 5 MB, or not an image, gets a message the teacher can act on.
router.post('/me/picture', (req, res, next) => require('../middleware/uploadMiddleware').upload.single('profilePicture')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'That photo is too large. Choose one under 5 MB.' });
    return res.status(400).json({ message: err.message || 'That file could not be read as a photo.' });
}), auth.uploadPicture);

/* ── Overview ──────────────────────────────────────────────────────────── */

router.get('/overview', async (req, res) => {
    try {
        const t = req.teacher;
        const [project, pubs, thesis, stats, lastReport] = await Promise.all([
            ResearchProject.findOne({ teacherId: t._id }).sort({ updatedAt: -1 }).then(fitted),
            Publication.find({ teacherId: t._id }).select('status type year').lean(),
            Thesis.findOne({ teacherId: t._id }).sort({ updatedAt: -1 }).lean(),
            writingStats(t),
            PlagiarismReport.findOne({ teacherId: t._id }).sort({ createdAt: -1 }).select('title score createdAt').lean()
        ]);
        const byStatus = Object.fromEntries(PUBLICATION_STATUSES.map((s) => [s, 0]));
        pubs.forEach((p) => { byStatus[p.status] = (byStatus[p.status] || 0) + 1; });
        const thesisWords = thesis ? thesis.chapters.reduce((n, c) => n + wordCount(c.content), 0) : 0;
        const org = t.organizationId ? await mongoose.model('Organization').findById(t.organizationId).select('name orgCode').lean() : null;
        res.json({
            teacher: auth.view(t),
            organization: org ? { name: org.name, orgCode: org.orgCode } : null,
            research: project ? { _id: project._id, title: project.title, ...progressOf(project) } : null,
            publications: { total: pubs.length, published: byStatus.published, inReview: byStatus.submitted + byStatus.under_review + byStatus.revision, byStatus },
            thesis: thesis ? {
                _id: thesis._id, title: thesis.title, words: thesisWords, targetWords: thesis.targetWords || 0, dueDate: thesis.dueDate || null,
                chapters: thesis.chapters.length, chaptersDone: thesis.chapters.filter((c) => c.status === 'done').length
            } : null,
            writing: stats,
            plagiarism: lastReport ? { _id: lastReport._id, title: lastReport.title, score: lastReport.score, at: lastReport.createdAt } : null
        });
    } catch (error) { fail(res, 'overview', error); }
});

/* ── Research Methodologies ────────────────────────────────────────────── */

// Nothing here: the guides and the advisor run in the app, and there is no
// "studied" mark to keep (removed 2026-10-26). No outside service anywhere on
// the teacher side (the user's rule, 2026-10-22).

/* ── Organization ──────────────────────────────────────────────────────── */

router.use('/organization', require('./organization'));

/* ── Clubs in my charge (src/nccnss/teacher.js) ───────────────────────── */

router.use('/clubs', require('../nccnss/teacher'));

/* ── Scouts & Guides units I lead (src/nccnss/leader.js) ──────────────── */

router.use('/scout-units', require('../nccnss/leader'));

/* ── Research Path ─────────────────────────────────────────────────────── */

const ownProject = (req) => (validId(req.params.id) ? ResearchProject.findOne({ _id: req.params.id, teacherId: req.teacher._id }) : null);
const projectOut = (p) => ({ ...p.toObject(), progress: progressOf(p) });
/** A project made before the path was worded for its topic is brought up to date as it is read. */
const fitted = async (p) => {
    if (p && fitToTopic(p)) await p.save({ timestamps: false });
    return p;
};
const GOALS = ['phd', 'masters', 'postdoc', 'funded', 'independent'];

router.get('/projects', async (req, res) => {
    try {
        const list = await Promise.all((await ResearchProject.find({ teacherId: req.teacher._id }).sort({ updatedAt: -1 })).map(fitted));
        res.json({
            projects: list.map(projectOut),
            template: STAGES.map(({ key, title, description }) => ({ key, title, description })),
            kinds: Object.entries(KINDS).map(([key, k]) => ({ key, label: k.label, description: k.description }))
        });
    } catch (error) { fail(res, 'projects', error); }
});

router.post('/projects', async (req, res) => {
    try {
        const title = text(req.body?.title, 300);
        if (title.length < 3) return bad(res, 'Give the project a title.', 'title');
        if ((await ResearchProject.countDocuments({ teacherId: req.teacher._id })) >= 20) return bad(res, 'You can keep up to 20 research projects.');
        const field = text(req.body?.field, 200);
        const kind = KINDS[req.body?.kind] ? req.body.kind : 'general';
        const p = await ResearchProject.create({
            teacherId: req.teacher._id, title, field,
            goal: GOALS.includes(req.body?.goal) ? req.body.goal : 'phd',
            startDate: optionalDate(req.body?.startDate) || new Date(),
            targetDate: optionalDate(req.body?.targetDate) || undefined,
            kind,
            stages: newStages(kind, { title, field }),
            pathFor: pathKey({ title, field })
        });
        res.status(201).json(projectOut(p));
    } catch (error) { fail(res, 'new project', error); }
});

router.get('/projects/:id', async (req, res) => {
    try {
        const p = await fitted(await ownProject(req));
        return p ? res.json(projectOut(p)) : notFound(res, 'That project');
    } catch (error) { fail(res, 'project', error); }
});

router.put('/projects/:id', async (req, res) => {
    try {
        const p = await ownProject(req);
        if (!p) return notFound(res, 'That project');
        if (req.body?.title !== undefined) {
            const title = text(req.body.title, 300);
            if (title.length < 3) return bad(res, 'Give the project a title.', 'title');
            p.title = title;
        }
        if (req.body?.field !== undefined) p.field = text(req.body.field, 200);
        if (GOALS.includes(req.body?.goal)) p.goal = req.body.goal;
        for (const k of ['startDate', 'targetDate']) { const d = optionalDate(req.body?.[k]); if (d !== undefined) p[k] = d; }
        fitToTopic(p);
        await p.save();
        res.json(projectOut(p));
    } catch (error) { fail(res, 'update project', error); }
});

router.delete('/projects/:id', async (req, res) => {
    try {
        const p = await ownProject(req);
        if (!p) return notFound(res, 'That project');
        await p.deleteOne();
        res.json({ ok: true });
    } catch (error) { fail(res, 'delete project', error); }
});

const stageOf = (p, key) => p.stages.find((s) => s.key === key);

router.put('/projects/:id/stages/:stage', async (req, res) => {
    try {
        const p = await ownProject(req);
        const s = p && stageOf(p, req.params.stage);
        if (!s) return notFound(res, 'That stage');
        const d = optionalDate(req.body?.targetDate);
        if (d !== undefined) s.targetDate = d;
        if (req.body?.notes !== undefined) s.notes = text(req.body.notes, 5000);
        await p.save();
        res.json(projectOut(p));
    } catch (error) { fail(res, 'update stage', error); }
});

router.post('/projects/:id/stages/:stage/tasks', async (req, res) => {
    try {
        const p = await ownProject(req);
        const s = p && stageOf(p, req.params.stage);
        if (!s) return notFound(res, 'That stage');
        const t = text(req.body?.text, 300);
        if (t.length < 2) return bad(res, 'Write the task first.', 'text');
        if (s.tasks.length >= 40) return bad(res, 'A stage can hold up to 40 tasks.');
        s.tasks.push({ text: t, custom: true });
        await p.save();
        res.status(201).json(projectOut(p));
    } catch (error) { fail(res, 'add task', error); }
});

router.put('/projects/:id/stages/:stage/tasks/:task', async (req, res) => {
    try {
        const p = await ownProject(req);
        const s = p && stageOf(p, req.params.stage);
        const t = s && validId(req.params.task) && s.tasks.id(req.params.task);
        if (!t) return notFound(res, 'That task');
        if (typeof req.body?.done === 'boolean') { t.done = req.body.done; t.doneAt = req.body.done ? new Date() : undefined; }
        if (req.body?.text !== undefined) {
            const v = text(req.body.text, 300);
            if (v.length < 2) return bad(res, 'A task needs some words.', 'text');
            t.text = v;
        }
        await p.save();
        res.json(projectOut(p));
    } catch (error) { fail(res, 'update task', error); }
});

router.delete('/projects/:id/stages/:stage/tasks/:task', async (req, res) => {
    try {
        const p = await ownProject(req);
        const s = p && stageOf(p, req.params.stage);
        const t = s && validId(req.params.task) && s.tasks.id(req.params.task);
        if (!t) return notFound(res, 'That task');
        t.deleteOne();
        await p.save();
        res.json(projectOut(p));
    } catch (error) { fail(res, 'delete task', error); }
});

/* ── Publications Map ──────────────────────────────────────────────────── */

const publicationFields = (body, partial) => {
    const out = {};
    const errors = {};
    if (!partial || body.title !== undefined) {
        const title = text(body.title, 500);
        if (title.length < 3) errors.title = 'Give the publication a title.'; else out.title = title;
    }
    if (body.type !== undefined) { if (PUBLICATION_TYPES.includes(body.type)) out.type = body.type; else errors.type = 'Choose a type from the list.'; }
    if (body.status !== undefined) { if (PUBLICATION_STATUSES.includes(body.status)) out.status = body.status; else errors.status = 'Choose a status from the list.'; }
    for (const [k, max] of [['venue', 300], ['authors', 1000], ['url', 1000], ['notes', 5000], ['volume', 40], ['issue', 40], ['pages', 40], ['publisher', 200]]) if (body[k] !== undefined) out[k] = text(body[k], max);
    // "https://doi.org/10.1000/xyz" or "doi:10.1000/xyz" kept as "10.1000/xyz".
    if (body.doi !== undefined) out.doi = text(body.doi, 300).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').slice(0, 200);
    if (body.year !== undefined) {
        if (body.year === '' || body.year === null) out.year = undefined;
        else { const y = Number(body.year); if (!Number.isInteger(y) || y < 1900 || y > 2200) errors.year = 'Enter a four-digit year.'; else out.year = y; }
    }
    if (body.indexing !== undefined) out.indexing = (Array.isArray(body.indexing) ? body.indexing : []).filter((i) => INDEXING.includes(i));
    if (body.quartile !== undefined) out.quartile = ['Q1', 'Q2', 'Q3', 'Q4'].includes(body.quartile) ? body.quartile : '';
    for (const k of ['impactFactor', 'citations']) {
        if (body[k] === undefined) continue;
        if (body[k] === '' || body[k] === null) { out[k] = k === 'citations' ? 0 : undefined; continue; }
        const n = Number(body[k]);
        if (!Number.isFinite(n) || n < 0 || n > (k === 'citations' ? 1e6 : 1000)) errors[k] = 'Enter a number of 0 or more.'; else out[k] = k === 'citations' ? Math.round(n) : n;
    }
    for (const k of ['deadline', 'submittedOn', 'decisionOn', 'publishedOn']) { const d = optionalDate(body[k]); if (d !== undefined) out[k] = d; }
    return { out, errors };
};

const publicationStats = (list) => {
    const byStatus = Object.fromEntries(PUBLICATION_STATUSES.map((s) => [s, 0]));
    const byType = Object.fromEntries(PUBLICATION_TYPES.map((s) => [s, 0]));
    const byYear = {};
    const byIndexing = {};
    let citations = 0;
    for (const p of list) {
        byStatus[p.status] += 1;
        byType[p.type] += 1;
        if (p.status === 'published' && p.year) byYear[p.year] = (byYear[p.year] || 0) + 1;
        if (p.status === 'published') for (const i of p.indexing || []) byIndexing[i] = (byIndexing[i] || 0) + 1;
        citations += p.citations || 0;
    }
    // h-index from the citation counts entered
    const counts = list.map((p) => p.citations || 0).sort((a, b) => b - a);
    let h = 0;
    while (h < counts.length && counts[h] >= h + 1) h += 1;
    const soon = list
        .filter((p) => p.deadline && !['published', 'rejected', 'accepted'].includes(p.status) && new Date(p.deadline) >= new Date(Date.now() - 86400000))
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5)
        .map((p) => ({ _id: p._id, title: p.title, deadline: p.deadline, status: p.status }));
    return { total: list.length, byStatus, byType, byYear, byIndexing, citations, hIndex: h, upcomingDeadlines: soon };
};

router.get('/publications', async (req, res) => {
    try {
        const list = await Publication.find({ teacherId: req.teacher._id }).sort({ updatedAt: -1 }).lean();
        res.json({ publications: list, stats: publicationStats(list), options: { types: PUBLICATION_TYPES, statuses: PUBLICATION_STATUSES, indexing: INDEXING } });
    } catch (error) { fail(res, 'publications', error); }
});

router.post('/publications', async (req, res) => {
    try {
        const { out, errors } = publicationFields(req.body || {}, false);
        const wrong = Object.keys(errors);
        if (wrong.length) return bad(res, errors[wrong[0]], wrong[0]);
        if ((await Publication.countDocuments({ teacherId: req.teacher._id })) >= 500) return bad(res, 'You can keep up to 500 publications.');
        const p = await Publication.create({ ...out, teacherId: req.teacher._id });
        res.status(201).json(p);
    } catch (error) { fail(res, 'new publication', error); }
});

/** The APA reference list of accepted and published work, to read or copy. */
router.get('/publications/references', async (req, res) => {
    try {
        const list = await Publication.find({ teacherId: req.teacher._id }).lean();
        res.json({ references: references(list), total: list.length });
    } catch (error) { fail(res, 'references', error); }
});

/** Download: ?format=xlsx (every publication) or docx (the APA reference list). */
router.get('/publications/export', async (req, res) => {
    try {
        const format = req.query.format === 'docx' ? 'docx' : 'xlsx';
        const list = await Publication.find({ teacherId: req.teacher._id }).sort({ year: -1, updatedAt: -1 }).lean();
        const stem = `Publications_${req.teacher.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'teacher'}`;
        if (format === 'docx') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="${stem}_APA.docx"`);
            return res.send(referencesDocx(list, req.teacher.name));
        }
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${stem}.xlsx"`);
        res.send(publicationsXlsx(list));
    } catch (error) { if (!res.headersSent) fail(res, 'publications export', error); }
});

router.put('/publications/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'That publication');
        const { out, errors } = publicationFields(req.body || {}, true);
        const wrong = Object.keys(errors);
        if (wrong.length) return bad(res, errors[wrong[0]], wrong[0]);
        const unset = Object.fromEntries(Object.entries(out).filter(([, v]) => v === undefined || v === null).map(([k]) => [k, '']));
        const set = Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined && v !== null));
        const p = await Publication.findOneAndUpdate({ _id: req.params.id, teacherId: req.teacher._id }, { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: 'after', runValidators: true });
        return p ? res.json(p) : notFound(res, 'That publication');
    } catch (error) { fail(res, 'update publication', error); }
});

router.delete('/publications/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'That publication');
        const r = await Publication.deleteOne({ _id: req.params.id, teacherId: req.teacher._id });
        return r.deletedCount ? res.json({ ok: true }) : notFound(res, 'That publication');
    } catch (error) { fail(res, 'delete publication', error); }
});

/* ── Thesis Writing ────────────────────────────────────────────────────── */

const DEFAULT_CHAPTERS = [
    ['Abstract', 300], ['Introduction', 6000], ['Literature Review', 15000], ['Research Methodology', 8000],
    ['Results', 12000], ['Discussion', 10000], ['Conclusion & Future Work', 4000], ['References', 0], ['Appendices', 0]
];

const ownThesis = (req) => (validId(req.params.id) ? Thesis.findOne({ _id: req.params.id, teacherId: req.teacher._id }) : null);

const thesisSummary = (t) => {
    const words = t.chapters.reduce((n, c) => n + wordCount(c.content), 0);
    return { _id: t._id, title: t.title, degree: t.degree, university: t.university, targetWords: t.targetWords, dueDate: t.dueDate, words, chapters: t.chapters.length, chaptersDone: t.chapters.filter((c) => c.status === 'done').length, updatedAt: t.updatedAt };
};
const thesisOut = (t) => {
    const o = t.toObject();
    o.chapters = o.chapters.map((c) => ({ ...c, words: wordCount(c.content) }));
    o.words = o.chapters.reduce((n, c) => n + c.words, 0);
    return o;
};

const thesisMeta = (body, partial) => {
    const out = {};
    if (!partial || body.title !== undefined) {
        const title = text(body.title, 400);
        if (title.length < 3) return { error: ['title', 'Give the thesis a working title.'] };
        out.title = title;
    }
    for (const [k, max] of [['degree', 100], ['university', 200], ['supervisor', 200], ['field', 200]]) if (body[k] !== undefined) out[k] = text(body[k], max);
    if (body.targetWords !== undefined) {
        const n = Math.round(Number(body.targetWords));
        if (!Number.isFinite(n) || n < 0 || n > 1000000) return { error: ['targetWords', 'Enter a word target between 0 and 1,000,000.'] };
        out.targetWords = n;
    }
    const d = optionalDate(body.dueDate);
    if (d !== undefined) out.dueDate = d;
    return { out };
};

router.get('/theses', async (req, res) => {
    try {
        const list = await Thesis.find({ teacherId: req.teacher._id }).sort({ updatedAt: -1 });
        res.json({ theses: list.map(thesisSummary) });
    } catch (error) { fail(res, 'theses', error); }
});

router.post('/theses', async (req, res) => {
    try {
        const { out, error } = thesisMeta(req.body || {}, false);
        if (error) return bad(res, error[1], error[0]);
        if ((await Thesis.countDocuments({ teacherId: req.teacher._id })) >= 10) return bad(res, 'You can keep up to 10 theses.');
        const t = await Thesis.create({ ...out, teacherId: req.teacher._id, chapters: DEFAULT_CHAPTERS.map(([title, targetWords]) => ({ title, targetWords })) });
        res.status(201).json(thesisOut(t));
    } catch (error) { fail(res, 'new thesis', error); }
});

router.get('/theses/:id', async (req, res) => {
    try {
        const t = await ownThesis(req);
        return t ? res.json(thesisOut(t)) : notFound(res, 'That thesis');
    } catch (error) { fail(res, 'thesis', error); }
});

router.put('/theses/:id', async (req, res) => {
    try {
        const t = await ownThesis(req);
        if (!t) return notFound(res, 'That thesis');
        const { out, error } = thesisMeta(req.body || {}, true);
        if (error) return bad(res, error[1], error[0]);
        Object.assign(t, out);
        await t.save();
        res.json(thesisOut(t));
    } catch (error) { fail(res, 'update thesis', error); }
});

router.delete('/theses/:id', async (req, res) => {
    try {
        const t = await ownThesis(req);
        if (!t) return notFound(res, 'That thesis');
        await t.deleteOne();
        await TextVersion.deleteMany({ teacherId: req.teacher._id, kind: 'chapter', docId: t._id });
        res.json({ ok: true });
    } catch (error) { fail(res, 'delete thesis', error); }
});

router.post('/theses/:id/chapters', async (req, res) => {
    try {
        const t = await ownThesis(req);
        if (!t) return notFound(res, 'That thesis');
        const title = text(req.body?.title, 200);
        if (title.length < 2) return bad(res, 'Give the chapter a title.', 'title');
        if (t.chapters.length >= 40) return bad(res, 'A thesis can hold up to 40 chapters.');
        t.chapters.push({ title });
        await t.save();
        res.status(201).json(thesisOut(t));
    } catch (error) { fail(res, 'add chapter', error); }
});

router.put('/theses/:id/chapters/:chapter', async (req, res) => {
    try {
        const t = await ownThesis(req);
        const c = t && validId(req.params.chapter) && t.chapters.id(req.params.chapter);
        if (!c) return notFound(res, 'That chapter');
        const body = req.body || {};
        let added = 0;
        if (body.title !== undefined) {
            const title = text(body.title, 200);
            if (title.length < 2) return bad(res, 'Give the chapter a title.', 'title');
            c.title = title;
        }
        if (body.content !== undefined) {
            const content = String(body.content ?? '');
            if (content.length > 400000) return bad(res, 'This chapter is too long to save in one piece. Split it into two chapters.', 'content');
            added = wordCount(content) - wordCount(c.content);
            await versionBeforeSave({ teacherId: req.teacher._id, kind: 'chapter', docId: t._id, chapterId: c._id }, c.title, c.content, content);
            c.content = content;
            // Writing in an empty chapter starts it.
            if (c.status === 'not_started' && content.trim()) c.status = 'drafting';
        }
        if (body.status !== undefined) { if (!CHAPTER_STATUSES.includes(body.status)) return bad(res, 'Choose a status from the list.', 'status'); c.status = body.status; }
        if (body.targetWords !== undefined) {
            const n = Math.round(Number(body.targetWords));
            if (!Number.isFinite(n) || n < 0 || n > 200000) return bad(res, 'Enter a word target between 0 and 200,000.', 'targetWords');
            c.targetWords = n;
        }
        if (body.notes !== undefined) c.notes = text(body.notes, 5000);
        c.updatedAt = new Date();
        await t.save();
        await logWords(req.teacher._id, added);
        res.json({ chapter: { ...c.toObject(), words: wordCount(c.content) }, words: t.chapters.reduce((n, x) => n + wordCount(x.content), 0), savedAt: c.updatedAt });
    } catch (error) { fail(res, 'save chapter', error); }
});

router.put('/theses/:id/chapters/:chapter/move', async (req, res) => {
    try {
        const t = await ownThesis(req);
        const i = t && validId(req.params.chapter) ? t.chapters.findIndex((c) => String(c._id) === req.params.chapter) : -1;
        if (i < 0) return notFound(res, 'That chapter');
        const j = req.body?.direction === 'up' ? i - 1 : i + 1;
        if (j < 0 || j >= t.chapters.length) return res.json(thesisOut(t));
        const list = t.chapters.map((c) => c.toObject());
        [list[i], list[j]] = [list[j], list[i]];
        t.chapters = list;
        await t.save();
        res.json(thesisOut(t));
    } catch (error) { fail(res, 'move chapter', error); }
});

router.delete('/theses/:id/chapters/:chapter', async (req, res) => {
    try {
        const t = await ownThesis(req);
        const c = t && validId(req.params.chapter) && t.chapters.id(req.params.chapter);
        if (!c) return notFound(res, 'That chapter');
        c.deleteOne();
        await t.save();
        await TextVersion.deleteMany({ teacherId: req.teacher._id, kind: 'chapter', docId: t._id, chapterId: c._id });
        res.json(thesisOut(t));
    } catch (error) { fail(res, 'delete chapter', error); }
});

router.get('/theses/:id/pdf', async (req, res) => {
    try {
        const t = await ownThesis(req);
        if (!t) return notFound(res, 'That thesis');
        const name = `${t.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'Thesis'}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        renderThesisPdf(t, req.teacher.name, res);
    } catch (error) { if (!res.headersSent) fail(res, 'thesis pdf', error); }
});

router.get('/theses/:id/docx', async (req, res) => {
    try {
        const t = await ownThesis(req);
        if (!t) return notFound(res, 'That thesis');
        const name = `${t.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'Thesis'}.docx`;
        const file = renderThesisDocx(t, req.teacher.name);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        res.send(file);
    } catch (error) { if (!res.headersSent) fail(res, 'thesis docx', error); }
});

/**
 * Version history routes for one kind of document. `load(req)` resolves to
 * { key, title, content, restore(content) → body to answer with } or null.
 */
const versionRoutes = (base, load) => {
    const versionId = (req) => (validId(req.params.version) ? req.params.version : null);
    router.get(base, async (req, res) => {
        try {
            const doc = await load(req);
            if (!doc) return notFound(res, 'That document');
            const list = await TextVersion.find(doc.key).select('createdAt words reason label').sort({ createdAt: -1 }).lean();
            res.json({ versions: list, currentWords: wordCount(doc.content) });
        } catch (error) { fail(res, 'versions', error); }
    });
    router.post(base, async (req, res) => {
        try {
            const doc = await load(req);
            if (!doc) return notFound(res, 'That document');
            if (!String(doc.content || '').trim()) return bad(res, 'There is nothing written to keep yet.');
            await keepVersion(doc.key, { title: doc.title, content: doc.content, reason: 'manual', label: text(req.body?.label, 120) });
            res.status(201).json({ ok: true });
        } catch (error) { fail(res, 'save version', error); }
    });
    router.get(`${base}/:version`, async (req, res) => {
        try {
            const doc = await load(req);
            const v = doc && versionId(req) && await TextVersion.findOne({ ...doc.key, _id: req.params.version }).lean();
            return v ? res.json(v) : notFound(res, 'That version');
        } catch (error) { fail(res, 'version', error); }
    });
    router.post(`${base}/:version/restore`, async (req, res) => {
        try {
            const doc = await load(req);
            const v = doc && versionId(req) && await TextVersion.findOne({ ...doc.key, _id: req.params.version }).lean();
            if (!v) return notFound(res, 'That version');
            // The text being replaced is kept first, so a restore can be undone.
            if (String(doc.content || '').trim() && doc.content !== v.content) {
                const when = new Date(v.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
                await keepVersion(doc.key, { title: doc.title, content: doc.content, reason: 'restore', label: `Before restoring the version of ${when}` });
            }
            res.json(await doc.restore(v.content));
        } catch (error) { fail(res, 'restore version', error); }
    });
};

versionRoutes('/theses/:id/chapters/:chapter/versions', async (req) => {
    const t = await ownThesis(req);
    const c = t && validId(req.params.chapter) && t.chapters.id(req.params.chapter);
    if (!c) return null;
    return {
        key: { teacherId: req.teacher._id, kind: 'chapter', docId: t._id, chapterId: c._id },
        title: c.title,
        content: c.content,
        restore: async (content) => {
            c.content = content;
            c.updatedAt = new Date();
            await t.save();
            return { chapter: { ...c.toObject(), words: wordCount(c.content) }, words: t.chapters.reduce((n, x) => n + wordCount(x.content), 0), savedAt: c.updatedAt };
        }
    };
});

/* ── Independent Writing ───────────────────────────────────────────────── */

const ownPiece = (req) => (validId(req.params.id) ? WritingPiece.findOne({ _id: req.params.id, teacherId: req.teacher._id }) : null);
const pieceSummary = (p) => ({ _id: p._id, title: p.title, kind: p.kind, wordGoal: p.wordGoal, words: wordCount(p.content), excerpt: String(p.content || '').slice(0, 160), updatedAt: p.updatedAt, createdAt: p.createdAt });

router.get('/writing', async (req, res) => {
    try {
        const list = await WritingPiece.find({ teacherId: req.teacher._id }).sort({ updatedAt: -1 });
        res.json({ pieces: list.map(pieceSummary), stats: await writingStats(req.teacher), kinds: WRITING_KINDS });
    } catch (error) { fail(res, 'writing', error); }
});

router.get('/writing/stats', async (req, res) => {
    try { res.json(await writingStats(req.teacher)); } catch (error) { fail(res, 'writing stats', error); }
});

router.post('/writing', async (req, res) => {
    try {
        const title = text(req.body?.title, 300) || 'Untitled';
        if ((await WritingPiece.countDocuments({ teacherId: req.teacher._id })) >= 500) return bad(res, 'You can keep up to 500 pieces.');
        const p = await WritingPiece.create({ teacherId: req.teacher._id, title, kind: WRITING_KINDS.includes(req.body?.kind) ? req.body.kind : 'article', content: '' });
        res.status(201).json({ ...p.toObject(), words: 0 });
    } catch (error) { fail(res, 'new piece', error); }
});

router.get('/writing/:id', async (req, res) => {
    try {
        const p = await ownPiece(req);
        return p ? res.json({ ...p.toObject(), words: wordCount(p.content) }) : notFound(res, 'That piece');
    } catch (error) { fail(res, 'piece', error); }
});

router.put('/writing/:id', async (req, res) => {
    try {
        const p = await ownPiece(req);
        if (!p) return notFound(res, 'That piece');
        const body = req.body || {};
        let added = 0;
        if (body.title !== undefined) p.title = text(body.title, 300) || 'Untitled';
        if (body.kind !== undefined) { if (!WRITING_KINDS.includes(body.kind)) return bad(res, 'Choose a kind from the list.', 'kind'); p.kind = body.kind; }
        if (body.wordGoal !== undefined) {
            const n = Math.round(Number(body.wordGoal));
            if (!Number.isFinite(n) || n < 0 || n > 200000) return bad(res, 'Enter a word goal between 0 and 200,000.', 'wordGoal');
            p.wordGoal = n;
        }
        if (body.content !== undefined) {
            const content = String(body.content ?? '');
            if (content.length > 400000) return bad(res, 'This piece is too long to save in one go. Split it into two.', 'content');
            added = wordCount(content) - wordCount(p.content);
            await versionBeforeSave({ teacherId: req.teacher._id, kind: 'writing', docId: p._id, chapterId: null }, p.title, p.content, content);
            p.content = content;
        }
        await p.save();
        await logWords(req.teacher._id, added);
        res.json({ ...p.toObject(), words: wordCount(p.content), savedAt: p.updatedAt });
    } catch (error) { fail(res, 'save piece', error); }
});

router.delete('/writing/:id', async (req, res) => {
    try {
        const p = await ownPiece(req);
        if (!p) return notFound(res, 'That piece');
        await p.deleteOne();
        await TextVersion.deleteMany({ teacherId: req.teacher._id, kind: 'writing', docId: p._id });
        res.json({ ok: true });
    } catch (error) { fail(res, 'delete piece', error); }
});

versionRoutes('/writing/:id/versions', async (req) => {
    const p = await ownPiece(req);
    if (!p) return null;
    return {
        key: { teacherId: req.teacher._id, kind: 'writing', docId: p._id, chapterId: null },
        title: p.title,
        content: p.content,
        restore: async (content) => {
            p.content = content;
            await p.save();
            return { ...p.toObject(), words: wordCount(p.content), savedAt: p.updatedAt };
        }
    };
});

/* ── Plagiarism ────────────────────────────────────────────────────────── */

const MIN_WORDS = 30;
const MAX_WORDS = 25000;
const MAX_SOURCES = 2000;

/** Every other document on the platform worth comparing with, labelled for the report. */
const corpusFor = async (teacherId, exclude) => {
    const [uploaded, theses, pieces] = await Promise.all([
        PlagiarismSource.find({ teacherId }).select('title text').lean(),
        Thesis.find({}).select('teacherId title chapters._id chapters.title chapters.content').sort({ updatedAt: -1 }).limit(400).lean(),
        WritingPiece.find({}).select('teacherId title content').sort({ updatedAt: -1 }).limit(1500).lean()
    ]);
    const mine = (id) => String(id) === String(teacherId);
    // The papers the teacher uploaded come first, so the cap never drops them.
    // They are other people's words: a match with one is copying, not reuse.
    const sources = uploaded.filter((u) => wordCount(u.text) >= SHINGLE).map((u) => ({ own: false, label: `Your uploaded source “${u.title}”`, text: u.text }));
    for (const t of theses) {
        for (const c of t.chapters || []) {
            if (exclude.chapterId && String(c._id) === String(exclude.chapterId)) continue;
            if (wordCount(c.content) < SHINGLE) continue;
            sources.push({ own: mine(t.teacherId), label: mine(t.teacherId) ? `Your thesis “${t.title}”: ${c.title}` : 'Another document on YATICORP', text: c.content });
        }
    }
    for (const p of pieces) {
        if (exclude.pieceId && String(p._id) === String(exclude.pieceId)) continue;
        if (wordCount(p.content) < SHINGLE) continue;
        sources.push({ own: mine(p.teacherId), label: mine(p.teacherId) ? `Your writing “${p.title}”` : 'Another document on YATICORP', text: p.content });
    }
    return sources.slice(0, MAX_SOURCES);
};

router.post('/plagiarism/check', async (req, res) => {
    try {
        const body = req.body || {};
        let content = typeof body.text === 'string' ? body.text : '';
        let title = text(body.title, 300) || 'Pasted text';
        const source = { kind: 'paste' };
        const exclude = {};
        if (body.source?.kind === 'thesis') {
            const t = validId(body.source.id) && await Thesis.findOne({ _id: body.source.id, teacherId: req.teacher._id });
            const c = t && validId(body.source.chapterId) && t.chapters.id(body.source.chapterId);
            if (!c) return notFound(res, 'That chapter');
            content = c.content; title = `${t.title}: ${c.title}`;
            Object.assign(source, { kind: 'thesis', id: t._id, chapterId: c._id });
            exclude.chapterId = c._id;
        } else if (body.source?.kind === 'writing') {
            const p = validId(body.source.id) && await WritingPiece.findOne({ _id: body.source.id, teacherId: req.teacher._id });
            if (!p) return notFound(res, 'That piece');
            content = p.content; title = p.title;
            Object.assign(source, { kind: 'writing', id: p._id });
            exclude.pieceId = p._id;
        }
        const words = wordCount(content);
        if (words < MIN_WORDS) return bad(res, `Add at least ${MIN_WORDS} words to check.`, 'text');
        if (words > MAX_WORDS) return bad(res, `Check up to ${MAX_WORDS.toLocaleString('en-IN')} words at a time. Split a long chapter into parts.`, 'text');

        const sources = await corpusFor(req.teacher._id, exclude);
        const result = compare(content, sources);
        const cites = citationCheck(content);
        const report = await PlagiarismReport.create({
            teacherId: req.teacher._id, title, text: content, source,
            words: result.words, score: result.score, ownScore: result.ownScore,
            documentsCompared: sources.length,
            matches: result.matches, sources: result.sources.slice(0, 20),
            citations: { found: cites.found }, flags: cites.flags.slice(0, 50)
        });
        res.status(201).json(report);
    } catch (error) { fail(res, 'plagiarism check', error); }
});

/* The teacher's own sources: papers read for the research, compared with every check. */

const MAX_UPLOADS = 50;
const SOURCE_MAX_CHARS = 600000;

/** The text of a Word file: paragraphs from word/document.xml, tags removed. */
const docxText = (buffer) => {
    const xml = unzip(buffer)['word/document.xml'];
    if (!xml) throw new Error('No document in this file');
    return xml.toString('utf8')
        .replace(/<w:tab\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n').trim();
};

router.get('/plagiarism/sources', async (req, res) => {
    try {
        const list = await PlagiarismSource.find({ teacherId: req.teacher._id }).select('title fileName words createdAt').sort({ createdAt: -1 }).lean();
        res.json({ sources: list, max: MAX_UPLOADS });
    } catch (error) { fail(res, 'plagiarism sources', error); }
});

/**
 * Add a source: { title, fileName, text } — the app reads PDFs and text files
 * itself — or { title, fileName, docx: <base64> }, read here.
 */
router.post('/plagiarism/sources', async (req, res) => {
    try {
        const body = req.body || {};
        let content = typeof body.text === 'string' ? body.text : '';
        if (typeof body.docx === 'string' && body.docx) {
            try { content = docxText(Buffer.from(body.docx, 'base64')); } catch { return bad(res, 'That Word file could not be read. Save it as .docx (or PDF) and try again.', 'file'); }
        }
        content = content.replace(/\u0000/g, '').trim();
        const title = text(body.title, 300) || text(body.fileName, 300).replace(/\.[a-z0-9]+$/i, '') || 'Untitled source';
        const words = wordCount(content);
        if (words < MIN_WORDS) return bad(res, 'No readable text was found in that file. A scanned PDF (a picture of pages) has no text to compare. Use a PDF with selectable text.', 'file');
        if (content.length > SOURCE_MAX_CHARS) return bad(res, 'That file is too long. Upload a single paper or chapter (up to about 80,000 words).', 'file');
        if ((await PlagiarismSource.countDocuments({ teacherId: req.teacher._id })) >= MAX_UPLOADS) return bad(res, `You can keep up to ${MAX_UPLOADS} sources. Delete one you no longer need first.`);
        const s = await PlagiarismSource.create({ teacherId: req.teacher._id, title, fileName: text(body.fileName, 300), text: content, words });
        res.status(201).json({ _id: s._id, title: s.title, fileName: s.fileName, words: s.words, createdAt: s.createdAt });
    } catch (error) { fail(res, 'add plagiarism source', error); }
});

router.delete('/plagiarism/sources/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'That source');
        const r = await PlagiarismSource.deleteOne({ _id: req.params.id, teacherId: req.teacher._id });
        return r.deletedCount ? res.json({ ok: true }) : notFound(res, 'That source');
    } catch (error) { fail(res, 'delete plagiarism source', error); }
});

router.get('/plagiarism/reports', async (req, res) => {
    try {
        const list = await PlagiarismReport.find({ teacherId: req.teacher._id }).select('-text -matches -flags').sort({ createdAt: -1 }).limit(100).lean();
        res.json({ reports: list });
    } catch (error) { fail(res, 'plagiarism reports', error); }
});

router.get('/plagiarism/reports/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'That report');
        const r = await PlagiarismReport.findOne({ _id: req.params.id, teacherId: req.teacher._id }).lean();
        return r ? res.json(r) : notFound(res, 'That report');
    } catch (error) { fail(res, 'plagiarism report', error); }
});

router.delete('/plagiarism/reports/:id', async (req, res) => {
    try {
        if (!validId(req.params.id)) return notFound(res, 'That report');
        const r = await PlagiarismReport.deleteOne({ _id: req.params.id, teacherId: req.teacher._id });
        return r.deletedCount ? res.json({ ok: true }) : notFound(res, 'That report');
    } catch (error) { fail(res, 'delete plagiarism report', error); }
});

module.exports = router;
