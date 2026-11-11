/**
 * Language Learning — a picture story (asked 2026-10-31, from a page of a comic book the student showed: "make the
 * interface like this"): a comic page of bordered panels, each a drawn scene with its people, a caption box, speech
 * bubbles pointing at who speaks, a line of narration under some, and the story's moral at the end. Drawn here in
 * SVG from the story's words (the server's comics.js) — no pictures to load. Read aloud panel by panel.
 *
 * One look for every story (2026-11-04, from the page the user showed: "add this type of interface for all
 * stories", `LOOK`): a bright blue sky with white clouds, green hills and grass with flowers, thatched huts; rounded
 * panels on a soft lilac page, two to a row; the title on a wooden sign hung by two ropes, yellow caption tags,
 * white bubbles edged in purple, and each line of narration in a cream bar with its own speaker. Close-ups
 * (`zoom`), evenings, nights and rain vary the panels inside a story. (From 2026-10-31 each story had its own
 * look — summer, journey, monsoon, dusk; the story's `theme` is still sent, and marked on the page.)
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Headphones, Square, Volume2 } from 'lucide-react';

// Soft brown outlines, as a children's picture book draws them (2026-11-05, the user's picture).
const INK = '#4a3222';
const H = 240;
const GROUND = 226;
const HORIZON = 150;
const FONT = "'Nunito', ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, sans-serif";
const line = { stroke: INK, strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' };

/** The look of every story: its sky, hills, grass, path, water, trees (light, dark, highlight), huts (walls, thatch), clouds, flowers; and the page's. */
const LOOK = {
    sky: ['#45b3ee', '#d6f1ff'], hills: ['#9ed4bc', '#86cc62'], ground: '#76c84b', path: '#efdcab', water: '#3aa6d8',
    trees: ['#5cbf3a', '#3f9a2c', '#8fdb5f'], hut: ['#f3dcaa', '#d9a441'], clouds: '#ffffff', flowers: ['#ff6fa3', '#ffd23f', '#ff8a5c'],
    page: '#F3EFFF', purple: '#7C5CD6', ink: '#2A1F4D', narration: '#FFF8E6'
};

/* ── The scenery ──────────────────────────────────────────────────────── */

