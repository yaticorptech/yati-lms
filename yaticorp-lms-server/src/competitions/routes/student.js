/**
 * Students: the Games & Competitions section of the student app.
 *
 *   GET  /games                    the games: Chess, Ludo, Carrom
 *   GET  /                         competitions to look at (open, upcoming, live, finished)
 *   GET  /me                       my participation: competitions, upcoming / live / completed matches, results
 *   GET  /leaderboard?game=        college, team and player rankings (one game's, with ?game=)
 *   GET  /history                  finished competitions, winners and results
 *   GET  /seen-questions · POST    { keys } — the questions I have met (no repeats, solo or group)
 *   GET  /celebrated               the results pop-ups I have already been shown
 *   POST /celebrated               { ids } — mark them shown (once per win, on any device)
 *   GET  /:id                      one competition: details, teams, rounds and matches
 *   GET  /:id/certificate          my certificate, as a PDF, once it is over
 *
 *   A quiz or a hackathon (services/challengeService.js, asked 2026-10-23):
 *   POST /:id/signup · DELETE      sign up on my own (a competition entered by students themselves), or withdraw
 *   GET  /:id/quiz                 the quiz: when it runs, my attempt, and once decided the answers and standings
 *   POST /:id/quiz/start           start my one go: the questions, and my time
 *   PUT  /:id/quiz                 { answers: { questionId: choice }, submit } — saved as picked; submit hands it in
 *   GET  /:id/project              the hackathon: the problem, my team's project, and once decided the marks and standings
 *   PUT  /:id/project              { title, summary, repoUrl, demoUrl } — hand in or change my team's project
 *
 *   POST /matches/join             { code } — a player types their match's 6-character code → the game to open
 *   GET  /play/:gameId?since=N     one match game (204-like { unchanged } when version N is current)
 *   POST /play/:gameId/join        I am here (a match starts when everyone is)
 *   POST /play/:gameId/action      { action } — a move, a roll, a shot
 *
 *   Group Brain rooms (services/roomService.js, asked 2026-10-27):
 *   GET  /rooms/games              the ten Group Brain games
 *   GET  /rooms/mine               the room I am in now, if any
 *   POST /rooms                    { game, options: { difficulty } } — make a room → its code
 *   POST /rooms/join               { code } — join a room with its code
 *   GET  /rooms/unlocks            the group games and room sizes my solo levels have unlocked
 *   GET  /rooms/online             the entry fees, table sizes and wait
 *   POST /rooms/online             { game, players, fee } — Play online: a seat at a table (fee in XP)
 *   GET  /rooms/history            my finished rooms
 *   GET  /rooms/leaderboard?type=points|chess|xp&period=all|week&game=   a leaderboard, and my place on it
 *   GET  /rooms/profile            my dashboard: totals, games, Brain Performance Score, chess rating, XP, achievements, certificates
 *   GET  /rooms/certificates/:id   one of my certificates, as a PDF
 *   POST /play/:gameId/ready       { ready } — I am ready (or not)
 *   POST /play/:gameId/start       the room's maker starts the game
 *   POST /play/:gameId/leave       leave a room before its game starts
 *   POST /play/:gameId/remove      { seat } — the host removes a player before the start
 *   (The game itself: GET /play/:gameId and POST /play/:gameId/action, as a match.)
 *
 * Playing with friends (rooms with a code, before Group Brain) was removed on
 * 2026-10-23, and UNO with it: a friendly game saved before then answers 410.
 */
const express = require('express');
require('../services/seenQuestions');      // its model, for /seen-questions
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const fees = require('../services/entryFee');
const views = require('../services/views');
const games = require('../services/gameService');
const { openDue } = require('../services/bracketService');
const { catalogue } = require('../games');
const challenge = require('../services/challengeService');
const rooms = require('../services/roomService');

const router = express.Router();
const VISIBLE = ['registration', 'closed', 'live', 'completed'];
// Quiz and Hackathon were removed on 2026-10-28: none is listed any more.
const NO_CHALLENGES = { game: { $nin: ['quiz', 'hackathon'] } };
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message, ...(err.roomId ? { roomId: err.roomId } : {}), ...(err.locked ? { locked: err.locked } : {}) });
    next(err);
});

/**
 * A college's own competition (hostOrganizationId) is for its own students.
 * Anyone in one of its teams sees it too: players from other colleges entered
 * before 13 Oct 2026, when college competitions became college-only.
 * `teams`: teams of the competition, or the student's own.
 */
const seenBy = (user, c, teams) => !c.hostOrganizationId
    || String(c.hostOrganizationId) === String(user.organizationId || '')
    || teams.some((t) => String(t.competitionId) === String(c._id) && t.status !== 'withdrawn' && t.players.some((p) => String(p.userId) === String(user._id)));

