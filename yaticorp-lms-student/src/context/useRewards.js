/**
 * The rewards context and its hook, in a file of their own so the provider
 * file exports only a component (which is what fast refresh needs).
 */
import { createContext, useContext } from 'react';

export const RewardsContext = createContext({ enabled: false, summary: null, refresh: () => {}, celebrate: () => {}, pullEvents: () => {} });

export const useRewards = () => useContext(RewardsContext);

// What each activity pays when the rulebook has not loaded (or rewards are
// off): the server's own defaults, so nothing reads "+0 XP" for a moment.
const XP_DEFAULTS = { career_task: 10, career_task_quiz: 20, skill_quiz: 25, daily_activity: 5, mock_interview: 30 };

/**
 * The XP an activity pays right now, as the admin set it under Rewards →
 * Reward rules (carried in the rewards summary). Pages print and count with
 * this rather than a number of their own, so an edit there shows here.
 */
export const useXpRule = (type) => {
    const { summary } = useContext(RewardsContext);
    const v = summary?.xpRules?.[type];
    return Number.isFinite(v) ? v : (XP_DEFAULTS[type] ?? 0);
};

/**
 * What a priced feature costs from the wallet right now, as the admin set it
 * under Rewards → Reward rules → Wallet rules: { amount, currency }. 0 = free.
 */
export const useWalletCost = (action) => {
    const { summary } = useContext(RewardsContext);
    const v = Number(summary?.walletRules?.[action]);
    return { amount: Number.isFinite(v) && v > 0 ? v : 0, currency: summary?.wallet?.currency || 'INR' };
};
