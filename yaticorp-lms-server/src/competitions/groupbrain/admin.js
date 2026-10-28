/**
 * Group Brain for the platform's super admin (mounted behind protectAdmin and
 * superAdminOnly in ../index.js): only they may change settings or results.
 * Every change is written to the audit log with who made it and why.
 *
 *   GET  /overview                     live rooms, games on now, today's numbers, results to review, activity
 *   GET  /rooms?status=waiting|active  rooms waiting to start, or being played
 *   POST /rooms/:id/close              { reason } — close a room, or stop its game (no results are recorded)
 *   GET  /results?flagged=1&game=&q=   results, newest first
 *   POST /results/:id/approve|void|adjust   { reason, place?, score? }
 *   GET  /players?q=  ·  GET /players/:userId   players, and one player's full dashboard
 *   GET  /leaderboards?type=&period=&game=
 *   GET  /settings  ·  PUT /settings   games on/off and difficulties, XP, certificate rules, review thresholds
 *   GET  /questions?game=  ·  POST  ·  PUT /:id  ·  DELETE /:id   an admin's own quiz questions
 *   GET  /tournaments  ·  POST  ·  GET /:id  ·  POST /:id/finalize { force }  ·  POST /:id/cancel
 *   GET  /certificates?q=&status=  ·  POST /certificates { userId, title, line, eventName, rank, reason }
 *   POST /certificates/:certId/reissue|revoke { reason }  ·  GET /certificates/:certId/pdf
 *   POST /eligibility/:userId          check a player for achievements and certificates now
 *   GET  /achievements                 the achievements, and how many have each
 *   GET  /students?q=                  find a student (to issue a certificate to)
 *   GET  /audit                        the audit log, newest first
 */
const express = require('express');
const mongoose = require('mongoose');
const PlayGame = require('../models/PlayGame');
const { engine, ROOM_GAMES } = require('../games');
const M = require('./models');
const { getSettings, updateSettings, audit } = require('./settings');
const stats = require('./stats');
const results = require('./results');
const certificates = require('./certificates');
const tournaments = require('./tournaments');
const questions = require('./questions');
const { ACHIEVEMENTS, evaluate } = require('./awards');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err?.name === 'CastError') return res.status(404).json({ message: 'Not found.' });
    next(err);
});
const isId = (id) => mongoose.isValidObjectId(id);
const rx = (q) => new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const label = (id) => engine(id)?.label || id;

router.get('/overview', wrap(async (req, res) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const since = new Date(Date.now() - 13 * 86400000); since.setHours(0, 0, 0, 0);
    const [waiting, active, finishedToday, players, flagged, recent, perDay, perGame] = await Promise.all([
        PlayGame.countDocuments({ kind: 'room', status: 'waiting' }),
        PlayGame.countDocuments({ kind: 'room', status: 'active' }),
        PlayGame.countDocuments({ kind: 'room', status: 'finished', finishedAt: { $gte: today } }),
        M.GroupBrainResult.distinct('userId', { finishedAt: { $gte: today } }),
        M.GroupBrainResult.countDocuments({ 'flags.0': { $exists: true }, reviewed: false }),
        M.GroupBrainResult.find({}).sort({ finishedAt: -1 }).limit(10).lean(),
        M.GroupBrainResult.aggregate([{ $match: { finishedAt: { $gte: since } } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$finishedAt' } }, results: { $sum: 1 }, players: { $addToSet: '$userId' } } }, { $sort: { _id: 1 } }]),
        M.GroupBrainResult.aggregate([{ $group: { _id: '$game', results: { $sum: 1 } } }, { $sort: { results: -1 } }])
    ]);
    res.json({
        waiting, active, finishedToday, playersToday: players.length, flagged,
        recent: recent.map((r) => ({ id: String(r._id), gameId: String(r.gameId), name: r.name, game: r.game, label: label(r.game), place: r.place, won: r.won, score: r.score, flags: r.flags, finishedAt: r.finishedAt })),
        activity: perDay.map((d) => ({ day: d._id, results: d.results, players: d.players.length })),
        games: perGame.map((g) => ({ game: g._id, label: label(g._id), results: g.results }))
    });
}));

router.get('/rooms', wrap(async (req, res) => {
    const status = ['waiting', 'active'].includes(req.query.status) ? [req.query.status] : ['waiting', 'active'];
    const rows = await PlayGame.find({ kind: 'room', status: { $in: status } }).sort({ createdAt: -1 }).limit(200).select('game code status seats options createdAt startedAt joinDeadline hostId').lean();
    res.json({
        rooms: rows.map((g) => ({
            id: String(g._id), game: g.game, label: label(g.game), code: g.code, status: g.status, difficulty: g.options?.difficulty || 'medium',
            players: g.seats.map((s) => ({ name: s.name, ready: !!s.ready, host: String(s.userId) === String(g.hostId) })),
            createdAt: g.createdAt, startedAt: g.startedAt, closesAt: g.joinDeadline
        }))
    });
}));

router.post('/rooms/:id/close', wrap(async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Room not found.' });
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'Give a reason: the players see it, and it goes in the audit log.' });
    const g = await PlayGame.findOneAndUpdate(
        { _id: req.params.id, kind: 'room', status: { $in: ['waiting', 'active'] } },
        { $set: { status: 'abandoned', finishedAt: new Date(), nextDeadline: null, outcome: { places: [], reason: `Closed by an admin: ${reason}` } }, $inc: { version: 1 } },
        { returnDocument: 'after' }
    ).lean();
    if (!g) return res.status(409).json({ message: 'That room is not open.' });
    require('../realtime').notify(g);
    await audit(req.admin, 'room.close', String(g._id), { game: g.game, code: g.code }, { status: 'abandoned' }, reason);
    res.json({ ok: true });
}));