router.get('/games', wrap(async (req, res) => res.json({ games: catalogue() })));

router.get('/', wrap(async (req, res) => {
    await challenge.advanceDue();
    // Cancelled ones too (shown as Closed), once colleges had entered them:
    // a draft cancelled before anyone saw it stays hidden.
    const all = await Competition.find({ status: { $in: [...VISIBLE, 'cancelled'] } , ...NO_CHALLENGES }).sort({ startsAt: -1 }).lean();
    const teams = await Team.find({ competitionId: { $in: all.map((c) => c._id) } }).lean();
    const comps = all.filter((c) => seenBy(req.user, c, teams) && (c.status !== 'cancelled' || teams.some((t) => String(t.competitionId) === String(c._id))));
    const order = { live: 0, registration: 1, closed: 2, completed: 3, cancelled: 4 };
    const rows = comps.map((c) => {
        const mine = teams.filter((t) => String(t.competitionId) === String(c._id));
        const myTeam = mine.find((t) => t.status !== 'withdrawn' && t.players.some((p) => String(p.userId) === String(req.user._id)));
        return views.studentCompetition(views.competitionView(c, { teams: mine, myTeam }));
    }).sort((a, b) => order[a.status] - order[b.status]);
    res.json({ competitions: rows });
}));

router.get('/me', wrap(async (req, res) => {
    await challenge.advanceDue();
    let built = new Set();      // competitions with a Builder certificate for me (filled in with the results)
    let certOk = new Set();     // competitions whose standard certificate is mine (filled in with the results)
    const myTeams = await Team.find({ 'players.userId': req.user._id, status: { $in: ['pending', 'approved'] } }).lean();
    const comps = await Competition.find({ _id: { $in: myTeams.map((t) => t.competitionId) }, status: { $ne: 'draft' } , ...NO_CHALLENGES }).lean();
    for (const c of comps.filter((x) => x.status === 'live')) await openDue(c._id);
    const matches = await Match.find({ 'sides.teamId': { $in: myTeams.map((t) => t._id) } }).lean();
    const allTeams = await Team.find({ _id: { $in: matches.flatMap((m) => m.sides.map((s) => s.teamId)) } }).lean();
    const PlayGame = require('../models/PlayGame');
    const gameRows = await games.withCodes(await PlayGame.find({ _id: { $in: matches.flatMap((m) => m.gameIds) } }).select('status code kind seats.userId seats.code seats.joinedAt').lean());
    const compOf = (id) => comps.find((c) => String(c._id) === String(id));
    const myTeamIn = (m) => myTeams.find((t) => m.sides.some((s) => String(s.teamId) === String(t._id)));
    const withComp = (m) => {
        const c = compOf(m.competitionId);
        const team = myTeamIn(m);
        const side = m.sides.find((s) => String(s.teamId) === String(team?._id));
        const v = views.matchView(m, allTeams, gameRows, { showCode: true });
        if (c && views.resultsHidden(c)) Object.assign(v, { winnerTeamId: null, places: [], resultNote: '' });
        // My own joining code for the open game, not the match's.
        const latest = gameRows.find((g) => String(g._id) === String(m.gameIds?.at(-1)));
        const seat = latest?.seats?.find((s) => String(s.userId) === String(req.user._id));
        // No code while the entry fee is owed.
        const owes = fees.due(c) && !team?.players.find((p) => String(p.userId) === String(req.user._id))?.paidAt;
        if (seat?.code) v.gameCode = ['waiting', 'active'].includes(latest.status) && !owes ? seat.code : null;
        else if (latest?.seats?.some((s) => s.code)) v.gameCode = null;
        return {
            ...v,
            joined: !!seat?.joinedAt,
            competition: c ? { id: String(c._id), name: c.name, game: c.game, ...views.gameInfo(c.game) } : null,
            myTeamId: team ? String(team._id) : null,
            // Whether I am one of the players at the board for this match.
            playing: !!side && (side.lineup.length ? side.lineup.some((id) => String(id) === String(req.user._id)) : team.players.slice(0, c?.playersPerSide || 1).some((p) => String(p.userId) === String(req.user._id))),
            result: m.status === 'completed' && team && !(c && views.resultsHidden(c)) ? (String(m.winnerTeamId) === String(team._id) ? 'won' : 'lost') : null
        };
    };
    const rows = matches.filter((m) => compOf(m.competitionId)).map(withComp);
    const byTime = (a, b) => new Date(a.scheduledAt || 8.64e15) - new Date(b.scheduledAt || 8.64e15);
    res.json({
        competitions: comps.map((c) => views.studentCompetition(views.competitionView(c, { teams: [], myTeam: myTeams.find((t) => String(t.competitionId) === String(c._id)) }))),
        upcoming: rows.filter((m) => m.status === 'scheduled').sort(byTime),
        live: rows.filter((m) => m.status === 'live'),
        completed: rows.filter((m) => m.status === 'completed').sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
        // My history: every finished competition I played in, where my team
        // finished, and its record — matches won of those played.
        results: (await (async () => {
            const done = comps.filter((c) => c.status === 'completed' && !views.resultsHidden(c));
            // A Builder certificate counts too (2026-10-31): the results pop-up and Download show it.
            built = await require('../certificates/auto').issuedIds(req.user._id, 'competition', done.map((c) => String(c._id))).catch(() => new Set());
            // The standard certificate: only for a player who actually took part (services/certificate.js eligibleFor).
            const { eligibleFor } = require('../services/certificate');
            const ok = await Promise.all(done.map((c) => {
                const team = myTeams.find((t) => String(t.competitionId) === String(c._id));
                return team?.status === 'approved' ? eligibleFor(c, team, req.user._id) : false;
            }));
            certOk = new Set(done.filter((c, i) => ok[i]).map((c) => String(c._id)));
            return done;
        })()).map((c) => {
            const team = myTeams.find((t) => String(t.competitionId) === String(c._id));
            const decided = matches.filter((m) => String(m.competitionId) === String(c._id) && m.status === 'completed'
                && m.sides.some((s) => String(s.teamId) === String(team?._id)));
            return {
                competition: { id: String(c._id), name: c.name, game: c.game, ...views.gameInfo(c.game), completedAt: c.resultsPublishedAt || c.completedAt },
                teamName: team?.teamName || '',
                collegeName: team?.collegeName || '',
                place: team?.place || null,
                score: { won: decided.filter((m) => String(m.winnerTeamId) === String(team?._id)).length, played: decided.length },
                certificate: built.has(String(c._id)) || certOk.has(String(c._id))
            };
        })
    });
}));

