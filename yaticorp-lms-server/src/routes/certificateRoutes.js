/**
 * @author Preethesh Kulal
 * @description Routes for certificate generation and retrieval
 */
const express = require('express');
const router = express.Router();
const { generateCertificate, getMyCertificates } = require('../controllers/certificateController');
const { protectUser } = require('../middleware/authMiddleware');

router.post('/generate', protectUser, generateCertificate);
router.get('/', protectUser, getMyCertificates);

module.exports = router;
