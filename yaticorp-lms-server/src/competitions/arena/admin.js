/**
 * Quiz Arena for the platform admin, at /api/competitions/arena/admin
 * (superadmin only; see ../index.js).
 *
 *   GET    /questions                    the question bank (?round ?status ?difficulty ?q)
 *   POST   /questions                    add a question (a draft)
 *   PUT    /questions/:qid               edit one (back to draft: it is reviewed again)
 *   POST   /questions/:qid/review        { approve } approve it, or send it back to draft
 *   DELETE /questions/:qid               remove one (contests already published keep their copy)
 *   POST   /image                        upload a question or banner picture
 *   GET    /questions/datasets           the prewritten question files (./datasets)
 *   POST   /questions/import             { datasets, checkLinks } Generate Question Bank: import
 *                                        them as drafts (./importer.js) → { job }
 *   GET    /questions/import/:jobId      the import's progress and report
 *
 *   GET    /                             every contest
 *   POST   /                             create one (a draft)
 *   GET    /:id                          one, with its questions and who registered
 *   PUT    /:id                          edit (everything while a draft; after publishing,
 *                                        only the words, the deadline and the seat limit)
 *   POST   /:id/publish                  freeze the questions and open registration
 *   POST   /:id/start-now                start the quiz now rather than at its time
 *   POST   /:id/cancel                   call it off
 *   DELETE /:id                          delete a draft or a cancelled one
 *   POST   /:id/entries/review           { entryIds | organizationId, status } approve or reject
 *                                        the students colleges entered (as Chess teams are)
 *   GET    /:id/results                  the rankings, for review
 *   POST   /:id/publish-results          once the quiz is over: rankings to students, certificates on
 */
const express = require('express');
const mongoose = require('mongoose');
const { ArenaQuestion, ArenaCompetition, ArenaEntry, ROUNDS, ROUND_NAMES, DIFFICULTIES } = require('./models');
const { phaseAt, totalMs, stateOf } = require('./timeline');
const scoring = require('./scoring');
const { upload: imageUpload } = require('../../middleware/uploadMiddleware');


const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    if (err?.status) return res.status(err.status).json({ message: err.message });
    if (err?.name === 'ValidationError') return res.status(400).json({ message: Object.values(err.errors)[0]?.message || 'Check the details.' });
    next(err);
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const num = (v, lo, hi, dflt) => (v == null || v === '' || Number.isNaN(Number(v)) ? dflt : Math.max(lo, Math.min(hi, Math.round(Number(v)))));
const isId = (id) => mongoose.isValidObjectId(id);
const prizesFrom = (list) => (Array.isArray(list) ? list : [])
    .filter((p) => [1, 2, 3].includes(Number(p.place)))
    .map((p) => ({ place: Number(p.place), title: text(p.title, 120), xp: num(p.xp, 0, 100000, 0), rewardPoints: num(p.rewardPoints, 0, 100000, 0) }));
const text = (v, max) => String(v ?? '').trim().slice(0, max);

/* ── The question bank ───────────────────────────────────────────────── */

