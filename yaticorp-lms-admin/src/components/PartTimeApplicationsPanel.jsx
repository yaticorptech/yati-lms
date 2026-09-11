/**
 * Part-time job applications and where their guardian permission stands.
 *
 * Read-only, and that is the point. A guardian's answer is theirs to give, so
 * there is nothing on this panel to press: an operator asked to "just approve
 * it" can see the request, chase it, and nothing more.
 */
import { useEffect, useState } from 'react';
import api from '../utils/api';

const FILTERS = [
    ['', 'All'],
    ['awaiting-guardian', 'Waiting'],
    ['approved', 'Approved'],
    ['declined', 'Declined'],
    ['needs-guardian', 'Not sent']
];

const BADGE = {
    'awaiting-guardian': { dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 border-amber-200', text: 'Waiting for guardian' },
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

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 basis-56">
                    <h2 className="text-lg font-bold text-slate-800">Part-time applications</h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Guardian permission for students under 15. Decisions are made by the guardian through their own link — they cannot be recorded here.
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
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
