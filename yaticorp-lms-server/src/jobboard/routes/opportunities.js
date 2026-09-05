/**
 * Local Jobs — age-aware, date-matched local work for every kind of student
 * the LMS has, mounted at /api/jobs/opportunities.
 *
 * Every read goes through the same three steps: load the student's profile,
 * derive their age band, and hand the pool to the recommender, which refuses
 * anything the band may not see before it scores anything. There is no
 * endpoint that returns a job without that check — including the details
 * page, so a link shared between classmates of different ages opens for one
 * and not the other.
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Opportunity = require('../models/Opportunity');
const OpportunityProfile = require('../models/OpportunityProfile');
const { OpportunityPreference, OpportunityView, OpportunityReport } = require('../models/OpportunityPreference');
const { isConnected } = require('../config/db');
const vocab = require('../data/opportunityVocab');
const { SEED_VERSION, rows: seedRows } = require('../data/seedOpportunities');
const { ageFrom, bandFor, check, clientRules, publicView } = require('../services/eligibilityRules');
const JobVerification = require('../models/JobVerification');
const { normaliseIndianMobile } = require('../../services/smsService');
const { recommend, scoreOne } = require('../services/opportunityRecommender');

const CLIENT_VOCAB = {
    categories: vocab.CATEGORIES,
    interests: vocab.INTERESTS,
    hours: vocab.HOURS,
    types: vocab.TYPES,
    safety: vocab.SAFETY
};

/* The starter rows go in on first use. Keyed on SEED_VERSION: rows from an
   older seed are swept and the current ones written, admin rows are never
   touched, and a restart never duplicates anything. */
let seeded = false;
const ensureSeeded = async () => {
    if (seeded) return;
    const stale = await Opportunity.countDocuments({ source: 'seed', seedVersion: { $ne: SEED_VERSION } });
    const current = await Opportunity.countDocuments({ source: 'seed', seedVersion: SEED_VERSION });
    if (stale || !current) {
        await Opportunity.deleteMany({ source: 'seed', seedVersion: { $ne: SEED_VERSION } });
        await Opportunity.bulkWrite(seedRows.map((row) => ({
            updateOne: { filter: { slug: row.slug }, update: { $setOnInsert: row }, upsert: true }
        })));
        console.log(`[opportunities] Seeded ${seedRows.length} local jobs (v${SEED_VERSION}).`);
    }
    seeded = true;
};

const validId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Everything the recommender needs to know about the caller, in one read. */
const loadContext = async (userId) => {
    const [profile, prefs] = await Promise.all([
        OpportunityProfile.findOne({ userId }).lean(),
        OpportunityPreference.find({ userId }).lean()
    ]);
    const age = ageFrom(profile?.dateOfBirth);
    const band = bandFor(age);
    return {
        profile,
        age,
        band,
        likes: prefs.filter((p) => p.verdict === 'interested'),
        dislikes: prefs.filter((p) => p.verdict === 'not_interested'),
        prefs
    };
};

const guardianFor = (profile, band) => {
    if (!band) return null;
    if (!band.guardianApproval) return { status: 'not-required' };
    const g = profile?.guardian || {};
    return { status: g.status === 'not-required' ? 'none' : (g.status || 'none'), requestedAt: g.requestedAt, decidedAt: g.decidedAt, note: g.note, guardianName: g.guardianName };
};

const shape = (row, ctx) => ({
    ...publicView(row.opp, ctx.band),
    matchScore: row.score,
    matchReasons: row.reasons,
    signals: row.signals,
    preference: ctx.prefs.find((p) => String(p.opportunityId) === String(row.opp._id))?.verdict || null
});

const profileOut = (profile, age) => profile && ({
    dateOfBirth: profile.dateOfBirth,
    guardianPhone: profile.guardian?.phone || '',
    wantFrom: profile.wantFrom,
    wantTo: profile.wantTo,
    interests: profile.interests,
    completedAt: profile.completedAt,
    age
});

/* ── Profile ─────────────────────────────────────────────────────────── */

