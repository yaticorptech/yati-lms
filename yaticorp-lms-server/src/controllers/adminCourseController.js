/**
 * @author Preethesh Kulal
 * @description CRUD for courses, modules, lessons and course preview for admins
 */
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const vdoCipherController = require('./vdoCipherController');
const { uploadToBunny, uploadStreamToBunny } = require('../utils/bunnyStorage');
const { unplayableReason } = require('../utils/webVideo');
const { stripOperators, pick } = require('../utils/sanitizeUpdate');
const videoOwnership = require('../organizations/services/videoOwnership');

// ==========================
// COURSE OPERATIONS
// ==========================

/**
 * Whose courses a request works on. The platform admin's routes leave
 * `req.organization` unset and work on platform courses (no organizationId);
 * an organization admin's routes set it and work on that organization's own.
 * Each side sees only its own list and checks titles only against its own.
 */
const ownerOf = (req) => req.organization?._id || null;
const titlePattern = (title) => new RegExp(`^${String(title).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

/**
 * What an organization's administrator may change by editing: exactly what
 * the course builder sends (pages/CourseEditor.jsx and LessonEditor.jsx in
 * the admin app). Never the owner, the id, a price or a timestamp. A moved
 * module or lesson (`courseId`, `moduleId`) is checked again below. Platform
 * administrators keep editing every field, minus Mongo operators.
 */
const ORG_EDITABLE = {
    course: ['title', 'description', 'thumbnail', 'instructor', 'isPublished'],
    module: ['title', 'description', 'dripDays', 'courseId', 'order'],
    lesson: [
        'title', 'type', 'isPublished', 'allowDownload', 'attachments', 'order', 'moduleId',
        'videoSource', 'videoId', 'videoUrl', 'libraryId', 'vdocipherStatus', 'pdfUrl', 'quizId', 'assignmentId'
    ]
};
/** The body an update may use: operators stripped always, and the allowlist for an organization. */
const editableBody = (req, kind) => {
    const body = stripOperators(req.body || {});
    return ownerOf(req) ? pick(body, ORG_EDITABLE[kind]) : body;
};
const NOT_FOUND = { message: 'Not found' };
const isScalarId = (id) => typeof id === 'string' || typeof id === 'number';
/** Whether a course / module is `owner`'s. The org routes guard this too; checked again on the cleaned body. */
const courseOwnedBy = async (courseId, owner) => {
    if (!isScalarId(courseId)) return false;
    const course = await Course.findById(String(courseId)).select('organizationId').lean();
    return Boolean(course?.organizationId) && String(course.organizationId) === String(owner);
};
const moduleOwnedBy = async (moduleId, owner) => {
    if (typeof moduleId !== 'string' || !mongoose.isValidObjectId(moduleId)) return false;
    const mod = await Module.findById(moduleId).select('courseId').lean();
    return Boolean(mod) && courseOwnedBy(mod.courseId, owner);
};

/**
 * Delete from VdoCipher the videos of lessons about to be deleted — but only
 * a video no other lesson still uses, and, when an organization is deleting,
 * only a video that organization owns (services/videoOwnership.js). Anything
 * else stays on VdoCipher; the lesson documents are deleted regardless.
 */
const removeLessonVideos = async (lessons, req) => {
    const removing = lessons.map((l) => l._id);
    const videoIds = [...new Set(lessons.filter((l) => l.videoSource === 'vdocipher' && l.videoId).map((l) => l.videoId))];
    for (const videoId of videoIds) {
        if (await videoOwnership.mayDeleteFromProvider(videoId, { organizationId: ownerOf(req), removing })) {
            await vdoCipherController.deleteVideo(videoId);
        }
    }
};

const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({ organizationId: ownerOf(req) }).sort('-createdAt').lean();

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

        // An organization also sees, per course, how many of its current
        // students are taking it and how many have finished it.
        if (ownerOf(req)) {
            const stats = await require('../organizations/services/courseStats').learnerStats(ownerOf(req), courseIds);
            return res.json(coursesWithCount.map(c => ({ ...c, ...(stats.get(String(c._id)) || { learners: 0, completed: 0 }) })));
        }

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
        const { title, description, thumbnail, instructor, isPublished, price, pricePoints } = req.body;
        if (!title || !String(title).trim()) return res.status(400).json({ message: 'Give the course a title' });
        const owner = ownerOf(req);

        // A duplicate title only counts among the same owner's courses.
        const existingCourse = await Course.findOne({ organizationId: owner, title: titlePattern(title) });

        if (existingCourse) {
            return res.status(400).json({ message: 'Course with this title already exists' });
        }

        const fields = {
            title: title.trim(),
            description,
            thumbnail,
            // An organization's course is taught by that organization.
            instructor: owner ? (instructor || req.organization.name) : instructor,
            isPublished,
            organizationId: owner,
            // An organization's course is free for its students: never priced.
            price: owner ? 0 : price,
            // Blank in the form means "not sold for points", not NaN.
            pricePoints: owner ? 0 : (Number(pricePoints) || 0)
        };

        // A course id is a random five-digit number (models/Course.js), so two
        // courses can draw the same one. Each try draws a fresh id; the format
        // is unchanged, only a collision is retried instead of answered as 500.
        let course;
        for (let attempt = 1; ; attempt += 1) {
            try {
                course = await Course.create(fields);
                break;
            } catch (error) {
                const idClash = error.code === 11000 && (error.keyPattern?._id || /_id_/.test(error.message));
                if (!idClash || attempt >= 5) throw error;
            }
        }

        // An organization's limit, settled after the write: two creates at
        // once both pass the count in withinCourseLimit, so the one that
        // landed past the limit is taken back out here.
        if (owner) {
            const { overCourseLimit } = require('../organizations/controllers/orgCourseController');
            const limit = await overCourseLimit(course, req.organization);
            if (limit !== null) {
                await Course.deleteOne({ _id: course._id });
                return res.status(409).json({
                    code: 'COURSE_LIMIT',
                    message: `Your organization can have ${limit} course${limit === 1 ? '' : 's'}. Delete one, or ask the platform administrator for a higher limit.`
                });
            }
        }

        res.status(201).json(course);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateCourse = async (req, res) => {
    try {
        // Who owns a course is never changed by editing it — nor, through a
        // `$set`/`$unset` operator, anything else the fields below guard.
        const { title, organizationId: _owner, _id: _id, ...rest } = editableBody(req, 'course');
        const current = await Course.findById(req.params.id).select('organizationId').lean();
        if (!current) return res.status(404).json({ message: 'Course not found' });

        if (title) {
            const existingCourse = await Course.findOne({
                organizationId: current.organizationId || null,
                title: titlePattern(title),
                _id: { $ne: req.params.id }
            });

            if (existingCourse) {
                return res.status(400).json({ message: 'Course title already exists' });
            }
        }

        // An organization's course stays free, whatever an edit sends.
        if (current.organizationId) {
            delete rest.price; delete rest.pricePoints; delete rest.creditCost;
        }
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { ...rest, ...(title ? { title: String(title).trim() } : {}) },
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
        await removeLessonVideos(allLessons, req);

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
        if (!title || !String(title).trim()) return res.status(400).json({ message: 'Give the session a title' });

        // 🔴 CHECK DUPLICATE SESSION (MODULE) NAME INSIDE SAME COURSE
        // (escaped: the title is matched as text, never as a pattern)
        const existingModule = await Module.findOne({
            courseId,
            title: titlePattern(title)
        });

        if (existingModule) {
            return res.status(400).json({ message: 'Session already exists in this course' });
        }

        // Determine order
        const lastModule = await Module.findOne({ courseId }).sort('-order');
        const order = lastModule ? lastModule.order + 1 : 0;

        const newModule = await Module.create({
            courseId,
            title: String(title).trim(),
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
        const body = editableBody(req, 'module');
        const { title, courseId } = body;
        const current = await Module.findById(req.params.id).select('courseId').lean();
        if (!current) return res.status(404).json({ message: 'Module not found' });

        // An organization's module moves only into another of its own courses.
        if (ownerOf(req) && courseId !== undefined && !(await courseOwnedBy(courseId, ownerOf(req)))) {
            return res.status(404).json(NOT_FOUND);
        }

        if (title) {
            // Against the course it will be in: the editor sends no courseId
            // when it only renames, and the check then ran across every course.
            const existingModule = await Module.findOne({
                courseId: String(courseId ?? current.courseId),
                title: titlePattern(title),
                _id: { $ne: req.params.id }
            });

            if (existingModule) {
                return res.status(400).json({ message: 'Session already exists in this course' });
            }
        }

        const updatedModule = await Module.findByIdAndUpdate(
            req.params.id,
            { ...body, ...(title !== undefined ? { title: String(title).trim() } : {}) },
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
        await removeLessonVideos(lessons, req);

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
        const body = editableBody(req, 'lesson');
        const owner = ownerOf(req);
        if (owner) {
            const current = await Lesson.findById(req.params.id).select('videoSource videoId').lean();
            if (!current) return res.status(404).json({ message: 'Lesson not found' });
            // An organization's lesson moves only into another of its own modules.
            if (body.moduleId !== undefined && !(await moduleOwnedBy(body.moduleId, owner))) {
                return res.status(404).json(NOT_FOUND);
            }
            // And plays only a VdoCipher video it uploaded itself (or keeps the
            // one it has): every VdoCipher video sits in the platform's one
            // account, including the paid platform ones.
            const source = body.videoSource !== undefined ? body.videoSource : current.videoSource;
            const videoId = body.videoId !== undefined ? body.videoId : current.videoId;
            const unchanged = current.videoSource === 'vdocipher' && current.videoId === videoId;
            if (source === 'vdocipher' && videoId && !unchanged) {
                if (!vdoCipherController.isVideoId(videoId)) return res.status(400).json({ message: 'Invalid video id' });
                if (!(await videoOwnership.orgOwnsVideo(videoId, owner))) {
                    return res.status(403).json({ code: 'VIDEO_NOT_OWNED', message: 'That video was not uploaded by your organization.' });
                }
            }
        }
        const updatedLesson = await Lesson.findByIdAndUpdate(req.params.id, body, { new: true });
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

        // Hard delete physical video (when it is ours to delete — see removeLessonVideos)
        await removeLessonVideos([lesson], req);

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
        // Bunny serves the file as-is and nothing transcodes it, so a codec
        // browsers do not decode (HEVC from a phone or Mac screen recording,
        // ProRes) would store fine and then fail for every student. Refuse it
        // now, with the reason, while the admin still has the source file open.
        if (!isPdf) {
            const problem = unplayableReason(req.file.path, req.file.originalname);
            if (problem) return res.status(400).json({ message: problem, code: 'UNPLAYABLE_VIDEO' });
        }
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

// @desc    Upload a lesson attachment (worksheet, slides, archive…) → Bunny Storage → return CDN URL
// @route   POST /api/admin/lessons/attachments
// @access  Private/Admin
const uploadLessonAttachment = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
    }
    try {
        const stream = fs.createReadStream(req.file.path);
        const url = await uploadStreamToBunny(stream, req.file.originalname, 'lesson-attachments', req.file.size);
        res.json({ url, name: req.file.originalname });
    } catch (error) {
        console.error('Lesson attachment upload error:', error);
        res.status(500).json({ message: 'Attachment upload failed', error: error.message });
    } finally {
        if (req.file?.path) fs.unlink(req.file.path, () => {});
    }
};

module.exports = {
    getCourses, getCourseById, createCourse, updateCourse, deleteCourse,
    addModule, updateModule, deleteModule, reorderModules,
    addLesson, updateLesson, deleteLesson, reorderLessons,
    getCourseStudents, previewCourse, uploadThumbnail, uploadLessonFile,
    uploadLessonAttachment
};
