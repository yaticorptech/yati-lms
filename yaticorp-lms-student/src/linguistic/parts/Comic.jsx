/**
 * Language Learning — a picture story (asked 2026-10-31, from a page of a comic book the student showed: "make the
 * interface like this"): a comic page of bordered panels, each a drawn scene with its people, a caption box, speech
 * bubbles pointing at who speaks, a line of narration under some, and the story's moral at the end. Drawn here in
 * SVG from the story's words (the server's comics.js) — no pictures to load. Read aloud panel by panel.
 *
 * Each story has its own look (2026-10-31, "don't give the same design to all stories", `THEMES`): its sky and
 * ground, its trees and huts, its panel borders, its title, caption and bubble shapes, and its layout; and close-ups
 * (`zoom`), evenings, nights and rain vary the panels inside a story.
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Headphones, Square } from 'lucide-react';
import { COLORS } from '../meta';

const INK = '#1b1b1b';
const H = 240;
const GROUND = 226;
const HORIZON = 150;
const FONT = "'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', 'Marker Felt', system-ui, sans-serif";
const line = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round' };

/**
 * A story's look. `trees`: light, dark and highlight greens; `hut`: walls and roof; `frame`: the panel border;
 * `title`: stamp, banner, board or scroll; `bubble`: oval, round or box; `columns`: panels to a row on a wide page.
 */
const THEMES = {
    // A hot, dry summer: an orange sky, a big sun, cracked ochre earth, olive trees; a red stamp for its title.
    summer: {
        sky: ['#f39a4a', '#fde6ae'], hills: '#e6c27a', ground: '#d8b065', path: '#ecd29a', trees: ['#8aa63c', '#6b8a2c', '#a8c457'], hut: ['#e2b07a', '#9c6b3c'], sun: true, cracks: true,
        frame: { color: INK, width: 3, radius: 0 }, caption: '#FFD978', narration: '#FFF3D6', title: 'stamp', bubble: 'oval', page: '#FFF8EC', moral: ['#C0392B', '#FFFFFF'], columns: 2
    },
    // A bright journey: a clear morning sky with white clouds, fresh green fields; rounded blue panels, a ribbon title, three to a row.
    journey: {
        sky: ['#8fd3f7', '#f0fbff'], hills: '#bfe3a0', ground: '#9cd06a', path: '#f0d98c', trees: ['#5aa832', '#3f8a26', '#78c045'], hut: ['#f4f1e8', '#a1866f'], clouds: '#ffffff',
        frame: { color: '#1e3a8a', width: 3, radius: 16 }, caption: '#DBEAFE', narration: '#EEF5FF', title: 'banner', bubble: 'round', page: '#F3F8FF', moral: ['#1E3A8A', '#FFFFFF'], columns: 3
    },
    // The monsoon: a grey cloudy sky, deep wet greens, red-tiled huts; brown wooden frames and a signboard title.
    monsoon: {
        sky: ['#7f9db2', '#d9e6ec'], hills: '#5e9f4c', ground: '#4f9a3a', path: '#b9a27a', trees: ['#2f7d32', '#1f6327', '#45a049'], hut: ['#efe6d3', '#b5523b'], clouds: '#c9d3da',
        frame: { color: '#5b3a1e', width: 4, radius: 4 }, caption: '#E3F2D2', narration: '#F2F8EA', title: 'board', bubble: 'oval', page: '#EEF5EA', moral: ['#5B3A1E', '#FFF3D6'], columns: 2
    },
    // A river town at dusk: teal water, warm evenings and starry nights; frames with a hard shadow, a scroll title, square bubbles.
    dusk: {
        sky: ['#87c4e8', '#e9f6fb'], hills: '#7fae6a', ground: '#7fb35a', path: '#e7cf9a', water: '#2a8a9a', trees: ['#3f7f4a', '#2c6338', '#5a9a5f'], hut: ['#f4f1e8', '#7d5a44'],
        frame: { color: '#111111', width: 3, radius: 2, shadow: true }, caption: '#F5DEB3', narration: '#FFF6E5', title: 'scroll', bubble: 'box', page: '#FFF9F0', moral: ['#0F4C5C', '#FDF6E3'], columns: 2
    }
};
const themeOf = (name) => THEMES[name] || THEMES.summer;

/* ── The scenery ──────────────────────────────────────────────────────── */

