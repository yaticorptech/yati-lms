/**
 * Linguistic Ability — the student's routes, /api/linguistic (behind sign-in
 * and the section's switch; index.js).
 *
 *   GET  /                              the dashboard: level, progress, points, streak, achievements, resume
 *   GET  /placement · POST /placement   the placement test, and its result
 *   GET  /path                          the learning path: levels, units (modules) and their lessons, and the one to take next
 *   POST /language                      { language } the student's own language, for meanings and translation
 *   POST /level                         { level } start at a level chosen instead of taking the placement test
 *   POST /goal                          { xp } the daily XP goal: 10, 20, 30 or 50
 *   POST /about                         { reason, know } why they are learning, and how much English they know (0–4)
 *   POST /chest/:unitId                 open a unit's treasure chest on the path: bonus XP, once
 *   POST /knows                         { speak, write, read } the languages the student already speaks, writes and reads
 *   POST /course                        { course, start } the language to learn (English, or another's course, courses.js) and where to start
 *   GET  /modules/:module               a module's lessons by level, with what is open
 *   GET  /lessons/:id                   one lesson, without its answers
 *   POST /lessons/:id/step              { step } where the student is in it, to resume there
 *   POST /lessons/:id/check             { section, id, given } one practice answer → right or not, and why
 *   POST /lessons/:id/quiz/check        { id, given } one quiz answer → right or not, and why (nothing saved)
 *   POST /lessons/:id/quiz              { answers } the quiz → score, feedback, next lesson
 *   POST /lessons/:id/writing/:taskId   { answer } a writing task → feedback, model answer, review
 *   POST /lessons/:id/speaking          { said, seconds, recorded } a speaking task, ticked from what was said
 *   GET  /plan · POST /plan { days }     the learning plan and its roadmap, day by day; making or changing it
 *   GET  /plan/options                  ?course&language&level  the plans to choose from (the start screens)
 *   POST /lessons/:id/talk              { text } a talk on a topic (Advanced) → each sentence corrected, and why
 *   GET  /daily · POST /daily           today's vocabulary challenge
 *   GET  /review · POST /review/:id     mistakes kept for revision, and answering one again
 *   GET  /submissions                   the student's writing sent for review, with the teacher's feedback
 *   GET  /notes · POST /notes           the student's notepad: their notes, and a new one { title, html }
 *   POST /notes/:id · DELETE /notes/:id saving or deleting one
 *   GET  /history                       recent attempts
 *   GET  /certificates                  level certificates earned
 *   GET  /certificates/:level/pdf       one, as a PDF
 *   DELETE /certificates/:level         take one off the profile
 *
 * Every route reads req.user only. Answers are judged here, never sent ahead.
 * Lessons are served and judged in the student's own language (languages.js).
 */
const express = require('express');
const mongoose = require('mongoose');
const { LinguisticLesson, LinguisticAttempt, LinguisticSubmission, LinguisticNote, MODULES, LEVELS } = require('./models');
const svc = require('./service');
const { getConfig } = require('./config');
const { ensureSeeded } = require('./seed');
const { gradeQuestion } = require('./check');
const certificate = require('./certificate');
const { dayKey } = require('../rewards/config/constants');
const { courseOf, courseInfo } = require('./courses');
const speakChecks = require('./speakChecks');
const { sentenceCount, OPEN_WRITING, LEAST_SENTENCES } = require('./writingCheck');

const router = express.Router();
const idOf = (x) => String(x?._id ?? x);
const bad = (res, message, status = 400) => res.status(status).json({ message });

router.use(async (_req, _res, next) => { await ensureSeeded(); next(); });

/** A published lesson the student may open — in their own language — or a reply saying why not. */
const openLesson = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) { bad(res, 'That lesson was not found.', 404); return null; }
    const lesson = await LinguisticLesson.findOne({ _id: req.params.id, status: 'published', deletedAt: null }).lean();
    if (!lesson) { bad(res, 'That lesson was not found.', 404); return null; }
    const progress = await svc.progressOf(req.user._id);
    const lessons = await svc.lessonsFor(progress);
    if (!lessons.some((l) => idOf(l._id) === idOf(lesson._id))) { res.status(404).json({ code: 'NOT_IN_COURSE', message: 'That lesson is not part of your course.' }); return null; }
    if (!svc.access(lessons, progress).lessonOpen.get(idOf(lesson._id))) { res.status(403).json({ code: 'LESSON_LOCKED', message: 'Finish the lesson before this one to open it.' }); return null; }
    return svc.serve(lesson, progress);
};

