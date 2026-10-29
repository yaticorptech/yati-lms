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
 *   …/aptitude                       aptitude practice (aptitudeRoutes.js)
 *
 * Every route reads req.user only. The interviewer never sees anyone
 * else's data, and a student can only reach their own sessions.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { protectUser } = require('../middleware/authMiddleware');
const { InterviewSession, InterviewPrep, TYPES } = require('./models');
const { buildContext, levelOf } = require('./studentContext');
const ai = require('./aiInterviewer');
const template = require('./templateInterviewer');
const { readiness } = require('./readinessService');
const { safeRecordActivity } = require('../rewards/services/activityService');
const { LearningActivity } = require('../rewards/models');
const { dayKey, weekStartKey, startOfDay } = require('../rewards/config/constants');
const { chargeWallet } = require('../rewards/services/walletRuleService');
const { coursesForSkills } = require('../jobboard/services/lmsCourses');
const comms = require('./communicationService');
const { assess } = require('./answerCheck');
const { repairSaved } = require('./repairSaved');
const aptitude = require('./aptitudeRoutes');

const router = express.Router();
router.use(protectUser);
router.use(rateLimit({
    windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false,
    keyGenerator: (req) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req.ip)),
    message: { message: 'Too many requests — slow down a moment.' }
}));

router.use('/aptitude', aptitude.router);

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
// The challenge week is the platform's — Monday to Sunday in the rewards
// timezone, the same week the leaderboard pays out — not the server's own
// Sunday-to-Saturday week in whatever zone it happens to run in, which moved
// the reset to a different hour (and day) from everything else.
const weekKey = () => `W:${weekStartKey(dayKey())}`;

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

// Bumped when the bank itself changes shape, so every student's bank is
// rebuilt once. v2: 30-40 questions instead of about 20. v3: pitched to the
// student's class or level (level.js).
const BANK_VERSION = 'v3';
// The level is part of what a bank was written for: a student who moves from
// Class 9 to Class 10, or sets their level in Career Path, gets a new one.
const levelKey = (context) => (context.level ? `${context.level.key}${context.level.classNo || ''}` : 'general');

// One generation per student at a time. A second request while the first is
// still writing must not start another; it waits on, or ignores, this one.
const generating = new Map();
const regenerate = (userId, context, source) => {
    const key = String(userId);
    if (generating.has(key)) return generating.get(key);
    const run = (async () => {
        try {
            const out = await ai.generateQuestions({ context, userId });
            const prep = (await InterviewPrep.findOne({ userId })) || new InterviewPrep({ userId });
            prep.questions = out.questions; prep.topics = out.topics; prep.generatedAt = new Date(); prep.generatedFrom = source; prep.role = context.goal || '';
            await prep.save();
            // The AI's bank comes without sample answers; they follow (coach).
            // The built-in bank has its own.
            if (out.model !== 'template') { coachTried.delete(key); coach(userId, context); }
        } catch (err) {
            console.warn('[interview] practice bank generation failed:', err.message);
        } finally {
            generating.delete(key);
        }
    })();
    generating.set(key, run);
    return run;
};

/**
 * Sample answers and tips for a bank's questions that have none yet: a new AI
 * bank, or one saved before questions came with them (asked 2026-10-15). In
 * the background, one run per student at a time, and keeping the questions —
 * so nothing a student has practised moves. A tip lands only on the question
 * it was written for: the bank may have been rewritten while it was out.
 * After a run, the next waits half an hour, so a run the AI keeps failing is
 * not retried on every visit; true while one is running.
 */
const coaching = new Map();
const coachTried = new Map();
const COACH_RETRY_MS = 30 * 60 * 1000;
const coach = (userId, context) => {
    const key = String(userId);
    if (coaching.has(key)) return true;
    if (Date.now() - (coachTried.get(key) || 0) < COACH_RETRY_MS) return false;
    coachTried.set(key, Date.now());
    const run = (async () => {
        try {
            const prep = await InterviewPrep.findOne({ userId }).lean();
            const missing = (prep?.questions || []).filter((q) => !q.sample);
            if (!missing.length) return;
            const tips = await ai.coachQuestions({ questions: missing, context, userId });
            if (!tips.size) return;
            const fresh = await InterviewPrep.findOne({ userId });
            if (!fresh) return;
            let changed = false;
            for (const q of fresh.questions) {
                const t = tips.get(q.id);
                if (t && !q.sample && t.question === q.question) { q.sample = t.sample; q.say = t.say; q.avoid = t.avoid; changed = true; }
            }
            if (changed) await fresh.save();
        } catch (err) {
            console.warn('[interview] sample answers failed:', err.message);
        } finally {
            coaching.delete(key);
        }
    })();
    coaching.set(key, run);
    return true;
};

