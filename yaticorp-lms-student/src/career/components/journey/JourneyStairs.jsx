/**
 * The climb to the goal (redesigned 2026-10-27, after the supplied reference): a cinematic
 * sunset mountain (public/illustrations/career-climb-scene.jpg) with the robot on its rocky
 * ledges, an illuminated trail winding up to a golden flag on the summit, and the student's own
 * milestones laid on the trail — real cards and numbered pins placed exactly over the painted
 * ones, so they carry the roadmap's actual phases, states and links.
 *
 * Progress is the roadmap's own: the phases marked complete (by index), and the current one — the
 * first not complete, as the Roadmap page decides it. Five places on the trail: every phase when
 * there are five or fewer; otherwise step 1, the current step and its neighbours, and the goal,
 * with "View all steps" for the rest (trailSlots).
 *
 * Positions are in % of the picture, measured from its pixels. The picture keeps its own
 * proportions inside the frame (cropped at the sides only on a phone), so every card and pin
 * stays on its ledge — on a phone too, where everything scales with the scene.
 *
 * The summit celebrates when the final step is reached and when it is completed (see below).
 */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Check, Lock, Sparkles, ArrowRight, Flag, GraduationCap, BriefcaseBusiness, FileText, Users, Code2, BookOpen, Award, Lightbulb
} from 'lucide-react';
import { phaseTitle, parseChoices } from '../../utils/roadmap';
import { summitPlan } from './summitPlan';
import { trailSlots, robotPlace } from './trailSlots';

const SCENE = '/illustrations/career-climb-scene.jpg';
// The same scene without its painted robot, cards, pins and goal pill. When this file is there, the
// page uses it and draws the climbing robot itself, standing beside the student's current step;
// until then the painted scene is used as it is (it has its own robot, which cannot move).
const CLEAN_SCENE = '/illustrations/career-climb-clean.jpg';
const CLIMBER = '/mascot/climber.png';          // 403 × 640, transparent
const CLIMBER_RATIO = 403 / 640;
// The robot's height on each of the five places (in % of the scene's height), smaller higher up the
// mountain, as the cards are; and where it stands once every step is done, below the flag.
const CLIMBER_HEIGHT = [24, 20, 17, 14.5, 12.5];
const SUMMIT_LEDGE = { feet: [84.5, 16], height: 11 };
const RATIO = 2400 / 1478;
// The painted places on the trail, bottom to top: each card's box [left, right, top, bottom] and
// its pin's head [x, y], in % of the picture; and the colour its pin is painted when locked.
const SPOTS = [
    { card: [21.8, 52.8, 82.9, 90.9], pin: [16.5, 80.6], locked: 'bg-slate-400' },
    { card: [40.1, 79.0, 62.5, 70.8], pin: [38.1, 61.7], locked: 'bg-slate-400' },
    { card: [51.9, 81.6, 48.3, 56.0], pin: [49.6, 48.3], locked: 'bg-blue-500' },
    { card: [61.3, 89.8, 36.2, 43.9], pin: [59.85, 35.6], locked: 'bg-violet-500' },
    { card: [67.3, 94.9, 24.6, 31.9], pin: [66.1, 24.6], locked: 'bg-rose-500' }
];
const GOAL_PILL = [62.3, 84.4, 7.1, 12.4];
const SUMMIT = [87.6, 6.6];
// The trail, through the foot of each pin to the summit (picture pixels), for the light that travels it.
const TRAIL = 'M 400 1296 C 470 1220, 600 1190, 760 1160 C 880 1130, 960 1100, 940 1070 C 925 1045, 915 1030, 912 1024 C 980 960, 1140 920, 1230 880 C 1250 860, 1210 830, 1192 820 C 1300 760, 1440 690, 1470 660 C 1480 650, 1440 640, 1436 636 C 1520 580, 1600 520, 1584 464 C 1660 420, 1800 330, 1960 230 C 2010 200, 2050 170, 2072 150';

/** A phase's name, short enough for its plaque: the lead before a colon, no bracketed detail, capped. */
const shortTitle = (phase) => {
    const full = phaseTitle(phase);
    const lead = (parseChoices(full)?.lead || full).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return lead.length > 44 ? `${lead.slice(0, 43).trim()}…` : lead;
};


// Five or fewer phases stand on the top of the trail, so the summit is always the goal's.
const spotFor = (i, n) => SPOTS[SPOTS.length - n + i];

