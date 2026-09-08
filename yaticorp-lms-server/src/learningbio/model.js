/**
 * The student's Learning Bio: what the AI wrote, what the student wrote
 * over it, their interests and their privacy choice. Everything else on the
 * bio page — courses, skills, certificates, projects, achievements — is
 * read live from the LMS each time, never copied here, so it can never go
 * stale or disagree with the rest of the app.
 *
 * `dataHash` is a fingerprint of the learning data the current AI bio was
 * written from. When the data changes, the hash no longer matches and the
 * bio is regenerated (within a daily budget) — that is what makes the bio
 * a living document rather than a snapshot.
 */
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },

    ai: {
        headline: { type: String, default: '' },
        bio: { type: String, default: '' },
        // Keep the short dashboard version separate: a trimmed paragraph
        // reads like a cut-off, a written summary reads like a summary.
        short: { type: String, default: '' },
        generatedAt: { type: Date, default: null },
        model: { type: String, default: '' },     // 'mock' when no AI key was available
        dataHash: { type: String, default: '' },
        regenerationsToday: { type: Number, default: 0 },
        regenerationsDay: { type: String, default: '' }
    },

    // The student's own wording. Shown instead of the AI text while
    // `useCustom` is on; kept when they switch back so nothing is lost.
    custom: {
        headline: { type: String, default: '' },
        bio: { type: String, default: '' },
        editedAt: { type: Date, default: null }
    },
    useCustom: { type: Boolean, default: false },

    interests: {
        // Chosen by the student; never removed by the detector.
        manual: { type: [String], default: [] },
        // Detected interests the student took off; not re-added.
        removed: { type: [String], default: [] }
    },

    // Whether the bio is theirs alone, shown on the LMS profile, or reachable
    // by a share link.
    visibility: { type: String, enum: ['private', 'profile', 'shareable'], default: 'private' },
    shareCode: { type: String, default: '', index: true },

    lastRefreshedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('LearningBio', schema, 'learningbio_profiles');
