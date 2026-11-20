/**
 * WORDCRAFT on the server (2026-11-20). The rules the browser cannot be trusted with:
 *  · the level's three challenges are dealt here — always the Tongue Twister plus two different others (checked);
 *  · levels are played in order: a level above the unlocked one is refused and the unlocked one is played instead;
 *  · each challenge is submitted once, in order, and re-scored here from the transcript (shared/score.js — the same
 *    code the game runs); a repeated submission gets the stored result back and changes nothing;
 *  · the twister is replayed attempt by attempt: only five correct in a row completes it;
 *  · a level finishes when all three are in, and unlocks the next only with the twister done.
 * Only scores are kept — no audio, no transcripts.
 */
const crypto = require('crypto');
const WordcraftProfile = require('../models/WordcraftProfile');

let shared = null;
/** The game's own logic (ES modules copied from the student app by scripts/syncWordcraft.js). */
const lib = () => {
    shared ||= Promise.all([import('./shared/select.js'), import('./shared/score.js'), import('./shared/rand.js')])
        .then(([select, score, rand]) => ({ ...select, ...score, ...rand }));
    return shared;
};

const KEEP_SEEN = 40;
const KEEP_HISTORY = 60;
const KEEP_CHALLENGES = 150;
const MAX_TEXT = 6000;

class WordcraftError extends Error {
    constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

const newId = () => crypto.randomBytes(9).toString('hex');
const newSeed = () => crypto.randomBytes(4).readUInt32LE(0);

/** The three challenges obey the rule: one twister, two different optional challenges. */
const validCombo = (L, combo) => Array.isArray(combo) && combo.length === 3
    && combo.filter((k) => k === L.TWISTER).length === 1
    && new Set(combo.filter((k) => k !== L.TWISTER)).size === 2
    && combo.every((k) => k === L.TWISTER || L.OPTIONAL.includes(k));

const ensureProfile = async (userId) => WordcraftProfile.findOneAndUpdate(
    { userId }, { $setOnInsert: { userId } }, { upsert: true, new: true, setDefaultsOnInsert: true }
).lean();

/** What the browser is told about the level being played. */
const publicSession = (a) => (a ? { id: a.id, level: a.level, stage: a.stage, challenges: a.challenges, results: a.results || {} } : null);

/**
 * Start (or resume) a level. `wanted` above the unlocked level plays the unlocked one. The same unfinished level
 * resumes where it was left; any other level replaces it.
 */
const startLevel = async (userId, wanted) => {
    const L = await lib();
    const p = await ensureProfile(userId);
    const level = Math.max(1, Math.min(Math.floor(Number(wanted) || 1), p.unlocked || 1));
    if (p.active && p.active.level === level) return { session: publicSession(p.active), unlocked: p.unlocked, resumed: true };

    const rng = L.seeded(newSeed());
    const combos = { ...(p.combos || {}) };
    let deal = p.deal || L.freshDeal();
    let combo = combos[level];
    if (!validCombo(L, combo)) {
        const r = L.dealCombo(rng, deal);
        combo = r.combo; deal = r.state;
        combos[level] = combo;
        Object.keys(combos).map(Number).sort((a, b) => b - a).slice(40).forEach((k) => delete combos[k]);
    }
    if (!validCombo(L, combo)) throw new WordcraftError(500, 'The level could not be dealt.');
    const stage = L.stageOf(level);
    const seen = { ...(p.seen || {}) };
    const challenges = L.makeChallenges(rng, combo, stage, seen);
    for (const c of challenges) {
        const b = L.bankOf(c.kind);
        seen[b] = [...(seen[b] || []).filter((id) => id !== c.item.id), c.item.id].slice(-KEEP_SEEN);
        if (c.twists) seen.twist = [...(seen.twist || []), ...c.twists.map((t) => t.id)].slice(-KEEP_SEEN);
    }
    const active = { id: newId(), level, stage, challenges, results: {}, startedAt: new Date() };
    // Only if nobody else replaced the level meanwhile (two tabs starting at once): otherwise use theirs.
    const done = await WordcraftProfile.updateOne(
        { _id: p._id, 'active.id': p.active ? p.active.id : null },
        { $set: { active, deal, combos, seen } }
    );
    if (!done.modifiedCount) {
        const now = await WordcraftProfile.findById(p._id).lean();
        return { session: publicSession(now.active), unlocked: now.unlocked, resumed: true };
    }
    return { session: publicSession(active), unlocked: p.unlocked, resumed: false };
};

const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo; };
/** What a submission may carry, cleaned. Anything else is ignored. */
const cleanPayload = (ch, body) => {
    if (ch.kind === 'twister') {
        if (body?.unsupported === true) return { unsupported: true };
        const attempts = Array.isArray(body?.attempts) ? body.attempts : [];
        if (attempts.length > 20) throw new WordcraftError(400, 'Too many attempts.');
        return { attempts: attempts.map((a) => ({ spoken: String(a?.spoken || '').slice(0, 600), secs: num(a?.secs, 0, 120) })) };
    }
    const text = typeof body?.text === 'string' ? body.text : '';
    if (text.length > MAX_TEXT) throw new WordcraftError(400, 'That answer is too long.');
    if (!text.trim()) throw new WordcraftError(400, 'Nothing was said or written.');
    const limit = (ch.seconds || 60) * 2 + 10;
    return { text, typed: body?.typed === true, spokeFor: num(body?.spokeFor, 0, limit), pauses: Math.round(num(body?.pauses, 0, 60)) };
};

