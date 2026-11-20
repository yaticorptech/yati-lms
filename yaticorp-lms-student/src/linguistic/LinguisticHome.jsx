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
import { Check, Lock, Crown, Trophy, BookOpen, X, Download, Dumbbell, Star, Mic, Headphones, Gift, PackageOpen, Flag, LayoutList, Loader2, MessageSquareText, CalendarDays, PenLine, LayoutGrid, BookImage, NotebookText } from 'lucide-react';
import { ensureDriveLinked, downloadWithDrive } from '../integrations/google/driveGate';
const CERT_DRIVE_REASON = 'So the certificates you earn here are kept in your own Google Drive.';
import { linguisticApi, announceRewards } from './api';
import { COLORS, MODULES, shortDirection, blurbOf, levelOf, hasAssessment, lastLesson, sectionsText } from './meta';
import { Bar, Chunky, Loading, Mascot, Problem, Panel } from './ui';
import JumpTest from './parts/JumpTest';
import ChestArt from './parts/ChestArt';
import JumpUnit from './parts/JumpUnit';

// The "Up next … Jump here?" card above a shut unit (2026-11-16): taken off the path (2026-11-17, the user: "remove this,
// keep it the same as before"). True brings it back.
const UNIT_JUMP_CARD = false;

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
// By the unit's place on the path (`look`, from the server since the Letters unit stopped being numbered, 2026-11-12), so
// every unit keeps its colour; never past the list (the Letters unit's number is 0).
const lookOf = (u) => (u.kind === 'review' ? ['gold', 'star-celebrate'] : UNIT_LOOKS[Math.max(0, (u.look ?? u.index) - 1) % UNIT_LOOKS.length]);
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
    writing: [PenLine, 'Writing'],
    // Every letter on one page, the Letters unit's first stop (2026-10-31).
    chart: [LayoutGrid, 'Letters chart'],
    // A story in comic panels, with questions on it (Advanced's Stories track, 2026-10-31).
    comic: [BookImage, 'Picture story']
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
        // A popup in the middle of the screen on a phone too (2026-11-12, "make this popup in middle"; 2026-11-13, the user's
        // picture: "give the popup in mobile view" — it was a sheet at the foot, cut off by the screen's edge): rounded all
        // round, a gap around it, scrolling inside.
        <div className="lingo fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4 sm:p-6" onClick={onClose}>
            <div className="lingo-pop max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lingo-guide" data-guidebook={unit.id}>
                <div className="sticky top-0 flex items-start gap-3 p-5 text-white" style={{ background: c.face }}>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-white/85">{levelOf(section.level).label} · Guidebook</p>
                        <h2 id="lingo-guide" className="text-2xl font-extrabold">{unit.title}</h2>
                        <p className="mt-1 text-[15px] font-semibold text-white/90">{unit.kind === 'review' ? `Everything from ${section.label} again, before the trophy.` : unit.kind === 'track' ? unit.note : `${[...new Set(unit.lessons.filter((l) => !l.review && !l.stop).map((l) => kindOf(l)))].join(' · ')}, then a review.`}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/15"><X size={24} strokeWidth={3} /></button>
                </div>
                <ol className="space-y-3 p-5">
                    {unit.lessons.map((l, i) => (
                        <li key={l.id} className="rounded-2xl border-2 border-[#E5E5E5] p-4">
                            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: c.ink }}>Lesson {i + 1} · {kindOf(l)}{l.direction ? ` · ${shortDirection(l.direction, language, target)}` : ''}{l.status === 'completed' ? ` · Done${l.bestScore !== null ? `, best ${l.bestScore}%` : ''}` : ''}</p>
                            {/* Not on a stop (the treasure chest, practice): theirs is not a translation lesson's (2026-11-13). */}
                            {(!l.review || l.review === 'more') && !l.stop && <p className="text-sm font-semibold text-[#AFAFAF]">{blurbOf(l.module, language, target)}</p>}
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
function LessonCard({ lesson, unit, number, offset, color, language, target, onClose, mistakes = 0, onOpened, shutSection = null, sectionNumber = 0 }) {
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
        if (lesson.stop === 'chart') { navigate('/linguistic/letters'); return; }
        navigate(`/linguistic/${lesson.module}/${lesson.id}`);
    };
    const note = lesson.stop === 'chest' ? (done ? 'Opened. Keep going for the next one!' : 'Bonus XP for getting this far.')
        : lesson.stop === 'practice' ? (mistakes ? `${mistakes} answer${mistakes === 1 ? '' : 's'} to practise until you get them right.` : 'No mistakes to fix. Try the daily challenge instead.')
        : lesson.stop === 'chart' ? lesson.summary
            : `${kindOf(lesson)} · lesson ${number} of ${unit.lessons.filter((l) => !l.stop).length}${lesson.direction ? ` · ${shortDirection(lesson.direction, language, target)}` : ''}${done && lesson.bestScore !== null ? ` · best ${lesson.bestScore}%` : ''}`;
    const label = lesson.stop === 'chest' ? 'Open' : lesson.stop === 'practice' ? (mistakes ? 'Practise' : 'Daily challenge') : lesson.stop === 'chart' ? 'See all letters' : done ? 'Practise again' : 'Start';
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
                    // A lesson of a section not open yet (Advanced): its jump test, to go straight there (2026-10-31).
                    ? (shutSection?.jump && shutSection.jump.status !== 'passed'
                        ? <JumpTest section={shutSection} number={sectionNumber} />
                        : <button type="button" disabled className="lingo-btn mt-3 h-12 w-full" style={{ background: '#E5E5E5', borderColor: '#E5E5E5', color: '#AFAFAF' }}>Locked</button>)
                    : !(lesson.stop === 'chest' && done) && <button type="button" onClick={go} disabled={busy} className="lingo-btn mt-3 inline-flex h-12 w-full items-center justify-center gap-2" style={{ background: '#fff', borderColor: '#E5E5E5', color: c.ink }} data-start-lesson>{busy && <Loader2 size={16} className="animate-spin" />}{label}</button>}
            </div>
        </div>
    );
}

