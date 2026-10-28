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
    // A quiz or a hackathon has no game engine (services/challengeService.js).
    const challenge = { quiz: { gameLabel: 'Quiz', emoji: '🧠' }, hackathon: { gameLabel: 'Hackathon', emoji: '💻' } }[id];
    if (challenge) return challenge;
    try { const e = engine(id); return { gameLabel: e?.label || id, emoji: e?.emoji || '🎮' }; }
    catch { return { gameLabel: id, emoji: '🎮' }; }
};

/** Registration closes "soon" inside this window: the yellow status. */
const CLOSING_SOON_MS = 48 * 3600e3;

/**
 * Whether colleges may register right now, and the one status a person
 * should read on a card:
 *   registration-soon · registration-open · closing-soon · upcoming · live ·
 *   completed · draft · cancelled · expired (its start date passed, never drawn: shown as Closed)
 */
const registration = (c, now = Date.now()) => {
    const opens = c.registrationOpensAt ? new Date(c.registrationOpensAt).getTime() : null;
    const closes = new Date(c.registrationDeadline).getTime();
    const published = c.status === 'registration';
    const open = published && (opens == null || opens <= now) && closes >= now;
    let phase = c.status;
    if (published) phase = opens != null && opens > now ? 'registration-soon' : closes < now ? 'upcoming' : closes - now <= CLOSING_SOON_MS ? 'closing-soon' : 'registration-open';
    else if (c.status === 'closed') phase = 'upcoming';
    // Its start date has passed and its matches were never drawn: it is
    // closed, not "upcoming" — and nobody can register any more.
    if ((published || c.status === 'closed') && c.startsAt && new Date(c.startsAt).getTime() < now) return { open: false, phase: 'expired' };
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
        // 'team': college teams; 'individual': students on their own (a quiz or a hackathon).
        entry: c.entry || 'team',
        kind: ['quiz', 'hackathon'].includes(c.game) ? c.game : 'match',
        endsAt: c.endsAt || null,
        ...(c.game === 'quiz' ? { questionsCount: c.quiz?.questions?.length || 0, minutes: c.quiz?.minutes || 15 } : {}),
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
        entryFee: c.entryFee?.enabled ? { enabled: true, amount: c.entryFee.amount } : { enabled: false, amount: 0 },
        certificates: c.certificates !== false,
        participationCertificates: c.participationCertificates !== false,
        status: c.status,
        teamsCount: approved.length,
        colleges: [...new Set(approved.map((t) => t.collegeName))],
        winners: (c.winners || []).map((w) => ({ place: w.place, teamId: String(w.teamId), teamName: name(w.teamId)?.teamName || '', collegeName: name(w.teamId)?.collegeName || '' })),
        completedAt: c.completedAt,
        resultsPublishedAt: c.resultsPublishedAt || null,
        resultsHidden: resultsHidden(c),
        myTeam: myTeam ? teamView(myTeam) : null
    };
};

const teamView = (t, { admin = false } = {}) => ({
    id: String(t._id),
    teamName: t.teamName,
    collegeName: t.collegeName,
    organizationId: t.organizationId ? String(t.organizationId) : null,
    solo: !!t.soloUserId,
    players: (t.players || []).map((p) => ({ userId: String(p.userId), name: p.name, paid: !!p.paidAt, ...(admin ? { paidAt: p.paidAt || null, paidAmount: p.paidAmount || 0 } : {}) })),
    status: t.status,
    note: t.note || '',
    place: t.place || null,
    coordinator: admin ? t.coordinator : { name: t.coordinator?.name || '' },
    createdAt: t.createdAt
});

/**
 * A match, with team names and the players at the board. `showCode`: the
 * open game's 6-character code, for those who may see it (its players, the
 * organizer, their college's coordinator).
 */
const matchView = (m, teams, games = [], { showCode = false } = {}) => {
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
        rematchAt: m.replayAt || null,
        places: (m.places || []).map((g) => g.map(String)),
        decidedBy: m.decidedBy,
        resultNote: m.resultNote || '',
        needsDecision: !!m.needsDecision,
        gameId: m.gameIds?.length ? String(m.gameIds.at(-1)) : null,
        gameStatus: latest?.status || null,
        gameCode: showCode && ['waiting', 'active'].includes(latest?.status) ? latest?.code || null : null,
        games: m.gameIds?.length || 0,
        completedAt: m.completedAt
    };
};

