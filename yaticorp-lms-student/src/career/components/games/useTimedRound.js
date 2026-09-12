import { useState, useEffect } from 'react';

/**
 * The clock shared by every timed game.
 *
 * Counts down from `seconds` and stops at zero — or sooner, when the game
 * reports `done`: a student who has earned everything the level offers is
 * finished, and should not be kept waiting on a clock for a score that can
 * no longer change. The interval is torn down on unmount and whenever the
 * round ends, so a finished game cannot keep ticking against a component that
 * has gone away.
 */
/**
 * Whether a round is over: the clock has run out, or the game has said it is
 * done. Pure and exported so the rule can be pinned by a test.
 */
export const isOver = (running, left, done = false) => running && (left <= 0 || done);

export default function useTimedRound(seconds, running = true, done = false) {
  const [left, setLeft] = useState(seconds);
  const over = isOver(running, left, done);

  useEffect(() => {
    // Nothing ticks until the student has read the objective and pressed
    // Start — the clock used to be running behind the intro panel. And
    // nothing ticks once the game has said it is done: a level finished
    // early is finished, not paused with the clock still going.
    if (!running || left <= 0 || done) return undefined;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running, left, done]);

  return { seconds: Math.max(0, left), over };
}