function Node({ lesson, color, current, offset, open, onTap }) {
    const c = COLORS[color];
    const done = lesson.status === 'completed';
    const perfect = done && lesson.bestScore === 100;
    // The letters chart (2026-11-12, "highlight the all letters section"): gold with a glow ring, so it does not pass for the
    // first lesson (its "All letters" tag removed the same day, "remove this written").
    const chart = lesson.stop === 'chart';
    const look = !lesson.open || (lesson.stop === 'chest' && done) ? { face: '#E5E5E5', edge: '#B7B7B7', ink: '#AFAFAF' }
        : perfect || lesson.stop === 'chest' || chart ?{ face: COLORS.gold.face, edge: COLORS.gold.edge, ink: '#fff' } : { face: c.face, edge: c.edge, ink: '#fff' };
    // Open and not done: the stop's own sign (a star for a lesson, a book for a story…), as Duolingo's path shows.
    // A chest keeps its look, shut or opened; locked stops show a lock.
    const chest = lesson.stop === 'chest';
    // A lesson not reached yet shows its own sign in grey (2026-11-16, the user's picture: grey stars, a grey trophy), not a lock.
    const Icon = chest ? (done ? PackageOpen : Gift) : !lesson.open ? KindIcon(lesson) : perfect ? Crown : done ? Check : KindIcon(lesson);
    return (
        <div className="relative mx-auto w-[78px]" style={{ transform: `translateX(${offset}px)` }}>
            {current && !open && (
                <span className="lingo-float pointer-events-none absolute -top-12 left-1/2 z-10 whitespace-nowrap rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[15px] font-extrabold uppercase tracking-wide" style={{ color: c.ink }} data-start-bubble>
                    Start
                    <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#E5E5E5] bg-white" />
                </span>
            )}
            {current && !chest && <span className="pointer-events-none absolute -inset-2 left-1/2 w-[94px] -translate-x-1/2 rounded-[50%] border-[6px] border-[#E5E5E5]" aria-hidden="true" />}
            {/* The treasure chest drawn as a chest (2026-11-14, the user's picture), not a round button. */}
            {chest ? (
                <button type="button" onClick={onTap} aria-expanded={open} data-node={lesson.id} data-kind="chest" data-status={lesson.open ? lesson.status : 'locked'}
                    aria-label={`${lesson.title}: ${!lesson.open ? 'locked' : done ? 'opened' : 'open it'}`}
                    className="lingo-node relative -ml-[11px] flex h-[92px] w-[100px] items-center justify-center bg-transparent">
                    <ChestArt opened={done} locked={!lesson.open} className="h-[92px] w-[100px]" />
                </button>
            ) : (
            <button type="button" onClick={onTap} aria-expanded={open} data-node={lesson.id} data-kind={lesson.review ? 'review' : lesson.module} data-status={lesson.open ? lesson.status : 'locked'}
                aria-label={`${lesson.title}: ${!lesson.open ? 'locked' : done ? `done${lesson.bestScore !== null ? `, best ${lesson.bestScore}%` : ''}` : current ? 'start here' : 'open'}`}
                className="lingo-node relative flex h-[70px] w-[78px] items-center justify-center rounded-[50%]" style={{ background: look.face, boxShadow: chart ? `0 8px 0 ${look.edge}, 0 0 0 7px ${COLORS.gold.light}` : `0 8px 0 ${look.edge}` }}>
                <Icon size={32} strokeWidth={3} fill={Icon === Crown ? 'currentColor' : 'none'} style={{ color: look.ink }} />
            </button>
            )}
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
    const download = async () => {
        if (!(await ensureDriveLinked(CERT_DRIVE_REASON))) return;
        setBusy(true); setError('');
        linguisticApi.certificatePdf(section.level).then((blob) => downloadWithDrive(blob, `${courseName}_${section.label}_Certificate.pdf`, { title: 'Certificate', reason: CERT_DRIVE_REASON })).catch((e) => setError(e.message)).finally(() => setBusy(false));
    };
    return (
        <div className="flex flex-col items-center pt-4" data-trophy={section.level} data-earned={got}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${section.label} certificate: ${got ? 'earned' : 'not yet earned'}`}
                className="lingo-node relative flex h-[86px] w-[94px] items-center justify-center rounded-[50%]" style={{ background: look.face, boxShadow: `0 8px 0 ${look.edge}` }}>
                {/* A small certificate on the circle's head (2026-11-14, the user: "give a small certificate icon there"): the
                    section's certificate — in colour once earned, grey until then. */}
                <svg viewBox="0 0 40 30" className="pointer-events-none absolute -top-5 left-1/2 h-[30px] w-[40px] -translate-x-1/2 drop-shadow-sm" style={got ? undefined : { filter: 'grayscale(1)', opacity: 0.7 }} aria-hidden="true" data-trophy-certificate>
                    <rect x="2" y="2" width="34" height="23" rx="3" fill="#FFF8E1" stroke="#E0A92E" strokeWidth="2" />
                    <rect x="7" y="7" width="18" height="2.4" rx="1.2" fill="#C9A15A" />
                    <rect x="7" y="11.5" width="14" height="2.4" rx="1.2" fill="#D9BC86" />
                    <rect x="7" y="16" width="10" height="2.4" rx="1.2" fill="#D9BC86" />
                    <path d="M27 19 L25 28 L28.5 26 L31 29 L31.5 19 Z" fill="#E5484D" />
                    <path d="M31 19 L34 27.5 L31 26.5 L29.5 29 L28.5 19 Z" fill="#C93B40" />
                    <circle cx="30" cy="18" r="5.2" fill="#F6C13A" stroke="#D99A1C" strokeWidth="1.4" />
                    <circle cx="30" cy="18" r="2.2" fill="#fff" opacity="0.85" />
                </svg>
                <Trophy size={40} strokeWidth={2.5} className={got ? 'text-white' : 'text-[#AFAFAF]'} fill={got ? 'currentColor' : 'none'} />
            </button>
            {open && (
                <div className="lingo-pop mt-5 w-full max-w-[320px] rounded-2xl border-2 border-[#E5E5E5] bg-white p-4 text-center">
                    <p className="text-[17px] font-extrabold text-[#3c3c3c]">{section.label} certificate</p>
                    <p className="mt-1 text-[15px] font-semibold text-[#777]">
                        {got ? `Earned · ${section.certificate.number}` : section.complete ? `All lessons done. Retake quizzes to lift your average to ${certificateMinAverage}% and earn it.` : `Finish every lesson of ${sectionsText(section.sections)} with an average of ${certificateMinAverage}% or more.`}
                    </p>
                    {got && <Chunky color="gold" onClick={download} disabled={busy} className="mt-3 w-full" data-certificate={section.level}><Download size={17} /> {busy ? 'Preparing…' : 'Download'}</Chunky>}
                    {error && <p className="mt-2 text-sm font-bold" style={{ color: COLORS.red.ink }}>{error}</p>}
                </div>
            )}
        </div>
    );
}

/**
 * One of the three shortcuts at the top of the path. Below xl an icon tile (`badge`: lessons left today, on the icon);
 * from xl the card as it was before 2026-11-12 (icon beside the full name, `wideSub` under it).
 */
function Shortcut({ to, icon: Icon, tone, title, label, sub, wideSub, badge = 0, ...rest }) {
    const c = COLORS[tone];
    // A coloured tile, white icon in a glass circle (phones 2026-11-16; desktop too since 2026-11-16, "make changes in
    // desktop also"): stacked on a phone, icon beside the words from xl with the longer line (`wideSub`).
    return (
        <Link to={to} aria-label={`${label}: ${sub}${badge ? `, ${badge} today` : ''}`} style={{ '--tile': c.face, '--tile-edge': c.edge }}
            className="lingo-tile lingo-tile-tone relative flex h-full min-h-[7rem] flex-col items-center justify-center gap-1.5 overflow-hidden px-1.5 py-3 text-center text-white xl:min-h-[6rem] xl:flex-row xl:justify-start xl:gap-4 xl:px-5 xl:py-4 xl:text-left" {...rest}>
            <span aria-hidden="true" className="pointer-events-none absolute -right-5 -top-5 h-16 w-16 rounded-full bg-white/15 xl:-right-6 xl:-top-8 xl:h-24 xl:w-24" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-6 -left-4 h-14 w-14 rounded-full bg-black/5" />
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/25 ring-2 ring-white/40 xl:h-14 xl:w-14">
                <Icon size={23} strokeWidth={2.6} className="text-white drop-shadow-sm" />
                {badge > 0 && <span className="absolute -top-1.5 -right-2 grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-black shadow" style={{ color: COLORS.red.edge }} aria-hidden="true">{badge}</span>}
            </span>
            <span className="relative flex min-w-0 flex-col items-center gap-1.5 xl:items-start xl:gap-1">
                <span className="text-[15px] font-black leading-tight drop-shadow-sm xl:text-lg"><span className="xl:hidden">{title}</span><span className="hidden xl:inline">{label}</span></span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10.5px] font-extrabold leading-tight text-white/95 xl:text-xs"><span className="xl:hidden">{sub}</span><span className="hidden xl:inline">{wideSub}</span></span>
            </span>
        </Link>
    );
}

/** A section's header: its name, where you are, and its lessons done; `small` as the card at the top. */
function SectionHead({ section, si, path, small = false }) {
    if (small) return <SectionHero section={section} si={si} path={path} />;
    // In the path (2026-11-16, "make this card better"): the same bright card, then the jump test.
    return (
        <div className="mb-6 space-y-3">
            <SectionHero section={section} si={si} path={path} full />
            <JumpTest section={section} number={si + 1} />
        </div>
    );
}

const TOP_TONE = { face: '#6D7BFF', edge: '#4F46E5' };
const LOCKED_TONE = { face: '#B9BEC7', edge: '#8F96A3' };
const SECTION_TONES = ['green', 'purple', 'blue'];

/** Phones: the section you are in as a bright hero card (2026-11-16, "redesign it, attractive"). */
function SectionHero({ section, si, path, full = false }) {
    // Its part's progress, not the section's alone (2026-11-19, the user: "Beginner is not completed till Section 3's end"):
    // Beginner is Sections 1–3, Advanced 4–10 — "Completed" and the trophy only once every section of the part is.
    const word = levelOf(section.level).label;
    const part = path.levels.filter((l) => levelOf(l.level).label === word && l.total > 0);
    const numbers = part.map((l) => path.levels.indexOf(l) + 1);
    const completed = part.reduce((n, l) => n + l.completed, 0), total = part.reduce((n, l) => n + l.total, 0);
    const complete = part.length > 0 && part.every((l) => l.complete);
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const here = section.level === path.level;
    // Each section its own colour; gold once its part is finished, grey while locked.
    // The top card on phones is indigo (2026-11-16, "different colour"), so it stands apart from the green unit banner below it.
    const tone = complete ? COLORS.gold : !section.open ? LOCKED_TONE : !full ? TOP_TONE : COLORS[SECTION_TONES[si % SECTION_TONES.length]];
    const before = path.levels[si - 1];
    const Name = full ? 'h2' : 'p';
    return (
        <div className={`relative overflow-hidden rounded-3xl px-5 py-4 text-white shadow-lg xl:px-7 xl:py-5`} {...(full ? { 'data-section-head': true } : {})} style={{ background: `linear-gradient(135deg, ${tone.face} 0%, ${tone.edge} 100%)`, boxShadow: `0 4px 0 ${tone.edge}, 0 12px 24px -10px ${tone.edge}` }}>
            <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-white/10" />
            <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl ring-2 ring-white/30">
                {complete ? <Trophy size={24} strokeWidth={2.5} /> : !section.open ? <Lock size={22} strokeWidth={2.5} /> : <Crown size={24} strokeWidth={2.5} />}
            </span>
            <p className="relative text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-white/85">Section {si + 1} · {levelOf(section.level).cefr}</p>
            {/* The level first, highlighted, in front of the section's name (2026-11-18, as on the Sections page). */}
            <Name {...(full ? { id: `sec-${section.level}`, 'data-section-name': true } : {})} className="relative mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pr-14 text-2xl font-black leading-tight">
                {levelOf(section.level).named && <span className="rounded-xl bg-white px-2.5 py-0.5 text-lg uppercase tracking-wide shadow-sm" style={{ color: section.open ? tone.edge : '#8F96A3' }} data-level-word>{levelOf(section.level).label}</span>}
                <span className="drop-shadow-sm">{levelOf(section.level).section}</span>
            </Name>
            {here && (
                <span className="relative mt-1.5 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-wider" style={{ color: tone.edge }}>
                    <Flag size={11} strokeWidth={3} /> You are here
                </span>
            )}
            {section.open ? (
                <div className="relative mt-3">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-black/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${word}: ${completed} of ${total} lessons`} data-part-progress={`${completed}/${total}`}>
                        <div className="h-full rounded-full bg-white transition-all" style={{ width: `${Math.max(pct, completed ? 4 : 0)}%` }} />
                    </div>
                    <p className="mt-1.5 flex items-center justify-between text-xs font-extrabold text-white/90">
                        <span>{completed} of {total} {word} lessons{numbers.length > 1 ? ` · Sections ${numbers[0]}–${numbers[numbers.length - 1]}` : ''}</span>
                        <span className="tabular-nums" data-part-complete={complete}>{complete ? 'Completed' : `${pct}%`}</span>
                    </p>
                </div>
            ) : (
                <p className="relative mt-2 pr-14 text-xs font-bold text-white/95" {...(full ? { 'data-section-locked': true } : {})}>
                    {before ? <>Finish every unit of {levelOf(before.level).section}{hasAssessment(before) ? ', then pass its assessment (50% or more),' : ''} to open these lessons.</> : 'Locked for now.'}
                </p>
            )}
        </div>
    );
}