/** Rounds in order, each with its matches (the third-place play-off last). `codeFor(match)`: whether its code shows. */
const roundsView = (matches, teams, games, codeFor = () => false) => {
    const byRound = new Map();
    for (const m of [...matches].sort((a, b) => a.round - b.round || (a.kind === 'third-place') - (b.kind === 'third-place') || a.slot - b.slot)) {
        if (!byRound.has(m.round)) byRound.set(m.round, []);
        byRound.get(m.round).push(matchView(m, teams, games, { showCode: codeFor(m) }));
    }
    return [...byRound.entries()].map(([round, ms]) => ({ round, name: ms.find((x) => x.kind === 'main')?.roundName || ms[0].roundName, matches: ms }));
};

/**
 * A competition's results wait for the organizer (asked 2026-10-27): until
 * the admin or the hosting college publishes them, students see no places,
 * winners or points, the leaderboard leaves them out, and no prize is paid.
 * Each match's result waits too, and the quiz games' scores (gameService).
 * Everything else — other competitions, the leaderboard, My Games — shows as usual.
 */
const resultsHidden = (c) => !c.resultsPublishedAt;
/** A competition (competitionView), as a student may see it. */
const studentCompetition = (v) => (v && v.resultsHidden ? { ...v, winners: [], myTeam: v.myTeam ? { ...v.myTeam, place: null } : null } : v);
/** A competition's page (detail), as a student may see it. */
const studentDetail = (d) => {
    if (!d || !d.competition?.resultsHidden) return d;
    return {
        ...d,
        competition: studentCompetition(d.competition),
        teams: d.teams.map((t) => ({ ...t, place: null })),
        rounds: d.rounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m, winnerTeamId: null, places: [], resultNote: '' })) }))
    };
};

/** Everything about one competition, for its page. */
const detail = async (competitionId, { userId = null, organizationId = null, admin = false } = {}) => {
    const c = await Competition.findById(competitionId).lean();
    if (!c) return null;
    const [teams, matches] = await Promise.all([
        Team.find({ competitionId: c._id }).lean(),
        Match.find({ competitionId: c._id }).lean()
    ]);
    const games = await require('./gameService').withCodes(await PlayGame.find({ _id: { $in: matches.flatMap((m) => m.gameIds || []) } }).select('status code kind').lean());
    const myTeam = userId
        ? teams.find((t) => t.status !== 'withdrawn' && t.players.some((p) => String(p.userId) === String(userId)))
        : organizationId ? teams.find((t) => String(t.organizationId) === String(organizationId)) : null;
    const shownTeams = admin ? teams : teams.filter((t) => t.status === 'approved');
    const competition = competitionView(c, { teams, myTeam });
    // A college's own competition: the college by its real name ("Organized
    // by" is free text), for the platform admin's screens.
    if (c.hostOrganizationId) {
        const college = await require('../../organizations/models/Organization').findById(c.hostOrganizationId).select('name').lean();
        competition.hostName = college?.name || c.organizedBy;
    }
    // The organizer's: a quiz's questions with their answers, or the hackathon's projects with their marks; the standings so far.
    const ch = require('./challengeService');
    if (admin && ch.isChallenge(c)) {
        competition.quiz = { questions: (c.quiz?.questions || []).map((q) => ({ id: String(q._id), prompt: q.prompt, options: q.options, answer: q.answer, points: q.points || 1 })), minutes: c.quiz?.minutes || 15 };
        competition.hackathon = { problem: c.hackathon?.problem || '', criteria: c.hackathon?.criteria || '' };
    }
    return {
        competition,
        teams: shownTeams.map((t) => teamView(t, { admin })),
        ...(admin && ch.isChallenge(c) ? { challenge: await ch.adminView(c) } : {}),
        // Match codes: every one for the organizer; a college's for its own teams' matches.
        // A student's own code is personal: it is in My Games (routes/student.js /me), not here.
        rounds: roundsView(matches, teams, games, (m) => admin || (!userId && !!myTeam && m.sides.some((s) => String(s.teamId) === String(myTeam._id))))
    };
};

module.exports = { competitionView, teamView, matchView, roundsView, detail, gameInfo, registration, resultsHidden, studentCompetition, studentDetail };
