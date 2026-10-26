/**
 * Competitions — the section's home (it was "Games & Competitions" until
 * 2026-10-23, when the menu got a section of its own for Games, the brain
 * games), in six tabs:
 *
 *   Games          Chess, a Quiz and a Hackathon (added 2026-10-23), each leading
 *                  to its competitions, and Join with a code: a
 *                  competition match's code opens that match (playing with
 *                  friends, UNO, and then Ludo and Carrom, were removed on 2026-10-23)
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
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Gamepad2, Trophy, UserCheck, BarChart3, History, Users, UsersRound, Crown, CalendarClock, Building2, Loader2,
    ArrowRight, Award, Download, Medal, Clock, Gift, Search, ChevronRight, Link2, Ticket, Brain, Code2
} from 'lucide-react';
import useRowsShown from './useRowsShown';
import { competitionsApi, GAMES, ORDINAL, fmtDateTime, fmtDate, gameImage, gameIcon } from './api';
import { StatusChip, GameChip, MatchCard, Empty } from './parts';
import { saveBlob } from '../native/saveFile';
import PriceTag from '../components/rewards/PriceTag';

const TABS = [
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'competitions', label: 'Competitions', icon: Trophy },
    { id: 'mine', label: 'My Games', icon: UserCheck },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'results', label: 'Results', icon: Medal },
    { id: 'history', label: 'History', icon: History }
];

/** Load once on mount; `reload` to fetch again. */
const useLoad = (fn) => {
    const [state, setState] = useState({ data: null, error: '' });
    const [n, setN] = useState(0);
    useEffect(() => {
        let alive = true;
        fn().then((data) => { if (alive) setState({ data, error: '' }); })
            .catch((e) => { if (alive) setState({ data: null, error: e.message }); });
        return () => { alive = false; };
    }, [fn, n]);
    return { ...state, reload: useCallback(() => setN((x) => x + 1), []) };
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
const Loading = () => <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="skeleton h-40 rounded-3xl" />)}</div>;

