/**
 * Linguistic Ability — what administrators and college coordinators see of
 * students: progress, quiz results, lessons completed, and the writing and
 * translations waiting for review. Shared by the admin routes (every student)
 * and the organization routes (that college's students only: `scope`).
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const { LinguisticLesson, LinguisticProgress, LinguisticAttempt, LinguisticSubmission } = require('./models');
const svc = require('./service');
const { getConfig } = require('./config');

const idOf = (x) => String(x?._id ?? x);
const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PAGE = 20;

/** Students with Linguistic progress, newest activity first. `scope`: { organizationId } to limit to one college. */
const listStudents = async ({ search = '', page = 1, scope = {} } = {}) => {
    const userFilter = { ...scope };
    if (search.trim()) {
        const re = new RegExp(escape(search.trim()), 'i');
        userFilter.$or = [{ name: re }, { email: re }, { cardNumber: re }];
    }
    const limited = Object.keys(userFilter).length > 0;
    const ids = limited ? (await User.find(userFilter).select('_id').limit(5000).lean()).map((u) => u._id) : null;
    const filter = ids ? { userId: { $in: ids } } : {};
    const [total, rows, lessons] = await Promise.all([
        LinguisticProgress.countDocuments(filter),
        LinguisticProgress.find(filter).sort({ lastActiveAt: -1, updatedAt: -1 }).skip((Math.max(1, page) - 1) * PAGE).limit(PAGE).lean(),
        svc.publishedLessons()
    ]);
    const users = new Map((await User.find({ _id: { $in: rows.map((r) => r.userId) } }).select('name email cardNumber organizationId').lean()).map((u) => [idOf(u._id), u]));
    const pending = new Map((await LinguisticSubmission.aggregate([{ $match: { userId: { $in: rows.map((r) => r.userId) }, status: 'pending' } }, { $group: { _id: '$userId', n: { $sum: 1 } } }])).map((x) => [idOf(x._id), x.n]));
    return {
        total, page, pages: Math.max(1, Math.ceil(total / PAGE)), totalLessons: lessons.length,
        students: rows.map((p) => {
            const u = users.get(idOf(p.userId)) || {};
            const done = p.lessons.filter((l) => l.status === 'completed');
            const scores = done.map((l) => l.bestScore).filter((x) => x !== null && x !== undefined);
            return {
                id: idOf(p.userId), name: u.name || 'Unknown student', email: u.email || '', cardNumber: u.cardNumber || '',
                level: svc.currentLevel(lessons, p), placement: p.placement?.level || null,
                completed: done.length, average: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
                certificates: (p.certificates || []).map((c) => c.level), mistakes: (p.mistakes || []).filter((m) => !m.resolvedAt).length,
                pendingReviews: pending.get(idOf(p.userId)) || 0, lastActiveAt: p.lastActiveAt || p.updatedAt
            };
        })
    };
};

/** One student's lessons, recent attempts and submissions; null when out of scope. */
const studentDetail = async (userId, scope = {}) => {
    if (!mongoose.isValidObjectId(userId)) return null;
    const user = await User.findOne({ _id: userId, ...scope }).select('name email cardNumber organizationId').lean();
    if (!user) return null;
    const [progress, lessons, attempts, submissions, config] = await Promise.all([
        LinguisticProgress.findOne({ userId }).lean(),
        svc.publishedLessons(),
        LinguisticAttempt.find({ userId, kind: { $in: ['quiz', 'placement', 'daily'] } }).sort({ createdAt: -1 }).limit(40).lean(),
        LinguisticSubmission.find({ userId }).sort({ updatedAt: -1 }).limit(30).lean(),
        getConfig()
    ]);
    const p = progress || { lessons: [], mistakes: [], certificates: [], levelsCompleted: [] };
    const titles = new Map(lessons.map((l) => [idOf(l._id), l]));
    return {
        student: { id: idOf(user._id), name: user.name, email: user.email, cardNumber: user.cardNumber },
        level: svc.currentLevel(lessons, p), placement: p.placement || null, passingScore: config.passingScore,
        lessons: lessons.map((l) => {
            const e = (p.lessons || []).find((x) => idOf(x.lessonId) === idOf(l._id));
            return { id: idOf(l._id), title: l.title, module: l.module, level: l.level, status: e?.status || 'new', bestScore: e?.bestScore ?? null, attempts: e?.attempts || 0, completedAt: e?.completedAt || null };
        }),
        attempts: attempts.map((a) => ({ id: idOf(a._id), kind: a.kind, lesson: a.lessonId ? titles.get(idOf(a.lessonId))?.title || 'A lesson' : null, module: a.module, level: a.level, score: a.score, total: a.total, percent: a.percent, passed: a.passed, createdAt: a.createdAt })),
        submissions: submissions.map((s) => ({ id: idOf(s._id), lesson: titles.get(idOf(s.lessonId))?.title || 'A lesson', kind: s.kind, taskType: s.taskType, status: s.status, score: s.score, updatedAt: s.updatedAt })),
        mistakes: (p.mistakes || []).filter((m) => !m.resolvedAt).length,
        certificates: (p.certificates || []).map((c) => ({ level: c.level, number: c.number, issuedAt: c.issuedAt }))
    };
};

