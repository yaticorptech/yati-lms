/**
 * @author Preethesh Kulal
 * @description CRUD for courses, modules, lessons and course preview for admins
 */
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const fs = require('fs');
const path = require('path');
const vdoCipherController = require('./vdoCipherController');
const { uploadToBunny, uploadStreamToBunny } = require('../utils/bunnyStorage');

// ==========================
// COURSE OPERATIONS
// ==========================

const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({}).sort('-createdAt').lean();

        // Attach lessonsCount to each course via Module → Lesson join
        const courseIds = courses.map(c => c._id);
        const modules = await Module.find({ courseId: { $in: courseIds } }, '_id courseId').lean();
        const moduleIds = modules.map(m => m._id);

        const lessonCounts = await Lesson.aggregate([
            { $match: { moduleId: { $in: moduleIds } } },
            {
                $lookup: {
                    from: 'modules',
                    localField: 'moduleId',
                    foreignField: '_id',
                    as: 'module'
                }
            },
            { $unwind: '$module' },
            {
                $group: {
                    _id: '$module.courseId',
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        lessonCounts.forEach(lc => { countMap[lc._id.toString()] = lc.count; });

        const coursesWithCount = courses.map(c => ({
            ...c,
            lessonsCount: countMap[c._id.toString()] || 0
        }));

        res.json(coursesWithCount);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Fetch modules and lessons
        const modules = await Module.find({ courseId: course._id }).sort('order');
        // Transform into plain objects
        const modulesWithLessons = await Promise.all(
            modules.map(async (mod) => {
                const lessons = await Lesson.find({ moduleId: mod._id }).sort('order');
                return { ...mod.toObject(), lessons };
            })
        );

        res.json({
            course,
            modules: modulesWithLessons
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createCourse = async (req, res) => {
    try {
        const { title, description, thumbnail, instructor, isPublished, price } = req.body;


        // 🔴 CHECK DUPLICATE TITLE
        const existingCourse = await Course.findOne({
            title: { $regex: `^${title.trim()}$`, $options: 'i' }
        });

        if (existingCourse) {
            return res.status(400).json({ message: 'Course with this title already exists' });
        }

        const course = await Course.create({
            title: title.trim(),
            description,
            thumbnail,
            instructor,
            isPublished,
            price
        });

        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        const { title } = req.body;

        if (title) {
            const existingCourse = await Course.findOne({
                title: { $regex: `^${title.trim()}$`, $options: 'i' },
                _id: { $ne: req.params.id }
            });

            if (existingCourse) {
                return res.status(400).json({ message: 'Course title already exists' });
            }
        }

        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { ...req.body, title: title?.trim() },
            { new: true }
        );

        if (!course) return res.status(404).json({ message: 'Course not found' });

        res.json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const Enrollment = require('../models/Enrollment');
        const Progress = require('../models/Progress');

        // Delete associated modules and lessons
        const modules = await Module.find({ courseId: course._id });
        const moduleIds = modules.map(m => m._id);

        const allLessons = await Lesson.find({ moduleId: { $in: moduleIds } });
        for (const lesson of allLessons) {
            if (lesson.videoSource === 'vdocipher' && lesson.videoId) {
                await vdoCipherController.deleteVideo(lesson.videoId);
            }
        }

        await Lesson.deleteMany({ moduleId: { $in: moduleIds } });
        await Module.deleteMany({ courseId: course._id });

        // Cascade: remove enrollments and progress for this course
        await Enrollment.deleteMany({ type: 'Course', courseId: course._id.toString() });
        await Progress.deleteMany({ courseId: course._id.toString() });

        // Remove this course from any bundles that reference it
        const Bundle = require('../models/Bundle');
        await Bundle.updateMany(
            { courses: course._id.toString() },
            { $pull: { courses: course._id.toString() } }
        );

        await Course.deleteOne({ _id: course._id });

        res.json({ message: 'Course and all related data removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================
// MODULE OPERATIONS
// ==========================

const addModule = async (req, res) => {
    try {
        const { courseId, title, description, dripDays } = req.body;

        // 🔴 CHECK DUPLICATE SESSION (MODULE) NAME INSIDE SAME COURSE
        const existingModule = await Module.findOne({
            courseId,
            title: { $regex: `^${title.trim()}$`, $options: 'i' }
        });

        if (existingModule) {
            return res.status(400).json({ message: 'Session already exists in this course' });
        }

        // Determine order
        const lastModule = await Module.findOne({ courseId }).sort('-order');
        const order = lastModule ? lastModule.order + 1 : 0;

        const newModule = await Module.create({
            courseId,
            title: title.trim(),
            description,
            dripDays: Number(dripDays) || 0,
            order
        });

        res.status(201).json(newModule);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateModule = async (req, res) => {
    try {
        const { title, courseId } = req.body;

        if (title) {
            const existingModule = await Module.findOne({
                courseId,
                title: { $regex: `^${title.trim()}$`, $options: 'i' },
                _id: { $ne: req.params.id }
            });

            if (existingModule) {
                return res.status(400).json({ message: 'Session already exists in this course' });
            }
        }

        const updatedModule = await Module.findByIdAndUpdate(
            req.params.id,
            { ...req.body, title: title?.trim() },
            { new: true }
        );

        if (!updatedModule) return res.status(404).json({ message: 'Module not found' });

        res.json(updatedModule);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteModule = async (req, res) => {
    try {
        const module = await Module.findById(req.params.id);
        if (!module) return res.status(404).json({ message: 'Module not found' });

        // Hard delete all Vdocipher videos attached to these lessons
        const lessons = await Lesson.find({ moduleId: module._id });
        for (const lesson of lessons) {
            if (lesson.videoSource === 'vdocipher' && lesson.videoId) {
                await vdoCipherController.deleteVideo(lesson.videoId);
            }
        }

        await Lesson.deleteMany({ moduleId: module._id });
        await Module.deleteOne({ _id: module._id });
        res.json({ message: 'Module and related lessons removed from LMS and VdoCipher' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const reorderModules = async (req, res) => {
    try {
        const { orderData } = req.body; // Array of { id, order }
        // Bulk operation for performance
        const bulkOps = orderData.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id },
                update: { order }
            }
        }));
        await Module.bulkWrite(bulkOps);
        res.json({ message: 'Modules reordered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================
// LESSON OPERATIONS
// ==========================

const addLesson = async (req, res) => {
    try {
        const { moduleId, title, type, videoUrl, videoSource, pdfUrl, quizId, assignmentId } = req.body;
        const lastLesson = await Lesson.findOne({ moduleId }).sort('-order');
        const order = lastLesson ? lastLesson.order + 1 : 0;

        const newLesson = await Lesson.create({
            moduleId, title, type, videoUrl, videoSource, pdfUrl, quizId, assignmentId, order
        });
        res.status(201).json(newLesson);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateLesson = async (req, res) => {
    try {
        const updatedLesson = await Lesson.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedLesson) return res.status(404).json({ message: 'Lesson not found' });
        res.json(updatedLesson);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const deleteLesson = async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.id);
        if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

        // Hard delete physical video
        if (lesson.videoSource === 'vdocipher' && lesson.videoId) {
            await vdoCipherController.deleteVideo(lesson.videoId);
        }

        await Lesson.deleteOne({ _id: lesson._id });
        res.json({ message: 'Lesson removed from LMS and VdoCipher' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const reorderLessons = async (req, res) => {
    try {
        const { orderData } = req.body; // Array of { id, order }
        const bulkOps = orderData.map(({ id, order }) => ({
            updateOne: {
                filter: { _id: id },
                update: { order }
            }
        }));
        await Lesson.bulkWrite(bulkOps);
        res.json({ message: 'Lessons reordered successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================
// COURSE STUDENTS
// ==========================

// @desc    Get all students enrolled in a course with progress
// @route   GET /api/admin/courses/:id/students
const getCourseStudents = async (req, res) => {
    try {
        const courseId = req.params.id;
        const Enrollment = require('../models/Enrollment');
        const Progress = require('../models/Progress');
        const User = require('../models/User');
        const Bundle = require('../models/Bundle');

        // 1. Find bundles containing this course
        const bundlesWithCourse = await Bundle.find({ courses: courseId }, '_id').lean();
        const bundleIds = bundlesWithCourse.map(b => b._id.toString());

        // 2. Get raw enrollments — do NOT .lean() so userId stays as Mongoose ObjectId
        const enrollments = await Enrollment.find({
            $or: [
                { type: 'Course', courseId },
                ...(bundleIds.length > 0 ? [{ type: 'Bundle', bundleId: { $in: bundleIds } }] : [])
            ]
        }).lean();

        console.log(`[getCourseStudents] courseId=${courseId} enrolled=${enrollments.length}`);
        if (enrollments.length === 0) return res.json([]);

        // Log the first enrollment to diagnose userId type
        console.log('[getCourseStudents] sample enrollment userId:', JSON.stringify(enrollments[0].userId));

        // 3. Collect unique userId values in ALL possible formats for robust matching
        const rawUserIds = [];
        const cardNumbers = [];
        const enrollmentMeta = {};

        enrollments.forEach(enr => {
            if (!enr.userId) return;
            const uid = enr.userId.toString();
            if (!enrollmentMeta[uid]) {
                enrollmentMeta[uid] = { enrolledAt: enr.createdAt, via: enr.type };
                rawUserIds.push(enr.userId);
                // userId might be a card number string
                if (typeof enr.userId === 'string') cardNumbers.push(enr.userId);
            }
        });

        // 4. Try _id first, then fall back to cardNumber
        let users = await User.find(
            { _id: { $in: rawUserIds } },
            'name email cardNumber phone status credits createdAt'
        ).lean();

        console.log(`[getCourseStudents] users by _id=${users.length}`);

        // Fallback: if nothing found, query by cardNumber
        if (users.length === 0 && rawUserIds.length > 0) {
            const uidStrings = rawUserIds.map(id => id.toString());
            users = await User.find(
                { $or: [{ cardNumber: { $in: uidStrings } }, { _id: { $in: uidStrings } }] },
                'name email cardNumber phone status credits createdAt'
            ).lean();
            console.log(`[getCourseStudents] users by cardNumber/string fallback=${users.length}`);
        }

        // 5. Fetch progress
        const progressDocs = await Progress.find(
            { courseId },
            'userId percentage completedLessons passedQuizzes updatedAt'
        ).lean();

        const progressByUser = {};
        progressDocs.forEach(p => { progressByUser[p.userId.toString()] = p; });

        // 6. Build response — match enrollment via cardNumber OR _id
        const students = users.map(u => {
            const uid = u._id.toString();
            // Try to find matching enrollment meta by _id string or by cardNumber
            const meta = enrollmentMeta[uid]
                || enrollmentMeta[u.cardNumber]
                || {};
            const prog = progressByUser[uid] || {};
            return {
                userId: u._id,
                name: u.name,
                email: u.email,
                cardNumber: u.cardNumber,
                phone: u.phone,
                status: u.status,
                credits: u.credits || 0,
                enrolledAt: meta.enrolledAt || null,
                enrolledVia: meta.via || 'Course',
                percentage: prog.percentage ?? 0,
                completedLessons: Array.isArray(prog.completedLessons) ? prog.completedLessons.length : 0,
                passedQuizzes: Array.isArray(prog.passedQuizzes) ? prog.passedQuizzes.length : 0,
                lastActivity: prog.updatedAt || null
            };
        });

        res.json(students);
    } catch (error) {
        console.error('[getCourseStudents]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Preview course content (admin only, bypasses isPublished)
// @route   GET /api/admin/preview/:courseId
// @access  Private/Admin
const previewCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const modules = await Module.find({ courseId }).sort('order');
        const modulesWithLessons = await Promise.all(
            modules.map(async (mod) => {
                const lessons = await Lesson.find({ moduleId: mod._id }).sort('order');
                return { ...mod.toObject(), lessons };
            })
        );

        res.json({ course, modules: modulesWithLessons, progress: { completedLessons: [], percentage: 0 } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Upload a course thumbnail image → Bunny Storage → return CDN URL
// @route   POST /api/admin/courses/thumbnail
// @access  Private/Admin
const uploadThumbnail = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No image file provided' });
        }
        const url = await uploadToBunny(req.file.buffer, req.file.originalname, 'course-thumbnails');
        res.json({ url });
    } catch (error) {
        console.error('Thumbnail upload error:', error);
        res.status(500).json({ message: 'Thumbnail upload failed', error: error.message });
    }
};

// @desc    Upload a lesson video or PDF → Bunny Storage → return CDN URL
// @route   POST /api/admin/lessons/upload
// @access  Private/Admin
const uploadLessonFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
    }
    try {
        // The browser sends application/octet-stream for types its OS registry
        // doesn't know, so fall back to the extension to classify the file.
        const isPdf = req.file.mimetype === 'application/pdf'
            || path.extname(req.file.originalname || '').toLowerCase() === '.pdf';
        const folder = isPdf ? 'lesson-pdfs' : 'lesson-videos';
        const stream = fs.createReadStream(req.file.path);
        const url = await uploadStreamToBunny(stream, req.file.originalname, folder, req.file.size);
        res.json({ url, kind: isPdf ? 'pdf' : 'video' });
    } catch (error) {
        console.error('Lesson file upload error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

module.exports = {
    getCourses, getCourseById, createCourse, updateCourse, deleteCourse,
    addModule, updateModule, deleteModule, reorderModules,
    addLesson, updateLesson, deleteLesson, reorderLessons,
    getCourseStudents, previewCourse, uploadThumbnail, uploadLessonFile
};