/** GET /profile — the student's profile, band, rules and the vocab. */
router.get('/profile', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        const ctx = await loadContext(req.user._id);
        res.json({
            profile: profileOut(ctx.profile, ctx.age),
            band: ctx.band?.id || null,
            rules: clientRules(ctx.band),
            guardian: guardianFor(ctx.profile, ctx.band),
            vocab: CLIENT_VOCAB
        });
    } catch (err) {
        next(err);
    }
});

const parseDay = (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

/** PUT /profile — three answers: date of birth, the dates wanted, interests. */
router.put('/profile', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        const body = req.body ?? {};

        // The date of birth is no longer asked for here. It comes from the
        // Jobs verification the student completed on the way in, or from the
        // profile they saved earlier; the form itself only sends the rest.
        const existing = await OpportunityProfile.findOne({ userId: req.user._id }).select('guardian dateOfBirth').lean();
        let dob = parseDay(body.dateOfBirth) || existing?.dateOfBirth || null;
        if (!dob) {
            const verified = await JobVerification.findOne({ userId: req.user._id }).select('dateOfBirth').lean();
            dob = verified?.dateOfBirth || null;
        }
        const age = ageFrom(dob);
        if (age == null || age < 5 || age > 100) {
            return res.status(400).json({ error: 'Complete the Jobs verification first — your date of birth comes from there.' });
        }
        const guardianPhone = body.guardianPhone ? normaliseIndianMobile(body.guardianPhone) : '';
        if (body.guardianPhone && !guardianPhone) return res.status(400).json({ error: 'Enter a 10-digit Indian mobile number for your parent.' });
        const wantFrom = parseDay(body.wantFrom);
        const wantTo = parseDay(body.wantTo || body.wantFrom);
        if (!wantFrom || !wantTo) return res.status(400).json({ error: 'Pick the date, or dates, you want work on.' });
        if (wantTo < wantFrom) return res.status(400).json({ error: 'The end date is before the start date.' });
        const interests = [...new Set((Array.isArray(body.interests) ? body.interests : []).map(String))]
            .filter((x) => vocab.INTEREST_IDS.includes(x)).slice(0, 40);
        if (!interests.length) return res.status(400).json({ error: 'Pick at least one interest.' });

        const band = bandFor(age);
        if (band.guardianApproval && !guardianPhone) return res.status(400).json({ error: "Add your parent's phone number — a guardian has to approve work for your age." });
        const update = {
            dateOfBirth: dob, wantFrom, wantTo, interests, completedAt: new Date(),
            // Guardian state follows the band: an adult has nothing to approve,
            // and a teen keeps whatever the request had reached.
            guardian: {
                ...(band.guardianApproval
                    ? (existing?.guardian?.status && existing.guardian.status !== 'not-required' ? existing.guardian : { status: 'none' })
                    : { status: 'not-required' }),
                phone: guardianPhone
            }
        };

        const profile = await OpportunityProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $set: update, $setOnInsert: { userId: req.user._id } },
            { upsert: true, returnDocument: 'after', runValidators: true }
        ).lean();

        res.json({ profile: profileOut(profile, age), band: band.id, rules: clientRules(band), guardian: guardianFor(profile, band) });
    } catch (err) {
        if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
        next(err);
    }
});

/* ── Guardian approval ───────────────────────────────────────────────── */

/**
 * POST /guardian/request — a minor asks for guardian approval. The record
 * moves to "pending"; the decision is made outside the student's account
 * (an administrator, on the guardian's word) and never by the student.
 */
router.post('/guardian/request', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        const ctx = await loadContext(req.user._id);
        if (!ctx.profile) return res.status(400).json({ error: 'Set up your profile first.' });
        if (!ctx.band?.guardianApproval) return res.status(400).json({ error: 'Guardian approval is not needed for your age group.' });
        if (ctx.profile.guardian?.status === 'approved') return res.json({ guardian: guardianFor(ctx.profile, ctx.band) });

        const guardianName = String(req.body?.guardianName || '').trim().slice(0, 80);
        if (!guardianName) return res.status(400).json({ error: 'Tell us your parent or guardian\'s name.' });

        const profile = await OpportunityProfile.findOneAndUpdate(
            { userId: req.user._id },
            { $set: { 'guardian.status': 'pending', 'guardian.guardianName': guardianName, 'guardian.requestedAt': new Date(), 'guardian.decidedAt': null, 'guardian.note': '' } },
            { returnDocument: 'after' }
        ).lean();
        res.json({ guardian: guardianFor(profile, ctx.band) });
    } catch (err) {
        next(err);
    }
});

