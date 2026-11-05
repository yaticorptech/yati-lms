/**
 * "My requests" in a contact-support form (2026-11-04): each ticket sent, with
 * its number, where it stands (Open, In progress, Resolved) and the
 * conversation. A resolved one that was not really fixed is sent again with
 * the same number: it opens again for the support team.
 *
 * `client` is the axios instance (here the panel's api), `base`
 * its tickets path ('/organizations/me/tickets'). Server:
 * controllers/ticketController.js (listTickets, reopenTicket).
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, ChevronDown, MessageSquare, Inbox } from 'lucide-react';

const STATUS = {
    open: ['Open', 'bg-amber-50 text-amber-700 ring-amber-200'],
    'in-progress': ['In progress', 'bg-sky-50 text-sky-700 ring-sky-200'],
    resolved: ['Resolved', 'bg-emerald-50 text-emerald-700 ring-emerald-200']
};
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

function TicketRow({ t, client, base, onChanged, accent }) {
    const [open, setOpen] = useState(false);
    const [again, setAgain] = useState(false);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [label, tone] = STATUS[t.status] || STATUS.open;
    const sendAgain = async () => {
        if (text.trim().length < 5) { setError('Say what is still not working.'); return; }
        setBusy(true); setError('');
        try {
            const r = await client.post(`${base}/${t._id}/reopen`, { message: text.trim() });
            setText(''); setAgain(false); setOpen(true);
            onChanged(r.data.ticket);
        } catch (err) { setError(err.response?.data?.message || 'Could not send it just now. Please try again.'); }
        finally { setBusy(false); }
    };
    return (
        <li className="rounded-xl border border-slate-200 bg-white">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-[11px] font-bold text-slate-400">#{t.ref}</span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${tone}`}>{label}</span>
                        {t.reopened > 0 && <span className="text-[10px] font-semibold text-slate-400">sent again{t.reopened > 1 ? ` ×${t.reopened}` : ''}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-slate-800">{t.subject}</span>
                    <span className="block text-[11px] text-slate-400">Sent {day(t.createdAt)}{t.updatedAt && t.updatedAt !== t.createdAt ? ` · updated ${day(t.updatedAt)}` : ''}</span>
                </span>
                <ChevronDown size={16} aria-hidden="true" className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="space-y-2 border-t border-slate-100 px-3 py-2.5">
                    <p className="whitespace-pre-wrap rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700">{t.message}</p>
                    {t.thread.map((m, i) => (
                        <div key={i} className={`rounded-lg px-2.5 py-2 text-xs ${m.by === 'admin' ? 'bg-indigo-50 text-indigo-900' : 'bg-slate-50 text-slate-700'}`}>
                            <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-70"><MessageSquare size={11} aria-hidden="true" />{m.by === 'admin' ? 'Support team' : 'You'} · {day(m.at)}</p>
                            <p className="whitespace-pre-wrap">{m.text}</p>
                        </div>
                    ))}
                </div>
            )}
            {t.status === 'resolved' && (
                <div className="border-t border-slate-100 px-3 py-2">
                    {again ? (
                        <div className="space-y-2">
                            <textarea rows={3} value={text} onChange={(e) => { setText(e.target.value); setError(''); }} maxLength={5000}
                                aria-label={`What is still not working (ticket #${t.ref})`} placeholder="What is still not working?"
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                            {error && <p role="alert" className="text-xs font-semibold text-red-600">{error}</p>}
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => { setAgain(false); setError(''); }} disabled={busy} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
                                <button type="button" onClick={sendAgain} disabled={busy} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60 ${accent}`}>
                                    {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Send again as #{t.ref}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setAgain(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50">
                            <RotateCcw size={12} aria-hidden="true" /> Not resolved? Send again
                        </button>
                    )}
                </div>
            )}
        </li>
    );
}

export default function SupportHistory({ client, base, accent = 'bg-indigo-600 hover:bg-indigo-700', onCount }) {
    const [tickets, setTickets] = useState(null);
    const [error, setError] = useState('');
    const load = useCallback(() => client.get(base)
        .then((r) => { const list = r.data.tickets || []; setTickets(list); onCount?.(list.length); setError(''); })
        .catch((err) => setError(err.response?.data?.message || 'Could not load your requests just now.')), [client, base, onCount]);
    // Live: asked again every 10s while the form is open and on screen, so a reply or a status change shows by itself.
    useEffect(() => {
        load();
        const timer = setInterval(() => { if (!document.hidden) load(); }, 10000);
        const onShow = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onShow);
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onShow); };
    }, [load]);
    const changed = (next) => setTickets((ts) => ts.map((t) => (String(t._id) === String(next._id) ? next : t)));

    if (error) return <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error} <button type="button" onClick={load} className="font-bold underline">Try again</button></p>;
    if (!tickets) return <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading your requests…</p>;
    if (!tickets.length) {
        return (
            <div className="py-8 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={22} aria-hidden="true" /></span>
                <p className="mt-2 text-sm font-semibold text-slate-600">No requests yet</p>
                <p className="text-xs text-slate-400">The ones you send show here, with where they stand.</p>
            </div>
        );
    }
    return <ul className="space-y-2">{tickets.map((t) => <TicketRow key={t._id} t={t} client={client} base={base} onChanged={changed} accent={accent} />)}</ul>;
}
