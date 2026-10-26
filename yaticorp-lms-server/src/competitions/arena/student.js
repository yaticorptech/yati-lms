/**
 * Quiz Arena for students, at /api/competitions/arena (signed in; see
 * ../index.js).
 *
 *   GET    /                      the contests: open, coming up, live, finished
 *   GET    /:id                   one: rounds, rules, my registration
 *   (No registering here: as in Chess, a college's coordinator enters its
 *   students and the platform admin approves them — arena/org.js, arena/admin.js.)
 *   POST   /:id/join              { code } my own joining code: lets me into the live quiz
 *   GET    /:id/live              where the quiz is now, for me: polled about once a second
 *                                 ({ needsCode } until I have joined with my code)
 *   POST   /:id/answer            { index, choice } answer the open question
 *   GET    /:id/image/:index      a question's picture, sent by the server: its address
 *                                 (which often names the answer) never reaches the browser
 *   GET    /:id/results           once published: the rankings, by student and college
 *   GET    /:id/certificate       my certificate, as a PDF
 *
 * Everything that counts is decided here: which question is open and for how
 * long (./timeline.js, from the clock), whether an answer is in time and
 * right, and the points. The right answer is sent only once a question has
 * closed. One answer per question: the write is conditional, so a second
 * (or a double tap) is refused, never counted.
 */
const express = require('express');
const mongoose = require('mongoose');
const { ArenaCompetition, ArenaEntry, ROUND_NAMES } = require('./models');
const { phaseAt, totalMs, roundsOf, closedBy, stateOf } = require('./timeline');
const scoring = require('./scoring');

const router = express.Router();

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    next(err);
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const isId = (id) => mongoose.isValidObjectId(id);

/** Why this student may not register, or null. */
const whyNot = (c, user) => {
    const ids = (c.eligibility?.organizationIds || []).map(String);
    if (c.eligibility?.collegeStudentsOnly !== false && !user.organizationId) return 'Quiz Arena is for college students: your account is not linked to a college.';
    if (ids.length && !ids.includes(String(user.organizationId))) return 'This Quiz Arena is open to selected colleges only.';
    return null;
};

const load = async (id) => {
    if (!isId(id)) throw fail(404, 'Competition not found.');
    const c = await ArenaCompetition.findById(id);
    if (!c || c.status === 'draft') throw fail(404, 'Competition not found.');
    return c;
};

const view = (c, user, entry, now) => ({
    id: String(c._id),
    title: c.title,
    description: c.description,
    instructions: c.instructions,
    organizedBy: c.organizedBy,
    bannerUrl: c.bannerUrl,
    startsAt: c.startedAt || c.startsAt,
    registrationDeadline: c.registrationDeadline,
    registrationOpensAt: c.registrationOpensAt,
    durationMs: totalMs(c),
    state: stateOf(c, now),
    resultsPublishedAt: c.resultsPublishedAt || null,
    rounds: roundsOf(c).map((r) => ({ round: r.round, name: ROUND_NAMES[r.round], questions: r.count })),
    questions: c.paper.length,
    secondsPerQuestion: c.secondsPerQuestion,
    pointsPerQuestion: c.pointsPerQuestion,
    maxScore: c.paper.length * c.pointsPerQuestion,
    seatsLeft: Math.max(0, c.maxParticipants - c.registeredCount),
    registeredCount: c.registeredCount,
    maxParticipants: c.maxParticipants,
    playersPerCollege: c.playersPerCollege,
    prizes: c.prizes || [],
    participationXp: c.participationXp || 0,
    certificates: { winners: c.certificates.winners, participants: c.certificates.participants },
    notEligible: whyNot(c, user),
    // My entry: null, or pending / approved / rejected. Only approved plays.
    entryStatus: entry?.status || null,
    registered: entry?.status === 'approved',
    // My own joining code (only ever mine), and whether I have used it.
    myCode: entry?.status === 'approved' && started(c) && !owes(c, entry) ? entry.joinCode || null : null,
    // The entry fee, when there is one: what I owe, and whether it is paid.
    entryFee: c.entryFee?.enabled ? { amount: c.entryFee.amount, paid: !!entry?.paidAt } : null,
    joined: !!entry?.joinedAt,
    myResult: entry && c.resultsPublishedAt ? { rank: entry.rank, score: entry.score, correctCount: entry.correctCount, collegeName: entry.collegeName, certificate: !!certificateFor(c, entry) } : null
});

