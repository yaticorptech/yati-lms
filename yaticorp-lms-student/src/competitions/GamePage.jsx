/**
 * One online game: a competition match, or a Group Brain room (asked
 * 2026-10-27) — its lobby while it waits (RoomLobby.jsx), then its game.
 * (The old friendly rooms, and UNO, were removed on 2026-10-23; the server
 * turns an old friendly game away, and this page shows its message.)
 *
 * The page asks the server for the game about once a second (every few seconds
 * while waiting) and sends each move as one request; the server decides
 * everything. The board itself is the game's own table (games/*Table.jsx);
 * this page draws what every game shares: the waiting room, the players,
 * whose turn it is and how long is left, Resign, and the result.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Flag, Trophy, Users, Clock, Eye, AlertTriangle, RotateCcw, Crown } from 'lucide-react';
import { competitionsApi, roomsApi, BRAIN_GAMES, GROUP_GAMES } from './api';
import ChessTable from './games/ChessTable';
import LudoTable from './games/LudoTable';
import CarromTable from './games/CarromTable';
import QuizTable from './games/QuizTable';
import RaceTable from './games/RaceTable';
import TurnTable from './games/TurnTable';
import MemoryMatrixTable from './games/MemoryMatrixTable';
import SequenceTable from './games/SequenceTable';
import SudokuTable from './games/SudokuTable';
import FinalVaultTable from './games/vault/FinalVaultTable';
import KingdomTable from './games/kingdom/KingdomTable';
import RoomLobby from './RoomLobby';
import { OnlineSearch, PlayersBoard, PointsRule, MatchIntro } from './OnlineTable';
import useGroupTime from './useGroupTime';
import { clock as playClock } from '../career/components/games/playClock';
import CompetitionGuard from './CompetitionGuard';
import useLiveGame from './useLiveGame';
import Portal from '../components/Portal';
import { useHideLoop } from '../components/loopVisibility';
import GameCelebration from '../components/GameCelebration';
import { PlaySkeleton } from './Skeletons';
import useGoBack from '../hooks/useGoBack';
import { pictureUrl } from '../native/pictures';

// Ludo and Carrom stay for a match played before they were retired (2026-10-24).
// The Group Brain games: the question games on the quiz board, the rest on their own.
const GROUP_QUIZ = Object.keys(GROUP_GAMES).filter((id) => GROUP_GAMES[id].table === 'quiz');
const TABLES = {
    chess: ChessTable, ludo: LudoTable, carrom: CarromTable,
    ...Object.fromEntries([...BRAIN_GAMES, ...GROUP_QUIZ].map((id) => [id, QuizTable])),
    memorymatrix: MemoryMatrixTable, sequence: SequenceTable, sudoku: SudokuTable,
    finalvault: FinalVaultTable, lostkingdom: KingdomTable,
    // The solo games played as races, and in turns for two (2026-10-29).
    ...Object.fromEntries(Object.keys(GROUP_GAMES).filter((id) => GROUP_GAMES[id].table === 'race').map((id) => [id, RaceTable])),
    ...Object.fromEntries(Object.keys(GROUP_GAMES).filter((id) => GROUP_GAMES[id].table === 'turns').map((id) => [id, TurnTable]))
};
// Games whose table draws its own players and clock: the page leaves both out.
const GROUP_IDS = Object.keys(GROUP_GAMES).filter((id) => id !== 'chess');
const OWN_PLAYERS = ['chess', 'ludo', ...BRAIN_GAMES, ...GROUP_IDS];
const OWN_CLOCK = ['chess', ...BRAIN_GAMES, ...GROUP_IDS];
// Where a Group Brain room's page goes back to: the Games page's group games.
const GROUP_HOME = '/games?mode=group';

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

/**
 * After a drawn match game: the rematch opens 5 minutes on. Counts down to
 * it, then shows the player's (same) code and the way to the new game.
 */
const Rematch = ({ competitionId, gameId }) => {
    const navigate = useNavigate();
    const [m, setM] = useState(null);
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        let alive = true;
        const look = () => competitionsApi.detail(competitionId).then((d) => { if (alive) setM(d.myMatch || null); }).catch(() => {});
        look();
        const t = setInterval(look, 3000);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => { alive = false; clearInterval(t); clearInterval(tick); };
    }, [competitionId]);
    if (!m) return null;
    const next = m.started && m.gameId && m.gameId !== gameId;
    const left = m.rematchAt ? Math.max(0, Math.ceil((new Date(m.rematchAt).getTime() - now) / 1000)) : 0;
    if (!next && !m.rematchAt) return null;
    return (
        <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4" data-rematch>
            {next ? (
                <div className="flex flex-wrap items-center gap-3">
                    <p className="min-w-0 flex-1 basis-48 font-bold text-indigo-900">The rematch is open. Your joining code is in the pop-up.</p>
                    <button type="button" onClick={() => navigate(`/competitions/play/${m.gameId}`)} className="inline-flex min-h-10 items-center rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700">Join the rematch</button>
                </div>
            ) : (
                <p className="font-bold text-indigo-900">Rematch begins in <span className="tabular-nums">{clock(left)}</span>. Your joining code shows here then — stay on this page or come back.</p>
            )}
        </div>
    );
};

/**
 * A Group Brain room's end, as Ludo-style games show it: the winner on a
 * big gold card — their picture under a crown, their name, the XP their win
 * paid and their score — then everyone's place, 1st to last, each with the
 * XP their place earned; "You" marks your row. The same for everyone in the
 * room (the popup before it is what differs: congratulations for the
 * winner, who won for the others).
 */
