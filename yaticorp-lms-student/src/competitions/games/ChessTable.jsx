import { useEffect, useRef, useState } from 'react';
import { Check, Handshake, ListOrdered, Timer, X } from 'lucide-react';

/**
 * The chess table: the board, both clocks, the move list and the draw
 * buttons. The page around it draws the title, the seats, whose turn it is,
 * Resign and the result (see the server's competitions/games/contract.js).
 *
 * Everything it knows comes from `view`, which the server's chess engine
 * builds: the board as an 8x8 array from White's side, the legal moves when it
 * is this student's turn (so no chess library is needed here), the clocks as
 * of the moment the view was made, and any draw offer. The board turns round
 * for Black; a spectator watches from White's side.
 *
 * The clocks are counted down here between polls, from the last view's numbers
 * plus the time since that view arrived, so they move smoothly even though the
 * page asks the server only about once a second.
 */

const FILES = 'abcdefgh';
// Wood (2026-11-02, the account owner's design): maple and walnut, the grain drawn as a soft gradient.
const LIGHT_BG = 'linear-gradient(135deg,#f3dfb8 0%,#e7cb9a 55%,#f0d8ac 100%)';
const DARK_BG = 'linear-gradient(135deg,#8a5530 0%,#6e3f1f 55%,#83502b 100%)';
const GOLD = '#d9a441';
const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const START_COUNT = { q: 1, r: 2, b: 2, n: 2, p: 8 };
const VALUE = { q: 9, r: 5, b: 3, n: 3, p: 1 };
const PROMOTIONS = [['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight']];

/* Pieces drawn on a 100x100 grid: filled shapes, then contrasting detail lines. */
const BASE = 'M24 80h52a4 4 0 0 1 4 4v6H20v-6a4 4 0 0 1 4-4z';
const ball = (x, y, r) => `M${x} ${y - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}z`;
const SHAPES = {
    p: {
        fill: [ball(50, 27, 12), 'M38 42h24a3 3 0 0 1 0 6H38a3 3 0 0 1 0-6z', 'M42 48h16c0 12 6 20 12 32H30c6-12 12-20 12-32z',
            'M28 80h44a4 4 0 0 1 4 4v6H24v-6a4 4 0 0 1 4-4z'],
        detail: []
    },
    r: {
        fill: ['M27 14h10v8h7v-8h12v8h7v-8h10v18l-6 6H33l-6-6z', 'M35 38h30l3 36H32z', 'M27 74h46v6H27z', BASE],
        detail: []
    },
    b: {
        fill: [ball(50, 13, 5), 'M50 19c12 8 18 18 16 30c-1 6-4 9-6 11H40c-2-2-5-5-6-11c-2-12 4-22 16-30z',
            'M36 60h28a3.5 3.5 0 0 1 0 7H36a3.5 3.5 0 0 1 0-7z', 'M40 67h20l6 13H34z', BASE],
        detail: ['M57 31L46 44']
    },
    n: {
        fill: ['M70 80H30c0-14 6-22 14-28c-4 2-10 4-14 4c-6 0-10-4-10-9c0-6 6-10 12-16l8-9l-2-10l9 7c18 0 30 14 30 34c0 11-6 19-7 27z', BASE],
        detail: ['M53 22c9 5 15 14 16 27'],
        dots: [[39, 34, 3], [25, 46, 1.6]]
    },
    q: {
        fill: ['M22 32L32 54L36 24L44 52L50 20L56 52L64 24L68 54L78 32L71 66H29z',
            ball(22, 32, 4.5), ball(36, 24, 4.5), ball(50, 20, 4.5), ball(64, 24, 4.5), ball(78, 32, 4.5),
            'M29 66h42l2 8H27z', 'M26 74h48v6H26z', BASE],
        detail: []
    },
    k: {
        fill: ['M46 6h8v7h7v8h-7v9h-8v-9h-7v-8h7z', 'M50 32c-6-6-24-6-24 9c0 10 8 15 10 25h28c2-10 10-15 10-25c0-15-18-15-24-9z',
            'M36 66h28l2 8H34z', 'M27 74h46v6H27z', BASE],
        detail: ['M50 34v30']
    }
};

