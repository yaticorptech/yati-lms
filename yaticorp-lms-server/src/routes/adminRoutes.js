/**
 * @author Preethesh Kulal
 * @description Protected admin API routes for user, course, bundle, enrollment and analytics management
 */
const express = require('express');
const router = express.Router();
const { protectAdmin } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const multer = require('multer');
const { upload: imageUpload } = require('../middleware/uploadMiddleware');

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Lesson video/PDF and attachment uploads: see middleware/lessonUploadMiddleware.js.
const { lessonUpload, attachmentUpload, tagUploadLimit, tagAttachmentLimit } = require('../middleware/lessonUploadMiddleware');

// Import secondary controllers directly mapping here for simplicity
const { getUsers, getUserById, updateUserStatus, addUser, deleteUser, updateUser, resetProgress, bulkAddUsers, openStudentDashboard } = require('../controllers/adminUserController');
const { getAdmins, addAdmin, deleteAdmin, updateAdmin } = require('../controllers/adminManagementController');
const { getUserCourseProgress, setUserCourseProgress } = require('../controllers/adminProgressController');
const courseCtrl = require('../controllers/adminCourseController');
const bundleCtrl = require('../controllers/adminBundleController');
const { superAdminOnly } = require('../middleware/authMiddleware');

// User Management Routes
router.route('/users').get(protectAdmin, getUsers).post(protectAdmin, addUser);
router.post('/users/bulk', protectAdmin, upload.single('file'), bulkAddUsers);
router.route('/users/:id').get(protectAdmin, getUserById).put(protectAdmin, updateUser).delete(protectAdmin, deleteUser);
router.route('/users/:id/status').put(protectAdmin, updateUserStatus);
// Superadmins only: opens the student's own dashboard, signed in as them.
router.post('/users/:id/dashboard-access', protectAdmin, superAdminOnly, openStudentDashboard);
router.route('/users/:id/progress/:courseId')
    .get(protectAdmin, getUserCourseProgress)
    .put(protectAdmin, setUserCourseProgress)
    .delete(protectAdmin, resetProgress);

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
router.post('/lessons/attachments', protectAdmin, tagAttachmentLimit, attachmentUpload.single('file'), courseCtrl.uploadLessonAttachment);
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

// Global Quiz — the general-knowledge bank every student draws from.
const globalQuizCtrl = require('../controllers/adminGlobalQuizController');
// Quizzes first: '/global-quiz/quizzes' must not be read as a question id.
router.route('/global-quiz/quizzes').get(protectAdmin, globalQuizCtrl.listQuizzes).post(protectAdmin, globalQuizCtrl.createQuiz);
router.route('/global-quiz/quizzes/:quizId').put(protectAdmin, globalQuizCtrl.updateQuiz).delete(protectAdmin, globalQuizCtrl.deleteQuiz);
router.post('/global-quiz/quizzes/:quizId/publish', protectAdmin, globalQuizCtrl.publishQuiz);
router.post('/global-quiz/quizzes/:quizId/unpublish', protectAdmin, globalQuizCtrl.unpublishQuiz);
router.post('/global-quiz/quizzes/:quizId/duplicate', protectAdmin, globalQuizCtrl.duplicateQuiz);
router.route('/global-quiz/quizzes/:quizId/questions').get(protectAdmin, globalQuizCtrl.listQuestions).post(protectAdmin, globalQuizCtrl.createQuestion).delete(protectAdmin, globalQuizCtrl.deleteQuestions);
router.route('/global-quiz/:id').put(protectAdmin, globalQuizCtrl.updateQuestion).delete(protectAdmin, globalQuizCtrl.deleteQuestion);

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
// Platform admins, and an organization's admin for its own courses — see middleware/previewAccess.js.
router.get('/preview/:courseId', require('../middleware/previewAccess').protectPreview, courseCtrl.previewCourse);

module.exports = router;
