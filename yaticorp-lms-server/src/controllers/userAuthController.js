/**
 * @author Preethesh Kulal
 * @description Student login with auto org detection from card number
 */
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const generateToken = require('../utils/generateToken');
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');

// @desc    Auth user & get token
// @route   POST /api/user/login
// @access  Public
const loginUser = async (req, res) => {
    const { cardNumber, password } = req.body;

    try {
        const user = await User.findOne({ cardNumber });

        if (user && (await user.matchPassword(password))) {
            if (user.status !== 'active') {
                return res.status(401).json({ message: 'User account is not active' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                cardNumber: user.cardNumber,
                profilePicture: user.profilePicture || '',
                credits: user.credits || 0,
                role: 'student',
                token: generateToken(user._id, 'student')
            });
        } else {
            res.status(401).json({ message: 'Invalid card number or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get user profile & enrollments
// @route   GET /api/user/profile
// @access  Private/User
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch user enrollments and populate related courses or bundles
        const enrollments = await Enrollment.find({ userId: req.user._id })
            .populate('courseId', 'title thumbnail isPublished')
            .populate('bundleId', 'title thumbnail isPublished');

        res.json({
            user,
            enrollments
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private/User
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.email = req.body.email || user.email;
            user.phone = req.body.phone || user.phone;
            if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;

            if (req.body.password) {
                user.password = req.body.password;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                cardNumber: updatedUser.cardNumber,
                profilePicture: updatedUser.profilePicture || '',
                credits: updatedUser.credits || 0,
                role: 'student',
                token: generateToken(updatedUser._id, 'student'),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Upload / update profile picture via Cloudinary (server-side)
// @route   POST /api/user/profile/picture
// @access  Private/User
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Upload buffer to Cloudinary
        const profilePicture = await uploadToCloudinary(req.file.buffer, 'lms_profile');

        // Save URL to MongoDB
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profilePicture },
            { new: true }
        );

        res.json({ profilePicture: user.profilePicture });
    } catch (error) {
        console.error('Profile picture upload error:', error);
        res.status(500).json({ message: 'Upload failed', error: error.message });
    }
};

module.exports = {
    loginUser,
    getUserProfile,
    updateUserProfile,
    uploadProfilePicture,
};
