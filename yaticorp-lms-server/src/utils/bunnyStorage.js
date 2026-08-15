/**
 * @description Upload files to Bunny.net Storage and return their public CDN URL.
 *
 * Required env vars:
 *   BUNNY_STORAGE_ZONE     - storage zone name
 *   BUNNY_STORAGE_API_KEY  - storage zone password (Storage → FTP & API Access → Password)
 *   BUNNY_CDN_HOST         - pull-zone hostname connected to the zone, e.g. myzone.b-cdn.net
 *   BUNNY_STORAGE_HOST     - storage endpoint host (optional; default storage.bunnycdn.com;
 *                            region hosts look like ny./la./sg./syd./uk./se./br./jh.storage.bunnycdn.com)
 */
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

/**
 * Upload a buffer to Bunny Storage.
 * @param {Buffer} buffer       file bytes
 * @param {string} originalName original filename (used to keep the extension)
 * @param {string} folder       destination folder inside the storage zone
 * @returns {Promise<string>}   public CDN URL of the uploaded file
 */
const uploadToBunny = async (buffer, originalName = 'file', folder = 'uploads') => {
    const zone = process.env.BUNNY_STORAGE_ZONE;
    const accessKey = process.env.BUNNY_STORAGE_API_KEY;
    const cdnHost = process.env.BUNNY_CDN_HOST;
    const storageHost = process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com';

    if (!zone || !accessKey || !cdnHost) {
        throw new Error('Bunny Storage is not configured (set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_CDN_HOST)');
    }

    const ext = (path.extname(originalName) || '.jpg').toLowerCase();
    const objectPath = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    await axios.put(
        `https://${storageHost}/${zone}/${objectPath}`,
        buffer,
        {
            headers: {
                AccessKey: accessKey,
                'Content-Type': 'application/octet-stream',
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        }
    );

    // Serve via the pull zone CDN
    return `https://${cdnHost}/${objectPath}`;
};

/**
 * Stream a (potentially large) file to Bunny Storage without buffering it in memory.
 * @param {ReadableStream} readStream  file read stream
 * @param {string} originalName        original filename (for the extension)
 * @param {string} folder              destination folder inside the storage zone
 * @param {number} contentLength       byte size of the file (sets Content-Length)
 * @returns {Promise<string>}          public CDN URL of the uploaded file
 */
const uploadStreamToBunny = async (readStream, originalName = 'file', folder = 'uploads', contentLength) => {
    const zone = process.env.BUNNY_STORAGE_ZONE;
    const accessKey = process.env.BUNNY_STORAGE_API_KEY;
    const cdnHost = process.env.BUNNY_CDN_HOST;
    const storageHost = process.env.BUNNY_STORAGE_HOST || 'storage.bunnycdn.com';

    if (!zone || !accessKey || !cdnHost) {
        throw new Error('Bunny Storage is not configured (set BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_CDN_HOST)');
    }

    const ext = (path.extname(originalName) || '').toLowerCase();
    const objectPath = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

    await axios.put(
        `https://${storageHost}/${zone}/${objectPath}`,
        readStream,
        {
            headers: {
                AccessKey: accessKey,
                'Content-Type': 'application/octet-stream',
                ...(contentLength ? { 'Content-Length': contentLength } : {}),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
        }
    );

    return `https://${cdnHost}/${objectPath}`;
};

module.exports = { uploadToBunny, uploadStreamToBunny };
