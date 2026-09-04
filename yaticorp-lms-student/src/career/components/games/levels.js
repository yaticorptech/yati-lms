import { useState, useCallback } from 'react';

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

/**
 * One to three stars for how well a level was cleared, nought for a miss.
 *
 * Games where a lower number is better — moves used, guesses spent — pass
 * `lowerIsBetter` and the comparison flips.
 */
export const starsFor = (value, target, lowerIsBetter = false) => {
  if (!target) return value > 0 ? 3 : 0;
  if (lowerIsBetter) {
    if (value > target) return 0;
    if (value <= target * 0.7) return 3;
    if (value <= target * 0.85) return 2;
    return 1;
  }
  if (value < target) return 0;
  if (value >= target * 1.5) return 3;
  if (value >= target * 1.2) return 2;
  return 1;
};

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

/** The best stars earned on one level, so a replay cannot lower the record. */
export const recordStars = (gameId, level, stars) => {
  const key = `${gameId}:${level}`;
  const all = read(STAR_KEY);
  if ((all[key] || 0) >= stars) return;
  write(STAR_KEY, { ...all, [key]: stars });
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
