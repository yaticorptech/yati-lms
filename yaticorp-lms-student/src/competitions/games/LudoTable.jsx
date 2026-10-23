import { useEffect, useRef, useState } from 'react';
import { Dices, Volume2, VolumeX } from 'lucide-react';

/**
 * The Ludo table: the players at their corners, the board, the tokens and the
 * dice. The page around it draws the title, the countdown, Resign and the
 * result (see the server's competitions/games/contract.js).
 *
 * Everything comes from `view`, which the server's Ludo engine builds: each
 * token's `steps` and its `cell` on the 15x15 board, the last roll, whether the
 * player on turn has rolled, and — on this student's turn after a roll — which
 * of their tokens may move. The rules are never worked out here; a move with
 * only one choice is made by the server itself (autoMove).
 *
 * Made to feel like a phone Ludo game (2026-10-17, "make this ludo as real game
 * mobile game ... smooth and good"): each player sits at their yard's corner
 * with a countdown ring and, on their turn, the dice beside them; a token hops
 * square by square along the track after the dice lands; a capture bursts and
 * the token slides home; there are small sounds and a buzz on a phone, with a
 * switch to mute them. All motion stops under reduced motion.
 *
 * The server's board has Red's yard bottom-left, then Green, Yellow and Blue
 * clockwise. It is turned here so the student's own yard sits bottom-left; a
 * spectator sees it the server's way round.
 */

const SIZE = 15;
const COLOURS = ['#dc2626', '#16a34a', '#eab308', '#2563eb'];
const LIGHT = ['#fca5a5', '#86efac', '#fde68a', '#93c5fd'];
const SOFT = ['#fee2e2', '#dcfce7', '#fef9c3', '#dbeafe'];
const DEEP = ['#7f1d1d', '#14532d', '#854d0e', '#1e3a8a'];
const NAMES = ['Red', 'Green', 'Yellow', 'Blue'];

