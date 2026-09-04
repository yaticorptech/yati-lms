/**
 * @description The profile page's resume: keep the student's own file, read
 *              its skills, and generate the ATS resume the LMS builds from
 *              their courses.
 *
 * The record is the Jobs section's ResumeProfile — one resume per student
 * across the LMS. The Jobs tab parses and discards; this page also keeps the
 * file (on Bunny) so the student can open the one they uploaded.
 */
const multer = require('multer');
const axios = require('axios');
const ResumeProfile = require('../jobboard/models/ResumeProfile');
const ApiUsage = require('../jobboard/models/ApiUsage');
const { parseResume } = require('../jobboard/services/resumeService');
const { localParse } = require('../jobboard/services/localResumeParse');
const { normalizeSkillList } = require('../jobboard/services/matchService');
const { uploadToBunny } = require('../utils/bunnyStorage');
const { buildResumeData, renderAtsPdf } = require('../services/atsResumeService');

const PARSES_PER_DAY = 5;
// How long the upload request waits for the skill reader before answering
// with the file stored and the reading still in progress. The reader keeps
// going in the background and fills the profile in when it finishes; the
// student app polls for it. Nobody should watch a spinner for a minute.
const PARSE_WAIT_MS = 8_000;
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = String(file.originalname || '').toLowerCase().split('.').pop();
        if (Object.values(MIME).includes(file.mimetype) || MIME[ext]) return cb(null, true);
        cb(new Error('Resumes must be a PDF or an image (PNG, JPG, WebP).'));
    }
});

const bunnyConfigured = () => !!(process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_API_KEY && process.env.BUNNY_CDN_HOST);
const deleteFromBunny = (objectPath) => axios.delete(
    `https://${process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com'}/${process.env.BUNNY_STORAGE_ZONE}/${objectPath}`,
    { headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY } }
).catch((e) => console.warn('[resume] storage delete failed:', e.message));

const view = (r) => r && ({
    filename: r.filename,
    uploadedAt: r.parsedAt,
    fileUrl: r.fileUrl || '',
    headline: r.headline,
    skills: r.skills,
    seniority: r.seniority,
    parseStatus: r.parseStatus || 'parsed'
});

// @route GET /api/user/resume
const getResume = async (req, res) => {
    try {
        const row = await ResumeProfile.findOne({ userId: req.user._id }).lean().catch(() => null);
        // The stats line is decoration; the card must render without it.
        const data = await buildResumeData(req.user._id).catch((e) => { console.warn('[resume] stats failed:', e.message); return null; });
        res.json({ resume: view(row), ats: data?.stats || null });
    } catch (error) {
        res.status(500).json({ message: 'Could not load your resume.', error: error.message });
    }
};

