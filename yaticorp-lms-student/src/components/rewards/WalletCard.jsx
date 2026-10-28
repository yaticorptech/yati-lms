/**
 * "Wallet & Rewards": the in-LMS balance the student has earned, reward
 * points and lifetime earnings, and the latest transactions. One button,
 * "View All Transactions", opens the full wallet: ledger, reward-point
 * history and redemption.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, X, ShoppingBag } from 'lucide-react';
import api from '../../utils/api';
import WalletSection from './WalletSection';
import { money, balance, SOURCE_LABEL, txTitle, iconOf } from './format';
import Portal from '../Portal';
import useBackClose from '../../native/useBackClose';

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

// `label` names a sheet that has no title bar of its own (the full wallet
// carries its own heading), so the dialog is still announced by name.
const Sheet = ({ title, label, onClose, children, wide }) => {
    useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
    // Android's back button closes the sheet instead of leaving the dashboard.
    useBackClose(onClose);
    // Centred, and never taller than the screen: the panel scrolls inside
    // itself so its own header stays put instead of being pushed off the top
    // of the page.
    return (
        <Portal>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
                <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl ${wide ? 'max-w-xl' : 'max-w-md'} rw-pop`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title || label}>
                    {title && (
                        <div className="flex items-center justify-between rounded-t-3xl border-b border-slate-100 bg-white px-5 py-4">
                            <p className="text-lg font-black text-slate-900">{title}</p>
                            <button onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X size={16} /></button>
                        </div>
                    )}
                    {/* On a phone the card keeps its size and its contents are drawn a size smaller. */}
                    <div className="min-h-0 flex-1 overflow-y-auto max-sm:[zoom:0.86]">{children}</div>
                </div>
            </div>
        </Portal>
    );
};

/**
 * The full wallet — balance, transactions, reward points, XP — in its popup.
 * "View All Transactions" opens it from this card, and the wallet button in
 * the top bar opens it over whatever page the student is on (StudentLayout).
 */
export function WalletSheet({ onClose }) {
    return (
        <Sheet onClose={onClose} label="Wallet and transactions" wide>
            <div className="relative">
                {/* Over the wallet's violet header, so white on a glass circle. */}
                <button onClick={onClose} className="absolute right-3 top-3 z-20 rounded-full bg-white/15 p-1.5 text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25 sm:right-4 sm:top-4" aria-label="Close"><X size={16} /></button>
                <WalletSection />
            </div>
        </Sheet>
    );
}

export default function WalletCard() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [sheet, setSheet] = useState(false);
    // A failed load says so and offers another try. It used to be swallowed,
    // and the card sat on its loading skeleton for good.
    const load = useCallback(() => api.get('/rewards/wallet')
        .then((r) => { setData(r.data); setError(null); })
        .catch((e) => setError(e.response?.data?.message || 'Could not load your wallet')), []);
    const closeSheet = useCallback(() => setSheet(false), []);
    useEffect(() => {
        load();
        // Back on the tab: re-read, so a rate the admin just changed shows
        // without a reload.
        const onVisible = () => document.visibilityState === 'visible' && load();
        window.addEventListener('yati:progress-changed', load);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('yati:progress-changed', load);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [load]);

    const w = data?.wallet;
    const cur = w?.currency || 'INR';

    return (
        <section id="wallet" className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900"><Wallet size={22} className="text-slate-800" /> Wallet &amp; Rewards</h2>
                <button onClick={() => setSheet(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50">View All Transactions</button>
            </div>

            {!data && error ? (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    <span>{error}</span>
                    <button type="button" onClick={load} className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm font-bold text-red-700 hover:bg-red-100">Try again</button>
                </div>
            ) : !data ? (
                <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}</div>
            ) : (
                <>
                    {/* Balance and spent only: no "Total earned" (taken off, 2026-10-26). */}
                    <div className="stagger grid gap-3 sm:grid-cols-2">
                        <div className="@container min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-sm font-semibold text-slate-600">Wallet Balance</p>
                            <p className="mt-2 min-w-0 whitespace-nowrap text-[clamp(1.125rem,13cqw,1.875rem)] font-black leading-tight tabular-nums text-emerald-700">{money(balance(w.available), cur)}</p>
                            <p className="text-xs font-semibold text-emerald-700/80">Spend it on courses and features</p>
                        </div>
                        {/* XP does not turn into wallet money (2026-10-26): money only here. */}
                        <div className="@container min-w-0 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                            <div className="flex items-start justify-between"><p className="text-sm font-semibold text-slate-600">Total Spent</p><span className="rounded-lg bg-amber-100 p-1.5 text-amber-600"><ShoppingBag size={16} /></span></div>
                            <p className="mt-2 min-w-0 whitespace-nowrap text-[clamp(1.125rem,13cqw,1.875rem)] font-black leading-tight tabular-nums text-amber-700">{money(w.totalSpent, cur)}</p>
                            <p className="text-xs font-semibold text-amber-700/80">On courses and features</p>
                        </div>
                    </div>

                    <div className="mt-4 flex-1 rounded-2xl border border-slate-200">
                        <div className="border-b border-slate-100 px-4 py-3">
                            <p className="font-bold text-slate-800">Recent Transactions</p>
                        </div>
                        {data.recent.length === 0 ? (
                            <p className="p-6 text-center text-sm text-slate-500">No transactions yet. Every XP you earn pays into your wallet at the rate above.</p>
                        ) : (
                            // Three rows tall, the rest scrolling inside the card
                            // (the account owner's call, 2026-10-05): every recent
                            // transaction is there, and the card never grows.
                            <ul data-transactions className="scroll-fade max-h-[194px] divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-b-2xl">
                                {data.recent.map((t) => {
                                    const { Icon, cls } = iconOf(t.source);
                                    const credit = t.type === 'credit';
                                    return (
                                        <li key={t._id} className="flex items-center gap-3 px-4 py-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cls}`}><Icon size={18} /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-bold text-slate-800">{txTitle(t)}</p>
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

            {sheet && <WalletSheet onClose={closeSheet} />}
        </section>
    );
}