/** A question's fields from a form, checked. */
const questionFrom = (b = {}) => {
    const round = Number(b.round);
    if (!ROUNDS.includes(round)) throw fail(400, 'Choose the round: 1, 2 or 3.');
    const prompt = text(b.prompt, 500);
    if (!prompt) throw fail(400, 'Write the question.');
    const options = (Array.isArray(b.options) ? b.options : []).map((o) => text(o, 200));
    if (options.length !== 4 || options.some((o) => !o)) throw fail(400, 'Give all four options.');
    if (new Set(options.map((o) => o.toLowerCase())).size !== 4) throw fail(400, 'The four options must all be different.');
    const answer = Number(b.answer);
    if (![0, 1, 2, 3].includes(answer)) throw fail(400, 'Mark the correct answer.');
    const imageUrl = text(b.imageUrl, 600);
    if (imageUrl && !/^https?:\/\//.test(imageUrl)) throw fail(400, 'The picture must be an uploaded image.');
    if (round === 2 && !imageUrl) throw fail(400, 'A Picture Challenge question needs a picture.');
    const difficulty = DIFFICULTIES.includes(b.difficulty) ? b.difficulty : 'medium';
    return { round, prompt, options, answer, imageUrl, difficulty, category: text(b.category, 60), explanation: text(b.explanation, 600), source: text(b.source, 300) };
};

/* ── Generate Question Bank (prewritten datasets; no AI) ──────────────── */

const importer = require('./importer');
/** The calendar day (India) a time falls on, as YYYY-MM-DD. */
const dayOf = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * The routes, for `scope` 'platform' (the platform admin: the platform's
 * question bank and contests) or 'organization' (a college allowed to host:
 * its own question bank and its own contests, for its own students).
 */
const arenaRoutes = (scope = 'platform') => {
const router = express.Router();
const org = (req) => (scope === 'organization' ? req.organization._id : null);
/** This caller's question bank, and their contests. */
const bankOf = (req) => ({ organizationId: org(req) });
const ownOf = (req) => ({ hostOrganizationId: org(req) });
/** The bank a contest takes its questions from: its host's. */
const contestBank = (c) => ({ organizationId: c.hostOrganizationId || null });
router.get('/questions/datasets', wrap(async (req, res) => res.json({ datasets: importer.listDatasets() })));
router.post('/questions/import', wrap(async (req, res) => {
    const datasets = (Array.isArray(req.body?.datasets) ? req.body.datasets : []).filter((d) => importer.DATASETS[d]);
    if (!datasets.length) throw fail(400, 'Choose at least one round to import.');
    const job = importer.startImport({ datasets, checkLinks: req.body?.checkLinks !== false, adminId: req.admin?._id || null, organizationId: org(req) });
    res.status(202).json({ job });
}));
/**
 * Generate one round's questions, with no dialog: bring back every question
 * removed from the round (Delete or Remove all only take them off the bank's
 * page), then import in the background any the round's file has that the
 * bank has not seen yet (its job id is returned, to follow).
 */
router.post('/questions/generate', wrap(async (req, res) => {
    // One round, or all three at once ({ round: 'all' }).
    const rounds = req.body?.round === 'all' ? ROUNDS : [Number(req.body?.round)];
    if (!rounds.every((r) => ROUNDS.includes(r))) throw fail(400, 'Choose a round.');
    const round = { $in: rounds };
    const { modifiedCount } = await ArenaQuestion.updateMany({ round, deletedAt: { $ne: null }, ...bankOf(req) }, { $set: { deletedAt: null } });
    // A college's bank: copied at once from the platform's (pictures and
    // sources already resolved there), instead of fetched again one by one.
    let copied = 0;
    if (org(req)) {
        const id = String(org(req));
        const mine = new Set((await ArenaQuestion.find({ round, organizationId: org(req), importKey: { $type: 'string' } }).select('importKey').lean()).map((q) => q.importKey));
        const source = await ArenaQuestion.find({ round, organizationId: null, importKey: { $type: 'string' } }).lean();
        const fresh = source.filter((q) => !mine.has(`${id}:${q.importKey}`));
        if (fresh.length) {
            await ArenaQuestion.insertMany(fresh.map(({ _id, createdAt, updatedAt, __v, ...q }) => ({
                ...q, organizationId: org(req), importKey: `${id}:${q.importKey}`,
                status: 'draft', reviewedBy: null, reviewedAt: null, bankOrder: null, deletedAt: null, createdBy: req.admin?._id || null
            })), { ordered: false }).catch(() => {});
            copied = fresh.length;
        }
    }
    // Anything the round's file has that is not here yet (links unchecked for a college: it is quicker).
    const job = importer.startImport({ datasets: rounds.map((r) => `round${r}`), adminId: req.admin?._id || null, organizationId: org(req), checkLinks: !org(req) });
    res.json({ restored: modifiedCount + copied, job });
}));

/** Remove all: take every question of a round off the bank's page (Generate brings them back). */
router.post('/questions/remove-all', wrap(async (req, res) => {
    const round = Number(req.body?.round);
    if (!ROUNDS.includes(round)) throw fail(400, 'Choose a round.');
    const ids = (await ArenaQuestion.find({ round, deletedAt: null, ...bankOf(req) }).select('_id').lean()).map((q) => q._id);
    await ArenaQuestion.updateMany({ _id: { $in: ids } }, { $set: { deletedAt: new Date(), status: 'draft', reviewedBy: null, reviewedAt: null, bankOrder: null } });
    await ArenaCompetition.updateMany({ status: 'draft', ...ownOf(req) }, { $pull: { [`selection.${round}`]: { $in: ids } } });
    res.json({ removed: ids.length });
}));

router.get('/questions/import/:jobId', wrap(async (req, res) => {
    const job = importer.getJob(req.params.jobId);
    if (!job) throw fail(404, 'That import is no longer known.');
    res.json({ job });
}));

router.get('/questions', wrap(async (req, res) => {
    const filter = { deletedAt: null, ...bankOf(req) };
    if (ROUNDS.includes(Number(req.query.round))) filter.round = Number(req.query.round);
    if (['draft', 'approved'].includes(req.query.status)) filter.status = req.query.status;
    if (req.query.status === 'review') Object.assign(filter, { status: 'draft', needsReview: true });
    if (DIFFICULTIES.includes(req.query.difficulty)) filter.difficulty = req.query.difficulty;
    const q = text(req.query.q, 80);
    if (q) filter.$or = [{ prompt: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }, { category: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } }];
    const [questions, counts] = await Promise.all([
        ArenaQuestion.find(filter).sort({ round: 1, createdAt: -1 }).limit(1000).lean(),
        ArenaQuestion.aggregate([{ $match: { deletedAt: null, ...bankOf(req) } }, { $group: { _id: { round: '$round', status: '$status', review: '$needsReview' }, n: { $sum: 1 } } }])
    ]);
    const tally = Object.fromEntries(ROUNDS.map((r) => [r, { draft: 0, approved: 0, review: 0 }]));
    for (const c of counts) {
        if (!tally[c._id.round]) continue;
        tally[c._id.round][c._id.status] += c.n;
        if (c._id.status === 'draft' && c._id.review) tally[c._id.round].review += c.n;
    }
    res.json({ questions, counts: tally });
}));

router.post('/questions', wrap(async (req, res) => {
    const question = await ArenaQuestion.create({ ...questionFrom(req.body), ...bankOf(req), createdBy: req.admin?._id || null });
    res.status(201).json({ question });
}));

router.put('/questions/:qid', wrap(async (req, res) => {
    if (!isId(req.params.qid)) throw fail(404, 'Question not found.');
    // Any edit sends it back to be reviewed again.
    const question = await ArenaQuestion.findOneAndUpdate({ _id: req.params.qid, ...bankOf(req) },
        { $set: { ...questionFrom(req.body), status: 'draft', reviewedBy: null, reviewedAt: null } },
        { returnDocument: 'after', runValidators: true });
    if (!question) throw fail(404, 'Question not found.');
    res.json({ question });
}));

/** An approved question's place in its round's order (approval time until shuffled). */
const placeOf = (q) => (q.bankOrder ?? new Date(q.reviewedAt || q.createdAt || 0).getTime());

/**
 * Shuffle the order of some approved questions of a round (those the bank
 * shows): the same questions keep the same places between them, dealt out
 * again at random — so Publish takes them in the new order.
 */
router.post('/questions/shuffle', wrap(async (req, res) => {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId);
    const qs = await ArenaQuestion.find({ _id: { $in: ids }, status: 'approved', deletedAt: null, ...bankOf(req) }).lean();
    if (qs.length < 2) throw fail(400, 'Approve at least two questions to shuffle them.');
    if (new Set(qs.map((q) => q.round)).size > 1) throw fail(400, 'Shuffle one round at a time.');
    const places = qs.map(placeOf).sort((a, b) => a - b);
    const dealt = [...qs];
    for (let i = dealt.length - 1; i > 0; i -= 1) {
        const j = require('node:crypto').randomInt(0, i + 1);
        [dealt[i], dealt[j]] = [dealt[j], dealt[i]];
    }
    await ArenaQuestion.bulkWrite(dealt.map((q, i) => ({ updateOne: { filter: { _id: q._id }, update: { $set: { bankOrder: places[i] } } } })));
    res.json({ order: dealt.map((q) => String(q._id)) });
}));