function Tree({ x, y, s = 1, tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M -8 0 L -5 -62 Q 0 -68 5 -62 L 9 0 Z" fill="#8b5a2b" {...line} />
            <circle cx="-24" cy="-70" r="25" fill={tone[1]} {...line} />
            <circle cx="22" cy="-72" r="27" fill={tone[1]} {...line} />
            <circle cx="0" cy="-96" r="31" fill={tone[0]} {...line} />
            <circle cx="-8" cy="-104" r="11" fill={tone[2]} />
        </g>
    );
}
function Hut({ x, y, s = 1, tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x="-32" y="-44" width="64" height="44" fill={tone[0]} {...line} />
            <rect x="-9" y="-30" width="18" height="30" fill="#4a3426" {...line} />
            <path d="M -42 -42 L 0 -74 L 42 -42 Z" fill={tone[1]} {...line} />
            <path d="M -30 -50 L 0 -68 M 30 -50 L 0 -68 M -16 -46 L 0 -66 M 16 -46 L 0 -66" stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
        </g>
    );
}
function Stall({ x, y, s = 1, stripe = '#e74c3c' }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M -44 0 L -44 -70 M 44 0 L 44 -70" {...line} />
            <path d="M -52 -70 L 52 -70 L 46 -88 L -46 -88 Z" fill="#fdfefe" {...line} />
            {[-34, -12, 10, 32].map((sx) => <path key={sx} d={`M ${sx} -88 L ${sx + 10} -88 L ${sx + 12} -70 L ${sx + 2} -70 Z`} fill={stripe} />)}
            <path d="M -52 -70 L 52 -70 L 46 -88 L -46 -88 Z" fill="none" {...line} />
            <rect x="-48" y="-34" width="96" height="34" fill="#c49a6c" {...line} />
            {[-30, -10, 10, 30].map((cx, i) => <circle key={cx} cx={cx} cy="-40" r="7" fill={['#e67e22', '#f4d03f', '#27ae60', '#c0392b'][i]} {...line} strokeWidth="1.5" />)}
        </g>
    );
}
function Banyan({ x, y, s = 1, tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M -22 0 C -16 -40 -18 -70 -10 -96 L 12 -96 C 18 -70 16 -40 24 0 Z" fill="#7a5230" {...line} />
            {[-70, -52, 48, 66].map((rx) => <path key={rx} d={`M ${rx} -100 C ${rx + 2} -60 ${rx - 2} -30 ${rx} 0`} stroke="#6b4628" strokeWidth="3" fill="none" />)}
            <ellipse cx="0" cy="-118" rx="96" ry="40" fill={tone[1]} {...line} />
            <ellipse cx="-44" cy="-140" rx="48" ry="28" fill={tone[0]} {...line} />
            <ellipse cx="40" cy="-142" rx="52" ry="30" fill={tone[0]} {...line} />
            <ellipse cx="0" cy="-160" rx="44" ry="24" fill={tone[2]} {...line} />
        </g>
    );
}
function Well({ x }) {
    return (
        <g transform={`translate(${x} ${GROUND - 2})`}>
            <path d="M -30 -40 L -30 -88 M 30 -40 L 30 -88 M -36 -88 L 36 -88" {...line} strokeWidth="3" />
            <path d="M 0 -88 L 0 -60" stroke={INK} strokeWidth="1.5" />
            <rect x="-6" y="-62" width="12" height="10" fill="#8b5a2b" {...line} strokeWidth="1.5" />
            <rect x="-34" y="-40" width="68" height="40" fill="#bdb5a6" {...line} />
            <path d="M -34 -27 L 34 -27 M -34 -13 L 34 -13 M -16 -40 L -16 -27 M 10 -40 L 10 -27 M -4 -27 L -4 -13 M 20 -27 L 20 -13 M -22 -13 L -22 0 M 4 -13 L 4 0" stroke="#7f7869" strokeWidth="1.4" />
            <ellipse cx="0" cy="-40" rx="34" ry="7" fill="#5d5548" {...line} />
        </g>
    );
}
function Boat({ x, y = 206 }) {
    return (
        <g transform={`translate(${x} ${y})`}>
            <path d="M -62 -16 L 62 -16 C 52 4 30 10 0 10 C -30 10 -52 4 -62 -16 Z" fill="#9c6233" {...line} />
            <path d="M -56 -9 L 56 -9" stroke="#6d4322" strokeWidth="2" />
            <path d="M 40 -60 L 70 12" {...line} strokeWidth="3" />
        </g>
    );
}
const Sack = ({ x = 0, y = 0, s = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <path d="M -10 0 C -14 -16 -6 -22 -3 -24 L 3 -24 C 6 -22 14 -16 10 0 Z" fill="#a0522d" {...line} strokeWidth="1.6" />
        <path d="M -5 -22 L 5 -22" stroke="#f4d03f" strokeWidth="2.5" />
    </g>
);
/** A price board on a post, its words written on it; `broken`, in two pieces on the ground. */
function Sign({ x, text, broken }) {
    if (broken) {
        return (
            <g transform={`translate(${x} ${GROUND})`}>
                <path d="M -40 -4 L -6 -10 L -2 0 L -38 6 Z" fill="#c8a165" {...line} />
                <path d="M 4 -8 L 38 -2 L 36 8 L 2 2 Z" fill="#c8a165" {...line} />
                <path d="M 12 -2 L 20 -26" {...line} strokeWidth="3" />
            </g>
        );
    }
    // Its words on two lines at most ("WATER:|1 COIN A POT").
    const lines = String(text).split('|');
    return (
        <g transform={`translate(${x} ${GROUND})`}>
            <path d="M 0 0 L 0 -56" {...line} strokeWidth="4" />
            <rect x="-50" y="-98" width="100" height="42" fill="#c8a165" {...line} />
            {lines.map((t, i) => <text key={t} x="0" y={-79 + i * 14 - (lines.length - 1) * 4} textAnchor="middle" fontFamily={FONT} fontWeight="900" fontSize="11" fill="#7a1f12">{t}</text>)}
        </g>
    );
}
function Cloud({ x, y, s = 1, fill }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill} stroke="rgba(0,0,0,.18)" strokeWidth="1.5">
            <ellipse cx="-18" cy="0" rx="20" ry="12" />
            <ellipse cx="6" cy="-8" rx="22" ry="16" />
            <ellipse cx="26" cy="2" rx="18" ry="11" />
        </g>
    );
}

