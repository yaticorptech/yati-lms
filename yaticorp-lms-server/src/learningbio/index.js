/**
 * My Learning Bio — /api/learning-bio
 *
 *   GET  /                 the whole bio: text, strength, live learning data
 *   GET  /summary          the dashboard card's slice
 *   POST /regenerate       write a fresh AI bio from today's data
 *   POST /refresh          re-read the learning data (and regenerate if it changed)
 *   PUT  /bio              { headline, bio, useCustom }  the student's own wording
 *   PUT  /interests        { add: [], remove: [] }
 *   PUT  /settings         { visibility }
 *   GET  /public/:code     a shared bio, no login (only when visibility is shareable)
 *
 * Every route reads req.user only — a student can never reach another's bio.
 */
const express = require('express');
const crypto = require('crypto');
const { protectUser } = require('../middleware/authMiddleware');
const LearningBio = require('./model');
const { collect } = require('./learningDataService');
const { strength } = require('./bioStrengthService');
const { generateBio, configured, MODEL } = require('./bioGeneratorService');

const router = express.Router();
const AUTO_REGEN_PER_DAY = Number(process.env.LEARNING_BIO_AUTO_REGEN_PER_DAY || 4);
const MANUAL_REGEN_PER_DAY = Number(process.env.LEARNING_BIO_REGEN_PER_DAY || 10);
const today = () => new Date().toISOString().slice(0, 10);

const getOrCreate = async (userId) => (await LearningBio.findOne({ userId })) || LearningBio.create({ userId });

const mergeInterests = (doc, auto) => {
    const removed = new Set(doc.interests.removed.map((s) => s.toLowerCase()));
    const manual = doc.interests.manual.map((label) => ({ emoji: '✨', label, source: 'manual' }));
    const detected = auto.filter((i) => !removed.has(i.label.toLowerCase()) && !manual.some((m) => m.label.toLowerCase() === i.label.toLowerCase())).map((i) => ({ ...i, source: 'auto' }));
    return [...detected, ...manual];
};

/** Regenerate when allowed; returns whether it did. Never throws. */
const regenerate = async (doc, data, interests, { manual = false } = {}) => {
    const day = today();
    if (doc.ai.regenerationsDay !== day) { doc.ai.regenerationsDay = day; doc.ai.regenerationsToday = 0; }
    const cap = manual ? MANUAL_REGEN_PER_DAY : AUTO_REGEN_PER_DAY;
    if (doc.ai.regenerationsToday >= cap) return { done: false, reason: 'daily-cap' };
    const out = await generateBio(data, interests, { userId: doc.userId });
    doc.ai.headline = out.headline; doc.ai.bio = out.bio; doc.ai.short = out.short;
    doc.ai.model = out.model; doc.ai.generatedAt = new Date(); doc.ai.dataHash = data.hash;
    doc.ai.regenerationsToday += 1;
    doc.lastRefreshedAt = new Date();
    await doc.save();
    return { done: true, fallbackReason: out.fallbackReason || null };
};

/** Assemble the response. Regenerates automatically when the data moved on. */
const build = async (userId, { force = false, manual = false } = {}) => {
    const [doc, data] = await Promise.all([getOrCreate(userId), collect(userId)]);
    if (!data) return null;
    const interests = mergeInterests(doc, data.interestsAuto);
    const s = strength(data, interests);
    let generation = { done: false, reason: null };
    if (force || !doc.ai.bio || doc.ai.dataHash !== data.hash) {
        generation = await regenerate(doc, data, interests, { manual });
    }
    const stale = !!doc.ai.bio && doc.ai.dataHash !== data.hash;
    const display = doc.useCustom && doc.custom.bio ? { headline: doc.custom.headline || doc.ai.headline, bio: doc.custom.bio, short: doc.custom.bio.split(/(?<=\.)\s/).slice(0, 2).join(' '), source: 'custom' }
        : { headline: doc.ai.headline, bio: doc.ai.bio, short: doc.ai.short, source: 'ai' };
    return {
        user: data.user,
        audience: data.audience,
        ready: s.ready,
        readiness: s.readiness,
        strength: { percent: s.percent, nextStep: s.nextStep, areas: s.areas },
        bio: {
            ...display,
            ai: { headline: doc.ai.headline, bio: doc.ai.bio, short: doc.ai.short, generatedAt: doc.ai.generatedAt, model: doc.ai.model, isMock: doc.ai.model === 'mock', stale },
            custom: { headline: doc.custom.headline, bio: doc.custom.bio, editedAt: doc.custom.editedAt },
            useCustom: doc.useCustom,
            generation
        },
        stats: {
            courses: data.courses.completed.length,
            ongoing: data.courses.ongoing.length,
            skills: data.skills.length,
            certificates: data.certificates.length,
            projects: data.projects.length,
            achievements: data.achievements.length,
            assessments: data.assessments.passed,
            streak: data.streak
        },
        topSkills: data.skills.slice(0, 3),
        recentAchievement: data.achievements[0] || null,
        learningGoal: data.learningGoal,
        education: data.education,
        courses: data.courses,
        skills: data.skills,
        assessments: data.assessments,
        certificates: data.certificates,
        projects: data.projects,
        achievements: data.achievements,
        timeline: data.timeline,
        interests,
        settings: { visibility: doc.visibility, shareCode: doc.visibility === 'shareable' ? doc.shareCode : '' },
        ai: { configured: configured(), model: configured() ? MODEL : 'mock' },
        lastRefreshedAt: doc.lastRefreshedAt
    };
};

