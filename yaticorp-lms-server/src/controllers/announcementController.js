/**
 * @author Preethesh Kulal
 * @description Create, read and delete announcements for students
 */
const Announcement = require('../models/Announcement');

// @desc    Get all announcements (admin)
// @route   GET /api/admin/announcements
const getAnnouncements = async (req, res) => {
    try {
        const announcements = await Announcement.find({}).sort('-createdAt');
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const createAnnouncement = async (req, res) => {
    try {
        const { title, message } = req.body;
        if (!title || !message) return res.status(400).json({ message: 'Title and message are required' });
        const announcement = await Announcement.create({ title, message, createdBy: req.admin?._id });
        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/admin/announcements/:id
const deleteAnnouncement = async (req, res) => {
    try {
        const ann = await Announcement.findByIdAndDelete(req.params.id);
        if (!ann) return res.status(404).json({ message: 'Announcement not found' });
        res.json({ message: 'Announcement deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc    Update announcement
// @route   PUT /api/admin/announcements/:id
const updateAnnouncement = async (req, res) => {
    try {
        const { title, message } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const updated = await Announcement.findByIdAndUpdate(
            req.params.id,
            { title, message },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.json(updated);

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// @desc    Get announcements for students (read-only)
// @route   GET /api/user/announcements
// @desc    Get announcements for students (user-specific)
// @route   GET /api/user/announcements
const getAnnouncementsForUser = async (req, res) => {
    try {
        const announcements = await Announcement.find({
            readBy: { $ne: req.user._id } // show only unread for this user
        })
            .sort('-createdAt')
            .limit(20);

        res.json(announcements);
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};

// @desc    Clear notifications for current user only
// @route   POST /api/user/announcements/clear
const clearUserNotifications = async (req, res) => {
    try {
        await Announcement.updateMany(
            {},
            { $addToSet: { readBy: req.user._id } } // mark all as read for this user
        );

        res.json({ message: 'Notifications cleared for this user only' });
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
};


module.exports = { getAnnouncements, createAnnouncement, deleteAnnouncement, updateAnnouncement, getAnnouncementsForUser, clearUserNotifications };
