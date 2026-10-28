/**
 * @author Preethesh Kulal
 * @description Student quiz retrieval and answer submission with credit rewards
 */
const Quiz = require('../models/Quiz');
const GlobalQuizAttempt = require('../models/GlobalQuizAttempt');
const { livePaper } = require('../services/globalQuizService');
const { chargeFor, refundCharge, askFirst, sendShort } = require('../rewards/services/walletRuleService');
const Setting = require('../models/Setting');
const { lessonAccess } = require('../services/courseAccess');

/**
 * Whether the student may use this lesson's quiz right now: the same gate as
 * marking a lesson done (services/courseAccess.js) — a published lesson, in a
 * course they have, not behind its module's drip date, and done already or
 * next in order. Only the course's own access used to be checked, so a quiz
 * further on, or in a module not open yet, could be fetched and taken.
 * Sends the refusal itself and answers null, or answers the gate's result. A
 * course the student does not have is "not found", as before: no hint of what
 * is inside it.
 */
const quizGate = async (req, res) => {
    const access = await lessonAccess(req.user, req.params.lessonId);
    if (access.ok) return access;
    if (access.status === 403 && access.body.code !== 'NOT_ENROLLED') res.status(403).json(access.body);
    else res.status(404).json({ message: 'Quiz not found for this lesson' });
    return null;
};

// A lesson whose quiz is missing, or was saved with no questions: there is
// nothing to pass, so the player lets the lesson be marked done instead.
const noQuiz = (res) => res.status(404).json({ code: 'NO_QUIZ', message: 'This lesson has no quiz questions yet.' });