router.post('/questions/:qid/review', wrap(async (req, res) => {
    if (!isId(req.params.qid)) throw fail(404, 'Question not found.');
    const approve = req.body?.approve !== false;
    const current = await ArenaQuestion.findOne({ _id: req.params.qid, ...bankOf(req) }).lean();
    if (!current) throw fail(404, 'Question not found.');
    // Current affairs only with a source, and not once the event is over a year old.
    if (approve && current.round === 3) {
        if (!current.sourceUrl && !current.source) throw fail(400, 'Add the source this current-affairs answer was checked against before approving it.');
        if (current.eventDate && Date.now() - new Date(current.eventDate).getTime() > 365 * 86400000) throw fail(400, 'This current-affairs question is over a year old: it is out of date.');
    }
    // Approving is the review: it clears Needs Review (the notes stay, for the record).
    const question = await ArenaQuestion.findByIdAndUpdate(req.params.qid,
        { $set: approve ? { status: 'approved', needsReview: false, reviewedBy: req.admin?._id || null, reviewedAt: new Date(), bankOrder: Date.now() } : { status: 'draft', reviewedBy: null, reviewedAt: null, bankOrder: null } },
        { returnDocument: 'after' });
    res.json({ question });
}));

router.delete('/questions/:qid', wrap(async (req, res) => {
    if (!isId(req.params.qid)) throw fail(404, 'Question not found.');
    // Only taken off the bank's page, never removed for good — imported or
    // written here: Generate question bank brings it back.
    const gone = await ArenaQuestion.updateOne({ _id: req.params.qid, ...bankOf(req) }, { $set: { deletedAt: new Date(), status: 'draft', reviewedBy: null, reviewedAt: null, bankOrder: null } });
    if (!gone.matchedCount) throw fail(404, 'Question not found.');
    // Taken out of any draft that had chosen it; published contests keep their copy.
    await ArenaCompetition.updateMany({ status: 'draft', ...ownOf(req) }, { $pull: { 'selection.1': req.params.qid, 'selection.2': req.params.qid, 'selection.3': req.params.qid } });
    res.json({ ok: true });
}));

router.post('/image', imageUpload.single('image'), wrap(async (req, res) => {
    if (!req.file) throw fail(400, 'Choose an image.');
    const { uploadToBunny } = require('../../utils/bunnyStorage');
    res.json({ url: await uploadToBunny(req.file.buffer, req.file.originalname, 'quiz-arena') });
}));

