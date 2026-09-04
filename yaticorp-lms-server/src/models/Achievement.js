/**
 * @description A certificate or award the student uploaded themselves — from
 *              a school, a competition, another platform. Sits in the profile
 *              frame beside the certificates the LMS issues for its courses.
 *
 * The file lives on Bunny storage (the LMS's CDN, where course assets go),
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
    storage: { type: String, enum: ['bunny', 'cloudinary'], default: 'bunny' },
    objectPath: { type: String, default: '' },   // Bunny
    publicId: { type: String, default: '' },     // Cloudinary
    originalName: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);