/** What is kept of a result (no transcript). */
const stored = (L, kind, r) => ({
    kind,
    score: r.score,
    passed: L.passedChallenge(kind, r),
    done: kind === 'twister' ? !!r.done : undefined,
    typed: !!r.typed,
    unsupported: !!r.unsupported,
    parts: (r.parts || []).map((p) => ({ key: p.key, label: p.label, value: p.value })),
    strengths: r.strengths || [],
    improve: r.improve || [],
    said: r.said || undefined,
    used: r.used ? r.used.map((t) => t.word) : undefined,
    wpm: r.wpm || undefined
});

/**
 * Submit challenge `index` of session `sessionId`. Returns { result, duplicate, level? (the outcome once all three are
 * in), stats? }.
 */
const submitChallenge = async (userId, { sessionId, index, ...body }) => {
    const L = await lib();
    const p = await WordcraftProfile.findOne({ userId }).lean();
    const a = p?.active;
    if (!a || a.id !== String(sessionId || '')) {
        if (p?.last?.id && p.last.id === String(sessionId || '')) return { result: p.last.results?.[String(index)] || null, duplicate: true, level: p.last.outcome, stats: statsOf(p) };
        throw new WordcraftError(409, 'This level is no longer active — start it again.');
    }
    const i = Math.floor(Number(index));
    if (!(i >= 0 && i < a.challenges.length)) throw new WordcraftError(400, 'No such challenge.');
    const results = a.results || {};
    if (results[String(i)]) return { result: results[String(i)], duplicate: true };
    const next = a.challenges.findIndex((_, k) => !results[String(k)]);
    if (i !== next) throw new WordcraftError(409, 'Complete the challenges in order.');

    const ch = a.challenges[i];
    const r = L.scoreChallenge(ch, cleanPayload(ch, body));
    const keep = stored(L, ch.kind, r);
    const path = `active.results.${i}`;
    const write = await WordcraftProfile.updateOne(
        { _id: p._id, 'active.id': a.id, [path]: { $exists: false } },
        {
            $set: { [path]: keep },
            $inc: { challengesCompleted: 1, challengesPassed: keep.passed ? 1 : 0 },
            $push: { challenges: { $each: [{ level: a.level, kind: ch.kind, score: keep.score, passed: keep.passed, typed: keep.typed, parts: Object.fromEntries(keep.parts.map((x) => [x.key, x.value])) }], $slice: -KEEP_CHALLENGES } }
        }
    );
    if (!write.modifiedCount) {
        // Another request for the same challenge got there first: answer with what it stored.
        const now = await WordcraftProfile.findById(p._id).lean();
        return { result: now.active?.results?.[String(i)] || keep, duplicate: true };
    }
    const all = { ...results, [String(i)]: keep };
    if (Object.keys(all).length < a.challenges.length) return { result: keep, duplicate: false };
    return { result: keep, duplicate: false, ...(await finishLevel(L, p._id, a, all)) };
};

