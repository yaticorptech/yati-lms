const express = require('express');
const router = express.Router();

const { getNotifications, markAsRead, deleteNotification, clearNotifications } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.route('/')
  .get(protect, getNotifications)
  .delete(protect, clearNotifications);
router.route('/:id/read')
  .put(protect, markAsRead);
router.route('/:id')
  .delete(protect, deleteNotification);

module.exports = router;
