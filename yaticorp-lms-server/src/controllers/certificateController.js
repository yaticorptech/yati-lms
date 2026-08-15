/**
 * @author Preethesh Kulal
 * @description Generates and retrieves student course completion certificates
 */
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const Certificate = require('../models/Certificate');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    Generate Certificate when course is 100% complete
// @route   POST /api/certificates/generate
// @access  Private/User
const generateCertificate = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user._id;

        // 1. Check if progress is 100%
        const progress = await Progress.findOne({ userId, courseId });
        if (!progress || progress.percentage < 100) {
            return res.status(400).json({ message: 'Course is not completed yet.' });
        }

        // 2. Check if certificate already exists (but we still want to generate it)
        // If it exists, we just fetch the existing date so it's consistent.
        // If not, we create a new record.
        let existingCert = await Certificate.findOne({ userId, courseId });
        let issuedDate = existingCert ? existingCert.issuedAt : new Date();

        const course = await Course.findById(courseId);
        const user = await User.findById(userId);

        // Fallback for card number if it doesn't exist on the user model yet
        const displayCardNumber = user.cardNumber || Math.random().toString(36).substr(2, 6).toUpperCase();
        const certNumber = `YATI${displayCardNumber}`;

        if (!existingCert) {
            // Save to DB on first generation
            existingCert = await Certificate.create({
                userId,
                courseId,
                pdfUrl: 'dynamic', // No longer caching files visually
                certificateNumber: certNumber,
                issuedAt: issuedDate
            });
        }


        // 3. Setup PDF Generator for Streaming
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margin: 0
        });

        const fileName = `Certificate_${course.title.replace(/\s+/g, '_')}.pdf`;

        // Pipe directly to the HTTP response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        doc.pipe(res);

        // Design the certificate
        const width = doc.page.width;
        const height = doc.page.height;

        // 1. Draw Background Template
        const templatePath = path.join(__dirname, '..', '..', 'public', 'assets', 'cert_template.jpg');
        if (fs.existsSync(templatePath)) {
            doc.image(templatePath, 0, 0, { width, height });
        } else {
            console.warn('Template image not found at', templatePath);
            doc.rect(0, 0, width, height).fill('#ffffff');
        }

        // 2. Overlay Text
        const leftMargin = 95;

        // Certificate Number (top left)
        doc.fillColor('#bc2a2a').fontSize(11).font('Times-Roman')
            .text(existingCert.certificateNumber || certNumber, 218, 107);

        // User Name (Middle)
        doc.fillColor('#000000').fontSize(36).font('Times-Bold')
            .text(user.name, leftMargin, 240);

        // Course Name (Middle)
        doc.fontSize(22).font('Times-Bold')
            .text(course.title, leftMargin, 320, { width: 450 });

        const dateStr = issuedDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

        // Date in Stamp Area
        doc.fontSize(7).font('Helvetica-Bold').fillColor('#000000')
            .text(dateStr, 315, 498, { width: 80, align: 'center' }); // Shifted X slightly right to 315, Y back to 498

        // Date in Signature Valid Area
        // Pushing text down below "Yaticorp India Pvt Ltd"
        doc.fontSize(10).font('Times-Roman').fillColor('#000000')
            .text(`Date: ${dateStr}`, 470, 523); // X shifted slightly right to 470, Y back to 523

        // Right side (Blue Ribbon Overlay Text)
        const ribbonLeft = 570;

        // "Issued on:" date
        doc.fontSize(14).font('Times-Roman')
            .text(`Issued on: ${dateStr}`, ribbonLeft + 30, 295);

        // End the stream - this sends the data to the client!
        doc.end();

    } catch (error) {
        console.error('Certificate generation error:', error);
        // If headers weren't sent yet (i.e error before piping), send JSON error
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
};

// @desc    Get user certificates
// @route   GET /api/certificates
// @access  Private/User
const getMyCertificates = async (req, res) => {
    try {
        const certs = await Certificate.find({ userId: req.user._id }).populate('courseId', 'title');
        res.json(certs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    generateCertificate,
    getMyCertificates
};
