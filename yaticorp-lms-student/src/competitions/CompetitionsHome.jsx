/**
 * The Competitions section's parts (2026-11-04): what were the six tabs of one page — Games, Competitions, My
 * Games, Leaderboard, Results and Certificates — each now the body of a page of its own (hub/, with the section's
 * navigation), and the loading, empty and error states they share. The old ?tab= addresses lead to those pages
 * (pageForTab, at the end).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useLive from '../live/useLive';
import useLoad from './hub/useLoad';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Gamepad2, Trophy, UserCheck, BarChart3, History, Users, UsersRound, Crown, CalendarClock, Building2, Loader2,
    ArrowRight, Award, Download, Medal, Clock, Gift, Search, ChevronRight, Link2, Ticket, Landmark, CalendarDays, Radio, ClipboardList, CheckCircle2, Lock, X, Brain, Code2, Layers
, Zap
, FileText
} from 'lucide-react';
import { competitionsApi, GAMES, GAME_BUTTON, PHASE, ORDINAL, fmtDateTime, fmtDate, gameImage, gameIcon } from './api';
import { StatusChip, GameChip, MatchCard, Empty } from './parts';
import { arenaApi } from './arena/api';
import PriceTag from '../components/rewards/PriceTag';
import CertificateInline from './CertificateInline';
import { CardGridSkeleton, ListSkeleton } from './Skeletons';

/** A quiz's or hackathon's picture, drawn (they have no photo): its colours and its sign. */
const ART = { quiz: Brain, hackathon: Code2 };


export const Box = ({ children, className = '' }) => <section className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>{children}</section>;
export const Heading = ({ icon: Icon, children, aside }) => (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black text-slate-900 sm:text-lg"><Icon size={18} className="text-indigo-600" aria-hidden="true" /> {children}</h2>
        {aside}
    </div>
);
export const Failed = ({ error, onRetry }) => (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error} <button type="button" onClick={onRetry} className="ml-2 font-bold underline">Try again</button>
    </div>
);
/** While a tab loads: its cards' outline, or a list's. */
export const Loading = ({ list = false }) => (list ? <ListSkeleton /> : <CardGridSkeleton />);

/* ── Games ───────────────────────────────────────────────────────────── */

/**
 * One game's card: its picture (with the players badge drawn in), then the
 * icon, title, details, a two-line description and the same purple
 * "See competitions" button on every card. Cards in a row line up: the
 * description keeps two lines' room and the button sits at the bottom.
 * A picture that fails to load gives way to the game's colour and a badge.
 * A quiz and a hackathon have no photo: `art`, their icon, is drawn instead.
 */
/**
 * Each game's own colours on its card (asked 2026-10-28, from a picture): a
 * soft tint behind the words, the details line and the button in the game's
 * colour — Chess warm brown, Rapid Fire red, Code Clash green, Brain Sprint
 * and Quiz Arena violet.
 */
const CARD_THEME = {
    chess: { bg: 'linear-gradient(180deg, #fdf3ea 0%, #fffaf5 100%)', title: '#3b1a0b', meta: '#c2410c', button: 'linear-gradient(90deg, #7c3a12, #c2641f)', shadow: 'rgba(160,82,30,.35)' },
    rapidfire: { bg: 'linear-gradient(180deg, #fdeeee 0%, #fff8f8 100%)', title: '#3f0d0d', meta: '#dc2626', button: 'linear-gradient(90deg, #b91c1c, #ef4444)', shadow: 'rgba(220,38,38,.35)' },
    codeclash: { bg: 'linear-gradient(180deg, #ebf7ef 0%, #f7fcf8 100%)', title: '#0b2e1a', meta: '#16a34a', button: 'linear-gradient(90deg, #14532d, #1f7a40)', shadow: 'rgba(21,128,61,.35)' },
    brainsprint: { bg: 'linear-gradient(180deg, #fdf3ea 0%, #fffaf5 100%)', title: '#3b1a0b', meta: '#ea580c', button: 'linear-gradient(90deg, #ea580c, #f59e0b)', shadow: 'rgba(234,88,12,.35)' },
    quizarena: { bg: 'linear-gradient(180deg, #f1f0ff 0%, #f9f8ff 100%)', title: '#1e1b6b', meta: '#4f46e5', button: 'linear-gradient(90deg, #4338ca, #7c3aed)', shadow: 'rgba(79,70,229,.35)' }
};

const FOCUS = { chess: '50% 20%', rapidfire: '50% 20%', codeclash: '50% 40%', brainsprint: '8% 50%', quizarena: '0% 50%' };

