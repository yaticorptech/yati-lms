/**
 * @author Preethesh Kulal
 * @description Data synchronization utilities
 */
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');

// @desc    Sync user activation from Main Website
// @route   POST /api/sync/activate
// @access  Public (Should ideally be protected by an API Key)
const syncActivation = async (req, res) => {
    // Determine mapping, preferring the Website Webhook Database Format if present
    const name = req.body.Name || req.body.name;
    const email = req.body.Email || req.body.email;
    const phone = req.body.Phone || req.body.phone;
    const cardNumber = req.body.CardNumber || req.body.cardNumber;
    const password = req.body.Verification_value || req.body.password;

    // Parse single string vs array of ids for Course_id
    let courseId = req.body.courseId;
    if (req.body.Course_id && Array.isArray(req.body.Course_id) && req.body.Course_id.length > 0) {
        courseId = req.body.Course_id[0];
    } else if (req.body.Course_id) {
        courseId = req.body.Course_id;
    }
    const bundleId = req.body.Bundle_id || req.body.bundleId;
    const accessType = req.body.Access_type || req.body.accessType;

    try {
        // Basic validation
        if (!email || !phone || !cardNumber || (!courseId && !bundleId)) {
            return res.status(400).json({ message: 'Missing required sync data. Email, Phone, Card Number, and Course/Bundle ID are needed.' });
        }

        // Ensure CardNumber string conversion
        const cNumberStr = cardNumber.toString();

        // 1. Upsert User
        let user = await User.findOne({ cardNumber: cNumberStr });
        if (!user) {
            // Create new user with raw password
            user = await User.create({
                name: name || 'Website Sync User',
                email,
                phone: phone.toString(),
                cardNumber: cNumberStr,
                password: password || cNumberStr,
                status: 'active'
            });
        } else {
            // Update existing
            user.name = name || user.name;
            user.email = email || user.email;
            user.phone = phone.toString();
            user.password = password || user.password;
            user.status = 'active';
            await user.save();
        }

        // 2. Create Enrollment
        const enrollmentType = accessType === 'Bundle' || bundleId ? 'Bundle' : 'Course';

        // Check if enrollment already exists to make it idempotent
        const query = { userId: user._id, type: enrollmentType };
        if (enrollmentType === 'Bundle') query.bundleId = bundleId;
        if (enrollmentType === 'Course') query.courseId = courseId;

        let enrollment = await Enrollment.findOne(query);

        if (!enrollment) {
            enrollment = await Enrollment.create({
                userId: user._id,
                courseId: enrollmentType === 'Course' ? courseId : undefined,
                bundleId: enrollmentType === 'Bundle' ? bundleId : undefined,
                type: enrollmentType,
                assignedBy: 'system'
            });
        }

        res.status(200).json({
            message: 'Sync successful',
            user: { id: user._id, name: user.name },
            enrollmentCreated: enrollment._id
        });
    } catch (error) {
        res.status(500).json({ message: 'Sync Server error', error: error.message });
    }
};

module.exports = { syncActivation };
