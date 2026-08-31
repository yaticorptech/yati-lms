/**
 * The signed-in student's own job alerts.
 *
 * Same three verbs the Career Path notification feed exposes, because the
 * student app's bell drives both the same way: list, mark one read, clear all.
 * Mounted inside the student half of the module, so the lock and protectUser
 * both stand in front of it.
 */
const express = require('express');
const router = express.Router();

const Notification = require('../models/Notification');
const { isConnected } = require('../config/db');

/** GET /api/jobs/notifications — newest first. */
router.get('/', async (req, res, next) => {
    try {
        if (!isConnected()) return res.json([]);
        const rows = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        res.json(rows);
    } catch (err) {
        next(err);
    }
});

/** PUT /api/jobs/notifications/:id/read */
router.put('/:id/read', async (req, res, next) => {
    try {
        // Scoped to the owner — an id alone must never mark someone else's.
        await Notification.updateOne(
            { _id: req.params.id, userId: req.user._id },
            { $set: { isRead: true } }
        );
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

/** DELETE /api/jobs/notifications — clear the student's whole feed. */
router.delete('/', async (req, res, next) => {
    try {
        await Notification.deleteMany({ userId: req.user._id });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
