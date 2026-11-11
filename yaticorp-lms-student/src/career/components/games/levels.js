import { useState, useCallback } from 'react';
import api from '../../services/api';
import lms from '../../../utils/api';
import { gameKey, currentStudentId } from './gameStorage';
import { takeOutbox, putBackOutbox, setSeenElsewhere } from './questionMemory';

// The star rules live in stars.js so a test can load them; see there.
export { starsFor, starsCap, starsForFixed } from './stars';

/**
 * Levels inside one difficulty band, and the ladder as a whole.
 *
 * Every game's own settings are written for a ladder of three bands of thirty steps (configFor(difficulty, step)).
 * Since 2026-10-31 a game is 500 levels, climbed in episodes of fifteen: five easy, five medium, five hard
 * (since 2026-11-05), each episode starting a little higher than the last. A level's "pressure" (0…1) picks the step on the old
 * ninety-step ladder that it plays as, so every game gets the curve without being touched.
 */
export const LEVELS_PER_BAND = 30;
export const BANDS = 3;
export const TOTAL_LEVELS = 500;
const STEPS = LEVELS_PER_BAND * BANDS;       // the ninety settings each game has

const EPISODE = 15;
const PHASE = 5;
const TIERS = ['easy', 'medium', 'hard'];
const clampLevel = (level) => Math.min(TOTAL_LEVELS, Math.max(1, Math.floor(Number(level) || 1)));

/**
 * How hard a level is, 0 (the first) to 1 (the hardest a game goes).
 *
 * A roller coaster (asked 2026-11-05: "first 5 easy, then medium, then hard,
 * again easy, medium, hard"): every fifteen levels are five easy, five
 * medium, five hard, each a little harder than the one before it. The
 * next easy run drops back down, but starts above the last one, so the
 * whole ladder still climbs.
 */
export const pressure = (level) => {
  const l = clampLevel(level);
  const episode = Math.floor((l - 1) / EPISODE);
  const episodes = Math.ceil(TOTAL_LEVELS / EPISODE) - 1;
  const at = (l - 1) % EPISODE;                  // 0…14 inside the episode
  const base = 0.75 * Math.pow(episode / episodes, 0.8);
  return Math.min(1, base + at * 0.018);         // +0.25 from its first easy to its last hard
};

/** 'easy' | 'medium' | 'hard': what the level is, for its badge. */
export const levelTier = (level) => TIERS[Math.floor(((clampLevel(level) - 1) % EPISODE) / PHASE)];

const stepOf = (level) => Math.round(pressure(level) * (STEPS - 1));    // 0…89

/** Which band a level plays in: 1 easy, 2 medium, 3 hard. */
export const bandOf = (level) => Math.min(BANDS, Math.floor(stepOf(level) / LEVELS_PER_BAND) + 1);

/** Where a level sits inside its band, 1…LEVELS_PER_BAND. */
export const stepInBand = (level) => (stepOf(level) % LEVELS_PER_BAND) + 1;

/**
 * How far through a band a level sits, 0 at its first step and 1 at its last.
 * Every game scales its own parameters off this, so the same step means the
 * same relative jump in all of them.
 */
export const ramp = (stepNo) =>
  Math.min(1, Math.max(0, (stepNo - 1) / (LEVELS_PER_BAND - 1)));

/** Interpolate between two values across a band, rounded to a whole number. */
export const between = (from, to, stepNo) => Math.round(from + (to - from) * ramp(stepNo));



// Per student, not per device: see gameStorage.js. Passed through gameKey()
// at every read and write, so signing out and in as someone else switches
// records without a reload.
const LEVEL_KEY = 'yati:gameLevel';
const STAR_KEY = 'yati:gameStars';

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(gameKey(key)) || '{}');
  } catch {
    // A corrupt entry must not take the games down with it.
    return {};
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(gameKey(key), JSON.stringify(value));
  } catch {
    // Private mode or a blocked origin: the game still plays.
  }
};

/* ---- Keeping the account in step with the browser ----------------------
 *
 * The browser stays the source of truth while a level is being played. When a
 * level ends the game's whole record — level reached and best stars per level
 * — is sent up, and the server keeps the higher of what it had and what it
 * was sent. Opening the hub pulls the account's copy back down and merges it
 * the same way, so progress follows the student between devices and the
 * leaderboard has something real to rank.
 */

/** Fired after the server has taken a game's record, so boards can refresh. */
export const GAMES_SYNCED = 'yati:games-synced';

