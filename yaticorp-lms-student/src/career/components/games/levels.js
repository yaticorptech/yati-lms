import { useState, useCallback } from 'react';
import api from '../../services/api';

// The star rules live in stars.js so a test can load them; see there.
export { starsFor, starsCap } from './stars';

/**
 * Levels inside one difficulty band, and the ladder as a whole.
 *
 * Thirty per band rather than twenty, and three bands, so every game is a
 * ninety-level climb. The bands still exist — they are what makes level 61
 * harder than level 31 — but the student never picks one. They start at level
 * one and the game gets harder underneath them.
 */
export const LEVELS_PER_BAND = 30;
export const BANDS = 3;
export const TOTAL_LEVELS = LEVELS_PER_BAND * BANDS;

/** Which band a level sits in: 1 for 1–30, 2 for 31–60, 3 for 61–90. */
export const bandOf = (level) =>
  Math.min(BANDS, Math.floor((Math.max(1, level) - 1) / LEVELS_PER_BAND) + 1);

/** Where a level sits inside its own band, 1…LEVELS_PER_BAND. */
export const stepInBand = (level) => ((Math.max(1, level) - 1) % LEVELS_PER_BAND) + 1;

/**
 * How far through a band a level sits, 0 at its first step and 1 at its last.
 * Every game scales its own parameters off this, so the same step means the
 * same relative jump in all twenty.
 */
export const ramp = (stepNo) =>
  Math.min(1, Math.max(0, (stepNo - 1) / (LEVELS_PER_BAND - 1)));

/** Interpolate between two values across a band, rounded to a whole number. */
export const between = (from, to, stepNo) => Math.round(from + (to - from) * ramp(stepNo));



const LEVEL_KEY = 'yati:gameLevel';
const STAR_KEY = 'yati:gameStars';

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    // A corrupt entry must not take the games down with it.
    return {};
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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

/** This browser's record of one game, in the shape the server takes. */
const localGame = (gameId) => {
  const stars = {};
  const prefix = `${gameId}:`;
  for (const [key, value] of Object.entries(read(STAR_KEY))) {
    if (key.startsWith(prefix)) stars[key.slice(prefix.length)] = value;
  }
  return { gameId, level: read(LEVEL_KEY)[gameId] || 1, stars };
};

/**
 * Send one game's record to the account. Fire-and-forget: a failed or
 * offline push loses nothing, because the next push or the next pull sends
 * the whole record again.
 */
export const pushGame = (gameId) =>
  api
    .post('/games/progress', localGame(gameId))
    .then(() => window.dispatchEvent(new CustomEvent(GAMES_SYNCED, { detail: { gameId } })))
    .catch(() => {});

/**
 * Merge the account's record into this browser, and send back any game this
 * browser is ahead on. Resolves true when anything local changed, so the hub
 * knows to redraw its numbers.
 */
export const pullProgress = async () => {
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
    setTimeout(() => pushGame(gameId), 0);
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
    attempt,
    advance,
    retry,
    atEnd: level >= TOTAL_LEVELS
  };
}
