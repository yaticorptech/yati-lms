/**
 * A student's proof image (an activity photo, a rank certificate): into their
 * own Google Drive when they connected it, shared by link so whoever checks it
 * can open it; otherwise, or if Drive refuses, into our storage. { url, driveId }.
 */
const { saveFile, shareByLink } = require('../integrations/google/drive');
const { rasterExtension } = require('../organizations/controllers/orgAdminController');

const storeProof = async (userId, buffer, { name, description = '', folder = 'nccnss-proofs' }) => {
    const ext = rasterExtension(buffer);
    const saved = await saveFile(userId, {
        name: `${name}${ext}`,
        mimeType: { '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg',
        content: buffer,
        description
    }).catch(() => ({ ok: false }));
    if (saved.ok && (await shareByLink(userId, saved.id).catch(() => ({ ok: false }))).ok) return { url: saved.link, driveId: saved.id };
    const { uploadToBunny } = require('../utils/bunnyStorage');
    return { url: await uploadToBunny(buffer, `proof${ext}`, folder), driveId: '' };
};

module.exports = { storeProof };