/** Fired when a saved level paid XP: detail { xp, gameId }. */
export const GAME_XP = 'yati:game-xp';

/**
 * The admin's XP per star result ({ 1, 2, 3 }), as last read from the server
 * by the games page. Module state rather than context: sixty games render
 * GameShell, and none of them should have to pass it along.
 */
let xpTable = null;
export const setGameXpTable = (table) => { xpTable = table || null; };
export const gameXpTable = () => xpTable;

/** This browser's record of one game, in the shape the server takes. */
const localGame = (gameId) => {
  const stars = {};
  const prefix = `${gameId}:`;
  for (const [key, value] of Object.entries(read(STAR_KEY))) {
    if (key.startsWith(prefix)) stars[key.slice(prefix.length)] = value;
  }
  return { gameId, level: read(LEVEL_KEY)[gameId] || 1, stars };
};

// The level each game's last push came back at, so a catch-up run of pushes
// can tell whether the one before moved anything.
const pushedLevel = new Map();

/**
 * Send one game's record to the account. Fire-and-forget: a failed or
 * offline push loses nothing, because the next push or the next pull sends
 * the whole record again.
 *
 * The server takes at most one level further per request (see saveProgress),
 * so a browser that is several levels ahead — played offline, or a push was
 * lost — sends again while each answer still moves the account up, up to
 * `rounds` times. It stops as soon as an answer moves nothing: the server
 * has it all, or is holding it back until today's play time is counted.
 */
export const pushGame = (gameId, rounds = 10) => {
  // Nobody signed in: the record is a guest's and belongs to no account.
  if (!currentStudentId()) return Promise.resolve();
  const sent = localGame(gameId);
  return api
    .post('/games/progress', sent)
    .then(({ data }) => {
      window.dispatchEvent(new CustomEvent(GAMES_SYNCED, { detail: { gameId } }));
      if (data?.xpAwarded > 0) {
        window.dispatchEvent(new CustomEvent(GAME_XP, { detail: { xp: data.xpAwarded, gameId } }));
        // XP is money now too: the wallet and the XP figures re-read.
        window.dispatchEvent(new CustomEvent('yati:progress-changed'));
      }
      const moved = !data?.deferred && (data?.xpAwarded > 0 || (data?.level || 0) > (pushedLevel.get(gameId) || 0));
      pushedLevel.set(gameId, data?.level || 0);
      if (moved && rounds > 1 && (data?.level || 0) < sent.level) return pushGame(gameId, rounds - 1);
      return undefined;
    })
    .catch(() => {});
};

/**
 * Merge the account's record into this browser, and send back any game this
 * browser is ahead on. Resolves true when anything local changed, so the hub
 * knows to redraw its numbers.
 */
/**
 * The questions met, both ways (2026-10-31): what the solo games asked goes up to the account, and what the
 * account has (group games, other devices) comes down, so neither deals a question already met while new ones are
 * left. On the competitions API, beside the group games that use the same list.
 */
export const syncSeenQuestions = async () => {
  if (!currentStudentId()) return;
  const out = takeOutbox();
  try {
    if (out.length) await lms.post('/competitions/seen-questions', { keys: out });
  } catch {
    putBackOutbox(out);
  }
  try {
    const { data } = await lms.get('/competitions/seen-questions');
    if (Array.isArray(data?.keys)) setSeenElsewhere(data.keys);
  } catch { /* offline: the last list stands */ }
};

export const pullProgress = async () => {
  if (!currentStudentId()) return false;
  syncSeenQuestions();
  let games;
  try {
    ({ data: { games } } = await api.get('/games/progress'));
  } catch {
    return false;
  }
  const levels = read(LEVEL_KEY);
  const stars = read(STAR_KEY);
  let changed = false;
  const behind = [];

  for (const remote of games || []) {
    const local = localGame(remote.gameId);
    let localAhead = local.level > remote.level;
    if (remote.level > local.level) {
      levels[remote.gameId] = remote.level;
      changed = true;
    }
    for (const [level, n] of Object.entries(remote.stars || {})) {
      const key = `${remote.gameId}:${level}`;
      if (n > (stars[key] || 0)) {
        stars[key] = n;
        changed = true;
      }
    }
    for (const [level, n] of Object.entries(local.stars)) {
      if (n > (remote.stars?.[level] || 0)) localAhead = true;
    }
    if (localAhead) behind.push(remote.gameId);
  }

  // Games this browser knows and the account has never heard of.
  const known = new Set((games || []).map((g) => g.gameId));
  for (const gameId of Object.keys(levels)) if (!known.has(gameId)) behind.push(gameId);
  for (const key of Object.keys(stars)) {
    const gameId = key.split(':')[0];
    if (!known.has(gameId) && !behind.includes(gameId)) behind.push(gameId);
  }

  if (changed) {
    write(LEVEL_KEY, levels);
    write(STAR_KEY, stars);
  }
  [...new Set(behind)].forEach(pushGame);
  return changed;
};

