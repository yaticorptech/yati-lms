import { useState, useEffect } from 'react';

/**
 * The clock shared by every timed game.
 *
 * Counts down from `seconds` and stops at zero. The interval is torn down on
 * unmount and whenever the round ends, so a finished game cannot keep ticking
 * against a component that has gone away.
 */
export default function useTimedRound(seconds, running = true) {
  const [left, setLeft] = useState(seconds);
  const over = running && left <= 0;

  useEffect(() => {
    // Nothing ticks until the student has read the objective and pressed
    // Start — the clock used to be running behind the intro panel.
    if (!running || left <= 0) return undefined;
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [running, left]);

  return { seconds: Math.max(0, left), over };
}
