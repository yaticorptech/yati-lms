/**
 * The bar at the top of the organisation panel when it was opened with a demo (presentation)
 * card (2026-11-19; pages/DemoAccess.jsx keeps the card's switch pass with the session): says so,
 * and changes to the card's student or teacher dashboard — in the student app, which trades the
 * pass for that session (its pages/DemoSwitch.jsx) — without signing out and scanning again.
 * The same bar sits in those two dashboards (student app: components/DemoBar.jsx).
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowUpRight, GraduationCap, Presentation, Building2, HeartHandshake, Loader2, X } from 'lucide-react';
import { studentAppUrl } from '../utils/studentUrl';

const DASHBOARDS = [
    { id: 'student', Icon: GraduationCap, title: 'Student', text: 'Courses, Career Path, jobs, quizzes and rewards — every section unlocked.', tint: 'text-indigo-200 bg-indigo-400/15 ring-indigo-300/25', edge: 'before:bg-indigo-400' },
    { id: 'teacher', Icon: Presentation, title: 'Teacher', text: 'Research tools, 360 mentoring, clubs and Scouts & Guides units.', tint: 'text-emerald-200 bg-emerald-400/15 ring-emerald-300/25', edge: 'before:bg-emerald-400' },
    { id: 'organization', Icon: Building2, title: 'Organisation', text: 'A college’s own panel: students, teachers, campus, courses and competitions.', tint: 'text-amber-200 bg-amber-400/15 ring-amber-300/25', edge: 'before:bg-amber-400', here: true },
    { id: 'parent', Icon: HeartHandshake, title: 'Parents', text: 'A child’s progress, attendance and notices, for the family.', tint: 'text-slate-300 bg-white/5 ring-white/10', edge: 'before:bg-slate-500', soon: true }
];

function Chooser({ token, name, onClose }) {
    const [busy, setBusy] = useState('');
    const panelRef = useRef(null);
    const close = () => { if (!busy) onClose(); };
    useEffect(() => { panelRef.current?.querySelector('li button:not([disabled])')?.focus(); }, []);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); return; }
            if (e.key !== 'Tab') return;
            // Tab stays inside the dialog.
            const stops = [...(panelRef.current?.querySelectorAll('button:not([disabled])') || [])];
            if (!stops.length) return;
            const at = stops.indexOf(document.activeElement);
            if (e.shiftKey && at <= 0) { e.preventDefault(); stops[stops.length - 1].focus(); }
            else if (!e.shiftKey && at === stops.length - 1) { e.preventDefault(); stops[0].focus(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busy]);
    const open = (id) => {
        if (busy) return;
        setBusy(id);
        // The pass rides in the fragment, which is never sent to a server.
        window.location.assign(`${studentAppUrl()}/demo-switch#to=${id}&token=${encodeURIComponent(token)}`);
    };
    return (
        <div className="fixed inset-0 z-[210] flex items-end justify-center bg-[#0d0f1a]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="demo-switch-title" onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg overflow-hidden rounded-t-[28px] bg-[#232740] text-left shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 sm:rounded-[28px]">
                <div className="relative px-6 pt-6 pb-5 sm:px-7">
                    <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-48 w-56 rounded-full bg-amber-400/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 ring-1 ring-amber-300/20">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Demo card
                            </p>
                            <h2 id="demo-switch-title" className="mt-3 text-xl font-bold tracking-tight text-white">Switch dashboard</h2>
                            <p className="mt-1 truncate text-sm text-slate-400">{name ? `${name} · ` : ''}no password needed</p>
                        </div>
                        <button type="button" onClick={close} disabled={!!busy} aria-label="Close" className="-mr-1.5 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40"><X size={18} /></button>
                    </div>
                </div>
                <ul className="space-y-2 px-4 pb-5 sm:px-5">
                    {DASHBOARDS.map(({ id, Icon, title, text, tint, edge, here, soon }) => {
                        const ready = !here && !soon;
                        const mine = busy === id;
                        return (
                            <li key={id}>
                                <button type="button" onClick={() => open(id)} disabled={!ready || (!!busy && !mine)} aria-busy={mine || undefined} aria-current={here ? 'true' : undefined}
                                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 text-left ring-1 transition-all duration-200 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:transition-opacity ${edge} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${here ? 'bg-white/[0.07] ring-white/15 before:opacity-100' : `bg-white/[0.035] ring-white/[0.07] before:opacity-0 ${ready ? 'hover:bg-white/[0.07] hover:ring-white/15 hover:before:opacity-100 focus-visible:before:opacity-100' : 'cursor-not-allowed opacity-55'}`} ${busy && !mine && !here ? 'opacity-40' : ''} ${mine ? 'bg-white/[0.07] before:opacity-100' : ''}`}>
                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tint}`}><Icon size={20} strokeWidth={1.9} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-50">{title}</span>
                                            {here && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-300/20">You are here</span>}
                                            {soon && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Coming soon</span>}
                                        </span>
                                        <span className="mt-0.5 block text-[13px] leading-snug text-slate-400">{text}</span>
                                    </span>
                                    {ready && (
                                        <span className="shrink-0 text-slate-500 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white">
                                            {mine ? <Loader2 size={18} className="animate-spin text-white" /> : <ArrowUpRight size={18} />}
                                        </span>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

/** @param {object} props.admin  the signed-in account (context/AuthContext): shown only for a demo card's session */
export default function DemoSwitchBar({ admin, organization }) {
    const [open, setOpen] = useState(false);
    if (!admin?.demo || !admin?.demoSwitch) return null;
    return (
        <>
            <div role="status" className="flex shrink-0 items-center gap-3 bg-[#232740] px-4 py-2 text-sm text-slate-200 lg:px-8" data-demo-bar>
                <p className="min-w-0 flex-1 truncate"><span className="font-semibold text-white">Organisation dashboard</span><span className="hidden text-slate-400 sm:inline"> · {organization?.name}</span></p>
                <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
                    className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300">
                    <ArrowLeftRight size={14} aria-hidden="true" /> Switch<span className="hidden sm:inline"> dashboard</span>
                </button>
            </div>
            {open && <Chooser token={admin.demoSwitch} name={organization?.name} onClose={() => setOpen(false)} />}
        </>
    );
}