/** The best stars earned on one level, so a replay cannot lower the record. */
export const recordStars = (gameId, level, stars) => {
  const key = `${gameId}:${level}`;
  const all = read(STAR_KEY);
  if ((all[key] || 0) >= stars) return;
  write(STAR_KEY, { ...all, [key]: stars });
  pushGame(gameId);
};

export const starsOn = (gameId, level) => read(STAR_KEY)[`${gameId}:${level}`] || 0;

/**
 * The last few levels and what they were worth, for the trail on the briefing.
 *
 * Shows where the student has just been rather than how far the ladder runs —
 * the total is deliberately never surfaced, so the climb has no visible
 * ceiling to measure yourself against.
 */
export const recentTrail = (gameId, level, count = 5) => {
  const first = Math.max(1, level - count);
  const out = [];
  for (let n = first; n < level; n += 1) out.push({ level: n, stars: starsOn(gameId, n) });
  return out;
};

/** Every level the student has finished, across all games. */
export const levelsCleared = () =>
  Object.values(read(LEVEL_KEY)).reduce((sum, level) => sum + (Number(level) - 1), 0);

/** Every star earned, across all games. */
export const totalStars = () =>
  Object.values(read(STAR_KEY)).reduce((sum, n) => sum + Number(n), 0);

/** Every star a game has earned, for the hub card. */
export const starsForGame = (gameId) =>
  Object.entries(read(STAR_KEY))
    .filter(([key]) => key.startsWith(`${gameId}:`))
    .reduce((sum, [, value]) => sum + value, 0);

/** How far a game has been climbed, for the hub card. */
export const levelReached = (gameId) => read(LEVEL_KEY)[gameId] || 1;

/* ---- The game played most recently -----------------------------------
 * One id, kept in this browser for the signed-in student, so the hub can mark where the student left
 * off. Deliberately not sent to the account: it is a pointer back into the
 * page, not progress, and the level and star records already follow the
 * student between devices.
 */
const RECENT_KEY = 'yati:gameRecent';

/** Note that a game has just been opened. */
export const markPlayed = (gameId) => {
  try {
    localStorage.setItem(gameKey(RECENT_KEY), JSON.stringify({ gameId, at: Date.now() }));
  } catch {
    // Private mode or a blocked origin: the hub simply shows no marker.
  }
};

/** The id of the game opened most recently, or null. */
export const lastPlayed = () => {
  try {
    const { gameId } = JSON.parse(localStorage.getItem(gameKey(RECENT_KEY)) || '{}');
    return typeof gameId === 'string' ? gameId : null;
  } catch {
    return null;
  }
};

/**
 * Where the student has got to in one game.
 *
 * A single number. Clearing level 30 moves them to 31, which is simply the
 * first level of the next band — the step up in difficulty happens under
 * their feet rather than being chosen from a menu.
 */
export default function useGameProgress(gameId) {
  const [level, setLevel] = useState(() => read(LEVEL_KEY)[gameId] || 1);
  // Bumped whenever a fresh round should be built, so games can key state off it.
  const [attempt, setAttempt] = useState(0);

  const advance = useCallback(() => {
    setLevel((current) => {
      const next = Math.min(TOTAL_LEVELS, current + 1);
      write(LEVEL_KEY, { ...read(LEVEL_KEY), [gameId]: next });
      return next;
    });
    setAttempt((a) => a + 1);
    // The updater above runs when React flushes the batch, which is before a
    // queued task: by the time this fires, storage holds the new level.
    setTimeout(() => { pushGame(gameId); syncSeenQuestions(); }, 0);
  }, [gameId]);

  /** Play this level again without moving. */
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  return {
    gameId,
    level,
    // Derived, so every game's configFor(difficulty, step) keeps working
    // untouched while the student only ever sees one number.
    difficulty: bandOf(level),
    levelNo: stepInBand(level),
    tier: levelTier(level),
    attempt,
    advance,
    retry,
    atEnd: level >= TOTAL_LEVELS
  };
}