// @route POST /api/user/resume  (multipart field "resume")
const uploadResume = (req, res) => {
    upload.single('resume')(req, res, async (uploadErr) => {
        try {
            if (uploadErr) {
                return res.status(400).json({ message: uploadErr.code === 'LIMIT_FILE_SIZE' ? 'That file is over 5 MB.' : uploadErr.message });
            }
            if (!req.file) return res.status(400).json({ message: 'Attach your resume.' });

            const ext = String(req.file.originalname || '').toLowerCase().split('.').pop();
            const mime = Object.values(MIME).includes(req.file.mimetype) ? req.file.mimetype : MIME[ext] || 'application/pdf';
            const filename = String(req.file.originalname || 'resume.pdf').slice(0, 200);
            const existing = await ResumeProfile.findOne({ userId: req.user._id }).lean();

            // 1. Keep the file.
            let fileUrl = '', objectPath = '';
            if (bunnyConfigured()) {
                fileUrl = await uploadToBunny(req.file.buffer, filename, 'lms_resumes');
                objectPath = fileUrl.split('/').slice(3).join('/');
            }

            // 2. Save the file first, so nothing downstream can lose it. The
            //    previous resume's reading is cleared with it: skills from a
            //    file the student has just replaced must not linger in the
            //    Jobs section. A local reader (no network) fills in whatever
            //    it can find straight away, so a PDF upload reaches the job
            //    search with skills even when the AI reader is unreachable.
            const userId = req.user._id;
            const uploadedAt = new Date();
            const local = localParse(req.file.buffer, mime);
            const set = {
                userId, filename, fileUrl, objectPath, parsedAt: uploadedAt, parseStatus: 'stored',
                skills: local?.skills || [], skillsRaw: local?.skillsRaw || [], experienceYears: local?.experienceYears || 0,
                seniority: 'Fresher', education: { level: '', degree: '', specialization: '' }, pastRoles: [], headline: ''
            };
            let row = await ResumeProfile.findOneAndUpdate({ userId }, { $set: set }, { upsert: true, returnDocument: 'after' }).lean();
            if (existing?.objectPath && existing.objectPath !== objectPath) deleteFromBunny(existing.objectPath);

            // 3. Read it — best effort, and never something the student waits
            //    on for long. The reader is Gemini-backed and metered; it gets
            //    a few seconds inline, then keeps working in the background
            //    and fills the profile in when it finishes. If it fails, the
            //    file stays and the ATS resume leans on the courses instead.
            let parsing = false;
            const key = `resume:${userId}:${new Date().toISOString().slice(0, 10)}`;
            const day = await ApiUsage.findOne({ key }).lean();
            if ((day?.calls ?? 0) < PARSES_PER_DAY) {
                await ApiUsage.updateOne({ key }, { $inc: { calls: 1 }, $setOnInsert: { provider: 'resume-user', month: new Date().toISOString().slice(0, 10) } }, { upsert: true });
                await ResumeProfile.updateOne({ userId }, { $set: { parseStatus: 'parsing' } });
                const job = parseResume(req.file.buffer, filename, mime)
                    .then(async (extracted) => {
                        // Only the upload that started this read may finish it.
                        // The AI reading wins on roles and education; skills
                        // are the union of both readers.
                        const skills = normalizeSkillList([...(extracted.skills || []), ...(local?.skills || [])]);
                        const r = await ResumeProfile.findOneAndUpdate(
                            { userId, parsedAt: uploadedAt },
                            { $set: { ...extracted, skills, parseStatus: 'parsed' } },
                            { returnDocument: 'after' }
                        ).lean();
                        return r;
                    })
                    .catch(async (e) => {
                        console.warn('[resume] parse skipped:', e.message);
                        await ResumeProfile.updateOne({ userId, parsedAt: uploadedAt }, { $set: { parseStatus: 'stored' } }).catch(() => {});
                        return null;
                    });
                const done = await Promise.race([job, new Promise((r) => setTimeout(() => r('timeout'), PARSE_WAIT_MS))]);
                if (done === 'timeout') { parsing = true; row = { ...row, parseStatus: 'parsing' }; }
                else if (done) row = done;
                else row = await ResumeProfile.findOne({ userId }).lean();
            }

            const data = await buildResumeData(userId);
            res.status(201).json({ resume: view(row), ats: data.stats, parsed: row?.parseStatus === 'parsed' || (row?.skills?.length || 0) > 0, parsing });
        } catch (error) {
            console.error('Resume upload error:', error);
            res.status(500).json({ message: 'Upload failed. Please try again.', error: error.message });
        }
    });
};

// @route DELETE /api/user/resume
const deleteResume = async (req, res) => {
    try {
        const row = await ResumeProfile.findOneAndDelete({ userId: req.user._id }).lean();
        if (row?.objectPath) deleteFromBunny(row.objectPath);
        const data = await buildResumeData(req.user._id);
        res.json({ ok: true, ats: data.stats });
    } catch (error) {
        res.status(500).json({ message: 'Could not remove your resume.', error: error.message });
    }
};

// @route GET /api/user/resume/ats/data — what the generated resume contains
const getAtsData = async (req, res) => {
    try {
        res.json(await buildResumeData(req.user._id));
    } catch (error) {
        res.status(500).json({ message: 'Could not build your resume.', error: error.message });
    }
};

// @route GET /api/user/resume/ats — the PDF
const downloadAts = async (req, res) => {
    try {
        const data = await buildResumeData(req.user._id);
        renderAtsPdf(data, res);
    } catch (error) {
        console.error('ATS resume error:', error);
        if (!res.headersSent) res.status(500).json({ message: 'Could not generate your resume.', error: error.message });
    }
};

module.exports = { getResume, uploadResume, deleteResume, getAtsData, downloadAts };
