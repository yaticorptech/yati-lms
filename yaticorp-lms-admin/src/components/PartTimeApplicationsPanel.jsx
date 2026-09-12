/**
 * Part-time job applications and where their permission stands.
 *
 * Two people answer, in order. The parent decides whether their child may take
 * the job, through their own link — there is nothing on this panel that records
 * that answer, so an operator asked to "just approve it for the parent" still
 * has nothing to press. What this panel holds is the step after: once a parent
 * has agreed, the LMS signs the application off, and only then do the buttons
 * on a row appear.
 */
import { useEffect, useState } from 'react';
import api from '../utils/api';

const FILTERS = [
    ['', 'All'],
    // The queue an operator actually works: parent said yes, waiting on us.
    ['awaiting-admin', 'Needs your approval'],
    ['awaiting-guardian', 'With the parent'],
    ['approved', 'Approved'],
    ['declined', 'Declined'],
    ['rejected', 'Rejected'],
    ['needs-guardian', 'Not sent']
];

const BADGE = {
    'awaiting-guardian': { dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Waiting for guardian' },
    'awaiting-admin': { dot: 'bg-indigo-500', cls: 'bg-indigo-50 text-indigo-800 border-indigo-200', text: 'Parent approved · needs you' },
    rejected: { dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 border-rose-200', text: 'Rejected by admin' },
    approved: { dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Approved' },
    continued: { dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', text: 'Approved · continued' },
    declined: { dot: 'bg-rose-500', cls: 'bg-rose-50 text-rose-800 border-rose-200', text: 'Declined' },
    'needs-guardian': { dot: 'bg-slate-400', cls: 'bg-slate-50 text-slate-700 border-slate-200', text: 'Request not sent' },
    ready: { dot: 'bg-sky-500', cls: 'bg-sky-50 text-sky-800 border-sky-200', text: 'No permission needed' }
};

const Badge = ({ status }) => {
    const look = BADGE[status] || BADGE['needs-guardian'];
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold ${look.cls}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${look.dot}`} /> {look.text}
        </span>
    );
};

const DOT = { done: 'bg-emerald-500', active: 'bg-indigo-500', waiting: 'bg-slate-200', blocked: 'bg-rose-400' };

/** The same four steps the student and the guardian see, in one line. */
const Steps = ({ steps = [] }) => (
    <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT[s.state] || DOT.waiting}`} />
                <span className={`text-[11px] font-semibold ${s.state === 'waiting' ? 'text-slate-400' : 'text-slate-600'}`}>{s.label}</span>
                {i < steps.length - 1 && <span aria-hidden="true" className="text-slate-300">›</span>}
            </li>
        ))}
    </ol>
);

/**
 * The two buttons, and the note that goes with a rejection.
 *
 * `canDecide` comes from the server rather than being worked out from the
 * status here: the rule about what an operator may answer belongs next to the
 * route that enforces it, not in a browser that can be edited.
 */