/** All three are in: record the level, unlock the next if it was cleared, close the session. */
const finishLevel = async (L, docId, a, results) => {
    const outcome = L.levelOutcome(a.challenges, a.challenges.map((_, k) => results[String(k)]));
    const before = await WordcraftProfile.findById(docId).lean();
    const prevBest = before.best?.[String(a.level)]?.total || 0;
    const gain = Math.max(0, outcome.total - prevBest); // total points = the sum of each level's best
    const update = {
        $set: { active: null, last: { id: a.id, level: a.level, outcome, results } },
        $inc: { levelsCompleted: 1, levelsCleared: outcome.cleared ? 1 : 0, totalPoints: gain },
        $push: { history: { $each: [{ level: a.level, stage: a.stage, kinds: a.challenges.map((c) => c.kind), scores: a.challenges.map((_, k) => results[String(k)].score), total: outcome.total, stars: outcome.stars, cleared: outcome.cleared }], $slice: -KEEP_HISTORY } }
    };
    if (outcome.total > prevBest || outcome.stars > (before.best?.[String(a.level)]?.stars || 0)) {
        update.$set[`best.${a.level}`] = { total: Math.max(outcome.total, prevBest), stars: Math.max(outcome.stars, before.best?.[String(a.level)]?.stars || 0) };
    }
    if (outcome.cleared) update.$max = { unlocked: a.level + 1 };
    const res = await WordcraftProfile.updateOne({ _id: docId, 'active.id': a.id }, update);
    const after = await WordcraftProfile.findById(docId).lean();
    return { level: { ...outcome, level: a.level, recorded: res.modifiedCount > 0 }, stats: statsOf(after) };
};

const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
/** Which criterion feeds which skill. */
const SKILLS = {
    vocabulary: [['dont-say', 'vocab'], ['talk60', 'vocab'], ['sell', 'vocab'], ['plot', 'creativity']],
    grammar: [['plot', 'grammar'], ['caption', 'language']],
    fluency: [['talk60', 'fluency'], ['talk60', 'continuity'], ['sell', 'clarity']],
    pronunciation: [['twister', 'acc']],
    creativity: [['caption', 'creativity'], ['sell', 'creativity'], ['caption', 'originality']]
};
/** The student's numbers: totals, accuracy, best, skills now and their change, per challenge, recent levels. */
const statsOf = (p) => {
    if (!p) return null;
    const ch = p.challenges || [];
    const skill = (pairs, list) => avg(list.flatMap((c) => pairs.filter(([k]) => k === c.kind).map(([, key]) => c.parts?.[key]).filter((v) => typeof v === 'number')));
    const recent = ch.slice(-20); const earlier = ch.slice(0, -20);
    const skills = Object.fromEntries(Object.entries(SKILLS).map(([name, pairs]) => {
        const now = skill(pairs, recent); const was = skill(pairs, earlier);
        return [name, { score: now, change: now !== null && was !== null ? now - was : null }];
    }));
    const kinds = ['dont-say', 'caption', 'talk60', 'plot', 'sell', 'twister'];
    const perChallenge = Object.fromEntries(kinds.map((k) => { const xs = ch.filter((c) => c.kind === k).map((c) => c.score); return [k, { played: xs.length, average: avg(xs), best: xs.length ? Math.max(...xs) : null }]; }));
    const hist = p.history || [];
    const lastFive = hist.slice(-5).map((h) => h.total); const prevFive = hist.slice(-10, -5).map((h) => h.total);
    const bests = Object.values(p.best || {}).map((b) => b.total || 0);
    return {
        unlocked: p.unlocked || 1,
        totalPoints: p.totalPoints || 0,
        levelsCompleted: p.levelsCompleted || 0,
        levelsCleared: p.levelsCleared || 0,
        challengesCompleted: p.challengesCompleted || 0,
        accuracy: p.challengesCompleted ? Math.round((p.challengesPassed / p.challengesCompleted) * 100) : null,
        bestLevelScore: bests.length ? Math.max(...bests) : null,
        improvement: lastFive.length && prevFive.length ? avg(lastFive) - avg(prevFive) : null,
        skills,
        perChallenge,
        history: hist.slice(-10).reverse()
    };
};

/** The student's state: unlocked level, the level in progress (to resume), their stats. */
const getState = async (userId) => {
    const p = await WordcraftProfile.findOne({ userId }).lean();
    return { unlocked: p?.unlocked || 1, session: publicSession(p?.active), stats: statsOf(p) || statsOf({}) };
};

/** Stars the server has verified, per level — the cap on what the generic progress save accepts for WORDCRAFT. */
const verifiedStars = async (userId) => {
    const p = await WordcraftProfile.findOne({ userId }, { best: 1 }).lean();
    return Object.fromEntries(Object.entries(p?.best || {}).map(([lv, b]) => [lv, b.stars || 0]));
};

module.exports = { startLevel, submitChallenge, getState, verifiedStars, statsOf, WordcraftError, lib };