router.get('/', wrap(async (req, res) => {
    const now = Date.now();
    const rows = await ArenaCompetition.find({ status: { $in: ['published', 'cancelled'] }, publishedAt: { $ne: null } }).sort({ startsAt: -1 }).limit(100);
    const mine = await ArenaEntry.find({ userId: req.user._id, competitionId: { $in: rows.map((c) => c._id) } }).lean();
    const byComp = new Map(mine.map((e) => [String(e.competitionId), e]));
    // Contests for other colleges only are shown just to the students who registered.
    const shown = rows.filter((c) => byComp.has(String(c._id)) || (c.status === 'published' && !(c.eligibility?.organizationIds?.length && whyNot(c, req.user))));
    // The top three of each contest whose results are out, for the Results tab.
    const done = shown.filter((c) => c.resultsPublishedAt).map((c) => c._id);
    const podium = done.length ? await ArenaEntry.find({ competitionId: { $in: done }, rank: { $gte: 1, $lte: 3 } }).select('competitionId rank name collegeName score').sort({ rank: 1 }).lean() : [];
    res.json({
        competitions: shown.map((c) => ({
            ...view(c, req.user, byComp.get(String(c._id)), now),
            winners: podium.filter((e) => String(e.competitionId) === String(c._id)).map((e) => ({ place: e.rank, name: e.name, collegeName: e.collegeName, score: e.score }))
        }))
    });
}));

router.get('/:id', wrap(async (req, res) => {
    const c = await load(req.params.id);
    const entry = await ArenaEntry.findOne({ competitionId: c._id, userId: req.user._id }).lean();
    // A college's own contest: only for its own students.
    if (c.hostOrganizationId && !entry && String(req.user.organizationId || '') !== String(c.hostOrganizationId)) throw fail(404, 'Competition not found.');
    // The colleges taking part: their approved students, by name.
    const approved = await ArenaEntry.find({ competitionId: c._id, status: 'approved' }).select('name collegeName').sort({ collegeName: 1, registeredAt: 1 }).lean();
    const colleges = [];
    for (const e of approved) {
        let g = colleges.find((x) => x.collegeName === (e.collegeName || 'College'));
        if (!g) colleges.push(g = { collegeName: e.collegeName || 'College', students: [] });
        g.students.push(e.name);
    }
    res.json({ competition: { ...view(c, req.user, entry, Date.now()), colleges } });
}));

/** My entry, or 403: only approved students play. */
const entryOf = async (c, user) => {
    const entry = await ArenaEntry.findOne({ competitionId: c._id, userId: user._id });
    if (!entry) throw fail(403, 'You are not entered in this Quiz Arena. Your college coordinator enters students.');
    if (entry.status !== 'approved') throw fail(403, entry.status === 'pending' ? 'Your entry is waiting for the organizer\'s approval.' : 'Your entry was not approved.');
    return entry;
};

/** Started: only by the admin's Start now. Codes are shown only from then. */
const started = (c) => !!c.startedAt;

const normal = (code) => String(code || '').trim().toUpperCase();

/** Take my place with my own code: from the quiz page, or the Join with a code box. */
/** Owing the entry fee: approved, a fee set, not paid yet. */
const owes = (c, entry) => !!(c.entryFee?.enabled && c.entryFee.amount > 0 && entry?.status === 'approved' && !entry.paidAt);

const joinWith = async (c, entry, code) => {
    if (entry.joinedAt) return;
    if (!entry.joinCode) throw fail(409, 'Your joining code has not been issued yet.');
    if (owes(c, entry)) throw fail(402, `Pay the ₹${c.entryFee.amount} entry fee to join this Quiz Arena.`);
    if (!started(c)) throw fail(409, 'The quiz has not started yet. Your joining code appears when the organizer starts it.');
    if (normal(code) !== entry.joinCode) throw fail(403, 'That is not your joining code. Use the code sent to you.');
    if (phaseAt(c, Date.now()).stage === 'finished') throw fail(409, 'This Quiz Arena is over.');
    await ArenaEntry.updateOne({ _id: entry._id, joinedAt: null }, { $set: { joinedAt: new Date() } });
};

router.post('/:id/join', wrap(async (req, res) => {
    const c = await load(req.params.id);
    if (c.status !== 'published') throw fail(410, 'This competition was cancelled.');
    const entry = await entryOf(c, req.user);
    if (!normal(req.body?.code)) throw fail(400, 'Enter your joining code.');
    await joinWith(c, entry, req.body.code);
    res.json({ joined: true });
}));