const GameCard = ({ id, label, image, icon, art: Art = null, meta, blurb, tone, onOpen, className = '' }) => {
    // Every card's picture has one shape, so all five cards match; each photo
    // is framed on its subject (the king's crown, the cube, the books).
    const pic = 'pb-[46%]';
    const [broken, setBroken] = useState(false);
    const t = CARD_THEME[id] || CARD_THEME.quizarena;
    return (
        <article data-game={id} className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[20px] shadow-[0_4px_16px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(15,23,42,0.16)] motion-reduce:hover:translate-y-0 ${className}`} style={{ background: t.bg }}>
            <div className={`relative w-full overflow-hidden bg-gradient-to-br ${tone}`}>
                {Art ? (
                    <span aria-hidden="true" className={`relative block ${pic}`}>
                        <Art className="absolute left-[8%] top-1/2 h-[60%] w-auto -translate-y-1/2 text-white/90 drop-shadow-lg" strokeWidth={1.6} />
                        <Art className="absolute -bottom-6 right-[18%] h-[90%] w-auto rotate-12 text-white/10" strokeWidth={1.2} />
                    </span>
                ) : broken
                    ? <span aria-hidden="true" className={`block ${pic}`} />
                    : <span className={`relative block ${pic}`}><img src={image} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: FOCUS[id] || 'center' }} /></span>}
            </div>
            <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-4">
                    {Art
                        ? <span aria-hidden="true" className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${tone}`}><Art size={26} /></span>
                        : <img src={icon} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover shadow-md" />}
                    <div className="min-w-0">
                        <h3 className="text-xl font-black leading-tight" style={{ color: t.title }}>{label}</h3>
                        <p className="truncate text-sm font-semibold" style={{ color: t.meta }}>{meta}</p>
                    </div>
                </div>
                <p className="mt-3 line-clamp-2 min-h-[2.75rem] flex-1 text-sm leading-snug text-slate-700">{blurb}</p>
                <button type="button" onClick={onOpen} data-see-competitions={id}
                    className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] mt-4 flex min-h-12 w-full items-center justify-between rounded-2xl px-5 text-base font-bold text-white transition-[filter] hover:brightness-110"
                    style={{ background: t.button, boxShadow: `0 8px 18px ${t.shadow}` }}>
                    <span className="inline-flex items-center gap-3"><Trophy size={18} aria-hidden="true" /> See competitions</span>
                    <ArrowRight size={18} aria-hidden="true" />
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
        <GameCard id="quizarena" label="Quiz Arena" image={gameImage('quizarena')} icon="/games/quizarena-icon.png" tone="from-indigo-600 to-fuchsia-700"
            players="Individual" meta="Everyone at once · 25 questions · 15 s each"
            blurb={next
                ? `${next.state === 'live' ? 'Live now' : next.state === 'registration' ? 'Entries open' : 'Starting soon'}: ${next.title} · ${fmtDateTime(next.startsAt)}${next.entryStatus === 'approved' ? ' · you are in' : ''}`
                : 'Live Quiz Battle, Picture Challenge and Current Affairs Clash. Your college enters you.'}
            onOpen={() => navigate('/competitions/games/quizarena')} />
    );
};

// Search: a game's name, or words about it.
const ARENA_SEARCH = 'quiz arena general knowledge gk current affairs picture challenge live quiz battle';
const matches = (text, q) => !q || q.split(/\s+/).every((w) => text.toLowerCase().includes(w));

