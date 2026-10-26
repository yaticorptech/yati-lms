/**
 * Quiz and hackathon competitions (asked 2026-10-23): competitions without
 * matches. Both run from startsAt to endsAt and finish with 1st, 2nd and 3rd
 * place, the prizes, the leaderboard points and the certificates, as a game
 * competition does (awardService, leaderboardService, certificate).
 *
 *   Quiz       each player of an approved team takes it once: Start gives them
 *              the questions and `quiz.minutes` (never past endsAt); answers are
 *              saved as they are picked and scored when handed in, or when the
 *              time runs out. A team's score is its players' scores added up,
 *              ties broken by the shorter total time. It is decided by itself
 *              once endsAt has passed, or by the organizer before.
 *   Hackathon  the problem statement shows at startsAt; any player of an
 *              approved team hands in the team's project (and may change it)
 *              until endsAt; the organizer marks each out of 100 and then
 *              publishes the results.
 *
 * Entered by college teams, as a game is, or by students on their own
 * (Competition.entry 'individual'): each sign-up a team of one (`signUp`).
 *
 * A quiz or hackathon goes live by itself at startsAt (`advanceDue`, from the
 * routes that show it and from the sweeper).
 */
const Competition = require('../models/Competition');
const Team = require('../models/Team');
const QuizAttempt = require('../models/QuizAttempt');
const Submission = require('../models/Submission');

const CHALLENGES = Competition.CHALLENGES;
const INFO = { quiz: { gameLabel: 'Quiz', emoji: '🧠' }, hackathon: { gameLabel: 'Hackathon', emoji: '💻' } };
// An answer on its way as the time runs out still counts.
const GRACE_MS = 10000;

const isChallenge = (c) => CHALLENGES.includes(c?.game);
const fail = (status, message) => Object.assign(new Error(message), { status });
const id = (x) => String(x?._id ?? x);

/** Where it stands now: 'before' it starts, 'open', or 'over'. */
const windowOf = (c, now = Date.now()) => {
    if (now < new Date(c.startsAt).getTime()) return 'before';
    return c.endsAt && now <= new Date(c.endsAt).getTime() ? 'open' : 'over';
};

/** The approved team this student plays for in the competition, if any. */
const teamOf = (c, userId) => Team.findOne({ competitionId: c._id, status: 'approved', 'players.userId': userId }).lean();

/* ── Places, prizes and the end ──────────────────────────────────────── */

/**
 * Decide it: the first three of `standings` (rows of teams that took part,
 * best first) take the places; the rest have none. Done once — a second call
 * finds it no longer live and does nothing.
 */
const complete = async (c, standings) => {
    const winners = standings.filter((r) => r.took).slice(0, 3).map((r, i) => ({ place: i + 1, teamId: r.teamId }));
    const done = await Competition.findOneAndUpdate({ _id: c._id, status: 'live' }, { $set: { status: 'completed', winners, completedAt: new Date() } }, { returnDocument: 'after' });
    if (!done) return null;
    await Team.updateMany({ competitionId: c._id }, { $set: { place: null } });
    await Promise.all(winners.map((w) => Team.updateOne({ _id: w.teamId }, { $set: { place: w.place } })));
    await require('./awardService').award(done.toObject());
    return done;
};

/* ── Quiz ────────────────────────────────────────────────────────────── */

const questionsOf = (c) => c.quiz?.questions || [];
const totalPoints = (c) => questionsOf(c).reduce((n, q) => n + (q.points || 1), 0);
/** The questions as a player sees them: no answers. */
const publicQuestions = (c) => questionsOf(c).map((q) => ({ id: id(q), prompt: q.prompt, options: q.options, points: q.points || 1 }));

const scoreOf = (c, answers = {}) => {
    let score = 0, correct = 0;
    for (const q of questionsOf(c)) {
        if (Number(answers[id(q)]) === q.answer) { score += q.points || 1; correct += 1; }
    }
    return { score, correct };
};

/** Hand an attempt in: scored on the answers saved, timed to now or to its own end. */
const close = async (attempt, c) => {
    const at = Math.min(Date.now(), new Date(attempt.endsAt).getTime());
    const { score, correct } = scoreOf(c, attempt.answers || {});
    return QuizAttempt.findOneAndUpdate({ _id: attempt._id, submittedAt: null },
        { $set: { submittedAt: new Date(at), score, correct, timeMs: Math.max(0, at - new Date(attempt.startedAt).getTime()) } },
        { returnDocument: 'after' }).lean().then((a) => a || QuizAttempt.findById(attempt._id).lean());
};
const timedOut = (a) => !a.submittedAt && Date.now() > new Date(a.endsAt).getTime() + GRACE_MS;

