/**
 * @description Organizations — schools, colleges and companies that bring their
 *              own students, mounted under /api/organizations.
 *
 *   Public
 *     GET    /types                      the kinds of organization the form offers
 *     GET    /code-available?code=       whether an organization ID is free (lookupLimiter)
 *     POST   /register                   register an organization (creates it `pending`)
 *
 *   Superadmin (protectAdmin + superAdminOnly)
 *     GET    /admin/options              every organization, for a filter dropdown (any platform admin)
 *     GET    /admin                      the list, with search and status/type filters (?page= opt-in)
 *     POST   /admin                      create an organization and its administrator
 *     GET    /admin/students/:studentId  any student's learning record
 *     GET    /admin/:id                  one organization in full
 *     PUT    /admin/:id                  edit its details
 *     DELETE /admin/:id                  delete a rejected, never-approved, empty registration
 *     GET    /admin/:id/audit            the latest 100 audit rows
 *     PUT    /admin/:id/status           approve, reject, suspend, reinstate
 *     POST   /admin/:id/send-password-reset  email its admin a one-use reset link (never sets a password)
 *     PUT    /admin/:id/competition-hosting  let it host competitions { enabled }
 *     PUT    /admin/:id/three60          unlock 360 for it { enabled }
 *     GET    /admin/:id/students         its students, with progress (?page= opt-in)
 *     GET    /admin/:id/assignable       students who could be put into it
 *     POST   /admin/:id/students         put a student into it
 *     DELETE /admin/:id/students/:sid    take a student out of it
 *
 *   Organization admin (protectOrgAdmin + requireActiveOrganization)
 *     GET    /me                         my organization
 *     PUT    /me                         edit my details
 *     GET    /me/dashboard               headline numbers and recent activity
 *     POST   /me/logo                    upload my institution's logo
 *     GET    /me/students                my students (?page=&limit=&search=&sort=&filter= opt-in)
 *     GET    /me/students/:studentId     one of my students, in full
 *     DELETE /me/students/:studentId     remove them from my organization
 *     GET    /me/requests                students asking to join
 *     GET    /me/requests/count          { pending } for the navigation badge
 *     PUT    /me/requests/:requestId     approve or reject
 *     *      /me/teachers/…              its teachers and their join requests (src/teacher/orgAdmin.js)
 *     *      /me/nccnss/…                NCC/NSS members, activities, events (src/nccnss/orgAdmin.js)
 *     *      /me/users, /me/audit        its users with full rights, and who did what (./users.js)
 *     *      /me/bsg/…                   BSG notices: an office publishes, everyone reads the feed (src/nccnss/notices.js)
 *     *      /me/campus/…                Campus: the student management system (src/campus/orgAdmin.js)
 *
 *   Organization admin, before approval (protectOrgAdmin only)
 *     GET    /me/status                  where my application stands
 *     PUT    /me/password                change my own sign-in password
 *
 *   Student (protectUser)
 *     GET    /student/me                 my organization, or my pending request
 *     GET    /student/lookup/:code       find an active organization by its ID (lookupLimiter)
 *     POST   /student/requests           ask to join
 *     DELETE /student/requests/:id       withdraw my request (a request, not a membership)
 *     POST   /student/leave              leave an organization that is no longer active
 *     *      /student/nccnss/…           my NCC/NSS record (src/nccnss/student.js)
 *
 * Route order matters in two places, both marked below: a literal path that
 * would otherwise be swallowed by `/:id`, and the status endpoint that has to
 * sit in front of the active-organization gate.
 */
const generateToken = require('../utils/generateToken');
const express = require('express');
const router = express.Router();

const { protectAdmin, superAdminOnly, protectUser } = require('../middleware/authMiddleware');
const { protectOrgAdmin, requireActiveOrganization } = require('./middleware/authMiddleware');
const { authLimiter, lookupLimiter } = require('../middleware/rateLimiter');

