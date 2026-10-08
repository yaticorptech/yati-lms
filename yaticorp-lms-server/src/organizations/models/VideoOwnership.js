/**
 * Who uploaded a VdoCipher video.
 *
 * Every VdoCipher video sits in the platform's one VdoCipher account, so the
 * provider cannot say whose a video is. One row is written here when upload
 * credentials are issued (that is when the video id is minted), and it is the
 * proof an organization needs before it may attach, inspect or delete that
 * video. `organizationId` null means a platform administrator uploaded it.
 *
 * A new collection on purpose: lessons and courses keep their shape, and
 * videos uploaded before this existed simply have no row — see
 * services/videoOwnership.js for how those are judged.
 */
const mongoose = require('mongoose');

const videoOwnershipSchema = new mongoose.Schema({
    videoId: { type: String, required: true, unique: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = mongoose.model('VideoOwnership', videoOwnershipSchema, 'video_ownerships');
