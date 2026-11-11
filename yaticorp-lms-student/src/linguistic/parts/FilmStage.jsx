/**
 * A story film's scene acted out in 2D comic style (2026-11-07, asked: "generate comic scenes and 2D characters for
 * this film … make those characters interactive"), for StoryFilm.jsx whenever a scene has no video of its own yet.
 * The places (Arjun's room in the morning, the bus stop in the rain, the office, the street at evening), the people
 * where each line puts them (`line.at`: x %, pose, facing, sitting, holding, walking or running in), lips moving
 * while they speak, blinking and breathing, the camera moving in, the auto-rickshaw driving off. Tap someone: they hop
 * and say their line (`onTap`).
 *
 * The people (2026-11-07, "make the characters the best"): all three in one rounded, softly shaded cartoon style
 * (`Figure`, `LOOK`) — Arjun after his character sheet, Ravi and the interviewer to match — and the camera moves in on
 * whoever speaks.
 */
import { useEffect, useState } from 'react';

const W = 1280;
const H = 720;
const GROUND = 640;
const INK = '#1b1b1b';


const CSS = `
.sf-fig { transition: transform var(--dur, 0s) linear, opacity .5s ease; cursor: pointer; }
.sf-walk .sf-leg-a { animation: sf-leg .52s ease-in-out infinite alternate; }
.sf-walk .sf-leg-b { animation: sf-leg .52s ease-in-out infinite alternate-reverse; }
.sf-walk .sf-arm-swing { animation: sf-swing .52s ease-in-out infinite alternate; }
.sf-walk .sf-body { animation: sf-bob .26s ease-in-out infinite alternate; }
.sf-run .sf-leg-a, .sf-run .sf-leg-b, .sf-run .sf-arm-swing { animation-duration: .3s; }
.sf-run .sf-body { animation-duration: .15s; }
.sf-idle .sf-body { animation: sf-breathe 3.4s ease-in-out infinite; }
.sf-talking .sf-gesture { animation: sf-gesture 1.4s ease-in-out infinite; }
.sf-talking .sf-head { animation: sf-nod 1.6s ease-in-out infinite; }
.sf-eyes { transform-box: fill-box; transform-origin: center; animation: sf-blink 5s infinite; }
.sf-hop { animation: sf-hop .6s cubic-bezier(.3,.7,.4,1); }
.sf-driveoff { animation: sf-drive 2.6s ease-in forwards; }
.sf-hands { animation: sf-tick 6s linear infinite; transform-origin: 0 0; }
.sf-cloud { animation: sf-drift 18s ease-in-out infinite alternate; }
.sf-rain i { position: absolute; top: -20%; width: 1.5px; height: 12%; background: linear-gradient(transparent, rgba(220,235,255,.7)); animation: sf-rain var(--dur, .6s) linear infinite; animation-delay: var(--delay, 0s); }
@keyframes sf-leg { from { transform: rotate(-22deg); } to { transform: rotate(22deg); } }
@keyframes sf-swing { from { transform: rotate(18deg); } to { transform: rotate(-18deg); } }
@keyframes sf-bob { from { transform: translateY(0); } to { transform: translateY(-7px); } }
@keyframes sf-breathe { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.5px); } }
@keyframes sf-gesture { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-16deg); } }
@keyframes sf-nod { 0%, 100% { transform: rotate(0deg); } 35% { transform: rotate(-4deg); } 70% { transform: rotate(2deg); } }
@keyframes sf-blink { 0%, 95%, 100% { transform: scaleY(1); } 97% { transform: scaleY(.1); } }
@keyframes sf-hop { 0%, 100% { transform: translateY(0); } 40% { transform: translateY(-40px); } 70% { transform: translateY(0); } 85% { transform: translateY(-10px); } }
@keyframes sf-drive { to { transform: translateX(900px); } }
@keyframes sf-tick { to { transform: rotate(360deg); } }
@keyframes sf-drift { from { transform: translateX(-20px); } to { transform: translateX(30px); } }
@keyframes sf-rain { to { transform: translate(-30px, 900%); } }
@media (prefers-reduced-motion: reduce) { .sf-fig { transition: opacity .5s ease; } .sf-walk *, .sf-idle *, .sf-talking *, .sf-eyes, .sf-hands, .sf-cloud, .sf-rain i { animation: none !important; } }
`;

/* ── The people: one cartoon style for all three, the same look in every scene ── */
/**
 * Each person's look (2026-11-07, "make the characters the best — a perfect cartoon style"): rounded shapes with soft
 * shading for a 3D-cartoon feel, big expressive eyes, the clothes and hair that make them who they are.
 */
const LOOK = {
    arjun: {
        height: 0.94, skin: ['#f3c39b', '#e2a77c', '#c98a62'], hair: 'curly', hairColor: ['#4a3227', '#1e1410'], brow: '#2a1c15',
        top: 'shirt', cloth: ['#b9cff6', '#8fb0ee', '#6f92da'], edge: '#5f7fc4', legs: ['#3a4670', '#222a47'], shoes: 'sneakers', backpack: true, watch: true, belt: true
    },
    ravi: {
        height: 0.9, skin: ['#e7b18a', '#c99367', '#a8754e'], hair: 'balding', hairColor: ['#ffffff', '#d9d9d9'], brow: '#c9c9c9', beard: true, moustache: true, glasses: true, wrinkles: true,
        top: 'kurta', cloth: ['#f4e9d2', '#e6d4b0', '#cdb68a'], edge: '#a8916a', legs: ['#f6f3ea', '#dcd6c6'], shoes: 'sandals', shawl: ['#9e9e9e', '#757575'], stoop: true
    },
    interviewer: {
        height: 1, skin: ['#efb98f', '#d49c70', '#b37a52'], hair: 'neat', hairColor: ['#3b2b22', '#14100d'], brow: '#1e1612', moustache: true,
        top: 'suit', cloth: ['#3b528f', '#2a3d73', '#1c2a55'], edge: '#16214a', legs: ['#2a3d73', '#1c2a55'], shoes: 'formal', tie: '#4f7dd1', shirt: '#ffffff'
    }
};