router.get('/:id/live', wrap(async (req, res) => {
    const c = await load(req.params.id);
    if (c.status === 'cancelled') throw fail(410, 'This competition was cancelled.');
    const entry = await entryOf(c, req.user);
    const now = Date.now();
    const p = phaseAt(c, now);
    // Not in until they enter their own code: no questions until then.
    if (!entry.joinedAt) {
        return res.json({ id: String(c._id), title: c.title, serverNow: now, stage: p.stage, startsAt: p.startsAt, needsCode: true, codeIssued: !!entry.joinCode, started: started(c), total: c.paper.length, rounds: roundsOf(c).map((r) => ({ round: r.round, name: ROUND_NAMES[r.round], questions: r.count, from: r.from })) });
    }
    const closed = closedBy(c, now);
    // The score so far counts closed questions only, so it never gives away
    // whether the open one was answered right.
    let score = 0; let correct = 0;
    for (const a of entry.answers) if (a.q < closed) { score += a.points; if (a.correct) correct += 1; }
    const q = p.index != null ? c.paper[p.index] : null;
    const mine = q ? entry.answers.find((a) => a.q === p.index) : null;
    res.json({
        id: String(c._id),
        title: c.title,
        serverNow: now,
        ...p,
        total: c.paper.length,
        secondsPerQuestion: c.secondsPerQuestion,
        pointsPerQuestion: c.pointsPerQuestion,
        rounds: roundsOf(c).map((r) => ({ round: r.round, name: ROUND_NAMES[r.round], questions: r.count, from: r.from })),
        // The picture by the question's place, not its address (which can name the answer).
        // Students get the question, its options and (Picture Challenge) its
        // picture — nothing else: no category, explanation, source or credit.
        question: q ? { round: q.round, prompt: q.prompt, imagePath: q.imageUrl ? `/competitions/arena/${c._id}/image/${p.index}` : null, options: [...q.options] } : null,
        // Never whether an answer was right: the quiz only takes answers and
        // moves on. The score shows once the organizer publishes the results.
        answer: null,
        mine: mine ? { choice: mine.choice } : null,
        score: c.resultsPublishedAt ? score : null,
        correct: c.resultsPublishedAt ? correct : null,
        answered: entry.answers.length,
        resultsPublished: !!c.resultsPublishedAt,
        // The next question's picture, to load ahead (it is served only in its last seconds before opening).
        nextImagePath: (() => { const n = upcoming(c, p); return Number.isInteger(n) && c.paper[n]?.imageUrl ? `/competitions/arena/${c._id}/image/${n}` : null; })()
    });
    // Have the server fetch the next picture now, so it is ready in memory.
    const n = upcoming(c, p);
    if (Number.isInteger(n) && c.paper[n]?.imageUrl) pictureOf(c.paper[n].imageUrl).catch(() => {});
}));

router.post('/:id/answer', wrap(async (req, res) => {
    const c = await load(req.params.id);
    if (c.status !== 'published') throw fail(410, 'This competition was cancelled.');
    const entry = await entryOf(c, req.user);
    if (!entry.joinedAt) throw fail(403, 'Enter your joining code first.');
    const now = Date.now();
    const index = Number(req.body?.index);
    const choice = Number(req.body?.choice);
    // A tap in the question's last moment can reach the server just after it
    // closed: within a second and a half, it still counts.
    let p = phaseAt(c, now);
    if (p.stage !== 'question' || p.index !== index) p = phaseAt(c, now - 1500);
    if (p.stage !== 'question' || p.index !== index) throw fail(409, 'Time is up for this question.');
    const q = c.paper[index];
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) throw fail(400, 'Choose one of the four options.');
    const correct = choice === q.answer;
    const answer = { q: index, choice, correct, points: correct ? c.pointsPerQuestion : 0, ms: Math.min(c.secondsPerQuestion * 1000, Math.max(0, now - p.startedAt)), at: new Date(now) };
    // Only if this question has no answer yet: one answer each, however fast the taps.
    const r = await ArenaEntry.updateOne({ _id: entry._id, 'answers.q': { $ne: index } }, { $push: { answers: answer } });
    if (!r.modifiedCount) throw fail(409, 'You have already answered this question.');
    res.json({ mine: { choice } });
}));

/**
 * The pictures, kept in memory once fetched: a picture question must show at
 * once, not wait on the picture's own site for every student.
 */
