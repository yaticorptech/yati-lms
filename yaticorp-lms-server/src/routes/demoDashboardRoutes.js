/**
 * @description A demo card's dashboards (services/demoDashboards.js), mounted at /api/auth/demo:
 *
 *   POST /open                    { token, dashboard } the card's switch pass, traded for one of
 *                                 its dashboards: 'student' and 'teacher' answer with that session;
 *                                 'organization' with a two-minute pass for the admin app
 *   POST /organization/exchange   { code } that pass, traded by the admin app for the session
 *
 * Both are public: the pass is the credential. A card's scan gives its switch pass
 * (controllers/registrationController.js scanCard), and every answer here gives a fresh one, so
 * whichever dashboard is open can change to another without scanning again.
 */
const express = require('express');
const generateToken = require('../utils/generateToken');
const { authLimiter } = require('../middleware/rateLimiter');
const { findUserByCardNumber } = require('../utils/cardNumber');
const dashboards = require('../services/demoDashboards');

const router = express.Router();
const fail = (res, e, what) => { console.error(`[demo-cards] ${what}:`, e.message); res.status(500).json({ message: `Could not ${what} just now. Please try again.` }); };
const expired = (res) => res.status(410).json({ code: 'DEMO_PASS_INVALID', message: 'This demo session has ended. Scan the demo card again.' });

router.post('/open', authLimiter, async (req, res) => {
    try {
        const card = dashboards.cardForSwitch(req.body?.token);
        if (!card) return expired(res);
        const want = String(req.body?.dashboard || '');
        const demoSwitch = dashboards.switchPass(card);

        if (want === 'student') {
            const User = require('../models/User');
            const found = await findUserByCardNumber(card);
            const user = found ? await User.findById(found._id) : null;
            if (!user) return res.status(404).json({ message: 'This card has no student account. Reset it on Admin → Demo cards.' });
            if (user.status !== 'active') return res.status(403).json({ message: 'This demo account is not active. Unblock it on Admin → Users.' });
            await dashboards.linkStudent(user);
            return require('../controllers/userAuthController').finishLogin(req, res, user, { demo: true, dashboards: dashboards.DASHBOARDS, demoSwitch });
        }
        if (want === 'teacher') {
            const { Teacher } = require('../teacher/models');
            const teacher = await dashboards.ensureTeacher(card);
            if (!teacher) return res.status(404).json({ message: 'This card has no teacher dashboard.' });
            if (teacher.status !== 'active') return res.status(403).json({ message: 'This demo teacher account is not active. Unblock it on Admin → Teachers.' });
            await Teacher.updateOne({ _id: teacher._id }, { $inc: { loginCount: 1 }, $set: { lastLoginAt: new Date() } });
            return res.json({ ...require('../teacher/auth').view(teacher), token: generateToken(teacher._id, 'teacher'), demo: true, demoSwitch });
        }
        if (want === 'organization') {
            const { organization, admin } = await dashboards.ensureOrganization();
            return res.json({
                code: dashboards.organizationPass(admin, card),
                // Where the organisation panel lives, when the server knows; the app works it out otherwise.
                adminUrl: String(process.env.ADMIN_URL || '').trim().replace(/\/+$/, ''),
                organization: { name: organization.name, orgCode: organization.orgCode }
            });
        }
        return res.status(400).json({ message: 'That dashboard is not ready yet.' });
    } catch (e) { fail(res, e, 'open that dashboard'); }
});

router.post('/organization/exchange', authLimiter, async (req, res) => {
    try {
        const admin = await dashboards.adminForPass(req.body?.code);
        if (!admin) return res.status(410).json({ code: 'DEMO_PASS_INVALID', message: 'This link has expired. Scan the demo card again and choose Organisation.' });
        const Organization = require('../organizations/models/Organization');
        const organization = await Organization.findById(admin.organizationId).select('name orgCode status statusReason').lean();
        if (!organization) return res.status(404).json({ message: 'The demo organisation no longer exists. Scan the demo card again.' });
        require('../organizations/models/OrgAuditLog').record({ orgId: organization._id, admin, action: 'Opened from a demo card', req });
        // The same answer the admin sign-in gives an organisation (controllers/adminAuthController.js).
        res.json({
            _id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            requires2FA: false,
            organizationId: String(organization._id),
            organizationName: organization.name,
            orgCode: organization.orgCode,
            organizationStatus: organization.status,
            organizationStatusReason: organization.statusReason || '',
            demo: true,
            // To change to the card's student or teacher dashboard from inside the panel.
            ...(admin.demoCard ? { demoSwitch: dashboards.switchPass(admin.demoCard) } : {}),
            token: generateToken(admin._id, admin.role)
        });
    } catch (e) { fail(res, e, 'open the organisation dashboard'); }
});

module.exports = router;
