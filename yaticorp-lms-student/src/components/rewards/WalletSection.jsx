/**
 * The wallet in full: the in-LMS balance the student has earned, where it
 * came from, reward points and their value, and both ledgers. Nothing here
 * decides an amount — every number is recomputed on the server when it
 * matters.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Wallet, Gift, ReceiptText, Loader2, Info, Lock, Check, X } from 'lucide-react';
import api from '../../utils/api';
import { useRewards } from '../../context/useRewards';
import { money, num, when, SOURCE_LABEL, STATUS_CLS } from './format';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'rewards', label: 'Reward points', icon: Gift }
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
    const { celebrate } = useRewards();
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
            <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Wallet size={18} className="text-emerald-500" /> Wallet</h2>
                    <p className="text-sm text-slate-500">Everything you have earned inside the LMS, tracked to its source.</p>
                </div>
                {data && (
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Balance</p>
                            <p className="text-2xl font-black tabular-nums text-slate-900">{money(data.wallet.available, currency)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Reward points</p>
                            <p className="text-2xl font-black tabular-nums text-pink-600">{num(data.wallet.rewardPoints)}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2">
                {TABS.map((t) => (
                    <button key={t.id} onClick={() => setTab(t.id)} className={`flex shrink-0 items-center gap-1.5 rounded-t-xl border-b-2 px-3 py-2.5 text-[13px] font-bold transition-colors ${tab === t.id ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700' : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                        <t.icon size={14} /> {t.label}
                    </button>
                ))}
            </div>

            <div className="p-5">
                {error && <Notice kind="error">{error}</Notice>}
                {!data && !error && <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}</div>}
                {data && tab === 'overview' && <Overview data={data} currency={currency} reload={load} celebrate={celebrate} />}
                {data && tab === 'transactions' && <Transactions currency={currency} />}
                {data && tab === 'rewards' && <RewardLedger />}
            </div>
        </section>
    );
}

function Overview({ data, currency, reload, celebrate }) {
    const { wallet, rewardPointsValue, monetaryEnabled, conversion, limits } = data;
    const [points, setPoints] = useState('');
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState(null);
    const unit = conversion.pointsPerUnit;
    const minPts = Math.max(conversion.minRedeemPoints, unit);
    const maxPts = Math.floor(wallet.rewardPoints / unit) * unit;
    const pts = Math.round(Number(points) || 0);
    const value = pts > 0 ? (pts / unit) * conversion.unitValue : 0;
    const sources = Object.entries(wallet.earnedBySource || {}).filter(([, v]) => v > 0);

    const redeem = async (e) => {
        e.preventDefault();
        setBusy(true); setNotice(null);
        try {
            const r = await api.post('/rewards/wallet/redeem', { points: pts });
            setNotice({ kind: 'success', text: `${money(r.data.value, currency)} added to your wallet from ${num(r.data.points)} points.` });
            setPoints('');
            window.dispatchEvent(new CustomEvent('yati:progress-changed'));
            await reload();
            celebrate([]);
        } catch (err) {
            setNotice({ kind: 'error', text: err.response?.data?.message || 'Could not redeem right now.' });
        } finally { setBusy(false); }
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                    { label: 'Balance', value: money(wallet.available, currency), cls: 'from-emerald-50 to-teal-50 border-emerald-200', tone: 'text-emerald-700', sub: 'Earned inside the LMS' },
                    { label: 'Total earned', value: money(wallet.totalEarned, currency), cls: 'from-sky-50 to-indigo-50 border-sky-200', tone: 'text-sky-700' },
                    { label: 'Total spent', value: money(wallet.totalSpent, currency), cls: 'from-slate-50 to-slate-100 border-slate-200', tone: 'text-slate-700', sub: 'On courses and rewards' },
                    { label: 'Points value', value: money(rewardPointsValue, currency), cls: 'from-pink-50 to-rose-50 border-pink-200', tone: 'text-pink-700', sub: `${num(wallet.rewardPoints)} reward points` }
                ].map((c) => (
                    <div key={c.label} className={`rounded-2xl border bg-gradient-to-br p-4 ${c.cls}`}>
                        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{c.label}</p>
                        <p className={`mt-1 text-2xl font-black tabular-nums ${c.tone}`}>{c.value}</p>
                        {c.sub && <p className="text-[11px] text-slate-500">{c.sub}</p>}
                    </div>
                ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-bold text-slate-800">Where it came from</p>
                    {sources.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500">Nothing yet. Reward points you redeem, and any earnings an administrator adds, show up here by source.</p>
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

                <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Gift size={15} className="text-pink-500" /> Reward points</p>
                            <p className="text-3xl font-black tabular-nums text-pink-600">{num(wallet.rewardPoints)}</p>
                            <p className="text-xs text-slate-500">{num(unit)} points = {money(conversion.unitValue, currency)} · ≈ {money(rewardPointsValue, currency)} value</p>
                        </div>
                    </div>
                    {monetaryEnabled ? (
                        <form onSubmit={redeem} className="mt-3 space-y-2">
                            <div className="flex gap-2">
                                <input type="number" inputMode="numeric" min={minPts} max={maxPts} step={unit} value={points} onChange={(e) => setPoints(e.target.value)} placeholder={`Points (multiples of ${unit})`} className={INPUT} />
                                <button type="button" onClick={() => setPoints(String(maxPts))} disabled={maxPts < minPts} className="shrink-0 rounded-xl border border-pink-200 bg-white px-3 text-xs font-bold text-pink-700 hover:bg-pink-50 disabled:opacity-50">Max</button>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                                <span>You get <strong className="text-slate-900">{money(value, currency)}</strong></span>
                                {limits.monthlyCashLeft != null && <span>{money(limits.monthlyCashLeft, currency)} of {money(limits.monthlyCashCap, currency)} left this month</span>}
                            </div>
                            <button type="submit" disabled={busy || pts < minPts || pts % unit !== 0 || pts > wallet.rewardPoints} className="flex w-full items-center justify-center gap-2 rounded-xl bg-pink-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50">
                                {busy ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />} Redeem to wallet
                            </button>
                        </form>
                    ) : (
                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-white/80 p-3 text-xs text-slate-600 ring-1 ring-pink-100">
                            <Lock size={14} className="mt-0.5 shrink-0 text-pink-500" />
                            <span>Your account earns learning rewards: XP, badges and reward points. Converting points into wallet balance is switched on by an administrator for eligible account types.</span>
                        </div>
                    )}
                    {notice && <div className="mt-3"><Notice kind={notice.kind} onClose={() => setNotice(null)}>{notice.text}</Notice></div>}
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
                        <p className="truncate text-sm font-bold text-slate-800">{t.description || SOURCE_LABEL[t.source] || t.source}</p>
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

function RewardLedger() {
    const [rows, setRows] = useState(null);
    useEffect(() => { api.get('/rewards/wallet/rewards', { params: { limit: 50 } }).then((r) => setRows(r.data.rows)).catch(() => setRows([])); }, []);
    if (!rows) return <div className="skeleton h-40 rounded-2xl" />;
    if (!rows.length) return <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No reward points yet. Streak milestones, badges and leaderboard finishes pay points here.</p>;
    return (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {rows.map((t) => (
                <li key={t._id} className="flex items-center gap-3 bg-white px-4 py-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${t.points > 0 ? 'bg-pink-100' : 'bg-slate-100'}`} aria-hidden="true">{t.source === 'streak_milestone' ? '🔥' : t.source === 'badge' ? '🎖️' : t.source === 'leaderboard' ? '🏆' : t.source === 'redeem' ? '💰' : '🎁'}</span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{t.description || SOURCE_LABEL[t.source] || t.source}</p>
                        <p className="text-[11px] text-slate-500">{SOURCE_LABEL[t.source] || t.source} · {when(t.createdAt)}</p>
                    </div>
                    <p className={`text-sm font-black tabular-nums ${t.points > 0 ? 'text-pink-600' : 'text-slate-700'}`}>{t.points > 0 ? '+' : ''}{num(t.points)} pts</p>
                </li>
            ))}
        </ul>
    );
}