// @desc    Get quiz for a specific lesson (Student view - hides correct answers)
// @route   GET /api/user/lessons/:lessonId/quiz
// @access  Private/User
const getQuizForStudent = async (req, res) => {
    try {
        if (!(await quizGate(req, res))) return;
        const quiz = await Quiz.findOne({ lessonId: req.params.lessonId }).lean();
        if (!quiz || !(quiz.questions || []).length) return noQuiz(res);

        // Security: Remove correctAnswerIndex and explanation before sending to client
        const safeQuestions = quiz.questions.map(q => ({
            _id: q._id,
            questionText: q.questionText,
            options: q.options
        }));

        res.json({
            _id: quiz._id,
            lessonId: quiz.lessonId,
            passingScore: quiz.passingScore,
            questions: safeQuestions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Submit quiz answers and get score
// @route   POST /api/user/lessons/:lessonId/quiz/submit
// @access  Private/User
const submitQuizAnswers = async (req, res) => {
    try {
        const { answers } = req.body; // Array of selected indices matching question order
        const access = await quizGate(req, res);
        if (!access) return;
        const quiz = await Quiz.findOne({ lessonId: req.params.lessonId });
        if (!quiz || !quiz.questions.length) return noQuiz(res);

        if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
            return res.status(400).json({ message: 'Invalid answers payload' });
        }

        let correctCount = 0;
        const marked = quiz.questions.map((q, index) => {
            const isCorrect = answers[index] === q.correctAnswerIndex;
            if (isCorrect) correctCount++;
            return { q, index, isCorrect };
        });

        const total = quiz.questions.length;
        // Shown rounded; passed on the exact share. A rounded score let a
        // 79.5% attempt through an 80% pass mark.
        const scorePercentage = Math.round((correctCount / total) * 100);
        const passed = correctCount * 100 >= quiz.passingScore * total;

        // The review — every right answer and its explanation — only once the
        // quiz is passed. A failed attempt used to send them all back, so the
        // next attempt could simply copy them: it now hears which questions
        // it got right and wrong, and nothing more.
        const results = marked.map(({ q, index, isCorrect }) => (passed
            ? { questionId: q._id, providedAnswer: answers[index], correctAnswer: q.correctAnswerIndex, isCorrect, explanation: q.explanation }
            : { questionId: q._id, providedAnswer: answers[index], isCorrect }));

        let creditsEarned = 0;
        let totalCredits = 0;
        const rewards = { events: [] };

        try {
            const settings = await Setting.findOne();
            const isCreditSystemEnabled = settings ? settings.isCreditSystemEnabled : true;

            const User = require('../models/User');
            const Progress = require('../models/Progress');
            totalCredits = (await User.findById(req.user._id).select('credits').lean())?.credits || 0;
            const courseId = String(access.course._id);

            // Atomic find-or-create, so a quiz submitted twice at once
            // cannot leave two progress rows for the course.
            const progress = await Progress.findOrCreate(req.user._id, courseId);

            // The first attempt earns credits, pass or fail — once. The
            // attempt is marked in the same step that checks it, so two
            // submits at once cannot both find it unmarked and both be paid.
            // The amount (the score, as a number of credits) is unchanged
            // here: what a first attempt should be worth is a product
            // decision still to be made.
            if (isCreditSystemEnabled) {
                const first = await Progress.updateOne(
                    { _id: progress._id, attemptedQuizzesForCredit: { $ne: quiz._id } },
                    { $push: { attemptedQuizzesForCredit: quiz._id } }
                );
                if (first.modifiedCount === 1) {
                    creditsEarned = scorePercentage;
                    const paid = await User.findByIdAndUpdate(req.user._id, { $inc: { credits: creditsEarned } }, { returnDocument: 'after' }).select('credits').lean();
                    totalCredits = paid?.credits ?? totalCredits + creditsEarned;
                }
            }

            // Standard pass logic (independent of credits)
            if (passed) await Progress.updateOne({ _id: progress._id }, { $addToSet: { passedQuizzes: quiz._id } });

            // Rewards: completing a quiz pays once, passing it pays once
            // more; the activity ledger makes retakes free of both.
            const { safeRecordActivity } = require('../rewards/services/activityService');
            const done = await safeRecordActivity({ userId: req.user._id, type: 'quiz_complete', refId: quiz._id, courseId, meta: { score: scorePercentage, passed } });
            rewards.events.push(...done.events);
            if (passed) {
                const won = await safeRecordActivity({ userId: req.user._id, type: 'quiz_pass', refId: quiz._id, courseId, meta: { score: scorePercentage } });
                rewards.events.push(...won.events);
            }
        } catch (err) {
            console.error('Error awarding credits/progress:', err);
        }

        res.json({
            score: scorePercentage,
            correctCount,
            totalQuestions: total,
            passed,
            creditsEarned,
            // The balance after this attempt, as the server has it: the page
            // shows this rather than adding the credits to its own copy.
            totalCredits,
            rewards,
            results
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

/* ── Global quiz ──────────────────────────────────────────────────────────
 *
 * A general-knowledge paper drawn from the bank an administrator writes in
 * the admin dashboard. It is deliberately NOT built from the quizzes inside
 * courses: those belong to their lessons, are already scored there, and would
 * make this a re-run of work the student has done rather than something new.
 *
 * Each student gets ONE attempt at the published quiz (see GlobalQuizAttempt):
 * Start opens it, every marked answer is kept, and asking for the score or
 * running out of time closes it. Nothing else is recorded: no credits, no
 * course progress, no pass marks, no reward activity.
 */

// The largest paper a quiz can be (see GlobalQuiz's size limit).
const MAX_QUESTIONS = 50;
// The clock runs on the student's device; a few seconds' grace covers the
// last answer's trip to the server.
const TIME_GRACE_MS = 5000;

const shuffle = (rows) => {
    const out = [...rows];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
};
/** The quiz's questions in the order an attempt fixed; any added since go last. */
const inOrder = (order, rows) => {
    const pos = new Map((order || []).map((id, i) => [String(id), i]));
    return [...rows].sort((a, b) => (pos.get(String(a._id)) ?? Number.MAX_SAFE_INTEGER) - (pos.get(String(b._id)) ?? Number.MAX_SAFE_INTEGER));
};
// The answers stay on the server; the client sends the ids back to be marked.
const safeQuestion = (q) => ({ questionId: String(q._id), questionText: q.question, options: q.options, category: q.category || 'General', difficulty: q.difficulty || 'medium' });

const quizConfig = async () => (await Setting.findOne().select('globalQuiz').lean())?.globalQuiz || {};
// The demo cards see every section, the quiz included (services/fullAccess.js).
const { hasFullAccess } = require('../services/fullAccess');
const quizOff = (res) => res.status(403).json({ code: 'GLOBAL_QUIZ_OFF', message: 'The global quiz is currently unavailable.' });

const timeUp = (attempt, quiz) => (quiz.timeLimitMinutes || 0) > 0 && Date.now() - attempt.startedAt.getTime() > quiz.timeLimitMinutes * 60_000 + TIME_GRACE_MS;

/**
 * Close an attempt and score it out of the whole paper: each question once,
 * the first answer standing, only questions on the paper (GlobalQuizAttempt
 * holds the rules). Answers `{ attempt, closedNow }` — whether this call is
 * the one that closed it.
 */
const closeAttempt = async (attempt, live, { timedOut = false } = {}) => attempt.closeAndScore({
    total: live.questions.length,
    timedOut,
    timeLimitMinutes: live.quiz.timeLimitMinutes || 0,
    winScore: await GlobalQuizAttempt.currentWinScore(),
    paperIds: new Set([...live.questions.map((q) => String(q._id)), ...(attempt.order || []).map(String)])
});

/**
 * The attempt as the student app reads it. `byId` holds the quiz's questions,
 * so each answer the student gave comes back with its mark and explanation —
 * what they were already shown when it was marked. The first answer to a
 * question is the one shown, as it is the one that counts.
 */
const attemptView = (attempt, byId) => {
    if (!attempt) return null;
    const finished = !!attempt.finishedAt;
    const answers = {};
    for (const a of attempt.countedAnswers()) {
        const q = byId[String(a.questionId)];
        answers[String(a.questionId)] = {
            questionId: String(a.questionId), questionText: q?.question || '',
            providedAnswer: a.answer, correctAnswer: q ? q.correctAnswerIndex : null,
            isCorrect: a.isCorrect, explanation: q?.explanation || ''
        };
    }
    return {
        status: finished ? 'finished' : 'open',
        startedAt: attempt.startedAt, finishedAt: attempt.finishedAt,
        elapsedMs: Math.max(0, (finished ? attempt.finishedAt : new Date()) - attempt.startedAt),
        timedOut: !!attempt.timedOut, answers,
        correctCount: attempt.correctCount, totalQuestions: attempt.totalQuestions, score: attempt.score
    };
};

/**
 * The published paper, the student's attempt at it (if any), and the
 * questions by id. An open attempt whose time has run out closes now, so a
 * reload cannot stretch the clock (`closedNow` says it was this call); a
 * closed one stored with a repeated answer counted twice is put right.
 */
const paperFor = async (user) => {
    const live = await livePaper();
    if (!live) return { live: null, attempt: null, byId: {}, closedNow: false };
    const byId = Object.fromEntries(live.questions.map((q) => [String(q._id), q]));
    let attempt = await GlobalQuizAttempt.findOne({ userId: user._id, quizId: live.quiz._id });
    let closedNow = false;
    if (attempt && !attempt.finishedAt && timeUp(attempt, live.quiz)) ({ attempt, closedNow } = await closeAttempt(attempt, live, { timedOut: true }));
    else if (attempt?.finishedAt) await attempt.repairScore();
    return { live, attempt, byId, closedNow };
};

// @desc    The published Global Quiz. The administrator decides the paper —
//          its questions, how many, how long — so every student gets all of
//          it. With an attempt under way or finished, the questions come in
//          that attempt's order and the attempt comes with them. A `limit`
//          sent by an older client is not applied.
// @route   GET /api/user/quizzes/global
// @access  Private/User
const closesAtOf = (quiz) => require('../models/GlobalQuiz').closesAt(quiz);
const isClosed = (quiz) => { const at = closesAtOf(quiz); return !!at && Date.now() >= at.getTime(); };

const getGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        // No published quiz: an empty paper, which the student app already
        // shows as "No quiz questions yet".
        const { live, attempt, byId } = await paperFor(req.user);
        const pool = live ? live.questions : [];
        const picked = (attempt ? inOrder(attempt.order, pool) : shuffle(pool)).slice(0, MAX_QUESTIONS);
        res.json({
            questions: picked.map(safeQuestion),
            available: pool.length,
            categories: [...new Set(pool.map((q) => q.category || 'General'))],
            quiz: live ? {
                title: live.quiz.title, description: live.quiz.description, timeLimitMinutes: live.quiz.timeLimitMinutes || 0,
                // The admin's day limit: when new attempts stop, and whether they already have.
                closesAt: closesAtOf(live.quiz), closed: isClosed(live.quiz)
            } : null,
            attempt: attemptView(attempt, byId)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Open the student's one attempt at the published quiz. Pressing
//          Start again resumes the same attempt; a finished one is refused.
// @route   POST /api/user/quizzes/global/start
// @access  Private/User
const startGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const found = await paperFor(req.user);
        const { live, byId } = found;
        let { attempt } = found;
        if (!live || !live.questions.length) return res.status(404).json({ message: 'No quiz is published right now.' });
        // Past the admin's day limit no new attempt opens; one already under
        // way (resumed here) can still be finished.
        if (!attempt && isClosed(live.quiz)) {
            const closed = closesAtOf(live.quiz);
            return res.status(403).json({ code: 'QUIZ_CLOSED', message: `This quiz closed on ${closed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Watch for the next one.` });
        }
        if (attempt?.finishedAt) {
            return res.status(409).json({ code: attempt.timedOut ? 'TIME_UP' : 'ALREADY_ATTEMPTED', message: 'You have already taken this quiz. Each quiz can be taken once.', attempt: attemptView(attempt, byId) });
        }
        let created = false;
        if (!attempt) {
            // Wallet rules: opening the attempt is the priced moment (once per
            // quiz — the reference is the quiz), refunded if no attempt is made.
            let charge = null;
            // The student agrees to the price first (walletRuleService.askFirst).
            if (await askFirst(req, res, { action: 'start_global_quiz', referenceKey: String(live.quiz._id) })) return;
            try {
                charge = await chargeFor({ userId: req.user._id, action: 'start_global_quiz', referenceKey: String(live.quiz._id) });
            } catch (err) {
                if (err.code === 'INSUFFICIENT_FUNDS') return sendShort(res, err);
                throw err;
            }
            if (charge?.charged > 0) res.setHeader('X-Wallet-Charged', String(charge.charged));
            try {
                attempt = await GlobalQuizAttempt.create({ userId: req.user._id, quizId: live.quiz._id, order: shuffle(live.questions).map((q) => q._id), startedAt: new Date() });
                created = true;
            } catch (err) {
                // Two taps at once: the first one's attempt is the attempt.
                if (err.code !== 11000) { await refundCharge({ userId: req.user._id, charge, action: 'start_global_quiz' }).catch(() => {}); throw err; }
                attempt = await GlobalQuizAttempt.findOne({ userId: req.user._id, quizId: live.quiz._id });
            }
        }
        res.status(created ? 201 : 200).json({
            attempt: attemptView(attempt, byId),
            questions: inOrder(attempt.order, live.questions).slice(0, MAX_QUESTIONS).map(safeQuestion)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Mark answers, as part of the student's open attempt at the
//          published quiz: each one is kept, and the first answer to a
//          question is the one that stands. Without an open attempt nothing
//          is marked. Marking used to work with no attempt at all ("an older
//          app"), and it marked any question in the bank — answers and
//          explanations included — with no attempt, clock or one-try rule.
// @route   POST /api/user/quizzes/global/submit
// @access  Private/User
const submitGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const answers = Array.isArray(req.body?.answers) ? req.body.answers.slice(0, MAX_QUESTIONS) : null;
        if (!answers || !answers.length) return res.status(400).json({ message: 'Answer at least one question first.' });

        const { live, attempt: found, byId: liveById } = await paperFor(req.user);
        if (!live || !found) return res.status(409).json({ code: 'NO_ATTEMPT', message: 'Start the quiz first.' });
        if (found.finishedAt) {
            return res.status(409).json({ code: found.timedOut ? 'TIME_UP' : 'ALREADY_ATTEMPTED', message: found.timedOut ? 'Time is up for this quiz.' : 'You have already taken this quiz.', attempt: attemptView(found, liveById) });
        }

        // Each question once, and only questions on this paper. The same
        // question sent many times in one go used to be stored, and scored,
        // as many answers.
        const asked = new Map();
        for (const a of answers) {
            const id = String(a?.questionId ?? '');
            if (!liveById[id] || asked.has(id)) continue;
            asked.set(id, Number.isInteger(a.answer) ? a.answer : null);
        }
        if (!asked.size) return res.status(400).json({ message: 'Those questions are not in this quiz.' });

        // Each answer is added only if the question has none yet and the
        // attempt is still open, in one step: two submissions at once cannot
        // both add an answer to the same question.
        for (const [id, given] of asked) {
            const q = liveById[id];
            await GlobalQuizAttempt.updateOne(
                { _id: found._id, finishedAt: null, 'answers.questionId': { $ne: q._id } },
                { $push: { answers: { questionId: q._id, answer: given, isCorrect: given === q.correctAnswerIndex } } }
            );
        }
        const attempt = (await GlobalQuizAttempt.findById(found._id)) || found;
        const kept = Object.fromEntries(attempt.countedAnswers().map((a) => [String(a.questionId), a]));

        let correctCount = 0;
        const results = [...asked.keys()].filter((id) => kept[id]).map((id) => {
            const q = liveById[id];
            // The answer on record is the one that counts, whatever is sent now.
            const { answer, isCorrect } = kept[id];
            if (isCorrect) correctCount++;
            return {
                questionId: id, questionText: q.question,
                providedAnswer: answer, correctAnswer: q.correctAnswerIndex,
                isCorrect, explanation: q.explanation || ''
            };
        });
        // Closed meanwhile (time up, or finished on another screen) before any of these was kept.
        if (!results.length) {
            return res.status(409).json({ code: attempt.timedOut ? 'TIME_UP' : 'ALREADY_ATTEMPTED', message: attempt.timedOut ? 'Time is up for this quiz.' : 'You have already taken this quiz.', attempt: attemptView(attempt, liveById) });
        }
        res.json({
            score: Math.round((correctCount / results.length) * 100),
            correctCount, totalQuestions: results.length, results,
            practiceOnly: true,
            attempt: attemptView(attempt, liveById)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Close the attempt: the score is final, and the quiz cannot be
//          taken again. Closing a closed attempt just reports it.
// @route   POST /api/user/quizzes/global/finish
// @access  Private/User
const finishGlobalQuiz = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const found = await paperFor(req.user);
        const { live, byId } = found;
        let { attempt, closedNow } = found;
        if (!live || !attempt) return res.status(404).json({ message: 'Start the quiz first.' });
        if (!attempt.finishedAt) ({ attempt, closedNow } = await closeAttempt(attempt, live, { timedOut: !!req.body?.timedOut || timeUp(attempt, live.quiz) }));

        // A win — a final score at or above the win score in force when the
        // attempt closed, decided then and kept on it — pays the "Win the
        // Global Quiz" XP rule, once per quiz (the activity ledger refuses
        // the same quiz twice). Nothing is a win while Rewards is off: the
        // history says the same. Never a reason to fail the finish.
        const events = [];
        // One closed before wins were kept on the attempt is decided now, once.
        if (attempt.won == null) await attempt.decideWin(await GlobalQuizAttempt.currentWinScore());
        const paid = await GlobalQuizAttempt.payWin(attempt);
        events.push(...paid.events);
        const win = { won: !!attempt.won, winScore: attempt.winScore ?? null, xp: paid.xp };

        // "Finish the Global Quiz" (an optional rule) is paid by the request
        // that closed the attempt, once per quiz. It used to be paid for any
        // successful Finish, keyed by the day, so pressing Finish on an
        // already-closed attempt paid it again every day.
        if (closedNow) {
            const { recordIfRuled } = require('../rewards/services/xpHooks');
            const done = await recordIfRuled({ userId: req.user._id, type: 'global_quiz_complete', refId: `global-complete:${live.quiz._id}`, meta: { score: attempt.score } });
            if (done?.events) events.push(...done.events);
        }
        // The XP events, so the app can show them and re-read its figures.
        res.json({ attempt: attemptView(attempt, byId), win, rewards: { events } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// How many past attempts the history returns. A quiz a week is a year of them.
const HISTORY_LIMIT = 60;

// @desc    The student's finished Global Quiz attempts, newest first: each
//          quiz's title, when it was taken, and how it went. The published
//          quiz's own attempt is flagged `current`, since the tab shows that
//          one as its result card already. A quiz an administrator has since
//          deleted keeps its row: the attempt is still the student's.
// @route   GET /api/user/quizzes/global/history
// @access  Private/User
const getGlobalQuizHistory = async (req, res) => {
    try {
        const config = await quizConfig();
        if (config.enabled === false && !hasFullAccess(req.user)) return quizOff(res);
        const GlobalQuiz = require('../models/GlobalQuiz');
        const live = await GlobalQuiz.findOne({ status: 'published' }).sort({ publishedAt: -1 }).select('_id').lean();

        // An attempt left open at a quiz that is no longer the published one
        // could never be finished (Finish needs the published quiz) and so
        // was never listed. Unpublishing closes them now; one left open from
        // before that is closed here, scored as it stood.
        const stranded = await GlobalQuizAttempt.find({ userId: req.user._id, finishedAt: null, ...(live ? { quizId: { $ne: live._id } } : {}) }).select('quizId').lean();
        for (const quizId of new Set(stranded.map((a) => String(a.quizId)))) {
            const quiz = await GlobalQuiz.findById(quizId).select('_id timeLimitMinutes').lean();
            if (quiz) await GlobalQuizAttempt.closeOpenAt(quiz);
        }

        const rows = await GlobalQuizAttempt.find({ userId: req.user._id, finishedAt: { $ne: null } })
            .sort({ finishedAt: -1 })
            .limit(HISTORY_LIMIT)
            .populate('quizId', 'title');

        // Whether each one was a win is decided when it closes and kept on it
        // (the same rule Finish pays XP by). One closed before that was kept
        // is decided now, by the win score in force, and kept from here on.
        // Nothing is called a win while Rewards is off.
        const winScore = await GlobalQuizAttempt.currentWinScore();
        for (const a of rows) {
            await a.repairScore();
            await a.decideWin(winScore);
        }

        res.json({
            winScore,
            attempts: rows.map((a) => ({
                id: String(a._id),
                quizId: a.quizId?._id ? String(a.quizId._id) : String(a.quizId),
                title: a.quizId?.title || 'A past quiz',
                finishedAt: a.finishedAt,
                elapsedMs: Math.max(0, new Date(a.finishedAt) - new Date(a.startedAt)),
                timedOut: !!a.timedOut,
                correctCount: a.correctCount || 0,
                totalQuestions: a.totalQuestions || 0,
                score: a.score || 0,
                won: !!a.won,
                current: !!live && String(a.quizId?._id || a.quizId) === String(live._id)
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Just whether a Global Quiz is live, for the "a new quiz is out"
//          notice every page checks every minute: its title and dates and
//          whether this student has taken it — no questions, so it is cheap
//          to ask often. Nothing while the Global Quiz is switched off.
// @route   GET /api/user/quizzes/global/live
// @access  Private/User
const getGlobalQuizLive = async (req, res) => {
    try {
        const all = require('../services/fullAccess').hasFullAccess(req.user);
        if (!all && (await quizConfig()).enabled === false) return res.json({ quiz: null });
        await require('../services/globalQuizService').ensureMigrated();
        const quiz = await require('../models/GlobalQuiz').findOne({ status: 'published' }).sort({ publishedAt: -1 })
            .select('title description publishedAt openDays').lean();
        if (!quiz) return res.json({ quiz: null });
        const attempted = await GlobalQuizAttempt.exists({ userId: req.user._id, quizId: quiz._id });
        res.json({
            quiz: {
                id: String(quiz._id), title: quiz.title, description: quiz.description || '',
                publishedAt: quiz.publishedAt, closesAt: closesAtOf(quiz), closed: isClosed(quiz), attempted: !!attempted
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getGlobalQuizLive,
    getQuizForStudent,
    submitQuizAnswers,
    getGlobalQuiz,
    startGlobalQuiz,
    submitGlobalQuiz,
    finishGlobalQuiz,
    getGlobalQuizHistory
};
