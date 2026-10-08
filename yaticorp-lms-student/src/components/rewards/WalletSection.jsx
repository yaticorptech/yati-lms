/**
 * The wallet in full: the in-LMS balance the student has earned, where it
 * came from, the XP that feeds it, and both ledgers. Reward points are left
 * out on purpose: they are not money and never become any, so beside the
 * balance they only raised the question of what they were worth. Nothing here
 * decides an amount — every number is recomputed on the server when it
 * matters.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Wallet, ReceiptText, Loader2, Info, Lock, Check, X, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { money, num, balance, when, SOURCE_LABEL, STATUS_CLS, txTitle } from './format';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'xp', label: 'XP', icon: Sparkles }
];

const Pill = ({ status }) => <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${STATUS_CLS[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;

const Notice = ({ kind = 'info', children, onClose }) => (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-sky-50 text-sky-800'}`}>
        {kind === 'error' ? <X size={15} className="mt-0.5 shrink-0" /> : kind === 'success' ? <Check size={15} className="mt-0.5 shrink-0" /> : <Info size={15} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{children}</span>
        {onClose && <button onClick={onClose} className="text-current/60 hover:text-current" aria-label="Dismiss"><X size={13} /></button>}
    </div>
);

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
const LABEL = 'mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500';

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
        <section id="wallet" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* Right padding from sm up keeps the figures clear of the popup's
                close button, which sits in the top-right corner over this. */}
            <div className="flex flex-col gap-2.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 pr-12 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-5 sm:pr-16">
                <div>
                    <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg"><Wallet size={17} className="text-emerald-500" /> Wallet</h2>
                    <p className="text-[13px] leading-snug text-slate-500 sm:text-sm">Everything you have earned inside the LMS, tracked to its source.</p>
                </div>
                {data && (
                    // On a phone the two figures are a pair of equal cells that
                    // fill the width, so the labels and the numbers each line
                    // up with one another. Right-aligning them in a loose row —
                    // which is what a wide header wants — left them ragged,
                    // with nothing sharing an edge.
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-4">
                        <div className="min-w-0 rounded-xl bg-white/70 px-2.5 py-1.5 sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:text-[11px]">Balance</p>
                            <p className="truncate text-base font-black tabular-nums text-slate-900 sm:text-2xl">{money(balance(data.wallet.available), currency)}</p>
                        </div>
                        <div className="min-w-0 rounded-xl bg-white/70 px-2.5 py-1.5 sm:bg-transparent sm:px-0 sm:py-0 sm:text-right">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:text-[11px]">XP</p>
                            <p className="truncate text-base font-black tabular-nums text-amber-600 sm:text-2xl">{num(data.xp)}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Three tabs in a row need 401px, which no phone has, so the strip
                scrolled sideways and showed a scrollbar across the popup. A
                grid of three fits them instead: each cell takes a third and the
                name sits under its icon where the cell is too narrow to hold
                both side by side. */}
            <div className="grid grid-cols-3 border-b border-slate-100 px-2 pt-2 sm:flex sm:gap-1 sm:px-3">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-t-xl border-b-2 px-1.5 py-2 text-[12px] font-bold leading-tight transition-colors sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-[13px] ${tab === t.id ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                        <t.icon size={14} className="shrink-0" /> <span className="min-w-0 truncate">{t.label}</span>
                    </button>
                ))}
            </div>

            <div className="p-4 sm:p-5">
                {error && <Notice kind="error">{error}</Notice>}
                {!data && !error && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>}
                {data && tab === 'overview' && <Overview data={data} currency={currency} />}
                {data && tab === 'transactions' && <Transactions currency={currency} />}
                {data && tab === 'xp' && <XpLedger />}
            </div>
        </section>
    );
}

