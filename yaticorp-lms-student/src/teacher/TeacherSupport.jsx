/**
 * Contact support from the teacher dashboard (2026-11-04), as students and
 * organizations can: the teacher's name, card or mobile, and organization
 * come from their account; they write the subject and the message. Server:
 * POST /api/teacher/tickets (src/teacher/index.js). The admin sees it on
 * Tickets, marked as from a teacher.
 */
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Modal, ErrorNote } from './ui';
import SupportHistory from '../components/SupportHistory';
import { btn, inputClass } from './kit';

const TOPICS = ['360 and my students', 'Classes I teach', 'My profile', 'Sign-in and password', 'Something else'];
const LABEL = 'mb-1.5 block text-sm font-medium text-slate-700';

export default function TeacherSupport({ teacher, onClose }) {
    const { pathname } = useLocation();
    const [email, setEmail] = useState(teacher?.email || '');
    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [sent, setSent] = useState(null);
    const [tab, setTab] = useState('new');   // 'new' | 'history'

    const submit = async (e) => {
        e.preventDefault();
        const title = [topic, subject.trim()].filter(Boolean).join(': ');
        if (!title) return setError('Choose a topic or write a subject.');
        if (message.trim().length < 10) return setError('Tell us a little more (at least 10 characters).');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Enter a valid email so we can reply.');
        setBusy(true); setError('');
        try {
            const r = await teacherApi.post('/tickets', { subject: title, message: message.trim(), email: email.trim(), path: pathname });
            setSent(r.data.ticketId);
        } catch (err) { setError(messageOf(err, 'Could not send your request just now. Please try again.')); }
        finally { setBusy(false); }
    };

    const who = [['Name', teacher?.name || '—'], [teacher?.cardNumber ? 'Card number' : 'Mobile', teacher?.cardNumber || teacher?.phone || '—']];
    return (
        <Modal title="Contact support" onClose={() => { if (!busy) onClose(); }} labelId="teacher-support-title"
            footer={tab === 'history' ? <button type="button" onClick={onClose} className={btn.secondary}>Close</button> : sent ? (
                <>
                    <button type="button" onClick={() => setTab('history')} className={btn.secondary}>My requests</button>
                    <button type="button" onClick={onClose} className={btn.primary}>Done</button>
                </>
            ) : (
                <>
                    <button type="button" onClick={onClose} disabled={busy} className={btn.secondary}>Cancel</button>
                    <button type="submit" form="teacher-support-form" disabled={busy} className={btn.primary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send request</button>
                </>
            )}>
            {/* A new request, or the ones already sent (with "send again" on a resolved one). */}
            <div role="tablist" aria-label="Support" className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                {[['new', 'New request'], ['history', 'My requests']].map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`rounded-lg py-2 text-sm font-semibold transition-colors ${tab === key ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
                ))}
            </div>
            {tab === 'history' ? (
                <SupportHistory client={teacherApi} base="/tickets" accent="bg-emerald-700 hover:bg-emerald-800" />
            ) : sent ? (
                <div className="py-4 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={28} aria-hidden="true" /></span>
                    <p className="mt-3 text-lg font-semibold text-slate-900">Request sent</p>
                    <p className="mt-1 text-sm text-slate-500">Ticket <span className="font-mono font-semibold text-slate-700">#{String(sent).slice(-6).toUpperCase()}</span>. We will reply to <strong className="text-slate-700">{email.trim()}</strong>.</p>
                </div>
            ) : (
                <form id="teacher-support-form" onSubmit={submit} className="space-y-4" noValidate>
                    <p className="text-sm text-slate-500">We reply by email, usually within a working day.</p>
                    {/* From the account: shown, not typed. */}
                    <dl className="grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                        {who.map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
                                <dd className="truncate text-sm font-semibold text-slate-800" title={value}>{value}</dd>
                            </div>
                        ))}
                    </dl>
                    <div>
                        <label htmlFor="ts-email" className={LABEL}>Reply to</label>
                        <input id="ts-email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} className={inputClass} />
                    </div>
                    <div>
                        <p className={LABEL}>Topic</p>
                        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Topic">
                            {TOPICS.map((t) => (
                                <button key={t} type="button" aria-pressed={topic === t} onClick={() => { setTopic(topic === t ? '' : t); setError(''); }}
                                    className={`min-h-[34px] rounded-full border px-3 text-xs font-semibold transition-colors ${topic === t ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="ts-subject" className={LABEL}>Subject</label>
                        <input id="ts-subject" maxLength={150} value={subject} onChange={(e) => { setSubject(e.target.value); setError(''); }} className={inputClass} placeholder="In a few words" />
                    </div>
                    <div>
                        <label htmlFor="ts-message" className={LABEL}>Message</label>
                        <textarea id="ts-message" rows={5} maxLength={5000} value={message} onChange={(e) => { setMessage(e.target.value); setError(''); }} className={inputClass} placeholder="What happened, and what you expected" />
                    </div>
                    <ErrorNote>{error}</ErrorNote>
                </form>
            )}
        </Modal>
    );
}
