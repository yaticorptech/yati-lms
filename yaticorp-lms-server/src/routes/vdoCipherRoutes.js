/**
 * @author Preethesh Kulal
 * @description Routes for VdoCipher video DRM integration
 */
const express = require('express');
const router = express.Router();
const vdoCipherController = require('../controllers/vdoCipherController');
const { protectAdmin, protectUser } = require('../middleware/authMiddleware');

// Using PUT because we are creating a video entry on vdocipher side, but could also be POST depending on your api paradigm
router.post('/upload-credentials', protectAdmin, vdoCipherController.getUploadCredentials);

// Status is polled by the admin lesson editor; OTP playback is requested by logged-in students
router.get('/status/:videoId', protectAdmin, vdoCipherController.getVideoStatus);
router.post('/generate-otp', protectUser, vdoCipherController.generateOTP);

// Manual Admin Deletion
router.delete('/video/:videoId', protectAdmin, async (req, res) => {
    const success = await vdoCipherController.deleteVideo(req.params.videoId);
    if (success) res.status(200).json({ message: "Video deleted" });
    else res.status(500).json({ message: "Failed to delete video" });
});

module.exports = router;
