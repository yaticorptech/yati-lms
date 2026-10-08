/**
 * The knockout: drawing round 1, opening each match's game, recording what the
 * game decided, and building the next round from the winners until one team
 * is left — then the competition is complete and its prizes go out.
 *
 * A match holds 2 teams for chess and carrom, up to 4 for ludo and UNO. The
 * winner of each match goes through; with two-team matches the two beaten
 * semi-finalists also play off for third place.
 *
 * Rounds are named by how many matches they hold: one is the Final, two the
 * Semi Final, three or four the Quarter Final, more "Round 1", "Round 2"…
 */
const crypto = require('node:crypto');
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const PlayGame = require('../models/PlayGame');

/** Three drawn games in a row: the admin decides instead of a fourth. */
const MAX_REPLAYS = 3;

const roundName = (matches, round) => (matches === 1 ? 'Final' : matches === 2 ? 'Semi Final' : matches <= 4 ? 'Quarter Final' : `Round ${round + 1}`);

const shuffle = (list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i -= 1) {
        const j = crypto.randomInt(0, i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/** Split teams into matches of up to `per`, as even as possible. */
const groupsOf = (teams, per) => {
    const count = Math.ceil(teams.length / per);
    const groups = Array.from({ length: count }, () => []);
    teams.forEach((t, i) => groups[i % count].push(t));
    return groups;
};

const same = (a, b) => String(a) === String(b);

/** Create one round's matches. A group of one is a bye: straight through. */
const createRound = async (competition, round, teamIds, scheduledAt = null) => {
    const groups = groupsOf(teamIds, competition.teamsPerMatch || 2);
    const name = roundName(groups.length, round);
    const docs = groups.map((group, slot) => ({
        competitionId: competition._id, round, roundName: name, slot, kind: 'main',
        sides: group.map((teamId) => ({ teamId, lineup: [] })),
        scheduledAt,
        ...(group.length === 1
            ? { status: 'bye', winnerTeamId: group[0], places: [[group[0]]], decidedBy: 'bye', completedAt: new Date() }
            : { status: 'scheduled' })
    }));
    return Match.insertMany(docs);
};

/**
 * Draw round 1 from the approved teams. The first matches start at
 * `firstMatchAt` (default the competition's start), `gapMinutes` apart.
 */
const drawBracket = async (competition, { firstMatchAt, gapMinutes = 0 } = {}) => {
    const approved = await Team.find({ competitionId: competition._id, status: 'approved' }).select('_id').lean();
    if (approved.length < 2) throw Object.assign(new Error('At least two approved teams are needed to draw the matches.'), { status: 400 });
    if (await Match.exists({ competitionId: competition._id })) throw Object.assign(new Error('The matches have already been drawn.'), { status: 409 });
    const start = firstMatchAt ? new Date(firstMatchAt) : competition.startsAt;
    const rows = await createRound(competition, 0, shuffle(approved.map((t) => t._id)), start);
    const gap = Math.max(0, Number(gapMinutes) || 0);
    if (gap) {
        await Promise.all(rows.filter((m) => m.status === 'scheduled').map((m, i) =>
            Match.updateOne({ _id: m._id }, { $set: { scheduledAt: new Date(start.getTime() + i * gap * 60 * 1000) } })));
    }
    await Competition.updateOne({ _id: competition._id }, { $set: { status: 'live' } });
    await advance(competition._id);     // a round of byes alone moves straight on
    return Match.find({ competitionId: competition._id }).sort({ round: 1, kind: 1, slot: 1 });
};

/** Open a match's game now (the admin's Start, or its time arriving). */
const openMatch = async (match) => {
    if (match.status !== 'scheduled') return match;
    const competition = await Competition.findById(match.competitionId);
    if (!competition || competition.status !== 'live') return match;
    // Claim it first, so two callers cannot both open a game.
    const claimed = await Match.findOneAndUpdate({ _id: match._id, status: 'scheduled' }, { $set: { status: 'live' } }, { returnDocument: 'after' });
    if (!claimed) return Match.findById(match._id);
    const teams = await Team.find({ _id: { $in: claimed.sides.map((s) => s.teamId) } }).lean();
    const game = await require('./gameService').openMatchGame({ competition, match: claimed, teams });
    // The line-up actually seated is the one the results count for.
    const sides = claimed.sides.map((s, i) => ({
        teamId: s.teamId,
        lineup: game.seats.filter((seat) => seat.side === i).map((seat) => seat.userId)
    }));
    return Match.findOneAndUpdate({ _id: claimed._id }, { $push: { gameIds: game._id }, $set: { sides } }, { returnDocument: 'after' });
};

/** Open every scheduled match whose time has come. Cheap; called on reads. */
const openDue = async (competitionId) => {
    const due = await Match.find({ competitionId, status: 'scheduled', scheduledAt: { $ne: null, $lte: new Date() } });
    for (const m of due) await openMatch(m);
};

/**
 * A match's game has finished: turn its places (sides) into teams, decide the
 * match — or replay a draw — and move the competition on.
 */
const recordGame = async (game) => {
    const match = await Match.findById(game.matchId);
    if (!match || match.status !== 'live') return;
    if (!match.gameIds.some((id) => same(id, game._id)) || !same(match.gameIds.at(-1), game._id)) return;

    if (game.status === 'abandoned') {
        await Match.updateOne({ _id: match._id }, { $set: { needsDecision: true, resultNote: 'Nobody joined the game. The organizer will decide this match.' } });
        return;
    }
    const sideTeam = (side) => game.sideTeams[side];
    const places = (game.outcome?.places || []).map((group) => group.map(sideTeam).filter(Boolean)).filter((g) => g.length);
    if (game.absentTeams?.length) places.push([...game.absentTeams]);

    if (!places.length) {
        await Match.updateOne({ _id: match._id }, { $set: { needsDecision: true, resultNote: 'The game ended without a result.' } });
        return;
    }
    if (places[0].length > 1) {
        // A draw at the top. Replay between the tied teams, colours swapped,
        // until a winner — or until the admin has to step in.
        const draws = match.gameIds.length;
        if (draws >= MAX_REPLAYS) {
            await Match.updateOne({ _id: match._id }, { $set: { needsDecision: true, resultNote: `${draws} drawn games. The organizer will decide this match.` } });
            return;
        }
        const tied = places[0];
        const sides = [...match.sides].filter((s) => tied.some((t) => same(t, s.teamId))).reverse();
        const competition = await Competition.findById(match.competitionId);
        const teams = await Team.find({ _id: { $in: sides.map((s) => s.teamId) } }).lean();
        const next = await require('./gameService').openMatchGame({ competition, match: { ...match.toObject(), sides }, teams });
        await Match.updateOne({ _id: match._id }, { $push: { gameIds: next._id }, $set: { resultNote: `Game ${draws} was drawn — replaying.` } });
        return;
    }
    await decide(match, places, game.outcome?.walkover ? 'walkover' : 'game', game.outcome?.reason || '');
};

/** Settle a match with `places` (team ids, best first) and move on. */
const decide = async (match, places, by, note = '') => {
    const done = await Match.findOneAndUpdate(
        { _id: match._id, status: { $in: ['scheduled', 'live'] } },
        { $set: { status: 'completed', places, winnerTeamId: places[0][0], decidedBy: by, resultNote: note, needsDecision: false, completedAt: new Date() } },
        { returnDocument: 'after' }
    );
    if (!done) return null;
    // A live game the admin overruled is closed, so nobody plays on in it.
    if (by === 'admin') {
        await PlayGame.updateMany({ matchId: match._id, status: { $in: ['waiting', 'active'] } },
            { $set: { status: 'abandoned', finishedAt: new Date(), nextDeadline: null }, $inc: { version: 1 } });
    }
    await advance(match.competitionId);
    return done;
};

/**
 * The admin decides a match: a forfeit, a dispute, a game nobody joined.
 * `winnerTeamId` first; the others follow in the order given (or as drawn).
 */
const adminResult = async (match, { winnerTeamId, order = [], note = '' }) => {
    const ids = match.sides.map((s) => String(s.teamId));
    if (!ids.includes(String(winnerTeamId))) throw Object.assign(new Error('The winner must be one of the teams in this match.'), { status: 400 });
    const rest = [...order.map(String).filter((id) => ids.includes(id) && id !== String(winnerTeamId)),
        ...ids.filter((id) => id !== String(winnerTeamId) && !order.map(String).includes(id))];
    const all = [String(winnerTeamId), ...rest];
    const places = all.map((id) => [match.sides.find((s) => String(s.teamId) === id).teamId]);
    const done = await decide(match, places, 'admin', note || 'Decided by the organizer.');
    if (!done) throw Object.assign(new Error('This match has already been decided.'), { status: 409 });
    return done;
};

/**
 * Build the next round once every match in the current one is decided, or
 * complete the competition once the final (and the third-place play-off) is.
 */
const advance = async (competitionId) => {
    const competition = await Competition.findById(competitionId);
    if (!competition || competition.status !== 'live') return;
    const matches = await Match.find({ competitionId }).sort({ round: 1, slot: 1 });
    if (!matches.length) return;
    const last = Math.max(...matches.map((m) => m.round));
    const current = matches.filter((m) => m.round === last);
    if (current.some((m) => !['completed', 'bye'].includes(m.status))) return;
    const main = current.filter((m) => m.kind === 'main');

    if (main.length === 1) {
        // The final is decided (and the play-off for third, if there was one).
        const final = main[0];
        const third = current.find((m) => m.kind === 'third-place');
        const flat = final.places.flat();
        const winners = [{ place: 1, teamId: flat[0] }];
        if (flat[1]) winners.push({ place: 2, teamId: flat[1] });
        if (third?.winnerTeamId) winners.push({ place: 3, teamId: third.winnerTeamId });
        else if (flat[2]) winners.push({ place: 3, teamId: flat[2] });
        const done = await Competition.findOneAndUpdate(
            { _id: competitionId, status: 'live' },
            { $set: { status: 'completed', winners, completedAt: new Date() } },
            { returnDocument: 'after' }
        );
        if (!done) return;
        await Promise.all(winners.map((w) => Team.updateOne({ _id: w.teamId }, { $set: { place: w.place } })));
        try { await require('./awardService').award(done); }
        catch (err) { console.error('[competitions] awarding prizes failed:', err.message); }
        return;
    }

    // The next round, from this round's winners in bracket order.
    const winners = main.sort((a, b) => a.slot - b.slot).map((m) => m.winnerTeamId);
    const next = last + 1;
    if (await Match.exists({ competitionId, round: next })) return;     // someone else got here first
    try {
        await createRound(competition, next, winners);
    } catch (err) {
        if (err?.code === 11000) return;
        throw err;
    }
    // Two-team semi-finals: the beaten semi-finalists play off for third.
    if (main.length === 2 && (competition.teamsPerMatch || 2) === 2) {
        const losers = main.map((m) => m.places.flat()[1]).filter(Boolean);
        if (losers.length === 2) {
            await Match.create({
                competitionId, round: next, roundName: 'Third place', slot: 0, kind: 'third-place',
                sides: losers.map((teamId) => ({ teamId, lineup: [] }))
            }).catch((err) => { if (err?.code !== 11000) throw err; });
        }
    }
    await advance(competitionId);     // a round of byes moves straight on
};

module.exports = { drawBracket, openMatch, openDue, recordGame, adminResult, advance, roundName, groupsOf };