/* ── Contests ────────────────────────────────────────────────────────── */

const summary = (c, now = Date.now()) => ({
    id: String(c._id),
    title: c.title,
    organizedBy: c.organizedBy,
    bannerUrl: c.bannerUrl,
    startsAt: c.startedAt || c.startsAt,
    registrationDeadline: c.registrationDeadline,
    registrationOpensAt: c.registrationOpensAt,
    maxParticipants: c.maxParticipants,
    playersPerCollege: c.playersPerCollege,
    registeredCount: c.registeredCount,
    counts: c.counts,
    questions: (c.counts[1] || 0) + (c.counts[2] || 0) + (c.counts[3] || 0),
    secondsPerQuestion: c.secondsPerQuestion,
    pointsPerQuestion: c.pointsPerQuestion,
    status: c.status,
    state: stateOf(c, now),
    resultsPublishedAt: c.resultsPublishedAt,
    prizes: c.prizes,
    participationXp: c.participationXp,
    entryFee: c.entryFee?.enabled ? { enabled: true, amount: c.entryFee.amount } : { enabled: false, amount: 0 },
    certificates: c.certificates
});

/** A contest's fields from a form. `current`: the saved one being edited. */
const competitionFrom = (b = {}, current = null) => {
    const pick = (k) => (b[k] !== undefined ? b[k] : current?.[k]);
    const title = text(pick('title'), 140);
    if (!title) throw fail(400, 'Give the competition a title.');
    const startsAt = new Date(pick('startsAt'));
    const registrationDeadline = new Date(pick('registrationDeadline'));
    if (Number.isNaN(startsAt.getTime())) throw fail(400, 'Set the date and time it starts.');
    if (Number.isNaN(registrationDeadline.getTime())) throw fail(400, 'Set the registration deadline.');
    if (registrationDeadline > startsAt) throw fail(400, 'Registration has to close before the quiz starts.');
    const opensRaw = pick('registrationOpensAt');
    const registrationOpensAt = opensRaw ? new Date(opensRaw) : null;
    if (registrationOpensAt && (Number.isNaN(registrationOpensAt.getTime()) || registrationOpensAt >= registrationDeadline)) throw fail(400, 'Registration has to start before it ends.');
    require('../services/dates').checkSchedule({ registrationOpensAt, registrationDeadline, startsAt, current });
    const bannerUrl = text(pick('bannerUrl'), 600);
    if (bannerUrl && !/^https?:\/\//.test(bannerUrl)) throw fail(400, 'The banner must be an uploaded image.');
    const counts = b.counts || current?.counts || {};
    const selection = b.selection || current?.selection || {};
    const elig = b.eligibility || current?.eligibility || {};
    const certs = b.certificates || current?.certificates || {};
    const out = {
        title,
        description: text(pick('description'), 2000),
        instructions: text(pick('instructions'), 3000),
        organizedBy: text(pick('organizedBy'), 140) || 'YATICORP',
        bannerUrl,
        startsAt,
        registrationDeadline,
        registrationOpensAt,
        maxParticipants: num(pick('maxParticipants'), 1, 100000, 500),
        playersPerCollege: num(pick('playersPerCollege'), 1, 500, 10),
        eligibility: {
            organizationIds: (elig.organizationIds || []).filter(isId),
            collegeStudentsOnly: elig.collegeStudentsOnly !== false
        },
        counts: { 1: num(counts[1], 0, 50, 10), 2: num(counts[2], 0, 50, 5), 3: num(counts[3], 0, 50, 10) },
        selection: Object.fromEntries(ROUNDS.map((r) => [r, [...new Set((selection[r] || []).map(String))].filter(isId)])),
        secondsPerQuestion: num(pick('secondsPerQuestion'), 5, 120, 20),
        pointsPerQuestion: num(pick('pointsPerQuestion'), 1, 1000, 100),
        prizes: prizesFrom(b.prizes !== undefined ? b.prizes : current?.prizes),
        participationXp: num(pick('participationXp'), 0, 10000, 20),
        entryFee: b.entryFee !== undefined ? { enabled: !!(b.entryFee?.enabled) && Math.round(Number(b.entryFee?.amount) || 0) > 0, amount: Math.max(0, Math.min(100000, Math.round(Number(b.entryFee?.amount) || 0))) } : current?.entryFee || { enabled: false, amount: 0 },
        certificates: {
            winners: certs.winners !== false,
            participants: certs.participants !== false,
            minScore: num(certs.minScore, 0, 1000000, 0)
        }
    };
    if (out.counts[1] + out.counts[2] + out.counts[3] === 0) throw fail(400, 'The quiz needs at least one question.');
    return out;
};

const load = async (id, req) => {
    if (!isId(id)) throw fail(404, 'Competition not found.');
    const c = await ArenaCompetition.findOne({ _id: id, ...ownOf(req) });
    if (!c) throw fail(404, 'Competition not found.');
    return c;
};

router.get('/', wrap(async (req, res) => {
    const rows = await ArenaCompetition.find(ownOf(req)).select('-paper.prompt -paper.options -paper.answer -paper.explanation -paper.imageUrl -paper.source -paper.sourceUrl').sort({ startsAt: -1 }).lean();
    const now = Date.now();
    res.json({ competitions: rows.map((c) => summary(c, now)) });
}));

router.post('/', wrap(async (req, res) => {
    const fields = competitionFrom(req.body);
    // A college's own contest: for its own students only.
    if (org(req)) Object.assign(fields, { hostOrganizationId: org(req), eligibility: { ...fields.eligibility, organizationIds: [org(req)] }, organizedBy: fields.organizedBy === 'YATICORP' ? req.organization.name : fields.organizedBy });
    const c = await ArenaCompetition.create({ ...fields, createdBy: req.admin?._id || null });
    res.status(201).json({ competition: summary(c) });
}));

router.get('/:id', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    const now = Date.now();
    const chosenIds = ROUNDS.flatMap((r) => c.selection[r] || []);
    const [chosen, entries] = await Promise.all([
        ArenaQuestion.find({ _id: { $in: chosenIds }, deletedAt: null }).lean(),
        ArenaEntry.find({ competitionId: c._id }).select('userId name collegeName organizationId status joinCode paidAt paidAmount registeredAt joinedAt answers').sort({ collegeName: 1, registeredAt: 1 }).lean()
    ]);
    const byId = new Map(chosen.map((q) => [String(q._id), q]));
    res.json({
        competition: {
            ...summary(c, now),
            description: c.description,
            instructions: c.instructions,
            startsAtPlanned: c.startsAt,
            startedAt: c.startedAt,
            eligibility: c.eligibility,
            certificates: c.certificates,
            selection: Object.fromEntries(ROUNDS.map((r) => [r, (c.selection[r] || []).map((id) => byId.get(String(id))).filter(Boolean)])),
            paper: c.paper,
            durationMs: c.paper.length ? totalMs(c) : null,
            phase: c.status === 'published' ? phaseAt(c, now) : null
        },
        // How many approved questions each round of the bank has, for the readiness line.
        bank: Object.fromEntries(await Promise.all(ROUNDS.map(async (r) => [r, await ArenaQuestion.countDocuments({ round: r, status: 'approved', deletedAt: null, ...contestBank(c) })]))),
        participants: entries.map((e) => ({ id: String(e._id), userId: e.userId ? String(e.userId) : null, name: e.name, collegeName: e.collegeName, organizationId: e.organizationId ? String(e.organizationId) : null, status: e.status, joinCode: e.joinCode || null, paidAt: e.paidAt || null, paidAmount: e.paidAmount || 0, registeredAt: e.registeredAt, joinedAt: e.joinedAt, answered: e.answers.length })),
        roundNames: ROUND_NAMES
    });
}));

