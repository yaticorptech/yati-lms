/**
 * Who actually took part in a competition (2026-11-06: "a certificate only for those who played"). Being on an
 * approved team is not enough: before, every player listed on one got a participation certificate even if they never
 * played. Quiz Arena already checks this itself (arena/scoring `tookPart`); this is the same for the other competitions.
 *
 *   Game (chess, Rapid Fire, …)  a player who joined one of its match games (a seat with `joinedAt`). Showing up
 *                                counts, so the side that came to a walkover took part; the side that never came, a
 *                                team that only had byes, and a game nobody joined (then decided by the organizer) do
 *                                not. A match the organizer decided with no game ever opened (played away from the
 *                                app): its line-up, or the whole team when none was picked.
 *   Quiz                         a player who started it (a QuizAttempt).
 *   Hackathon                    every player of a team that handed in a project (a Submission: one per team).
 *
 * `whoTookPart` is the rule, on plain rows (no database); `tookPartIn` loads the rows for one competition.
 */

const str = (x) => String(x?._id ?? x);

/**
 * The players who took part: a Set of user ids (strings).
 *   competition  { game }
 *   teams        the approved teams, with `players` [{ userId }]
 *   matches      its matches (status, decidedBy, gameIds, sides [{ teamId, lineup }])
 *   games        its match games (seats [{ userId, joinedAt }])
 *   attempts     quiz attempts [{ userId }]
 *   submissions  hackathon projects [{ teamId }]
 */
const whoTookPart = ({ competition, teams = [], matches = [], games = [], attempts = [], submissions = [] }) => {
    const roster = new Map();   // user id → team
    for (const t of teams) for (const p of t.players || []) roster.set(str(p.userId), t);
    const out = new Set();
    const add = (userId) => { if (roster.has(str(userId))) out.add(str(userId)); };
    const wholeTeam = (teamId, only = []) => {
        const t = teams.find((x) => str(x._id) === str(teamId));
        if (!t) return;
        const picked = only.map(str);
        for (const p of t.players || []) if (!picked.length || picked.includes(str(p.userId))) add(p.userId);
    };

    if (competition.game === 'quiz') {
        for (const a of attempts) add(a.userId);
        return out;
    }
    if (competition.game === 'hackathon') {
        for (const s of submissions) wholeTeam(s.teamId);
        return out;
    }
    for (const g of games) for (const s of g.seats || []) if (s.joinedAt) add(s.userId);
    for (const m of matches) {
        if (m.status !== 'completed' || m.decidedBy !== 'admin' || (m.gameIds || []).length) continue;
        for (const side of m.sides || []) wholeTeam(side.teamId, side.lineup || []);
    }
    return out;
};

/** The players who took part in one competition (a Competition document or its id and game): a Set of user ids. */
const tookPartIn = async (competition, teams = null) => {
    const Team = require('../models/Team');
    const id = competition._id ?? competition.id;
    teams ||= await Team.find({ competitionId: id, status: 'approved' }).select('players').lean();
    if (competition.game === 'quiz') {
        const attempts = await require('../models/QuizAttempt').find({ competitionId: id }).select('userId').lean();
        return whoTookPart({ competition, teams, attempts });
    }
    if (competition.game === 'hackathon') {
        const submissions = await require('../models/Submission').find({ competitionId: id }).select('teamId').lean();
        return whoTookPart({ competition, teams, submissions });
    }
    const [matches, games] = await Promise.all([
        require('../models/Match').find({ competitionId: id }).select('status decidedBy gameIds sides').lean(),
        require('../models/PlayGame').find({ competitionId: id, kind: 'match' }).select('seats.userId seats.joinedAt').lean()
    ]);
    return whoTookPart({ competition, teams, matches, games });
};

module.exports = { whoTookPart, tookPartIn };
