/**
 * The UNO table: opponents' face-down hands along the top, the draw and
 * discard piles in the middle, your own hand fanned along the bottom.
 *
 * Draws only what the server's view says (see the engine in
 * yaticorp-lms-server/src/competitions/games/uno.js): `hand` is your hand
 * and nobody else's, `playable` the card ids you may play right now. Tapping a
 * playable card plays it; a wild first asks for a colour. The "UNO!" toggle is
 * pressed before playing your second-to-last card and rides along with that
 * play as uno:true. The page around the table draws the seats, the countdown,
 * the last message, Resign and the result.
 *
 * Card faces are coloured with inline styles rather than classes, because the
 * colours come from the data and must look right wherever the table is drawn.
 */
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw, RotateCcw, X } from 'lucide-react';

const COLOURS = {
    red: { bg: '#e53935', dark: '#9f1d1a', name: 'Red' },
    yellow: { bg: '#f9c80e', dark: '#a37c00', name: 'Yellow' },
    green: { bg: '#43a047', dark: '#1b5e20', name: 'Green' },
    blue: { bg: '#1e88e5', dark: '#0d47a1', name: 'Blue' },
    wild: { bg: '#1c1c22', dark: '#000000', name: 'Wild' }
};
const PICKABLE = ['red', 'yellow', 'green', 'blue'];
const WILD_OVAL = 'conic-gradient(from 45deg, #e53935 0 25%, #1e88e5 0 50%, #43a047 0 75%, #f9c80e 0 100%)';
const SYMBOL = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: 'WILD', wild4: '+4' };
const CORNER = { skip: '⊘', reverse: '⇄', draw2: '+2', wild: 'W', wild4: '+4' };
const VALUE_NAME = { skip: 'Skip', reverse: 'Reverse', draw2: 'Draw Two', wild: 'Wild', wild4: 'Wild Draw Four' };
const COLOUR_ORDER = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
const VALUE_ORDER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'skip', 'reverse', 'draw2', 'wild', 'wild4'];

/** Card sizes. Widths scale with the screen between a 344px phone and a desktop. */
const SIZES = {
    hand: { w: 'clamp(56px, 16vw, 80px)', value: 'clamp(22px, 6.6vw, 34px)', word: 'clamp(10px, 2.8vw, 14px)', corner: 'clamp(9px, 2.6vw, 12px)', border: 3, radius: 9 },
    pile: { w: 'clamp(70px, 20vw, 100px)', value: 'clamp(28px, 8.4vw, 44px)', word: 'clamp(12px, 3.4vw, 17px)', corner: 'clamp(11px, 3vw, 14px)', border: 4, radius: 11 },
    mini: { w: '22px', value: '0', word: '0', corner: '0', border: 2, radius: 4 }
};

const cardName = (card) => (card.color === 'wild'
    ? VALUE_NAME[card.value]
    : `${COLOURS[card.color]?.name ?? card.color} ${VALUE_NAME[card.value] ?? card.value}`);

const sortHand = (hand) => [...hand].sort((a, b) => (COLOUR_ORDER[a.color] - COLOUR_ORDER[b.color])
    || (VALUE_ORDER.indexOf(a.value) - VALUE_ORDER.indexOf(b.value)) || a.id.localeCompare(b.id));

const cardBox = (size) => ({
    position: 'relative', display: 'block', overflow: 'hidden', flexShrink: 0,
    width: SIZES[size].w, aspectRatio: '2 / 3',
    border: `${SIZES[size].border}px solid #fff`, borderRadius: SIZES[size].radius,
    boxShadow: '0 2px 6px rgba(0,0,0,.35)', userSelect: 'none'
});

/** One face-up card: the colour, a tilted white oval, the value large in the middle and small in two corners. */
function CardFace({ card, size = 'hand' }) {
    const s = SIZES[size];
    const wild = card.color === 'wild';
    const c = COLOURS[card.color] ?? COLOURS.wild;
    const word = card.value === 'wild';
    const underline = card.value === '6' || card.value === '9';
    const corner = { position: 'absolute', fontSize: s.corner, fontWeight: 900, lineHeight: 1, color: '#fff', textShadow: '0 1px 1px rgba(0,0,0,.55)' };
    return (
        <span aria-hidden="true" style={{ ...cardBox(size), background: c.bg }}>
            <span style={{ position: 'absolute', inset: '13% 4%', borderRadius: '50%', transform: 'rotate(-28deg)', background: wild ? WILD_OVAL : '#fff' }} />
            <span style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 900, lineHeight: 1,
                fontSize: word ? s.word : s.value, letterSpacing: word ? '.04em' : 0,
                color: wild ? '#fff' : c.bg, textDecoration: underline ? 'underline' : 'none',
                textShadow: wild ? '0 0 3px #000, 0 1px 2px #000' : `1px 1px 0 ${c.dark}, -1px -1px 0 rgba(255,255,255,.6)`
            }}>{SYMBOL[card.value] ?? card.value}</span>
            <span style={{ ...corner, left: '8%', top: '4%' }}>{CORNER[card.value] ?? card.value}</span>
            <span style={{ ...corner, right: '8%', bottom: '4%', transform: 'rotate(180deg)' }}>{CORNER[card.value] ?? card.value}</span>
        </span>
    );
}

