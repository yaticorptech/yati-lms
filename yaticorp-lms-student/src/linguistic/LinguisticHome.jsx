/**
 * Linguistic Ability — the learning path (redesigned 2026-10-22 to work like
 * Duolingo's): each level a section, each module a coloured unit, and its
 * lessons round buttons winding down the page. Done lessons show a tick
 * (a crown at 100%), the next one bobs a START bubble, locked ones are grey;
 * a trophy ends each level, holding its certificate. Tapping a lesson opens a
 * card with what it is and START. `?unit=grammar` opens the path at that unit.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Star, Check, Lock, Crown, Trophy, BookOpen, X, Download } from 'lucide-react';
import { saveBlob } from '../native/saveFile';
import { linguisticApi } from './api';
import { COLORS, MODULES, MODULE_ORDER, shortDirection, blurbOf, levelOf } from './meta';
import { Bar, Chunky, Loading, Mascot, Problem, Panel } from './ui';
import { LevelCard } from './Rail';

/** How far each node sits from the middle, in turn: the path winds right, back, left, back. */
const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];
/** Each unit's place in the winding: its first lesson's number along the whole path. */
const unitStarts = (levels) => {
    const out = {};
    let n = 0;
    for (const l of levels) for (const u of l.units) { out[`${l.level}:${u.module}`] = n; n += u.lessons.length; }
    return out;
};

/** The Guidebook: the unit's lessons and what each one teaches. */
function Guidebook({ unit, section, language, target, onClose }) {
    const meta = MODULES[unit.module];
    const c = COLORS[meta.color];
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return createPortal(
        <div className="lingo fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
            <div className="lingo-sheet max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lingo-guide" data-guidebook={unit.module}>
                <div className="sticky top-0 flex items-start gap-3 p-5 text-white" style={{ background: c.face }}>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-white/85">{section.label} · Guidebook</p>
                        <h2 id="lingo-guide" className="text-2xl font-extrabold">{meta.label}</h2>
                        <p className="mt-1 text-[15px] font-semibold text-white/90">{blurbOf(unit.module, language, target)}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/15"><X size={24} strokeWidth={3} /></button>
                </div>
                <ol className="space-y-3 p-5">
                    {unit.lessons.map((l, i) => (
                        <li key={l.id} className="rounded-2xl border-2 border-[#E5E5E5] p-4">
                            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: c.ink }}>Lesson {i + 1}{l.direction ? ` · ${shortDirection(l.direction, language, target)}` : ''}{l.status === 'completed' ? ` · Done${l.bestScore !== null ? `, best ${l.bestScore}%` : ''}` : ''}</p>
                            <p className="text-[17px] font-extrabold text-[#3c3c3c]">{l.title}</p>
                            {l.summary && <p className="mt-0.5 text-[15px] font-semibold text-[#777]">{l.summary}</p>}
                        </li>
                    ))}
                </ol>
            </div>
        </div>,
        document.body
    );
}

/** The card under a tapped lesson: what it is, and START (or why it is shut). */
function LessonCard({ lesson, unit, number, offset, color, language, target, onClose }) {
    const navigate = useNavigate();
    const c = COLORS[color];
    const ref = useRef(null);
    useEffect(() => {
        const away = (e) => { if (!ref.current?.contains(e.target) && !e.target.closest?.('[data-node]')) onClose(); };
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('pointerdown', away);
        window.addEventListener('keydown', esc);
        ref.current?.querySelector('button')?.focus({ preventScroll: true });
        return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc); };
    }, [onClose]);
    const locked = !lesson.open;
    const done = lesson.status === 'completed';
    const go = () => navigate(`/linguistic/${unit.module}/${lesson.id}`);
    return (
        <div ref={ref} className="lingo-pop relative z-20 mx-auto mt-5 w-full max-w-[320px]" data-lesson-card={lesson.id}>
            <span className="absolute -top-2 h-4 w-4 rotate-45 rounded-sm" style={{ left: `calc(50% + ${offset}px - 8px)`, background: locked ? '#F7F7F7' : c.face, border: locked ? '2px solid #E5E5E5' : 'none', borderRight: 'none', borderBottom: 'none' }} />
            <div className="rounded-2xl p-4" style={locked ? { background: '#F7F7F7', border: '2px solid #E5E5E5' } : { background: c.face }}>
                <p className={`text-[17px] font-extrabold ${locked ? 'text-[#AFAFAF]' : 'text-white'}`}>{lesson.title}</p>
                <p className={`text-[15px] font-semibold ${locked ? 'text-[#AFAFAF]' : 'text-white/90'}`}>
                    {locked ? 'Finish the lessons above to unlock this one.' : `Lesson ${number} of ${unit.lessons.length}${lesson.direction ? ` · ${shortDirection(lesson.direction, language, target)}` : ''}${done && lesson.bestScore !== null ? ` · best ${lesson.bestScore}%` : ''}`}
                </p>
                {!locked && lesson.summary && <p className="mt-1 text-sm font-semibold text-white/85">{lesson.summary}</p>}
                {locked
                    ? <button type="button" disabled className="lingo-btn mt-3 h-12 w-full" style={{ background: '#E5E5E5', borderColor: '#E5E5E5', color: '#AFAFAF' }}>Locked</button>
                    : <button type="button" onClick={go} className="lingo-btn mt-3 h-12 w-full" style={{ background: '#fff', borderColor: '#E5E5E5', color: c.ink }} data-start-lesson>{done ? 'Practise again' : 'Start'}</button>}
            </div>
        </div>
    );
}

