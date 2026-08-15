/**
 * @author Preethesh Kulal
 * @description Integration with VdoCipher for DRM-protected video delivery
 */
const axios = require('axios');

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

        if (!apiKey) {
            return res.status(500).json({ message: 'VdoCipher API Key not configured' });
        }

        const url = `https://dev.vdocipher.com/api/videos/${videoId}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Apisecret ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        // The response contains a 'status' field (e.g. 'ready', 'queued', 'pre-upload')
        res.status(200).json(response.data);

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

        if (!apiKey) {
            return res.status(500).json({ message: 'VdoCipher API Key not configured' });
        }

        const url = `https://dev.vdocipher.com/api/videos/${videoId}/otp`;

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
        if (!apiKey || !videoId) return false;

        const url = `https://dev.vdocipher.com/api/videos?videos=${videoId}`;

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
