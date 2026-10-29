import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Loader2, Trophy, Wallet, X, Clock, LogOut } from 'lucide-react';
import { roomsApi, GROUP_GAMES } from './api';

/**
 * Group Brain "Play online" (asked 2026-10-28, "like online Ludo"):
 *
 *   OnlineSearch   while the table fills: every seat, filled with the player's
 *                  picture, name and colour as they sit down, the empty ones
 *                  searching; the time left before it starts with whoever is
 *                  there; the fee, pot and prize; and Cancel (fee back).
 *   PlayersBoard   while the game is on (online tables and rooms alike):
 *                  every player in a corner — picture, name, colour, live
 *                  points and how far along they are — and the time left in
 *                  the middle.
 *   MatchIntro     the moment the table is full (asked 2026-10-29): "Match
 *                  found", everyone at the table coming in one after the
 *                  other, and the count to the first question.
 *   PointsRule     after the game: how the points were counted, and the prize.
 *
 * The server decides everything (services/onlineService.js); this only shows it.
 */
const PALETTE = ['#6366f1', '#f43f5e', '#10b981', '#f59e0b'];

const useSecondsTo = (deadline) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return undefined;
        const t = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(t);
    }, [deadline]);
    return deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000)) : null;
};
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** A player with no picture of their own (or one that will not load) gets one of the 3D players, the same one each time. */
const characterOf = (name = '') => `/games/lobby/face-${([...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % 3) + 1}.png`;
const Face = ({ src, name, color, className = '' }) => {
    const [broken, setBroken] = useState(false);
    return <img src={src && !broken ? src : characterOf(name)} alt="" onError={() => setBroken(true)} className={`shrink-0 rounded-full object-cover ${className}`} style={{ boxShadow: `0 0 0 3px ${color}` }} />;
};

/*
 * The search, as the reference picture (2026-10-29): its dark panel, glowing table and the four 3D players
 * in their chairs are the picture (public/games/lobby/: search-scene.jpg, the table with the players, words
 * and cards painted off; char-*.png, each player cut out), and everything that changes is live on top — the
 * title, the count down, each seat's badge, name and state, the three cards and Cancel. Positions are the
 * picture's panel (944 × 804 px), as %; sizes in cqw of the panel.
 */
const LOBBY = '/games/lobby';
/** A spot on a scene (its picture's pixels), as CSS. */
const boxIn = (S) => (x, y, w, h) => ({ position: 'absolute', left: `${(x / S.w) * 100}%`, top: `${(y / S.h) * 100}%`, width: `${(w / S.w) * 100}%`, ...(h ? { height: `${(h / S.h) * 100}%` } : {}) });
// A size in cqw of the panel; with `min`, never below that many px (a phone keeps its words readable).
const cq = (v, min) => (min ? `max(${min}px, ${v}cqw)` : `${v}cqw`);
/** A seat's picture, or its initial when there is none or it does not load. */
const SeatPic = ({ src, name }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" /> : (name || '?').slice(0, 1).toUpperCase();
};
/** The players drawn in the picture: where each sits, its badge (centre, radius) and its name label (centre). */
const SPOT = {
    you: { img: 'you', at: [357, 382, 233, 210], badge: [540, 487, 32], label: [537, 534] },
    top: { img: 'top', at: [365, 107, 225, 170], badge: [549, 212, 32], label: [472, 261] },
    left: { img: 'left', at: [43, 212, 187, 185], badge: [122, 357, 31], label: [138, 406] },
    right: { img: 'right', at: [715, 207, 185, 190], badge: [823, 357, 31], label: [806, 406] },
};
/*
 * The scenes: 2 and 4 players on the four-player picture, each player laid on it (char-*.png); 6 players on
 * their own picture (asked 2026-10-29, "exactly like this"), its six players already in their chairs — only
 * the badges, names and states are live. From yours (at the front), clockwise.
 */
