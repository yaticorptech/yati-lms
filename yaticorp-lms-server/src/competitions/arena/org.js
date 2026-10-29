/**
 * Quiz Arena for a college's coordinator (its organization admin), at
 * /api/competitions/org/arena — the same flow as entering a Chess team: the
 * college enters its own students, the platform admin approves them. The
 * college is always the one the admin account belongs to (req.organization).
 *
 *   GET    /                  Quiz Arenas open to us, and the ones we entered
 *   PUT    /:id/entries       { players: [userId] } our students in it (before the deadline);
 *                             new ones wait for approval, ones already reviewed keep their status
 *   DELETE /:id/entries       withdraw all our students (before the deadline)
 */
const express = require('express');
const mongoose = require('mongoose');
const { ArenaCompetition, ArenaEntry } = require('./models');
const { phaseAt, totalMs, stateOf } = require('./timeline');
const User = require('../../models/User');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    next(err);
});
const fail = (status, message) => Object.assign(new Error(message), { status });

/** Whether our college may enter this contest. */
const forUs = (c, orgId) => {
    const ids = (c.eligibility?.organizationIds || []).map(String);
    return !ids.length || ids.includes(String(orgId));
};
const registrationOpen = (c, now) => c.status === 'published' && !(c.registrationOpensAt && now < c.registrationOpensAt.getTime()) && now < c.registrationDeadline.getTime() && phaseAt(c, now).stage === 'waiting';

/** The seats taken: every entry not rejected. Kept on the contest for lists. */
const recount = async (competitionId) => {
    const n = await ArenaEntry.countDocuments({ competitionId, status: { $ne: 'rejected' } });
    await ArenaCompetition.updateOne({ _id: competitionId }, { $set: { registeredCount: n } });
    return n;
};

router.get('/', wrap(async (req, res) => {
    const orgId = req.organization._id;
    const now = Date.now();
    const ours = await ArenaEntry.find({ organizationId: orgId }).select('competitionId userId name status rank score correctCount').lean();
    const entered = new Set(ours.map((e) => String(e.competitionId)));
    const rows = await ArenaCompetition.find({ status: { $in: ['published', 'cancelled'] }, publishedAt: { $ne: null } }).select('-paper.answer').sort({ startsAt: -1 }).limit(100);
    const shown = rows.filter((c) => entered.has(String(c._id)) || (c.status === 'published' && forUs(c, orgId) && stateOf(c, now) !== 'results'));
    res.json({
        competitions: shown.map((c) => ({
            id: String(c._id),
            title: c.title,
            organizedBy: c.organizedBy,
            startsAt: c.startedAt || c.startsAt,
            registrationDeadline: c.registrationDeadline,
            registrationOpensAt: c.registrationOpensAt,
            registrationOpen: registrationOpen(c, now),
            state: stateOf(c, now),
            questions: c.paper.length,
            durationMs: totalMs(c),
            playersPerCollege: c.playersPerCollege,
            maxParticipants: c.maxParticipants,
            registeredCount: c.registeredCount,
            collegeStudentsOnly: c.eligibility?.collegeStudentsOnly !== false,
            // Our students; once the results are published, how each did.
            resultsPublished: !!c.resultsPublishedAt,
            maxScore: c.paper.length * c.pointsPerQuestion,
            entries: ours.filter((e) => String(e.competitionId) === String(c._id)).map((e) => ({
                userId: String(e.userId), name: e.name, status: e.status,
                ...(c.resultsPublishedAt ? { rank: e.rank ?? null, score: e.score ?? 0, correct: e.correctCount ?? 0 } : {})
            }))
        }))
    });
}));