function Node({ lesson, color, current, offset, open, onTap }) {
    const c = COLORS[color];
    const done = lesson.status === 'completed';
    const perfect = done && lesson.bestScore === 100;
    const look = !lesson.open ? { face: '#E5E5E5', edge: '#B7B7B7', ink: '#AFAFAF' } : perfect ? { face: COLORS.gold.face, edge: COLORS.gold.edge, ink: '#fff' } : { face: c.face, edge: c.edge, ink: '#fff' };
    const Icon = !lesson.open ? Lock : perfect ? Crown : done ? Check : Star;
    return (
        <div className="relative mx-auto w-[78px]" style={{ transform: `translateX(${offset}px)` }}>
            {current && !open && (
                <span className="lingo-float pointer-events-none absolute -top-12 left-1/2 z-10 whitespace-nowrap rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[15px] font-extrabold uppercase tracking-wide" style={{ color: c.ink }} data-start-bubble>
                    Start
                    <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#E5E5E5] bg-white" />
                </span>
            )}
            {current && <span className="pointer-events-none absolute -inset-2 left-1/2 w-[94px] -translate-x-1/2 rounded-[50%] border-[6px] border-[#E5E5E5]" aria-hidden="true" />}
            <button type="button" onClick={onTap} aria-expanded={open} data-node={lesson.id} data-status={lesson.open ? lesson.status : 'locked'}
                aria-label={`${lesson.title}: ${!lesson.open ? 'locked' : done ? `done${lesson.bestScore !== null ? `, best ${lesson.bestScore}%` : ''}` : current ? 'start here' : 'open'}`}
                className="lingo-node relative flex h-[70px] w-[78px] items-center justify-center rounded-[50%]" style={{ background: look.face, boxShadow: `0 8px 0 ${look.edge}` }}>
                <Icon size={32} strokeWidth={3} fill={Icon === Star || Icon === Crown ? 'currentColor' : 'none'} style={{ color: look.ink }} />
            </button>
        </div>
    );
}

