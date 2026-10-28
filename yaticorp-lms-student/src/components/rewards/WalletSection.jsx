/**
 * The wallet in full: the in-LMS balance the student has earned, where it
 * came from, and the ledger. Reward points are left out on purpose: they are
 * not money and never become any, so beside the balance they only raised the
 * question of what they were worth. Nothing here decides an amount — every
 * number is recomputed on the server when it matters.
 *
 * Redrawn 2026-10-27 to match the Wallet & Rewards card it opens from: the
 * balance once, large, in a violet header (it used to be shown twice), a
 * two-way switch for the tabs, and the ledger grouped by day, each row with
 * its kind's icon and its whole title. A status shows only when a row is not
 * simply completed.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, ReceiptText, Info, Check, X, ShoppingBag, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import { money, balance, dayLabel, timeOf, SOURCE_LABEL, STATUS_CLS, txTitle, iconOf } from './format';

// No XP tab: XP is learning progress, not wallet money (2026-10-26).
const TABS = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText }
];

const Pill = ({ status }) => <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_CLS[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;

const Notice = ({ kind = 'info', children, onClose }) => (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
        {kind === 'error' ? <X size={15} className="mt-0.5 shrink-0" /> : kind === 'success' ? <Check size={15} className="mt-0.5 shrink-0" /> : <Info size={15} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{children}</span>
        {onClose && <button onClick={onClose} className="text-current/60 hover:text-current" aria-label="Dismiss"><X size={13} /></button>}
    </div>
);

const HEADING = 'text-sm font-bold text-slate-800';

export default function WalletSection({ initialTab = 'overview' }) {
    const [tab, setTab] = useState(initialTab);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => api.get('/rewards/wallet')
        .then((r) => { setData(r.data); setError(null); })
        .catch((e) => setError(e.response?.data?.message || 'Could not load your wallet')), []);
    useEffect(() => {
        load();
        window.addEventListener('yati:progress-changed', load);
        return () => window.removeEventListener('yati:progress-changed', load);
    }, [load]);

    const currency = data?.wallet?.currency || 'INR';

    return (
        // Not id="wallet": that is the dashboard card this opens from, which
        // a wallet notice's #wallet link scrolls to. Two elements with one id
        // left the link to land on whichever came first.
        <section id="wallet-sheet" className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {/* The popup's close button sits in this header's top-right
                corner, so the heading leaves room for it. */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 px-5 pt-5 pb-5 text-white sm:px-6 sm:pt-6">
                {/* The soft circles drawn as backgrounds, so nothing reaches
                    past the popup's edge on a phone. */}
                <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.1) 0 8.5rem, transparent 8.5rem), radial-gradient(circle at 0% 100%, rgba(232,121,249,0.3), transparent 55%)' }} />
                <img src="/illustrations/courses-hero-gift.png" alt="" aria-hidden draggable={false}
                    className="pointer-events-none absolute right-4 bottom-4 w-16 rotate-6 select-none sm:right-6 sm:w-20" />
                <h2 className="relative flex items-center gap-2.5 pr-10 text-base font-bold sm:text-lg">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Wallet size={17} aria-hidden /></span>
                    Wallet &amp; Rewards
                </h2>
                {data ? (
                    // The balance and what was spent only: XP is not wallet
                    // money (2026-10-26).
                    <div className="relative mt-4 min-w-0 pr-20 sm:pr-24">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-violet-100">Wallet balance</p>
                        <p className="truncate text-[1.75rem] font-black leading-tight tabular-nums sm:text-[2.25rem]">{money(balance(data.wallet.available), currency)}</p>
                        <p className="text-[13px] text-violet-100 sm:text-sm">Spend it on courses and features</p>
                        <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[13px] ring-1 ring-white/20 sm:text-sm">
                            <ShoppingBag size={14} className="shrink-0 text-amber-200" aria-hidden />
                            <span className="text-violet-100">Spent so far</span>
                            <span className="truncate font-black tabular-nums">{money(data.wallet.totalSpent, currency)}</span>
                        </p>
                    </div>
                ) : !error && (
                    <div className="relative mt-4 space-y-2" aria-hidden>
                        <div className="h-3 w-24 rounded bg-white/20" />
                        <div className="h-9 w-44 rounded-lg bg-white/20" />
                        <div className="h-7 w-40 rounded-full bg-white/15" />
                    </div>
                )}
            </div>

            {/* The two tabs as one switch, sharing the width evenly. */}
            <div className="px-4 pt-4 sm:px-5">
                <div role="tablist" aria-label="Wallet" className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                    {TABS.map((t) => (
                        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[13px] font-bold transition-colors ${tab === t.id ? 'bg-white text-violet-700 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:text-slate-800'}`}>
                            <t.icon size={15} className="shrink-0" aria-hidden /><span className="min-w-0 truncate">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-4 sm:p-5">
                {error && (
                    <Notice kind="error">
                        {error}{' '}
                        <button type="button" onClick={load} className="font-bold underline underline-offset-2">Try again</button>
                    </Notice>
                )}
                {!data && !error && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>}
                {data && tab === 'overview' && <Overview data={data} currency={currency} onAll={() => setTab('transactions')} />}
                {data && tab === 'transactions' && <Transactions currency={currency} />}
            </div>
        </section>
    );
}

function Overview({ data, currency, onAll }) {
    const { wallet } = data;
    const sources = Object.entries(wallet.earnedBySource || {}).filter(([, v]) => v > 0);
    const recent = data.recent || [];

    return (
        <div className="space-y-5">
            {/* Only once there is something in it: an empty "Nothing yet" box
                took a third of the popup on a phone. */}
            {sources.length > 0 && (
                <div>
                    <p className={`${HEADING} mb-2`}>Where it came from</p>
                    <ul className="space-y-3 rounded-2xl border border-slate-200 p-3.5 sm:p-4">
                        {sources.map(([k, v]) => {
                            const { Icon, cls } = iconOf(k);
                            return (
                                <li key={k} className="flex items-center gap-3 text-sm">
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cls}`}><Icon size={15} aria-hidden /></span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="truncate font-semibold text-slate-700">{SOURCE_LABEL[k] || k}</span>
                                            <span className="shrink-0 font-bold tabular-nums text-slate-900">{money(v, currency)}</span>
                                        </div>
                                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${Math.max(3, Math.min(100, (v / Math.max(1, wallet.totalEarned)) * 100))}%` }} />
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                    <p className={HEADING}>Recent</p>
                    {recent.length > 0 && (
                        <button type="button" onClick={onAll} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-bold text-violet-700 transition-colors hover:bg-violet-50">
                            See all <ArrowRight size={14} aria-hidden />
                        </button>
                    )}
                </div>
                <TxnList rows={recent.slice(0, 5)} currency={currency} />
            </div>
        </div>
    );
}

const TxnRow = ({ t, currency, showId }) => {
    const credit = t.type === 'credit';
    const { Icon, cls } = iconOf(t.source);
    return (
        <li className="flex items-start gap-3 bg-white px-3.5 py-3 sm:px-4">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cls}`}><Icon size={17} aria-hidden /></span>
            <div className="min-w-0 flex-1">
                {/* Two lines before it is cut: "Downloading a competitio…" said nothing. */}
                <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-800">{txTitle(t)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{SOURCE_LABEL[t.source] || t.source} · {timeOf(t.createdAt)}</p>
                {showId && t.txnId && <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">{t.txnId}</p>}
            </div>
            <div className="shrink-0 text-right">
                <p className={`text-sm font-black tabular-nums ${credit ? 'text-emerald-600' : 'text-slate-900'}`}>{credit ? '+' : '−'}{money(t.amount, currency)}</p>
                {t.status !== 'completed' && <Pill status={t.status} />}
            </div>
        </li>
    );
};

