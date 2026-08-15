/**
 * @author Preethesh Kulal
 * @description Routes for data synchronization
 */
const express = require('express');
const router = express.Router();
const { syncActivation } = require('../controllers/syncController');
const { requireSyncKey } = require('../middleware/syncKey');

// Guarded by a shared secret; enforced once SYNC_API_KEY is set (see middleware)
router.post('/activate', requireSyncKey, syncActivation);

module.exports = router;
