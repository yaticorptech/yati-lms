/**
 * @description The Global Quiz question bank, as the administrator manages it.
 *
 * The bank is general knowledge: questions that belong to no course, written
 * here and drawn by every student. Answers are visible on these routes, which
 * is why they sit behind protectAdmin — the student routes never send them.
 */
const GlobalQuestion = require('../models/GlobalQuestion');

const MAX_OPTIONS = 6;

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
            difficulty: ['easy', 'medium', 'hard'].includes(body?.difficulty) ? body.difficulty : 'medium',
            isPublished: body?.isPublished !== false
        }
    };
};

// @desc    The whole bank, with its answers
// @route   GET /api/admin/global-quiz
// @access  Private/Admin
const listQuestions = async (req, res) => {
    try {
        const questions = await GlobalQuestion.find({}).sort({ createdAt: -1 }).lean();
        const published = questions.filter((q) => q.isPublished !== false);
        res.json({
            totals: {
                questions: questions.length,
                published: published.length,
                drafts: questions.length - published.length,
                categories: new Set(published.map((q) => q.category || 'General')).size
            },
            questions
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add a question to the bank
// @route   POST /api/admin/global-quiz
// @access  Private/Admin
const createQuestion = async (req, res) => {
    try {
        const { error, value } = readQuestion(req.body);
        if (error) return res.status(400).json({ message: error });
        const created = await GlobalQuestion.create({ ...value, createdBy: req.admin?._id || null });
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Rewrite a question
// @route   PUT /api/admin/global-quiz/:id
// @access  Private/Admin
const updateQuestion = async (req, res) => {
    try {
        const { error, value } = readQuestion(req.body);
        if (error) return res.status(400).json({ message: error });
        const updated = await GlobalQuestion.findByIdAndUpdate(req.params.id, { $set: value }, { new: true });
        if (!updated) return res.status(404).json({ message: 'No such question.' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Remove a question from the bank
// @route   DELETE /api/admin/global-quiz/:id
// @access  Private/Admin
const deleteQuestion = async (req, res) => {
    try {
        const removed = await GlobalQuestion.findByIdAndDelete(req.params.id);
        if (!removed) return res.status(404).json({ message: 'No such question.' });
        res.json({ ok: true, id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { listQuestions, createQuestion, updateQuestion, deleteQuestion };