/** The scene behind a panel `W` wide, in its story's look: its sky (or a room), its ground and what stands there. */
function Scene({ panel, W, theme, gid }) {
    const { scene } = panel;
    const sky = scene === 'house' ? null : panel.night ? ['#0f1d3a', '#34497a'] : panel.evening ? ['#f08a4b', '#fcd9a0'] : theme.sky;
    const ground = <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill={theme.ground} />;
    const hills = (lift = 0) => <path d={`M 0 ${HORIZON - 14 - lift} Q ${W * 0.25} ${HORIZON - 40 - lift} ${W * 0.5} ${HORIZON - 16 - lift} T ${W} ${HORIZON - 22 - lift} L ${W} ${HORIZON + 2} L 0 ${HORIZON + 2} Z`} fill={theme.hills} />;
    const focus = (panel.focus ?? 50) / 100;
    const water = theme.water || '#4fa3dc';
    return (
        <>
            <defs>
                {sky && <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>}
            </defs>
            {sky && <rect x="0" y="0" width={W} height={HORIZON + 2} fill={`url(#${gid})`} />}
            {/* The sun of a hot summer (away from the title, top left); the evening's low sun; the clouds. */}
            {sky && !panel.night && theme.sun && !panel.evening && (
                <g transform={`translate(${W * 0.86} 40)`}>
                    {Array.from({ length: 10 }, (_, i) => <path key={i} d="M 0 -30 L 0 -40" stroke="#f8c146" strokeWidth="4" strokeLinecap="round" transform={`rotate(${i * 36})`} />)}
                    <circle r="22" fill="#fbd34d" stroke="#e8a317" strokeWidth="2" />
                </g>
            )}
            {sky && panel.evening && <circle cx={W * 0.8} cy="74" r="18" fill="#f9e79f" opacity=".9" />}
            {sky && !panel.night && theme.clouds && [[0.62, 34, 0.9], [0.84, 60, 0.7], [0.36, 70, 0.6]].map(([f, y, s2]) => <Cloud key={f} x={W * f} y={y} s={s2} fill={theme.clouds} />)}
            {scene === 'village' && (
                <>
                    {hills()}
                    {ground}
                    <ellipse cx={W * 0.5} cy={GROUND + 4} rx={W * 0.36} ry="10" fill={theme.path} />
                    <Tree x={W * 0.08} y={HORIZON + 22} s={0.95} tone={theme.trees} />
                    <Tree x={W * 0.56} y={HORIZON} s={0.42} tone={theme.trees} />
                    <Hut x={W * 0.9} y={HORIZON + 26} s={0.85} tone={theme.hut} />
                </>
            )}
            {scene === 'road' && (
                <>
                    {hills(4)}
                    {ground}
                    <path d={`M ${W * 0.3} ${H} L ${W * 0.47} ${HORIZON} L ${W * 0.53} ${HORIZON} L ${W * 0.74} ${H} Z`} fill={theme.path} />
                    <Tree x={W * 0.1} y={HORIZON + 40} s={1} tone={theme.trees} />
                    <Tree x={W * 0.38} y={HORIZON + 2} s={0.35} tone={theme.trees} />
                    <Tree x={W * 0.64} y={HORIZON + 4} s={0.4} tone={theme.trees} />
                    <Tree x={W * 0.9} y={HORIZON + 34} s={0.85} tone={theme.trees} />
                </>
            )}
            {scene === 'river' && (
                <>
                    <rect x="0" y={HORIZON - 26} width={W} height="28" fill={theme.hills} />
                    <Tree x={W * 0.2} y={HORIZON - 4} s={0.4} tone={theme.trees} />
                    <Tree x={W * 0.7} y={HORIZON - 2} s={0.46} tone={theme.trees} />
                    <Hut x={W * 0.46} y={HORIZON - 2} s={0.4} tone={theme.hut} />
                    <rect x="0" y={HORIZON} width={W} height="58" fill={water} />
                    {[0.1, 0.32, 0.58, 0.8].map((f, i) => <path key={f} d={`M ${W * f} ${HORIZON + 14 + (i % 2) * 22} q 8 -5 16 0 t 16 0`} stroke="rgba(255,255,255,.7)" strokeWidth="2" fill="none" />)}
                    <rect x="0" y={HORIZON + 58} width={W} height={H - HORIZON - 58} fill="#e6c88e" />
                    <path d={`M ${W * 0.03} ${H} l 3 -26 M ${W * 0.05} ${H} l -2 -22 M ${W * 0.97} ${H} l -3 -24`} stroke="#4c7a2a" strokeWidth="3" />
                </>
            )}
            {scene === 'market' && (
                <>
                    <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill="#dcb787" />
                    <path d={`M 0 26 Q ${W / 2} 52 ${W} 26`} stroke={INK} strokeWidth="1.2" fill="none" />
                    {Array.from({ length: Math.round(W / 34) }, (_, i) => <path key={i} d={`M ${16 + i * 34} ${30 + 18 * Math.sin((Math.PI * (16 + i * 34)) / W)} l 6 12 l 6 -12 Z`} fill={['#e74c3c', '#f4d03f', '#2e86c1', '#27ae60'][i % 4]} />)}
                    <Stall x={W * 0.24} y={HORIZON + 8} s={0.55} stripe="#2e86c1" />
                    <Stall x={W * 0.62} y={HORIZON + 6} s={0.5} stripe="#27ae60" />
                </>
            )}
            {scene === 'house' && (
                <>
                    <rect x="0" y="0" width={W} height="190" fill="#f1d6a2" />
                    <rect x="0" y="190" width={W} height={H - 190} fill="#b97a45" />
                    <path d={`M 0 190 L ${W} 190`} {...line} />
                    <rect x={W * 0.62} y="40" width="70" height="62" fill={panel.night ? '#1d2c55' : '#9fd6f5'} {...line} />
                    <path d={`M ${W * 0.62 + 35} 40 L ${W * 0.62 + 35} 102 M ${W * 0.62} 71 L ${W * 0.62 + 70} 71`} {...line} />
                    <rect x={W * 0.08} y="70" width="80" height="6" fill="#8b5a2b" {...line} />
                    {[0, 24, 48].map((dx, i) => <circle key={dx} cx={W * 0.08 + 14 + dx} cy="60" r="10" fill={['#c0612b', '#b5562a', '#d4823d'][i]} {...line} strokeWidth="1.5" />)}
                </>
            )}
            {scene === 'banyan' && (
                <>
                    {hills(-8)}
                    {ground}
                    <Hut x={W * (focus > 0.5 ? 0.1 : 0.9)} y={HORIZON + 14} s={0.6} tone={theme.hut} />
                    <Banyan x={W * focus} y={GROUND - 30} s={W > 500 ? 1 : 0.86} tone={theme.trees} />
                </>
            )}
            {(scene === 'field' || scene === 'water') && (
                <>
                    {hills(-2)}
                    {ground}
                    <path d={`M ${W * 0.62} ${HORIZON + 30} Q ${W * 0.78} ${HORIZON - 6} ${W * 0.98} ${HORIZON + 30} Z`} fill="#9a6a3a" {...line} />
                    <ellipse cx={W * 0.48} cy={GROUND - 4} rx="40" ry="11" fill={scene === 'water' ? water : '#4a3020'} {...line} />
                    {scene === 'water' && <path d={`M ${W * 0.48 - 12} ${GROUND - 14} q 4 -18 8 -2 M ${W * 0.48 + 4} ${GROUND - 16} q 5 -22 10 -2 M ${W * 0.48 - 24} ${GROUND - 10} q 2 -10 6 0`} stroke={water} strokeWidth="3" fill="none" strokeLinecap="round" />}
                    <Tree x={W * 0.12} y={HORIZON + 6} s={0.5} tone={theme.trees} />
                </>
            )}
            {/* Dry, cracked earth in a hot summer. */}
            {theme.cracks && scene !== 'house' && scene !== 'market' && scene !== 'river' && (
                <path d={`M ${W * 0.12} ${H - 8} l 10 -6 l 6 4 l 10 -8 M ${W * 0.7} ${H - 12} l 8 4 l 12 -6 l 6 5 M ${W * 0.4} ${H - 4} l 6 -5 l 9 2`} stroke="#a77b3c" strokeWidth="1.6" fill="none" />
            )}
        </>
    );
}

