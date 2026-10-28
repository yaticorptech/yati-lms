/**
 * Competitions — the section's home (it was "Games & Competitions" until
 * 2026-10-23, when the menu got a section of its own for Games, the brain
 * games), in six tabs:
 *
 *   Games          Chess and the brain games (Rapid Fire, Code Clash,
 *                  Brain Sprint), a Quiz and a Hackathon (added 2026-10-23),
 *                  each leading to its competitions, and Join with a code:
 *                  a player's own joining code opens their match or Quiz Arena
 *                  (playing with friends, and UNO, were removed on 2026-10-23;
 *                  Ludo and Carrom gave way to the brain games on 2026-10-24)
 *   Competitions   inter-college competitions, filtered by game: open,
 *                  closing soon, upcoming, live
 *   My Games       the competitions my college entered me in, and my matches:
 *                  Registered · Upcoming · Live · Completed
 *   Leaderboard    College · Team · Individual
 *   Results        every finished competition: winner, runner-up, third place
 *   History        my own past competitions: where my team finished, its
 *                  record, and my certificate
 *
 * The tab lives in the address (?tab=) so a link can open the right one.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import useLive from '../live/useLive';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Gamepad2, Trophy, UserCheck, BarChart3, History, Users, UsersRound, Crown, CalendarClock, Building2, Loader2,
    ArrowRight, Award, Download, Medal, Clock, Gift, Search, ChevronRight, Link2, Ticket, Landmark, CalendarDays, Radio, ClipboardList, CheckCircle2, Lock, X, Brain, Code2
} from 'lucide-react';
import useRowsShown from './useRowsShown';
import { competitionsApi, GAMES, GAME_BUTTON, PHASE, ORDINAL, fmtDateTime, fmtDate, gameImage, gameIcon } from './api';
import { StatusChip, GameChip, MatchCard, Empty } from './parts';
import { arenaApi } from './arena/api';
import PriceTag from '../components/rewards/PriceTag';
import CertificateView from './CertificateView';
import { CardGridSkeleton, ListSkeleton } from './Skeletons';

const TABS = [
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'mine', label: 'My Games', icon: UserCheck },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'results', label: 'Results', icon: Medal },
    { id: 'history', label: 'History', icon: History }
];

/**
 * Load on mount; `reload` to fetch again. Live: loaded again whenever the
 * server says competitions, Quiz Arena or the leaderboard changed (useLive),
 * keeping what is on screen until the new figures arrive.
 */
const LIVE_TOPICS = ['competitions', 'arena', 'leaderboard'];
const useLoad = (fn) => {
    const [state, setState] = useState({ data: null, error: '' });
    const [n, setN] = useState(0);
    useEffect(() => {
        let alive = true;
        fn().then((data) => { if (alive) setState({ data, error: '' }); })
            .catch((e) => { if (alive) setState((s) => (s.data ? s : { data: null, error: e.message })); });
        return () => { alive = false; };
    }, [fn, n]);
    const reload = useCallback(() => setN((x) => x + 1), []);
    useLive(LIVE_TOPICS, reload);
    return { ...state, reload };
};

const Box = ({ children, className = '' }) => <section className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
const Heading = ({ icon: Icon, children, aside }) => (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900 sm:text-lg"><Icon size={18} className="text-indigo-600" aria-hidden="true" /> {children}</h2>
        {aside}
    </div>
);
const Failed = ({ error, onRetry }) => (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error} <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Try again</button>
    </div>
);
/** While a tab loads: its cards' outline, or a list's. */
const Loading = ({ list = false }) => (list ? <ListSkeleton /> : <CardGridSkeleton />);

/* ── Games ───────────────────────────────────────────────────────────── */

/**
 * One game's card: its picture (with the players badge drawn in), then the
 * icon, title, details, a two-line description and the same purple
 * "See competitions" button on every card. Cards in a row line up: the
 * description keeps two lines' room and the button sits at the bottom.
 * A picture that fails to load gives way to the game's colour and a badge.
 * A quiz and a hackathon have no photo: `art`, their icon, is drawn instead.
 */
