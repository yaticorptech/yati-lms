/**
 * One online game: a friendly room or a competition match.
 *
 * The page asks the server for the game about once a second (every few seconds
 * while waiting) and sends each move as one request; the server decides
 * everything. The board itself is the game's own table (games/*Table.jsx);
 * this page draws what every game shares: the waiting room, the players,
 * whose turn it is and how long is left, Resign, and the result.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Loader2, Play, LogOut, Flag, Trophy, Users, Clock, Eye, Crown, AlertTriangle } from 'lucide-react';
import { competitionsApi } from './api';
import ChessTable from './games/ChessTable';
import LudoTable from './games/LudoTable';
import CarromTable from './games/CarromTable';
import UnoTable from './games/UnoTable';

const TABLES = { chess: ChessTable, ludo: LudoTable, carrom: CarromTable, uno: UnoTable };

/** Seconds left until `deadline`, ticking. */
const useCountdown = (deadline) => {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!deadline) return undefined;
        const t = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(t);
    }, [deadline]);
    if (!deadline) return null;
    return Math.max(0, Math.ceil((new Date(deadline).getTime() - now) / 1000));
};
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function GamePage() {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const [fatal, setFatal] = useState('');
    const [busy, setBusy] = useState('');
    const [copied, setCopied] = useState(false);
    const [confirmResign, setConfirmResign] = useState(false);
    const versionRef = useRef(null);
    const statusRef = useRef('waiting');
    const joinedRef = useRef(false);

    const accept = useCallback((g) => { versionRef.current = g.version; statusRef.current = g.status; setGame(g); }, []);

    // Poll: quickly while playing, slower while waiting, and stop once over.
    useEffect(() => {
        let alive = true;
        let timer = null;
        const tick = () => {
            competitionsApi.play(gameId, versionRef.current)
                .then((r) => {
                    if (!alive) return;
                    if (r.game) accept(r.game);
                    const status = statusRef.current;
                    const over = status === 'finished' || status === 'abandoned';
                    if (!over) timer = setTimeout(tick, status === 'waiting' ? 2500 : 1000);
                })
                .catch((e) => {
                    if (!alive) return;
                    if (e.status === 404 || e.status === 403) { setFatal(e.message); return; }
                    timer = setTimeout(tick, 4000);      // offline for a moment: keep trying
                });
        };
        tick();
        return () => { alive = false; clearTimeout(timer); };
    }, [gameId, accept]);

    // A seated player who opens a match's game is here to play: join.
    useEffect(() => {
        if (!game || joinedRef.current || game.kind !== 'match' || game.status !== 'waiting' || game.you == null) return;
        joinedRef.current = true;
        competitionsApi.join(gameId).then((r) => accept(r.game)).catch((e) => setError(e.message));
    }, [game, gameId, accept]);

    const run = useCallback((key, fn) => {
        setBusy(key); setError('');
        return fn().then((r) => { if (r?.game) accept(r.game); return r; })
            .catch((e) => { setError(e.message); throw e; })
            .finally(() => setBusy(''));
    }, [accept]);
    // The table's one way to play. It rejects with the server's sentence,
    // which is shown below the board.
    const onAction = useCallback((action) => run('action', () => competitionsApi.act(gameId, action)), [gameId, run]);

    const view = game?.view;
    const turnLeft = useCountdown(game?.status === 'active' && game?.game !== 'chess' ? view?.deadline : null);
    const joinLeft = useCountdown(game?.status === 'waiting' && game?.kind === 'match' ? game?.joinDeadline : null);

    if (fatal) {
        return (
            <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm">
                <AlertTriangle size={28} className="mx-auto text-rose-500" aria-hidden="true" />
                <p className="mt-2 font-bold text-slate-900">{fatal}</p>
                <Link to="/competitions" className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Back to Games &amp; Competitions</Link>
            </div>
        );
    }
    if (!game) return <div className="space-y-4"><div className="skeleton h-16 rounded-3xl" /><div className="skeleton mx-auto aspect-square max-w-xl rounded-3xl" /></div>;

    const Table = TABLES[game.game];
    const back = game.competition ? `/competitions/${game.competition.id}` : '/competitions';
    const sideName = (side) => {
        if (game.sides?.[side]?.teamName) return `${game.sides[side].teamName}${game.sides[side].collegeName ? ` (${game.sides[side].collegeName})` : ''}`;
        return game.seats.filter((s) => s.side === side).map((s) => s.name).join(' & ') || `Side ${side + 1}`;
    };
    const mySide = game.you != null ? game.seats[game.you]?.side : null;
    const outcome = game.outcome;
    const iWon = outcome && mySide != null && outcome.places?.[0]?.length === 1 && outcome.places[0][0] === mySide;
    const tie = outcome && outcome.places?.[0]?.length > 1;

    const copy = () => {
        navigator.clipboard?.writeText(game.code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
    };

    return (
        <div className="space-y-4 pb-10" data-game-page={game.game}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-700"><ArrowLeft size={16} aria-hidden="true" /> {game.competition ? game.competition.name : 'Games'}</Link>
                {game.you == null && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><Eye size={13} aria-hidden="true" /> Watching</span>}
            </div>

            <header className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-2xl" aria-hidden="true">{game.emoji}</span>
                <div className="min-w-0 flex-1">
                    <h1 className="text-lg font-black text-slate-900 sm:text-xl">{game.label}{game.match ? <span className="font-semibold text-slate-500"> · {game.match.roundName}</span> : game.kind === 'friendly' ? <span className="font-semibold text-slate-500"> · friendly game</span> : null}</h1>
                    <p className="truncate text-sm text-slate-500">{view?.message || (game.status === 'waiting' ? 'Waiting for players' : '')}</p>
                </div>
                {game.status === 'active' && turnLeft != null && (
                    <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-black tabular-nums ${turnLeft <= 10 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`} aria-label="Time left this turn">
                        <Clock size={15} aria-hidden="true" /> {clock(turnLeft)}
                    </span>
                )}
            </header>

            {/* ── A competition match: which colleges are playing ──── */}
            {game.kind === 'match' && game.sides?.length > 0 && (
                <p data-match-sides className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm text-white">
                    {game.sides.map((s, i) => (
                        <span key={i} className="inline-flex min-w-0 items-center gap-2">
                            {i > 0 && <span className="text-xs font-black text-white/50">VS</span>}
                            <span className="truncate font-bold">{s.collegeName || s.teamName}</span>
                            {s.collegeName && <span className="truncate text-xs text-white/60">{s.teamName}</span>}
                        </span>
                    ))}
                </p>
            )}

            {/* ── Players ───────────────────────────────────────────── */}
            {/* Chess draws its own two player bars, with their clocks. */}
            {game.status !== 'waiting' && view?.seats && game.game !== 'chess' && (
                <ul className="flex flex-wrap gap-2" aria-label="Players">
                    {view.seats.map((s, i) => (
                        <li key={i} data-seat-chip={i} className={`inline-flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm ${view.turn === i ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white'}`}>
                            <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-slate-300" style={{ background: s.color }} aria-hidden="true" />
                            <span className="truncate font-bold text-slate-900">{s.name}</span>
                            <span className="text-xs text-slate-500">{s.label}{game.sides?.[s.side]?.collegeName ? ` · ${game.sides[s.side].collegeName}` : ''}</span>
                            {game.you === i && <span className="rounded-md bg-indigo-600 px-1.5 text-[10px] font-bold uppercase text-white">You</span>}
                            {view.turn === i && game.status === 'active' && <span className="text-[11px] font-bold text-indigo-700">to play</span>}
                        </li>
                    ))}
                </ul>
            )}

            {/* ── Waiting room ──────────────────────────────────────── */}
            {game.status === 'waiting' && (
                <section className="mx-auto max-w-xl space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    {game.kind === 'friendly' && game.code && (
                        <div className="text-center">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Room code</p>
                            <button type="button" onClick={copy} className="mt-1 inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-5 py-3 font-mono text-3xl font-black tracking-[0.3em] text-white" aria-label={`Room code ${game.code}, copy`}>
                                {game.code} {copied ? <Check size={20} aria-hidden="true" /> : <Copy size={20} aria-hidden="true" />}
                            </button>
                            <p className="mt-2 text-sm text-slate-500">Friends join from Games &amp; Competitions → Join with a code.</p>
                        </div>
                    )}
                    {game.kind === 'match' && (
                        <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                            The game starts as soon as every player is here.{joinLeft != null && <> Players not here in <strong className="tabular-nums">{clock(joinLeft)}</strong> lose by walkover.</>}
                        </p>
                    )}
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800"><Users size={16} aria-hidden="true" /> Players {game.kind === 'friendly' && <span className="font-semibold text-slate-400">({game.seats.length} of {game.maxSeats})</span>}</p>
                        <ul className="space-y-1.5">
                            {game.seats.map((s, i) => (
                                <li key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{s.name}{game.you === i ? ' (you)' : ''}{game.sides?.[s.side]?.teamName ? <span className="text-xs font-normal text-slate-500"> · {game.sides[s.side].teamName}</span> : null}</span>
                                    {i === 0 && game.kind === 'friendly' && <Crown size={14} className="text-amber-500" aria-label="Host" />}
                                    <span className={`text-xs font-bold ${s.joined ? 'text-emerald-600' : 'text-slate-400'}`}>{s.joined ? 'Here' : 'Not yet'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {game.kind === 'friendly' && (
                        <div className="flex flex-wrap justify-end gap-2">
                            {game.you != null && (
                                <button type="button" onClick={() => run('leave', () => competitionsApi.leave(gameId)).then(() => navigate('/competitions')).catch(() => {})} disabled={!!busy}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                                    <LogOut size={15} aria-hidden="true" /> {game.host ? 'Close room' : 'Leave'}
                                </button>
                            )}
                            {game.host ? (
                                <button type="button" onClick={() => run('start', () => competitionsApi.start(gameId)).catch(() => {})} disabled={!!busy || game.seats.length < game.minSeats}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50">
                                    {busy === 'start' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Play size={15} aria-hidden="true" />} Start game
                                </button>
                            ) : game.you != null && <p className="self-center text-sm text-slate-500">Waiting for the host to start…</p>}
                        </div>
                    )}
                    {game.kind === 'friendly' && game.host && game.seats.length < game.minSeats && <p className="text-right text-xs text-slate-500">{game.label} needs at least {game.minSeats} players.</p>}
                </section>
            )}

            {/* ── The result ────────────────────────────────────────── */}
            {(game.status === 'finished' || game.status === 'abandoned') && (
                <section data-outcome className={`rounded-3xl border p-5 shadow-sm ${iWon ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iWon ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><Trophy size={22} aria-hidden="true" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-lg font-black text-slate-900">
                                {game.status === 'abandoned' ? 'This game did not go ahead' : iWon ? 'You won!' : tie ? 'A draw' : outcome?.places?.[0] ? `${sideName(outcome.places[0][0])} won` : 'Game over'}
                            </p>
                            <p className="text-sm text-slate-600">{outcome?.reason}{game.kind === 'match' && tie ? ' The match will be replayed.' : ''}</p>
                        </div>
                        <Link to={back} className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">{game.competition ? 'Back to the competition' : 'Back to games'}</Link>
                    </div>
                    {outcome?.places?.length > 1 && (
                        <ol className="mt-4 grid gap-1.5 sm:grid-cols-2">
                            {outcome.places.map((group, i) => (
                                <li key={i} className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm ring-1 ring-slate-100">
                                    <span className="w-6 text-center font-black text-slate-500">{i + 1}</span>
                                    <span className="min-w-0 truncate font-semibold text-slate-800">{group.map(sideName).join(' = ')}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            )}

            {/* ── The board ─────────────────────────────────────────── */}
            {view && Table && <Table view={{ ...view, you: game.you }} onAction={onAction} busy={!!busy || game.status !== 'active'} />}

            {error && <p role="alert" className="sticky bottom-24 z-10 mx-auto max-w-xl rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg sidebar:bottom-6">{error}</p>}

            {game.status === 'active' && game.you != null && (
                <div className="flex justify-end">
                    {confirmResign ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2">
                            <span className="text-sm font-semibold text-rose-800">Resign this game?</span>
                            <button type="button" onClick={() => setConfirmResign(false)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white">Keep playing</button>
                            <button type="button" onClick={() => { setConfirmResign(false); onAction({ type: 'resign' }).catch(() => {}); }} className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-rose-700">Resign</button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirmResign(true)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-700">
                            <Flag size={15} aria-hidden="true" /> Resign
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
