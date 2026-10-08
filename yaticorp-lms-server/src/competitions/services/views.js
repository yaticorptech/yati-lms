/**
 * How competitions, teams and matches leave the server. One shape for the
 * student app and the admin panel, with the private parts (coordinator
 * contacts, every team's status) added only by the admin routes.
 */
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const Match = require('../models/Match');
const PlayGame = require('../models/PlayGame');
const { engine } = require('../games');

const gameInfo = (id) => {
    try { const e = engine(id); return { gameLabel: e?.label || id, emoji: e?.emoji || '🎮' }; }
    catch { return { gameLabel: id, emoji: '🎮' }; }
};

/** Registration closes "soon" inside this window: the yellow status. */
const CLOSING_SOON_MS = 48 * 3600e3;

/**
 * Whether colleges may register right now, and the one status a person
 * should read on a card:
 *   registration-soon · registration-open · closing-soon · upcoming · live ·
 *   completed · draft · cancelled
 */
const registration = (c, now = Date.now()) => {
    const opens = c.registrationOpensAt ? new Date(c.registrationOpensAt).getTime() : null;
    const closes = new Date(c.registrationDeadline).getTime();
    const published = c.status === 'registration';
    const open = published && (opens == null || opens <= now) && closes >= now;
    let phase = c.status;
    if (published) phase = opens != null && opens > now ? 'registration-soon' : closes < now ? 'upcoming' : closes - now <= CLOSING_SOON_MS ? 'closing-soon' : 'registration-open';
    else if (c.status === 'closed') phase = 'upcoming';
    return { open, phase };
};

/** The competition's own details. */
const competitionView = (c, { teams = [], myTeam = null } = {}) => {
    const approved = teams.filter((t) => t.status === 'approved');
    const name = (id) => teams.find((t) => String(t._id) === String(id));
    const reg = registration(c);
    return {
        id: String(c._id),
        name: c.name,
        organizedBy: c.organizedBy,
        hostOrganizationId: c.hostOrganizationId ? String(c.hostOrganizationId) : null,
        bannerUrl: c.bannerUrl || '',
        description: c.description,
        game: c.game,
        ...gameInfo(c.game),
        startsAt: c.startsAt,
        registrationOpensAt: c.registrationOpensAt || null,
        registrationDeadline: c.registrationDeadline,
        registrationOpen: reg.open,
        phase: reg.phase,
        playersCount: approved.reduce((n, t) => n + (t.players?.length || 0), 0),
        maxTeams: c.maxTeams,
        playersPerTeam: c.playersPerTeam,
        playersPerSide: c.playersPerSide,
        teamsPerMatch: c.teamsPerMatch,
        gameOptions: c.gameOptions || {},
        rules: c.rules,
        prizes: c.prizes || [],
        prizeDetails: c.prizeDetails || '',
        participationXp: c.participationXp || 0,
        certificates: c.certificates !== false,
        participationCertificates: c.participationCertificates !== false,
        status: c.status,
        teamsCount: approved.length,
        colleges: [...new Set(approved.map((t) => t.collegeName))],
        winners: (c.winners || []).map((w) => ({ place: w.place, teamId: String(w.teamId), teamName: name(w.teamId)?.teamName || '', collegeName: name(w.teamId)?.collegeName || '' })),
        completedAt: c.completedAt,
        myTeam: myTeam ? teamView(myTeam) : null
    };
};

const teamView = (t, { admin = false } = {}) => ({
    id: String(t._id),
    teamName: t.teamName,
    collegeName: t.collegeName,
    organizationId: String(t.organizationId),
    players: (t.players || []).map((p) => ({ userId: String(p.userId), name: p.name })),
    status: t.status,
    note: t.note || '',
    place: t.place || null,
    coordinator: admin ? t.coordinator : { name: t.coordinator?.name || '' },
    createdAt: t.createdAt
});

/** A match, with team names and the players at the board. */
const matchView = (m, teams, games = []) => {
    const team = (id) => teams.find((t) => String(t._id) === String(id));
    const latest = m.gameIds?.length ? games.find((g) => String(g._id) === String(m.gameIds.at(-1))) : null;
    return {
        id: String(m._id),
        round: m.round,
        roundName: m.kind === 'third-place' ? 'Third place' : m.roundName,
        kind: m.kind,
        slot: m.slot,
        status: m.status,
        scheduledAt: m.scheduledAt,
        sides: m.sides.map((s) => {
            const t = team(s.teamId);
            const lineup = (s.lineup || []).map(String);
            return {
                teamId: String(s.teamId),
                teamName: t?.teamName || 'Team',
                collegeName: t?.collegeName || '',
                lineup: lineup.map((id) => ({ userId: id, name: t?.players?.find((p) => String(p.userId) === id)?.name || 'Player' }))
            };
        }),
        winnerTeamId: m.winnerTeamId ? String(m.winnerTeamId) : null,
        places: (m.places || []).map((g) => g.map(String)),
        decidedBy: m.decidedBy,
        resultNote: m.resultNote || '',
        needsDecision: !!m.needsDecision,
        gameId: m.gameIds?.length ? String(m.gameIds.at(-1)) : null,
        gameStatus: latest?.status || null,
        games: m.gameIds?.length || 0,
        completedAt: m.completedAt
    };
};

/** Rounds in order, each with its matches (the third-place play-off last). */
const roundsView = (matches, teams, games) => {
    const byRound = new Map();
    for (const m of [...matches].sort((a, b) => a.round - b.round || (a.kind === 'third-place') - (b.kind === 'third-place') || a.slot - b.slot)) {
        if (!byRound.has(m.round)) byRound.set(m.round, []);
        byRound.get(m.round).push(matchView(m, teams, games));
    }
    return [...byRound.entries()].map(([round, ms]) => ({ round, name: ms.find((x) => x.kind === 'main')?.roundName || ms[0].roundName, matches: ms }));
};

/** Everything about one competition, for its page. */
const detail = async (competitionId, { userId = null, organizationId = null, admin = false } = {}) => {
    const c = await Competition.findById(competitionId).lean();
    if (!c) return null;
    const [teams, matches] = await Promise.all([
        Team.find({ competitionId: c._id }).lean(),
        Match.find({ competitionId: c._id }).lean()
    ]);
    const games = await PlayGame.find({ _id: { $in: matches.flatMap((m) => m.gameIds || []) } }).select('status').lean();
    const myTeam = userId
        ? teams.find((t) => t.status !== 'withdrawn' && t.players.some((p) => String(p.userId) === String(userId)))
        : organizationId ? teams.find((t) => String(t.organizationId) === String(organizationId)) : null;
    const shownTeams = admin ? teams : teams.filter((t) => t.status === 'approved');
    return {
        competition: competitionView(c, { teams, myTeam }),
        teams: shownTeams.map((t) => teamView(t, { admin })),
        rounds: roundsView(matches, teams, games)
    };
};

module.exports = { competitionView, teamView, matchView, roundsView, detail, gameInfo, registration };
