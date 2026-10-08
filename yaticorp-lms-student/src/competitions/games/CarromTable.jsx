/**
 * The carrom board for Games & Competitions.
 *
 * The server plays every shot (yaticorp-lms-server/src/competitions/games/
 * carrom.js). This table only lets the student place the striker on their
 * baseline and aim it, sends { type: 'shoot', position, angle, power }, and
 * replays the frames the server recorded — once per shot id — before showing
 * the settled board from `view.pieces`.
 *
 * Everything is drawn in board millimetres (740 × 740, origin top left) inside
 * one group turned by `view.orientation`, so the viewer's own edge is always
 * at the bottom and pointer positions map straight back to board millimetres.
 */
import { useEffect, useRef, useState } from 'react';
import { Crown, FastForward, Target } from 'lucide-react';

const DEFAULT_BOARD = {
    size: 740, coinRadius: 15.9, queenRadius: 15.9, strikerRadius: 20.65, pocketRadius: 22.25,
    pockets: [{ x: 22.25, y: 22.25 }, { x: 717.75, y: 22.25 }, { x: 717.75, y: 717.75 }, { x: 22.25, y: 717.75 }],
    baselineInset: 117, baselineHalf: 235
};
/** The wooden frame round the playing surface, in mm. */
const FRAME = 46;
/** Dragging this far back from the striker is a full-power flick, in mm. */
const PULL = 170;
/** A pocketed piece takes this long to slide in and vanish, in ms. */
const FADE_MS = 180;

const LOOK = {
    white: { fill: '#f6eedc', edge: '#a8946c', ring: '#c9b48a' },
    black: { fill: '#2b2522', edge: '#0d0b0a', ring: '#5a4e47' },
    queen: { fill: '#c62828', edge: '#7f1414', ring: '#f3b3b3' },
    striker: { fill: '#f4f6fb', edge: '#1e3a8a', ring: '#3b5bdb' }
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const radiusOf = (board, kind) => (kind === 'striker' ? board.strikerRadius : kind === 'queen' ? board.queenRadius : board.coinRadius);
const along = (base, position) => ({
    x: base.from.x + (base.to.x - base.from.x) * position,
    y: base.from.y + (base.to.y - base.from.y) * position
});
/** The striker's direction of travel, in board mm, for an angle off the shooter's forward. */
const direction = (base, angle) => {
    const t = (angle * Math.PI) / 180;
    return {
        x: base.forward.x * Math.cos(t) + base.right.x * Math.sin(t),
        y: base.forward.y * Math.cos(t) + base.right.y * Math.sin(t)
    };
};
/** The angle (degrees, clamped to the legal range) of a board-mm direction. */
const angleOf = (base, d) => {
    const f = d.x * base.forward.x + d.y * base.forward.y;
    const r = d.x * base.right.x + d.y * base.right.y;
    if (f === 0 && r === 0) return 0;
    return clamp((Math.atan2(r, f) * 180) / Math.PI, base.angleMin ?? -80, base.angleMax ?? 80);
};

/**
 * Turns a recorded shot into something that can say where every piece is at
 * any moment: keyframes at the server's times, linear in between, and a short
 * slide into the pocket for anything that fell.
 */
function buildTrack(shot, board) {
    const ids = shot.start.map((p) => p.id);
    const kind = {};
    const now = {};
    for (const p of shot.start) { kind[p.id] = p.kind; now[p.id] = [p.x, p.y]; }
    const times = [0];
    const keys = [{ ...now }];
    for (const f of shot.frames) {
        for (const [id, x, y] of f.moved) now[id] = [x, y];
        times.push(f.t);
        keys.push({ ...now });
    }
    const lastKey = {};
    const pocketOf = {};
    for (const p of shot.pocketed || []) {
        lastKey[p.id] = p.frame + 1;
        if (board.pockets[p.pocket]) pocketOf[p.id] = board.pockets[p.pocket];
    }
    const duration = times[times.length - 1];
    const at = (t) => {
        let lo = 0;
        let hi = times.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (times[mid] <= t) lo = mid; else hi = mid - 1;
        }
        const i = lo;
        const next = Math.min(i + 1, keys.length - 1);
        const span = times[next] - times[i];
        const alpha = span > 0 ? clamp((t - times[i]) / span, 0, 1) : 1;
        const out = [];
        for (const id of ids) {
            const last = lastKey[id];
            if (last !== undefined && i >= last) {
                const k = (t - times[last]) / FADE_MS;
                if (k >= 1) continue;
                const [x, y] = keys[last][id];
                const pocket = pocketOf[id] || { x, y };
                out.push({ id, kind: kind[id], x: x + (pocket.x - x) * k, y: y + (pocket.y - y) * k, fade: 1 - k });
                continue;
            }
            const a = keys[i][id];
            const b = keys[next][id];
            out.push({ id, kind: kind[id], x: a[0] + (b[0] - a[0]) * alpha, y: a[1] + (b[1] - a[1]) * alpha, fade: 1 });
        }
        return out;
    };
    return { duration: duration + (Object.keys(lastKey).length ? FADE_MS : 0), at };
}

