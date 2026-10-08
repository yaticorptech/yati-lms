/**
 * The Games & Competitions leaderboard: colleges, teams and players, from every
 * decided match and every finished competition.
 *
 * Points, the same for all three:
 *   3 for each match won · 1 for each match played (byes do not count)
 *   10 / 6 / 4 for finishing 1st / 2nd / 3rd in a competition
 * A college's points are its teams' points added up.
 */
const Match = require('../models/Match');
const Team = require('../models/Team');
const Competition = require('../models/Competition');

const PLACE_POINTS = { 1: 10, 2: 6, 3: 4 };

const board = async () => {
    const [teams, matches, comps] = await Promise.all([
        Team.find({ status: 'approved' }).lean(),
        Match.find({ status: 'completed', decidedBy: { $in: ['game', 'admin', 'walkover'] } }).lean(),
        Competition.find({ status: { $in: ['live', 'completed'] } }).select('name game status').lean()
    ]);
    const compName = new Map(comps.map((c) => [String(c._id), c]));
    const teamRows = new Map(teams.filter((t) => compName.has(String(t.competitionId))).map((t) => [String(t._id), {
        id: String(t._id), teamName: t.teamName, collegeName: t.collegeName, organizationId: String(t.organizationId),
        competition: compName.get(String(t.competitionId))?.name || '', game: compName.get(String(t.competitionId))?.game || '',
        played: 0, won: 0, place: t.place || null, points: 0
    }]));
    const playerRows = new Map();
    const player = (userId, name, team) => {
        const key = String(userId);
        if (!playerRows.has(key)) playerRows.set(key, { id: key, name: name || 'Player', collegeName: team.collegeName, played: 0, won: 0, titles: 0, points: 0 });
        return playerRows.get(key);
    };
    const nameOf = new Map(teams.flatMap((t) => t.players.map((p) => [String(p.userId), p.name])));

    for (const m of matches) {
        for (const side of m.sides) {
            const row = teamRows.get(String(side.teamId));
            if (!row) continue;
            const won = String(m.winnerTeamId) === String(side.teamId);
            row.played += 1; row.won += won ? 1 : 0;
            const team = teams.find((t) => String(t._id) === String(side.teamId));
            for (const userId of side.lineup || []) {
                const p = player(userId, nameOf.get(String(userId)), team);
                p.played += 1; p.won += won ? 1 : 0;
            }
        }
    }
    for (const row of teamRows.values()) {
        row.points = row.won * 3 + row.played + (PLACE_POINTS[row.place] || 0);
    }
    // A player shares their team's placing.
    for (const t of teams) {
        if (!t.place || !teamRows.has(String(t._id))) continue;
        for (const pl of t.players) {
            const p = player(pl.userId, pl.name, t);
            p.titles += t.place === 1 ? 1 : 0;
            p.points += PLACE_POINTS[t.place] || 0;
        }
    }
    for (const p of playerRows.values()) p.points += p.won * 3 + p.played;

    const colleges = new Map();
    for (const row of teamRows.values()) {
        const c = colleges.get(row.organizationId) || { id: row.organizationId, collegeName: row.collegeName, competitions: 0, played: 0, won: 0, titles: 0, points: 0 };
        c.competitions += 1; c.played += row.played; c.won += row.won; c.titles += row.place === 1 ? 1 : 0; c.points += row.points;
        colleges.set(row.organizationId, c);
    }
    const rank = (list) => list.sort((a, b) => b.points - a.points || b.won - a.won || a.played - b.played)
        .map((r, i) => ({ ...r, rank: i + 1 }));
    return {
        colleges: rank([...colleges.values()]),
        teams: rank([...teamRows.values()]).map(({ organizationId, ...r }) => r),
        players: rank([...playerRows.values()]).filter((p) => p.played > 0 || p.points > 0)
    };
};

module.exports = { board, PLACE_POINTS };