router.get('/leaderboard', wrap(async (req, res) => {
    // ?game=chess: that game's rankings only (2026-11-04).
    const game = ['chess', 'rapidfire', 'codeclash', 'brainsprint'].includes(req.query.game) ? req.query.game : null;
    res.json(await require('../services/leaderboardService').board({ game }));
}));

router.get('/history', wrap(async (req, res) => {
    const mine = await Team.find({ 'players.userId': req.user._id }).lean();
    const comps = (await Competition.find({ status: 'completed' , ...NO_CHALLENGES }).sort({ completedAt: -1 }).lean()).filter((c) => seenBy(req.user, c, mine));
    const out = [];
    for (const c of comps.filter((x) => !views.resultsHidden(x))) out.push(views.studentDetail(await views.detail(c._id, { userId: req.user._id })));
    res.json({ competitions: out });
}));

// My competition certificates, for My Profile's certificate frame: one for
// every finished competition I played in for an approved team, of the kinds
// that competition gives (see services/certificate.js `eligible`), less any I
// deleted from the frame. Each is drawn as a PDF on request by
// GET /:id/certificate, as from the History tab.
router.get('/certificates', wrap(async (req, res) => {
    const { eligibleFor, winnerWords, TITLE, GAME } = require('../services/certificate');
    const teams = await Team.find({ 'players.userId': req.user._id, status: 'approved' }).lean();
    const comps = await Competition.find({ _id: { $in: teams.map((t) => t.competitionId) }, status: 'completed', resultsPublishedAt: { $ne: null }, ...NO_CHALLENGES }).lean();
    // Only players who actually took part (services/certificate.js eligibleFor).
    const ok = await Promise.all(comps.map((c) => {
        const team = teams.find((t) => String(t.competitionId) === String(c._id));
        return team ? eligibleFor(c, team, req.user._id) : false;
    }));
    const certificates = comps.map((c, i) => {
        const team = teams.find((t) => String(t.competitionId) === String(c._id));
        if (!team || !ok[i]) return null;
        const player = team.players.find((p) => String(p.userId) === String(req.user._id));
        if (player?.certificateHiddenAt) return null;
        return {
            competitionId: String(c._id), name: c.name, game: c.game, gameLabel: GAME[c.game] || c.game,   // as the PDF names it
            organizedBy: c.organizedBy || 'YATICORP', completedAt: c.completedAt,
            teamName: team.teamName, collegeName: team.collegeName, place: team.place || null,
            title: team.place ? TITLE[team.place] : 'Certificate of Participation',
            playerName: player?.name || req.user.name,
            // The winners' certificate's own lines, as the PDF writes them,
            // so the preview on My Profile says exactly the same.
            words: team.place ? winnerWords({ competition: c, team, place: team.place }) : null
        };
    }).filter(Boolean);
    // The organisers' own certificates (Certificate Builder, 2026-10-31): drawn on My Profile as they print, and the
    // Quiz Arena ones too. One a competition — the host's design first (certificates/auto.js).
    const auto = require('../certificates/auto');
    const { ArenaCompetition, ArenaEntry } = require('../arena/models');
    const arenaIds = (await ArenaEntry.find({ userId: req.user._id, status: 'approved' }).select('competitionId').lean()).map((e) => String(e.competitionId));
    const arenas = await ArenaCompetition.find({ _id: { $in: arenaIds }, resultsPublishedAt: { $ne: null } }).select('_id').lean();
    const keys = [...comps.map((c) => ['competition', String(c._id)]), ...arenas.map((a) => ['arena', String(a._id)])];
    for (const [kind, id] of keys) {
        const built = await auto.forStudent(req.user._id, kind, id).catch(() => null);
        if (!built) continue;
        const { cert, design } = built;
        const issued = issuedView(cert, design);
        const old = kind === 'competition' && certificates.find((x) => x.competitionId === id);
        if (old) { old.issued = issued; continue; }
        const place = { first: 1, second: 2, third: 3 }[cert.award.kind] || null;
        certificates.push({
            ...(kind === 'arena' ? { arenaId: id } : { competitionId: id }),
            name: design.competition.name, completedAt: cert.createdAt, place,
            title: place ? ['', 'Winner', 'Runner-up', 'Third Place'][place] : 'Certificate of Participation',
            playerName: cert.recipient.name, collegeName: cert.recipient.institution, issued
        });
    }
    certificates.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    // Each with its number, as the PDF prints it (services/certificateNumbers): competition-<id>, arena-<id>.
    const keyOf = (c) => (c.arenaId ? `arena-${c.arenaId}` : `competition-${c.competitionId}`);
    const numbers = await require('../../services/certificateNumbers').numbersFor(req.user._id, certificates.map((c) => ({ key: keyOf(c), added: c.completedAt })));
    res.json({ certificates: certificates.map((c) => ({ ...c, number: numbers[keyOf(c)] || null })) });
}));