router.get('/results', wrap(async (req, res) => {
    const filter = {};
    if (req.query.flagged === '1') Object.assign(filter, { 'flags.0': { $exists: true }, reviewed: false });
    if (req.query.voided === '1') filter.voided = true;
    if (ROOM_GAMES.includes(req.query.game)) filter.game = req.query.game;
    if (req.query.q) filter.name = rx(req.query.q);
    if (isId(req.query.userId)) filter.userId = req.query.userId;
    const rows = await M.GroupBrainResult.find(filter).sort({ finishedAt: -1 }).limit(200).lean();
    res.json({ results: rows.map((r) => ({ ...r, id: String(r._id), gameId: String(r.gameId), userId: String(r.userId), label: label(r.game) })) });
}));

router.post('/results/:id/:action', wrap(async (req, res) => {
    if (!isId(req.params.id)) return res.status(404).json({ message: 'Result not found.' });
    res.json({ result: await results.correct(req.params.id, req.params.action, req.body || {}, req.admin) });
}));

router.get('/players', wrap(async (req, res) => {
    const match = req.query.q ? { name: rx(req.query.q) } : {};
    const rows = await M.GroupBrainResult.aggregate([
        { $match: { voided: false, ...match } },
        { $group: { _id: '$userId', name: { $last: '$name' }, played: { $sum: 1 }, wins: { $sum: { $cond: ['$won', 1, 0] } }, xp: { $sum: { $cond: [{ $eq: ['$xpStatus', 'paid'] }, '$xp', 0] } }, flagged: { $sum: { $cond: [{ $gt: [{ $size: '$flags' }, 0] }, 1, 0] } }, last: { $max: '$finishedAt' } } },
        { $sort: { last: -1 } }, { $limit: 200 }
    ]);
    const profiles = await M.GroupBrainProfile.find({ userId: { $in: rows.map((r) => r._id) } }).lean();
    const rating = new Map(profiles.map((p) => [String(p.userId), p.chessRating]));
    res.json({ players: rows.map((r) => ({ userId: String(r._id), name: r.name, played: r.played, wins: r.wins, xp: r.xp, flagged: r.flagged, lastPlayed: r.last, chessRating: rating.get(String(r._id)) ?? 1200 })) });
}));

router.get('/players/:userId', wrap(async (req, res) => {
    if (!isId(req.params.userId)) return res.status(404).json({ message: 'Player not found.' });
    const User = require('../../models/User');
    const user = await User.findById(req.params.userId).select('name email').lean();
    if (!user) return res.status(404).json({ message: 'Player not found.' });
    res.json({ player: { ...(await stats.dashboard(user)), email: user.email, userId: String(user._id) }, history: await stats.history(user._id, 50) });
}));

router.get('/leaderboards', wrap(async (req, res) => {
    const type = String(req.query.type || 'points'); const period = req.query.period === 'week' ? 'week' : 'all';
    const game = ROOM_GAMES.includes(req.query.game) ? req.query.game : null;
    if (type === 'chess') return res.json(await stats.chessBoard({ limit: 100 }));
    if (type === 'xp') return res.json(await stats.xpBoard({ period, limit: 100 }));
    return res.json(await stats.board({ period, game, limit: 100 }));
}));

