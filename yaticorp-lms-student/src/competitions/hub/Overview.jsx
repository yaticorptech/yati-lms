/**
 * Competitions, the section's first page (2026-11-04), laid out as the reference: my active matches and quick
 * actions; the live and upcoming competitions (a single line when there are none); the five games as big picture
 * cards, each opening its rules on a dark 3D card (GamePopup); and the calendar, small, beside this month's events.
 * Everything from the server.
 */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, ArrowRight, Ticket, Loader2, ChevronRight, Trophy, Award, Crown, Gamepad2, Zap, Link2, UserPlus, UsersRound, Radio, X } from 'lucide-react';
import Portal from '../../components/Portal';
import HubLayout from './HubLayout';
import useLoad from './useLoad';
import { pageForTab } from './oldAddress';
import { competitionsApi } from '../api';
import { arenaApi } from '../arena/api';
import { Failed, CompetitionCard, ArenaGoldCard, MatchList } from '../CompetitionsHome';
import { CardGridSkeleton } from '../Skeletons';
import { CalendarView } from './pages';
import GamePopup from './GamePopup';
import { GAME_IDS, gameCard, PANEL } from './gameInfo';


/** A section's title, inside its panel or over it. */
const Title = ({ icon: Icon, children, aside }) => (
    <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900 sm:text-lg"><Icon size={20} className="text-violet-600" strokeWidth={2.4} aria-hidden="true" /> {children}</h2>
        {aside}
    </div>
);

/** Join any competition match or Quiz Arena with my own 6-character code. */
export const JoinWithCode = () => {
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const join = (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        competitionsApi.joinMatch(code).then((r) => navigate(r.arena ? `/competitions/arena/${r.arena.id}/play` : `/competitions/play/${r.game.id}`))
            .catch((err) => setError(err.message)).finally(() => setBusy(false));
    };
    return (
        <form onSubmit={join} data-join-code>
            <p className="text-sm font-black text-slate-900">Join with your code</p>
            <p className="text-xs text-slate-500">Your 6-character joining code opens your match.</p>
            <div className="mt-2 flex gap-2">
                <label className="relative min-w-0 flex-1">
                    <span className="sr-only">Joining code</span>
                    <Ticket size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="K7Q2XM" autoCapitalize="characters"
                        className="w-full rounded-xl border border-violet-100 bg-white py-2.5 pl-9 pr-3 font-mono text-sm shadow-[inset_0_1px_3px_rgba(76,29,149,.08)] tracking-[0.25em] text-slate-900 placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                </label>
                <button type="submit" disabled={code.length !== 6 || busy} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gradient-to-b from-[#7c3aed] to-[#4f22c9] px-4 text-sm font-black text-white shadow-[0_8px_18px_-6px_rgba(109,40,217,.6)] hover:brightness-110 disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null} Join <ChevronRight size={15} aria-hidden="true" />
                </button>
            </div>
            {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">{error}</p>}
        </form>
    );
};

// Quick actions (2026-11-04), as the reference: six tiles, each its own coloured glossy icon. `join`: the code pop-up.
const QUICK = [
    [null, 'Join with Code', 0],
    ['/competitions/open', 'Registration', 1],
    ['/competitions/registered', 'Registered', 2],
    ['/competitions/results?show=certificates', 'My Certificates', 3],
    ['/competitions/leaderboard', 'Leaderboard', 4],
    ['/competitions/teams', 'My Teams', 5]
];
// The reference's pictures (public/competitions/hub/ov-*): the Active Matches banner, its art, the tile icons, the
// Live & Upcoming trophy, and the five games' cards.
const OV = '/competitions/hub/ov-';

/** The page while it loads: the same shapes, pulsing, so it never jumps when the figures arrive. */
const PageSkeleton = () => (
    <div className="space-y-4" aria-busy="true" aria-label="Loading" data-overview-skeleton>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="h-64 animate-pulse rounded-[28px] bg-gradient-to-br from-violet-200 to-violet-100 sm:h-72" />
            <div className="rounded-[28px] border border-violet-100 bg-white p-5">
                <div className="h-6 w-40 animate-pulse rounded-full bg-violet-100" />
                <div className="mt-4 grid grid-cols-3 gap-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-violet-50" />)}</div>
            </div>
        </div>
        <div className="h-16 animate-pulse rounded-[22px] bg-violet-50" />
        <div className="h-7 w-32 animate-pulse rounded-full bg-violet-100" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="aspect-[4/3] animate-pulse rounded-[20px] bg-violet-100" />)}</div>
    </div>
);


