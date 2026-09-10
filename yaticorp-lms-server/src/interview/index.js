/**
 * Interview Ready — /api/interview
 *
 *   GET  /dashboard                  readiness, breakdown, prep progress, topics, history, areas to improve
 *   GET  /questions                  the personalised practice bank (generated once, refreshed when learning data changes)
 *   POST /questions/:id/practice     mark a question practised (+XP once)
 *   POST /sessions { type, role }    start a mock interview → the interviewer's first message
 *   POST /sessions/:id/answer        { answer, inputMode } → the next question, or the closing message
 *   POST /sessions/:id/finish        evaluate → the report (+XP, badge checks)
 *   GET  /sessions                   history
 *   GET  /sessions/:id               one session with its transcript and report
 *
 * Every route reads req.user only. The interviewer never sees anyone
 * else's data, and a student can only reach their own sessions.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { protectUser } = require('../middleware/authMiddleware');
const { InterviewSession, InterviewPrep, TYPES } = require('./models');
const { buildContext } = require('./studentContext');
const ai = require('./aiInterviewer');
const { readiness } = require('./readinessService');
const { safeRecordActivity } = require('../rewards/services/activityService');
const { coursesForSkills } = require('../jobboard/services/lmsCourses');
const comms = require('./communicationService');
const { assess } = require('./answerCheck');

const router = express.Router();
router.use(protectUser);
router.use(rateLimit({
    windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip)),
    message: { message: 'Too many requests — slow down a moment.' }
}));

/** The stages each interview type walks through, in order. A stage may repeat. */
const PLANS = {
    hr: ['intro', 'about', 'background', 'behavioral', 'situational', 'candidate'],
    technical: ['intro', 'skills', 'technical', 'technical', 'problem', 'candidate'],
    project: ['intro', 'project', 'project', 'technical', 'problem', 'candidate'],
    behavioral: ['intro', 'behavioral', 'behavioral', 'situational', 'situational', 'candidate'],
    full: ['intro', 'about', 'background', 'skills', 'technical', 'technical', 'project', 'problem', 'behavioral', 'situational', 'candidate']
};
const MAX_QUESTIONS = { hr: 8, technical: 9, project: 9, behavioral: 9, full: 15 };
// How long each type is meant to take. The client shows a timer against it and
// nudges — never cuts — when it is passed.
const PLANNED_MINUTES = { hr: 10, technical: 12, project: 12, behavioral: 12, full: 15 };
// How often one question may be re-asked before whatever was said is recorded
// anyway. Two nudges is an interviewer being patient; more is a trap the
// candidate cannot leave.
const MAX_CLARIFICATIONS = 2;
const CHALLENGE_SCORE = 75;
const weekKey = () => { const d = new Date(); const onejan = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-w${Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)}`; };

const own = (userId, id) => InterviewSession.findOne({ _id: id, userId });

const publicSession = (s, { withContext = false } = {}) => ({
    id: String(s._id), type: s.type, role: s.role, status: s.status, interviewer: s.interviewer,
    turns: s.turns.map((t) => ({ index: t.index, stage: t.stage, question: t.question, isFollowUp: t.isFollowUp, difficulty: t.difficulty, answer: t.answer, askedAt: t.askedAt, answeredAt: t.answeredAt, inputMode: t.inputMode, voice: t.voice || null })),
    plan: s.plan, maxQuestions: s.maxQuestions,
    // A plan can end before the question cap; a closed interview is 100% either way.
    progress: s.closingMessage || s.status !== 'active' ? 100 : Math.min(100, Math.round((s.turns.filter((t) => t.answer).length / s.maxQuestions) * 100)),
    closingMessage: s.closingMessage, report: s.status === 'completed' ? s.report : null, xp: s.xp,
    // No separate greeting: every plan opens on the "intro" stage, whose
    // question greets the candidate and welcomes them itself. A second welcome
    // here meant the client spoke one before the other.
    plannedMinutes: s.plannedMinutes || PLANNED_MINUTES[s.type] || 12,
    startedAt: s.startedAt, completedAt: s.completedAt,
    ...(withContext ? { context: s.context } : {})
});

/* ── Practice bank ────────────────────────────────────────────────────── */

const ensurePrep = async (userId, context) => {
    let prep = await InterviewPrep.findOne({ userId });
    if (!prep) prep = new InterviewPrep({ userId });
    // Regenerate when the learning data has moved on: new skills or projects mean new questions.
    if (!prep.questions.length || prep.generatedFrom !== context.hash) {
        const out = await ai.generateQuestions({ context, userId });
        prep.questions = out.questions; prep.topics = out.topics; prep.generatedAt = new Date(); prep.generatedFrom = context.hash; prep.role = context.goal || '';
        await prep.save();
    }
    return prep;
};

router.get('/dashboard', async (req, res, next) => {
    try {
        const context = await buildContext(req.user._id);
        if (!context) return res.status(404).json({ message: 'Account not found.' });
        const [r, prep] = await Promise.all([readiness(req.user._id, context), ensurePrep(req.user._id, context)]);
        await InterviewPrep.updateOne({ userId: req.user._id }, { $set: { readiness: r.overall } });
        const active = await InterviewSession.findOne({ userId: req.user._id, status: 'active' }).sort({ startedAt: -1 }).select('_id type startedAt turns').lean();
        res.json({
            student: { name: context.name, firstName: context.firstName, goal: context.goal, strongSkills: context.strongSkills, learningSkills: context.learningSkills, projects: context.projects.map((p) => p.name) },
            readiness: r,
            topics: prep.topics,
            practice: { total: prep.questions.length, practiced: prep.practiced.length, sample: prep.questions.filter((q) => !prep.practiced.includes(q.id)).slice(0, 3) },
            activeSession: active ? { id: String(active._id), type: active.type, startedAt: active.startedAt, answered: active.turns.filter((t) => t.answer).length } : null,
            types: TYPES,
            ai: { configured: ai.configured(), model: ai.configured() ? ai.MODEL : 'template' }
        });
    } catch (err) { next(err); }
});

router.get('/questions', async (req, res, next) => {
    try {
        const context = await buildContext(req.user._id);
        if (!context) return res.status(404).json({ message: 'Account not found.' });
        const prep = await ensurePrep(req.user._id, context);
        res.json({ questions: prep.questions, practiced: prep.practiced, topics: prep.topics, generatedAt: prep.generatedAt });
    } catch (err) { next(err); }
});

router.post('/questions/:id/practice', async (req, res, next) => {
    try {
        const prep = await InterviewPrep.findOne({ userId: req.user._id });
        const q = prep?.questions.find((x) => x.id === req.params.id);
        if (!q) return res.status(404).json({ message: 'No such question.' });
        let events = [];
        if (!prep.practiced.includes(q.id)) {
            prep.practiced.push(q.id);
            await prep.save();
            const r = await safeRecordActivity({ userId: req.user._id, type: 'interview_practice', refId: `practice:${q.id}`, meta: { category: q.category, topic: q.topic } });
            events = r.events || [];
            // Five practised questions is "prepared": one-time bonus.
            if (prep.practiced.length === 5) {
                const p = await safeRecordActivity({ userId: req.user._id, type: 'interview_prep', refId: 'prep', meta: {} });
                events = events.concat(p.events || []);
            }
        }
        res.json({ practiced: prep.practiced, events });
    } catch (err) { next(err); }
});

/* ── Sessions ─────────────────────────────────────────────────────────── */

/**
 * Ask the interviewer for the next message and append it as a turn.
 *
 * With `judge`, the interviewer may answer that the last answer did not
 * address the question at all; then nothing is appended and the redirect comes
 * back instead, for the caller to put to the candidate.
 * @returns {Promise<{turn: object|null, redirect?: string}>} turn null = closing time
 */
const askNext = async (session, context, userId, { judge = false } = {}) => {
    const turns = session.turns;
    const lastTurn = turns[turns.length - 1] || null;
    const cursor = turns.filter((t) => !t.isFollowUp).length;
    const overBudget = turns.length >= session.maxQuestions;
    if (cursor >= session.plan.length || overBudget) return { turn: null }; // nothing left: closing time
    const nextStage = session.plan[cursor];
    const canFollowUp = !!(lastTurn && !lastTurn.isFollowUp && lastTurn.answer && lastTurn.stage !== 'candidate' && turns.length < session.maxQuestions - 1);
    const q = await ai.nextQuestion({ session, context, nextStage, canFollowUp, lastTurn, userId, judge });
    if (!session.interviewer) session.interviewer = q.interviewer || 'template';
    if (q.addressed === false && q.redirect) return { turn: null, redirect: q.redirect };
    session.turns.push({ index: turns.length, stage: q.stage, question: q.question, isFollowUp: q.isFollowUp, difficulty: q.difficulty, askedAt: new Date() });
    return { turn: session.turns[session.turns.length - 1] };
};

router.post('/sessions', async (req, res, next) => {
    try {
        const type = String(req.body?.type || 'full').toLowerCase();
        if (!TYPES.includes(type)) return res.status(400).json({ message: 'Choose a valid interview type.' });
        const role = String(req.body?.role || '').trim().slice(0, 80);
        const context = await buildContext(req.user._id);
        if (!context) return res.status(404).json({ message: 'Account not found.' });
        // One live interview at a time: an abandoned one is closed, not resumed.
        await InterviewSession.updateMany({ userId: req.user._id, status: 'active' }, { $set: { status: 'abandoned' } });
        const session = new InterviewSession({ userId: req.user._id, type, role: role || context.goal || '', context, plan: PLANS[type], maxQuestions: MAX_QUESTIONS[type], plannedMinutes: PLANNED_MINUTES[type] });
        await askNext(session, context, req.user._id);
        await session.save();
        res.status(201).json(publicSession(session));
    } catch (err) { next(err); }
});

router.post('/sessions/:id/answer', async (req, res, next) => {
    try {
        const session = await own(req.user._id, req.params.id);
        if (!session) return res.status(404).json({ message: 'No such interview.' });
        if (session.status !== 'active') return res.status(409).json({ message: 'This interview has already ended.' });
        const answer = String(req.body?.answer || '').trim().slice(0, 4000);
        if (!answer) return res.status(400).json({ message: 'Type or speak your answer first.' });
        const current = session.turns[session.turns.length - 1];
        if (!current || current.answer) return res.status(409).json({ message: 'There is no open question to answer.' });

        // Keyboard mashing, or "idk": say so and ask again rather than
        // recording it and moving on. After MAX_CLARIFICATIONS the answer is
        // taken as given — the evaluation at the end scores it for what it is.
        const asked = current.clarifications || 0;
        const check = assess(answer, { attempt: asked, stage: current.stage, question: current.question });
        if (!check.usable && asked < MAX_CLARIFICATIONS) {
            current.clarifications = asked + 1;
            await session.save();
            return res.json({ ...publicSession(session), done: false, clarification: check.message, clarificationKind: check.kind });
        }

        current.answer = answer;
        current.answeredAt = new Date();
        current.inputMode = req.body?.inputMode === 'voice' ? 'voice' : 'text';
        current.voice = comms.turnMetrics(answer, current.inputMode === 'voice' ? req.body?.voice : null);
        const context = session.context;
        // The interviewer reads the answer as it decides what to ask next. If
        // it says that answered something else entirely, the answer is not
        // kept and the question is put again.
        const { turn: nextTurn, redirect } = await askNext(session, context, req.user._id, { judge: asked < MAX_CLARIFICATIONS });
        if (redirect) {
            current.answer = ''; current.answeredAt = null; current.inputMode = 'text'; current.voice = null;
            current.clarifications = asked + 1;
            await session.save();
            return res.json({ ...publicSession(session), done: false, clarification: redirect, clarificationKind: 'off-topic' });
        }
        if (!nextTurn) {
            session.closingMessage = `Thank you, ${context.firstName}. That concludes our interview — I'll put your evaluation together now.`;
        }
        await session.save();
        res.json({ ...publicSession(session), done: !nextTurn });
    } catch (err) { next(err); }
});