/** The teams in order: score (higher first), then total time (shorter first). Teams nobody played for come last. */
const quizStandings = async (c) => {
    const [teams, attempts] = await Promise.all([
        Team.find({ competitionId: c._id, status: 'approved' }).lean(),
        QuizAttempt.find({ competitionId: c._id }).lean()
    ]);
    const rows = teams.map((t) => {
        const mine = attempts.filter((a) => id(a.teamId) === id(t));
        return {
            teamId: id(t), teamName: t.teamName, collegeName: t.collegeName, solo: !!t.soloUserId,
            took: mine.length, handedIn: mine.filter((a) => a.submittedAt).length,
            score: mine.reduce((n, a) => n + (a.score || 0), 0), timeMs: mine.reduce((n, a) => n + (a.timeMs || 0), 0),
            players: mine.map((a) => ({ name: a.name, score: a.score || 0, submitted: !!a.submittedAt }))
        };
    });
    return rows.sort((a, b) => (b.took > 0) - (a.took > 0) || b.score - a.score || a.timeMs - b.timeMs || a.teamName.localeCompare(b.teamName))
        .map((r, i) => ({ ...r, rank: i + 1 }));
};

const finishQuiz = async (c) => {
    // Everyone still answering is handed in as they stand.
    for (const a of await QuizAttempt.find({ competitionId: c._id, submittedAt: null }).lean()) await close(a, c);
    return complete(c, await quizStandings(c));
};

/** What a player sees of the quiz: when it runs, their attempt, and — once it is decided — the right answers and the standings. */
const quizState = async (c, user) => {
    const team = await teamOf(c, user._id);
    let attempt = await QuizAttempt.findOne({ competitionId: c._id, userId: user._id }).lean();
    if (attempt && timedOut(attempt)) attempt = await close(attempt, c);
    const done = c.status === 'completed';
    const answering = !!attempt && !attempt.submittedAt;
    return {
        window: windowOf(c), status: c.status, startsAt: c.startsAt, endsAt: c.endsAt, minutes: c.quiz?.minutes || 15,
        count: questionsOf(c).length, totalPoints: totalPoints(c),
        inTeam: !!team, teamName: team?.teamName || '', solo: !!team?.soloUserId,
        attempt: attempt ? {
            startedAt: attempt.startedAt, endsAt: attempt.endsAt, submitted: !!attempt.submittedAt, answers: attempt.answers || {},
            ...(attempt.submittedAt ? { score: attempt.score, correct: attempt.correct, timeMs: attempt.timeMs } : {})
        } : null,
        questions: answering || (done && attempt) ? publicQuestions(c) : [],
        answers: done && attempt ? Object.fromEntries(questionsOf(c).map((q) => [id(q), q.answer])) : null,
        standings: done ? (await quizStandings(c)).map(({ players, ...r }) => r) : null
    };
};

const startQuiz = async (c, user) => {
    if (c.game !== 'quiz') throw fail(404, 'This competition has no quiz.');
    if (c.status !== 'live' || windowOf(c) !== 'open') throw fail(409, windowOf(c) === 'before' ? 'The quiz has not opened yet.' : 'The quiz is closed.');
    const team = await teamOf(c, user._id);
    if (!team) throw fail(403, c.entry === 'individual' ? 'Only students who signed up before registration closed take this quiz.' : 'Only players of an approved team take this quiz.');
    const now = Date.now();
    try {
        await QuizAttempt.create({
            competitionId: c._id, teamId: team._id, userId: user._id, name: team.players.find((p) => id(p.userId) === id(user._id))?.name || user.name || '',
            startedAt: new Date(now), endsAt: new Date(Math.min(now + (c.quiz?.minutes || 15) * 60000, new Date(c.endsAt).getTime())), answers: {}
        });
    } catch (err) {
        if (err?.code !== 11000) throw err;   // already started: carry on where they are
    }
    return quizState(c, user);
};

