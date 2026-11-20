/**
 * IELTS mock tests — /api/linguistic/ielts (2026-11-17). Behind the student's sign-in and Multilingo's switch
 * (linguistic/index.js).
 *
 *   GET  /                          the tests, the student's attempts and where to book the real exam
 *   POST /attempts                  { testId } → a new attempt
 *   GET  /attempts/:id              the attempt and its test (no answers)
 *   POST /attempts/:id/:section     listening | reading { answers } · writing { task1, task2 } · speaking { answers }
 *   DELETE /attempts/:id            the attempt gone (restart the test)
 *   DELETE /attempts/:id/:section   that section cleared, to take again
 *
 * Each section is submitted once per attempt; when all four are in, the overall band is set.
 */
const express = require('express');
const mongoose = require('mongoose');
const { Schema } = mongoose;
const { TESTS, BOOKING, testOf, publicTest } = require('./content');
const scoring = require('./scoring');

const SECTIONS = ['listening', 'reading', 'writing', 'speaking'];

const attemptSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    testId: { type: String, required: true },
    listening: { type: Schema.Types.Mixed, default: null },
    reading: { type: Schema.Types.Mixed, default: null },
    writing: { type: Schema.Types.Mixed, default: null },
    speaking: { type: Schema.Types.Mixed, default: null },
    overall: { type: Number, default: null },
    finishedAt: { type: Date, default: null }
}, { timestamps: true });
const IeltsAttempt = mongoose.models.IeltsAttempt || mongoose.model('IeltsAttempt', attemptSchema);

const router = express.Router();
const bad = (res, message, status = 400) => res.status(status).json({ message });

const summary = (a) => ({
    id: String(a._id), testId: a.testId, title: testOf(a.testId)?.title || a.testId,
    bands: Object.fromEntries(SECTIONS.map((s) => [s, a[s]?.band ?? null])),
    overall: a.overall, startedAt: a.createdAt, finishedAt: a.finishedAt
});

router.get('/', async (req, res, next) => {
    try {
        const attempts = await IeltsAttempt.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean();
        res.json({
            tests: TESTS.map((t) => ({ id: t.id, title: t.title, module: t.module || 'Academic', formats: t.formats || [], minutes: { listening: t.listening.minutes, reading: t.reading.minutes, writing: t.writing.minutes } })),
            attempts: attempts.map(summary),
            booking: BOOKING,
            aiReady: await scoring.aiConfiguredFor(req.user._id)
        });
    } catch (err) { next(err); }
});

router.post('/attempts', async (req, res, next) => {
    try {
        const test = testOf(String(req.body?.testId || ''));
        if (!test) return bad(res, 'No such test.', 404);
        const a = await IeltsAttempt.create({ userId: req.user._id, testId: test.id });
        res.status(201).json(summary(a.toObject()));
    } catch (err) { next(err); }
});

const own = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) { bad(res, 'No such attempt.', 404); return null; }
    const a = await IeltsAttempt.findOne({ _id: req.params.id, userId: req.user._id });
    if (!a) { bad(res, 'No such attempt.', 404); return null; }
    return a;
};

router.get('/attempts/:id', async (req, res, next) => {
    try {
        const a = await own(req, res); if (!a) return;
        const test = testOf(a.testId);
        res.json({ attempt: { ...summary(a.toObject()), results: Object.fromEntries(SECTIONS.map((s) => [s, a[s]])) }, test: publicTest(test) });
    } catch (err) { next(err); }
});

/* Reset (2026-11-17, the user: "reset this to test again"): the whole attempt, or one section of it. */
router.delete('/attempts/:id', async (req, res, next) => {
    try {
        const a = await own(req, res); if (!a) return;
        await a.deleteOne();
        res.json({ ok: true });
    } catch (err) { next(err); }
});
router.delete('/attempts/:id/:section', async (req, res, next) => {
    try {
        const { section } = req.params;
        if (!SECTIONS.includes(section)) return bad(res, 'No such section.', 404);
        const a = await own(req, res); if (!a) return;
        a[section] = null;
        a.overall = null; a.finishedAt = null;
        a.markModified(section);
        await a.save();
        res.json({ attempt: summary(a.toObject()) });
    } catch (err) { next(err); }
});

router.post('/attempts/:id/:section', async (req, res, next) => {
    try {
        const { section } = req.params;
        if (!SECTIONS.includes(section)) return bad(res, 'No such section.', 404);
        const a = await own(req, res); if (!a) return;
        if (a[section]) return bad(res, 'This section is already submitted for this attempt.', 409);
        const test = testOf(a.testId);
        const body = req.body || {};
        let result;
        if (section === 'listening') result = scoring.markObjective('listening', test.listening.parts.flatMap((p) => p.questions), body.answers);
        else if (section === 'reading') result = scoring.markObjective('reading', test.reading.passages.flatMap((p) => p.questions), body.answers);
        else {
            if (!(await scoring.aiConfiguredFor(req.user._id))) return bad(res, 'AI marking is not available right now. Add your own Gemini key in your profile, or try again later.', 503);
            try {
                if (section === 'writing') {
                    const task1 = String(body.task1 || '').slice(0, 8000), task2 = String(body.task2 || '').slice(0, 12000);
                    if (!task1.trim() && !task2.trim()) return bad(res, 'Write at least one task before submitting.');
                    result = { ...(await scoring.markWriting(req.user._id, test, { task1, task2 })), text: { task1, task2 } };
                } else {
                    const answers = Object.fromEntries(Object.entries(body.answers || {}).map(([k, v]) => [String(k).slice(0, 20), String(v || '').slice(0, 4000)]));
                    if (!Object.values(answers).some((v) => v.trim())) return bad(res, 'Answer at least one question before submitting.');
                    result = { ...(await scoring.markSpeaking(req.user._id, test, answers)), answers };
                }
            } catch (e) {
                console.error(`[ielts] ${section} marking failed for ${req.user._id}:`, e?.name, e?.status || '', e?.message);
                // Said as it is: the day's free AI credits spent (429, aiQuota.js), or the student's own key refused (400).
                if (e?.name === 'AiBudgetError') return res.status(429).json({ message: e.message || "Today's free AI credits are used up. Add your own Gemini key in your profile, or try again tomorrow.", code: 'AI_BUDGET' });
                if (e?.name === 'AiKeyError') return bad(res, e.message, 400);
                const busy = [429, 503].includes(Number(e?.status)) || /overloaded|unavailable|RESOURCE_EXHAUSTED|quota/i.test(String(e?.message));
                return bad(res, busy
                    ? 'The AI examiner is busy right now. Your answers are kept on this page — try submitting again in a minute.'
                    : 'The examiner could not mark this just now. Your answers are kept on this page — try submitting again in a minute.', 502);
            }
        }
        a[section] = { ...result, submittedAt: new Date() };
        a.markModified(section);
        const overall = scoring.overallOf(SECTIONS.map((s) => a[s]?.band));
        if (overall !== null) { a.overall = overall; a.finishedAt = new Date(); }
        await a.save();
        res.json({ result: a[section], attempt: summary(a.toObject()) });
    } catch (err) { next(err); }
});

module.exports = router;
