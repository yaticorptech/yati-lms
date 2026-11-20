/**
 * A demo (presentation) card's dashboards: which one to open (2026-11-19).
 *
 * Shown when the card is scanned at sign-in, and again from the bar at the top of a dashboard
 * (DemoBar.jsx) to change to another — `current` is the one open now. Student and Teacher are
 * in this app; Organisation is the admin app, reached with a two-minute pass; Parents is listed
 * but not built yet. Everything is opened with the card's switch pass (utils/demoSwitch.js;
 * server: routes/demoDashboardRoutes.js). Closing it changes nothing.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Presentation, Building2, HeartHandshake, ArrowUpRight, Loader2, X, AlertCircle } from 'lucide-react';
import useBackClose from '../native/useBackClose';
import { openDemoDashboard } from '../utils/demoSwitch';

// What each dashboard is, in the words a presenter would say. The tint is the dashboard's own.
const ABOUT = {
    student: { Icon: GraduationCap, title: 'Student', text: 'Courses, Career Path, jobs, quizzes and rewards — every section unlocked.', tint: 'text-indigo-200 bg-indigo-400/15 ring-indigo-300/25', edge: 'before:bg-indigo-400' },
    teacher: { Icon: Presentation, title: 'Teacher', text: 'Research tools, 360 mentoring, clubs and Scouts & Guides units.', tint: 'text-emerald-200 bg-emerald-400/15 ring-emerald-300/25', edge: 'before:bg-emerald-400' },
    organization: { Icon: Building2, title: 'Organisation', text: 'A college’s own panel: students, teachers, campus, courses and competitions.', tint: 'text-amber-200 bg-amber-400/15 ring-amber-300/25', edge: 'before:bg-amber-400' },
    parent: { Icon: HeartHandshake, title: 'Parents', text: 'A child’s progress, attendance and notices, for the family.', tint: 'text-slate-300 bg-white/5 ring-white/10', edge: 'before:bg-slate-500' }
};
const DEFAULT = [{ id: 'student', ready: true }, { id: 'teacher', ready: true }, { id: 'organization', ready: true }, { id: 'parent', ready: false }];

/**
 * @param {string}  props.token    the card's switch pass
 * @param {object}  [props.session] the student session a scan just answered with (sign-in page)
 * @param {string}  [props.current] the dashboard open now, when changing from inside one
 * @param {string}  [props.name]    whose card it is
 */
export default function DemoDashboardChooser({ token, session, current, name, onClose }) {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const firstRef = useRef(null);
    const panelRef = useRef(null);
    const list = (Array.isArray(session?.dashboards) && session.dashboards.length ? session.dashboards : DEFAULT).filter((d) => ABOUT[d.id]);

    const close = () => { if (!busy) onClose(); };
    useBackClose(close, true);
    useEffect(() => { (firstRef.current || panelRef.current?.querySelector('button:not([disabled])'))?.focus(); }, []);
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

    const open = async (id) => {
        if (busy || id === current) return;
        setError('');
        setBusy(id);
        try {
            await openDemoDashboard(token, id, session);
        } catch (err) {
            setError(err.response?.data?.message || (!err.response ? 'Could not reach the server. Check your connection and try again.' : 'That dashboard could not be opened. Try again.'));
            setBusy('');
        }
    };
    const firstOpen = list.findIndex((d) => d.ready !== false && d.id !== current);

    return (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[#0d0f1a]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={close}>
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="demo-chooser-title" onClick={(e) => e.stopPropagation()}
                className="lg-rise w-full max-w-lg overflow-hidden rounded-t-[28px] bg-[#232740] text-left shadow-[0_40px_90px_-30px_rgba(0,0,0,0.85)] ring-1 ring-white/10 sm:rounded-[28px]">
                <div className="relative px-6 pt-6 pb-5 sm:px-7">
                    <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-48 w-56 rounded-full bg-amber-400/10 blur-3xl" />
                    <div className="relative flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 ring-1 ring-amber-300/20">
                                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-300" /> Demo card
                            </p>
                            <h2 id="demo-chooser-title" className="mt-3 text-xl font-bold tracking-tight text-white">{current ? 'Switch dashboard' : 'Which dashboard shall we open?'}</h2>
                            <p className="mt-1 truncate text-sm text-slate-400">{name ? `${name} · ` : ''}no password needed</p>
                        </div>
                        <button type="button" onClick={close} disabled={!!busy} aria-label="Close" className="-mr-1.5 rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-40"><X size={18} /></button>
                    </div>
                </div>

                <ul className="space-y-2 px-4 pb-4 sm:px-5">
                    {list.map((d, i) => {
                        const { Icon, title, text, tint, edge } = ABOUT[d.id];
                        const here = d.id === current;
                        const ready = d.ready !== false && !here;
                        const mine = busy === d.id;
                        return (
                            <li key={d.id}>
                                <button ref={i === firstOpen ? firstRef : null} type="button" onClick={() => open(d.id)} disabled={!ready || (!!busy && !mine)} aria-busy={mine || undefined} aria-current={here ? 'true' : undefined}
                                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 text-left ring-1 transition-all duration-200 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-full before:transition-opacity ${edge} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${here ? 'bg-white/[0.07] ring-white/15 before:opacity-100' : `bg-white/[0.035] ring-white/[0.07] before:opacity-0 ${ready ? 'hover:bg-white/[0.07] hover:ring-white/15 hover:before:opacity-100 focus-visible:before:opacity-100' : 'cursor-not-allowed opacity-55'}`} ${busy && !mine && !here ? 'opacity-40' : ''} ${mine ? 'bg-white/[0.07] before:opacity-100' : ''}`}>
                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${tint}`}><Icon size={20} strokeWidth={1.9} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-slate-50">{title}</span>
                                            {here && <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-300/20">You are here</span>}
                                            {d.ready === false && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">Coming soon</span>}
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

                <div className="border-t border-white/5 px-6 py-3.5 sm:px-7" style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}>
                    {error ? (
                        <p role="alert" className="flex items-start gap-2 text-sm font-medium text-rose-300"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</p>
                    ) : (
                        <p role="status" className="text-xs text-slate-500">{busy ? 'Opening the dashboard…' : 'Change dashboard any time from the Demo card bar at the top.'}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
