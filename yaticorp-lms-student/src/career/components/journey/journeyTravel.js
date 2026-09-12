/**
 * The one clock the roadmap's arrival plays to.
 *
 * A plain module rather than an export of JourneyTrack, because the hero
 * beside the track has to read the same clock — its percentage counts up to
 * land on the same beat, its card pulses on the same beat — and a component
 * file that also exports helpers breaks fast refresh.
 */

/** Where the fill starts, after the checkpoints have popped in. */
export const LEAD_S = 0.35;
/** Longest the fill may take end to end, however many phases are done. */
export const TRAVEL_S = 1.1;
/** Slowest a single segment may fill, so a short journey still reads as one. */
export const STEP_MAX_S = 0.28;

/**
 * `step` is how long each travelled segment takes to fill, and `arrive` is
 * the moment the fill reaches the checkpoint being stood on — which is when
 * that checkpoint lights, the percentage lands, and the card beside the
 * track pulses. Capped both ways: fifteen done phases must not take four
 * seconds to draw, and one done phase must not flash by.
 */
export const travel = (states = []) => {
  const done = states.filter((s) => s === 'done').length;
  const step = Math.min(STEP_MAX_S, TRAVEL_S / Math.max(1, done));
  return { done, step, arrive: LEAD_S + done * step };
};
