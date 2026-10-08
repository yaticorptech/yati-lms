import { useRewards } from '../../context/useRewards';

/**
 * The one streak every page shows: the Rewards streak — one day added for any
 * day with at least one learning activity (a lesson, a quiz, a Career Path
 * task, the daily question, interview practice), back to 1 after a missed
 * day. The same figure as the profile and the header. Career Path's own count
 * from finished tasks is only the fallback, for when an admin locks Rewards.
 */
export default function useStreak(fallback = 0) {
    const rewards = useRewards();
    const current = rewards?.enabled ? rewards.summary?.streak?.current : undefined;
    return typeof current === 'number' ? current : fallback;
}