function Piece({ id, kind, x, y, r, fade = 1, faint = false }) {
    const look = LOOK[kind] || LOOK.white;
    const scale = 0.45 + 0.55 * fade;
    return (
        <g
            transform={`translate(${x} ${y}) scale(${scale})`}
            opacity={faint ? 0.45 : fade}
            data-piece={kind === 'striker' ? undefined : id}
            data-striker={kind === 'striker' ? '' : undefined}
            data-kind={kind}
        >
            <circle r={r + 1.2} fill="rgba(0,0,0,0.22)" />
            <circle r={r} fill={look.fill} stroke={look.edge} strokeWidth={1.4} />
            <circle r={r * 0.64} fill="none" stroke={look.ring} strokeWidth={kind === 'striker' ? 2.2 : 1.3} />
            {kind === 'striker'
                ? <circle r={r * 0.3} fill="none" stroke={look.ring} strokeWidth={1.4} />
                : <circle r={r * 0.2} fill={look.ring} opacity={0.55} />}
        </g>
    );
}

/**
 * The printed markings: on each side two baselines whose ends meet the outer
 * edge of a red circle (as on a real board, where the 47 cm lines include the
 * circles), an arrow along each diagonal towards its pocket, and the centre rings.
 * Drawn once for the bottom side and the bottom-left corner, then turned.
 */
function Markings({ board }) {
    const c = board.size / 2;
    const half = board.baselineHalf;
    const gap = board.coinRadius;
    const y = board.size - board.baselineInset;
    const ink = '#4a2c17';
    const red = '#b3261e';
    // the arrow lies on the bottom-left diagonal (x + y = size), tip towards the pocket
    const tip = { x: 96, y: board.size - 96 };
    const tail = { x: 250, y: board.size - 250 };
    const b = { x: Math.SQRT1_2, y: -Math.SQRT1_2 };   // back along the arrow
    const n = { x: Math.SQRT1_2, y: Math.SQRT1_2 };    // across it
    const wing = (side) => `${tip.x + b.x * 14 + n.x * 7 * side} ${tip.y + b.y * 14 + n.y * 7 * side}`;
    const arc = (side) => `${tail.x + n.x * 15 * side} ${tail.y + n.y * 15 * side}`;
    return (
        <g>
            {[0, 90, 180, 270].map((turn) => (
                <g key={turn} transform={`rotate(${turn} ${c} ${c})`}>
                    <line x1={c - half} x2={c + half} y1={y - gap} y2={y - gap} stroke={ink} strokeWidth={1.6} />
                    <line x1={c - half} x2={c + half} y1={y + gap} y2={y + gap} stroke={ink} strokeWidth={1.6} />
                    <circle cx={c - half + gap} cy={y} r={gap} fill={red} stroke={ink} strokeWidth={1.4} />
                    <circle cx={c + half - gap} cy={y} r={gap} fill={red} stroke={ink} strokeWidth={1.4} />
                    <g stroke={ink} strokeWidth={1.6} fill="none" strokeLinecap="round">
                        <line x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y} />
                        <path d={`M ${wing(1)} L ${tip.x} ${tip.y} L ${wing(-1)}`} />
                        <path d={`M ${arc(1)} A 15 15 0 0 0 ${arc(-1)}`} />
                    </g>
                </g>
            ))}
            <circle cx={c} cy={c} r={86} fill="none" stroke={ink} strokeWidth={1.6} />
            <circle cx={c} cy={c} r={80} fill="none" stroke={red} strokeWidth={1.2} />
            <circle cx={c} cy={c} r={17} fill="none" stroke={red} strokeWidth={2.4} />
        </g>
    );
}