/** A Builder certificate as the student app draws it (its copy of certificates/templates.js). */
const issuedView = (cert, design) => ({
    certId: cert.certId,
    template: design.template,
    input: {
        recipient: cert.recipient, award: cert.award, competition: design.competition.name, description: design.description,
        details: design.details ? { type: design.details.mode, college: design.details.college, department: design.details.department, address: design.details.address, affiliation: design.details.affiliation, tagline: design.details.tagline, title: design.details.title, intro: design.details.intro } : undefined,
        date: design.date, venue: design.venue, certId: cert.certId,
        signatories: (design.signatories || []).map((s) => ({ name: s.name, designation: s.designation, signature: Boolean(s.signature) })),
        brand: { name: design.branding?.name || '', tagline: design.branding?.tagline || '', org: design.branding?.org || '' },
        hasLogo: Boolean(design.branding?.logo || design.branding?.yaticorp), hasBg: Boolean(design.branding?.background), ownLogo: Boolean(design.branding?.logo), hasSeal: Boolean(design.branding?.seal), noQr: design.scope === 'organization' && !design.showQr, plain: design.scope === 'organization', elements: design.elements || null, logoAt: design.branding?.logoAt || null, logoShape: design.branding?.logoShape || 'original', sealAt: design.branding?.sealAt || null
    },
    images: {
        logo: design.branding?.logo || (design.branding?.yaticorp ? 'yaticorp' : ''), seal: design.branding?.seal || '', background: design.branding?.background || '',
        ...Object.fromEntries((design.signatories || []).map((s, i) => [`sig${i}`, s.signature || '']))
    }
});

// Delete a competition certificate from My Profile. It only leaves the frame:
// the competition was played and the certificate stays the player's, so
// downloading it again from Games & Competitions brings it back.
// The questions I have met, so neither the solo nor the group games ask one again (services/seenQuestions.js).
router.get('/seen-questions', wrap(async (req, res) => {
    const doc = await require('mongoose').model('SeenQuestion').findOne({ userId: req.user._id }).select('keys').lean().catch(() => null);
    res.json({ keys: (doc?.keys || []).filter((k) => k.startsWith('o')) });
}));
router.post('/seen-questions', wrap(async (req, res) => {
    await require('../services/seenQuestions').add([req.user._id], Array.isArray(req.body?.keys) ? req.body.keys : []);
    res.json({ ok: true });
}));

router.get('/celebrated', wrap(async (req, res) => {
    const User = require('../../models/User');
    const u = await User.findById(req.user._id).select('celebratedResults').lean();
    res.json({ ids: u?.celebratedResults || [] });
}));