const pictures = new Map();
const pictureOf = (url) => {
    if (!pictures.has(url)) {
        const p = fetch(url, { headers: { 'User-Agent': 'YATICORP-LMS-QuizArena/1.0' } }).then(async (r) => {
            const type = r.headers.get('content-type') || '';
            if (!r.ok || !type.startsWith('image/')) throw new Error('not an image');
            return { type, body: Buffer.from(await r.arrayBuffer()) };
        });
        p.catch(() => pictures.delete(url));
        pictures.set(url, p);
        if (pictures.size > 500) pictures.delete(pictures.keys().next().value);
    }
    return pictures.get(url);
};
/** The question after the one on now (or the round's first, during its intro). */
const nextIndex = (p) => (p.stage === 'intro' ? null : Number.isInteger(p.index) ? p.index + 1 : null);
const firstOfRound = (c, round) => roundsOf(c).find((r) => r.round === round)?.from ?? null;
const upcoming = (c, p) => (p.stage === 'intro' ? firstOfRound(c, p.round) : nextIndex(p));
/** The next picture may load in the last few seconds before it opens, so it shows at once. */
const EARLY_MS = 4000;

/** A question's picture, once that question has opened (or is about to), for a student who has joined. */
router.get('/:id/image/:index', wrap(async (req, res) => {
    const c = await load(req.params.id);
    const entry = await entryOf(c, req.user);
    if (!entry.joinedAt) throw fail(403, 'Enter your joining code first.');
    const index = Number(req.params.index);
    const p = phaseAt(c, Date.now());
    const soon = index === upcoming(c, p) && p.endsAt - Date.now() <= EARLY_MS;
    const opened = soon || p.stage === 'finished' || (Number.isInteger(p.index) && index <= p.index) || index < closedBy(c, Date.now());
    const q = Number.isInteger(index) ? c.paper[index] : null;
    if (!q || !q.imageUrl || !opened) throw fail(404, 'No picture here.');
    const pic = await pictureOf(q.imageUrl).catch(() => null);
    if (!pic) throw fail(502, 'The picture could not be loaded.');
    res.setHeader('Content-Type', pic.type);
    res.setHeader('Cache-Control', 'private, max-age=600');
    res.send(pic.body);
}));

router.get('/:id/results', wrap(async (req, res) => {
    const c = await load(req.params.id);
    if (!c.resultsPublishedAt) throw fail(409, 'The results are not published yet.');
    const entries = await ArenaEntry.find({ competitionId: c._id, rank: { $ne: null } }).sort({ rank: 1 }).lean();
    const ranked = entries.map((e) => ({ entry: e, rank: e.rank, score: e.score }));
    const row = (e) => ({ rank: e.rank, name: e.name, collegeName: e.collegeName, organizationId: e.organizationId ? String(e.organizationId) : null, score: e.score, correctCount: e.correctCount, timeMs: e.timeMs, you: String(e.userId) === String(req.user._id) });
    const me = entries.find((e) => String(e.userId) === String(req.user._id));
    res.json({
        title: c.title,
        maxScore: c.paper.length * c.pointsPerQuestion,
        questions: c.paper.length,
        publishedAt: c.resultsPublishedAt,
        top: entries.slice(0, 3).map(row),
        overall: entries.slice(0, 500).map(row),
        colleges: scoring.colleges(ranked).map((x) => ({ ...x, organizationId: x.organizationId ? String(x.organizationId) : null })),
        me: me ? { ...row(me), of: entries.length, certificate: !!certificateFor(c, me) } : null
    });
}));

/** The certificate this entry earns: { place } for the top three, { place: null } for taking part, or null. */
const certificateFor = (c, e) => {
    if (!c.resultsPublishedAt || e.rank == null) return null;
    if (e.rank <= 3 && c.certificates.winners) return { place: e.rank };
    if (c.certificates.participants && scoring.tookPart(e) && e.score >= (c.certificates.minScore || 0)) return { place: null };
    return null;
};

router.get('/:id/certificate', wrap(async (req, res) => {
    const c = await load(req.params.id);
    const e = await ArenaEntry.findOne({ competitionId: c._id, userId: req.user._id }).lean();
    const cert = e && certificateFor(c, e);
    if (!cert) throw fail(404, c.resultsPublishedAt ? 'There is no certificate for you in this competition.' : 'Certificates come with the results, once they are published.');
    const college = e.collegeName || 'your college';
    const max = c.paper.length * c.pointsPerQuestion;
    const ord = { 1: '1st', 2: '2nd', 3: '3rd' }[cert.place];
    require('../services/certificate').draw(res, {
        competition: { name: c.title, game: 'arena', organizedBy: c.organizedBy, completedAt: c.resultsPublishedAt },
        team: { teamName: e.name, collegeName: college },
        playerName: e.name,
        place: cert.place,
        paragraph: `This certificate is awarded in recognition of your outstanding performance in Quiz Arena, representing ${college}. You scored ${e.score} of ${max} points across the Live Quiz Battle, the Picture Challenge and the Current Affairs Clash.`,
        line: cert.place
            ? `for finishing ${ord} with ${e.score} of ${max} points, representing ${college}`
            : `for taking part in Quiz Arena for ${college}, scoring ${e.score} of ${max} points`
    });
}));