const GameCard = ({ id, label, image, icon, art: Art = null, meta, blurb, tone, onOpen }) => {
    const [broken, setBroken] = useState(false);
    return (
        <article data-game={id} className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_2px_10px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(59,49,196,0.14)] motion-reduce:hover:translate-y-0">
            <div className={`relative w-full overflow-hidden bg-gradient-to-br ${tone}`}>
                {Art ? (
                    <span aria-hidden="true" className="relative block pb-[37%]">
                        <Art className="absolute left-[8%] top-1/2 h-[60%] w-auto -translate-y-1/2 text-white/90 drop-shadow-lg" strokeWidth={1.6} />
                        <Art className="absolute -bottom-6 right-[18%] h-[90%] w-auto rotate-12 text-white/10" strokeWidth={1.2} />
                    </span>
                ) : broken
                    ? <span aria-hidden="true" className="block pb-[37%]" />
                    : <img src={image} alt="" loading="lazy" onError={() => setBroken(true)} className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100" />}
            </div>
            <div className="flex flex-1 flex-col p-3.5">
                <div className="flex items-center gap-3">
                    {Art
                        ? <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${tone}`}><Art size={20} /></span>
                        : <img src={icon} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover shadow-sm" />}
                    <div className="min-w-0">
                        <h3 className="text-base font-black leading-tight text-[#1e1b4b]">{label}</h3>
                        <p className="truncate text-xs font-semibold text-indigo-600">{meta}</p>
                    </div>
                </div>
                <p className="mt-2 line-clamp-2 min-h-[2.5rem] flex-1 text-[13px] leading-snug text-slate-600">{blurb}</p>
                <button type="button" onClick={onOpen} data-see-competitions={id}
                    className={`after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] mt-3 flex min-h-10 w-full items-center justify-between rounded-xl px-4 text-sm font-bold text-white shadow-md transition-colors ${GAME_BUTTON}`}>
                    <span className="inline-flex items-center gap-2.5"><Trophy size={16} aria-hidden="true" /> See competitions</span>
                    <ChevronRight size={16} aria-hidden="true" />
                </button>
            </div>
        </article>
    );
};

/** Quiz Arena's card, opening Quiz Arena (its own pages, competitions/arena/), or its next contest. */
const QuizArenaCard = () => {
    const navigate = useNavigate();
    const [next, setNext] = useState(null);
    const load = useCallback(() => {
        arenaApi.list().then((rows) => {
            const order = ['live', 'registration', 'upcoming'];
            setNext(rows.filter((c) => order.includes(c.state)).sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state))[0] || null);
        }).catch(() => {});
    }, []);
    useEffect(() => { load(); }, [load]);
    useLive('arena', load);
    return (
        <GameCard id="quizarena" label="Quiz Arena" image="/games/quizarena-card.jpg?v=2" icon="/games/quizarena-icon.png" tone="from-indigo-600 to-fuchsia-700"
            players="Individual" meta="Everyone at once · 25 questions · 15 s each"
            blurb={next
                ? `${next.state === 'live' ? 'Live now' : next.state === 'registration' ? 'Entries open' : 'Starting soon'}: ${next.title} · ${fmtDateTime(next.startsAt)}${next.entryStatus === 'approved' ? ' · you are in' : ''}`
                : 'Live Quiz Battle, Picture Challenge and Current Affairs Clash. Your college enters you.'}
            onOpen={() => navigate('?tab=competitions&game=quizarena')} />
    );
};

// Search: a game's name, or words about it.
const ARENA_SEARCH = 'quiz arena general knowledge gk current affairs picture challenge live quiz battle';
const matches = (text, q) => !q || q.split(/\s+/).every((w) => text.toLowerCase().includes(w));

const GamesTab = () => {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    // A player types their competition match's code: straight into the match.
    const join = (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        competitionsApi.joinMatch(code).then((r) => navigate(r.arena ? `/competitions/arena/${r.arena.id}/play` : `/competitions/play/${r.game.id}`))
            .catch((err) => setError(err.message)).finally(() => setBusy(false));
    };
    // A game's competitions: the Competitions tab, filtered to it.
    const competitionsOf = (game) => navigate(game ? `?tab=competitions&game=${game}` : '?tab=competitions');
    const term = q.trim().toLowerCase();
    const games = Object.entries(GAMES).filter(([, g]) => matches(`${g.label} ${g.keywords || ''} ${g.blurb}`, term));
    const showArena = matches(ARENA_SEARCH, term);
    const names = [...Object.values(GAMES).map((g) => g.label), 'Quiz Arena'];

    return (
        <div className="flex flex-col gap-3">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-black text-slate-900"><span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-indigo-600" /> Available Games</h2>
                <label className="relative block w-full sm:w-64">
                    <span className="sr-only">Search games</span>
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games..." type="search"
                        className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </label>
            </div>

            {games.length === 0 && !showArena && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No game called “{q.trim()}”. We have {names.slice(0, -1).join(', ')} and {names[names.length - 1]}.</p>}
            {/* Chess, then the brain games. Each card's picture keeps one shape
                (a share of the card's width), so Chess's photo, with its pill
                painted where the real pill sits, looks as it always has. */}
            <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
                {games.map(([id, g]) => (
                    <GameCard key={id} id={id} label={g.label} art={ART[g.art] || null} image={gameImage(id)} icon={gameIcon(id)} tone={g.tone}
                        players={g.players.replace('players', 'Players')} meta={g.format ? `${g.players} · ${g.format}` : g.players} blurb={g.blurb}
                        onOpen={() => competitionsOf(id)} />
                ))}
                {/* Quiz Arena: the three-round live quiz, played alone, everyone at once. */}
                {showArena && <QuizArenaCard />}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr]">
                {/* A competition match's code, from My Games or the coordinator. */}
                <section className="relative flex flex-col justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-violet-50 via-indigo-50/70 to-fuchsia-50/60 p-3.5 ring-1 ring-violet-100" data-join-code>
                    <UsersRound size={48} aria-hidden="true" className="pointer-events-none absolute right-5 top-3 text-indigo-200/60" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-violet-100/60" />
                    <div className="relative">
                        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Link2 size={18} className="text-indigo-600" aria-hidden="true" /> Join with a code</h2>
                        <p className="mt-0.5 text-xs text-slate-600">When your match or Quiz Arena starts you get your own 6-character joining code — in a pop-up, your notifications and My Games. Only your own code lets you in.</p>
                        <form onSubmit={join} className="mt-2.5 flex flex-wrap gap-2.5">
                            <label className="relative min-w-0 flex-1 basis-48">
                                <span className="sr-only">Match code</span>
                                <Ticket size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    placeholder="Enter code (e.g. K7Q2XM)" inputMode="text" autoCapitalize="characters"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 font-mono text-[15px] tracking-[0.25em] text-slate-900 shadow-sm placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                            </label>
                            <button type="submit" disabled={code.length !== 6 || busy}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50">
                                {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null} Join Match <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </form>
                        {error && <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                    </div>
                </section>

                {/* How the games are played now: in competitions, for a college. */}
                <section className="flex flex-col justify-center rounded-[18px] bg-white p-3.5 shadow-sm ring-1 ring-slate-100" data-how-to-play>
                    <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Building2 size={18} className="text-indigo-600" aria-hidden="true" /> Play for your college</h2>
                    <p className="mt-0.5 max-w-xl text-xs text-slate-600">The games are played in competitions. Your college enters you in a team; your matches appear in My Games when they are drawn.</p>
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                        <button type="button" onClick={() => competitionsOf(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700">
                            <Trophy size={15} aria-hidden="true" /> See competitions <ChevronRight size={16} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => navigate('?tab=mine')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50">
                            <UserCheck size={15} aria-hidden="true" /> My Games
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};

/* ── Competitions ─────────────────────────────────────────────────────── */

/** One competition at a glance: what, who, how many, when, and the way in. */
/*
 * The Competitions tab's look (the account owner's design, 2026-10-24): cream
 * and gold. Its pictures and icons are in public/competitions/, cut from that
 * design (and, for the games other than chess, from their Games-tab cards).
 */
/** The Competitions tab's indigo-and-violet look. */
const GOLD = { ink: '#0f0d2e', gold: '#b9a8ff', icon: '#3b32c4', chip: '#ebe8ff', chipText: '#3b2fc0', bar: '#4f46e5', button: 'bg-gradient-to-r from-[#3326b8] to-[#4838da] hover:from-[#2c20a3] hover:to-[#3f30c8]' };
const cardImage = (game) => `/competitions/card-${game}.jpg?v=2`; // v2: the chess photo without its painted badge
const chipIcon = (game) => `/competitions/chip-${game}.png`;
/** A game's small badge: its picture, or for a quiz and a hackathon (no picture) its icon. */
const ChipIcon = ({ game, className }) => {
    const Art = ART[game];
    return Art ? <Art className={className} aria-hidden="true" /> : <img src={chipIcon(game)} alt="" className={`${className} object-contain`} />;
};

/**
 * A competition as a card: its picture with its status and its game's badge,
 * the game, the name and organizer, colleges, players and date, and View.
 * Shared by the inter-college competitions and Quiz Arena.
 */
const GoldCard = ({ game, gameLabel, bannerUrl, status, closed = false, live = false, name, organizedBy, stats, extra, to, linkData }) => {
    const [broken, setBroken] = useState(false);
    return (
        <article {...linkData} className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_10px_30px_rgba(59,47,192,0.10)] ring-1 ring-[#e4e1fb] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(59,47,192,0.18)] motion-reduce:hover:translate-y-0">
            <div className="relative w-full overflow-hidden bg-[#16123f]">
                <span aria-hidden="true" className="block pb-[36%]" />
                {!bannerUrl && ART[game] ? (
                    <span aria-hidden="true" className={`absolute inset-0 flex items-center bg-gradient-to-br pl-[8%] ${GAMES[game].tone}`}>{(() => { const Art = ART[game]; return <Art className="h-[60%] w-auto text-white/90 drop-shadow-lg" strokeWidth={1.6} />; })()}</span>
                ) : !broken && <img src={bannerUrl || cardImage(game)} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />}
                {status !== PHASE.completed.label && status !== 'Completed' && (
                    <span className={`absolute left-3 top-3 inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold sm:min-h-8 sm:px-3.5 sm:text-sm text-white shadow-md ${live ? 'bg-[#3b2fc0]' : closed ? 'bg-slate-700/90' : 'bg-[#3b2fc0]'}`} data-phase>
                        {live ? <Radio size={17} aria-hidden="true" /> : <CalendarDays size={17} aria-hidden="true" />} {status}
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold" style={{ background: GOLD.chip, color: GOLD.chipText }}>
                    <ChipIcon game={game} className="h-4 w-4" /> {gameLabel}
                </span>
                <h3 className="mt-2 text-lg font-black leading-snug sm:text-xl" style={{ color: GOLD.ink }}>{name}</h3>
                <p className="truncate text-sm text-slate-500 sm:text-[15px]">Organized by {organizedBy}</p>
                <dl className="mt-3 grid grid-cols-3 divide-x divide-[#e6e3f8] sm:mt-4">
                    {stats.map(([Icon, value, label]) => (
                        <div key={label} className="flex min-w-0 items-center gap-1.5 px-2 first:pl-0 last:pr-0">
                            <Icon size={22} strokeWidth={1.7} style={{ color: GOLD.icon }} aria-hidden="true" className="shrink-0" />
                            <div className="min-w-0"><dd className="truncate text-sm font-bold leading-tight" style={{ color: GOLD.ink }}>{value}</dd><dt className="truncate text-xs leading-tight text-slate-500">{label}</dt></div>
                        </div>
                    ))}
                </dl>
                {extra}
                <span aria-hidden="true" className="block h-4 shrink-0 sm:h-5" />
                <Link to={to} className={`after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-bold sm:min-h-12 sm:text-base text-white shadow-[0_8px_18px_rgba(51,38,184,0.3)] transition-colors ${GOLD.button}`}>
                    View Competition <ArrowRight size={17} aria-hidden="true" />
                </Link>
            </div>
        </article>
    );
};

const dateOnly = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'TBA');
const timeOnly = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

export const CompetitionCard = ({ c }) => (
    <GoldCard game={c.game} gameLabel={c.gameLabel} bannerUrl={c.bannerUrl} status={c.status === 'cancelled' ? 'Closed' : c.phase === 'upcoming' ? 'Registration closed' : PHASE[c.phase]?.label || c.phase} closed={c.status === 'cancelled' || c.phase === 'expired'} live={c.phase === 'live'}
        name={c.name} organizedBy={c.organizedBy} to={`/competitions/${c.id}`} linkData={{ 'data-competition': c.id }}
        stats={c.entry === 'individual'
            // Students on their own (a quiz or a hackathon): how many have signed up, when it opens and closes.
            ? [[Users, c.teamsCount, c.teamsCount === 1 ? 'Student' : 'Students'], [CalendarDays, dateOnly(c.startsAt), c.kind === 'quiz' ? 'Opens' : 'Starts'], [Clock, dateOnly(c.endsAt), c.kind === 'quiz' ? 'Closes' : 'Due']]
            : [
                [Landmark, c.teamsCount, c.hostOrganizationId ? (c.teamsCount === 1 ? 'Team' : 'Teams') : c.teamsCount === 1 ? 'College' : 'Colleges'],
                [Users, c.playersCount || 0, c.playersCount === 1 ? 'Player' : 'Players'],
                c.endsAt ? [Clock, dateOnly(c.endsAt), c.kind === 'quiz' ? 'Closes' : 'Due'] : [CalendarDays, dateOnly(c.startsAt), timeOnly(c.startsAt)]
            ]}
        extra={(c.myTeam || ['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase)) && (
            <p className="mt-3 space-x-3 text-[13px] text-slate-600">
                {['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && <span>Register by <b className="font-semibold">{fmtDateTime(c.registrationDeadline)}</b></span>}
                {c.myTeam && <span className="font-bold" style={{ color: GOLD.chipText }}>{c.myTeam.solo ? 'You are signed up' : `Your team: ${c.myTeam.teamName}`}</span>}
            </p>
        )} />
);

/** A Quiz Arena contest, in the same card. */
const ArenaGoldCard = ({ c }) => (
    <GoldCard game="quizarena" gameLabel="Quiz Arena" live={c.state === 'live'} bannerUrl={c.bannerUrl} status={{ live: 'Live', registration: 'Registration Open', upcoming: 'Registration closed', ended: 'Results coming', results: 'Completed', cancelled: 'Closed' }[c.state] || 'Upcoming'} closed={c.state === 'cancelled'}
        name={c.title} organizedBy={c.organizedBy} to={`/competitions/arena/${c.id}`} linkData={{ 'data-arena': c.id }}
        stats={[
            [Landmark, c.questions, 'Questions'],
            [Users, c.registeredCount || 0, c.registeredCount === 1 ? 'Player' : 'Players'],
            [CalendarDays, dateOnly(c.startsAt), timeOnly(c.startsAt)]
        ]} />
);

/**
 * On a phone a row of choices scrolls sideways. Whichever one is chosen, the
 * row slides on its own to show it and the whole of the next one — so the
 * next choice is always there to tap, and nobody has to drag the row to find
 * it. (Centring the chosen one left a wide next tab half cut off.) The row
 * must be `relative`, so its buttons' offsetLeft is measured from it.
 */
const useChosenInView = (rowRef, chosen, selector) => {
    useEffect(() => {
        const row = rowRef.current;
        const current = row?.querySelector(selector);
        if (!row || !current || row.scrollWidth <= row.clientWidth) return;
        const next = current.nextElementSibling;
        const GAP = 8;
        // The first option goes back to the start, with whatever leads the row
        // (the tab bar's gamepad tile) in view again.
        const first = !current.previousElementSibling?.matches('button');
        // Otherwise the next one's right edge in view, but never past the chosen one's left.
        const edge = next ? next.offsetLeft + next.offsetWidth : current.offsetLeft + current.offsetWidth;
        const left = first ? 0 : Math.min(edge - row.clientWidth + GAP, current.offsetLeft - GAP);
        row.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }, [rowRef, chosen, selector]);
};

const CompetitionsTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const [params, setParams] = useSearchParams();
    // A game picked on the Games tab ("See competitions") narrows the list; ✕ clears it.
    const game = GAMES[params.get('game')] || params.get('game') === 'quizarena' ? params.get('game') : 'all';
    const [view, setView] = useState(null);
    const filtersRef = useRef(null);
    useChosenInView(filtersRef, view, '[aria-pressed="true"]');
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    const list = game === 'quizarena' ? [] : data.competitions.filter((c) => game === 'all' || c.game === game);
    const arenas = (game === 'all' || game === 'quizarena') ? (arena.data || []) : [];
    // Live: on now. Registration: everything not yet started — entries open,
    // opening soon, or closed and waiting for the start. Completed: over.
    // Closed: shut for good — cancelled by the organizer, or its date passed
    // without it ever starting.
    const VIEWS = [
        ['live', 'Live', Radio, list.filter((c) => c.status === 'live'), arenas.filter((c) => c.state === 'live')],
        ['registration', 'Registration', ClipboardList, list.filter((c) => ['registration', 'closed'].includes(c.status) && c.phase !== 'expired'), arenas.filter((c) => ['registration', 'upcoming'].includes(c.state))],
        ['completed', 'Completed', CheckCircle2, list.filter((c) => c.status === 'completed'), arenas.filter((c) => ['ended', 'results'].includes(c.state))],
        ['closed', 'Closed', Lock, list.filter((c) => c.status === 'cancelled' || c.phase === 'expired'), arenas.filter((c) => c.state === 'cancelled')]
    ];
    const current = view || VIEWS.find(([, , , rows, ar]) => rows.length + ar.length)?.[0] || 'live';
    const [, label, , rows, ars] = VIEWS.find(([k]) => k === current);
    const clearGame = () => { const next = new URLSearchParams(params); next.delete('game'); setParams(next, { replace: true }); };
    return (
        <div className="space-y-3 sm:space-y-6">
            {/* Live, Registration, Completed, Closed. */}
            <div ref={filtersRef} className="relative flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-[#e6e3f8] sm:gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Show competitions">
                {VIEWS.map(([k, text, Icon, r, a]) => {
                    const on = current === k;
                    const n = r.length + a.length;
                    return (
                        <button key={k} type="button" onClick={() => setView(k)} aria-pressed={on} data-view={k}
                            className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition-colors sm:gap-2.5 sm:px-4 ${on ? 'bg-[#dedafb] text-[#3b2fc0] shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#3b2fc0]'}`}>
                            <Icon size={20} aria-hidden="true" className="shrink-0" /> {text}
                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${on ? 'bg-white text-[#3b2fc0]' : 'bg-slate-100 text-slate-500'}`}>{n}</span>
                        </button>
                    );
                })}
                {game !== 'all' && (
                    <button type="button" onClick={clearGame} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#ebe8ff] px-3.5 text-sm font-semibold text-[#3b2fc0] hover:bg-[#ddd8ff]" aria-label="Show every game">
                        <ChipIcon game={game} className="h-5 w-5" /> {GAMES[game]?.label || 'Quiz Arena'} <X size={14} aria-hidden="true" />
                    </button>
                )}
            </div>
            {!rows.length && !ars.length ? (
                <Empty icon={Trophy} title={`No ${label.toLowerCase()} competitions${game === 'all' ? '' : ` for ${GAMES[game]?.label || 'Quiz Arena'}`}`}>
                    {current === 'live' ? 'Competitions appear here while their matches are being played.' : current === 'registration' ? 'Competitions taking registrations, or waiting to start, appear here.' : current === 'completed' ? 'Finished competitions appear here.' : 'Competitions closed for good by the organizer appear here.'}
                </Empty>
            ) : (
                <div data-view-list={current}>
                    <h3 className="mb-3 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-600 sm:mb-4 sm:gap-3 sm:text-sm sm:tracking-[0.3em]"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${current === 'closed' ? 'bg-slate-400' : 'bg-[#4f46e5]'}`} /> {current === 'live' ? 'Live now' : label}</h3>
                    {/* Three to a row on a wide screen. */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
                        {ars.map((c) => <ArenaGoldCard key={`a-${c.id}`} c={c} />)}
                        {rows.map((c) => <CompetitionCard key={c.id} c={c} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── My games ─────────────────────────────────────────────────────────── */

const MatchList = ({ rows, empty }) => (rows.length
    ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((m) => <MatchCard key={m.id} match={m} playing={m.playing} myTeamId={m.myTeamId} showCompetition />)}</div>
    : <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{empty}</p>);

const MINE_TABS = [['registered', 'Registered'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed']];

const MineTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.me);
    const [sub, setSub] = useState(null);
    // Open on Live when a match is on now: that is what the student came for.
    const active = sub || (data?.live?.length ? 'live' : 'registered');
    // On a phone the four tabs scroll sideways, as the game filters do: the
    // chosen one and the next one slide into view.
    const tabsRef = useRef(null);
    useChosenInView(tabsRef, active, '[aria-selected="true"]');
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading list />;
    if (!data.competitions.length) {
        return <Empty icon={UserCheck} title="You are not in a competition yet">When your college's coordinator puts you in a team, your competitions and matches appear here.</Empty>;
    }
    const counts = { registered: data.competitions.length, upcoming: data.upcoming.length, live: data.live.length, completed: data.completed.length };
    return (
        <div className="space-y-4">
            <div ref={tabsRef} className="relative flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="My games">
                {MINE_TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={active === id} onClick={() => setSub(id)}
                        className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition-colors ${active === id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-indigo-700'}`}>
                        {id === 'live' && counts.live > 0 && <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" aria-hidden="true" />}
                        {label} <span className={`rounded-full px-1.5 text-[11px] ${active === id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{counts[id]}</span>
                    </button>
                ))}
            </div>
            {active === 'registered' && (
                <Box>
                    <ul className="divide-y divide-slate-100">
                        {data.competitions.map((c) => (
                            <li key={c.id} className="flex items-start gap-3 py-3">
                                <span className="text-2xl leading-none" aria-hidden="true">{c.emoji}</span>
                                {/* The chip sits beside the name only, and the
                                    details run the full width under both. Beside
                                    the whole block, on a phone, the chip squeezed
                                    the name to "Inter c…" and the details to a
                                    column two words wide. */}
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-start justify-between gap-2">
                                        <Link to={`/competitions/${c.id}`} className="-my-2 min-w-0 break-words py-2 text-sm font-bold text-slate-900 hover:text-indigo-700">{c.name}</Link>
                                        <span className="shrink-0"><StatusChip status={c.status} phase={c.phase} /></span>
                                    </span>
                                    <span className="mt-0.5 block text-xs text-slate-500">Team: {c.myTeam?.teamName} · {c.myTeam?.status === 'approved' ? 'Approved' : 'Pending approval'} · {fmtDateTime(c.startsAt)}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </Box>
            )}
            {active === 'upcoming' && <MatchList rows={data.upcoming} empty="No matches coming up yet. They appear once the organizer draws them." />}
            {active === 'live' && <MatchList rows={data.live} empty="No match is live right now." />}
            {active === 'completed' && <MatchList rows={data.completed} empty="None played yet." />}
        </div>
    );
};

/* ── Leaderboard ──────────────────────────────────────────────────────── */

const BOARDS = [
    { id: 'colleges', label: 'College', icon: Building2 },
    { id: 'teams', label: 'Team', icon: Users },
    { id: 'players', label: 'Individual', icon: UserCheck }
];
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

/** Rankings shown before the list scrolls (the user's choice, 2026-10-14). */
const RANKS_SHOWN = 2;
const RANK_NOUN = { colleges: ['college', 'colleges'], teams: ['team', 'teams'], players: ['player', 'players'] };

const LeaderboardTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.leaderboard);
    const [board, setBoard] = useState('colleges');
    const listRef = useRef(null);
    const rows = data?.[board] || [];
    // The top two show; the rest scroll inside the list, like the Final standings.
    const more = useRowsShown(listRef, RANKS_SHOWN, rows.length, { key: board });
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading list />;
    const label = (r) => (board === 'colleges' ? r.collegeName : board === 'teams' ? r.teamName : r.name);
    const sub = (r) => (board === 'colleges' ? `${r.competitions} competition${r.competitions === 1 ? '' : 's'}` : board === 'teams' ? `${r.collegeName} · ${r.competition}` : r.collegeName);
    return (
        <Box>
            {/* One line on a phone: the three share the row (they wrapped
                Individual onto a second line), and below 380px the icons go so
                the words fit. From sm up, each is as wide as its words. */}
            <div className="mb-4 flex gap-1 sm:gap-2" role="tablist" aria-label="Ranking">
                {BOARDS.map((b) => (
                    <button key={b.id} type="button" role="tab" aria-selected={board === b.id} onClick={() => setBoard(b.id)}
                        className={`inline-flex min-h-9 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2 text-[13px] font-bold transition-colors sm:flex-none sm:px-3.5 sm:text-sm ${board === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <b.icon size={15} aria-hidden="true" className="hidden shrink-0 min-[380px]:block" /> {b.label}
                    </button>
                ))}
            </div>
            {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No results yet. Rankings fill in as matches are played.</p> : (
                <ol ref={listRef} className={`divide-y divide-slate-100 ${more ? 'overflow-y-auto overscroll-contain' : ''}`} data-ranking={board}>
                    {rows.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 py-2.5">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-black tabular-nums ${MEDAL[r.rank] ? 'text-xl' : 'bg-slate-100 text-sm text-slate-600'}`}>{MEDAL[r.rank] || r.rank}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-slate-900">{label(r)}</span>
                                <span className="block truncate text-xs text-slate-500">{sub(r)}</span>
                            </span>
                            <span className="hidden text-right text-xs text-slate-500 sm:block">{r.won} won · {r.played} played{r.titles ? ` · ${r.titles} 🏆` : ''}{r.place ? ` · ${ORDINAL[r.place]}` : ''}</span>
                            <span className="text-right text-sm font-black tabular-nums text-slate-900">{r.points} <span className="text-[11px] font-semibold text-slate-400">Points</span></span>
                        </li>
                    ))}
                </ol>
            )}
            {more && <p data-ranking-more className="mt-2 text-xs text-slate-500">Showing {RANKS_SHOWN} of {rows.length} {RANK_NOUN[board][1]}. Scroll the list to see the rest.</p>}
        </Box>
    );
};

/* ── Results ──────────────────────────────────────────────────────────── */

const PLACE_LINE = [[1, '🥇 Winner'], [2, '🥈 Runner-up'], [3, '🥉 Third place']];

/** A Quiz Arena whose results are out: its top three, and where I finished. */
const ArenaResultCard = ({ c }) => {
    const me = c.myResult;
    return (
        <Box className="relative h-full cursor-pointer transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_14px_32px_rgba(59,49,196,0.14)] motion-reduce:hover:translate-y-0">
            <div data-arena-result={c.id} className="space-y-3">
                <div>
                    <p className="font-black text-slate-900">🏆 {c.title}</p>
                    <p className="text-xs text-slate-500">🧠 Quiz Arena · results {fmtDate(c.resultsPublishedAt)}</p>
                </div>
                {me?.rank != null && (
                    <p className={`rounded-xl px-3 py-2 text-sm font-black ${me.rank <= 3 ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200' : 'bg-indigo-50 text-indigo-800'}`} data-my-place>
                        {me.rank <= 3 ? `🏆 You won ${ORDINAL[me.rank]} place!` : `You finished #${me.rank}`} · {me.score} points
                    </p>
                )}
                <dl className="space-y-1.5">
                    {(c.winners || []).map((w) => (
                        <div key={w.place} className="flex items-baseline gap-2 text-sm">
                            <dt className="w-32 shrink-0 font-semibold text-slate-500">{PLACE_LINE.find(([p]) => p === w.place)?.[1]}</dt>
                            <dd className="min-w-0 truncate font-bold text-slate-900">{w.name} <span className="font-normal text-slate-500">· {w.collegeName} · {w.score} pts</span></dd>
                        </div>
                    ))}
                </dl>
                <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/competitions/arena/${c.id}`} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                        View Full Results <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </Box>
    );
};

const ResultsTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.history);
    const arena = useLoad(arenaApi.list);
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    const arenas = (arena.data || []).filter((c) => c.state === 'results');
    if (!data.competitions.length && !arenas.length) return <Empty icon={Medal} title="No results yet">Finished competitions, their winners and match results appear here.</Empty>;
    return (
        // One column on a phone, each card no wider than it: without a set
        // column, a long winner's line widened the card past the screen.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {arenas.map((c) => <ArenaResultCard key={c.id} c={c} />)}
            {data.competitions.map(({ competition: c }) => (
                <Box key={c.id} className="relative h-full cursor-pointer transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_14px_32px_rgba(59,49,196,0.14)] motion-reduce:hover:translate-y-0">
                    <div data-result={c.id} className="space-y-3">
                        <div>
                            <p className="font-black text-slate-900">🏆 {c.name}</p>
                            <p className="text-xs text-slate-500">{c.emoji} {c.gameLabel} · results {fmtDate(c.completedAt)}</p>
                        </div>
                        <dl className="space-y-1.5">
                            {PLACE_LINE.map(([place, label]) => {
                                const w = c.winners.find((x) => x.place === place);
                                if (!w) return null;
                                return (
                                    <div key={place} className="flex items-baseline gap-2 text-sm">
                                        <dt className="w-32 shrink-0 font-semibold text-slate-500">{label}</dt>
                                        <dd className="min-w-0 truncate font-bold text-slate-900">{w.collegeName} <span className="font-normal text-slate-500">· {w.teamName}</span></dd>
                                    </div>
                                );
                            })}
                        </dl>
                        <Link to={`/competitions/${c.id}`} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
                            View Full Results <ArrowRight size={13} aria-hidden="true" />
                        </Link>
                    </div>
                </Box>
            ))}
        </div>
    );
};

/* ── History (mine) ───────────────────────────────────────────────────── */

const HistoryTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.me);
    const arena = useLoad(arenaApi.list);
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading list />;
    // My Quiz Arenas whose results are out.
    const arenas = (arena.data || []).filter((c) => c.state === 'results' && c.myResult?.rank != null);
    if (!data.results.length && !arenas.length) return <Empty icon={History} title="No past competitions yet">Once a competition you played in is over, it is kept here with your position and certificate.</Empty>;
    return (
        <Box>
            <ul className="divide-y divide-slate-100" data-history>
                {arenas.map((c) => (
                    <li key={`arena-${c.id}`} className="flex flex-wrap items-center gap-3 py-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${c.myResult.rank === 1 ? 'bg-amber-100 text-amber-700' : c.myResult.rank <= 3 ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {c.myResult.rank <= 3 ? ORDINAL[c.myResult.rank] : `#${c.myResult.rank}`}
                        </span>
                        <span className="min-w-0 flex-1 basis-56">
                            <Link to={`/competitions/arena/${c.id}`} className="block break-words py-0.5 text-sm font-bold text-slate-900 hover:text-indigo-700">🧠 {c.title}</Link>
                            <span className="block text-xs text-slate-500">Quiz Arena · {c.myResult.collegeName ? `${c.myResult.collegeName} · ` : ''}{c.myResult.rank <= 3 ? `${ORDINAL[c.myResult.rank]} place` : `Rank ${c.myResult.rank}`} · {c.myResult.score} points · {fmtDate(c.resultsPublishedAt)}</span>
                        </span>
                        {c.myResult.certificate && <CertificateView compact load={() => arenaApi.certificate(c.id)} fileName={`Certificate_${c.title.replace(/\s+/g, '_')}.pdf`} />}
                    </li>
                ))}
                {data.results.map((r) => (
                    <li key={r.competition.id} className="flex flex-wrap items-center gap-3 py-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${r.place === 1 ? 'bg-amber-100 text-amber-700' : r.place ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-indigo-600'}`}>
                            {r.place ? ORDINAL[r.place] : <Award size={18} aria-hidden="true" />}
                        </span>
                        {/* A base width: beside Certificate on a small phone the
                            name was cut to "QA Chec…" and the details squeezed to a
                            narrow column; now the button goes under them. */}
                        <span className="min-w-0 flex-1 basis-56">
                            <Link to={`/competitions/${r.competition.id}`} className="block break-words py-0.5 text-sm font-bold text-slate-900 hover:text-indigo-700">{r.competition.emoji} {r.competition.name}</Link>
                            <span className="block text-xs text-slate-500">
                                {r.competition.gameLabel} · {r.collegeName ? `${r.collegeName} · ` : ''}{r.teamName} · {r.place ? `${ORDINAL[r.place]} place` : 'Took part'} · {r.score.won}/{r.score.played} matches won · {fmtDate(r.competition.completedAt)}
                            </span>
                        </span>
                        {r.certificate && <CertificateView compact load={() => competitionsApi.certificate(r.competition.id)} fileName={`Certificate_${r.competition.name.replace(/\s+/g, '_')}.pdf`} />}
                    </li>
                ))}
            </ul>
        </Box>
    );
};