/**
 * Where the path opens after a lesson (`id`, 2026-11-05: "where the user is: the unit finished, the next; else stay on
 * it"): its unit's next lesson to do; that unit finished, the next unit's first lesson to do; the lesson itself if
 * none is left. Null for a lesson not on this path.
 */
/*
 * Where the student goes on from a lesson (2026-11-07, the user: "after one lesson of a unit, End session goes straight to
 * that unit's next one — not to another unit or another lesson"; chose: the next lesson, its START showing): left
 * half-way or not passed, that lesson, to finish; done, the next one after it on the path still to do and open — its
 * unit's next, not the first lesson left anywhere in the unit (one who can open every lesson may have skipped one
 * before it); the unit done, the next unit's. The same rule as the result's "Next up" (server service.js nextOnPath), so
 * the two never name different lessons (2026-11-07, the user: "Next up said The Kind Shopkeeper, the path another").
 */
const placeAfter = (path, id) => {
    if (!id) return null;
    const all = path.levels.flatMap((s) => s.units.flatMap((u) => u.lessons)).filter((l) => !l.stop);
    const i = all.findIndex((l) => l.id === id);
    if (i === -1) return null;
    if (all[i].status !== 'completed') return id;
    return all.slice(i + 1).find((l) => l.open && l.status !== 'completed')?.id || id;
};
/** Back from a lesson: the one its result named "Next up" (`next`), where it is on this path; else by the same rule. */
const onward = (path, from, next) => (next && path.levels.some((s) => s.units.some((u) => u.lessons.some((l) => l.id === next))) ? next : placeAfter(path, from));