/** Arms by pose: [elbow dx, dy, hand dx, dy] from the shoulder — the back arm, then the front one. */
const ARMS = {
    stand: [[-30, 72, -30, 146], [30, 72, 30, 146]],
    talk: [[-30, 72, -30, 146], [44, 62, 92, 34]],
    give: [[-30, 72, -30, 146], [52, 50, 112, 56]],
    sad: [[-22, 72, -6, 138], [22, 72, 6, 138]],
    surprise: [[-44, 44, -46, -6], [44, 44, 50, -6]],
    cheer: [[-46, -6, -52, -84], [46, -6, 52, -84]],
    run: [[-44, 50, -6, 92], [40, 56, 86, 26]],
    sit: [[-26, 70, 18, 110], [30, 66, 70, 92]],
    sitTalk: [[-26, 70, 18, 110], [44, 52, 90, 26]]
};
const MOOD = { sad: 'worried', surprise: 'surprised', cheer: 'glad', give: 'glad' };
// Brows over each eye (eyes at x 10 and 38).
const BROWS = {
    calm: ['M -1 -22 Q 10 -29 21 -24', 'M 27 -24 Q 38 -29 49 -22'],
    worried: ['M -1 -21 Q 9 -22 20 -29', 'M 28 -29 Q 39 -22 49 -21'],
    surprised: ['M -1 -27 Q 10 -37 21 -30', 'M 27 -30 Q 38 -37 49 -27'],
    glad: ['M -1 -23 Q 10 -31 21 -25', 'M 27 -25 Q 38 -31 49 -23']
};
const CURLS = [[-34, -14, 15], [-30, -36, 17], [-14, -52, 18], [4, -62, 19], [24, -64, 19], [44, -56, 18], [58, -40, 16], [64, -20, 13], [-12, -34, 15], [10, -44, 16], [32, -44, 16], [50, -32, 14], [-38, 6, 11]];