router.get('/', async (req, res, next) => {
    try { res.json({ student: { firstName: String(req.user.name || '').split(' ')[0] }, ...(await svc.dashboard(req.user)) }); } catch (err) { next(err); }
});

router.get('/placement', async (req, res, next) => {
    try {
        const progress = await svc.progressOf(req.user._id);
        // `language`: the student's, for the test's own words (asked in Kannada for a Kannada speaker).
        res.json({ questions: svc.placementPublic(svc.languageOf(progress)), last: progress.placement, language: svc.languageOf(progress) });
    } catch (err) { next(err); }
});
router.post('/placement', async (req, res, next) => {
    try {
        const answers = req.body?.answers;
        if (!answers || typeof answers !== 'object') return bad(res, 'Answer the questions first.');
        res.json(await svc.submitPlacement(req.user, answers));
    } catch (err) { next(err); }
});

router.get('/path', async (req, res, next) => {
    try { res.json(await svc.pathView(req.user)); } catch (err) { next(err); }
});

router.post('/level', async (req, res, next) => {
    try {
        const out = await svc.chooseLevel(req.user, String(req.body?.level || ''));
        if (!out) return bad(res, 'Choose Beginner, Intermediate or Advanced.');
        if (out.error) return bad(res, out.error, 409);
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/goal', async (req, res, next) => {
    try {
        const out = await svc.setGoal(req.user, req.body?.xp);
        if (!out) return bad(res, 'Choose a daily goal: 10, 20, 30 or 50 XP.');
        res.json(out);
    } catch (err) { next(err); }
});

// The learning plan (2026-10-24): the time the student gives themselves, and the roadmap made from it.
router.get('/plan', async (req, res, next) => {
    try { res.json(await svc.roadmapView(req.user)); } catch (err) { next(err); }
});
router.get('/plan/options', async (req, res, next) => {
    try {
        const q = req.query || {};
        res.json({ options: await svc.planChoices(req.user, { course: String(q.course || ''), language: q.language ? String(q.language) : null, level: String(q.level || '') }) });
    } catch (err) { next(err); }
});
router.post('/plan', async (req, res, next) => {
    try {
        const out = await svc.setPlan(req.user, req.body?.days ?? null);
        if (out.error) return bad(res, out.error);
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/chest/:unitId', async (req, res, next) => {
    try {
        const out = await svc.openChest(req.user, String(req.params.unitId || ''));
        if (out.error) return bad(res, out.error, out.status);
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/course', async (req, res, next) => {
    try {
        const out = await svc.setCourse(req.user, String(req.body?.course || ''), req.body?.start ?? null);
        if (out.error) return bad(res, out.error);
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/about', async (req, res, next) => {
    try {
        const out = await svc.setAbout(req.user, req.body || {});
        if (!out) return bad(res, 'Choose why you are learning and how much English you know.');
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/knows', async (req, res, next) => {
    try {
        const out = await svc.setKnows(req.user, req.body || {});
        if (!out) return bad(res, 'Choose at least one language you speak, one you write and one you read.');
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/language', async (req, res, next) => {
    try {
        const out = await svc.setLanguage(req.user, String(req.body?.language || ''));
        if (!out) return bad(res, 'That language is not available.');
        if (out.error) return bad(res, out.error);
        res.json(out);
    } catch (err) { next(err); }
});

router.get('/modules/:module', async (req, res, next) => {
    try {
        if (!MODULES.includes(req.params.module)) return bad(res, 'That module was not found.', 404);
        res.json(await svc.moduleView(req.user, req.params.module));
    } catch (err) { next(err); }
});

router.get('/lessons/:id', async (req, res, next) => {
    try {
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        const [progress, config] = await Promise.all([svc.progressOf(req.user._id), getConfig()]);
        const entry = svc.touchLesson(progress, lesson);
        await progress.save();
        res.json(svc.publicLesson(lesson, entry, config));
    } catch (err) { next(err); }
});

router.post('/lessons/:id/step', async (req, res, next) => {
    try {
        const step = String(req.body?.step || '');
        if (!['learn', 'practice', 'quiz'].includes(step)) return bad(res, 'Unknown step.');
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        const progress = await svc.progressOf(req.user._id);
        const e = svc.touchLesson(progress, lesson, { step, force: step === 'quiz' });
        await progress.save();
        res.json({ step: e.step });
    } catch (err) { next(err); }
});

router.post('/lessons/:id/check', async (req, res, next) => {
    try {
        const section = String(req.body?.section || '');
        if (!['practice', 'items', 'spell'].includes(section)) return bad(res, 'Unknown practice section.');
        const given = String(req.body?.given ?? '').slice(0, 1500);
        if (!given.trim()) return bad(res, 'Type or choose an answer first.');
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        const out = await svc.checkPractice(req.user, lesson, section, String(req.body?.id || ''), given);
        if (!out) return bad(res, 'That question is not in this lesson.');
        res.json(svc.withAnswerSay(lesson, out));
    } catch (err) { next(err); }
});

router.post('/lessons/:id/quiz/check', async (req, res, next) => {
    try {
        const given = String(req.body?.given ?? '').slice(0, 1500);
        if (!given.trim()) return bad(res, 'Type or choose an answer first.');
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        const out = svc.checkQuizAnswer(lesson, String(req.body?.id || ''), given);
        if (!out) return bad(res, 'That question is not in this quiz.');
        res.json(svc.withAnswerSay(lesson, out));
    } catch (err) { next(err); }
});

router.post('/lessons/:id/quiz', async (req, res, next) => {
    try {
        const answers = req.body?.answers;
        if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return bad(res, 'Answer the questions first.');
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        if (lesson.review === 'talk') return bad(res, 'This lesson is a talk: speak on its topic instead.');
        res.json(await svc.submitQuiz(req.user, lesson, answers));
    } catch (err) { next(err); }
});

router.post('/lessons/:id/writing/:taskId', async (req, res, next) => {
    try {
        const answer = String(req.body?.answer ?? '');
        if (!answer.trim()) return bad(res, 'Write your answer first.');
        if (answer.length > 6000) return bad(res, 'Your answer is too long. Keep it under 6,000 characters.');
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        // "Write at least three sentences, otherwise don't go to the next question" (2026-10-28).
        const task = (lesson.writing || []).find((t) => t.id === req.params.taskId);
        if (task && OPEN_WRITING.includes(task.type) && sentenceCount(answer) < LEAST_SENTENCES) return bad(res, 'Write at least 3 sentences. End each one with a full stop.');
        const out = await svc.submitWriting(req.user, lesson, req.params.taskId, answer);
        if (!out) return bad(res, 'That task is not in this lesson.');
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/lessons/:id/speaking', async (req, res, next) => {
    try {
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        if (lesson.module !== 'speaking') return bad(res, 'This lesson has no speaking task.');
        // Answered by voice, not ticked by hand (2026-10-28): recorded, what was said, and half the points or more
        // heard in it. The points are ticked here from what was said (speakChecks.js); ticks sent are not taken.
        const said = String(req.body?.said || '').slice(0, 4000).trim();
        const seconds = Math.min(600, Math.max(0, Number(req.body?.seconds) || 0));
        if (req.body?.recorded !== true) return bad(res, 'Tap the microphone and say your answer first.');
        if (speakChecks.wordCount(said) < 5) return bad(res, 'Say a little more: five words or more.');
        const total = (lesson.speaking?.checklist || []).length;
        const heard = speakChecks.ticksFor(lesson, said, seconds).filter(Boolean).length;
        if (total && heard < speakChecks.needed(total)) return bad(res, `Say more of the points: ${heard} of ${total} heard, ${speakChecks.needed(total)} needed.`);
        res.json(await svc.saveSpeaking(req.user, lesson, said, seconds));
    } catch (err) { next(err); }
});

// Speak on a topic (talks.js): what the student said, as the browser wrote it down (or as they typed it).
router.post('/lessons/:id/talk', async (req, res, next) => {
    try {
        const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, 4000) : '';
        if (!text) return bad(res, 'Speak (or type) your talk first.');
        const lesson = await openLesson(req, res);
        if (!lesson) return;
        if (lesson.review !== 'talk' || !lesson.talk) return bad(res, 'This lesson has no talk.');
        res.json(await svc.submitTalk(req.user, lesson, text));
    } catch (err) { next(err); }
});

/* ── Daily challenge ──────────────────────────────────────────────────── */

/** The student's level, own language and course, for the daily challenge. */
const studentNow = async (userId) => {
    const progress = await svc.progressOf(userId);
    return { level: svc.currentLevel(await svc.lessonsFor(progress), progress), lang: svc.languageOf(progress), course: courseOf(progress) };
};

router.get('/daily', async (req, res, next) => {
    try {
        const [config, { level, lang, course }] = await Promise.all([getConfig(), studentNow(req.user._id)]);
        const done = await LinguisticAttempt.findOne({ userId: req.user._id, kind: 'daily', day: dayKey() }).lean();
        const qs = await svc.dailyQuestions(String(req.user._id), level, config.dailyChallengeSize, lang, course);
        res.json({ day: dayKey(), level, language: lang, done: done ? { score: done.score, total: done.total, results: done.detail?.results || [] } : null, questions: qs.map((q) => svc.withSays(course, svc.publicQuestion(q, `daily:${dayKey()}`))) });
    } catch (err) { next(err); }
});
router.post('/daily', async (req, res, next) => {
    try {
        const answers = req.body?.answers;
        if (!answers || typeof answers !== 'object') return bad(res, 'Answer the questions first.');
        const already = await LinguisticAttempt.findOne({ userId: req.user._id, kind: 'daily', day: dayKey() }).lean();
        if (already) return res.status(409).json({ message: 'You have already done today\'s challenge. Come back tomorrow!', score: already.score, total: already.total });
        const [config, { level, lang, course }] = await Promise.all([getConfig(), studentNow(req.user._id)]);
        const qs = await svc.dailyQuestions(String(req.user._id), level, config.dailyChallengeSize, lang, course);
        const progress = await svc.progressOf(req.user._id);
        const results = qs.map((q) => {
            const given = String(answers[q.id] ?? '').slice(0, 200);
            const g = gradeQuestion(q, given);
            svc.noteMistake(progress, { lesson: q.lesson, section: 'daily', qid: q.id, kind: 'word', prompt: q.prompt, given, correct: g.correct });
            return { id: q.id, prompt: q.prompt, given, correct: g.correct, answer: q.answer, explanation: q.explanation };
        });
        progress.lastActiveAt = new Date();
        await progress.save();
        const score = results.filter((r) => r.correct).length;
        await LinguisticAttempt.create({ userId: req.user._id, kind: 'daily', level, score, total: results.length, percent: results.length ? Math.round((score / results.length) * 100) : 0, passed: true, detail: { results: results.map(({ id, prompt, given, correct, answer, explanation }) => ({ id, prompt, given, correct, answer, explanation })) }, day: dayKey() });
        const paid = await svc.pay(req.user._id, 'linguistic_daily', dayKey());
        res.json({ score, total: results.length, results, events: paid.events });
    } catch (err) { next(err); }
});

/* ── Revision ─────────────────────────────────────────────────────────── */

/** The question behind a mistake, rebuilt with its answer (in the student's language); null when it no longer exists. */
const mistakeQuestion = async (m, progress) => {
    if (m.section === 'daily') return svc.rebuildDaily(m.qid, svc.languageOf(progress));
    const doc = m.lessonId && await LinguisticLesson.findOne({ _id: m.lessonId, deletedAt: null }).lean();
    const lesson = doc && svc.serve(doc, progress);
    if (!lesson) return null;
    const section = m.section === 'vocab' ? 'vocab' : m.section;
    const q = svc.findQuestion(lesson, section, m.qid);
    return q ? { lesson, q, section } : null;
};

router.get('/review', async (req, res, next) => {
    try {
        const progress = await svc.progressOf(req.user._id);
        // The course the student is on: its own mistakes only.
        const open = (await svc.openMistakes(progress)).sort((a, b) => b.lastAt - a.lastAt).slice(0, 60);
        const out = [];
        for (const m of open) {
            const found = await mistakeQuestion(m, progress);
            if (!found?.q) continue;
            const { lesson, q } = found;
            const translation = lesson.module === 'translation' && (m.section === 'items' || m.section === 'quiz');
            out.push({
                id: idOf(m._id), module: lesson.module, moduleLabel: svc.MODULE_LABEL[lesson.module], level: lesson.level, lessonTitle: lesson.title,
                kind: m.kind, count: m.count, given: m.given, lastAt: m.lastAt,
                question: translation ? { type: 'translation', source: q.source, direction: q.direction || lesson.direction, language: lesson.language, languageName: lesson.languageName, ...(lesson.course ? { target: lesson.target, targetLocale: lesson.targetLocale } : {}) } : svc.withSays(svc.soundsIn(lesson), svc.publicQuestion(q, idOf(lesson._id)))
            });
        }
        res.json({ mistakes: out, fixed: progress.mistakes.filter((m) => m.resolvedAt).length, language: svc.languageOf(progress) });
    } catch (err) { next(err); }
});
router.post('/review/:id', async (req, res, next) => {
    try {
        const given = String(req.body?.given ?? '').slice(0, 1500);
        if (!given.trim()) return bad(res, 'Type or choose an answer first.');
        const progress = await svc.progressOf(req.user._id);
        const m = progress.mistakes.find((x) => idOf(x._id) === req.params.id && !x.resolvedAt);
        if (!m) return bad(res, 'That mistake is not on your list any more.', 404);
        const found = await mistakeQuestion(m, progress);
        if (!found?.q) return bad(res, 'That question has been removed from its lesson.', 404);
        const section = found.section || (m.section === 'daily' ? 'daily' : m.section);
        const out = found.lesson.module === 'translation' ? svc.judge(found.lesson, found.q, given, section) : { ...gradeQuestion(found.q, given), answer: found.q.answer, explanation: found.q.explanation || '' };
        if (out.correct) m.resolvedAt = new Date(); else { m.count += 1; m.given = given.slice(0, 500); m.lastAt = new Date(); }
        progress.lastActiveAt = new Date();
        await progress.save();
        await LinguisticAttempt.create({ userId: req.user._id, lessonId: found.lesson?._id || null, module: found.lesson?.module || '', level: found.lesson?.level || '', kind: 'review', score: out.correct ? 1 : 0, total: 1, percent: out.correct ? 100 : 0, passed: !!out.correct, detail: { mistake: req.params.id, given }, day: dayKey() });
        res.json({ ...out, resolved: !!out.correct });
    } catch (err) { next(err); }
});

/* ── The student's own record ─────────────────────────────────────────── */

router.get('/submissions', async (req, res, next) => {
    try {
        const rows = await LinguisticSubmission.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(50).lean();
        // The tips and corrections kept in English, shown in the student's language.
        const progress = await svc.progressOf(req.user._id);
        const code = svc.languageOf(progress);
        // Only a lesson of the course they are on can be opened from here (another course's says "not part of your course").
        const own = new Set((await svc.lessonsFor(progress)).map((l) => idOf(l._id)));
        const { localizeFeedback } = require('./content/feedback');
        const lessons = new Map((await LinguisticLesson.find({ _id: { $in: rows.map((r) => r.lessonId) } }).select('title module').lean()).map((l) => [idOf(l._id), l]));
        res.json({ submissions: rows.map((r) => ({ id: idOf(r._id), lessonId: idOf(r.lessonId), lessonTitle: lessons.get(idOf(r.lessonId))?.title || 'A lesson', open: own.has(idOf(r.lessonId)), module: r.module, level: r.level, kind: r.kind, taskType: r.taskType, prompt: r.prompt, answer: r.answer, model: r.model, ...localizeFeedback(code, { autoFeedback: r.autoFeedback || [], sentences: r.sentences || null }), status: r.status, score: r.score, comment: r.comment, reviewedBy: r.reviewedBy?.name || null, reviewedAt: r.reviewedAt, updatedAt: r.updatedAt })) });
    } catch (err) { next(err); }
});

/* ── The notepad ──────────────────────────────────────────────────────── */

const MAX_NOTES = 200;
const noteOut = (n) => ({ id: idOf(n._id), title: n.title, html: n.html, createdAt: n.createdAt, updatedAt: n.updatedAt });
/** A note's fields from the body; the HTML is cleaned again by the page before it is shown. */
const noteIn = (body) => {
    const title = String(body?.title ?? '').trim().slice(0, 120);
    const html = String(body?.html ?? '');
    if (html.length > 100000) return { error: 'That note is too long.' };
    return { title, html: html.replace(/<\s*(script|style|iframe|object|embed)[^]*?<\s*\/\s*\1\s*>/gi, '') };
};

router.get('/notes', async (req, res, next) => {
    try {
        const rows = await LinguisticNote.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(MAX_NOTES).lean();
        res.json({ notes: rows.map(noteOut) });
    } catch (err) { next(err); }
});

router.post('/notes', async (req, res, next) => {
    try {
        const v = noteIn(req.body);
        if (v.error) return res.status(400).json({ message: v.error });
        if (await LinguisticNote.countDocuments({ userId: req.user._id }) >= MAX_NOTES) return res.status(400).json({ message: `You can keep up to ${MAX_NOTES} notes. Delete one first.` });
        const n = await LinguisticNote.create({ userId: req.user._id, ...v });
        res.status(201).json({ note: noteOut(n) });
    } catch (err) { next(err); }
});

router.post('/notes/:id', async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'That note was not found.' });
        const v = noteIn(req.body);
        if (v.error) return res.status(400).json({ message: v.error });
        const n = await LinguisticNote.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: v }, { new: true });
        if (!n) return res.status(404).json({ message: 'That note was not found.' });
        res.json({ note: noteOut(n) });
    } catch (err) { next(err); }
});

