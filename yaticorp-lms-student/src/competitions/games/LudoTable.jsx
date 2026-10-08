import { useState } from 'react';
import { Dices } from 'lucide-react';

/**
 * The Ludo table: the board, the tokens and the dice. The page around it draws
 * the title, the seats, whose turn it is, the countdown, Resign and the result
 * (see the server's competitions/games/contract.js).
 *
 * Everything comes from `view`, which the server's Ludo engine builds: each
 * token's `steps` and its `cell` on the 15x15 board, the last roll, whether the
 * player on turn has rolled, and — on this student's turn after a roll — which
 * of their tokens may move. The rules are never worked out here.
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
/** Dots on a die face, as positions in a 3x3 grid. */
const PIPS = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

const CSS = `
@keyframes ludo-tumble { 0% { transform: rotate(0deg) scale(1); } 25% { transform: rotate(90deg) scale(.86); } 50% { transform: rotate(180deg) scale(1.06); } 75% { transform: rotate(270deg) scale(.86); } 100% { transform: rotate(360deg) scale(1); } }
@keyframes ludo-land { 0% { transform: rotate(-220deg) scale(.55); opacity: .3; } 70% { transform: rotate(12deg) scale(1.08); opacity: 1; } 100% { transform: rotate(0deg) scale(1); } }
@keyframes ludo-pulse { 0%, 100% { box-shadow: 0 0 0 1px #fff, 0 0 0 2px var(--ludo-ring); transform: scale(1); } 50% { box-shadow: 0 0 0 2px #fff, 0 0 0 6px var(--ludo-ring); transform: scale(1.12); } }
@keyframes ludo-glow { 0%, 100% { opacity: .25; } 50% { opacity: 1; } }
.ludo-die-rolling { animation: ludo-tumble .5s linear infinite; }
.ludo-die-land { animation: ludo-land .55s ease-out; }
.ludo-disc-movable { animation: ludo-pulse 1s ease-in-out infinite; }
.ludo-glow { animation: ludo-glow 1.4s ease-in-out infinite; }
.ludo-token { transition: left .35s ease, top .35s ease, width .2s ease, height .2s ease; }
@media (prefers-reduced-motion: reduce) {
  .ludo-die-rolling, .ludo-die-land, .ludo-disc-movable, .ludo-glow { animation: none; }
  .ludo-token { transition: none; }
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

/** Every token, placed on the turned board in board units. */
const placeTokens = (view, colours, turns) => {
    const finish = view.finishSteps ?? 56;
    const flat = [];
    (view.tokens || []).forEach((list, seat) => {
        const ci = colours[seat] ?? seat;
        const homeTotal = list.filter((t) => t.steps >= finish).length;
        let homeIndex = 0;
        list.forEach((t, token) => {
            if (t.steps >= finish) {
                const [cy, cx, dy, dx] = HOME_REST[ci];
                const along = (homeIndex - (homeTotal - 1) / 2) * 0.42;
                homeIndex += 1;
                const [y, x] = turnPoint([cy + dy * along, cx + dx * along], turns);
                flat.push({ seat, token, ci, steps: t.steps, home: true, y, x, size: 0.5, key: null });
                return;
            }
            const cell = Array.isArray(t.cell) ? t.cell : [YARD_ORIGIN[ci][0] + YARD_SPOTS[token % 4][0], YARD_ORIGIN[ci][1] + YARD_SPOTS[token % 4][1]];
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

function Die({ value, colour, rolling }) {
    return (
        <svg viewBox="0 0 100 100" className={rolling ? 'ludo-die-rolling' : 'ludo-die-land'} style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
            <rect x="5" y="5" width="90" height="90" rx="20" fill="#fff" stroke={colour} strokeWidth="7" />
            {(PIPS[value] || []).map((i) => (
                <circle key={i} cx={25 + (i % 3) * 25} cy={25 + Math.floor(i / 3) * 25} r="8.5" fill={value === 1 ? colour : '#1f2937'} />
            ))}
        </svg>
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
    if (!view) return null;

    const colours = colourIndexes(view);
    const you = Number.isInteger(view.you) ? view.you : null;
    const turns = you !== null ? (colours[you] ?? 0) % 4 : 0;
    const active = view.status === 'active';
    const yourTurn = active && you !== null && view.turn === you && !(view.resigned && view.resigned[you]);
    const locked = Boolean(busy) || pending !== null;
    const canRoll = yourTurn && !view.rolled && !locked;
    const movable = new Set(yourTurn && view.rolled && Array.isArray(view.movable) ? view.movable : []);
    const finish = view.finishSteps ?? 56;
    const tokens = placeTokens(view, colours, turns);
    const label = (seat) => (seat !== null && seat !== undefined && view.seats[seat] ? view.seats[seat].label : '');
    const dieColour = view.diceBy !== null && view.diceBy !== undefined ? COLOURS[colours[view.diceBy]] : '#64748b';

    const send = (action) => {
        if (locked) return;
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

    return (
        <div className="flex w-full flex-col items-center gap-3" data-ludo-table="">
            <style>{CSS}</style>
            <div data-ludo-board="" data-rotation={turns} className="select-none rounded-xl shadow-md"
                style={{ position: 'relative', width: '100%', maxWidth: 560, aspectRatio: '1 / 1' }}>
                <Board view={view} colours={colours} turns={turns} />
                {tokens.map((t) => {
                    const mine = t.seat === you;
                    const canMove = mine && !t.home && movable.has(t.token) && !locked;
                    const colour = (view.seats[t.seat] && view.seats[t.seat].color) || COLOURS[t.ci];
                    const last = view.lastMove && view.lastMove.seat === t.seat && view.lastMove.token === t.token;
                    const hit = canMove ? Math.max(t.size, 1.15) : t.size;
                    return (
                        <button key={`${t.seat}-${t.token}`} type="button" className="ludo-token focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                            data-ludo-token="" data-seat={t.seat} data-token={t.token} data-steps={t.steps} data-movable={canMove ? 'true' : 'false'}
                            disabled={!canMove} onClick={() => send({ type: 'move', token: t.token })}
                            aria-label={`${canMove ? 'Move ' : ''}${label(t.seat)} token ${t.token + 1}, ${whereIs(t.steps, finish)}`}
                            style={{
                                position: 'absolute', left: pct(t.x), top: pct(t.y), width: pct(hit), height: pct(hit),
                                transform: 'translate(-50%, -50%)', zIndex: canMove ? 3 : 2, pointerEvents: canMove ? 'auto' : 'none',
                                cursor: canMove ? 'pointer' : 'default', background: 'transparent', border: 0, padding: 0, borderRadius: 9999,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                            <span className={canMove ? 'ludo-disc-movable' : undefined} style={{
                                '--ludo-ring': colour,
                                width: `${(t.size / hit) * 82}%`, height: `${(t.size / hit) * 82}%`, borderRadius: 9999, display: 'block',
                                background: `radial-gradient(circle at 35% 30%, ${LIGHT[t.ci]}, ${colour} 58%, ${DEEP[t.ci]})`,
                                border: '1.5px solid #fff',
                                // The token that moved last wears a thin dark halo.
                                boxShadow: last ? '0 0 0 1.5px rgba(15, 23, 42, .7), 0 1px 3px rgba(15, 23, 42, .5)' : '0 1px 2px rgba(15, 23, 42, .5)'
                            }} />
                        </button>
                    );
                })}
            </div>

            <div className="flex w-full items-center gap-4 px-1" style={{ maxWidth: 560 }}>
                <button type="button" data-ludo-roll="" onClick={() => send({ type: 'roll' })} disabled={!canRoll}
                    aria-label={canRoll ? 'Roll the dice' : `Dice: ${lastRoll}`}
                    className={`flex shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white p-2 shadow-sm transition ${canRoll ? 'border-slate-900 hover:-translate-y-0.5 hover:shadow-md' : 'border-slate-200 opacity-70'}`}
                    style={{ width: 84, height: 96 }}>
                    <span style={{ width: 52, height: 52, display: 'block' }}>
                        {view.dice
                            ? <Die key={view.rollCount ?? 0} value={view.dice} colour={dieColour} rolling={pending === 'roll'} />
                            : <Dices className={pending === 'roll' ? 'ludo-die-rolling' : undefined} style={{ width: 52, height: 52, color: '#475569' }} />}
                    </span>
                    <span className="text-sm font-bold text-slate-800">Roll</span>
                </button>
                <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-slate-900" data-ludo-hint="">{hint}</p>
                    <p className="text-sm text-slate-600">{lastRoll}</p>
                    {warnSixes && <p className="text-sm font-medium text-amber-700">Two 6s in a row — a third 6 ends your turn.</p>}
                </div>
            </div>
        </div>
    );
}
