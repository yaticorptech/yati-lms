/**
 * Linguistic Ability — the student's roadmap (asked 2026-10-24: "ask how
 * much time they need to learn the language, and generate their learning
 * road map from it"). With a plan: how far along they are, whether they are
 * on track, and every day of it — the days gone with what was done, today's
 * lessons, the days to come. Days only, never dates (asked 2026-10-24). The
 * time is not chosen (2026-11-04, "don't give the learning days to choose"):
 * the server sets it, 90 days for a Beginner, 60 of the Advanced lessons after
 * the Advanced entry test (service.js autoPlan); a plan chosen before then
 * keeps its days. Without a plan, one is made by itself here.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Check, Lock, ChevronDown, Target, Clock, Info, Zap, AlarmClock, CircleCheck } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS } from './meta';
import { Bar, Loading, Panel, Problem } from './ui';
import { planLabel, planStatus } from './parts/plan';

const KIND = { lesson: 'Lesson', story: 'Story', speaking: 'Speaking', listening: 'Listening', review: 'Review', checkpoint: 'Checkpoint', talk: 'Speak on a topic' };

/** One lesson on the roadmap: its unit, its kind, and the way in when it is open. */
function Row({ l }) {
    const done = l.status === 'completed';
    const body = (
        <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: done ? COLORS.green.face : l.open ? COLORS.blue.light : '#F2F2F2' }}>
                {done ? <Check size={15} strokeWidth={4} className="text-white" /> : !l.open && <Lock size={13} className="text-[#AFAFAF]" />}
            </span>
            <span className="min-w-0 flex-1">
                <span className={`block truncate text-[15px] font-extrabold ${done ? 'text-[#AFAFAF] line-through' : 'text-[#4b4b4b]'}`}>{l.title}</span>
                <span className="block truncate text-xs font-bold uppercase tracking-wide text-[#AFAFAF]">{l.unit ? `${l.unit} · ` : ''}{KIND[l.type] || 'Lesson'}</span>
            </span>
        </>
    );
    return l.open && !done
        ? <li><Link to={`/linguistic/${l.module}/${l.id}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[#F7F7F7]" data-roadmap-lesson={l.id}>{body}</Link></li>
        : <li className="flex items-center gap-3 py-1.5" data-roadmap-lesson={l.id}>{body}</li>;
}

/** The days of the plan as a ring: how far through the month (or weeks) the student is. */
function DayRing({ day, days }) {
    const r = 26;
    const len = 2 * Math.PI * r;
    const part = days ? Math.min(1, day / days) : 0;
    return (
        <div className="relative grid h-[72px] w-[72px] shrink-0 place-items-center" aria-hidden="true">
            <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full -rotate-90">
                <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
                <circle cx="32" cy="32" r={r} fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${len * part} ${len}`} />
            </svg>
            <span className="text-center leading-none"><span className="block text-lg font-black">{day}</span><span className="text-[9px] font-extrabold uppercase tracking-wider text-white/85">day</span></span>
        </div>
    );
}

