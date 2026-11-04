/**
 * A student's proof image (an activity photo, a rank certificate): into their
 * own Google Drive, shared by link so whoever checks it can open it. { url, driveId }.
 *
 * Since 2026-11-02 Drive is required where Google sign-in is set up: not linked,
 * the upload is refused (DriveRequired → 409 DRIVE_REQUIRED, and the app asks the
 * student to link Drive) rather than kept in our storage. Only a server without
 * Google sign-in at all still keeps it here.
 */
const { driveRequired, assertDriveLinked, storeInDrive } = require('../integrations/google/driveStore');
const { rasterExtension } = require('../organizations/controllers/orgAdminController');

const storeProof = async (userId, buffer, { name, description = '', folder = 'nccnss-proofs' }) => {
    const ext = rasterExtension(buffer);
    if (driveRequired()) {
        await assertDriveLinked(userId);
        const d = await storeInDrive(userId, buffer, {
            name: `${name}${ext}`,
            mimeType: { '.png': 'image/png', '.webp': 'image/webp' }[ext] || 'image/jpeg',
            description
        });
        return { url: d.viewUrl, driveId: d.driveFileId };
    }
    const { uploadToBunny } = require('../utils/bunnyStorage');
    return { url: await uploadToBunny(buffer, `proof${ext}`, folder), driveId: '' };
};

module.exports = { storeProof };
