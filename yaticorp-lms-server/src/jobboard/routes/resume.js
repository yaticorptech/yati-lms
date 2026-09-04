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
const { localParse } = require('../services/localResumeParse');
const { normalizeSkillList } = require('../services/matchService');
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

            // Read it twice: locally first (instant, offline, vocabulary
            // match), then with the AI reader, which adds roles, education
            // and seniority when it answers. If the AI reader is unavailable
            // and the local reader found nothing either, that is the error
            // the student sees; a PDF with recognisable skills always lands.
            const mime = mimeFor(req.file);
            const userId = req.user._id;
            const parsedAt = new Date();
            const local = localParse(req.file.buffer, mime);
            const filename = String(req.file.originalname || 'resume.pdf').slice(0, 120);

            // The AI reader gets a few seconds inline. If it is still going,
            // the student gets the local reading now and the AI reading is
            // folded in when it lands (the Jobs page polls while "parsing").
            // Only when neither reader can produce anything is the upload
            // refused — an image with the AI reader unreachable, typically.
            const job = parseResume(req.file.buffer, req.file.originalname, mime);
            const settled = await Promise.race([
                job.then((extracted) => ({ extracted })).catch((err) => ({ err })),
                new Promise((r) => setTimeout(() => r('timeout'), 10_000))
            ]);

            if (settled !== 'timeout' && settled.err && !(local?.skills?.length)) throw settled.err;

            const extracted = settled !== 'timeout' ? settled.extracted : null;
            const merged = extracted
                ? { ...extracted, skills: normalizeSkillList([...(extracted.skills || []), ...(local?.skills || [])]), parseStatus: 'parsed' }
                : { skills: local?.skills || [], skillsRaw: local?.skillsRaw || [], experienceYears: local?.experienceYears || 0, filename, parseStatus: settled === 'timeout' ? 'parsing' : 'stored' };

            const profile = await ResumeProfile.findOneAndUpdate(
                { userId },
                { $set: { ...merged, userId, parsedAt } },
                { upsert: true, returnDocument: 'after' }
            ).lean();

            if (settled === 'timeout') {
                job.then(async (late) => {
                    const skills = normalizeSkillList([...(late.skills || []), ...(local?.skills || [])]);
                    await ResumeProfile.updateOne({ userId, parsedAt }, { $set: { ...late, skills, parseStatus: 'parsed' } });
                }).catch(async (err) => {
                    console.warn('[jobs] resume read skipped:', err.message);
                    await ResumeProfile.updateOne({ userId, parsedAt }, { $set: { parseStatus: 'stored' } }).catch(() => {});
                });
            }

            res.json({ profile, aiRead: !!extracted, parsing: settled === 'timeout' });
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