function queenText(view) {
    const state = String(view.queenState || 'board');
    if (state.startsWith('pending:')) {
        const seat = view.seats?.[Number(state.slice(8))];
        return `Queen pocketed — ${seat?.name || seat?.label || 'the shooter'} must cover her`;
    }
    if (state.startsWith('covered:')) {
        const side = Number(state.slice(8));
        const team = (view.score || []).find((s) => s.side === side);
        return `Queen covered by ${team ? team.label : 'a side'}`;
    }
    return 'Queen on the board';
}

export default function CarromTable({ view, onAction, busy }) {
    const board = view?.board || DEFAULT_BOARD;
    const size = board.size;
    const orientation = Number(view?.orientation) || 0;
    const active = view?.status === 'active';
    const you = view?.you ?? null;
    const myTurn = active && you !== null && view?.turn === you;
    const base = view?.baseline || null;

    const [aim, setAim] = useState({ position: 0.5, angle: 0, power: 0.6 });
    const [drag, setDrag] = useState(null);
    const [sending, setSending] = useState(false);
    const [anim, setAnim] = useState(null);
    const [doneId, setDoneId] = useState(null);
    const svgRef = useRef(null);
    const groupRef = useRef(null);

    // ── Replaying the last shot, once per id ────────────────────────────────
    const shot = view?.lastShot || null;
    const shotId = shot ? shot.id : null;
    const replayable = !!(shot && Array.isArray(shot.frames) && shot.frames.length && Array.isArray(shot.start));
    const replaying = replayable && shotId !== doneId;
    // The view object is new on every poll; the replay must only restart for
    // a new shot id, so it reads the shot through a ref rather than depending on it.
    const latest = useRef({ shot: null, board: DEFAULT_BOARD });
    useEffect(() => { latest.current = { shot, board }; }, [shot, board]);
    useEffect(() => {
        const s = latest.current.shot;
        if (!s || s.id !== shotId || s.id === doneId || !Array.isArray(s.frames) || !s.frames.length) return undefined;
        const track = buildTrack(s, latest.current.board);
        let frame = 0;
        let started = null;
        const finish = () => {
            cancelAnimationFrame(frame);
            setAnim(null);
            setDoneId(s.id);
        };
        const step = (stamp) => {
            if (started === null) started = stamp;
            const t = stamp - started;
            if (t >= track.duration) { finish(); return; }
            setAnim({ id: s.id, pieces: track.at(t) });
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        // A hidden tab gets no animation frames at all: the replay still ends,
        // so the board is settled (and Shoot live) when the student comes back.
        const safety = setTimeout(finish, track.duration + 400);
        return () => { cancelAnimationFrame(frame); clearTimeout(safety); };
    }, [shotId, doneId]);
    const skip = () => { setAnim(null); setDoneId(shotId); };

    // ── What to draw ────────────────────────────────────────────────────────
    let pieces;
    if (replaying) {
        pieces = anim && anim.id === shotId ? anim.pieces : shot.start.map((p) => ({ ...p, fade: 1 }));
    } else {
        pieces = (view?.pieces || []).map((p) => ({ ...p, fade: 1 }));
    }
    const canAim = myTurn && !!base && !replaying;
    const striker = base ? along(base, myTurn ? aim.position : 0.5) : null;
    const blocked = canAim && striker && (view?.pieces || []).some((p) =>
        Math.hypot(p.x - striker.x, p.y - striker.y) < radiusOf(board, p.kind) + board.strikerRadius - 0.1);
    const disabled = !myTurn || !!busy || sending || !base;
    const canShoot = canAim && !disabled && !blocked;
    /** The striker can be handled right now: placed, aimed, and its aim line drawn. */
    const live = canAim && !disabled;

    // ── Pointer: drag along the baseline to place, pull back from the striker to aim ──
    const toBoard = (e) => {
        const g = groupRef.current;
        const m = g && g.getScreenCTM();
        if (!m) return null;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        return { x: p.x, y: p.y };
    };
    const follow = (mode, p) => {
        if (!base || !striker) return;
        if (mode === 'place') {
            const dx = base.to.x - base.from.x;
            const dy = base.to.y - base.from.y;
            const t = ((p.x - base.from.x) * dx + (p.y - base.from.y) * dy) / (dx * dx + dy * dy);
            setAim((a) => ({ ...a, position: Math.round(clamp(t, 0, 1) * 1000) / 1000 }));
        } else if (mode === 'pull') {
            const d = { x: striker.x - p.x, y: striker.y - p.y };
            const pull = Math.hypot(d.x, d.y);
            if (pull < 4) return;
            setAim((a) => ({ ...a, angle: Math.round(angleOf(base, d) * 10) / 10, power: Math.round(clamp(pull / PULL, 0, 1) * 100) / 100 }));
        } else if (mode === 'point') {
            const d = { x: p.x - striker.x, y: p.y - striker.y };
            if (Math.hypot(d.x, d.y) < 4) return;
            setAim((a) => ({ ...a, angle: Math.round(angleOf(base, d) * 10) / 10 }));
        }
    };
    const onPointerDown = (e) => {
        if (!live || !striker) return;
        const p = toBoard(e);
        if (!p) return;
        const fromStriker = Math.hypot(p.x - striker.x, p.y - striker.y);
        const ahead = (p.x - striker.x) * base.forward.x + (p.y - striker.y) * base.forward.y;
        let mode;
        if (fromStriker <= board.strikerRadius * 2.2) mode = 'pull';
        else if (Math.abs(ahead) <= board.coinRadius * 2.5) mode = 'place';
        else mode = ahead > 0 ? 'point' : 'pull';
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* an old browser: dragging still works inside the board */ }
        e.preventDefault();
        setDrag({ mode, x: p.x, y: p.y });
        if (mode !== 'pull') follow(mode, p);
    };
    const onPointerMove = (e) => {
        if (!drag) return;
        const p = toBoard(e);
        if (!p) return;
        setDrag({ ...drag, x: p.x, y: p.y });
        follow(drag.mode, p);
    };
    const onPointerUp = () => setDrag(null);

    const shoot = () => {
        if (!canShoot || typeof onAction !== 'function') return;
        setSending(true);
        const action = { type: 'shoot', position: aim.position, angle: aim.angle, power: aim.power };
        Promise.resolve()
            .then(() => onAction(action))
            .catch(() => { /* the page shows the refusal's sentence */ })
            .finally(() => setSending(false));
    };

    if (!view) return <div className="p-6 text-center text-sm text-slate-500">Setting up the board…</div>;

    // ── The aim guide ───────────────────────────────────────────────────────
    let guide = null;
    if (live && striker) {
        const d = direction(base, aim.angle);
        const r = board.strikerRadius;
        const tx = d.x > 1e-9 ? (size - r - striker.x) / d.x : d.x < -1e-9 ? (r - striker.x) / d.x : Infinity;
        const ty = d.y > 1e-9 ? (size - r - striker.y) / d.y : d.y < -1e-9 ? (r - striker.y) / d.y : Infinity;
        const reach = Math.max(0, Math.min(tx, ty));
        const len = Math.min(reach, 50 + aim.power * 330);
        const tip = { x: striker.x + d.x * len, y: striker.y + d.y * len };
        const wing = 11;
        const back = { x: tip.x - d.x * wing * 1.6, y: tip.y - d.y * wing * 1.6 };
        guide = (
            <g data-aim="" pointerEvents="none">
                <line x1={striker.x} y1={striker.y} x2={striker.x + d.x * reach} y2={striker.y + d.y * reach}
                    stroke="#1e3a8a" strokeOpacity={0.18} strokeWidth={1.5} />
                <line x1={striker.x} y1={striker.y} x2={tip.x} y2={tip.y}
                    stroke="#1e3a8a" strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" />
                <polygon points={`${tip.x},${tip.y} ${back.x - d.y * wing * 0.7},${back.y + d.x * wing * 0.7} ${back.x + d.y * wing * 0.7},${back.y - d.x * wing * 0.7}`}
                    fill="#1e3a8a" />
                {drag && drag.mode === 'pull' && (
                    <line x1={striker.x} y1={striker.y} x2={drag.x} y2={drag.y} stroke="#b3261e" strokeOpacity={0.5} strokeWidth={2} strokeDasharray="4 5" />
                )}
            </g>
        );
    }

    const myBase = live ? base : null;
    const turnSeat = active && view.turn != null ? view.seats?.[view.turn] : null;
    const view0 = -FRAME;
    const span = size + FRAME * 2;
    const angleLabel = Math.abs(aim.angle) < 0.05 ? 'straight' : `${Math.abs(aim.angle).toFixed(0)}° ${aim.angle < 0 ? 'left' : 'right'}`;

    return (
        <div className="mx-auto w-full max-w-[560px] select-none" data-carrom-table="">
            <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
                {(view.score || []).map((s) => (
                    <span key={s.colour} data-score={s.colour}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                        <svg width="14" height="14" viewBox="-10 -10 20 20" aria-hidden="true">
                            <circle r="8.5" fill={LOOK[s.colour].fill} stroke={LOOK[s.colour].edge} strokeWidth="1.5" />
                        </svg>
                        {s.label}{view.yourColour === s.colour ? ' (you)' : ''}: <span data-count="">{s.pocketed}</span>/{s.total}
                    </span>
                ))}
                <span data-queen={view.queenState} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 font-medium text-rose-700 ring-1 ring-rose-200">
                    <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                    {queenText(view)}
                </span>
            </div>

            <svg
                ref={svgRef}
                viewBox={`${view0} ${view0} ${span} ${span}`}
                className="block h-auto w-full"
                style={{ aspectRatio: '1 / 1', touchAction: live ? 'none' : 'auto', cursor: live ? (drag ? 'grabbing' : 'crosshair') : 'default' }}
                role="img"
                aria-label={`Carrom board${view.yourColour ? `, you play ${view.yourColour}` : ''}`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                data-orientation={orientation}
                data-animating={replaying ? 'true' : 'false'}
            >
                <defs>
                    <linearGradient id="carrom-frame" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="#7a4a24" />
                        <stop offset="0.5" stopColor="#5b3417" />
                        <stop offset="1" stopColor="#3f230e" />
                    </linearGradient>
                    <radialGradient id="carrom-ply" cx="0.5" cy="0.5" r="0.75">
                        <stop offset="0" stopColor="#f7e6bd" />
                        <stop offset="1" stopColor="#e6c78d" />
                    </radialGradient>
                </defs>
                <g ref={groupRef} transform={`rotate(${orientation} ${size / 2} ${size / 2})`}>
                    <rect x={view0} y={view0} width={span} height={span} rx={26} fill="url(#carrom-frame)" />
                    <rect x={-6} y={-6} width={size + 12} height={size + 12} rx={4} fill="#2a170a" opacity={0.55} />
                    <rect x={0} y={0} width={size} height={size} fill="url(#carrom-ply)" />
                    {board.pockets.map((p, i) => (
                        <g key={i}>
                            <circle cx={p.x} cy={p.y} r={board.pocketRadius + 2.5} fill="#5b3417" />
                            <circle cx={p.x} cy={p.y} r={board.pocketRadius} fill="#141010" data-pocket="" />
                        </g>
                    ))}
                    <Markings board={board} />
                    {myBase && (
                        <line x1={myBase.from.x} y1={myBase.from.y} x2={myBase.to.x} y2={myBase.to.y}
                            stroke={blocked ? '#dc2626' : '#2563eb'} strokeOpacity={0.28} strokeWidth={board.coinRadius * 2} strokeLinecap="round" />
                    )}
                    {pieces.filter((p) => p.kind !== 'striker').map((p) => (
                        <Piece key={p.id} id={p.id} kind={p.kind} x={p.x} y={p.y} fade={p.fade} r={radiusOf(board, p.kind)} />
                    ))}
                    {guide}
                    {replaying
                        ? pieces.filter((p) => p.kind === 'striker').map((p) => (
                            <Piece key="striker" id="S" kind="striker" x={p.x} y={p.y} fade={p.fade} r={board.strikerRadius} />
                        ))
                        : striker && (
                            <Piece key="striker" id="S" kind="striker" x={striker.x} y={striker.y} r={board.strikerRadius} faint={!live} />
                        )}
                </g>
            </svg>

            <div className="mt-3 space-y-2.5 rounded-2xl bg-white/80 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                {replaying ? (
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">Playing the last shot…</span>
                        <button type="button" onClick={skip}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">
                            <FastForward className="h-3.5 w-3.5" aria-hidden="true" /> Skip
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-xs text-slate-500 sm:text-sm" data-hint="">
                        {!active ? 'The game is over.'
                            : you === null ? `You are watching${turnSeat ? ` — ${turnSeat.name || turnSeat.label} to shoot` : ''}.`
                                : myTurn ? (blocked ? 'The striker is sitting on a coin — slide it along your baseline to a clear spot.'
                                    : 'Drag along your baseline to place the striker, pull back from it to aim, then shoot.')
                                    : `Waiting for ${turnSeat ? (turnSeat.name || turnSeat.label) : 'the other player'} to shoot…`}
                    </p>
                )}
                <label className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Striker</span>
                    <input type="range" min="0" max="1000" step="1" aria-label="Striker position"
                        value={Math.round(aim.position * 1000)} disabled={disabled || replaying}
                        onChange={(e) => setAim((a) => ({ ...a, position: clamp(Number(e.target.value) / 1000, 0, 1) }))}
                        className="min-w-0 flex-1 accent-amber-700" />
                </label>
                <label className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Aim</span>
                    <input type="range" min={base?.angleMin ?? -80} max={base?.angleMax ?? 80} step="0.5" aria-label="Aim angle"
                        value={aim.angle} disabled={disabled || replaying}
                        onChange={(e) => setAim((a) => ({ ...a, angle: clamp(Number(e.target.value), -80, 80) }))}
                        className="min-w-0 flex-1 accent-blue-700" />
                    <span className="w-20 shrink-0 text-right text-xs tabular-nums" data-angle="">{angleLabel}</span>
                </label>
                <label className="flex items-center gap-3">
                    <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-500">Power</span>
                    <input type="range" min="0" max="100" step="1" aria-label="Shot power"
                        value={Math.round(aim.power * 100)} disabled={disabled || replaying}
                        onChange={(e) => setAim((a) => ({ ...a, power: clamp(Number(e.target.value) / 100, 0, 1) }))}
                        className="min-w-0 flex-1 accent-rose-700" />
                    <span className="w-20 shrink-0 text-right text-xs tabular-nums" data-power="">{Math.round(aim.power * 100)}%</span>
                </label>
                <button type="button" onClick={shoot} disabled={!canShoot}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 font-semibold text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500">
                    <Target className="h-4 w-4" aria-hidden="true" />
                    {sending ? 'Shooting…' : 'Shoot'}
                </button>
            </div>
        </div>
    );
}