const MEDAL = ['bg-gradient-to-br from-amber-300 to-yellow-500 text-amber-950', 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800', 'bg-gradient-to-br from-orange-300 to-amber-700 text-white', 'bg-slate-200 text-slate-600'];
const ORDINAL_PLACE = ['1st', '2nd', '3rd', '4th'];
const ordinal = (n) => ORDINAL_PLACE[n - 1] || `${n}th`;

/** A player's picture, or their initial when there is none (or it fails to load). */
const Face = ({ src, name, className }) => {
    const [broken, setBroken] = useState(false);
    return src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className={`${className} object-cover`} />
        : <span aria-hidden="true" className={`${className} flex items-center justify-center bg-gradient-to-br from-indigo-400 to-violet-600 font-black text-white`}>{(name || '?').slice(0, 1).toUpperCase()}</span>;
};

const RoomFinish = ({ game, onAgain, back, busy }) => {
    const standings = game.standings || [];
    // The standings are written as the game ends: a moment's wait at most.
    if (!standings.length) {
        return (
            <section className="flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 p-10 text-amber-950 shadow-lg" data-outcome data-results-loading>
                <Loader2 size={22} className="animate-spin" aria-hidden="true" /> <span className="text-lg font-black">Working out the results…</span>
            </section>
        );
    }
    const avatars = game.avatars || [];
    const winners = standings.filter((p) => p.place === 1);
    const me = standings.find((p) => p.you);
    return (
        <section className="space-y-4" data-outcome data-room-finish>
            {/* The winner, on gold. */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-400 p-6 text-center shadow-[0_18px_40px_rgba(245,158,11,0.35)] sm:p-8" data-winner-card>
                <span aria-hidden="true" className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/25 blur-2xl" />
                <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -right-8 h-48 w-48 rounded-full bg-orange-300/50 blur-2xl" />
                <p className="relative text-xs font-black uppercase tracking-[0.3em] text-amber-900/80">{winners.length > 1 ? 'Shared victory' : 'Winner'}</p>
                <div className="relative mt-4 flex flex-wrap items-end justify-center gap-8">
                    {winners.map((w) => (
                        <div key={w.seat} className="flex flex-col items-center">
                            <Crown size={34} className="-mb-1 fill-amber-100 text-amber-800 drop-shadow" aria-hidden="true" />
                            <Face src={avatars[w.seat]} name={w.name} className="h-24 w-24 rounded-full text-3xl ring-4 ring-white shadow-xl sm:h-28 sm:w-28" />
                            <p className="mt-3 text-2xl font-black text-amber-950 sm:text-3xl">{w.you ? 'You won!' : w.name}</p>
                            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-violet-700 shadow">+{w.xp} XP</span>
                                {w.score > 0 && <span className="rounded-full bg-amber-900/15 px-3 py-1 text-sm font-black text-amber-950">{w.score} pts</span>}
                            </div>
                        </div>
                    ))}
                </div>
                {game.outcome?.reason && <p className="relative mt-4 text-sm font-semibold text-amber-950/80">{game.outcome.reason}</p>}
            </div>

            {/* Everyone, 1st to last. */}
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-black text-slate-900">Final standings</h2>
                    {me && <span className="text-sm font-bold text-slate-500">You: {ordinal(me.place)} · <span className="text-violet-700">+{me.xp} XP</span></span>}
                </div>
                <ol className="space-y-2" data-podium>
                    {standings.map((p) => (
                        <li key={`${p.seat}-${p.name}`} data-place={p.place}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${p.place === 1 ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-slate-50'} ${p.you ? 'ring-2 ring-indigo-400' : ''}`}>
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black shadow-sm ${MEDAL[Math.min(3, p.place - 1)]}`}>{p.place === 1 ? <Crown size={16} aria-hidden="true" /> : ordinal(p.place)}</span>
                            <Face src={avatars[p.seat]} name={p.name} className="h-9 w-9 shrink-0 rounded-full text-sm" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold text-slate-900">{p.name}{p.you && <span className="ml-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-black text-white">YOU</span>}</span>
                                <span className="block text-xs font-semibold text-slate-500">{p.place === 1 ? 'Winner' : p.place === 2 ? '2nd place · silver' : p.place === 3 ? '3rd place · bronze' : <span className="font-bold text-rose-600">Lost</span>}{p.resigned ? ' · left the game' : ''}{` · ${p.score || 0} pts`}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-sm font-black ${p.xp ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'}`}>+{p.xp} XP</span>
                        </li>
                    ))}
                </ol>
                <div className="mt-4"><PointsRule game={game} /></div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {game.you != null && (
                        <button type="button" onClick={onAgain} disabled={busy} data-play-again className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50">
                            {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />} Play again
                        </button>
                    )}
                    <Link to={back} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-bold text-white hover:bg-slate-800">Back to Group games</Link>
                </div>
            </div>
        </section>
    );
};

export default function GamePage() {
    const goBack = useGoBack();
    // The board needs the whole screen: Loop the mascot stays away until the student leaves.
    useHideLoop();
    const { gameId } = useParams();
    const navigate = useNavigate();
    const fromGroup = useLocation().state?.from === 'group';
    const [game, setGame] = useState(null);
    const [error, setError] = useState('');
    const [fatal, setFatal] = useState('');
    const [busy, setBusy] = useState('');
    const versionRef = useRef(null);
    const statusRef = useRef('waiting');

    // A win gets the full-screen celebration, when the student was here to
    // see the game end: not when they open a game that finished earlier.
    const [cheer, setCheer] = useState(false);
    const [seenStatus, setSeenStatus] = useState(null);
    // An online table that has just filled: "Match found" for a few seconds (MatchIntro).
    const [matched, setMatched] = useState(false);
    if (game && game.status !== seenStatus) {
        setSeenStatus(game.status);
        if (seenStatus === 'active' && game.status === 'finished') setCheer(true);
        if (seenStatus === 'waiting' && game.status === 'active' && game.online) setMatched(true);
    }
    useEffect(() => {
        if (!matched) return undefined;
        const t = setTimeout(() => setMatched(false), 4500);
        return () => clearTimeout(t);
    }, [matched]);

    const kindRef = useRef(null);
    const resultTries = useRef(0);
    // Players' pictures as the app shows them elsewhere (pictureUrl): the saved link alone does not always load.
    const accept = useCallback((g) => {
        versionRef.current = g.version; statusRef.current = g.status; kindRef.current = g.kind;
        setGame(g.avatars ? { ...g, avatars: g.avatars.map((a) => (a ? pictureUrl(a) : null)) } : g);
    }, []);

    // Live: the server pushes "changed" the moment the game moves (useLiveGame);
    // then we fetch our own view at once. The poll is the fallback: quickly
    // while playing, slower while waiting, much slower while the socket is up
    // (it still checks us in as here), and it stops once the game is over.
    const pollNow = useRef(() => {});
    const live = useLiveGame(gameId, useCallback(() => pollNow.current(), []));
    const liveRef = useRef(false);
    useEffect(() => { liveRef.current = live; }, [live]);
    useEffect(() => {
        let alive = true;
        let timer = null;
        let busyPoll = false;
        let again = false;
        const tick = () => {
            if (busyPoll) { again = true; return; }
            busyPoll = true;
            clearTimeout(timer);
            competitionsApi.play(gameId, versionRef.current)
                .then((r) => {
                    if (!alive) return;
                    if (r.game) accept(r.game);
                    const status = statusRef.current;
                    // A room that has just finished but whose standings have not
                    // arrived yet: ask again (in full) until they do.
                    const waitingResults = status === 'finished' && kindRef.current === 'room' && !(r.game?.standings?.length) && resultTries.current < 15;
                    if (waitingResults) { resultTries.current += 1; versionRef.current = null; timer = setTimeout(tick, 1000); return; }
                    const over = status === 'finished' || status === 'abandoned';
                    // A room's lobby is quicker than a match's waiting room: players watch each other get ready.
                    const every = liveRef.current ? 4000 : status === 'waiting' ? (r.game?.kind === 'room' || kindRef.current === 'room' ? 1500 : 2500) : 1000;
                    if (!over) timer = setTimeout(tick, every);
                })
                .catch((e) => {
                    if (!alive) return;
                    // Not there, not theirs, or gone (an old friendly game, 410): say so and stop asking.
                    if ([403, 404, 410].includes(e.status)) { setFatal(e.message); return; }
                    timer = setTimeout(tick, 4000);      // offline for a moment: keep trying
                })
                .finally(() => {
                    busyPoll = false;
                    // A push arrived while we were asking: ask again, for the newest.
                    if (again && alive) { again = false; tick(); }
                });
        };
        pollNow.current = () => { if (alive && !['finished', 'abandoned'].includes(statusRef.current)) tick(); };
        tick();
        return () => { alive = false; clearTimeout(timer); pollNow.current = () => {}; };
    }, [gameId, accept]);

    // The moment a phase's time runs out, ask again: the server moves the game
    // on as it answers, so the next question shows without waiting for a poll.
    const phaseEndsAt = game?.status === 'active' ? game?.view?.phaseEndsAt : null;
    const serverNow = game?.view?.serverNow;
    useEffect(() => {
        if (!phaseEndsAt) return undefined;
        const skew = serverNow ? serverNow - Date.now() : 0;
        const t = setTimeout(() => pollNow.current(), Math.max(0, phaseEndsAt - (Date.now() + skew)) + 150);
        return () => clearTimeout(t);
    }, [phaseEndsAt, serverNow]);

    // A seated player takes their seat by typing their own joining code (sent
    // to them when the match opened; it is also in My Games). Nobody else's
    // code will do. A game opened before personal codes needs none.
    const [joinCode, setJoinCode] = useState('');
    const needsCode = game?.kind === 'match' && game.status === 'waiting' && game.you != null && !game.joined;
    const joinWithCode = (e) => {
        e?.preventDefault();
        run('join', () => competitionsApi.join(gameId, joinCode)).catch(() => {});
    };

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
    const turnLeft = useCountdown(game?.status === 'active' && !OWN_CLOCK.includes(game?.game) ? view?.deadline : null);
    const joinLeft = useCountdown(game?.status === 'waiting' && game?.kind === 'match' ? game?.joinDeadline : null);

    // Leaving a Group Brain game while it is on: asked first, and leaving is
    // resigning — with two players the other wins; with more, the rest play
    // on, and the last one still playing wins. Caught: the browser's back
    // (a step of our own to return to), any link in the app (the sidebar, the
    // page's Back), and closing or reloading the tab (the browser's own ask).
    const playingNow = game?.kind === 'room' && game?.status === 'active' && game?.you != null && !(view?.out || []).includes(game.you);
    const [leaving, setLeaving] = useState(null);       // { to } once a way out was taken
    useEffect(() => {
        if (!playingNow) return undefined;
        const onUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.history.pushState({ groupGameGuard: true }, '');
        const onPop = () => { window.history.pushState({ groupGameGuard: true }, ''); setLeaving({ to: null }); };
        const onClick = (e) => {
            const a = e.target?.closest?.('a[href]');
            if (!a || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
            const url = new URL(a.href, window.location.href);
            if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
            e.preventDefault(); e.stopPropagation();
            setLeaving({ to: url.pathname + url.search });
        };
        window.addEventListener('beforeunload', onUnload);
        window.addEventListener('popstate', onPop);
        document.addEventListener('click', onClick, true);
        return () => {
            window.removeEventListener('beforeunload', onUnload);
            window.removeEventListener('popstate', onPop);
            document.removeEventListener('click', onClick, true);
        };
    }, [playingNow]);
    // Leaving stays on this page: the result shows at once (2 players), or a
    // "you left" card with the live scores until the others finish, then the
    // final results. The student goes on from there, unasked.
    const leaveNow = () => {
        setLeaving(null);
        onAction({ type: 'resign' }).catch(() => {});
    };
    const leftGame = game?.kind === 'room' && game?.status === 'active' && game?.you != null && (view?.out || []).includes(game.you);
    // Group games' 30 minutes a day (2026-10-29): the clock runs only while you are playing a group game here;
    // at zero you leave the game at once and the section locks until midnight.
    const [timesUp, setTimesUp] = useState(false);
    const groupPlaying = game?.kind === 'room' && game?.status === 'active' && game?.you != null && !leftGame && !timesUp;
    const { left: groupLeft } = useGroupTime(groupPlaying, () => {
        if (!groupPlaying) return;
        setTimesUp(true);
        onAction({ type: 'resign' }).catch(() => {});
    });

    if (fatal) {
        return (
            <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-6 text-center shadow-sm">
                <AlertTriangle size={28} className="mx-auto text-rose-500" aria-hidden="true" />
                <p className="mt-2 font-bold text-slate-900">{fatal}</p>
                <Link to={fromGroup ? GROUP_HOME : '/competitions'} className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">{fromGroup ? 'Back to Group games' : 'Back to Competitions'}</Link>
            </div>
        );
    }
    if (!game) return <PlaySkeleton />;

    const Table = TABLES[game.game];
    const room = game.kind === 'room';
    // Every group game but Chess and the games for two: the live scores over your own game, which then hides its own.
    const liveBoard = room && game.status === 'active' && !leftGame && game.game !== 'chess' && GROUP_GAMES[game.game]?.table !== 'turns' && !!GROUP_GAMES[game.game];
    const back = room ? GROUP_HOME : game.competition ? `/competitions/${game.competition.id}` : '/competitions';
    const backLabel = room ? 'Back to Group games' : game.competition ? 'Back to the competition' : 'Back to games';
    // After a room's game: a new room for the same game and difficulty.
    // An online table: another search at the same size and fee.
    const again = () => run('again', () => (game.online ? roomsApi.online(game.game, game.online.players, game.online.fee) : roomsApi.create(game.game, game.options || {})))
        .then((r) => { if (r?.game?.id) navigate(`/games/play/${r.game.id}`, { replace: true, state: { from: 'group' } }); })
        .catch(() => {});
    const sideName = (side) => {
        if (game.sides?.[side]?.teamName) return `${game.sides[side].teamName}${game.sides[side].collegeName ? ` (${game.sides[side].collegeName})` : ''}`;
        return game.seats.filter((s) => s.side === side).map((s) => s.name).join(' & ') || `Side ${side + 1}`;
    };
    const mySide = game.you != null ? game.seats[game.you]?.side : null;
    const outcome = game.outcome;
    const iWon = outcome && mySide != null && outcome.places?.[0]?.length === 1 && outcome.places[0][0] === mySide;
    const tie = outcome && outcome.places?.[0]?.length > 1;
    const myStanding = (game.standings || []).find((p) => p.you) || null;
    const winnerList = (game.standings || []).filter((p) => p.place === 1);
    const winnerNames = winnerList.map((p) => p.name).join(' & ');
    const winnerCount = winnerList.length;

    // An online table still looking for players: the dark page of the reference picture (2026-10-29),
    // edge to edge under the top bar; every other state keeps the light page.
    const searching = room && game.online && game.status === 'waiting';
    return (
        <div className={`space-y-4 pb-10 -mt-4 sidebar:-mt-8 ${searching ? '-mx-4 min-h-[calc(100vh-4rem)] bg-[radial-gradient(ellipse_at_50%_35%,#1b1f5c_0%,#0d0f2e_55%,#080a1f_100%)] px-4 pt-4 sidebar:-mx-8 sidebar:px-8 sidebar:pt-8' : ''}`} data-game-page={game.game} data-searching={searching || undefined}>
            {timesUp && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Group games time is up" data-group-time-up>
                    <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
                        <Clock size={34} className="mx-auto rounded-full bg-sky-100 p-1.5 text-sky-700" aria-hidden="true" />
                        <p className="mt-3 text-lg font-black text-slate-900">Today&apos;s 30 minutes are up</p>
                        <p className="mt-1 text-sm text-slate-600">Group games are locked until midnight. Your solo games are still open.</p>
                        <button type="button" onClick={() => navigate(GROUP_HOME, { replace: true })} className="mt-5 w-full rounded-full bg-indigo-600 py-2.5 text-sm font-black text-white hover:bg-indigo-700">Back to Group games</button>
                    </div>
                </div>
            )}
            {/* A competition match, on for me: no copying, no screenshots, no leaving until it is over. */}
            <CompetitionGuard active={game.kind === 'match' && game.you != null && (game.status === 'active' || (game.status === 'waiting' && !!game.joined))} />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to={back} onClick={goBack} className={`-my-2.5 inline-flex min-h-10 items-center gap-1.5 py-2.5 text-sm font-semibold ${searching ? 'text-[#a5a9da] hover:text-white' : 'text-slate-500 hover:text-indigo-700'}`}><ArrowLeft size={16} aria-hidden="true" /> Back</Link>
                {game.you == null && <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><Eye size={13} aria-hidden="true" /> Watching</span>}
            </div>

            {/* The game's name with what kind of game it is as a small badge
                beside it, not a phrase after it: "Ludo · friendly game" broke
                over two lines on a phone (2026-10-17, "make the ui better"). */}
            <header className={`flex items-center gap-3 rounded-3xl border p-3 shadow-sm sm:p-4 ${searching ? 'border-[#4b46b8]/70 bg-[#141845]/85 shadow-[0_0_30px_rgba(99,102,241,.18)]' : 'border-slate-200 bg-white'}`}>
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl sm:h-12 sm:w-12 ${searching ? 'bg-white shadow-md' : 'bg-indigo-50'}`} aria-hidden="true">{game.emoji}</span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h1 className={`text-lg font-black leading-tight sm:text-xl ${searching ? 'text-white' : 'text-slate-900'}`}>{game.label}</h1>
                        {game.match && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">{game.match.roundName}</span>}
                        {room && (game.online
                            ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ${searching ? 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/60' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>Online · {game.online.fee ? `₹${game.online.fee} entry` : 'Free'}</span>
                            : <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-inset ring-indigo-200">Group Brain · {game.options?.difficulty || 'medium'}</span>)}
                        {room && groupLeft != null && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ring-1 ring-inset ${groupLeft <= 60 ? 'bg-rose-50 text-rose-700 ring-rose-200' : searching ? 'bg-white/10 text-white ring-white/30' : 'bg-sky-50 text-sky-800 ring-sky-200'}`} title="Group games play left today (it runs only while you play)" data-group-time>
                                <Clock size={12} aria-hidden="true" /> {playClock(groupLeft)} left today
                            </span>
                        )}
                    </div>
                    <p className={`break-words text-sm ${searching ? 'text-[#c7c9e4]' : 'text-slate-500'}`}>{view?.message || (game.status === 'waiting' ? 'Waiting for players' : '')}</p>
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
            {/* Chess draws its own two player bars, with their clocks, Ludo
                its players at their corners of the board, with the dice, and
                the brain games a scoreboard. */}
            {game.status !== 'waiting' && view?.seats && !OWN_PLAYERS.includes(game.game) && (
                // Two to a row on a phone: the name on its own line, so a long
                // one is not cut off for a badge, and under it whose it is, the
                // colour, and "to play" for the player whose turn it is — who
                // also glows, with a live dot.
                <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Players">
                    {view.seats.map((s, i) => {
                        const toPlay = view.turn === i && game.status === 'active';
                        return (
                            <li key={i} data-seat-chip={i} className={`flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-colors ${toPlay ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 bg-white'}`}>
                                <span className="relative flex h-3 w-3 shrink-0" aria-hidden="true">
                                    {toPlay && <span className="absolute inset-0 animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ background: s.color }} />}
                                    <span className="relative h-3 w-3 rounded-full ring-1 ring-slate-300" style={{ background: s.color }} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-bold leading-tight text-slate-900">{s.name}</span>
                                    <span className={`block truncate text-[11px] font-semibold leading-tight ${toPlay ? 'text-indigo-700' : 'text-slate-500'}`}>
                                        {[game.you === i && 'You', s.label, game.sides?.[s.side]?.collegeName, toPlay && 'to play'].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* ── A Group Brain room's lobby ────────────────────────── */}
            {room && game.status === 'waiting' && (game.online
                ? <OnlineSearch game={game} onLeft={() => navigate(GROUP_HOME, { replace: true })} />
                : <RoomLobby game={game} live={live} onUpdate={accept} onLeft={() => navigate(GROUP_HOME, { replace: true })} />)}
            {room && game.online && game.status === 'active' && (matched || view?.phase === 'ready') && <MatchIntro game={game} view={view} />}
            {/* A room's game on: every player at a corner, the time left between them (Chess draws its own two). */}
            {/* The live scores (2026-10-29): your own game below, the others only as names, ✓ right, ✗ wrong and points. */}
            {liveBoard && <PlayersBoard game={game} view={view} />}

            {/* ── Waiting room ──────────────────────────────────────── */}
            {!room && game.status === 'waiting' && (
                <section className="mx-auto max-w-xl space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    {needsCode && (
                        <form onSubmit={joinWithCode} className="space-y-2 rounded-2xl border-2 border-indigo-200 bg-white p-4" data-join-form>
                            <p className="font-black text-slate-900">Enter your joining code to take your seat</p>
                            <p className="text-sm text-slate-600">It was sent to you when the match opened, and it is on your match in My Games. Only your own code works.</p>
                            <div className="flex gap-2">
                                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="6-character code" autoFocus
                                    className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-lg tracking-[0.3em] text-slate-900 placeholder:font-sans placeholder:text-sm placeholder:tracking-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" aria-label="Joining code" />
                                <button type="submit" disabled={joinCode.length !== 6 || !!busy} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy === 'join' && <Loader2 size={15} className="animate-spin" />} Join</button>
                            </div>
                        </form>
                    )}
                    {game.kind === 'match' && (
                        <p className="rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                            The game starts as soon as every player is here.{joinLeft != null && <> Players not here in <strong className="tabular-nums">{clock(joinLeft)}</strong> lose by walkover.</>}
                        </p>
                    )}
                    <div>
                        <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800"><Users size={16} aria-hidden="true" /> Players</p>
                        <ul className="space-y-1.5">
                            {game.seats.map((s, i) => (
                                <li key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{s.name}{game.you === i ? ' (you)' : ''}{game.sides?.[s.side]?.teamName ? <span className="text-xs font-normal text-slate-500"> · {game.sides[s.side].teamName}</span> : null}</span>
                                    <span className={`text-xs font-bold ${s.joined ? 'text-emerald-600' : 'text-slate-400'}`}>{s.joined ? 'Here' : 'Not yet'}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>
            )}

            {/* The popup, with confetti, for everyone in a room: the winner's
                congratulations, and for the others who won — each with their own place and XP. */}
            {leaving && game && (
                <Portal>
                    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setLeaving(null)}>
                        <div onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-labelledby="leave-title" className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl" data-leave-confirm>
                            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Flag size={26} aria-hidden="true" /></span>
                            <h2 id="leave-title" className="mt-3 text-xl font-black text-slate-900">Leave the game?</h2>
                            <p className="mt-1.5 text-sm text-slate-600">
                                {(() => {
                                    const others = (view?.seats || []).map((s, i) => ({ ...s, i })).filter((s) => s.i !== game.you && !(view?.out || []).includes(s.i));
                                    return others.length === 1
                                        ? <>Are you sure? If you leave, you lose and <b>{others[0].name}</b> wins.</>
                                        : <>Are you sure? If you leave, you lose. The other {others.length} play on without you.</>;
                                })()}
                            </p>
                            <div className="mt-5 flex gap-2">
                                <button type="button" onClick={() => setLeaving(null)} autoFocus className="flex-1 rounded-full py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">Stay and play</button>
                                <button type="button" onClick={leaveNow} data-leave-yes className="flex-1 rounded-full bg-rose-600 py-2.5 text-sm font-black text-white shadow-md shadow-rose-600/30 hover:bg-rose-700">Leave and lose</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {cheer && room && game.status === 'finished' && game.standings?.length > 0 && (
                <GameCelebration
                    eyebrow={`Group Brain · ${game.label}`}
                    title={iWon ? 'Congratulations, you won!' : `${winnerNames || 'The game is over'} ${winnerCount > 1 ? 'share the win!' : 'won!'}`}
                    subtitle={iWon ? 'First place — brilliant thinking!' : myStanding ? `You finished ${ordinal(myStanding.place)}. Well played!` : game.label}
                    detail={myStanding ? `You earned +${myStanding.xp} XP.` : outcome?.reason}
                    xp={myStanding?.xp || null}
                    primary={{ label: 'See the results', onClick: () => setCheer(false) }}
                    onClose={() => setCheer(false)}
                />
            )}
            {cheer && !room && iWon && (
                <GameCelebration
                    eyebrow={game.competition ? game.competition.name : 'Victory'}
                    title="You won!"
                    subtitle={game.label}
                    detail={outcome?.reason}
                    primary={{ label: backLabel, onClick: () => navigate(back) }}
                    onClose={() => setCheer(false)}
                />
            )}

            {/* ── The result ────────────────────────────────────────── */}
            {room && game.status === 'finished' && <RoomFinish game={game} onAgain={again} back={back} busy={busy === 'again'} />}
            {(game.status === 'abandoned' || (game.status === 'finished' && !room)) && (
                <section data-outcome className={`rounded-3xl border p-5 shadow-sm ${iWon ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iWon ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><Trophy size={22} aria-hidden="true" /></span>
                        {/* A base width: beside the button on a phone, the words
                            were squeezed one a line, and ran under it. */}
                        <div className="min-w-0 flex-1 basis-48">
                            <p className="text-lg font-black text-slate-900">
                                {game.status === 'abandoned' ? (room ? 'This room closed' : 'This game did not go ahead') : outcome?.hidden ? 'Match over — results coming soon' : iWon ? (room ? `Congratulations, you won!${game.result?.xpStatus === 'paid' ? ` +${game.result.xp} XP` : ''}` : 'You won!') : tie ? 'A draw' : outcome?.places?.[0] ? `${sideName(outcome.places[0][0])} won` : 'Game over'}
                            </p>
                            <p className="text-sm text-slate-600">{outcome?.reason}{game.kind === 'match' && tie ? ' The match will be replayed in 5 minutes.' : ''}</p>
                            {room && game.result && (
                                <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm font-semibold" data-room-result>
                                    {game.result.total > 0 && <span className="text-slate-700">{game.result.correct}/{game.result.total} right · {game.result.score} pts</span>}
                                    {game.result.xpStatus === 'paid' && <span className="text-violet-700">+{game.result.xp} XP for {['', '1st', '2nd', '3rd', '4th'][game.result.place] || 'your'} place</span>}
                                    {game.result.xpStatus === 'held' && <span className="text-amber-700">{game.result.xp} XP waiting for a check</span>}
                                </p>
                            )}
                        </div>
                        {room && game.status === 'finished' && game.you != null && (
                            <button type="button" onClick={again} disabled={!!busy} data-play-again className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                                {busy === 'again' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />} New room
                            </button>
                        )}
                        <Link to={back} className="inline-flex min-h-10 items-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white hover:bg-slate-800">{backLabel}</Link>
                    </div>
                    {game.kind === 'match' && tie && game.competition && <Rematch competitionId={game.competition.id} gameId={game.id || gameId} />}
                    {/* Each place may shrink and wrap: a long team and college
                        name kept on one line ran 45px past the card on a phone
                        (2026-10-17). */}
                    {room && game.standings?.length > 0 && <Podium standings={game.standings} avatars={game.avatars} />}
                    {!room && outcome?.places?.length > 1 && (
                        <ol className="mt-4 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {outcome.places.map((group, i) => (
                                <li key={i} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm ring-1 ring-slate-100">
                                    <span className="w-6 shrink-0 text-center font-black text-slate-500">{i + 1}</span>
                                    <span className="min-w-0 break-words font-semibold text-slate-800">{group.map(sideName).join(' = ')}</span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            )}

            {/* ── The board ─────────────────────────────────────────── */}
            {/* Under a room's finish: the board only where it still says something
                (Chess, Sudoku), and a quiz game's answers to review. */}
            {/* Left a game the others are still playing: their live scores, and the final results here when they finish. */}
            {leftGame && (() => {
                const rows = (view?.seats || []).map((x, i) => ({ ...x, i, score: view.scores?.[i] ?? 0, out: (view.out || []).includes(i) }))
                    .sort((x, y) => (x.out - y.out) || y.score - x.score);
                const inPlay = rows.filter((r) => !r.out);
                const podium = inPlay.slice(0, 3);
                const rest = [...inPlay.slice(3), ...rows.filter((r) => r.out)];
                const top = Math.max(1, ...inPlay.map((r) => r.score));
                // Podium order on the stage: 2nd, 1st, 3rd.
                const stage = [podium[1], podium[0], podium[2]].filter(Boolean);
                const METAL = [
                    { face: 'from-[#ffe58a] via-[#f5b301] to-[#b77900]', lid: '#ffe9a3', ring: '#fbbf24', h: 'h-20 sm:h-24' },
                    { face: 'from-[#f1f5f9] via-[#a8b3c4] to-[#64748b]', lid: '#f8fafc', ring: '#cbd5e1', h: 'h-14 sm:h-[4.5rem]' },
                    { face: 'from-[#f6c39b] via-[#cd7f32] to-[#7c4a1e]', lid: '#fbd5b5', ring: '#d6955b', h: 'h-10 sm:h-12' }
                ];
                const Pic = ({ r, size }) => (
                    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black text-white ${size}`} style={{ background: r.color, boxShadow: `0 0 0 3px #fff2, 0 6px 14px rgba(0,0,0,.45), inset 0 -4px 8px rgba(0,0,0,.25)` }}>
                        {game.avatars?.[r.i] ? <img src={game.avatars[r.i]} alt="" className="h-full w-full object-cover" /> : (r.name || '?').slice(0, 1).toUpperCase()}
                    </span>
                );
                return (
                    // Out of a game the others play on (asked 2026-10-29: "attractive, a 3D feel"):
                    // a stage with a podium for the leaders, live until the game ends.
                    <section className="relative mx-auto max-w-md overflow-hidden rounded-[24px] bg-[radial-gradient(ellipse_at_50%_0%,#5b21b6_0%,#1e1b4b_55%,#0a0820_100%)] px-4 pt-5 pb-5 text-white shadow-[0_30px_60px_rgba(15,10,50,.5)] ring-1 ring-white/10 sm:px-6" data-left-game>
                        <style>{`
                            @keyframes lg-rise { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
                            @keyframes lg-glow { 50% { opacity: .55 } }
                            @keyframes lg-shine { from { transform: translateX(-120%) skewX(-20deg) } to { transform: translateX(260%) skewX(-20deg) } }
                        `}</style>
                        {/* The stage: a spotlight and a floor running away from you. */}
                        <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 h-80 w-[28rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,.22),transparent_65%)]" style={{ animation: 'lg-glow 4s ease-in-out infinite' }} />
                        <span aria-hidden="true" className="pointer-events-none absolute inset-x-[-30%] bottom-0 h-72 opacity-40"
                            style={{ backgroundImage: 'linear-gradient(rgba(167,139,250,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,.5) 1px, transparent 1px)', backgroundSize: '44px 44px', transform: 'perspective(420px) rotateX(62deg)', transformOrigin: 'bottom', maskImage: 'linear-gradient(to top, #000 10%, transparent 90%)', WebkitMaskImage: 'linear-gradient(to top, #000 10%, transparent 90%)' }} />

                        <div className="relative text-center">
                            {/* A 3D ribbon: you are out. */}
                            <div className="relative mx-auto inline-block">
                                <span aria-hidden="true" className="absolute top-2 -left-5 h-full w-8 bg-rose-900" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 35% 50%)' }} />
                                <span aria-hidden="true" className="absolute top-2 -right-5 h-full w-8 bg-rose-900" style={{ clipPath: 'polygon(0 0, 100% 0, 65% 50%, 100% 100%, 0 100%)' }} />
                                <span className="relative block rounded-md bg-gradient-to-b from-rose-400 to-rose-600 px-4 py-1 text-[11px] font-black tracking-[0.3em] uppercase shadow-[0_3px_0_#9f1239,0_8px_16px_rgba(244,63,94,.4)]">Eliminated</span>
                            </div>
                            <h2 className="mt-3 text-2xl font-black [text-shadow:0_2px_0_rgba(0,0,0,.35)] sm:text-[1.7rem]">You left the match</h2>
                            <p className="mx-auto mt-1 max-w-sm text-xs text-white/70 sm:text-[13px]">
                                The match goes on without you{game.online?.fee ? ` — your ₹${game.online.fee} entry stays in the pot` : ''}. Final results show here when it ends.
                            </p>
                            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-400/30">
                                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" /></span>
                                LIVE{view?.total ? ` · ${view.number > 0 ? `round ${view.number} of ${view.total}` : 'starting'}` : ''}
                            </span>
                        </div>

                        {/* The podium. */}
                        {stage.length > 0 && (
                            <div className="relative mt-5 flex items-end justify-center gap-1.5 sm:gap-2.5" data-podium>
                                {stage.map((r) => {
                                    const place = podium.indexOf(r);
                                    const m = METAL[place];
                                    return (
                                        <div key={r.i} className="flex w-[30%] max-w-[7.5rem] min-w-0 flex-col items-center" style={{ animation: `lg-rise .6s cubic-bezier(.2,1.2,.4,1) ${0.15 + (2 - place) * 0.15}s both` }} data-podium-seat={r.i}>
                                            {place === 0 && <span aria-hidden="true" className="mb-0.5 text-xl drop-shadow-[0_3px_4px_rgba(0,0,0,.4)]">👑</span>}
                                            <span className="relative rounded-full p-1" style={{ background: `conic-gradient(${m.ring}, #fff8, ${m.ring})` }}><Pic r={r} size={place === 0 ? 'h-11 w-11 text-base' : 'h-9 w-9 text-sm'} /></span>
                                            <span className="mt-1 max-w-full truncate text-xs font-black sm:text-[13px]">{r.name}</span>
                                            <span className="text-base leading-none font-black tabular-nums text-amber-200 [text-shadow:0_2px_0_rgba(0,0,0,.4)]">{r.score}<span className="ml-1 text-[10px] text-white/50">PTS</span></span>
                                            {/* The block: a lit top, a shaded front. */}
                                            <div className="relative mt-2 w-full">
                                                <span aria-hidden="true" className="block h-2 w-full" style={{ background: m.lid, clipPath: 'polygon(7% 0, 93% 0, 100% 100%, 0 100%)' }} />
                                                <div className={`relative flex ${m.h} w-full items-start justify-center overflow-hidden bg-gradient-to-b ${m.face} pt-1.5 shadow-[inset_8px_0_12px_rgba(255,255,255,.25),inset_-10px_0_14px_rgba(0,0,0,.3)]`}>
                                                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/3 bg-white/25" style={{ animation: 'lg-shine 3.5s ease-in-out infinite' }} />
                                                    <span className="relative text-2xl font-black text-white/90 [text-shadow:0_2px_0_rgba(0,0,0,.3)] sm:text-3xl">{place + 1}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        <span aria-hidden="true" className="relative mx-auto -mt-2 block h-5 w-4/5 rounded-[100%] bg-black/50 blur-md" />

                        {/* Everyone else: raised tiles; you, out. */}
                        {rest.length > 0 && (
                            <ol className="relative mt-3 space-y-2">
                                {rest.map((r) => (
                                    <li key={r.i} className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2 ${r.out ? 'bg-gradient-to-b from-slate-600/40 to-slate-800/60 shadow-[0_5px_0_rgba(15,23,42,.8)]' : 'bg-gradient-to-b from-indigo-500/40 to-indigo-800/60 shadow-[0_5px_0_rgba(30,27,75,.9)]'} ring-1 ring-white/10`} data-left-row={r.i}>
                                        <span className={`text-sm font-black ${r.out ? 'text-rose-300' : 'text-white/70'}`}>{r.out ? 'OUT' : `#${rows.indexOf(r) + 1}`}</span>
                                        <span className={r.out ? 'opacity-50 grayscale' : ''}><Pic r={r} size="h-8 w-8 text-xs" /></span>
                                        <span className="min-w-0 flex-1">
                                            <span className={`block truncate text-sm font-black ${r.out ? 'text-white/60' : ''}`}>{r.name}{game.you === r.i && <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-black">YOU</span>}</span>
                                            {!r.out && <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-black/30"><span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${(r.score / top) * 100}%`, background: r.color }} /></span>}
                                            {r.out && <span className="block text-[11px] font-bold text-white/40">Left the match</span>}
                                        </span>
                                        <span className={`text-base font-black tabular-nums ${r.out ? 'text-white/40' : ''}`}>{r.score}</span>
                                    </li>
                                ))}
                            </ol>
                        )}

                        <Link to={GROUP_HOME} className="relative mt-5 flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#4ade80] to-[#16a34a] text-sm font-black tracking-wide uppercase [text-shadow:0_2px_0_rgba(0,0,0,.25)] shadow-[0_7px_0_#14532d,0_14px_28px_rgba(22,163,74,.45),inset_0_2px_0_rgba(255,255,255,.4)] transition-[transform,box-shadow] duration-100 hover:brightness-110 active:translate-y-[5px] active:shadow-[0_2px_0_#14532d,0_6px_12px_rgba(22,163,74,.4),inset_0_2px_0_rgba(255,255,255,.4)]">
                            Find a new match
                        </Link>
                    </section>
                );
            })()}

            {view && Table && !leftGame && !(room && game.status === 'finished' && ['memorymatrix', 'sequence'].includes(game.game)) && (
                <Table view={{ ...view, you: game.you, avatars: game.avatars, liveBoard }} onAction={onAction} busy={!!busy || game.status !== 'active'} recapOnly={room && game.status === 'finished'} />
            )}

            {error && <p role="alert" className="sticky bottom-24 z-10 mx-auto max-w-xl rounded-xl bg-rose-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-lg sidebar:bottom-6">{error}</p>}
        </div>
    );
}
