/**
 * @description Admin view and override of a student's progress in one course.
 *
 * The administrator picks a student, then a course, sees the course's lessons
 * with the student's completion state, and sets the progress either as a
 * percentage or by ticking lessons. Both forms end up as the same thing the
 * student's own lesson completion writes: a Progress row with a list of
 * completed lessons and a percentage.
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const Module = require('../models/Module');
const Lesson = require('../models/Lesson');
const Progress = require('../models/Progress');

/**
 * The course's published lessons in reading order (module order, then lesson
 * order), grouped by module. This is the order a percentage is applied in.
 */
const loadCourseOutline = async (courseId) => {
    const modules = await Module.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean();
    const moduleIds = modules.map(m => m._id);
    const lessons = await Lesson.find({ moduleId: { $in: moduleIds }, isPublished: true })
        .sort({ order: 1, createdAt: 1 })
        .select('_id title type moduleId order')
        .lean();

    const lessonsByModule = new Map(moduleIds.map(id => [id.toString(), []]));
    lessons.forEach(l => lessonsByModule.get(l.moduleId.toString())?.push(l));

    const outline = modules.map(m => ({
        _id: m._id,
        title: m.title,
        order: m.order,
        lessons: lessonsByModule.get(m._id.toString()) || []
    }));
    const orderedLessons = outline.flatMap(m => m.lessons);
    return { outline, orderedLessons };
};

const percentOf = (done, total) => (total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100)));

/** Load the student and course named in the URL, or answer with the right 404. */
const loadPair = async (req, res) => {
    const { id, courseId } = req.params;
    if (!mongoose.isValidObjectId(id)) {
        res.status(404).json({ message: 'User not found' });
        return null;
    }
    const [user, course] = await Promise.all([
        User.findById(id).select('name email'),
        Course.findById(courseId).select('title')
    ]);
    if (!user) { res.status(404).json({ message: 'User not found' }); return null; }
    if (!course) { res.status(404).json({ message: 'Course not found' }); return null; }
    return { user, course };
};

// @desc    A student's progress in one course, lesson by lesson
// @route   GET /api/admin/users/:id/progress/:courseId
// @access  Private/Admin
const getUserCourseProgress = async (req, res) => {
    try {
        const pair = await loadPair(req, res);
        if (!pair) return;
        const { user, course } = pair;

        const [{ outline, orderedLessons }, progress] = await Promise.all([
            loadCourseOutline(course._id),
            Progress.findOne({ userId: user._id, courseId: course._id }).lean()
        ]);
        const done = new Set((progress?.completedLessons || []).map(String));

        res.json({
            user: { _id: user._id, name: user.name, email: user.email },
            course: { _id: course._id, title: course.title },
            percentage: progress ? Math.min(100, progress.percentage) : 0,
            totalLessons: orderedLessons.length,
            completedCount: orderedLessons.filter(l => done.has(l._id.toString())).length,
            passedQuizzes: progress?.passedQuizzes?.length ?? 0,
            lastActivity: progress?.updatedAt || null,
            modules: outline.map(m => ({
                _id: m._id,
                title: m.title,
                lessons: m.lessons.map(l => ({ _id: l._id, title: l.title, type: l.type, completed: done.has(l._id.toString()) }))
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Set a student's progress in one course
// @route   PUT /api/admin/users/:id/progress/:courseId
// @access  Private/Admin
// @body    { percentage: 0-100 }  — marks the first N lessons in course order
//          { completedLessons: [lessonId] } — marks exactly these lessons
const setUserCourseProgress = async (req, res) => {
    try {
        const pair = await loadPair(req, res);
        if (!pair) return;
        const { user, course } = pair;
        const { percentage, completedLessons } = req.body || {};

        const hasPercentage = percentage !== undefined && percentage !== null && percentage !== '';
        const hasLessons = Array.isArray(completedLessons);
        if (!hasPercentage && !hasLessons) {
            return res.status(400).json({ message: 'Send a percentage (0-100) or a list of completed lessons.' });
        }

        const { orderedLessons } = await loadCourseOutline(course._id);
        const total = orderedLessons.length;
        let nextLessons;
        let nextPercentage;

        if (hasLessons) {
            const known = new Map(orderedLessons.map(l => [l._id.toString(), l._id]));
            const unknown = completedLessons.map(String).filter(x => !known.has(x));
            if (unknown.length) {
                return res.status(400).json({ message: 'Some of those lessons are not published lessons of this course.', unknown });
            }
            nextLessons = [...new Set(completedLessons.map(String))].map(x => known.get(x));
            nextPercentage = percentOf(nextLessons.length, total);
        } else {
            const pct = Number(percentage);
            if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
                return res.status(400).json({ message: 'Percentage must be a number from 0 to 100.' });
            }
            const rounded = Math.round(pct);
            // The percentage is kept exactly as chosen; the lessons are marked to
            // match it as closely as they can, first to last.
            const count = rounded === 100 ? total : Math.floor((rounded / 100) * total);
            nextLessons = orderedLessons.slice(0, count).map(l => l._id);
            nextPercentage = rounded;
        }

        const progress = await Progress.findOneAndUpdate(
            { userId: user._id, courseId: course._id },
            {
                $set: {
                    completedLessons: nextLessons,
                    percentage: nextPercentage,
                    lastAccessedLesson: nextLessons.length ? nextLessons[nextLessons.length - 1] : null
                },
                $setOnInsert: { passedQuizzes: [], attemptedQuizzesForCredit: [] }
            },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
        ).lean();

        res.json({
            message: `Progress set to ${nextPercentage}% (${nextLessons.length} of ${total} lessons).`,
            progress: {
                courseId: course._id,
                percentage: progress.percentage,
                completedLessons: progress.completedLessons.length,
                totalLessons: total,
                passedQuizzes: progress.passedQuizzes?.length ?? 0,
                lastActivity: progress.updatedAt
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getUserCourseProgress, setUserCourseProgress };
