/**
 * Students: the Games & Competitions section of the student app.
 *
 *   GET  /games                    the four games
 *   GET  /                         competitions to look at (open, upcoming, live, finished)
 *   GET  /me                       my participation: competitions, upcoming / live / completed matches, results
 *   GET  /leaderboard              college, team and player rankings
 *   GET  /history                  finished competitions, winners and results
 *   GET  /:id                      one competition: details, teams, rounds and matches
 *   GET  /:id/certificate          my certificate, as a PDF, once it is over
 *
 *   POST /rooms                    start a friendly game { game, options } → a room code
 *   POST /rooms/join               join a friendly game { code }
 *   GET  /rooms/mine               my friendly games still open or in play
 *   GET  /play/:gameId?since=N     one game (204-like { unchanged } when version N is current)
 *   POST /play/:gameId/join        I am here (a match starts when everyone is)
 *   POST /play/:gameId/action      { action } — a move, a roll, a card, a shot
 *   POST /play/:gameId/start       the host starts a friendly game
 *   POST /play/:gameId/leave       leave a friendly room before it starts
 */
const express = require('express');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const views = require('../services/views');
const games = require('../services/gameService');
const { openDue } = require('../services/bracketService');
const { catalogue } = require('../games');

const router = express.Router();
const VISIBLE = ['registration', 'closed', 'live', 'completed'];
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    next(err);
});

router.get('/games', wrap(async (req, res) => res.json({ games: catalogue() })));

router.get('/', wrap(async (req, res) => {
    const comps = await Competition.find({ status: { $in: VISIBLE } }).sort({ startsAt: -1 }).lean();
    const teams = await Team.find({ competitionId: { $in: comps.map((c) => c._id) } }).lean();
    const order = { live: 0, registration: 1, closed: 2, completed: 3 };
    const rows = comps.map((c) => {
        const mine = teams.filter((t) => String(t.competitionId) === String(c._id));
        const myTeam = mine.find((t) => t.status !== 'withdrawn' && t.players.some((p) => String(p.userId) === String(req.user._id)));
        return views.competitionView(c, { teams: mine, myTeam });
    }).sort((a, b) => order[a.status] - order[b.status]);
    res.json({ competitions: rows });
}));

router.get('/me', wrap(async (req, res) => {
    const myTeams = await Team.find({ 'players.userId': req.user._id, status: { $in: ['pending', 'approved'] } }).lean();
    const comps = await Competition.find({ _id: { $in: myTeams.map((t) => t.competitionId) }, status: { $ne: 'draft' } }).lean();
    for (const c of comps.filter((x) => x.status === 'live')) await openDue(c._id);
    const matches = await Match.find({ 'sides.teamId': { $in: myTeams.map((t) => t._id) } }).lean();
    const allTeams = await Team.find({ _id: { $in: matches.flatMap((m) => m.sides.map((s) => s.teamId)) } }).lean();
    const PlayGame = require('../models/PlayGame');
    const gameRows = await PlayGame.find({ _id: { $in: matches.flatMap((m) => m.gameIds) } }).select('status').lean();
    const compOf = (id) => comps.find((c) => String(c._id) === String(id));
    const myTeamIn = (m) => myTeams.find((t) => m.sides.some((s) => String(s.teamId) === String(t._id)));
    const withComp = (m) => {
        const c = compOf(m.competitionId);
        const team = myTeamIn(m);
        const side = m.sides.find((s) => String(s.teamId) === String(team?._id));
        const v = views.matchView(m, allTeams, gameRows);
        return {
            ...v,
            competition: c ? { id: String(c._id), name: c.name, game: c.game, ...views.gameInfo(c.game) } : null,
            myTeamId: team ? String(team._id) : null,
            // Whether I am one of the players at the board for this match.
            playing: !!side && (side.lineup.length ? side.lineup.some((id) => String(id) === String(req.user._id)) : team.players.slice(0, c?.playersPerSide || 1).some((p) => String(p.userId) === String(req.user._id))),
            result: m.status === 'completed' && team ? (String(m.winnerTeamId) === String(team._id) ? 'won' : 'lost') : null
        };
    };
    const rows = matches.filter((m) => compOf(m.competitionId)).map(withComp);
    const byTime = (a, b) => new Date(a.scheduledAt || 8.64e15) - new Date(b.scheduledAt || 8.64e15);
    res.json({
        competitions: comps.map((c) => views.competitionView(c, { teams: [], myTeam: myTeams.find((t) => String(t.competitionId) === String(c._id)) })),
        upcoming: rows.filter((m) => m.status === 'scheduled').sort(byTime),
        live: rows.filter((m) => m.status === 'live'),
        completed: rows.filter((m) => m.status === 'completed').sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
        // My history: every finished competition I played in, where my team
        // finished, and its record — matches won of those played.
        results: comps.filter((c) => c.status === 'completed').map((c) => {
            const team = myTeams.find((t) => String(t.competitionId) === String(c._id));
            const decided = matches.filter((m) => String(m.competitionId) === String(c._id) && m.status === 'completed'
                && m.sides.some((s) => String(s.teamId) === String(team?._id)));
            return {
                competition: { id: String(c._id), name: c.name, game: c.game, ...views.gameInfo(c.game), completedAt: c.completedAt },
                teamName: team?.teamName || '',
                collegeName: team?.collegeName || '',
                place: team?.place || null,
                score: { won: decided.filter((m) => String(m.winnerTeamId) === String(team?._id)).length, played: decided.length },
                certificate: team?.status === 'approved' && require('../services/certificate').eligible(c, team)
            };
        })
    });
}));

