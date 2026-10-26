/**
 * The climb to the goal, after the supplied design: a twilight mountain scene
 * — sunlit peaks, clouds, a golden flag in the sun's glow at the top — with a
 * glass staircase rising through it from the foot at bottom-left to the summit
 * at top-right. One slab per roadmap phase, smaller and further right as it
 * goes up, as a staircase seen from its foot; each slab has a plaque with the
 * step's short name and state (done, NOW, locked) and a landing on its left
 * to stand on. The plaques open the Roadmap; the mascot stands on the last
 * slab done.
 *
 * Progress is the roadmap's own: the phases marked complete (by index), and
 * the current one — the first not complete, as the Roadmap page decides it.
 *
 * Each newly finished phase, it climbs: one slab per hop, a rest on each, then
 * still. The last phase this device showed is remembered, so the climb is the
 * progress since the last visit (the first visit climbs from the ground once).
 *
 * Two drawings share one box: the scene, an SVG that keeps its shape; and the
 * slabs, an SVG stretched to the box so its percentages are the box's — which
 * is how the HTML plaques and the mascot land exactly on their slabs.
 *
 * `compact` (the phone band) shows the steps around the current one and folds
 * the rest: thirteen slabs do not fit a phone's width with their words.
 */
import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock, Sparkles, MoreHorizontal } from 'lucide-react';
import { phaseTitle, parseChoices } from '../../utils/roadmap';

// The phase the mascot last reached, on this device.
const SEEN_KEY = 'career:climb-step';
const lerp = (a, b, t) => a + (b - a) * t;

/** A phase's name, short enough for its plaque: the lead before a colon, no bracketed detail, capped. */
const shortTitle = (phase) => {
    const full = phaseTitle(phase);
    const lead = (parseChoices(full)?.lead || full).replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
    return lead.length > 30 ? `${lead.slice(0, 29).trim()}…` : lead;
};

/** The slabs on show: every phase; on a phone, the ones around the current, a folded gap, and the goal. */
const visibleSlots = (total, current, compact) => {
    if (!compact || total <= 6) return Array.from({ length: total }, (_, i) => i);
    const start = Math.max(0, Math.min(current - 2, total - 6));
    const end = Math.min(total - 2, start + 4);
    const slots = [];
    for (let i = start; i <= end; i += 1) slots.push(i);
    if (end < total - 2) slots.push({ gap: total - 2 - end });
    slots.push(total - 1);
    return slots;
};

/**
 * Where each slab sits, in % of the box (x to the right, `bottom` up from the
 * floor). A slab is its riser — the lit front face — with its tread on top;
 * the plaque sits on the tread from labelLeft to labelRight, leaving the
 * landing from slabLeft to stand on. Taken from the design: the bottom slab is
 * the biggest and nearest, each one up is a little smaller and further right.
 */
const geometry = (n, compact) => {
    const t = (i) => (n > 1 ? i / (n - 1) : 0);
    const scales = Array.from({ length: n }, (_, i) => lerp(1, 0.6, t(i)));
    const unit = Math.min(compact ? 16 : 11, (compact ? 86 : 85) / scales.reduce((a, b) => a + b, 0));
    let bottom = compact ? 1 : 2;
    return scales.map((s, i) => {
        const pitch = unit * s;
        const k = t(i);
        const slab = {
            bottom, pitch, riser: pitch * 0.28, tread: pitch * 0.72, scale: s,
            slabLeft: compact ? lerp(2, 34, k) : lerp(26, 72, k),
            labelLeft: compact ? lerp(9, 38, k) : lerp(33, 74.5, k),
            labelRight: compact ? lerp(93, 97, k) : lerp(75, 92.5, k),
            slabRight: compact ? lerp(95, 98, k) : lerp(78, 94, k),
            font: compact ? lerp(12, 10, k) : lerp(15, 10, k)
        };
        bottom += pitch;
        return slab;
    });
};

// The slab faces, per state: [tread, riser top, riser bottom, side].
const FACES = {
    locked: ['#efeafd', '#d9d1f5', '#fbf9ff', '#e5ddfb', '#a99cde'],
    done: ['#f6fdff', '#c5f1fa', '#ffffff', '#e1f7fb', '#8fd3e6'],
    current: ['#cdbdf8', '#b39df0', '#f3edff', '#dccfff', '#7c5fd3']
};

