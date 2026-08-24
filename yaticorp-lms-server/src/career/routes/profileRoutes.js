const express = require('express');
const router = express.Router();

const { getProfileSummary, redoSkippedTask } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

// Every :id in this router is checked before it reaches a query.
router.param('id', validateObjectId);

router.get('/summary', protect, getProfileSummary);
router.post('/skipped/:id/redo', protect, redoSkippedTask);

module.exports = router;
