/**
 * @author Preethesh Kulal
 * @description Admin management of student enrollments in courses and bundles
 */
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @desc    Get all enrollments
// @route   GET /api/admin/enrollments
// @access  Private/Admin
const getEnrollments = async (req, res) => {
    try {
        const orgUsers = await User.find({}, '_id').lean();
        const orgUserIds = orgUsers.map(u => u._id);
        const enrollments = await Enrollment.find({ userId: { $in: orgUserIds } })
            .populate('userId', 'name email cardNumber')
            .populate('courseId', 'title')
            .populate('bundleId', 'title')
            .sort('-assignedAt');
        res.json(enrollments);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Admin assigns a course or bundle to a user
// @route   POST /api/admin/enrollments
// @access  Private/Admin
const createEnrollment = async (req, res) => {
    try {
        const { userId, courseId, bundleId, type } = req.body; // type: 'Course' or 'Bundle'

        const userExists = await User.findById(userId);
        if (!userExists) return res.status(404).json({ message: 'User not found' });

        // Idempotency check
        const query = { userId, type };
        if (type === 'Course') query.courseId = courseId;
        if (type === 'Bundle') query.bundleId = bundleId;

        const existing = await Enrollment.findOne(query);
        if (existing) {
            return res.status(400).json({ message: 'User is already enrolled in this content' });
        }

        const enrollment = await Enrollment.create({
            userId,
            courseId: type === 'Course' ? courseId : undefined,
            bundleId: type === 'Bundle' ? bundleId : undefined,
            type,
            assignedBy: 'admin'
        });

        // Also update the User profile
        if (type === 'Course') {
            await User.findByIdAndUpdate(userId, { $addToSet: { enrolledCourses: courseId } });
        } else if (type === 'Bundle') {
            await User.findByIdAndUpdate(userId, { $addToSet: { enrolledBundles: bundleId } });
        }

        res.status(201).json(enrollment);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete an enrollment
// @route   DELETE /api/admin/enrollments/:id
// @access  Private/Admin
const deleteEnrollment = async (req, res) => {
    try {
        const enrollment = await Enrollment.findById(req.params.id);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        // Remove from user's active arrays
        if (enrollment.type === 'Course') {
            await User.findByIdAndUpdate(enrollment.userId, { $pull: { enrolledCourses: enrollment.courseId } });
        } else if (enrollment.type === 'Bundle') {
            await User.findByIdAndUpdate(enrollment.userId, { $pull: { enrolledBundles: enrollment.bundleId } });
        }

        await enrollment.deleteOne();
        res.json({ message: 'Enrollment removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    getEnrollments, createEnrollment, deleteEnrollment
};
