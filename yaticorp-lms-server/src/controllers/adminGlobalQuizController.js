/**
 * @description The Global Quiz, as the administrator manages it: quizzes, and
 * the questions inside each.
 *
 * An administrator writes several quizzes — "Weekly GK, 5 questions",
 * "Aptitude, 10 questions" — each a draft until it is full and they publish
 * it. One quiz is published at a time; that is the paper every student gets.
 * Answers are visible on these routes, which is why they sit behind
 * protectAdmin — the student routes never send them.
 */
const mongoose = require('mongoose');
const GlobalQuiz = require('../models/GlobalQuiz');
const GlobalQuestion = require('../models/GlobalQuestion');
const { ensureMigrated } = require('../services/globalQuizService');

const MAX_OPTIONS = 6;

const fail = (res, error) => {
    if (error.name === 'CastError') return res.status(404).json({ message: 'No such quiz.' });
    res.status(500).json({ message: 'Server error', error: error.message });
};

/** Reads a question off the request, or explains what is wrong with it. */
const readQuestion = (body) => {
    const question = String(body?.question || '').trim();
    if (question.length < 5) return { error: 'Write the question out — at least a few words.' };
    const options = (Array.isArray(body?.options) ? body.options : []).map((o) => String(o || '').trim()).filter(Boolean).slice(0, MAX_OPTIONS);
    if (options.length < 2) return { error: 'A question needs at least two answers to choose between.' };
    const correctAnswerIndex = Number(body?.correctAnswerIndex);
    if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
        return { error: 'Mark which of those answers is the correct one.' };
    }
    return {
        value: {
            question, options, correctAnswerIndex,
            explanation: String(body?.explanation || '').trim().slice(0, 600),
            category: String(body?.category || '').trim().slice(0, 60) || 'General',
            difficulty: ['easy', 'medium', 'hard'].includes(body?.difficulty) ? body.difficulty : 'medium'
        }
    };
};

/** Reads a quiz's own fields; `current` is the question count it must fit. */
const readQuiz = (body, current = 0) => {
    const title = String(body?.title || '').trim().slice(0, 80);
    if (title.length < 2) return { error: 'Give the quiz a name.' };
    const size = Number(body?.size);
    if (!Number.isInteger(size) || size < GlobalQuiz.SIZE_MIN || size > GlobalQuiz.SIZE_MAX) {
        return { error: `A quiz holds between ${GlobalQuiz.SIZE_MIN} and ${GlobalQuiz.SIZE_MAX} questions.` };
    }
    if (size < current) return { error: `This quiz already has ${current} questions. Remove ${current - size} before making it ${size}.` };
    return { value: { title, size, description: String(body?.description || '').trim().slice(0, 300) } };
};

/** A quiz as the panel shows it: its fields, how full it is, what it covers. */
const withCounts = async (quizzes) => {
    const ids = quizzes.map((q) => q._id);
    const rows = await GlobalQuestion.aggregate([
        { $match: { quizId: { $in: ids } } },
        { $group: { _id: '$quizId', count: { $sum: 1 }, categories: { $addToSet: '$category' } } }
    ]);
    const by = Object.fromEntries(rows.map((r) => [String(r._id), r]));
    return quizzes.map((q) => {
        const r = by[String(q._id)];
        return { ...q, questionCount: r?.count || 0, categories: r?.categories || [] };
    });
};

const findQuiz = async (id) => (mongoose.isValidObjectId(id) ? GlobalQuiz.findById(id) : null);

/* ── Quizzes ──────────────────────────────────────────────────────────── */

// @desc    Every quiz, the published one first, with how full each is
// @route   GET /api/admin/global-quiz/quizzes
const listQuizzes = async (req, res) => {
    try {
        await ensureMigrated();
        const quizzes = await GlobalQuiz.find({}).sort({ status: -1, updatedAt: -1 }).lean();
        res.json({ quizzes: await withCounts(quizzes), limits: { min: GlobalQuiz.SIZE_MIN, max: GlobalQuiz.SIZE_MAX } });
    } catch (error) { fail(res, error); }
};

// @desc    Start a new quiz, as a draft
// @route   POST /api/admin/global-quiz/quizzes
const createQuiz = async (req, res) => {
    try {
        const { error, value } = readQuiz(req.body);
        if (error) return res.status(400).json({ message: error });
        const quiz = await GlobalQuiz.create({ ...value, createdBy: req.admin?._id || null });
        res.status(201).json({ ...quiz.toObject(), questionCount: 0, categories: [] });
    } catch (error) { fail(res, error); }
};

// @desc    Rename, re-describe or resize a quiz
// @route   PUT /api/admin/global-quiz/quizzes/:quizId
const updateQuiz = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const count = await GlobalQuestion.countDocuments({ quizId: quiz._id });
        const { error, value } = readQuiz(req.body, count);
        if (error) return res.status(400).json({ message: error });
        Object.assign(quiz, value);
        await quiz.save();
        res.json((await withCounts([quiz.toObject()]))[0]);
    } catch (error) { fail(res, error); }
};

// @desc    Delete a quiz and every question in it
// @route   DELETE /api/admin/global-quiz/quizzes/:quizId
const deleteQuiz = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const { deletedCount } = await GlobalQuestion.deleteMany({ quizId: quiz._id });
        await quiz.deleteOne();
        res.json({ ok: true, deletedQuestions: deletedCount, wasPublished: quiz.status === 'published' });
    } catch (error) { fail(res, error); }
};

