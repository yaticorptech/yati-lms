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

            // Counted before the response is shaped, so `loginCount` below is
            // this sign-in's number rather than the previous one — the client
            // uses it to tell a returning student from a brand new one.
            user.loginCount = (user.loginCount || 0) + 1;
            await user.save();

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                cardNumber: user.cardNumber,
                profilePicture: user.profilePicture || '',
                credits: user.credits || 0,
                loginCount: user.loginCount,
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

// Pictures set through the plain profile update must be an empty string
// (back to initials), one of the avatar illustrations bundled with the
// student app, a DiceBear avatar, or a Cloudinary upload we already hold.
// Anything else could turn the avatar into a link to any image online.
// Bundled avatars arrive as a relative path; when FRONTEND_URL is set they
// are stored absolute so the admin panel, on its own origin, can show them.
const ALLOWED_PICTURE_HOSTS = ['api.dicebear.com', 'res.cloudinary.com'];
// The avatar files shipped with the student app. The extension is open
// because the artwork has been re-encoded before (PNG → JPEG) and a picture
// a student already saved must keep working across that change.
const BUNDLED_AVATAR = /^\/avatars\/(boys|girls|kids|elders)\/([1-9]|1\d)\.(png|jpe?g|webp)$/i;
const frontendHost = () => {
    try { return new URL(process.env.FRONTEND_URL).hostname; } catch { return null; }
};
const normalizePictureUrl = (value) => {
    if (value === '') return '';
    if (BUNDLED_AVATAR.test(value)) {
        const base = (process.env.FRONTEND_URL || '').replace(/\/+$/, '');
        return base ? `${base}${value}` : value;
    }
    try {
        const url = new URL(value);
        const hosts = [...ALLOWED_PICTURE_HOSTS, frontendHost()].filter(Boolean);
        if (url.protocol !== 'https:' && url.hostname !== frontendHost()) return null;
        if (!hosts.includes(url.hostname)) return null;
        if (url.hostname === frontendHost() && !BUNDLED_AVATAR.test(url.pathname)) return null;
        return value;
    } catch {
        return null;
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
            if (req.body.profilePicture !== undefined) {
                const pic = normalizePictureUrl(String(req.body.profilePicture || '').trim());
                if (pic === null) {
                    return res.status(400).json({ message: 'Profile picture must be an uploaded photo or a chosen avatar' });
                }
                user.profilePicture = pic;
            }

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
