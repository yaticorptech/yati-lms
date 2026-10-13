const express = require('express');
const router = express.Router();

const { getSkills } = require('../controllers/skillController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSkills);
// No PUT /:id: a skill's progress is earned on the server, by finishing
// Career Path tasks, never set by the student. That route let any student
// set their own skills to 100%, which also opened Jobs (2026-10-13), and
// nothing in the app used it.

module.exports = router;
