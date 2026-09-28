/**
 * @description Upload handling for lesson files — videos, PDFs and downloadable
 * attachments. Shared by the platform admin's course routes and an
 * organization admin's, so both get the same types and the same size limits.
 */
const multer = require('multer');
const os = require('os');
const path = require('path');

// Lesson video/PDF upload — disk-backed (streamed to Bunny) so large videos
// never sit fully in memory. Course videos routinely run past 1 GB, so the cap
// is generous and tunable via MAX_LESSON_UPLOAD_MB.
//
// The browser decides the MIME type from the OS file-type registry, and for
// containers it has no mapping for (.mkv, .ts, .m4v, and .mov/.avi on many
// Windows machines) it sends application/octet-stream or nothing at all. Those
// are real videos, so fall back to the file extension before rejecting.
const VIDEO_EXTENSIONS = new Set([
    '.mp4', '.mov', '.m4v', '.mkv', '.avi', '.webm', '.wmv',
    '.flv', '.mpeg', '.mpg', '.ts', '.3gp', '.ogv',
]);
const UNKNOWN_MIMES = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

const LESSON_UPLOAD_MAX_MB = Number(process.env.MAX_LESSON_UPLOAD_MB) || 5120; // 5 GB

// Lets the error handler name the limit in its 413 instead of just "too large".
const tagUploadLimit = (req, res, next) => {
    req.uploadLimitMb = LESSON_UPLOAD_MAX_MB;
    next();
};

const lessonUpload = multer({
    storage: multer.diskStorage({ destination: os.tmpdir() }),
    limits: { fileSize: LESSON_UPLOAD_MAX_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const mime = (file.mimetype || '').trim().toLowerCase();
        const ext = path.extname(file.originalname || '').toLowerCase();
        const unknownMime = UNKNOWN_MIMES.has(mime);

        if (mime.startsWith('video/') || (unknownMime && VIDEO_EXTENSIONS.has(ext))) {
            return cb(null, true);
        }
        if (mime === 'application/pdf' || (unknownMime && ext === '.pdf')) {
            return cb(null, true);
        }

        const error = new Error(
            `Only video or PDF files are allowed (received "${file.originalname}", type "${mime || 'unknown'}")`
        );
        error.status = 400;
        cb(error, false);
    },
});

// Lesson attachment upload — downloadable resources (worksheets, slides,
// source archives) shown alongside a lesson. Same disk-backed streaming, but
// a document allowlist by extension (MIME is unreliable for office/archive
// types) and a much tighter size cap than full lesson videos.
const ATTACHMENT_EXTENSIONS = new Set([
    '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv',
    '.txt', '.md', '.rtf', '.zip', '.rar', '.7z',
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
    '.mp3', '.wav', '.json', '.ipynb',
]);

const ATTACHMENT_UPLOAD_MAX_MB = Number(process.env.MAX_ATTACHMENT_UPLOAD_MB) || 200;

const tagAttachmentLimit = (req, res, next) => {
    req.uploadLimitMb = ATTACHMENT_UPLOAD_MAX_MB;
    next();
};

const attachmentUpload = multer({
    storage: multer.diskStorage({ destination: os.tmpdir() }),
    limits: { fileSize: ATTACHMENT_UPLOAD_MAX_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (ATTACHMENT_EXTENSIONS.has(ext)) {
            return cb(null, true);
        }
        const error = new Error(
            `File type "${ext || 'unknown'}" is not allowed as an attachment (received "${file.originalname}")`
        );
        error.status = 400;
        cb(error, false);
    },
});

module.exports = { lessonUpload, attachmentUpload, tagUploadLimit, tagAttachmentLimit, LESSON_UPLOAD_MAX_MB, ATTACHMENT_UPLOAD_MAX_MB };