const FOUR = {
    img: 'search-scene.jpg', w: 944, h: 804, title: [20, 48, 90], count: [432, 312, 80, 66],
    cards: [[58, 588, 267, 96], [344, 588, 249, 96], [612, 588, 274, 96]], cancel: [387, 715, 169, 56], spots: SPOT,
    layout: { 2: ['you', 'top'], 4: ['you', 'left', 'top', 'right'] }
};
const SIX = {
    img: 'search-scene-6.jpg', w: 982, h: 835, title: [14, 45, 86], count: [451, 319, 80, 66],
    cards: [[60, 627, 275, 96], [356, 627, 261, 96], [638, 627, 285, 96]], cancel: [391, 750, 200, 64],
    spots: {
        you: { badge: [555, 519, 31], label: [554, 563] },
        bottomLeft: { badge: [249, 475, 30], label: [225, 521] },
        topLeft: { badge: [193, 269, 30], label: [206, 316] },
        top: { badge: [555, 195, 31], label: [491, 239] },
        topRight: { badge: [794, 269, 30], label: [782, 316] },
        bottomRight: { badge: [747, 475, 30], label: [766, 521] }
    },
    layout: { 6: ['you', 'bottomLeft', 'topLeft', 'top', 'topRight', 'bottomRight'] }
};
const ROLL = 'ABCDEFGHJKLMNPRSTVWY';
const WAIT_S = 30;

/** One of the three cards under the table. */
const Card = ({ label, icon, value, gold, at: where, box }) => (
    <div className={`flex flex-col items-center justify-center ${gold ? 'bg-gradient-to-b from-[#3a2a1c] to-[#241a17] shadow-[0_0_24px_rgba(245,165,36,.35),inset_0_1px_0_rgba(255,215,140,.25)]' : 'bg-[#13163a]/90 shadow-[inset_0_1px_0_rgba(255,255,255,.06)]'}`}
        style={{ ...box(...where), borderRadius: cq(1.6), border: `${cq(0.12)} solid ${gold ? '#f5a524' : '#34386e'}` }}>
        <span className={`font-extrabold tracking-[0.14em] uppercase ${gold ? 'text-[#f5b13d]' : 'text-[#a5a9da]'}`} style={{ fontSize: cq(1.45, 8) }}>{label}</span>
        <span className="flex items-center font-black text-white" style={{ gap: cq(0.9), fontSize: cq(2.95, 13), marginTop: cq(0.5) }}>
            <img src={`${LOBBY}/${icon}`} alt="" draggable="false" style={{ width: cq(4.3), height: cq(4.3) }} />{value}
        </span>
    </div>
);

