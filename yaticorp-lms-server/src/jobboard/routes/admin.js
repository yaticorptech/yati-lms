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

module.exports = router;