/* ── Games ───────────────────────────────────────────────────────────── */

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
        competitionsApi.joinMatch(code).then((r) => navigate(`/competitions/play/${r.game.id}`))
            .catch((err) => setError(err.message)).finally(() => setBusy(false));
    };
    // A game's competitions: the Competitions tab, filtered to it.
    const competitionsOf = (game) => navigate(game ? `?tab=competitions&game=${game}` : '?tab=competitions');
    const games = Object.entries(GAMES).filter(([, g]) => g.label.toLowerCase().includes(q.trim().toLowerCase()));
    const names = Object.values(GAMES).map((g) => g.label);
    // One game (Chess, since Ludo and Carrom left on 2026-10-23): nothing to search, and its card not stretched across the row.
    const many = names.length > 1;

    return (
        <div className="flex flex-1 flex-col gap-3 lg:min-h-0 lg:flex-[1_1_auto]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-black text-slate-900"><span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-indigo-600" /> Available Games</h2>
                {many && <label className="relative block w-full sm:w-64">
                    <span className="sr-only">Search games</span>
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games..." type="search"
                        className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </label>}
            </div>

            {many && games.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No game called “{q.trim()}”. We have {names.slice(0, -1).join(', ')} and {names[names.length - 1]}.</p>}
            {/* On a wide screen the row has a set height — the photo's share of
                the window plus the card's text and button — and may shrink. */}
            <div className={`grid grid-cols-1 gap-4 ${many ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:max-w-xl'} lg:h-[calc(7vw+129px)] lg:min-h-0 lg:shrink lg:grid-rows-[minmax(0,1fr)]`}>
                {games.map(([id, g]) => (
                    <article key={id} data-game={id} className="flex flex-col overflow-hidden rounded-[18px] bg-white shadow-sm ring-1 ring-slate-100 lg:min-h-0">
                        {/* Shorter than the photo, cropping its bottom; on a wide screen
                            shorter still when the window is. The photo always keeps its
                            width, so the pill painted into it stays where the real pill
                            below sits — everything about that pill is sized by width. */}
                        <div className="relative w-full overflow-hidden lg:h-[7vw] lg:min-h-16 lg:shrink">
                            {/* The height: a share of the width (1 / 2.8) on a phone; on a
                                wide screen a share of the window, which is what a flexible
                                column can measure before anything is laid out — a width
                                share there reads as nothing and the photo collapses. */}
                            <span aria-hidden="true" className="block pb-[35.7%] lg:hidden" />
                            {g.art ? (
                                <span aria-hidden="true" className={`absolute inset-0 flex items-center justify-start overflow-hidden bg-gradient-to-br pl-[8%] ${g.tone}`}>
                                    {(() => { const Art = ART[g.art]; return <><Art className="h-[70%] w-auto text-white/90 drop-shadow-lg" strokeWidth={1.6} /><Art className="absolute -bottom-6 right-[30%] h-[90%] w-auto rotate-12 text-white/10" strokeWidth={1.2} /></>; })()}
                                </span>
                            ) : <img src={gameImage(id)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />}
                            <span className={`absolute right-[4%] top-0 mt-[4%] inline-flex aspect-[3.6/1] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/80 px-3 text-[11px] font-semibold text-white shadow-md backdrop-blur-sm ${g.pillWidth}`}>
                                <Users size={13} aria-hidden="true" /> {g.players.replace('players', 'Players')}
                            </span>
                        </div>
                        <div className="flex flex-1 shrink-0 flex-col p-3">
                            <div className="flex items-center gap-2.5">
                                {g.art
                                    ? <span aria-hidden="true" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${g.tone}`}>{(() => { const Art = ART[g.art]; return <Art size={19} />; })()}</span>
                                    : <img src={gameIcon(id)} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />}
                                <div className="min-w-0">
                                    <h3 className="text-[15px] font-black leading-tight text-slate-900">{g.label}</h3>
                                    <p className="text-[11px] font-semibold text-indigo-600">{g.players}</p>
                                </div>
                            </div>
                            <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-snug text-slate-600">{g.blurb}</p>
                            <button type="button" onClick={() => competitionsOf(id)} data-see-competitions={id}
                                className={`mt-2.5 flex min-h-9 w-full items-center justify-between rounded-xl px-3.5 text-[13px] font-bold text-white shadow-md transition-colors ${g.button}`}>
                                <span className="inline-flex items-center gap-2"><Trophy size={15} aria-hidden="true" /> See competitions</span>
                                <ChevronRight size={15} aria-hidden="true" />
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:flex-[1_0_auto] lg:grid-cols-[1.1fr_1fr]">
                {/* A competition match's code, from My Games or the coordinator. */}
                <section className="relative flex flex-col justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-violet-50 via-indigo-50/70 to-fuchsia-50/60 p-3.5 ring-1 ring-violet-100" data-join-code>
                    <UsersRound size={48} aria-hidden="true" className="pointer-events-none absolute right-5 top-3 text-indigo-200/60" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-violet-100/60" />
                    <div className="relative">
                        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Link2 size={18} className="text-indigo-600" aria-hidden="true" /> Join with a code</h2>
                        <p className="mt-0.5 text-xs text-slate-600">Your competition match has a 6-character code: it is on your match in My Games, or ask your coordinator.</p>
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
export const CompetitionCard = ({ c }) => (
    <article data-competition={c.id} className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {c.bannerUrl
            ? <img src={c.bannerUrl} alt="" className="h-24 w-full object-cover sm:h-28" loading="lazy" />
            : <div className={`flex h-14 items-center justify-center bg-gradient-to-br sm:h-20 ${GAMES[c.game]?.tone || 'from-indigo-500 to-violet-600'}`}><span className="text-3xl drop-shadow sm:text-4xl" aria-hidden="true">{c.emoji}</span></div>}
        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
            <div>
                <div className="mb-2 flex flex-wrap gap-1.5"><StatusChip status={c.status} phase={c.phase} /><GameChip emoji={c.emoji} label={c.gameLabel} />
                    {c.hostOrganizationId && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">Your college</span>}</div>
                <h3 className="font-black leading-snug text-slate-900">{c.name}</h3>
                <p className="mt-0.5 truncate text-xs text-slate-500">Organized by {c.organizedBy}</p>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-700">
                {/* Students on their own (a quiz or a hackathon): only how many have signed up. */}
                {c.entry === 'individual'
                    ? <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-slate-400" aria-hidden="true" /> {c.teamsCount} {c.teamsCount === 1 ? 'Student' : 'Students'} · open to all</span>
                    : <>
                        <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" aria-hidden="true" /> {c.teamsCount} {c.hostOrganizationId ? (c.teamsCount === 1 ? 'Team' : 'Teams') : c.teamsCount === 1 ? 'College' : 'Colleges'}</span>
                        <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-slate-400" aria-hidden="true" /> {c.playersCount || 0} {c.playersCount === 1 ? 'Player' : 'Players'}</span>
                    </>}
            </p>
            <dl className="space-y-1 text-xs text-slate-600">
                {['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && (
                    <div className="flex gap-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-400"><Clock size={13} aria-hidden="true" /> Register by</dt><dd className="font-semibold text-slate-700">{fmtDateTime(c.registrationDeadline)}</dd></div>
                )}
                <div className="flex gap-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-400"><CalendarClock size={13} aria-hidden="true" /> {c.kind === 'quiz' ? 'Opens' : c.kind === 'hackathon' ? 'Starts' : 'Date'}</dt><dd className="font-semibold text-slate-700">{fmtDateTime(c.startsAt)}</dd></div>
                {c.endsAt && <div className="flex gap-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-400"><Clock size={13} aria-hidden="true" /> {c.kind === 'quiz' ? 'Closes' : 'Projects due'}</dt><dd className="font-semibold text-slate-700">{fmtDateTime(c.endsAt)}</dd></div>}
            </dl>
            {c.myTeam && <p className="text-xs font-bold text-violet-700">{c.myTeam.solo ? 'You are signed up' : `Your team: ${c.myTeam.teamName}`}</p>}
            <Link to={`/competitions/${c.id}`} className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700">
                View Competition <ArrowRight size={15} aria-hidden="true" />
            </Link>
        </div>
    </article>
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
    const [params] = useSearchParams();
    // One game (Chess): no filters to choose between, so every competition is listed.
    const many = Object.keys(GAMES).length > 1;
    const [game, setGame] = useState(() => (many && GAMES[params.get('game')] ? params.get('game') : 'all'));
    // The game filters scroll the way the section's tab bar does.
    const filtersRef = useRef(null);
    useChosenInView(filtersRef, game, '[aria-pressed="true"]');
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    const list = data.competitions.filter((c) => c.status !== 'completed' && (game === 'all' || c.game === game));
    const groups = [
        ['Live now', list.filter((c) => c.phase === 'live')],
        ['Open for registration', list.filter((c) => ['registration-open', 'closing-soon'].includes(c.phase))],
        ['Coming up', list.filter((c) => ['registration-soon', 'upcoming'].includes(c.phase))]
    ].filter(([, rows]) => rows.length);
    return (
        <div className="space-y-6">
            {/* The games, as a filter (when there is more than one) */}
            {many && <div ref={filtersRef} className="relative flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by game">
                {[['all', 'All games', '🎮'], ...Object.entries(GAMES).map(([id, g]) => [id, g.label, g.emoji])].map(([id, label, emoji]) => (
                    <button key={id} type="button" onClick={() => setGame(id)} aria-pressed={game === id} data-game-filter={id}
                        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-colors ${game === id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                        <span aria-hidden="true">{emoji}</span> {label}
                    </button>
                ))}
            </div>}
            <div>
                <h2 className="text-lg font-black text-slate-900">Inter-College Competitions</h2>
                <p className="text-sm text-slate-500">Colleges enter teams through their coordinator. Want to play? Ask your college's coordinator to put you in the team.</p>
            </div>
            {!groups.length && (
                <Empty icon={Trophy} title={game === 'all' ? 'No competitions right now' : `No ${GAMES[game].label} competitions right now`}>
                    New inter-college competitions appear here as soon as they are published.
                </Empty>
            )}
            {groups.map(([title, rows]) => (
                <div key={title}>
                    <h3 className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((c) => <CompetitionCard key={c.id} c={c} />)}</div>
                </div>
            ))}
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
    if (!data) return <Loading />;
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
    if (!data) return <Loading />;
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

const ResultsTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.history);
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    if (!data.competitions.length) return <Empty icon={Medal} title="No results yet">Finished competitions, their winners and match results appear here.</Empty>;
    return (
        // One column on a phone, each card no wider than it: without a set
        // column, a long winner's line widened the card past the screen.
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.competitions.map(({ competition: c, teams }) => (
                <Box key={c.id}>
                    <div data-result={c.id} className="space-y-3">
                        <div>
                            <p className="font-black text-slate-900">🏆 {c.name}</p>
                            <p className="text-xs text-slate-500">{c.emoji} {c.gameLabel} · {teams.length} {c.hostOrganizationId ? 'teams' : 'participating colleges'} · {fmtDate(c.completedAt)}</p>
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
                        <Link to={`/competitions/${c.id}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700">
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
    const [saving, setSaving] = useState('');
    const download = (id, name) => {
        setSaving(id);
        competitionsApi.certificate(id).then((blob) => saveBlob(blob, `Certificate_${name.replace(/\s+/g, '_')}.pdf`, { title: 'Certificate' }))
            .catch(() => {}).finally(() => setSaving(''));
    };
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    if (!data.results.length) return <Empty icon={History} title="No past competitions yet">Once a competition you played in is over, it is kept here with your position and certificate.</Empty>;
    return (
        <Box>
            <ul className="divide-y divide-slate-100" data-history>
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
                        {r.certificate && (
                            <button type="button" onClick={() => download(r.competition.id, r.competition.name)} disabled={saving === r.competition.id}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60">
                                {saving === r.competition.id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />} Certificate <PriceTag action="download_competition_certificate" />
                            </button>
                        )}
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
const HERO_PILLS = [[Trophy, 'Join competitions', 'text-amber-300'], [UsersRound, 'Play for your college', 'text-white'], [Crown, 'Climb leaderboard', 'text-amber-300']];

const BODIES = { games: GamesTab, competitions: CompetitionsTab, mine: MineTab, leaderboard: LeaderboardTab, results: ResultsTab, history: HistoryTab };

export default function CompetitionsHome() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'games';
    const select = (id) => setParams(id === 'games' ? {} : { tab: id }, { replace: true });
    const Body = BODIES[tab];
    const fill = tab === 'games';

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
        <div className={`flex flex-col gap-3 ${fill ? 'lg:h-[calc(100vh-8rem)] lg:min-h-[36rem]' : ''}`}>
            {/* The section's own bar: the six tabs in a row, with no tile
                before them (removed 2026-10-16). On a phone the row
                scrolls sideways, smoothly, its ends fading where more tabs
                are hidden; the highlight slides to the chosen tab. */}
            <div className="relative shrink-0 rounded-[22px] bg-white shadow-sm ring-1 ring-slate-100">
                <nav ref={barRef} aria-label="Competitions" data-section-tabs className="relative flex items-center gap-1.5 overflow-x-auto overscroll-x-contain scroll-smooth rounded-[22px] p-1.5 no-scrollbar">
                    <span ref={pillRef} aria-hidden="true"
                        className="pointer-events-none absolute left-0 top-0 rounded-2xl bg-indigo-100 opacity-0 shadow-sm transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" />
                    {TABS.map((t) => {
                        const on = tab === t.id;
                        return (
                            <button key={t.id} type="button" onClick={() => select(t.id)} aria-current={on ? 'page' : undefined}
                                className={`relative inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold transition-[color,background-color,transform] duration-200 active:scale-95 motion-reduce:active:scale-100 ${on ? 'text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'}`}>
                                {/* Re-mounted when chosen, so its little hop plays each time. */}
                                <t.icon key={on ? 'on' : 'off'} size={20} aria-hidden="true" className={`shrink-0 ${on ? 'tab-icon-pop' : ''}`} /> {t.label}
                            </button>
                        );
                    })}
                </nav>
                <span ref={fadeLeft} aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-10 rounded-l-[22px] bg-gradient-to-r from-white via-white/80 to-transparent opacity-0 transition-opacity duration-200" />
                <span ref={fadeRight} aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-[22px] bg-gradient-to-l from-white via-white/80 to-transparent opacity-0 transition-opacity duration-200" />
            </div>

            {/* On a wide screen the Games tab is exactly the window's height: the
                banner and the two boxes take any spare room, and the game photos
                give a little when there is not enough. The other tabs are as
                long as their content, with the banner at its usual size. */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
                <header className={`relative flex flex-col justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2d2693] via-[#3b31c4] to-[#5a3fd8] p-5 text-white shadow-lg sm:px-7 sm:py-3 ${fill ? 'lg:flex-[1_0_auto]' : 'shrink-0'}`}>
                    {/* The scene, behind the words, where there is room for both. */}
                    <span aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'right center' }} />
                    <div className="relative lg:max-w-[50rem] lg:pr-6">
                        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90"><Trophy size={16} aria-hidden="true" /> Play · Compete · Win</p>
                        <h1 className="mt-1.5 text-[1.6rem] font-black leading-tight sm:text-3xl">Competitions</h1>
                        <p className="mt-1.5 hidden max-w-lg text-sm text-white/90 sm:block">Chess in inter-college competitions. Play for your college and win exciting matches.</p>
                        {/* On a phone the pills and the picture are the Games tab's
                            alone: on the other tabs they filled over half the
                            screen and pushed the tab itself (a live match's
                            Join game) below the fold (2026-10-17). */}
                        <ul className={`mt-3 flex flex-wrap gap-x-5 gap-y-2 ${tab === 'games' ? '' : 'max-sm:hidden'}`}>
                            {HERO_PILLS.map(([Icon, label, tone]) => (
                                <li key={label} className="flex items-center gap-2 text-xs font-semibold">
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ${tone}`}><Icon size={14} aria-hidden="true" /></span> {label}
                                </li>
                            ))}
                        </ul>
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

                <div key={tab} className="flex flex-1 flex-col animate-fade-in lg:min-h-0 lg:flex-[1_1_auto]"><Body /></div>
            </div>
        </div>
    );
}