export function OnlineSearch({ game, onLeft }) {
    const t = game.online;
    const left = useSecondsTo(t.startsBy);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    // The empty seats' badges flick through letters while the search runs.
    const [tick, setTick] = useState(0);
    useEffect(() => { const id = setInterval(() => setTick((n) => n + 1), 140); return () => clearInterval(id); }, []);
    const info = GROUP_GAMES[game.game] || {};
    const cancel = () => {
        setBusy(true); setError('');
        roomsApi.leave(game.id).then(onLeft).catch((e) => { setError(e.message); setBusy(false); });
    };
    const n = t.players;
    // More than six (8 to 20): the six-player picture for you and the next five; the rest in a row under it.
    const S = n >= 6 ? SIX : FOUR;
    const box = boxIn(S);
    const spots = S.layout[Math.min(n, 6)] || FOUR.layout[4];
    const [PW, PH] = [S.w, S.h];
    const me = game.you ?? 0;
    const filled = game.seats.length;
    return (
        <section className="relative mx-auto select-none" style={{ width: `min(100%, 860px, max(320px, calc((100dvh - ${n > 6 ? 21 : 17}rem) * ${S.w} / ${S.h})))`, containerType: 'inline-size' }} data-online-search data-scene={n >= 6 ? 6 : 4}>
            <div className="relative w-full overflow-hidden text-white" style={{ aspectRatio: `${S.w} / ${S.h}`, background: `url(${LOBBY}/${S.img}) center / 100% 100% no-repeat`, borderRadius: cq(3) }}>
                <style>{SEARCH_CSS}</style>
                {/* The title. */}
                <p className="flex items-center justify-center font-extrabold tracking-[0.16em] whitespace-nowrap text-white uppercase" style={{ ...box(0, S.title[0], PW, 26), gap: cq(0.9), fontSize: cq(1.65, 10) }}>
                    <Globe className="shrink-0" style={{ width: cq(1.9, 12), height: cq(1.9, 12) }} aria-hidden="true" /> Play online · {info.label || game.label}
                </p>
                <h2 className="text-center font-black tracking-tight" style={{ ...box(0, S.title[1], PW, 44), fontSize: cq(3.55, 18) }}>{filled < n ? 'Finding players…' : 'Table full!'}</h2>
                <p className="text-center text-[#c7c9e4]" style={{ ...box(0, S.title[2], PW, 24), fontSize: cq(1.8, 10.5) }}>
                    {filled} of {n} seated{filled < n ? (left != null ? ` · starts in ${left}s with whoever is here` : '') : ' · starting…'}
                </p>

                {/* The count down, in the ring at the table's middle. */}
                <span className="flex flex-col items-center justify-center leading-none" style={box(...S.count)}>
                    <span className="font-black tabular-nums" style={{ fontSize: cq(3.1, 15) }}>{left ?? '—'}</span>
                    <span className="font-bold tracking-wider text-white/80 uppercase" style={{ fontSize: cq(1.15, 7) }}>sec</span>
                </span>

                {/* The players round the table: yours at the front. */}
                {spots.map((name, k) => {
                    const seat = (me + k) % n;
                    const sp = S.spots[name];
                    const s = game.seats[seat] || null;
                    const mine = seat === game.you;
                    const color = PALETTE[seat % PALETTE.length];
                    const [bx, by, r] = sp.badge;
                    const [lx, ly] = sp.label;
                    const text = sp.small ? 1.4 : 1.75;
                    return (
                        <div key={`${n}-${name}`} data-online-seat={seat} data-seat-state={s ? 'seated' : 'searching'}>
                            {sp.img && <img src={`${LOBBY}/char-${sp.img}.png`} alt="" draggable="false" className="pointer-events-none"
                                style={{ ...box(...sp.at), opacity: s ? 1 : 0.92, animation: 'ot-pop .45s cubic-bezier(.2,1.3,.4,1) both' }} />}
                            {/* The badge: the player's picture or initial, or letters rolling while the seat is searched for. Not
                                on your own seat (asked 2026-10-29): there, only "You". */}
                            {!mine && <span className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full font-black text-white shadow-[0_6px_14px_rgba(0,0,0,.45)]"
                                style={{ left: `${(bx / PW) * 100}%`, top: `${(by / PH) * 100}%`, width: `${((r * 2) / PW) * 100}%`, aspectRatio: '1', fontSize: cq(sp.small ? 1.8 : 2.4, 9), background: s ? color : PALETTE[(tick + k * 3) % PALETTE.length], boxShadow: `0 0 0 ${cq(0.3)} rgba(255,255,255,.15), 0 6px 14px rgba(0,0,0,.45)` }}>
                                {s ? <SeatPic src={game.avatars?.[seat]} name={s.name} /> : ROLL[(tick + k * 7) % ROLL.length]}
                            </span>}
                            {/* The name, and for a seated player their state. */}
                            <span className="absolute -translate-x-1/2 -translate-y-1/2 truncate rounded-full border border-white/15 bg-[#0d0f2a]/90 text-center font-bold whitespace-nowrap"
                                style={{ left: `${(lx / PW) * 100}%`, top: `${(ly / PH) * 100}%`, maxWidth: cq(16), fontSize: cq(text, 8), padding: `${cq(0.35)} ${cq(1.4)}` }}>
                                {mine ? 'You' : s ? s.name : 'Searching…'}
                            </span>
                            {s && (
                                <span className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/60 bg-[#06302a]/90 font-extrabold tracking-[0.12em] text-emerald-300 uppercase"
                                    style={{ left: `${(lx / PW) * 100}%`, top: `${((ly + (sp.small ? 24 : 28)) / PH) * 100}%`, fontSize: cq(sp.small ? 1.2 : 1.55, 7), padding: `${cq(0.3)} ${cq(1.6)}` }}>
                                    {mine ? 'Ready' : 'Joined'}
                                </span>
                            )}
                        </div>
                    );
                })}

                {/* What is at stake. */}
                <Card label="Entry fee" icon="coin.png" value={t.fee ? `₹${t.fee}` : 'Free'} at={S.cards[0]} box={box} />
                <Card label="Ready pot" icon="coin.png" value={t.fee ? `₹${t.pot}` : '—'} at={S.cards[1]} box={box} />
                <Card label="Winner gets" icon="trophy-gold.png" value={t.fee ? `₹${t.prize}` : 'XP'} gold at={S.cards[2]} box={box} />

                <button type="button" onClick={cancel} disabled={busy} data-cancel-search title={t.fee ? 'Leave the search — your fee comes back' : 'Leave the search'}
                    className="flex items-center justify-center border border-[#3d4170] bg-[#15183a]/95 font-bold text-white transition-colors hover:border-rose-400/60 hover:bg-[#2a1630] disabled:opacity-60"
                    style={{ ...box(...S.cancel), borderRadius: cq(1.2), gap: cq(1.2), fontSize: cq(1.95, 11) }}>
                    {busy ? <Loader2 className="animate-spin" style={{ width: cq(2), height: cq(2) }} aria-hidden="true" /> : <X style={{ width: cq(2.1), height: cq(2.1) }} aria-hidden="true" />} Cancel
                </button>
            </div>
            {n > 6 && (
                <ul className="mt-3 flex flex-wrap justify-center gap-2" aria-label="The rest of the table" data-online-more-seats>
                    {Array.from({ length: n - 6 }, (_, k) => {
                        const seat = (me + 6 + k) % n;
                        const s = game.seats[seat] || null;
                        return (
                            <li key={seat} className={`flex items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-xs font-bold ${s ? 'border-emerald-400/50 bg-[#06302a]/90 text-emerald-200' : 'border-white/15 bg-[#13163a]/90 text-white/70'}`} data-online-seat={seat} data-seat-state={s ? 'seated' : 'searching'}>
                                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full font-black text-white" style={{ background: s ? PALETTE[seat % PALETTE.length] : PALETTE[(tick + k * 3) % PALETTE.length] }}>
                                    {s ? <SeatPic src={game.avatars?.[seat]} name={s.name} /> : ROLL[(tick + k * 7) % ROLL.length]}
                                </span>
                                <span className="max-w-[7rem] truncate">{s ? s.name : 'Searching…'}</span>
                            </li>
                        );
                    })}
                </ul>
            )}
            {error && <p role="alert" className="mx-auto mt-3 max-w-md rounded-xl bg-rose-500/90 px-3 py-2 text-center text-sm font-semibold text-white">{error}</p>}
        </section>
    );
}

const SEARCH_CSS = `
@keyframes ot-ping { 0% { transform: scale(.7); opacity: .9 } 100% { transform: scale(1.7); opacity: 0 } }
@keyframes ot-spin { to { transform: rotate(360deg) } }
@keyframes ot-pop { 0% { transform: scale(.4); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
@keyframes ot-in { 0% { transform: translateY(30px) scale(.6); opacity: 0 } 100% { transform: none; opacity: 1 } }
@keyframes ot-vs { 0% { transform: scale(0) rotate(-30deg); opacity: 0 } 100% { transform: none; opacity: 1 } }
@keyframes ot-title { 0% { letter-spacing: .6em; opacity: 0 } 100% { letter-spacing: .25em; opacity: 1 } }
`;

/**
 * The table is full: who you are playing, one after the other, then the
 * count to the start. Over the whole screen, for the game's own "get ready"
 * seconds (or a few seconds, for a game that starts straight away).
 */
export function MatchIntro({ game, view }) {
    const left = useSecondsTo(view?.phase === 'ready' ? view.phaseEndsAt : null);
    const info = GROUP_GAMES[game.game] || {};
    const seats = game.seats || [];
    const fee = game.online?.fee || 0;
    // Many at the table (8 to 20): smaller cards, no VS between them, and they come in quicker.
    const many = seats.length > 6;
    const step = Math.min(0.45, 3 / Math.max(1, seats.length));
    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#4c1d95,#1e1b4b_60%,#0b0a1f)] p-4 text-white" role="dialog" aria-modal="true" aria-label="Match found" data-match-intro>
            <style>{SEARCH_CSS}</style>
            {Array.from({ length: 24 }, (_, i) => (
                <span key={i} aria-hidden="true" className="absolute h-1 w-1 rounded-full bg-white/60" style={{ left: `${(i * 41) % 100}%`, top: `${(i * 67) % 100}%`, animation: `ot-pop 1.6s ease-in-out ${(i % 8) * 0.2}s infinite alternate` }} />
            ))}
            <div className="relative w-full max-w-3xl text-center">
                <p className="text-xs font-black text-emerald-300 uppercase" style={{ animation: 'ot-title .7s ease-out both' }}>Match found</p>
                <h2 className="mt-1 text-3xl font-black sm:text-4xl">{info.emoji} {info.label || game.label}</h2>
                <p className="mt-1 text-sm text-white/70">{seats.length} players · {fee ? `₹${fee} entry · winner gets ₹${game.online.prize}` : 'Free table'}</p>
                <ul className={`mt-8 flex flex-wrap items-center justify-center ${many ? 'gap-2' : 'gap-3 sm:gap-4'}`}>
                    {seats.map((s, i) => {
                        const color = view?.seats?.[i]?.color || PALETTE[i % PALETTE.length];
                        return (
                            <li key={i} className="flex items-center gap-3 sm:gap-4">
                                {i > 0 && !many && <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-sm font-black text-amber-950 shadow-lg shadow-amber-500/40" style={{ animation: `ot-vs .4s ease-out ${i * step - 0.15}s both` }}>VS</span>}
                                <div className={`flex flex-col items-center rounded-3xl bg-white/10 ring-2 backdrop-blur ${many ? 'w-20 gap-1 px-1.5 py-2.5 sm:w-24' : 'w-28 gap-2 px-2 py-4 sm:w-32'}`} style={{ '--tw-ring-color': color, animation: `ot-in .55s cubic-bezier(.2,1.3,.4,1) ${i * step}s both` }} data-intro-seat={i}>
                                    <Face src={game.avatars?.[i]} name={s.name} color={color} className={many ? 'h-11 w-11 text-base' : 'h-16 w-16 text-2xl'} />
                                    <span className="max-w-full truncate text-sm font-black">{s.name}</span>
                                    {game.you === i
                                        ? <span className="rounded-full px-2 py-0.5 text-[10px] font-black text-white" style={{ background: color }}>YOU</span>
                                        : <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase">Player {i + 1}</span>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <p className="mt-10 text-sm font-bold tracking-[0.2em] text-white/70 uppercase" style={{ animation: `ot-pop .4s ease-out ${seats.length * step}s both` }}>
                    {left ? <>Starting in <span className="text-2xl text-amber-300 tabular-nums">{left}</span></> : 'Get ready!'}
                </p>
            </div>
        </div>,
        document.body
    );
}

/**
 * One player's tally, whatever the game: right (✓), wrong (✗), and what they are doing now. Never their
 * board or their picks (asked 2026-10-29: only your own game on the screen, the others as names and scores).
 *   question and round games   right / wrong answers; Answered or Thinking while it is open
 *   races and adventures       puzzles solved / wrong tries; Finished
 *   Sudoku                     cells filled / mistakes; Finished, or Board closed
 */
const tallyOf = (view, i) => {
    const p = view.players?.[i];
    const open = view.phase === 'question' || view.phase === 'answer';
    if (p) {
        const status = p.left ? 'Left' : p.done || p.finished ? 'Finished' : p.failed ? 'Out' : p.closed ? 'Board closed' : p.of ? (p.filled != null ? `${p.filled}/${p.of} cells` : `On ${Math.min((p.at || 0) + 1, p.of)} of ${p.of}`) : 'Playing';
        return { right: p.solved ?? p.at ?? p.filled ?? 0, wrong: p.wrong ?? p.mistakes ?? 0, status, done: !!(p.done || p.finished) };
    }
    const a = view.answers?.[i];
    const res = view.results?.[i] || (a && 'correct' in a ? a : null);
    const status = view.phase === 'show' ? 'Watching…'
        : open ? (a ? 'Answered' : 'Thinking…')
            : res ? (res.correct ? `Right${res.points ? ` · +${res.points}` : ''}` : `Wrong${res.points < 0 ? ` · ${res.points}` : ''}`)
                : view.phase === 'reveal' ? 'No answer' : '';
    return { right: view.correct?.[i] ?? null, wrong: view.wrong?.[i] ?? null, status, done: open && !!a, last: res ? !!res.correct : null };
};

/**
 * The live scores (2026-10-29), over every group game but Chess and the games for two: your own game is the
 * page; the others are a row each here — picture, name, ✓ right, ✗ wrong, points — highest first, with the
 * time left. Up to twenty players.
 */
export function PlayersBoard({ game, view }) {
    const left = useSecondsTo(view?.phaseEndsAt || view?.deadline || view?.endsAt || null);
    if (!view?.seats?.length) return null;
    const secret = !view.scores;
    const rows = game.seats.map((s, i) => ({ s, i, score: view.scores?.[i] ?? 0, out: (view.out || []).includes(i), ...tallyOf(view, i) }));
    const order = secret ? rows : [...rows].sort((a, b) => b.score - a.score || a.i - b.i);
    return (
        <section aria-label="Live scores" className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-4" data-players-board>
            <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
                <p className="text-xs font-black tracking-[0.18em] text-slate-500 uppercase">Live scores · {rows.length} players</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] px-3 py-1 text-sm font-black text-white tabular-nums ${left != null && left <= 10 ? 'text-rose-300' : ''}`} data-board-timer>
                    <Clock size={13} aria-hidden="true" /> {left != null ? clock(left) : '—'}
                    {game.online?.fee > 0 && <span className="rounded-full bg-amber-400 px-1.5 text-[10px] text-amber-950">₹{game.online.prize}</span>}
                </span>
            </div>
            <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
                {order.map((r, k) => {
                    const color = view.seats?.[r.i]?.color || PALETTE[r.i % PALETTE.length];
                    const you = game.you === r.i;
                    return (
                        <li key={r.i} className={`flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 ${you ? 'bg-indigo-50 ring-2 ring-indigo-300' : 'bg-slate-50'} ${r.out ? 'opacity-50' : ''}`} data-score-row={r.i}>
                            {!secret && <span className={`w-5 shrink-0 text-center text-xs font-black tabular-nums ${k === 0 && r.score > 0 ? 'text-amber-500' : 'text-slate-400'}`}>{k + 1}</span>}
                            <Face src={game.avatars?.[r.i]} name={r.s.name} color={color} className="h-8 w-8 text-xs" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-black leading-tight text-slate-900">{you ? 'You' : r.s.name}</span>
                                <span className={`block truncate text-[11px] font-semibold leading-tight ${r.out ? 'text-slate-400' : r.last === true || r.done ? 'text-emerald-600' : r.last === false ? 'text-rose-600' : 'text-slate-500'}`}>
                                    {r.out ? <><LogOut size={11} className="mr-0.5 inline" aria-hidden="true" />Left</> : r.status}
                                </span>
                            </span>
                            {r.right != null && <span className="shrink-0 rounded-lg bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-700 tabular-nums" title="Right">✓ {r.right}</span>}
                            {r.wrong != null && <span className="shrink-0 rounded-lg bg-rose-100 px-1.5 py-0.5 text-[11px] font-black text-rose-600 tabular-nums" title="Wrong">✗ {r.wrong}</span>}
                            {!secret && <span className="w-12 shrink-0 text-right text-base font-black tabular-nums" style={{ color }} data-score={r.score}>{r.score}</span>}
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

// How each game counts its points, for the end of a game.
const RULES = {
    finalvault: 'Opening the vault: 2,000 points + 2 for every second left. If time runs out: 200 for each chamber solved, −10 for each wrong answer.',
    lostkingdom: 'Reaching the treasure: 2,000 points + 2 for every second left. If time runs out: 200 for each trial solved, −10 for each wrong answer.',
    memorymatrix: 'Each round: 10 for each right cell, −5 for each wrong one, and 50 more for getting them all.',
    sequence: 'Sequence rounds: 10 for each item in its place, 50 more for the whole sequence. Reaction rounds: 100 less 1 for every 10 ms after "Go"; a false start −20.',
    sudoku: 'Each right number +10, each wrong one −5, each hint −15. Finishing the board: 200, 150, 100 or 50 more, by who finished first.',
    chess: 'Checkmate, resignation or the clock decides it. No points: a win, a draw or a loss.',
    // The solo games played as races and in turns (2026-10-29).
    lightsout: 'Each board cleared +100, and 2 more for every second left if you clear them all.',
    codebreaker: 'Each code cracked: 60, plus 10 for every guess under ten. Clear them all early: 2 more a second left.',
    typingsprint: 'Each word typed right +100, each wrong one −20; 2 more a second left if you finish them all.',
    speedsort: 'Each set sorted right +100, each wrong try −20; 2 more a second left if you finish them all.',
    numberbonds: 'Each pair found +100, each wrong pair −20; 2 more a second left if you finish them all.',
    mathsprint: 'Each sum right +100, each wrong answer −20; 2 more a second left if you finish them all.',
    memorymatch: 'Each pair found +100, each miss −5; 2 more a second left if you find them all.',
    tictactoe: 'Best of five rounds, the first to three wins. Each round won is 100 points.',
    laststone: 'Best of five rounds, the first to three wins. Take the last stone to win a round.'
};
const QUIZ_RULE = 'Each right answer: +100 points. Each wrong answer: −20. No answer: 0.';

export function PointsRule({ game }) {
    const fee = game.online?.fee || 0;
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200" data-points-rule>
            <p className="font-black text-slate-900">How the winner was decided</p>
            <p className="mt-1">{RULES[game.game] || QUIZ_RULE}{game.game === 'chess' ? '' : ' Most points wins; level on points, the faster player is ahead.'}</p>
            {fee > 0 && <p className="mt-1.5 font-semibold text-amber-800"><Trophy size={13} className="mr-1 inline" aria-hidden="true" />Prize: {Math.round(game.online.prizeShare * 100)}% of the ₹{game.online.pot} pot (₹{game.online.prize}) to the winner — shared if level. It is in their wallet.</p>}
        </div>
    );
}
