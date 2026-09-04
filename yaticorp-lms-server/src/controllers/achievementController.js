/**
 * @description Student-uploaded certificates and awards — the "frame" on the
 *              profile page. Upload goes buffer → storage → MongoDB; nothing
 *              touches disk.
 *
 * Storage is Bunny first — the CDN the LMS already keeps its course assets
 * on — and Cloudinary only when Bunny isn't configured. Cloudinary is where
 * profile pictures go, but the account behind it can be (and, on the test
 * environment, is) disabled, and a certificate that fails to upload is a
 * worse experience than one without a PDF thumbnail.
 */
const multer = require('multer');
const axios = require('axios');
const { Readable } = require('stream');
const cloudinary = require('../config/cloudinary');
const { uploadToBunny } = require('../utils/bunnyStorage');
const Achievement = require('../models/Achievement');

const bunnyConfigured = () => !!(process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_API_KEY && process.env.BUNNY_CDN_HOST);

const deleteFromBunny = (objectPath) => axios.delete(
    `https://${process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com'}/${process.env.BUNNY_STORAGE_ZONE}/${objectPath}`,
    { headers: { AccessKey: process.env.BUNNY_STORAGE_API_KEY } }
);

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PER_USER = 30;

// Its own multer: the profile-picture one refuses anything but images, and a
// certificate is very often a PDF.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES },
    fileFilter: (_req, file, cb) => {
        const ok = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf'
            || /\.(pdf|png|jpe?g|webp)$/i.test(file.originalname || '');
        if (ok) return cb(null, true);
        cb(new Error('Upload an image (PNG, JPG, WebP) or a PDF of the certificate.'));
    }
});

/**
 * Cloudinary stores PDFs under the "image" resource type, which is what lets
 * it render a page-one JPEG for the thumbnail. No crop transformation here —
 * a certificate must arrive whole, not face-cropped to a square.
 */
const uploadToCloudinary = (buffer, isPdf) =>
    new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder: 'lms_achievements', resource_type: 'image', ...(isPdf ? { format: 'pdf' } : {}) },
            (error, result) => (error ? reject(error) : resolve(result))
        );
        Readable.from(buffer).pipe(stream);
    });

const thumbnailFor = (result, isPdf) => {
    if (!isPdf) return cloudinary.url(result.public_id, { secure: true, width: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' });
    return cloudinary.url(result.public_id, { secure: true, format: 'jpg', page: 1, width: 800, crop: 'limit', quality: 'auto' });
};

const publicView = (a) => ({
    id: String(a._id),
    title: a.title,
    issuer: a.issuer,
    kind: a.kind,
    issuedOn: a.issuedOn,
    fileUrl: a.fileUrl,
    thumbnailUrl: a.thumbnailUrl,
    fileType: a.fileType,
    originalName: a.originalName,
    createdAt: a.createdAt
});

const parseDay = (v) => { if (!v) return null; const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; };

// @route GET /api/user/achievements
const listAchievements = async (req, res) => {
    try {
        const rows = await Achievement.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        res.json({ achievements: rows.map(publicView), max: MAX_PER_USER });
    } catch (error) {
        res.status(500).json({ message: 'Could not load your achievements.', error: error.message });
    }
};

// @route POST /api/user/achievements  (multipart: file, title, issuer, issuedOn, kind)
const createAchievement = (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
        try {
            if (uploadErr) {
                const message = uploadErr.code === 'LIMIT_FILE_SIZE' ? 'That file is over 10 MB — export a lighter one.' : uploadErr.message;
                return res.status(400).json({ message });
            }
            if (!req.file) return res.status(400).json({ message: 'Attach the certificate file.' });
            const title = String(req.body.title || '').trim().slice(0, 120);
            if (!title) return res.status(400).json({ message: 'Give the certificate a title.' });
            if ((await Achievement.countDocuments({ userId: req.user._id })) >= MAX_PER_USER) {
                return res.status(400).json({ message: `You can keep up to ${MAX_PER_USER} uploaded certificates. Remove one to add another.` });
            }

            const isPdf = req.file.mimetype === 'application/pdf' || /\.pdf$/i.test(req.file.originalname || '');
            const originalName = String(req.file.originalname || (isPdf ? 'certificate.pdf' : 'certificate.png')).slice(0, 200);

            let stored;
            if (bunnyConfigured()) {
                const url = await uploadToBunny(req.file.buffer, originalName, 'lms_achievements');
                // An image is its own preview; a PDF on Bunny has none and the
                // card shows the seal instead.
                stored = { storage: 'bunny', fileUrl: url, objectPath: url.split('/').slice(3).join('/'), thumbnailUrl: isPdf ? '' : url };
            } else {
                const result = await uploadToCloudinary(req.file.buffer, isPdf);
                stored = { storage: 'cloudinary', fileUrl: result.secure_url, publicId: result.public_id, thumbnailUrl: thumbnailFor(result, isPdf) };
            }

            const row = await Achievement.create({
                userId: req.user._id,
                title,
                issuer: String(req.body.issuer || '').trim().slice(0, 120),
                kind: ['certificate', 'award', 'other'].includes(req.body.kind) ? req.body.kind : 'certificate',
                issuedOn: parseDay(req.body.issuedOn),
                fileType: isPdf ? 'pdf' : 'image',
                originalName,
                ...stored
            });
            res.status(201).json({ achievement: publicView(row) });
        } catch (error) {
            console.error('Achievement upload error:', error);
            res.status(500).json({ message: 'Upload failed. Please try again.', error: error.message });
        }
    });
};

// @route PUT /api/user/achievements/:id  — title / issuer / date only
const updateAchievement = async (req, res) => {
    try {
        const patch = {};
        if (req.body.title !== undefined) {
            const title = String(req.body.title).trim().slice(0, 120);
            if (!title) return res.status(400).json({ message: 'The title cannot be empty.' });
            patch.title = title;
        }
        if (req.body.issuer !== undefined) patch.issuer = String(req.body.issuer).trim().slice(0, 120);
        if (req.body.issuedOn !== undefined) patch.issuedOn = parseDay(req.body.issuedOn);
        if (['certificate', 'award', 'other'].includes(req.body.kind)) patch.kind = req.body.kind;
        const row = await Achievement.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { $set: patch }, { returnDocument: 'after' }).lean();
        if (!row) return res.status(404).json({ message: 'No such certificate.' });
        res.json({ achievement: publicView(row) });
    } catch (error) {
        res.status(500).json({ message: 'Could not update the certificate.', error: error.message });
    }
};

// @route DELETE /api/user/achievements/:id
const deleteAchievement = async (req, res) => {
    try {
        const row = await Achievement.findOneAndDelete({ _id: req.params.id, userId: req.user._id }).lean();
        if (!row) return res.status(404).json({ message: 'No such certificate.' });
        // Best effort: the record is gone either way; an orphan in storage
        // is a cost, not a leak the student can see.
        const cleanup = row.storage === 'cloudinary' && row.publicId
            ? cloudinary.uploader.destroy(row.publicId, { resource_type: 'image' })
            : row.objectPath ? deleteFromBunny(row.objectPath) : Promise.resolve();
        cleanup.catch((e) => console.warn('[achievements] storage delete failed:', e.message));
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ message: 'Could not remove the certificate.', error: error.message });
    }
};

module.exports = { listAchievements, createAchievement, updateAchievement, deleteAchievement };