/** Save answers as they are picked ({ questionId: choice }); `submit` hands the quiz in. */
const saveQuiz = async (c, user, { answers = {}, submit = false } = {}) => {
    if (c.game !== 'quiz') throw fail(404, 'This competition has no quiz.');
    const a = await QuizAttempt.findOne({ competitionId: c._id, userId: user._id });
    if (!a) throw fail(409, 'Start the quiz first.');
    if (a.submittedAt) throw fail(409, 'You have already handed in this quiz.');
    if (!timedOut(a)) {
        const next = { ...(a.answers || {}) };
        for (const q of questionsOf(c)) {
            const v = answers?.[id(q)];
            if (v === null) delete next[id(q)];
            else if (v !== undefined && Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) < q.options.length) next[id(q)] = Number(v);
        }
        a.answers = next;
        a.markModified('answers');
        await a.save();
    }
    if (submit || timedOut(a)) await close(a.toObject(), c);
    return quizState(c, user);
};

/* ── Hackathon ───────────────────────────────────────────────────────── */

const projectView = (s, { marks = false } = {}) => ({
    id: id(s), teamId: id(s.teamId), title: s.title, summary: s.summary, repoUrl: s.repoUrl, demoUrl: s.demoUrl,
    submittedBy: s.submittedBy?.name || '', submittedAt: s.submittedAt,
    ...(marks ? { score: s.score ?? null, feedback: s.feedback || '', judgedAt: s.judgedAt || null } : {})
});

/** The teams in order of their marks (higher first, then the earlier project); teams with no project, or none marked, come last. */
const hackathonStandings = async (c) => {
    const [teams, subs] = await Promise.all([
        Team.find({ competitionId: c._id, status: 'approved' }).lean(),
        Submission.find({ competitionId: c._id }).lean()
    ]);
    const rows = teams.map((t) => {
        const s = subs.find((x) => id(x.teamId) === id(t));
        return {
            teamId: id(t), teamName: t.teamName, collegeName: t.collegeName, solo: !!t.soloUserId,
            took: s && s.score != null ? 1 : 0, project: s ? s.title : '', score: s?.score ?? null, submittedAt: s?.submittedAt || null
        };
    });
    return rows.sort((a, b) => b.took - a.took || (b.score ?? -1) - (a.score ?? -1) || new Date(a.submittedAt || 8.64e15) - new Date(b.submittedAt || 8.64e15) || a.teamName.localeCompare(b.teamName))
        .map((r, i) => ({ ...r, rank: i + 1 }));
};

/** What a player sees: the problem (from the start), their team's project, and — once decided — its marks and the standings. */
const projectState = async (c, user) => {
    const team = await teamOf(c, user._id);
    const sub = team ? await Submission.findOne({ competitionId: c._id, teamId: team._id }).lean() : null;
    const done = c.status === 'completed';
    const started = windowOf(c) !== 'before';
    return {
        window: windowOf(c), status: c.status, startsAt: c.startsAt, endsAt: c.endsAt,
        inTeam: !!team, teamName: team?.teamName || '', solo: !!team?.soloUserId,
        problem: started ? c.hackathon?.problem || '' : '', criteria: c.hackathon?.criteria || '',
        project: sub ? projectView(sub, { marks: done }) : null,
        standings: done ? await hackathonStandings(c) : null
    };
};

const link = (v, what) => {
    const s = String(v || '').trim().slice(0, 600);
    if (s && !/^https?:\/\/\S+$/i.test(s)) throw fail(400, `The ${what} must be a web address starting with https://`);
    return s;
};

const saveProject = async (c, user, body = {}) => {
    if (c.game !== 'hackathon') throw fail(404, 'This competition has no project to hand in.');
    if (c.status !== 'live' || windowOf(c) !== 'open') throw fail(409, windowOf(c) === 'before' ? 'Projects can be handed in once the hackathon starts.' : 'The deadline has passed: projects can no longer change.');
    const team = await teamOf(c, user._id);
    if (!team) throw fail(403, c.entry === 'individual' ? 'Only students who signed up before registration closed hand in a project.' : 'Only players of an approved team hand in a project.');
    const title = String(body.title || '').trim().slice(0, 140);
    if (!title) throw fail(400, 'Give your project a title.');
    const fields = {
        title, summary: String(body.summary || '').trim().slice(0, 4000),
        repoUrl: link(body.repoUrl, 'code link'), demoUrl: link(body.demoUrl, 'demo link'),
        submittedBy: { userId: user._id, name: team.players.find((p) => id(p.userId) === id(user._id))?.name || user.name || '' },
        submittedAt: new Date()
    };
    if (!fields.repoUrl && !fields.demoUrl) throw fail(400, 'Add a link to your code or to a demo, so the judges can see the project.');
    await Submission.findOneAndUpdate({ competitionId: c._id, teamId: team._id }, { $set: fields }, { upsert: true, setDefaultsOnInsert: true });
    return projectState(c, user);
};

