/**
 * Games & Competitions — the section's home, in six tabs:
 *
 *   Games          Chess, Ludo, Carrom and UNO: start a friendly game and share
 *                  its code, or join one with a code
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Gamepad2, Trophy, UserCheck, BarChart3, History, Users, UsersRound, Crown, CalendarClock, Building2, Loader2,
    ArrowRight, Award, Download, Medal, Clock, Gift, Search, Play, ChevronRight, Link2, Ticket, MoreVertical, Copy, LogOut, Check, X
} from 'lucide-react';
import { competitionsApi, GAMES, ORDINAL, fmtDateTime, fmtDate, prizeLine, gameImage, gameIcon } from './api';
import { StatusChip, GameChip, MatchCard, Empty } from './parts';
import { saveBlob } from '../native/saveFile';

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

/** One of my friendly rooms: open it, copy its code, or leave it. */
const RoomRow = ({ room: r, onLeft }) => {
    const [menu, setMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const copy = () => {
        navigator.clipboard?.writeText(r.code).catch(() => {});
        setCopied(true); setMenu(false);
        setTimeout(() => setCopied(false), 1500);
    };
    const leave = () => {
        setBusy(true); setMenu(false);
        competitionsApi.leave(r.id).then(onLeft).catch(() => {}).finally(() => setBusy(false));
    };
    return (
        <li className="relative flex items-center gap-3 py-1.5" data-room={r.id}>
            <img src={gameIcon(r.game)} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover shadow-sm" />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-900">{r.label} {r.code && <span className="font-semibold text-slate-400">· <span className="font-mono text-slate-600">{r.code}</span></span>}</span>
                <span className="block truncate text-xs text-slate-500">{r.seats.map((s) => s.name).join(', ')}</span>
            </span>
            {/* ⋮ swaps the button for the row's choices, in the row itself: the
                list scrolls, so a popup hanging below would be cut off. */}
            {menu ? (
                <span role="menu" className="flex shrink-0 items-center gap-1">
                    {r.code && <button type="button" role="menuitem" onClick={copy} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"><Copy size={13} aria-hidden="true" /> Copy code</button>}
                    {r.status === 'waiting' && <button type="button" role="menuitem" onClick={leave} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"><LogOut size={13} aria-hidden="true" /> {r.host ? 'Close room' : 'Leave room'}</button>}
                </span>
            ) : (
                <Link to={`/competitions/play/${r.id}`} className="shrink-0 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100">
                    {r.status === 'waiting' ? 'Open room' : 'Continue'}
                </Link>
            )}
            <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label={`More for ${r.label} ${r.code || ''}`} disabled={busy}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                {busy ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : copied ? <Check size={18} className="text-emerald-600" aria-hidden="true" /> : menu ? <X size={18} aria-hidden="true" /> : <MoreVertical size={18} aria-hidden="true" />}
            </button>
        </li>
    );
};

const GamesTab = () => {
    const navigate = useNavigate();
    const rooms = useLoad(competitionsApi.myRooms);
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [code, setCode] = useState('');
    const [q, setQ] = useState('');

    const create = (game) => {
        setBusy(game); setError('');
        competitionsApi.createRoom(game).then((r) => navigate(`/competitions/play/${r.game.id}`))
            .catch((e) => setError(e.message)).finally(() => setBusy(''));
    };
    const join = (e) => {
        e.preventDefault();
        setBusy('join'); setError('');
        competitionsApi.joinRoom(code).then((r) => navigate(`/competitions/play/${r.game.id}`))
            .catch((err) => setError(err.message)).finally(() => setBusy(''));
    };
    const games = Object.entries(GAMES).filter(([, g]) => g.label.toLowerCase().includes(q.trim().toLowerCase()));
    const list = rooms.data?.rooms || [];

    return (
        <div className="flex flex-1 flex-col gap-3 lg:min-h-0 lg:flex-[1_1_auto]">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-lg font-black text-slate-900"><span aria-hidden="true" className="h-6 w-1.5 rounded-full bg-indigo-600" /> Available Games</h2>
                <label className="relative block w-full sm:w-64">
                    <span className="sr-only">Search games</span>
                    <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games..." type="search"
                        className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                </label>
            </div>

            {games.length === 0 && <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No game called “{q.trim()}”. We have Chess, Ludo, Carrom and UNO.</p>}
            {/* On a wide screen the row has a set height — the photo's share of
                the window plus the card's text and button — and may shrink. */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 lg:h-[calc(7vw+129px)] lg:min-h-0 lg:shrink lg:grid-rows-[minmax(0,1fr)]">
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
                            <img src={gameImage(id)} alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
                            <span className={`absolute right-[4%] top-0 mt-[4%] inline-flex aspect-[3.6/1] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-slate-900/80 px-3 text-[11px] font-semibold text-white shadow-md backdrop-blur-sm ${g.pillWidth}`}>
                                <Users size={13} aria-hidden="true" /> {g.players.replace('players', 'Players')}
                            </span>
                        </div>
                        <div className="flex flex-1 shrink-0 flex-col p-3">
                            <div className="flex items-center gap-2.5">
                                <img src={gameIcon(id)} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm" />
                                <div className="min-w-0">
                                    <h3 className="text-[15px] font-black leading-tight text-slate-900">{g.label}</h3>
                                    <p className="text-[11px] font-semibold text-indigo-600">{g.players}</p>
                                </div>
                            </div>
                            <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-snug text-slate-600">{g.blurb}</p>
                            <button type="button" onClick={() => create(id)} disabled={!!busy}
                                className={`mt-2.5 flex min-h-9 w-full items-center justify-between rounded-xl px-3.5 text-[13px] font-bold text-white shadow-md transition-colors disabled:opacity-60 ${g.button}`}>
                                <span className="inline-flex items-center gap-2">{busy === id ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Play size={15} fill="currentColor" aria-hidden="true" />} Play Now</span>
                                <ChevronRight size={15} aria-hidden="true" />
                            </button>
                        </div>
                    </article>
                ))}
            </div>

            <div className="grid gap-3 lg:flex-[1_0_auto] lg:grid-cols-[1.1fr_1fr]">
                <section className="relative flex flex-col justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-violet-50 via-indigo-50/70 to-fuchsia-50/60 p-3.5 ring-1 ring-violet-100">
                    <UsersRound size={48} aria-hidden="true" className="pointer-events-none absolute right-5 top-3 text-indigo-200/60" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-violet-100/60" />
                    <div className="relative">
                        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Link2 size={18} className="text-indigo-600" aria-hidden="true" /> Join with a code</h2>
                        <p className="mt-0.5 text-xs text-slate-600">A friend who made a room can tell you its 6-character code.</p>
                        <form onSubmit={join} className="mt-2.5 flex flex-wrap gap-2.5">
                            <label className="relative min-w-0 flex-1 basis-48">
                                <span className="sr-only">Room code</span>
                                <Ticket size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    placeholder="Enter code (e.g. K7Q2XM)" inputMode="text" autoCapitalize="characters"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 font-mono text-[15px] tracking-[0.25em] text-slate-900 shadow-sm placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                            </label>
                            <button type="submit" disabled={code.length !== 6 || !!busy}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50">
                                {busy === 'join' ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null} Join Room <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </form>
                    </div>
                </section>
                <section className="rounded-[18px] bg-white p-3.5 shadow-sm ring-1 ring-slate-100" data-your-games>
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white"><Gamepad2 size={15} aria-hidden="true" /></span> Your Games</h2>
                        {list.length > 3 && <span className="text-xs font-semibold text-slate-400">{list.length} rooms · scroll for more</span>}
                    </div>
                    {!rooms.data ? <p className="mt-2 text-sm text-slate-500">{rooms.error || 'Loading…'}</p>
                        : list.length === 0 ? <p className="mt-2 text-sm text-slate-500">No friendly games open. Start one above and share its code.</p>
                            : <ul className="scroll-fade mt-0.5 max-h-[8.75rem] divide-y divide-slate-100 overflow-y-auto pr-1" data-rooms>{list.map((r) => <RoomRow key={r.id} room={r} onLeft={rooms.reload} />)}</ul>}
                </section>
            </div>
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{error}</p>}
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
                <div className="mb-2 flex flex-wrap gap-1.5"><StatusChip status={c.status} phase={c.phase} /><GameChip emoji={c.emoji} label={c.gameLabel} /></div>
                <h3 className="font-black leading-snug text-slate-900">{c.name}</h3>
                <p className="mt-0.5 truncate text-xs text-slate-500">Organized by {c.organizedBy}</p>
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5"><Building2 size={14} className="text-slate-400" aria-hidden="true" /> {c.teamsCount} {c.teamsCount === 1 ? 'College' : 'Colleges'}</span>
                <span className="inline-flex items-center gap-1.5"><Users size={14} className="text-slate-400" aria-hidden="true" /> {c.playersCount || 0} {c.playersCount === 1 ? 'Player' : 'Players'}</span>
            </p>
            <dl className="space-y-1 text-xs text-slate-600">
                {['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && (
                    <div className="flex gap-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-400"><Clock size={13} aria-hidden="true" /> Register by</dt><dd className="font-semibold text-slate-700">{fmtDateTime(c.registrationDeadline)}</dd></div>
                )}
                <div className="flex gap-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-400"><CalendarClock size={13} aria-hidden="true" /> Date</dt><dd className="font-semibold text-slate-700">{fmtDateTime(c.startsAt)}</dd></div>
                {prizeLine(c) && <div className="flex gap-1.5"><dt className="inline-flex items-center gap-1.5 text-slate-400"><Gift size={13} aria-hidden="true" /> Prize</dt><dd className="min-w-0 truncate font-semibold text-amber-700">{prizeLine(c)}</dd></div>}
            </dl>
            {c.myTeam && <p className="text-xs font-bold text-violet-700">Your team: {c.myTeam.teamName}</p>}
            <Link to={`/competitions/${c.id}`} className="mt-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-colors hover:bg-indigo-700">
                View Competition <ArrowRight size={15} aria-hidden="true" />
            </Link>
        </div>
    </article>
);

const CompetitionsTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.list);
    const [game, setGame] = useState('all');
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
            {/* The four games, as a filter */}
            <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by game">
                {[['all', 'All games', '🎮'], ...Object.entries(GAMES).map(([id, g]) => [id, g.label, g.emoji])].map(([id, label, emoji]) => (
                    <button key={id} type="button" onClick={() => setGame(id)} aria-pressed={game === id} data-game-filter={id}
                        className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition-colors ${game === id ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                        <span aria-hidden="true">{emoji}</span> {label}
                    </button>
                ))}
            </div>
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
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((c) => <CompetitionCard key={c.id} c={c} />)}</div>
                </div>
            ))}
        </div>
    );
};