function Overview({ data, currency }) {
    const { wallet, conversion } = data;
    const unit = conversion.pointsPerUnit;
    const sources = Object.entries(wallet.earnedBySource || {}).filter(([, v]) => v > 0);

    return (
        <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {[
                    { label: 'Balance', value: money(balance(wallet.available), currency), cls: 'from-emerald-50 to-teal-50 border-emerald-200', tone: 'text-emerald-700', sub: 'For courses and features' },
                    { label: 'Total earned', value: money(wallet.totalEarned, currency), cls: 'from-sky-50 to-indigo-50 border-sky-200', tone: 'text-sky-700' },
                    { label: 'Total spent', value: money(wallet.totalSpent, currency), cls: 'from-slate-50 to-slate-100 border-slate-200', tone: 'text-slate-700', sub: 'On courses and rewards' },
                    { label: 'From XP', value: money(data.fromXp, currency), cls: 'from-amber-50 to-orange-50 border-amber-200', tone: 'text-amber-700', sub: `${num(data.xpConverted)} XP converted` }
                ].map((c) => (
                    <div key={c.label} className={`rounded-2xl border bg-gradient-to-br p-3 sm:p-4 ${c.cls}`}>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 sm:text-[11px]">{c.label}</p>
                        <p className={`mt-0.5 truncate text-lg font-black tabular-nums sm:mt-1 sm:text-2xl ${c.tone}`}>{c.value}</p>
                        {c.sub && <p className="truncate text-[10px] text-slate-500 sm:text-[11px]">{c.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
                    <p className="text-[13px] font-bold text-slate-800 sm:text-sm">Where it came from</p>
                    {sources.length === 0 ? (
                        <p className="mt-1.5 text-[13px] leading-snug text-slate-500 sm:mt-2 sm:text-sm">Nothing yet. XP you earn, and any earnings an administrator adds, show up here by source.</p>
                    ) : (
                        <ul className="mt-3 space-y-2">
                            {sources.map(([k, v]) => (
                                <li key={k} className="flex items-center gap-3 text-sm">
                                    <span className="w-40 shrink-0 font-semibold text-slate-600">{SOURCE_LABEL[k] || k}</span>
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${Math.min(100, (v / Math.max(1, wallet.totalEarned)) * 100)}%` }} /></div>
                                    <span className="w-20 text-right font-bold tabular-nums text-slate-800">{money(v, currency)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Only XP becomes money, automatically as it is earned. */}
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4">
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800 sm:text-sm"><Sparkles size={14} className="text-amber-500" /> XP converts to money</p>
                    <p className="text-xl font-black tabular-nums text-amber-700 sm:text-3xl">{num(unit)} XP = {money(conversion.unitValue, currency)}</p>
                    <p className="text-[11px] text-slate-500 sm:text-xs">
                        Each time your XP balance reaches {num(unit)}, {num(unit)} XP is taken off it and {money(conversion.unitValue, currency)} goes into your wallet — automatically. Your level never drops.
                        Balance now: <strong className="text-slate-700">{num(data.xpBalance)} XP</strong> · {money(data.fromXp, currency)} earned from XP so far.
                    </p>
                </div>
            </div>

            {data.recent?.length > 0 && (
                <div>
                    <p className="mb-2 text-sm font-bold text-slate-800">Recent</p>
                    <TxnList rows={data.recent} currency={currency} />
                </div>
            )}
        </div>
    );
}

function TxnList({ rows, currency }) {
    if (!rows.length) return <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No transactions yet.</p>;
    return (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {rows.map((t) => (
                <li key={t._id} className="flex items-center gap-3 bg-white px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${t.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t.type === 'credit' ? '+' : '−'}</span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{txTitle(t)}</p>
                        <p className="truncate text-[11px] text-slate-500">{SOURCE_LABEL[t.source] || t.source} · {when(t.createdAt)} · <span className="font-mono">{t.txnId}</span></p>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-black tabular-nums ${t.type === 'credit' ? 'text-emerald-600' : 'text-slate-800'}`}>{t.type === 'credit' ? '+' : '−'}{money(t.amount, currency)}</p>
                        <Pill status={t.status} />
                    </div>
                </li>
            ))}
        </ul>
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
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {[['', 'All'], ['credit', 'Credits'], ['debit', 'Debits']].map(([v, l]) => (
                    <button key={v} onClick={() => { setType(v); setSkip(0); }} className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${type === v ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{l}</button>
                ))}
            </div>
            {!rows ? <div className="skeleton h-40 rounded-2xl" /> : <TxnList rows={rows} currency={currency} />}
            {total > limit && (
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{skip + 1}–{Math.min(total, skip + limit)} of {total}</span>
                    <div className="flex gap-2">
                        <button disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - limit))} className="rounded-lg border border-slate-200 px-3 py-1 font-bold disabled:opacity-40">Previous</button>
                        <button disabled={skip + limit >= total} onClick={() => setSkip(skip + limit)} className="rounded-lg border border-slate-200 px-3 py-1 font-bold disabled:opacity-40">Next</button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Where each XP came from, from the XP ledger itself. */
const XP_SOURCE = {
    lesson_complete: 'Lesson', quiz_complete: 'Quiz', quiz_pass: 'Quiz', assignment_complete: 'Assignment',
    course_complete: 'Course', certificate_earned: 'Certificate', forum_post: 'Community', forum_comment: 'Community',
    resume_upload: 'Resume', part_time_apply: 'Jobs', scholarship_search: 'Scholarships', interview_prep: 'Interview',
    career: 'Career Path', career_task: 'Career Path', daily_activity: 'Career Path', game: 'Brain games',
    game_reversal: 'Brain games', streak: 'Streak', admin: 'Bonus'
};
const XP_ICON = { Lesson: '📘', Quiz: '📝', Course: '🎓', Certificate: '📜', Community: '💬', 'Career Path': '🧭', 'Brain games': '🧩', Streak: '🔥', Bonus: '🎁', Interview: '🎤', Jobs: '💼' };

// "for completing a lesson" → "Completing a lesson": the ledger's own words,
// read as a title.
const xpTitle = (t, label) => {
    const text = (t.description || '').replace(/^for\s+/i, '').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : label;
};

/** How many XP rows show before the list scrolls. */
const XP_ROWS_SHOWN = 4;

function XpLedger() {
    const [rows, setRows] = useState(null);
    const listRef = useRef(null);
    useEffect(() => { api.get('/rewards/xp/history', { params: { limit: 50 } }).then((r) => setRows(Array.isArray(r.data) ? r.data : r.data?.rows || [])).catch(() => setRows([])); }, []);

    // Four rows on show, the rest a scroll away inside the list. Measured
    // rather than written down as pixels: a row's height follows the font
    // size and the divider, and a guessed figure left the fourth row cut off.
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list || !rows || rows.length <= XP_ROWS_SHOWN) return;
        const items = [...list.children].slice(0, XP_ROWS_SHOWN);
        const borders = list.offsetHeight - list.clientHeight;
        const height = items.reduce((sum, li) => sum + li.getBoundingClientRect().height, 0);
        list.style.maxHeight = `${Math.ceil(height + borders)}px`;
    }, [rows]);

    if (!rows) return <div className="skeleton h-40 rounded-2xl" />;
    if (!rows.length) return <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No XP yet. Lessons, quizzes, Career Path tasks and brain games all earn XP, and it shows up here.</p>;
    return (
        <ul ref={listRef} className="divide-y divide-slate-100 overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 [scrollbar-width:thin]" tabIndex={0} aria-label="XP history">
            {rows.map((t) => {
                const label = XP_SOURCE[t.source] || SOURCE_LABEL[t.source] || 'XP';
                const gain = t.amount > 0;
                return (
                    <li key={t._id} className="flex items-center gap-3 bg-white px-3 py-3 sm:px-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${gain ? 'bg-amber-100' : 'bg-slate-100'}`} aria-hidden="true">{XP_ICON[label] || '⚡'}</span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-800">{xpTitle(t, label)}</p>
                            <p className="truncate text-[11px] text-slate-500">{label} · {when(t.createdAt)}</p>
                        </div>
                        <p className={`shrink-0 text-sm font-black tabular-nums ${gain ? 'text-amber-600' : 'text-slate-700'}`}>{gain ? '+' : ''}{num(t.amount)} XP</p>
                    </li>
                );
            })}
        </ul>
    );
}
