const express = require('express');
const router = express.Router();

const { getTimetable, saveTimetable } = require('../controllers/timetableController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTimetable)
  .put(protect, saveTimetable);

module.exports = router;