router.post('/celebrated', wrap(async (req, res) => {
    const User = require('../../models/User');
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter((x) => typeof x === 'string' && /^(comp|arena)-[\w-]{1,64}$/.test(x)).slice(0, 50);
    if (ids.length) await User.updateOne({ _id: req.user._id }, { $addToSet: { celebratedResults: { $each: ids } } });
    res.json({ ok: true });
}));

router.delete('/certificates/:competitionId', wrap(async (req, res) => {
    if (!require('mongoose').isValidObjectId(req.params.competitionId)) return res.status(404).json({ message: 'Certificate not found.' });
    const r = await Team.updateOne(
        { competitionId: req.params.competitionId, status: 'approved', 'players.userId': req.user._id },
        { $set: { 'players.$.certificateHiddenAt': new Date() } }
    );
    if (!r.matchedCount) return res.status(404).json({ message: 'Certificate not found.' });
    res.json({ ok: true });
}));

/* ── Play ───────────────────────────────────────────────────────────── */

// A joining code: a player's own for their match, or for a Quiz Arena.
router.post('/matches/join', wrap(async (req, res) => {
    const match = await games.joinByCode(req.user, req.body?.code);
    if (match) return res.json(match);
    const arena = await require('../arena/student').joinByCode(req.user, req.body?.code);
    if (arena) return res.json(arena);
    res.status(404).json({ message: 'No competition has that code. Check the code sent to you.' });
}));

/**
 * What has just opened for me and is waiting for my code: a match game I have
 * not joined, a Quiz Arena on now that I have not joined. The student app asks
 * every few seconds and shows a pop-up with my code.
 */
router.get('/alerts', wrap(async (req, res) => {
    const PlayGame = require('../models/PlayGame');
    await require('../services/bracketService').openDueReplays();
    // Scheduled matches whose time has come open here too.
    const myTeams = await Team.find({ 'players.userId': req.user._id, status: 'approved' }).select('competitionId').lean();
    const live = await Competition.find({ _id: { $in: myTeams.map((t) => t.competitionId) }, status: 'live' }).select('_id').lean();
    for (const c of live) await openDue(c._id);
    const open = await PlayGame.find({ kind: 'match', status: 'waiting', seats: { $elemMatch: { userId: req.user._id, joinedAt: null } } })
        .select('competitionId matchId seats joinDeadline game').lean();
    const comps = await Competition.find({ _id: { $in: open.map((g) => g.competitionId) } }).select('name').lean();
    const matches = await Match.find({ _id: { $in: open.map((g) => g.matchId) } }).select('roundName kind').lean();
    const alerts = open.map((g) => {
        const seat = g.seats.find((s) => String(s.userId) === String(req.user._id));
        const m = matches.find((x) => String(x._id) === String(g.matchId));
        return {
            id: `match:${g._id}`, kind: 'match', gameId: String(g._id), code: seat.code || null,
            title: comps.find((c) => String(c._id) === String(g.competitionId))?.name || 'Your match',
            subtitle: `${m?.kind === 'third-place' ? 'Third-place match' : m?.roundName || 'Your match'} · ${views.gameInfo(g.game).label}`,
            deadline: g.joinDeadline
        };
    });
    // Owing the entry fee: a pop-up to pay instead of the code.
    const shown = [];
    for (const a of alerts) {
        const g = open.find((x) => String(x._id) === a.gameId);
        if (!(await fees.owedBy(g.competitionId, req.user._id))) shown.push(a);
    }
    const owing = await Team.find({ 'players.userId': req.user._id, status: 'approved' }).select('competitionId players').lean();
    const feeComps = await Competition.find({ _id: { $in: owing.map((t) => t.competitionId) }, status: { $in: ['registration', 'closed', 'live'] }, 'entryFee.enabled': true }).select('name entryFee').lean();
    for (const c of feeComps) {
        const me = owing.find((t) => String(t.competitionId) === String(c._id))?.players.find((p) => String(p.userId) === String(req.user._id));
        if (me && !me.paidAt) shown.push({ id: `pay:${c._id}`, kind: 'payment', competitionId: String(c._id), title: c.name, subtitle: `Pay ₹${c.entryFee.amount} to enroll`, amount: c.entryFee.amount });
    }
    shown.push(...await require('../arena/student').alertsFor(req.user));
    // Paid, but no longer playing: once, to say whom to contact about the fee (the page says it in full).
    for (const kind of ['competition', 'arena']) {
        for (const id of await fees.paidIds(req.user._id, kind)) {
            const held = await fees.onHold(req.user, kind, id).catch(() => null);
            if (held) shown.push({ id: `hold-${kind}:${id}:${held.reason}`, kind: 'payment-hold', ...(kind === 'arena' ? { arenaId: id } : { competitionId: id }), title: held.competitionName, subtitle: 'Payment on hold', hold: held });
        }
    }
    res.json({ alerts: shown });
}));
router.get('/play/:gameId', wrap(async (req, res) => {
    const out = await games.poll(req.params.gameId, req.user._id, req.query.since);
    // A drawn match game: when its rematch opens, and then where it is.
    if (out?.game?.status === 'finished') {
        const g0 = await require('../models/PlayGame').findById(req.params.gameId).select('matchId').lean();
        const m = g0?.matchId ? await Match.findById(g0.matchId).select('replayAt gameIds status').lean() : null;
        if (m?.status === 'live') {
            await require('../services/bracketService').openDueReplays();
            const fresh = await Match.findById(g0.matchId).select('replayAt gameIds').lean();
            out.game.rematchAt = fresh.replayAt || null;
            const last = fresh.gameIds?.at(-1);
            if (last && String(last) !== String(req.params.gameId)) out.game.nextGameId = String(last);
        }
    }
    // No code for a player who still owes the entry fee.
    if (out?.game?.code) {
        const g = await require('../models/PlayGame').findById(req.params.gameId).select('competitionId').lean();
        if (g?.competitionId && await fees.owedBy(g.competitionId, req.user._id)) out.game.code = null;
    }
    res.json(out);
}));
/* ── Group Brain rooms ───────────────────────────────────────────────── */

