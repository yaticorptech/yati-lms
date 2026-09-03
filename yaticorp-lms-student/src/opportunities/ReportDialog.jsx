/**
 * @description Report an opportunity or the organisation behind it.
 *              Reports land in an admin queue; nothing goes to the employer.
 */
import { useEffect, useRef, useState } from 'react';
import { Flag, X, CheckCircle2, Loader2 } from 'lucide-react';
import { opportunitiesApi } from './api';

const REASONS = [
    'Unsafe or inappropriate for my age',
    'Asked for personal contact details or money',
    'Misleading description or pay',
    'Organisation could not be verified',
    'Other'
];

export default function ReportDialog({ opp, onClose }) {
    const [target, setTarget] = useState('opportunity');
    const [reason, setReason] = useState(REASONS[0]);
    const [details, setDetails] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const firstRef = useRef(null);

    useEffect(() => {
        firstRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            await opportunitiesApi.report(opp.id, { target, reason, details });
            setDone(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <form role="dialog" aria-modal="true" aria-labelledby="opp-report-title" onSubmit={submit} onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-4">
                    <h2 id="opp-report-title" className="flex items-center gap-2 font-bold text-slate-800">
                        <Flag size={16} className="text-rose-500" aria-hidden="true" /> Report
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"><X size={16} /></button>
                </div>

                {done ? (
                    <div className="p-6 text-center">
                        <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500" aria-hidden="true" />
                        <p className="font-bold text-slate-800">Thanks — we'll look into it.</p>
                        <p className="mt-1 text-sm text-slate-500">The report goes to the LMS team, not to the organisation. We'll hide the listing while it is reviewed if needed.</p>
                        <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Done</button>
                    </div>
                ) : (
                    <div className="space-y-4 p-5">
                        <p className="text-sm text-slate-600">Reporting <span className="font-semibold text-slate-800">{opp.title}</span> by {opp.organization?.name}.</p>

                        <fieldset>
                            <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">What are you reporting?</legend>
                            <div className="flex gap-2">
                                {[['opportunity', 'This opportunity'], ['organization', 'The organisation']].map(([id, label], i) => (
                                    <label key={id} className={`flex flex-1 cursor-pointer items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold ${target === id ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-600'}`}>
                                        <input ref={i === 0 ? firstRef : null} type="radio" name="target" value={id} checked={target === id} onChange={() => setTarget(id)} className="sr-only" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <div>
                            <label htmlFor="opp-report-reason" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Reason</label>
                            <select id="opp-report-reason" value={reason} onChange={(e) => setReason(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40">
                                {REASONS.map((r) => <option key={r}>{r}</option>)}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="opp-report-details" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Details <span className="font-medium normal-case tracking-normal text-slate-400">(optional)</span></label>
                            <textarea id="opp-report-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000}
                                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="What happened?" />
                        </div>

                        {error && <p className="text-xs text-rose-600">{error}</p>}

                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                                {busy && <Loader2 size={14} className="animate-spin" />} Send report
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