const publicCtrl = require('./controllers/publicController');
const superCtrl = require('./controllers/superAdminController');
const orgCtrl = require('./controllers/orgAdminController');
const studentCtrl = require('./controllers/studentController');
const Organization = require('./models/Organization');

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/types', publicCtrl.getOrganizationTypes);
// Asked as the organization ID is typed, on the public form and the superadmin's.
// Public and asked per keystroke-pause, so it has its own light limiter: enough
// for a person typing, not for a script walking every possible ID.
router.get('/code-available', lookupLimiter, publicCtrl.checkOrgCodeAvailable);
// Rate-limited with the same limiter as the other public credential-creating
// endpoints, because this one creates an account.
router.post('/register', authLimiter, publicCtrl.registerOrganization);
// A college's public admission form (2026-11-16, src/campus/apply.js): read, and send an application.
router.use('/apply', require('../campus/apply'));

// ── Superadmin ──────────────────────────────────────────────────────────────
// `options` fills the organization filter on the existing student list, so it is
// open to any platform administrator rather than superadmins alone.
router.get('/admin/options', protectAdmin, superCtrl.getOrganizationOptions);

router.use('/admin', protectAdmin, superAdminOnly);
router.route('/admin').get(superCtrl.listOrganizations).post(superCtrl.createOrganization);
// Ahead of '/admin/:id', or "students" is read as an organization id.
router.get('/admin/students/:studentId', superCtrl.getAnyStudentProgress);
router.route('/admin/:id').get(superCtrl.getOrganization).put(superCtrl.updateOrganization).delete(superCtrl.deleteOrganization);
router.get('/admin/:id/audit', superCtrl.getAuditLog);
router.put('/admin/:id/status', superCtrl.setOrganizationStatus);
router.post('/admin/:id/send-password-reset', superCtrl.sendAdminPasswordReset);
router.put('/admin/:id/course-access', superCtrl.setCourseAccess);
router.put('/admin/:id/competition-hosting', superCtrl.setCompetitionHosting);
router.put('/admin/:id/three60', superCtrl.setThree60Access);
router.put('/admin/:id/campus', superCtrl.setCampusAccess);
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
router.get('/me/status', async (req, res) => {
    // Campus (src/campus): whether it is on, and which department a department's sign-in belongs to.
    let campus = null;
    if (req.organization.campusAllowed) {
        const role = req.viewingAsSuperAdmin || !req.admin.staff ? 'admin' : req.admin.campusExamBoard ? 'board' : req.admin.campusOffice ? 'admission' : req.admin.campusDepartmentId ? 'department' : 'teacher';
        let department = null;
        if (role === 'department') {
            const org = await Organization.findById(req.organization._id).select('campus.departments').lean().catch(() => null);
            const d = (org?.campus?.departments || []).find((x) => String(x._id) === String(req.admin.campusDepartmentId));
            department = d ? { _id: d._id, name: d.name, code: d.code } : null;
        }
        campus = { role, department };
    }
    res.json({
        campus,
        organization: {
            orgCode: req.organization.orgCode,
            name: req.organization.name,
            logo: req.organization.logo || '',
            status: req.organization.status,
            statusReason: req.organization.statusReason || '',
            typeLabel: Organization.TYPE_LABELS[req.organization.organizationType] || 'Other',
            registeredAt: req.organization.createdAt,
            // A Bharat Scouts & Guides office: the app shows its own menu (notices first).
            bsgOffice: req.organization.bsgOffice || '',
            // What it calls 360 (src/three60): its menu shows this.
            rankingName: String(req.organization.three60?.title || '').trim() || 'Student Ranking',
            state: req.organization.state || ''
        },
        // A teacher signed in to the organization panel: the app shows them
        // only what they may use, and Research when they have the teacher dashboard too.
        staff: req.admin.staff ? { name: req.admin.name, research: Boolean(req.admin.staffTeacherId), department: Boolean(req.admin.campusDepartmentId), board: Boolean(req.admin.campusExamBoard), office: Boolean(req.admin.campusOffice) } : null
    });
});

/**
 * Research, for a teacher who has both dashboards: a teacher-dashboard session
 * for their own teacher account, which the panel opens inside itself. Only
 * their own account, only while it is active and still this organization's.
 */