router.get('/rooms/games', wrap(async (req, res) => res.json({ games: await rooms.catalogue() })));
// Which group games, at which room sizes, my solo levels have unlocked (services/unlocks.js).
router.get('/rooms/unlocks', wrap(async (req, res) => res.json(await require('../services/unlocks').summary(req.user._id, require('../games').ROOM_GAMES))));
router.get('/rooms/mine', wrap(async (req, res) => res.json(await rooms.myRoom(req.user._id))));
router.post('/rooms', wrap(async (req, res) => res.status(201).json(await rooms.createRoom(req.user, String(req.body?.game || ''), req.body?.options || {}))));
router.post('/rooms/join', wrap(async (req, res) => res.json(await rooms.joinRoom(req.user, req.body?.code))));
// Play online (like online Ludo): a seat at a table of 2 or 4, the entry fee in XP (services/onlineService.js).
router.get('/rooms/online', wrap(async (req, res) => { const o = require('../services/onlineService'); res.json({ fees: o.FEES, sizes: o.SIZES, waitSeconds: o.WAIT_MS / 1000, prizeShare: o.PRIZE_SHARE }); }));
router.post('/rooms/online', wrap(async (req, res) => res.json(await require('../services/onlineService').findTable(req.user, String(req.body?.game || ''), { players: req.body?.players, fee: req.body?.fee }))));
router.get('/rooms/history', wrap(async (req, res) => res.json(await rooms.history(req.user._id))));
router.get('/rooms/leaderboard', wrap(async (req, res) => res.json(await rooms.leaderboard({ type: String(req.query.type || 'points'), period: String(req.query.period || 'all'), game: req.query.game ? String(req.query.game) : undefined, userId: req.user._id }))));
// My Group Brain certificates as PDFs (a revoked one is not handed out).
router.get('/rooms/certificates/:certId', wrap(async (req, res) => {
    const { GroupBrainCertificate } = require('../groupbrain/models');
    const cert = await GroupBrainCertificate.findOne({ certId: String(req.params.certId).toUpperCase(), userId: req.user._id }).lean();
    if (!cert) return res.status(404).json({ message: 'Certificate not found.' });
    if (cert.status !== 'valid') return res.status(410).json({ message: `This certificate was revoked${cert.revokedReason ? `: ${cert.revokedReason}` : ''}.` });
    return require('../groupbrain/certificates').pdf(cert, res);
}));
router.get('/rooms/profile', wrap(async (req, res) => res.json(await rooms.profile(req.user))));
router.post('/play/:gameId/ready', wrap(async (req, res) => res.json(await rooms.setReady(req.params.gameId, req.user._id, req.body?.ready !== false))));
router.post('/play/:gameId/start', wrap(async (req, res) => res.json(await rooms.startRoom(req.params.gameId, req.user._id))));
router.post('/play/:gameId/remove', wrap(async (req, res) => res.json(await rooms.removePlayer(req.params.gameId, req.user._id, req.body?.seat))));
router.post('/play/:gameId/leave', wrap(async (req, res) => res.json(await rooms.leaveRoom(req.params.gameId, req.user._id))));

router.post('/play/:gameId/join', wrap(async (req, res) => res.json(await games.join(req.params.gameId, req.user._id, req.body?.code))));
router.post('/play/:gameId/action', wrap(async (req, res) => res.json(await games.act(req.params.gameId, req.user._id, req.body?.action))));

/* ── One competition ─────────────────────────────────────────────────── */