/** A person, feet at (0, 0), facing right. `mouth` 0 closed, 1–2 open as the words are said; `moving`, `run`, `sit`. */
function Figure({ who, pose = 'stand', sit, holds, mouth, moving, run }) {
    const L = LOOK[who];
    if (!L) return null;
    const id = `tn-${who}`;
    const hip = sit ? -122 : -196;
    const shoulder = hip - 142;
    const head = shoulder - 76;
    const mood = MOOD[pose] || 'calm';
    const armSet = moving && run ? 'run' : moving ? 'stand' : sit ? (pose === 'talk' || pose === 'give' ? 'sitTalk' : pose === 'sad' ? 'sad' : pose === 'surprise' ? 'surprise' : pose === 'cheer' ? 'cheer' : 'sit') : pose;
    const arms = ARMS[armSet] || ARMS.stand;
    const sleeve = `url(#${id}-cloth)`;
    const arm = ([ex, ey, hx, hy], k, cls) => {
        const sx = k ? 30 : -30;
        const sy = shoulder + 10;
        // A shirt's rolled sleeve ends at the forearm; a kurta's or a jacket's sleeve runs to the wrist.
        const f = L.top === 'shirt' ? 0.62 : 0.92;
        const mx = sx + (ex - sx) * f, my = sy + ey * f;
        const end = L.top === 'shirt' ? [mx, my] : [ex + (hx - ex) * 0.72, sy + ey + (hy - ey) * 0.72];
        return (
            <g className={cls} style={{ transformOrigin: `${sx}px ${sy}px` }}>
                <path d={`M ${end[0]} ${end[1]} L ${hx} ${sy + hy}`} stroke={L.skin[2]} strokeWidth="22" strokeLinecap="round" fill="none" />
                <path d={`M ${end[0]} ${end[1]} L ${hx} ${sy + hy}`} stroke={L.skin[1]} strokeWidth="17" strokeLinecap="round" fill="none" />
                {L.top === 'shirt' && <path d={`M ${mx} ${my} L ${ex} ${sy + ey} L ${hx} ${sy + hy}`} stroke={L.skin[2]} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
                {L.top === 'shirt' && <path d={`M ${mx} ${my} L ${ex} ${sy + ey} L ${hx} ${sy + hy}`} stroke={L.skin[1]} strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
                <path d={L.top === 'shirt' ? `M ${sx} ${sy} L ${mx} ${my}` : `M ${sx} ${sy} L ${ex} ${sy + ey} L ${end[0]} ${end[1]}`} stroke={L.edge} strokeWidth="34" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d={L.top === 'shirt' ? `M ${sx} ${sy} L ${mx} ${my}` : `M ${sx} ${sy} L ${ex} ${sy + ey} L ${end[0]} ${end[1]}`} stroke={sleeve} strokeWidth="28" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {L.top === 'shirt' && <circle cx={mx} cy={my} r="15" fill={L.cloth[1]} stroke={L.edge} strokeWidth="3" />}
                {L.top === 'suit' && <circle cx={end[0]} cy={end[1]} r="11" fill={L.shirt} stroke="#cfd8dc" strokeWidth="2" />}
                {k === 0 && L.watch && <circle cx={ex + (hx - ex) * 0.8} cy={sy + ey + (hy - ey) * 0.8} r="10" fill="#2a2a2a" stroke="#666" strokeWidth="3" />}
                <circle cx={hx} cy={sy + hy + 3} r="14" fill={`url(#${id}-skin)`} stroke={L.skin[2]} strokeWidth="3" />
                {k === 1 && holds === 'papers' && <g transform={`translate(${hx + 2} ${sy + hy - 24}) rotate(-10)`}><rect width="50" height="62" rx="5" fill="#2f6fb5" stroke="#1d4f8a" strokeWidth="3" /><rect x="7" y="7" width="36" height="48" rx="2" fill="#f7f4ea" /><path d="M 13 20 H 37 M 13 30 H 37 M 13 40 H 29" stroke="#b0bec5" strokeWidth="2.5" /></g>}
                {k === 1 && holds === 'phone' && <g transform={`translate(${hx - 9} ${sy + hy - 40})`}><rect width="20" height="36" rx="5" fill="#263238" stroke="#111" strokeWidth="2" /><rect x="3" y="4" width="14" height="26" rx="2" fill="#4fc3f7" /></g>}
            </g>
        );
    };
    // The mouth: open as the words come; else by mood.
    const mouthShape = mouth
        ? <g><ellipse cx="24" cy="34" rx="11" ry={mouth === 2 ? 9 : 5} fill="#6b2622" /><path d={`M 14 ${mouth === 2 ? 28 : 31} Q 24 ${mouth === 2 ? 25 : 29} 34 ${mouth === 2 ? 28 : 31}`} stroke="#fff" strokeWidth="3" fill="none" /></g>
        : mood === 'surprised' ? <ellipse cx="24" cy="35" rx="7" ry="9" fill="#6b2622" />
            : mood === 'glad' ? <path d="M 10 30 Q 24 46 38 30 Q 24 36 10 30 Z" fill="#6b2622" stroke="#8a3a30" strokeWidth="2" />
                : mood === 'worried' ? <path d="M 14 36 Q 24 31 34 36" stroke="#8a3a30" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                    : <path d="M 13 32 Q 24 40 35 32" stroke="#8a3a30" strokeWidth="3.5" fill="none" strokeLinecap="round" />;
    const legs = sit
        ? [-12, 12].map((dx, k) => (
            <g key={dx}>
                <path d={`M ${dx - 4} ${hip} L ${dx + 66} ${hip} L ${dx + 66} -24`} stroke={L.legs[1]} strokeWidth="38" strokeLinejoin="round" strokeLinecap="round" fill="none" />
                <path d={`M ${dx - 4} ${hip} L ${dx + 66} ${hip} L ${dx + 66} -24`} stroke={`url(#${id}-legs)`} strokeWidth="32" strokeLinejoin="round" strokeLinecap="round" fill="none" />
                <Shoe kind={L.shoes} x={dx + 66 - 24 + k * 2} />
            </g>
        ))
        : ['sf-leg-a', 'sf-leg-b'].map((cls, k) => (
            <g key={cls} className={cls} style={{ transformOrigin: `0px ${hip}px` }}>
                <rect x={k ? -2 : -32} y={hip} width="34" height={-hip - 18} rx="15" fill={`url(#${id}-legs)`} stroke={L.legs[1]} strokeWidth="2" />
                <Shoe kind={L.shoes} x={k ? -4 : -34} />
            </g>
        ));
    return (
        <g>
            <defs>
                <linearGradient id={`${id}-cloth`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={L.cloth[0]} /><stop offset=".55" stopColor={L.cloth[1]} /><stop offset="1" stopColor={L.cloth[2]} /></linearGradient>
                <linearGradient id={`${id}-legs`} x1="0" x2="1"><stop offset="0" stopColor={L.legs[0]} /><stop offset="1" stopColor={L.legs[1]} /></linearGradient>
                <radialGradient id={`${id}-skin`} cx=".38" cy=".35" r=".75"><stop offset="0" stopColor={L.skin[0]} /><stop offset=".7" stopColor={L.skin[1]} /><stop offset="1" stopColor={L.skin[2]} /></radialGradient>
                <radialGradient id={`${id}-hair`} cx=".4" cy=".3" r=".8"><stop offset="0" stopColor={L.hairColor[0]} /><stop offset="1" stopColor={L.hairColor[1]} /></radialGradient>
                {L.shawl && <linearGradient id={`${id}-shawl`} x1="0" x2="1"><stop offset="0" stopColor={L.shawl[0]} /><stop offset="1" stopColor={L.shawl[1]} /></linearGradient>}
            </defs>
            <ellipse cx={sit ? 30 : 0} cy="4" rx="82" ry="13" fill="rgba(0,0,0,.25)" />
            {sit && <Seat hip={hip} office={L.top === 'suit'} />}
            <g className="sf-body" transform={moving && run ? `rotate(8 0 ${hip})` : L.stoop && !sit ? `rotate(3 0 ${hip})` : undefined}>
                {legs}
                {L.backpack && <g><rect x="-80" y={shoulder + 4} width="64" height="152" rx="24" fill="#2b2f38" stroke="#16181d" strokeWidth="3" /><rect x="-72" y={shoulder + 72} width="46" height="56" rx="13" fill="#383d49" /><path d="M -72 ${shoulder + 40} h 46" stroke="#4a505d" strokeWidth="3" /></g>}
                {arm(arms[0], 0, moving ? 'sf-arm-swing' : undefined)}
                {/* The body: shirt, kurta (to the knees) or suit */}
                <path d={`M -46 ${shoulder + 6} Q -54 ${hip - 70} ${L.top === 'kurta' ? -52 : -40} ${hip + (L.top === 'kurta' ? (sit ? 30 : 92) : 8)} L ${L.top === 'kurta' ? 52 : 40} ${hip + (L.top === 'kurta' ? (sit ? 30 : 92) : 8)} Q 54 ${hip - 70} 46 ${shoulder + 6} Q 0 ${shoulder - 12} -46 ${shoulder + 6} Z`}
                    fill={`url(#${id}-cloth)`} stroke={L.edge} strokeWidth="3" />
                {L.top === 'shirt' && (
                    <g>
                        <path d={`M 2 ${shoulder + 2} L 2 ${hip}`} stroke={L.cloth[2]} strokeWidth="2.5" />
                        {[30, 62, 94, 126].map((dy) => <circle key={dy} cx="6" cy={shoulder + dy} r="2.6" fill="#eef3fd" />)}
                        <rect x="14" y={shoulder + 40} width="22" height="24" rx="3" fill="none" stroke={L.cloth[2]} strokeWidth="2.5" />
                        <path d={`M -18 ${shoulder - 2} L 2 ${shoulder + 22} L 22 ${shoulder - 2} L 10 ${shoulder - 8} L 2 ${shoulder + 6} L -6 ${shoulder - 8} Z`} fill={L.cloth[0]} stroke={L.edge} strokeWidth="2.5" />
                    </g>
                )}
                {L.top === 'kurta' && <g><path d={`M 2 ${shoulder} L 2 ${shoulder + 60}`} stroke={L.edge} strokeWidth="2.5" />{[16, 32, 48].map((dy) => <circle key={dy} cx="7" cy={shoulder + dy} r="2.6" fill="#8d7a55" />)}<path d={`M -12 ${shoulder - 4} Q 2 ${shoulder + 6} 16 ${shoulder - 4}`} stroke={L.edge} strokeWidth="3" fill="none" /></g>}
                {L.top === 'suit' && (
                    <g>
                        <path d={`M -16 ${shoulder - 4} L 2 ${shoulder + 74} L 20 ${shoulder - 4} Z`} fill={L.shirt} stroke="#cfd8dc" strokeWidth="2" />
                        <path d={`M -6 ${shoulder + 2} L 10 ${shoulder + 2} L 13 ${shoulder + 66} L 2 ${shoulder + 80} L -9 ${shoulder + 66} Z`} fill={L.tie} stroke="#2f5aa8" strokeWidth="2" />
                        <path d={`M -18 ${shoulder - 6} L -4 ${shoulder + 78} L -30 ${shoulder + 30} Z M 22 ${shoulder - 6} L 8 ${shoulder + 78} L 34 ${shoulder + 30} Z`} fill={L.cloth[2]} stroke={L.edge} strokeWidth="2.5" />
                        {[96, 120].map((dy) => <circle key={dy} cx="2" cy={shoulder + dy} r="3.5" fill="#0f1733" />)}
                        <path d={`M 22 ${shoulder + 56} h 16`} stroke="#fff" strokeWidth="4" strokeLinecap="round" />
                    </g>
                )}
                {L.belt && <g><rect x="-40" y={hip - 4} width="80" height="14" rx="4" fill="#5b3a26" /><rect x="-4" y={hip - 6} width="16" height="18" rx="3" fill="none" stroke="#cfd4da" strokeWidth="3" /></g>}
                {L.backpack && <path d={`M -34 ${shoulder + 2} Q -26 ${shoulder + 60} -34 ${hip - 6}`} stroke="#1f2228" strokeWidth="11" fill="none" strokeLinecap="round" />}
                {/* A shawl over both shoulders, its end hanging in front */}
                {L.shawl && <path d={`M -50 ${shoulder + 2} Q 0 ${shoulder + 46} 50 ${shoulder + 2} L 48 ${shoulder + 40} L 40 ${shoulder + 120} L 22 ${shoulder + 118} L 26 ${shoulder + 54} Q 0 ${shoulder + 74} -46 ${shoulder + 50} Z`} fill={`url(#${id}-shawl)`} stroke="#616161" strokeWidth="2.5" />}
                {/* Neck and head */}
                <rect x="-12" y={shoulder - 28} width="26" height="34" rx="10" fill={L.skin[2]} />
                <g className="sf-head" style={{ transformOrigin: `0px ${shoulder - 8}px` }}>
                    <g transform={pose === 'sad' ? `rotate(8 0 ${shoulder - 8})` : undefined}>
                        <g transform={`translate(-8 ${head})`}>
                            <ellipse cx="-28" cy="6" rx="10" ry="15" fill={L.skin[1]} stroke={L.skin[2]} strokeWidth="2" />
                            <ellipse cx="14" cy="0" rx="46" ry="54" fill={`url(#${id}-skin)`} />
                            <Hair kind={L.hair} id={id} />
                            {L.wrinkles && <path d="M 0 -36 Q 14 -40 30 -36 M 4 -44 Q 16 -47 28 -44 M -2 12 Q 0 22 6 26 M 46 12 Q 46 22 40 26" stroke="rgba(120,70,40,.35)" strokeWidth="2.2" fill="none" strokeLinecap="round" />}
                            <g className="sf-eyes">
                                {[10, 38].map((ex) => (
                                    <g key={ex} transform={`translate(${ex} -2)`}>
                                        <ellipse cx="0" cy="0" rx="10" ry={mood === 'surprised' ? 12 : 11} fill="#fff" stroke="#6b4a3a" strokeWidth="1.5" />
                                        <circle cx="2" cy="1" r="7" fill="#5a3418" /><circle cx="2" cy="1" r="3.6" fill="#1a0e08" /><circle cx="4.5" cy="-2.5" r="2.2" fill="#fff" />
                                        <path d={L.wrinkles ? 'M -10 -2 Q 0 -10 10 -2' : 'M -10 -4 Q 0 -13 10 -4'} stroke="#2a1c15" strokeWidth="3" fill={L.wrinkles ? L.skin[1] : 'none'} />
                                    </g>
                                ))}
                            </g>
                            {L.glasses && <g fill="rgba(255,255,255,.12)" stroke="#5d4037" strokeWidth="3"><circle cx="10" cy="-2" r="15" /><circle cx="38" cy="-2" r="15" /><path d="M 25 -4 Q 24 -8 23 -4 M -5 -4 L -26 -8" fill="none" /></g>}
                            {BROWS[mood].map((d) => <path key={d} d={d} stroke={L.brow} strokeWidth={L.hair === 'balding' ? 5 : 6} fill="none" strokeLinecap="round" />)}
                            <path d="M 26 8 Q 32 18 24 20" stroke={L.skin[2]} strokeWidth="3" fill="none" strokeLinecap="round" />
                            <circle cx="2" cy="20" r="7" fill="#ff8a7a" opacity=".22" /><circle cx="46" cy="20" r="6" fill="#ff8a7a" opacity=".22" />
                            {L.beard && <path d="M -18 14 C -14 62 58 66 62 14 C 52 40 40 44 24 44 C 8 44 -6 40 -18 14 Z" fill="#f2f2f2" stroke="#cfcfcf" strokeWidth="2" />}
                            {mouthShape}
                            {L.moustache && <path d="M 8 26 Q 16 18 24 24 Q 32 18 40 26 Q 32 30 24 27 Q 16 30 8 26 Z" fill={L.beard ? '#f5f5f5' : L.hairColor[1]} stroke={L.beard ? '#cfcfcf' : 'none'} strokeWidth="1.5" />}
                        </g>
                    </g>
                </g>
                {arm(arms[1], 1, moving ? 'sf-arm-swing' : 'sf-gesture')}
            </g>
        </g>
    );
}

/** Hair: curls, a neat side parting, or an old man's white sides with a bald crown. */
function Hair({ kind, id }) {
    if (kind === 'curly') {
        return (
            <g>
                <path d="M -38 4 C -50 -72 76 -88 68 2 C 60 -26 38 -38 12 -36 C -8 -34 -26 -22 -38 4 Z" fill={`url(#${id}-hair)`} />
                {CURLS.map(([cx, cy, r]) => <g key={`${cx}${cy}`}><circle cx={cx} cy={cy} r={r} fill="#2a1c15" /><circle cx={cx - r * 0.3} cy={cy - r * 0.35} r={r * 0.35} fill="#5a3d2e" opacity=".8" /></g>)}
            </g>
        );
    }
    if (kind === 'neat') {
        return (
            <g>
                <path d="M -38 6 C -48 -66 70 -82 66 -4 C 60 -30 42 -40 30 -42 C 18 -30 -10 -34 -26 -22 C -32 -14 -36 -6 -38 6 Z" fill={`url(#${id}-hair)`} />
                <path d="M 30 -42 C 14 -58 -8 -60 -24 -50" stroke="#5a4334" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M -36 -8 L -34 14" stroke="#14100d" strokeWidth="8" strokeLinecap="round" />
            </g>
        );
    }
    // Balding: a shining crown, white hair over the ears and the back.
    return (
        <g>
            <ellipse cx="10" cy="-38" rx="20" ry="8" fill="#fff" opacity=".35" />
            <path d="M -40 10 C -46 -18 -38 -34 -26 -40 C -30 -22 -30 -6 -24 10 Z" fill={`url(#${id}-hair)`} stroke="#bdbdbd" strokeWidth="2" />
            <path d="M 62 0 C 66 -18 62 -30 56 -36 C 58 -20 56 -8 52 4 Z" fill={`url(#${id}-hair)`} stroke="#bdbdbd" strokeWidth="2" />
        </g>
    );
}

/** Shoes: white sneakers, brown sandals, polished black shoes. */
function Shoe({ kind, x }) {
    if (kind === 'sandals') return <g><path d={`M ${x - 2} -10 Q ${x - 2} -2 ${x + 8} -2 L ${x + 44} -2 Q ${x + 48} -8 ${x + 40} -14 Z`} fill="#c99367" stroke="#a8754e" strokeWidth="2" /><path d={`M ${x - 4} -2 L ${x + 48} -2`} stroke="#6d4c2f" strokeWidth="6" strokeLinecap="round" /><path d={`M ${x + 10} -12 L ${x + 30} -6`} stroke="#6d4c2f" strokeWidth="5" strokeLinecap="round" /></g>;
    if (kind === 'formal') return <path d={`M ${x - 2} -26 Q ${x - 4} -2 ${x + 10} -2 L ${x + 46} -2 Q ${x + 52} -10 ${x + 40} -18 L ${x + 26} -28 Z`} fill="#1a1a1a" stroke="#000" strokeWidth="2" />;
    return (
        <g>
            <path d={`M ${x - 2} -24 Q ${x - 2} -2 ${x + 10} -2 L ${x + 48} -2 Q ${x + 54} -10 ${x + 42} -20 L ${x + 28} -30 Z`} fill="#fbfbfb" stroke="#c9c9c9" strokeWidth="3" />
            <path d={`M ${x - 2} -6 L ${x + 50} -6`} stroke="#d6d6d6" strokeWidth="5" strokeLinecap="round" />
        </g>
    );
}

/** What a seated person sits on: the bus stop's bench, or an office chair. */
function Seat({ hip, office }) {
    return office
        ? <g><rect x="-64" y={hip - 150} width="30" height="160" rx="12" fill="#37474f" stroke="#1c262b" strokeWidth="3" /><rect x="-64" y={hip + 4} width="150" height="22" rx="8" fill="#455a64" stroke="#1c262b" strokeWidth="3" /><rect x="6" y={hip + 26} width="12" height={-hip - 40} fill="#263238" /><path d={`M -30 -6 L 60 -6`} stroke="#263238" strokeWidth="8" strokeLinecap="round" /></g>
        : <g><rect x="-84" y={hip + 6} width="200" height="18" rx="6" fill="#8d6e63" stroke="#5d4037" strokeWidth="3" /><rect x="-74" y={hip + 24} width="12" height={-hip - 24} fill="#5d4037" /><rect x="96" y={hip + 24} width="12" height={-hip - 24} fill="#5d4037" /></g>;
}

const stroke = { stroke: INK, strokeWidth: 4, strokeLinejoin: 'round', strokeLinecap: 'round' };

/* ── The places (2026-11-07: richer cartoon backgrounds — depth, soft light, the little things that make a place) ── */
const Skyline = ({ y = 420, lit = 0.25, tone = '#3b4a5e', seed = 1, far = false }) => (
    <g opacity={far ? 0.75 : 1}>
        {Array.from({ length: 16 }, (_, i) => {
            const bw = 60 + ((i * 37 * seed) % 50); const bh = 140 + ((i * 53 * seed) % 180); const x = i * 84 - 20;
            return (
                <g key={i}>
                    <rect x={x} y={y - bh} width={bw} height={bh} rx="4" fill={tone} />
                    <rect x={x} y={y - bh} width={bw * 0.28} height={bh} fill="rgba(255,255,255,.08)" />
                    {Array.from({ length: Math.floor(bh / 34) }, (_, r) => [0, 1, 2].map((c) => ((i + r + c) % 3 === 0 || Math.sin(i * 7 + r * 3 + c) > 1 - lit * 2) && <rect key={`${r}${c}`} x={x + 10 + c * 18} y={y - bh + 14 + r * 34} width="10" height="14" rx="2" fill="#ffe7a3" opacity=".85" />))}
                </g>
            );
        })}
    </g>
);
const Cloud = ({ x, y, s = 1, tone = '#fff' }) => (
    <g className="sf-cloud"><g transform={`translate(${x} ${y}) scale(${s})`} fill={tone}><ellipse cx="-30" cy="4" rx="36" ry="22" /><ellipse cx="8" cy="-12" rx="40" ry="30" /><ellipse cx="44" cy="4" rx="32" ry="21" /><ellipse cx="6" cy="10" rx="62" ry="16" /></g></g>
);
const Tree = ({ x, y, s = 1, dark }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M -10 0 Q -6 -60 -12 -110 L 12 -110 Q 6 -60 12 0 Z" fill={dark ? '#3e2f28' : '#6d4c41'} />
        <circle cx="0" cy="-150" r="62" fill={dark ? '#2e5a3a' : '#4caf50'} /><circle cx="-46" cy="-118" r="44" fill={dark ? '#285034' : '#43a047'} /><circle cx="46" cy="-114" r="46" fill={dark ? '#285034' : '#43a047'} />
        <circle cx="-16" cy="-176" r="26" fill={dark ? '#3a6e48' : '#66bb6a'} opacity=".8" />
    </g>
);
const Plant = ({ x, y, s = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        {[-40, -20, 0, 20, 40].map((a) => <path key={a} d={`M 0 -60 Q ${a * 1.6} -150 ${a * 2.4} -170`} stroke="#2e7d32" strokeWidth="12" strokeLinecap="round" fill="none" />)}
        {[-40, -20, 0, 20, 40].map((a) => <ellipse key={`l${a}`} cx={a * 2.4} cy="-170" rx="16" ry="30" fill="#43a047" transform={`rotate(${a} ${a * 2.4} -170)`} />)}
        <path d="M -40 -64 L 40 -64 L 30 0 L -30 0 Z" fill="#d7834f" /><rect x="-44" y="-74" width="88" height="14" rx="5" fill="#c06a3a" />
    </g>
);

function Place({ place }) {
    if (place === 'home') {
        return (
            <g>
                <rect width={W} height={H} fill="url(#fs-wall)" />
                <rect y={GROUND - 24} width={W} height={H - GROUND + 24} fill="url(#fs-floor)" />
                {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M ${i * 140} ${GROUND - 24} L ${i * 140 - 70} ${H}`} stroke="rgba(0,0,0,.08)" strokeWidth="3" />)}
                <rect y={GROUND - 34} width={W} height="12" fill="#e8d2b0" />
                {/* The window: Bengaluru waking up */}
                <g transform="translate(700 90)">
                    <rect width="440" height="310" rx="10" fill="url(#fs-morning-sky)" />
                    <circle cx="340" cy="80" r="40" fill="#fff4c2" /><circle cx="340" cy="80" r="62" fill="#fff4c2" opacity=".35" />
                    <Cloud x={120} y={74} s={0.75} />
                    <g transform="translate(0 310) scale(.5)"><Skyline y={0} tone="#9fb6d0" lit={0} far /></g>
                    <rect x="-14" y="-14" width="468" height="338" rx="14" fill="none" stroke="#fffaf0" strokeWidth="24" />
                    <path d="M 220 0 V 310 M 0 155 H 440" stroke="#fffaf0" strokeWidth="11" />
                    <path d="M -70 -40 Q -26 150 -60 360 L 10 360 L 10 -40 Z M 500 -40 Q 456 150 490 360 L 420 360 L 420 -40 Z" fill="#d1614a" />
                    <path d="M -54 -40 Q -16 150 -44 360 M 484 -40 Q 446 150 474 360" stroke="#b44e3a" strokeWidth="6" fill="none" />
                    <rect x="-90" y="-52" width="620" height="16" rx="8" fill="#8d6e63" />
                </g>
                {/* A clock, its hand going round; a mirror; a shelf with books */}
                <g transform="translate(400 170)"><circle r="52" fill="#fff" stroke="#6d4c41" strokeWidth="9" /><g className="sf-hands"><path d="M 0 0 V -38" stroke="#333" strokeWidth="4" strokeLinecap="round" /></g><path d="M 0 0 L 20 8" stroke="#333" strokeWidth="6" strokeLinecap="round" /><circle r="5" fill="#333" /></g>
                <g transform="translate(560 160)"><ellipse rx="56" ry="84" fill="#a1887f" /><ellipse rx="46" ry="74" fill="#cfe8f5" /><path d="M -24 -40 L 10 -64" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".7" /></g>
                <rect x="40" y="250" width="240" height="14" rx="4" fill="#8d6e63" />
                {['#e57373', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8'].map((c, i) => <rect key={c} x={60 + i * 26} y={250 - 52 - (i % 2) * 8} width="22" height={52 + (i % 2) * 8} rx="3" fill={c} />)}
                {/* The bed, its pillow and blanket */}
                <g transform={`translate(30 ${GROUND - 24})`}>
                    <rect x="0" y="-190" width="26" height="190" rx="8" fill="#8d6e63" />
                    <rect x="0" y="-96" width="300" height="70" rx="16" fill="#f5f5f5" />
                    <rect x="0" y="-70" width="300" height="44" rx="14" fill="#64b5f6" /><path d="M 40 -70 L 40 -26 M 120 -70 L 120 -26 M 200 -70 L 200 -26" stroke="#42a5f5" strokeWidth="4" />
                    <ellipse cx="74" cy="-104" rx="52" ry="20" fill="#fffde7" />
                    <rect x="0" y="-30" width="300" height="30" rx="6" fill="#6d4c41" />
                </g>
                <ellipse cx="760" cy={GROUND + 30} rx="300" ry="34" fill="#c0563d" opacity=".55" />
                <Plant x={1210} y={GROUND - 10} s={0.8} />
                <polygon points={`700,90 1140,90 960,${GROUND} 360,${GROUND}`} fill="#fff2c4" opacity=".2" />
            </g>
        );
    }
    if (place === 'office') {
        return (
            <g>
                <rect width={W} height={H} fill="url(#fs-office)" />
                {[200, 640, 1080].map((x) => <g key={x}><rect x={x - 70} y="0" width="140" height="10" rx="4" fill="#cfd8dc" /><ellipse cx={x} cy="40" rx="140" ry="40" fill="#fffde7" opacity=".25" /></g>)}
                <g transform="translate(560 70)">
                    <rect width="640" height="380" fill="url(#fs-day-sky)" />
                    <Cloud x={160} y={90} s={0.9} /><Cloud x={470} y={60} s={0.7} />
                    <g transform="translate(0 380) scale(.8)"><Skyline y={0} tone="#7f9bb8" lit={0} seed={2} /></g>
                    {[0, 160, 320, 480, 640].map((x) => <rect key={x} x={x - 7} y="0" width="14" height="380" fill="#dde4e8" />)}
                    <rect x="-8" y="-8" width="656" height="396" fill="none" stroke="#dde4e8" strokeWidth="16" />
                    <path d="M 40 30 L 120 330 M 200 30 L 260 230" stroke="#fff" strokeWidth="10" opacity=".25" strokeLinecap="round" />
                </g>
                <g transform="translate(70 110)"><rect width="330" height="70" rx="12" fill="#22356b" /><circle cx="40" cy="35" r="20" fill="#ffca28" /><path d="M 26 40 Q 40 20 54 40" stroke="#22356b" strokeWidth="5" fill="none" /><text x="186" y="45" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="22" fill="#fff">HORIZON TECHNOLOGIES</text></g>
                <g transform="translate(110 250)"><rect width="150" height="110" rx="8" fill="#fff" stroke="#b0bec5" strokeWidth="6" /><path d="M 20 80 L 60 40 L 90 66 L 130 30" stroke="#26a69a" strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>
                <rect y={GROUND - 12} width={W} height={H - GROUND + 12} fill="url(#fs-office-floor)" />
                {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M ${i * 120} ${GROUND - 12} L ${i * 120 - 40} ${H}`} stroke="rgba(0,0,0,.06)" strokeWidth="3" />)}
                <Plant x={170} y={GROUND} s={1.05} />
                <polygon points={`560,70 1200,70 1040,${GROUND} 420,${GROUND}`} fill="#ffffff" opacity=".16" />
            </g>
        );
    }
    if (place === 'street') {
        return (
            <g>
                <rect width={W} height={H} fill="url(#fs-dusk)" />
                <circle cx="1000" cy="150" r="46" fill="#ffd8a0" opacity=".85" />
                <Skyline y={GROUND - 160} tone="#3d3866" lit={0.6} seed={3} far />
                {/* Shops along the street, their lights on */}
                {[[40, '#e57373'], [330, '#4db6ac'], [620, '#ffb74d'], [910, '#9575cd']].map(([x, c]) => (
                    <g key={x} transform={`translate(${x} ${GROUND - 300})`}>
                        <rect width="250" height="220" rx="6" fill="#4a4266" />
                        <rect x="20" y="70" width="210" height="110" rx="6" fill="#ffe39a" opacity=".85" />
                        <path d="M -10 50 L 260 50 L 240 76 L 10 76 Z" fill={c} />{[0, 1, 2, 3, 4, 5].map((k) => <path key={k} d={`M ${10 + k * 40} 76 q 20 16 40 0`} fill={c} />)}
                    </g>
                ))}
                <Tree x={300} y={GROUND - 70} s={0.9} dark /><Tree x={880} y={GROUND - 70} s={0.95} dark />
                <rect y={GROUND - 80} width={W} height={H - GROUND + 80} fill="url(#fs-wet)" />
                <rect y={GROUND - 84} width={W} height="10" fill="#57557a" />
                {[160, 600, 1180].map((x) => <g key={x}><rect x={x - 6} y={GROUND - 360} width="12" height="280" rx="4" fill="#22232d" /><path d={`M ${x} ${GROUND - 360} q 0 -20 30 -20`} stroke="#22232d" strokeWidth="10" fill="none" /><circle cx={x + 34} cy={GROUND - 374} r="16" fill="#ffd27a" /><circle cx={x + 34} cy={GROUND - 374} r="80" fill="#ffd27a" opacity=".15" /><ellipse cx={x + 34} cy={GROUND + 40} rx="46" ry="8" fill="#ffd27a" opacity=".35" /></g>)}
                {[[300, 664], [760, 690], [1060, 652]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="96" ry="12" fill="#a39fd6" opacity=".45" />)}
            </g>
        );
    }
    // The bus stop in the rain.
    return (
        <g>
            <rect width={W} height={H} fill="url(#fs-storm)" />
            <Cloud x={200} y={80} s={1.4} tone="#5d6878" /><Cloud x={760} y={60} s={1.6} tone="#566170" /><Cloud x={1140} y={110} s={1.2} tone="#5d6878" />
            <Skyline y={GROUND - 170} tone="#5d6878" lit={0.15} seed={4} far />
            <Tree x={110} y={GROUND - 90} s={0.95} dark /><Tree x={1210} y={GROUND - 90} s={0.9} dark />
            <rect y={GROUND - 170} width={W} height="90" fill="#454c59" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={i * 180 + 20} y={GROUND - 128} width="90" height="7" rx="3" fill="#f5f5f5" opacity=".55" />)}
            <rect y={GROUND - 80} width={W} height={H - GROUND + 80} fill="url(#fs-wet)" />
            <rect y={GROUND - 84} width={W} height="10" fill="#8a909b" />
            {/* The shelter */}
            <g transform="translate(360 0)">
                <path d={`M -50 ${GROUND - 428} Q 280 ${GROUND - 470} 630 ${GROUND - 444} L 630 ${GROUND - 414} Q 280 ${GROUND - 440} -50 ${GROUND - 398} Z`} fill="#2f6f8f" />
                <path d={`M -50 ${GROUND - 398} Q 280 ${GROUND - 440} 630 ${GROUND - 414}`} stroke="#1f4f66" strokeWidth="6" fill="none" />
                {[-20, 600].map((x) => <rect key={x} x={x} y={GROUND - 416} width="18" height="336" rx="6" fill="#546e7a" />)}
                <rect x="14" y={GROUND - 384} width="572" height="210" rx="10" fill="#cfe8f5" opacity=".14" />
                <rect x="40" y={GROUND - 360} width="150" height="100" rx="8" fill="#fff3c4" opacity=".75" /><text x="115" y={GROUND - 300} textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize="22" fill="#c0563d">CITY BUS</text>
                <g transform={`translate(660 ${GROUND - 360})`}><rect x="-5" width="10" height="280" rx="4" fill="#546e7a" /><circle cx="0" cy="-12" r="34" fill="#1e88e5" stroke="#fff" strokeWidth="4" /><text x="0" y="-4" textAnchor="middle" fontFamily="system-ui" fontWeight="900" fontSize="22" fill="#fff">BUS</text></g>
            </g>
            <g transform={`translate(1100 ${GROUND - 80})`}><rect x="-6" y="-300" width="12" height="300" rx="4" fill="#37474f" /><circle cx="0" cy="-306" r="16" fill="#ffe082" /><circle cx="0" cy="-306" r="70" fill="#ffe082" opacity=".14" /></g>
            {[[180, 690], [700, 700], [1090, 676]].map(([x, y]) => <ellipse key={x} cx={x} cy={y} rx="100" ry="10" fill="#b3c3d6" opacity=".55" />)}
        </g>
    );
}