const Decide = ({ row, onDone }) => {
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');

    const send = (verb) => {
        setBusy(verb); setError('');
        api.post(`/jobs/admin/opportunities/applications/${row.id}/${verb}`, { note: note.trim() })
            .then(() => onDone())
            .catch((e) => setError(e.response?.data?.error || 'Could not save that. Try again.'))
            .finally(() => setBusy(''));
    };

    return (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-xs font-bold text-indigo-900">
                {row.guardian.name || 'The parent'} has approved this. Your decision is the last one.
            </p>
            <label htmlFor={`note-${row.id}`} className="mt-2 block text-[11px] font-semibold text-slate-600">
                Note (shown to the student if you reject)
            </label>
            <input id={`note-${row.id}`} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)}
                placeholder="Optional"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400" />
            {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}
            <div className="mt-2.5 flex flex-wrap gap-2">
                <button type="button" disabled={!!busy} onClick={() => send('approve')}
                    className="min-h-10 flex-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 sm:flex-none">
                    {busy === 'approve' ? 'Approving…' : 'Approve'}
                </button>
                <button type="button" disabled={!!busy} onClick={() => send('decline')}
                    className="min-h-10 flex-1 rounded-xl border border-rose-200 bg-white px-4 text-sm font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60 sm:flex-none">
                    {busy === 'decline' ? 'Rejecting…' : 'Reject'}
                </button>
            </div>
        </div>
    );
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function PartTimeApplicationsPanel() {
    const [filter, setFilter] = useState('');
    const [nonce, setNonce] = useState(0);          // bumped to refetch
    // The answer carries the question it belongs to, so a slow earlier request
    // cannot overwrite a newer one and the effect never sets state on the spot.
    const key = `${filter}|${nonce}`;
    const [result, setResult] = useState({ key: null, rows: [], counts: {}, error: '' });

    useEffect(() => {
        let cancelled = false;
        api.get('/jobs/admin/opportunities/applications', { params: filter ? { status: filter } : {} })
            .then((r) => !cancelled && setResult({ key, rows: r.data.applications || [], counts: r.data.counts || {}, error: '' }))
            .catch((e) => !cancelled && setResult({ key, rows: [], counts: {}, error: e.response?.data?.error || 'Could not load applications.' }));
        return () => { cancelled = true; };
    }, [key, filter]);

    const loading = result.key !== key;
    const state = { loading, rows: loading ? [] : result.rows, counts: loading ? {} : result.counts, error: loading ? '' : result.error };
    const load = () => setNonce((n) => n + 1);

    /**
     * Pick up parents' answers without being asked to.
     *
     * A parent approves on their own phone, minutes or hours after the request
     * went out, and nothing tells this panel. Left alone it would sit on a
     * stale list and an operator would never know a row was waiting on them —
     * so it refetches on a slow timer, and at once when the tab is looked at.
     */
    useEffect(() => {
        const tick = () => { if (!document.hidden) setNonce((n) => n + 1); };
        const timer = setInterval(tick, 20000);
        window.addEventListener('focus', tick);
        return () => { clearInterval(timer); window.removeEventListener('focus', tick); };
    }, []);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-56">
                    <h2 className="text-lg font-bold text-slate-800">Part-time applications</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Students under 15 need two answers: their parent&apos;s, given through their own
                        link, and then yours. A row gets buttons only once the parent has agreed.
                    </p>
                </div>
                <button type="button" onClick={load}
                    className="min-h-10 shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    Refresh
                </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {FILTERS.map(([value, label]) => (
                    <button key={label} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                            filter === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {label}{state.counts[value] ? ` (${state.counts[value]})` : ''}
                    </button>
                ))}
            </div>

            {state.error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{state.error}</p>}
            {state.loading && <p className="mt-4 text-sm text-slate-500">Loading…</p>}

            {!state.loading && !state.error && state.rows.length === 0 && (
                <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No applications {filter ? 'with that status' : 'yet'}.
                </p>
            )}

            <ul className="mt-4 space-y-3">
                {state.rows.map((row) => (
                    <li key={row.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 basis-52">
                                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-800">
                                    {row.student.name}
                                    {row.underAge && (
                                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-black text-amber-800">
                                            Under 15{row.student.age != null ? ` · age ${row.student.age}` : ''}
                                        </span>
                                    )}
                                </p>
                                <p className="mt-0.5 text-sm text-slate-600">{row.job.title}{row.job.company ? ` · ${row.job.company}` : ''}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Guardian: <span className="font-semibold text-slate-700">{row.guardian.name || '—'}</span>
                                    {row.guardian.phone ? ` · ${row.guardian.phone}` : ''}
                                </p>
                            </div>
                            <Badge status={row.status} />
                        </div>

                        <div className="mt-3 border-t border-slate-100 pt-3">
                            <Steps steps={row.steps} />
                            <p className="mt-2 text-[11px] text-slate-400">
                                Requested {fmt(row.requestedAt)}{row.decidedAt ? ` · answered ${fmt(row.decidedAt)}` : ''}
                            </p>
                            {row.declineReason && (
                                <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
                                    <span className="font-bold">Guardian&apos;s reason: </span>{row.declineReason}
                                </p>
                            )}
                            {row.adminNote && (
                                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                                    <span className="font-bold">Admin note: </span>{row.adminNote}
                                </p>
                            )}
                            {row.adminDecidedAt && (
                                /* An approved row is a record, so it says who agreed and when —
                                   both answers, in the order they were given. */
                                <dl className={`mt-2 grid gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-xs sm:grid-cols-2 ${
                                    row.status === 'rejected' ? 'bg-rose-50' : 'bg-emerald-50'
                                }`}>
                                    <div className="flex gap-2">
                                        <dt className="text-slate-500">Parent agreed</dt>
                                        <dd className="font-semibold text-slate-800">{fmt(row.decidedAt)}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                        <dt className="text-slate-500">{row.status === 'rejected' ? 'Rejected' : 'Approved'} by you</dt>
                                        <dd className="font-semibold text-slate-800">{fmt(row.adminDecidedAt)}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                        <dt className="text-slate-500">Signed off by</dt>
                                        <dd className="font-semibold text-slate-800">{row.adminBy || 'Admin'}</dd>
                                    </div>
                                    <div className="flex gap-2">
                                        <dt className="text-slate-500">Student continued</dt>
                                        <dd className="font-semibold text-slate-800">{row.continuedAt ? fmt(row.continuedAt) : 'Not yet'}</dd>
                                    </div>
                                </dl>
                            )}
                            {row.canDecide && <Decide row={row} onDone={load} />}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
