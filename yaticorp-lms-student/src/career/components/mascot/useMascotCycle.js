import { useEffect, useState } from 'react';

/**
 * A banner mascot that changes pose every few seconds so the page feels
 * alive: one set while the day is in play, a celebrating set once it is
 * cleared. Under a reduced-motion preference it stays on the first pose.
 */
export const LIVE_POSES = [
  { pose: 'thumbs', motion: 'mc-float' },
  { pose: 'hello', motion: 'mc-wave-whole' },
  { pose: 'flex', motion: 'mc-encourage' },
  { pose: 'wink', motion: 'mc-peek' },
  { pose: 'hooray', motion: 'mc-bounce' },
  { pose: 'heart', motion: 'mc-float' },
  { pose: 'walk', motion: 'mc-walk' },
  { pose: 'excited', motion: 'mc-jump' },
  { pose: 'meditate', motion: 'mc-idle' },
  { pose: 'star', motion: 'mc-float' }
];

// The same idea for a mission still to be started: on the move.
export const MISSION_POSES = [
  { pose: 'run', motion: 'mc-run' },
  { pose: 'thumbs', motion: 'mc-float' },
  { pose: 'flex', motion: 'mc-encourage' },
  { pose: 'guide', motion: 'mc-nod' },
  { pose: 'jump', motion: 'mc-bounce' },
  { pose: 'walk', motion: 'mc-walk' },
  { pose: 'wink', motion: 'mc-peek' },
  { pose: 'hooray', motion: 'mc-float' }
];

export const DONE_POSES = [
  { pose: 'confetti', motion: 'mc-dance' },
  { pose: 'star', motion: 'mc-jump' },
  { pose: 'hooray', motion: 'mc-clap' },
  { pose: 'jump', motion: 'mc-bounce' }
];

const POSE_MS = 3800;

export default function useMascotCycle(set) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), POSE_MS);
    return () => clearInterval(t);
  }, []);
  return set[tick % set.length];
}
