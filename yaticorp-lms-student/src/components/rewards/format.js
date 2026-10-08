export const money = (n, currency = 'INR') =>
    `${currency === 'INR' ? '₹' : `${currency} `}${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const num = (n) => Number(n || 0).toLocaleString('en-IN');

// The wallet balance as the server holds it. The starting credit is a real,
// spend-only ledger entry now (it used to be added here for display only, so
// students saw ₹1,50,000 they could not actually spend).
export const balance = (available) => Number(available || 0);

/** What `xp` is worth at the admin's rate, e.g. 1000 XP = ₹10. */
export const xpValue = (xp, conversion) =>
    conversion?.pointsPerUnit ? (Number(xp || 0) * Number(conversion.unitValue || 0)) / Number(conversion.pointsPerUnit) : 0;

/** The line a ledger row is shown under. The starting credit always reads the
 *  same, whatever text it was booked with. */
export const txTitle = (t) =>
    t.source === 'starting_credit' ? 'Starting wallet credit' : t.description || SOURCE_LABEL[t.source] || t.source;

export const when = (d) => {
    const date = new Date(d);
    return `${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
};

export const SOURCE_LABEL = {
    xp_reward: 'XP converted',
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