// What kind of step a phase is, from its name: the first match wins.
const ICONS = [
    [/intern|industry|exposure|experience|company|workplace/i, BriefcaseBusiness],
    [/application|placement|resume|portfolio|hiring|interview|job/i, Users],
    [/exam|test|entrance|aptitude|recruitment|\bgate\b|nimcet|\bjee\b|\bneet\b|\bcat\b|\bgre\b/i, FileText],
    [/\brole\b|developer|engineer|career|position|professional/i, Code2],
    [/certif|award|badge/i, Award],
    [/skill|learn|project|foundation|fundamental|practice|build/i, Lightbulb],
    [/year|degree|semester|class|grade|school|college|university|tech\b|\bmca\b|\bbca\b|\bbsc\b|\bmsc\b|diploma|course|\bstd\b/i, GraduationCap]
];
const iconFor = (title) => ICONS.find(([re]) => re.test(title))?.[1] || BookOpen;

const box = ([l, r, t, b]) => ({ left: `${l}%`, width: `${r - l}%`, top: `${t}%`, height: `${b - t}%` });

/* ── The summit celebration (2026-10-27) ─────────────────────────────────
 * When the final step is reached (it becomes the current one) and again when it is completed:
 * the summit glows brighter, golden waves radiate from behind the badge, paper confetti bursts
 * and falls, the goal pill catches a golden highlight, a shimmer crosses the final step's card,
 * and everything settles into a quiet golden glow. Each of those two moments plays once per
 * goal (remembered on this device); a goal already completed gets a brief highlight once per
 * browser session; otherwise the summit just keeps its ambient glow.
 */
const SUMMIT_KEY = 'career:summit-celebrated';   // { goal, state: 'unlocked' | 'completed' }
const SUMMIT_SESSION = 'career:summit-seen';     // this session has seen the summit
// Each plan: [what begins, when (ms after the start)]. 'ambient' ends the celebration.
const PLANS = {
    full: [['glow', 0], ['waves', 300], ['confetti', 650], ['pill', 1100], ['sheen', 1500], ['ambient', 3900]],
    brief: [['glow', 0], ['waves', 300], ['pill', 600], ['ambient', 2300]],
    // Reduced motion: the same moments, still — a brighter glow and the pill's highlight, nothing moving.
    still: [['glow', 0], ['pill', 200], ['ambient', 2000]],
    settled: [['ambient', 0]]
};
// The paper: [colour, angle (deg, 0 = right, -90 = up), distance, shape]. Gold and champagne
// first, then coral, pink and a few cool notes; 18 pieces, spread all the way round.
const PAPER = [
    ['#f5c84c', -90, 1, 'r'], ['#f3e2b3', -70, 0.85, 'c'], ['#ff7f6b', -50, 1, 'r'], ['#f472b6', -30, 0.9, 'r'],
    ['#fbbf24', -10, 1, 'c'], ['#a78bfa', 10, 0.8, 'r'], ['#f5c84c', 30, 0.95, 'r'], ['#5eead4', 50, 0.75, 'c'],
    ['#ff7f6b', 75, 0.7, 'r'], ['#f3e2b3', 105, 0.7, 'r'], ['#f472b6', 130, 0.8, 'c'], ['#fbbf24', 150, 0.95, 'r'],
    ['#f5c84c', 170, 1, 'r'], ['#a78bfa', 190, 0.85, 'c'], ['#ff7f6b', 210, 1, 'r'], ['#f3e2b3', 230, 0.9, 'r'],
    ['#f472b6', 250, 1, 'c'], ['#fde68a', 270, 0.8, 'r']
];
// Tiny golden particles drifting up from the summit: [left %, delay s, size px].
const MOTES = [[30, 0, 3], [52, 0.9, 2], [70, 1.7, 3], [42, 2.5, 2], [62, 3.2, 2]];

/**
 * Runs the summit's moments on a timeline and says which are on. Only the copy of the stairs on
 * screen celebrates (the hero draws a hidden second one); the moment is recorded as seen only when
 * it actually starts, so React's double-run of effects in development cannot use it up unseen.
 * Every timer is cleared on the way out.
 */
function useSummitCelebration({ rootRef, finalState, goal, startAfter, reduced }) {
    const [marks, setMarks] = useState({});
    useEffect(() => {
        const el = rootRef.current;
        if (!finalState || !el || el.offsetParent === null) return undefined;
        let stored = null;
        try { stored = JSON.parse(localStorage.getItem(SUMMIT_KEY) || 'null'); } catch { /* none */ }
        let seenThisSession = false;
        try { seenThisSession = sessionStorage.getItem(SUMMIT_SESSION) === '1'; } catch { /* none */ }
        const { kind, fresh } = summitPlan({ finalState, goal, stored, seenThisSession, reduced });
        const timers = PLANS[kind].map(([name, ms], i) => setTimeout(() => {
            if (i === 0) {
                try { if (fresh) localStorage.setItem(SUMMIT_KEY, JSON.stringify({ goal, state: finalState })); } catch { /* replays next time */ }
                try { sessionStorage.setItem(SUMMIT_SESSION, '1'); } catch { /* replays next time */ }
            }
            setMarks(name === 'ambient' ? { ambient: true } : (m) => ({ ...m, [name]: true }));
        }, (kind === 'settled' ? 0 : startAfter) + ms));
        return () => timers.forEach(clearTimeout);
    }, [rootRef, finalState, goal, startAfter, reduced]);
    return marks;
}

