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

/**
 * The break before the next round: it is made, and starts by itself, this
 * long after the last match of the round before is decided. Nobody waits for
 * the organizer (who can still move it, or start it sooner, from their page).
 */
const NEXT_ROUND_MINUTES = 15;

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
    // Every player hears who they play first, and when (after the reply).
    afterReply('telling players of the draw', () => tellDraw(competition));
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
    const opened = await Match.findOneAndUpdate({ _id: claimed._id }, { $push: { gameIds: game._id }, $set: { sides } }, { returnDocument: 'after' });
    // Both teams' players: the game is waiting for them now.
    afterReply('telling players a match is open', () => tellOpen(competition, claimed, teams));
    return opened;
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
    const done = await decide(match, places, game.outcome?.walkover ? 'walkover' : 'game', game.outcome?.reason || '');
    // XP rule (optional): the players of the side that won it at the board,
    // once per match. Not a walkover, and not a match the organizer decided.
    if (done && !game.outcome?.walkover) {
        const { recordIfRuled } = require('../../rewards/services/xpHooks');
        const winnerSide = game.outcome.places[0][0];
        for (const seat of game.seats.filter((s) => s.side === winnerSide)) {
            await recordIfRuled({ userId: seat.userId, type: 'competition_match_win', refId: `match:${match._id}` });
        }
    }
};

