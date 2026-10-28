import { useEffect, useState } from 'react';
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

const Face = ({ src, name, color, className = '' }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className={`shrink-0 rounded-full object-cover ${className}`} style={{ boxShadow: `0 0 0 3px ${color}` }} />
        : <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full font-black text-white ${className}`} style={{ background: color, boxShadow: `0 0 0 3px ${color}33` }}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
};

export function OnlineSearch({ game, onLeft }) {
    const t = game.online;
    const left = useSecondsTo(t.startsBy);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const info = GROUP_GAMES[game.game] || {};
    const cancel = () => {
        setBusy(true); setError('');
        roomsApi.leave(game.id).then(onLeft).catch((e) => { setError(e.message); setBusy(false); });
    };
    const seats = Array.from({ length: t.players }, (_, i) => game.seats[i] || null);
    return (
        <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] p-6 text-white shadow-xl sm:p-8" data-online-search>
            <p className="flex items-center justify-center gap-2 text-xs font-black tracking-[0.2em] text-emerald-300 uppercase"><Globe size={15} aria-hidden="true" /> Play online · {info.label || game.label}</p>
            <h2 className="mt-2 text-center text-2xl font-black sm:text-3xl">Finding players…</h2>
            <p className="mt-1 text-center text-sm text-white/75">
                {game.seats.length < t.players
                    ? `${game.seats.length} of ${t.players} at the table${left != null ? ` · starts in ${left}s with whoever is here` : ''}`
                    : 'Table full — starting…'}
            </p>

            <ul className={`mt-6 grid gap-3 ${t.players === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`} aria-label="Seats">
                {seats.map((s, i) => (
                    <li key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 px-2 py-4 ring-1 ring-white/15" data-online-seat={i}>
                        {s ? (
                            <>
                                <Face src={game.avatars?.[i]} name={s.name} color={PALETTE[i % PALETTE.length]} className="h-14 w-14 text-xl" />
                                <span className="max-w-full truncate text-sm font-bold">{s.name}{game.you === i ? ' (you)' : ''}</span>
                                <span className="h-2 w-8 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} aria-hidden="true" />
                            </>
                        ) : (
                            <>
                                <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-white/40"><Loader2 size={20} className="animate-spin text-white/70" aria-hidden="true" /></span>
                                <span className="text-sm font-semibold text-white/60">Searching…</span>
                                <span className="h-2 w-8 rounded-full bg-white/20" aria-hidden="true" />
                            </>
                        )}
                    </li>
                ))}
            </ul>

            <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/10 px-2 py-3"><p className="flex items-center justify-center gap-1 text-[11px] font-semibold text-white/70"><Wallet size={12} aria-hidden="true" /> Entry fee</p><p className="text-lg font-black">{t.fee ? `₹${t.fee}` : 'Free'}</p></div>
                <div className="rounded-2xl bg-white/10 px-2 py-3"><p className="text-[11px] font-semibold text-white/70">Pot</p><p className="text-lg font-black">{t.fee ? `₹${t.pot}` : '—'}</p></div>
                <div className="rounded-2xl bg-amber-400/90 px-2 py-3 text-amber-950"><p className="flex items-center justify-center gap-1 text-[11px] font-bold"><Trophy size={12} aria-hidden="true" /> Winner gets</p><p className="text-lg font-black">{t.fee ? `₹${t.prize}` : 'XP'}</p></div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-rose-500/90 px-3 py-2 text-center text-sm font-semibold">{error}</p>}
            <div className="mt-6 flex justify-center">
                <button type="button" onClick={cancel} disabled={busy} data-cancel-search
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/15 px-6 text-sm font-bold ring-1 ring-white/30 hover:bg-white/25 disabled:opacity-60">
                    {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <X size={15} aria-hidden="true" />} Cancel{t.fee ? ' — fee back' : ''}
                </button>
            </div>
        </section>
    );
}

/**
 * One player's board, small: what they are doing now, never what they
 * picked until the question closes (option 2, asked 2026-10-28).
 *   question games  the question's options; their pick lights up at the reveal
 *                   (your own pick shows to you at once)
 *   Sudoku          the 9×9 grid with the cells they have filled (no numbers)
 *   adventures      the chambers / trials, the one they are on, their mistakes
 *   Sequence        answered or not; at the reveal, right or wrong and points
 */
const MiniBoard = ({ view, i, color }) => {
    const a = view.answers?.[i];
    const p = view.players?.[i];
    const res = view.results?.[i];
    if (view.question?.options) {
        const reveal = !!view.answer;
        return (
            <>
                <div className="grid grid-cols-2 gap-1.5">
                    {view.question.options.map((o, k) => {
                        const picked = a?.choice === k;
                        const right = reveal && view.answer.index === k;
                        const tone = reveal ? (picked && right ? 'bg-emerald-500 text-white' : picked ? 'bg-rose-500 text-white' : right ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300' : 'bg-slate-50 text-slate-500')
                            : picked ? 'text-white' : 'bg-slate-50 text-slate-500';
                        return <span key={k} className={`truncate rounded-lg px-2 py-1.5 text-[11px] font-semibold ${tone}`} style={!reveal && picked ? { background: color } : undefined}>{String.fromCharCode(65 + k)}. {o}</span>;
                    })}
                </div>
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">
                    {reveal ? (a?.choice != null ? (a.correct ? <span className="text-emerald-600">Right · +{a.points}</span> : <span className="text-rose-600">Wrong</span>) : 'No answer')
                        : a ? <span className="text-emerald-600">Answered ✓</span> : 'Thinking…'}
                </p>
            </>
        );
    }
    if (p?.cells) {
        return (
            <>
                <div className="mx-auto grid w-full max-w-[11rem] grid-cols-9 gap-px rounded-md bg-slate-300 p-px">
                    {p.cells.map((c, k) => <span key={k} className="aspect-square" style={{ background: c === 2 ? '#e2e8f0' : c === 1 ? color : '#ffffff' }} />)}
                </div>
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">{p.finished ? 'Finished ✓' : p.closed ? 'Board closed' : `${p.filled} of ${p.of} filled`} · {p.mistakes} mistake{p.mistakes === 1 ? '' : 's'}</p>
            </>
        );
    }
    if (p?.of) {
        return (
            <>
                <div className="flex items-center justify-center gap-1.5">
                    {Array.from({ length: p.of }, (_, k) => (
                        <span key={k} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${k < p.at || p.done ? 'text-white' : k === p.at ? 'bg-white ring-2' : 'bg-slate-100 text-slate-400'}`}
                            style={k < p.at || p.done ? { background: color } : k === p.at ? { color, '--tw-ring-color': color } : undefined}>{k < p.at || p.done ? '✓' : k + 1}</span>
                    ))}
                </div>
                <p className="mt-2 text-center text-[11px] font-bold text-slate-500">{p.done ? 'Finished ✓' : p.failed ? 'Out' : `On ${Math.min(p.at + 1, p.of)} of ${p.of}`} · {p.mistakes || 0} wrong</p>
            </>
        );
    }
    return (
        <p className="py-3 text-center text-sm font-bold text-slate-500">
            {res ? (res.correct ? <span className="text-emerald-600">Right · +{res.points}</span> : <span className={res.points > 0 ? 'text-amber-600' : 'text-rose-600'}>{res.points > 0 ? `+${res.points}` : 'Missed'}</span>)
                : a ? <span className="text-emerald-600">Answered ✓</span> : view.phase === 'show' ? 'Watching…' : 'Thinking…'}
        </p>
    );
};