/** A code typed in the Join with a code box: mine joins me in; someone else's is refused; not an arena code: null. */
const joinByCode = async (user, rawCode) => {
    const code = normal(rawCode);
    const entry = await ArenaEntry.findOne({ joinCode: code });
    if (!entry) return null;
    if (String(entry.userId) !== String(user._id)) throw fail(403, 'This joining code belongs to another student. Use the code sent to you.');
    const c = await ArenaCompetition.findById(entry.competitionId);
    if (!c || c.status !== 'published') throw fail(410, 'This Quiz Arena was cancelled.');
    if (entry.status !== 'approved') throw fail(403, 'Your entry is not approved.');
    await joinWith(c, entry, code);
    return { arena: { id: String(c._id) } };
};

/**
 * For the pop-up: each Quiz Arena I am approved for that is on now (or opens
 * within five minutes) and I have not joined, with my code.
 */
const alertsFor = async (user) => {
    const entries = await ArenaEntry.find({ userId: user._id, status: 'approved', joinedAt: null }).select('competitionId joinCode paidAt status').lean();
    if (!entries.length) return [];
    const comps = await ArenaCompetition.find({ _id: { $in: entries.map((e) => e.competitionId) }, status: 'published' }).select('-paper.answer -paper.explanation');
    const now = Date.now();
    return comps.map((c) => {
        const p = phaseAt(c, now);
        const e0 = entries.find((x) => String(x.competitionId) === String(c._id));
        // Owing the entry fee: a pop-up to pay first (never the code).
        if (owes(c, e0)) return p.stage === 'finished' ? null : { id: `pay-arena:${c._id}`, kind: 'payment', arenaId: String(c._id), title: c.title, subtitle: `Pay ₹${c.entryFee.amount} to enroll`, amount: c.entryFee.amount };
        if (!e0.joinCode) return null;
        // Only once it has started: the code is never shown before.
        if (p.stage === 'waiting' || p.stage === 'finished') return null;
        const e = entries.find((x) => String(x.competitionId) === String(c._id));
        return { id: `arena:${c._id}`, kind: 'arena', arenaId: String(c._id), code: e.joinCode, title: c.title, subtitle: 'Quiz Arena is live now', deadline: null };
    }).filter(Boolean);
};

/** Pay the entry fee online (Razorpay), once my entry is approved: the order, then its verification. */
const feeFor = async (req) => {
    const c = await load(req.params.id);
    if (!(c.entryFee?.enabled && c.entryFee.amount > 0)) throw fail(409, 'This Quiz Arena has no entry fee.');
    if (c.status !== 'published' || phaseAt(c, Date.now()).stage === 'finished') throw fail(409, 'This Quiz Arena is over.');
    const entry = await ArenaEntry.findOne({ competitionId: c._id, userId: req.user._id });
    if (!entry || entry.status !== 'approved') throw fail(403, 'You can pay once your entry is approved by the organizer.');
    const onPaid = (p) => ArenaEntry.updateOne({ _id: entry._id, paidAt: null }, { $set: { paidAt: p.paidAt, paidAmount: p.amount } });
    return { c, entry, onPaid };
};
const fees = require('../services/entryFee');
router.post('/:id/pay', wrap(async (req, res) => {
    const { c, entry, onPaid } = await feeFor(req);
    if (entry.paidAt) return res.json({ paid: true });
    res.json(await fees.startPayment({ user: req.user, kind: 'arena', competitionId: c._id, amount: c.entryFee.amount, title: c.title, onPaid }));
}));
router.post('/:id/pay/verify', wrap(async (req, res) => {
    const { c, entry, onPaid } = await feeFor(req);
    if (entry.paidAt) return res.json({ paid: true });
    res.json(await fees.confirmPayment({ user: req.user, kind: 'arena', competitionId: c._id, body: req.body, onPaid }));
}));

module.exports = router;
module.exports.certificateFor = certificateFor;
module.exports.joinByCode = joinByCode;
module.exports.alertsFor = alertsFor;
