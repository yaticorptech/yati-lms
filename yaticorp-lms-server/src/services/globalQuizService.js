/**
 * The Global Quiz's shared pieces: moving questions from before quizzes
 * existed into quizzes, and finding the one quiz students are given.
 */
const GlobalQuiz = require('../models/GlobalQuiz');
const GlobalQuestion = require('../models/GlobalQuestion');

const clampSize = (n) => Math.min(GlobalQuiz.SIZE_MAX, Math.max(GlobalQuiz.SIZE_MIN, n));

/**
 * Questions written before quizzes existed have no quiz. The first time the
 * quiz is read they are moved into one, so nothing an administrator wrote is
 * lost and students keep getting the same questions:
 *   - the published ones become "Global Quiz", published (unless a quiz is
 *     already published, in which case it stays a draft);
 *   - the drafts become a separate draft quiz, to finish and publish later.
 * One run per process, shared by concurrent callers.
 */
let migration = null;
const ensureMigrated = () => {
    if (!migration) {
        migration = (async () => {
            const loose = await GlobalQuestion.find({ $or: [{ quizId: null }, { quizId: { $exists: false } }] }).select('_id isPublished').lean();
            if (!loose.length) return;
            const live = loose.filter((q) => q.isPublished !== false);
            const drafts = loose.filter((q) => q.isPublished === false);
            const alreadyLive = await GlobalQuiz.exists({ status: 'published' });
            if (live.length) {
                const quiz = await GlobalQuiz.create({
                    title: 'Global Quiz', description: 'The questions written before quizzes could be kept separately.',
                    size: clampSize(live.length),
                    status: alreadyLive ? 'draft' : 'published', publishedAt: alreadyLive ? null : new Date()
                });
                await GlobalQuestion.updateMany({ _id: { $in: live.map((q) => q._id) } }, { $set: { quizId: quiz._id } });
            }
            if (drafts.length) {
                const quiz = await GlobalQuiz.create({ title: 'Drafts from the old bank', description: 'Questions that were held back before quizzes existed.', size: clampSize(drafts.length) });
                await GlobalQuestion.updateMany({ _id: { $in: drafts.map((q) => q._id) } }, { $set: { quizId: quiz._id, isPublished: true } });
            }
        })().catch((err) => { migration = null; throw err; });
    }
    return migration;
};

/** The published quiz and its questions, or null when none is published. */
const livePaper = async () => {
    await ensureMigrated();
    const quiz = await GlobalQuiz.findOne({ status: 'published' }).sort({ publishedAt: -1 }).lean();
    if (!quiz) return null;
    const questions = await GlobalQuestion.find({ quizId: quiz._id }).lean();
    return { quiz, questions };
};

module.exports = { ensureMigrated, livePaper, clampSize };
