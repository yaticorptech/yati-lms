/**
 * @description Organizations — schools, colleges and companies that bring their
 *              own students, mounted under /api/organizations.
 *
 *   Public
 *     GET    /types                      the kinds of organization the form offers
 *     GET    /code-available?code=       whether an organization ID is free
 *     POST   /register                   register an organization (creates it `pending`)
 *
 *   Superadmin (protectAdmin + superAdminOnly)
 *     GET    /admin/options              every organization, for a filter dropdown (any platform admin)
 *     GET    /admin                      the list, with search and status/type filters
 *     POST   /admin                      create an organization and its administrator
 *     GET    /admin/students/:studentId  any student's learning record
 *     GET    /admin/:id                  one organization in full
 *     PUT    /admin/:id                  edit its details
 *     PUT    /admin/:id/status           approve, reject, suspend, reinstate
 *     GET    /admin/:id/students         its students, with progress
 *     GET    /admin/:id/assignable       students who could be put into it
 *     POST   /admin/:id/students         put a student into it
 *     DELETE /admin/:id/students/:sid    take a student out of it
 *
 *   Organization admin (protectOrgAdmin + requireActiveOrganization)
 *     GET    /me                         my organization
 *     PUT    /me                         edit my details
 *     PUT    /me/password                change my own sign-in password
 *     GET    /me/dashboard               headline numbers and recent activity
 *     POST   /me/logo                    upload my institution's logo
 *     GET    /me/students                my students
 *     GET    /me/students/:studentId     one of my students, in full
 *     DELETE /me/students/:studentId     remove them from my organization
 *     GET    /me/requests                students asking to join
 *     PUT    /me/requests/:requestId     approve or reject
 *
 *   Organization admin, before approval (protectOrgAdmin only)
 *     GET    /me/status                  where my application stands
 *
 *   Student (protectUser)
 *     GET    /student/me                 my organization, or my pending request
 *     GET    /student/lookup/:code       find an active organization by its ID
 *     POST   /student/requests           ask to join
 *     DELETE /student/requests/:id       withdraw my request (a request, not a membership)
 *
 * Route order matters in two places, both marked below: a literal path that
 * would otherwise be swallowed by `/:id`, and the status endpoint that has to
 * sit in front of the active-organization gate.
 */
const express = require('express');
const router = express.Router();

