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
import { Check, Lock, ChevronDown, Target } from 'lucide-react';
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
            <Panel className="p-5" data-plan-summary>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">{planLabel(p.days)} plan · {p.tier === 'full' ? 'every lesson' : 'the main lessons'}</p>
                        <p className="mt-1 text-xl font-extrabold text-[#3c3c3c]">Day <span data-plan-day>{Math.min(p.day, p.days)}</span> of {p.days}</p>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                    <Bar value={p.total ? (p.done / p.total) * 100 : 0} className="h-3 flex-1" label={`${p.done} of ${p.total} lessons done`} />
                    <span className="text-sm font-extrabold tabular-nums text-[#AFAFAF]">{p.done}/{p.total}</span>
                </div>
                <p className="mt-3 rounded-xl px-3 py-2 text-sm font-bold" style={{ background: COLORS[status.tone].light, color: COLORS[status.tone].ink }} data-plan-status={status.tone}>{status.text}</p>
                {(data.about?.focus?.length > 0 || data.about?.studyTime) && (
                    <p className="mt-2 text-sm font-semibold text-[#777]" data-plan-about>
                        {data.about.focus?.length > 0 && <>You want to get better at <span className="font-extrabold text-[#4b4b4b]">{data.about.focus.map((f) => f[0].toUpperCase() + f.slice(1)).join(', ')}</span>. </>}
                        {data.about.studyTime && <>You like to learn <span className="font-extrabold text-[#4b4b4b]">{data.about.studyTime === 'night' ? 'at night' : `in the ${data.about.studyTime}`}</span>.</>}
                    </p>
                )}
                {p.tier === 'main' && <p className="mt-2 text-sm font-semibold text-[#777]">Your time is short, so this roadmap has the main lessons; the extra practice (unit reviews and listening) is left out.</p>}
            </Panel>

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
