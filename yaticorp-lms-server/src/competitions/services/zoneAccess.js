/**
 * Who may play what, by age zone (2026-11-13, age-based brain training part 3). One rule for the solo games, private
 * rooms and online matches, checked on the server whenever a room is made, joined, started or a seat online is taken,
 * so a room code can never get round it. The registered class is never changed by it.
 *
 *   own zone                 → 'recommended' (the zone made for the student)
 *   a zone below             → 'available'   (deliberate practice, always open)
 *   any zone above           → 'preview'     (seen, never played). Since 2026-11-14 the registered class alone decides:
 *                              product decision "do not automatically grant higher-level game access", so good
 *                              results in a game no longer unlock it a zone up. readiness() is still computed and
 *                              shown (GET /api/career/games/access) as encouragement, but it opens nothing.
 *   class not known yet      → 'available' everywhere. Deliberate, and unchanged: with no class there is no zone to
 *                              recommend or restrict against. It cannot be used to dodge a known class: once a zone
 *                              has been worked out it is held on the account (career/services/gameZone.js
 *                              effectiveZone, career GameZoneLock) even if the Career Path goal is deleted.
 *
 * The only other way into a zone above is an account the operators open on purpose (./unlocks.js ALWAYS_OPEN, applied
 * in ./zoneGate.js), never a student's own results. A group game's readiness is read from its solo twin (unlocks.js SOLO).
 */
const ZONES = ['young', 'smart', 'master'];
// 'unlocked' is only ever set by an operator's always-open account (zoneGate.groupAccess), never by accessFor.
const PLAYABLE = ['recommended', 'available', 'unlocked'];

/** Readiness from a game's adaptive record: 0 none, 1 ready for one zone up, 2 ready for two. Informational only. */
const readiness = (stats) => {
    const sessions = Array.isArray(stats?.sessions) ? stats.sessions : [];
    const avg = (xs) => (xs.length ? xs.reduce((n, s) => n + (Number(s.perf) || 0), 0) / xs.length : 0);
    const last5 = sessions.slice(-5), last3 = sessions.slice(-3);
    if (stats?.stage === 'expert' && last5.length >= 5 && avg(last5) >= 0.85) return 2;
    if (['hard', 'expert'].includes(stats?.stage) && last3.length >= 3 && avg(last3) >= 0.75) return 1;
    return 0;
};

/**
 * The access a student whose own zone is `own` has to a game in zone `target`. The third argument (the game's
 * adaptive stats) is accepted for the old callers and ignored: performance never raises access.
 */
// eslint-disable-next-line no-unused-vars
const accessFor = (own, target, _stats = null) => {
    if (!ZONES.includes(target)) return 'locked';
    if (!ZONES.includes(own)) return 'available';
    const gap = ZONES.indexOf(target) - ZONES.indexOf(own);
    if (gap === 0) return 'recommended';
    if (gap < 0) return 'available';
    // 2026-11-14 (the user): every section is open — a higher one is played too, as practice ('available').
    return 'available';
};
const canPlay = (status) => PLAYABLE.includes(status);

/** Kind words for the student about a status (never "you failed"). */
const MESSAGE = {
    recommended: 'Made for your class.',
    available: 'Open for practice.',
    unlocked: 'You’re ready to try a more advanced challenge!',
    preview: 'This one is for an older class. Keep practising the games in your own zone.',
    locked: 'Not available in this zone.'
};

module.exports = { ZONES, PLAYABLE, readiness, accessFor, canPlay, MESSAGE };
