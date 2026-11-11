/**
 * Contact support from the organization panel (2026-11-04), as students can
 * from theirs: the organization's name, ID and email are filled in from its
 * account; it writes the subject and the message. Server:
 * POST /organizations/me/tickets (src/organizations/index.js), which keeps the
 * name and ID from the account, not from this form. The admin sees it on
 * Tickets, marked as from an organization.
 */
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LifeBuoy, Loader2, Send, CheckCircle2, X } from 'lucide-react';
import api from '../utils/api';
import { Dialog, DialogTitle, INPUT, LABEL, BTN, BTN2, Banner } from './orgUi';
import SupportHistory from './SupportHistory';

const SUBJECTS = ['Students and joining', 'Teachers', 'Courses', '360 activities', 'Competitions', 'Account and sign-in', 'Something else'];

const OrgSupportDialog = ({ organization, onClose }) => {
    const { pathname } = useLocation();
    const [email, setEmail] = useState(organization?.email || '');
    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(null);   // the ticket id
    const [tab, setTab] = useState('new');    // 'new' | 'history'
    // The account's email, unless one is typed already (the panel's own copy of the organization has none).
    const [account, setAccount] = useState(organization);
    useEffect(() => {
        let live = true;
        api.get('/organizations/me').then((r) => {
            if (!live) return;
            const org = r.data.organization || {};
            setAccount((a) => ({ ...a, ...org }));
            setEmail((e) => e || org.email || '');
        }).catch(() => {});
        return () => { live = false; };
    }, []);

    const submit = async (e) => {
        e.preventDefault();
        const title = [topic, subject.trim()].filter(Boolean).join(': ');
        if (!title) return setError('Choose a topic or write a subject.');
        if (message.trim().length < 10) return setError('Tell us a little more (at least 10 characters).');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email so we can reply.');
        setBusy(true); setError('');
        try {
            const r = await api.post('/organizations/me/tickets', { subject: title, message: message.trim(), email: email.trim(), path: pathname });
            setSent(r.data.ticketId);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send your request just now. Please try again.');
        } finally { setBusy(false); }
    };

    const fixed = [['Organization', account?.name || '—'], ['Organization ID', account?.orgCode || '—']];
    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-lg">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><LifeBuoy size={20} aria-hidden="true" /></span>
                    <div>
                        <DialogTitle>Contact support</DialogTitle>
                        <p className="text-xs text-slate-500">We reply by email, usually within a working day.</p>
                    </div>
                </div>
                <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
            </div>

            {/* A new request, or the ones already sent (with "send again" on a resolved one). */}
            <div role="tablist" aria-label="Support" className="mx-5 mt-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {[['new', 'New request'], ['history', 'My requests']].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`rounded-lg py-2 text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                ))}
            </div>
            {tab === 'history' ? (
                <div className="overflow-y-auto p-5"><SupportHistory client={api} base="/organizations/me/tickets" /></div>
            ) : sent ? (
                <div className="space-y-4 p-6 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={28} aria-hidden="true" /></span>
                    <div>
                        <p className="text-lg font-bold text-slate-800">Request sent</p>
                        <p className="mt-1 text-sm text-slate-500">Ticket <span className="font-mono font-semibold text-slate-700">#{String(sent).slice(-6).toUpperCase()}</span>. We will write to <strong className="text-slate-700">{email.trim()}</strong>.</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button type="button" onClick={() => setTab('history')} className={`${BTN2} flex-1`}>My requests</button>
                        <button type="button" onClick={onClose} className={`${BTN} flex-1`}>Done</button>
                    </div>
                </div>
            ) : (
                <form onSubmit={submit} className="space-y-4 overflow-y-auto p-5" noValidate>
                    {/* From the account: shown, not typed. */}
                    <div className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                        {fixed.map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <p className={LABEL}>{label}</p>
                                <p className="truncate text-sm font-semibold text-slate-800" title={value}>{value}</p>
                            </div>
                        ))}
                    </div>
                    <div>
                        <label htmlFor="sup-email" className={LABEL}>Reply to</label>
                        <input id="sup-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} className={INPUT} autoComplete="email" />
                    </div>
                    <div>
                        <p className={LABEL}>Topic</p>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Topic">
                            {SUBJECTS.map((s) => (
                                <button key={s} type="button" aria-pressed={topic === s} onClick={() => { setTopic(topic === s ? '' : s); setError(''); }}
                                    className={`min-h-[34px] rounded-full border px-3 text-xs font-semibold transition-colors ${topic === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="sup-subject" className={LABEL}>Subject</label>
                        <input id="sup-subject" value={subject} onChange={(e) => { setSubject(e.target.value); setError(''); }} maxLength={150} className={INPUT} placeholder="In a few words" />
                    </div>
                    <div>
                        <label htmlFor="sup-message" className={LABEL}>Message</label>
                        <textarea id="sup-message" rows={5} value={message} onChange={(e) => { setMessage(e.target.value); setError(''); }} maxLength={5000} className={INPUT} placeholder="What happened, and what you expected" />
                    </div>
                    {error && <Banner onClose={() => setError('')}>{error}</Banner>}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button type="button" onClick={onClose} disabled={busy} className={BTN2}>Cancel</button>
                        <button type="submit" disabled={busy} className={BTN}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send request</button>
                    </div>
                </form>
            )}
        </Dialog>
    );
};

export default OrgSupportDialog;