let pieceIds = 0;
/** A piece, polished (2026-11-02): ivory or black lacquer, lit from the upper left, with a soft shadow. */
function PieceIcon({ type, color, size }) {
    const [id] = useState(() => `pc${(pieceIds += 1)}`);
    const shape = SHAPES[type];
    if (!shape) return null;
    const white = color === 'w';
    const line = white ? '#4a3b2a' : '#c9b48a';
    return (
        <svg viewBox="0 0 100 100" width={size || '100%'} height={size || '100%'} aria-hidden="true" focusable="false"
            style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.55))' }}>
            <defs>
                <linearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
                    {white
                        ? <><stop offset="0" stopColor="#ffffff" /><stop offset="0.45" stopColor="#f3ead7" /><stop offset="1" stopColor="#c9b894" /></>
                        : <><stop offset="0" stopColor="#6b6b6b" /><stop offset="0.35" stopColor="#262626" /><stop offset="1" stopColor="#050505" /></>}
                </linearGradient>
            </defs>
            <g fill={`url(#${id})`} stroke={white ? '#5c4a33' : '#000'} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
                {shape.fill.map((d) => <path key={d} d={d} />)}
            </g>
            <g fill="none" stroke={line} strokeWidth="2.6" strokeLinecap="round">
                {shape.detail.map((d) => <path key={d} d={d} />)}
            </g>
            {(shape.dots || []).map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={line} />)}
        </svg>
    );
}