router.post('/sessions/:id/finish', async (req, res, next) => {
    try {
        const session = await own(req.user._id, req.params.id);
        if (!session) return res.status(404).json({ message: 'No such interview.' });
        if (session.status === 'completed') return res.json(publicSession(session));
        const answered = session.turns.filter((t) => t.answer).length;
        if (answered < 2) return res.status(400).json({ message: 'Answer at least two questions before finishing.' });
        const context = session.context;
        const communication = comms.summarize(session);
        const report = await ai.evaluate({ session, context, userId: req.user._id, delivery: comms.describe(communication) });
        report.communication = communication;

        // The plan's skills → the LMS course that teaches them, where one exists.
        const skills = report.plan.map((p) => p.skill).filter(Boolean);
        const matches = skills.length ? await coursesForSkills(skills) : [];
        report.plan = report.plan.map((p) => {
            const m = p.skill ? matches.find((c) => c.skill.toLowerCase() === p.skill.toLowerCase()) : null;
            return { ...p, courseId: m?.courseId || '', courseTitle: m?.title || '' };
        });
        if (!report.plan.some((p) => /another mock interview/i.test(p.title))) report.plan.push({ title: 'Take another mock interview', action: 'Recommended after completing the steps above', skill: '', courseId: '', courseTitle: '' });
        // One sentence the student can act on: the first two plan steps, in words.
        const steps = report.plan.filter((p) => !/another mock interview/i.test(p.title)).slice(0, 2);
        report.recommendation = steps.length
            ? `${steps.map((p, i) => (i === 0 ? p.action : p.courseTitle ? `complete "${p.courseTitle}"` : p.action.charAt(0).toLowerCase() + p.action.slice(1))).join(' and ')} before attempting your next mock interview.`
            : 'Take another mock interview to keep the momentum going.';
        report.recommendation = report.recommendation.charAt(0).toUpperCase() + report.recommendation.slice(1);

        const previousBest = (await InterviewSession.find({ userId: req.user._id, status: 'completed' }).select('report.overall').lean()).reduce((m, s) => Math.max(m, s.report?.overall ?? 0), 0);
        report.improvedBy = previousBest ? Math.max(0, report.overall - previousBest) : 0;

        session.report = report;
        session.status = 'completed';
        session.completedAt = new Date();
        if (!session.closingMessage) session.closingMessage = `Thank you, ${context.firstName}. That concludes our interview.`;

        // XP: finishing, beating your best, and the weekly full-interview challenge.
        let events = [];
        const done = await safeRecordActivity({ userId: req.user._id, type: 'mock_interview', refId: `session:${session._id}`, meta: { score: report.overall, type: session.type } });
        events = events.concat(done.events || []);
        session.xp.completed = done.duplicate ? 0 : (done.events || []).find((e) => e.kind === 'xp')?.amount || 0;
        if (previousBest && report.overall > previousBest) {
            const imp = await safeRecordActivity({ userId: req.user._id, type: 'interview_improved', refId: `improved:${session._id}`, meta: { from: previousBest, to: report.overall } });
            events = events.concat(imp.events || []);
            session.xp.improved = (imp.events || []).find((e) => e.kind === 'xp')?.amount || 0;
        }
        if (session.type === 'full' && report.overall >= CHALLENGE_SCORE) {
            const ch = await safeRecordActivity({ userId: req.user._id, type: 'interview_challenge', refId: `challenge:${weekKey()}`, meta: { score: report.overall } });
            events = events.concat(ch.events || []);
            session.xp.challenge = ch.duplicate ? 0 : (ch.events || []).find((e) => e.kind === 'xp')?.amount || 0;
        }
        await session.save();

        // Refresh the readiness snapshot so the badge can fire on this activity.
        const fresh = await buildContext(req.user._id);
        if (fresh) {
            const r = await readiness(req.user._id, fresh);
            await InterviewPrep.updateOne({ userId: req.user._id }, { $set: { readiness: r.overall } }, { upsert: true });
        }
        res.json({ ...publicSession(session), events });
    } catch (err) { next(err); }
});

router.get('/sessions', async (req, res, next) => {
    try {
        const rows = await InterviewSession.find({ userId: req.user._id, status: 'completed' }).sort({ completedAt: -1 }).limit(30).select('type role completedAt startedAt report.overall report.scores xp turns').lean();
        res.json({ sessions: rows.map((s, i, arr) => ({ id: String(s._id), number: arr.length - i, type: s.type, role: s.role, date: s.completedAt, score: s.report?.overall ?? null, scores: s.report?.scores || null, questions: s.turns.filter((t) => t.answer).length, xp: s.xp })) });
    } catch (err) { next(err); }
});

router.get('/sessions/:id', async (req, res, next) => {
    try {
        const session = await own(req.user._id, req.params.id);
        if (!session) return res.status(404).json({ message: 'No such interview.' });
        res.json(publicSession(session));
    } catch (err) { next(err); }
});

module.exports = router;
