/**
 * Language Learning — the dashboard, where the section opens. Laid out as the picture the
 * student gave (2026-10-29, "exactly like the reference"): the greeting over the course's
 * scene with the level card, the four doors (Learn, Practice, Badges, Writing), then the
 * roadmap over its landscape beside the languages and the skills. The scene, the doors and
 * the landscape are cut from that picture (public/linguistic/dashboard/); every word and
 * number on them that changes is drawn live on top. The other cards follow underneath.
 * Every figure comes from the section's dashboard, loaded once by LingoShell.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Target, ChevronRight, Download, Award, Play, Languages, Mic, PenLine, BookOpen, X, BarChart3, Check, ArrowRight, Compass, ListChecks, Zap, Gift } from 'lucide-react';
import { createPortal } from 'react-dom';
import { saveBlob } from '../native/saveFile';
import { linguisticApi } from './api';
import { COLORS, MODULES, MODULE_ORDER, levelOf, langOf } from './meta';
import { Chunky, Mascot, Loading } from './ui';
import KnowsPick from './parts/KnowsPick';
import { planLabel, planStatus, markedDays } from './parts/plan';

const ART = '/linguistic/dashboard';

const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
/** The three cards under the roadmap (2026-10-29): equal height, a colour strip on top, lifting on hover. */
const PREMIUM = 'relative flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-100 bg-white p-5 pt-6 shadow-[0_8px_26px_rgba(31,42,68,.08)] transition-[box-shadow,border-color] duration-300 hover:border-indigo-100 hover:shadow-[0_22px_44px_rgba(31,42,68,.14)]';
const Strip = ({ from, to }) => <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />;
const CERT_COLOR = { beginner: 'green', intermediate: 'gold', advanced: 'red' };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** A thin bar, the profile dashboard's way. */
const Line = ({ value, color = '#6366f1', track = '#e0e7ff', label }) => (
    <span className="block h-2 overflow-hidden rounded-full" style={{ background: track }} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: color }} />
    </span>
);

const Heading = ({ icon: Icon, title, to, link }) => (
    <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-800"><Icon size={18} className="text-indigo-500" /> {title}</h2>
        {to && <Link to={to} className="inline-flex shrink-0 items-center gap-0.5 text-sm font-bold text-indigo-600 hover:text-indigo-700">{link} <ChevronRight size={16} /></Link>}
    </div>
);

/** The level card: in the scene on a wide screen (over the one drawn there), a card of its own on a phone. */
function LevelBadge({ dash, overlay }) {
    const row = (dash.levels || []).find((l) => l.level === dash.level) || dash.levels?.[0] || { completed: 0, total: 0 };
    const v = pct(row.completed, row.total);
    // In the scene everything is sized by its height (cqh), which stays put however much of it is cropped.
    const size = (px, cqh, max) => (overlay ? { fontSize: `clamp(${px}px, ${cqh}cqh, ${max}px)` } : undefined);
    return (
        <Link to="/linguistic/sections" data-lingo-level={dash.level}
            className={`group flex flex-col justify-center rounded-[18px] bg-white/95 shadow-[0_8px_24px_rgba(31,42,68,.14)] ring-1 ring-white backdrop-blur ${overlay ? 'absolute' : 'p-4'}`}
            style={overlay ? { right: '12.5cqh', top: '40.4%', width: '171.6cqh', height: '53.8%', padding: '0 15cqh' } : undefined}>
            <span className="flex items-center gap-[6%]">
                <span className={`flex shrink-0 items-center justify-center rounded-[22%] bg-gradient-to-b from-[#5cc8ff] to-[#1c8ff0] text-white shadow-[0_4px_10px_rgba(28,143,240,.35),inset_0_2px_0_rgba(255,255,255,.45)] ${overlay ? 'h-[17cqh] max-h-12 w-[17cqh] max-w-12' : 'h-11 w-11'}`}>
                    <BarChart3 className="h-[55%] w-[55%]" strokeWidth={3} />
                </span>
                <span className="min-w-0">
                    <span className="block font-black text-[#1F2A44]" style={size(13, 7, 18)}>{levelOf(dash.level).label}</span>
                    <span className="block font-semibold text-[#5B6478]" style={size(10, 5.5, 14)}>Keep going! You’re doing great.</span>
                </span>
            </span>
            <span className="mt-[4%] flex items-center gap-[4%]">
                <span className="h-[3.9cqh] max-h-2.5 min-h-2 flex-1 overflow-hidden rounded-full bg-[#E3E8F0]" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={`${row.completed} of ${row.total} lessons`}>
                    <span className="block h-full rounded-full bg-gradient-to-r from-[#3fb6ff] to-[#1c8ff0]" style={{ width: `${Math.max(v, 4)}%` }} />
                </span>
                <span className="shrink-0 font-extrabold tabular-nums text-[#1F2A44]" style={size(10, 5.8, 15)}>{row.completed} / {row.total} lessons</span>
                <span className={`flex shrink-0 items-center justify-center rounded-full bg-white text-[#1F2A44] shadow-[0_3px_8px_rgba(31,42,68,.2)] transition-transform group-hover:translate-x-0.5 ${overlay ? 'h-[13.5cqh] max-h-9 min-h-6 w-[13.5cqh] min-w-6 max-w-9' : 'h-8 w-8'}`}><ChevronRight className="h-[60%] w-[60%]" strokeWidth={3} /></span>
            </span>
        </Link>
    );
}