/* ── Listings ────────────────────────────────────────────────────────── */

const filtersFrom = (query, band) => {
    const f = {
        q: String(query.q || '').trim().slice(0, 80),
        category: vocab.CATEGORY_IDS.includes(query.category) ? query.category : '',
        type: vocab.TYPE_IDS.includes(query.type) ? query.type : '',
        interest: vocab.INTEREST_IDS.includes(query.interest) ? query.interest : '',
        verifiedOnly: query.verified === '1',
        anyDate: query.dates === 'any'
    };
    // A minor's filters can never widen what the band allows: a hidden
    // category or a type the band refuses is dropped, not honoured.
    if (band?.hiddenCategories.includes(f.category)) f.category = '';
    if (band?.allowedTypes && f.type && !band.allowedTypes.includes(f.type)) f.type = '';
    return f;
};

/* ── The merged list ──────────────────────────────────────────────────────

   One list, two sources. The LMS's own local jobs (put in by the admin, with
   real dates) and open part-time roles near the student from Google Jobs.
   Both are filed under the same categories, and both come back in one array
   so the tab can lay them out by date: the student's own free time first,
   then the rest of that month, day by day.

   A web listing has no working date — it is a vacancy, open until it is
   filled — so it carries `anyDay` and sits with the student's own dates,
   which is the first thing they are looking at.
------------------------------------------------------------------------- */

/** End of the calendar month that contains `d`, at the last millisecond. */
const endOfMonth = (d) => {
    const x = new Date(d);
    return new Date(x.getFullYear(), x.getMonth() + 1, 0, 23, 59, 59, 999);
};

const webShape = (job, category) => ({
    kind: 'web',
    id: job.id,
    title: job.title,
    organization: { name: job.company || 'Employer', verified: false, logo: job.logo || '' },
    description: job.description || '',
    highlights: job.highlights || [],
    category,
    icon: (vocab.CATEGORIES.find((c) => c.id === category) || {}).icon || '🌐',
    opportunityType: 'part-time',
    typeLabel: job.typeLabel || 'Part-time',
    location: { area: '', city: job.location || '', landmark: '' },
    timeLabel: '',
    compensation: job.salary ? { kind: 'paid', label: job.salary } : null,
    remote: !!job.remote,
    wider: !!job.wider,
    daysAgo: job.daysAgo,
    publisher: job.publisher || '',
    url: job.url,
    source: 'Google Jobs',
    anyDay: true
});

