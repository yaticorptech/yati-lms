import { Gift, ArrowUpCircle, Trophy, BookOpen, Award, ArrowDownToLine, RotateCcw, Briefcase, Sparkles, Wallet } from 'lucide-react';

export const money = (n, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : `${currency} `}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const num = (n) => Number(n || 0).toLocaleString('en-IN');

// The wallet balance as the server holds it. The starting credit is a real,
// spend-only ledger entry now (it used to be added here for display only, so
// students saw ₹1,50,000 they could not actually spend).
export const balance = (available) => Number(available || 0);

/** The line a ledger row is shown under. The starting credit always reads the
 *  same, whatever text it was booked with. */
export const txTitle = (t) =>
    t.source === 'starting_credit' ? 'Starting wallet credit' : t.description || SOURCE_LABEL[t.source] || t.source;

export const when = (d) => {
    const date = new Date(d);
    return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

/** The day a ledger row is listed under: Today, Yesterday, or the date (with
 *  the year only when it is not this year). */
export const dayLabel = (d) => {
    const date = new Date(d);
    const now = new Date();
    const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const days = Math.round((start(now) - start(date)) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }) });
};

/** The time of day alone, for a row already under its day. */
export const timeOf = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const SOURCE_LABEL = {
    // Credits from XP made before XP stopped turning into money (2026-10-26).
    xp_reward: 'XP reward (earlier)',
    starting_credit: 'Starting credit',
    learning_reward: 'Learning reward',
    leaderboard_reward: 'Leaderboard reward',
    referral_reward: 'Referral reward',
    job_earning: 'Job earning',
    purchase: 'Purchase',
    feature_charge: 'Feature used',
    feature_refund: 'Refund',
    withdrawal: 'Withdrawal',
    withdrawal_refund: 'Withdrawal returned',
    admin_adjustment: 'Adjustment',
    wallet_recharge: 'Wallet recharge',
    streak_milestone: 'Streak milestone',
    badge: 'Badge',
    leaderboard: 'Leaderboard',
    referral: 'Referral',
    admin: 'Bonus',
    campaign: 'Campaign',
    redeem: 'Redeemed',
    reversal: 'Reversal'
};

export const STATUS_CLS = {
    completed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-sky-100 text-sky-700',
    paid: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
    rejected: 'bg-red-100 text-red-700',
    reversed: 'bg-slate-100 text-slate-600'
};

/** Each kind of ledger row's icon and colours (the wallet card and popup). */
export const SOURCE_ICON = {
    xp_reward: { Icon: Sparkles, cls: 'bg-amber-100 text-amber-600' },
    starting_credit: { Icon: Gift, cls: 'bg-emerald-100 text-emerald-600' },
    learning_reward: { Icon: ArrowUpCircle, cls: 'bg-emerald-100 text-emerald-600' },
    leaderboard_reward: { Icon: Trophy, cls: 'bg-amber-100 text-amber-600' },
    referral_reward: { Icon: Gift, cls: 'bg-pink-100 text-pink-600' },
    job_earning: { Icon: Briefcase, cls: 'bg-sky-100 text-sky-600' },
    purchase: { Icon: BookOpen, cls: 'bg-indigo-100 text-indigo-600' },
    feature_charge: { Icon: Sparkles, cls: 'bg-violet-100 text-violet-600' },
    feature_refund: { Icon: RotateCcw, cls: 'bg-emerald-100 text-emerald-600' },
    withdrawal: { Icon: ArrowDownToLine, cls: 'bg-slate-100 text-slate-600' },
    withdrawal_refund: { Icon: RotateCcw, cls: 'bg-slate-100 text-slate-600' },
    admin_adjustment: { Icon: Award, cls: 'bg-violet-100 text-violet-600' },
    wallet_recharge: { Icon: Wallet, cls: 'bg-emerald-100 text-emerald-600' }
};
export const iconOf = (source) => SOURCE_ICON[source] || SOURCE_ICON.admin_adjustment;