router.get('/me/research-session', async (req, res) => {
    try {
        if (!req.admin.staffTeacherId) return res.status(403).json({ message: 'This account has no teacher dashboard.' });
        // In front of the active gate (it sits beside /me/status), so it checks the organization itself.
        if (req.organization.status !== 'active') return res.status(403).json({ message: 'Your organization does not currently have access.' });
        const { Teacher } = require('../teacher/models');
        const teacher = await Teacher.findOne({ _id: req.admin.staffTeacherId, organizationId: req.organization._id, status: 'active' });
        if (!teacher) return res.status(403).json({ message: 'Your teacher account is not active in this organization.' });
        if (!teacher.cardNumber) return res.status(403).json({ code: 'NO_RESEARCH', message: 'Research comes with an AI card. This teacher account runs clubs and Scouts units only.' });
        res.json({ token: generateToken(teacher._id, 'teacher'), teacher: require('../teacher/auth').view(teacher) });
    } catch (error) {
        console.error('[organizations] research session failed:', error.message);
        res.status(500).json({ message: 'Could not open Research just now.' });
    }
});

/**
 * Changing my own password is in front of the active gate too: it touches
 * only the account itself, and a pending or suspended organization should
 * still be able to secure its sign-in. Superadmins viewing a panel are
 * refused in protectOrgAdmin and again in the controller.
 */
router.put('/me/password', orgCtrl.changeMyPassword);