/**
 * The mascot's speech bubble, drawn sharp over the painted one (asked 2026-10-29: "its edges clearly visible"):
 * the scene fades in at its left edge, and on some widths the painted bubble sat in that fade. Placed from the
 * scene's right edge by its height (cqh), as the level card is, so it stays on the painted one.
 */
const Bubble = () => (
    <span aria-hidden="true" className="pointer-events-none absolute z-[1] flex flex-col justify-center rounded-[8cqh] bg-white shadow-[0_6px_18px_rgba(31,42,68,.14)]"
        style={{ right: '285.2cqh', top: '15.2%', width: '70cqh', height: '32%', padding: '0 7cqh' }}>
        <span className="block font-black leading-tight text-[#1F2A44]" style={{ fontSize: '7.6cqh' }} lang="ja">こんにちは！</span>
        <span className="block font-bold leading-tight text-[#1F2A44]" style={{ fontSize: '5.4cqh', marginTop: '2cqh' }}>Let’s learn together!</span>
        {/* The tail, toward the mascot. */}
        <span className="absolute bg-white" style={{ right: '9cqh', bottom: '-5cqh', width: '7cqh', height: '7cqh', clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
        <span className="absolute leading-none" style={{ right: '-4cqh', top: '-5cqh', fontSize: '11cqh' }}>🌸</span>
    </span>
);

/**
 * The course's scene with, on its left, the journey line and Continue Learning with the lesson it opens. No
 * name greeting (asked 2026-10-29, so the scene's "Let's learn together!" bubble shows clearly).
 */
function Hero({ dash }) {
    const course = dash.course?.name || 'English';
    const next = dash.resume || dash.plan?.today?.lessons?.find((l) => l.status !== 'completed' && l.open);
    const to = next ? `/linguistic?lesson=${next.id}` : '/linguistic';
    return (
        <section data-lingo-welcome aria-label="Welcome"
            className="relative flex min-w-0 flex-col overflow-hidden rounded-[28px] bg-[linear-gradient(100deg,#fff6ee_0%,#fdeee4_28%,#f7eef1_48%,#eef1f8_70%)] shadow-[0_12px_32px_rgba(31,42,68,.12)] md:block md:h-[clamp(250px,16vw,300px)]">
            {/* The scene (cut from the picture), fading into the sky on its left; the level card on it. */}
            <div className="relative order-first aspect-[2/1] w-full md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[min(64%,calc(clamp(250px,16vw,300px)*4.82))] md:[container-type:size] lg:w-[min(70%,calc(clamp(250px,16vw,300px)*4.82))]">
                {/* A phone: a taller crop around the bubble and the mascot (not the drawn card), unfaded. Wider: the whole scene from the right, fading in at its left edge. */}
                <img src={`${ART}/hero-art.png?v=5`} alt="" draggable="false"
                    className="absolute inset-0 h-full w-full select-none object-cover object-[31%_50%] md:object-right md:[-webkit-mask-image:linear-gradient(90deg,transparent_0%,#000_7%)] md:[mask-image:linear-gradient(90deg,transparent_0%,#000_7%)]" />
                <span className="hidden md:block"><Bubble /><LevelBadge dash={dash} overlay /></span>
            </div>
            <div className="relative z-10 flex h-full flex-col justify-center p-5 sm:p-7 md:max-w-[36%] md:py-5 md:pl-[3%] md:pr-0 lg:max-w-[30%]">
                <h1 className="text-[clamp(1.35rem,2vw,2rem)] font-black leading-tight tracking-tight text-[#14213D]" data-lingo-welcome-line>
                    Let’s continue your <span className="text-[#F26B1D]">{course}</span> learning journey!
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link to={to} data-lingo-continue
                        className="group inline-flex min-h-12 shrink-0 items-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#ff8a3d] to-[#f35b0f] py-2 pr-4 pl-2.5 text-base font-extrabold xl:min-h-14 xl:text-lg text-white shadow-[0_10px_22px_rgba(243,91,15,.35),inset_0_2px_0_rgba(255,255,255,.3)] transition-transform hover:-translate-y-0.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#f35b0f]"><Play size={18} fill="currentColor" className="ml-0.5" /></span>
                        Continue Learning
                        <ChevronRight size={20} strokeWidth={3} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
            <div className="relative px-5 pb-5 md:hidden"><LevelBadge dash={dash} /></div>
        </section>
    );
}

/**
 * The four doors, as drawn in the picture, each hanging from the scene above by two strings (the picture's
 * coloured lines, a ring pinned to the scene and a bead on the card; asked 2026-10-29). The strings show
 * when the four sit in one row under the scene.
 */
const DOORS = [
    // In this order (asked 2026-10-29): Home, Learn, Writing, Practice, Badges. Home's picture is the Learn
    // card's, recoloured, with a house in place of the book; its words are drawn live (`text`).
    { id: 'home', label: 'Start: your dashboard', w: 454, string: '#1E88F0', text: ['Start', 'Your dashboard'] },
    { id: 'learn', to: '/linguistic', label: 'Learn: words and sentences', w: 454, string: '#6DBE5A' },
    { id: 'writing', to: '/linguistic/writing', label: 'Write: practise and improve', w: 422, string: '#3E9BE9', img: 'write', text: ['Write', 'Practice and improve'] },
    { id: 'practice', to: '/linguistic/practice', label: 'Practice: daily challenge and mistakes', w: 390, string: '#F2994A', img: 'practice2', text: ['Practice', 'Challenge & fix mistakes'] },
    { id: 'badges', to: '/linguistic/badges', label: 'Certificates: your levels and awards', w: 423, string: '#B07CE8', img: 'certificates', text: ['Certificates', 'Your levels & awards'] }
];
/** One string: a ring at the top (on the scene's edge), the line, a bead where it meets the card. */
const HangString = ({ at, color }) => (
    <span aria-hidden="true" className="pointer-events-none absolute bottom-[calc(100%-4px)] z-10 hidden h-[48px] w-3 -translate-x-1/2 flex-col items-center xl:flex" style={{ left: at }}>
        <span className="h-[9px] w-[9px] shrink-0 rounded-full border-2 bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)]" style={{ borderColor: color }} />
        <span className="w-[2px] flex-1 rounded-full" style={{ background: `linear-gradient(${color}, ${color}cc)` }} />
        <span className="h-[7px] w-[7px] shrink-0 rounded-full shadow-[0_1px_2px_rgba(0,0,0,.25)]" style={{ background: color }} />
    </span>
);
/**
 * The four doors: Learn opens the learning path (its own page, as before); Practice, Badges and Writing are
 * tabs (asked 2026-10-29), each opening its page here, under them — pressed again, the dashboard's own cards.
 */
function Doors({ tab, onTab }) {
    const navigate = useNavigate();
    return (
        <nav role="tablist" aria-label="Language Learning" className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:!mt-11 xl:flex xl:gap-3" data-lingo-doors>
            {DOORS.map((d) => {
                // Home is lit while the dashboard's own cards show; Learn (another page) never is.
                const on = d.id === 'home' ? tab === 'learn' : d.id !== 'learn' && tab === d.id;
                return (
                    <div key={d.id} className="group/door relative min-w-0 flex-1">
                        <HangString at="24%" color={d.string} />
                        <HangString at="78%" color={d.string} />
                        <button type="button" role={d.id === 'learn' ? 'link' : 'tab'} aria-selected={d.id === 'learn' ? undefined : on} aria-controls={d.id === 'learn' ? undefined : 'lingo-tab-panel'} aria-label={d.label} data-door={d.id} data-active={on || undefined}
                            onClick={() => (d.id === 'learn' ? navigate(d.to) : onTab(d.id === 'home' || on ? 'learn' : d.id))}
                            className={`group relative block w-full overflow-hidden rounded-[18px] transition-[transform,box-shadow] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${on ? 'translate-y-[3px] shadow-[0_14px_28px_rgba(31,42,68,.18)]' : 'shadow-[0_8px_22px_rgba(31,42,68,.10)] group-hover/door:translate-y-[3px] group-hover/door:shadow-[0_16px_30px_rgba(31,42,68,.16)]'}`}
                            style={on ? { boxShadow: `0 0 0 3px ${d.string}, 0 14px 28px rgba(31,42,68,.18)` } : undefined}>
                            {/* All five one size (2026-10-29): the same shape, each picture filling it from the right (its
                                arrow always whole) and a touch larger, so its cut edges fall outside the card's own. */}
                            <img src={`${ART}/card-${d.img || d.id}-tall.png?v=1`} alt="" draggable="false" className="block w-full select-none object-cover object-right" style={{ aspectRatio: '3.3 / 1', transform: 'scale(1.03)' }} />
                            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[18px] ring-1 ring-inset ring-black/[.06]" />
                            {d.text && (
                                <span className="pointer-events-none absolute inset-0 text-left [container-type:inline-size]">
                                    <span className="absolute block font-black leading-none text-[#17184a]" style={{ left: '36%', top: '32.5%', fontSize: '5.7cqw' }}>{d.text[0]}</span>
                                    <span className="absolute block font-bold leading-none whitespace-nowrap text-[#4a5875]" style={{ left: '36%', top: '56.5%', fontSize: '3.9cqw' }}>{d.text[1]}</span>
                                </span>
                            )}
                        </button>
                    </div>
                );
            })}
        </nav>
    );
}
const PAGES = { practice: lazy(() => import('./PracticeHub')), badges: lazy(() => import('./Badges')), writing: lazy(() => import('./MyWriting')) };

/** Where the five days stand on the landscape (as % of it): the marker on the road, and its label above. */
const ROAD_SPOTS = [[20.4, 74.5, 56.4], [33.0, 57.6, 39.4], [47.5, 80.0, 60.6], [61.8, 72.7, 55.2], [76.7, 80.0, 60.6]];
const CHEERS = {
    green: () => ({ icon: <span className="text-3xl leading-none">🎯</span>, title: 'Keep going!', text: 'You’re on track', bg: '#EAF8E6', ink: '#3E8E1F' }),
    orange: (p) => ({ icon: <img src={`${ART}/icon-alarm.png`} alt="" className="h-10 w-10" />, title: 'Catch up!', text: `${p.behind} lesson${p.behind === 1 ? '' : 's'} behind`, bg: '#FDEEF2', ink: '#E11D74' }),
    red: () => ({ icon: <span className="text-3xl leading-none">🔄</span>, title: 'Time is up', text: 'Choose a new time', bg: '#FFE4E4', ink: '#DC2626' })
};

/** The roadmap: the plan's day, the lessons done, how it goes, and the road over the landscape. */
function Roadmap({ dash }) {
    const p = dash.plan;
    // A phone (the landscape wider than its box): it glides from Start to the trophy, rests a moment at the
    // end, then cuts straight back to Start — no fade, no blank, never backwards (asked 2026-10-29). A touch or
    // a swipe takes over; the glide picks up again after a pause.
    // Not on a wider screen (nothing to scroll), nor for someone who asked for less motion.
    const sceneScroll = useRef(null);
    useEffect(() => {
        const el = sceneScroll.current;
        if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
        let raf = 0, last = 0, pos = el.scrollLeft, held = 0, atEnd = false;
        const SPEED = 40;                                   // px a second
        const hold = () => { held = performance.now() + 3500; atEnd = false; };
        const step = (t) => {
            raf = requestAnimationFrame(step);
            const dt = last ? Math.min(64, t - last) : 0; last = t;
            const room = el.scrollWidth - el.clientWidth;
            if (room <= 2) return;                              // all of it fits: nothing to do
            if (t < held) { if (!atEnd) pos = el.scrollLeft; return; }
            // Rested at the end: back to Start in one frame.
            if (atEnd) { atEnd = false; pos = 0; el.scrollLeft = 0; held = t + 600; return; }
            pos += SPEED * dt / 1000;
            if (pos >= room) { pos = room; atEnd = true; held = t + 1500; }
            el.scrollLeft = pos;
        };
        const evs = ['pointerdown', 'touchstart', 'wheel'];
        evs.forEach((e) => el.addEventListener(e, hold, { passive: true }));
        raf = requestAnimationFrame(step);
        return () => { cancelAnimationFrame(raf); evs.forEach((e) => el.removeEventListener(e, hold)); };
    }, []);
    if (!p) return null;
    const status = planStatus(p);
    const cheer = (CHEERS[status.tone] || CHEERS.green)(p);
    const v = p.total ? Math.min(100, (p.done / p.total) * 100) : 0;
    const marks = markedDays(Math.max(1, p.days)).slice(0, ROAD_SPOTS.length);
    const today = Math.min(Math.max(1, p.day), p.days);
    const at = marks.reduce((k, d, i) => (d <= today ? i : k), 0);
    const lessons = p.today?.lessons || [];
    const left = lessons.filter((l) => l.status !== 'completed');
    return (
        <section className="rounded-[22px] bg-white p-5 shadow-[0_8px_26px_rgba(31,42,68,.08)] sm:p-6" data-plan-card={p.day}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                    <img src={`${ART}/icon-calendar.png`} alt="" className="h-12 w-12 shrink-0" />
                    <div className="min-w-0">
                        <h2 className="text-2xl font-black leading-tight text-[#14213D]">Your roadmap</h2>
                        <p className="mt-0.5 text-sm font-semibold text-[#5B6478]">Day {today} of {p.days} · {planLabel(p.days)} plan · {p.done}/{p.total} lessons</p>
                    </div>
                </div>
                <Link to="/linguistic/roadmap" className="flex items-center gap-2.5 rounded-2xl py-1.5 pr-3 pl-2 shadow-[0_4px_12px_rgba(225,29,116,.10)] transition-transform hover:-translate-y-0.5" style={{ background: cheer.bg }} data-plan-cheer={status.tone}>
                    {cheer.icon}
                    <span className="leading-tight">
                        <span className="block text-[15px] font-black" style={{ color: cheer.ink }}>{cheer.title}</span>
                        <span className="block text-xs font-semibold text-[#6B7280]">{cheer.text}</span>
                    </span>
                    <ChevronRight size={18} strokeWidth={3} style={{ color: cheer.ink }} />
                </Link>
            </div>
            <div className="mt-4 flex items-center gap-3">
                <div className="relative h-4 flex-1 rounded-full bg-[#E8EBF1]" role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.done} of ${p.total} lessons done`}>
                    <div className="relative h-full min-w-[22px] rounded-full bg-gradient-to-r from-[#7ed957] to-[#3fae2a] shadow-[inset_0_2px_0_rgba(255,255,255,.35)] transition-[width] duration-500" style={{ width: `${v}%` }}>
                        <span className="absolute top-1/2 right-0 h-[22px] w-[22px] -translate-y-1/2 translate-x-[2px] rounded-full bg-gradient-to-b from-[#86e05f] to-[#3fae2a] shadow-[0_2px_4px_rgba(0,0,0,.2),inset_0_2px_0_rgba(255,255,255,.45)]" />
                    </div>
                </div>
                <span className="shrink-0 text-[15px] font-extrabold tabular-nums text-[#14213D]">{p.done} / {p.total} lessons</span>
            </div>
            {/* The landscape (cut from the picture), the plan's own days on its road. */}
            {/* On a phone the whole landscape would be a thin strip (2026-10-29: "make it bigger"): it keeps a readable
                size (1000px at least, md and up the card's width), glides Start to trophy, and has a thin scrollbar to move it by hand. */}
            <div ref={sceneScroll} className="lingo-road-scroll mt-4 overflow-x-auto overflow-y-hidden rounded-2xl pb-1.5 md:pb-0" data-roadmap-scroll>
            <div className="relative w-[1000px] shrink-0 overflow-hidden md:w-full" style={{ containerType: 'inline-size', aspectRatio: '1039 / 165' }} data-roadmap-scene>
                <img src={`${ART}/roadmap-hd.jpg`} alt="" draggable="false" className="absolute inset-0 h-full w-full select-none" />
                {/* The trophy at the goal: its light behind it (a glow and slow rays), the trophy itself on top, cut from
                    the picture so it stays sharp, and sparks round it, never over it (2026-10-29). */}
                <span aria-hidden="true" className="pointer-events-none absolute" style={{ left: '90.7%', top: '16%', width: '13cqw', height: '13cqw', transform: 'translate(-50%, -50%)' }}>
                    <span className="lingo-cup-rays absolute inset-0 rounded-full" style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,230,140,.55) 0deg 7deg, rgba(255,230,140,0) 7deg 22deg)', maskImage: 'radial-gradient(circle, #000 18%, transparent 66%)', WebkitMaskImage: 'radial-gradient(circle, #000 18%, transparent 66%)' }} />
                    <span className="lingo-cup-glow absolute inset-[12%] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,240,170,.95) 0%, rgba(255,205,70,.6) 35%, rgba(255,190,40,0) 70%)' }} />
                </span>
                <img src={`${ART}/cup.png`} alt="" draggable="false" className="pointer-events-none absolute select-none drop-shadow-[0_0_6px_rgba(255,200,60,.65)]" style={{ left: '88.306%', top: '0%', width: '4.812%', height: '34.09%' }} />
                {[[86.6, 6, 0], [95.2, 4, .5], [96, 24, 1], [85.6, 25, 1.4], [94.1, 33, .8], [87.4, 33, 1.7]].map(([x, y, delay], k) => (
                    <span key={k} aria-hidden="true" className="lingo-spark pointer-events-none absolute leading-none text-[#fff6cc]" style={{ left: `${x}%`, top: `${y}%`, fontSize: k % 2 ? '1.2cqw' : '1.6cqw', transform: 'translate(-50%, -50%)', animationDelay: `${delay}s` }}>✦</span>
                ))}
                {marks.map((d, i) => {
                    const [x, y, ly] = ROAD_SPOTS[i];
                    const state = i < at ? 'passed' : i === at ? 'today' : 'ahead';
                    return (
                        <span key={i} data-road-day={d} data-state={state}>
                            <span className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-extrabold whitespace-nowrap shadow-[0_2px_5px_rgba(0,0,0,.18)] ${state === 'today' ? 'bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] text-white' : 'bg-white text-[#1F2A44]'}`}
                                style={{ left: `${x}%`, top: `${ly}%`, width: '7.6%', height: '16.4%', fontSize: 'clamp(10px, 1.45cqw, 15px)' }}>Day {d}</span>
                            <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,.25)]"
                                style={{ left: `${x}%`, top: `${y}%`, width: state === 'today' ? '3.3%' : '2.6%', aspectRatio: '1', border: `${state === 'today' ? 0.75 : 0.6}cqw solid ${state === 'today' ? '#6d28d9' : state === 'passed' ? '#c4b5fd' : '#9aa3ae'}` }} />
                        </span>
                    );
                })}
            </div>
            </div>
            {/* Today's lessons, as before. */}
            <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-[#9CA3AF]">{left.length ? `Today: ${left.length} lesson${left.length === 1 ? '' : 's'} to do` : 'Today’s lessons are done!'}</p>
            <ul className="mt-1.5 space-y-1">
                {lessons.map((l) => {
                    const done = l.status === 'completed';
                    const row = (
                        <>
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ background: done ? COLORS.green.face : COLORS.blue.light }}>{done && <Check size={14} strokeWidth={4} className="text-white" />}</span>
                            <span className={`min-w-0 flex-1 truncate text-[15px] font-bold ${done ? 'text-[#AFAFAF] line-through' : 'text-[#4b4b4b]'}`}>{l.title}</span>
                        </>
                    );
                    return <li key={l.id}>{!done && l.open ? <Link to={`/linguistic/${l.module}/${l.id}`} className="-mx-2 flex items-center gap-2.5 rounded-xl px-2 py-1 hover:bg-[#F7F7F7]" data-plan-today={l.id}>{row}<ChevronRight size={16} className="shrink-0 text-[#AFAFAF]" /></Link> : <span className="flex items-center gap-2.5 py-1" data-plan-today={l.id}>{row}</span>}</li>;
                })}
            </ul>
            <Link to="/linguistic/roadmap" className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-extrabold text-indigo-600 hover:text-indigo-700" data-see-roadmap>See in detail <ArrowRight size={16} /></Link>
        </section>
    );
}

