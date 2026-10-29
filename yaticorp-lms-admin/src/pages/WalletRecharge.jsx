/**
 * Wallet recharge (super admins): find a student and add money to their
 * wallet. It lands on their statement as "Wallet recharge" with the note
 * typed here, and they get a notification. Beside the form, the latest
 * recharges across every student.
 */
import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import { HandCoins, Search, Plus, Loader2, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50';
const BTN2 = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50';

const money = (n, c = 'INR') => `${c === 'INR' ? '₹' : `${c} `}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const newKey = () => (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export default function WalletRecharge() {
    const [q, setQ] = useState('');
    const [found, setFound] = useState(null);
    const [student, setStudent] = useState(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('Wallet recharge');
    // Set when the confirm step opens: the server books the recharge under
    // its key, so a retried or double-clicked one is credited once.
    const [pending, setPending] = useState(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [recent, setRecent] = useState(null);

    const loadRecent = useCallback(() => api.get('/rewards/admin/recharge/recent').then((r) => setRecent(r.data.rows)).catch(() => setRecent([])), []);
    useEffect(() => { loadRecent(); }, [loadRecent]);
    useEffect(() => {
        if (q.trim().length < 2) { setFound(null); return undefined; }
        const t = setTimeout(() => api.get('/rewards/admin/recharge/students', { params: { q: q.trim() } }).then((r) => setFound(r.data.rows)).catch(() => setFound([])), 250);
        return () => clearTimeout(t);
    }, [q]);

    const value = Math.round(Number(amount) * 100) / 100;
    const ready = !!student && value > 0;
    const pick = (u) => { setStudent(u); setQ(''); setFound(null); setMsg(null); };
    const review = (e) => { e.preventDefault(); if (ready) setPending({ key: newKey(), amount: value, note: note.trim() || 'Wallet recharge' }); };
    const apply = async () => {
        setBusy(true);
        try {
            const r = await api.post(`/rewards/admin/recharge/${student._id}`, { amount: pending.amount, note: pending.note, key: pending.key });
            const after = r.data.wallet?.available;
            if (after != null) setStudent((s) => ({ ...s, available: after }));
            setMsg({ kind: 'ok', text: `${money(pending.amount, student.currency)} added to ${student.name}'s wallet.${after != null ? ` New balance ${money(after, student.currency)}.` : ''}` });
            setAmount('');
            loadRecent();
        } catch (err) {
            setMsg({ kind: 'error', text: err.response?.data?.message || 'The recharge did not go through. Nothing was added.' });
        } finally { setBusy(false); setPending(null); }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><HandCoins className="text-indigo-600" /> Wallet recharge</h1>
                <p className="mt-1 text-sm text-slate-500">Add wallet points to a student's wallet. They can spend it on courses and features inside the LMS, and it shows on their statement with your note.</p>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <form onSubmit={review} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                    {msg && (
                        <div role={msg.kind === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${msg.kind === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {msg.kind === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
                            <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{msg.text}</span>
                            <button type="button" onClick={() => setMsg(null)} className="shrink-0" aria-label="Dismiss"><X size={14} /></button>
                        </div>
                    )}

                    <div>
                        <label className={LABEL} htmlFor="recharge-search">Student</label>
                        {student ? (
                            <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{(student.name || '?').charAt(0).toUpperCase()}</span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-slate-800 break-words">{student.name}</p>
                                    <p className="text-xs text-slate-500 [overflow-wrap:anywhere]">{[student.email, student.cardNumber, student.phone].filter(Boolean).join(' · ')}</p>
                                    <p className="mt-0.5 text-xs text-slate-600">Balance now <span className="font-bold tabular-nums text-emerald-700">{money(student.available, student.currency)}</span></p>
                                </div>
                                <button type="button" onClick={() => { setStudent(null); setMsg(null); }} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100">Change</button>
                            </div>
                        ) : (
                            <>
                                <div className="relative">
                                    <input id="recharge-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, card or phone number…" className={`${INPUT} pl-9`} autoComplete="off" />
                                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                </div>
                                {found ? (
                                    <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                                        {found.length === 0 && <li className="px-4 py-6 text-center text-sm italic text-slate-400">No student matches “{q.trim()}”.</li>}
                                        {found.map((u) => (
                                            <li key={u._id}>
                                                <button type="button" onClick={() => pick(u)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50">
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-medium text-slate-800 break-words">{u.name}</p>
                                                        <p className="text-xs text-slate-500 [overflow-wrap:anywhere]">{[u.email, u.cardNumber].filter(Boolean).join(' · ')}</p>
                                                    </div>
                                                    <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-700">{money(u.available, u.currency)}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="mt-1.5 text-xs text-slate-400">Type at least two letters or digits.</p>}
                            </>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
                        <div>
                            <label className={LABEL} htmlFor="recharge-amount">Amount ({student?.currency || 'INR'})</label>
                            <input id="recharge-amount" type="number" min="0.01" step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={`${INPUT} tabular-nums`} required />
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="recharge-note">Note on the student's statement</label>
                            <input id="recharge-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} className={INPUT} />
                        </div>
                    </div>

                    <button type="submit" disabled={!ready} className={`${BTN} w-full`}><Plus size={15} /> {value > 0 ? `Recharge ${money(value, student?.currency)}` : 'Recharge'}</button>
                    {!student && <p className="-mt-2 text-center text-xs text-slate-400">Choose a student first.</p>}
                </form>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
                        <p className="font-bold text-slate-800">Recent recharges</p>
                        <button type="button" onClick={loadRecent} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Refresh"><RefreshCw size={15} /></button>
                    </div>
                    <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
                        {!recent && <li className="p-8 text-center text-slate-500">Loading…</li>}
                        {recent?.length === 0 && <li className="px-6 py-12 text-center italic text-slate-400">No recharges yet.</li>}
                        {recent?.map((t) => (
                            <li key={t._id} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-slate-800 break-words">{t.userId?.name || 'Deleted user'}</p>
                                    <p className="text-xs text-slate-500 [overflow-wrap:anywhere]">{t.description} · {when(t.createdAt)}</p>
                                    <p className="font-mono text-[11px] text-slate-400">{t.txnId}</p>
                                </div>
                                <span className="shrink-0 font-bold tabular-nums text-emerald-700">+{money(t.amount, t.currency)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {pending && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => !busy && setPending(null)}>
                    <div role="dialog" aria-modal="true" aria-label="Confirm recharge" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl sm:p-6" onClick={(e) => e.stopPropagation()}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><HandCoins size={20} /></span>
                        <p className="mt-3 text-lg font-bold text-slate-900 break-words">Add {money(pending.amount, student.currency)} to {student.name}'s wallet?</p>
                        <p className="mt-1 text-sm text-slate-500">Their balance goes from {money(student.available, student.currency)} to <span className="font-semibold text-slate-700">{money(student.available + pending.amount, student.currency)}</span>. It shows on their statement as “{pending.note}”.</p>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button type="button" onClick={() => setPending(null)} disabled={busy} className={BTN2}>Cancel</button>
                            <button type="button" onClick={apply} disabled={busy} className={BTN}>{busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Recharge</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