router.delete('/notes/:id', async (req, res, next) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: 'That note was not found.' });
        await LinguisticNote.deleteOne({ _id: req.params.id, userId: req.user._id });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.get('/history', async (req, res, next) => {
    try {
        const rows = await LinguisticAttempt.find({ userId: req.user._id, kind: { $in: ['quiz', 'placement', 'daily'] } }).sort({ createdAt: -1 }).limit(40).lean();
        const lessons = new Map((await LinguisticLesson.find({ _id: { $in: rows.map((r) => r.lessonId).filter(Boolean) } }).select('title').lean()).map((l) => [idOf(l._id), l.title]));
        res.json({ attempts: rows.map((r) => ({ id: idOf(r._id), kind: r.kind, lessonTitle: r.lessonId ? lessons.get(idOf(r.lessonId)) || 'A lesson' : null, module: r.module, level: r.level, score: r.score, total: r.total, percent: r.percent, passed: r.passed, createdAt: r.createdAt })) });
    } catch (err) { next(err); }
});

/* ── Certificates ─────────────────────────────────────────────────────── */

router.get('/certificates', async (req, res, next) => {
    try {
        const progress = await svc.progressOf(req.user._id);
        res.json({ certificates: progress.certificates.filter((c) => !c.hiddenAt).map((c) => ({ level: c.level, label: svc.LEVEL_LABEL[c.level], course: c.course || 'en', courseName: courseInfo(c.course || 'en').name, number: c.number, issuedAt: c.issuedAt, average: c.average })) });
    } catch (err) { next(err); }
});
router.get('/certificates/:level/pdf', async (req, res, next) => {
    try {
        if (!LEVELS.includes(req.params.level)) return bad(res, 'That certificate was not found.', 404);
        const progress = await svc.progressOf(req.user._id);
        // ?course= for another course's; the course the student is on otherwise.
        const course = String(req.query.course || courseOf(progress));
        const c = progress.certificates.find((x) => x.level === req.params.level && svc.inCourse(x, course));
        if (!c) return bad(res, 'You have not earned this certificate yet.', 404);
        certificate.draw(res, { name: req.user.name, level: c.level, number: c.number, issuedAt: c.issuedAt, average: c.average, courseName: courseInfo(course).name });
    } catch (err) { next(err); }
});
router.delete('/certificates/:level', async (req, res, next) => {
    try {
        const progress = await svc.progressOf(req.user._id);
        const course = String(req.query.course || courseOf(progress));
        const c = progress.certificates.find((x) => x.level === req.params.level && svc.inCourse(x, course) && !x.hiddenAt);
        if (!c) return bad(res, 'That certificate was not found.', 404);
        c.hiddenAt = new Date();
        await progress.save();
        res.json({ hidden: true });
    } catch (err) { next(err); }
});

module.exports = router;
