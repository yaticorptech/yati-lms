/**
 * @description A certificate or award the student uploaded themselves — from
 *              a school, a competition, another platform. Sits in the profile
 *              frame beside the certificates YATICORPX3 issues for its courses.
 *
 * The file lives on Bunny storage (YATICORPX3's CDN, where course assets go),
 * or on Cloudinary when Bunny isn't configured. `storage` + `objectPath` /
 * `publicId` are kept so a delete here also deletes the asset there, rather
 * than leaving an orphan the student can no longer reach.
 */
const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    issuer: { type: String, default: '', trim: true, maxlength: 120 },
    kind: { type: String, enum: ['certificate', 'award', 'other'], default: 'certificate' },
    issuedOn: { type: Date, default: null },
    fileUrl: { type: String, required: true },
    thumbnailUrl: { type: String, default: '' },
    fileType: { type: String, enum: ['image', 'pdf'], required: true },
    // 'drive' (2026-11-02): in the student's own Google Drive, shared by link; driveFileId to delete it and download it.
    storage: { type: String, enum: ['bunny', 'cloudinary', 'drive'], default: 'bunny' },
    driveFileId: { type: String, default: '' },
    objectPath: { type: String, default: '' },   // Bunny
    // A PDF's page-one picture, drawn by the student's browser at upload
    // (Bunny has no PDF renderer); stored beside it, removed with it.
    thumbnailObjectPath: { type: String, default: '' },
    publicId: { type: String, default: '' },     // Cloudinary
    originalName: { type: String, default: '' },
    // Framed (2026-11-11): the file above is the certificate inside a border carrying its number in the student's
    // series (services/certificateFrame.js); the file as uploaded is kept beside it.
    framed: { type: Boolean, default: false },
    certificateNumber: { type: String, default: '' },
    original: {
        type: { _id: false, fileUrl: String, fileType: String, storage: String, driveFileId: String, objectPath: String, publicId: String },
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);
