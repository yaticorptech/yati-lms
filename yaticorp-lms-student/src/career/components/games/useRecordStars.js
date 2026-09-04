import { useEffect } from 'react';
import { recordStars } from './levels';

/**
 * Bank the stars for a finished level, once.
 *
 * In an effect rather than during render: recording is a write to storage, and
 * a write in the render body fires again on every re-render — harmless here
 * only because the store keeps the maximum, which is not a good reason to do
 * it. The effect runs when the round actually ends.
 */
export default function useRecordStars(progress, over, stars) {
  useEffect(() => {
    if (over && stars > 0) {
      recordStars(progress.gameId, progress.level, stars);
    }
  }, [over, stars, progress.gameId, progress.level]);
}
