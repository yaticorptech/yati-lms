/**
 * The rewards context and its hook, in a file of their own so the provider
 * file exports only a component (which is what fast refresh needs).
 */
import { createContext, useContext } from 'react';

export const RewardsContext = createContext({ enabled: false, summary: null, refresh: () => {}, celebrate: () => {}, pullEvents: () => {}, markEventsSeen: () => Promise.resolve() });

export const useRewards = () => useContext(RewardsContext);

/**
 * The XP an activity pays right now, as the admin set it under Rewards →
 * Reward rules (carried in the rewards summary). Pages print and count with
 * this rather than a number of their own, so an edit there shows here.
 *
 *   null  — not known: Rewards is locked, or the summary has not loaded.
 *           Nothing is paid while Rewards is locked, so there is no amount
 *           to promise; the page says nothing about XP rather than a number.
 *   0     — the rulebook is loaded and this activity pays nothing (the rule
 *           is 0, or the admin removed it).
 *   n > 0 — what it pays.
 *
 * Show an XP promise only when the value is above 0. There used to be a
 * built-in table of defaults here for the null case, which put "earns 30 XP"
 * on screens while Rewards was locked and nothing was being paid.
 */
export const useXpRule = (type) => {
    const { enabled, summary } = useContext(RewardsContext);
    if (!enabled || !summary) return null;
    const v = Number(summary.xpRules?.[type]);
    return Number.isFinite(v) && v > 0 ? v : 0;
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
