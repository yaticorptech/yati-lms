import { useEffect, useState } from 'react';

/**
 * A banner mascot that changes pose every few seconds so the page feels
 * alive: one set while the day is in play, a celebrating set once it is
 * cleared. Under a reduced-motion preference it stays on the first pose.
 */
/*
 * One set per place, and no pose in two of them, so the mascot has its own
 * routine on every page rather than the same loop everywhere. `point` and
 * `guide` are left out of all of them: a pointing mascot reads as a hint.
 */

// The sidebar card, on every page: warm and brief.
export const SIDEBAR_POSES = [
  { pose: 'heart', motion: 'mc-float' },
  { pose: 'thumbs', motion: 'mc-float' },
  { pose: 'wink', motion: 'mc-peek' }
];

// Overview: arriving for the day — a welcome, the progress card, a word of
// encouragement, and settling in to focus.
export const OVERVIEW_POSES = [
  { pose: 'welcome', motion: 'mc-wave-whole' },
  { pose: 'progress', motion: 'mc-nod' },
  { pose: 'encourage', motion: 'mc-float' },
  { pose: 'focus', motion: 'mc-idle' }
];
// The streak, kept or lost, said by the mascot on the Overview.
export const STREAK_KEPT = { pose: 'streak', motion: 'mc-bounce' };
export const STREAK_LOST = { pose: 'streakbroken', motion: 'mc-idle' };

// Games: the briefing, the play, the verdict.
export const GAME_WON = [{ pose: 'win', motion: 'mc-dance' }];
export const GAME_LOST = [
  { pose: 'lose', motion: 'mc-idle' },
  { pose: 'tryagain', motion: 'mc-encourage' }
];

// Quizzes: the verdict.
export const QUIZ_CLEARED = [{ pose: 'clear', motion: 'mc-dance' }];
export const QUIZ_FAILED = [
  { pose: 'wrong', motion: 'mc-idle' },
  { pose: 'nexttry', motion: 'mc-encourage' }
];

// Today's Plan: work to do, on the move.
export const PLAN_POSES = [
  { pose: 'run', motion: 'mc-run' },
  { pose: 'flex', motion: 'mc-encourage' },
  { pose: 'jump', motion: 'mc-bounce' }
];

// Skills: learning, calmly.
export const SKILL_POSES = [
  { pose: 'meditate', motion: 'mc-idle' },
  { pose: 'thinking', motion: 'mc-think' },
  { pose: 'sit', motion: 'mc-idle' },
  { pose: 'care', motion: 'mc-float' }
];

// Ideas & Resources: curiosity and surprise.
export const IDEA_POSES = [
  { pose: 'shocked', motion: 'mc-bounce' },
  { pose: 'excited', motion: 'mc-jump' },
  { pose: 'confused', motion: 'mc-nod' }
];

// Community: saying hello, coming over, waving.
export const COMMUNITY_POSES = [
  { pose: 'hello', motion: 'mc-wave-whole' },
  { pose: 'walk', motion: 'mc-walk' },
  { pose: 'bye', motion: 'mc-wave-whole' }
];

// Enrolled Courses: ticking things off, cheering the work on, delighted.
export const COURSES_POSES = [
  { pose: 'taskdone', motion: 'mc-nod' },
  { pose: 'cheer', motion: 'mc-encourage' },
  { pose: 'clap', motion: 'mc-clap' }
];

// Rewards: celebrating.
export const REWARD_POSES = [
  { pose: 'levelup', motion: 'mc-jump' },
  { pose: 'confetti', motion: 'mc-dance' },
  { pose: 'hooray', motion: 'mc-clap' },
  { pose: 'star', motion: 'mc-jump' }
];

// A day cleared, wherever that is shown.
export const DONE_POSES = [
  { pose: 'taskdone', motion: 'mc-nod' },
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