router.put('/:id', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status === 'cancelled') throw fail(409, 'This competition was cancelled.');
    if (c.status === 'draft') {
        Object.assign(c, competitionFrom(req.body, c.toObject()));
    } else {
        // Published: the questions, timing and scoring are fixed. Only the
        // words, the deadline (still before the start) and the seats may change.
        if (phaseAt(c, Date.now()).stage !== 'waiting') throw fail(409, 'The quiz has started: it can no longer be edited.');
        const b = req.body || {};
        const before = { startsAt: c.startsAt, registrationDeadline: c.registrationDeadline, registrationOpensAt: c.registrationOpensAt };
        if (b.title !== undefined) c.title = text(b.title, 140) || c.title;
        for (const k of ['description', 'instructions']) if (b[k] !== undefined) c[k] = text(b[k], k === 'description' ? 2000 : 3000);
        if (b.bannerUrl !== undefined) c.bannerUrl = text(b.bannerUrl, 600);
        // The start may move while the quiz has not begun (never into the past).
        if (b.startsAt !== undefined && !c.startedAt) {
            const s = new Date(b.startsAt);
            if (Number.isNaN(s.getTime())) throw fail(400, 'Set the date and time it starts.');
            if (s.getTime() !== c.startsAt.getTime()) {
                if (s.getTime() <= Date.now()) throw fail(400, 'The start time has to be in the future.');
                c.startsAt = s;
            }
        }
        if (b.registrationDeadline !== undefined) {
            const d = new Date(b.registrationDeadline);
            if (Number.isNaN(d.getTime()) || d > (c.startedAt || c.startsAt)) throw fail(400, 'Registration has to close before the quiz starts.');
            c.registrationDeadline = d;
        }
        if (b.registrationOpensAt !== undefined) {
            const o = b.registrationOpensAt ? new Date(b.registrationOpensAt) : null;
            if (o && (Number.isNaN(o.getTime()) || o >= c.registrationDeadline)) throw fail(400, 'Registration has to start before it ends.');
            c.registrationOpensAt = o;
        }
        if (['startsAt', 'registrationDeadline', 'registrationOpensAt'].some((k) => b[k] !== undefined)) require('../services/dates').checkSchedule({ registrationOpensAt: c.registrationOpensAt, registrationDeadline: c.registrationDeadline, startsAt: c.startsAt, current: before });
        if (b.maxParticipants !== undefined) c.maxParticipants = Math.max(c.registeredCount, num(b.maxParticipants, 1, 100000, c.maxParticipants));
        if (b.prizes !== undefined) c.prizes = prizesFrom(b.prizes);
        if (b.participationXp !== undefined) c.participationXp = num(b.participationXp, 0, 10000, c.participationXp);
        if (b.entryFee !== undefined) c.entryFee = { enabled: !!(b.entryFee?.enabled) && Math.round(Number(b.entryFee?.amount) || 0) > 0, amount: Math.max(0, Math.min(100000, Math.round(Number(b.entryFee?.amount) || 0))) };
        if (b.certificates) c.certificates = { ...c.certificates, winners: b.certificates.winners !== false, participants: b.certificates.participants !== false };
        if (b.playersPerCollege !== undefined) c.playersPerCollege = num(b.playersPerCollege, 1, 500, c.playersPerCollege);
    }
    await c.save();
    res.json({ competition: summary(c) });
}));

