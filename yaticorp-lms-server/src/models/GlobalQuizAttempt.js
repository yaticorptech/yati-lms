/**
 * @description One student's one attempt at a Global Quiz.
 *
 * A quiz is taken once. The attempt opens when the student presses Start,
 * takes each answer as it is marked (the first answer to a question stands),
 * and closes when they ask for the score or the time runs out. The unique
 * index on student and quiz is the rule itself: a second attempt cannot be
 * created. Publishing a different quiz is a different paper, and a fresh
 * attempt.
 *
 * It records the attempt only — no credits, progress or reward activity come
 * from it, which is what keeps the Global Quiz practice.
 */
const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalQuestion', required: true },
    answer: { type: Number, default: null },
    isCorrect: { type: Boolean, default: false }
}, { _id: false });

const globalQuizAttemptSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'GlobalQuiz', required: true },
    // The paper's question order for this attempt, fixed at Start so a reload
    // brings the same paper back in the same order.
    order: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    answers: { type: [answerSchema], default: [] },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    timedOut: { type: Boolean, default: false },
    // Filled in when the attempt closes.
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    // Whether it was a win, and against what win score, decided when it
    // closed and kept: an administrator changing the win score later does
    // not rewrite past results. Null on attempts closed before this was kept.
    won: { type: Boolean, default: null },
    winScore: { type: Number, default: null }
}, { timestamps: true });

globalQuizAttemptSchema.index({ userId: 1, quizId: 1 }, { unique: true });

const pct = (correct, total) => (total > 0 ? Math.min(100, Math.max(0, Math.round((correct / total) * 100))) : 0);

/**
 * The answers that count: each question once — the first answer given
 * stands — and, with `paperIds`, only questions on the paper. One submission
 * carrying the same question many times used to store every copy, and each
 * right copy counted, so a score could pass 100%.
 */
globalQuizAttemptSchema.methods.countedAnswers = function (paperIds = null) {
    const seen = new Set();
    return (this.answers || []).filter((a) => {
        const id = String(a.questionId);
        if (seen.has(id)) return false;
        seen.add(id);
        return !paperIds || paperIds.has(id);
    });
};

/** Right answers and the score out of `total`, from the answers that count. */
globalQuizAttemptSchema.methods.tally = function (total, paperIds = null) {
    const correctCount = Math.min(total || 0, this.countedAnswers(paperIds).filter((a) => a.isCorrect).length);
    return { correctCount, score: pct(correctCount, total) };
};

/** The win score in force now (Rewards → Global Quiz), or null while Rewards is off. */
globalQuizAttemptSchema.statics.currentWinScore = async function () {
    try {
        const rewards = await require('../rewards/services/configService').getConfig();
        return rewards.enabled !== false ? Number(rewards.globalQuiz?.winScore ?? 60) : null;
    } catch {
        return null;
    }
};

/**
 * Close the attempt and score it out of the whole paper (`total` questions,
 * `paperIds` the ids on it). A timed-out attempt finishes when its time ran
 * out — not whenever it happened to be closed, which dated an attempt
 * reloaded a day later a day late. Whether it is a win is decided here too,
 * against `winScore` (null: Rewards off, never a win).
 *
 * Closed in one conditional write, so of two requests closing it at once
 * exactly one does: `closedNow` says whether this call was it. Answers
 * `{ attempt, closedNow }` with the attempt as stored.
 */
globalQuizAttemptSchema.methods.closeAndScore = async function ({ total, timedOut = false, timeLimitMinutes = 0, winScore = null, paperIds = null }) {
    const Attempt = this.constructor;
    if (this.finishedAt) return { attempt: this, closedNow: false };
    const now = new Date();
    const limitEnd = timeLimitMinutes > 0 ? new Date(this.startedAt.getTime() + timeLimitMinutes * 60_000) : null;
    const finishedAt = timedOut && limitEnd && limitEnd < now ? limitEnd : now;
    const { correctCount, score } = this.tally(total, paperIds);
    const won = winScore != null && score >= winScore;
    const closed = await Attempt.findOneAndUpdate(
        { _id: this._id, finishedAt: null },
        { $set: { finishedAt, timedOut: !!timedOut, totalQuestions: total, correctCount, score, won, winScore: winScore ?? null } },
        { returnDocument: 'after' }
    );
    if (closed) return { attempt: closed, closedNow: true };
    return { attempt: (await Attempt.findById(this._id)) || this, closedNow: false };
};