/* ── The page ─────────────────────────────────────────────────────────── */

/** A quiz's or hackathon's picture, drawn (they have no photo): its colours and its sign. */
const ART = { quiz: Brain, hackathon: Code2 };

const HERO_BG = '/illustrations/games-hero-bg.png';
const HERO_ART = '/illustrations/games-hero-art.png';
/** The Competitions tab's banner: cream and gold, the trophy scene on the right. */
const CompetitionsBanner = ({ onPick }) => (
    <header className="relative overflow-hidden rounded-[22px] text-white shadow-[0_14px_36px_rgba(43,31,143,0.28)]" style={{ background: 'linear-gradient(110deg,#2a1d8c 0%,#3424b0 45%,#4433d2 100%)' }} data-competitions-banner>
        {/* The trophy scene: beside the words on a wide screen; on a phone, a
            small picture at the top right, so the banner stays short. */}
        <img src="/competitions/violet-hero-art.png" alt="" aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-28 w-auto object-cover object-left [mask-image:linear-gradient(to_right,transparent,black_30%)] sm:h-36 md:inset-y-0 md:h-full md:max-w-[52%] md:[mask-image:linear-gradient(to_right,transparent,black_18%)]" />
        <div className="relative px-5 py-5 sm:px-11 sm:py-8 md:max-w-[62%]">
            <h1 className="max-w-[60%] text-[1.55rem] font-black leading-tight tracking-tight sm:mt-3 sm:max-w-none sm:text-5xl">Inter-College <span style={{ color: GOLD.gold }}>Competitions</span></h1>
            <p className="mt-2 text-[13px] text-white/90 sm:mt-3 sm:text-[17px]">Chess, rapid-fire rounds, coding clashes and IQ puzzles in inter-college competitions.</p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-0 sm:gap-y-3">
                {[['join', 'Join competitions', 'competitions'], ['college', 'Play for your college', 'mine'], ['board', 'Climb leaderboard', 'leaderboard']].map(([icon, label, to], i) => (
                    <button key={label} type="button" onClick={() => onPick(to)} data-hero-action={to}
                        className={`inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-xs font-semibold text-white ring-1 ring-white/15 hover:text-[#cfc4ff] sm:gap-3 sm:rounded-none sm:bg-transparent sm:py-0 sm:pl-0 sm:pr-7 sm:text-[15px] sm:ring-0 ${i ? 'sm:border-l sm:border-white/20 sm:pl-7' : ''}`}>
                        <img src={`/competitions/violet-pill-${icon}.png`} alt="" className="h-7 w-7 rounded-full sm:h-12 sm:w-12" /> {label}
                    </button>
                ))}
            </div>
        </div>
    </header>
);