/** Everyone taking part in a Quiz Arena (approved), for its pop-up: as for the games (routes/org.js). */
router.get('/:id/participants', wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw fail(404, 'Competition not found.');
    const c = await ArenaCompetition.findById(req.params.id).select('-paper').lean();
    const orgId = String(req.organization._id);
    if (!c || c.status === 'draft' || (!forUs(c, orgId) && !(await ArenaEntry.exists({ competitionId: c._id, organizationId: orgId })))) throw fail(404, 'Competition not found.');
    const entries = await ArenaEntry.find({ competitionId: c._id, status: 'approved' }).select('userId name collegeName organizationId rank score correctCount').lean();
    const users = await User.find({ _id: { $in: entries.map((e) => e.userId) } }).select('cardNumber').lean();
    const card = new Map(users.map((u) => [String(u._id), u.cardNumber || '']));
    const shown = !!c.resultsPublishedAt;
    const ORD = { 1: '1st', 2: '2nd', 3: '3rd' };
    const rows = entries.map((e) => {
        const ours = String(e.organizationId) === orgId;
        const n = card.get(String(e.userId)) || '';
        const place = shown ? e.rank ?? null : null;
        const prize = place ? (c.prizes || []).find((p) => p.place === place) : null;
        return {
            name: e.name, college: e.collegeName || '', team: null, ours,
            cardNumber: ours ? n : n ? `••••${n.slice(-4)}` : '',
            place, placeLabel: place ? (ORD[place] || `#${place}`) : null, score: shown ? e.score : null,
            prize: prize ? [prize.title, prize.xp ? `${prize.xp} XP` : '', prize.rewardPoints ? `${prize.rewardPoints} pts` : ''].filter(Boolean).join(' · ') : null
        };
    }).sort((a, b) => (a.place || 1e9) - (b.place || 1e9) || a.college.localeCompare(b.college) || a.name.localeCompare(b.name));
    res.json({
        dates: { registrationOpensAt: c.registrationOpensAt || c.publishedAt || null, registrationDeadline: c.registrationDeadline, startsAt: c.startedAt || c.startsAt, completedAt: c.resultsPublishedAt || null },
        resultsPublished: shown, total: rows.length, colleges: new Set(rows.map((r) => r.college)).size, rows
    });
}));

const load = async (id, req) => {
    if (!mongoose.isValidObjectId(id)) throw fail(404, 'Competition not found.');
    const c = await ArenaCompetition.findById(id);
    if (!c || c.status === 'draft' || !forUs(c, req.organization._id)) throw fail(404, 'Competition not found.');
    if (!registrationOpen(c, Date.now())) throw fail(409, 'Registration for this Quiz Arena has closed.');
    return c;
};

router.put('/:id/entries', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    const orgId = req.organization._id;
    const wanted = [...new Set((Array.isArray(req.body?.players) ? req.body.players : []).map(String))].filter(mongoose.isValidObjectId);
    if (wanted.length > c.playersPerCollege) throw fail(400, `A college may enter up to ${c.playersPerCollege} students.`);
    // Only our own students.
    const students = await User.find({ _id: { $in: wanted }, organizationId: orgId }).select('name').lean();
    if (students.length !== wanted.length) throw fail(400, 'Choose students of your own college.');
    const current = await ArenaEntry.find({ competitionId: c._id, organizationId: orgId }).lean();
    const adding = students.filter((s) => !current.some((e) => String(e.userId) === String(s._id)));
    // Seats: everyone else's entries plus ours after this change.
    const others = await ArenaEntry.countDocuments({ competitionId: c._id, organizationId: { $ne: orgId }, status: { $ne: 'rejected' } });
    const oursAfter = current.filter((e) => wanted.includes(String(e.userId)) && e.status !== 'rejected').length + adding.length;
    if (others + oursAfter > c.maxParticipants) throw fail(409, `Only ${Math.max(0, c.maxParticipants - others)} places are left.`);
    // A student another college entered (they moved) cannot be entered twice.
    const taken = await ArenaEntry.find({ competitionId: c._id, userId: { $in: adding.map((s) => s._id) } }).select('name').lean();
    if (taken.length) throw fail(409, `${taken.map((t) => t.name).join(', ')} ${taken.length === 1 ? 'is' : 'are'} already entered.`);

    await ArenaEntry.deleteMany({ competitionId: c._id, organizationId: orgId, userId: { $nin: wanted } });
    if (adding.length) {
        await ArenaEntry.insertMany(adding.map((s) => ({
            competitionId: c._id, userId: s._id, name: s.name, organizationId: orgId, collegeName: req.organization.name || '',
            status: 'pending', registeredBy: req.admin?._id || null
        })));
    }
    const registeredCount = await recount(c._id);
    const entries = await ArenaEntry.find({ competitionId: c._id, organizationId: orgId }).select('userId name status').lean();
    res.json({ registeredCount, entries: entries.map((e) => ({ userId: String(e.userId), name: e.name, status: e.status })) });
}));

router.delete('/:id/entries', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    await ArenaEntry.deleteMany({ competitionId: c._id, organizationId: req.organization._id });
    res.json({ registeredCount: await recount(c._id), entries: [] });
}));

module.exports = router;
module.exports.recount = recount;
