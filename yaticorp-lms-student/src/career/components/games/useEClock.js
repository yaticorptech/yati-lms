import { useEffect, useState } from 'react';

/**
 * Group E's play clock (2026-11-14): milliseconds of play, counted only while `running`. Pausing stops the count
 * and resuming carries on from where it was — elapsed time is summed tick by tick, never read as a wall-clock gap,
 * so a pause (or a background tab) never eats into the time left. It stops by itself at `limitMs`.
 */
export default function useEClock(running, limitMs = Infinity, tickMs = 100) {
  const [elapsed, setElapsed] = useState(0);
  const live = running && elapsed < limitMs;
  useEffect(() => {
    if (!live) return undefined;
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      // A throttled background tab can deliver one late tick: count at most a second for it.
      const gap = Math.min(1000, now - last);
      last = now;
      setElapsed((e) => Math.min(limitMs, e + gap));
    }, tickMs);
    return () => clearInterval(id);
  }, [live, limitMs, tickMs]);
  return elapsed;
}