/**
 * A question's options in a random order, the answer following its option:
 * an admin may always type the right answer first, and students still find
 * it in a different place from question to question.
 */
const mixed = (q) => {
    const order = [0, 1, 2, 3].slice(0, q.options.length);
    for (let i = order.length - 1; i > 0; i -= 1) { const j = require('node:crypto').randomInt(0, i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
};

/** Freeze the questions into the paper and open registration. */
/**
 * Demo: the questions as students will see them, in order — the fixed paper
 * once published; before that, the approved ones Publish would take. Only
 * what a student sees (no answers).
 */
router.get('/:id/preview', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    let questions;
    if (c.status === 'draft') {
        questions = [];
        for (const r of ROUNDS) {
            const want = c.counts?.[r] || 0;
            if (!want) continue;
            const approved = (await ArenaQuestion.find({ round: r, status: 'approved', deletedAt: null, ...contestBank(c) }).lean()).sort((a, b) => placeOf(a) - placeOf(b)).slice(0, want);
            questions.push(...approved);
        }
    } else questions = c.paper;
    res.json({
        title: c.title,
        secondsPerQuestion: c.secondsPerQuestion,
        draft: c.status === 'draft',
        questions: questions.map((q) => ({ round: q.round, roundName: ROUND_NAMES[q.round], prompt: q.prompt, options: [...q.options], imageUrl: q.imageUrl || '' }))
    });
}));

router.post('/:id/publish', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status !== 'draft') throw fail(409, 'Only a draft can be published.');
    const when = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    if (c.startsAt.getTime() <= Date.now()) throw fail(400, `The start time (${when(c.startsAt)}) has already passed. Click Edit and set a start time — and a registration deadline before it — that is still ahead.`);
    if (c.registrationDeadline.getTime() <= Date.now()) throw fail(400, `The registration deadline (${when(c.registrationDeadline)}) has already passed, so colleges could not enter students. Click Edit and set it to a time still ahead (before the start).`);
    const paper = [];
    for (const r of ROUNDS) {
        const want = c.counts[r] || 0;
        if (!want) continue;
        // { fromBank: true } (the admin panel): the question bank is where questions
        // are finalised — each round takes its approved questions in the order they
        // were approved. Otherwise any chosen here come first, the rest at random.
        const fromBank = req.body?.fromBank === true;
        const chosenIds = fromBank ? [] : (c.selection[r] || []).map(String);
        const approved = (await ArenaQuestion.find({ round: r, status: 'approved', deletedAt: null, ...contestBank(c) }).lean()).sort((a, b) => placeOf(a) - placeOf(b));
        const byId = new Map(approved.map((q) => [String(q._id), q]));
        const notReady = chosenIds.filter((id) => !byId.has(id));
        if (notReady.length) throw fail(400, `Round ${r} has ${notReady.length} chosen question${notReady.length === 1 ? '' : 's'} not approved (or deleted). Approve or remove ${notReady.length === 1 ? 'it' : 'them'} first.`);
        if (chosenIds.length > want) throw fail(400, `Round ${r} has ${chosenIds.length} questions chosen but takes ${want}.`);
        const picked = chosenIds.map((id) => byId.get(id));
        // The rest drawn at random from the approved bank.
        const rest = approved.filter((q) => !chosenIds.includes(String(q._id)));
        if (!fromBank) for (let i = rest.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
        picked.push(...rest.slice(0, want - picked.length));
        if (picked.length < want) throw fail(400, `Round ${r} (${ROUND_NAMES[r]}) needs ${want} approved questions; the bank has ${approved.length}.`);
        if (r === 2 && picked.some((q) => !q.imageUrl)) throw fail(400, 'Every Picture Challenge question needs a picture.');
        paper.push(...picked.map((q) => ({ questionId: q._id, round: r, category: q.category, difficulty: q.difficulty, prompt: q.prompt, imageUrl: q.imageUrl, ...mixed(q), explanation: q.explanation })));
    }
    const saved = await ArenaCompetition.findOneAndUpdate({ _id: c._id, status: 'draft' },
        { $set: { paper, status: 'published', publishedAt: new Date(), selection: Object.fromEntries(ROUNDS.map((r) => [r, paper.filter((q) => q.round === r).map((q) => q.questionId)])) } },
        { returnDocument: 'after' });
    if (!saved) throw fail(409, 'It was published a moment ago.');
    res.json({ competition: summary(saved) });
}));

