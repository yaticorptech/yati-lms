import { useEffect, useRef } from 'react';
import { recordStars } from './levels';
import { recordSession } from './adaptive';

/**
 * Bank the stars for a finished level, once — and (2026-11-13) record the session for the adaptive engine and the
 * result feedback (adaptive.js): `metrics` { correct, wrong, hints, score, ms, limitMs } as far as the game knows
 * them. Time is measured from the round's start when the game does not give it.
 *
 * In an effect rather than during render: recording is a write to storage, and
 * a write in the render body fires again on every re-render — harmless here
 * only because the store keeps the maximum, which is not a good reason to do
 * it. The effect runs when the round actually ends.
 */
export default function useRecordStars(progress, over, stars, metrics = null) {
  const started = useRef(Date.now());
  const done = useRef(false);
  useEffect(() => {
    if (!over) { done.current = false; return; }
    if (stars > 0) recordStars(progress.gameId, progress.level, stars);
    if (done.current) return;
    done.current = true;
    recordSession(progress.gameId, {
      stars, passed: stars > 0, difficulty: progress.difficulty,
      ms: Date.now() - started.current, ...(metrics || {})
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, stars, progress.gameId, progress.level]);
}