/**
 * Put right a closed attempt stored before repeated answers were refused: the
 * repeats dropped (the first answer stands) and the score worked out again
 * from what is left. Only an attempt that holds a repeat, or a figure that
 * cannot be right (more right answers than questions, a score past 100), is
 * touched. Answers whether it changed anything.
 */
globalQuizAttemptSchema.methods.repairScore = async function () {
    if (!this.finishedAt) return false;
    const unique = this.countedAnswers();
    const repeats = unique.length !== (this.answers || []).length;
    const impossible = (this.score || 0) > 100 || (this.correctCount || 0) > (this.totalQuestions || 0);
    if (!repeats && !impossible) return false;
    const { correctCount, score } = this.tally(this.totalQuestions);
    const update = { correctCount, score };
    if (repeats) update.answers = unique.map((a) => ({ questionId: a.questionId, answer: a.answer, isCorrect: a.isCorrect }));
    // A win decided on the inflated score is decided again on the real one.
    if (this.winScore != null) update.won = score >= this.winScore;
    await this.constructor.updateOne({ _id: this._id }, { $set: update });
    Object.assign(this, update);
    return true;
};

/**
 * For a closed attempt from before wins were kept on it: decide it now, by
 * the win score in force (`winScore`), and keep it from here on. Nothing is
 * decided — and nothing kept — while Rewards is off (null), so turning it on
 * later still decides it then. Answers whether it was a win.
 */
globalQuizAttemptSchema.methods.decideWin = async function (winScore) {
    if (this.won != null || !this.finishedAt || winScore == null) return !!this.won;
    this.won = (this.score || 0) >= winScore;
    this.winScore = winScore;
    await this.constructor.updateOne({ _id: this._id, won: null }, { $set: { won: this.won, winScore } });
    return this.won;
};

/**
 * Pay the "Win the Global Quiz" XP rule for a closed attempt that was a win,
 * once per quiz (the activity ledger refuses the same quiz twice), and only
 * while Rewards is on and the rule is above 0. Answers `{ xp, events }`: the
 * XP actually paid by this call, and the reward events for the student app.
 * Never throws.
 */
globalQuizAttemptSchema.statics.payWin = async function (attempt) {
    const none = { xp: 0, events: [] };
    try {
        if (!attempt?.won) return none;
        const rewards = await require('../rewards/services/configService').getConfig();
        const xp = Math.max(0, Math.round(Number(rewards.xpRules?.global_quiz_win) || 0));
        if (rewards.enabled === false || xp <= 0) return none;
        const { safeRecordActivity } = require('../rewards/services/activityService');
        const done = await safeRecordActivity({ userId: attempt.userId, type: 'global_quiz_win', refId: `global-win:${attempt.quizId}`, meta: { score: attempt.score } });
        return { xp: done && done.enabled && !done.duplicate && !done.error ? xp : 0, events: done?.events || [] };
    } catch (e) {
        console.error('[global quiz] win XP failed:', e.message);
        return none;
    }
};

/**
 * Close every attempt still open at `quiz`, scored as it stands: used when the
 * quiz stops being the published one, after which no student could finish it
 * (Finish needs a published quiz) and their answers sat in an attempt the
 * history never showed. One past its time limit is closed as timed out. A
 * win pays its XP as it would have at Finish. Answers the attempts closed.
 */
globalQuizAttemptSchema.statics.closeOpenAt = async function (quiz) {
    const open = await this.find({ quizId: quiz._id, finishedAt: null });
    if (!open.length) return [];
    const ids = (await require('./GlobalQuestion').find({ quizId: quiz._id }).select('_id').lean()).map((q) => String(q._id));
    const winScore = await this.currentWinScore();
    const limit = quiz.timeLimitMinutes || 0;
    const closed = [];
    for (const attempt of open) {
        const paperIds = new Set([...ids, ...(attempt.order || []).map(String)]);
        const r = await attempt.closeAndScore({
            total: ids.length || (attempt.order || []).length,
            timedOut: limit > 0 && Date.now() - attempt.startedAt.getTime() > limit * 60_000,
            timeLimitMinutes: limit, winScore, paperIds
        });
        if (r.closedNow) {
            closed.push(r.attempt);
            await this.payWin(r.attempt);
        }
    }
    return closed;
};

module.exports = mongoose.model('GlobalQuizAttempt', globalQuizAttemptSchema, 'global_quiz_attempts');
