/**
 * Linguistic Ability — administrators' routes, /api/linguistic/admin, for any
 * platform admin (protectAdmin: superadmin or admin), the role that manages
 * courses today. College coordinators have their own, narrower routes
 * (orgRoutes.js). Students can reach none of these.
 *
 *   GET    /overview                      lesson counts, students, reviews waiting
 *   GET    /lessons?module&level          lessons, drafts included
 *   GET    /lessons/:id                   one lesson with its answers
 *   POST   /lessons                       create (validate.js)
 *   PUT    /lessons/:id                   edit
 *   PATCH  /lessons/:id/status            { status: 'published' | 'draft' }
 *   DELETE /lessons/:id                   delete (kept hidden; see models.js)
 *   POST   /audio                         upload an audio file → { url }
 *   GET    /config · PUT /config          passing scores, certificate average, daily challenge size
 *   GET    /students · GET /students/:id  progress, quiz results, lessons completed
 *   GET    /submissions · PUT /submissions/:id   writing and translations to review
 */
const express = require('express');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const { protectAdmin } = require('../middleware/authMiddleware');
const { LinguisticLesson, LinguisticProgress, LinguisticSubmission, MODULES, LEVELS } = require('./models');
const { validateLesson } = require('./validate');
const { getConfig, updateConfig } = require('./config');
const { ensureSeeded } = require('./seed');
const reports = require('./reports');

const router = express.Router();
router.use(protectAdmin);
router.use(async (_req, _res, next) => { await ensureSeeded(); next(); });

const idOf = (x) => String(x?._id ?? x);
const reviewer = (req) => ({ id: idOf(req.admin._id), name: req.admin.name || 'Admin', role: req.admin.role });
const counts = (l) => ({ words: l.words?.length || 0, practice: l.practice?.length || 0, quiz: l.quiz?.length || 0, writing: l.writing?.length || 0, items: l.items?.length || 0, lines: l.learn?.dialogue?.lines?.length || 0 });
const summary = (l) => ({ id: idOf(l._id), module: l.module, level: l.level, order: l.order, title: l.title, summary: l.summary, status: l.status, direction: l.direction || null, seeded: !!l.seedKey, counts: counts(l), updatedAt: l.updatedAt, updatedBy: l.updatedBy || '' });

router.get('/overview', async (_req, res, next) => {
    try {
        const [lessons, students, pending] = await Promise.all([
            LinguisticLesson.find({ deletedAt: null, course: null, review: null }).select('module level status').lean(),
            LinguisticProgress.countDocuments({}),
            LinguisticSubmission.countDocuments({ status: 'pending' })
        ]);
        const grid = Object.fromEntries(MODULES.map((m) => [m, Object.fromEntries(LEVELS.map((l) => [l, { published: 0, draft: 0 }]))]));
        for (const l of lessons) grid[l.module][l.level][l.status === 'published' ? 'published' : 'draft']++;
        res.json({ grid, lessons: lessons.length, students, pendingReviews: pending });
    } catch (err) { next(err); }
});

router.get('/lessons', async (req, res, next) => {
    try {
        const filter = { deletedAt: null, course: null, review: null };
        if (MODULES.includes(req.query.module)) filter.module = req.query.module;
        if (LEVELS.includes(req.query.level)) filter.level = req.query.level;
        const rows = await LinguisticLesson.find(filter).sort({ module: 1, level: 1, order: 1, createdAt: 1 }).lean();
        rows.sort((a, b) => MODULES.indexOf(a.module) - MODULES.indexOf(b.module) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.order - b.order);
        res.json({ lessons: rows.map(summary) });
    } catch (err) { next(err); }
});

// The English course's lessons: the other languages' courses are made from them (courses.js), not edited.
const own = (id) => (mongoose.isValidObjectId(id) ? LinguisticLesson.findOne({ _id: id, deletedAt: null, course: null, review: null }) : null);

router.get('/lessons/:id', async (req, res, next) => {
    try {
        const l = await own(req.params.id);
        if (!l) return res.status(404).json({ message: 'That lesson was not found.' });
        const o = l.toObject();
        res.json({ ...o, id: idOf(o._id), seeded: !!o.seedKey });
    } catch (err) { next(err); }
});

router.post('/lessons', async (req, res, next) => {
    try {
        const { value, errors } = validateLesson(req.body || {});
        if (errors.length) return res.status(400).json({ message: errors[0], errors });
        const l = await LinguisticLesson.create({ ...value, updatedBy: req.admin.name || 'Admin' });
        res.status(201).json(summary(l.toObject()));
    } catch (err) { next(err); }
});

router.put('/lessons/:id', async (req, res, next) => {
    try {
        const l = await own(req.params.id);
        if (!l) return res.status(404).json({ message: 'That lesson was not found.' });
        const { value, errors } = validateLesson({ ...req.body, status: req.body?.status || l.status });
        if (errors.length) return res.status(400).json({ message: errors[0], errors });
        // The fields of other modules are cleared, so a lesson moved to another module carries nothing stale.
        for (const k of ['words', 'practice', 'quiz', 'writing', 'speaking', 'items']) l[k] = value[k];
        Object.assign(l, { module: value.module, level: value.level, order: value.order, title: value.title, summary: value.summary, status: value.status, direction: value.direction, learn: value.learn, updatedBy: req.admin.name || 'Admin' });
        l.markModified('learn');
        await l.save();
        res.json(summary(l.toObject()));
    } catch (err) { next(err); }
});

