/**
 * Linguistic Ability — the sections, the Duolingo way (asked 2026-10-24):
 * every section of the course on one page — "Section 1 · Beginner · A1" — with
 * how far the student is in it, its units, and the way in: Continue, Review,
 * or (for a section not open yet) its jump test (2026-10-31, parts/JumpTest.jsx). Tapping a
 * section opens the path at it.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, Trophy, Flag, LayoutList, BookOpen } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, levelOf, hasAssessment } from './meta';
import { Bar, Loading, Mascot, Problem, Panel } from './ui';
import JumpTest from './parts/JumpTest';

const POSES = ['wave-hi', 'presenting', 'star-celebrate'];
const TONES = ['green', 'blue', 'purple'];

export default function Sections() {
    const navigate = useNavigate();
    const [path, setPath] = useState(undefined);
    const [error, setError] = useState(null);
    const load = useCallback(() => linguisticApi.path().then((p) => { setPath(p); setError(null); }).catch((e) => { setError(e); setPath(null); }), []);
    useEffect(() => { load(); }, [load]);
    if (path === undefined) return <Loading label="Opening the sections…" />;
    if (!path) return <Problem error={error} onRetry={load} />;

    return (
        <div className="space-y-4" data-sections>
            {/* The title right over the first card (2026-10-29), level with its edge. */}
            <h1 className="mb-1 text-xl font-extrabold text-[#3c3c3c] sm:text-2xl">{path.course?.name || 'English'} · Sections</h1>
            {path.levels.map((s, i) => {
                const lv = levelOf(s.level);
                const c = COLORS[s.open ? TONES[i % TONES.length] : 'grey'];
                // Topic units, or (Advanced, 2026-10-29) a track for each skill.
                const units = s.units.filter((u) => u.kind === 'topic' || u.kind === 'track');
                const here = s.level === path.level;
                const go = () => navigate(`/linguistic?section=${s.level}`);
                return (
                    <Panel key={s.level} className="overflow-hidden transition-[box-shadow,border-color] duration-200 hover:border-[#c7d2fe] hover:shadow-[0_14px_30px_rgba(31,42,68,.12)]" data-section-card={s.level} data-open={s.open}>
                        {/* Redesigned 2026-11-16 ("redesign this"): a coloured header in the section's own colour
                            (grey while locked), the facts as chips and what you will learn as topic chips. */}
                        <div className="relative overflow-hidden p-4 text-white sm:p-5" style={{ background: s.open ? `linear-gradient(135deg, ${c.face} 0%, ${c.edge} 100%)` : 'linear-gradient(135deg, #B9BEC7 0%, #8F96A3 100%)' }}>
                            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15" />
                            <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 left-1/3 h-24 w-24 rounded-full bg-white/10" />
                            <div className="relative flex items-start gap-3 sm:gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/85">
                                        Section {i + 1}
                                        {here && <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] tracking-wider" style={{ color: c.edge }}><Flag size={10} strokeWidth={3} /> You are here</span>}
                                        {!s.open && <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] tracking-wider"><Lock size={10} strokeWidth={3} /> Locked</span>}
                                        {s.complete && <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] tracking-wider"><Trophy size={10} strokeWidth={3} /> Completed</span>}
                                    </p>
                                    <h2 className="mt-0.5 text-2xl font-black leading-tight drop-shadow-sm sm:text-3xl">{lv.section}</h2>
                                    <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-extrabold">
                                        <span className="rounded-full bg-white px-2.5 py-1" style={{ color: s.open ? c.edge : '#8F96A3' }} data-cefr>{lv.cefr}</span>
                                        {/* The level word (2026-11-16: Sections 1–3 Beginner, 4–5 Advanced). */}
                                        {lv.named && <span className="rounded-full bg-white/20 px-2.5 py-1" data-level-word>{lv.label}</span>}
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1"><LayoutList size={12} /> {units.length} unit{units.length === 1 ? '' : 's'}{units.some((u) => u.kind === 'track') ? ` · ${new Set(units.map((u) => u.skillTitle || u.title)).size} skills` : ''}</span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1"><BookOpen size={12} /> {s.total} lessons</span>
                                    </p>
                                </div>
                                {/* On a white circle (2026-11-16): the picture's light bottom edge showed as a line on the colour. */}
                                <span className={`relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white shadow-lg ring-4 ring-white/40 sm:h-28 sm:w-28 ${s.open ? '' : 'opacity-70 grayscale'}`}>
                                    <Mascot pose={POSES[i % POSES.length]} className="h-16 w-16 sm:h-24 sm:w-24" />
                                </span>
                            </div>
                            <div className="relative mt-3">
                                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-white/85">You will learn</p>
                                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                                    {[...new Set(units.map((u) => u.skillTitle || u.title))].map((title) => <li key={title} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-bold ring-1 ring-white/25 sm:text-[13px]">{title}</li>)}
                                </ul>
                            </div>
                        </div>
                        <div className="space-y-4 p-4 sm:p-5">
                            {/* No progress shown for a section still shut (2026-10-28). */}
                            {s.open && (
                                <div className="flex items-center gap-3">
                                    <Bar value={s.total ? (s.completed / s.total) * 100 : 0} color={s.complete ? 'gold' : 'green'} className="h-3.5 flex-1" label={`${lv.section}: ${s.completed} of ${s.total} lessons`} />
                                    <span className="text-sm font-extrabold tabular-nums text-[#AFAFAF]">{s.completed}/{s.total}</span>
                                </div>
                            )}
                            <ol className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
                                {s.units.map((u) => {
                                    const lessons = u.lessons.filter((n) => !n.stop);
                                    const done = lessons.length && lessons.every((n) => n.status === 'completed');
                                    return (
                                        <li key={u.id} className="-mx-1.5 flex items-center gap-2 rounded-xl px-1.5 py-1 text-sm font-bold text-[#4b4b4b] transition-colors hover:bg-[#F2F5FF] sm:text-[15px]" data-section-unit={u.id}>
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: done ? COLORS.green.face : '#F2F2F2', color: done ? '#fff' : '#AFAFAF' }}>
                                                {done ? <Check size={15} strokeWidth={3.5} /> : u.kind === 'review' ? <Trophy size={14} /> : !u.open ? <Lock size={14} /> : <span className="text-xs font-black">{u.index}</span>}
                                            </span>
                                            <span className="min-w-0 truncate">{u.kind === 'review' ? 'Section review' : u.kind === 'track' ? u.title : `Unit ${u.index} · ${u.title}`}</span>
                                        </li>
                                    );
                                })}
                            </ol>
                            {s.open
                                ? <button type="button" onClick={go} className="lingo-btn h-12 w-full transition-[filter] hover:brightness-105" style={{ background: s.complete ? '#fff' : c.face, borderColor: s.complete ? '#E5E5E5' : c.edge, color: s.complete ? c.ink : '#fff' }} data-section-go>{s.complete ? 'Review' : here || s.completed ? 'Continue' : 'Start'}</button>
                                : (
                                    <div>
                                        <p className="flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#AFAFAF]" data-section-locked><Lock size={15} /> {hasAssessment(path.levels[i - 1]) ? `Finish Section ${i} and pass its assessment to open it` : `Finish Section ${i} to open it`}</p>
                                        {/* Or straight here by the jump test (2026-10-31). */}
                                        <JumpTest section={s} number={i + 1} />
                                    </div>
                                )}
                        </div>
                    </Panel>
                );
            })}
        </div>
    );
}
