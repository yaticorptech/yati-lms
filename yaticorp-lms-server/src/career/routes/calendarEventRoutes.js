const express = require('express');
const router = express.Router();

const {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  syncToGoogle
} = require('../controllers/calendarEventController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.route('/')
  .get(protect, getEvents)
  .post(protect, createEvent);

// Before '/:id', so 'sync-google' is never read as an event id.
router.post('/sync-google', protect, syncToGoogle);

router.route('/:id')
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

module.exports = router;
