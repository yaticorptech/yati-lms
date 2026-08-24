/**
 * @author Preethesh Kulal
 * @description Protected student API routes for profile, courses, progress and community
 */
const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, uploadProfilePicture } = require('../controllers/userAuthController');
const { protectUser } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const { updatePassword } = require('../controllers/userPasswordController');
const { upload } = require('../middleware/uploadMiddleware');
const { getMyCourses, getBundles, getBundleContent, getCourseContent, updateProgress, getAvailableCourses, enrollCourse, searchContent } = require('../controllers/userCourseController');
const { createTicket, getMyTickets } = require('../controllers/ticketController');
const { getMyCertificates } = require('../controllers/certificateController');
const { getAnnouncementsForUser, clearUserNotifications } = require('../controllers/announcementController');

// Profile routes
router.get('/profile', protectUser, getUserProfile);
router.put('/profile', protectUser, updateUserProfile);
router.put('/update-password', protectUser, updatePassword);
// Profile picture upload (server-side → Cloudinary → MongoDB)
router.post('/profile/picture', protectUser, upload.single('profilePicture'), uploadProfilePicture);

// Course and Progress Routes
router.get('/courses', protectUser, getMyCourses);
router.get('/courses/available', protectUser, getAvailableCourses);
router.get('/courses/:id', protectUser, getCourseContent);
router.post('/courses/:id/enroll', protectUser, enrollCourse);
router.post('/progress/update', protectUser, updateProgress);

// Bundle Routes — every published bundle is open to any signed-in student, so
// these are gated on login alone and never on an enrollment record.
router.get('/bundles', protectUser, getBundles);
router.get('/bundles/:id', protectUser, getBundleContent);

// Settings Routes
const userSettingsController = require('../controllers/userSettingsController');
router.get('/settings', protectUser, userSettingsController.getUserSettings);

// Quiz Routes
const { getQuizForStudent, submitQuizAnswers } = require('../controllers/userQuizController');
router.get('/lessons/:lessonId/quiz', protectUser, getQuizForStudent);
router.post('/lessons/:lessonId/quiz/submit', protectUser, submitQuizAnswers);

// Ticket Routes
router.post('/tickets', protectUser, createTicket);
router.get('/tickets', protectUser, getMyTickets);

// Certificate Routes
router.get('/certificates', protectUser, getMyCertificates);

// Announcements Route (read-only for students)
router.get('/announcements', protectUser, getAnnouncementsForUser);
router.post('/announcements/clear', protectUser, clearUserNotifications);

// Search Route
router.get('/search', protectUser, searchContent);

module.exports = router;