function TxnList({ rows, currency, showId = false }) {
    if (!rows.length) {
        return (
            <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-6 py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><ReceiptText size={20} aria-hidden /></span>
                <p className="mt-3 text-sm font-bold text-slate-800">No transactions yet</p>
                <p className="mt-1 text-[13px] text-slate-500">Courses you buy and features you use show up here.</p>
            </div>
        );
    }
    // Newest first, each day's rows under that day's name.
    const days = [];
    for (const t of rows) {
        const label = dayLabel(t.createdAt);
        const last = days[days.length - 1];
        if (last?.label === label) last.rows.push(t);
        else days.push({ label, rows: [t] });
    }
    return (
        <div className="space-y-3">
            {days.map((d, i) => (
                <div key={`${i}-${d.label}`}>
                    <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{d.label}</p>
                    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
                        {d.rows.map((t) => <TxnRow key={t._id} t={t} currency={currency} showId={showId} />)}
                    </ul>
                </div>
            ))}
        </div>
    );
}

function Transactions({ currency }) {
    const [type, setType] = useState('');
    const [skip, setSkip] = useState(0);
    const limit = 20;
    // The result is tagged with the query it answers, so switching filters
    // shows the skeleton without a state reset inside the effect.
    const key = `${type}|${skip}`;
    const [result, setResult] = useState({ key: null, rows: [], total: 0 });
    useEffect(() => {
        api.get('/rewards/wallet/transactions', { params: { type: type || undefined, limit, skip } })
            .then((r) => setResult({ key, rows: r.data.rows, total: r.data.total }))
            .catch(() => setResult({ key, rows: [], total: 0 }));
    }, [key, type, skip]);
    const rows = result.key === key ? result.rows : null;
    const total = result.key === key ? result.total : 0;
    return (
        <div className="space-y-4">
            {/* Wraps on a narrow phone rather than squeezing the count off the row. */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                <div className="flex flex-wrap gap-1.5">
                    {[['', 'All'], ['credit', 'Wallet points in'], ['debit', 'Wallet points out']].map(([v, l]) => (
                        <button key={v} type="button" aria-pressed={type === v} onClick={() => { setType(v); setSkip(0); }}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${type === v ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
                    ))}
                </div>
                {rows && total > 0 && <span className="shrink-0 text-xs font-semibold text-slate-400">{total} in all</span>}
            </div>
            {!rows ? <div className="skeleton h-40 rounded-2xl" /> : <TxnList rows={rows} currency={currency} showId />}
            {total > limit && (
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>{skip + 1}–{Math.min(total, skip + limit)} of {total}</span>
                    <div className="flex gap-2">
                        <button type="button" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-bold transition-colors hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={14} aria-hidden /> Previous</button>
                        <button type="button" disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 font-bold transition-colors hover:bg-slate-50 disabled:opacity-40">Next <ChevronRight size={14} aria-hidden /></button>
                    </div>
                </div>
            )}
        </div>
    );
}
