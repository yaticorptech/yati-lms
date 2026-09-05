/**
 * `true` while `loading` is true OR for at least `minMs` after mount.
 *
 * A loader that appears for 80ms is a flicker, not a moment: the page
 * blinks grey and lands before the eye has settled. Holding it briefly
 * turns the wait into the small piece of theatre it is meant to be — the
 * mascot, the line, the bar — without ever hiding data that took longer.
 */
import { useEffect, useState } from 'react';

export default function useMinimumLoading(loading, minMs = 900) {
  const [held, setHeld] = useState(true);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setHeld(false), reduce ? 0 : minMs);
    return () => clearTimeout(t);
  }, [minMs]);
  return loading || held;
}
