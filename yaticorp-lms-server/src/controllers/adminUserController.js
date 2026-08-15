/**
 * @author Preethesh Kulal
 * @description Admin CRUD for student accounts including bulk upload and QR card assignment
 */
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const { sendEmail } = require('../utils/emailService');
const XLSX = require('xlsx');
const Card = require('../models/Card');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getUsers = async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
// @desc    Get user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // ✅ FIX: Safe Card lookup (keep capital CardNumber)
        const card = await Card.findOne({
            CardNumber: String(user.cardNumber).trim()
        });

        // ✅ FIX: Prefer user.qrNumber first (important)
        const userWithQR = {
            ...user.toObject(),
            qrNumber: user.qrNumber || card?.qrCodeNumber || 'N/A'
        };

        // 🔽 ENROLLMENTS — populate and filter out orphans (deleted course/bundle)
        const rawEnrollments = await Enrollment.find({ userId: user._id })
            .populate('courseId', 'title thumbnail')
            .populate('bundleId', 'title');

        // Collect IDs of orphaned enrollments to clean up
        const orphanIds = rawEnrollments
            .filter(e => (e.type === 'Course' && !e.courseId) || (e.type === 'Bundle' && !e.bundleId))
            .map(e => e._id);

        // Delete orphans silently in background
        if (orphanIds.length > 0) {
            Enrollment.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
        }

        // Only keep enrollments where the referenced course/bundle still exists
        const enrollments = rawEnrollments.filter(e =>
            (e.type === 'Course' && e.courseId) || (e.type === 'Bundle' && e.bundleId)
        );

        // 🔽 PROGRESS
        const courseEnrollments = enrollments.filter(
            e => e.type === 'Course' && e.courseId
        );

        const courseIds = courseEnrollments
            .map(e => e.courseId?._id?.toString())
            .filter(Boolean);

        const progressDocs = await Progress.find({
            userId: user._id,
            courseId: { $in: courseIds }
        }).lean();

        const progressByCourse = {};
        progressDocs.forEach(p => {
            progressByCourse[p.courseId?.toString()] = p;
        });

        const progressSummary = courseEnrollments.map(e => {
            const cid = e.courseId?._id?.toString();
            const prog = progressByCourse[cid] || {};

            return {
                courseId: cid,
                courseTitle: e.courseId?.title || 'N/A',
                percentage: prog.percentage ?? 0,
                completedLessons: prog.completedLessons?.length ?? 0,
                passedQuizzes: prog.passedQuizzes?.length ?? 0,
                lastActivity: prog.updatedAt || null
            };
        });

        // ✅ FINAL RESPONSE
        res.json({
            user: userWithQR,
            enrollments,
            progressSummary
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};


// @desc    Update user status (block/unblock)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body; // 'active', 'inactive', 'blocked'
        const user = await User.findById(req.params.id);

        if (user) {
            user.status = status;
            const updatedUser = await user.save();
            res.json(updatedUser);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Add a user manually (optional fallback)
// @route   POST /api/admin/users
// @access  Private/Admin
const addUser = async (req, res) => {
    try {
        const { name, email, phone, cardNumber, cvv, qrCodeNumber, password } = req.body;
        if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
            return res.status(400).json({ message: 'Enter a valid Gmail address' });
        }

        if (!/^[A-Za-z\s]+$/.test(name)) {
            return res.status(400).json({ message: 'Name must contain only alphabets' });
        }
        if (!/^\d{12}$/.test(cardNumber)) {
            return res.status(400).json({ message: 'Card Number must be exactly 12 digits' });
        }

        if (!phone) {
            return res.status(400).json({ message: 'Phone Number is mandatory' });
        }
        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }

        if (!cardNumber || !cvv || !qrCodeNumber) {
            return res.status(400).json({ message: 'Card Number, CVV, and QR Code Number are required' });
        }
        const formattedCVV = String(cvv).toUpperCase();

        if (!/^[A-Z0-9]{5}$/.test(formattedCVV)) {
            return res.status(400).json({
                message: 'CVV must be exactly 5 uppercase alphanumeric characters'
            });
        }

        const userExists = await User.findOne({ $or: [{ email }, { cardNumber }] });

        if (userExists) {
            return res.status(400).json({ message: 'User with this email or card number already exists' });
        }

        const Card = require('../models/Card');
        const card = await Card.findOne({ CardNumber: cardNumber, CVV: formattedCVV, qrCodeNumber });

        if (!card) {
            return res.status(404).json({ message: 'Invalid Card Credentials or Card does not exist' });
        }

        if (card.status === 'used') {
            return res.status(400).json({ message: 'This Card has already been used to register an account' });
        }

        if (card.status === 'inactive') {
            return res.status(400).json({ message: 'This Card is marked as inactive and restricted from use' });
        }

        // Card is valid (either unactivated or activated), mark it as used
        card.status = 'used';
        await card.save();

       const user = await User.create({
    name,
    email,
    phone,
    cardNumber: cardNumber,
    serialNumber: card.SerialNumber || '',
    qrNumber: card.qrCodeNumber || '',
    password
});

        // Send Welcome Email
        try {
            const loginUrl = process.env.VITE_STUDENT_URL || 'http://localhost:5173';
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                    <h2 style="color: #4F46E5;">Welcome to YATICORP LMS!</h2>
                    <p>Hi <strong>${user.name}</strong>,</p>
                    <p>An administrator has created an account for you. Welcome aboard!</p>
                    <p>Here are your login details:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                        <p style="margin: 0 0 10px 0;"><strong>Username / Email:</strong> ${user.email}</p>
                        <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
                    </div>
                    <p style="color: #d97706; font-size: 0.9em;">
                        <em>Please login and change your password as soon as possible for security purposes.</em>
                    </p>
                    <p style="margin-top: 25px;">
                        <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            Go to Student Dashboard
                        </a>
                    </p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                    <p style="font-size: 0.8em; color: #6b7280;">If you have any issues logging in, please contact your administrator or support.</p>
                </div>
            `;

            await sendEmail({
                to: user.email,
                toName: user.name,
                subject: 'Welcome to YATICORP LMS! Your Account Details',
                htmlContent: emailHtml,
            });
        } catch (emailErr) {
            console.error('[Admin] Failed to send welcome email to newly created user:', emailErr);
            // We don't fail the request if the email fails, we just log it.
        }

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            cardNumber: user.cardNumber,
            status: user.status
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // 1. Delete all enrollments for this user
        await Enrollment.deleteMany({ userId: user._id });

        // 2. If user has a card number, reset its status to unactivated so it can be used again
        if (user.cardNumber) {
            // Import Card model dynamically if not at top, or just require it at top.
            // Assuming it's required at the top:
            const Card = require('../models/Card');
            const card = await Card.findOne({ CardNumber: user.cardNumber });
            if (card) {
                card.status = 'unactivated';
                await card.save();
            }
        }

        // 3. Delete the user document
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'User removed successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
    try {
        const { name, email, phone, cardNumber, qrNumber, password } = req.body;

        const user = await User.findById(req.params.id);


        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (email && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
            return res.status(400).json({ message: 'Enter a valid Gmail address' });
        }
        if (name && !/^[A-Za-z\s]+$/.test(name)) {
            return res.status(400).json({ message: 'Name must contain only alphabets' });
        }
        if (cardNumber && !/^\d{12}$/.test(cardNumber)) {
            return res.status(400).json({ message: 'Card Number must be exactly 12 digits' });
        }
        // Validate phone number if provided
        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
        }

        // ✅ Update fields
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.cardNumber = cardNumber || user.cardNumber;

        // ✅ NEW: QR Number
        user.qrNumber = qrNumber || user.qrNumber;

        // ✅ Password update (hashed via pre-save hook)
        if (password) {
            user.password = password;
        }

        const updatedUser = await user.save();

        // ✅ Send response (include qrNumber)
       res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    cardNumber: updatedUser.cardNumber,
    qrNumber: updatedUser.qrNumber, // ✅ ADD THIS LINE
    status: updatedUser.status
});

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Reset a user's course progress
// @route   DELETE /api/admin/users/:id/progress/:courseId
// @access  Private/Admin
const resetProgress = async (req, res) => {
    try {
        const { id, courseId } = req.params;
        const result = await Progress.findOneAndDelete({ userId: id, courseId });
        if (!result) {
            return res.status(404).json({ message: 'No progress record found for this user and course.' });
        }
        res.json({ message: 'Course progress has been reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Bulk add users via Excel
// @route   POST /api/admin/users/bulk
// @access  Private/Admin
const bulkAddUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            return res.status(400).json({ message: 'Excel file is empty' });
        }

        const results = {
            successCount: 0,
            failedCount: 0,
            errors: []
        };

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowIndex = i + 2; // +1 for 0-indexed, +1 for header row
            const { Name, Email, Phone, CardNumber, CVV, QRCodeNumber, Password } = row;
            // 🔧 Normalize all inputs
            const formattedCVV = String(CVV).toUpperCase();
            const formattedCardNumber = String(CardNumber);
            const formattedPhone = String(Phone);



            try {


                // ✅ Required fields
                if (!Name || !Email || !Phone || !CardNumber || !CVV || !QRCodeNumber || !Password) {
                    throw new Error(`Missing required fields at row ${rowIndex}`);
                }

                // ✅ NAME
                if (!/^[A-Za-z\s]+$/.test(Name)) {
                    throw new Error(`Name must contain only alphabets at row ${rowIndex}`);
                }

                // ✅ EMAIL
                if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(Email)) {
                    throw new Error(`Invalid Gmail format at row ${rowIndex}`);
                }

                // ✅ PHONE
                if (!/^\d{10}$/.test(formattedPhone)) {
                    throw new Error(`Phone must be exactly 10 digits at row ${rowIndex}`);
                }

                // ✅ CARD
                if (!/^\d{12}$/.test(formattedCardNumber)) {
                    throw new Error(`Card Number must be exactly 12 digits at row ${rowIndex}`);
                }
                // Basic validation
                if (!Name || !Email || !Phone || !CardNumber || !CVV || !QRCodeNumber || !Password) {
                    throw new Error(`Missing required fields at row ${rowIndex}`);
                }

                if (!Email.toLowerCase().endsWith('@gmail.com')) {
                    throw new Error(`Only @gmail.com email addresses are allowed at row ${rowIndex}`);
                }
                // 🔒 Validate CVV: must be exactly 5 uppercase alphanumeric characters
                if (!/^[A-Z0-9]{5}$/.test(formattedCVV)) {
                    throw new Error(`CVV must be 5 characters long and contain only uppercase letters and numbers at row ${rowIndex}`);
                }

                // Check for existing user
                const userExists = await User.findOne({ $or: [{ email: Email }, { cardNumber: String(CardNumber) }] });
                if (userExists) {
                    throw new Error(`User with email ${Email} or card number ${CardNumber} already exists`);
                }

                // Validate Card
                const card = await Card.findOne({ CardNumber: formattedCardNumber, CVV: formattedCVV, qrCodeNumber: String(QRCodeNumber) });
                if (!card) {
                    throw new Error(`Invalid Card Credentials for card ${CardNumber} at row ${rowIndex}`);
                }

                if (card.status === 'used') {
                    throw new Error(`Card ${CardNumber} is already used at row ${rowIndex}`);
                }

                if (card.status === 'inactive') {
                    throw new Error(`Card ${CardNumber} is inactive at row ${rowIndex}`);
                }

                // Create User
                card.status = 'used';
                await card.save();
                                        const user = await User.create({
                            name: Name,
                            email: Email,
                            phone: Phone,
                            cardNumber: String(CardNumber),
                            serialNumber: card.SerialNumber || '',
                            qrNumber: card.qrCodeNumber || '',
                            password: Password
                        });


                // Send Welcome Email (individual for now, consider batching if needed later)
                try {
                    const loginUrl = process.env.VITE_STUDENT_URL || 'http://localhost:5173';
                    const emailHtml = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                            <h2 style="color: #4F46E5;">Welcome to YATICORP LMS!</h2>
                            <p>Hi <strong>${user.name}</strong>,</p>
                            <p>An administrator has created an account for you via bulk upload. Welcome aboard!</p>
                            <p>Here are your login details:</p>
                            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
                                <p style="margin: 0 0 10px 0;"><strong>Username / Email:</strong> ${user.email}</p>
                                <p style="margin: 0;"><strong>Password:</strong> ${Password}</p>
                            </div>
                            <p style="color: #d97706; font-size: 0.9em;">
                                <em>Please login and change your password as soon as possible for security purposes.</em>
                            </p>
                            <p style="margin-top: 25px;">
                                <a href="${loginUrl}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                    Go to Student Dashboard
                                </a>
                            </p>
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                            <p style="font-size: 0.8em; color: #6b7280;">If you have any issues logging in, please contact your administrator or support.</p>
                        </div>
                    `;

                    await sendEmail({
                        to: user.email,
                        toName: user.name,
                        subject: 'Welcome to YATICORP LMS! Your Account Details',
                        htmlContent: emailHtml,
                    });
                } catch (emailErr) {
                    console.error(`[BulkUpload] Failed to send welcome email to ${Email}:`, emailErr);
                }

                results.successCount++;
            } catch (rowErr) {
                results.failedCount++;
                results.errors.push({
                    row: rowIndex,
                    email: Email || 'N/A',
                    message: rowErr.message
                });
            }
        }

        res.status(200).json({
            message: `Bulk upload completed with ${results.successCount} successes and ${results.failedCount} failures.`,
            results
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during bulk upload', error: error.message });
    }
};

module.exports = {
    getUsers,
    getUserById,
    updateUserStatus,
    addUser,
    deleteUser,
    updateUser,
    resetProgress,
    bulkAddUsers
};