/** A face-down card: black, a red oval and the word UNO (left off the tiny ones). */
function CardBack({ size = 'mini', style }) {
    const tiny = size === 'mini';
    return (
        <span aria-hidden="true" style={{ ...cardBox(size), background: '#1c1c22', ...style }}>
            <span style={{ position: 'absolute', inset: '14% 6%', borderRadius: '50%', transform: 'rotate(-28deg)', background: '#e53935' }} />
            {!tiny && (
                <span style={{
                    position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', transform: 'rotate(-18deg)',
                    fontWeight: 900, fontStyle: 'italic', fontSize: SIZES[size].word, color: '#f9c80e',
                    textShadow: '2px 2px 0 #1c1c22'
                }}>UNO</span>
            )}
        </span>
    );
}

/** An opponent: name, a little fan of card backs, and how many cards they hold. */
function Opponent({ seat, index, count, resigned, playing }) {
    const shown = Math.min(count, 6);
    return (
        <li
            data-seat={index}
            data-count={count}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition sm:px-2.5 sm:py-2 ${playing ? 'bg-white/15 ring-2 ring-yellow-300' : 'bg-black/15'} ${resigned ? 'opacity-50' : ''}`}
        >
            <span className="flex max-w-[5rem] items-center gap-1.5 text-xs font-bold sm:max-w-[8.5rem]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-white/70" style={{ background: seat.color }} />
                <span className="truncate">{seat.name}</span>
            </span>
            <span className="flex h-[38px] items-end" style={{ display: 'flex', alignItems: 'flex-end', minHeight: 38 }}>
                {shown === 0 && <span className="text-[11px] text-white/70">{resigned ? 'Resigned' : 'No cards'}</span>}
                {Array.from({ length: shown }, (_, i) => (
                    <CardBack key={i} style={{ marginLeft: i ? -14 : 0, transform: `rotate(${(i - (shown - 1) / 2) * 6}deg)`, transformOrigin: 'bottom center' }} />
                ))}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-white/85">
                {resigned ? 'Resigned' : `${count} card${count === 1 ? '' : 's'}`}
                {!resigned && count === 1 && <span className="rounded-full bg-yellow-300 px-1.5 text-[10px] font-black text-red-700">UNO!</span>}
                {playing && <span className="sr-only">— playing now</span>}
            </span>
        </li>
    );
}

export default function UnoTable({ view, onAction, busy }) {
    // Both are tied to the turn they were set in, so a new turn starts clean
    // without an effect having to reset them.
    const [picker, setPicker] = useState(null); // { card, turn } while choosing a wild's colour
    const [unoAt, setUnoAt] = useState(null);   // the turn the UNO! toggle was pressed in

    if (!view) return null;
    const you = Number.isInteger(view.you) ? view.you : null;
    const seats = view.seats || [];
    const counts = view.handCounts || [];
    const resigned = view.resigned || [];
    const active = view.status === 'active';
    const myTurn = active && you !== null && view.turn === you;
    const canAct = myTurn && !busy;
    const playable = new Set(myTurn ? view.playable || [] : []);
    const hand = sortHand(view.hand || []);
    const unoOn = myTurn && unoAt !== null && unoAt === view.turnNumber;
    const choosing = canAct && picker && picker.turn === view.turnNumber && hand.some((c) => c.id === picker.card) ? picker.card : null;
    const current = COLOURS[view.currentColor] ?? null;
    const clockwise = view.direction !== -1;
    const others = you === null
        ? seats.map((_, i) => i)
        : Array.from({ length: Math.max(0, seats.length - 1) }, (_, k) => (you + 1 + k) % seats.length);

    // The page shows a refused move's sentence; the table only has to not leave
    // the rejection unhandled.
    const send = (action) => {
        setPicker(null);
        return new Promise((resolve) => resolve(onAction(action))).catch(() => {});
    };
    const withUno = (action) => (unoOn ? { ...action, uno: true } : action);
    const tap = (card) => {
        if (!canAct || !playable.has(card.id)) return;
        if (card.color === 'wild') setPicker({ card: card.id, turn: view.turnNumber });
        else send(withUno({ type: 'play', card: card.id }));
    };
    const choose = (color) => choosing && send(withUno({ type: 'play', card: choosing, color }));

    const waitingFor = view.turn !== null && view.turn !== undefined ? seats[view.turn]?.name : null;
    const hint = !active ? 'The game is over.'
        : you === null ? (waitingFor ? `Watching — ${waitingFor} is playing.` : 'Watching.')
            : !myTurn ? (waitingFor ? `Waiting for ${waitingFor}…` : 'Waiting…')
                : view.hasDrawn ? (playable.size ? 'You drew a card you can play — play it or pass.' : 'Pass to end your turn.')
                    : playable.size ? 'Your turn — tap a lifted card, or draw.' : 'Nothing matches — draw a card.';

    const n = hand.length;
    const step = n > 1 ? Math.min(3, 26 / n) : 0;

    return (
        <div
            data-uno-table
            className="relative w-full min-w-0 max-w-full overflow-hidden rounded-3xl p-3 text-white shadow-inner sm:p-5"
            style={{ maxWidth: '100%', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 40%, #1d7a50 0%, #135c3b 55%, #0b3d27 100%)' }}
        >
            {/* Opponents */}
            {others.length > 0 && (
                <ul aria-label="Other players" className="flex flex-wrap items-start justify-center gap-1.5 sm:gap-4">
                    {others.map((i) => (
                        <Opponent key={i} index={i} seat={seats[i] || { name: `Player ${i + 1}` }} count={counts[i] ?? 0} resigned={!!resigned[i]} playing={active && view.turn === i} />
                    ))}
                </ul>
            )}

            {/* Piles */}
            <div className="my-4 flex items-center justify-center gap-4 sm:my-6 sm:gap-8" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                    type="button"
                    data-action="draw"
                    onClick={() => canAct && view.canDraw && send({ type: 'draw' })}
                    disabled={!canAct || !view.canDraw}
                    aria-label={`Draw a card (${view.drawPileCount ?? 0} left in the pile)`}
                    className={`group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition disabled:cursor-not-allowed ${canAct && view.canDraw ? 'cursor-pointer hover:bg-white/10' : 'opacity-80'}`}
                >
                    <span className="relative" style={{ position: 'relative', display: 'block' }}>
                        <CardBack size="pile" style={{ position: 'absolute', left: 4, top: 4, opacity: 0.6 }} />
                        <CardBack size="pile" style={{ position: 'absolute', left: 2, top: 2, opacity: 0.8 }} />
                        <CardBack size="pile" style={canAct && view.canDraw ? { boxShadow: '0 0 0 3px #fde047, 0 4px 14px rgba(0,0,0,.4)' } : undefined} />
                    </span>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-black uppercase tracking-wide ${canAct && view.canDraw ? 'bg-yellow-300 text-emerald-950' : 'bg-black/25 text-white/70'}`}>Draw</span>
                    <span className="text-[11px] text-white/75">{view.drawPileCount ?? 0} left</span>
                </button>

                <div className="flex flex-col items-center gap-2" data-direction={clockwise ? 'clockwise' : 'anticlockwise'}>
                    <span
                        className="grid h-11 w-11 place-items-center rounded-full bg-black/25 ring-2 ring-white/30"
                        title={clockwise ? 'Play goes clockwise' : 'Play goes anticlockwise'}
                    >
                        {clockwise ? <RotateCw className="h-6 w-6" aria-hidden="true" /> : <RotateCcw className="h-6 w-6" aria-hidden="true" />}
                    </span>
                    <span className="text-[11px] font-semibold text-white/80">{clockwise ? 'Clockwise' : 'Anticlockwise'}</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    {view.top ? (
                        <span
                            data-top-card={view.top.id}
                            role="img"
                            aria-label={`Top of the pile: ${cardName(view.top)}${view.top.color === 'wild' && current ? `, colour chosen ${current.name}` : ''}`}
                            className="rounded-[14px] p-1"
                            style={{ display: 'block', borderRadius: 14, padding: 4, boxShadow: current ? `0 0 0 4px ${current.bg}, 0 0 18px ${current.bg}` : 'none' }}
                        >
                            <CardFace card={view.top} size="pile" />
                        </span>
                    ) : null}
                    <span data-current-color={view.currentColor || ''} className="flex items-center gap-1.5 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-bold">
                        <span className="h-3 w-3 rounded-full ring-1 ring-white" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 999, background: current?.bg ?? '#999' }} />
                        {current ? current.name : '—'}
                    </span>
                </div>
            </div>

            {/* Controls */}
            {you !== null && (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        data-action="uno"
                        aria-pressed={unoOn}
                        disabled={!canAct}
                        onClick={() => setUnoAt(unoOn ? null : view.turnNumber)}
                        title="Press before playing your second-to-last card"
                        className={`rounded-full px-4 py-1.5 text-sm font-black italic tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${unoOn
                            ? 'bg-yellow-300 text-red-700 shadow-[0_0_0_3px_#e53935] scale-105'
                            : 'bg-red-600 text-yellow-200 hover:bg-red-500'}`}
                    >
                        UNO!{unoOn ? ' ✓' : ''}
                    </button>
                    <p aria-live="polite" className="min-w-0 text-center text-xs font-semibold text-white/90 sm:text-sm">{hint}</p>
                    {view.canPass && myTurn && (
                        <button
                            type="button"
                            data-action="pass"
                            disabled={!canAct}
                            onClick={() => canAct && send({ type: 'pass' })}
                            className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-emerald-900 shadow hover:bg-emerald-50 disabled:opacity-50"
                        >
                            Pass
                        </button>
                    )}
                </div>
            )}
            {you === null && <p aria-live="polite" className="text-center text-xs font-semibold text-white/90 sm:text-sm">{hint}</p>}

            {/* Your hand */}
            {you !== null && (
                <div
                    data-hand
                    className="-mx-3 mt-2 sm:-mx-5"
                    style={{ overflowX: 'auto', overflowY: 'hidden', maxWidth: 'none', overscrollBehaviorX: 'contain', WebkitOverflowScrolling: 'touch' }}
                >
                    {n === 0 ? (
                        <p className="py-6 text-center text-sm text-white/70">{resigned[you] ? 'You resigned from this game.' : 'No cards in your hand.'}</p>
                    ) : (
                        <ul
                            aria-label={`Your hand, ${n} card${n === 1 ? '' : 's'}`}
                            style={{ display: 'flex', width: 'max-content', margin: '0 auto', padding: '22px 18px 12px', listStyle: 'none' }}
                        >
                            {hand.map((card, i) => {
                                const can = playable.has(card.id);
                                const lift = can && canAct ? -14 : 0;
                                const angle = (i - (n - 1) / 2) * step;
                                return (
                                    <li key={card.id} style={{ marginLeft: i ? 'clamp(-28px, -5vw, -15px)' : 0, zIndex: i, position: 'relative' }}>
                                        <button
                                            type="button"
                                            data-card={card.id}
                                            data-playable={can ? 'true' : 'false'}
                                            disabled={!canAct || !can}
                                            onClick={() => tap(card)}
                                            aria-label={`${cardName(card)}${myTurn && !can ? ' — cannot be played now' : ''}`}
                                            title={cardName(card)}
                                            className="block rounded-xl transition-transform duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300 enabled:hover:brightness-110"
                                            style={{
                                                display: 'block', padding: 0, border: 0, background: 'none', borderRadius: 12,
                                                transform: `translateY(${lift}px) rotate(${angle}deg)`, transformOrigin: 'bottom center',
                                                cursor: can && canAct ? 'pointer' : 'default',
                                                // Dimmed, not see-through: the cards overlap.
                                                filter: myTurn && !can ? 'brightness(.62) saturate(.6)' : 'none',
                                                boxShadow: can && canAct ? '0 0 0 3px #fde047, 0 8px 16px rgba(0,0,0,.35)' : 'none'
                                            }}
                                        >
                                            <CardFace card={card} size="hand" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {/* Colour picker for a wild */}
            {choosing && createPortal(
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Choose a colour"
                    data-color-picker
                    className="fixed inset-0 z-[200] grid place-items-center bg-black/55 p-4"
                    style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,.55)', padding: 16 }}
                    onClick={(e) => { if (e.target === e.currentTarget) setPicker(null); }}
                    onKeyDown={(e) => { if (e.key === 'Escape') setPicker(null); }}
                >
                    <div className="w-full max-w-xs rounded-3xl bg-white p-5 text-center shadow-2xl" style={{ width: '100%', maxWidth: 320, background: '#fff', borderRadius: 24, padding: 20 }}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="text-base font-black text-slate-900">Choose a colour</h3>
                            <button type="button" aria-label="Cancel" onClick={() => setPicker(null)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {PICKABLE.map((color, i) => (
                                <button
                                    key={color}
                                    type="button"
                                    data-color={color}
                                    autoFocus={i === 0}
                                    disabled={busy}
                                    onClick={() => choose(color)}
                                    className="rounded-2xl py-5 text-sm font-black text-white shadow transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/30"
                                    style={{ background: COLOURS[color].bg, padding: '20px 0', borderRadius: 16, border: 0, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.45)' }}
                                >
                                    {COLOURS[color].name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
