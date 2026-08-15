/**
 * @author Preethesh Kulal
 * @description Generates completion reports and exports analytics as CSV or Excel
 */
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const Course = require('../models/Course');
const XLSX = require('xlsx');

// @desc    Get course completion report data (JSON)
// @route   GET /api/admin/reports/completion
// @access  Private/Admin
const getCompletionReport = async (req, res) => {
    try {
        const orgUsers = await User.find({}, '_id').lean();
        const orgUserIds = orgUsers.map(u => u._id);

        const enrollments = await Enrollment.find({ type: 'Course', userId: { $in: orgUserIds } })
            .populate('userId', 'name email cardNumber')
            .populate('courseId', 'title')
            .lean();

        const results = [];
        for (const enr of enrollments) {
            const progress = await Progress.findOne({
                userId: enr.userId?._id,
                courseId: enr.courseId?._id?.toString() || enr.courseId
            }).lean();

            results.push({
                studentName: enr.userId?.name || 'N/A',
                studentEmail: enr.userId?.email || 'N/A',
                cardNumber: enr.userId?.cardNumber || 'N/A',
                courseTitle: enr.courseId?.title || enr.courseId || 'N/A',
                enrolledAt: enr.createdAt,
                completion: progress?.percentage ?? 0,
                passedQuizzes: progress?.passedQuizzes?.length ?? 0,
                completed: (progress?.percentage ?? 0) >= 100 ? 'Yes' : 'No'
            });
        }

        res.json(results);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Export analytics as CSV
// @route   GET /api/admin/reports/export/csv
// @access  Private/Admin
const exportAnalyticsCSV = async (req, res) => {
    try {
        const orgUsers = await User.find({}, '_id').lean();
        const orgUserIds = orgUsers.map(u => u._id);
        const enrollments = await Enrollment.find({ type: 'Course', userId: { $in: orgUserIds } })
            .populate('userId', 'name email cardNumber')
            .populate('courseId', 'title')
            .lean();

        const rows = ['Student Name,Email,Card Number,Course,Enrolled At,Completion %,Completed,Passed Quizzes'];

        for (const enr of enrollments) {
            const progress = await Progress.findOne({
                userId: enr.userId?._id,
                courseId: enr.courseId?._id?.toString() || enr.courseId
            }).lean();

            const completion = progress?.percentage ?? 0;
            rows.push([
                `"${enr.userId?.name || 'N/A'}"`,
                `"${enr.userId?.email || 'N/A'}"`,
                `"${enr.userId?.cardNumber || 'N/A'}"`,
                `"${enr.courseId?.title || 'N/A'}"`,
                `"${enr.createdAt ? new Date(enr.createdAt).toLocaleDateString() : 'N/A'}"`,
                completion,
                completion >= 100 ? 'Yes' : 'No',
                progress?.passedQuizzes?.length ?? 0
            ].join(','));
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(rows.join('\n'));
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Export analytics as Excel
// @route   GET /api/admin/reports/export/excel
// @access  Private/Admin
const exportAnalyticsExcel = async (req, res) => {
    try {
        const orgUsers = await User.find({}, '_id').lean();
        const orgUserIds = orgUsers.map(u => u._id);
        const enrollments = await Enrollment.find({ type: 'Course', userId: { $in: orgUserIds } })
            .populate('userId', 'name email cardNumber')
            .populate('courseId', 'title')
            .lean();

        const rows = [];
        for (const enr of enrollments) {
            const progress = await Progress.findOne({
                userId: enr.userId?._id,
                courseId: enr.courseId?._id?.toString() || enr.courseId
            }).lean();

            const completion = progress?.percentage ?? 0;
            rows.push({
                'Student Name': enr.userId?.name || 'N/A',
                'Email': enr.userId?.email || 'N/A',
                'Card Number': enr.userId?.cardNumber || 'N/A',
                'Course': enr.courseId?.title || 'N/A',
                'Enrolled At': enr.createdAt ? new Date(enr.createdAt).toLocaleDateString() : 'N/A',
                'Completion %': completion,
                'Completed': completion >= 100 ? 'Yes' : 'No',
                'Passed Quizzes': progress?.passedQuizzes?.length ?? 0
            });
        }

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Analytics');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="analytics_${new Date().toISOString().slice(0, 10)}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getCompletionReport, exportAnalyticsCSV, exportAnalyticsExcel };