/* ── My games ─────────────────────────────────────────────────────────── */

const MatchList = ({ rows, empty }) => (rows.length
    ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((m) => <MatchCard key={m.id} match={m} playing={m.playing} myTeamId={m.myTeamId} showCompetition />)}</div>
    : <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{empty}</p>);

const MINE_TABS = [['registered', 'Registered'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed']];

const MineTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.me);
    const [sub, setSub] = useState(null);
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    if (!data.competitions.length) {
        return <Empty icon={UserCheck} title="You are not in a competition yet">When your college's coordinator puts you in a team, your competitions and matches appear here.</Empty>;
    }
    // Open on Live when a match is on now: that is what the student came for.
    const active = sub || (data.live.length ? 'live' : 'registered');
    const counts = { registered: data.competitions.length, upcoming: data.upcoming.length, live: data.live.length, completed: data.completed.length };
    return (
        <div className="space-y-4">
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="My games">
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
                                        <Link to={`/competitions/${c.id}`} className="min-w-0 break-words text-sm font-bold text-slate-900 hover:text-indigo-700">{c.name}</Link>
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

const LeaderboardTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.leaderboard);
    const [board, setBoard] = useState('colleges');
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    const rows = data[board] || [];
    const label = (r) => (board === 'colleges' ? r.collegeName : board === 'teams' ? r.teamName : r.name);
    const sub = (r) => (board === 'colleges' ? `${r.competitions} competition${r.competitions === 1 ? '' : 's'}` : board === 'teams' ? `${r.collegeName} · ${r.competition}` : r.collegeName);
    return (
        <Box>
            <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Ranking">
                {BOARDS.map((b) => (
                    <button key={b.id} type="button" role="tab" aria-selected={board === b.id} onClick={() => setBoard(b.id)}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-bold transition-colors ${board === b.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        <b.icon size={15} aria-hidden="true" /> {b.label}
                    </button>
                ))}
            </div>
            {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No results yet. Rankings fill in as matches are played.</p> : (
                <ol className="divide-y divide-slate-100" data-ranking={board}>
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
            <p className="mt-4 text-xs text-slate-400">3 points a match won, 1 a match played; 10 / 6 / 4 for finishing 1st / 2nd / 3rd. A college's points are its teams' added up.</p>
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
        <div className="grid gap-4 lg:grid-cols-2">
            {data.competitions.map(({ competition: c, teams }) => (
                <Box key={c.id}>
                    <div data-result={c.id} className="space-y-3">
                        <div>
                            <p className="font-black text-slate-900">🏆 {c.name}</p>
                            <p className="text-xs text-slate-500">{c.emoji} {c.gameLabel} · {teams.length} participating colleges · {fmtDate(c.completedAt)}</p>
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
                        <span className="min-w-0 flex-1">
                            <Link to={`/competitions/${r.competition.id}`} className="block truncate text-sm font-bold text-slate-900 hover:text-indigo-700">{r.competition.emoji} {r.competition.name}</Link>
                            <span className="block text-xs text-slate-500">
                                {r.competition.gameLabel} · {r.collegeName ? `${r.collegeName} · ` : ''}{r.teamName} · {r.place ? `${ORDINAL[r.place]} place` : 'Took part'} · {r.score.won}/{r.score.played} matches won · {fmtDate(r.competition.completedAt)}
                            </span>
                        </span>
                        {r.certificate && (
                            <button type="button" onClick={() => download(r.competition.id, r.competition.name)} disabled={saving === r.competition.id}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60">
                                {saving === r.competition.id ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />} Certificate
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </Box>
    );
};

/* ── The page ─────────────────────────────────────────────────────────── */

const HERO_BG = '/illustrations/games-hero-bg.png';
const HERO_ART = '/illustrations/games-hero-art.png';
const HERO_PILLS = [[Users, 'Play with friends', 'text-white'], [Trophy, 'Join competitions', 'text-amber-300'], [UsersRound, 'Create rooms', 'text-white'], [Crown, 'Climb leaderboard', 'text-amber-300']];

export default function CompetitionsHome() {
    const [params, setParams] = useSearchParams();
    const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'games';
    const select = (id) => setParams(id === 'games' ? {} : { tab: id }, { replace: true });
    const Body = useMemo(() => ({ games: GamesTab, competitions: CompetitionsTab, mine: MineTab, leaderboard: LeaderboardTab, results: ResultsTab, history: HistoryTab }[tab]), [tab]);
    const fill = tab === 'games';

    // On a phone the bar scrolls sideways. Whichever tab is chosen, the bar
    // brings it to the middle on its own, so the ones either side — the next
    // section — are in view, and nobody has to drag the bar to find them.
    const barRef = useRef(null);
    useEffect(() => {
        const bar = barRef.current;
        const current = bar?.querySelector('[aria-current="page"]');
        if (!bar || !current || bar.scrollWidth <= bar.clientWidth) return;
        const left = current.offsetLeft - (bar.clientWidth - current.offsetWidth) / 2;
        bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    }, [tab]);

    return (
        <div className={`flex flex-col gap-3 ${fill ? 'lg:h-[calc(100vh-8rem)] lg:min-h-[36rem]' : ''}`}>
            {/* The section's own bar: the gamepad tile, then the six tabs in a
                row. On a phone the row scrolls sideways. */}
            <nav ref={barRef} aria-label="Games & Competitions" className="relative flex shrink-0 items-center gap-1.5 overflow-x-auto rounded-[22px] bg-white p-1.5 shadow-sm ring-1 ring-slate-100 no-scrollbar">
                <span aria-hidden="true" className="mr-1 flex h-10 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30"><Gamepad2 size={26} /></span>
                {TABS.map((t) => (
                    <button key={t.id} type="button" onClick={() => select(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                        className={`inline-flex min-h-10 shrink-0 items-center gap-2.5 rounded-2xl px-4 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-700'}`}>
                        <t.icon size={20} aria-hidden="true" className="shrink-0" /> {t.label}
                    </button>
                ))}
            </nav>

            {/* On a wide screen the Games tab is exactly the window's height: the
                banner and the two boxes take any spare room, and the game photos
                give a little when there is not enough. The other tabs are as
                long as their content, with the banner at its usual size. */}
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
                <header className={`relative flex flex-col justify-center overflow-hidden rounded-[22px] bg-gradient-to-br from-[#2d2693] via-[#3b31c4] to-[#5a3fd8] p-5 text-white shadow-lg sm:px-7 sm:py-3 ${fill ? 'lg:flex-[1_0_auto]' : 'shrink-0'}`}>
                    {/* The scene, behind the words, where there is room for both. */}
                    <span aria-hidden="true" className="absolute inset-0 hidden lg:block" style={{ backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'right center' }} />
                    <div className="relative lg:max-w-[50rem] lg:pr-6">
                        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/90"><Gamepad2 size={16} aria-hidden="true" /> Play · Compete · Win</p>
                        <h1 className="mt-1.5 text-[1.6rem] font-black leading-tight sm:text-3xl">Games <span className="text-violet-300">&amp;</span> Competitions</h1>
                        <p className="mt-1.5 max-w-lg text-sm text-white/90">Compete with your college friends. Play your favourite games and win exciting matches.</p>
                        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                            {HERO_PILLS.map(([Icon, label, tone]) => (
                                <li key={label} className="flex items-center gap-2 text-xs font-semibold">
                                    <span className={`flex h-7 w-7 items-center justify-center rounded-full bg-white/15 ${tone}`}><Icon size={14} aria-hidden="true" /></span> {label}
                                </li>
                            ))}
                        </ul>
                        <img src={HERO_ART} alt="" className="mt-5 w-full rounded-2xl lg:hidden" />
                    </div>
                </header>

                <div key={tab} className="flex flex-1 flex-col animate-fade-in lg:min-h-0 lg:flex-[1_1_auto]"><Body /></div>
            </div>
        </div>
    );
}
