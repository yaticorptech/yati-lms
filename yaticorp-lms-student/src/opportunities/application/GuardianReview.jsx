/**
 * What a parent or guardian sees when they follow the link from a permission
 * request: who is asking, which job, and the two buttons.
 *
 * Deliberately outside the student app's shell. A guardian has no account
 * here, arrives from a message, and should see one page about one job — not a
 * sign-in, and not the rest of the LMS.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
    ShieldCheck, Loader2, Check, X, CheckCircle2, Ban, GraduationCap, Clock
} from 'lucide-react';
import { guardianApi } from './api';
import { Tracker, StatusBadge, JobCard, SafetySection, ConfirmDialog } from './parts';
import { toneFor, statusLabel } from './status';

const Shell = ({ children }) => (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-2xl space-y-4">{children}</div>
    </main>
);

export default function GuardianReview() {
    const { token } = useParams();
    // The mail's two buttons carry the answer here as ?answer=approve|decline,
    // so the parent lands on the confirmation for the one they pressed. It is
    // read as the initial value rather than in an effect: no scanner following
    // the link can turn it into a decision, and nothing is sent until they
    // confirm on this page.
    const [params] = useSearchParams();
    const fromMail = params.get('answer');
    const [state, setState] = useState({ loading: true, request: null, error: '' });
    const [busy, setBusy] = useState('');
    const [confirming, setConfirming] = useState(
        fromMail === 'approve' || fromMail === 'decline' ? fromMail : ''
    );
    const [reason, setReason] = useState('');

    const load = useCallback(() => {
        guardianApi.read(token)
            .then((d) => setState({ loading: false, request: d.request, error: '' }))
            .catch((e) => setState({ loading: false, request: null, error: e.message }));
    }, [token]);
    useEffect(load, [load]);

    const decide = (verb) => {
        setBusy(verb);
        const call = verb === 'approve' ? guardianApi.approve(token) : guardianApi.decline(token, reason.trim());
        call
            .then((d) => { setState({ loading: false, request: d.request, error: '' }); setConfirming(''); })
            .catch((e) => setState((s) => ({ ...s, error: e.message })))
            .finally(() => setBusy(''));
    };

    if (state.loading) {
        return <Shell><div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
            <Loader2 size={20} className="animate-spin text-indigo-500" aria-hidden="true" /> Opening the request…
        </div></Shell>;
    }
    if (!state.request) {
        return <Shell><div className="rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Ban size={26} aria-hidden="true" /></span>
            <h1 className="mt-4 text-xl font-black text-slate-900">This link cannot be opened</h1>
            <p className="mt-1 text-sm text-slate-600">{state.error}</p>
        </div></Shell>;
    }

    const req = state.request;
    // A parent's part ends the moment they answer. Everything after that —
    // the school's sign-off, the student continuing — is somebody else's step,
    // so the page says so rather than leaving them wondering what to do next.
    const answered = req.guardianAnswered
        || ['awaiting-admin', 'approved', 'rejected', 'declined', 'continued'].includes(req.status);
    const approved = req.status !== 'declined';

    return (
        <Shell>
            {/* ── Who is asking ────────────────────────────────────────── */}
            <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 shadow-sm sm:p-6">
                <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-wider text-indigo-700">
                    <ShieldCheck size={13} aria-hidden="true" /> Guardian permission
                </p>
                <h1 className="mt-3 text-2xl font-black leading-tight text-slate-900 sm:text-3xl">Part-Time Job Permission</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {req.guardian.name ? `Hello ${req.guardian.name}. ` : ''}
                    A student in your care has asked to apply for a part-time job. Nothing is arranged until you answer.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                        <GraduationCap size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1 basis-40">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Student</p>
                        <p className="truncate text-sm font-black text-slate-900">{req.student.name}</p>
                    </div>
                    {req.student.age != null && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            <Clock size={12} aria-hidden="true" /> Age {req.student.age}
                        </span>
                    )}
                </div>
            </header>

            {/* ── The job ──────────────────────────────────────────────── */}
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-black text-slate-900">The job</h2>
                    <StatusBadge tone={toneFor(req.status)}>{statusLabel(req.status)}</StatusBadge>
                </div>
                <JobCard job={req.job} />
                <SafetySection notes={req.job.safety} />
                <Tracker steps={req.steps} />
            </div>

            {/* ── The answer ───────────────────────────────────────────── */}
            {answered ? (
                <div className={`rounded-3xl border p-5 text-center shadow-sm ${approved ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
                    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full rw-pop ${approved ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        {approved ? <CheckCircle2 size={26} aria-hidden="true" /> : <Ban size={26} aria-hidden="true" />}
                    </span>
                    <p className={`mt-3 text-lg font-black ${approved ? 'text-emerald-900' : 'text-rose-900'}`}>
                        {approved ? 'Permission given' : 'Permission declined'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        {approved
                            ? 'Thank you. Your permission has been recorded.'
                            : 'The student has been told, and cannot continue with this job.'}
                    </p>
                    {approved && (
                        <p className="mx-auto mt-3 max-w-sm rounded-xl bg-white/70 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
                            {req.status === 'awaiting-admin'
                                ? 'The school is checking the application now. Nothing further is needed from you — you will not be asked again.'
                                : 'The school has signed it off as well, and the student can carry on.'}
                        </p>
                    )}
                    {req.declineReason && <p className="mt-2 text-sm text-rose-800"><span className="font-bold">Your reason: </span>{req.declineReason}</p>}
                    <p className="mt-3 text-xs text-slate-500">You can close this page.</p>
                </div>
            ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-center text-base font-bold text-slate-900">
                        Do you allow this student to continue with this job application?
                    </p>
                    {state.error && <p className="mt-2 text-center text-sm font-semibold text-rose-600">{state.error}</p>}
                    <div className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row">
                        <button type="button" onClick={() => setConfirming('decline')} disabled={!!busy}
                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 disabled:opacity-50">
                            <X size={17} aria-hidden="true" /> Decline
                        </button>
                        <button type="button" onClick={() => setConfirming('approve')} disabled={!!busy}
                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-50">
                            {busy === 'approve'
                                ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> Approving…</>
                                : <><Check size={17} strokeWidth={3} aria-hidden="true" /> Approve &amp; continue</>}
                        </button>
                    </div>
                    <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
                        Only you can answer this. Nobody at the school or the LMS can approve it for you.
                    </p>
                </div>
            )}

            {confirming === 'approve' && !answered && (
                <ConfirmDialog
                    title="Give permission?"
                    body={`This tells the LMS that you allow ${req.student.name || 'this student'} to go ahead with this job. Your school checks it afterwards.`}
                    confirmLabel={busy === 'approve' ? 'Approving…' : 'Yes, I approve'}
                    tone="emerald"
                    busy={busy === 'approve'}
                    onCancel={() => setConfirming('')}
                    onConfirm={() => decide('approve')}
                />
            )}

            {confirming === 'decline' && !answered && (
                <ConfirmDialog
                    title="Decline permission?"
                    body="Are you sure you want to decline permission for this job application?"
                    confirmLabel={busy === 'decline' ? 'Declining…' : 'Decline permission'}
                    busy={busy === 'decline'}
                    onCancel={() => setConfirming('')}
                    onConfirm={() => decide('decline')}
                >
                    <label className="mt-4 block">
                        <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Reason (optional)</span>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300}
                            className="w-full resize-none rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-500/25"
                            placeholder="The student will see this. e.g. School exams that week." />
                    </label>
                </ConfirmDialog>
            )}
        </Shell>
    );
}
