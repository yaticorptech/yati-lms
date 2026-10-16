const Notification = require('../models/Notification');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');
const { syncFeatureNotifications, listFeatureReleases } = require('../services/featureReleaseService');
const { noticeLink } = require('../../rewards/services/notify');

// With Career Path locked (req.careerOpen false, set by the route) only the
// rewards module's notices and Games & Competitions' are the student's to see
// or change; the rest stay as they are until the section opens again.
const OPEN_TYPES = ['reward', 'competition'];
const scope = (req) => (req.careerOpen === false ? { userId: req.user._id, type: { $in: OPEN_TYPES } } : { userId: req.user._id });

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    // Any feature release this student has not been told about becomes a
    // notification first, so the bell they are about to read includes it.
    // Career Path's own announcements only while the section is open.
    if (req.careerOpen !== false) await syncFeatureNotifications(req.user);
    const notifications = await Notification.find(scope(req)).sort({ createdAt: -1 }).lean();
    // Reward notices saved before they carried a link get the one their title
    // implies, and none points into a locked Career Path.
    const careerIsOpen = req.careerOpen !== false;
    res.status(200).json(notifications.map((n) => (OPEN_TYPES.includes(n.type) ? { ...n, link: noticeLink(n, { careerIsOpen }) } : n)));
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...scope(req) },
      { isRead: true },
      { new: true }
    );
    // Scoped to the owner above, so a miss means it is not theirs or not there.
    // Either way it was not marked read, and answering 200 with a null body
    // told the client otherwise — the same lie DELETE /events already avoids.
    if (!notification) return res.status(404).json({ message: 'Notification not found.' });
    res.status(200).json(notification);
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const removed = await Notification.findOneAndDelete({
      _id: req.params.id,
      ...scope(req)
    });
    if (!removed) return res.status(404).json({ message: 'Notification not found.' });
    res.status(200).json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    Clear every Career Path notification for this student
// @route   DELETE /api/career/notifications
// @access  Private
//
// The header bell clears announcements and Career Path notifications together,
// so it needs one call rather than one DELETE per notification — a student who
// has not opened the app for a fortnight would otherwise fire thirty requests
// at the "Clear all" button.
const clearNotifications = async (req, res) => {
  try {
    const { deletedCount } = await Notification.deleteMany(scope(req));
    res.status(200).json({ cleared: deletedCount });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

// @desc    The feature releases Career Path announces, newest first
// @route   GET /api/career/notifications/features
// @access  Private
const getFeatureReleases = (req, res) => {
  // Every release here is a Career Path feature: nothing to show while it is locked.
  res.status(200).json(req.careerOpen === false ? [] : listFeatureReleases());
};

module.exports = {
  getFeatureReleases,
  clearNotifications,
  getNotifications,
  markAsRead,
  deleteNotification
};