/** The organizer's marks for one project: 0–100, and a note for the team. */
const judge = async (c, submissionId, body = {}) => {
    if (c.game !== 'hackathon') throw fail(404, 'This competition has no projects.');
    if (c.status === 'completed') throw fail(409, 'The results are out: the marks can no longer change.');
    const s = require('mongoose').isValidObjectId(submissionId) ? await Submission.findOne({ _id: submissionId, competitionId: c._id }) : null;
    if (!s) throw fail(404, 'Project not found.');
    const score = Number(body.score);
    if (body.score === '' || body.score == null || !Number.isFinite(score) || score < 0 || score > 100) throw fail(400, 'Marks are out of 100: give a number from 0 to 100.');
    s.score = Math.round(score * 10) / 10;
    s.feedback = String(body.feedback || '').trim().slice(0, 2000);
    s.judgedAt = new Date();
    await s.save();
    return projectView(s, { marks: true });
};

const finishHackathon = async (c) => {
    if (windowOf(c) !== 'over') throw fail(409, 'Projects can still be handed in until the deadline. Publish the results after it.');
    const unmarked = await Submission.countDocuments({ competitionId: c._id, score: null });
    if (unmarked) throw fail(409, `${unmarked} project${unmarked === 1 ? ' has' : 's have'} no marks yet. Mark every project first.`);
    return complete(c, await hackathonStandings(c));
};

/* ── For the routes ──────────────────────────────────────────────────── */

/** Every quiz or hackathon whose start has come goes live; every quiz whose close has passed is decided. */
const advanceDue = async () => {
    const now = Date.now();
    await Competition.updateMany({ game: { $in: CHALLENGES }, status: { $in: ['registration', 'closed'] }, startsAt: { $lte: new Date(now) } }, { $set: { status: 'live' } });
    const due = await Competition.find({ game: 'quiz', status: 'live', endsAt: { $ne: null, $lte: new Date(now - GRACE_MS) } }).lean();
    for (const c of due) {
        try { await finishQuiz(c); } catch (err) { console.warn('[competitions] deciding a quiz failed:', err.message); }
    }
};

/** The organizer decides it now: a quiz closes early; a hackathon publishes its results. */
const finish = async (c) => {
    if (!isChallenge(c)) throw fail(400, 'A game competition is decided by its matches.');
    if (c.status !== 'live') throw fail(409, 'It has to be running to be decided.');
    const done = c.game === 'quiz' ? await finishQuiz(c) : await finishHackathon(c);
    if (!done) throw fail(409, 'It has already been decided.');
    return done;
};

/** The organizer's view: the questions with their answers, or every project with its marks, and the standings so far. */
const adminView = async (c) => {
    if (c.game === 'quiz') {
        return {
            questions: questionsOf(c).map((q) => ({ id: id(q), prompt: q.prompt, options: q.options, answer: q.answer, points: q.points || 1 })),
            minutes: c.quiz?.minutes || 15, totalPoints: totalPoints(c),
            attempts: await QuizAttempt.countDocuments({ competitionId: c._id }),
            standings: await quizStandings(c)
        };
    }
    const [subs, teams] = await Promise.all([Submission.find({ competitionId: c._id }).sort({ submittedAt: 1 }).lean(), Team.find({ competitionId: c._id }).lean()]);
    return {
        problem: c.hackathon?.problem || '', criteria: c.hackathon?.criteria || '',
        submissions: subs.map((s) => {
            const t = teams.find((x) => id(x) === id(s.teamId));
            return { ...projectView(s, { marks: true }), teamName: t?.teamName || 'Team', collegeName: t?.collegeName || '' };
        }),
        standings: await hackathonStandings(c)
    };
};

/* ── Students on their own ───────────────────────────────────────────── */