/** Submissions to review (or reviewed), oldest waiting first. */
const listSubmissions = async ({ status = 'pending', module = '', page = 1, scope = {} } = {}) => {
    const filter = { ...(scope.organizationId ? { organizationId: scope.organizationId } : {}) };
    if (['pending', 'reviewed'].includes(status)) filter.status = status;
    if (module) filter.module = module;
    const [total, rows] = await Promise.all([
        LinguisticSubmission.countDocuments(filter),
        LinguisticSubmission.find(filter).sort(status === 'pending' ? { updatedAt: 1 } : { reviewedAt: -1 }).skip((Math.max(1, page) - 1) * PAGE).limit(PAGE).lean()
    ]);
    const users = new Map((await User.find({ _id: { $in: rows.map((r) => r.userId) } }).select('name cardNumber').lean()).map((u) => [idOf(u._id), u]));
    const lessons = new Map((await LinguisticLesson.find({ _id: { $in: rows.map((r) => r.lessonId) } }).select('title').lean()).map((l) => [idOf(l._id), l.title]));
    return {
        total, page, pages: Math.max(1, Math.ceil(total / PAGE)),
        submissions: rows.map((s) => ({
            id: idOf(s._id), student: { id: idOf(s.userId), name: users.get(idOf(s.userId))?.name || 'Unknown student', cardNumber: users.get(idOf(s.userId))?.cardNumber || '' },
            lesson: lessons.get(idOf(s.lessonId)) || 'A lesson', module: s.module, level: s.level, kind: s.kind, taskType: s.taskType,
            prompt: s.prompt, answer: s.answer, model: s.model, autoFeedback: s.autoFeedback, status: s.status, score: s.score, comment: s.comment,
            reviewedBy: s.reviewedBy?.name || null, reviewedAt: s.reviewedAt, submittedAt: s.updatedAt
        }))
    };
};

/**
 * A teacher's review: a score out of 100 and a comment. A score at the
 * level's passing score pays the writing reward, once per task.
 * Returns { submission } or { error, status }.
 */
const reviewSubmission = async (id, { score, comment }, reviewer, scope = {}) => {
    if (!mongoose.isValidObjectId(id)) return { error: 'That submission was not found.', status: 404 };
    const s = await LinguisticSubmission.findOne({ _id: id, ...(scope.organizationId ? { organizationId: scope.organizationId } : {}) });
    if (!s) return { error: 'That submission was not found.', status: 404 };
    const n = Number(score);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { error: 'Give a score between 0 and 100.', status: 400 };
    s.score = Math.round(n);
    s.comment = String(comment || '').trim().slice(0, 2000);
    s.status = 'reviewed';
    s.reviewedBy = reviewer;
    s.reviewedAt = new Date();
    await s.save();
    const config = await getConfig();
    if (s.score >= (config.passingScore[s.level] ?? 60)) await svc.pay(s.userId, 'linguistic_writing', `${idOf(s.lessonId)}:${s.taskId}`, { reviewedBy: reviewer?.name });
    return { submission: { id: idOf(s._id), status: s.status, score: s.score, comment: s.comment, reviewedBy: reviewer?.name, reviewedAt: s.reviewedAt } };
};

module.exports = { listStudents, studentDetail, listSubmissions, reviewSubmission };
