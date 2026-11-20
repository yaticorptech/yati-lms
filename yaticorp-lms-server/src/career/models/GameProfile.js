const mongoose = require('mongoose');

/**
 * The student's date of birth and class, asked when they open Games (2026-11-17, the user: "a popup for date of
 * birth and class, as the organisation asks it"). Where Career Path has no class, the games zone comes from this one
 * (services/gameZone.js); the held-zone rules (GameZoneLock) apply to it the same way.
 *   level  'school' (classNumber 1–12) or 'college' (beyond school: Master Minds)
 */
const gameProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  dateOfBirth: { type: Date, required: true },
  level: { type: String, enum: ['school', 'college'], default: 'school' },
  classNumber: { type: Number, min: 1, max: 12, default: null }
}, { timestamps: true });

module.exports = mongoose.models.GameProfile || mongoose.model('GameProfile', gameProfileSchema);
