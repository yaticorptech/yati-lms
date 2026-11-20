const mongoose = require('mongoose');

/**
 * One student's WORDCRAFT (2026-11-20, Master Minds · Vocabulary; individual play). The server is the authority:
 *  · it deals each level's three challenges (the compulsory Tongue Twister and two of the other five, from a fair
 *    deck) and keeps the level's content, so the browser cannot choose an easier set;
 *  · it re-scores every submitted challenge from the transcript with the same code as the game
 *    (wordcraft/shared/score.js), once per challenge (a second submission gets the first answer back);
 *  · a level unlocks the next only when all three are done and the twister reached five correct in a row.
 * No audio is ever stored, nor the transcripts: only scores and the per-criterion marks.
 */
const historySchema = new mongoose.Schema({
    level: Number,
    stage: Number,
    kinds: [String],
    scores: [Number],
    total: Number,
    stars: Number,
    cleared: Boolean,
    at: { type: Date, default: Date.now }
}, { _id: false });

const challengeSchema = new mongoose.Schema({
    level: Number,
    kind: String,
    score: Number,
    passed: Boolean,
    typed: Boolean,
    parts: { type: mongoose.Schema.Types.Mixed, default: {} }, // criterion key → 0–100
    at: { type: Date, default: Date.now }
}, { _id: false });

const wordcraftSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // The highest level the student may play (one past the best cleared).
    unlocked: { type: Number, default: 1, min: 1 },
    // The dealing state (select.js dealCombo) and each recent level's three challenges (a retry keeps them).
    deal: { type: mongoose.Schema.Types.Mixed, default: null },
    combos: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Recently used content per bank, so prompts are not repeated.
    seen: { type: mongoose.Schema.Types.Mixed, default: {} },
    // The level being played: { id, level, stage, challenges, results: { "0": result, … }, startedAt }.
    active: { type: mongoose.Schema.Types.Mixed, default: null },
    // The last finished level ({ id, level, outcome, results }), so a repeated final submission is answered, not redone.
    last: { type: mongoose.Schema.Types.Mixed, default: null },
    // Best result per level: { "3": { total, stars } }.
    best: { type: mongoose.Schema.Types.Mixed, default: {} },
    levelsCompleted: { type: Number, default: 0 },   // levels finished (all three challenges done)
    levelsCleared: { type: Number, default: 0 },     // of those, cleared (the twister done)
    challengesCompleted: { type: Number, default: 0 },
    challengesPassed: { type: Number, default: 0 },
    totalPoints: { type: Number, default: 0 },
    history: { type: [historySchema], default: [] },          // the last 60 levels
    challenges: { type: [challengeSchema], default: [] }      // the last 150 challenges
}, { timestamps: true });

module.exports = mongoose.model('CareerWordcraftProfile', wordcraftSchema, 'career_wordcraft_profiles');