/**
 * `cancelled`: a cancelled one too, for its own page only, and only to a student who was in one of its teams — My
 * Teams lists it (GET /me), and its link led to "Competition not found". Paying, certificates and the rest stay off.
 */
const visible = async (id, user, { cancelled = false } = {}) => {
    if (!require('mongoose').isValidObjectId(id)) return null;
    const c = await Competition.findById(id).select('status hostOrganizationId').lean();
    // A student who paid its entry fee always reaches its page (2026-11-06): if they no longer play — team turned
    // down, taken back or removed, or the competition cancelled — it says whom to contact about the fee.
    const paid = async () => !!(await fees.EntryPayment.exists({ userId: user._id, kind: 'competition', competitionId: c._id, status: 'paid' }));
    if (c?.status === 'cancelled' && cancelled) {
        return (await Team.exists({ competitionId: c._id, 'players.userId': user._id, status: { $ne: 'withdrawn' } })) || await paid() ? c : null;
    }
    if (!c || !VISIBLE.includes(c.status)) return null;
    if (!c.hostOrganizationId) return c;
    return seenBy(user, c, await Team.find({ competitionId: c._id, 'players.userId': user._id }).lean()) || await paid() ? c : null;
};

router.get('/:id', wrap(async (req, res) => {
    await challenge.advanceDue();
    const c = await visible(req.params.id, req.user, { cancelled: true });
    if (!c) return res.status(404).json({ message: 'Competition not found.' });
    if (c.status === 'live') await require('../services/bracketService').openDueReplays();
    const d = views.studentDetail(await views.detail(c._id, { userId: req.user._id }));
    // My team's current match: whether it has been started, and only then my own code.
    const team = d.competition.myTeam?.status === 'approved' && c.status !== 'cancelled' ? d.competition.myTeam : null;
    if (team) {
        const m = (await Match.find({ competitionId: c._id, 'sides.teamId': team.id, status: { $in: ['live', 'scheduled'] } }).sort({ round: 1 }).lean())
            .sort((x, y) => (x.status === 'live' ? -1 : 0) - (y.status === 'live' ? -1 : 0))[0];
        if (m) {
            const PlayGame = require('../models/PlayGame');
            const g = m.gameIds?.length ? await PlayGame.findById(m.gameIds.at(-1)).select('status seats.userId seats.code seats.joinedAt').lean() : null;
            const seat = g?.seats?.find((x) => String(x.userId) === String(req.user._id));
            const open = m.status === 'live' && ['waiting', 'active'].includes(g?.status);
            d.myMatch = {
                id: String(m._id), roundName: m.kind === 'third-place' ? 'Third place' : m.roundName, status: m.status, scheduledAt: m.scheduledAt,
                gameId: open ? String(g._id) : null, started: open, playing: !!seat,
                // A drawn game: the rematch opens at this time.
                rematchAt: m.replayAt || null,
                code: open && seat ? seat.code || null : null, joined: !!seat?.joinedAt
            };
        }
        // The entry fee: owed until paid, and no code until then.
        const amount = fees.due(d.competition);
        if (amount) {
            const me = team.players.find((p) => p.userId === String(req.user._id));
            d.myPayment = { amount, paid: !!me?.paid };
            if (!me?.paid && d.myMatch) d.myMatch.code = null;
        }
    }
    // Paid, but not playing: whom to contact about the fee (services/entryFee.js onHold). Only my own payment.
    if (!team) {
        const held = await fees.onHold(req.user, 'competition', c._id);
        if (held) d.paymentOnHold = held;
    }
    res.json(d);
}));