export default function JourneyStairs({ phases = [], completedPhases = [], goal = '' }) {
    const total = phases.length;
    const finished = new Set(completedPhases.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < total));
    let done = 0;
    while (done < total && finished.has(done)) done += 1;

    // The summit celebration: the final step reached (current) or completed, once the scene has arrived.
    const rootRef = useRef(null);
    const [reduced] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    const finalState = !total ? null : done >= total ? 'completed' : done === total - 1 ? 'unlocked' : null;
    const celebrate = useSummitCelebration({ rootRef, finalState, goal, startAfter: 900, reduced });
    const settle = celebrate.ambient;

    // The clean scene, if it has been added: only then is the robot drawn (and moved) by the page.
    const [clean, setClean] = useState(false);
    useEffect(() => {
        const probe = new Image();
        probe.onload = () => setClean(true);
        probe.src = CLEAN_SCENE;
        return () => { probe.onload = null; };
    }, []);

    if (!total) return null;
    const slots = trailSlots(total, done);
    const stateOf = (k) => (finished.has(k) ? 'done' : k === done ? 'current' : 'locked');
    const reached = done >= total;

    return (
        // The frame: the picture's own proportions from a tablet up; a little taller on a phone, cropped at the sides.
        <div ref={rootRef} className="relative aspect-[1.35] w-full overflow-hidden bg-[#2b2350] sm:aspect-[2400/1478]"
            role="group" aria-label={`Career steps: ${finished.size} of ${total} done, ${total - finished.size} to go`}>
            <div className="@container/scene absolute top-0 left-1/2 h-full -translate-x-1/2" style={{ aspectRatio: `${RATIO}` }}>
                <img src={clean ? CLEAN_SCENE : SCENE} alt="A robot climbing a sunlit mountain trail toward a golden flag on the summit"
                    className="absolute inset-0 h-full w-full select-none" draggable={false} style={{ maxWidth: 'none', objectFit: 'cover' }} />

                {/* A light travelling up the trail, slow and faint. */}
                <svg viewBox="0 0 2400 1478" className="ch-trail pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    <defs>
                        <radialGradient id="ch-trail-glint"><stop offset="0" stopColor="#fffbe6" /><stop offset="0.4" stopColor="#fde68a" stopOpacity="0.9" /><stop offset="1" stopColor="#fbbf24" stopOpacity="0" /></radialGradient>
                    </defs>
                    <circle r="16" fill="url(#ch-trail-glint)">
                        <animateMotion dur="7s" repeatCount="indefinite" path={TRAIL} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
                        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="7s" repeatCount="indefinite" />
                    </circle>
                </svg>

                {/* ---- The summit: aura, waves, confetti and motes around the painted flag ---- */}
                <div className="pointer-events-none absolute" style={{ left: `${SUMMIT[0]}%`, top: `${SUMMIT[1]}%` }} aria-hidden>
                    <span className={`absolute top-0 left-0 h-[12cqw] w-[12cqw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/40 blur-2xl ${celebrate.glow && !settle ? 'ch-aura-burst' : settle ? 'ch-aura' : ''}`} />
                    {celebrate.glow && !settle && <span className="ch-summit-flare absolute top-0 left-0 -mt-[4cqw] -ml-[4cqw] h-[8cqw] w-[8cqw] rounded-full bg-[radial-gradient(circle,rgba(253,224,71,0.95)_0%,rgba(251,191,36,0.55)_40%,rgba(251,191,36,0)_70%)]" />}
                    {celebrate.waves && !settle && [0, 0.35, 0.7].map((d) => (
                        <span key={d} className="ch-wave-once absolute top-0 left-0 -mt-[3.5cqw] -ml-[3.5cqw] h-[7cqw] w-[7cqw] rounded-full border-2 border-amber-200/90 shadow-[0_0_14px_rgba(251,191,36,0.6)]" style={{ animationDelay: `${d}s` }} />
                    ))}
                    {settle && <span className="ch-wave-soft absolute top-0 left-0 -mt-[3.5cqw] -ml-[3.5cqw] h-[7cqw] w-[7cqw] rounded-full border border-amber-100/80" />}
                    {celebrate.confetti && !settle && PAPER.map(([color, deg, reach, shape], i) => {
                        const a = (deg * Math.PI) / 180; const r = 7 * reach;
                        return (
                            <span key={i} className="ch-paper absolute top-0 left-0"
                                style={{ width: shape === 'c' ? '0.45cqw' : '0.38cqw', height: shape === 'c' ? '0.45cqw' : '0.8cqw', borderRadius: shape === 'c' ? 9999 : 1, background: color,
                                    '--dx': `${(Math.cos(a) * r).toFixed(2)}cqw`, '--dy': `${(Math.sin(a) * r - 0.8).toFixed(2)}cqw`, '--fall': '7cqw', '--spin': `${(i % 2 ? 1 : -1) * (260 + i * 23)}deg`,
                                    animationDelay: `${(i % 6) * 0.03}s` }} />
                        );
                    })}
                    {(celebrate.confetti || settle) && MOTES.map(([left, delay, size]) => (
                        <span key={left} className="ch-gold-mote absolute rounded-full bg-amber-200 shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                            style={{ left: `${(left - 50) / 12}cqw`, top: '1cqw', width: size, height: size, animationDelay: `${delay}s`, '--rise': '-5cqw' }} />
                    ))}
                </div>

                {/* ---- The robot, beside the current step (or on the summit once every step is done) ----
                    From the same progress as the cards (robotPlace), on the ledge just left of that
                    step's pin. It glides to a new ledge when the step changes, with a hop as it lands. */}
                {clean && (() => {
                    const place = robotPlace(slots, total, done);
                    if (place == null) return null;
                    const n = slots.length;
                    const ledge = place === 'summit' ? SUMMIT_LEDGE : (() => {
                        const spot = spotFor(place, n);
                        const height = CLIMBER_HEIGHT[SPOTS.length - n + place];
                        const width = (height * CLIMBER_RATIO) / RATIO;
                        return { feet: [spot.pin[0] - width / 2 - 1.2, spot.pin[1] + 7.8], height };
                    })();
                    return (
                        <div aria-hidden className="ch-climber pointer-events-none absolute z-[1]"
                            style={{ left: `${ledge.feet[0]}%`, top: `${ledge.feet[1]}%`, height: `${ledge.height}%`, aspectRatio: `${CLIMBER_RATIO}`, transform: 'translate(-50%, -100%)' }}>
                            <img key={place} src={CLIMBER} alt="" draggable={false} className="ch-hop h-full w-full select-none drop-shadow-[0_1cqw_1.2cqw_rgba(40,20,60,0.45)]" style={{ maxWidth: 'none', animationDuration: '0.7s' }} />
                        </div>
                    );
                })()}

                {/* ---- The goal, over the painted pill: a gold GOAL tab with a flag, the student's own goal,
                    and an arrow toward the summit flag — filling the pill whatever the goal's length. ---- */}
                <span className={`absolute z-[3] flex items-stretch overflow-hidden rounded-full bg-white font-black whitespace-nowrap text-indigo-950 ring-[0.16em] shadow-[0_0_0_0.3em_rgba(252,211,77,0.35),0_0.7em_1.8em_-0.5em_rgba(120,72,10,0.5)] ${reached ? 'ring-emerald-300' : 'ring-amber-300'} ${celebrate.pill && !settle ? 'ch-goal-glow' : ''}`}
                    style={{ ...box(GOAL_PILL), fontSize: 'clamp(6px, 1.32cqw, 24px)' }}>
                    <span className={`flex shrink-0 items-center gap-[0.45em] px-[0.95em] text-[0.78em] tracking-[0.14em] text-white uppercase ${reached ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500'}`}>
                        {reached ? <Check className="h-[1.25em] w-[1.25em]" strokeWidth={3} /> : <Flag className="h-[1.2em] w-[1.2em] fill-white/30" strokeWidth={2.4} />}
                        {reached ? 'Reached' : 'Goal'}
                    </span>
                    <span className="flex min-w-0 flex-1 items-center px-[0.9em]">
                        <span className="min-w-0 truncate bg-gradient-to-r from-indigo-950 via-indigo-800 to-violet-700 bg-clip-text text-transparent">{goal || 'Your goal'}</span>
                    </span>
                    {/* Toward the flag on the summit. */}
                    <span aria-hidden className="flex shrink-0 items-center pr-[0.55em]">
                        <span className={`flex h-[1.65em] w-[1.65em] items-center justify-center rounded-full ${reached ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                            <ArrowRight className="h-[1em] w-[1em] -rotate-[25deg]" strokeWidth={2.8} />
                        </span>
                    </span>
                </span>

                {/* ---- The milestones on the trail: a numbered pin on each ledge, and its card ---- */}
                {slots.map((slot, i) => {
                    const spot = spotFor(i, slots.length);
                    const state = stateOf(slot);
                    const delay = { animationDelay: `${0.15 + i * 0.1}s` };
                    const pin = (
                        <span key={`pin-${i}`} aria-hidden className={`ch-step absolute z-[2] flex h-[3.5cqw] w-[3.5cqw] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[1.7cqw] font-black text-white shadow-[0_0.3cqw_0.8cqw_rgba(30,27,75,0.45)] ring-[0.25cqw] ring-white ${
                            state === 'done' ? 'bg-emerald-500' : state === 'current' ? 'bg-amber-400 !text-indigo-950' : spot.locked}`}
                            style={{ left: `${spot.pin[0]}%`, top: `${spot.pin[1]}%`, ...delay }}>
                            {slot + 1}
                        </span>
                    );
                    const k = slot;
                    const Icon = iconFor(phaseTitle(phases[k]));
                    return [pin,
                        <Link key={k} to="/career/roadmap" title={`Step ${k + 1}: ${phaseTitle(phases[k])}`} style={{ ...box(spot.card), ...delay, fontSize: 'clamp(5.5px, 1.15cqw, 22px)' }}
                            aria-label={`Step ${k + 1}: ${phaseTitle(phases[k])}${state === 'done' ? ', done' : state === 'current' ? ', now' : ', locked'}`}
                            aria-current={state === 'current' ? 'step' : undefined}
                            className={`ch-step absolute z-[2] flex items-center gap-[0.8em] overflow-hidden rounded-[0.9em] px-[0.9em] font-bold text-indigo-950 transition-transform duration-200 hover:-translate-y-0.5 ${
                                state === 'done' ? 'bg-white ring-2 ring-emerald-300 shadow-[0_0_1.4em_rgba(52,211,153,0.55)]'
                                    : state === 'current' ? 'ch-now bg-white ring-[0.18em] ring-amber-300'
                                        : 'bg-white ring-1 ring-white shadow-[0_0.8em_1.8em_-0.8em_rgba(30,27,75,0.45)]'}`}>
                            {state === 'current' && <span aria-hidden className="ch-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />}
                            {/* The final step, as the summit celebrates: one golden light sweep across its card. */}
                            {k === total - 1 && celebrate.sheen && !settle && <span aria-hidden className="ch-gold-sheen pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />}
                            <span className={`relative flex h-[2.3em] w-[2.3em] shrink-0 items-center justify-center rounded-full ${
                                state === 'done' ? 'bg-emerald-100 text-emerald-600' : state === 'current' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-500'}`}>
                                <Icon className="h-[1.15em] w-[1.15em]" strokeWidth={2.2} />
                            </span>
                            <span className="relative min-w-0 flex-1 truncate">{shortTitle(phases[k])}</span>
                            {state === 'done' && <span className="relative flex h-[1.8em] w-[1.8em] shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0.2em_0.6em_rgba(16,185,129,0.5)]"><Check className="h-[1.1em] w-[1.1em]" strokeWidth={3.5} /></span>}
                            {state === 'current' && <span className="relative flex shrink-0 items-center gap-[0.35em] rounded-full bg-amber-400 px-[0.8em] py-[0.25em] text-[0.9em] font-black text-indigo-950 uppercase shadow-[0_0.2em_0.6em_rgba(217,119,6,0.45)]"><Sparkles className="h-[1em] w-[1em]" />Now</span>}
                            {state === 'locked' && <span className="relative flex h-[1.8em] w-[1.8em] shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Lock className="h-[0.95em] w-[0.95em]" /></span>}
                        </Link>];
                })}

                {/* Some phases are not on the trail: the whole roadmap, one tap away. */}
                {total > slots.length && (
                    <Link to="/career/roadmap" className="ch-step absolute right-[2.5%] bottom-[3%] z-[3] inline-flex items-center gap-[0.45em] rounded-full bg-white px-[1em] py-[0.45em] font-black text-indigo-950 shadow-[0_0.6em_1.4em_-0.5em_rgba(30,27,75,0.5)] ring-1 ring-white transition-transform hover:-translate-y-0.5"
                        style={{ fontSize: 'clamp(7px, 1.1cqw, 18px)', animationDelay: '0.7s' }}>
                        View all {total} steps <ArrowRight className="h-[1.1em] w-[1.1em]" />
                    </Link>
                )}
            </div>
        </div>
    );
}
