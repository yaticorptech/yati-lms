/**
 * Applying for a part-time job, and the guardian permission a student under
 * fifteen needs before it can go anywhere.
 *
 * One panel that follows the application through its states: the age check,
 * the guardian card, the request going out, the wait, and then the answer.
 * The age check is the server's — this screen only draws what it was told, so
 * a student cannot talk their way past it from the browser.
 */
import { useEffect, useState } from 'react';
import {
    ShieldCheck, User, Mail, Send, Loader2, CheckCircle2, XCircle, RefreshCw,
    ArrowRight, Eye, Pencil, PartyPopper, Ban
} from 'lucide-react';
import { applicationApi } from './api';
import { Tracker, StatusBadge, JobCard, SafetySection, ConfirmDialog } from './parts';
import { toneFor, statusLabel } from './status';

const btn = {
    primary: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-indigo-700 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
    ghost: 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 disabled:opacity-50'
};

/** Who the request goes to, and the way to change them. */
const GuardianRow = ({ guardian, onChange, disabled }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <User size={19} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 basis-40">
            <p className="truncate text-sm font-black text-slate-900">{guardian.name || 'No guardian added yet'}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                <Mail size={12} className="shrink-0" aria-hidden="true" />
                <span className="truncate">{guardian.email || 'Add an email address'}</span>
            </p>
        </div>
        {onChange && (
            <button type="button" onClick={onChange} disabled={disabled} className={`${btn.ghost} w-full sm:w-auto`}>
                <Pencil size={14} aria-hidden="true" /> Change guardian
            </button>
        )}
    </div>
);

/** The little form behind "Change guardian". */
const GuardianForm = ({ guardian, busy, error, onSave, onCancel }) => {
    const [name, setName] = useState(guardian.name || '');
    const [email, setEmail] = useState('');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSave(name.trim(), email.trim()); }}
            className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
            <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Parent or guardian&apos;s name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoFocus
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="e.g. Devaki" />
            </label>
            <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Their email address</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" maxLength={160}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    placeholder="e.g. devaki@example.com" />
            </label>
            {error && <p className="text-xs font-semibold text-rose-600 sm:col-span-2">{error}</p>}
            <div className="flex flex-wrap gap-2.5 sm:col-span-2">
                <button type="submit" disabled={busy} className={btn.primary}>
                    {busy && <Loader2 size={15} className="animate-spin" aria-hidden="true" />} Save guardian
                </button>
                <button type="button" onClick={onCancel} className={btn.ghost}>Cancel</button>
            </div>
        </form>
    );
};