// Every question goes out with something to say and something to avoid: its
// own when written, the kind of question's until then.
const withTips = (q) => {
    const o = typeof q.toObject === 'function' ? q.toObject() : { ...q };
    const t = template.tipsFor(o.category);
    if (!o.say?.length) o.say = t.say;
    if (!o.avoid?.length) o.avoid = t.avoid;
    return o;
};

/**
 * The student's practice bank, and whether a fresh one is still on its way.
 *
 * The bank is regenerated when the learning data has moved on (new skills or
 * projects mean new questions) or when the bank's version has. With the AI
 * that takes ten seconds and more, and the dashboard used to wait for it —
 * the whole section sat on a spinner every time a student's learning data
 * had changed since their last visit. Now the request is answered at once
 * with what there is: the last bank, or the built-in interviewer's, written
 * in a moment. The AI's runs in the background and replaces it when done,
 * and `generating` lets the page say so. Without an AI key the built-in bank
 * is the final one, so nothing is deferred.
 */
const ensurePrep = async (userId, context) => {
    let prep = await InterviewPrep.findOne({ userId });
    if (!prep) prep = new InterviewPrep({ userId });
    const source = `${context.hash}:${levelKey(context)}:${BANK_VERSION}`;
    if (prep.questions.length && prep.generatedFrom === source) {
        if (prep.questions.every((q) => q.sample)) return { prep, generating: false, coaching: false };
        if (await ai.configuredFor(userId)) return { prep, generating: false, coaching: coach(userId, context) };
        // A built-in bank saved before it came with sample answers: the same
        // questions, written again with them, in a moment. Once in half an
        // hour at most, like the AI's (coach), and timed apart from it.
        const key = `${userId}:template`;
        if (Date.now() - (coachTried.get(key) || 0) < COACH_RETRY_MS) return { prep, generating: false, coaching: false };
        coachTried.set(key, Date.now());
        await regenerate(userId, context, source);
        return { prep: await InterviewPrep.findOne({ userId }), generating: false, coaching: false };
    }

    if (!(await ai.configuredFor(userId))) {
        await regenerate(userId, context, source);
        return { prep: await InterviewPrep.findOne({ userId }), generating: false, coaching: false };
    }

    regenerate(userId, context, source);
    if (!prep.questions.length) {
        // Nothing to show yet: the built-in bank stands in until the AI's arrives.
        prep.questions = template.generateQuestions(context); prep.topics = template.recommendTopics(context);
        prep.generatedAt = new Date(); prep.generatedFrom = `${source}:template`; prep.role = context.goal || '';
        await prep.save();
    }
    return { prep, generating: true, coaching: false };
};

// Mock interviews open at PUC (Class 11–12) and after; a student in Class 1–10
// gets the IQ tests and the rest, and this lock instead of the dashboard.
const BELOW_PUC = new Set(['primary', 'middle', 'high']);
const mockLock = async (userId) => {
    // The demo (presentation) cards open mock interviews at any level.
    if (await require('../services/fullAccess').fullAccessForUserId(userId)) return null;
    const level = await levelOf(userId);
    return BELOW_PUC.has(level.key) ? { classNo: level.classNo, message: 'Mock interviews unlock when you reach PUC (Class 11).' } : null;
};
const requireMockOpen = async (req, res, next) => {
    try {
        const locked = await mockLock(req.user._id);
        return locked ? res.status(403).json({ message: locked.message, locked }) : next();
    } catch (err) { next(err); }
};

