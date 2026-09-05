/**
 * "Wallet & Rewards": the in-LMS balance the student has earned, reward
 * points and lifetime earnings, and the latest transactions. One button,
 * "View All Transactions", opens the full wallet: ledger, reward-point
 * history and redemption.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Gift, TrendingUp, ArrowUpCircle, Trophy, BookOpen, Award, ArrowDownToLine, RotateCcw, Briefcase, X } from 'lucide-react';
import api from '../../utils/api';
import WalletSection from './WalletSection';
import { money, num, SOURCE_LABEL } from './format';

const ICON = {
    learning_reward: { Icon: ArrowUpCircle, cls: 'bg-emerald-100 text-emerald-600' },
    leaderboard_reward: { Icon: Trophy, cls: 'bg-amber-100 text-amber-600' },
    referral_reward: { Icon: Gift, cls: 'bg-pink-100 text-pink-600' },
    job_earning: { Icon: Briefcase, cls: 'bg-sky-100 text-sky-600' },
    purchase: { Icon: BookOpen, cls: 'bg-indigo-100 text-indigo-600' },
    withdrawal: { Icon: ArrowDownToLine, cls: 'bg-slate-100 text-slate-600' },
    withdrawal_refund: { Icon: RotateCcw, cls: 'bg-slate-100 text-slate-600' },
    admin_adjustment: { Icon: Award, cls: 'bg-violet-100 text-violet-600' }
};

const ago = (d) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return 'Today';
    const days = Math.floor(s / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const Sheet = ({ title, onClose, children, wide }) => {
    useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
    // Centred, and never taller than the screen: the panel scrolls inside
    // itself so its own header stays put instead of being pushed off the top
    // of the page.
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl ${wide ? 'max-w-4xl' : 'max-w-md'} rw-pop`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
                {title && (
                    <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-5 py-4">
                        <p className="text-lg font-black text-slate-900">{title}</p>
                        <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X size={16} /></button>
                    </div>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

export default function WalletCard() {
    const [data, setData] = useState(null);
    const [sheet, setSheet] = useState(false);
    const load = useCallback(() => api.get('/rewards/wallet').then((r) => setData(r.data)).catch(() => {}), []);
    useEffect(() => {
        load();
        window.addEventListener('yati:progress-changed', load);
        return () => window.removeEventListener('yati:progress-changed', load);
    }, [load]);

    const w = data?.wallet;
    const cur = w?.currency || 'INR';

    return (
        <section id="wallet" className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900"><Wallet size={22} className="text-slate-800" /> Wallet &amp; Rewards</h2>
                <button onClick={() => setSheet(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50">View All Transactions</button>
            </div>

            {!data ? (
                <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
            ) : (
                <>
                    <div className="stagger grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-600">Wallet Balance</p><span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600"><Wallet size={16} /></span></div>
                            <p className="mt-2 text-3xl font-black tabular-nums text-emerald-700">{money(w.available, cur)}</p>
                            <p className="text-xs font-semibold text-emerald-600">Earned inside the LMS</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                            <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-600">Reward Points</p><span className="rounded-lg bg-amber-100 p-1.5 text-amber-600"><Gift size={16} /></span></div>
                            <p className="mt-2 text-3xl font-black tabular-nums text-amber-700">{num(w.rewardPoints)}</p>
                            <p className="text-xs font-semibold text-amber-700/80">{num(data.conversion.pointsPerUnit)} pts = {money(data.conversion.unitValue, cur)}</p>
                        </div>
                        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                            <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-600">Total Earned</p><span className="rounded-lg bg-sky-100 p-1.5 text-sky-600"><TrendingUp size={16} /></span></div>
                            <p className="mt-2 text-3xl font-black tabular-nums text-sky-700">{money(w.totalEarned, cur)}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex-1 rounded-2xl border border-slate-200">
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="font-bold text-slate-800">Recent Transactions</p>
                        </div>
                        {data.recent.length === 0 ? (
                            <p className="p-6 text-center text-sm text-slate-500">No transactions yet. Streak milestones and badges pay reward points; redeem them here to fill your wallet.</p>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {data.recent.slice(0, 4).map((t) => {
                                    const { Icon, cls } = ICON[t.source] || ICON.admin_adjustment;
                                    const credit = t.type === 'credit';
                                    return (
                                        <li key={t._id} className="flex items-center gap-3 px-4 py-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cls}`}><Icon size={18} /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-bold text-slate-800">{t.description || SOURCE_LABEL[t.source] || t.source}</p>
                                                <p className="truncate text-xs text-slate-500">{SOURCE_LABEL[t.source] || t.source}{t.status !== 'completed' ? ` · ${t.status}` : ''}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-black tabular-nums ${credit ? 'text-emerald-600' : 'text-rose-500'}`}>{credit ? '+' : '-'}{money(t.amount, cur)}</p>
                                                <p className="text-xs text-slate-500">{ago(t.createdAt)}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </>
            )}

            {sheet && (
                <Sheet onClose={() => setSheet(false)} wide>
                    <div className="relative">
                        <button onClick={() => setSheet(false)} className="absolute right-3 top-3 z-20 rounded-full bg-white p-1.5 text-slate-400 shadow-md ring-1 ring-slate-200 hover:text-slate-600" aria-label="Close"><X size={16} /></button>
                        <WalletSection />
                    </div>
                </Sheet>
            )}
        </section>
    );
}