export default function ApplyFlow({ opportunityId, onClose, onContinue }) {
    const [state, setState] = useState({ loading: true, application: null, error: '' });
    const [busy, setBusy] = useState('');          // which button is working
    const [editing, setEditing] = useState(false);
    const [formError, setFormError] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [showRequest, setShowRequest] = useState(false);
    // What became of the email to the guardian, so the screen never claims a
    // message the mail provider refused.
    const [mail, setMail] = useState(null);

    useEffect(() => {
        let cancelled = false;
        applicationApi.start(opportunityId)
            .then((d) => !cancelled && setState({ loading: false, application: d.application, error: '' }))
            .catch((e) => !cancelled && setState({ loading: false, application: null, error: e.message }));
        return () => { cancelled = true; };
    }, [opportunityId]);

    const app = state.application;
    const run = (key, fn) => {
        setBusy(key); setFormError('');
        return fn()
            .then((d) => { setState({ loading: false, application: d.application, error: '' }); if (d.mail) setMail(d.mail); return d; })
            .catch((e) => { setFormError(e.message); throw e; })
            .finally(() => setBusy(''));
    };

    if (state.loading) {
        return (
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
                <Loader2 size={20} className="animate-spin text-indigo-500" aria-hidden="true" /> Checking your application…
            </div>
        );
    }
    if (!app) {
        return (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center">
                <p className="font-bold text-rose-700">{state.error}</p>
                {onClose && <button type="button" onClick={onClose} className={`${btn.ghost} mt-4`}>Close</button>}
            </div>
        );
    }

    const { status, guardian, job, steps } = app;
    const needsGuardian = status === 'needs-guardian';
    const waiting = status === 'awaiting-guardian';
    const approved = status === 'approved' || status === 'continued';
    const declined = status === 'declined';
    const canSend = !!guardian.name && !!guardian.email;

    /* ── The banner at the top changes with the state ─────────────────── */
    const HEAD = {
        'needs-guardian': { icon: ShieldCheck, ring: 'bg-amber-100 text-amber-700', title: 'Guardian approval required',
            body: `Because this student is under ${app.guardianAge}, parent or guardian approval is required before continuing.` },
        'awaiting-guardian': { icon: CheckCircle2, ring: 'bg-emerald-100 text-emerald-700', title: 'Approval request sent',
            body: 'Your guardian has received a permission request.' },
        approved: { icon: PartyPopper, ring: 'bg-emerald-100 text-emerald-700', title: 'Guardian approval received',
            body: `${guardian.name || 'Your guardian'} has approved this application. You can carry on.` },
        continued: { icon: PartyPopper, ring: 'bg-emerald-100 text-emerald-700', title: 'Application in progress',
            body: 'Your guardian approved this one. The organisation is being told through the LMS.' },
        declined: { icon: Ban, ring: 'bg-rose-100 text-rose-700', title: 'Permission declined',
            body: 'Your guardian has not approved this application.' },
        ready: { icon: CheckCircle2, ring: 'bg-emerald-100 text-emerald-700', title: 'Ready to apply',
            body: `You are ${app.student.age ?? 15} — no guardian permission is needed for this one.` }
    }[status] || {};
    const HeadIcon = HEAD.icon || ShieldCheck;

    return (
        <section aria-label="Job application" className="space-y-4">
            {/* ── Where it stands ──────────────────────────────────────── */}
            {/* Sticky: the title and the tracker are the answer to "what is
                happening", so they stay in view while the detail scrolls. */}
            <div className="sticky top-0 z-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start gap-3">
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${HEAD.ring}`}>
                        <HeadIcon size={22} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 basis-56">
                        <h2 className="text-lg font-black leading-snug text-slate-900">{HEAD.title}</h2>
                        <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{HEAD.body}</p>
                    </div>
                    <StatusBadge tone={toneFor(status)}>{statusLabel(status)}</StatusBadge>
                </div>

                {status !== 'ready' && (
                    <div className="mt-5 border-t border-slate-100 pt-5">
                        <Tracker steps={steps} />
                    </div>
                )}
            </div>

            {/* ── The job itself ───────────────────────────────────────── */}
            <JobCard job={job} />

            {/* ── Guardian, and what to do next ────────────────────────── */}
            {status !== 'ready' && (
                <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Guardian</p>
                    {editing
                        ? <GuardianForm guardian={guardian} busy={busy === 'guardian'} error={formError}
                            onCancel={() => { setEditing(false); setFormError(''); }}
                            onSave={(name, email) => run('guardian', () => applicationApi.setGuardian(app.id, name, email)).then(() => setEditing(false)).catch(() => {})} />
                        : <GuardianRow guardian={guardian} disabled={approved || declined}
                            onChange={approved || declined ? null : () => setEditing(true)} />}

                    {formError && !editing && <p className="text-xs font-semibold text-rose-600">{formError}</p>}

                    {needsGuardian && !editing && (
                        <div className="flex flex-wrap gap-2.5">
                            <button type="button" disabled={!canSend || busy === 'send'}
                                onClick={() => run('send', () => applicationApi.sendRequest(app.id)).catch(() => {})}
                                className={`${btn.primary} w-full sm:w-auto`}>
                                {busy === 'send'
                                    ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Sending…</>
                                    : <><Send size={15} aria-hidden="true" /> Send approval request</>}
                            </button>
                            {!canSend && <p className="w-full text-xs text-slate-500">Add a guardian and their email address first.</p>}
                        </div>
                    )}

                    {waiting && (
                        <>
                            <div className="flex flex-wrap gap-2.5">
                                <button type="button" disabled={busy === 'send'}
                                    onClick={() => run('send', () => applicationApi.sendRequest(app.id)).catch(() => {})}
                                    className={`${btn.ghost} w-full sm:w-auto`}>
                                    {busy === 'send'
                                        ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Resending…</>
                                        : <><RefreshCw size={15} aria-hidden="true" /> Resend request</>}
                                </button>
                                <button type="button" onClick={() => setShowRequest((v) => !v)} className={`${btn.ghost} w-full sm:w-auto`}>
                                    <Eye size={15} aria-hidden="true" /> {showRequest ? 'Hide request details' : 'View request details'}
                                </button>
                            </div>
                            {mail && (
                                <p className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${mail.sent ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>
                                    {mail.sent
                                        ? <><span className="font-bold">Email sent to {mail.to}. </span>{guardian.name || 'Your guardian'} can open the link in it to answer.</>
                                        : <>
                                            <span className="font-bold">The email could not be sent. </span>
                                            Your school has been told. Try again in a moment, or open the guardian&apos;s
                                            page below and show it to {guardian.name || 'your guardian'} yourself.
                                        </>}
                                </p>
                            )}
                            {app.reminders > 0 && (
                                <p className="text-xs text-slate-500">Reminded {app.reminders} time{app.reminders === 1 ? '' : 's'}.</p>
                            )}
                            <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
                                You cannot continue this application until {guardian.name || 'your guardian'} answers.
                            </p>
                            {app.guardianLink && (
                                <a href={app.guardianLink} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} w-full sm:w-auto`}>
                                    Open the guardian&apos;s page <ArrowRight size={14} aria-hidden="true" />
                                </a>
                            )}
                            {showRequest && (
                                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    <p className="text-xs font-bold text-slate-700">This is what {guardian.name || 'your guardian'} was sent.</p>
                                    <JobCard job={job} />
                                    <SafetySection notes={job.safety} />
                                </div>
                            )}
                        </>
                    )}

                    {declined && (
                        <>
                            {app.declineReason && (
                                <p className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800">
                                    <span className="font-bold">Reason given: </span>{app.declineReason}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2.5">
                                <button type="button" onClick={() => setShowRequest((v) => !v)} className={`${btn.ghost} w-full sm:w-auto`}>
                                    <Eye size={15} aria-hidden="true" /> View details
                                </button>
                                <button type="button" onClick={onClose} className={`${btn.primary} w-full sm:w-auto`}>
                                    Choose another job <ArrowRight size={15} aria-hidden="true" />
                                </button>
                            </div>
                            {showRequest && <SafetySection notes={job.safety} />}
                        </>
                    )}
                </div>
            )}

            {/* ── The way on, once there is one ────────────────────────── */}
            {(approved || status === 'ready') && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                        <CheckCircle2 size={20} className="shrink-0 text-emerald-600 rw-pop" aria-hidden="true" />
                        <p className="min-w-0 flex-1 basis-48 text-sm font-bold text-emerald-900">
                            {status === 'ready' ? 'Nothing is waiting on anyone. Carry on with your application.' : 'Everything is agreed. Carry on with your application.'}
                        </p>
                        <button type="button" disabled={busy === 'continue' || status === 'continued'}
                            onClick={() => run('continue', () => applicationApi.continue(app.id)).then((d) => onContinue?.(d.application)).catch(() => {})}
                            className={`${btn.primary} w-full sm:w-auto`}>
                            {busy === 'continue'
                                ? <><Loader2 size={15} className="animate-spin" aria-hidden="true" /> Continuing…</>
                                : <>{status === 'continued' ? 'Application continued' : 'Continue application'} <ArrowRight size={15} aria-hidden="true" /></>}
                        </button>
                    </div>
                </div>
            )}

            {confirming && (
                <ConfirmDialog title="Leave this application?" body="Your guardian request stays where it is. You can come back to it from the job."
                    confirmLabel="Leave" onCancel={() => setConfirming(false)} onConfirm={onClose} />
            )}

            {onClose && !declined && (
                <button type="button" onClick={waiting ? () => setConfirming(true) : onClose}
                    className="mx-auto flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-500 hover:text-slate-800">
                    <XCircle size={15} aria-hidden="true" /> Back to jobs
                </button>
            )}
        </section>
    );
}