/** A leafy tree: a trunk with two branches, its crown in clusters — dark behind, light in front, sunlit on top. */
function Tree({ x, y, s = 1, tone }) {
    const leaf = { stroke: tone[1], strokeWidth: 1.4, strokeOpacity: 0.6 };
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M -9 0 C -7 -24 -8 -44 -6 -62 L 6 -62 C 8 -44 7 -24 10 0 Z" fill="#8b5a2b" {...line} />
            <path d="M -3 -44 C -12 -52 -18 -58 -24 -66 M 3 -50 C 12 -58 18 -62 24 -70" stroke="#7a4d24" strokeWidth="4" strokeLinecap="round" fill="none" />
            {[[-30, -76, 22], [30, -78, 23], [0, -70, 24]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={tone[1]} {...line} />)}
            {[[-20, -98, 26], [20, -100, 26], [0, -114, 25]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={tone[0]} {...line} />)}
            {[[-26, -106, 9], [8, -124, 9], [26, -108, 7]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={tone[2]} />)}
            <path d="M -34 -88 q 5 -4 10 0 M 12 -86 q 5 -4 10 0 M -6 -100 q 5 -4 10 0" fill="none" {...leaf} />
        </g>
    );
}
/** A village hut: mud walls, a door and a window, a thatched roof of straw. */
function Hut({ x, y, s = 1, tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            <rect x="-30" y="-40" width="60" height="40" rx="3" fill={tone[0]} {...line} />
            <rect x="-30" y="-8" width="60" height="8" fill="#e2c58e" />
            <rect x="-30" y="-40" width="60" height="40" rx="3" fill="none" {...line} />
            <rect x="-8" y="-28" width="16" height="28" rx="2" fill="#5a3b26" {...line} strokeWidth="1.4" />
            <rect x="14" y="-30" width="10" height="10" rx="1.5" fill="#5a3b26" {...line} strokeWidth="1.2" />
            <path d="M -45 -34 Q -40 -62 0 -80 Q 40 -62 45 -34 Q 22 -29 0 -31 Q -22 -29 -45 -34 Z" fill={tone[1]} stroke="#a8741f" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M -34 -38 Q -26 -60 -6 -74 M -18 -34 Q -12 -56 0 -76 M 0 -32 L 2 -76 M 18 -34 Q 14 -56 4 -76 M 34 -38 Q 26 -58 8 -74" stroke="#b8862e" strokeWidth="1.3" fill="none" />
            <path d="M -45 -34 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 5 l 5 -4 l 5 4" stroke="#a8741f" strokeWidth="1.4" fill="none" strokeLinejoin="round" />
        </g>
    );
}
/** Small round trees along the far hills. */
function FarTrees({ W, tone, y = HORIZON - 4 }) {
    return (
        <g>
            {[0.05, 0.19, 0.31, 0.69, 0.8, 0.95].map((f, i) => (
                <g key={f} transform={`translate(${W * f} ${y + (i % 2) * 5})`}>
                    <rect x="-1.5" y="-7" width="3" height="9" fill="#7a5230" />
                    <circle cy="-14" r={7 + (i % 3) * 2} fill={tone[1]} />
                    <circle cx="-3" cy="-17" r={3 + (i % 2)} fill={tone[0]} />
                </g>
            ))}
        </g>
    );
}
/** A low bush. */
function Bush({ x, y, s = 1, tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#2f7d22" strokeWidth="1.4">
            <circle cx="-14" cy="-8" r="12" fill={tone[1]} />
            <circle cx="12" cy="-9" r="13" fill={tone[1]} />
            <circle cx="0" cy="-16" r="14" fill={tone[0]} />
            <circle cx="-4" cy="-22" r="5" fill={tone[2]} stroke="none" />
        </g>
    );
}
/** Tufts of grass on the ground. */
function Tufts({ W }) {
    return (
        <g stroke="#4f9e2e" strokeWidth="1.6" strokeLinecap="round" fill="none">
            {[[0.16, 214], [0.3, 232], [0.44, 220], [0.6, 234], [0.74, 216], [0.88, 230], [0.24, 178], [0.68, 182], [0.52, 196]].map(([f, ty]) => (
                <path key={f} d={`M ${W * f - 5} ${ty} l 2 -6 M ${W * f} ${ty} l 0 -8 M ${W * f + 5} ${ty} l -2 -6`} />
            ))}
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
/** The old banyan: a thick trunk on its buttress roots, a wide crown in clusters, and roots hanging from its branches to the ground. */
function Banyan({ x, y, s = 1, tone }) {
    return (
        <g transform={`translate(${x} ${y}) scale(${s})`}>
            {/* The roots hanging down (from under the crown to the ground). */}
            {[-104, -86, -66, -48, 46, 64, 84, 102].map((rx, i) => (
                <path key={rx} d={`M ${rx} -${96 + (i % 3) * 6} C ${rx + 3} -62 ${rx - 3} -30 ${rx + 1} ${i % 2 ? -10 : 0}`} stroke="#7a5230" strokeWidth={i % 2 ? 2.4 : 3.2} fill="none" strokeLinecap="round" />
            ))}
            <path d="M -36 0 C -24 -8 -22 -40 -18 -70 C -16 -86 -22 -98 -30 -106 L 30 -106 C 22 -98 18 -86 20 -70 C 24 -40 26 -8 38 0 Z" fill="#8a5a32" {...line} />
            <path d="M -8 -10 C -6 -40 -8 -70 -4 -96 M 8 -14 C 10 -44 6 -72 10 -98 M -24 0 C -16 -6 -12 -14 -12 -24" stroke="#6b4426" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            {[[-118, -112, 30], [-80, -134, 38], [-30, -150, 42], [26, -150, 42], [78, -136, 38], [118, -114, 30]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={tone[1]} {...line} />)}
            {[[-98, -106, 30], [-54, -122, 34], [0, -128, 36], [54, -122, 34], [98, -106, 28]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={tone[0]} {...line} />)}
            {[[-66, -146, 12], [-12, -168, 15], [40, -160, 13], [96, -130, 9], [-104, -124, 8]].map(([cx, cy, r]) => <circle key={cx} cx={cx} cy={cy} r={r} fill={tone[2]} />)}
            <path d="M -120 -96 Q 0 -78 120 -96" stroke={tone[1]} strokeWidth="6" fill="none" strokeLinecap="round" />
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
        <g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}>
            <path d="M -38 10 C -48 10 -48 -6 -36 -6 C -36 -20 -18 -24 -10 -14 C -6 -30 22 -30 24 -12 C 36 -16 46 -4 38 10 Z" />
            <path d="M -36 10 L 38 10" stroke="#d6ecf8" strokeWidth="2" />
        </g>
    );
}

/** A bush of flowers at the front of a scene. */
function Flowers({ x, flip = false, colors }) {
    return (
        <g transform={`translate(${x} ${H}) scale(${flip ? -1 : 1} 1)`}>
            <path d="M -30 2 C -32 -16 -18 -26 -6 -22 C 0 -34 18 -32 22 -18 C 34 -18 38 -4 34 2 Z" fill="#3f9a2c" />
            <path d="M -18 -6 q 6 -14 14 -16 M 6 -8 q 4 -12 14 -12" stroke="#2f7d22" strokeWidth="2" fill="none" />
            {[[-16, -18, 0], [4, -26, 1], [22, -14, 2], [-2, -8, 0]].map(([fx, fy, c]) => (
                <g key={`${fx}${fy}`} transform={`translate(${fx} ${fy})`}>
                    {[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx="0" cy="-4.5" rx="3" ry="4.5" fill={colors[c]} transform={`rotate(${r})`} />)}
                    <circle r="2.4" fill="#fff3b0" />
                </g>
            ))}
        </g>
    );
}

/** The scene behind a panel `W` wide, in the stories' look: its sky (or a room), its ground and what stands there. */
function Scene({ panel, W, theme, gid }) {
    const { scene } = panel;
    const sky = scene === 'house' ? null : panel.night ? ['#0f1d3a', '#34497a'] : panel.evening ? ['#f08a4b', '#fcd9a0'] : theme.sky;
    const ground = <rect x="0" y={HORIZON} width={W} height={H - HORIZON} fill={`url(#${gid}g)`} />;
    // Two rows of hills: the far ones paler.
    const hills = (lift = 0) => (
        <>
            <path d={`M 0 ${HORIZON - 30 - lift} Q ${W * 0.18} ${HORIZON - 58 - lift} ${W * 0.4} ${HORIZON - 34 - lift} T ${W * 0.78} ${HORIZON - 40 - lift} T ${W} ${HORIZON - 30 - lift} L ${W} ${HORIZON + 2} L 0 ${HORIZON + 2} Z`} fill={theme.hills[0]} />
            <path d={`M 0 ${HORIZON - 14 - lift} Q ${W * 0.25} ${HORIZON - 40 - lift} ${W * 0.5} ${HORIZON - 16 - lift} T ${W} ${HORIZON - 22 - lift} L ${W} ${HORIZON + 2} L 0 ${HORIZON + 2} Z`} fill={theme.hills[1]} />
        </>
    );
    const outdoors = !['house', 'market', 'river'].includes(scene);
    const focus = (panel.focus ?? 50) / 100;
    const water = theme.water || '#4fa3dc';
    return (
        <>
            <defs>
                {sky && <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient>}
                <linearGradient id={`${gid}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#93d86a" /><stop offset="1" stopColor={theme.ground} /></linearGradient>
            </defs>
            {sky && <rect x="0" y="0" width={W} height={HORIZON + 2} fill={`url(#${gid})`} />}
            {/* The evening's low sun; the clouds. */}
            {sky && panel.evening && <circle cx={W * 0.8} cy="74" r="18" fill="#f9e79f" opacity=".9" />}
            {sky && !panel.night && theme.clouds && [[0.62, 34, 0.9], [0.84, 60, 0.7], [0.36, 70, 0.6]].map(([f, y, s2]) => <Cloud key={f} x={W * f} y={y} s={s2} fill={theme.clouds} />)}
            {scene === 'village' && (
                <>
                    {hills()}
                    <FarTrees W={W} tone={theme.trees} />
                    {ground}
                    <Tufts W={W} />
                    <ellipse cx={W * 0.5} cy={GROUND + 4} rx={W * 0.36} ry="10" fill={theme.path} />
                    <Tree x={W * 0.08} y={HORIZON + 22} s={0.95} tone={theme.trees} />
                    <Tree x={W * 0.56} y={HORIZON} s={0.42} tone={theme.trees} />
                    <Bush x={W * 0.7} y={HORIZON + 8} s={0.7} tone={theme.trees} />
                    <Hut x={W * 0.9} y={HORIZON + 26} s={0.85} tone={theme.hut} />
                </>
            )}
            {scene === 'road' && (
                <>
                    {hills(4)}
                    <FarTrees W={W} tone={theme.trees} />
                    {ground}
                    <Tufts W={W} />
                    <path d={`M ${W * 0.3} ${H} L ${W * 0.47} ${HORIZON} L ${W * 0.53} ${HORIZON} L ${W * 0.74} ${H} Z`} fill={theme.path} />
                    <path d={`M ${W * 0.3} ${H} L ${W * 0.47} ${HORIZON} M ${W * 0.53} ${HORIZON} L ${W * 0.74} ${H}`} stroke="#d9c08a" strokeWidth="3" />
                    <Tree x={W * 0.1} y={HORIZON + 40} s={1} tone={theme.trees} />
                    <Tree x={W * 0.38} y={HORIZON + 2} s={0.35} tone={theme.trees} />
                    <Tree x={W * 0.64} y={HORIZON + 4} s={0.4} tone={theme.trees} />
                    <Tree x={W * 0.9} y={HORIZON + 34} s={0.85} tone={theme.trees} />
                </>
            )}
            {scene === 'river' && (
                <>
                    <rect x="0" y={HORIZON - 26} width={W} height="28" fill={theme.hills[1]} />
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
                    <FarTrees W={W} tone={theme.trees} y={HORIZON - 12} />
                    {ground}
                    <Tufts W={W} />
                    <Bush x={W * (focus > 0.5 ? 0.24 : 0.76)} y={HORIZON + 10} s={0.6} tone={theme.trees} />
                    <Hut x={W * (focus > 0.5 ? 0.1 : 0.9)} y={HORIZON + 14} s={0.6} tone={theme.hut} />
                    <ellipse cx={W * focus} cy={GROUND - 24} rx={W > 500 ? 150 : 120} ry="16" fill="#5aae3a" opacity=".55" />
                    <Banyan x={W * focus} y={GROUND - 30} s={W > 500 ? 1 : 0.86} tone={theme.trees} />
                </>
            )}
            {(scene === 'field' || scene === 'water') && (
                <>
                    {hills(-2)}
                    <FarTrees W={W} tone={theme.trees} />
                    {ground}
                    <Tufts W={W} />
                    <path d={`M ${W * 0.62} ${HORIZON + 30} Q ${W * 0.78} ${HORIZON - 6} ${W * 0.98} ${HORIZON + 30} Z`} fill="#9a6a3a" {...line} />
                    <ellipse cx={W * 0.48} cy={GROUND - 4} rx="40" ry="11" fill={scene === 'water' ? water : '#4a3020'} {...line} />
                    {scene === 'water' && <path d={`M ${W * 0.48 - 12} ${GROUND - 14} q 4 -18 8 -2 M ${W * 0.48 + 4} ${GROUND - 16} q 5 -22 10 -2 M ${W * 0.48 - 24} ${GROUND - 10} q 2 -10 6 0`} stroke={water} strokeWidth="3" fill="none" strokeLinecap="round" />}
                    <Tree x={W * 0.12} y={HORIZON + 6} s={0.5} tone={theme.trees} />
                </>
            )}
            {/* Flowers at the front corners, outdoors. */}
            {outdoors && <><Flowers x={W * 0.035} colors={theme.flowers} /><Flowers x={W * 0.965} flip colors={theme.flowers} /></>}
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

// Each pose's arms, from the shoulder (y -100) by the elbow to the hand; `w` widens a big man.
const ARMS = {
    stand: (w) => [[-14 * w, -100, -19 * w, -80, -20 * w, -62], [14 * w, -100, 19 * w, -80, 20 * w, -62]],
    talk: (w) => [[-14 * w, -100, -19 * w, -80, -20 * w, -62], [14 * w, -100, 26 * w, -84, 35 * w, -94]],
    point: (w) => [[-14 * w, -100, -19 * w, -80, -20 * w, -62], [14 * w, -100, 33 * w, -98, 55 * w, -100]],
    cheer: (w) => [[-14 * w, -100, -26 * w, -118, -30 * w, -140], [14 * w, -100, 26 * w, -118, 30 * w, -140]],
    sad: (w) => [[-14 * w, -98, -15 * w, -78, -10 * w, -64], [14 * w, -98, 15 * w, -78, 10 * w, -64]],
    give: (w) => [[-14 * w, -100, -19 * w, -80, -20 * w, -62], [14 * w, -100, 29 * w, -86, 46 * w, -82]],
    carry: (w) => [[-14 * w, -100, -21 * w, -122, -10, -150], [14 * w, -100, 21 * w, -122, 14, -150]],
    dig: (w) => [[-14 * w, -100, 6 * w, -90, 27 * w, -80], [14 * w, -100, 27 * w, -86, 37 * w, -72]],
    surprise: (w) => [[-14 * w, -100, -24 * w, -110, -20 * w, -128], [14 * w, -100, 25 * w, -110, 23 * w, -128]]
};
const MOUTH = { talk: 'talk', point: 'talk', cheer: 'happy', give: 'happy', sad: 'sad', surprise: 'oh' };
const GOLD = '#f4c542';

function Arm({ pts, skin }) {
    const p = pts.join(' ');
    const [hx, hy] = pts.slice(-2);
    return (
        <g>
            <polyline points={p} fill="none" stroke={INK} strokeWidth="10.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points={p} fill="none" stroke={skin} strokeWidth="7.4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={hx} cy={hy} r="5.2" fill={skin} {...line} strokeWidth="1.5" />
        </g>
    );
}

/**
 * Someone in the story, drawn as a picture book draws them (2026-11-05, the user's picture): a big round head with
 * a happy face — eyes with a shine, eyebrows, pink cheeks — clothes with gold borders, a soft shadow at their feet.
 * Their look (skin, clothes, hair), how they stand, which way they face, what they hold; `size` for a close-up.
 */
function Person({ look, pose = 'stand', face = 'right', x, y = GROUND, holds, speaking, size = 1 }) {
    const s = (look.child ? 0.58 : 0.75) * size;
    const w = look.big ? 1.15 : 1;
    const skin = look.skin || '#c68642';
    const grey = ['grey', 'greybun'].includes(look.hair);
    const hairColor = grey ? '#ededed' : '#2b211c';
    const [back, front] = (ARMS[pose] || ARMS.stand)(w);
    const mouth = MOUTH[pose] || (speaking ? 'talk' : 'calm');
    const hand = front.slice(-2);
    const long = look.woman;
    return (
        <g transform={`translate(${x} ${y}) scale(${face === 'left' ? -s : s} ${s})`}>
            <ellipse cx="2" cy="0" rx={24 * w} ry="4.5" fill="rgba(40,60,20,.18)" />
            {/* Long hair down the back; a braid with a flower at its end. */}
            {long && !['bun', 'greybun', 'braid'].includes(look.hair) && look.hair !== 'cap' && look.hair !== 'turban' && <path d="M -18 -132 C -24 -112 -20 -98 -12 -92 L -6 -104 C -12 -112 -12 -124 -10 -134 Z" fill={hairColor} {...line} strokeWidth="1.4" />}
            {look.hair === 'braid' && (
                <g>
                    <path d="M -14 -120 C -22 -104 -16 -92 -20 -76" stroke={INK} strokeWidth="9" fill="none" strokeLinecap="round" />
                    <path d="M -14 -120 C -22 -104 -16 -92 -20 -76" stroke={hairColor} strokeWidth="6.4" fill="none" strokeLinecap="round" />
                    {[-108, -96, -84].map((by) => <path key={by} d={`M -22 ${by} q 4 3 7 0`} stroke="#5a4a40" strokeWidth="1" fill="none" />)}
                    <circle cx="-20" cy="-74" r="3" fill="#ff6fa3" stroke={INK} strokeWidth="1" />
                </g>
            )}
            <Arm pts={back} skin={skin} />
            {/* Below the waist: a dhoti with its folds, or a sari's skirt with its gold border and pleats. */}
            {look.woman ? (
                <>
                    <path d={`M ${-14 * w} -66 L ${14 * w} -66 L ${22 * w} -4 L ${-22 * w} -4 Z`} fill={look.cloth} {...line} />
                    <path d={`M ${-21 * w} -11 L ${21 * w} -11`} stroke={GOLD} strokeWidth="5" />
                    <path d={`M 2 -60 L 4 -14 M 9 -60 L 13 -14`} stroke="rgba(0,0,0,.18)" strokeWidth="1.4" />
                </>
            ) : (
                <>
                    <path d={`M ${-15 * w} -66 L ${15 * w} -66 L ${18 * w} -6 L 3 -6 L 0 -34 L -3 -6 L ${-18 * w} -6 Z`} fill={look.dhoti || '#fbfbf5'} {...line} />
                    <path d={`M -8 -60 L -10 -14 M 8 -60 L 11 -14`} stroke="rgba(0,0,0,.12)" strokeWidth="1.4" />
                </>
            )}
            <ellipse cx="-8" cy="-3" rx="8" ry="4" fill={skin} {...line} strokeWidth="1.4" />
            <ellipse cx="11" cy="-3" rx="8" ry="4" fill={skin} {...line} strokeWidth="1.4" />
            {/* The body: bare with a shawl across it, a shirt, or a blouse under the sari's end — gold along their edges. */}
            <path d={`M ${-14 * w} -102 Q ${-17 * w} -84 ${-14 * w} -64 L ${14 * w} -64 Q ${17 * w} -84 ${14 * w} -102 Q 0 -106 ${-14 * w} -102 Z`} fill={look.woman ? look.blouse : look.shirt || skin} {...line} />
            {look.woman
                ? <><path d={`M ${14 * w} -102 L ${4 * w} -105 L ${-16 * w} -74 L ${-15 * w} -64 L ${-5 * w} -64 Z`} fill={look.cloth} {...line} /><path d={`M ${4 * w} -104 L ${-15 * w} -72`} stroke={GOLD} strokeWidth="2.6" /></>
                : look.shawl && <><path d={`M ${-14 * w} -102 L ${-4 * w} -105 L ${16 * w} -76 L ${15 * w} -64 L ${6 * w} -64 Z M ${-14 * w} -102 L ${-20 * w} -96 L ${-21 * w} -78 L ${-15 * w} -78 Z`} fill={look.shawl} {...line} /><path d={`M ${-4 * w} -104 L ${16 * w} -74`} stroke={GOLD} strokeWidth="2.4" /></>}
            <rect x="-4.5" y="-111" width="9" height="10" fill={skin} {...line} strokeWidth="1.4" />
            <g transform={pose === 'sad' ? 'rotate(10 0 -110)' : undefined}>
                {['bun', 'greybun'].includes(look.hair) && <circle cx="-18" cy="-138" r="8.5" fill={hairColor} {...line} strokeWidth="1.5" />}
                <circle cx="2" cy="-128" r="21" fill={skin} {...line} data-head />
                <ellipse cx="-12" cy="-127" rx="4" ry="5.5" fill={skin} {...line} strokeWidth="1.3" />
                {/* The face, turned the way they look: eyes with a shine, eyebrows, pink cheeks, the mouth. */}
                {[6.5, 15.5].map((ex) => (
                    <g key={ex}>
                        <ellipse cx={ex} cy="-131" rx="3.4" ry="4.2" fill="#fff" stroke={INK} strokeWidth="1" />
                        <circle cx={ex + 0.8} cy="-130.4" r="2.3" fill="#2b1d14" />
                        <circle cx={ex + 1.6} cy="-131.6" r="0.8" fill="#fff" />
                    </g>
                ))}
                <path d={pose === 'sad' ? 'M 3 -138.5 L 9 -136.5 M 13 -136.5 L 19 -138.5' : 'M 3 -137 Q 6.5 -139.8 10 -137.6 M 12 -137.6 Q 15.5 -139.8 19 -137'} stroke={grey ? '#9a9a9a' : '#2b211c'} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <circle cx="3" cy="-121.5" r="3.2" fill="#f28b82" opacity=".45" />
                <circle cx="19" cy="-121.5" r="3.2" fill="#f28b82" opacity=".45" />
                <path d="M 21.5 -128 Q 24 -125 21 -123.5" stroke={INK} strokeWidth="1.3" fill="none" strokeLinecap="round" />
                {look.moustache && <path d="M 7 -119.6 Q 12 -123 17.5 -119.6 Q 12 -117.6 7 -119.6 Z" fill={hairColor} stroke={INK} strokeWidth=".8" />}
                {mouth === 'talk' && <ellipse cx="12.5" cy="-115.5" rx="3.2" ry="2.6" fill="#8a2f25" stroke={INK} strokeWidth="1" />}
                {mouth === 'oh' && <ellipse cx="12.5" cy="-115.5" rx="2.4" ry="3.2" fill="#8a2f25" stroke={INK} strokeWidth="1" />}
                {mouth === 'happy' && <g><path d="M 7.5 -118 Q 12.5 -109.5 18 -118 Z" fill="#8a2f25" stroke={INK} strokeWidth="1.1" /><path d="M 10 -113.6 Q 12.6 -112 15.4 -113.6" stroke="#e8736a" strokeWidth="1.6" fill="none" /></g>}
                {mouth === 'sad' && <path d="M 8.5 -113.5 Q 12.5 -117.5 16.5 -113.5" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />}
                {mouth === 'calm' && <path d="M 8 -117 Q 12.5 -112.8 17 -117" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />}
                {look.beard && <path d="M -9 -122 C -8 -98 10 -94 22 -108 C 24 -112 23 -117 22 -119 C 19 -112 6 -112 -1 -116 C -4 -118 -7 -120 -9 -122 Z" fill={hairColor} {...line} strokeWidth="1.3" />}
                {/* Hair on top: hair parted on the side, a turban, a cap, or none. */}
                {['hair', 'bun', 'braid', 'grey', 'greybun'].includes(look.hair) && <path d="M -19 -130 C -22 -152 8 -160 22 -142 C 24 -138 23 -134 22 -132 C 16 -142 6 -144 -2 -141 C -8 -139 -14 -135 -19 -130 Z" fill={hairColor} {...line} strokeWidth="1.4" />}
                {look.hair === 'turban' && (
                    <>
                        <path d="M -21 -134 C -24 -162 28 -164 25 -134 C 15 -142 -10 -142 -21 -134 Z" fill={look.turban} {...line} />
                        <path d="M -17 -142 C -2 -150 12 -150 22 -142 M -13 -152 C 0 -156 12 -156 19 -150" stroke="rgba(0,0,0,.25)" strokeWidth="1.3" fill="none" />
                    </>
                )}
                {look.hair === 'cap' && <path d="M -19 -138 L 24 -140 L 19 -156 C 6 -160 -9 -159 -17 -150 Z" fill="#fdfefe" {...line} strokeWidth="1.5" />}
            </g>
            <Arm pts={front} skin={skin} />
            {holds && <g transform={`translate(${pose === 'carry' ? 2 : hand[0] + 3} ${pose === 'carry' ? -160 : hand[1]})`}><Held what={holds} /></g>}
            {pose === 'dig' && <path d="M 30 -88 L 50 -10 M 42 -14 L 58 -6 L 54 6 L 40 -2 Z" fill="#95a5a6" {...line} />}
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

/** The story's title on its first panel: a wooden sign hung from the top on two ropes, a leaf at each end. */
function Title({ text, wide, capRef }) {
    const size = wide ? 'clamp(16px, 3.5cqw, 34px)' : 'clamp(15px, 5.6cqw, 28px)';
    const leaf = (side) => (
        <svg aria-hidden="true" viewBox="0 0 40 24" className={`absolute top-1/2 h-[1.1em] w-[1.8em] -translate-y-1/2 ${side === 'left' ? '-left-[1.1em] -scale-x-100' : '-right-[1.1em]'}`}>
            <path d="M2 12 C 10 0 30 0 38 12 C 30 24 10 24 2 12 Z" fill="#5cbf3a" stroke="#2f7d22" strokeWidth="2" />
            <path d="M4 12 L 34 12" stroke="#2f7d22" strokeWidth="1.6" />
        </svg>
    );
    return (
        <div ref={capRef} className="absolute inset-x-0 top-0 z-[1] mx-auto w-fit max-w-[80%] pt-[1.1em]" style={{ fontSize: size }} data-comic-title="sign">
            {['left-[14%]', 'right-[14%]'].map((at) => (
                <span key={at} aria-hidden="true" className={`absolute top-0 ${at} h-[1.35em] w-[0.16em] rounded-full bg-[#9a6a35]`}>
                    <span className="absolute -bottom-[0.12em] left-1/2 h-[0.34em] w-[0.34em] -translate-x-1/2 rounded-full border-[0.08em] border-[#6b4422] bg-[#c99a5b]" />
                </span>
            ))}
            <p className="relative rounded-[0.4em] border-[0.1em] border-[#b07a3a] px-[1.1em] py-[0.28em] text-center font-black leading-tight"
                style={{ color: LOOK.ink, background: 'repeating-linear-gradient(180deg, rgba(160,110,50,.10) 0 0.18em, transparent 0.18em 0.5em), linear-gradient(#fbe7b9, #ebc581)', boxShadow: '0 0.14em 0 #b07a3a, 0 0.35em 0.6em rgba(0,0,0,.18)', textWrap: 'balance' }}>
                {leaf('left')}{text}{leaf('right')}
            </p>
        </div>
    );
}

/** A line of narration read aloud, from the purple speaker in its bar. */
function SayLine({ text, lang }) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return null;
    const say = () => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang || 'en-IN'; u.rate = 0.92;
        window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    };
    return (
        <button type="button" onClick={say} aria-label={`Listen: ${text}`} className="flex h-[2.4em] w-[2.4em] shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95"
            style={{ background: 'linear-gradient(#9475f2, #6c4ad6)', boxShadow: '0 0.15em 0 #5236b0, 0 0.25em 0.5em rgba(82,54,176,.35)' }} data-comic-say>
            <Volume2 className="h-[55%] w-[55%]" strokeWidth={2.6} />
        </button>
    );
}

/** Under a panel, where its picture's floor goes on: grass (darker at night), a room's floor, sand, the market's earth. */
const floorOf = (panel) => (panel.scene === 'house' ? '#b97a45' : panel.scene === 'river' ? '#e6c88e' : panel.scene === 'market' ? '#dcb787' : panel.night ? '#3f6b35' : LOOK.ground);

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
    // A close-up: the people twice as big, from the waist up.
    const zoom = panel.zoom ? 2 : 1;
    // Each bubble under the caption box (or beside it, when there is room), and never above the one said before
    // it: a page is read top to bottom, left to right.
    const placed = bubblesOf(panel, wide).reduce((out, b) => {
        const own = (caption || panel.title) && b.left < capBox.right + 1.5 ? capBox.bottom + 2 : 4;
        return [...out, { ...b, top: Math.max(own, out.at(-1)?.top ?? 0) }];
    }, []);
    return (
        <figure className="overflow-hidden rounded-[18px] border-[3px] border-white bg-white shadow-[0_6px_16px_rgba(76,53,160,.16)] [container-type:inline-size]" style={{ fontFamily: FONT, gridColumn: wide ? `span ${wide} / span ${wide}` : undefined }}
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
                {/* Each named person's name at their feet (2026-11-05, "the quiz asks about the names"), in the story's language. */}
                {panel.cast.filter((c) => people[c.who]?.tag).map((c) => (
                    <span key={`name-${c.who}`} className="pointer-events-none absolute bottom-[1.5%] -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-[0.65em] py-[0.1em] font-extrabold leading-snug shadow-[0_0.1em_0.35em_rgba(0,0,0,.2)]"
                        style={{ left: `${Math.min(92, Math.max(8, c.x))}%`, fontSize: sized(0.85), color: LOOK.ink, border: `0.12em solid ${LOOK.purple}` }} data-name-tag={c.who}>{people[c.who].tag}</span>
                ))}
                {panel.title && <Title text={comic.title} wide={wide} capRef={cap} />}
                {caption && (
                    <p ref={cap} className="absolute left-[2.5%] top-[4%] max-w-[64%] rounded-[0.8em] px-[0.85em] py-[0.35em] font-extrabold leading-snug" style={{ fontSize: wordsSize, color: LOOK.ink, background: 'linear-gradient(#ffe68f, #ffd23f)', boxShadow: '0 0.14em 0 #e0a800, 0 0.3em 0.6em rgba(0,0,0,.15)' }} data-comic-caption>{caption}</p>
                )}
                {placed.map((b) => (
                    <div key={b.who} className="absolute" style={{ left: `${b.left}%`, top: `${b.top}%`, width: `${b.w}%` }} data-bubble={b.who}>
                        <p className="relative border-[2.5px] bg-white text-center font-extrabold leading-snug" style={{ fontSize: wordsSize, color: LOOK.ink, borderColor: LOOK.purple, borderRadius: '50%', padding: '0.85em 1.4em', boxShadow: '0 0.2em 0.5em rgba(60,40,140,.12)' }} data-bubble-style="oval">
                            <span className="sr-only">{b.name ? `${b.name} says: ` : ''}</span>{b.text}
                            <svg className="absolute" style={{ left: `calc(${b.tail}% - 9px)`, top: 'calc(100% - 3.5px)' }} width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                                <path d="M1 1 L7 17 L17 1" fill="#fff" stroke={LOOK.purple} strokeWidth="2.5" strokeLinejoin="round" />
                                <rect x="2.5" y="0" width="13" height="3.5" fill="#fff" />
                            </svg>
                        </p>
                    </div>
                ))}
            </div>
            {/* Its narration in a cream bar on the panel's floor, with its own speaker. */}
            {panel.narration && (
                <figcaption className="px-[0.7em] pb-[0.7em] pt-[0.15em]" style={{ fontSize, background: floorOf(panel) }} data-comic-narration>
                    <span className="flex items-center gap-[0.7em] rounded-[1.5em] py-[0.45em] pl-[0.5em] pr-[1em] shadow-[0_0.2em_0.5em_rgba(0,0,0,.12)]" style={{ background: LOOK.narration }}>
                        <SayLine text={panel.narration} lang={comic.locale} />
                        <span className="min-w-0 flex-1 font-extrabold leading-snug" style={{ color: LOOK.ink }}>{panel.narration}</span>
                    </span>
                </figcaption>
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
    const theme = LOOK;
    // Two to a row on a page wide enough (2026-11-04, every story), one on a phone.
    const columns = width >= 640 ? 2 : 1;
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
                    <button type="button" onClick={toggle} aria-pressed={reading} className="lingo-btn inline-flex h-11 items-center gap-2 px-3 text-sm" style={{ background: '#fff', borderColor: '#DCD3FA', color: LOOK.purple }} data-comic-read>
                        {reading ? <><Square size={15} /> Stop</> : <><Headphones size={17} /> Read aloud</>}
                    </button>
                </div>
            )}
            <div className="grid gap-3 rounded-[24px] p-2.5 sm:p-3" style={{ background: theme.page, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }} data-comic-page data-columns={columns}>
                {comic.panels.map((p, i) => <Panel key={i} panel={p} comic={comic} theme={theme} wide={columns > 1 && spans[i] > 1 ? spans[i] : 0} index={i} />)}
                {/* The story's moral, the end of the page. */}
                {comic.moral && (
                    <p className="rounded-[18px] border-2 border-[#F2C94C] px-4 py-3 text-center font-extrabold leading-snug shadow-[0_4px_12px_rgba(76,53,160,.12)]" style={{ gridColumn: '1 / -1', fontFamily: FONT, background: 'linear-gradient(#fff6d1, #ffe796)', color: LOOK.ink, fontSize: 'clamp(14px, 1.9vw, 19px)' }} data-comic-moral>
                        <span className="mr-2 font-black" style={{ color: LOOK.purple }}>{comic.moralLabel || 'Moral:'}</span>{comic.moral}
                    </p>
                )}
            </div>
        </div>
    );
}