/**
 * Pay the entry fee online (Razorpay), once my team is approved:
 *   POST /:id/pay          → the order for Razorpay Checkout (or { paid: true })
 *   POST /:id/pay/verify   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
const feeFor = async (req) => {
    const c = await visible(req.params.id, req.user);
    if (!c) throw Object.assign(new Error('Competition not found.'), { status: 404 });
    const comp = await Competition.findById(c._id).lean();
    const amount = fees.due(comp);
    if (!amount) throw Object.assign(new Error('This competition has no entry fee.'), { status: 409 });
    if (['completed', 'cancelled'].includes(comp.status)) throw Object.assign(new Error('This competition is over.'), { status: 409 });
    const team = await Team.findOne({ competitionId: c._id, status: 'approved', 'players.userId': req.user._id }).lean();
    if (!team) throw Object.assign(new Error('You can pay once your team is approved by the organizer.'), { status: 403 });
    const me = team.players.find((p) => String(p.userId) === String(req.user._id));
    const onPaid = (p) => Team.updateOne({ _id: team._id, 'players.userId': req.user._id }, { $set: { 'players.$.paidAt': p.paidAt, 'players.$.paidAmount': p.amount } });
    return { comp, amount, paid: !!me.paidAt, onPaid };
};
router.post('/:id/pay', wrap(async (req, res) => {
    const f = await feeFor(req);
    if (f.paid) return res.json({ paid: true });
    res.json(await fees.startPayment({ user: req.user, kind: 'competition', competitionId: f.comp._id, amount: f.amount, title: f.comp.name, onPaid: f.onPaid }));
}));
router.post('/:id/pay/verify', wrap(async (req, res) => {
    const f = await feeFor(req);
    if (f.paid) return res.json({ paid: true });
    res.json(await fees.confirmPayment({ user: req.user, kind: 'competition', competitionId: f.comp._id, body: req.body, onPaid: f.onPaid }));
}));

// Wallet rule (optional): each certificate PDF, like a course's; refunded when there is none to give.
// Certificates are free (asked 2026-10-27): no wallet charge.
router.get('/:id/certificate', wrap(async (req, res) => {
    const c = await visible(req.params.id, req.user);
    if (!c) return res.status(404).json({ message: 'Competition not found.' });
    const competition = await Competition.findById(c._id).lean();
    if (competition.status !== 'completed') return res.status(409).json({ message: 'Certificates are ready once the competition is over.' });
    if (views.resultsHidden(competition)) return res.status(409).json({ message: 'Certificates come with the results, once the organizer publishes them.' });
    // The organiser's own certificate (the Certificate Builder, 2026-10-31), when they made one: issued by itself
    // from the results, with my name and place.
    const built = await require('../certificates/auto').forStudent(req.user._id, 'competition', String(c._id));
    if (built) return require('../certificates/render').pdf(res, built.design, [built.cert], `Certificate_${competition.name}.pdf`);
    const team = await Team.findOne({ competitionId: c._id, status: 'approved', 'players.userId': req.user._id }).lean();
    if (!team) return res.status(403).json({ message: 'Only players of a team that took part get a certificate.' });
    const cert = require('../services/certificate');
    if (!cert.eligible(competition, team)) {
        return res.status(404).json({ message: team.place ? 'This competition does not give winners\' certificates.' : 'This competition gives certificates only to its winners.' });
    }
    if (!await cert.tookPart(competition, req.user._id)) return res.status(403).json({ message: 'Certificates are only for players who took part in a match.' });
    const playerName = team.players.find((p) => String(p.userId) === String(req.user._id))?.name || req.user.name;
    // Downloaded again: back in My Profile's frame if it was deleted from there.
    await Team.updateOne({ _id: team._id, 'players.userId': req.user._id }, { $set: { 'players.$.certificateHiddenAt': null } });
    // Its number in the student's series of certificates (YATI<card>-001, services/certificateNumbers), printed on it.
    const key = `competition-${competition._id}`;
    const number = (await require('../../services/certificateNumbers').numbersFor(req.user._id, [{ key, added: competition.completedAt }]))[key];
    require('../services/certificate').draw(res, { competition, team, playerName, place: team.place || null, number });
}));

/* ── A quiz or a hackathon ───────────────────────────────────────────── */

/** The whole competition, when this student may see it. */
const full = async (req) => {
    await challenge.advanceDue();
    const c = await visible(req.params.id, req.user);
    if (!c) throw Object.assign(new Error('Competition not found.'), { status: 404 });
    return Competition.findById(c._id).lean();
};

router.post('/:id/signup', wrap(async (req, res) => {
    const c = await full(req);
    await challenge.signUp(c, req.user);
    res.status(201).json(views.studentDetail(await views.detail(c._id, { userId: req.user._id })));
}));
router.delete('/:id/signup', wrap(async (req, res) => {
    const c = await full(req);
    await challenge.withdraw(c, req.user);
    res.json(views.studentDetail(await views.detail(c._id, { userId: req.user._id })));
}));

router.get('/:id/quiz', wrap(async (req, res) => {
    const c = await full(req);
    if (c.game !== 'quiz') return res.status(404).json({ message: 'This competition has no quiz.' });
    res.json(await challenge.quizState(c, req.user));
}));
router.post('/:id/quiz/start', wrap(async (req, res) => res.json(await challenge.startQuiz(await full(req), req.user))));
router.put('/:id/quiz', wrap(async (req, res) => res.json(await challenge.saveQuiz(await full(req), req.user, { answers: req.body?.answers || {}, submit: !!req.body?.submit }))));

router.get('/:id/project', wrap(async (req, res) => {
    const c = await full(req);
    if (c.game !== 'hackathon') return res.status(404).json({ message: 'This competition has no project to hand in.' });
    res.json(await challenge.projectState(c, req.user));
}));
router.put('/:id/project', wrap(async (req, res) => res.json(await challenge.saveProject(await full(req), req.user, req.body || {}))));

module.exports = router;