router.patch('/lessons/:id/status', async (req, res, next) => {
    try {
        const status = req.body?.status;
        if (!['published', 'draft'].includes(status)) return res.status(400).json({ message: 'Choose published or draft.' });
        const l = await own(req.params.id);
        if (!l) return res.status(404).json({ message: 'That lesson was not found.' });
        if (status === 'published') {
            const { errors } = validateLesson({ ...l.toObject(), status });
            if (errors.length) return res.status(400).json({ message: `Fix this before publishing: ${errors[0]}`, errors });
        }
        l.status = status;
        l.updatedBy = req.admin.name || 'Admin';
        await l.save();
        res.json(summary(l.toObject()));
    } catch (err) { next(err); }
});

router.delete('/lessons/:id', async (req, res, next) => {
    try {
        const l = await own(req.params.id);
        if (!l) return res.status(404).json({ message: 'That lesson was not found.' });
        l.deletedAt = new Date();
        l.status = 'draft';
        l.updatedBy = req.admin.name || 'Admin';
        await l.save();
        res.json({ deleted: true });
    } catch (err) { next(err); }
});

/* ── Audio ────────────────────────────────────────────────────────────── */

const AUDIO = new Set(['.mp3', '.m4a', '.wav', '.ogg', '.webm', '.aac']);
const AUDIO_MB = 20;
const audioUpload = multer({
    storage: multer.diskStorage({ destination: os.tmpdir() }),
    limits: { fileSize: AUDIO_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (AUDIO.has(ext)) return cb(null, true);
        const error = new Error(`Upload an audio file: MP3, M4A, WAV, OGG, WEBM or AAC (received "${file.originalname}").`);
        error.status = 400;
        cb(error, false);
    }
});
const bunnyReady = () => !!(process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_API_KEY && process.env.BUNNY_CDN_HOST);

/**
 * The file goes where the platform keeps its uploads (Bunny storage, as the
 * course attachments do). Without Bunny configured — a development machine —
 * it is kept in the server's own public/linguistic/uploads folder instead.
 */
router.post('/audio', (req, res, next) => {
    req.uploadLimitMb = AUDIO_MB;
    audioUpload.single('file')(req, res, async (err) => {
        if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || 400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? `Audio files can be up to ${AUDIO_MB} MB.` : err.message });
        if (!req.file) return res.status(400).json({ message: 'Choose an audio file to upload.' });
        try {
            const ext = path.extname(req.file.originalname).toLowerCase();
            let url;
            if (bunnyReady()) {
                url = await require('../utils/bunnyStorage').uploadStreamToBunny(fs.createReadStream(req.file.path), req.file.originalname, 'linguistic-audio', req.file.size);
            } else {
                const dir = path.join(__dirname, '..', '..', 'public', 'linguistic', 'uploads');
                fs.mkdirSync(dir, { recursive: true });
                const name = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}${ext}`;
                fs.copyFileSync(req.file.path, path.join(dir, name));
                url = `/linguistic/uploads/${name}`;
            }
            res.status(201).json({ url });
        } catch (e) { next(e); } finally { fs.unlink(req.file.path, () => {}); }
    });
});

/* ── Settings ─────────────────────────────────────────────────────────── */

router.get('/config', async (_req, res, next) => { try { res.json(await getConfig()); } catch (err) { next(err); } });
router.put('/config', async (req, res, next) => {
    try {
        const out = await updateConfig(req.body || {});
        if (out.error) return res.status(400).json({ message: out.error });
        res.json(out.config);
    } catch (err) { next(err); }
});

/* ── Students and reviews ─────────────────────────────────────────────── */

router.get('/students', async (req, res, next) => {
    try { res.json(await reports.listStudents({ search: String(req.query.search || ''), page: Number(req.query.page) || 1 })); } catch (err) { next(err); }
});
router.get('/students/:id', async (req, res, next) => {
    try {
        const d = await reports.studentDetail(req.params.id);
        if (!d) return res.status(404).json({ message: 'That student was not found.' });
        res.json(d);
    } catch (err) { next(err); }
});
router.get('/submissions', async (req, res, next) => {
    try { res.json(await reports.listSubmissions({ status: String(req.query.status || 'pending'), module: MODULES.includes(req.query.module) ? req.query.module : '', page: Number(req.query.page) || 1 })); } catch (err) { next(err); }
});
router.put('/submissions/:id', async (req, res, next) => {
    try {
        const out = await reports.reviewSubmission(req.params.id, req.body || {}, reviewer(req));
        if (out.error) return res.status(out.status).json({ message: out.error });
        res.json(out.submission);
    } catch (err) { next(err); }
});

module.exports = router;