router.get('/leaderboard', wrap(async (req, res) => {
    res.json(await require('../services/leaderboardService').board());
}));

router.get('/history', wrap(async (req, res) => {
    const comps = await Competition.find({ status: 'completed' }).sort({ completedAt: -1 }).lean();
    const out = [];
    for (const c of comps) out.push(await views.detail(c._id, { userId: req.user._id }));
    res.json({ competitions: out });
}));

/* ── Friendly games and play ─────────────────────────────────────────── */

router.post('/rooms', wrap(async (req, res) => res.status(201).json(await games.createRoom(req.user, String(req.body?.game || ''), req.body?.options))));
router.post('/rooms/join', wrap(async (req, res) => res.json(await games.joinRoom(req.user, req.body?.code))));
router.get('/rooms/mine', wrap(async (req, res) => res.json({ rooms: await games.myRooms(req.user._id) })));

router.get('/play/:gameId', wrap(async (req, res) => res.json(await games.poll(req.params.gameId, req.user._id, req.query.since))));
router.post('/play/:gameId/join', wrap(async (req, res) => res.json(await games.join(req.params.gameId, req.user._id))));
router.post('/play/:gameId/action', wrap(async (req, res) => res.json(await games.act(req.params.gameId, req.user._id, req.body?.action))));
router.post('/play/:gameId/start', wrap(async (req, res) => res.json(await games.startRoom(req.params.gameId, req.user._id))));
router.post('/play/:gameId/leave', wrap(async (req, res) => res.json(await games.leaveRoom(req.params.gameId, req.user._id))));

/* ── One competition ─────────────────────────────────────────────────── */

const visible = async (id) => {
    if (!require('mongoose').isValidObjectId(id)) return null;
    const c = await Competition.findById(id).select('status').lean();
    return c && VISIBLE.includes(c.status) ? c : null;
};

router.get('/:id', wrap(async (req, res) => {
    const c = await visible(req.params.id);
    if (!c) return res.status(404).json({ message: 'Competition not found.' });
    if (c.status === 'live') await openDue(c._id);
    res.json(await views.detail(c._id, { userId: req.user._id }));
}));

router.get('/:id/certificate', wrap(async (req, res) => {
    const c = await visible(req.params.id);
    if (!c) return res.status(404).json({ message: 'Competition not found.' });
    const competition = await Competition.findById(c._id).lean();
    if (competition.status !== 'completed') return res.status(409).json({ message: 'Certificates are ready once the competition is over.' });
    const team = await Team.findOne({ competitionId: c._id, status: 'approved', 'players.userId': req.user._id }).lean();
    if (!team) return res.status(403).json({ message: 'Only players of a team that took part get a certificate.' });
    if (!require('../services/certificate').eligible(competition, team)) {
        return res.status(404).json({ message: team.place ? 'This competition does not give winners\' certificates.' : 'This competition gives certificates only to its winners.' });
    }
    const playerName = team.players.find((p) => String(p.userId) === String(req.user._id))?.name || req.user.name;
    require('../services/certificate').draw(res, { competition, team, playerName, place: team.place || null });
}));

module.exports = router;