/** What is over the whole picture: the night's dark with its moon and stars, the rain. */
function Weather({ panel, W }) {
    return (
        <>
            {panel.night && (
                <>
                    <rect x="0" y="0" width={W} height={H} fill="#0b1633" opacity={panel.scene === 'house' ? 0.28 : 0.42} />
                    {panel.scene !== 'house' && (
                        <>
                            <circle cx={W * 0.84} cy="40" r="16" fill="#fdf6c9" />
                            {[[0.6, 22], [0.7, 58], [0.45, 40], [0.93, 80], [0.55, 90]].map(([f, y]) => <circle key={f} cx={W * f} cy={y} r="1.8" fill="#fff" />)}
                        </>
                    )}
                </>
            )}
            {panel.rain && Array.from({ length: Math.round(W / 14) }, (_, i) => (
                <path key={i} d={`M ${(i * 14 + (i % 3) * 5) % W} ${(i * 37) % 200} l -6 14`} stroke="#d6e6f2" strokeWidth="1.6" strokeLinecap="round" opacity=".85" />
            ))}
        </>
    );
}

/** A thing in the scene: a well, a boat, a stall, the banyan tree, a bag of coins, a price board. */
function Prop({ prop, W, theme }) {
    const x = (prop.x / 100) * W;
    if (prop.what === 'well') return <Well x={x} />;
    if (prop.what === 'boat') return <Boat x={x} />;
    if (prop.what === 'stall') return <Stall x={x} y={GROUND} s={0.9} />;
    if (prop.what === 'banyan') return <Banyan x={x} y={GROUND - 20} s={0.8} tone={theme.trees} />;
    if (prop.what === 'bag') return <Sack x={x} y={prop.y ?? GROUND} />;
    if (prop.what === 'sign') return <Sign x={x} text={prop.text} />;
    if (prop.what === 'broken') return <Sign x={x} broken />;
    return null;
}

/* ── The people ───────────────────────────────────────────────────────── */

/** What someone holds, drawn at (0, 0): in a hand, or on the head. */
function Held({ what }) {
    if (what === 'coin') return <circle r="4.5" fill="#f4d03f" {...line} strokeWidth="1.5" />;
    if (what === 'bag') return <Sack y={12} s={0.9} />;
    if (what === 'pot') return <g><circle cy="2" r="10" fill="#c0612b" {...line} strokeWidth="1.6" /><rect x="-5" y="-11" width="10" height="5" fill="#a85424" {...line} strokeWidth="1.4" /></g>;
    if (what === 'basket') return <g><path d="M -15 -7 L 15 -7 L 11 6 L -11 6 Z" fill="#c49a52" {...line} strokeWidth="1.6" /><path d="M -10 -1 L 10 -1 M -5 -7 L -4 6 M 4 -7 L 4 6" stroke="#8a6a32" strokeWidth="1.2" /><path d="M -6 -7 Q 0 -3 6 -7" fill="#7a5230" /></g>;
    if (what === 'bundle') return <g><ellipse rx="17" ry="9" fill="#d7bde2" {...line} strokeWidth="1.6" /><path d="M -4 -9 L 0 -15 L 4 -9" fill="#d7bde2" {...line} strokeWidth="1.4" /></g>;
    if (what === 'thread') return <g>{['#e74c3c', '#2e86c1', '#f4d03f'].map((c, i) => <rect key={c} x={-12 + i * 8} y="-8" width="7" height="14" rx="2" fill={c} {...line} strokeWidth="1.2" />)}</g>;
    if (what === 'papers') return <g transform="rotate(-20)"><rect x="-4" y="-14" width="8" height="26" rx="3" fill="#fdfefe" {...line} strokeWidth="1.4" /></g>;
    // The prize cloth, three silver coins woven in its border.
    if (what === 'cloth') return <g><rect x="-4" y="-24" width="40" height="34" fill="#c0392b" {...line} strokeWidth="1.6" /><rect x="-4" y="2" width="40" height="8" fill="#f5cba7" />{[4, 16, 28].map((cx) => <circle key={cx} cx={cx} cy="6" r="3" fill="#d5d8dc" stroke={INK} strokeWidth="1" />)}</g>;
    return null;
}