router.post('/:id/start-now', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    // A hosting college may start only from its contest's day; the platform admin any time.
    if (org(req) && dayOf(Date.now()) < dayOf(c.startsAt)) throw fail(409, `Start now opens on the competition's day (${new Date(c.startsAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}).`);
    if (c.status !== 'published') throw fail(409, 'Publish it first.');
    if (phaseAt(c, Date.now()).stage !== 'waiting') throw fail(409, 'It has already started.');
    const now = new Date();
    const saved = await ArenaCompetition.findOneAndUpdate({ _id: c._id, startedAt: c.startedAt },
        { $set: { startedAt: now, registrationDeadline: c.registrationDeadline > now ? now : c.registrationDeadline } },
        { returnDocument: 'after' });
    if (!saved) throw fail(409, 'It has already started.');
    const approved = await giveCodes(await ArenaEntry.find({ competitionId: c._id, status: 'approved' })).then(() => ArenaEntry.find({ competitionId: c._id, status: 'approved', joinedAt: null }).lean());
    tellEntries(approved, saved, 'Quiz Arena has started — join now', (e) => `${saved.title} is live. Your joining code: ${e.joinCode}. Enter it to join.`);
    res.json({ competition: summary(saved) });
}));

router.post('/:id/cancel', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status === 'cancelled') return res.json({ competition: summary(c) });
    if (c.resultsPublishedAt) throw fail(409, 'Its results are published: it cannot be cancelled.');
    c.status = 'cancelled';
    await c.save();
    res.json({ competition: summary(c) });
}));

router.delete('/:id', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status === 'published') throw fail(409, 'Cancel it first; a published competition keeps its records.');
    await ArenaEntry.deleteMany({ competitionId: c._id });
    await ArenaCompetition.deleteOne({ _id: c._id });
    res.json({ ok: true });
}));

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 6 }, () => CODE_CHARS[require('node:crypto').randomInt(0, CODE_CHARS.length)]).join('');

/** Give each approved entry without one its own joining code. Returns the entries given one. */
const giveCodes = async (entries) => {
    const given = [];
    for (const e of entries) {
        if (e.joinCode) continue;
        for (let tries = 0; tries < 6; tries += 1) {
            try {
                const saved = await ArenaEntry.findOneAndUpdate({ _id: e._id, joinCode: null }, { $set: { joinCode: newCode() } }, { returnDocument: 'after' });
                if (saved) given.push(saved);
                break;
            } catch (err) { if (err?.code !== 11000) throw err; }
        }
    }
    return given;
};

/** Each of these students, in their bell, with their own words (and code). */
const tellEntries = async (entries, c, title, words) => {
    try {
        const { notify } = require('../../rewards/services/notify');
        for (const e of entries) await notify(e.userId, title, words(e), `/competitions/arena/${c._id}/play`, 'competition');
    } catch (err) { console.error('[arena] notifying failed:', err.message); }
};

const ORDINAL = { 1: '1st', 2: '2nd', 3: '3rd' };

/**
 * What the published results give, as in the other games: the prize for 1st,
 * 2nd and 3rd (XP and reward points), XP for everyone who took part, and a
 * notification. Each payment carries a key unique to the contest, so running
 * it again pays nothing twice.
 */
