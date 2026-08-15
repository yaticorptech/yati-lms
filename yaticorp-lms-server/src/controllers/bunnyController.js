/**
 * @author Preethesh Kulal
 * @description Integration with Bunny.net CDN for video streaming
 */
const axios = require('axios');

exports.createVideo = async (req, res) => {
    try {
        const { title } = req.body;
        const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
        const apiKey = process.env.BUNNY_STREAM_API_KEY;

        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        if (!libraryId || !apiKey) {
            return res.status(500).json({ message: 'Bunny.net Stream is not configured on the server' });
        }

        // 1. Create the video object in Bunny Stream
        const response = await axios.post(
            `https://video.bunnycdn.com/library/${libraryId}/videos`,
            { title },
            {
                headers: {
                    'AccessKey': apiKey,
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                }
            }
        );

        // 2. Return the guid (videoId) and libraryId to the client
        // The client will then upload the file using: 
        // PUT https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}
        res.status(200).json({
            videoId: response.data.guid,
            libraryId: libraryId,
            apiKey: apiKey // NOTE: In a more secure setup, we might use a temporary upload token if Bunny supports it, 
                           // but for direct PUT as per docs, the AccessKey is often used or a specific upload key.
        });

    } catch (error) {
        console.error('Bunny.net Create Video Error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Failed to create Bunny.net video object',
            details: error.response?.data || error.message
        });
    }
};
