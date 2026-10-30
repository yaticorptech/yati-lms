/**
 * @author Preethesh Kulal
 * @description Protected student API routes for profile, courses, progress and community
 */
const express = require('express');
const router = express.Router();
const { getUserProfile, updateUserProfile, uploadProfilePicture } = require('../controllers/userAuthController');
const { protectUser } = require('../middleware/authMiddleware');
// Wallet rules: priced features charge the wallet first, refunded if they fail.
const { chargeWallet } = require('../rewards/services/walletRuleService');
const { xpOnSuccess, today } = require('../rewards/services/xpHooks');
const { authLimiter } = require('../middleware/rateLimiter');
const { updatePassword } = require('../controllers/userPasswordController');
const { upload } = require('../middleware/uploadMiddleware');
const { getMyCourses, getCourseOutline, getJobsAccess, getBundles, getBundleContent, getCourseContent, updateProgress, getAvailableCourses, getOrganizationCourses, enrollCourse, searchContent } = require('../controllers/userCourseController');
const { createTicket, getMyTickets } = require('../controllers/ticketController');
const { getMyCertificates } = require('../controllers/certificateController');
const { getAnnouncementsForUser, clearUserNotifications } = require('../controllers/announcementController');

// Profile routes
router.get('/profile', protectUser, getUserProfile);
router.put('/profile', protectUser, updateUserProfile);
router.put('/update-password', protectUser, updatePassword);
// Profile picture upload (server-side → Bunny Storage → MongoDB). A file over
// the limit, or not an image, gets a message the student can act on rather
// than a bare server error.
const pictureFile = (req, res, next) => upload.single('profilePicture')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'That photo is too large. Choose one under 5 MB.' });
    return res.status(400).json({ message: err.message || 'That file could not be read as a photo.' });
});
router.post('/profile/picture', protectUser, xpOnSuccess('profile_picture', () => 'picture'), pictureFile, uploadProfilePicture);

// Course and Progress Routes
router.get('/courses', protectUser, getMyCourses);
router.get('/jobs-access', protectUser, getJobsAccess);
router.get('/courses/available', protectUser, getAvailableCourses);
router.get('/courses/organization', protectUser, getOrganizationCourses);
router.get('/courses/:id', protectUser, getCourseContent);
// What is inside a course, for its Preview: sections and lesson titles, nothing that plays.
router.get('/courses/:id/outline', protectUser, getCourseOutline);
// XP rule (optional): enrolling, once a day however many courses (free ones can be taken in bulk).
router.post('/courses/:id/enroll', protectUser, xpOnSuccess('course_enroll', () => `enroll:${today()}`), enrollCourse);
// Where the student is in a course's videos, so a phone and a laptop pick up
// from the same place.
const { getPlayback, savePlayback } = require('../controllers/playbackController');
router.get('/courses/:id/playback', protectUser, getPlayback);
router.put('/courses/:id/playback', protectUser, savePlayback);
router.post('/progress/update', protectUser, updateProgress);

// Bundle Routes — every published bundle is open to any signed-in student, so
// these are gated on login alone and never on an enrollment record.
router.get('/bundles', protectUser, getBundles);
router.get('/bundles/:id', protectUser, getBundleContent);

// Settings Routes
const userSettingsController = require('../controllers/userSettingsController');
router.get('/settings', protectUser, userSettingsController.getUserSettings);

