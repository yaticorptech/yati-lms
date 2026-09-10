const express = require('express');
const router = express.Router();
const { protectUser } = require('../../middleware/authMiddleware');
const { getStatus, beginConnect, handleCallback, endConnection, saveToDrive } = require('./controller');

// Google redirects the student's browser here with no Authorization header,
// so this one route is open and trusts only the signed state it carries.
router.get('/callback', handleCallback);

router.get('/status', protectUser, getStatus);
router.post('/connect', protectUser, beginConnect);
router.post('/disconnect', protectUser, endConnection);
router.post('/drive/save', protectUser, saveToDrive);

module.exports = router;