/** A card of the right-hand column: its icon and title, and a link at the right. */
const SideHead = ({ icon: Icon, tint, title, action }) => (
    <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-black text-[#14213D]"><Icon size={22} strokeWidth={2.5} style={{ color: tint }} /> {title}</h2>
        {action}
    </div>
);
const SIDE_LINK = 'inline-flex shrink-0 items-center gap-1 text-sm font-extrabold text-indigo-600 hover:text-indigo-700';
/** Icon tiles in the picture's soft colours. */
const TILE = {
    orange: ['#FFF1DE', '#F59E0B'], purple: ['#F1EAFE', '#8B5CF6'], blue: ['#E5F1FE', '#3B82F6'],
    green: ['#E6F6E0', '#3F9E2B'], red: ['#FFE8EA', '#EF4444'], gold: ['#FFF4D6', '#D49A00'], grey: ['#F1F5F9', '#64748B']
};
const CHIP = { orange: ['#FFE6C7', '#C2410C'], purple: ['#ECE3FD', '#6D28D9'], blue: ['#DCEBFE', '#1D4ED8'] };

/** Each skill: lessons done and the average quiz score; a row opens the path at that skill. */
function Skills({ dash }) {
    const rows = MODULE_ORDER.map((id) => dash.modules.find((m) => m.id === id)).filter((m) => m && m.total);
    if (!rows.length) return null;
    return (
        <section className={PREMIUM} data-lingo-skills>
            <Strip from="#6366f1" to="#0ea5e9" />
            <SideHead icon={Target} tint="#7C3AED" title="Your skills" action={<Link to="/linguistic/sections" className={SIDE_LINK}>View All <ArrowRight size={16} /></Link>} />
            <ul className="space-y-1">
                {rows.map((m) => {
                    const meta = MODULES[m.id], c = COLORS[meta.color], [tile, ink] = TILE[meta.color] || TILE.grey, Icon = meta.icon;
                    return (
                        <li key={m.id} data-skill={m.id}>
                            <Link to={`/linguistic?unit=${m.id}`} className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: tile, color: ink }}><Icon size={20} strokeWidth={2.4} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[15px]">
                                        <span className="truncate font-bold text-[#2B3445]">{meta.short}</span>
                                        <span className="shrink-0 text-sm font-semibold tabular-nums text-[#4B5568]">{m.completed}/{m.total}{m.average != null && <> · avg {m.average}%</>}</span>
                                    </span>
                                    <Line value={pct(m.completed, m.total)} color={c.face} track="#EDF0F5" label={`${meta.short}: ${m.completed} of ${m.total} lessons`} />
                                </span>
                                <ChevronRight size={18} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/** Beginner, Intermediate, Advanced: progress, and the certificate once earned. */
function Levels({ dash }) {
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const download = (level) => {
        setBusy(level); setError('');
        linguisticApi.certificatePdf(level).then((blob) => saveBlob(blob, `${dash.course?.name || 'English'}_${levelOf(level).label}_Certificate.pdf`, { title: 'Certificate' })).catch((e) => setError(e.message)).finally(() => setBusy(''));
    };
    return (
        <section className={PREMIUM} data-lingo-levels>
            <Strip from="#f59e0b" to="#f97316" />
            <Heading icon={Award} title="Levels & certificates" to="/linguistic/badges" link="All" />
            <ul className="space-y-3">
                {dash.levels.map((l) => {
                    const meta = levelOf(l.level), c = COLORS[CERT_COLOR[l.level]];
                    return (
                        <li key={l.level} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3" data-level-row={l.level}>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: l.certificate ? c.face : COLORS.grey.light }}><Award size={20} className={l.certificate ? 'text-white' : 'text-slate-400'} /></span>
                            <span className="min-w-0 flex-1">
                                <span className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                                    <span className="truncate font-bold text-slate-700">{meta.label} <span className="font-semibold text-slate-400">· {meta.cefr}</span></span>
                                    <span className="shrink-0 tabular-nums text-slate-500">{l.completed}/{l.total}</span>
                                </span>
                                <Line value={pct(l.completed, l.total)} color={c.face} track={c.light} label={`${meta.label}: ${l.completed} of ${l.total} lessons`} />
                            </span>
                            {l.certificate && (
                                <button type="button" onClick={() => download(l.level)} disabled={busy === l.level} data-certificate={l.level}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60">
                                    <Download size={14} /> {busy === l.level ? '…' : 'PDF'}
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {error && <p role="alert" className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
        </section>
    );
}

/** The three ways of knowing a language (2026-10-28), and the skill of the course that grows each. */
const KNOWS = [
    { id: 'speak', label: 'Speak', ask: 'Which languages do you speak?', icon: Mic, color: 'orange' },
    { id: 'write', label: 'Write', ask: 'Which languages can you write?', icon: PenLine, color: 'purple' },
    { id: 'read', label: 'Read', ask: 'Which languages can you read?', icon: BookOpen, color: 'blue' }
];

/** The languages asked about, one way at a time: speak, write, then read. */
function KnowsSheet({ dash, onClose, onSaved }) {
    const [at, setAt] = useState(0);
    const [picked, setPicked] = useState({ speak: dash.knows?.speak || [], write: dash.knows?.write || [], read: dash.knows?.read || [] });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const k = KNOWS[at], last = at === KNOWS.length - 1;
    const save = () => { setBusy(true); setError(''); linguisticApi.setKnows(picked).then(onSaved).catch((e) => { setError(e.message); setBusy(false); }); };
    return createPortal(
        <div className="lingo fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <div className="lingo-pop max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lingo-knows" data-knows-sheet={k.id}>
                <div className="mb-4 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold uppercase tracking-wider text-[#AFAFAF]">Your languages · {at + 1} of {KNOWS.length}</p>
                        <h2 id="lingo-knows" className="text-xl font-extrabold text-[#3c3c3c]">{k.ask}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#AFAFAF] hover:bg-[#F7F7F7]"><X size={22} strokeWidth={3} /></button>
                </div>
                <KnowsPick key={k.id} languages={dash.languages || []} picked={picked[k.id]} onChange={(list) => setPicked((p) => ({ ...p, [k.id]: list }))} kind={k.id} />
                {error && <p className="mt-3 text-sm font-bold" style={{ color: COLORS.red.ink }} role="alert">{error}</p>}
                <div className="mt-5 flex gap-3">
                    <Chunky variant="ghost" color="blue" onClick={() => (at ? setAt(at - 1) : onClose())} className="flex-1" disabled={busy}>{at ? 'Back' : 'Cancel'}</Chunky>
                    <Chunky color="green" onClick={() => (last ? save() : setAt(at + 1))} disabled={busy || !picked[k.id].length} className="flex-1" data-knows-next>{busy ? 'Saving…' : last ? 'Save' : 'Next'}</Chunky>
                </div>
            </div>
        </div>,
        document.body
    );
}

/**
 * The languages the student speaks, writes and reads (asked last on the start screens, 2026-10-28): how many
 * and which, for each; a row (or Change) opens the questions again.
 */
function KnowsCard({ dash, onSaved }) {
    const [open, setOpen] = useState(false);
    const name = (code) => (dash.languages || []).find((l) => l.code === code) || { code, name: langOf(code).name, native: langOf(code).name };
    return (
        <section className={PREMIUM} data-lingo-knows>
            <Strip from="#8b5cf6" to="#d946ef" />
            <SideHead icon={Languages} tint="#7C3AED" title="Your languages"
                action={dash.knows && <button type="button" onClick={() => setOpen(true)} className={SIDE_LINK} data-knows-change>Change <ArrowRight size={16} /></button>} />
            {dash.knows ? (
                <ul className="space-y-1">
                    {KNOWS.map((k) => {
                        const list = dash.knows[k.id] || [], [tile, ink] = TILE[k.color], [chip, chipInk] = CHIP[k.color], Icon = k.icon;
                        return (
                            <li key={k.id} data-knows-row={k.id} data-count={list.length}>
                                <button type="button" onClick={() => setOpen(true)} className="group -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-slate-50">
                                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-[inset_0_-3px_0_rgba(0,0,0,.05)]" style={{ background: tile, color: ink }}><Icon size={22} strokeWidth={2.2} /></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[15px] font-bold text-[#2B3445]">{k.label} · <span className="tabular-nums">{list.length} language{list.length === 1 ? '' : 's'}</span></span>
                                        <span className="mt-1 flex flex-wrap gap-1.5">
                                            {list.map((code) => (
                                                <span key={code} className="rounded-full px-3 py-0.5 text-xs font-bold" style={{ background: chip, color: chipInk }} lang={code}>{name(code).native}</span>
                                            ))}
                                        </span>
                                    </span>
                                    <ChevronRight size={18} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <div className="flex flex-col items-start gap-3" data-knows-ask>
                    <p className="text-sm font-semibold text-slate-600">Tell us which languages you speak, write and read: they are kept here, with the one you are learning.</p>
                    <Chunky color="blue" onClick={() => setOpen(true)} className="!min-h-10 !text-sm" data-knows-start>Tell us</Chunky>
                </div>
            )}
            {open && <KnowsSheet dash={dash} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onSaved(); }} />}
        </section>
    );
}

/*
 * The row under the three cards (redesigned 2026-10-29, "clean and clear"), in their style: the course (or the
 * level test), the mistakes to fix, and today's quests — side by side on a wide screen.
 */
const QUEST_LESSONS = 2;
function CourseCard({ dash }) {
    const other = dash.course && dash.course.code !== 'en';
    const placed = dash.placement;
    const body = other
        ? { mark: langOf(dash.course.code).mark, title: `${dash.course.name} course`, text: `Words and sentences, Beginner to Advanced, taught in ${dash.language?.name || 'Kannada'}.`, to: '/linguistic', link: 'Open path' }
        : !placed
            ? { icon: Compass, title: 'Find your level', text: 'A 15-question test, about 5 minutes. Start where you belong.', to: '/linguistic/placement', link: 'Take the test' }
            : { icon: Compass, title: `${placed.chosen ? 'You chose' : 'Placed at'} ${levelOf(placed.level).label}`, text: placed.chosen ? 'Not sure? The placement test finds your level.' : `${placed.score}/${placed.total} on the placement test.`, to: '/linguistic/placement', link: placed.chosen ? 'Take the test' : 'Retake' };
    return (
        <section className={PREMIUM} data-lingo-course>
            <Strip from="#22c55e" to="#14b8a6" />
            <div className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#34d399] to-[#16a34a] text-lg font-black text-white shadow-[0_8px_18px_rgba(22,163,74,.3)]" lang={other ? dash.course.code : undefined}>
                    {body.mark || <body.icon size={22} strokeWidth={2.4} />}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black leading-tight text-[#14213D]">{body.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{body.text}</p>
                </div>
            </div>
            <Link to={body.to} className={`${SIDE_LINK} mt-auto pt-4`}>{body.link} <ArrowRight size={16} /></Link>
        </section>
    );
}
function MistakesBox({ dash }) {
    const n = dash.mistakes || 0;
    return (
        <section className={PREMIUM} data-mistakes={n}>
            <Strip from="#f43f5e" to="#fb923c" />
            <div className="flex items-start gap-3.5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-[#fb7185] to-[#e11d48] text-white shadow-[0_8px_18px_rgba(225,29,72,.28)]"><ListChecks size={22} strokeWidth={2.4} /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black leading-tight text-[#14213D]">{n ? `${n} mistake${n === 1 ? '' : 's'} to fix` : 'No mistakes to fix'}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{n ? 'Practise them until you get them right.' : 'Wrong answers come here to practise.'}</p>
                </div>
            </div>
            {n > 0
                ? <div className="mt-auto pt-4"><Link to="/linguistic/review" className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#fb7185] to-[#e11d48] text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(225,29,72,.25)] transition-[filter] hover:brightness-105">Fix now <ArrowRight size={16} /></Link></div>
                : <p className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-emerald-600"><Check size={16} strokeWidth={3} /> All clear</p>}
        </section>
    );
}
function QuestsBox({ dash }) {
    const goal = dash.dailyGoal || 30;
    const rows = [
        { icon: Zap, tint: ['#FFF4D6', '#D49A00'], bar: '#F5B300', title: `Earn ${goal} XP`, value: dash.today?.xp || 0, goal },
        { icon: BookOpen, tint: ['#E6F6E0', '#3F9E2B'], bar: '#58CC02', title: `Complete ${QUEST_LESSONS} lessons`, value: dash.today?.lessons || 0, goal: QUEST_LESSONS },
        { icon: Target, tint: ['#E5F1FE', '#3B82F6'], bar: '#3B82F6', title: 'Do the daily challenge', value: dash.daily?.done ? 1 : 0, goal: 1, to: '/linguistic/daily' }
    ];
    const done = rows.filter((r) => r.value >= r.goal).length;
    return (
        <section className={PREMIUM} data-quests>
            <Strip from="#f59e0b" to="#3b82f6" />
            <SideHead icon={Gift} tint="#D49A00" title="Daily quests" action={<span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-700 ring-1 ring-amber-200">{done}/{rows.length} done</span>} />
            <ul className="space-y-3.5">
                {rows.map((r) => {
                    const v = Math.min(100, Math.round((r.value / r.goal) * 100));
                    const ok = r.value >= r.goal;
                    const inner = (
                        <>
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: r.tint[0], color: r.tint[1] }}><r.icon size={19} strokeWidth={2.4} /></span>
                            <span className="min-w-0 flex-1">
                                <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[15px]">
                                    <span className={`truncate font-bold ${ok ? 'text-slate-400 line-through' : 'text-[#2B3445]'}`}>{r.title}</span>
                                    <span className="shrink-0 text-xs font-extrabold tabular-nums text-slate-500">{Math.min(r.value, r.goal)}/{r.goal}</span>
                                </span>
                                <Line value={v} color={ok ? '#22c55e' : r.bar} track="#EDF0F5" label={`${r.title}: ${r.value} of ${r.goal}`} />
                            </span>
                            {ok ? <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={15} strokeWidth={3.5} /></span> : <Gift size={20} className="shrink-0 text-slate-300" />}
                        </>
                    );
                    return <li key={r.title}>{r.to && !ok ? <Link to={r.to} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-1 hover:bg-slate-50">{inner}</Link> : <div className="flex items-center gap-3">{inner}</div>}</li>;
                })}
            </ul>
        </section>
    );
}

export default function Dashboard() {
    const { dash, reload } = useOutletContext();
    // Which door is open, in the address (?tab=practice), so Back and a reload keep it.
    const [params, setParams] = useSearchParams();
    const tab = ['practice', 'badges', 'writing'].includes(params.get('tab')) ? params.get('tab') : 'learn';
    const setTab = (id) => setParams(id === 'learn' ? {} : { tab: id });
    const Page = PAGES[tab];
    // As the reference picture (2026-10-29): the greeting and scene, the four doors, then the roadmap on the
    // left (about three fifths) beside the languages and the skills. The rest of the dashboard's cards —
    // the level test, mistakes, quests, levels and certificates — follow underneath, as before.
    return (
        <div className="min-w-0 space-y-6 overflow-x-clip" data-lingo-dashboard>
            <Hero dash={dash} />
            <Doors tab={tab} onTab={setTab} />
            {/* The open tab's page: Learn is the dashboard's own cards; the others, their pages, here. */}
            <div id="lingo-tab-panel" role="tabpanel" className="space-y-6" data-lingo-tab={tab}>
                {Page ? <Suspense fallback={<Loading label="Opening…" />}><Page key={`${dash.language?.code || 'kn'}:${dash.course?.code || 'en'}`} /></Suspense> : (
                    <>
                    {/* The roadmap across the whole row; under it the languages, the skills and the levels, side by side. */}
                    <div data-lingo-dashboard-cards><Roadmap dash={dash} /></div>
                    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3" data-lingo-dashboard-trio>
                        <KnowsCard dash={dash} onSaved={reload} />
                        <Skills dash={dash} />
                        <div className="min-w-0 md:col-span-2 xl:col-span-1"><Levels dash={dash} /></div>
                    </div>
                    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3" data-lingo-dashboard-more>
                        <CourseCard dash={dash} />
                        <MistakesBox dash={dash} />
                        <div className="min-w-0 md:col-span-2 xl:col-span-1"><QuestsBox dash={dash} /></div>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