/** GET / — the student's month, both sources, ready to group by date. */
router.get('/', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        await ensureSeeded();
        const ctx = await loadContext(req.user._id);
        if (!ctx.profile || !ctx.band) {
            return res.json({ needsProfile: true, band: null, rules: null, results: [], categories: [], excluded: null, otherDates: 0 });
        }

        const filters = filtersFrom(req.query, ctx.band);
        const pool = await Opportunity.find({ status: 'open' }).lean();

        // Everything the student may see on any date, filters applied. The
        // date is then a matter of grouping rather than of exclusion — the
        // list runs from their own dates into the rest of the month.
        const all = recommend(pool, ctx, { ...filters, anyDate: true });
        const windowFrom = new Date(ctx.profile.wantFrom);
        const windowTo = new Date(ctx.profile.wantTo);
        const monthEnd = endOfMonth(windowTo);
        const inWindow = (o) => new Date(o.startsAt) <= windowTo && new Date(o.endsAt) >= windowFrom;

        const local = [];
        let laterThanMonth = 0;
        for (const row of all.results) {
            const onYourDates = inWindow(row.opp);
            // Beyond this month is a different question — counted, not listed,
            // unless the student asks to see every upcoming date.
            if (!onYourDates && !filters.anyDate && new Date(row.opp.startsAt) > monthEnd) { laterThanMonth += 1; continue; }
            local.push({ ...shape(row, ctx), kind: 'local', onYourDates });
        }

        // Google Jobs, for the bands allowed on the open web and only once a
        // place is known. Never fatal: the local list is the section's spine.
        let web = [];
        let webPlace = null;
        let webNotice = '';
        let webWidened = '';
        const webAllowed = ctx.band.id !== 'explore' && ctx.band.id !== 'teen';
        const location = String(req.query.location || '').trim();
        if (webAllowed && location) {
            try {
                const { partTimeNear, categoryFor } = require('../services/partTimeWebService');
                const out = await partTimeNear(location, { refresh: req.query.refresh === '1' });
                webPlace = out.place;
                webNotice = out.unavailable || '';
                webWidened = out.widened || '';
                web = (out.results || []).map((j) => webShape(j, categoryFor(j)));
            } catch (err) {
                webNotice = err.message || 'Could not reach Google Jobs right now.';
            }
        }
        // The same filters the local rows went through, so a category chip or
        // a search word means one thing across both sources.
        const q = String(req.query.q || '').trim().toLowerCase();
        if (filters.category) web = web.filter((w) => w.category === filters.category);
        if (filters.type && filters.type !== 'part-time') web = [];
        if (q) web = web.filter((w) => `${w.title} ${w.organization.name} ${w.location.city} ${w.description}`.toLowerCase().includes(q));
        if (filters.verifiedOnly) web = [];

        const results = [...local, ...web];
        const onDates = results.filter((r) => r.kind === 'web' || r.onYourDates).length;

        // Category counts over everything the band may see, before the
        // student's own filters — so a chip's number is what tapping it shows.
        const eligible = recommend(pool, ctx, { anyDate: true }).results;
        const counts = new Map();
        for (const r of eligible) counts.set(r.opp.category, (counts.get(r.opp.category) || 0) + 1);
        const categories = vocab.CATEGORIES
            .filter((c) => !ctx.band.hiddenCategories.includes(c.id))
            .map((c) => ({ ...c, count: counts.get(c.id) || 0 }));

        res.json({
            needsProfile: false,
            band: ctx.band.id,
            rules: clientRules(ctx.band),
            guardian: guardianFor(ctx.profile, ctx.band),
            window: { from: ctx.profile.wantFrom, to: ctx.profile.wantTo },
            monthEnd,
            total: onDates,
            monthTotal: results.length,
            results,
            web: { allowed: webAllowed, place: webPlace, notice: webNotice, widened: webWidened, count: web.length },
            // Eligible jobs beyond this month, so the empty state can offer them.
            otherDates: laterThanMonth,
            categories,
            excluded: all.excluded,
            poolSize: pool.length
        });
    } catch (err) {
        next(err);
    }
});

/** GET /interested — everything the student marked ♡, newest first. */
router.get('/interested', async (req, res, next) => {
    try {
        if (!isConnected()) return res.json({ results: [] });
        const ctx = await loadContext(req.user._id);
        if (!ctx.band) return res.json({ results: [] });
        const ids = ctx.likes.map((p) => p.opportunityId);
        const rows = await Opportunity.find({ _id: { $in: ids } }).lean();
        const order = new Map(ctx.likes.map((p, i) => [String(p.opportunityId), i]));
        const results = rows
            .filter((o) => check(o, ctx).ok)
            .sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)))
            .map((o) => shape({ opp: o, ...scoreOne(o, ctx) }, ctx));
        res.json({ results });
    } catch (err) {
        next(err);
    }
});

/** GET /recent — recently viewed, still-eligible, newest view first. */
router.get('/recent', async (req, res, next) => {
    try {
        if (!isConnected()) return res.json({ results: [] });
        const ctx = await loadContext(req.user._id);
        if (!ctx.band) return res.json({ results: [] });
        const views = await OpportunityView.find({ userId: req.user._id }).sort({ viewedAt: -1 }).limit(8).lean();
        const rows = await Opportunity.find({ _id: { $in: views.map((v) => v.opportunityId) } }).lean();
        const order = new Map(views.map((v, i) => [String(v.opportunityId), i]));
        const results = rows
            .filter((o) => check(o, ctx).ok)
            .sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)))
            .map((o) => shape({ opp: o, ...scoreOne(o, ctx) }, ctx));
        res.json({ results });
    } catch (err) {
        next(err);
    }
});

/** GET /:id — details. Refused, not hidden, when the band may not see it. */
/** GET /web?location=&refresh= — part-time listings from Google Jobs near a
 *  place, for students the band allows onto the open web. */
