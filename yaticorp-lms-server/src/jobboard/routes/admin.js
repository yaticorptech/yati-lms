/**
 * Administrator-only endpoints for the job board.
 *
 * Mounted ahead of the student guard in ../index.js, because an admin holds an
 * admin token and not a student one — the same arrangement Career Path uses.
 * Two things live here rather than on the student router:
 *
 *   • ingestion, which spends metered JSearch/Adzuna calls;
 *   • reporting, which reads across every student's searches.
 */
const express = require('express');
const router = express.Router();

const { protectAdmin } = require('../../middleware/authMiddleware');
const { isConnected } = require('../config/db');
const Job = require('../models/Job');
const Search = require('../models/Search');
const OpportunityProfile = require('../models/OpportunityProfile');
const Opportunity = require('../models/Opportunity');
const { OpportunityReport } = require('../models/OpportunityPreference');
const opportunityVocab = require('../data/opportunityVocab');
const { runIngest } = require('./jobs');
const { meteredUsage } = require('../services/providerService');
const { geminiInfo } = require('../services/geminiService');

router.use(protectAdmin);

/** POST /api/jobs/admin/ingest — refresh the index from all global sources. */
router.post('/ingest', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
        const result = await runIngest({ search: req.body?.search, location: req.body?.location });
        res.json(result);
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/jobs/admin/overview — how big the index is, what students are
 * searching for, and what the metered providers have cost this month.
 *
 * No student is named. The point of this page is which roles and places are in
 * demand, which is a question about the cohort, not about any one person.
 */
router.get('/overview', async (_req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [total, active, withCoords, searches, recentSearches, topRoles, topSkills, topPlaces] =
            await Promise.all([
                Job.countDocuments({}),
                Job.countDocuments({ active: true }),
                Job.countDocuments({ 'geo.coordinates.0': { $exists: true } }),
                Search.countDocuments({}),
                Search.countDocuments({ createdAt: { $gte: since } }),
                Search.aggregate([
                    { $match: { role: { $nin: ['', null] }, createdAt: { $gte: since } } },
                    { $group: { _id: '$role', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }, { $limit: 10 }
                ]),
                Search.aggregate([
                    { $match: { createdAt: { $gte: since } } },
                    { $unwind: '$skills' },
                    { $group: { _id: '$skills', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }, { $limit: 10 }
                ]),
                Search.aggregate([
                    { $match: { location: { $nin: ['', null] }, createdAt: { $gte: since } } },
                    { $group: { _id: '$location', count: { $sum: 1 } } },
                    { $sort: { count: -1 } }, { $limit: 10 }
                ])
            ]);

        const rows = (agg) => agg.map((r) => ({ name: r._id, count: r.count }));

        res.json({
            index: { total, active, withCoords },
            searches: { total: searches, last30Days: recentSearches },
            topRoles: rows(topRoles),
            topSkills: rows(topSkills),
            topPlaces: rows(topPlaces),
            providers: await meteredUsage(),
            gemini: geminiInfo()
        });
    } catch (err) {
        next(err);
    }
});

/* ── Local jobs: the admin's own listings ─────────────────────────────── */

const ADMIN_VOCAB = {
  categories: opportunityVocab.CATEGORIES,
  interests: opportunityVocab.CATEGORIES,   // an admin may tag delivery too
  hours: opportunityVocab.HOURS,
  types: opportunityVocab.TYPES,
  safety: opportunityVocab.SAFETY
};

/**
 * The fields an admin may set, cleaned. Anything not listed here (slug,
 * source, seedVersion) is the server's — a form cannot turn its row into a
 * seed row that the next version sweeps.
 */
const jobFromBody = (body = {}) => {
  const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
  const num = (v, fallback = null) => (v === '' || v == null ? fallback : Number(v));
  const day = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };
  const list = (v, ids) => [...new Set((Array.isArray(v) ? v : []).map(String))].filter((x) => ids.includes(x));
  return {
    title: str(body.title),
    organization: {
      name: str(body.organization?.name ?? body.organizationName),
      verified: !!(body.organization?.verified ?? body.verified),
      about: str(body.organization?.about ?? body.organizationAbout, 500)
    },
    description: str(body.description, 2000),
    category: str(body.category, 40),
    icon: str(body.icon, 8) || (opportunityVocab.CATEGORIES.find((c) => c.id === body.category)?.icon ?? '🌱'),
    interests: list(body.interests, opportunityVocab.CATEGORY_IDS),
    skills: [...new Set((Array.isArray(body.skills) ? body.skills : String(body.skills || '').split(',')).map((x) => String(x).trim()).filter(Boolean))].slice(0, 10),
    opportunityType: str(body.opportunityType, 40),
    location: { area: str(body.location?.area ?? body.area, 80), city: str(body.location?.city ?? body.city, 80), landmark: str(body.location?.landmark ?? body.landmark, 120) },
    startsAt: day(body.startsAt),
    endsAt: day(body.endsAt || body.startsAt),
    timeLabel: str(body.timeLabel, 60),
    hoursPerSession: str(body.hoursPerSession, 8) || '2-4',
    slots: Math.max(1, num(body.slots, 1) || 1),
    minimumAge: num(body.minimumAge, 18),
    maximumAge: num(body.maximumAge, null),
    compensation: { kind: ['paid', 'stipend', 'volunteer', 'free'].includes(body.compensation?.kind ?? body.compensationKind) ? (body.compensation?.kind ?? body.compensationKind) : 'paid', label: str(body.compensation?.label ?? body.compensationLabel, 80) },
    verified: !!(body.organization?.verified ?? body.verified),
    safetyClassification: str(body.safetyClassification, 20) || 'general',
    guardianApprovalRequired: body.guardianApprovalRequired == null ? true : !!body.guardianApprovalRequired,
    supervision: str(body.supervision, 300),
    safetyNotes: str(body.safetyNotes, 500),
    contact: { email: str(body.contact?.email ?? body.contactEmail, 120), phone: str(body.contact?.phone ?? body.contactPhone, 40) },
    status: body.status === 'closed' ? 'closed' : 'open'
  };
};

const validateJob = (job) => {
  if (!job.title) return 'A title is required.';
  if (!job.organization.name) return 'The organisation name is required.';
  if (!opportunityVocab.CATEGORY_IDS.includes(job.category)) return 'Pick a category.';
  if (!opportunityVocab.TYPE_IDS.includes(job.opportunityType)) return 'Pick a job type.';
  if (!job.startsAt || !job.endsAt) return 'Set the date the job runs on.';
  if (job.endsAt < job.startsAt) return 'The end date is before the start date.';
  if (!Number.isFinite(job.minimumAge) || job.minimumAge < 0) return 'Set a minimum age.';
  if (job.maximumAge != null && (!Number.isFinite(job.maximumAge) || job.maximumAge < job.minimumAge)) return 'Maximum age must be at or above the minimum.';
  if (!opportunityVocab.SAFETY_IDS.includes(job.safetyClassification)) return 'Pick a safety classification.';
  if (!opportunityVocab.HOUR_IDS.includes(job.hoursPerSession)) return 'Pick the hours per session.';
  if (job.minimumAge < 18 && job.safetyClassification !== 'youth-safe' && job.safetyClassification !== 'supervised') {
    return 'A job open to under-18s must be classed youth-safe or supervised.';
  }
  if (job.minimumAge < 14) return 'Jobs cannot be open to anyone under 14.';
  return '';
};

/** GET /admin/opportunities — every local job, soonest first, with the vocab. */
router.get('/opportunities', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json({ jobs: [], vocab: ADMIN_VOCAB });
    const jobs = await Opportunity.find({}).sort({ startsAt: 1 }).lean();
    res.json({ jobs: jobs.map((j) => ({ ...j, id: String(j._id) })), vocab: ADMIN_VOCAB });
  } catch (err) {
    next(err);
  }
});

