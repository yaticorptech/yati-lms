/**
 * @author Preethesh Kulal
 * @description Protected admin API routes for user, course, bundle, enrollment and analytics management
 */
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const os = require('os');
const path = require('path');
const { upload: imageUpload } = require('../middleware/uploadMiddleware');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

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

// Import secondary controllers directly mapping here for simplicity
const { getUsers, getUserById, updateUserStatus, addUser, deleteUser, updateUser, resetProgress, bulkAddUsers } = require('../controllers/adminUserController');
const { getAdmins, addAdmin, deleteAdmin, updateAdmin } = require('../controllers/adminManagementController');
const courseCtrl = require('../controllers/adminCourseController');
const bundleCtrl = require('../controllers/adminBundleController');
const { superAdminOnly } = require('../middleware/authMiddleware');

// User Management Routes
router.route('/users').get(protectAdmin, getUsers).post(protectAdmin, addUser);
router.post('/users/bulk', protectAdmin, upload.single('file'), bulkAddUsers);
router.route('/users/:id').get(protectAdmin, getUserById).put(protectAdmin, updateUser).delete(protectAdmin, deleteUser);
router.route('/users/:id/status').put(protectAdmin, updateUserStatus);
router.route('/users/:id/progress/:courseId').delete(protectAdmin, resetProgress);

// Bundle Management Routes
router.route('/bundles').get(protectAdmin, bundleCtrl.getBundles).post(protectAdmin, bundleCtrl.createBundle);
// Ahead of /bundles/:id, or "thumbnail" is read as a bundle id.
router.post('/bundles/thumbnail', protectAdmin, imageUpload.single('image'), bundleCtrl.uploadThumbnail);
router.route('/bundles/:id').get(protectAdmin, bundleCtrl.getBundleById).put(protectAdmin, bundleCtrl.updateBundle).delete(protectAdmin, bundleCtrl.deleteBundle);

// Enrollment Management Routes
const enrollmentCtrl = require('../controllers/adminEnrollmentController');
router.route('/enrollments').get(protectAdmin, enrollmentCtrl.getEnrollments).post(protectAdmin, enrollmentCtrl.createEnrollment);
router.route('/enrollments/:id').delete(protectAdmin, enrollmentCtrl.deleteEnrollment);

// Course Management Routes
router.route('/courses').get(protectAdmin, courseCtrl.getCourses).post(protectAdmin, courseCtrl.createCourse);
router.post('/courses/thumbnail', protectAdmin, imageUpload.single('image'), courseCtrl.uploadThumbnail);
router.post('/lessons/upload', protectAdmin, tagUploadLimit, lessonUpload.single('file'), courseCtrl.uploadLessonFile);
router.route('/courses/:id').get(protectAdmin, courseCtrl.getCourseById).put(protectAdmin, courseCtrl.updateCourse).delete(protectAdmin, courseCtrl.deleteCourse);
router.get('/courses/:id/students', protectAdmin, courseCtrl.getCourseStudents);


// Module Management Routes
router.route('/modules').post(protectAdmin, courseCtrl.addModule);
router.route('/modules/reorder').put(protectAdmin, courseCtrl.reorderModules);
router.route('/modules/:id').put(protectAdmin, courseCtrl.updateModule).delete(protectAdmin, courseCtrl.deleteModule);

// Lesson Management Routes
router.route('/lessons').post(protectAdmin, courseCtrl.addLesson);
router.route('/lessons/reorder').put(protectAdmin, courseCtrl.reorderLessons);
router.route('/lessons/:id').put(protectAdmin, courseCtrl.updateLesson).delete(protectAdmin, courseCtrl.deleteLesson);

// Quiz Management Routes (Admin)
const quizCtrl = require('../controllers/adminQuizController');
router.route('/lessons/:lessonId/quiz').get(protectAdmin, quizCtrl.getQuizByLesson).post(protectAdmin, quizCtrl.saveQuiz);

// Admin Management Routes (Superadmin only)
router.route('/admins').get(protectAdmin, superAdminOnly, getAdmins).post(protectAdmin, superAdminOnly, addAdmin);
router.route('/admins/:id').put(protectAdmin, superAdminOnly, updateAdmin).delete(protectAdmin, superAdminOnly, deleteAdmin);

// Support Ticket Routes
const { getTickets, updateTicketStatus } = require('../controllers/ticketController');
router.route('/tickets').get(protectAdmin, getTickets);
router.route('/tickets/:id').put(protectAdmin, updateTicketStatus);

// Settings Routes
const settingsCtrl = require('../controllers/adminSettingsController');
router.route('/settings').get(protectAdmin, settingsCtrl.getSettings).put(protectAdmin, settingsCtrl.updateSettings);

// Analytics Routes
const { getAnalytics } = require('../controllers/adminAnalyticsController');
router.get('/analytics', protectAdmin, getAnalytics);

// Announcement Routes
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
router.route('/announcements').get(protectAdmin, getAnnouncements).post(protectAdmin, createAnnouncement);
router.delete('/announcements/:id', protectAdmin, deleteAnnouncement);
router.put('/announcements/:id', protectAdmin, updateAnnouncement);

// Reports Routes
const { getCompletionReport, exportAnalyticsCSV, exportAnalyticsExcel } = require('../controllers/adminReportController');
router.get('/reports/completion', protectAdmin, getCompletionReport);
router.get('/reports/export/csv', protectAdmin, exportAnalyticsCSV);
router.get('/reports/export/excel', protectAdmin, exportAnalyticsExcel);

// Course Preview Route (admin token, bypasses isPublished)
router.get('/preview/:courseId', protectAdmin, courseCtrl.previewCourse);

module.exports = router;