const ARMS = {
    stand: (w) => [[-15 * w, -112, -20 * w, -92, -21 * w, -74], [15 * w, -112, 20 * w, -92, 21 * w, -74]],
    talk: (w) => [[-15 * w, -112, -20 * w, -92, -21 * w, -74], [15 * w, -112, 27 * w, -96, 36 * w, -106]],
    point: (w) => [[-15 * w, -112, -20 * w, -92, -21 * w, -74], [15 * w, -112, 34 * w, -110, 56 * w, -112]],
    cheer: (w) => [[-15 * w, -112, -27 * w, -130, -31 * w, -152], [15 * w, -112, 27 * w, -130, 31 * w, -152]],
    sad: (w) => [[-15 * w, -110, -16 * w, -90, -11 * w, -76], [15 * w, -110, 16 * w, -90, 11 * w, -76]],
    give: (w) => [[-15 * w, -112, -20 * w, -92, -21 * w, -74], [15 * w, -112, 30 * w, -98, 47 * w, -94]],
    carry: (w) => [[-15 * w, -112, -22 * w, -132, -9, -156], [15 * w, -112, 22 * w, -132, 13, -156]],
    dig: (w) => [[-15 * w, -112, 6 * w, -102, 28 * w, -92], [15 * w, -112, 28 * w, -98, 38 * w, -84]],
    surprise: (w) => [[-15 * w, -112, -25 * w, -122, -21 * w, -140], [15 * w, -112, 26 * w, -122, 24 * w, -140]]
};
const MOUTH = { talk: 'talk', point: 'talk', cheer: 'happy', give: 'happy', sad: 'sad', surprise: 'oh' };

function Arm({ pts, skin }) {
    const p = pts.join(' ');
    const [hx, hy] = pts.slice(-2);
    return (
        <g>
            <polyline points={p} fill="none" stroke={INK} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={p} fill="none" stroke={skin} strokeWidth="7.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={hx} cy={hy} r="5" fill={skin} {...line} strokeWidth="1.6" />
        </g>
    );
}

