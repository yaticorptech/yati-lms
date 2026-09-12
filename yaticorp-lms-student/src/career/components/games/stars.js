/**
 * The two rules that turn a score into stars, and nothing else.
 *
 * Pure, with no imports, so they can be pinned by a test under plain node —
 * levels.js, where they lived, also reaches the API client, which reads
 * Vite's import.meta.env and cannot be loaded outside the app. Every game
 * still imports them from './levels', which re-exports them.
 */

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

/**
 * The score at which a level has nothing left to give.
 *
 * starsFor pays its third star at 1.5x the target, so past this point a
 * student is playing for nothing — every timed game used to keep the clock
 * running anyway, and at three stars with forty seconds left the only move
 * was to wait. A round that reaches this is complete, whatever the clock
 * says. Ceil, so the figure is a whole score a game can actually reach and
 * starsFor(starsCap(t), t) is always 3.
 */
export const starsCap = (target) => Math.ceil(target * 1.5);