/** A student signs up for a quiz or hackathon entered on one's own: a team of one, approved at once. */
const signUp = async (c, user) => {
    if (c.entry !== 'individual') throw fail(400, 'Colleges enter teams for this competition. Ask your college\'s coordinator to put you in.');
    const { registration } = require('./views');
    if (!registration(c).open) throw fail(409, 'Registration for this competition is closed.');
    if (c.hostOrganizationId && id(c.hostOrganizationId) !== id(user.organizationId || '')) throw fail(403, `${c.organizedBy}'s competition is for its own students.`);
    const already = await Team.findOne({ competitionId: c._id, 'players.userId': user._id, status: { $ne: 'withdrawn' } }).lean();
    if (already) throw fail(409, 'You have already signed up.');
    if (await Team.countDocuments({ competitionId: c._id, status: { $in: ['pending', 'approved'] } }) >= c.maxTeams) throw fail(409, `This competition is full (${c.maxTeams} students).`);
    const org = user.organizationId ? await require('../../organizations/models/Organization').findById(user.organizationId).select('name').lean() : null;
    const fields = {
        collegeName: org?.name || 'Independent', teamName: user.name || 'Student', players: [{ userId: user._id, name: user.name || 'Student' }],
        status: 'approved', note: '', reviewedAt: new Date()
    };
    await Team.dropOldIndex();
    const back = await Team.findOneAndUpdate({ competitionId: c._id, soloUserId: user._id }, { $set: fields }, { returnDocument: 'after' });
    return back || Team.create({ competitionId: c._id, organizationId: user.organizationId || null, soloUserId: user._id, entry: 0, ...fields });
};

/** Taken back while registration is still open. */
const withdraw = async (c, user) => {
    const { registration } = require('./views');
    if (!registration(c).open) throw fail(409, 'Registration has closed, so you can no longer withdraw here. Contact the organizer.');
    const t = await Team.findOneAndUpdate({ competitionId: c._id, soloUserId: user._id, status: { $ne: 'withdrawn' } }, { $set: { status: 'withdrawn' } }, { returnDocument: 'after' });
    if (!t) throw fail(404, 'You have not signed up.');
    return t;
};

/* ── The organizer's form ────────────────────────────────────────────── */

/** A quiz's questions from the form: each with a question, 2–6 choices and the right one. */
const questionsFrom = (raw) => (Array.isArray(raw) ? raw : []).slice(0, 200).map((q, i) => {
    const prompt = String(q?.prompt || '').trim().slice(0, 1000);
    const options = (Array.isArray(q?.options) ? q.options : []).map((o) => String(o ?? '').trim().slice(0, 300)).filter(Boolean).slice(0, 6);
    const answer = Number(q?.answer);
    if (!prompt) throw fail(400, `Question ${i + 1} has no question.`);
    if (options.length < 2) throw fail(400, `Question ${i + 1} needs at least two choices.`);
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) throw fail(400, `Question ${i + 1}: mark which choice is right.`);
    const points = Math.max(1, Math.min(10, Math.round(Number(q?.points) || 1)));
    return { ...(q?.id && require('mongoose').isValidObjectId(q.id) ? { _id: q.id } : {}), prompt, options, answer, points };
});

/** The quiz or hackathon fields of the organizer's form, checked. */
const fieldsFrom = (game, b, current, startsAt) => {
    const endsAt = new Date(b.endsAt ?? current?.endsAt);
    if (Number.isNaN(endsAt.getTime())) throw fail(400, game === 'quiz' ? 'Set when the quiz closes.' : 'Set the deadline for projects.');
    if (endsAt <= startsAt) throw fail(400, game === 'quiz' ? 'The quiz has to close after it opens.' : 'The deadline has to be after the hackathon starts.');
    const entry = (b.entry ?? current?.entry) === 'individual' ? 'individual' : 'team';
    if (game === 'quiz') {
        const questions = questionsFrom(b.quiz?.questions ?? (current?.quiz?.questions || []).map((q) => ({ id: id(q), ...q })));
        if (!questions.length) throw fail(400, 'Add at least one question to the quiz.');
        const minutes = Math.max(1, Math.min(180, Math.round(Number(b.quiz?.minutes ?? current?.quiz?.minutes) || 15)));
        return { entry, endsAt, quiz: { questions, minutes }, hackathon: { problem: '', criteria: '' } };
    }
    const problem = String(b.hackathon?.problem ?? current?.hackathon?.problem ?? '').trim().slice(0, 8000);
    if (!problem) throw fail(400, 'Write the problem statement the teams will work on.');
    return { entry, endsAt, quiz: { questions: [], minutes: 15 }, hackathon: { problem, criteria: String(b.hackathon?.criteria ?? current?.hackathon?.criteria ?? '').trim().slice(0, 2000) } };
};

module.exports = {
    CHALLENGES, INFO, GRACE_MS, isChallenge, windowOf, advanceDue, finish, adminView, fieldsFrom,
    quizState, startQuiz, saveQuiz, quizStandings, projectState, saveProject, judge, hackathonStandings, signUp, withdraw
};
