const Notification = require('../models/Notification');
const { errorBody: aiAwareBody, statusFor } = require('../services/aiErrors');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(notifications);
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
      { _id: req.params.id, userId: req.user._id },
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
      userId: req.user._id
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
    const { deletedCount } = await Notification.deleteMany({ userId: req.user._id });
    res.status(200).json({ cleared: deletedCount });
  } catch (error) {
    res.status(statusFor(error)).json(aiAwareBody(error));
  }
};

module.exports = {
  clearNotifications,
  getNotifications,
  markAsRead,
  deleteNotification
};