router.use('/me', requireActiveOrganization);
router.route('/me').get(orgCtrl.getMyOrganization).put(orgCtrl.updateMyOrganization);
router.get('/me/dashboard', orgCtrl.getDashboard);
router.route('/me/students').get(orgCtrl.getStudents).post(orgCtrl.addStudent);
// Scan cards: check each, then add the lot (controllers/orgCardController.js).
const orgCards = require('./controllers/orgCardController');
router.route('/me/cards').get(orgCards.listCards).post(orgCards.linkCards);
// Access hours: when the organization's students may use the platform.
const accessSchedule = require('./services/accessSchedule');
const scheduleAnswer = (schedule) => ({ schedule, hours: accessSchedule.describe(schedule), ...accessSchedule.statusAt(schedule) });
router.get('/me/schedule', (req, res) => res.json(scheduleAnswer(req.organization.accessSchedule || { enabled: false, days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' })));
router.put('/me/schedule', async (req, res) => {
    try {
        const { schedule, error } = accessSchedule.cleanSchedule(req.body || {});
        if (error) return res.status(400).json({ message: error });
        await Organization.updateOne({ _id: req.organization._id }, { $set: { accessSchedule: schedule } });
        accessSchedule.forget(req.organization._id);
        await require('./models/OrgAuditLog').record({ orgId: req.organization._id, admin: req.admin, action: 'access-hours', req, details: schedule });
        res.json({ ...scheduleAnswer(schedule), message: schedule.enabled ? `Saved. Students can use YATICORPX3 ${accessSchedule.describe(schedule)}.` : 'Saved. Students can use YATICORPX3 at any time.' });
    } catch (error) {
        console.error('[org] access hours failed:', error.message);
        res.status(500).json({ message: 'The access hours could not be saved just now.' });
    }
});
// Games hours: when its students may play the games, and their requests to play (src/games/orgHours.js).
router.use('/me/games-hours', require('../games/orgHours').orgAdmin);
router.post('/me/cards/check', orgCards.checkCard);
router.delete('/me/cards/:id', orgCards.unlinkCard);
// A student's devices: list, residential card, reset (services/deviceRoutes.js). Only their own students.
router.use('/me/students/:studentId/devices', require('../services/deviceRoutes')((req) => require('mongoose').isValidObjectId(req.params.studentId)
    ? require('../models/User').findOne({ _id: req.params.studentId, organizationId: req.organization._id }).select('_id').lean()
    : null));
router.route('/me/students/:studentId').get(orgCtrl.getStudent).delete(orgCtrl.removeStudent);
router.get('/me/requests', orgCtrl.getRequests);
router.get('/me/requests/count', orgCtrl.getRequestCount);
router.put('/me/requests/:requestId', orgCtrl.decideRequest);
// Its teachers: added with a card, or asking to join from the teacher
// dashboard — see src/teacher/orgAdmin.js.
router.use('/me/teachers', require('../teacher/orgAdmin'));
// Announcements to the parents of its students (2026-11-19, src/parent/announcements.js); an admin's, not staff's.
router.use('/me/parent-announcements', require('../parent/announcements').orgAdmin);
// NCC and NSS: members, activities to approve, events and attendance (src/nccnss/).
router.use('/me/nccnss', require('../nccnss/orgAdmin'));
// Its courses and their sections, who teaches each and what (Teachers →
// Courses & sections); 360 uses them too (src/three60).
router.use('/me/classes', require('../three60').orgAdmin);
// Its users (full-rights sign-ins to this panel) and its audit log (./users.js).
router.use('/me', require('./users'));
// Bharat Scouts & Guides notices: an office publishes, every organization reads its feed (src/nccnss/notices.js).
router.use('/me/bsg', require('../nccnss/notices'));
// Campus: departments, admissions, subjects, attendance, marks, fees, exams,
// admit cards, results and feedback (src/campus/orgAdmin.js) — once the superadmin switches it on.
router.use('/me/campus', require('../campus/orgAdmin'));

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
const { cleanBody } = require('../utils/sanitizeUpdate');

router.get('/me/course-access', orgCourse.getCourseAccess);
// Its support tickets, and "not resolved, again" on a resolved one (controllers/ticketController).
{
    const { listTickets, reopenTicket } = require('../controllers/ticketController');
    const orgTickets = (req) => ({ organizationId: req.organization._id, from: 'organization' });
    router.get('/me/tickets', listTickets(orgTickets));
    router.post('/me/tickets/:id/reopen', reopenTicket(orgTickets));
}
// Its students' requests (2026-11-14): tickets a student sent to this organization rather than to YATICORPX3.
// GET /me/student-tickets?status=, POST /me/student-tickets/:id { reply?, status? }.
router.get('/me/student-tickets', async (req, res) => {
    try {
        const Ticket = require('../models/Ticket');
        const q = { to: 'organization', toOrganizationId: req.organization._id };
        if (['open', 'in-progress', 'resolved'].includes(req.query.status)) q.status = req.query.status;
        const rows = await Ticket.find(q).sort('-createdAt').limit(300).lean();
        const open = await Ticket.countDocuments({ to: 'organization', toOrganizationId: req.organization._id, status: { $ne: 'resolved' } });
        res.json({ open, tickets: rows.map((t) => ({ _id: t._id, ref: String(t._id).slice(-6).toUpperCase(), name: t.name, email: t.email, cardNumber: t.cardNumber || '', subject: t.subject, message: t.message, status: t.status, createdAt: t.createdAt, thread: (t.thread || []).map((m) => ({ by: m.by, text: m.text, at: m.at })) })) });
    } catch (error) { console.error('[organizations] student tickets:', error.message); res.status(500).json({ message: 'Could not load the requests.' }); }
});
router.post('/me/student-tickets/:id', async (req, res) => {
    try {
        const Ticket = require('../models/Ticket');
        if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(404).json({ message: 'That request was not found.' });
        const t = await Ticket.findOne({ _id: req.params.id, to: 'organization', toOrganizationId: req.organization._id });
        if (!t) return res.status(404).json({ message: 'That request was not found.' });
        const reply = String(req.body?.reply || '').trim().slice(0, 5000);
        const status = ['open', 'in-progress', 'resolved'].includes(req.body?.status) ? req.body.status : null;
        if (!reply && !status) return res.status(400).json({ message: 'Write a reply or change the status.' });
        if (reply) t.thread.push({ by: 'admin', text: reply, at: new Date() });
        if (status) t.status = status;
        else if (reply && t.status === 'open') t.status = 'in-progress';
        await t.save();
        if (reply) require('../utils/emailService').sendEmail({ to: t.email, toName: t.name, subject: `Reply from ${req.organization.name}: ${t.subject}`, htmlContent: `<div style="font-family:sans-serif;padding:24px"><p>${reply.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])).replace(/\n/g, '<br>')}</p></div>` }).catch(() => {});
        res.json({ message: reply ? 'Reply sent.' : `Marked ${t.status.replace('-', ' ')}.` });
    } catch (error) { console.error('[organizations] student ticket reply:', error.message); res.status(500).json({ message: 'That did not go through.' }); }
});
// A support ticket from the panel: its name, ID and email come from the account, not the form.
router.post('/me/tickets', async (req, res) => {
    try {
        const subject = String(req.body?.subject || '').trim().slice(0, 200);
        const message = String(req.body?.message || '').trim().slice(0, 5000);
        if (!subject || !message) return res.status(400).json({ message: 'Add a subject and a message.' });
        const org = req.organization;
        const email = String(req.body?.email || '').trim() || org.email || '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ field: 'email', message: 'Enter a valid email so we can reply.' });
        const path = typeof req.body?.path === 'string' && /^\/(?!\/)/.test(req.body.path) ? req.body.path.slice(0, 300) : undefined;
        const ticket = await require('../models/Ticket').create({
            name: org.name, email, subject, message, page: 'dashboard', path,
            from: 'organization', organizationId: org._id, orgCode: org.orgCode
        });
        res.status(201).json({ message: 'Your support request has been sent.', ticketId: ticket._id });
    } catch (error) {
        console.error('[organizations] ticket failed:', error.message);
        res.status(500).json({ message: 'Could not send your request just now. Please try again.' });
    }
});
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
// `$set`/`$unset`… and dotted keys are dropped from every body here, before the
// ownership guards read it: otherwise `{ "$set": { "moduleId": … } }` would pass
// a guard that only looks at a top-level `moduleId`, and then move the lesson.
router.use(['/me/courses', '/me/modules', '/me/lessons'], cleanBody);

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
// A malformed id is refused (400) first; then the video must be one this
// organization uploaded — and, to delete it, one no one else's lesson plays.
router.get('/me/vdocipher/status/:videoId', vdoCipherController.requireVideoId, orgCourse.ownsVideo, vdoCipherController.getVideoStatus);
router.delete('/me/vdocipher/video/:videoId', vdoCipherController.requireVideoId, orgCourse.ownsVideoToDelete, async (req, res) => {
    const success = await vdoCipherController.deleteVideo(req.params.videoId);
    if (success) res.status(200).json({ message: 'Video deleted' });
    else res.status(500).json({ message: 'Failed to delete video' });
});

// ── Student ─────────────────────────────────────────────────────────────────
router.use('/student', protectUser);
// The student's own NCC/NSS record (src/nccnss/student.js).
router.use('/student/nccnss', require('../nccnss/student'));
// The Institution dashboard: the student's admission, attendance, marks, fees, exams… (src/campus/student.js).
router.use('/student/campus', require('../campus/student'));
// A student can leave only an organization that is no longer active (or no
// longer exists); an active one answers 409. See the note at the top of
// controllers/studentController.js.
router.get('/student/me', studentCtrl.getMyMembership);
// Whether the student's organization has the platform open now, and when it opens.
router.get('/student/schedule', async (req, res) => {
    try { res.json(await require('./services/accessSchedule').studentAccess(req.user)); } catch (error) {
        console.error('[org] schedule failed:', error.message);
        res.json({ applies: false, open: true });
    }
});
router.get('/student/lookup/:code', lookupLimiter, studentCtrl.lookupOrganization);
router.post('/student/leave', studentCtrl.leaveOrganization);
router.post('/student/games-access', require('../games/orgHours').askToPlay);
router.post('/student/requests', studentCtrl.createRequest);
router.delete('/student/requests/:requestId', studentCtrl.cancelRequest);

// A mistyped path inside this module should say so, rather than falling through
// to the SPA's catch-all and answering with HTML.
router.use((req, res) => {
    res.status(404).json({ message: `No such endpoint: ${req.method} ${req.originalUrl}` });
});

module.exports = router;
