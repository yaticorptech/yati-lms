/**
 * The public face of a milestone badge, mounted at /b in server.js.
 *
 * No `protect` anywhere in this file, deliberately: these are the URLs a
 * student posts publicly and that LinkedIn, X and WhatsApp fetch with a
 * crawler that has no account. The 16-hex share code is what keeps a badge
 * from being enumerable.
 */
const express = require('express');
const router = express.Router();

const { getBadgeImage, getBadgePage } = require('../controllers/milestoneBadgeController');

// Declared before '/:code' so the image is not read as a share code.
router.get('/:code/image.png', getBadgeImage);
router.get('/:code', getBadgePage);

module.exports = router;