/** Settle a match with `places` (team ids, best first) and move on. */
const decide = async (match, places, by, note = '') => {
    const done = await Match.findOneAndUpdate(
        { _id: match._id, status: { $in: ['scheduled', 'live'] } },
        { $set: { status: 'completed', places, winnerTeamId: places[0][0], decidedBy: by, resultNote: note, needsDecision: false, completedAt: new Date() } },
        { returnDocument: 'after' }
    );
    if (!done) return null;
    afterReply('telling players a result', () => tellResult(done));
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

/** The first round's fixtures, as drawn: who each team plays and when, or its bye. */
const tellDraw = async (competition) => {
    const { tell, when } = require('./notices');
    const matches = await Match.find({ competitionId: competition._id, round: 0 }).lean();
    const teams = await Team.find({ _id: { $in: matches.flatMap((m) => m.sides.map((s) => s.teamId)) } }).lean();
    const team = (id) => teams.find((t) => same(t._id, id));
    for (const m of matches) {
        for (const side of m.sides) {
            const mine = team(side.teamId);
            if (!mine) continue;
            const others = m.sides.filter((s) => !same(s.teamId, side.teamId)).map((s) => team(s.teamId)?.teamName).filter(Boolean).join(', ');
            const message = m.status === 'bye'
                ? `${competition.name}: ${mine.teamName} has a bye and goes straight into the next round.`
                : `${competition.name}: ${mine.teamName} plays ${others || 'its first match'}${m.scheduledAt ? ` on ${when(m.scheduledAt)}` : ''}. Join from Games & Competitions → My Games when it opens.`;
            await tell(mine.players.map((p) => p.userId), competition, `Matches drawn: ${m.roundName || 'first round'}`, message);
        }
    }
};

/** A match's game is open: its players have JOIN_MINUTES to take their seats. */
const tellOpen = async (competition, match, teams) => {
    const { tell } = require('./notices');
    const { JOIN_MINUTES } = require('./gameService');
    const what = match.kind === 'third-place' ? 'Third-place match' : (match.roundName || 'Your match');
    for (const side of match.sides) {
        const mine = teams.find((t) => same(t._id, side.teamId));
        if (!mine) continue;
        const others = match.sides.filter((s) => !same(s.teamId, side.teamId)).map((s) => teams.find((t) => same(t._id, s.teamId))?.teamName).filter(Boolean).join(', ');
        await tell(mine.players.map((p) => p.userId), competition, `${what} is open — join now`,
            `${competition.name}: ${mine.teamName} vs ${others || 'the other team'}. Join from Games & Competitions → My Games within ${JOIN_MINUTES} minutes.`);
    }
};

/** A match is decided: the winners and the others each hear how it went. */
const tellResult = async (match) => {
    const { tell } = require('./notices');
    const competition = await Competition.findById(match.competitionId).lean();
    if (!competition) return;
    const teams = await Team.find({ _id: { $in: match.sides.map((s) => s.teamId) } }).lean();
    const name = (id) => teams.find((t) => same(t._id, id))?.teamName || 'the other team';
    const what = match.kind === 'third-place' ? 'third-place match' : (match.roundName || 'match');
    for (const side of match.sides) {
        const mine = teams.find((t) => same(t._id, side.teamId));
        if (!mine) continue;
        const won = same(match.winnerTeamId, mine._id);
        const others = match.sides.filter((s) => !same(s.teamId, mine._id)).map((s) => name(s.teamId)).join(', ');
        await tell(mine.players.map((p) => p.userId), competition, won ? `You won your ${what}` : `${what[0].toUpperCase()}${what.slice(1)} lost`,
            won ? `${competition.name}: ${mine.teamName} beat ${others}.` : `${competition.name}: ${mine.teamName} lost to ${name(match.winnerTeamId)}.`);
    }
};

/** Every player of a team in the new round: when it starts, and who they play. */
const tellNextRound = async (competition, round) => {
    const { tell } = require('./notices');
    const { JOIN_MINUTES } = require('./gameService');
    const matches = await Match.find({ competitionId: competition._id, round, status: 'scheduled' }).lean();
    const teams = await Team.find({ _id: { $in: matches.flatMap((m) => m.sides.map((s) => s.teamId)) } }).lean();
    const team = (id) => teams.find((t) => same(t._id, id));
    for (const m of matches) {
        const what = m.kind === 'third-place' ? 'Third-place match' : m.roundName;
        for (const side of m.sides) {
            const mine = team(side.teamId);
            const others = m.sides.filter((s) => !same(s.teamId, side.teamId)).map((s) => team(s.teamId)?.teamName).filter(Boolean).join(', ');
            await tell((mine?.players || []).map((p) => p.userId), competition, `${what} starts in ${NEXT_ROUND_MINUTES} minutes`,
                `${competition.name}: ${mine.teamName} plays ${others || 'its next match'}. Join from Games & Competitions → My Games within ${JOIN_MINUTES} minutes of the start.`);
        }
    }
};

/** Work done after the reply (prizes, notifications); settled() waits for it (tests do). */
const pending = new Set();
const afterReply = (what, work) => {
    const run = Promise.resolve().then(work)
        .catch((err) => console.error(`[competitions] ${what} failed:`, err.message))
        .finally(() => pending.delete(run));
    pending.add(run);
};
const settled = () => Promise.all([...pending]);
const payPrizes = (competition) => afterReply('awarding prizes', () => require('./awardService').award(competition));

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
        // Paying every player takes a while (about a second each), so it runs
        // after the reply: whoever decided the final — the organizer, or the
        // player whose move ended it — is not kept waiting, and a big final
        // does not time out. The payments are safe to repeat; "Issue prizes
        // again" finishes any that were cut short.
        payPrizes(done);
        return;
    }

    // The next round, from this round's winners in bracket order, starting
    // by itself after a short break.
    const winners = main.sort((a, b) => a.slot - b.slot).map((m) => m.winnerTeamId);
    const next = last + 1;
    if (await Match.exists({ competitionId, round: next })) return;     // someone else got here first
    const startsAt = new Date(Date.now() + NEXT_ROUND_MINUTES * 60 * 1000);
    try {
        await createRound(competition, next, winners, startsAt);
    } catch (err) {
        if (err?.code === 11000) return;
        throw err;
    }
    // Two-team semi-finals: the beaten semi-finalists play off for third.
    if (main.length === 2 && (competition.teamsPerMatch || 2) === 2) {
        const losers = main.map((m) => m.places.flat()[1]).filter(Boolean);
        if (losers.length === 2) {
            await Match.create({
                competitionId, round: next, roundName: 'Third place', slot: 0, kind: 'third-place', scheduledAt: startsAt,
                sides: losers.map((teamId) => ({ teamId, lineup: [] }))
            }).catch((err) => { if (err?.code !== 11000) throw err; });
        }
    }
    // After the reply, like the prizes: a notification for every player.
    afterReply('telling players of the next round', () => tellNextRound(competition, next));
    await advance(competitionId);     // a round of byes moves straight on
};

module.exports = { drawBracket, openMatch, openDue, recordGame, adminResult, advance, settled, roundName, groupsOf, NEXT_ROUND_MINUTES };
