/**
 * Aptitude practice — /api/interview/aptitude (asked 2026-10-22). Sets of ten
 * questions pitched to the student's level (aptitude.js), answered one at a
 * time: each answer comes back right or wrong with its explanation.
 *
 *   GET  /                        the section: its name for this student, the sections, scores, an unfinished set
 *   POST /sets { section }        a new set (an unfinished one is left as abandoned)
 *   GET  /sets/:id                one set: its questions, and the answers to the ones already answered
 *   POST /sets/:id/answer { id, choice }   answer one question → right or wrong, the answer, the explanation
 *
 * Mounted inside the interview router, behind its sign-in and rate limit. A
 * student only ever reaches their own sets, and a question's answer leaves
 * the server only once they have chosen.
 */
const express = require('express');
const mongoose = require('mongoose');
const { AptitudeSet } = require('./models');
const { levelOf } = require('./studentContext');
const { makeSet, sectionsFor, titleFor, SECTION_IDS, SET_SIZE } = require('./aptitude');

const router = express.Router();

// The level in a few words, for "Questions for Class 10".
const SHORT = { primary: 'Primary School', middle: 'Middle School', high: 'High School', senior: 'Higher Secondary', diploma: 'diploma students', undergraduate: 'college students', postgraduate: 'postgraduate students', professional: 'working professionals' };
const shortLevel = (level) => (level.classNo ? `Class ${level.classNo}` : SHORT[level.key] || '');
const pct = (s) => (s.questions.length ? Math.round((s.correct / s.questions.length) * 100) : 0);

const publicSet = (s, level) => {
    const answered = s.questions.filter((q) => q.chosen !== null).length;
    return {
        id: String(s._id), title: titleFor(level), section: s.section,
        sectionLabel: (sectionsFor(level).find((x) => x.id === s.section) || {}).label || s.section,
        status: s.status, total: s.questions.length, answered, correct: s.correct, percent: pct(s),
        questions: s.questions.map((q) => ({
            id: q.id, section: q.section, topic: q.topic, question: q.question, options: q.options, difficulty: q.difficulty, faq: !!q.faq, chosen: q.chosen,
            ...(q.chosen !== null ? { answer: q.answer, explanation: q.explanation, right: q.chosen === q.answer } : {})
        })),
        createdAt: s.createdAt, completedAt: s.completedAt
    };
};

/** Best and last scores, for this page and the Interview dashboard's card. */
const summary = async (userId) => {
    const done = await AptitudeSet.find({ userId, status: 'completed' }).sort({ completedAt: -1 }).select('section correct questions.id completedAt').lean();
    const percents = done.map(pct);
    return {
        sets: done.length,
        best: percents.length ? Math.max(...percents) : null,
        last: done[0] ? { correct: done[0].correct, total: done[0].questions.length, percent: percents[0], section: done[0].section, completedAt: done[0].completedAt } : null,
        recent: done.slice(0, 5).map((s, i) => ({ id: String(s._id), section: s.section, correct: s.correct, total: s.questions.length, percent: percents[i], completedAt: s.completedAt }))
    };
};

const own = (req) => (mongoose.isValidObjectId(req.params.id) ? AptitudeSet.findOne({ _id: req.params.id, userId: req.user._id }) : null);

router.get('/', async (req, res, next) => {
    try {
        const level = await levelOf(req.user._id);
        const [stats, open] = await Promise.all([summary(req.user._id), AptitudeSet.findOne({ userId: req.user._id, status: 'open' }).sort({ createdAt: -1 }).lean()]);
        res.json({
            title: titleFor(level), school: level.school, level: shortLevel(level), placed: level.key !== 'general',
            sections: sectionsFor(level), setSize: SET_SIZE, stats,
            open: open ? { id: String(open._id), section: open.section, answered: open.questions.filter((q) => q.chosen !== null).length, total: open.questions.length } : null
        });
    } catch (err) { next(err); }
});

router.post('/sets', async (req, res, next) => {
    try {
        const section = String(req.body?.section || 'mixed');
        if (section !== 'mixed' && !SECTION_IDS.includes(section)) return res.status(400).json({ message: 'Pick a valid section.' });
        const level = await levelOf(req.user._id);
        await AptitudeSet.updateMany({ userId: req.user._id, status: 'open' }, { $set: { status: 'abandoned' } });
        const questions = makeSet({ level, section, seed: Math.floor(Math.random() * 2 ** 31) });
        const set = await AptitudeSet.create({ userId: req.user._id, level: level.key, section, questions });
        res.status(201).json(publicSet(set, level));
    } catch (err) { next(err); }
});

router.get('/sets/:id', async (req, res, next) => {
    try {
        const set = await own(req);
        if (!set) return res.status(404).json({ message: 'That set was not found.' });
        res.json(publicSet(set, await levelOf(req.user._id)));
    } catch (err) { next(err); }
});

router.post('/sets/:id/answer', async (req, res, next) => {
    try {
        const set = await own(req);
        if (!set) return res.status(404).json({ message: 'That set was not found.' });
        if (set.status !== 'open') return res.status(409).json({ message: 'This set is already finished.' });
        const q = set.questions.find((x) => x.id === String(req.body?.id || ''));
        if (!q) return res.status(400).json({ message: 'That question is not in this set.' });
        const choice = Number(req.body?.choice);
        if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return res.status(400).json({ message: 'Pick one of the options.' });
        // One answer per question: a second tap after the answer is shown changes nothing.
        if (q.chosen === null) {
            q.chosen = choice; q.answeredAt = new Date();
            set.correct = set.questions.filter((x) => x.chosen !== null && x.chosen === x.answer).length;
            if (set.questions.every((x) => x.chosen !== null)) { set.status = 'completed'; set.completedAt = new Date(); }
            set.markModified('questions');
            await set.save();
        }
        res.json({ result: { right: q.chosen === q.answer, answer: q.answer, explanation: q.explanation }, set: publicSet(set, await levelOf(req.user._id)) });
    } catch (err) { next(err); }
});

module.exports = { router, summary, titleFor, levelOf };
