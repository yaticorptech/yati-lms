/**
 * Competitions, the section's first page (2026-11-04), laid out as the reference: my active matches and quick
 * actions; the live and upcoming competitions (a single line when there are none); the five games as big picture
 * cards, each opening its rules on a dark 3D card (GamePopup); and the calendar, small, beside this month's events.
 * Everything from the server.
 */
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CalendarClock, Swords, ArrowRight, Ticket, Loader2, ChevronRight, Trophy, Award, Crown, Gamepad2, Zap } from 'lucide-react';
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

const OPEN = ['registration-open', 'closing-soon', 'registration-soon'];
const SOON = ['upcoming'];

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

const QUICK = [
    ['/competitions/open', 'Registration', Trophy],
    ['/competitions/upcoming', 'Coming up', CalendarClock],
    ['/competitions/results?show=certificates', 'My certificates', Award],
    ['/competitions/leaderboard', 'Leaderboard', Crown]
];

/** A game as a big picture card: its own picture, and its name on a bar in its colour. */
const GameTile = ({ g, onOpen }) => (
    <button type="button" onClick={() => onOpen(g)} data-game-preview={g.id}
        className="group relative block overflow-hidden rounded-[20px] text-left shadow-[0_16px_30px_-14px_rgba(30,20,80,.55),0_0_0_1px_rgba(255,255,255,.6)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_40px_-14px_rgba(30,20,80,.6)] [perspective:900px]">
        <img src={g.image} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <span className={`absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-r ${g.bar} px-3 py-2.5 text-white backdrop-blur-sm sm:px-4 sm:py-3`}>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/90 p-1 shadow"><img src={g.icon} alt="" className="h-full w-full object-contain" /></span>
            <span className="min-w-0 flex-1 truncate text-sm font-black tracking-tight drop-shadow sm:text-base">{g.label}</span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/40 transition-transform group-hover:translate-x-0.5"><ArrowRight size={14} aria-hidden="true" /></span>
        </span>
    </button>
);

export default function Overview() {
    const location = useLocation();
    const list = useLoad(competitionsApi.list);
    const me = useLoad(competitionsApi.me);
    const arena = useLoad(arenaApi.list);
    const [game, setGame] = useState(null);
    // An old /competitions?tab=… link: the page that took that tab's place.
    const moved = pageForTab(location.search);
    if (moved) return <Navigate to={moved} replace />;

    const comps = list.data?.competitions || [];
    const arenas = arena.data || [];
    const live = [...arenas.filter((c) => c.state === 'live').map((c) => ({ arena: c })), ...comps.filter((c) => c.status === 'live').map((c) => ({ c }))];
    const open = [...arenas.filter((c) => c.state === 'registration').map((c) => ({ arena: c })), ...comps.filter((c) => OPEN.includes(c.phase)).map((c) => ({ c }))];
    const soon = [...arenas.filter((c) => c.state === 'upcoming').map((c) => ({ arena: c })), ...comps.filter((c) => SOON.includes(c.phase)).map((c) => ({ c }))];
    const myMatches = me.data ? [...me.data.live, ...me.data.upcoming] : [];
    const featured = [...live, ...open, ...soon].slice(0, 3);
    const ready = list.data && arena.data;
    const games = GAME_IDS.map(gameCard).filter(Boolean);

    return (
        <HubLayout>
            {list.error && <Failed error={list.error} onRetry={list.reload} />}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <section className={`${PANEL} p-4 sm:p-5`}>
                    <Title icon={Swords} aside={<Link to="/competitions/teams" className="inline-flex items-center gap-1 text-sm font-black text-violet-700 hover:underline">My Teams <ArrowRight size={15} aria-hidden="true" /></Link>}>My active matches</Title>
                    <div className="border-t border-violet-100 pt-3">
                        {me.error ? <Failed error={me.error} onRetry={me.reload} />
                            : !me.data ? <div className="h-40 animate-pulse rounded-2xl bg-violet-50" />
                                : myMatches.length ? <MatchList rows={myMatches.slice(0, 3)} />
                                    : (
                                        <div className="flex flex-col items-center py-2 text-center" data-no-matches>
                                            <img src="/competitions/hub/empty-matches.png" alt="" className="h-32 w-auto mix-blend-multiply drop-shadow-[0_18px_20px_rgba(124,58,237,.25)] sm:h-36" />
                                            <p className="mt-2 text-sm font-bold text-slate-600 sm:text-base">{me.data.competitions.length ? 'No match is live or coming up for you right now.' : 'You are not in a competition yet. Your college\'s coordinator enters you in a team.'}</p>
                                        </div>
                                    )}
                    </div>
                </section>
                <section className={`${PANEL} p-4 sm:p-5`}>
                    <Title icon={Zap}>Quick actions</Title>
                    <JoinWithCode />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        {QUICK.map(([to, label, Icon]) => (
                            <Link key={to} to={to} className="flex min-h-12 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black leading-tight text-slate-800 shadow-[0_6px_14px_-8px_rgba(76,29,149,.35),0_0_0_1px_rgba(221,214,254,.8)] transition hover:-translate-y-0.5 hover:text-violet-700">
                                <Icon size={20} className="shrink-0 text-violet-600" strokeWidth={2.4} aria-hidden="true" /> {label}
                            </Link>
                        ))}
                    </div>
                </section>
            </div>

            {/* Live and upcoming: the cards, or one line saying there are none. */}
            {!ready ? <CardGridSkeleton /> : featured.length ? (
                <section>
                    <Title icon={Trophy}>Live and upcoming</Title>
                    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {featured.map((f) => (f.arena ? <ArenaGoldCard key={`a-${f.arena.id}`} c={f.arena} /> : <CompetitionCard key={f.c.id} c={f.c} />))}
                    </div>
                </section>
            ) : (
                <section className={`${PANEL} flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-5 sm:px-6`} data-live-upcoming>
                    <h2 className="flex shrink-0 items-center gap-2 text-base font-black text-slate-900 sm:text-lg"><Trophy size={20} className="text-violet-600" strokeWidth={2.4} aria-hidden="true" /> Live and upcoming</h2>
                    <span aria-hidden="true" className="hidden h-7 w-px bg-violet-200 sm:block" />
                    <p className="text-sm text-slate-600">No competition is live or coming up right now. New ones appear here as soon as they are published.</p>
                </section>
            )}

            <section>
                <Title icon={Gamepad2}>Games</Title>
                <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {games.map((g) => <GameTile key={g.id} g={g} onOpen={setGame} />)}
                </div>
            </section>

            <CalendarView compact />

            {game && <GamePopup game={game} onClose={() => setGame(null)} />}
        </HubLayout>
    );
}
