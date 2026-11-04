/**
 * No question twice (asked 2026-10-31: "in every game, solo and group, don't repeat any questions"). Each student's
 * questions already met are kept here, by key; a group game deals the questions nobody at the table has seen
 * before any they have, and the solo games (the student app's QuizGame) send theirs too and read this back.
 *
 *   keyOf(q)    one question exactly: its prompt, its options in any order, and its picture
 *   optKey(q)   the same question as the solo game words it: its options in any order (a bank question's options
 *               are the same in both, its prompt is not) — the student app works it out the same way
 *
 * Banks are finite: once everything has been met, the least recently met come back, never before.
 */
const mongoose = require('mongoose');

const LIMIT = 8000;          // keys kept a student; the oldest drop off
const Seen = mongoose.models.SeenQuestion || mongoose.model('SeenQuestion', new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    keys: { type: [String], default: [] }
}, { timestamps: true }), 'seen_questions');

// djb2, base 36: the student app's questionMemory.js hashes the same way.
const hash = (text) => {
    let h = 5381;
    for (let i = 0; i < text.length; i += 1) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
};
const norm = (x) => String(x ?? '').trim().toLowerCase();
const optKey = (q) => (Array.isArray(q?.options) && q.options.length ? `o${hash(q.options.map(norm).sort().join('\u0001'))}` : '');
const keyOf = (q) => (q ? `q${hash(`${norm(q.prompt)}|${(q.options || []).map(norm).sort().join('\u0001')}|${JSON.stringify(q.visual || q.show || q.code || '')}`)}` : '');

/** Everything these students have met, as one set. */
const load = async (userIds) => {
    const ids = userIds.filter((id) => id && mongoose.isValidObjectId(id));
    if (!ids.length) return new Set();
    const docs = await Seen.find({ userId: { $in: ids } }).select('keys').lean();
    return new Set(docs.flatMap((d) => d.keys));
};

/** Note that these students have now met these questions. */
const add = async (userIds, keys) => {
    const clean = [...new Set(keys.filter((k) => typeof k === 'string' && /^[qo][0-9a-z]{1,13}$/.test(k)))].slice(0, 200);
    if (!clean.length) return;
    await Promise.all(userIds.filter((id) => id && mongoose.isValidObjectId(id)).map((userId) =>
        Seen.updateOne({ userId }, { $push: { keys: { $each: clean, $slice: -LIMIT } } }, { upsert: true })));
};

/** Has anyone here met it? */
const seenBy = (set) => (q) => set.has(keyOf(q)) || set.has(optKey(q));

module.exports = { keyOf, optKey, load, add, seenBy, hash };