router.get('/web', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        const ctx = await loadContext(req.user._id);
        if (!ctx.profile || !ctx.band) return res.json({ needsProfile: true, minor: false, results: [] });
        // The open web is not age-checked; the local index is the minor's board.
        if (ctx.band.id === 'explore' || ctx.band.id === 'teen') {
            return res.json({ minor: true, results: [], window: { from: ctx.profile.wantFrom, to: ctx.profile.wantTo } });
        }
        const location = String(req.query.location || '').trim();
        if (!location) return res.status(400).json({ error: 'Tell us your town or city first.' });
        const { partTimeNear } = require('../services/partTimeWebService');
        const out = await partTimeNear(location, { refresh: req.query.refresh === '1' });
        res.json({ minor: false, window: { from: ctx.profile.wantFrom, to: ctx.profile.wantTo }, ...out });
    } catch (err) {
        if (err.status) return res.status(err.status).json({ error: err.message });
        next(err);
    }
});

router.get('/:id', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        if (!validId(req.params.id)) return res.status(404).json({ error: 'No such job.' });
        const ctx = await loadContext(req.user._id);
        if (!ctx.band) return res.status(403).json({ code: 'NEEDS_PROFILE', error: 'Set up your profile to view local jobs.' });

        const opp = await Opportunity.findById(req.params.id).lean();
        if (!opp) return res.status(404).json({ error: 'No such job.' });
        const gate = check(opp, ctx);
        if (!gate.ok) {
            return res.status(403).json({
                code: 'NOT_ELIGIBLE',
                error: gate.rule === 'age' ? 'This job is not open to your age group.'
                    : gate.rule === 'closed' ? 'This job has closed.'
                        : 'This job is not available for your age group.'
            });
        }

        await OpportunityView.updateOne(
            { userId: req.user._id, opportunityId: opp._id },
            { $set: { viewedAt: new Date() } },
            { upsert: true }
        );

        res.json({
            opportunity: shape({ opp, ...scoreOne(opp, ctx) }, ctx),
            rules: clientRules(ctx.band),
            guardian: guardianFor(ctx.profile, ctx.band)
        });
    } catch (err) {
        next(err);
    }
});

/** POST /:id/preference { verdict: interested | not_interested | clear } */
router.post('/:id/preference', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        if (!validId(req.params.id)) return res.status(404).json({ error: 'No such job.' });
        const verdict = String(req.body?.verdict || '');
        if (!['interested', 'not_interested', 'clear'].includes(verdict)) {
            return res.status(400).json({ error: 'verdict must be interested, not_interested or clear.' });
        }
        const ctx = await loadContext(req.user._id);
        const opp = await Opportunity.findById(req.params.id).lean();
        if (!opp) return res.status(404).json({ error: 'No such job.' });
        // A preference on something the student may not see would let a
        // crafted request teach the recommender about hidden listings.
        if (!check(opp, ctx).ok) return res.status(403).json({ error: 'This job is not available for your age group.' });

        if (verdict === 'clear') {
            await OpportunityPreference.deleteOne({ userId: req.user._id, opportunityId: opp._id });
            return res.json({ verdict: null });
        }
        await OpportunityPreference.updateOne(
            { userId: req.user._id, opportunityId: opp._id },
            { $set: { verdict, category: opp.category, interests: opp.interests, skills: opp.skills, opportunityType: opp.opportunityType, createdAt: new Date() } },
            { upsert: true }
        );
        res.json({ verdict });
    } catch (err) {
        next(err);
    }
});

/** POST /:id/report { target, reason, details } */
router.post('/:id/report', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        if (!validId(req.params.id)) return res.status(404).json({ error: 'No such job.' });
        const target = req.body?.target === 'organization' ? 'organization' : 'opportunity';
        const reason = String(req.body?.reason || '').trim().slice(0, 120);
        const details = String(req.body?.details || '').trim().slice(0, 2000);
        if (!reason) return res.status(400).json({ error: 'Pick a reason for the report.' });
        const exists = await Opportunity.exists({ _id: req.params.id });
        if (!exists) return res.status(404).json({ error: 'No such job.' });
        await OpportunityReport.create({ userId: req.user._id, opportunityId: req.params.id, target, reason, details });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
