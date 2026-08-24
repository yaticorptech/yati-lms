const express = require('express');
const router = express.Router();

const { getSkills, updateSkill } = require('../controllers/skillController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.route('/')
  .get(protect, getSkills);
router.route('/:id')
  .put(protect, updateSkill);

module.exports = router;