/** Someone in the story: their look (skin, clothes, hair), how they stand, which way they face, what they hold; `size` for a close-up. */
function Person({ look, pose = 'stand', face = 'right', x, y = GROUND, holds, speaking, size = 1 }) {
    const s = (look.child ? 0.58 : 0.75) * size;
    const w = look.big ? 1.2 : 1;
    const skin = look.skin || '#c68642';
    const grey = ['grey', 'greybun'].includes(look.hair);
    const hairColor = grey ? '#e8e8e8' : '#222';
    const [back, front] = (ARMS[pose] || ARMS.stand)(w);
    const mouth = MOUTH[pose] || (speaking ? 'talk' : 'calm');
    const hand = front.slice(-2);
    const hairTop = 'M -13 -139 C -13 -156 16 -158 17 -141 C 12 -146 4 -147 -2 -145 C -8 -143 -11 -140 -13 -139 Z';
    return (
        <g transform={`translate(${x} ${y}) scale(${face === 'left' ? -s : s} ${s})`}>
            <Arm pts={back} skin={skin} />
            {/* Below the waist: a dhoti, or a sari's skirt with its border. */}
            {look.woman ? (
                <>
                    <path d={`M ${-16 * w} -74 L ${16 * w} -74 L ${25 * w} -4 L ${-25 * w} -4 Z`} fill={look.cloth} {...line} />
                    <path d={`M ${-24 * w} -12 L ${24 * w} -12`} stroke={look.blouse} strokeWidth="5" />
                </>
            ) : (
                <path d={`M ${-16 * w} -74 L ${16 * w} -74 L ${19 * w} -8 L 4 -8 L 0 -38 L -4 -8 L ${-19 * w} -8 Z`} fill={look.dhoti || '#fbfbf5'} {...line} />
            )}
            <ellipse cx="-9" cy="-4" rx="8" ry="4" fill={skin} {...line} strokeWidth="1.5" />
            <ellipse cx="12" cy="-4" rx="8" ry="4" fill={skin} {...line} strokeWidth="1.5" />
            {/* The body: bare with a shawl across it, a shirt, or a blouse under the sari's end. */}
            <path d={`M ${-15 * w} -116 Q ${-19 * w} -94 ${-16 * w} -72 L ${16 * w} -72 Q ${19 * w} -94 ${15 * w} -116 Q 0 -121 ${-15 * w} -116 Z`} fill={look.woman ? look.blouse : look.shirt || skin} {...line} />
            {look.woman
                ? <path d={`M ${15 * w} -116 L ${5 * w} -119 L ${-17 * w} -82 L ${-16 * w} -72 L ${-6 * w} -72 Z`} fill={look.cloth} {...line} />
                : look.shawl && <path d={`M ${-15 * w} -116 L ${-4 * w} -119 L ${17 * w} -84 L ${16 * w} -72 L ${7 * w} -72 Z M ${-15 * w} -116 L ${-21 * w} -110 L ${-22 * w} -88 L ${-16 * w} -88 Z`} fill={look.shawl} {...line} />}
            <rect x="-5" y="-125" width="10" height="10" fill={skin} {...line} strokeWidth="1.6" />
            <g transform={pose === 'sad' ? 'rotate(12 0 -122)' : undefined}>
                {/* Hair behind the head: a bun, a braid. */}
                {['bun', 'greybun'].includes(look.hair) && <circle cx="-15" cy="-140" r="7.5" fill={hairColor} {...line} strokeWidth="1.6" />}
                {look.hair === 'braid' && <path d="M -11 -133 C -16 -120 -13 -108 -16 -94" stroke={hairColor} strokeWidth="6" fill="none" strokeLinecap="round" />}
                <circle cx="2" cy="-136" r="15" fill={skin} {...line} data-head />
                <ellipse cx="-4" cy="-135" rx="3.2" ry="4.2" fill={skin} {...line} strokeWidth="1.4" />
                {/* The face, turned the way they look. */}
                <circle cx="6" cy="-138" r="1.8" fill={INK} />
                <circle cx="12.5" cy="-138" r="1.8" fill={INK} />
                <path d={pose === 'sad' ? 'M 3.5 -143 L 8 -141.5 M 10.5 -141.5 L 15 -143' : 'M 3.5 -142.5 L 8 -143.2 M 10.5 -143.2 L 15 -142.5'} stroke={INK} strokeWidth="1.4" />
                <path d="M 16.4 -137 L 19 -132 L 16 -131" stroke={INK} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
                {look.moustache && <path d="M 7.5 -130.5 Q 12 -133.5 16.5 -130.5 Q 12 -129 7.5 -130.5 Z" fill={hairColor} />}
                {mouth === 'talk' && <ellipse cx="12" cy="-127" rx="3" ry="2.3" fill="#7a2a22" stroke={INK} strokeWidth="1.1" />}
                {mouth === 'oh' && <ellipse cx="12" cy="-127" rx="2.2" ry="3" fill="#7a2a22" stroke={INK} strokeWidth="1.1" />}
                {mouth === 'happy' && <path d="M 8 -129 Q 12 -123.5 16 -129 Z" fill="#7a2a22" stroke={INK} strokeWidth="1.2" />}
                {mouth === 'sad' && <path d="M 8.5 -125.5 Q 12 -129 15.5 -125.5" stroke={INK} strokeWidth="1.5" fill="none" />}
                {mouth === 'calm' && <path d="M 9 -127.5 Q 12 -126 15 -127.5" stroke={INK} strokeWidth="1.5" fill="none" />}
                {look.beard && <path d="M -6 -132 C -4 -116 8 -112 16 -118 C 19 -121 18 -126 17 -127 C 12 -123 2 -125 -6 -132 Z" fill={hairColor} {...line} strokeWidth="1.4" />}
                {/* Hair on top: short hair, a turban, a cap, or none. */}
                {['hair', 'bun', 'braid', 'grey', 'greybun'].includes(look.hair) && <path d={hairTop} fill={hairColor} {...line} strokeWidth="1.5" />}
                {look.hair === 'turban' && (
                    <>
                        <path d="M -15 -139 C -17 -160 21 -162 19 -139 C 12 -144 -8 -144 -15 -139 Z" fill={look.turban} {...line} />
                        <path d="M -12 -146 C 0 -151 10 -151 17 -146" stroke={INK} strokeWidth="1.2" fill="none" />
                    </>
                )}
                {look.hair === 'cap' && <path d="M -13 -143 L 17 -144 L 13 -157 C 4 -159 -6 -158 -11 -152 Z" fill="#fdfefe" {...line} strokeWidth="1.6" />}
            </g>
            <Arm pts={front} skin={skin} />
            {holds && <g transform={`translate(${pose === 'carry' ? 2 : hand[0] + 3} ${pose === 'carry' ? -164 : hand[1]})`}><Held what={holds} /></g>}
            {pose === 'dig' && <path d="M 30 -100 L 52 -18 M 44 -22 L 60 -14 L 56 -2 L 42 -10 Z" fill="#95a5a6" {...line} />}
        </g>
    );
}

/* ── The words on a panel ─────────────────────────────────────────────── */

/** Each bubble over its speaker, inside the panel and clear of the one before; its tail toward them. One alone is wider (fewer lines, clear of the faces). */
const bubblesOf = (panel, wide) => {
    const alone = (panel.say || []).length < 2;
    const w = wide ? (alone ? 36 : 30) : (alone ? 58 : 46);
    const placed = (panel.say || []).map((b) => ({ ...b, at: panel.cast.find((c) => c.who === b.who)?.x ?? 50 })).sort((a, b) => a.at - b.at);
    let next = 2;
    const out = placed.map((b) => { const left = Math.max(next, Math.min(98 - w, b.at - w / 2)); next = left + w + 2; return { ...b, left }; });
    for (let i = out.length - 1, edge = 98; i >= 0; i -= 1) { if (out[i].left + w > edge) out[i].left = edge - w; edge = out[i].left - 2; }
    return out.map((b) => ({ ...b, w, tail: Math.max(14, Math.min(86, ((b.at - b.left) / w) * 100)) }));
};

const BUBBLE = { oval: { borderRadius: '50%', padding: '0.8em 1.5em' }, round: { borderRadius: '1.3em', padding: '0.7em 1em' }, box: { borderRadius: '6px', padding: '0.6em 0.85em' } };

