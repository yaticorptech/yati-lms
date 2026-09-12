/**
 * The pieces the three approval screens share: the progress tracker, status
 * badges, the job card a guardian reads, and a confirmation dialog.
 *
 * Built from the same rounded cards, soft shadows and slate/indigo palette as
 * the rest of the jobs section, so this reads as part of the board rather than
 * a form bolted onto it.
 */
import { useEffect, useRef } from 'react';
import {
    Check, Clock, Circle, X, Briefcase, Building2, MapPin, CalendarDays,
    Wallet, ShieldCheck, ChevronDown, AlertTriangle, CheckCircle2
} from 'lucide-react';

/* ── Progress tracker ─────────────────────────────────────────────────── */

const STEP_LOOK = {
    done: { ring: 'border-emerald-500 bg-emerald-500 text-white', line: 'bg-emerald-500', label: 'text-slate-900' },
    active: { ring: 'border-indigo-500 bg-indigo-50 text-indigo-600', line: 'bg-slate-200', label: 'text-indigo-700' },
    waiting: { ring: 'border-slate-200 bg-white text-slate-300', line: 'bg-slate-200', label: 'text-slate-400' },
    blocked: { ring: 'border-rose-300 bg-rose-50 text-rose-500', line: 'bg-rose-200', label: 'text-rose-600' }
};
const STEP_ICON = { done: Check, active: Clock, waiting: Circle, blocked: X };

/**
 * The four steps, side by side where there is room and stacked on a phone —
 * a four-across tracker at 320px would leave one word per step.
 */
export const Tracker = ({ steps = [] }) => (
    <ol className="flex flex-col gap-3 sm:flex-row sm:gap-0" aria-label="Approval progress">
        {steps.map((step, i) => {
            const look = STEP_LOOK[step.state] || STEP_LOOK.waiting;
            const Icon = STEP_ICON[step.state] || Circle;
            const last = i === steps.length - 1;
            return (
                <li key={step.label} className="flex min-w-0 flex-1 items-center gap-3 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
                    <span className="flex items-center gap-3 sm:w-full sm:gap-0">
                        <span aria-hidden="true" className={`hidden h-0.5 flex-1 rounded-full sm:block ${i === 0 ? 'bg-transparent' : (steps[i - 1].state === 'done' ? 'bg-emerald-500' : look.line)}`} />
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-300 ${look.ring}`}>
                            {step.state === 'active'
                                ? <Icon size={15} className="animate-pulse" aria-hidden="true" />
                                : step.state === 'waiting'
                                    ? <span className="text-xs font-black">{i + 1}</span>
                                    : <Icon size={16} strokeWidth={3} aria-hidden="true" />}
                        </span>
                        <span aria-hidden="true" className={`hidden h-0.5 flex-1 rounded-full sm:block ${last ? 'bg-transparent' : look.line}`} />
                    </span>
                    <span className={`min-w-0 text-sm font-semibold sm:px-1 sm:text-xs ${look.label}`}>
                        {step.label}
                        <span className="sr-only"> — {step.state === 'done' ? 'done' : step.state === 'active' ? 'in progress' : step.state === 'blocked' ? 'stopped' : 'not started'}</span>
                    </span>
                </li>
            );
        })}
    </ol>
);

/* ── Status badge ─────────────────────────────────────────────────────── */

const BADGE = {
    waiting: { dot: 'bg-amber-500', cls: 'border-amber-200 bg-amber-50 text-amber-800' },
    approved: { dot: 'bg-emerald-500', cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
    declined: { dot: 'bg-rose-500', cls: 'border-rose-200 bg-rose-50 text-rose-800' },
    neutral: { dot: 'bg-slate-400', cls: 'border-slate-200 bg-slate-50 text-slate-700' }
};

export const StatusBadge = ({ tone = 'neutral', children }) => {
    const look = BADGE[tone] || BADGE.neutral;
    return (
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${look.cls}`}>
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${look.dot} ${tone === 'waiting' ? 'animate-pulse' : ''}`} />
            {children}
        </span>
    );
};

/* ── The job, as the guardian reads it ────────────────────────────────── */

const Row = ({ icon: Icon, label, value }) => (
    <li className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
            <Icon size={15} aria-hidden="true" />
        </span>
        <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
            <span className="block break-words text-sm font-semibold text-slate-800">{value || '—'}</span>
        </span>
    </li>
);

export const JobCard = ({ job }) => (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
        <ul className="grid gap-3 sm:grid-cols-2">
            <Row icon={Briefcase} label="Job" value={job.title} />
            <Row icon={Building2} label="Company" value={job.company} />
            <Row icon={Clock} label="Hours" value={job.hours} />
            <Row icon={CalendarDays} label="Duration" value={job.duration} />
            <Row icon={MapPin} label="Location" value={job.location} />
            {job.pay && <Row icon={Wallet} label="Pay" value={job.pay} />}
        </ul>
    </div>
);

/** The safety notes, folded away until asked for. */
export const SafetySection = ({ notes = [] }) => (
    <details className="group rounded-2xl border border-slate-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-600" aria-hidden="true" /> Safety &amp; job information</span>
            <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ul className="space-y-2 border-t border-slate-100 px-4 py-3 text-xs leading-relaxed text-slate-600">
            {notes.map((note) => (
                <li key={note} className="flex items-start gap-2">
                    <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" /> {note}
                </li>
            ))}
        </ul>
    </details>
);

/* ── Confirmation dialog ──────────────────────────────────────────────── */

/** A small modal that takes focus, closes on Escape, and asks once. */
export const ConfirmDialog = ({ title, body, confirmLabel, tone = 'rose', busy, onCancel, onConfirm, children }) => {
    const ref = useRef(null);
    useEffect(() => {
        ref.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);
    // A dialog that asks someone to agree must not be dressed as a warning:
    // the same red triangle on "approve" and "decline" reads as "something is
    // wrong" either way, and a parent pressing yes should not see one.
    const LOOK = {
        rose: { btn: 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-500/60', mark: 'bg-rose-50 text-rose-600', Icon: AlertTriangle },
        emerald: { btn: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500/60', mark: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle2 },
        indigo: { btn: 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500/60', mark: 'bg-indigo-50 text-indigo-600', Icon: AlertTriangle }
    };
    const { btn: confirmCls, mark, Icon } = LOOK[tone] || LOOK.indigo;
    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
            <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl animate-fade-in-up sm:p-6">
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${mark}`}>
                    <Icon size={20} aria-hidden="true" />
                </span>
                <h3 id="confirm-title" className="mt-3 text-lg font-black text-slate-900">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{body}</p>
                {children}
                <div className="mt-5 flex flex-wrap gap-2.5">
                    <button ref={ref} type="button" onClick={onCancel}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60">
                        Cancel
                    </button>
                    <button type="button" onClick={onConfirm} disabled={busy}
                        className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-60 ${confirmCls}`}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};