/* The board the server uses (competitions/games/ludo.js), as [row, col]. */
const YARD_ORIGIN = [[9, 0], [0, 0], [0, 9], [9, 9]];
const YARD_SPOTS = [[1, 1], [1, 4], [4, 1], [4, 4]];
const START = [[13, 6], [6, 1], [1, 8], [8, 13]];
const HOME_COLUMN = [
    [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]]
];
const DEFAULT_SAFE = [[13, 6], [8, 2], [6, 1], [2, 6], [1, 8], [6, 12], [8, 13], [12, 8]];
/** The centre triangle each colour's home column runs into, as [y, x] corners. */
const TRIANGLES = [
    [[9, 6], [9, 9], [7.5, 7.5]],
    [[6, 6], [9, 6], [7.5, 7.5]],
    [[6, 6], [6, 9], [7.5, 7.5]],
    [[6, 9], [9, 9], [7.5, 7.5]]
];
/** Where tokens that are home rest inside their triangle: the middle [y, x], and the way a row of them runs. */
const HOME_REST = [[8.42, 7.5, 0, 1], [7.5, 6.58, 1, 0], [6.58, 7.5, 0, 1], [7.5, 8.42, 1, 0]];
/** The 72 squares of the cross: the shared track and the four home columns. */
const ARM_CELLS = [];
for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
        const across = r >= 6 && r <= 8;
        const down = c >= 6 && c <= 8;
        if (across !== down) ARM_CELLS.push([r, c]);
    }
}
/** A five-pointed star around 0,0 for the safe squares. */
const STAR = Array.from({ length: 10 }, (_, i) => {
    const radius = i % 2 ? 0.15 : 0.36;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${(radius * Math.cos(angle)).toFixed(3)},${(radius * Math.sin(angle)).toFixed(3)}`;
}).join(' ');
/** The shared track, clockwise from Red's start square, as the server has it (competitions/games/ludo.js). Colour c starts at 13c. */
const TRACK = [
    [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
    [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
    [7, 0],
    [6, 0], [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
    [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
    [0, 7],
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
    [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
    [7, 14],
    [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
    [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
    [14, 7],
    [14, 6]
];
/** A token's square for `steps` from its colour's start — the server's cellOf — or null once home. Used only to walk a move square by square; where a token rests always comes from the server. */
const cellAt = (ci, steps, token, finish) => {
    if (steps < 0) return [YARD_ORIGIN[ci][0] + YARD_SPOTS[token % 4][0], YARD_ORIGIN[ci][1] + YARD_SPOTS[token % 4][1]];
    if (steps <= 50) return TRACK[(ci * 13 + steps) % 52];
    if (steps < finish) return HOME_COLUMN[ci][steps - 51];
    return null;
};
/** Dots on a die face, as positions in a 3x3 grid. */
const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const HOP_MS = 150;        // one square of a move
const LAND_MS = 650;       // the dice settling before a move made with the roll starts to walk

const CSS = `
@keyframes ludo-tumble { 0% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(90deg) scale(.86); } 50% { transform: rotate(180deg) scale(1.06); } 75% { transform: rotate(270deg) scale(.86); } 100% { transform: rotate(360deg) scale(1); } }
@keyframes ludo-land { 0% { transform: rotate(-220deg) scale(.55); opacity: .3; } 70% { transform: rotate(12deg) scale(1.08); opacity: 1; } 100% { transform: rotate(0deg) scale(1); } }
@keyframes ludo-pulse { 0%, 100% { box-shadow: 0 0 0 1px #fff, 0 0 0 2px var(--ludo-ring); transform: scale(1); } 50% { box-shadow: 0 0 0 2px #fff, 0 0 0 6px var(--ludo-ring); transform: scale(1.12); } }
@keyframes ludo-glow { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
@keyframes ludo-ready { 0%, 100% { transform: scale(1); box-shadow: 0 6px 16px -4px rgba(79, 70, 229, .6), 0 0 0 0 rgba(129, 140, 248, .55); } 50% { transform: scale(1.06); box-shadow: 0 6px 16px -4px rgba(79, 70, 229, .6), 0 0 0 8px rgba(129, 140, 248, 0); } }
@keyframes ludo-hop { 0% { transform: translateY(0) scale(1); } 45% { transform: translateY(-38%) scale(1.12); } 100% { transform: translateY(0) scale(1); } }
@keyframes ludo-burst { 0% { transform: translate(-50%, -50%) scale(.3); opacity: .9; } 100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; } }
@keyframes ludo-turn-in { 0% { transform: scale(.96); } 60% { transform: scale(1.03); } 100% { transform: scale(1); } }
.ludo-die-rolling { animation: ludo-tumble .45s linear infinite; }
.ludo-die-land { animation: ludo-land .55s ease-out; }
.ludo-disc-movable { animation: ludo-pulse 1s ease-in-out infinite; }
.ludo-roll-ready { animation: ludo-ready 1.4s ease-in-out infinite; }
.ludo-glow { animation: ludo-glow 1.4s ease-in-out infinite; }
.ludo-hop { animation: ludo-hop ${HOP_MS}ms ease-out; }
.ludo-burst { animation: ludo-burst .65s ease-out forwards; }
.ludo-turn-in { animation: ludo-turn-in .4s ease-out; }
.ludo-token { transition: left ${HOP_MS - 20}ms ease-out, top ${HOP_MS - 20}ms ease-out, width .2s ease, height .2s ease; }
.ludo-token[data-sent-home] { transition: left .45s ease-in-out, top .45s ease-in-out; }
/* The layout. Narrow (a phone, or a page column): players in rows above and
   below the board, as on a phone Ludo game. Wide (56rem of room or more): the
   players beside the board at its four corners, and the board as tall as the
   window allows, so a laptop plays without scrolling. Which corners hold a
   player comes in from the table (--ludo-areas), so one alone has the row. */
.ludo-wrap { container-type: inline-size; width: 100%; }
.ludo-layout { --ludo-max: min(560px, max(300px, calc(100dvh - 340px))); display: grid; gap: .75rem; width: 100%; max-width: var(--ludo-max); margin: 0 auto;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-areas: var(--ludo-areas); align-items: center; }
.ludo-layout > [data-area="board"] { grid-area: board; }
.ludo-layout > [data-area="hint"] { grid-area: hint; }
.ludo-layout > [data-area="tl"] { grid-area: tl; } .ludo-layout > [data-area="tr"] { grid-area: tr; }
.ludo-layout > [data-area="bl"] { grid-area: bl; } .ludo-layout > [data-area="br"] { grid-area: br; }
@container (min-width: 56rem) {
  .ludo-layout { --ludo-max: min(640px, max(380px, calc(100dvh - 300px))); max-width: none; gap: 1.25rem;
    grid-template-columns: minmax(0, 1fr) var(--ludo-max) minmax(0, 1fr); grid-template-rows: auto 1fr auto auto;
    grid-template-areas: "tl board tr" ". board ." "bl board br" "hint board ."; }
  .ludo-layout > [data-area="tl"], .ludo-layout > [data-area="tr"] { align-self: start; }
  .ludo-layout > [data-area="bl"], .ludo-layout > [data-area="br"], .ludo-layout > [data-area="hint"] { align-self: end; }
  /* Beside the board the column is narrow: the badge and the dice share a line, the name has the next one to itself. */
  .ludo-seat { flex-wrap: wrap; row-gap: .35rem; }
  .ludo-seat-name { order: 3; flex-basis: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .ludo-die-rolling, .ludo-die-land, .ludo-disc-movable, .ludo-glow, .ludo-roll-ready, .ludo-hop, .ludo-burst, .ludo-turn-in { animation: none; }
  .ludo-token, .ludo-token[data-sent-home] { transition: none; }
}`;

/** Turns a cell a quarter-turn anticlockwise `turns` times, so a yard moves from top-left to bottom-left. */
const turnCell = ([r, c], turns) => {
    let [row, col] = [r, c];
    for (let i = 0; i < turns; i++) [row, col] = [SIZE - 1 - col, row];
    return [row, col];
};
/** The same for a point on the board, in board units ([y, x], 0–15). */
const turnPoint = ([y, x], turns) => {
    let [py, px] = [y, x];
    for (let i = 0; i < turns; i++) [py, px] = [SIZE - px, py];
    return [py, px];
};
const pct = (units) => `${(units / SIZE) * 100}%`;
const sameCell = (a, b) => a[0] === b[0] && a[1] === b[1];

/** Several tokens on one square sit side by side. */
const stackOffset = (n, i) => {
    if (n <= 1) return [0, 0];
    if (n === 2) return [0, i ? 0.2 : -0.2];
    if (n === 3) return [[-0.17, -0.2], [-0.17, 0.2], [0.2, 0]][i];
    if (n === 4) return [[-0.2, -0.2], [-0.2, 0.2], [0.2, -0.2], [0.2, 0.2]][i];
    const angle = (2 * Math.PI * i) / n;
    return [0.26 * Math.sin(angle), 0.26 * Math.cos(angle)];
};

const colourIndexes = (view) => (Array.isArray(view.colorIndex) && view.colorIndex.length === view.seats.length
    ? view.colorIndex
    : view.seats.map((s, i) => {
        const named = NAMES.indexOf(s.label);
        return named >= 0 ? named : i;
    }));

/**
 * Every token, placed on the turned board in board units. `shown` holds the
 * steps to draw for tokens in the middle of a move (the mover walking, a token
 * it captured still standing where it was); those are drawn on their own square
 * at full size, outside the side-by-side stacking of the rest.
 */
const placeTokens = (view, colours, turns, shown = {}) => {
    const finish = view.finishSteps ?? 56;
    const flat = [];
    (view.tokens || []).forEach((list, seat) => {
        const ci = colours[seat] ?? seat;
        const homeTotal = list.filter((t) => t.steps >= finish).length;
        let homeIndex = 0;
        list.forEach((t, token) => {
            const held = shown[`${seat}-${token}`];
            if (held !== undefined && held < finish) {
                const cell = cellAt(ci, held, token, finish);
                const [y, x] = turnPoint([cell[0] + 0.5, cell[1] + 0.5], turns);
                flat.push({ seat, token, ci, steps: held, home: false, y, x, size: 0.8, key: null, moving: true });
                return;
            }
            if (t.steps >= finish) {
                const [cy, cx, dy, dx] = HOME_REST[ci];
                const along = (homeIndex - (homeTotal - 1) / 2) * 0.42;
                homeIndex += 1;
                const [y, x] = turnPoint([cy + dy * along, cx + dx * along], turns);
                flat.push({ seat, token, ci, steps: t.steps, home: true, y, x, size: 0.5, key: null });
                return;
            }
            const cell = Array.isArray(t.cell) ? t.cell : cellAt(ci, t.steps, token, finish);
            flat.push({ seat, token, ci, steps: t.steps, home: false, cell, key: cell.join(',') });
        });
    });
    const counts = new Map();
    for (const t of flat) if (t.key) counts.set(t.key, (counts.get(t.key) || 0) + 1);
    const seen = new Map();
    return flat.map((t) => {
        if (!t.key) return t;
        const n = counts.get(t.key);
        const i = seen.get(t.key) || 0;
        seen.set(t.key, i + 1);
        const [cy, cx] = turnPoint([t.cell[0] + 0.5, t.cell[1] + 0.5], turns);
        const [oy, ox] = stackOffset(n, i);
        return { ...t, y: cy + oy, x: cx + ox, size: n === 1 ? 0.8 : n === 2 ? 0.58 : 0.5 };
    });
};

const whereIs = (steps, finish) => {
    if (steps < 0) return 'in the yard';
    if (steps >= finish) return 'home';
    if (steps > 50) return `${finish - steps} from home`;
    return steps === 0 ? 'on its start square' : `${steps} squares along`;
};

/* ── Sound and touch ──────────────────────────────────────────────────── */

const SOUND_KEY = 'yati:ludo-sound';
const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } };
let audio = null;
/** Short tones made on the spot: no sound files to download. Silent until the student has tapped something (the browser's rule). */
const tone = (freq, ms, { type = 'triangle', gain = 0.06, at = 0, slide = null } = {}) => {
    try {
        if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
        if (audio.state === 'suspended') audio.resume().catch(() => {});
        const t0 = audio.currentTime + at / 1000;
        const osc = audio.createOscillator();
        const amp = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + ms / 1000);
        amp.gain.setValueAtTime(gain, t0);
        amp.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
        osc.connect(amp).connect(audio.destination);
        osc.start(t0);
        osc.stop(t0 + ms / 1000 + 0.02);
    } catch { /* no audio here: the game plays on silently */ }
};
const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* not on this device */ } };
const SOUNDS = {
    roll: () => { for (let i = 0; i < 5; i++) tone(180 + Math.random() * 260, 40, { type: 'square', gain: 0.035, at: i * 55 }); },
    land: () => { tone(330, 70, { gain: 0.05 }); buzz(15); },
    hop: () => tone(620 + Math.random() * 60, 45, { gain: 0.04 }),
    capture: () => { tone(520, 260, { type: 'sawtooth', gain: 0.045, slide: 120 }); buzz([30, 40, 30]); },
    home: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 160, { gain: 0.05, at: i * 90 })); buzz(25); },
    turn: () => { tone(660, 110, { gain: 0.05 }); tone(880, 160, { gain: 0.05, at: 110 }); buzz(20); }
};

/* ── The pieces ─────────────────────────────────────────────────────────── */

function Die({ value, colour, rolling }) {
    return (
        <svg viewBox="0 0 100 100" className={rolling ? 'ludo-die-rolling' : 'ludo-die-land'} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
            <defs>
                <linearGradient id="ludo-die-face" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#e2e8f0" />
                </linearGradient>
            </defs>
            <rect x="6" y="9" width="88" height="88" rx="20" fill="rgba(15,23,42,.18)" />
            <rect x="5" y="4" width="90" height="90" rx="20" fill="url(#ludo-die-face)" stroke={colour} strokeWidth="6" />
            {(PIPS[value] || []).map((i) => (
                <circle key={i} cx={25 + (i % 3) * 25} cy={24 + Math.floor(i / 3) * 25} r="8.5" fill={value === 1 ? colour : '#1f2937'} />
            ))}
        </svg>
    );
}

/** The seconds left of the turn now, kept fresh while there is a deadline. */
const useSecondsLeft = (deadline) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return undefined;
        const t = setInterval(() => setNow(Date.now()), 250);
        return () => clearInterval(t);
    }, [deadline]);
    if (!deadline) return null;
    return Math.max(0, (new Date(deadline).getTime() - now) / 1000);
};

/**
 * One player, at their yard's corner: a round badge in their colour (a ring
 * around it runs down with the turn's time), the name, and — beside the badge,
 * on the board's side — the dice when it is theirs.
 */
function Seat({ name, sub, colour, deep, initial, onTurn, left, total, right, dice, resigned }) {
    const frac = onTurn && left !== null && total ? Math.max(0, Math.min(1, left / total)) : 0;
    const R = 25;
    const C = 2 * Math.PI * R;
    const urgent = onTurn && left !== null && left <= 8;
    return (
        <div className={`ludo-seat flex min-w-0 flex-1 items-center gap-2 ${right ? 'flex-row-reverse text-right' : ''} ${resigned ? 'opacity-50' : ''}`}>
            <span className={`relative flex h-14 w-14 shrink-0 items-center justify-center ${onTurn ? 'ludo-turn-in' : ''}`}>
                <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden="true">
                    <circle cx="28" cy="28" r={R} fill="none" stroke="#e2e8f0" strokeWidth="4" />
                    {onTurn && <circle cx="28" cy="28" r={R} fill="none" stroke={urgent ? '#e11d48' : colour} strokeWidth="4" strokeLinecap="round"
                        strokeDasharray={C} strokeDashoffset={C * (1 - frac)} style={{ transition: 'stroke-dashoffset .25s linear' }} />}
                </svg>
                <span className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white shadow-md ring-2 ring-white"
                    style={{ background: `radial-gradient(circle at 35% 30%, ${colour}, ${deep})` }} aria-hidden="true">{initial}</span>
            </span>
            <span className="ludo-seat-name min-w-0">
                <span className={`block truncate text-sm font-black leading-tight ${onTurn ? 'text-slate-900' : 'text-slate-700'}`}>{name}</span>
                <span className="block truncate text-[11px] font-semibold leading-tight" style={{ color: onTurn ? deep : '#64748b' }}>{sub}</span>
            </span>
            {dice && <span className="shrink-0">{dice}</span>}
        </div>
    );
}

function Board({ view, colours, turns }) {
    const used = new Set(colours);
    const safe = Array.isArray(view.safe) && view.safe.length ? view.safe : DEFAULT_SAFE;
    const turnColour = view.status === 'active' && view.turn !== null && view.turn !== undefined ? colours[view.turn] : null;
    const yards = [0, 1, 2, 3].map((ci) => {
        const [cy, cx] = turnPoint([YARD_ORIGIN[ci][0] + 3, YARD_ORIGIN[ci][1] + 3], turns);
        return { ci, y: cy - 3, x: cx - 3 };
    });
    const cellRect = (cell, props) => {
        const [r, c] = turnCell(cell, turns);
        return <rect key={`${r}-${c}-${props.fill}`} x={c} y={r} width="1" height="1" {...props} />;
    };

    return (
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Ludo board" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
            <rect x="0" y="0" width={SIZE} height={SIZE} rx="0.25" fill="#fff" stroke="#94a3b8" strokeWidth="0.06" />

            {yards.map(({ ci, y, x }) => (
                <g key={`yard-${ci}`} opacity={used.has(ci) ? 1 : 0.3}>
                    <rect x={x} y={y} width="6" height="6" fill={COLOURS[ci]} />
                    <rect x={x + 0.9} y={y + 0.9} width="4.2" height="4.2" rx="0.5" fill="#fff" />
                    {YARD_SPOTS.map(([dr, dc]) => {
                        const [sy, sx] = turnPoint([YARD_ORIGIN[ci][0] + dr + 0.5, YARD_ORIGIN[ci][1] + dc + 0.5], turns);
                        return <circle key={`${dr}${dc}`} cx={sx} cy={sy} r="0.42" fill={SOFT[ci]} stroke={COLOURS[ci]} strokeWidth="0.07" />;
                    })}
                </g>
            ))}

            {ARM_CELLS.map((cell) => cellRect(cell, { fill: '#fff', stroke: '#cbd5e1', strokeWidth: 0.04 }))}
            {HOME_COLUMN.map((cells, ci) => cells.map((cell) => cellRect(cell, { fill: COLOURS[ci], opacity: used.has(ci) ? 1 : 0.4, stroke: '#fff', strokeWidth: 0.04 })))}
            {START.map((cell, ci) => cellRect(cell, { fill: COLOURS[ci], opacity: used.has(ci) ? 1 : 0.4, stroke: '#fff', strokeWidth: 0.04 }))}

            {safe.map((cell) => {
                const [r, c] = turnCell(cell, turns);
                const onStart = START.some((s) => sameCell(s, cell));
                return <polygon key={`safe-${cell.join('-')}`} data-ludo-safe="" points={STAR} transform={`translate(${c + 0.5} ${r + 0.5})`} fill={onStart ? '#fff' : '#94a3b8'} opacity={onStart ? 0.9 : 1} />;
            })}

            {TRIANGLES.map((corners, ci) => (
                <polygon key={`home-${ci}`} points={corners.map((p) => turnPoint(p, turns)).map(([y, x]) => `${x},${y}`).join(' ')}
                    fill={COLOURS[ci]} opacity={used.has(ci) ? 1 : 0.4} stroke="#fff" strokeWidth="0.05" />
            ))}

            {turnColour !== null && yards.filter((yd) => yd.ci === turnColour).map(({ ci, y, x }) => (
                <rect key="turn" className="ludo-glow" x={x + 0.18} y={y + 0.18} width="5.64" height="5.64" rx="0.3" fill="none" stroke="#fff" strokeWidth="0.16" data-ludo-turn={ci} />
            ))}

            {view.seats.map((seat, i) => {
                const yd = yards.find((y) => y.ci === colours[i]);
                if (!yd) return null;
                const name = i === view.you ? 'You' : (seat.name || seat.label || NAMES[colours[i]]);
                const short = name.length > 16 ? `${name.slice(0, 15)}…` : name;
                const out = Array.isArray(view.resigned) && view.resigned[i];
                return (
                    <text key={`name-${i}`} x={yd.x + 3} y={yd.y + 0.62} textAnchor="middle" fontSize="0.46" fontWeight="700"
                        fill="#fff" stroke={DEEP[colours[i]]} strokeWidth="0.09" paintOrder="stroke" data-ludo-name={i}>
                        {out ? `${short} · resigned` : short}
                    </text>
                );
            })}
        </svg>
    );
}

export default function LudoTable({ view, onAction, busy }) {
    const [pending, setPending] = useState(null);
    const [sound, setSound] = useState(soundOn);
    const soundRef = useRef(sound);
    useEffect(() => { soundRef.current = sound; }, [sound]);
    const play = (name) => { if (soundRef.current) SOUNDS[name]?.(); };
    const [still] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false));

    // ── A move, walked square by square (and a capture, held until the mover arrives) ──
    const moveKey = view?.lastMove ? JSON.stringify(view.lastMove) : '';
    const stepsKey = JSON.stringify((view?.tokens || []).map((l) => l.map((t) => t.steps)));
    const [seen, setSeen] = useState({ moveKey, stepsKey, rollCount: view?.rollCount ?? 0 });
    const [walk, setWalk] = useState(null);   // { id, seat, token, path, at, victims: [{ seat, token, steps }], delay }
    if (view && moveKey !== seen.moveKey) {
        // Adjusting state to a new move during render: React's pattern for state that follows a prop.
        const before = JSON.parse(seen.stepsKey || '[]');
        const m = view.lastMove;
        setSeen({ moveKey, stepsKey, rollCount: view.rollCount ?? 0 });
        // A move of one roll (a token coming out is -1 → 0); anything else just appears.
        if (!still && m && typeof m.from === 'number' && typeof m.to === 'number' && m.to > m.from && m.to - m.from <= 6) {
            const path = m.from < 0 ? [0] : Array.from({ length: m.to - m.from }, (_, i) => m.from + 1 + i);
            const victims = (m.captured || []).map((v) => ({ seat: v.seat, token: v.token, steps: before?.[v.seat]?.[v.token] })).filter((v) => typeof v.steps === 'number' && v.steps >= 0);
            setWalk({ id: `${moveKey}`, seat: m.seat, token: m.token, from: m.from, to: m.to, path, at: -1, victims, delay: (view.rollCount ?? 0) !== seen.rollCount ? LAND_MS : 0 });
        } else setWalk(null);
    } else if (view && stepsKey !== seen.stepsKey) {
        setSeen({ moveKey, stepsKey, rollCount: view.rollCount ?? 0 });
    }

    useEffect(() => {
        if (!walk || walk.at >= walk.path.length) return undefined;
        const t = setTimeout(() => {
            const at = walk.at + 1;
            const last = at === walk.path.length - 1;
            if (last && walk.victims.length) play('capture');
            else if (last && walk.to >= (view?.finishSteps ?? 56)) play('home');
            else play('hop');
            setWalk((w) => (w && w.id === walk.id ? { ...w, at } : w));
        }, walk.at < 0 ? walk.delay + HOP_MS : HOP_MS);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walk]);
    useEffect(() => {
        if (!walk || walk.at < walk.path.length - 1) return undefined;
        const t = setTimeout(() => setWalk((w) => (w && w.id === walk.id ? null : w)), walk.victims.length ? 650 : 120);
        return () => clearTimeout(t);
    }, [walk]);

    // A new roll lands with a knock; the turn coming to you, with a chime.
    const rollCount = view?.rollCount ?? 0;
    const firstRoll = useRef(rollCount);
    useEffect(() => {
        if (rollCount !== firstRoll.current && view?.dice) play('land');
        firstRoll.current = rollCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rollCount]);
    const mineNow = Boolean(view && view.status === 'active' && Number.isInteger(view.you) && view.turn === view.you);
    const wasMine = useRef(mineNow);
    useEffect(() => {
        if (mineNow && !wasMine.current) play('turn');
        wasMine.current = mineNow;
    }, [mineNow]);

    const secondsLeft = useSecondsLeft(view?.status === 'active' ? view?.deadline : null);
    if (!view) return null;

    const colours = colourIndexes(view);
    const you = Number.isInteger(view.you) ? view.you : null;
    const turns = you !== null ? (colours[you] ?? 0) % 4 : 0;
    const active = view.status === 'active';
    const yourTurn = active && you !== null && view.turn === you && !(view.resigned && view.resigned[you]);
    const locked = Boolean(busy) || pending !== null || Boolean(walk);
    const canRoll = yourTurn && !view.rolled && !locked;
    const movable = new Set(yourTurn && view.rolled && Array.isArray(view.movable) ? view.movable : []);
    const finish = view.finishSteps ?? 56;

    // Where tokens are drawn while a move plays: the mover where it has got to, a captured token where it stood.
    const shown = {};
    if (walk) {
        shown[`${walk.seat}-${walk.token}`] = walk.at < 0 ? walk.from : walk.path[walk.at];
        for (const v of walk.victims) shown[`${v.seat}-${v.token}`] = v.steps;
    }
    const tokens = placeTokens(view, colours, turns, shown);
    const label = (seat) => (seat !== null && seat !== undefined && view.seats[seat] ? view.seats[seat].label : '');
    const dieColour = view.diceBy !== null && view.diceBy !== undefined ? COLOURS[colours[view.diceBy]] : '#64748b';

    const send = (action) => {
        if (locked) return;
        if (action.type === 'roll') play('roll');
        setPending(action.type);
        Promise.resolve()
            .then(() => onAction(action))
            .catch(() => { /* the page shows what went wrong */ })
            .finally(() => setPending(null));
    };

    let hint = '';
    if (!active) hint = 'Game over';
    else if (yourTurn && !view.rolled) hint = 'Your turn — roll the dice';
    else if (yourTurn) hint = movable.size === 1 ? 'Tap the glowing token to move it' : 'Tap a glowing token to move it';
    else if (view.turn !== null && view.turn !== undefined) hint = you === null ? `${label(view.turn)} to play` : `Waiting for ${label(view.turn)}…`;
    const lastRoll = view.dice ? `${label(view.diceBy)} rolled a ${view.dice}` : 'No roll yet';
    const warnSixes = yourTurn && view.sixesInRow === 2 && !view.rolled;

    // The dice sits with the player on turn; when nobody is (the game is over), with whoever rolled last.
    const diceSeat = active && view.turn !== null && view.turn !== undefined ? view.turn : (view.diceBy ?? you ?? 0);
    const diceButton = (
        <button type="button" data-ludo-roll="" onClick={() => send({ type: 'roll' })} disabled={!canRoll}
            aria-label={canRoll ? 'Roll the dice' : `Dice: ${lastRoll}`}
            className={`relative flex h-14 w-14 items-center justify-center rounded-2xl transition ${canRoll ? 'ludo-roll-ready bg-gradient-to-br from-indigo-500 to-indigo-700 p-2 text-white' : 'bg-white p-1.5 shadow-sm ring-1 ring-slate-200'}`}>
            {canRoll
                ? <Dices style={{ width: 34, height: 34 }} aria-hidden="true" />
                : view.dice
                    ? <Die key={view.rollCount ?? 0} value={view.dice} colour={dieColour} rolling={pending === 'roll'} />
                    : <Dices className={pending === 'roll' ? 'ludo-die-rolling' : undefined} style={{ width: 32, height: 32, color: '#94a3b8' }} aria-hidden="true" />}
            {canRoll && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-1.5 text-[9px] font-black uppercase tracking-wide text-indigo-700 shadow ring-1 ring-indigo-100">Tap</span>}
        </button>
    );

    // Each player at the corner their yard is drawn in, on the turned board.
    const corner = (seat) => {
        const ci = colours[seat] ?? seat;
        const [cy, cx] = turnPoint([YARD_ORIGIN[ci][0] + 3, YARD_ORIGIN[ci][1] + 3], turns);
        return { top: cy < SIZE / 2, right: cx > SIZE / 2 };
    };
    const seatNode = (seat) => {
        const s = view.seats[seat];
        const ci = colours[seat] ?? seat;
        const onTurn = active && view.turn === seat;
        const isYou = seat === you;
        const name = s.name || s.label || NAMES[ci];
        const words = String(name).trim().split(/\s+/);
        const initial = (words[0]?.[0] || '?').toUpperCase() + (words[1]?.[0] || '').toUpperCase();
        const out = Array.isArray(view.resigned) && view.resigned[seat];
        const home = (view.tokens?.[seat] || []).filter((t) => t.steps >= finish).length;
        const sub = out ? 'Resigned' : [isYou ? 'You' : null, s.label || NAMES[ci], home ? `${home} home` : null].filter(Boolean).join(' · ');
        return (
            <Seat key={seat} name={name} sub={sub} colour={s.color || COLOURS[ci]} deep={DEEP[ci]} initial={initial} onTurn={onTurn}
                left={onTurn ? secondsLeft : null} total={view.turnSeconds || 30} right={corner(seat).right} resigned={out}
                dice={seat === diceSeat ? diceButton : null} />
        );
    };
    const seats = view.seats.map((_, i) => i);
    const areaOf = (i) => `${corner(i).top ? 't' : 'b'}${corner(i).right ? 'r' : 'l'}`;
    const taken = new Set(seats.map(areaOf));
    // Narrow: a row with one player gives them the whole row (a right-hand one is
    // drawn from the right edge), so a name is not cut short for nothing.
    const rowAreas = (t) => (taken.has(`${t}l`) && taken.has(`${t}r`) ? `${t}l ${t}r` : taken.has(`${t}r`) ? `${t}r ${t}r` : `${t}l ${t}l`);
    const areas = [taken.has('tl') || taken.has('tr') ? `"${rowAreas('t')}"` : null, '"board board"', taken.has('bl') || taken.has('br') ? `"${rowAreas('b')}"` : null, '"hint hint"'].filter(Boolean).join(' ');
    const burst = walk && walk.at === walk.path.length - 1 && walk.victims.length
        ? (() => { const v = walk.victims[0]; const cell = cellAt(colours[v.seat] ?? v.seat, v.steps, v.token, finish); const [y, x] = turnPoint([cell[0] + 0.5, cell[1] + 0.5], turns); return { y, x, colour: COLOURS[colours[v.seat] ?? v.seat] }; })()
        : null;

    return (
        <div className="ludo-wrap" data-ludo-table="">
            <style>{CSS}</style>
            <div className="ludo-layout" style={{ '--ludo-areas': areas }}>
            {seats.map((i) => <div key={`seat-${i}`} data-area={areaOf(i)} className="min-w-0">{seatNode(i)}</div>)}

            {/* The board in a dark frame, like the board of a phone Ludo game. */}
            <div data-area="board" className="w-full rounded-[22px] bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-1.5 shadow-xl shadow-indigo-950/30">
                <div data-ludo-board="" data-rotation={turns} className="select-none overflow-visible rounded-2xl"
                    style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                    <Board view={view} colours={colours} turns={turns} />
                    {tokens.map((t) => {
                        const mine = t.seat === you;
                        const canMove = mine && !t.home && movable.has(t.token) && !locked;
                        const colour = (view.seats[t.seat] && view.seats[t.seat].color) || COLOURS[t.ci];
                        const last = view.lastMove && view.lastMove.seat === t.seat && view.lastMove.token === t.token;
                        const hit = canMove ? Math.max(t.size, 1.15) : t.size;
                        const walking = t.moving && walk && walk.seat === t.seat && walk.token === t.token;
                        const sentHome = !t.moving && t.steps < 0 && walk === null && view.lastMove && (view.lastMove.captured || []).some((v) => v.seat === t.seat && v.token === t.token);
                        return (
                            <button key={`${t.seat}-${t.token}`} type="button" className="ludo-token focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                                data-ludo-token="" data-seat={t.seat} data-token={t.token} data-steps={t.steps} data-movable={canMove ? 'true' : 'false'}
                                {...(sentHome ? { 'data-sent-home': '' } : {})}
                                disabled={!canMove} onClick={() => send({ type: 'move', token: t.token })}
                                aria-label={`${canMove ? 'Move ' : ''}${label(t.seat)} token ${t.token + 1}, ${whereIs(t.steps, finish)}`}
                                style={{
                                    position: 'absolute', left: pct(t.x), top: pct(t.y), width: pct(hit), height: pct(hit),
                                    transform: 'translate(-50%, -50%)', zIndex: walking ? 5 : canMove ? 3 : 2, pointerEvents: canMove ? 'auto' : 'none',
                                    cursor: canMove ? 'pointer' : 'default', background: 'transparent', border: 0, padding: 0, borderRadius: 9999,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                <span key={walking ? `hop-${walk.at}` : 'still'} className={walking && walk.at >= 0 ? 'ludo-hop' : canMove ? 'ludo-disc-movable' : undefined} style={{
                                    '--ludo-ring': colour,
                                    width: `${(t.size / hit) * 82}%`, height: `${(t.size / hit) * 82}%`, borderRadius: 9999, display: 'block',
                                    background: `radial-gradient(circle at 35% 28%, #fff 0 9%, ${LIGHT[t.ci]} 14%, ${colour} 56%, ${DEEP[t.ci]})`,
                                    border: '2px solid #fff',
                                    // The token that moved last wears a thin dark halo; a walking one casts a longer shadow.
                                    boxShadow: walking ? '0 6px 10px -2px rgba(15, 23, 42, .55)' : last ? '0 0 0 1.5px rgba(15, 23, 42, .7), 0 2px 4px rgba(15, 23, 42, .45)' : '0 2px 3px rgba(15, 23, 42, .45)'
                                }} />
                            </button>
                        );
                    })}
                    {burst && <span aria-hidden="true" className="ludo-burst pointer-events-none absolute rounded-full" style={{ left: pct(burst.x), top: pct(burst.y), width: pct(1.2), height: pct(1.2), border: `3px solid ${burst.colour}`, zIndex: 6 }} />}
                </div>
            </div>

            <div data-area="hint" className="flex w-full items-start gap-3 rounded-2xl bg-white/80 px-3 py-2 ring-1 ring-slate-200">
                <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold leading-snug ${canRoll ? 'text-indigo-700' : 'text-slate-900'}`} data-ludo-hint="">{hint}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        {view.dice ? <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dieColour }} aria-hidden="true" /> : null}
                        {lastRoll}
                    </p>
                    {warnSixes && <p className="text-xs font-semibold text-amber-700">Two 6s in a row — a third 6 ends your turn.</p>}
                </div>
                <button type="button" onClick={() => { const next = !sound; setSound(next); try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off'); } catch { /* private mode */ } if (next) SOUNDS.turn(); }}
                    aria-pressed={sound} aria-label={sound ? 'Sound on — tap to mute' : 'Sound off — tap to turn on'}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                    {sound ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
                </button>
            </div>
            </div>
        </div>
    );
}
