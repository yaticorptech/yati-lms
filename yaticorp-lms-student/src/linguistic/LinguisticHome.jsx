/**
 * Linguistic Ability — the learning path (redesigned 2026-10-22 to work like
 * Duolingo's): each level a section, and in it topic units (since 2026-10-24,
 * server units.js) — "Home and family", "At school and college"… — each a
 * coloured band with a lesson of each kind (Words, Grammar, Reading,
 * Speaking, Translation) and the unit's review, then the level's review. The
 * lessons are round buttons winding down the page, each with its kind's sign,
 * opening one after another. Done lessons show a tick (a crown at 100%), the
 * next one bobs a START bubble, locked ones are grey; a trophy ends each
 * level, holding its certificate. Tapping a lesson opens a card with what it
 * is and START. `?unit=beginner-2` (or a kind, `?unit=grammar`) opens the
 * path there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Check, Lock, Crown, Trophy, BookOpen, X, Download, Dumbbell, Star, Mic, Headphones, Gift, PackageOpen, Flag, LayoutList, Loader2, MessageSquareText, CalendarDays, PenLine } from 'lucide-react';
import { saveBlob } from '../native/saveFile';
import { linguisticApi, announceRewards } from './api';
import { COLORS, MODULES, shortDirection, blurbOf, levelOf, hasAssessment } from './meta';
import { Bar, Chunky, Loading, Mascot, Problem, Panel } from './ui';

/** How far each node sits from the middle, in turn: the path winds right, back, left, back. */
const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];
/** Each unit's place in the winding: its first lesson's number along the whole path. */
const unitStarts = (levels) => {
    const out = {};
    let n = 0;
    for (const l of levels) for (const u of l.units) { out[u.id] = n; n += u.lessons.length; }
    return out;
};
/** A topic unit's colour and mascot, in turn; a level's review in gold. */
const UNIT_LOOKS = [['green', 'wave-hi'], ['purple', 'thinking'], ['blue', 'presenting'], ['orange', 'point-right'], ['red', 'thumbs-up']];
const lookOf = (u) => (u.kind === 'review' ? ['gold', 'star-celebrate'] : UNIT_LOOKS[(u.index - 1) % UNIT_LOOKS.length]);
/*
 * Each stop's Duolingo kind (server units.js `typeOf`, 2026-10-24): a lesson
 * (star), a story (book), speaking (microphone), listening (headphones),
 * practice of one's mistakes (dumbbell), a treasure chest, the unit review
 * (trophy) and the level checkpoint (flag).
 */
const TYPES = {
    lesson: [Star, null], story: [BookOpen, 'Story'], speaking: [Mic, 'Speaking'], listening: [Headphones, 'Listening'],
    practice: [Dumbbell, 'Practice'], chest: [Gift, 'Treasure chest'], review: [Trophy, 'Review'], checkpoint: [Flag, 'Checkpoint'],
    // Speak on a topic, corrected (Advanced).
    talk: [MessageSquareText, 'Speak on a topic'],
    // An Advanced article's writing, in the Writing track (2026-10-29).
    writing: [PenLine, 'Writing']
};
/** What kind of stop it is: Vocabulary, Grammar… (a lesson), Story, Listening… */
const kindOf = (l) => TYPES[l.type]?.[1] || MODULES[l.module]?.short || 'Lesson';
const KindIcon = (l) => TYPES[l.type]?.[0] || Star;