/** The story's title on its first panel, in its story's style. */
function Title({ text, style, wide, capRef }) {
    const size = wide ? 'clamp(15px, 3.4cqw, 30px)' : 'clamp(14px, 5.4cqw, 26px)';
    const base = 'absolute left-[2.5%] top-[3%] max-w-[70%] px-[0.6em] py-[0.25em] font-black uppercase leading-tight tracking-wide';
    if (style === 'stamp') return <p ref={capRef} className={`${base} -rotate-2 border-[3px] border-[#1b1b1b] text-white shadow-[3px_3px_0_#1b1b1b]`} style={{ fontSize: size, background: '#C0392B' }} data-comic-title="stamp">{text}</p>;
    if (style === 'banner') return <p ref={capRef} className={`${base} px-[1.1em] text-white drop-shadow-[0_3px_0_rgba(0,0,0,.35)]`} style={{ fontSize: size, background: '#1E3A8A', clipPath: 'polygon(0 0, 100% 0, 95% 50%, 100% 100%, 0 100%, 5% 50%)' }} data-comic-title="banner">{text}</p>;
    if (style === 'board') {
        return (
            <p ref={capRef} className={`${base} rounded-md border-[3px] border-[#3d2612]`} style={{ fontSize: size, background: '#8B5A2B', color: '#FFF3D6' }} data-comic-title="board">
                <span aria-hidden="true" className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#3d2612]" /><span aria-hidden="true" className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#3d2612]" />
                {text}
            </p>
        );
    }
    return <p ref={capRef} className={`${base} rounded-full border-[2.5px] border-[#1b1b1b] px-[1em] italic text-[#1b1b1b]`} style={{ fontSize: size, background: '#F5DEB3' }} data-comic-title="scroll">{text}</p>;
}

function Panel({ panel, comic, theme, wide, index }) {
    const gid = `sky${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const W = wide ? 640 : 400;
    const box = useRef(null);
    const cap = useRef(null);
    const [capBox, setCapBox] = useState({ bottom: 0, right: 0 });
    // A bubble starts under the caption box, however many lines it takes — or beside it, when there is room.
    useLayoutEffect(() => {
        const b = box.current, c = cap.current;
        if (!b || !c) return undefined;
        const ro = new ResizeObserver(() => setCapBox({ bottom: ((c.offsetTop + c.offsetHeight) / b.clientHeight) * 100, right: ((c.offsetLeft + c.offsetWidth) / b.clientWidth) * 100 }));
        ro.observe(b);
        // The caption's own size too (2026-11-03): it grows when its font arrives and shrinks with `fit`, the panel not.
        ro.observe(c);
        return () => ro.disconnect();
    }, []);
    // Other languages say it in more letters than English (2026-11-02): when a bubble would cover a face, the
    // panel's words shrink a step at a time until it is clear.
    const [fit, setFit] = useState(1);
    useLayoutEffect(() => {
        const b = box.current;
        if (!b || fit <= 0.72) return undefined;
        const id = requestAnimationFrame(() => {
            const faces = [...b.querySelectorAll('[data-head]')].map((h) => h.getBoundingClientRect());
            const covers = [...b.querySelectorAll('[data-bubble] > p')].some((el) => {
                const r = el.getBoundingClientRect();
                return faces.some((f) => r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top + f.height / 3);
            });
            if (covers) setFit((x) => Math.round((x - 0.07) * 100) / 100);
        });
        return () => cancelAnimationFrame(id);
    });
    const sized = (k) => (wide ? `clamp(${10 * k}px, ${2.05 * k}cqw, ${15 * k}px)` : `clamp(${10 * k}px, ${3.1 * k}cqw, ${15 * k}px)`);
    const fontSize = sized(1);
    const wordsSize = sized(fit);
    const people = comic.people || {};
    const speakers = new Set((panel.say || []).map((b) => b.who));
    const caption = panel.title ? null : panel.caption;
    const { frame } = theme;
    // A close-up: the people twice as big, from the waist up.
    const zoom = panel.zoom ? 2 : 1;
    // Each bubble under the caption box (or beside it, when there is room), and never above the one said before
    // it: a page is read top to bottom, left to right.
    const placed = bubblesOf(panel, wide).reduce((out, b) => {
        const own = (caption || panel.title) && b.left < capBox.right + 1.5 ? capBox.bottom + 2 : 4;
        return [...out, { ...b, top: Math.max(own, out.at(-1)?.top ?? 0) }];
    }, []);
    return (
        <figure className="overflow-hidden bg-white [container-type:inline-size]" style={{ fontFamily: FONT, border: `${frame.width}px solid ${frame.color}`, borderRadius: frame.radius, boxShadow: frame.shadow ? `5px 5px 0 ${frame.color}` : undefined, gridColumn: wide ? `span ${wide} / span ${wide}` : undefined }}
            data-comic-panel={index} data-zoom={panel.zoom || undefined}>
            <div ref={box} className="relative" style={{ aspectRatio: `${W} / ${H}` }}>
                <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                    <Scene panel={panel} W={W} theme={theme} gid={gid} />
                    {!panel.zoom && (panel.props || []).filter((p) => !p.front).map((p, i) => <Prop key={i} prop={p} W={W} theme={theme} />)}
                    {panel.cast.map((c) => people[c.who] && (
                        <Person key={c.who} look={people[c.who]} pose={c.pose} face={c.face} x={(c.x / 100) * W} y={panel.zoom ? (people[c.who].child ? 292 : 332) : c.y} holds={c.holds} speaking={speakers.has(c.who)} size={zoom} />
                    ))}
                    {!panel.zoom && (panel.props || []).filter((p) => p.front).map((p, i) => <Prop key={i} prop={p} W={W} theme={theme} />)}
                    <Weather panel={panel} W={W} />
                </svg>
                {panel.title && <Title text={comic.title} style={theme.title} wide={wide} capRef={cap} />}
                {caption && (
                    <p ref={cap} className="absolute left-[2.5%] top-[3%] max-w-[64%] border-2 border-[#1b1b1b] px-[0.6em] py-[0.3em] font-bold uppercase leading-snug text-[#1b1b1b]" style={{ fontSize: wordsSize, background: theme.caption, borderRadius: frame.radius ? 6 : 0 }} data-comic-caption>{caption}</p>
                )}
                {placed.map((b) => (
                    <div key={b.who} className="absolute" style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%` }} data-bubble={b.who}>
                        <p className="relative border-2 border-[#1b1b1b] bg-white text-center font-bold uppercase leading-snug text-[#1b1b1b]" style={{ fontSize: wordsSize, ...BUBBLE[theme.bubble] }} data-bubble-style={theme.bubble}>
                            <span className="sr-only">{b.name ? `${b.name} says: ` : ''}</span>{b.text}
                            <svg className="absolute" style={{ left: `calc(${b.tail}% - 8px)`, top: 'calc(100% - 3px)' }} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                                <path d="M1 1 L6 15 L15 1" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
                                <rect x="2.5" y="0" width="11" height="3" fill="#fff" />
                            </svg>
                        </p>
                    </div>
                ))}
            </div>
            {panel.narration && (
                <figcaption className="px-[1em] py-[0.6em] font-bold uppercase leading-snug text-[#1b1b1b]" style={{ fontSize, background: theme.narration, borderTop: `${frame.width}px solid ${frame.color}` }} data-comic-narration>{panel.narration}</figcaption>
            )}
        </figure>
    );
}