/** The auto-rickshaw at the kerb, driving away when it is gone from the line. */
function Auto({ leaving }) {
    return (
        <g className={leaving ? 'sf-driveoff' : undefined}>
            <g transform={`translate(980 ${GROUND - 10})`}>
                <path d="M -110 -40 Q -110 -170 -10 -180 L 90 -180 Q 120 -170 120 -120 L 130 -40 Z" fill="#2e7d32" {...stroke} />
                <path d="M -90 -60 L -90 -140 Q -60 -160 -20 -160 L -20 -60 Z" fill="#dfe8ec" {...stroke} strokeWidth="3" />
                <rect x="-120" y="-60" width="260" height="34" rx="8" fill="#fbc02d" {...stroke} />
                {[-70, 90].map((x) => <g key={x}><circle cx={x} cy="-14" r="26" fill="#212121" {...stroke} strokeWidth="3" /><circle cx={x} cy="-14" r="10" fill="#bdbdbd" /></g>)}
            </g>
        </g>
    );
}

/** The scene: the place, its light, the people where the line puts them, the camera on them. */
export default function FilmStage({ scene, line, talking, mouth, onTap }) {
    const place = line?.place || scene.place;
    const light = line?.light || scene.light;
    const at = line?.at || {};
    // Where each person stands, so a walk starts from where they were; a newcomer may start off-screen (`from`).
    const [pos, setPos] = useState({});
    const [moving, setMoving] = useState({});
    const [hops, setHops] = useState({});
    useEffect(() => {
        const timers = [];
        const next = {};
        const walking = {};
        for (const [who, a] of Object.entries(at)) {
            const prev = pos[who];
            const x = (a.x / 100) * W;
            const speed = a.run ? 520 : 240;
            if (prev == null && a.from != null) {
                const from = (a.from / 100) * W;
                next[who] = { x: from, dur: 0 };
                timers.push(setTimeout(() => setPos((p) => ({ ...p, [who]: { x, dur: Math.abs(x - from) / speed } })), 60));
            } else next[who] = { x, dur: prev == null ? 0 : a.walk ? Math.abs(x - prev.x) / speed : 0.6 };
            if (a.walk) walking[who] = a.run ? 'run' : 'walk';
        }
        setPos(next);
        setMoving(walking);
        const longest = Math.max(1.2, ...Object.values(next).map((n) => n.dur || 0), ...Object.entries(at).filter(([, a]) => a.from != null).map(([, a]) => Math.abs(a.x - a.from) * W / 100 / (a.run ? 520 : 240)));
        timers.push(setTimeout(() => setMoving({}), longest * 1000 + 200));
        return () => timers.forEach(clearTimeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [line, scene.id]);
    const [auto, setAuto] = useState(null);
    const hasAuto = (line?.props || []).includes('auto');
    useEffect(() => {
        if (hasAuto) { setAuto('here'); return undefined; }
        if (auto !== 'here') return undefined;
        setAuto('leaving');
        const t = setTimeout(() => setAuto(null), 2700);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasAuto]);
    const tap = (who) => { setHops((h) => ({ ...h, [who]: (h[who] || 0) + 1 })); onTap?.(who); };
    // The camera: in close on Arjun's face while he speaks (or when the line looks closely at him), else as the line says.
    const onArjun = at.arjun && !moving.arjun && (talking === 'arjun' || line?.cam === 'close');
    const focusX = onArjun ? at.arjun.x : line?.cam === 'left' ? 32 : line?.cam === 'right' ? 68 : line?.cam === 'close' ? (at[talking]?.x ?? Object.values(at)[0]?.x ?? 50) : 50;
    const focusY = onArjun ? 30 : 62;
    const scale = onArjun ? 1.85 : line?.cam === 'wide' ? 1 : line?.cam === 'pan' ? 1.12 : line?.cam === 'close' ? 1.45 : 1.28;
    const tint = light === 'rain' ? 'rgba(40,60,90,.25)' : light === 'evening' ? 'rgba(80,40,120,.15)' : light === 'morning' ? 'rgba(255,200,120,.1)' : 'transparent';
    return (
        <div className="absolute inset-0 overflow-hidden" data-film-stage={place}>
            <style>{CSS}</style>
            <div className="absolute inset-0" style={{ transform: `scale(${scale})`, transformOrigin: `${Math.min(88, Math.max(12, focusX))}% ${focusY}%`, transition: `transform ${line?.cam === 'pan' ? 9 : 2.2}s cubic-bezier(.4,.1,.3,1), transform-origin 2.2s ease` }}>
                <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid slice">
                    <defs>
                        <linearGradient id="fs-dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a1f4f" /><stop offset=".55" stopColor="#8a4f7d" /><stop offset="1" stopColor="#f2a65a" /></linearGradient>
                        <linearGradient id="fs-storm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3c4656" /><stop offset="1" stopColor="#8592a3" /></linearGradient>
                        <linearGradient id="fs-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbe9cf" /><stop offset="1" stopColor="#efd3ad" /></linearGradient>
                        <linearGradient id="fs-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b8865c" /><stop offset="1" stopColor="#8d6242" /></linearGradient>
                        <linearGradient id="fs-morning-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd59e" /><stop offset=".5" stopColor="#bfe3ff" /><stop offset="1" stopColor="#e8f6ff" /></linearGradient>
                        <linearGradient id="fs-day-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5fb0ea" /><stop offset="1" stopColor="#d7eefc" /></linearGradient>
                        <linearGradient id="fs-office" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f7f9" /><stop offset="1" stopColor="#dfe6ea" /></linearGradient>
                        <linearGradient id="fs-office-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b7c1c8" /><stop offset="1" stopColor="#95a1aa" /></linearGradient>
                        <linearGradient id="fs-wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a6273" /><stop offset="1" stopColor="#3e4452" /></linearGradient>
                    </defs>
                    <Place place={place} />
                    {auto && <Auto leaving={auto === 'leaving'} />}
                    {Object.entries(at).map(([who, a]) => {
                        const p = pos[who] || { x: (a.x / 100) * W, dur: 0 };
                        const state = moving[who] === 'run' ? 'sf-walk sf-run' : moving[who] ? 'sf-walk' : talking === who ? 'sf-talking sf-idle' : 'sf-idle';
                        return (
                            <g key={who} className={`sf-fig ${state}`} style={{ transform: `translate(${p.x}px, ${GROUND}px) scale(${LOOK[who]?.height || 1})`, '--dur': `${p.dur}s` }} onClick={() => tap(who)} data-film-person={who}>
                                <g key={hops[who] || 0} className={hops[who] ? 'sf-hop' : undefined}>
                                    <g transform={a.face === 'left' ? 'scale(-1 1)' : undefined}>
                                        <Figure who={who} pose={moving[who] ? 'stand' : a.pose} sit={a.sit} holds={a.holds} mouth={talking === who ? mouth : 0} moving={!!moving[who]} run={moving[who] === 'run'} />
                                    </g>
                                </g>
                            </g>
                        );
                    })}
                    {place === 'office' && <g pointerEvents="none"><rect x="740" y={GROUND - 190} width="460" height="34" rx="6" fill="#6d4c41" {...stroke} /><rect x="760" y={GROUND - 158} width="420" height="158" fill="#795548" {...stroke} /><rect x="980" y={GROUND - 238} width="92" height="50" rx="4" fill="#263238" {...stroke} strokeWidth="3" /></g>}
                </svg>
            </div>
            <div className="pointer-events-none absolute inset-0" style={{ background: tint }} />
            {light === 'rain' && <div className="sf-rain pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">{Array.from({ length: 90 }, (_, i) => <i key={i} style={{ left: `${(i * 37.3) % 100}%`, '--delay': `${-((i * 131) % 97) / 100}s`, '--dur': `${0.5 + ((i * 17) % 11) / 40}s`, opacity: 0.35 + ((i * 7) % 6) / 12, height: `${9 + (i % 5) * 1.5}%` }} />)}</div>}
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,.45) 100%)' }} />
        </div>
    );
}
