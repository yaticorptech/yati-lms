/**
 * Student requests (2026-11-14): support tickets this organization's students sent to it (they choose
 * "YATICORPX3 support" or their organization in the app's Contact Support). Reply, and mark in progress or
 * resolved; the student sees the reply in My requests and by email.
 * Server: GET|POST /api/organizations/me/student-tickets (src/organizations/index.js).
 */
import React, { useState } from 'react';
import { LifeBuoy, Loader2, Send, CheckCircle2 } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, BTN, BTN2, Banner, Rows, Segmented } from '../../components/orgUi';

const STATUS = { open: ['Open', 'bg-amber-100 text-amber-800'], 'in-progress': ['In progress', 'bg-sky-100 text-sky-800'], resolved: ['Resolved', 'bg-emerald-100 text-emerald-800'] };
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const Request = ({ t, onSaved }) => {
    const [open, setOpen] = useState(t.status !== 'resolved');
    const [reply, setReply] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const send = async (body, key) => {
        setBusy(key); setError('');
        try { const r = await api.post(`/organizations/me/student-tickets/${t._id}`, body); setReply(''); onSaved(r.data.message); }
        catch (err) { setError(err.response?.data?.message || 'That did not go through.'); }
        finally { setBusy(''); }
    };
    const [label, tone] = STATUS[t.status] || STATUS.open;
    return (
        <li className={`${CARD} overflow-hidden`}>
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left sm:p-5">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-800">{t.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{t.name} · {t.cardNumber || t.email} · #{t.ref} · {when(t.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>
            </button>
            {open && (
                <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                    <p className="whitespace-pre-wrap rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">{t.message}</p>
                    {t.thread.map((m, i) => (
                        <p key={i} className={`whitespace-pre-wrap rounded-xl p-3 text-sm ring-1 ${m.by === 'admin' ? 'ml-6 bg-indigo-50 text-indigo-900 ring-indigo-100' : 'mr-6 bg-white text-slate-700 ring-slate-200'}`}>
                            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider opacity-60">{m.by === 'admin' ? 'You' : t.name} · {when(m.at)}</span>{m.text}
                        </p>
                    ))}
                    {error && <Banner onClose={() => setError('')}>{error}</Banner>}
                    <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} placeholder={`Reply to ${t.name}…`}
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" disabled={!!busy || !reply.trim()} onClick={() => send({ reply }, 'reply')} className={BTN}>{busy === 'reply' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send reply</button>
                        {t.status !== 'resolved'
                            ? <button type="button" disabled={!!busy} onClick={() => send({ ...(reply.trim() ? { reply } : {}), status: 'resolved' }, 'resolve')} className={BTN2}>{busy === 'resolve' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {reply.trim() ? 'Reply and resolve' : 'Mark resolved'}</button>
                            : <button type="button" disabled={!!busy} onClick={() => send({ status: 'open' }, 'reopen')} className={BTN2}>Open again</button>}
                    </div>
                </div>
            )}
        </li>
    );
};

export default function OrgStudentRequests() {
    const [filter, setFilter] = useState('active');
    const [data, setData] = useState(null);
    const [notice, setNotice] = useState('');
    const load = async ({ signal } = {}) => {
        try { setData((await api.get('/organizations/me/student-tickets', { signal })).data); }
        catch { setData((d) => d || { tickets: [], open: 0 }); }
    };
    const reload = useAutoRefresh(load, 30000, []);
    const rows = (data?.tickets || []).filter((t) => (filter === 'active' ? t.status !== 'resolved' : filter === 'resolved' ? t.status === 'resolved' : true));
    return (
        <div className="w-full space-y-4 pb-10 lg:space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><LifeBuoy size={20} /></span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Student requests</h1>
                        <p className="text-sm text-slate-500">Help requests your students sent to you from the app.</p>
                    </div>
                </div>
                <Segmented options={[['active', 'Waiting'], ['resolved', 'Resolved'], ['all', 'All']]} value={filter} onChange={setFilter} counts={{ active: data?.open || 0 }} />
            </div>
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {!data ? <div className={`${CARD} p-5`}><Rows count={3} height="h-16" /></div> : !rows.length ? (
                <div className={`${CARD} flex flex-col items-center px-6 py-14 text-center`}>
                    <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><LifeBuoy size={22} /></span>
                    <p className="mt-3 font-semibold text-slate-700">{filter === 'resolved' ? 'Nothing resolved yet' : 'No requests waiting'}</p>
                    <p className="mt-1 max-w-sm text-sm text-slate-500">When a student chooses your institution in Contact Support, their request shows here.</p>
                </div>
            ) : (
                <ul className="space-y-3">{rows.map((t) => <Request key={t._id} t={t} onSaved={(m) => { setNotice(m); reload(); }} />)}</ul>
            )}
        </div>
    );
}