/** POST /admin/opportunities — a new job, shown to students on its dates. */
router.post('/opportunities', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
    const job = jobFromBody(req.body);
    const problem = validateJob(job);
    if (problem) return res.status(400).json({ error: problem });
    const created = await Opportunity.create({ ...job, slug: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, source: 'admin', postedAt: new Date() });
    res.status(201).json({ job: { ...created.toObject(), id: String(created._id) } });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

/** PUT /admin/opportunities/:id — edit any job, seed rows included. */
router.put('/opportunities/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
    const job = jobFromBody(req.body);
    const problem = validateJob(job);
    if (problem) return res.status(400).json({ error: problem });
    // An edited seed row becomes the admin's: the next seed version must not
    // sweep away a correction someone made by hand.
    const updated = await Opportunity.findByIdAndUpdate(req.params.id, { $set: { ...job, source: 'admin' } }, { returnDocument: 'after', runValidators: true }).lean();
    if (!updated) return res.status(404).json({ error: 'No such job.' });
    res.json({ job: { ...updated, id: String(updated._id) } });
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

/** DELETE /admin/opportunities/:id */
router.delete('/opportunities/:id', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
    const gone = await Opportunity.findByIdAndDelete(req.params.id).lean();
    if (!gone) return res.status(404).json({ error: 'No such job.' });
    res.json({ ok: true });
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

/* ── Opportunities: guardian decisions and safety reports ─────────────── */

/**
 * PATCH /admin/opportunities/guardian/:userId { status, note }
 *
 * The guardian decision is recorded here, by an operator, on the guardian's
 * word — never from the student's own session. A rejection carries a note so
 * the student sees a reason rather than a closed door.
 */
router.patch('/opportunities/guardian/:userId', async (req, res, next) => {
  try {
    if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });
    const status = String(req.body?.status || '');
    if (!['approved', 'rejected', 'none'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved, rejected or none.' });
    }
    const profile = await OpportunityProfile.findOneAndUpdate(
      { userId: req.params.userId },
      { $set: { 'guardian.status': status, 'guardian.decidedAt': status === 'none' ? null : new Date(), 'guardian.note': String(req.body?.note || '').slice(0, 300) } },
      { returnDocument: 'after' }
    ).lean();
    if (!profile) return res.status(404).json({ error: 'No opportunity profile for that student.' });
    res.json({ guardian: profile.guardian });
  } catch (err) {
    next(err);
  }
});

/** GET /admin/opportunities/reports — open safety reports, newest first. */
router.get('/opportunities/reports', async (req, res, next) => {
  try {
    if (!isConnected()) return res.json({ reports: [] });
    const status = ['open', 'reviewed', 'actioned'].includes(req.query.status) ? req.query.status : 'open';
    const reports = await OpportunityReport.find({ status }).sort({ createdAt: -1 }).limit(200).lean();
    res.json({ reports });
  } catch (err) {
    next(err);
  }
});

/** PATCH /admin/opportunities/reports/:id { status } */
router.patch('/opportunities/reports/:id', async (req, res, next) => {
  try {
    const status = String(req.body?.status || '');
    if (!['open', 'reviewed', 'actioned'].includes(status)) return res.status(400).json({ error: 'Bad status.' });
    const report = await OpportunityReport.findByIdAndUpdate(req.params.id, { $set: { status } }, { returnDocument: 'after' }).lean();
    if (!report) return res.status(404).json({ error: 'No such report.' });
    res.json({ report });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