// The banner's own words on the tabs that have them (big, without the three buttons).
const TAB_HERO = {
    results: { icon: Medal, kicker: 'Winners · Rankings · Certificates', title: 'Results', text: 'The winners of every finished competition, where you placed, and your certificates.' },
    leaderboard: { icon: BarChart3, kicker: 'Colleges · Teams · Players', title: 'Leaderboard', text: 'Who leads across every competition: colleges, teams and individual players, by points won.' }
};

// The banner's three buttons, each opening its tab.
const HERO_PILLS = [[Trophy, 'Join competitions', 'text-amber-300', 'competitions'], [UsersRound, 'Play for your college', 'text-white', 'mine'], [Crown, 'Climb leaderboard', 'text-amber-300', 'leaderboard']];

const BODIES = { games: GamesTab, competitions: CompetitionsTab, mine: MineTab, leaderboard: LeaderboardTab, results: ResultsTab, history: HistoryTab };

export default function CompetitionsHome() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'games';
    const select = (id) => setParams(id === 'games' ? {} : { tab: id }, { replace: true });
    const Body = BODIES[tab];

    // On a phone the bar scrolls sideways. Whichever tab is chosen, the bar
    // brings it to the middle on its own, so the ones either side — the next
    // section — are in view, and nobody has to drag the bar to find them.
    // The next tab is shown whole: the middle alone can stop a few pixels
    // short, which once left History cut at the edge of a 344px phone. The first tab keeps the bar at its start.
    const barRef = useRef(null);
    useEffect(() => {
        const bar = barRef.current;
        const current = bar?.querySelector('[aria-current="page"]');
        if (!bar || !current || bar.scrollWidth <= bar.clientWidth) return;
        const pad = parseFloat(getComputedStyle(bar).paddingRight) || 0;
        const middle = current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2;
        const next = current.nextElementSibling;
        const nextWhole = next ? next.offsetLeft + next.offsetWidth + pad - bar.clientWidth : middle;
        const first = current.previousElementSibling?.tagName !== 'BUTTON';
        // Never so far that the chosen tab's own start goes off the left.
        const left = first ? 0 : Math.min(Math.max(middle, nextWhole), current.offsetLeft - pad);
        bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }, [tab]);

    // On the Competitions tab the whole page, edge to edge and top to bottom,
    // is plain white (the page scroller's own background).
    useEffect(() => {
        const page = barRef.current?.closest('main');
        if (!page) return undefined;
        page.style.backgroundColor = tab === 'competitions' ? '#ffffff' : '';
        return () => { page.style.backgroundColor = ''; };
    }, [tab]);

    // The highlight under the chosen tab glides from one tab to the next, and
    // the bar's ends fade where more tabs are hidden past them (asked
    // 2026-10-16: "make the scroll smooth...make those nav animation").
    // Written straight to the elements: these follow every scroll and resize.
    const pillRef = useRef(null);
    const fadeLeft = useRef(null);
    const fadeRight = useRef(null);
    const placed = useRef(false);
    const placePill = useCallback((glide) => {
        const bar = barRef.current;
        const pill = pillRef.current;
        const current = bar?.querySelector('[aria-current="page"]');
        if (!pill || !current) return;
        if (!glide) pill.style.transition = 'none';
        pill.style.width = `${current.offsetWidth}px`;
        pill.style.height = `${current.offsetHeight}px`;
        pill.style.transform = `translate(${current.offsetLeft}px, ${current.offsetTop}px)`;
        pill.style.opacity = '1';
        if (!glide) { void pill.offsetWidth; pill.style.transition = ''; }
    }, []);
    const showEdges = useCallback(() => {
        const bar = barRef.current;
        if (!bar) return;
        const end = bar.scrollWidth - bar.clientWidth;
        if (fadeLeft.current) fadeLeft.current.style.opacity = bar.scrollLeft > 2 ? '1' : '0';
        if (fadeRight.current) fadeRight.current.style.opacity = bar.scrollLeft < end - 2 ? '1' : '0';
    }, []);
    // A new tab: the highlight glides there (the very first time it is simply there).
    useLayoutEffect(() => {
        placePill(placed.current);
        placed.current = true;
        showEdges();
    }, [tab, placePill, showEdges]);
    // Set up once: a watcher made again on every tab change reports at once,
    // and that report snapped the highlight over before it could glide.
    useEffect(() => {
        const bar = barRef.current;
        if (!bar) return undefined;
        const resized = () => { placePill(false); showEdges(); };
        const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resized) : null;
        ro?.observe(bar);
        document.fonts?.ready?.then(resized);
        bar.addEventListener('scroll', showEdges, { passive: true });
        return () => { ro?.disconnect(); bar.removeEventListener('scroll', showEdges); };
    }, [placePill, showEdges]);

    return (
        <div className="flex flex-col gap-3">
            {/* The section's own bar, joined to the top bar and staying under
                it while the page scrolls: the six tabs in a row, with no tile
                before them (removed 2026-10-16). On a phone the row
                scrolls sideways, smoothly, its ends fading where more tabs
                are hidden; the highlight slides to the chosen tab. */}
            <div className={`sticky top-0 z-20 -mx-4 -mt-4 shrink-0 border-b sidebar:top-16 sidebar:-mx-8 sidebar:-mt-8 ${tab === 'competitions' ? 'border-[#ecebf5] bg-white' : 'border-slate-200 bg-white'}`}>
                <nav ref={barRef} aria-label="Competitions" data-section-tabs className="relative flex items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth px-3 py-1.5 no-scrollbar sidebar:px-7">
                    <span ref={pillRef} aria-hidden="true"
                        className={`pointer-events-none absolute left-0 top-0 rounded-2xl ${tab === 'competitions' ? 'bg-[#dedafb]' : 'bg-indigo-100'} opacity-0 shadow-sm transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`} />
                    {TABS.map((t) => {
                        const on = tab === t.id;
                        return (
                            <button key={t.id} type="button" onClick={() => select(t.id)} aria-current={on ? 'page' : undefined}
                                className={`relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold transition-[color,background-color,transform] duration-200 active:scale-95 motion-reduce:active:scale-100 ${on ? (tab === 'competitions' ? 'text-[#3b2fc0]' : 'text-indigo-700') : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'}`}>
                                {/* Re-mounted when chosen, so its little hop plays each time. */}
                                <t.icon key={on ? 'on' : 'off'} size={20} aria-hidden="true" className={`shrink-0 ${on ? 'tab-icon-pop' : ''}`} /> {t.label}
                            </button>
                        );
                    })}
                </nav>
                <span ref={fadeLeft} aria-hidden="true" className={`pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r ${tab === 'competitions' ? 'from-white via-white/80' : 'from-white via-white/80'} to-transparent opacity-0 transition-opacity duration-200`} />
                <span ref={fadeRight} aria-hidden="true" className={`pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l ${tab === 'competitions' ? 'from-white via-white/80' : 'from-white via-white/80'} to-transparent opacity-0 transition-opacity duration-200`} />
            </div>

            {/* Every tab is as long as its content. The Games tab was once
                exactly the window's height, with its games in one row; five
                games (2026-10-24) need two rows, so it scrolls like the rest,
                its banner kept tall on a wide screen. */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
                {tab === 'competitions' ? <CompetitionsBanner onPick={select} /> : (
                <header className={`relative flex flex-col justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2d2693] via-[#3b31c4] to-[#5a3fd8] p-5 text-white shadow-lg sm:px-7 sm:py-3 shrink-0 ${tab === 'games' ? 'lg:min-h-[10.5rem]' : TAB_HERO[tab] ? 'min-h-[11rem] sm:py-8 lg:min-h-[15rem]' : ''}`}>
                    {/* The scene, behind the words, where there is room for both. */}
                    <span aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'right center' }} />
                    <div className="relative lg:max-w-[50rem] lg:pr-6">
                        {TAB_HERO[tab] ? (
                            <>
                                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">{(() => { const Icon = TAB_HERO[tab].icon; return <Icon size={16} aria-hidden="true" />; })()} {TAB_HERO[tab].kicker}</p>
                                <h1 className="mt-1 text-[1.8rem] font-black leading-tight sm:text-4xl">{TAB_HERO[tab].title}</h1>
                                <p className="mt-1 hidden max-w-lg text-[13px] text-white/90 sm:block">{TAB_HERO[tab].text}</p>
                            </>
                        ) : (
                            <>
                                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90"><Trophy size={16} aria-hidden="true" /> Play · Compete · Win</p>
                                <h1 className="mt-1 text-[1.4rem] font-black leading-tight sm:text-2xl">Competitions</h1>
                                <p className="mt-1 hidden max-w-lg text-[13px] text-white/90 sm:block">Chess, rapid-fire rounds, coding clashes and IQ puzzles in inter-college competitions. Play for your college and win.</p>
                            </>
                        )}
                        {/* On a phone the pills and the picture are the Games tab's
                            alone: on the other tabs they filled over half the
                            screen and pushed the tab itself (a live match's
                            Join game) below the fold (2026-10-17). */}
                        <div className={`mt-2.5 flex flex-wrap gap-2 ${tab === 'games' ? '' : TAB_HERO[tab] ? 'hidden' : 'max-sm:hidden'}`}>
                            {HERO_PILLS.map(([Icon, label, tone, to]) => (
                                <button key={label} type="button" onClick={() => select(to)} data-hero-action={to}
                                    className="inline-flex min-h-8 items-center gap-2 rounded-lg bg-white/12 px-3 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-white/20">
                                    <Icon size={15} aria-hidden="true" className={tone} /> {label}
                                </button>
                            ))}
                        </div>
                        {/* Below lg, the picture is part of the banner, not a
                            card inside it: it runs to the banner's sides and
                            bottom (the negative margins undo the padding), and
                            its top and sides fade into the banner's purple. Its
                            top 22 of 378 rows are cropped off (aspect 866/356,
                            kept from the bottom): they hold the picture's own
                            light edge line and rounded corners, which showed
                            as a hairline even under the fade. */}
                        {tab === 'games' && <img src={HERO_ART} alt="" data-hero-art
                            className="-mx-5 -mb-5 mt-1 block aspect-[866/356] w-[calc(100%+2.5rem)] max-w-none object-cover object-bottom [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,transparent_8%,black_42%),linear-gradient(to_right,transparent,black_7%,black_93%,transparent)] sm:-mx-7 sm:-mb-3 sm:w-[calc(100%+3.5rem)] lg:hidden" />}
                    </div>
                </header>
                )}

                <div key={tab} className="flex flex-1 flex-col animate-fade-in lg:min-h-0 lg:flex-[1_1_auto]"><Body /></div>
            </div>
        </div>
    );
}