const publicShape = (full) => ({
    user: { name: full.user.name, avatar: full.user.avatar },
    bio: { headline: full.bio.headline, bio: full.bio.bio },
    stats: full.stats,
    skills: full.skills.map((s) => ({ name: s.name, status: s.status, percent: s.percent })),
    courses: { completed: full.courses.completed.map((c) => ({ title: c.title })) },
    certificates: full.certificates.map((c) => ({ title: c.title, issuer: c.issuer, date: c.date })),
    projects: full.projects.map((p) => ({ name: p.name, description: p.description, skills: p.skills, completedAt: p.completedAt })),
    achievements: full.achievements.map((a) => ({ title: a.title, emoji: a.emoji, earnedAt: a.earnedAt })),
    interests: full.interests
});

// Public first, so the guard below does not catch it.
router.get('/public/:code', async (req, res, next) => {
    try {
        const code = String(req.params.code || '');
        if (!/^[a-f0-9]{16}$/.test(code)) return res.status(404).json({ message: 'No such bio.' });
        const doc = await LearningBio.findOne({ shareCode: code, visibility: 'shareable' }).lean();
        if (!doc) return res.status(404).json({ message: 'This Learning Bio is not shared.' });
        const full = await build(doc.userId);
        if (!full) return res.status(404).json({ message: 'No such bio.' });
        res.json(publicShape(full));
    } catch (err) { next(err); }
});

router.use(protectUser);

router.get('/', async (req, res, next) => {
    try { const out = await build(req.user._id); if (!out) return res.status(404).json({ message: 'Account not found.' }); res.json(out); } catch (err) { next(err); }
});

router.get('/summary', async (req, res, next) => {
    try {
        const full = await build(req.user._id);
        if (!full) return res.status(404).json({ message: 'Account not found.' });
        const { user, ready, readiness, strength: s, bio, stats, topSkills, recentAchievement, ai } = full;
        res.json({ user, ready, readiness, strength: { percent: s.percent, nextStep: s.nextStep }, bio: { headline: bio.headline, short: bio.short, source: bio.source, isMock: bio.ai.isMock, stale: bio.ai.stale }, stats, topSkills, recentAchievement, ai });
    } catch (err) { next(err); }
});

router.post('/regenerate', async (req, res, next) => {
    try {
        const out = await build(req.user._id, { force: true, manual: true });
        if (out?.bio?.generation?.reason === 'daily-cap') return res.status(429).json({ message: `You have regenerated your bio ${MANUAL_REGEN_PER_DAY} times today. Try again tomorrow.`, code: 'DAILY_CAP' });
        res.json(out);
    } catch (err) { next(err); }
});

router.post('/refresh', async (req, res, next) => {
    try { res.json(await build(req.user._id, { manual: true })); } catch (err) { next(err); }
});

router.put('/bio', async (req, res, next) => {
    try {
        const doc = await getOrCreate(req.user._id);
        const { headline, bio, useCustom } = req.body || {};
        if (typeof bio === 'string') {
            const text = bio.trim().slice(0, 1200);
            doc.custom.bio = text;
            doc.custom.headline = String(headline || '').trim().slice(0, 80);
            doc.custom.editedAt = new Date();
            doc.useCustom = text ? (useCustom !== false) : false;
        } else if (typeof useCustom === 'boolean') {
            doc.useCustom = useCustom && !!doc.custom.bio;
        }
        await doc.save();
        res.json(await build(req.user._id));
    } catch (err) { next(err); }
});

router.put('/interests', async (req, res, next) => {
    try {
        const doc = await getOrCreate(req.user._id);
        const clean = (arr) => (Array.isArray(arr) ? arr : []).map((s) => String(s || '').trim().slice(0, 40)).filter(Boolean);
        const add = clean(req.body?.add);
        const remove = clean(req.body?.remove);
        const lower = (s) => s.toLowerCase();
        doc.interests.manual = [...new Set([...doc.interests.manual.filter((m) => !remove.some((r) => lower(r) === lower(m))), ...add])].slice(0, 12);
        doc.interests.removed = [...new Set([...doc.interests.removed.filter((r) => !add.some((a) => lower(a) === lower(r))), ...remove])].slice(0, 40);
        await doc.save();
        res.json(await build(req.user._id));
    } catch (err) { next(err); }
});

router.put('/settings', async (req, res, next) => {
    try {
        const doc = await getOrCreate(req.user._id);
        const { visibility } = req.body || {};
        if (!['private', 'profile', 'shareable'].includes(visibility)) return res.status(400).json({ message: 'Choose private, profile or shareable.' });
        doc.visibility = visibility;
        if (visibility === 'shareable' && !doc.shareCode) doc.shareCode = crypto.randomBytes(8).toString('hex');
        await doc.save();
        res.json(await build(req.user._id));
    } catch (err) { next(err); }
});

module.exports = router;