/** The story's words in reading order, to be read aloud: its panels, then its moral (in its own language, 2026-11-02). */
const wordsOf = (comic) => [comic.title, ...comic.panels.flatMap((p) => [p.caption, ...(p.say || []).map((b) => (b.name ? `${b.name.replace(/^the /, 'The ')} says: ${b.text}` : b.text)), p.narration]),
    comic.moral && (comic.moralLabel ? `${comic.moralLabel} ${comic.moral}` : `The moral of the story: ${comic.moral}`)].filter(Boolean);

/** How many columns each panel spans: a wide one the whole row; one that would be alone at a row's end, the rest of it. */
const spansOf = (panels, columns) => {
    const out = [];
    for (let i = 0, col = 0; i < panels.length; i += 1) {
        let span = panels[i].wide ? columns : 1;
        if (!panels[i].wide && col + 1 < columns && (i === panels.length - 1 || panels[i + 1].wide)) span = columns - col;
        if (panels[i].wide && col > 0) col = 0;
        out.push(span);
        col = (col + span) % columns;
    }
    return out;
};

/** The page: its panels in its story's layout and look, its moral at the end; and Read aloud. */
export default function Comic({ comic }) {
    const page = useRef(null);
    const [width, setWidth] = useState(0);
    const [reading, setReading] = useState(false);
    useLayoutEffect(() => {
        const el = page.current;
        if (!el) return undefined;
        const ro = new ResizeObserver(() => setWidth(el.clientWidth));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    useEffect(() => () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); }, []);
    if (!comic?.panels?.length) return null;
    const theme = themeOf(comic.theme);
    // Its own layout: three to a row for a story drawn so, on a page wide enough; two; one on a phone.
    const columns = width >= 900 && theme.columns === 3 ? 3 : width >= 640 ? 2 : 1;
    const spans = spansOf(comic.panels, columns);
    const canRead = typeof window !== 'undefined' && !!window.speechSynthesis;
    const toggle = () => {
        if (reading) { window.speechSynthesis.cancel(); setReading(false); return; }
        const u = new SpeechSynthesisUtterance(wordsOf(comic).join('\n'));
        u.lang = comic.locale || 'en-IN'; u.rate = 0.92; u.onend = () => setReading(false); u.onerror = () => setReading(false);
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); setReading(true);
    };
    return (
        <div ref={page} className="space-y-3" data-comic data-comic-theme={comic.theme || 'summer'} lang={(comic.locale || 'en-IN').split('-')[0]}>
            {canRead && (
                <div className="flex justify-end">
                    <button type="button" onClick={toggle} aria-pressed={reading} className="lingo-btn inline-flex h-11 items-center gap-2 px-3 text-sm" style={{ background: '#fff', borderColor: '#E5E5E5', color: COLORS.blue.ink }} data-comic-read>
                        {reading ? <><Square size={15} /> Stop</> : <><Headphones size={17} /> Read aloud</>}
                    </button>
                </div>
            )}
            <div className="grid gap-3 rounded-md p-2.5 shadow-[0_2px_10px_rgba(0,0,0,.12)] ring-1 ring-black/10" style={{ background: theme.page, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} data-comic-page data-columns={columns}>
                {comic.panels.map((p, i) => <Panel key={i} panel={p} comic={comic} theme={theme} wide={columns > 1 && spans[i] > 1 ? spans[i] : 0} index={i} />)}
                {/* The story's moral, the end of the page. */}
                {comic.moral && (
                    <p className="border-[3px] border-[#1b1b1b] px-4 py-3 text-center font-black uppercase leading-snug tracking-wide" style={{ gridColumn: '1 / -1', fontFamily: FONT, background: theme.moral[0], color: theme.moral[1], fontSize: 'clamp(13px, 1.9vw, 18px)', borderRadius: theme.frame.radius }} data-comic-moral>
                        <span className="mr-2 opacity-80">{comic.moralLabel || 'Moral:'}</span>{comic.moral}
                    </p>
                )}
            </div>
        </div>
    );
}