export default function Roadmap() {
    const { reload } = useOutletContext();
    const [data, setData] = useState(undefined);
    const [error, setError] = useState(null);
    const [showPast, setShowPast] = useState(false);
    // No plan yet: made by itself, then shown.
    const load = useCallback(() => linguisticApi.plan().then((d) => (d.plan ? d : linguisticApi.setPlan().then((made) => { reload?.(); return made; })))
        .then((d) => { setData(d); setError(null); }).catch((e) => { setError(e); setData(null); }), [reload]);
    useEffect(() => { load(); }, [load]);
    if (data === undefined) return <Loading label="Opening your roadmap…" />;
    if (!data) return <Problem error={error} onRetry={load} />;

    const course = data.course?.name || 'English';
    const p = data.plan;
    const header = (
        // No back arrow (2026-10-29, "remove this"): the ✕ above opens the dashboard.
        <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#3c3c3c]">Your {course} roadmap</h1>
        </div>
    );
    if (!p) return <div className="space-y-5" data-roadmap>{header}<Loading label="Making your roadmap…" /></div>;

    const status = planStatus(p);
    const past = p.schedule.filter((d) => d.past);
    const ahead = p.schedule.filter((d) => !d.past);
    return (
        <div className="space-y-5" data-roadmap={p.days}>
            {header}
            {/* Redesigned 2026-11-16 ("redesign this"): a purple card like the Roadmap tile, a ring for the days,
                the lessons bar in white, the status as a pill, and the details as small chips. */}
            <section className="relative overflow-hidden rounded-3xl px-5 py-5 text-white sm:px-7" style={{ background: `linear-gradient(135deg, ${COLORS.purple.face} 0%, #8B5CF6 100%)`, boxShadow: `0 4px 0 ${COLORS.purple.edge}, 0 14px 28px -12px ${COLORS.purple.edge}` }} data-plan-summary>
                <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-14 left-1/3 h-28 w-28 rounded-full bg-white/10" />
                <div className="relative flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/85">{planLabel(p.days)} plan · {p.tier === 'full' ? 'every lesson' : 'the main lessons'}</p>
                        <p className="mt-1 text-3xl font-black leading-tight drop-shadow-sm">Day <span data-plan-day>{Math.min(p.day, p.days)}</span> <span className="text-white/80">of {p.days}</span></p>
                    </div>
                    <DayRing day={Math.min(p.day, p.days)} days={p.days} />
                </div>
                <div className="relative mt-4">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-black/15" role="progressbar" aria-valuenow={p.done} aria-valuemin={0} aria-valuemax={p.total} aria-label={`${p.done} of ${p.total} lessons done`}>
                        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${p.total ? Math.max((p.done / p.total) * 100, p.done ? 3 : 0) : 0}%` }} />
                    </div>
                    <p className="mt-1.5 flex justify-between text-xs font-extrabold text-white/90"><span>{p.done} of {p.total} lessons done</span><span className="tabular-nums">{p.total ? Math.round((p.done / p.total) * 100) : 0}%</span></p>
                </div>
                <p className="relative mt-4 flex items-start gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-extrabold shadow-sm" style={{ color: COLORS[status.tone].ink }} data-plan-status={status.tone}>
                    {status.tone === 'green' ? <CircleCheck size={18} className="mt-px shrink-0" /> : status.tone === 'red' ? <AlarmClock size={18} className="mt-px shrink-0" /> : <Zap size={18} className="mt-px shrink-0" />}
                    <span>{status.text}</span>
                </p>
                {(data.about?.focus?.length > 0 || data.about?.studyTime || p.tier === 'main') && (
                    <div className="relative mt-3 flex flex-wrap gap-2 text-xs font-bold" data-plan-about>
                        {data.about?.focus?.length > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1"><Target size={13} /> Getting better at {data.about.focus.map((f) => f[0].toUpperCase() + f.slice(1)).join(', ')}</span>}
                        {data.about?.studyTime && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1"><Clock size={13} /> Learns {data.about.studyTime === 'night' ? 'at night' : `in the ${data.about.studyTime}`}</span>}
                        {p.tier === 'main' && <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1" title="Your time is short, so this roadmap has the main lessons; the extra practice (unit reviews and listening) is left out."><Info size={13} /> Main lessons only · reviews and listening left out to fit your time</span>}
                    </div>
                )}
            </section>

            {past.length > 0 && (
                <Panel className="p-4">
                    <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} className="flex w-full items-center gap-2 text-left text-[15px] font-extrabold text-[#777]">
                        <ChevronDown size={18} className={`transition-transform ${showPast ? 'rotate-180' : ''}`} />
                        Days 1–{past.length}: {past.reduce((n, d) => n + d.lessons.length, 0)} lessons done
                    </button>
                    {showPast && (
                        <ol className="mt-3 space-y-3">
                            {past.map((d) => (
                                <li key={d.day}>
                                    <p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Day {d.day}</p>
                                    {d.lessons.length ? <ul>{d.lessons.map((l) => <Row key={l.id} l={l} />)}</ul> : <p className="py-1 text-sm font-semibold text-[#AFAFAF]">Nothing done</p>}
                                </li>
                            ))}
                        </ol>
                    )}
                </Panel>
            )}

            <ol className="space-y-3" data-plan-days>
                {ahead.map((d) => (
                    <li key={d.day}>
                        <Panel className="p-4" style={d.today ? { borderColor: COLORS.blue.face } : undefined} data-plan-day-row={d.day} data-today={d.today || undefined}>
                            <p className="mb-1 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider" style={{ color: d.today ? COLORS.blue.ink : '#AFAFAF' }}>
                                {d.today && <Target size={16} />} {d.today ? `Today · Day ${d.day}` : `Day ${d.day}`}
                                <span className="ml-auto text-xs normal-case tracking-normal text-[#AFAFAF]">{d.lessons.length ? `${d.lessons.length} lesson${d.lessons.length === 1 ? '' : 's'} · ~${d.lessons.length * p.minutesPerLesson} min` : 'Rest day'}</span>
                            </p>
                            {d.lessons.length > 0 && <ul>{d.lessons.map((l) => <Row key={l.id} l={l} />)}</ul>}
                        </Panel>
                    </li>
                ))}
            </ol>
        </div>
    );
}