/** One player's corner: picture, name, colour, points, and their board. */
const Corner = ({ seat, i, game, view }) => {
    const color = view.seats?.[i]?.color || PALETTE[i % PALETTE.length];
    const out = (view.out || []).includes(i);
    const you = game.you === i;
    return (
        <div className={`flex min-w-0 flex-col rounded-3xl bg-white p-3 shadow-sm ring-2 sm:p-4 ${out ? 'opacity-50' : ''}`} style={{ '--tw-ring-color': you ? color : `${color}40` }} data-corner={i}>
            <div className="mb-3 flex items-center gap-2.5">
                <Face src={game.avatars?.[i]} name={seat.name} color={color} className="h-10 w-10 text-base" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-900">{seat.name}{you && <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: color }}>YOU</span>}</p>
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">{out ? <><LogOut size={12} aria-hidden="true" /> Left the game</> : 'Playing'}</p>
                </div>
                <span className="shrink-0 rounded-xl px-2.5 py-1 text-center" style={{ background: `${color}14` }}>
                    <span className="block text-base font-black leading-none tabular-nums" style={{ color }}>{view.scores?.[i] ?? 0}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">pts</span>
                </span>
            </div>
            {!out && <MiniBoard view={view} i={i} color={color} />}
        </div>
    );
};

/**
 * Every player's board, one in each corner, the time left in the middle
 * (two players: side by side, the timer between them).
 */
export function PlayersBoard({ game, view }) {
    const left = useSecondsTo(view?.phaseEndsAt || view?.deadline || view?.endsAt || null);
    if (!view?.seats?.length) return null;
    const seats = game.seats;
    const timer = (small) => (
        <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] text-white shadow-xl ${small ? 'rounded-2xl px-4 py-2' : 'h-24 w-24 rounded-full ring-4 ring-white'}`} data-board-timer>
            <Clock size={14} className="text-white/70" aria-hidden="true" />
            <p className={`text-xl font-black tabular-nums ${left != null && left <= 10 ? 'text-rose-300' : ''}`}>{left != null ? clock(left) : '—'}</p>
            {game.online?.fee > 0 && <p className="rounded-full bg-amber-400 px-1.5 text-[9px] font-black text-amber-950">₹{game.online.prize}</p>}
        </div>
    );
    return (
        <section aria-label="Players" data-players-board>
            <div className="mb-2 flex justify-center sm:hidden">{timer(true)}</div>
            <div className="relative">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    {seats.map((s, i) => <Corner key={i} seat={s} i={i} game={game} view={view} />)}
                </div>
                <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:block">{timer(false)}</div>
            </div>
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
    chess: 'Checkmate, resignation or the clock decides it. No points: a win, a draw or a loss.'
};
const QUIZ_RULE = 'Each right answer: 100 points plus up to 50 for answering fast. Wrong or no answer: 0.';

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