router.get('/settings', wrap(async (req, res) => res.json({ settings: await getSettings(), games: ROOM_GAMES.map((id) => ({ id, label: label(id) })), achievements: ACHIEVEMENTS.map(({ key, title }) => ({ key, title })) })));
router.put('/settings', wrap(async (req, res) => res.json({ settings: await updateSettings(req.body || {}, req.admin, req.body?.reason) })));

router.get('/questions', wrap(async (req, res) => res.json({ questions: await questions.list({ game: req.query.game ? String(req.query.game) : undefined }), games: questions.QUIZ_GAMES.map((id) => ({ id, label: label(id) })) })));
router.post('/questions', wrap(async (req, res) => res.status(201).json({ question: await questions.create(req.body, req.admin) })));
router.put('/questions/:id', wrap(async (req, res) => res.json({ question: await questions.update(req.params.id, req.body, req.admin) })));
router.delete('/questions/:id', wrap(async (req, res) => res.json(await questions.remove(req.params.id, req.admin))));

router.get('/tournaments', wrap(async (req, res) => res.json({ tournaments: await tournaments.list() })));
router.post('/tournaments', wrap(async (req, res) => res.status(201).json({ tournament: await tournaments.create(req.body || {}, req.admin) })));
router.get('/tournaments/:id', wrap(async (req, res) => res.json({ tournament: await tournaments.one(req.params.id) })));
router.post('/tournaments/:id/finalize', wrap(async (req, res) => res.json({ tournament: await tournaments.finalize(req.params.id, req.admin, { force: !!req.body?.force }) })));
router.post('/tournaments/:id/cancel', wrap(async (req, res) => res.json({ tournament: await tournaments.cancel(req.params.id, req.admin, req.body?.reason) })));

router.get('/certificates', wrap(async (req, res) => {
    const filter = {};
    if (['valid', 'revoked'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.q) filter.$or = [{ name: rx(req.query.q) }, { certId: rx(req.query.q) }, { title: rx(req.query.q) }];
    const rows = await M.GroupBrainCertificate.find(filter).sort({ issuedAt: -1 }).limit(300).lean();
    res.json({ certificates: rows.map((c) => ({ ...c, id: String(c._id), userId: String(c.userId) })) });
}));
router.post('/certificates', wrap(async (req, res) => {
    if (!String(req.body?.reason || '').trim()) return res.status(400).json({ message: 'Give a reason: it goes in the audit log.' });
    res.status(201).json({ certificate: await certificates.issueByAdmin(req.body, req.admin, req.body.reason) });
}));
router.post('/certificates/:certId/reissue', wrap(async (req, res) => {
    if (!String(req.body?.reason || '').trim()) return res.status(400).json({ message: 'Give a reason: it goes in the audit log.' });
    res.json({ certificate: await certificates.reissue(String(req.params.certId).toUpperCase(), req.admin, req.body.reason, req.body || {}) });
}));
router.post('/certificates/:certId/revoke', wrap(async (req, res) => res.json({ certificate: await certificates.revoke(String(req.params.certId).toUpperCase(), req.admin, req.body?.reason) })));
router.get('/certificates/:certId/pdf', wrap(async (req, res) => {
    const cert = await M.GroupBrainCertificate.findOne({ certId: String(req.params.certId).toUpperCase() }).lean();
    if (!cert) return res.status(404).json({ message: 'Certificate not found.' });
    return certificates.pdf(cert, res);
}));

router.post('/eligibility/:userId', wrap(async (req, res) => {
    if (!isId(req.params.userId)) return res.status(404).json({ message: 'Player not found.' });
    const out = await evaluate(req.params.userId);
    await audit(req.admin, 'eligibility.check', req.params.userId, null, out);
    res.json(out);
}));

router.get('/achievements', wrap(async (req, res) => {
    const counts = await M.GroupBrainAchievement.aggregate([{ $group: { _id: '$key', n: { $sum: 1 } } }]);
    const n = new Map(counts.map((c) => [c._id, c.n]));
    res.json({ achievements: ACHIEVEMENTS.map(({ key, title, description, xp }) => ({ key, title, description, xp, earned: n.get(key) || 0 })) });
}));

router.get('/students', wrap(async (req, res) => {
    const User = require('../../models/User');
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ students: [] });
    const rows = await User.find({ $or: [{ name: rx(q) }, { email: rx(q) }] }).select('name email').limit(20).lean();
    res.json({ students: rows.map((u) => ({ id: String(u._id), name: u.name, email: u.email })) });
}));

router.get('/audit', wrap(async (req, res) => {
    const rows = await M.GroupBrainAudit.find({}).sort({ createdAt: -1 }).limit(300).lean();
    res.json({ audit: rows.map((a) => ({ ...a, id: String(a._id) })) });
}));

module.exports = router;
