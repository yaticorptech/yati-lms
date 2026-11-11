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
router.delete('/:id', protectUser, removeFromProfile);

module.exports = router;
