/**
 * @description Where a student is in a course's videos: read when the course
 * player opens, written as a video plays. The browser keeps its own copy in
 * localStorage; this one is what lets a laptop pick up where a phone stopped.
 */
const Playback = require('../models/Playback');
const Lesson = require('../models/Lesson');
const { parsePlaybackUpdate, updateFor, serialize } = require('../services/playbackService');

// @desc    The open lesson and every saved video position for this course
// @route   GET /api/user/courses/:id/playback
// @access  Private/Student
const getPlayback = async (req, res) => {
    try {
        const doc = await Playback.findOne({ userId: req.user._id, courseId: req.params.id }).lean();
        res.json(serialize(doc));
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Save a video position and/or the open lesson
// @route   PUT /api/user/courses/:id/playback   { lessonId, seconds, activeLessonId?, at? }
// @access  Private/Student
const savePlayback = async (req, res) => {
    const parsed = parsePlaybackUpdate(req.body);
    if (parsed.error) return res.status(400).json({ message: parsed.error });

    try {
        // The ids have to be real lessons; a made-up one is refused, not stored.
        const ids = [...new Set([parsed.lessonId, parsed.activeLessonId].filter(Boolean))];
        const found = await Lesson.countDocuments({ _id: { $in: ids } });
        if (found !== ids.length) return res.status(404).json({ message: 'Lesson not found' });

        const filter = { userId: req.user._id, courseId: req.params.id };
        const update = updateFor(parsed);
        let doc;
        try {
            doc = await Playback.findOneAndUpdate(filter, update, { upsert: true, new: true }).lean();
        } catch (error) {
            // Two saves racing to create the row: the one that lost the insert
            // simply updates the row the other one made.
            if (error.code !== 11000) throw error;
            doc = await Playback.findOneAndUpdate(filter, update, { new: true }).lean();
        }
        res.json(serialize(doc));
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = { getPlayback, savePlayback };