export const GamesTab = () => {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    // A joining code for any competition, whatever its game: straight into it.
    const join = (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        competitionsApi.joinMatch(code).then((r) => navigate(r.arena ? `/competitions/arena/${r.arena.id}/play` : `/competitions/play/${r.game.id}`))
            .catch((err) => setError(err.message)).finally(() => setBusy(false));
    };
    // A game's competitions: the Competitions tab, filtered to it.
    const competitionsOf = (game) => navigate(game ? `/competitions/games/${game}` : '/competitions/open');
    const term = q.trim().toLowerCase();
    const games = Object.entries(GAMES).filter(([, g]) => matches(`${g.label} ${g.keywords || ''} ${g.blurb}`, term));
    const showArena = matches(ARENA_SEARCH, term);
    const names = [...Object.values(GAMES).map((g) => g.label), 'Quiz Arena'];

    return (
        <div className="flex flex-col gap-3">
            {/* Join with a code, and how to play for your college: first, above the games (asked 2026-10-28). */}
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_1fr]">
                {/* A competition match's code, from My Games or the coordinator. */}
                <section className="relative flex flex-col justify-center overflow-hidden rounded-[18px] bg-gradient-to-br from-violet-50 via-indigo-50/70 to-fuchsia-50/60 p-3.5 ring-1 ring-violet-100" data-join-code>
                    <UsersRound size={48} aria-hidden="true" className="pointer-events-none absolute right-5 top-3 text-indigo-200/60" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-violet-100/60" />
                    <div className="relative">
                        <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Link2 size={18} className="text-indigo-600" aria-hidden="true" /> Join with a code</h2>
                        <p className="mt-0.5 truncate pr-12 text-xs text-slate-600" title="Works for every game: Chess, Rapid Fire, Code Clash, Brain Sprint and Quiz Arena.">Enter your 6-character code to join your competition — any of the 5 games.</p>
                        <form onSubmit={join} className="mt-2.5 flex flex-wrap gap-2.5">
                            <label className="relative min-w-0 flex-1 basis-48">
                                <span className="sr-only">Joining code</span>
                                <Ticket size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                                    placeholder="Enter code (e.g. K7Q2XM)" inputMode="text" autoCapitalize="characters"
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 font-mono text-[15px] tracking-[0.25em] text-slate-900 shadow-sm placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                            </label>
                            <button type="submit" disabled={code.length !== 6 || busy}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 disabled:opacity-50">
                                {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : null} Join <ChevronRight size={16} aria-hidden="true" />
                            </button>
                        </form>
                        {error && <p role="alert" className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                    </div>
                </section>

                {/* How the games are played now: in competitions, for a college. */}
                <section className="flex flex-col justify-center rounded-[18px] bg-white p-3.5 shadow-sm ring-1 ring-slate-100" data-how-to-play>
                    <h2 className="flex items-center gap-2 text-base font-black text-slate-900"><Building2 size={18} className="text-indigo-600" aria-hidden="true" /> Play for your college</h2>
                    <p className="mt-0.5 truncate text-xs text-slate-600">Your college enters you in a team; it appears in My Teams.</p>
                    <div className="mt-2.5 flex flex-wrap gap-2.5">
                        <button type="button" onClick={() => competitionsOf(null)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700">
                            <Trophy size={15} aria-hidden="true" /> See competitions <ChevronRight size={16} aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => navigate('/competitions/teams')} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-100 hover:bg-indigo-50">
                            <UserCheck size={15} aria-hidden="true" /> My Teams
                        </button>
                    </div>
                </section>
            </div>

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
            {/* Three to a row, all five the same size. */}
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                {games.map(([id, g]) => (
                    <GameCard key={id} id={id} label={g.label} art={ART[g.art] || null} image={gameImage(id)} icon={gameIcon(id)} tone={g.tone}
                        players={g.players.replace('players', 'Players')} meta={g.format ? `${g.players} · ${g.format}` : g.players} blurb={g.blurb}
                        onOpen={() => navigate(`/competitions/games/${id}`)} />
                ))}
                {/* Quiz Arena: the three-round live quiz, played alone, everyone at once. */}
                {showArena && <QuizArenaCard />}
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
// The same sharp pictures as the game cards above (asked 2026-10-28: the competition cards look like them).
const cardImage = (game) => gameImage(game);
const chipIcon = (game) => `/competitions/chip-${game}.png`;
/** A game's small badge: its picture, or for a quiz and a hackathon (no picture) its icon. */
export const ChipIcon = ({ game, className }) => {
    const Art = ART[game];
    return Art ? <Art className={className} aria-hidden="true" /> : <img src={chipIcon(game)} alt="" className={`${className} object-contain`} />;
};

/**
 * A competition as a card: its picture with its status and its game's badge,
 * the game, the name and organizer, colleges, players and date, and View.
 * Shared by the inter-college competitions and Quiz Arena.
 */
// Each game's chip on a competition card: its sign, in its colour.
const CARD_CHIP = {
    quizarena: ['🧠', 'bg-[#fdf0f3] text-[#1e1b3a]'],
    codeclash: [<Code2 key="c" size={16} strokeWidth={2.6} />, 'bg-[#f1f2f7] text-[#1e1b3a]'],
    chess: ['♟', 'bg-[#f1f2f7] text-[#1e1b3a]'],
    rapidfire: [<span key="r" className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-orange-400 text-[11px] text-white">⚡</span>, 'bg-[#fff4e8] text-[#1e1b3a]'],
    brainsprint: ['🧩', 'bg-[#eef6ff] text-[#1e1b3a]']
};
// The reference's own portrait pictures (public/competitions/hub/card-<id>); Brain Sprint's from its game art.
const CARD_ART = { quizarena: 1, codeclash: 1, chess: 1, rapidfire: 1 };

/**
 * A competition as a card (2026-11-04, as the reference): its game's picture on the left, and on the right the game,
 * the name, who organised it, two facts side by side, the date, and View Competition. All one size.
 */
const GoldCard = ({ game, gameLabel, bannerUrl, name, organizedBy, stats, extra, to, linkData }) => {
    const [broken, setBroken] = useState(false);
    const [sign, chip] = CARD_CHIP[game] || [<Trophy key="t" size={15} />, 'bg-slate-100 text-slate-800'];
    const facts = stats.slice(0, 2);
    const when = stats[2];
    const WhenIcon = when?.[0];
    return (
        <article {...linkData} className="group relative grid h-full cursor-pointer grid-cols-[minmax(0,36%)_minmax(0,1fr)] gap-4 overflow-hidden rounded-[24px] border border-[#ecebf5] bg-white p-4 shadow-[0_12px_30px_-20px_rgba(76,64,160,.35)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(76,64,160,.5)] sm:gap-5 sm:p-5">
            <div className="relative min-h-[12rem] overflow-hidden rounded-[18px] bg-[#16123f] shadow-[0_10px_22px_-12px_rgba(0,0,0,.55)]">
                {!bannerUrl && ART[game] ? (
                    <span aria-hidden="true" className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${GAMES[game].tone}`}>{(() => { const Art = ART[game]; return <Art className="h-1/2 w-auto text-white/90" strokeWidth={1.6} />; })()}</span>
                ) : !broken && <img src={bannerUrl || (CARD_ART[game] ? `/competitions/hub/card-${game}.jpg` : cardImage(game))} alt="" loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />}
            </div>
            <div className="flex min-w-0 flex-col">
                <span className={`inline-flex w-fit max-w-full items-center gap-2 truncate rounded-full px-3 py-1 text-xs font-bold sm:text-sm ${chip}`}><span aria-hidden="true" className="flex items-center">{sign}</span> {gameLabel}</span>
                <h3 className="mt-2.5 line-clamp-2 text-base font-black leading-tight tracking-tight text-[#14102e] sm:text-xl">{name}</h3>
                <p className="mt-1 truncate text-xs text-[#8b8aa3] sm:text-sm">Organized by {organizedBy}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2.5">
                    {facts.map(([Icon, value, label]) => (
                        <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl bg-[#f6f6fb] px-3 py-2.5">
                            <Icon size={19} aria-hidden="true" className="shrink-0 text-[#4f46e5]" strokeWidth={2} />
                            <dd className="min-w-0 truncate text-xs font-bold text-[#1e1b3a] sm:text-[15px]">{value} <dt className="inline font-semibold">{label === 'Questions' ? 'Qs' : label}</dt></dd>
                        </div>
                    ))}
                    {when && (
                        <div className="col-span-2 flex min-w-0 items-center gap-2 rounded-xl bg-[#f6f6fb] px-3 py-2.5">
                            <WhenIcon size={19} aria-hidden="true" className="shrink-0 text-[#4f46e5]" strokeWidth={2} />
                            <dd className="min-w-0 truncate text-xs font-bold text-[#1e1b3a] sm:text-[15px]">{when[1]}</dd>
                        </div>
                    )}
                </dl>
                {extra}
                <span aria-hidden="true" className="block h-3 shrink-0" />
                <Link to={to} className="after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#c9c3f3] bg-[#f3f1ff] px-3 text-sm font-black text-[#3b2fc0] transition-colors group-hover:border-[#3b2bc4] group-hover:bg-[#3b2bc4] group-hover:text-white sm:min-h-12 sm:text-base">
                    View Competition <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1" />
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
                c.endsAt ? [Clock, dateOnly(c.endsAt), c.kind === 'quiz' ? 'Closes' : c.kind === 'hackathon' ? 'Due' : 'Ends'] :[CalendarDays, `${dateOnly(c.startsAt)}, ${timeOnly(c.startsAt)}`, 'Date']
            ]}
        extra={(c.myTeam || ['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase)) && (
            <p className="mt-3 space-x-3 text-[13px] text-slate-600">
                {['registration-open', 'closing-soon', 'registration-soon'].includes(c.phase) && <span>Register by <b className="font-semibold">{fmtDateTime(c.registrationDeadline)}</b></span>}
                {c.myTeam && <span className="font-bold" style={{ color: GOLD.chipText }}>{c.myTeam.solo ? 'You are signed up' : `Your team: ${c.myTeam.teamName}`}</span>}
            </p>
        )} />
);

/** A Quiz Arena contest, in the same card. */
export const ArenaGoldCard = ({ c }) => (
    <GoldCard game="quizarena" gameLabel="Quiz Arena" live={c.state === 'live'} bannerUrl={c.bannerUrl} status={{ live: 'Live', registration: 'Registration Open', upcoming: 'Registration closed', ended: 'Results coming', results: 'Completed', cancelled: 'Closed' }[c.state] || 'Upcoming'} closed={c.state === 'cancelled'}
        name={c.title} organizedBy={c.organizedBy} to={`/competitions/arena/${c.id}`} linkData={{ 'data-arena': c.id }}
        stats={[
            [FileText, c.questions, 'Questions'],
            [Users, c.registeredCount || 0, c.registeredCount === 1 ? 'Player' : 'Players'],
            [CalendarDays, `${dateOnly(c.startsAt)}, ${timeOnly(c.startsAt)}`, 'Date']
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

export const CompetitionsTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const [params, setParams] = useSearchParams();
    // Search (2026-11-04): a competition's name, organiser, game or the colleges in it.
    const [q, setQ] = useState('');
    const term = q.trim().toLowerCase();
    // A game picked on the Games tab ("See competitions") narrows the list; ✕ clears it.
    const game = GAMES[params.get('game')] || params.get('game') === 'quizarena' ? params.get('game') : 'all';
    const [view, setView] = useState(null);
    const filtersRef = useRef(null);
    useChosenInView(filtersRef, view, '[aria-pressed="true"]');
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    const list = game === 'quizarena' ? [] : data.competitions.filter((c) => (game === 'all' || c.game === game) && matches(`${c.name} ${c.organizedBy || ''} ${c.gameLabel || ''} ${(c.colleges || []).join(' ')}`, term));
    const arenas = (game === 'all' || game === 'quizarena') ? (arena.data || []).filter((c) => matches(`${c.title} ${c.organizedBy || ''} quiz arena`, term)) : [];
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
            <label className="relative block w-full sm:max-w-sm">
                <span className="sr-only">Search competitions</span>
                <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, organiser or college" type="search" data-competition-search
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </label>
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
                <Empty icon={Trophy} title={term ? `No ${label.toLowerCase()} competitions match “${q.trim()}”` : `No ${label.toLowerCase()} competitions${game === 'all' ? '' : ` for ${GAMES[game]?.label || 'Quiz Arena'}`}`}>
                    {current === 'live' ? 'Competitions appear here while their matches are being played.' : current === 'registration' ? 'Competitions taking registrations, or waiting to start, appear here.' : current === 'completed' ? 'Finished competitions appear here.' : 'Competitions closed for good by the organizer appear here.'}
                </Empty>
            ) : (
                <div data-view-list={current}>
                    <h3 className="mb-3 flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.2em] text-slate-600 sm:mb-4 sm:gap-3 sm:text-sm sm:tracking-[0.3em]"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${current === 'closed' ? 'bg-slate-400' : 'bg-[#4f46e5]'}`} /> {current === 'live' ? 'Live now' : label}</h3>
                    {/* Three to a row, the same size as the game cards. */}
                    <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {ars.map((c) => <ArenaGoldCard key={`a-${c.id}`} c={c} />)}
                        {rows.map((c) => <CompetitionCard key={c.id} c={c} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── My games ─────────────────────────────────────────────────────────── */

export const MatchList = ({ rows, empty }) => (rows.length
    ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((m) => <MatchCard key={m.id} match={m} playing={m.playing} myTeamId={m.myTeamId} showCompetition />)}</div>
    : <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{empty}</p>);

const MINE_TABS = [['registered', 'Registered'], ['upcoming', 'Upcoming'], ['live', 'Live'], ['completed', 'Completed']];

export const MineTab = () => {
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
                        {[...data.competitions].sort((a, b) => new Date(b.startsAt || 0) - new Date(a.startsAt || 0)).map((c) => (
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
/** The top three's colours: gold, silver, bronze — the rank badge and a soft tint on the row. */
const PODIUM = {
    1: { badge: 'linear-gradient(135deg, #fde68a, #f59e0b)', ink: '#78350f', row: 'linear-gradient(90deg, #fffbeb, #ffffff 60%)', ring: '#fde68a' },
    2: { badge: 'linear-gradient(135deg, #f1f5f9, #94a3b8)', ink: '#1e293b', row: 'linear-gradient(90deg, #f8fafc, #ffffff 60%)', ring: '#e2e8f0' },
    3: { badge: 'linear-gradient(135deg, #fed7aa, #c2410c)', ink: '#431407', row: 'linear-gradient(90deg, #fff7ed, #ffffff 60%)', ring: '#fed7aa' }
};

/** Rankings shown before the list scrolls (the user's choice, 2026-10-14). */
const RANKS_SHOWN = 2;
const ROW_GAP = 10;
const RANK_NOUN = { colleges: ['college', 'colleges'], teams: ['team', 'teams'], players: ['player', 'players'] };

/** One highlighted figure: won, played, titles, place. */
const StatPill = ({ icon: Icon, value, label, tone }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold ring-1 ${tone}`}>
        <Icon size={14} aria-hidden="true" className="shrink-0" />
        <span className="text-sm font-black tabular-nums">{value}</span> {label}
    </span>
);

export const LeaderboardTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.leaderboard);
    const [board, setBoard] = useState('colleges');
    // Every one of them, listed in full (2026-11-04): no inner scroll.
    const rows = data?.[board] || [];
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading list />;
    const label = (r) => (board === 'colleges' ? r.collegeName : board === 'teams' ? r.teamName : r.name);
    // A team's line leads with its college (2026-11-04), then the competition.
    const second = (r) => (board === 'colleges' ? `${r.competitions} Competition${r.competitions === 1 ? '' : 's'}` : board === 'teams' ? [r.collegeName, r.competition].filter(Boolean).join(' · ') : r.collegeName);
    const RowIcon = board === 'colleges' ? Building2 : board === 'teams' ? Users : UserCheck;
    const head = board === 'colleges' ? ['College', 'Competitions'] : board === 'teams' ? ['Team', 'Competition'] : ['Player', 'College'];
    // The rank as a medal: gold and silver as the reference draws them, bronze tinted from the silver.
    const Medal1 = ({ rank }) => (rank <= 3
        ? <span className="relative flex h-9 w-10 items-center justify-center sm:h-12 sm:w-14">
            <img src={`/competitions/hub/lb-r${rank === 1 ? 1 : 2}.png`} alt="" aria-hidden className="absolute inset-0 h-full w-full object-contain mix-blend-multiply" style={rank === 3 ? { filter: 'sepia(1) saturate(2.6) hue-rotate(-18deg) brightness(.92)' } : undefined} />
        </span>
        : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-600 sm:h-11 sm:w-11 sm:text-base">{rank}</span>);
    return (
        <section className="rounded-[26px] border border-violet-100 bg-white p-3 shadow-[0_18px_40px_-26px_rgba(109,40,217,.45)] sm:p-5" data-leaderboard>
            <div className="mb-4 flex gap-2" role="tablist" aria-label="Ranking">
                {BOARDS.map((b) => (
                    <button key={b.id} type="button" role="tab" aria-selected={board === b.id} onClick={() => setBoard(b.id)}
                        className={`inline-flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-3 text-sm font-bold transition-colors sm:flex-none sm:px-7 sm:text-base ${board === b.id ? 'bg-gradient-to-b from-[#7c3aed] to-[#5b21b6] text-white shadow-[0_10px_22px_-10px_rgba(91,33,182,.8)]' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-violet-50'}`}>
                        <b.icon size={19} aria-hidden="true" className="hidden shrink-0 min-[380px]:block" /> {b.label}
                    </button>
                ))}
            </div>
            {rows.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No results yet. Rankings fill in as matches are played.</p> : (<>
                {/* The column names, on a wide screen. */}
                <div className="mb-2 hidden grid-cols-[4.5rem_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.8fr)_8.5rem] items-center gap-2 text-sm font-semibold text-slate-600 lg:grid">
                    <span className="rounded-xl bg-slate-50 py-2 text-center">#</span>
                    <span className="rounded-xl bg-slate-50 px-6 py-2">{head[0]}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">{head[1]}</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2">Performance</span>
                    <span className="rounded-xl bg-slate-50 px-3 py-2 text-right">Points</span>
                </div>
                <ol className="flex flex-col gap-2 pt-4 sm:gap-2.5" data-ranking={board}>
                    {rows.map((r) => (
                        <li key={r.id} className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-2xl px-2 py-1.5 ring-1 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:p-3 lg:grid-cols-[4.5rem_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.8fr)_8.5rem] ${r.rank === 1 ? 'bg-gradient-to-r from-[#fff6e0] via-[#fffaf0] to-[#fff6e6] ring-amber-200' : 'bg-white ring-slate-200'}`}>
                            <span className="flex justify-center"><Medal1 rank={r.rank} /></span>
                            <span className="flex min-w-0 items-center gap-3 lg:px-3">
                                <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-white to-slate-50 text-slate-600 shadow-[0_6px_14px_-8px_rgba(15,23,42,.4)] ring-1 ring-slate-200 sm:flex"><RowIcon size={22} aria-hidden="true" /></span>
                                <span className="min-w-0">
                                    <span className="block break-words text-sm font-black leading-tight text-slate-900 sm:text-lg">{label(r)}</span>
                                    <span className="mt-0.5 block break-words text-[11px] leading-snug text-slate-600 lg:hidden">{second(r)} · {r.won} won · {r.played} played{r.titles ? ` · ${r.titles} ${r.titles === 1 ? 'title' : 'titles'}` : ''}</span>
                                </span>
                            </span>
                            <span className="hidden items-center gap-2 border-r border-slate-200 px-3 text-sm text-slate-700 lg:flex"><Layers size={20} className="shrink-0 text-slate-600" aria-hidden="true" /><span className="break-words leading-snug">{second(r)}</span></span>
                            {/* Points: the slanted violet plate, a crown on the leader's. */}
                            <span className="relative flex justify-end lg:order-last">
                                {r.rank === 1 && <Crown aria-hidden className="absolute -top-3 left-1/2 z-10 h-5 w-5 -translate-x-1/2 fill-amber-400 text-amber-500 drop-shadow-[0_2px_3px_rgba(180,83,9,.5)] sm:h-7 sm:w-7" strokeWidth={2} />}
                                <span className={`flex min-w-[3.75rem] -skew-x-[12deg] flex-col items-center justify-center rounded-lg px-2.5 py-1 text-white sm:rounded-xl sm:px-4 sm:py-1.5 shadow-[0_10px_22px_-10px_rgba(91,33,182,.8)] sm:min-w-[7rem] sm:py-2 ${r.rank === 1 ? 'bg-gradient-to-br from-[#7c3aed] to-[#4c1d95]' : 'bg-gradient-to-br from-[#6d28d9] to-[#3b1a8f]'}`}>
                                    <span className="skew-x-[12deg] text-lg font-black leading-none tabular-nums sm:text-3xl">{r.points}</span>
                                    <span className="skew-x-[12deg] text-[8px] font-bold uppercase tracking-wide sm:text-xs">Points</span>
                                </span>
                            </span>
                            <span className="hidden flex-wrap items-center gap-2 lg:flex lg:px-3">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 sm:text-sm"><CheckCircle2 size={16} aria-hidden="true" /> {r.won} Won</span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200 sm:text-sm"><Gamepad2 size={16} aria-hidden="true" /> {r.played} Played</span>
                                {r.titles ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200 sm:text-sm"><Trophy size={16} aria-hidden="true" /> {r.titles} {r.titles === 1 ? 'Title' : 'Titles'}</span> : null}
                                {r.place ? <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200 sm:text-sm"><Medal size={16} aria-hidden="true" /> {ORDINAL[r.place]} place</span> : null}
                            </span>
                        </li>
                    ))}
                </ol>
            </>)}
        </section>
    );
};

/* ── Results ──────────────────────────────────────────────────────────── */

const PLACES = [
    { place: 1, label: 'Winner', medal: '#d4a017', soft: '#fdf6e3' },
    { place: 2, label: 'Runner-up', medal: '#94a3b8', soft: '#f5f7fa' },
    { place: 3, label: 'Third place', medal: '#b4652a', soft: '#fbf1ea' }
];

/**
 * A finished competition as a card, all of them one size (asked 2026-10-28:
 * clean and professional, no pictures): a thin gold line on top, the game
 * and date, the name, the top three one under another (always three rows,
 * so every card is as tall), and View Full Results.
 */
// Each game's chip on a result card (2026-11-04): its sign and its name in capitals.
const RESULT_CHIP = { quizarena: [Gamepad2, 'bg-amber-50 text-amber-900'], codeclash: [Code2, 'bg-slate-100 text-slate-800'], rapidfire: [Zap, 'bg-orange-50 text-orange-900'], brainsprint: [Brain, 'bg-sky-50 text-sky-900'], chess: [Crown, 'bg-violet-50 text-violet-900'] };
const MEDAL = { 1: 'from-[#fde68a] to-[#f59e0b] text-[#5b3a03] ring-amber-300', 2: 'from-[#f1f5f9] to-[#a3aec0] text-[#1e293b] ring-slate-300', 3: 'from-[#fdc9a0] to-[#d9773a] text-[#4a1d06] ring-orange-300' };

const ResultCard = ({ game, gameLabel, title, date, winners, mine = null, to, data, featured = false }) => {
    const [Icon, chip] = RESULT_CHIP[game] || [Trophy, 'bg-slate-100 text-slate-800'];
    return (
        <article {...data} className={`group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white p-4 shadow-[0_14px_34px_-22px_rgba(15,23,42,.45)] ring-1 ring-slate-200 transition-shadow hover:shadow-[0_20px_40px_-22px_rgba(15,23,42,.55)] sm:p-5 ${featured ? 'border-l-[3px] border-amber-400' : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex min-w-0 items-center gap-1.5 truncate rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${chip}`}><Icon size={15} aria-hidden="true" className="shrink-0" /> {gameLabel}</span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-600 sm:text-sm"><CalendarDays size={15} aria-hidden="true" /> {fmtDate(date)}</span>
            </div>
            <h3 className="mt-3 line-clamp-2 text-lg font-black leading-snug text-[#0f172a] sm:text-xl">{title}</h3>
            {mine && <p className={`mt-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${mine.rank <= 3 ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-800'}`} data-my-place>
                {mine.rank <= 3 ? `You won ${ORDINAL[mine.rank]} place` : `You finished #${mine.rank}`} · {mine.score} points
            </p>}
            <ol className="mt-3 divide-y divide-slate-100 border-t border-slate-100">
                {[1, 2, 3].map((place) => {
                    const w = winners.find((x) => x.place === place);
                    return (
                        <li key={place} className={`flex items-center gap-3 px-1 py-2.5 ${featured && place === 1 && w ? '-mx-1 rounded-xl bg-gradient-to-r from-[#fff7e6] to-transparent px-2' : ''}`}>
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b text-sm font-black ring-2 shadow-[0_4px_8px_-4px_rgba(0,0,0,.4)] ${MEDAL[place]}`}>{place}</span>
                            <span className="min-w-0 flex-1 truncate text-sm">
                                {w ? <><span className="font-bold text-slate-900">{w.name}</span>{w.sub ? <span className="text-slate-500"> · {w.sub}</span> : null}</> : <span className="text-slate-400">—</span>}
                            </span>
                            {w?.score != null && <span className="shrink-0 text-sm font-black tabular-nums text-slate-800">{Number(w.score).toLocaleString('en-IN')} <span className="text-xs font-medium text-slate-500">pts</span></span>}
                        </li>
                    );
                })}
            </ol>
            <span aria-hidden="true" className="block h-3 shrink-0" />
            <Link to={to} className={`after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${featured ? 'bg-[#13213d] text-white hover:bg-[#1c2d52]' : 'border border-slate-800/80 bg-white text-slate-900 group-hover:bg-slate-50'}`}>
                View Full Results <ArrowRight size={16} aria-hidden="true" />
            </Link>
        </article>
    );
};

export const ResultsTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.history);
    const arena = useLoad(arenaApi.list);
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading />;
    const arenas = (arena.data || []).filter((c) => c.state === 'results');
    if (!data.competitions.length && !arenas.length) return <Empty icon={Medal} title="No results yet">Finished competitions, their winners and match results appear here.</Empty>;
    return (
        // Three to a row, all one size; one on a phone, two on a tablet.
        <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
            {/* Newest first (2026-11-06): Quiz Arena and competition results together, by when they finished. */}
            {[
                ...arenas.map((c) => ({ at: c.resultsPublishedAt, el: (featured) => (
                    <ResultCard key={`a-${c.id}`} featured={featured} game="quizarena" gameLabel="Quiz Arena" title={c.title} date={c.resultsPublishedAt} to={`/competitions/arena/${c.id}`} data={{ 'data-arena-result': c.id }}
                        mine={c.myResult?.rank != null ? c.myResult : null}
                        winners={(c.winners || []).map((w) => ({ place: w.place, name: w.name, sub: w.collegeName, score: w.score }))} />
                ) })),
                ...data.competitions.map(({ competition: c }) => ({ at: c.completedAt, el: (featured) => (
                    <ResultCard key={c.id} featured={featured} game={c.game} gameLabel={c.gameLabel} title={c.name} date={c.completedAt} to={`/competitions/${c.id}`} data={{ 'data-result': c.id }}
                        winners={c.winners.map((w) => ({ place: w.place, name: w.collegeName, sub: w.teamName }))} />
                ) }))
            ].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)).map((r, i) => r.el(i === 0))}
        </div>
    );
};

/* ── Certificates (mine) — the History tab, as asked 2026-10-27 ─────── */

/** One certificate: what it is for, and the certificate itself, opened in a popup (asked 2026-10-29). */
/** The medal for a place (2026-11-04): gold, silver or bronze with its laurels and ribbon; anyone else a plain one. */
const MEDAL_LOOK = {
    1: ['/competitions/hub/medal-gold.png', 'from-[#fde68a] to-[#f2b63c]', '#4a2f02', undefined],
    2: ['/competitions/hub/medal-silver.png', 'from-[#f8fafc] to-[#bcc5d2]', '#1e293b', undefined],
    3: ['/competitions/hub/medal-silver.png', 'from-[#fbd2ab] to-[#d07a3c]', '#3b1704', 'sepia(1) saturate(2.4) hue-rotate(-18deg) brightness(.95)']
};
const PlaceMedal = ({ place }) => {
    const look = MEDAL_LOOK[place];
    if (!look) return <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-violet-50 to-violet-100 text-violet-700 ring-2 ring-violet-200 sm:h-[4.5rem] sm:w-[4.5rem]"><Award size={28} aria-hidden="true" /></span>;
    const [src, disc, ink, filter] = look;
    return (
        <span className="relative block h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]" aria-label={`${ORDINAL[place]} place`}>
            <img src={src} alt="" aria-hidden className="h-full w-full object-contain" style={filter ? { filter } : undefined} />
            <span className={`absolute left-1/2 top-[39%] flex h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b ${disc} text-[0.8rem] font-black sm:text-sm`} style={{ color: ink }}>{ORDINAL[place]}</span>
        </span>
    );
};

/** One certificate (2026-11-04, as the reference): its medal, what it is for, and Show Certificate, which opens it. */
const CertificateCard = ({ title, sub, place, load, fileName, to }) => {
    const [open, setOpen] = useState(false);
    // Escape closes the popup (unless the certificate is in the browser's full screen, which Escape leaves first).
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);
    return (
        <li className="relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-white via-white to-[#fff8e8] p-3 shadow-[0_12px_28px_-18px_rgba(146,104,18,.55)] sm:p-4" data-certificate-card>
            <span aria-hidden className="pointer-events-none absolute -bottom-8 -right-6 h-24 w-48 -rotate-[18deg] bg-gradient-to-r from-transparent via-amber-200/60 to-amber-300/70" />
            <div className="relative flex flex-wrap items-center gap-3 sm:flex-nowrap sm:gap-4">
                <PlaceMedal place={place} />
                <span aria-hidden className="hidden h-12 w-px bg-amber-200 sm:block" />
                <span className="min-w-0 flex-1 basis-40">
                    <Link to={to} className="block break-words text-base font-black text-[#0f172a] hover:text-indigo-700 sm:text-lg">{title}</Link>
                    <span className="mt-0.5 block text-xs text-slate-500 sm:text-sm">{sub}</span>
                </span>
                <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[#13213d] px-4 text-sm font-bold text-white shadow-[0_8px_18px_-8px_rgba(15,23,42,.8)] hover:bg-[#1c2d52] sm:w-auto sm:px-5">
                    <Award size={16} aria-hidden="true" /> Show Certificate <ArrowRight size={16} aria-hidden="true" />
                </button>
            </div>
            {open && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Your certificate"
                    onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} data-certificate-popup>
                    <CertificateInline className="!max-w-3xl shadow-2xl" load={load} fileName={fileName} onClose={() => setOpen(false)} />
                </div>,
                document.body
            )}
        </li>
    );
};

export const HistoryTab = () => {
    const { data, error, reload } = useLoad(competitionsApi.me);
    const arena = useLoad(arenaApi.list);
    if (error) return <Failed error={error} onRetry={reload} />;
    if (!data) return <Loading list />;
    // Only what earned a certificate: my Quiz Arenas and my competitions, results out.
    const arenas = (arena.data || []).filter((c) => c.state === 'results' && c.myResult?.certificate);
    const comps = data.results.filter((r) => r.certificate);
    if (!comps.length && !arenas.length) return <Empty icon={Award} title="No certificates yet">When the results of a competition you played in are published, your certificate appears here.</Empty>;
    return (
        <ul className="grid items-start gap-3 sm:gap-4 lg:grid-cols-2" data-history>
            {arenas.map((c) => (
                <CertificateCard key={`arena-${c.id}`} to={`/competitions/arena/${c.id}`} title={`🧠 ${c.title}`}
                    place={c.myResult.rank}
                    sub={`Quiz Arena  ·  ${c.myResult.rank == null ? 'Took part' : c.myResult.rank <= 3 ? `${ORDINAL[c.myResult.rank]} place` : `Rank ${c.myResult.rank}`}${c.myResult.score != null ? `  ·  ${c.myResult.score} points` : ''}  ·  ${fmtDate(c.resultsPublishedAt)}`}
                    load={() => arenaApi.certificate(c.id)} fileName={`Certificate_${c.title.replace(/\s+/g, '_')}.pdf`} />
            ))}
            {comps.map((r) => (
                <CertificateCard key={r.competition.id} to={`/competitions/${r.competition.id}`} title={`${r.competition.emoji} ${r.competition.name}`}
                    place={r.place}
                    sub={`${r.competition.gameLabel} · ${r.place ? `${ORDINAL[r.place]} place` : 'Took part'} · ${fmtDate(r.competition.completedAt)}`}
                    load={() => competitionsApi.certificate(r.competition.id)} fileName={`Certificate_${r.competition.name.replace(/\s+/g, '_')}.pdf`} />
            ))}
        </ul>
    );
};