export default function LinguisticHome() {
    const { dash } = useOutletContext();
    const [params] = useSearchParams();
    const [path, setPath] = useState(undefined);
    const [error, setError] = useState(null);
    // From the dashboard's "Continue where you stopped" (2026-10-26): that lesson, its START card open.
    // `undefined` until a lesson is tapped: back from a lesson (`?from=`), the next one's card is open (2026-11-07).
    const [tapped, setTapped] = useState(() => params.get('lesson') || undefined);
    const [guide, setGuide] = useState(null);
    const scrolled = useRef(false);

    const load = useCallback(() => linguisticApi.path().then((p) => { setPath(p); setError(null); }).catch((e) => { setError(e); setPath(null); }), []);
    useEffect(() => { load(); }, [load]);

    // Open at the lesson to take next — or at the unit asked for — once.
    const unit = params.get('unit');
    const sectionAsked = params.get('section');
    const lessonAsked = params.get('lesson');
    const fromAsked = params.get('from');
    // The lesson the result named "Next up" (`?next=`), where it is on this path.
    const nextAsked = params.get('next');
    useEffect(() => {
        if (!path || scrolled.current) return;
        scrolled.current = true;
        // Back from a lesson (`?from=`), the mistakes, the daily challenge, or in from the dashboard: the unit of the last
        // lesson the student was in — the next unit once it is finished (2026-11-05) — before the first lesson left.
        const from = fromAsked ? onward(path, fromAsked, nextAsked) : placeAfter(path, !unit && !sectionAsked && !lessonAsked ? lastLesson() : null);
        const at = path.levels.find((l) => l.level === path.level) || path.levels[0];
        // From the Sections page: the section asked for, at its first lesson still to do.
        const inSection = sectionAsked && path.levels.find((l) => l.level === sectionAsked);
        const sectionNext = inSection && inSection.units.flatMap((u) => u.lessons).find((n) => n.open && n.status !== 'completed' && !n.stop);
        const target = (lessonAsked && document.querySelector(`[data-node="${lessonAsked}"]`))
            || (sectionNext && document.querySelector(`[data-node="${sectionNext.id}"]`))
            || (inSection && document.querySelector(`[data-section="${inSection.level}"]`))
            || unit && document.querySelector(`[data-unit="${unit}"]`)
            || (unit && MODULES[unit] && document.querySelector(`[data-section="${at.level}"] [data-kind="${unit}"]`))
            || (from && document.querySelector(`[data-node="${from}"]`))
            || (path.current && document.querySelector(`[data-node="${path.current}"]`));
        target?.scrollIntoView({ block: unit && !sectionAsked ? 'start' : 'center' });
    }, [path, unit, sectionAsked, lessonAsked, fromAsked, nextAsked]);

    if (path === undefined) return <Loading label="Drawing your path…" />;
    if (!path) return <Problem error={error} onRetry={load} />;
    const shown = tapped === undefined ? (fromAsked ? onward(path, fromAsked, nextAsked) : null) : tapped;

    const starts = unitStarts(path.levels);
    const finished = path.levels.flatMap((x) => x.units.flatMap((u) => u.lessons)).filter((x) => !x.stop && x.status === 'completed').length;
    return (
        <div className="space-y-10" data-path>
            {/* At the top, small cards in a row (asked 2026-10-29): the roadmap, all sections, the notes (2026-11-02) and
                the first section's progress (its own header, moved up here). One under another on a phone. */}
            {/* Phones since 2026-11-16: the three shortcut tiles first, the Beginner card (indigo) under them. Was 2026-11-12: the section first, then the roadmap, all
                sections and the notes as three small icon tiles in one row. From xl (desktop) the four cards stay as they
                were (2026-11-12, "undo the changes in the desktop view"): roadmap, all sections, notes, section, in one row. */}
            <div className="grid grid-cols-1 gap-3 xl:gap-4" data-path-top>
                {/* Always the first section (Beginner), also once it is finished (2026-11-16, "don't change it to Advanced"). */}
                {path.levels[0] && <SectionHead section={path.levels[0]} si={0} path={path} small />}
                <nav aria-label="Shortcuts" className="order-first grid grid-cols-3 gap-3 xl:gap-4" data-path-shortcuts>
                    <Shortcut to="/linguistic/roadmap" icon={CalendarDays} tone="purple" title="Roadmap" label="Your roadmap"
                        sub={dash.plan ? `Day ${Math.min(dash.plan.day, dash.plan.days)} of ${dash.plan.days}` : 'Make one'}
                        wideSub={dash.plan ? `Day ${Math.min(dash.plan.day, dash.plan.days)} of ${dash.plan.days} · ${(dash.plan.today?.lessons || []).filter((l) => l.status !== 'completed').length} today` : 'Make your roadmap'}
                        badge={dash.plan ? (dash.plan.today?.lessons || []).filter((l) => l.status !== 'completed').length : 0} data-roadmap-link />
                    <Shortcut to="/linguistic/sections" icon={LayoutList} tone="blue" title="Sections" label="All sections"
                        sub={`${path.levels.length} in all`} wideSub={`${path.levels.length} sections`} data-all-sections />
                    {/* What they have learnt, from the lessons finished (2026-11-02, "add the notes on this page's top"). */}
                    <Shortcut to="/linguistic/notes" icon={NotebookText} tone="gold" title="Notes" label="Your notes"
                        sub={finished ? `${finished} lesson${finished === 1 ? '' : 's'}` : 'Nothing yet'}
                        wideSub={finished ? `From ${finished} lesson${finished === 1 ? '' : 's'} you finished` : 'What you learn is written here'} data-notes-link />
                </nav>
            </div>
            {path.levels.map((section, si) => (
                <section key={section.level} data-section={section.level} {...(levelOf(section.level).bare ? { 'aria-label': levelOf(section.level).section } : { 'aria-labelledby': `sec-${section.level}` })}>
                    {si > 0 && !levelOf(section.level).bare && <SectionHead section={section} si={si} path={path} />}

                    {section.units.map((u, ui) => {
                        const [tone, pose] = lookOf(u);
                        const color = u.open ? tone : 'grey';
                        const c = COLORS[color];
                        const first = starts[u.id];
                        const offsets = u.lessons.map((_, i) => OFFSETS[(first + i) % OFFSETS.length]);
                        // The mascot stands beside the unit's middle, so it goes on the side its middle circles lean away from
                        // (2026-11-03: by the whole unit's lean, on a phone it stood behind a circle in the middle).
                        const mid = (offsets.length - 1) / 2;
                        const lean = offsets[Math.floor(mid)] + offsets[Math.ceil(mid)];
                        const mascotLeft = lean > 0 || (lean === 0 && ui % 2 === 0);
                        return (
                            <div key={u.id} className="relative mb-10" data-unit={u.id} data-unit-kind={u.kind} data-open={u.open}>
                                {/* "Up next … Jump here?" (2026-11-13, the user's Duolingo picture): under the unit before, the shut unit and its test. */}
                                {UNIT_JUMP_CARD && u.jump && <JumpUnit unit={u} upNext={ui > 0 && section.units[ui - 1].open} />}
                                {/* A unit not open yet: its banner grey, with a lock (2026-10-28: it opens when the one before is finished). */}
                                {/* Scrolls with the page (2026-11-12, "while scrolling this card also coming"): no longer held at the top over the circles. */}
                                <div className="relative mb-10 flex items-center gap-3 rounded-2xl p-4 text-white" style={u.open ? { background: c.face, boxShadow: `0 4px 0 ${c.edge}` } : { background: '#C9CED6', boxShadow: '0 4px 0 #A9AFB8' }} data-unit-locked={u.open ? undefined : 'true'}>
                                    {!u.open && <Lock size={22} strokeWidth={2.8} className="shrink-0 text-white" aria-label="Locked" />}
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-extrabold uppercase tracking-wider text-white/85">{u.kind === 'review' ? `Section ${si + 1} · Review` : `Section ${si + 1}, Unit ${u.index}`}{!u.open && ' · Locked'}</p>
                                        <h3 className="text-lg font-extrabold leading-tight sm:text-xl" data-unit-title>{u.title}</h3>
                                        {!u.open && <p className="mt-0.5 text-sm font-bold text-white/90">{ui > 0 && section.open ? `Finish ${section.units[ui - 1].title} to open it.` : `Finish ${si > 0 ? levelOf(path.levels[si - 1]?.level).section : 'the section before'} to open it.`}</p>}
                                    </div>
                                    {/* The Letters unit (2026-10-31): its chart, in place of a guidebook. */}
                                    {u.id.endsWith('-0') ? (
                                        <Link to="/linguistic/letters" className="lingo-btn inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm" style={{ background: 'transparent', borderColor: 'rgba(0,0,0,0.18)', color: '#fff' }} data-letters-chart-open>
                                            <LayoutGrid size={18} /> <span className="hidden sm:inline">Letters chart</span>
                                        </Link>
                                    ) : (
                                        <button type="button" onClick={() => setGuide({ unit: u, section })} className="lingo-btn inline-flex h-11 shrink-0 items-center gap-2 px-3 text-sm" style={{ background: 'transparent', borderColor: 'rgba(0,0,0,0.18)', color: '#fff' }} data-guidebook-open={u.id}>
                                            <BookOpen size={18} /> <span className="hidden sm:inline">Guidebook</span>
                                        </button>
                                    )}
                                </div>
                                {/* The lessons stay in a path-wide strip in the middle, the mascot beside them, on a full-width page. */}
                                <div className="relative mx-auto flex w-full max-w-[640px] flex-col items-center gap-7 pt-6">
                                    <Mascot pose={pose} className={`pointer-events-none absolute top-1/2 h-28 w-28 -translate-y-1/2 sm:h-36 sm:w-36 ${mascotLeft ? 'left-0' : 'right-0'} ${u.open ? '' : 'opacity-40 grayscale'}`} />
                                    {u.lessons.map((l, i) => (
                                        <div key={l.id} className="w-full">
                                            <Node lesson={l} color={color} offset={offsets[i]} current={l.id === path.current} open={shown === l.id} onTap={() => setTapped(shown === l.id ? null : l.id)} />
                                            {shown === l.id && <LessonCard lesson={l} unit={u} number={u.lessons.slice(0, i + 1).filter((x) => !x.stop).length}offset={offsets[i]} color={color} language={path.language?.code} target={path.course?.code || 'en'} onClose={() => setTapped(null)} mistakes={dash.mistakes || 0} onOpened={load} shutSection={section.open ? null : section} sectionNumber={si + 1} />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                    {/* Only at the end of Section 3 (Beginner) and the last section (Advanced) — 2026-11-18, two certificates. */}
                    {section.cert && <TrophyNode section={{ level: section.cert.part, label: section.cert.label, sections: section.cert.sections, complete: section.cert.complete, certificate: section.cert.certificate }} certificateMinAverage={path.certificateMinAverage} courseName={path.course?.name} />}
                </section>
            ))}
            {guide && <Guidebook unit={guide.unit} section={guide.section} language={path.language?.code} target={path.course?.code || 'en'} onClose={() => setGuide(null)} />}
        </div>
    );
}
