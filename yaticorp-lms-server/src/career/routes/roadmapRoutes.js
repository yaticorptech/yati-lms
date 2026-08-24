const express = require('express');
const router = express.Router();
const {
  generateRoadmap,
  getRoadmap,
  togglePhase,
  deleteRoadmap
} = require('../controllers/roadmapController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateRoadmap);
router.patch('/phase', protect, togglePhase);
router.route('/')
  .get(protect, getRoadmap)
  .delete(protect, deleteRoadmap);

module.exports = router;