export default function JourneyStairs({ phases = [], completedPhases = [], compact = false, goal = '' }) {
    const total = phases.length;
    const finished = new Set(completedPhases.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < total));
    let done = 0;
    while (done < total && finished.has(done)) done += 1;
    // Ids of its own: the hero draws this twice (wide and narrow, one hidden), and a
    // gradient or filter found in the hidden copy paints nothing in the visible one.
    const uid = useId().replace(/:/g, '');
    const id = (name) => `${name}-${uid}`;

    // Whether the painted scene loaded: it has its own sun and flag, so the drawn ones step aside.
    const [painted, setPainted] = useState(false);

    const [fromPhase] = useState(() => {
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return done;
        try {
            const raw = localStorage.getItem(SEEN_KEY);
            return raw !== null && Number.isFinite(Number(raw)) ? Math.min(Number(raw), done) : 0;
        } catch { return 0; }
    });
    // The phase the mascot stands on: phase r reached = standing on phase r-1; -1 is the ground.
    const [stair, setStair] = useState(fromPhase - 1);
    useEffect(() => {
        if (stair >= done - 1) {
            try { localStorage.setItem(SEEN_KEY, String(done)); } catch { /* the climb replays next time */ }
            return undefined;
        }
        const timer = setTimeout(() => setStair((s) => s + 1), stair === fromPhase - 1 ? 700 : 950);
        return () => clearTimeout(timer);
    }, [stair, done, fromPhase]);

    if (!total) return null;
    const slots = visibleSlots(total, done, compact);
    const slabs = geometry(slots.length, compact);
    const stateOf = (slot) => (typeof slot === 'object' ? 'locked' : finished.has(slot) ? 'done' : slot === done ? 'current' : 'locked');
    // The slab the mascot stands on; below the first shown is the ground; folded away, the gap.
    const slotOf = (phase) => {
        const i = slots.indexOf(phase);
        if (i >= 0) return i;
        return phase < slots[0] ? -1 : slots.findIndex((s) => typeof s === 'object');
    };
    const on = stair < 0 ? -1 : slotOf(stair);
    const foot = slabs[0];
    const stand = on < 0
        ? { left: foot.slabLeft - 9, bottom: compact ? 0 : 1, height: foot.pitch * 3 }
        : { left: slabs[on].slabLeft + 0.5, bottom: slabs[on].bottom + slabs[on].pitch, height: slabs[on].pitch * 3.4 };
    stand.height = Math.max(compact ? 24 : 17, Math.min(compact ? 44 : 38, stand.height));
    const top = slabs[slabs.length - 1];
    // The side faces: a slanted parallelogram right of each slab (y is in box %, which is half an x %, so twice the lean).
    const SIDE_W = compact ? 1.2 : 1.6;
    const SIDE_UP = SIDE_W * 1.4;
    // The goal, marked by a trophy: on the painting's summit (about 88% across, 2% down, where
    // the scene is cropped to the box), else on the top slab's far corner, with the sun behind it.
    const poleX = painted ? 88.5 : top.slabRight - 1;
    const poleTop = painted ? 1.5 : 100 - (top.bottom + top.pitch) - 14;
    const reached = total - finished.size === 0;

    return (
        <div className="relative h-full w-full overflow-hidden" role="img" aria-label={`Career steps: ${done} of ${total} done, ${total - finished.size} to go`}>
            {/* ---- The scene: twilight sky, stars, three ranges with sunlit faces, trees, clouds, mist ---- */}
            <svg viewBox="0 0 200 100" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                    <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2a2370" /><stop offset="0.38" stopColor="#5a46b8" />
                        <stop offset="0.62" stopColor="#9a80d8" /><stop offset="0.86" stopColor="#e4b6dc" /><stop offset="1" stopColor="#fbd8bf" />
                    </linearGradient>
                    <linearGradient id={id('haze')} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#efe6fa" stopOpacity="0.95" /><stop offset="0.45" stopColor="#efe6fa" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8470d0" /><stop offset="1" stopColor="#5b4aad" /></linearGradient>
                    <linearGradient id={id('peak')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4d3ca3" /><stop offset="1" stopColor="#241c5f" /></linearGradient>
                    <linearGradient id={id('mist')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="0.9" /></linearGradient>
                    <filter id={id('soft')} x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="1.7" /></filter>
                </defs>
                <rect width="200" height="100" fill={`url(#${id('sky')})`} />
                <g fill="#fff">
                    {[[60, 10, 0.7], [90, 18, 0.5], [112, 7, 0.8], [130, 22, 0.5], [72, 30, 0.45], [150, 12, 0.7], [42, 20, 0.5], [100, 33, 0.4], [164, 6, 0.5]].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} opacity="0.85" />)}
                </g>
                {/* The far range, in the haze */}
                <polygon points="0,62 14,50 26,56 40,44 52,52 66,40 80,48 94,36 106,46 120,30 134,42 150,26 164,38 178,28 200,40 200,100 0,100" fill={`url(#${id('far')})`} opacity="0.7" />
                {/* The main peaks, their right faces lit by the setting sun */}
                <polygon points="60,100 84,56 96,40 108,52 122,30 136,16 150,34 160,24 176,46 190,36 200,46 200,100" fill={`url(#${id('peak')})`} />
                <polygon points="136,16 150,34 145,40 137,29" fill="#d9966c" opacity="0.72" />
                <polygon points="122,30 131,45 126,49 121,38" fill="#c98b62" opacity="0.6" />
                <polygon points="160,24 176,46 168,49 161,34" fill="#e2a97e" opacity="0.66" />
                <polygon points="96,40 108,52 102,56 97,48" fill="#b57a5a" opacity="0.5" />
                <polygon points="190,36 200,46 200,54 191,44" fill="#e2a97e" opacity="0.5" />
                {/* The near range on the left, dark, under the clouds */}
                <polygon points="0,74 10,64 22,70 34,60 46,68 58,58 72,72 86,66 100,82 100,100 0,100" fill="#3d2f8e" opacity="0.88" />
                {/* Trees on the right slope */}
                <polygon points="172,100 176,88 180,82 184,86 187,72 191,78 193,64 197,70 200,58 200,100" fill="#1f3a2d" />
                <polygon points="182,100 185,92 189,85 193,90 195,78 198,82 200,74 200,100" fill="#2f5c3b" opacity="0.9" />
                {/* Clouds: big and soft on the left, where the scene melts into the words; small ones at the right */}
                <g filter={`url(#${id('soft')})`}>
                    <ellipse cx="24" cy="70" rx="30" ry="12" fill="#fff" opacity="0.95" />
                    <ellipse cx="46" cy="60" rx="20" ry="9" fill="#fbe4ee" opacity="0.9" />
                    <ellipse cx="12" cy="90" rx="38" ry="13" fill="#fff" />
                    <ellipse cx="62" cy="80" rx="16" ry="7" fill="#fff" opacity="0.75" />
                    <ellipse cx="80" cy="46" rx="12" ry="5" fill="#ffe6ee" opacity="0.8" />
                    <ellipse cx="184" cy="90" rx="24" ry="10" fill="#fff" opacity="0.92" />
                    <ellipse cx="166" cy="99" rx="34" ry="9" fill="#f1e6ff" opacity="0.95" />
                    <ellipse cx="120" cy="98" rx="44" ry="8" fill="#fff" opacity="0.6" />
                </g>
                <rect x="0" y="82" width="200" height="18" fill={`url(#${id('mist')})`} />
                <rect width="200" height="100" fill={`url(#${id('haze')})`} />
            </svg>

            {/* The painted scene, when its file is there (public/illustrations/career-climb-bg.jpg):
                it covers the drawn one above. Missing, it hides itself and the drawn scene shows.
                Sized inline: the section's stylesheet gives every img `height: auto`. */}
            <img src="/illustrations/career-climb-bg.jpg" alt="" aria-hidden className="absolute inset-0"
                style={{ width: '100%', height: '100%', maxWidth: 'none', objectFit: 'cover', objectPosition: 'right bottom' }}
                onLoad={() => setPainted(true)} onError={(e) => { e.currentTarget.style.display = 'none'; }} />

            {/* The sun, behind the flag — drawn only while the scene is */}
            {!painted && <div aria-hidden className="pointer-events-none absolute h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,243,196,0.95),rgba(255,214,150,0.45)_38%,transparent_70%)]"
                style={{ left: `${poleX + 3}%`, top: `${poleTop + 4}%` }} />}

            {/* ---- The slabs, stretched to the box so these percentages are the box's ---- */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
                <defs>
                    {Object.entries(FACES).map(([state, [t1, t2, r1, r2]]) => (
                        <g key={state}>
                            <linearGradient id={id(`tread-${state}`)} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={t1} /><stop offset="1" stopColor={t2} /></linearGradient>
                            <linearGradient id={id(`riser-${state}`)} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={r1} /><stop offset="1" stopColor={r2} /></linearGradient>
                        </g>
                    ))}
                    <filter id={id('edge')} x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="0.6" /></filter>
                    <filter id={id('under')} x="-10%" y="-100%" width="120%" height="300%"><feGaussianBlur stdDeviation="1.4" /></filter>
                </defs>
                {/* Top slab first: the lower, nearer slabs overlap the ones above */}
                {[...slabs].map((s, i) => ({ s, i })).reverse().map(({ s, i }) => {
                    const state = stateOf(slots[i]);
                    const side = FACES[state][4];
                    const treadTop = 100 - (s.bottom + s.pitch);
                    const treadBot = 100 - (s.bottom + s.riser);
                    const riserBot = 100 - s.bottom;
                    return (
                        <g key={i}>
                            {/* A soft shadow under the slab, on the one below */}
                            <rect x={s.slabLeft + 1} y={riserBot - 0.4} width={s.slabRight - s.slabLeft} height="2.2" fill="#3b2a7a" opacity="0.28" filter={`url(#${id('under')})`} />
                            <polygon points={`${s.slabRight},${treadTop} ${s.slabRight + SIDE_W},${treadTop - SIDE_UP} ${s.slabRight + SIDE_W},${riserBot - SIDE_UP} ${s.slabRight},${riserBot}`} fill={side} />
                            <polygon points={`${s.slabLeft},${treadTop} ${s.slabLeft + SIDE_W},${treadTop - SIDE_UP} ${s.slabRight + SIDE_W},${treadTop - SIDE_UP} ${s.slabRight},${treadTop}`} fill="#fff" opacity="0.55" />
                            <rect x={s.slabLeft} y={treadTop} width={s.slabRight - s.slabLeft} height={s.tread} fill={`url(#${id(`tread-${state}`)})`} />
                            <rect x={s.slabLeft} y={treadBot} width={s.slabRight - s.slabLeft} height={s.riser} fill={`url(#${id(`riser-${state}`)})`} />
                            {/* The lit front edge: warm near the foot, where the light comes from; violet above */}
                            <rect x={s.slabLeft} y={riserBot - 0.5} width={s.slabRight - s.slabLeft} height="0.9" fill={i < 3 ? '#ffd27a' : state === 'done' ? '#a5f3fc' : '#c4b5fd'} opacity="0.95" filter={`url(#${id('edge')})`} />
                            <rect x={s.slabLeft} y={treadBot - 0.25} width={s.slabRight - s.slabLeft} height="0.5" fill="#fff" opacity="0.8" />
                        </g>
                    );
                })}
            </svg>

            {/* The goal on the summit: a glowing trophy, named; a celebration once every step is done */}
            <div className="absolute z-[6] flex items-center gap-1.5" style={{ right: `calc(${100 - poleX}% - ${compact ? 0.9 : 1.15}rem)`, top: `${poleTop}%` }}>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 font-black shadow-md ring-1 ${compact ? 'text-[0.55rem]' : 'text-[0.66rem]'} ${
                    reached ? 'bg-emerald-500 text-white ring-emerald-200' : 'bg-white/92 text-amber-700 ring-amber-300'}`}>
                    {reached ? `You reached ${goal || 'your goal'}! 🎉` : <><span className="uppercase tracking-wide">Goal</span>{goal ? ` · ${goal}` : ''}</>}
                </span>
                <span className="relative flex shrink-0 items-center justify-center">
                    <span aria-hidden className={`absolute rounded-full bg-amber-300/70 blur-md animate-pulse ${compact ? 'h-12 w-12' : 'h-16 w-16'}`} />
                    {/* Waves spreading out from the trophy, one after another */}
                    {[0, 0.8, 1.6].map((delay) => (
                        <span key={delay} aria-hidden className={`ch-wave absolute rounded-full border-2 border-amber-300 ${compact ? 'h-10 w-10' : 'h-14 w-14'}`} style={{ animationDelay: `${delay}s` }} />
                    ))}
                    {/* The trophy (public/illustrations/goal-trophy.png), sized inline: the section's stylesheet gives every img `height: auto`. */}
                    <img src="/illustrations/goal-trophy.png" alt="" className="relative drop-shadow-[0_4px_10px_rgba(180,83,9,0.45)]"
                        style={{ height: compact ? '2.6rem' : '3.7rem', width: 'auto', maxWidth: 'none' }} />
                </span>
            </div>

            {/* ---- The plaques on the treads: number, short name, state; each opens the Roadmap ---- */}
            {slots.map((slot, i) => {
                const s = slabs[i];
                const state = stateOf(slot);
                const style = {
                    left: `${s.labelLeft}%`, width: `${s.labelRight - s.labelLeft}%`,
                    top: `${100 - (s.bottom + s.pitch) + s.tread * 0.08}%`, height: `${s.tread * 0.84}%`,
                    fontSize: `${s.font}px`
                };
                if (typeof slot === 'object') {
                    return (
                        <div key="gap" style={style} className="absolute flex items-center gap-[0.5em] rounded-[0.55em] border border-dashed border-indigo-300 bg-white/70 px-[0.8em] font-semibold text-indigo-600">
                            <MoreHorizontal className="h-[1.1em] w-[1.1em] shrink-0" /> {slot.gap} more step{slot.gap === 1 ? '' : 's'}
                        </div>
                    );
                }
                const k = slot;
                return (
                    <Link key={k} to="/career/roadmap" title={`Step ${k + 1}: ${phaseTitle(phases[k])}`} style={style}
                        className={`absolute flex items-center gap-[0.55em] rounded-[0.55em] px-[0.7em] font-semibold transition-transform duration-200 hover:-translate-y-px ${
                            state === 'done' ? 'bg-[linear-gradient(90deg,#ffffff_0%,#f0fbff_45%,#b6f0fb_100%)] text-indigo-950 shadow-[0_0_16px_rgba(125,211,252,0.75)]'
                                : state === 'current' ? 'z-[5] bg-[linear-gradient(90deg,#5b21b6_0%,#7c3aed_55%,#9b5cf6_100%)] text-white shadow-[0_0_24px_rgba(139,92,246,0.95)] ring-1 ring-white/50'
                                    : 'bg-[linear-gradient(90deg,rgba(255,255,255,0.94),rgba(240,236,254,0.94))] text-indigo-950 shadow-[0_2px_8px_rgba(76,29,149,0.18)]'}`}>
                        <span className={`flex h-[1.55em] min-w-[1.55em] shrink-0 items-center justify-center rounded-full px-[0.3em] text-[0.82em] font-bold ${
                            state === 'current' ? 'bg-amber-200 text-violet-800' : 'bg-slate-200/90 text-slate-600'}`}>{k + 1}</span>
                        <span className="min-w-0 flex-1 truncate">{shortTitle(phases[k])}</span>
                        {state === 'done' && <Check className="h-[1.25em] w-[1.25em] shrink-0 text-emerald-500" strokeWidth={3.5} />}
                        {state === 'current' && <span className="flex shrink-0 items-center gap-[0.3em] rounded-full bg-violet-400/70 px-[0.65em] py-[0.12em] text-[0.82em] font-bold uppercase ring-1 ring-white/60"><Sparkles className="h-[1em] w-[1em]" />Now</span>}
                        {state === 'locked' && <Lock className="h-[1.05em] w-[1.05em] shrink-0 text-slate-500" />}
                    </Link>
                );
            })}

            {/* The mascot on the last slab done; each hop (keyed on the slab) is one step up.
                Its size is set inline: the section's stylesheet gives every img `height: auto`. */}
            <div className="pointer-events-none absolute z-10 transition-all duration-300 ease-out"
                style={{ left: `${stand.left}%`, bottom: `${stand.bottom}%`, height: `${stand.height}%` }}>
                {/* The climbing robot (public/mascot/climber.png) when its file is there; the mascot until then. */}
                <img key={stair} src="/mascot/climber.png" alt=""
                    className={`${stair !== fromPhase - 1 ? 'ch-hop ' : ''}drop-shadow-[0_8px_16px_rgba(59,30,120,0.5)]`}
                    style={{ height: '100%', width: 'auto', maxWidth: 'none', animationDuration: '0.6s' }}
                    onError={(e) => { if (!e.currentTarget.dataset.fallback) { e.currentTarget.dataset.fallback = '1'; e.currentTarget.src = '/mascot/point.png'; } }} />
            </div>
        </div>
    );
}