// Bring your own Gemini key: see, save (after a live check) or remove.
const aiKeyCtrl = require('../controllers/userAiKeyController');
// My devices (services/deviceGuard.js): the list, and removing one (once a year).
// Every id this request could be known by: the token's device, the one the app names, and the
// user-agent stand-in an older request may have registered — so "This device" is always marked.
const currentDeviceId = (req) => {
    const guard = require('../services/deviceGuard');
    let did = '';
    try { did = require('jsonwebtoken').decode(req.headers.authorization.split(' ')[1])?.did || ''; } catch { /* no token */ }
    const here = guard.deviceOf(req).deviceId;
    const ua = guard.deviceOf({ headers: { 'user-agent': req.headers['user-agent'] } }).deviceId;
    return [did, here, ua].filter(Boolean);
};
router.get('/devices', protectUser, async (req, res) => {
    try { res.json(await require('../services/deviceGuard').myDevices(req.user._id, currentDeviceId(req))); }
    catch (e) { res.status(500).json({ message: 'Could not load your devices.' }); }
});
router.delete('/devices/:deviceId', protectUser, async (req, res) => {
    try {
        if (req.impersonatedBy) return res.status(403).json({ message: 'Only the student can remove their devices.' });
        const done = await require('../services/deviceGuard').removeMyDevice(req.user._id, String(req.params.deviceId), currentDeviceId(req));
        if (done.error) return res.status(done.status).json({ message: done.error });
        res.json({ message: `${done.removed} removed. You can add a new device in its place.` });
    } catch (e) { res.status(500).json({ message: 'Could not remove the device.' }); }
});
router.route('/ai-key').get(protectUser, aiKeyCtrl.getAiKey).put(protectUser, aiKeyCtrl.setAiKey).delete(protectUser, aiKeyCtrl.deleteAiKey);

// Quiz Routes
const { getGlobalQuizLive, getQuizForStudent, submitQuizAnswers, getGlobalQuiz, startGlobalQuiz, submitGlobalQuiz, finishGlobalQuiz, getGlobalQuizHistory } = require('../controllers/userQuizController');
router.get('/lessons/:lessonId/quiz', protectUser, getQuizForStudent);
router.post('/lessons/:lessonId/quiz/submit', protectUser, submitQuizAnswers);
// One paper across every course the student can open. Practice: it records nothing.
router.get('/quizzes/global', protectUser, getGlobalQuiz);
// The student's past attempts, with their scores.
router.get('/quizzes/global/history', protectUser, getGlobalQuizHistory);
// Whether a quiz is live (no questions): what the "new Global Quiz" notice checks every minute.
router.get('/quizzes/global/live', protectUser, getGlobalQuizLive);
router.post('/quizzes/global/start', protectUser, startGlobalQuiz);
router.post('/quizzes/global/submit', protectUser, submitGlobalQuiz);
// "Finish the Global Quiz" XP is paid inside finishGlobalQuiz, once per quiz, by
// the request that closes the attempt — not here per day, which a Finish on an
// already-closed attempt could collect again every day.
router.post('/quizzes/global/finish', protectUser, finishGlobalQuiz);

// Ticket Routes
router.post('/tickets', protectUser, createTicket);
router.get('/tickets', protectUser, getMyTickets);

// Certificate Routes
router.get('/certificates', protectUser, getMyCertificates);

// Achievements — certificates the student uploads themselves (profile frame)
const { listAchievements, createAchievement, updateAchievement, deleteAchievement } = require('../controllers/achievementController');
router.get('/achievements', protectUser, listAchievements);
router.post('/achievements', protectUser, xpOnSuccess('achievement_added', () => `achievement:${today()}`), createAchievement);
router.put('/achievements/:id', protectUser, updateAchievement);
router.delete('/achievements/:id', protectUser, deleteAchievement);

// Resume — the student's own file, and the ATS resume built from their courses
const { getResume, uploadResume, deleteResume, getAtsData, downloadAts } = require('../controllers/resumeController');
router.get('/resume', protectUser, getResume);
// Priced under Wallet rules → Upload a resume; refunded if the upload fails.
router.post('/resume', protectUser, chargeWallet('upload_resume'), xpOnSuccess('resume_upload', () => 'resume'), uploadResume);
router.delete('/resume', protectUser, deleteResume);
router.get('/resume/ats/data', protectUser, getAtsData);
router.get('/resume/ats', protectUser, chargeWallet('download_resume'), downloadAts);

// Announcements Route (read-only for students)
router.get('/announcements', protectUser, getAnnouncementsForUser);
router.post('/announcements/clear', protectUser, clearUserNotifications);

// Search Route
router.get('/search', protectUser, searchContent);

module.exports = router;