/** "1:05", or "0:07.4" in the last ten seconds. */
const formatClock = (ms) => {
    const left = Math.max(0, ms);
    if (left < 10000) return `0:0${Math.floor(left / 1000)}.${Math.floor((left % 1000) / 100)}`;
    const total = Math.ceil(left / 1000);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

const squareName = (row, col) => `${FILES[col]}${8 - row}`;

/** What each side has taken, and the material balance, read off the board. */
const material = (board) => {
    const count = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
    const points = { w: 0, b: 0 };
    for (const row of board || []) {
        for (const piece of row || []) {
            if (!piece || piece.type === 'k' || !count[piece.color]) continue;
            count[piece.color][piece.type] += 1;
            points[piece.color] += VALUE[piece.type] || 0;
        }
    }
    const taken = (victim) => Object.keys(START_COUNT).flatMap((t) => Array(Math.max(0, START_COUNT[t] - count[victim][t])).fill(t));
    return { w: { taken: taken('b'), lead: points.w - points.b }, b: { taken: taken('w'), lead: points.b - points.w } };
};

function PlayerBar({ seat, info, clockMs, running, isYou, captured, avatar }) {
    const color = seat === 1 ? 'b' : 'w';
    const low = clockMs < 20000;
    const [broken, setBroken] = useState(false);
    const name = info?.name || info?.label || (seat === 1 ? 'Black' : 'White');
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border px-3 py-2 sm:px-4" data-player={seat}
            style={{ borderColor: running ? GOLD : 'rgba(217,164,65,.35)', background: 'linear-gradient(180deg,rgba(40,26,20,.92),rgba(18,12,12,.92))', boxShadow: running ? '0 0 18px rgba(217,164,65,.35)' : 'none' }}>
            <span className="relative h-11 w-11 shrink-0 rounded-full p-[2px] sm:h-12 sm:w-12" style={{ background: GOLD }}>
                {avatar && !broken
                    ? <img src={avatar} alt="" onError={() => setBroken(true)} className="h-full w-full rounded-full object-cover" />
                    : <span className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 text-sm font-black text-white">{name.slice(0, 1).toUpperCase()}</span>}
                <span className="absolute -right-0.5 -bottom-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1a1010] bg-emerald-500" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold text-[#f3e3c3] sm:text-lg" style={{ margin: 0 }}>
                    {name}{isYou && <span className="ml-1.5 font-semibold" style={{ color: GOLD }}>(you)</span>}
                </p>
                <div className="flex h-4 items-center" data-captured={seat}>
                    {captured.taken.map((t, i) => (
                        <span key={`${t}-${i}`} style={{ marginRight: -4 }}><PieceIcon type={t} color={color === 'w' ? 'b' : 'w'} size={14} /></span>
                    ))}
                    {captured.lead > 0 && <span className="ml-2 text-xs font-semibold text-[#d9cbb4]">+{captured.lead}</span>}
                </div>
            </div>
            <span data-clock={seat} data-running={running ? 'true' : 'false'}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-1 text-xl font-black tabular-nums sm:text-2xl"
                style={{ borderColor: low && running ? '#ef4444' : GOLD, color: low ? '#fca5a5' : '#fff3da', background: 'rgba(10,6,6,.6)', boxShadow: running ? '0 0 12px rgba(217,164,65,.45)' : 'none' }}>
                <Timer size={20} style={{ color: GOLD }} aria-hidden="true" /> {formatClock(clockMs)}
            </span>
        </div>
    );
}

function MoveList({ history }) {
    const ref = useRef(null);
    const plies = history || [];
    useEffect(() => {
        if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
    }, [plies.length]);
    const rows = [];
    for (let i = 0; i < plies.length; i += 2) rows.push([i / 2 + 1, plies[i], plies[i + 1]]);
    return (
        <div className="flex min-h-0 flex-col rounded-2xl border-2 xl:min-h-[28rem] xl:flex-1" style={{ borderColor: 'rgba(217,164,65,.6)', background: 'linear-gradient(180deg,rgba(28,18,26,.94),rgba(14,10,16,.94))', boxShadow: '0 0 20px rgba(217,164,65,.2)' }}>
            <p className="flex items-center gap-2.5 border-b px-4 py-3 text-base font-black tracking-wide text-[#f3e3c3] uppercase" style={{ borderColor: 'rgba(217,164,65,.45)' }}>
                <ListOrdered size={20} style={{ color: GOLD }} aria-hidden="true" /> Moves
            </p>
            <div ref={ref} data-moves className="max-h-40 overflow-y-auto px-3 py-2.5 text-sm xl:max-h-none xl:flex-1">
                {rows.length === 0 && <p className="rounded-xl bg-white/5 px-3 py-2.5 text-[#e8dcc5]">No moves yet.</p>}
                {rows.map(([n, white, black]) => (
                    <div key={n} className="grid grid-cols-[2rem_1fr_1fr] items-center gap-1 rounded px-1"
                        style={{ display: 'grid', gridTemplateColumns: '2rem 1fr 1fr', gap: 4 }}>
                        <span className="text-xs text-[#a8987f] tabular-nums">{n}.</span>
                        <span data-ply={2 * n - 2}
                            className={`rounded px-1 font-semibold ${2 * n - 2 === plies.length - 1 ? 'bg-[#d9a441]/30 text-white' : 'text-[#eadfc9]'}`}>{white}</span>
                        <span data-ply={black ? 2 * n - 1 : undefined}
                            className={`rounded px-1 font-semibold ${2 * n - 1 === plies.length - 1 ? 'bg-[#d9a441]/30 text-white' : 'text-[#eadfc9]'}`}>{black || ''}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DrawControls({ view, busy, onSend }) {
    const you = view.you;
    const active = view.status === 'active';
    const offer = view.drawOffer;
    const label = (seat) => view.seats?.[seat]?.label || (seat === 1 ? 'Black' : 'White');
    if (!active) return null;

    if (you === null || you === undefined) {
        return offer === null || offer === undefined ? null : (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">{label(offer)} offers a draw.</p>
        );
    }
    if (offer !== null && offer !== undefined && offer !== you) {
        return (
            <div className="rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200" data-draw-offer>
                <p className="text-sm font-semibold text-amber-900">{label(offer)} offers a draw.</p>
                <div className="mt-2 flex gap-2" style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy} onClick={() => onSend({ type: 'accept-draw' })}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        <Check size={16} aria-hidden="true" /> Accept
                    </button>
                    <button type="button" disabled={busy} onClick={() => onSend({ type: 'decline-draw' })}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50">
                        <X size={16} aria-hidden="true" /> Decline
                    </button>
                </div>
            </div>
        );
    }
    if (offer === you) {
        return <p className="rounded-full border-2 px-4 py-3 text-center text-sm text-[#f3e3c3]" style={{ borderColor: 'rgba(217,164,65,.6)', background: 'rgba(24,15,10,.85)' }}>Draw offered. Waiting for {label(1 - you)}.</p>;
    }
    const allowed = view.canOfferDraw !== false;
    return (
        <button type="button" disabled={busy || !allowed} onClick={() => onSend({ type: 'offer-draw' })}
            title={allowed ? 'Offer your opponent a draw' : 'Make a move before offering a draw again'}
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border-2 px-4 py-3 text-base font-bold text-[#f3e3c3] transition-shadow hover:shadow-[0_0_18px_rgba(217,164,65,.45)] disabled:opacity-50"
            style={{ borderColor: GOLD, background: 'linear-gradient(180deg,rgba(60,38,20,.9),rgba(24,15,10,.9))' }}>
            <Handshake size={22} style={{ color: GOLD }} aria-hidden="true" /> Offer Draw
        </button>
    );
}

function PromotionPicker({ color, onPick, onCancel }) {
    return (
        <div data-promotion-picker className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 p-3"
            style={{ position: 'absolute', inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.5)' }}>
            <div className="w-full max-w-xs rounded-2xl bg-white p-3 shadow-xl" style={{ background: '#fff', borderRadius: 16, padding: 12, width: '100%', maxWidth: 320 }}>
                <p className="mb-2 text-center text-sm font-bold text-slate-800">Promote your pawn to</p>
                <div className="grid grid-cols-4 gap-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                    {PROMOTIONS.map(([type, name]) => (
                        <button key={type} type="button" data-promotion={type} aria-label={`Promote to ${name.toLowerCase()}`} title={name}
                            onClick={() => onPick(type)}
                            className="flex aspect-square flex-col items-center justify-center rounded-xl bg-slate-100 p-1.5 hover:bg-violet-100"
                            style={{ aspectRatio: '1 / 1' }}>
                            <PieceIcon type={type} color={color} />
                            <span className="text-[0.65rem] font-semibold text-slate-600">{name}</span>
                        </button>
                    ))}
                </div>
                <button type="button" onClick={onCancel} className="mt-2 w-full rounded-lg py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-100">Cancel</button>
            </div>
        </div>
    );
}

export default function ChessTable({ view, onAction, busy }) {
    const you = view?.you === 0 || view?.you === 1 ? view.you : null;
    const board = view?.board || [];
    const fen = view?.fen || '';
    const flipped = you === 1;
    const myColor = you === 1 ? 'b' : 'w';
    const active = view?.status === 'active';
    const turn = active && (view.turn === 0 || view.turn === 1) ? view.turn : null;
    const interactive = active && you !== null && turn === you && !busy;

    // A selection belongs to the position it was made in: a new position clears it.
    const [pick, setPick] = useState({ fen: null, from: null, promoteTo: null });
    const from = pick.fen === fen && interactive ? pick.from : null;
    const promoteTo = pick.fen === fen && interactive ? pick.promoteTo : null;

    // Clocks: the view's numbers, less the time since that view arrived.
    const clockKey = `${view?.status}|${turn}|${view?.clocks?.[0]}|${view?.clocks?.[1]}`;
    const [spent, setSpent] = useState({ key: '', ms: 0 });
    useEffect(() => {
        if (turn === null) return undefined;
        const started = Date.now();
        const id = setInterval(() => setSpent({ key: clockKey, ms: Date.now() - started }), 200);
        return () => clearInterval(id);
    }, [clockKey, turn]);
    const elapsed = spent.key === clockKey ? spent.ms : 0;
    const clockFor = (seat) => {
        const base = Number(view?.clocks?.[seat] ?? 0);
        return seat === turn ? Math.max(0, base - elapsed) : base;
    };

    // Legal moves, by the square they start from.
    const moves = new Map();
    for (const m of (interactive && view.legalMoves) || []) {
        if (!moves.has(m.from)) moves.set(m.from, new Map());
        const targets = moves.get(m.from);
        const promotions = targets.get(m.to) || [];
        if (m.promotion) promotions.push(m.promotion);
        targets.set(m.to, promotions);
    }
    const targets = (from && moves.get(from)) || new Map();

    const pieceAt = (square) => {
        const col = FILES.indexOf(square[0]);
        const row = 8 - Number(square[1]);
        return board[row]?.[col] || null;
    };
    const sideToMove = fen.split(' ')[1] === 'b' ? 'b' : 'w';
    let checkSquare = null;
    for (let r = 0; view?.inCheck && r < 8; r += 1) {
        for (let c = 0; c < 8; c += 1) {
            const p = board[r]?.[c];
            if (p && p.type === 'k' && p.color === sideToMove) checkSquare = squareName(r, c);
        }
    }
    const last = view?.lastMove || null;

    const send = (action) => {
        setPick({ fen, from: null, promoteTo: null });
        // The page shows a refusal's message; nothing is left unhandled here.
        Promise.resolve().then(() => onAction(action)).catch(() => {});
    };

    const choose = (square) => {
        if (!interactive || promoteTo) return;
        if (from && targets.has(square)) {
            if (targets.get(square).length) setPick({ fen, from, promoteTo: square });
            else send({ type: 'move', from, to: square });
            return;
        }
        const piece = pieceAt(square);
        if (piece && piece.color === myColor && square !== from) setPick({ fen, from: square, promoteTo: null });
        else setPick({ fen, from: null, promoteTo: null });
    };

    const promote = (type) => {
        if (!from || !promoteTo) return;
        send({ type: 'move', from, to: promoteTo, promotion: type });
    };

    const taken = material(board);
    const bottomSeat = flipped ? 1 : 0;
    const topSeat = 1 - bottomSeat;
    const bar = (seat) => (
        <PlayerBar seat={seat} info={view?.seats?.[seat]} avatar={view?.avatars?.[seat]} clockMs={clockFor(seat)} running={seat === turn}
            isYou={seat === you} captured={seat === 1 ? taken.b : taken.w} />
    );

    const order = [0, 1, 2, 3, 4, 5, 6, 7];
    const rows = flipped ? [...order].reverse() : order;
    const cols = flipped ? [...order].reverse() : order;

    return (
        <div className="relative flex w-full flex-col items-center gap-4 xl:flex-row xl:items-stretch xl:justify-center xl:gap-8" data-chess-table>
            <div className="flex w-full flex-col gap-3" style={{ width: '100%', maxWidth: 'min(640px, max(320px, calc(100vh - 15rem)))', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bar(topSeat)}
                {/* The board in a gold frame, the ranks at its left and the files under it (2026-11-02). */}
                <div className="rounded-2xl border-2 p-2 pb-1 pl-1 sm:p-3 sm:pb-1.5 sm:pl-1.5" style={{ borderColor: GOLD, background: 'linear-gradient(180deg,#24160f,#120b09)', boxShadow: '0 0 26px rgba(217,164,65,.4), inset 0 0 18px rgba(0,0,0,.6)' }}>
                <div className="grid grid-cols-[1.25rem_1fr] gap-1 sm:grid-cols-[1.75rem_1fr]">
                <div className="grid grid-rows-8 text-center text-xs font-bold text-[#e8d6b0] sm:text-sm">
                    {(flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]).map((n) => <span key={n} className="flex items-center justify-center">{n}</span>)}
                </div>
                <div className="relative w-full overflow-hidden rounded-md shadow-[0_6px_18px_rgba(0,0,0,.6)]"
                    style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 6, overflow: 'hidden' }}>
                    <div role="grid" aria-label="Chess board" data-board data-orientation={flipped ? 'black' : 'white'}
                        style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gridTemplateRows: 'repeat(8, minmax(0, 1fr))', width: '100%', height: '100%' }}>
                        {rows.map((r) => cols.map((c) => {
                            const square = squareName(r, c);
                            const piece = board[r]?.[c] || null;
                            const light = (r + c) % 2 === 0;
                            const isTarget = targets.has(square);
                            const isSelected = square === from;
                            const isLast = !!last && (last.from === square || last.to === square);
                            const isCheck = square === checkSquare;
                            const name = piece ? `${square}, ${piece.color === 'w' ? 'white' : 'black'} ${PIECE_NAMES[piece.type]}` : square;
                            return (
                                <button key={square} type="button" role="gridcell" data-square={square}
                                    data-piece={piece ? `${piece.color}${piece.type}` : undefined}
                                    data-target={isTarget ? (piece ? 'capture' : 'move') : undefined}
                                    data-selected={isSelected ? 'true' : undefined}
                                    data-last={isLast ? 'true' : undefined}
                                    data-check={isCheck ? 'true' : undefined}
                                    aria-label={isTarget ? `${name}, move here` : name}
                                    aria-selected={isSelected}
                                    disabled={!interactive}
                                    onClick={() => choose(square)}
                                    style={{
                                        position: 'relative', padding: 0, margin: 0, border: 0, borderRadius: 0, minWidth: 0, minHeight: 0,
                                        background: light ? LIGHT_BG : DARK_BG, cursor: interactive ? 'pointer' : 'default',
                                        touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', color: 'inherit', opacity: 1
                                    }}>
                                    {isLast && <span style={{ position: 'absolute', inset: 0, background: 'rgba(250, 204, 21, 0.42)' }} />}
                                    {isSelected && <span style={{ position: 'absolute', inset: 0, background: 'rgba(250, 204, 21, 0.75)' }} />}
                                    {isCheck && <span style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, rgba(239,68,68,0.95) 0%, rgba(239,68,68,0.6) 38%, rgba(239,68,68,0) 72%)' }} />}
                                    {piece && (
                                        <span style={{ position: 'absolute', inset: '7%', pointerEvents: 'none' }}>
                                            <PieceIcon type={piece.type} color={piece.color} />
                                        </span>
                                    )}
                                    {isTarget && !piece && (
                                        <span style={{ position: 'absolute', left: '35%', top: '35%', width: '30%', height: '30%', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.3)', pointerEvents: 'none' }} />
                                    )}
                                    {isTarget && piece && (
                                        <span style={{ position: 'absolute', inset: '3%', borderRadius: '50%', border: '0.3em solid rgba(15, 23, 42, 0.32)', pointerEvents: 'none' }} />
                                    )}
                                </button>
                            );
                        }))}
                    </div>
                    {promoteTo && (
                        <PromotionPicker color={myColor} onPick={promote} onCancel={() => setPick({ fen, from: null, promoteTo: null })} />
                    )}
                </div>
                <span />
                <div className="grid grid-cols-8 py-1 text-center text-xs font-bold text-[#e8d6b0] sm:text-sm">
                    {(flipped ? [...FILES].reverse() : [...FILES]).map((f) => <span key={f}>{f}</span>)}
                </div>
                </div>
                </div>
                {bar(bottomSeat)}
            </div>
            <aside className="flex w-full max-w-[640px] flex-col gap-4 xl:w-80 xl:shrink-0" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <DrawControls view={{ ...view, you }} busy={busy} onSend={send} />
                <MoveList history={view?.history} />
            </aside>
        </div>
    );
}
