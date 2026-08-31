/**
 * The signed-in student's bookmarked listings.
 *
 * Saving takes a jobId and copies the listing server-side — the snapshot is
 * read from the index, never trusted from the request body, so a bookmark
 * always reflects what the board actually held. Everything here is scoped to
 * req.user; an id alone never reaches another student's list.
 */
const express = require('express');
const router = express.Router();

const Job = require('../models/Job');
const SavedJob = require('../models/SavedJob');
const { isConnected } = require('../config/db');

/** GET /api/jobs/saved — newest first, flagged with whether each still exists. */
router.get('/', async (req, res, next) => {
    try {
        if (!isConnected()) return res.json({ saved: [] });

        const rows = await SavedJob.find({ userId: req.user._id })
            .sort({ savedAt: -1 })
            .limit(200)
            .lean();

        // Which of these the index still carries as live. A retired listing
        // stays in the list — the student saved it, it is theirs — but the
        // card can say the posting may be gone.
        const liveIds = new Set(
            (await Job.find({ _id: { $in: rows.map((r) => r.jobId) }, active: true })
                .select('_id').lean()).map((j) => j._id.toString())
        );

        res.json({
            saved: rows.map((r) => ({
                id: r.jobId,
                title: r.title,
                company: r.company,
                companyUrl: r.companyUrl,
                companyLocation: r.companyLocation,
                location: r.location,
                remote: r.remote,
                type: r.type,
                salary: r.salary,
                url: r.url,
                source: r.source,
                daysAgo: r.postedAt
                    ? Math.max(0, Math.round((Date.now() - new Date(r.postedAt).getTime()) / 86400000))
                    : null,
                savedAt: r.savedAt,
                active: liveIds.has(r.jobId),
                // The card renders without scores in the saved view — a match
                // percentage belongs to a search, not to a bookmark.
                match: null
            }))
        });
    } catch (err) {
        next(err);
    }
});

/** POST /api/jobs/saved — body { jobId }. Idempotent. */
router.post('/', async (req, res, next) => {
    try {
        if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });

        const jobId = String(req.body?.jobId ?? '').trim();
        if (!jobId) return res.status(400).json({ error: 'A jobId is required.' });

        const job = await Job.findById(jobId).lean();
        if (!job) return res.status(404).json({ error: 'That listing is no longer in the index.' });

        await SavedJob.updateOne(
            { userId: req.user._id, jobId },
            {
                $setOnInsert: {
                    externalId: job.externalId || '',
                    title: job.title,
                    company: job.company || '',
                    companyUrl: job.companyUrl || '',
                    companyLocation: job.companyLocation || '',
                    location: job.location || [job.city, job.country].filter(Boolean).join(', '),
                    remote: !!job.remote,
                    type: job.type || 'Unknown',
                    salary: job.salary || '',
                    url: job.url,
                    source: job.source || '',
                    postedAt: job.postedAt || null,
                    savedAt: new Date()
                }
            },
            { upsert: true }
        );
        res.json({ ok: true });
    } catch (err) {
        // A raced double-save collides on the unique index; that is a success.
        if (err.code === 11000) return res.json({ ok: true });
        next(err);
    }
});

/** DELETE /api/jobs/saved/:jobId */
router.delete('/:jobId', async (req, res, next) => {
    try {
        await SavedJob.deleteOne({ userId: req.user._id, jobId: req.params.jobId });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
