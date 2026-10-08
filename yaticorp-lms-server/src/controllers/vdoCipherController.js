/**
 * @author Preethesh Kulal
 * @description Integration with VdoCipher for DRM-protected video delivery
 */
const axios = require('axios');

/**
 * A VdoCipher video id is 32 hex characters. Anything else is refused before
 * VdoCipher is called: Express decodes route params, so an id carrying `%2C`
 * or `%3F` would otherwise turn `?videos=<id>` into a delete of several
 * videos, or `/videos/<id>` into a different request altogether.
 */
const VIDEO_ID = /^[a-f0-9]{32}$/i;
const isVideoId = (id) => typeof id === 'string' && VIDEO_ID.test(id);
exports.isVideoId = isVideoId;

/** Route guard: 400 for a malformed `:videoId`, before any ownership check or provider call. */
exports.requireVideoId = (req, res, next) => {
    if (isVideoId(req.params.videoId)) return next();
    return res.status(400).json({ message: 'Invalid video id' });
};

/**
 * A student may get a playback OTP only for a video that getCourseContent
 * would already show them: a published VdoCipher lesson in a published course
 * they can access (services/courseAccess.js). Any other id — someone else's
 * organization course, an unpublished draft, or a video no lesson uses —
 * answers 404.
 */
const studentCanWatch = async (user, videoId) => {
    const Lesson = require('../models/Lesson');
    const Module = require('../models/Module');
    const Course = require('../models/Course');
    const { canAccessCourse } = require('../services/courseAccess');
    const lessons = await Lesson.find({ videoId, videoSource: 'vdocipher', isPublished: true }).select('moduleId').lean();
    if (!lessons.length) return false;
    const modules = await Module.find({ _id: { $in: lessons.map((l) => l.moduleId) } }).select('courseId').lean();
    const courses = await Course.find({ _id: { $in: modules.map((m) => m.courseId) }, isPublished: true }).select('organizationId').lean();
    return courses.some((c) => canAccessCourse(user, c));
};

exports.getUploadCredentials = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({ message: 'Title is required for video upload' });
        }

        const apiKey = process.env.VDOCIPHER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ message: 'VdoCipher API Key is not configured on the server' });
        }

        // VdoCipher API URL for generating upload credentials (v3 uses /api/videos)
        const url = `https://dev.vdocipher.com/api/videos`;

        // It needs a title as a query parameter
        const response = await axios.put(
            `${url}?title=${encodeURIComponent(title)}`,
            {}, // Empty JSON body 
            {
                headers: {
                    'Authorization': `Apisecret ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // The video id is minted here, so this is where its owner is written
        // down: an organization (req.organization, on its own routes) or the
        // platform. It is what later lets an organization attach, inspect or
        // delete this video — and nobody else's.
        const videoId = response.data?.videoId;
        if (isVideoId(videoId)) {
            const { recordUpload } = require('../organizations/services/videoOwnership');
            if (req.organization) {
                // Without the row the organization could never attach its upload.
                await recordUpload(videoId, req.organization._id);
            } else {
                await recordUpload(videoId, null).catch((e) => console.error('[vdocipher] could not record platform upload:', e.message));
            }
        }

        // It returns { clientPayload, videoId }
        // The frontend will use clientPayload to perform multipart upload
        res.status(200).json(response.data);

    } catch (error) {
        console.error('VdoCipher Upload Credentials Error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to generate VdoCipher upload credentials',
            details: error.response?.data || error.message
        });
    }
};

exports.getVideoStatus = async (req, res) => {
    try {
        const { videoId } = req.params;
        const apiKey = process.env.VDOCIPHER_API_KEY;

        if (!isVideoId(videoId)) return res.status(400).json({ message: 'Invalid video id' });

        if (!apiKey) {
            return res.status(500).json({ message: 'VdoCipher API Key not configured' });
        }

        const url = `https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Apisecret ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // The response contains a 'status' field (e.g. 'ready', 'queued', 'pre-upload').
        // Only that is passed on: the lesson editor reads nothing else, and the
        // rest of VdoCipher's record is not the caller's business.
        res.status(200).json({ status: response.data?.status });

    } catch (error) {
        if (error.response && error.response.status === 404) {
            // VdoCipher returns 404 when a video has been physically deleted from their servers
            return res.status(200).json({ status: 'deleted' });
        }

        console.error('VdoCipher Status check error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to fetch video status',
            details: error.response?.data || error.message
        });
    }
};

exports.generateOTP = async (req, res) => {
    try {
        const { videoId } = req.body;
        const apiKey = process.env.VDOCIPHER_API_KEY;

        if (!videoId) {
            return res.status(400).json({ message: 'Video ID is required' });
        }
        if (!isVideoId(videoId)) return res.status(400).json({ message: 'Invalid video id' });

        if (!(await studentCanWatch(req.user, videoId))) return res.status(404).json({ message: 'Video not found' });

        if (!apiKey) {
            return res.status(500).json({ message: 'VdoCipher API Key not configured' });
        }

        const url = `https://dev.vdocipher.com/api/videos/${encodeURIComponent(videoId)}/otp`;

        const response = await axios.post(
            url,
            {
                // Optional: You can set restrictions here like watermarking, ttl, etc.
                ttl: 300 // OTP expires in 5 minutes
            },
            {
                headers: {
                    'Authorization': `Apisecret ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Returns { otp, playbackInfo }
        res.status(200).json(response.data);

    } catch (error) {
        console.error('VdoCipher OTP generation error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to generate VdoCipher OTP',
            details: error.response?.data || error.message
        });
    }
};

exports.deleteVideo = async (videoId) => {
    try {
        const apiKey = process.env.VDOCIPHER_API_KEY;
        // One well-formed id only: `videos=` takes a comma-separated list.
        if (!apiKey || !isVideoId(videoId)) return false;

        const url = `https://dev.vdocipher.com/api/videos?videos=${encodeURIComponent(videoId)}`;

        await axios.delete(url, {
            headers: {
                'Authorization': `Apisecret ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Successfully deleted video ${videoId} from Vdocipher`);
        return true;
    } catch (error) {
        console.error('Failed to delete video from VdoCipher:', error.response?.data || error.message);
        return false;
    }
};