/** The trophy at the end of a level: its certificate. */
function TrophyNode({ section, certificateMinAverage, courseName = 'English' }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const got = !!section.certificate;
    const look = got ? COLORS.gold : section.complete ? { face: '#D7D7D7', edge: '#A0A0A0' } : { face: '#E5E5E5', edge: '#B7B7B7' };
    const download = () => {
        setBusy(true); setError('');
        linguisticApi.certificatePdf(section.level).then((blob) => saveBlob(blob, `${courseName}_${section.label}_Certificate.pdf`, { title: 'Certificate' })).catch((e) => setError(e.message)).finally(() => setBusy(false));
    };
    return (
        <div className="flex flex-col items-center pt-4" data-trophy={section.level} data-earned={got}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${section.label} certificate: ${got ? 'earned' : 'not yet earned'}`}
                className="lingo-node flex h-[86px] w-[94px] items-center justify-center rounded-[50%]" style={{ background: look.face, boxShadow: `0 8px 0 ${look.edge}` }}>
                <Trophy size={40} strokeWidth={2.5} className={got ? 'text-white' : 'text-[#AFAFAF]'} fill={got ? 'currentColor' : 'none'} />
            </button>
            {open && (
                <div className="lingo-pop mt-5 w-full max-w-[320px] rounded-2xl border-2 border-[#E5E5E5] bg-white p-4 text-center">
                    <p className="text-[17px] font-extrabold text-[#3c3c3c]">{section.label} certificate</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#777]">
                        {got ? `Earned · ${section.certificate.number}` : section.complete ? `All lessons done. Retake quizzes to lift your average to ${certificateMinAverage}% and earn it.` : `Finish every ${section.label} lesson with an average of ${certificateMinAverage}% or more.`}
                    </p>
                    {got && <Chunky color="gold" onClick={download} disabled={busy} className="mt-3 w-full" data-certificate={section.level}><Download size={17} /> {busy ? 'Preparing…' : 'Download'}</Chunky>}
                    {error && <p className="mt-2 text-sm font-bold" style={{ color: COLORS.red.ink }}>{error}</p>}
                </div>
            )}
        </div>
    );
}

export default function LinguisticHome() {
    const { dash } = useOutletContext();
    const [params] = useSearchParams();
    const [path, setPath] = useState(undefined);
    const [error, setError] = useState(null);
    const [tapped, setTapped] = useState(null);
    const [guide, setGuide] = useState(null);
    const scrolled = useRef(false);

    const load = useCallback(() => linguisticApi.path().then((p) => { setPath(p); setError(null); }).catch((e) => { setError(e); setPath(null); }), []);
    useEffect(() => { load(); }, [load]);

    // Open at the lesson to take next — or at the unit asked for — once.
    const unit = params.get('unit');
    useEffect(() => {
        if (!path || scrolled.current) return;
        scrolled.current = true;
        const at = path.levels.find((l) => l.level === path.level) || path.levels[0];
        const target = unit && MODULES[unit] ? document.querySelector(`[data-section="${at.level}"] [data-unit="${unit}"]`) : path.current && document.querySelector(`[data-node="${path.current}"]`);
        target?.scrollIntoView({ block: unit ? 'start' : 'center' });
    }, [path, unit]);

    if (path === undefined) return <Loading label="Drawing your path…" />;
    if (!path) return <Problem error={error} onRetry={load} />;

    const starts = unitStarts(path.levels);
    return (
        <div className="space-y-10" data-path>
            {!dash.placement && <div className="xl:hidden"><LevelCard dash={dash} /></div>}
            {path.levels.map((section, si) => (
                <section key={section.level} data-section={section.level} aria-labelledby={`sec-${section.level}`}>
                    <Panel className="mb-6 p-4" data-section-head>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Section {si + 1}</p>
                                <h2 id={`sec-${section.level}`} className="text-xl font-extrabold text-[#3c3c3c]">{section.label}{section.level === path.level && <span className="ml-2 align-middle text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>· You are here</span>}</h2>
                            </div>
                            {!section.open
                                ? <Link to="/linguistic/placement" className="lingo-btn inline-flex h-11 items-center px-4 text-sm" style={{ background: COLORS.blue.face, borderColor: COLORS.blue.edge, color: '#fff' }} data-jump={section.level}>Jump here?</Link>
                                : section.complete ? <span className="inline-flex items-center gap-1 text-sm font-extrabold uppercase" style={{ color: COLORS.green.ink }}><Check size={18} strokeWidth={3.5} /> Completed</span> : null}
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                            <Bar value={section.total ? (section.completed / section.total) * 100 : 0} color={section.complete ? 'gold' : 'green'} className="h-3 flex-1" label={`${section.label}: ${section.completed} of ${section.total} lessons`} />
                            <span className="text-sm font-extrabold tabular-nums text-[#AFAFAF]">{section.completed}/{section.total}</span>
                        </div>
                        {!section.open && <p className="mt-2 text-sm font-semibold text-[#777]">Finish {levelOf(path.levels[si - 1]?.level).label} — or take the placement test — to open these lessons.</p>}
                    </Panel>

                    {section.units.map((u, ui) => {
                        const meta = MODULES[u.module];
                        const color = u.open ? meta.color : 'grey';
                        const c = COLORS[color];
                        const first = starts[`${section.level}:${u.module}`];
                        const offsets = u.lessons.map((_, i) => OFFSETS[(first + i) % OFFSETS.length]);
                        const lean = offsets.reduce((a, b) => a + b, 0);
                        const mascotLeft = lean > 0 || (lean === 0 && ui % 2 === 0);
                        return (
                            <div key={u.module} className="relative mb-10" data-unit={u.module} data-open={u.open}>
                                <div className="sticky top-[4.5rem] z-10 mb-10 flex items-center gap-3 rounded-2xl p-4 text-white" style={{ background: c.face, boxShadow: `0 4px 0 ${c.edge}` }}>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-extrabold uppercase tracking-wider text-white/85">Section {si + 1}, Unit {path.course && path.course.code !== 'en' ? ui + 1 : MODULE_ORDER.indexOf(u.module) + 1}</p>
                                        <h3 className="text-lg font-extrabold leading-tight sm:text-xl">{meta.label}</h3>
                                    </div>
                                    <button type="button" onClick={() => setGuide({ unit: u, section })} className="lingo-btn inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm" style={{ background: 'transparent', borderColor: 'rgba(0,0,0,0.18)', color: '#fff' }} data-guidebook-open={u.module}>
                                        <BookOpen size={18} /> <span className="hidden sm:inline">Guidebook</span>
                                    </button>
                                </div>
                                <div className="relative flex flex-col items-center gap-7 pt-6">
                                    <Mascot pose={meta.mascot} className={`pointer-events-none absolute top-1/2 h-28 w-28 -translate-y-1/2 sm:h-36 sm:w-36 ${mascotLeft ? 'left-0' : 'right-0'} ${u.open ? '' : 'opacity-40 grayscale'}`} />
                                    {u.lessons.map((l, i) => (
                                        <div key={l.id} className="w-full">
                                            <Node lesson={l} color={color} offset={offsets[i]} current={l.id === path.current} open={tapped === l.id} onTap={() => setTapped((t) => (t === l.id ? null : l.id))} />
                                            {tapped === l.id && <LessonCard lesson={l} unit={u} number={i + 1} offset={offsets[i]} color={u.open ? meta.color : 'grey'} language={path.language?.code} target={path.course?.code || 'en'} onClose={() => setTapped(null)} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    <TrophyNode section={section} certificateMinAverage={path.certificateMinAverage} courseName={path.course?.name} />
                </section>
            ))}
            {guide && <Guidebook unit={guide.unit} section={guide.section} language={path.language?.code} target={path.course?.code || 'en'} onClose={() => setGuide(null)} />}
        </div>
    );
}
