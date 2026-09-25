/**
 * @description Organizations — schools, colleges and companies that bring their
 *              own students, mounted under /api/organizations.
 *
 *   Public
 *     GET    /types                      the kinds of organization the form offers
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

// Bring the code counter up to whatever is already stored, so a database
// restored without its counter does not start reissuing 0001. Runs
// once, in the background; a failure here only costs a retry per registration.
require('./services/orgCode').syncCounterFromExisting()
    .catch((error) => console.error('[organizations] could not sync the ID counter:', error.message));

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/types', publicCtrl.getOrganizationTypes);
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