export default function Overview() {
    const location = useLocation();
    const list = useLoad(competitionsApi.list);
    const me = useLoad(competitionsApi.me);
    const arena = useLoad(arenaApi.list);
    const [game, setGame] = useState(null);
    const [joining, setJoining] = useState(false);
    // An old /competitions?tab=… link: the page that took that tab's place.
    const moved = pageForTab(location.search);
    if (moved) return <Navigate to={moved} replace />;

    const comps = list.data?.competitions || [];
    const arenas = arena.data || [];
    const live = [...arenas.filter((c) => c.state === 'live').map((c) => ({ arena: c })), ...comps.filter((c) => c.status === 'live').map((c) => ({ c }))];
    // Coming up that I am registered for (2026-11-07: "live, and the upcoming ones whose registration is booked") —
    // the Registered page's rule, less the live ones (already above) and the finished ones.
    const booked = [
        ...arenas.filter((c) => ['approved', 'pending'].includes(c.entryStatus) && !['live', 'ended', 'results'].includes(c.state)).map((c) => ({ arena: c })),
        ...comps.filter((c) => c.myTeam && !['withdrawn', 'rejected'].includes(c.myTeam.status) && !['live', 'completed', 'cancelled'].includes(c.status)).map((c) => ({ c }))
    ];
    const myMatches = me.data ? [...me.data.live, ...me.data.upcoming] : [];
    // Live first (newest first), then my registered ones, the soonest first.
    const at = (f) => new Date((f.arena || f.c).startsAt || 0).getTime();
    const newest = (rows) => [...rows].sort((a, b) => at(b) - at(a));
    const soonest = (rows) => [...rows].sort((a, b) => at(a) - at(b));
    const featured = [...newest(live), ...soonest(booked)].slice(0, 6);
    // Quiz Arena failing to load must not hold the whole page on its skeleton: the competitions still show.
    const ready = list.data && (arena.data || arena.error);
    const games = GAME_IDS.map(gameCard).filter(Boolean);

    const loading = (!me.data && !me.error) || (!ready && !list.error);

    return (
        <HubLayout>
            {list.error && <Failed error={list.error} onRetry={list.reload} />}
            {loading ? <PageSkeleton /> : (<>
            {/* The top (2026-11-06): no "My Active Matches" banner any more. A wide screen: Live & Upcoming on the left,
                Quick actions on the right; a phone: Quick actions first, then Live & Upcoming. A student with matches
                on still gets the violet card listing them, above Live & Upcoming. */}
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                <div className="order-2 min-w-0 space-y-4 lg:order-1">
                    {(me.error || myMatches.length > 0) && (
                    <section className={`relative overflow-hidden rounded-[28px] bg-[radial-gradient(120%_120%_at_0%_0%,#6d28d9_0%,#4c1d95_45%,#2e1065_100%)] p-5 text-white shadow-[0_24px_50px_-22px_rgba(76,29,149,.75)] ring-1 ring-violet-400/30 sm:p-7 ${!me.error && !myMatches.length ? 'lg:hidden' : ''}`} data-active-matches>
                        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(70%_100%_at_70%_100%,rgba(217,70,239,.35),transparent_70%)]" />
                        <div className="relative flex items-center justify-between gap-3">
                            <h2 className="flex min-w-0 flex-1 items-center justify-center gap-2 text-base font-black min-[400px]:text-lg sm:flex-none sm:justify-start sm:text-xl"><span className="hidden shrink-0 text-amber-300 sm:inline" aria-hidden>❦</span><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 ring-inset sm:h-auto sm:w-auto sm:bg-transparent sm:ring-0"><Gamepad2 className="h-[18px] w-[18px] sm:h-6 sm:w-6" /></span><span className="min-w-0 truncate">My Active Matches</span><span className="hidden shrink-0 text-amber-300 sm:inline" aria-hidden>❦</span></h2>
                            <Link to="/competitions/teams" className="hidden shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-black whitespace-nowrap ring-1 ring-white/40 hover:bg-white/10 sm:inline-flex">My Teams <ArrowRight size={14} aria-hidden="true" /></Link>
                        </div>
                        {me.error ? <div className="relative mt-4"><Failed error={me.error} onRetry={me.reload} /></div>
                            : myMatches.length ? <div className="relative mt-4 rounded-2xl bg-white/95 p-3 text-slate-900"><MatchList rows={myMatches.slice(0, 2)} /></div>
                                : (
                                    <div className="relative mt-3 grid items-center gap-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" data-no-matches>
                                        <div>
                                            <p className="text-center text-[1.6rem] leading-[1.1] font-black tracking-tight min-[400px]:text-[1.75rem] sm:text-left sm:text-[2.4rem]">No Active Match<br /><span className="text-[#facc15] italic">Right Now!</span></p>
                                            <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-violet-50/90 sm:mx-0 sm:max-w-none sm:text-left sm:text-base">{me.data.competitions.length ? 'There is no match live or coming up for you at the moment.' : 'You are not in a competition yet. Your college\'s coordinator enters you in a team.'}</p>
                                        </div>
                                        <img src={`${OV}matches-art.png`} alt="" aria-hidden className="order-first mx-auto -my-2 w-[85%] max-w-[17rem] sm:order-none sm:my-0 sm:w-full sm:max-w-xs" style={{ maskImage: 'radial-gradient(closest-side, black 55%, transparent 100%)', WebkitMaskImage: 'radial-gradient(closest-side, black 55%, transparent 100%)' }} />
                                    </div>
                                )}
                    </section>
                    )}
                {/* Live & Upcoming: the cards, or one line saying there are none. */}
                {featured.length ? (
                    <section>
                        <Title icon={Radio}>Live &amp; Upcoming</Title>
                        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
                            {featured.map((f) => (f.arena ? <ArenaGoldCard key={`a-${f.arena.id}`} c={f.arena} /> : <CompetitionCard key={f.c.id} c={f.c} />))}
                        </div>
                    </section>
                ) : (
                    // None live or coming up (2026-11-06): a full card, as tall as Quick actions beside it on a wide screen.
                    <section className="relative flex min-h-[17rem] flex-col overflow-hidden rounded-[28px] border border-violet-100 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(109,40,217,.45)] sm:p-6 lg:min-h-[23.5rem]" data-live-empty>
                        <h2 className="relative inline-flex w-fit items-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#8b3df5] to-[#6420d8] px-5 py-2.5 text-lg font-black text-white shadow-[0_10px_24px_-10px_rgba(100,32,216,.7)] sm:text-xl">
                            <Radio className="h-5 w-5" aria-hidden="true" /> Live &amp; Upcoming
                        </h2>
                        <div className="relative flex flex-1 flex-col items-center justify-center py-6 text-center">
                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-violet-600 ring-8 ring-violet-50 sm:h-20 sm:w-20">
                                <Radio className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden="true" />
                            </span>
                            <p className="mt-4 text-xl font-black text-[#14102e] sm:text-2xl">Nothing live or booked right now</p>
                            <p className="mt-1 max-w-md text-sm text-slate-600 sm:text-base">Live competitions, and the upcoming ones you are registered for, appear here.</p>
                            <Link to="/competitions/open" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-violet-500/30 hover:bg-violet-700">
                                See open registrations <ArrowRight size={15} aria-hidden="true" />
                            </Link>
                        </div>
                    </section>
                )}
                </div>

                {/* Quick Actions: six tiles. */}
                <section className="order-1 rounded-[28px] border border-violet-100 bg-white p-4 lg:order-2 lg:sticky lg:top-20 shadow-[0_18px_40px_-24px_rgba(109,40,217,.45)] sm:p-5" data-quick-actions>
                    <h2 className="relative inline-flex items-center gap-2.5 pb-1.5 text-xl font-black text-[#14102e] sm:text-2xl"><Zap className="h-7 w-7 text-violet-600" strokeWidth={2.4} aria-hidden="true" /> Quick Actions
                        <span aria-hidden className="absolute -bottom-0.5 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-transparent" /></h2>
                    <div className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
                        {QUICK.map(([to, label, Icon]) => {
                            const inner = (<>
                                <img src={`${OV}q${Icon}.png`} alt="" aria-hidden className="h-12 w-12 mix-blend-multiply sm:h-14 sm:w-14" />
                                <span className="text-center text-[11px] leading-tight font-black text-slate-800 sm:text-xs">{label}</span>
                            </>);
                            const cls = 'flex min-h-[6.25rem] flex-col items-center justify-center gap-2 rounded-2xl bg-white p-2 shadow-[0_10px_22px_-14px_rgba(76,29,149,.5),0_0_0_1px_rgba(221,214,254,.8)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_26px_-14px_rgba(76,29,149,.6),0_0_0_1px_rgba(196,181,253,1)]';
                            return to
                                ? <Link key={label} to={to} className={cls}>{inner}</Link>
                                : <button key={label} type="button" onClick={() => setJoining(true)} className={cls} data-join-code-open>{inner}</button>;
                        })}
                    </div>
                </section>
            </div>

            <section>
                <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2.5 text-2xl font-black text-[#14102e]"><Gamepad2 className="h-8 w-8 text-violet-600" strokeWidth={2.2} aria-hidden="true" /> <span className="border-b-[3px] border-violet-600 pb-0.5">Games</span></h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
                    {games.map((g) => (
                        <button key={g.id} type="button" onClick={() => setGame(g)} aria-label={`${g.label}: rules`} data-game-preview={g.id}
                            className="group block overflow-hidden rounded-[22px] bg-white shadow-[0_16px_30px_-14px_rgba(30,20,80,.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-14px_rgba(30,20,80,.6)]">
                            <img src={`${OV}game-${g.id}.jpg`} alt="" loading="lazy" className="block w-full transition-transform duration-500 group-hover:scale-[1.03]" style={{ aspectRatio: '405 / 330' }} />
                        </button>
                    ))}
                </div>
            </section>

            <CalendarView compact />
            </>)}

            {game && <GamePopup game={game} onClose={() => setGame(null)} />}
            {joining && (
                <Portal>
                    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setJoining(false)}>
                        <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Join with code" className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
                            <button type="button" onClick={() => setJoining(false)} aria-label="Close" className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                            <JoinWithCode />
                        </div>
                    </div>
                </Portal>
            )}
        </HubLayout>
    );
}
