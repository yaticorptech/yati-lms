/**
 * Age zones for the group games, on the server (2026-11-13, age-based brain training part 3). Private rooms and online
 * tables are made in one zone (Young Thinkers, Rising Brains, Master Minds); who may sit in them follows the one rule
 * of ./zoneAccess.js, read from the student's class as held on the account (career/services/gameZone.js effectiveZone):
 * a zone above their own is never playable (2026-11-14), whatever their results. A class lowered in Career Path
 * counts at once; one raised follows one zone per academic year (see gameZone.js).
 */
const GameProgress = require('../../career/models/GameProgress');
const { effectiveZone } = require('../../career/services/gameZone');
const { ZONES, ZONE_DIFFICULTY, GROUP_ZONES } = require('../games/zones');
const { accessFor, canPlay, readiness, MESSAGE } = require('./zoneAccess');
const { SOLO } = require('./unlocks');

const ZONE_NAMES = { young: 'Young Thinkers', smart: 'Rising Brains', master: 'Master Minds' };
// A room made by a student whose class is not known yet (decided 2026-11-13).
const DEFAULT_ZONE = 'smart';
const DIFFICULTY_ZONE = Object.fromEntries(Object.entries(ZONE_DIFFICULTY).map(([z, d]) => [d, z]));

const isZone = (z) => ZONES.includes(z);
const inZone = (game, zone) => (GROUP_ZONES[game] || []).includes(zone);

/** { zone, band, classNumber, educationLevel, source } from the student's Career Path class (zone null if unknown). */
// Since 2026-11-14 the zone held on the account (career/services/gameZone.js effectiveZone): a class retyped upwards
// does not move it at will, and deleting the Career Path goal does not drop it to "class unknown".
const zoneOfUser = (userId) => effectiveZone(userId);

/** The adaptive record of a group game's solo twin (null: no twin, or never played). */
const twinStats = async (userId, game) => {
    const solo = SOLO[game];
    if (!solo) return null;
    const doc = await GameProgress.findOne({ userId, gameId: solo }).select('stats').lean();
    return doc?.stats || null;
};

/** Accounts with every group game open (./unlocks.js ALWAYS_OPEN) are let into any zone too. */
const alwaysOpen = (userId) => require('./unlocks').alwaysOpen(userId);

/**
 * May this student play `game` in `zone`? → { status, canPlay, message, own }.
 * `own` may be passed (a zoneOfUser result) to save a read.
 */
const groupAccess = async (userId, game, zone, own) => {
    if (!isZone(zone) || !inZone(game, zone)) return { status: 'locked', canPlay: false, message: MESSAGE.locked, own: own?.zone ?? null };
    const mine = own || (await zoneOfUser(userId));
    let status = accessFor(mine.zone, zone, await twinStats(userId, game));
    if (status === 'preview' && (await alwaysOpen(userId))) status = 'unlocked';
    return { status, canPlay: canPlay(status), message: MESSAGE[status], own: mine.zone };
};

/** Readiness (0 none, 1 one zone up, 2 two zones up) of every solo game the student has an adaptive record for. */
const readinessByGame = async (userId) => {
    const docs = await GameProgress.find({ userId }).select('gameId stats').lean();
    return Object.fromEntries(docs.map((d) => [d.gameId, readiness(d.stats)]));
};

/** Recent performance (0…1, average of the last 5 sessions' perf) in a group game's solo twin: 0 when none. */
const recentPerf = async (userId, game) => {
    const sessions = (await twinStats(userId, game))?.sessions;
    const last = Array.isArray(sessions) ? sessions.slice(-5) : [];
    return last.length ? last.reduce((n, s) => n + (Number(s.perf) || 0), 0) / last.length : 0;
};

/**
 * The zone a room is made in when none was picked: the host's own zone (unknown → Rising Brains) if the game is
 * played there, else the nearest zone below, else the nearest above.
 */
const defaultZone = (ownZone, game) => {
    const home = isZone(ownZone) ? ownZone : DEFAULT_ZONE;
    const i = ZONES.indexOf(home);
    const order = [home, ...ZONES.slice(0, i).reverse(), ...ZONES.slice(i + 1)];
    return order.find((z) => inZone(game, z)) || home;
};

/** A zone the student could play this game in instead (highest playable below/at `zone`), or null. */
const suggestZone = async (userId, game, zone, own) => {
    for (const z of ZONES.slice(0, ZONES.indexOf(zone)).reverse()) {
        if ((await groupAccess(userId, game, z, own)).canPlay) return z;
    }
    return null;
};

/** The kind words for a player who cannot play `game` in `zone` (they / you). */
const refusal = async ({ userId, name, you, game, label, zone, access, own }) => {
    const where = ZONE_NAMES[zone] || zone;
    if (!inZone(game, zone)) {
        const elsewhere = (GROUP_ZONES[game] || []).map((z) => ZONE_NAMES[z]);
        return elsewhere.length
            ? `${label} isn't played in ${where} — it's in ${elsewhere.join(' and ')}.`
            : `${label} isn't open for group play in any zone yet.`;
    }
    const alt = await suggestZone(userId, game, zone, own);
    const who = you ? 'You haven’t' : `${name} hasn’t`;
    const tip = alt ? ` — try ${ZONE_NAMES[alt]}.` : '.';
    // Since 2026-11-14 a zone above is never unlocked by results (./zoneAccess.js): say it is for an older class.
    if (access.status === 'preview') return `${label} in ${where} is for an older class${you ? '' : ` than ${name}’s`}${tip}`;
    return `${who} got access to ${label} in ${where}${tip}`;
};

/** Throws `PlayError` (403) with a kind message unless this player may play `game` in `zone`. */
const assertCanPlay = async ({ userId, name, you = false, game, label, zone, PlayError }) => {
    const own = await zoneOfUser(userId);
    const access = await groupAccess(userId, game, zone, own);
    if (access.canPlay) return access;
    const message = await refusal({ userId, name, you, game, label, zone, access, own });
    throw Object.assign(new PlayError(message, 403), { zoneLocked: { game, zone, status: access.status, player: name || null } });
};

module.exports = {
    ZONES, ZONE_NAMES, ZONE_DIFFICULTY, DIFFICULTY_ZONE, DEFAULT_ZONE, isZone, inZone,
    zoneOfUser, groupAccess, readinessByGame, recentPerf, defaultZone, assertCanPlay
};
