/**
 * Linguistic Ability — the sections, the Duolingo way (asked 2026-10-24):
 * every section of the course on one page — "Section 1 · Rookie · A1" — with
 * how far the student is in it, its units, and the way in: Continue, Review,
 * or (for a section not open yet) Jump here by the placement test. Tapping a
 * section opens the path at it.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Lock, Trophy } from 'lucide-react';
import { linguisticApi } from './api';
import { COLORS, levelOf, hasAssessment } from './meta';
import { Bar, Loading, Mascot, Problem, Panel } from './ui';

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
                        <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: s.open ? c.ink : '#AFAFAF' }}>
                                    Section {i + 1}{here ? ' · You are here' : ''}
                                </p>
                                <h2 className="text-xl font-extrabold text-[#3c3c3c] sm:text-2xl">{lv.section}</h2>
                                <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-bold text-[#777]">
                                    <span className="rounded-lg px-2 py-0.5 text-xs font-extrabold text-white" style={{ background: s.open ? c.face : '#AFAFAF' }} data-cefr>{lv.cefr}</span>
                                    {lv.label} · {units.length} {units.some((u) => u.kind === 'track') ? `skill${units.length === 1 ? '' : 's'}` : `unit${units.length === 1 ? '' : 's'}`} · {s.total} lessons
                                </p>
                                <p className="mt-2 text-sm font-semibold text-[#4b4b4b] sm:text-[15px]">You will learn: {units.map((u) => u.title).join(' · ')}.</p>
                            </div>
                            <Mascot pose={POSES[i % POSES.length]} className={`h-14 w-14 shrink-0 sm:h-24 sm:w-24 ${s.open ? '' : 'opacity-40 grayscale'}`} />
                        </div>
                        <div className="space-y-4 border-t-2 border-[#F2F2F2] p-4 sm:p-5">
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
                                : <p className="flex items-center justify-center gap-2 text-sm font-extrabold uppercase tracking-wide text-[#AFAFAF]" data-section-locked><Lock size={15} /> {hasAssessment(path.levels[i - 1]) ? `Finish Section ${i} and pass its assessment to open it` : `Finish Section ${i} to open it`}</p>}
                        </div>
                    </Panel>
                );
            })}
        </div>
    );
}
