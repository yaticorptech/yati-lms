/**
 * Who may preview a course as a student would see it
 * (GET /api/admin/preview/:courseId, opened by the course builder's Preview).
 *
 * Platform administrators, as before, through protectAdmin. And an
 * organization's administrator — but only for their own organization's
 * course, and only while that organization is active. protectAdmin refuses
 * organization admins everywhere on purpose, which is why Preview answered
 * them "Organization administrators cannot access platform administration";
 * this route alone lets them through, for their own courses. Anything else
 * answers 404, as if it did not exist.
 */
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Course = require('../models/Course');
const { protectAdmin } = require('./authMiddleware');

const protectPreview = async (req, res, next) => {
    const header = req.headers.authorization || '';
    let admin = null;
    if (header.startsWith('Bearer')) {
        try {
            const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
            admin = await Admin.findById(decoded.id).select('-password');
        } catch { /* protectAdmin below says why */ }
    }
    if (admin?.role !== 'orgadmin') return protectAdmin(req, res, next);

    try {
        const Organization = require('../organizations/models/Organization');
        const [course, organization] = await Promise.all([
            Course.findById(req.params.courseId).select('organizationId').lean(),
            Organization.findById(admin.organizationId).select('status').lean()
        ]);
        const ours = course?.organizationId && String(course.organizationId) === String(admin.organizationId);
        if (!ours || organization?.status !== 'active') return res.status(404).json({ message: 'Course not found' });
        req.admin = admin;
        return next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { protectPreview };
