export const money = (n, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : `${currency} `}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const num = (n) => Number(n || 0).toLocaleString('en-IN');

export const when = (d) => {
    const date = new Date(d);
    return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const SOURCE_LABEL = {
    learning_reward: 'Learning reward',
    leaderboard_reward: 'Leaderboard reward',
    referral_reward: 'Referral reward',
    job_earning: 'Job earning',
    purchase: 'Purchase',
    withdrawal: 'Withdrawal',
    withdrawal_refund: 'Withdrawal returned',
    admin_adjustment: 'Adjustment',
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
