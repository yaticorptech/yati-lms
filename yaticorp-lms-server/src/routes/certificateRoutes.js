/**
 * @author Preethesh Kulal
 * @description Routes for certificate generation and retrieval
 */
const express = require('express');
const router = express.Router();
const { generateCertificate, getMyCertificates, removeFromProfile } = require('../controllers/certificateController');
const { protectUser } = require('../middleware/authMiddleware');
const { chargeWallet } = require('../rewards/services/walletRuleService');

// Optional wallet rule 'download_certificate' (free unless the admin adds it).
// Drive linked first (2026-11-05), before the charge.
router.post('/generate', protectUser, require('../integrations/google/driveStore').requireDriveForDownload, chargeWallet('download_certificate'), generateCertificate);
router.get('/', protectUser, getMyCertificates);

// The public certificate check: any certificate by its number, with no sign-in (src/certificates/verify.js).
const verify = require('../certificates/verify');
router.get('/verify/:number', verify.limited, verify.check);
router.get('/verify/:number/pdf', verify.limited, verify.pdf);
router.delete('/:id', protectUser, removeFromProfile);

module.exports = router;