router.get('/dashboard', async (req, res, next) => {
    try {
        // Before the readiness and the question bank, which spend AI on a student who cannot use them.
        const locked = await mockLock(req.user._id);
        if (locked) return res.json({ locked });
        const context = await buildContext(req.user._id);
        if (!context) return res.status(404).json({ message: 'Account not found.' });
        const [r, { prep, generating: banking }] = await Promise.all([readiness(req.user._id, context), ensurePrep(req.user._id, context)]);
        await InterviewPrep.updateOne({ userId: req.user._id }, { $set: { readiness: r.overall } });
        const [active, aptitudeStats] = await Promise.all([
            InterviewSession.findOne({ userId: req.user._id, status: 'active' }).sort({ startedAt: -1 }).select('_id type startedAt turns').lean(),
            aptitude.summary(req.user._id)
        ]);
        res.json({
            student: { name: context.name, firstName: context.firstName, goal: context.goal, strongSkills: context.strongSkills, learningSkills: context.learningSkills, projects: context.projects.map((p) => p.name) },
            readiness: r,
            topics: prep.topics,
            practice: { total: prep.questions.length, practiced: prep.practiced.length, sample: prep.questions.filter((q) => !prep.practiced.includes(q.id)).slice(0, 3), generating: banking },
            activeSession: active ? { id: String(active._id), type: active.type, startedAt: active.startedAt, answered: active.turns.filter((t) => t.answer).length } : null,
            types: TYPES,
            // The aptitude practice's card: its name for this student and their scores.
            aptitude: { title: aptitude.titleFor(context.level), school: !!context.level?.school, sets: aptitudeStats.sets, best: aptitudeStats.best, last: aptitudeStats.last },
            ai: { configured: ai.configured(), model: ai.configured() ? ai.MODEL : 'template' }
        });
    } catch (err) { next(err); }
});

router.get('/questions', async (req, res, next) => {
    try {
        const context = await buildContext(req.user._id);
        if (!context) return res.status(404).json({ message: 'Account not found.' });
        const { prep, generating: banking, coaching: writing } = await ensurePrep(req.user._id, context);
        res.json({ questions: prep.questions.map(withTips), practiced: prep.practiced, topics: prep.topics, generatedAt: prep.generatedAt, generating: banking, coaching: writing });
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
const askNext = async (session, context, userId, { judge = false, allowRetry = false } = {}) => {
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
    // A wrong or unsatisfying answer: said plainly, and the same question put again to improve it (once).
    if (allowRetry && (q.quality === 'incorrect' || q.quality === 'weak')) {
        const lead = q.quality === 'incorrect' ? 'That answer is not correct.' : 'That answer is not quite enough.';
        return { turn: null, retry: { quality: q.quality, message: `${q.feedback || lead} Improve your answer and try again.` } };
    }
    if (lastTurn && q.quality) lastTurn.quality = q.quality;
    session.turns.push({ index: turns.length, stage: q.stage, question: q.question, isFollowUp: q.isFollowUp, difficulty: q.difficulty, askedAt: new Date() });
    return { turn: session.turns[session.turns.length - 1] };
};

// Wallet rules: a new mock interview is a priced feature (refunded if it fails to start).
router.post('/sessions', requireMockOpen, chargeWallet('start_mock_interview', { when: (req) => TYPES.includes(String(req.body?.type || 'full').toLowerCase()) }), async (req, res, next) => {
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
        const { turn: nextTurn, redirect, retry } = await askNext(session, context, req.user._id, { judge: asked < MAX_CLARIFICATIONS, allowRetry: !current.improved });
        if (retry) {
            // Not kept: they try once more with the interviewer's note in hand.
            current.answer = ''; current.answeredAt = null; current.inputMode = 'text'; current.voice = null;
            current.improved = true;
            await session.save();
            return res.json({ ...publicSession(session), done: false, clarification: retry.message, clarificationKind: retry.quality, verdict: retry.quality });
        }
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
        // How the kept answer was judged, for the interviewer's face ('' when it was not).
        res.json({ ...publicSession(session), done: !nextTurn, verdict: current.quality || '' });
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
        // Once a week. The ledger's key is the week; the check before it also
        // catches a challenge recorded this week under the old server-week
        // key, so the week the key changed does not pay twice.
        if (session.type === 'full' && report.overall >= CHALLENGE_SCORE) {
            const weekStart = startOfDay(weekStartKey(dayKey()));
            if (!(await LearningActivity.exists({ userId: req.user._id, type: 'interview_challenge', createdAt: { $gte: weekStart } }))) {
                const ch = await safeRecordActivity({ userId: req.user._id, type: 'interview_challenge', refId: `challenge:${weekKey()}`, meta: { score: report.overall } });
                events = events.concat(ch.events || []);
                session.xp.challenge = ch.duplicate ? 0 : (ch.events || []).find((e) => e.kind === 'xp')?.amount || 0;
            }
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
        await repairSaved(session);
        res.json(publicSession(session));
    } catch (err) { next(err); }
});

module.exports = router;