const { protectAdmin, superAdminOnly, protectUser } = require('../middleware/authMiddleware');
const { protectOrgAdmin, requireActiveOrganization } = require('./middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

const publicCtrl = require('./controllers/publicController');
const superCtrl = require('./controllers/superAdminController');
const orgCtrl = require('./controllers/orgAdminController');
const studentCtrl = require('./controllers/studentController');
const Organization = require('./models/Organization');

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/types', publicCtrl.getOrganizationTypes);
// Asked as the organization ID is typed, on the public form and the superadmin's.
router.get('/code-available', publicCtrl.checkOrgCodeAvailable);
// Rate-limited with the same limiter as the other public credential-creating
// endpoints, because this one creates an account.
router.post('/register', authLimiter, publicCtrl.registerOrganization);

// ── Superadmin ──────────────────────────────────────────────────────────────
// `options` fills the organization filter on the existing student list, so it is
// open to any platform administrator rather than superadmins alone.
router.get('/admin/options', protectAdmin, superCtrl.getOrganizationOptions);

router.use('/admin', protectAdmin, superAdminOnly);
router.route('/admin').get(superCtrl.listOrganizations).post(superCtrl.createOrganization);
// Ahead of '/admin/:id', or "students" is read as an organization id.
router.get('/admin/students/:studentId', superCtrl.getAnyStudentProgress);
router.route('/admin/:id').get(superCtrl.getOrganization).put(superCtrl.updateOrganization);
router.put('/admin/:id/status', superCtrl.setOrganizationStatus);
router.put('/admin/:id/course-access', superCtrl.setCourseAccess);
router.get('/admin/:id/students', superCtrl.getOrganizationStudents);
// Putting a student into an organization directly, and taking them back out.
// Ahead of nothing else, but note the assignable list is a literal segment.
router.get('/admin/:id/assignable', superCtrl.getAssignableStudents);
router.post('/admin/:id/students', superCtrl.assignStudent);
router.delete('/admin/:id/students/:studentId', superCtrl.unassignStudent);

// ── Organization admin ──────────────────────────────────────────────────────
router.use('/me', protectOrgAdmin);

/**
 * Where my application stands — the one endpoint in front of the active gate.
 *
 * A pending or suspended organization's admin can sign in, and this is all they
 * can reach. Without it the admin app would have nothing to show them but a
 * bare 403, and they would be left guessing whether their registration arrived.
 */
router.get('/me/status', (req, res) => {
    res.json({
        organization: {
            orgCode: req.organization.orgCode,
            name: req.organization.name,
            logo: req.organization.logo || '',
            status: req.organization.status,
            statusReason: req.organization.statusReason || '',
            typeLabel: Organization.TYPE_LABELS[req.organization.organizationType] || 'Other',
            registeredAt: req.organization.createdAt
        }
    });
});

router.use('/me', requireActiveOrganization);
router.route('/me').get(orgCtrl.getMyOrganization).put(orgCtrl.updateMyOrganization);
router.get('/me/dashboard', orgCtrl.getDashboard);
router.get('/me/students', orgCtrl.getStudents);
router.route('/me/students/:studentId').get(orgCtrl.getStudent).delete(orgCtrl.removeStudent);
router.put('/me/password', orgCtrl.changeMyPassword);
router.get('/me/requests', orgCtrl.getRequests);
router.put('/me/requests/:requestId', orgCtrl.decideRequest);

// ── Organization admin: its own courses ─────────────────────────────────────
// The platform's course-building code, fenced: courses must be switched on by
// a superadmin, new ones count against their limit, and every course, module,
// lesson and quiz touched must be this organization's own (see
// controllers/orgCourseController.js). Literal segments come before ':id'.
const courseCtrl = require('../controllers/adminCourseController');
const quizCtrl = require('../controllers/adminQuizController');
const vdoCipherController = require('../controllers/vdoCipherController');
const orgCourse = require('./controllers/orgCourseController');
const { upload: imageUpload } = require('../middleware/uploadMiddleware');
const { lessonUpload, attachmentUpload, tagUploadLimit, tagAttachmentLimit } = require('../middleware/lessonUploadMiddleware');

router.get('/me/course-access', orgCourse.getCourseAccess);
// The institution's logo: asked for before its first course, shown across its panel.
router.post('/me/logo', imageUpload.single('image'), orgCtrl.uploadLogo);
// Each student's progress on the organization's own courses, and the courses
// they have completed. Readable whether or not course building is switched on,
// so an organization keeps seeing how its students did.
router.get('/me/certificate-progress', async (req, res) => {
    try {
        res.json(await require('./services/courseStats').certificateProgress(req.organization._id));
    } catch (error) {
        console.error('[organizations] certificate progress failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});
router.use(['/me/courses', '/me/modules', '/me/lessons', '/me/vdocipher'], orgCourse.requireCourseAccess);

router.route('/me/courses').get(courseCtrl.getCourses).post(orgCourse.requireLogo, orgCourse.withinCourseLimit, courseCtrl.createCourse);
router.post('/me/courses/thumbnail', imageUpload.single('image'), courseCtrl.uploadThumbnail);
router.route('/me/courses/:id')
    .get(orgCourse.ownsCourseParam(), courseCtrl.getCourseById)
    .put(orgCourse.ownsCourseParam(), orgCourse.requireLogo, courseCtrl.updateCourse)
    .delete(orgCourse.ownsCourseParam(), courseCtrl.deleteCourse);

router.post('/me/modules', orgCourse.ownsBodyCourse(true), courseCtrl.addModule);
router.put('/me/modules/reorder', orgCourse.ownsAllModules, courseCtrl.reorderModules);
router.route('/me/modules/:id')
    .put(orgCourse.ownsModuleParam, orgCourse.ownsBodyCourse(false), courseCtrl.updateModule)
    .delete(orgCourse.ownsModuleParam, courseCtrl.deleteModule);

router.post('/me/lessons', orgCourse.ownsBodyModule(true), courseCtrl.addLesson);
router.put('/me/lessons/reorder', orgCourse.ownsAllLessons, courseCtrl.reorderLessons);
router.post('/me/lessons/upload', tagUploadLimit, lessonUpload.single('file'), courseCtrl.uploadLessonFile);
router.post('/me/lessons/attachments', tagAttachmentLimit, attachmentUpload.single('file'), courseCtrl.uploadLessonAttachment);
router.route('/me/lessons/:lessonId/quiz')
    .get(orgCourse.ownsLessonParam('lessonId'), quizCtrl.getQuizByLesson)
    .post(orgCourse.ownsLessonParam('lessonId'), quizCtrl.saveQuiz);
router.route('/me/lessons/:id')
    .put(orgCourse.ownsLessonParam(), orgCourse.ownsBodyModule(false), courseCtrl.updateLesson)
    .delete(orgCourse.ownsLessonParam(), courseCtrl.deleteLesson);

router.post('/me/vdocipher/upload-credentials', vdoCipherController.getUploadCredentials);
router.get('/me/vdocipher/status/:videoId', orgCourse.ownsVideo, vdoCipherController.getVideoStatus);
router.delete('/me/vdocipher/video/:videoId', orgCourse.ownsVideo, async (req, res) => {
    const success = await vdoCipherController.deleteVideo(req.params.videoId);
    if (success) res.status(200).json({ message: 'Video deleted' });
    else res.status(500).json({ message: 'Failed to delete video' });
});

// ── Student ─────────────────────────────────────────────────────────────────
router.use('/student', protectUser);
// No DELETE here on purpose: a student cannot leave an organization themselves.
// See the note at the top of controllers/studentController.js.
router.get('/student/me', studentCtrl.getMyMembership);
router.get('/student/lookup/:code', studentCtrl.lookupOrganization);
router.post('/student/requests', studentCtrl.createRequest);
router.delete('/student/requests/:requestId', studentCtrl.cancelRequest);

// A mistyped path inside this module should say so, rather than falling through
// to the SPA's catch-all and answering with HTML.
router.use((req, res) => {
    res.status(404).json({ message: `No such endpoint: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