const award = async (c, rankedRows) => {
    const { addXp } = require('../../rewards/services/xpService');
    const { awardPoints } = require('../../rewards/services/rewardPointsService');
    const { notify } = require('../../rewards/services/notify');
    const id = String(c._id);
    for (const r of rankedRows) {
        const userId = r.entry.userId;
        const place = r.rank <= 3 ? r.rank : null;
        const prize = place ? (c.prizes || []).find((p) => p.place === place) : null;
        if (prize?.xp > 0) await addXp({ userId, amount: prize.xp, source: 'competition', refId: `arena:${id}:place`, description: `for ${ORDINAL[place]} place in ${c.title}`, silent: true });
        if (prize?.rewardPoints > 0) await awardPoints({ userId, points: prize.rewardPoints, source: 'competition', claimKey: `arena:${id}:place`, description: `${ORDINAL[place]} place in ${c.title}`, meta: { arenaId: id, place }, quiet: true });
        if (c.participationXp > 0) await addXp({ userId, amount: c.participationXp, source: 'competition', refId: `arena:${id}:participation`, description: `for taking part in ${c.title}`, silent: true });
        const extras = [prize?.xp ? `+${prize.xp} XP` : '', prize?.rewardPoints ? `+${prize.rewardPoints} reward points` : '', c.participationXp ? `+${c.participationXp} XP for taking part` : ''].filter(Boolean).join(', ');
        const cert = (place && c.certificates.winners) || (!place && c.certificates.participants && r.score >= (c.certificates.minScore || 0)) ? ' Your certificate is ready.' : '';
        await notify(userId, place ? `🏆 ${ORDINAL[place]} place!` : 'Quiz Arena results', `${c.title}: you finished ${place ? `${ORDINAL[place]}${prize?.title ? ` — ${prize.title}` : ''}` : `#${r.rank}`} with ${r.score} points.${extras ? ` ${extras}.` : ''}${cert}`, `/competitions/arena/${id}`, 'competition');
    }
};

/** Approve or reject entries — some, or a whole college's — until the quiz starts. */
router.post('/:id/entries/review', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status !== 'published') throw fail(409, 'Publish it first.');
    if (phaseAt(c, Date.now()).stage !== 'waiting') throw fail(409, 'The quiz has started: entries can no longer change.');
    const status = req.body?.status;
    if (!['approved', 'rejected', 'pending'].includes(status)) throw fail(400, 'Approve or reject.');
    const filter = { competitionId: c._id };
    if (isId(req.body?.organizationId)) filter.organizationId = req.body.organizationId;
    else {
        const ids = (Array.isArray(req.body?.entryIds) ? req.body.entryIds : []).filter(isId);
        if (!ids.length) throw fail(400, 'Choose who to approve or reject.');
        filter._id = { $in: ids };
    }
    // Approving may not take more seats than there are.
    if (status !== 'rejected') {
        const rejectedNow = await ArenaEntry.countDocuments({ ...filter, status: 'rejected' });
        const taken = await ArenaEntry.countDocuments({ competitionId: c._id, status: { $ne: 'rejected' } });
        if (taken + rejectedNow > c.maxParticipants) throw fail(409, `Only ${c.maxParticipants - taken} places are left.`);
    }
    const r = await ArenaEntry.updateMany(filter, { $set: { status, reviewedAt: new Date() } });
    await require('./org').recount(c._id);
    if (status === 'approved') {
        const fresh = await giveCodes(await ArenaEntry.find({ ...filter, status: 'approved' }));
        await tellEntries(fresh, c, 'You are in Quiz Arena', (e) => `${c.title}: your entry is approved. It starts ${new Date(c.startedAt || c.startsAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}. ${c.entryFee?.enabled ? ` Pay the ₹${c.entryFee.amount} entry fee online in Games & Competitions to enroll — you can join only once it is paid.` : ''} Your joining code comes when the organizer starts the quiz.`);
    }
    res.json({ updated: r.modifiedCount });
}));

/** The rankings as they stand (final once the quiz is over), for the admin to review. */
const resultsOf = async (c) => {
    const entries = await ArenaEntry.find({ competitionId: c._id, status: 'approved' }).lean();
    const ranked = scoring.rank(entries);
    return {
        ranked: ranked.map((r) => ({ rank: r.rank, name: r.entry.name, collegeName: r.entry.collegeName, score: r.score, correctCount: r.correctCount, answered: r.answered, timeMs: r.timeMs })),
        colleges: scoring.colleges(ranked),
        registered: entries.length,
        tookPart: ranked.length,
        rankedRows: ranked
    };
};

router.get('/:id/results', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status !== 'published') throw fail(409, 'This competition has no results.');
    const { ranked, colleges, registered, tookPart } = await resultsOf(c);
    const p = phaseAt(c, Date.now());
    res.json({ final: p.stage === 'finished', published: !!c.resultsPublishedAt, maxScore: c.paper.length * c.pointsPerQuestion, ranked, colleges, registered, tookPart });
}));

router.post('/:id/publish-results', wrap(async (req, res) => {
    const c = await load(req.params.id, req);
    if (c.status !== 'published') throw fail(409, 'This competition has no results.');
    if (phaseAt(c, Date.now()).stage !== 'finished') throw fail(409, 'The quiz is not over yet.');
    if (c.resultsPublishedAt) throw fail(409, 'The results are already published.');
    const { rankedRows } = await resultsOf(c);
    if (rankedRows.length) {
        await ArenaEntry.bulkWrite(rankedRows.map((r) => ({
            updateOne: { filter: { _id: r.entry._id }, update: { $set: { score: r.score, correctCount: r.correctCount, timeMs: r.timeMs, rank: r.rank } } }
        })));
    }
    c.resultsPublishedAt = new Date();
    await c.save();
    award(c, rankedRows).catch((err) => console.error('[arena] awarding failed:', err.message));
    res.json({ competition: summary(c) });
}));

return router;
};

module.exports = arenaRoutes;
