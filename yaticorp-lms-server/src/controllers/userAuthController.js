/**
 * @author Preethesh Kulal
 * @description Student login with auto org detection from card number
 */
const User = require('../models/User');
const { findUserByCardNumber } = require('../utils/cardNumber');
const Enrollment = require('../models/Enrollment');
const generateToken = require('../utils/generateToken');

// @desc    Auth user & get token
// @route   POST /api/user/login
// @access  Public
const loginUser = async (req, res) => {
    const { cardNumber, password } = req.body;

    try {
        const user = await findUserByCardNumber(cardNumber);

        if (user && (await user.matchPassword(password))) {
            if (user.status !== 'active') {
                return res.status(401).json({ message: 'User account is not active' });
            }

            // Counted before the response is shaped, so `loginCount` below is
            // this sign-in's number rather than the previous one — the client
            // uses it to tell a returning student from a brand new one.
            // A targeted $inc, not save(): save() validates the whole record,
            // and an older account missing a field today's schema requires
            // (a phone, say) failed it — so a right password answered 500.
            await User.updateOne({ _id: user._id }, { $inc: { loginCount: 1 } });
            const loginCount = (user.loginCount || 0) + 1;
            // A card an organization scanned in brings its student into it (organizations/services/cardLink.js).
            await require('../organizations/services/cardLink').joinByCard(user);

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                cardNumber: user.cardNumber,
                profilePicture: user.profilePicture || '',
                credits: user.credits || 0,
                // Saved with the rest on the device, so the Dashboard's
                // banner opens on the student's own level rather than on
                // "Level 1" until the profile has loaded.
                xp: user.xp || 0,
                level: user.level || 1,
                loginCount,
                role: 'student',
                token: generateToken(user._id, 'student')
            });
        } else if (!user && await require('../teacher/auth').findTeacherByCard(cardNumber)) {
            // A teacher's card, at the student sign-in: say where it belongs.
            res.status(401).json({ code: 'TEACHER_CARD', message: 'This card is registered to a teacher account. Choose Teacher to sign in.' });
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
        await tidyStoredEmail(user);

        // Fetch user enrollments and populate related courses or bundles
        const enrollments = await Enrollment.find({ userId: req.user._id })
            .populate('courseId', 'title thumbnail isPublished')
            .populate('bundleId', 'title thumbnail isPublished');

        res.json({
            user,
            enrollments
        });
    } catch (error) {
        console.error('[profile] read failed:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Emails are kept trimmed and lower-case, as sign-up stores them, and no two
// accounts may share one in any mix of capitals. The database's own unique
// index only refuses an exact match, so the comparison is made here.
const EMAIL_TAKEN = 'An account already uses this email address. Use another one.';
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const emailTaken = (email, exceptId) =>
    User.exists({ email: new RegExp(`^\\s*${escapeRegExp(email)}\\s*$`, 'i'), _id: { $ne: exceptId } });

// An older account — or one whose email was edited before the profile save
// tidied it — may still hold capitals or spaces. Put right on read, unless
// another account already has the tidy form: two accounts sharing an address
// are left for an administrator, never merged by guesswork.
const tidyStoredEmail = async (user) => {
    const clean = String(user.email || '').trim().toLowerCase();
    if (!clean || clean === user.email) return;
    if (await emailTaken(clean, user._id)) return;
    try {
        await User.updateOne({ _id: user._id }, { $set: { email: clean } });
        user.email = clean;
    } catch { /* taken in the meantime: left as it was */ }
};

// The same rules as the Edit Profile form. They were only ever checked in the
// browser, so a request made any other way saved a name of spaces, "abc" as a
// phone or an email with no @. Only the fields sent are checked: the photo
// picker sends the picture alone.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHARACTERS = /^\+?[\d\s().-]+$/;
const readDetails = (body) => {
    const changes = {};
    const errors = {};
    if (body.name !== undefined) {
        const name = String(body.name ?? '').trim();
        if (!name) errors.name = 'Name is required';
        else if (name.length < 2) errors.name = 'Name must be at least 2 characters';
        else if (name.length > 60) errors.name = 'Name must be 60 characters or less';
        else changes.name = name;
    }
    if (body.email !== undefined) {
        const email = String(body.email ?? '').trim().toLowerCase();
        if (!email) errors.email = 'Email is required';
        else if (email.length > 254 || !EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address (e.g. name@domain.com)';
        else changes.email = email;
    }
    if (body.phone !== undefined) {
        const phone = String(body.phone ?? '').trim();
        const digits = phone.replace(/\D/g, '').length;
        if (!phone) errors.phone = 'Phone number is required';
        else if (!PHONE_CHARACTERS.test(phone) || digits < 7 || digits > 15) errors.phone = 'Phone must be 7–15 digits (international format supported, e.g. +91 98765 43210)';
        else changes.phone = phone;
    }
    return { changes, errors };
};

// Pictures set through the plain profile update must be one of the avatar
// illustrations bundled with the student app, a DiceBear avatar, or a
// Cloudinary upload we already hold — never empty: a profile picture is
// compulsory, so it can be changed but not removed.
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
        const user = await User.findById(req.user._id).select('email').lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.body.profilePicture !== undefined) {
            const pic = normalizePictureUrl(String(req.body.profilePicture || '').trim());
            if (pic === '') {
                return res.status(400).json({ message: 'A profile picture is required. Upload a photo or choose an avatar.' });
            }
            if (pic === null) {
                return res.status(400).json({ message: 'Profile picture must be an uploaded photo or a chosen avatar' });
            }
        }
        const { changes, errors } = readDetails(req.body);
        const wrong = Object.keys(errors);
        if (wrong.length) return res.status(400).json({ message: errors[wrong[0]], field: wrong[0], errors });
        if (req.body.profilePicture !== undefined) changes.profilePicture = normalizePictureUrl(String(req.body.profilePicture).trim());

        // Another student's address, in any capitals, is refused in words.
        // It used to reach the database's unique index and come back as a
        // 500 "Server error" carrying the raw duplicate-key text.
        if (changes.email && changes.email !== user.email && await emailTaken(changes.email, user._id)) {
            return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: EMAIL_TAKEN });
        }

        // No password here. It used to be taken as-is — no current
        // password asked for, no strength rules, and no end to other
        // sessions. Changing it is PUT /api/user/update-password's job.

        // Only the fields sent are written, in one targeted update: save()
        // validated the whole record, so an older account missing a field
        // today's schema requires could not change anything at all.
        const updatedUser = Object.keys(changes).length
            ? await User.findByIdAndUpdate(user._id, { $set: changes }, { returnDocument: 'after' })
            : await User.findById(user._id);

        // No token either. A fresh thirty-day one came back with every
        // save, and the photo picker kept it — so a superadmin's two-hour
        // view-as-student turned into a month-long session. The token the
        // student already holds is unchanged by a profile edit.
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            cardNumber: updatedUser.cardNumber,
            profilePicture: updatedUser.profilePicture || '',
            credits: updatedUser.credits || 0,
            xp: updatedUser.xp || 0,
            level: updatedUser.level || 1,
            role: 'student'
        });
    } catch (error) {
        // Two saves racing for the same address: the index has the last word.
        if (error?.code === 11000 && error.keyPattern?.email) {
            return res.status(400).json({ field: 'email', code: 'EMAIL_TAKEN', message: EMAIL_TAKEN });
        }
        console.error('[profile] update failed:', error.message);
        res.status(500).json({ message: 'Your details could not be saved just now. Please try again.' });
    }
};

// @desc    Upload / update profile picture (server-side → Bunny Storage → MongoDB)
// @route   POST /api/user/profile/picture
// @access  Private/User
// Stored on Bunny, where the platform's other images live. It was Cloudinary,
// until that account was disabled ("401 disabled customer") and every upload
// failed. The student app crops the photo square and shrinks it first.
const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }

        // Looked up at call time, so a test can stand in for the storage.
        const { uploadToBunny } = require('../utils/bunnyStorage');
        const profilePicture = await uploadToBunny(req.file.buffer, 'profile.jpg', 'profile-pictures');

        // Save URL to MongoDB
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { profilePicture },
            { new: true }
        );

        res.json({ profilePicture: user.profilePicture });
    } catch (error) {
        console.error('Profile picture upload error:', error.message);
        res.status(502).json({ message: 'Your photo could not be saved just now. Please try again, or pick an avatar.' });
    }
};

module.exports = {
    loginUser,
    getUserProfile,
    updateUserProfile,
    uploadProfilePicture,
    // The same rule for a teacher's picture (src/teacher/auth.js).
    normalizePictureUrl,
};