/** The Guidebook: the unit's lessons and what each one teaches. */
function Guidebook({ unit, section, language, target, onClose }) {
    const c = COLORS[lookOf(unit)[0]];
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return createPortal(
        <div className="lingo fixed inset-0 z-[90] flex items-end justify-center bg-black/40 sm:items-center sm:p-6" onClick={onClose}>
            <div className="lingo-sheet max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lingo-guide" data-guidebook={unit.id}>
                <div className="sticky top-0 flex items-start gap-3 p-5 text-white" style={{ background: c.face }}>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-white/85">{section.label} · Guidebook</p>
                        <h2 id="lingo-guide" className="text-2xl font-extrabold">{unit.title}</h2>
                        <p className="mt-1 text-[15px] font-semibold text-white/90">{unit.kind === 'review' ? `Everything from ${section.label} again, before the trophy.` : unit.kind === 'track' ? unit.note : `${[...new Set(unit.lessons.filter((l) => !l.review && !l.stop).map((l) => kindOf(l)))].join(' · ')}, then a review.`}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/15"><X size={24} strokeWidth={3} /></button>
                </div>
                <ol className="space-y-3 p-5">
                    {unit.lessons.map((l, i) => (
                        <li key={l.id} className="rounded-2xl border-2 border-[#E5E5E5] p-4">
                            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: c.ink }}>Lesson {i + 1} · {kindOf(l)}{l.direction ? ` · ${shortDirection(l.direction, language, target)}` : ''}{l.status === 'completed' ? ` · Done${l.bestScore !== null ? `, best ${l.bestScore}%` : ''}` : ''}</p>
                            {!l.review && <p className="text-sm font-semibold text-[#AFAFAF]">{blurbOf(l.module, language, target)}</p>}
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
function LessonCard({ lesson, unit, number, offset, color, language, target, onClose, mistakes = 0, onOpened }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [said, setSaid] = useState('');
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
    // A chest opens here, for its bonus XP; practice goes to the mistakes (or, with none, the daily challenge).
    const go = () => {
        if (lesson.stop === 'chest') {
            setBusy(true); setSaid('');
            linguisticApi.openChest(unit.id).then((r) => { announceRewards(r.events); setSaid(r.xp ? `+${r.xp} XP!` : 'Opened!'); onOpened?.(); })
                .catch((e) => setSaid(e.message)).finally(() => setBusy(false));
            return;
        }
        if (lesson.stop === 'practice') { navigate(mistakes ? '/linguistic/review' : '/linguistic/daily'); return; }
        navigate(`/linguistic/${lesson.module}/${lesson.id}`);
    };
    const note = lesson.stop === 'chest' ? (done ? 'Opened. Keep going for the next one!' : 'Bonus XP for getting this far.')
        : lesson.stop === 'practice' ? (mistakes ? `${mistakes} answer${mistakes === 1 ? '' : 's'} to practise until you get them right.` : 'No mistakes to fix. Try the daily challenge instead.')
            : `${kindOf(lesson)} · lesson ${number} of ${unit.lessons.length}${lesson.direction ? ` · ${shortDirection(lesson.direction, language, target)}` : ''}${done && lesson.bestScore !== null ? ` · best ${lesson.bestScore}%` : ''}`;
    const label = lesson.stop === 'chest' ? 'Open' : lesson.stop === 'practice' ? (mistakes ? 'Practise' : 'Daily challenge') : done ? 'Practise again' : 'Start';
    return (
        <div ref={ref} className="lingo-pop relative z-20 mx-auto mt-5 w-full max-w-[320px]" data-lesson-card={lesson.id}>
            <span className="absolute -top-2 h-4 w-4 rotate-45 rounded-sm" style={{ left: `calc(50% + ${offset}px - 8px)`, background: locked ? '#F7F7F7' : c.face, border: locked ? '2px solid #E5E5E5' : 'none', borderRight: 'none', borderBottom: 'none' }} />
            <div className="rounded-2xl p-4" style={locked ? { background: '#F7F7F7', border: '2px solid #E5E5E5' } : { background: c.face }}>
                <p className={`text-[17px] font-extrabold ${locked ? 'text-[#AFAFAF]' : 'text-white'}`}>{lesson.title}</p>
                <p className={`text-[15px] font-semibold ${locked ? 'text-[#AFAFAF]' : 'text-white/90'}`}>
                    {locked ? (lesson.stop === 'chest' ? 'Finish the lessons above to open this chest.' : 'Finish the lessons above to unlock this one.') : note}
                </p>
                {!locked && !lesson.stop && lesson.summary && <p className="mt-1 text-sm font-semibold text-white/85">{lesson.summary}</p>}
                {said && <p className="mt-1 text-base font-extrabold text-white" role="status" data-chest-said>{said}</p>}
                {locked
                    ? <button type="button" disabled className="lingo-btn mt-3 h-12 w-full" style={{ background: '#E5E5E5', borderColor: '#E5E5E5', color: '#AFAFAF' }}>Locked</button>
                    : !(lesson.stop === 'chest' && done) && <button type="button" onClick={go} disabled={busy} className="lingo-btn mt-3 inline-flex h-12 w-full items-center justify-center gap-2" style={{ background: '#fff', borderColor: '#E5E5E5', color: c.ink }} data-start-lesson>{busy && <Loader2 size={16} className="animate-spin" />}{label}</button>}
            </div>
        </div>
    );
}

function Node({ lesson, color, current, offset, open, onTap }) {
    const c = COLORS[color];
    const done = lesson.status === 'completed';
    const perfect = done && lesson.bestScore === 100;
    const look = !lesson.open || (lesson.stop === 'chest' && done) ? { face: '#E5E5E5', edge: '#B7B7B7', ink: '#AFAFAF' }
        : perfect || lesson.stop === 'chest' ? { face: COLORS.gold.face, edge: COLORS.gold.edge, ink: '#fff' } : { face: c.face, edge: c.edge, ink: '#fff' };
    // Open and not done: the stop's own sign (a star for a lesson, a book for a story…), as Duolingo's path shows.
    // A chest keeps its look, shut or opened; locked stops show a lock.
    const chest = lesson.stop === 'chest';
    const Icon = chest ? (done ? PackageOpen : Gift) : !lesson.open ? Lock : perfect ? Crown : done ? Check : KindIcon(lesson);
    return (
        <div className="relative mx-auto w-[78px]" style={{ transform: `translateX(${offset}px)` }}>
            {current && !open && (
                <span className="lingo-float pointer-events-none absolute -top-12 left-1/2 z-10 whitespace-nowrap rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[15px] font-extrabold uppercase tracking-wide" style={{ color: c.ink }} data-start-bubble>
                    Start
                    <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#E5E5E5] bg-white" />
                </span>
            )}
            {current && <span className="pointer-events-none absolute -inset-2 left-1/2 w-[94px] -translate-x-1/2 rounded-[50%] border-[6px] border-[#E5E5E5]" aria-hidden="true" />}
            <button type="button" onClick={onTap} aria-expanded={open} data-node={lesson.id} data-kind={lesson.review ? 'review' : lesson.module} data-status={lesson.open ? lesson.status : 'locked'}
                aria-label={`${lesson.title}: ${!lesson.open ? 'locked' : done ? `done${lesson.bestScore !== null ? `, best ${lesson.bestScore}%` : ''}` : current ? 'start here' : 'open'}`}
                className="lingo-node relative flex h-[70px] w-[78px] items-center justify-center rounded-[50%]" style={{ background: look.face, boxShadow: `0 8px 0 ${look.edge}` }}>
                <Icon size={32} strokeWidth={3} fill={Icon === Crown ? 'currentColor' : 'none'} style={{ color: look.ink }} />
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
    // From the dashboard's "Continue where you stopped" (2026-10-26): that lesson, its START card open.
    const [tapped, setTapped] = useState(() => params.get('lesson'));
    const [guide, setGuide] = useState(null);
    const scrolled = useRef(false);

    const load = useCallback(() => linguisticApi.path().then((p) => { setPath(p); setError(null); }).catch((e) => { setError(e); setPath(null); }), []);
    useEffect(() => { load(); }, [load]);

    // Open at the lesson to take next — or at the unit asked for — once.
    const unit = params.get('unit');
    const sectionAsked = params.get('section');
    const lessonAsked = params.get('lesson');
    useEffect(() => {
        if (!path || scrolled.current) return;
        scrolled.current = true;
        const at = path.levels.find((l) => l.level === path.level) || path.levels[0];
        // From the Sections page: the section asked for, at its first lesson still to do.
        const inSection = sectionAsked && path.levels.find((l) => l.level === sectionAsked);
        const sectionNext = inSection && inSection.units.flatMap((u) => u.lessons).find((n) => n.open && n.status !== 'completed' && !n.stop);
        const target = (lessonAsked && document.querySelector(`[data-node="${lessonAsked}"]`))
            || (sectionNext && document.querySelector(`[data-node="${sectionNext.id}"]`))
            || (inSection && document.querySelector(`[data-section="${inSection.level}"]`))
            || unit && document.querySelector(`[data-unit="${unit}"]`)
            || (unit && MODULES[unit] && document.querySelector(`[data-section="${at.level}"] [data-kind="${unit}"]`))
            || (path.current && document.querySelector(`[data-node="${path.current}"]`));
        target?.scrollIntoView({ block: unit && !sectionAsked ? 'start' : 'center' });
    }, [path, unit, sectionAsked, lessonAsked]);

    if (path === undefined) return <Loading label="Drawing your path…" />;
    if (!path) return <Problem error={error} onRetry={load} />;

    const starts = unitStarts(path.levels);
    return (
        <div className="space-y-10" data-path>
            {/* The learning plan (2026-10-24): today's share of the roadmap, or making one. */}
            <Link to="/linguistic/roadmap" className="lingo-tile mb-4 flex min-h-12 items-center gap-2 px-4 text-[15px] text-[#4b4b4b]" data-roadmap-link>
                <CalendarDays size={20} style={{ color: COLORS.purple.face }} />
                {dash.plan
                    ? <><span className="flex-1">Your roadmap · Day {Math.min(dash.plan.day, dash.plan.days)} of {dash.plan.days}</span><span className="text-sm font-extrabold text-[#AFAFAF]">{(dash.plan.today?.lessons || []).filter((l) => l.status !== 'completed').length} today</span></>
                    : <span className="flex-1">How much time do you have? Make your roadmap</span>}
            </Link>
            <Link to="/linguistic/sections" className="lingo-tile mb-4 flex min-h-12 items-center gap-2 px-4 text-[15px] text-[#4b4b4b]" data-all-sections>
                <LayoutList size={20} style={{ color: COLORS.blue.face }} /> <span className="flex-1">All sections</span>
                <span className="text-sm font-extrabold text-[#AFAFAF]">{path.levels.length} sections</span>
            </Link>
            {path.levels.map((section, si) => (
                <section key={section.level} data-section={section.level} aria-labelledby={`sec-${section.level}`}>
                    <Panel className="mb-6 p-4" data-section-head>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Section {si + 1} · {levelOf(section.level).cefr} · {section.label}</p>
                                <h2 id={`sec-${section.level}`} className="text-xl font-extrabold text-[#3c3c3c]" data-section-name>{levelOf(section.level).section}{section.level === path.level && <span className="ml-2 align-middle text-xs font-extrabold uppercase tracking-wider" style={{ color: COLORS.blue.ink }}>· You are here</span>}</h2>
                            </div>
                            {/* No "Jump here?" (2026-10-28): a section opens only when the one before is finished. */}
                            {section.complete
                                ? <span className="inline-flex items-center gap-1 text-sm font-extrabold uppercase" style={{ color: COLORS.green.ink }}><Check size={18} strokeWidth={3.5} /> Completed</span>
                                : !section.open ? <span className="inline-flex items-center gap-1 text-sm font-extrabold uppercase text-[#AFAFAF]" data-section-lock><Lock size={18} strokeWidth={3} /> Locked</span> : null}
                        </div>
                        {/* The lessons done here, of the section's: not for a section still shut (2026-10-28) — it waits, whatever was done in it before. */}
                        {section.open && (
                            <div className="mt-3 flex items-center gap-3">
                                <Bar value={section.total ? (section.completed / section.total) * 100 : 0} color={section.complete ? 'gold' : 'green'} className="h-3 flex-1" label={`${section.label}: ${section.completed} of ${section.total} lessons`} />
                                <span className="text-sm font-extrabold tabular-nums text-[#AFAFAF]">{section.completed}/{section.total}</span>
                            </div>
                        )}
                        {!section.open && <p className="mt-2 text-sm font-semibold text-[#777]" data-section-locked>Finish every unit of {levelOf(path.levels[si - 1]?.level).section || levelOf(path.levels[si - 1]?.level).label}{hasAssessment(path.levels[si - 1]) ? ', then pass its assessment (50% or more),' : ''} to open these lessons.</p>}
                    </Panel>

                    {section.units.map((u, ui) => {
                        const [tone, pose] = lookOf(u);
                        const color = u.open ? tone : 'grey';
                        const c = COLORS[color];
                        const first = starts[u.id];
                        const offsets = u.lessons.map((_, i) => OFFSETS[(first + i) % OFFSETS.length]);
                        const lean = offsets.reduce((a, b) => a + b, 0);
                        const mascotLeft = lean > 0 || (lean === 0 && ui % 2 === 0);
                        return (
                            <div key={u.id} className="relative mb-10" data-unit={u.id} data-unit-kind={u.kind} data-open={u.open}>
                                {/* A unit not open yet: its banner grey, with a lock (2026-10-28: it opens when the one before is finished). */}
                                <div className="sticky top-[4.5rem] z-10 mb-10 flex items-center gap-3 rounded-2xl p-4 text-white" style={u.open ? { background: c.face, boxShadow: `0 4px 0 ${c.edge}` } : { background: '#C9CED6', boxShadow: '0 4px 0 #A9AFB8' }} data-unit-locked={u.open ? undefined : 'true'}>
                                    {!u.open && <Lock size={22} strokeWidth={2.8} className="shrink-0 text-white" aria-label="Locked" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-extrabold uppercase tracking-wider text-white/85">{u.kind === 'review' ? `Section ${si + 1} · Review` : u.kind === 'track' ? `Section ${si + 1} · Skill ${u.index} of ${section.units.length}` : `Section ${si + 1}, Unit ${u.index}`}{!u.open && ' · Locked'}</p>
                                        <h3 className="text-lg font-extrabold leading-tight sm:text-xl" data-unit-title>{u.title}</h3>
                                        {!u.open && <p className="mt-0.5 text-sm font-bold text-white/90">{ui > 0 && section.open ? `Finish ${section.units[ui - 1].title} to open it.` : `Finish ${si > 0 ? levelOf(path.levels[si - 1]?.level).section : 'the section before'} to open it.`}</p>}
                                    </div>
                                    <button type="button" onClick={() => setGuide({ unit: u, section })} className="lingo-btn inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm" style={{ background: 'transparent', borderColor: 'rgba(0,0,0,0.18)', color: '#fff' }} data-guidebook-open={u.id}>
                                        <BookOpen size={18} /> <span className="hidden sm:inline">Guidebook</span>
                                    </button>
                                </div>
                                {/* The lessons stay in a path-wide strip in the middle, the mascot beside them, on a full-width page. */}
                                <div className="relative mx-auto flex w-full max-w-[640px] flex-col items-center gap-7 pt-6">
                                    <Mascot pose={pose} className={`pointer-events-none absolute top-1/2 h-28 w-28 -translate-y-1/2 sm:h-36 sm:w-36 ${mascotLeft ? 'left-0' : 'right-0'} ${u.open ? '' : 'opacity-40 grayscale'}`} />
                                    {u.lessons.map((l, i) => (
                                        <div key={l.id} className="w-full">
                                            <Node lesson={l} color={color} offset={offsets[i]} current={l.id === path.current} open={tapped === l.id} onTap={() => setTapped((t) => (t === l.id ? null : l.id))} />
                                            {tapped === l.id && <LessonCard lesson={l} unit={u} number={i + 1} offset={offsets[i]} color={color} language={path.language?.code} target={path.course?.code || 'en'} onClose={() => setTapped(null)} mistakes={dash.mistakes || 0} onOpened={load} />}
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