// @desc    Make this the quiz students get. Only a full quiz can go out, and
//          whichever quiz was published before goes back to draft.
// @route   POST /api/admin/global-quiz/quizzes/:quizId/publish
const publishQuiz = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const count = await GlobalQuestion.countDocuments({ quizId: quiz._id });
        if (count < quiz.size) {
            return res.status(400).json({ code: 'QUIZ_NOT_FULL', message: `This quiz has ${count} of its ${quiz.size} questions. Add ${quiz.size - count} more, or make it smaller, before publishing.` });
        }
        await GlobalQuiz.updateMany({ _id: { $ne: quiz._id }, status: 'published' }, { $set: { status: 'draft', publishedAt: null } });
        quiz.status = 'published';
        quiz.publishedAt = new Date();
        await quiz.save();
        res.json((await withCounts([quiz.toObject()]))[0]);
    } catch (error) { fail(res, error); }
};

// @desc    Take a quiz back to draft; students then have no quiz until another is published
// @route   POST /api/admin/global-quiz/quizzes/:quizId/unpublish
const unpublishQuiz = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        quiz.status = 'draft';
        quiz.publishedAt = null;
        await quiz.save();
        res.json((await withCounts([quiz.toObject()]))[0]);
    } catch (error) { fail(res, error); }
};

// @desc    Copy a quiz and its questions into a new draft, to reuse or vary it
// @route   POST /api/admin/global-quiz/quizzes/:quizId/duplicate
const duplicateQuiz = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const copy = await GlobalQuiz.create({
            title: `Copy of ${quiz.title}`.slice(0, 80), description: quiz.description, size: quiz.size, createdBy: req.admin?._id || null
        });
        const questions = await GlobalQuestion.find({ quizId: quiz._id }).lean();
        if (questions.length) {
            await GlobalQuestion.insertMany(questions.map(({ _id, createdAt, updatedAt, __v, ...q }) => ({ ...q, quizId: copy._id, createdBy: req.admin?._id || null })));
        }
        res.status(201).json((await withCounts([copy.toObject()]))[0]);
    } catch (error) { fail(res, error); }
};

/* ── Questions in a quiz ──────────────────────────────────────────────── */

// @desc    One quiz with its questions and their answers
// @route   GET /api/admin/global-quiz/quizzes/:quizId/questions
const listQuestions = async (req, res) => {
    try {
        await ensureMigrated();
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const questions = await GlobalQuestion.find({ quizId: quiz._id }).sort({ createdAt: 1 }).lean();
        res.json({ quiz: (await withCounts([quiz.toObject()]))[0], questions });
    } catch (error) { fail(res, error); }
};

// @desc    Add a question to a quiz, while it has room
// @route   POST /api/admin/global-quiz/quizzes/:quizId/questions
const createQuestion = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const { error, value } = readQuestion(req.body);
        if (error) return res.status(400).json({ message: error });
        const count = await GlobalQuestion.countDocuments({ quizId: quiz._id });
        if (count >= quiz.size) {
            return res.status(409).json({ code: 'QUIZ_FULL', message: `This quiz already holds ${count} of ${quiz.size} questions. Remove one, or make the quiz bigger, to add another.` });
        }
        const created = await GlobalQuestion.create({ ...value, quizId: quiz._id, isPublished: true, createdBy: req.admin?._id || null });
        res.status(201).json(created);
    } catch (error) { fail(res, error); }
};

// @desc    Rewrite a question
// @route   PUT /api/admin/global-quiz/:id
const updateQuestion = async (req, res) => {
    try {
        const { error, value } = readQuestion(req.body);
        if (error) return res.status(400).json({ message: error });
        const updated = mongoose.isValidObjectId(req.params.id) ? await GlobalQuestion.findByIdAndUpdate(req.params.id, { $set: value }, { new: true }) : null;
        if (!updated) return res.status(404).json({ message: 'No such question.' });
        res.json(updated);
    } catch (error) { fail(res, error); }
};

// @desc    Remove a question
// @route   DELETE /api/admin/global-quiz/:id
const deleteQuestion = async (req, res) => {
    try {
        const removed = mongoose.isValidObjectId(req.params.id) ? await GlobalQuestion.findByIdAndDelete(req.params.id) : null;
        if (!removed) return res.status(404).json({ message: 'No such question.' });
        res.json({ ok: true, id: req.params.id });
    } catch (error) { fail(res, error); }
};

// @desc    Remove a whole set from one quiz: every question in a category, or
//          all of the quiz's questions
// @route   DELETE /api/admin/global-quiz/quizzes/:quizId/questions?category=<name>
//          DELETE /api/admin/global-quiz/quizzes/:quizId/questions?all=true
//
// A bare DELETE with neither is refused: emptying a quiz must be asked for by
// name, never be what a malformed request does by accident.
const deleteQuestions = async (req, res) => {
    try {
        const quiz = await findQuiz(req.params.quizId);
        if (!quiz) return res.status(404).json({ message: 'No such quiz.' });
        const all = req.query.all === 'true';
        const category = String(req.query.category || '').trim();
        if (!all && !category) return res.status(400).json({ message: 'Say which set to remove: a category, or all=true for the whole quiz.' });
        // Questions saved without a category are listed as "General".
        const byCategory = category === 'General'
            ? { $or: [{ category: 'General' }, { category: { $in: [null, ''] } }, { category: { $exists: false } }] }
            : { category };
        const { deletedCount } = await GlobalQuestion.deleteMany({ quizId: quiz._id, ...(all ? {} : byCategory) });
        if (!all && deletedCount === 0) return res.status(404).json({ message: 'No questions in that set.' });
        res.json({ ok: true, deleted: deletedCount, category: all ? null : category });
    } catch (error) { fail(res, error); }
};

module.exports = {
    listQuizzes, createQuiz, updateQuiz, deleteQuiz, publishQuiz, unpublishQuiz, duplicateQuiz,
    listQuestions, createQuestion, updateQuestion, deleteQuestion, deleteQuestions
};
