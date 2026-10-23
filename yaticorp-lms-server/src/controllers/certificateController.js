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
const { courseLessons } = require('../services/courseAccess');
const { syncProgress, issueCertificate, settleCompletion } = require('../services/courseCompletion');
const Course = require('../models/Course');
const User = require('../models/User');

// @desc    The certificate's PDF, for a course that is complete
// @route   POST /api/certificates/generate
// @access  Private/User
// The record is made when the course is finished, not here: this route is
// priced (Wallet rules → download_certificate) and charges on every call, so
// the certificate the profile says is "earned automatically" no longer waits
// for — or costs — a download.
const generateCertificate = async (req, res) => {
    try {
        const { courseId } = req.body;
        const userId = req.user._id;
        // A plain value only: an object here ({"$gt": ""}) would match some course.
        if (typeof courseId !== 'string' && typeof courseId !== 'number') {
            return res.status(400).json({ message: 'Course is not completed yet.' });
        }

        // 1. Complete, counted against the course's lessons as they are now —
        // not the stored percentage, which an administrator adding a lesson
        // used to leave at 100%.
        const progress = await Progress.findOne({ userId, courseId: String(courseId) });
        if (!progress) return res.status(400).json({ message: 'Course is not completed yet.' });
        const { lessons } = await courseLessons(String(courseId));
        const figures = await syncProgress(progress, lessons.map((l) => l._id));
        if (!figures.complete) {
            return res.status(400).json({ message: 'Course is not completed yet.' });
        }

        // 2. The certificate itself is issued when the course is finished
        // (services/courseCompletion.js), with its XP. This is the PDF of it;
        // a course finished before certificates were issued that way gets its
        // record — and its XP, once — here, with the same numbering.
        // A download is not a day of learning: anything settled here leaves the streak alone.
        if (!figures.wasComplete) await settleCompletion({ userId, courseId: String(courseId), repair: true });
        const { certificate: existingCert } = await issueCertificate({ userId, courseId: String(courseId), repair: true });
        const issuedDate = existingCert.issuedAt || new Date();

        // Downloaded again after the student deleted it from their profile:
        // they want it, so it goes back in the frame, with its own number.
        if (existingCert.hiddenAt) {
            existingCert.hiddenAt = null;
            await existingCert.save();
        }

        const course = await Course.findById(courseId);
        const user = await User.findById(userId);
        if (!course || !user) return res.status(404).json({ message: 'Course not found' });

        const certNumber = existingCert.certificateNumber;

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
            .text(certNumber, 218, 107);

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
        // Not the ones the student deleted from their profile (see hiddenAt).
        const certs = await Certificate.find({ userId: req.user._id, hiddenAt: null }).populate('courseId', 'title');
        res.json(certs);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a certificate from the student's profile (My Certificates)
// @route   DELETE /api/certificates/:id
// @access  Private/User
// Hidden, not destroyed — see hiddenAt on the model. Deleting the record would
// take the completion off the school's dashboard and the resume, break the
// number its QR code verifies, and issue a new number on the next download.
const removeFromProfile = async (req, res) => {
    try {
        if (!require('mongoose').isValidObjectId(req.params.id)) {
            return res.status(404).json({ message: 'Certificate not found.' });
        }
        const cert = await Certificate.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { hiddenAt: new Date() },
            { new: true }
        );
        if (!cert) return res.status(404).json({ message: 'Certificate not found.' });
        res.json({ removed: true, id: cert._id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    generateCertificate,
    getMyCertificates,
    removeFromProfile
};
