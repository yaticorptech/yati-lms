/**
 * The signed-in student's resume profile: upload-and-parse, read, delete.
 *
 * A PDF or a photo/scan of the page — the parser reads both. The file never
 * touches disk or database: multer keeps it in memory, the parser reads it,
 * and it is gone when the request ends. What
 * persists is the structured extraction, one document per student, shown back
 * to them for review before anything uses it and deletable at will.
 */
const express = require('express');
const multer = require('multer');
const router = express.Router();

const ResumeProfile = require('../models/ResumeProfile');
const ApiUsage = require('../models/ApiUsage');
const { parseResume } = require('../services/resumeService');
const { isConnected } = require('../config/db');

// A student re-parsing in a loop is either fighting the parser or spending
// the shared allowance for sport; five a day is generous for both.
const PARSES_PER_DAY = 5;

// What the parser can read, keyed by the MIME type the browser reports. The
// extension is the fallback: some browsers send a bare octet-stream for a
// file they don't recognise, and a phone camera export is still a JPEG.
const ACCEPTED = {
    'application/pdf': 'application/pdf',
    'image/png': 'image/png',
    'image/jpeg': 'image/jpeg',
    'image/webp': 'image/webp'
};
const BY_EXTENSION = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp'
};

/** The MIME type to hand the parser, or null when the file is neither kind. */
const mimeFor = (file) => {
    if (ACCEPTED[file.mimetype]) return ACCEPTED[file.mimetype];
    const ext = String(file.originalname || '').toLowerCase().split('.').pop();
    return BY_EXTENSION[ext] || null;
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (mimeFor(file)) return cb(null, true);
        cb(new Error('Resumes must be a PDF or an image (PNG, JPG, WebP) — export your document and try again.'));
    }
});

const dayKey = (userId) => `resume:${userId}:${new Date().toISOString().slice(0, 10)}`;

/** GET /api/jobs/resume — the stored extraction, or null. */
router.get('/', async (req, res, next) => {
    try {
        if (!isConnected()) return res.json({ profile: null });
        const profile = await ResumeProfile.findOne({ userId: req.user._id }).lean();
        res.json({ profile });
    } catch (err) {
        next(err);
    }
});

/** POST /api/jobs/resume — multipart field "resume". Parses and stores. */
router.post('/', (req, res, next) => {
    upload.single('resume')(req, res, async (uploadErr) => {
        try {
            if (uploadErr) {
                const message = uploadErr.code === 'LIMIT_FILE_SIZE'
                    ? 'That file is over 5 MB — export a lighter file and try again.'
                    : uploadErr.message;
                return res.status(400).json({ error: message });
            }
            if (!req.file) return res.status(400).json({ error: 'Attach a resume — a PDF or an image of it.' });
            if (!isConnected()) return res.status(503).json({ error: 'Database unavailable.' });

            const key = dayKey(req.user._id);
            const day = await ApiUsage.findOne({ key }).lean();
            if ((day?.calls ?? 0) >= PARSES_PER_DAY) {
                return res.status(429).json({
                    error: `That's ${PARSES_PER_DAY} parses today — the daily limit. Try again tomorrow, or edit the skills by hand.`
                });
            }
            await ApiUsage.updateOne(
                { key },
                { $inc: { calls: 1 }, $setOnInsert: { provider: 'resume-user', month: new Date().toISOString().slice(0, 10) } },
                { upsert: true }
            );

            const extracted = await parseResume(req.file.buffer, req.file.originalname, mimeFor(req.file));

            const profile = await ResumeProfile.findOneAndUpdate(
                { userId: req.user._id },
                { $set: { ...extracted, userId: req.user._id, parsedAt: new Date() } },
                { upsert: true, returnDocument: 'after' }
            ).lean();

            res.json({ profile });
        } catch (err) {
            if (err.status) return res.status(err.status).json({ error: err.message });
            next(err);
        }
    });
});

/** DELETE /api/jobs/resume — the student withdraws their extraction. */
router.delete('/', async (req, res, next) => {
    try {
        await ResumeProfile.deleteOne({ userId: req.user._id });
        res.json({ ok: true });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
