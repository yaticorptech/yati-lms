/**
 * Linguistic Ability — a college coordinator's routes, /api/linguistic/org
 * (protectOrgAdmin): the teacher's view of their own college's students. They
 * see progress and quiz results and review open-ended writing and
 * translations, only for students of their organization. Content stays with
 * the platform's administrators.
 *
 *   GET /students · GET /students/:id
 *   GET /submissions · PUT /submissions/:id
 */
const express = require('express');
const { protectOrgAdmin, requireActiveOrganization } = require('../organizations/middleware/authMiddleware');
const { MODULES } = require('./models');
const reports = require('./reports');

const router = express.Router();
router.use(protectOrgAdmin, requireActiveOrganization);

const scope = (req) => ({ organizationId: req.organization._id });
const reviewer = (req) => ({ id: String(req.admin?._id || ''), name: req.admin?.name || 'College coordinator', role: req.admin?.role || 'orgadmin' });

router.get('/students', async (req, res, next) => {
    try { res.json(await reports.listStudents({ search: String(req.query.search || ''), page: Number(req.query.page) || 1, scope: scope(req) })); } catch (err) { next(err); }
});
router.get('/students/:id', async (req, res, next) => {
    try {
        const d = await reports.studentDetail(req.params.id, scope(req));
        if (!d) return res.status(404).json({ message: 'That student was not found in your college.' });
        res.json(d);
    } catch (err) { next(err); }
});
router.get('/submissions', async (req, res, next) => {
    try { res.json(await reports.listSubmissions({ status: String(req.query.status || 'pending'), module: MODULES.includes(req.query.module) ? req.query.module : '', page: Number(req.query.page) || 1, scope: scope(req) })); } catch (err) { next(err); }
});
router.put('/submissions/:id', async (req, res, next) => {
    try {
        const out = await reports.reviewSubmission(req.params.id, req.body || {}, reviewer(req), scope(req));
        if (out.error) return res.status(out.status).json({ message: out.error });
        res.json(out.submission);
    } catch (err) { next(err); }
});

module.exports = router;
