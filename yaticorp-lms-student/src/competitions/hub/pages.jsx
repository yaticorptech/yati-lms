/**
 * The Competitions section's pages (2026-11-04), each with the section's navigation (HubLayout) and all from the
 * server: Competitions, Games and a game's own page, My Teams, Leaderboard, Results & Certificates,
 * Calendar and My Performance. Overview is in Overview.jsx.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
    Trophy, Gamepad2, Swords, UsersRound, BarChart3, Award, CalendarDays, TrendingUp, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
    CheckCircle2, ClipboardCheck, Clock, Medal, Crown, Info, Radio, Target, Flame, BookOpen, ClipboardList, CalendarClock, Play, Bell, BellRing, Plus, X, Trash2, Loader2, CalendarPlus
} from 'lucide-react';
import HubLayout from './HubLayout';
import Portal from '../../components/Portal';
import { myEvents, whenOf, REMINDERS, CHANGED as MY_CHANGED } from '../myEvents';
import useLoad from './useLoad';
import { competitionsApi, GAMES, gameImage, fmtDateTime, ORDINAL } from '../api';
import { arenaApi } from '../arena/api';
import { ARENA, PANEL } from './gameInfo';
import { gameRules } from '../gameRules';
import { StatusChip, Empty } from '../parts';
import { Box, Heading, Failed, Loading, CompetitionCard, ArenaGoldCard, MatchList, LeaderboardTab, ResultsTab, HistoryTab } from '../CompetitionsHome';
// A plain card, as Box draws it (the calendar's on its own page).
const BOX = 'rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';

/* ── Live now · Open for registration · Coming up · Completed (2026-11-04) ── */

// Open: published by the platform or a college and taking entries (or about to). Coming up: registration over, not
// started yet. Live: being played now. Completed: over.
const OPEN_PHASES = ['registration-open', 'closing-soon', 'registration-soon'];
const SOON_PHASES = ['upcoming'];
const STAGES = {
    live: { title: 'Live Competitions', icon: Radio, subtitle: 'View and play ongoing competitions, track real-time progress, and see the latest updates until they finish.', emptyLine: 'There are no ongoing competitions at the moment. Check back soon for new live competitions.', comp: (c) => c.status === 'live', arena: (a) => a.state === 'live', empty: 'No live competitions right now.' },
    open: { title: 'Open for registration', icon: ClipboardList, subtitle: 'Every current competition — the ones open for entries first. Ask your college\'s coordinator to enter you.', comp: (c) => !['completed', 'cancelled'].includes(c.status), arena: (a) => ['registration', 'upcoming', 'live'].includes(a.state), isOpen: (c, kind) => (kind === 'arena' ? c.state === 'registration' : OPEN_PHASES.includes(c.phase)), empty: 'No competition is taking entries right now.' },
    // Registered (2026-11-06, was "Coming up"): the competitions I am entered in that are not over yet — my team in
    // (approved, or waiting for approval), or my Quiz Arena entry.
    upcoming: { title: 'Registered', icon: ClipboardCheck, subtitle: 'The competitions you are entered in that are not over yet.', comp: (c) => !!c.myTeam && !['withdrawn', 'rejected'].includes(c.myTeam.status) && !['completed', 'cancelled'].includes(c.status), arena: (a) => ['approved', 'pending'].includes(a.entryStatus) && !['ended', 'results'].includes(a.state), empty: 'You are not entered in any competition yet.', emptyLine: 'Ask your college\'s coordinator to enter you in one that is open for registration.' },
    completed: { title: 'Completed', icon: CheckCircle2, subtitle: 'Competitions that are over. Open one for its results.', comp: (c) => c.status === 'completed', arena: (a) => ['ended', 'results'].includes(a.state), empty: 'No competition has finished yet.', latest: true }
};

// Each stage in its tab's own colour (2026-11-04): the title's icon, and the card shown when there are none.
const STAGE_LOOK = {
    live: { icon: 'from-sky-400 to-blue-600 shadow-blue-500/40', card: 'border-blue-300/80 from-[#f4f8ff] to-[#e8f1ff]', wave: 'rgba(96,165,250,.35)', disc: 'bg-blue-100 text-blue-600', ink: 'text-[#0f2a6b]' },
    open: { icon: 'from-emerald-400 to-green-600 shadow-emerald-500/40', card: 'border-emerald-300/80 from-[#f4fcf6] to-[#e9f8ee]', wave: 'rgba(74,222,128,.35)', disc: 'bg-emerald-100 text-emerald-700', ink: 'text-[#0f3d1f]' },
    upcoming: { icon: 'from-amber-400 to-orange-500 shadow-orange-500/40', card: 'border-orange-300/80 from-[#fffaf3] to-[#fff0e0]', wave: 'rgba(251,146,60,.32)', disc: 'bg-orange-100 text-orange-600', ink: 'text-[#4a2106]' },
    completed: { icon: 'from-indigo-400 to-violet-600 shadow-indigo-500/40', card: 'border-indigo-300/80 from-[#f7f6ff] to-[#eceaff]', wave: 'rgba(129,140,248,.32)', disc: 'bg-indigo-100 text-indigo-600', ink: 'text-[#1e1b4b]' }
};

/** None of this stage: a soft card in its colour, waves at two corners, its sign on a disc. */
const StageEmpty = ({ st, look }) => (
    <section className={`relative overflow-hidden rounded-[26px] border bg-gradient-to-b px-5 py-10 text-center shadow-[0_18px_40px_-26px_rgba(0,0,0,.25)] sm:py-12 ${look.card}`} data-stage-empty>
        <span aria-hidden className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-[45%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${look.wave}, transparent)` }} />
        <span aria-hidden className="pointer-events-none absolute -top-12 -right-10 h-40 w-[45%] rounded-[50%]" style={{ background: `radial-gradient(closest-side, ${look.wave}, transparent)` }} />
        <span className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full ${look.disc}`}><st.icon className="h-10 w-10" strokeWidth={2} aria-hidden /></span>
        <p className={`relative mt-4 text-lg font-black sm:text-2xl ${look.ink}`}>{st.empty}</p>
        <p className="relative mt-1 text-sm text-slate-600 sm:text-lg">{st.emptyLine || 'Competitions appear here as soon as they are published.'}</p>
    </section>
);

const StagePage = ({ stage }) => {
    const look = STAGE_LOOK[stage];
    const st = STAGES[stage];
    const list = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const error = list.error || arena.error;
    // Newest first on every page (2026-11-06), competitions and Quiz Arenas sorted together by their date: what
    // started (or starts) last at the top, the oldest at the bottom.
    const when = (c) => new Date(c.startsAt || c.completedAt || c.createdAt || 0).getTime();
    const newestFirst = (a, b) => when(b.c) - when(a.c);
    const all = [
        ...(arena.data || []).filter(st.arena).map((c) => ({ kind: 'arena', c })),
        ...(list.data?.competitions || []).filter(st.comp).map((c) => ({ kind: 'comp', c }))
    ];
    const card = (r) => (r.kind === 'arena' ? <ArenaGoldCard c={r.c} /> : <CompetitionCard c={r.c} />);
    const rows = st.isOpen
        // Registration (2026-11-06): every current competition — the open ones first, tagged Open in green; those whose
        // registration is over still listed, tagged Closed. Newest first within each.
        ? all.map((r) => ({ ...r, open: st.isOpen(r.c, r.kind) }))
            .sort((a, b) => (b.open - a.open) || newestFirst(a, b))
            .map((r) => (
                <div key={`${r.kind}-${r.c.id}`} className="relative h-full" data-registration={r.open ? 'open' : 'closed'}>
                    <span className={`pointer-events-none absolute top-3 right-3 z-20 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide uppercase shadow-sm ${r.open ? 'bg-emerald-500 text-white' : 'bg-white/90 text-slate-500 ring-1 ring-slate-200'}`}>
                        {r.open && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
                        {r.open ? 'Open' : 'Closed'}
                    </span>
                    {card(r)}
                </div>
            ))
        : [...all].sort(newestFirst).map((r) => <div key={`${r.kind}-${r.c.id}`} className="h-full">{card(r)}</div>);
    return (
        <HubLayout title={st.title} icon={st.icon} subtitle={st.subtitle} tone={look?.icon}>
            {error ? <Failed error={error} onRetry={() => { list.reload(); arena.reload(); }} />
                : !list.data || !arena.data ? <Loading />
                    : rows.length ? <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3" data-stage={stage}>{rows}</div>
                        : look ? <StageEmpty st={st} look={look} /> : <Empty icon={st.icon} title={st.empty}>Competitions appear here as soon as they are published.</Empty>}
        </HubLayout>
    );
};
export const OpenPage = () => <StagePage stage="open" />;
export const UpcomingPage = () => <StagePage stage="upcoming" />;
export const CompletedPage = () => <StagePage stage="completed" />;

/** Live now (2026-11-04), as the other stages: the title in blue, and a soft blue card when none is on. */
export const LivePage = () => <StagePage stage="live" />;

/* ── Games ────────────────────────────────────────────────────────────── */



/** One game's page: what it is, how it is played, its rules, and its competitions now. */
export const GameDetailPage = () => {
    const { game } = useParams();
    const list = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const g = game === 'quizarena' ? ARENA : GAMES[game];
    if (!g) {
        return <HubLayout title="Game not found" icon={Gamepad2}><Empty icon={Gamepad2} title="There is no such game">See the games on the <Link to="/competitions" className="font-bold text-indigo-700 underline">Competitions page</Link>.</Empty></HubLayout>;
    }
    const rules = game === 'quizarena' ? ARENA.rules : gameRules({ game, teamsPerMatch: 2, playersPerTeam: 2, playersPerSide: 1 });
    const active = game === 'quizarena'
        ? (arena.data || []).filter((c) => ['live', 'registration', 'upcoming'].includes(c.state)).map((c) => <ArenaGoldCard key={c.id} c={c} />)
        : (list.data?.competitions || []).filter((c) => c.game === game && ['live', 'registration', 'closed'].includes(c.status) && c.phase !== 'expired').map((c) => <CompetitionCard key={c.id} c={c} />);
    const loading = game === 'quizarena' ? !arena.data : !list.data;
    const failed = game === 'quizarena' ? arena.error : list.error;
    return (
        <HubLayout title={g.label} icon={Gamepad2} subtitle={g.blurb}
            actions={<Link to="/competitions" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={15} aria-hidden="true" /> Back</Link>}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/20 [perspective:1000px]">
                    <img src={gameImage(game)} alt="" className="aspect-[395/228] w-full object-cover" />
                </div>
                <Box className="flex flex-col">
                    <Heading icon={Info}>At a glance</Heading>
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">Players</dt><dd className="mt-0.5 font-bold text-slate-900">{g.players}</dd></div>
                        <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">Format</dt><dd className="mt-0.5 font-bold text-slate-900">{g.format || 'Knockout, match by match'}</dd></div>
                        <div className="col-span-2 rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold text-slate-500">How to take part</dt><dd className="mt-0.5 font-bold text-slate-900">{game === 'quizarena' ? 'Your college enters you; join with your code when it opens.' : 'Your college enters a team; join each match with your own code.'}</dd></div>
                    </dl>
                </Box>
            </div>
            <Box>
                <Heading icon={BookOpen}>Instructions and rules</Heading>
                <ol className="space-y-2">
                    {rules.map((r, i) => (
                        <li key={r} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">{i + 1}</span>{r}
                        </li>
                    ))}
                </ol>
                {game !== 'quizarena' && <p className="mt-3 text-xs text-slate-500">Each competition can set its own clock, questions and team size; its page shows the exact rules.</p>}
            </Box>
            <section>
                <Heading icon={Radio}>{g.label} competitions now</Heading>
                {failed && loading ? <Failed error={failed} onRetry={game === 'quizarena' ? arena.reload : list.reload} /> : loading ? <Loading /> : active.length ? <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{active}</div>
                    : <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">No {g.label} competition is live or open right now.</p>}
            </section>
        </HubLayout>
    );
};

/* ── My Teams ─────────────────────────────────────────────────────────── */

export const TeamsPage = () => {
    const { data, error, reload } = useLoad(competitionsApi.me);
    const arena = useLoad(arenaApi.list);
    const entries = (arena.data || []).filter((c) => c.entryStatus);
    return (
        <HubLayout title="My Teams" icon={UsersRound} subtitle="The teams and entries your college registered you in, with their members and status.">
            <p className="flex items-start gap-2 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 ring-1 ring-indigo-100"><Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> Teams are made and registered by your college's coordinator. To join a team or change one, ask them.</p>
            {error ? <Failed error={error} onRetry={reload} /> : !data ? <Loading list /> : !data.competitions.length && !entries.length ? (
                <Empty icon={UsersRound} title="You are not in a team yet">When your coordinator puts you in a team, it appears here with its members and its matches.</Empty>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {[...data.competitions].sort((a, b) => new Date(b.startsAt || 0) - new Date(a.startsAt || 0)).map((c) => {
                        const t = c.myTeam;
                        return (
                            <Box key={c.id} className="flex flex-col gap-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold uppercase tracking-wider text-slate-400">{c.emoji} {c.gameLabel}</p>
                                        <Link to={`/competitions/${c.id}`} className="block break-words text-base font-black text-slate-900 hover:text-indigo-700">{c.name}</Link>
                                        <p className="text-xs text-slate-500">{fmtDateTime(c.startsAt)}</p>
                                    </div>
                                    <StatusChip status={c.status} phase={c.phase} />
                                </div>
                                {t && (
                                    <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100" data-my-team={t.id}>
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-bold text-slate-900">{t.teamName}<span className="font-normal text-slate-500"> · {t.collegeName}</span></p>
                                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${t.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{t.status === 'approved' ? 'Registration approved' : 'Awaiting approval'}</span>
                                        </div>
                                        <ul className="mt-2 flex flex-wrap gap-1.5">
                                            {t.players.map((p) => (
                                                <li key={p.userId} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">{(p.name || '?').slice(0, 1).toUpperCase()}</span>{p.name}
                                                    {c.entryFee?.enabled && <span className={p.paid ? 'text-emerald-600' : 'text-amber-600'}>{p.paid ? '· paid' : '· fee due'}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                        {t.coordinator?.name && <p className="mt-2 text-xs text-slate-500">Coordinator: {t.coordinator.name}</p>}
                                        {t.place && <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800"><Medal size={13} aria-hidden="true" /> Finished {ORDINAL[t.place]}</p>}
                                    </div>
                                )}
                                <Link to={`/competitions/${c.id}`} className="mt-auto inline-flex items-center gap-1 self-start text-sm font-bold text-indigo-700 hover:underline">Competition page <ArrowRight size={14} aria-hidden="true" /></Link>
                            </Box>
                        );
                    })}
                    {entries.map((c) => (
                        <Box key={`a-${c.id}`} className="flex flex-col gap-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">🧠 Quiz Arena · individual entry</p>
                            <Link to={`/competitions/arena/${c.id}`} className="text-base font-black text-slate-900 hover:text-indigo-700">{c.title}</Link>
                            <p className="text-xs text-slate-500">{fmtDateTime(c.startsAt)}</p>
                            <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.entryStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' : c.entryStatus === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                {c.entryStatus === 'approved' ? 'Entry approved' : c.entryStatus === 'pending' ? 'Awaiting approval' : c.entryStatus}
                            </span>
                        </Box>
                    ))}
                </div>
            )}
        </HubLayout>
    );
};

/* ── Leaderboard ──────────────────────────────────────────────────────── */

export const LeaderboardPage = () => (
    <HubLayout>
        {/* The banner (2026-11-04), as the reference: RANKINGS, the title, how points are given, the trophy. */}
        <section className="relative overflow-hidden rounded-[26px] border border-violet-100 bg-gradient-to-r from-[#f7f5ff] via-white to-[#f3efff] shadow-[0_18px_40px_-26px_rgba(109,40,217,.45)]" data-leaderboard-hero>
            <img src="/competitions/hub/lb-hero.png" alt="" aria-hidden className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto max-w-[62%] object-cover object-right opacity-40 sm:max-w-[55%] sm:opacity-100"
                style={{ maskImage: 'linear-gradient(to right, transparent, black 25%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 25%)' }} />
            <div className="relative px-5 py-6 sm:px-10 sm:py-7">
                <p className="flex items-center gap-3 text-xs font-bold tracking-[0.15em] text-slate-500 uppercase sm:text-sm">Rankings <span aria-hidden className="h-1 w-12 rounded-full bg-violet-600" /></p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-[#0e0f2b] sm:text-5xl">Leaderboard</h1>
                <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-lg">College, team and individual rankings across every game.</p>
                <div className="mt-4 flex flex-wrap gap-2 sm:gap-3">
                    {[[Trophy, '3 points a win'], [Gamepad2, '1 per match played'], [Crown, 'Top 3 finish: +10 / +6 / +4']].map(([Icon, t]) => (
                        <span key={t} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 sm:px-5 sm:text-base"><Icon className="h-4 w-4 text-amber-500 sm:h-5 sm:w-5" aria-hidden="true" /> {t}</span>
                    ))}
                </div>
            </div>
        </section>
        <LeaderboardTab />
    </HubLayout>
);

/* ── Results & Certificates ───────────────────────────────────────────── */

export const ResultsPage = () => {
    const [params, setParams] = useSearchParams();
    const show = params.get('show') === 'certificates' ? 'certificates' : 'results';
    return (
        <HubLayout>
            {/* The banner (2026-11-04), as the reference: COMPETITION CENTER, the title, Results / My Certificates, and the
                certificate and trophy on navy behind a gold line. */}
            <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-r from-[#f6f7fb] via-white to-[#eef1f7] shadow-[0_18px_40px_-26px_rgba(15,23,42,.45)]" data-results-hero>
                {/* Desktop/tablet: the art on the right, beside the text. */}
                <img src="/competitions/hub/res-hero.png" alt="" aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-auto max-w-[52%] object-cover object-right sm:block" />
                {/* Phone: the same art, full strength, as a strip across the top of the card. */}
                <img src="/competitions/hub/res-hero.png" alt="" aria-hidden className="block h-36 w-full object-cover object-[82%_50%] min-[400px]:h-40 sm:hidden" />
                <div className="relative px-4 py-5 sm:px-9 sm:py-7">
                    <h1 className="text-[1.75rem] leading-tight font-black tracking-tight text-[#0f172a] sm:text-5xl">Results &amp; Certificates</h1>
                    <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-lg">Final rankings of finished competitions, and your certificates to view and download.</p>
                    <div className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-3" role="tablist" aria-label="Show">
                        {[['results', 'Results', Trophy], ['certificates', 'My Certificates', Award]].map(([id, label, Icon]) => (
                            <button key={id} type="button" role="tab" aria-selected={show === id} onClick={() => setParams(id === 'results' ? {} : { show: id }, { replace: true })}
                                className={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold whitespace-nowrap transition-colors sm:min-h-12 sm:justify-start sm:px-8 sm:text-base ${show === id ? 'bg-[#13213d] text-white shadow-[0_10px_22px_-10px_rgba(15,23,42,.8)]' : 'bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50'}`}>
                                <Icon size={20} aria-hidden="true" /> {label}
                            </button>
                        ))}
                    </div>
                </div>
            </section>
            {show === 'results' ? <ResultsTab /> : <HistoryTab />}
        </HubLayout>
    );
};

/* ── Calendar ─────────────────────────────────────────────────────────── */

const DAY = 86400e3;
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const KIND = {
    start: ['Starts', 'bg-indigo-500'],
    deadline: ['Registration closes', 'bg-amber-500'],
    opens: ['Registration opens', 'bg-emerald-500'],
    ends: ['Closes', 'bg-slate-400'],
    mine: ['My event', 'bg-red-500'],
    // The Career Path calendar's own events (exams, classes, holidays…), shown as what they are (2026-11-06).
    career: ['Career event', 'bg-teal-500']
};
const pad = (n) => String(n).padStart(2, '0');
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Add an event to a day (2026-11-04), as a phone's calendar does: a name — or a competition picked, which fills in
 * its name, day, time and page — the day, the time, and a reminder. It pops up then (ReminderPopup.jsx).
 */
const AddEvent = ({ day, onClose }) => {
    const [f, setF] = useState(() => ({ title: '', date: isoDay(day || new Date()), time: '10:00', remindBefore: '30', link: '', notes: '' }));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const set = (patch) => setF((x) => ({ ...x, ...patch }));
    const save = (e) => {
        e.preventDefault();
        if (!f.title.trim()) { setError('Give the event a name.'); return; }
        if (f.remindBefore !== '' && whenOf(f.date, f.time).getTime() - Number(f.remindBefore) * 60000 < Date.now() - 60000) { setError('That reminder time has already passed. Pick a later time, or a shorter reminder.'); return; }
        setBusy(true); setError('');
        // The browser's leave to notify too, asked once, as the reminder is set.
        if (f.remindBefore !== '' && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
        myEvents.add({ title: f.title.trim(), date: f.date, time: f.time, remindBefore: f.remindBefore, link: f.link, notes: f.notes }).then(onClose)
            .catch((err) => setError(err.response?.data?.message || err.message || 'Could not save it.')).finally(() => setBusy(false));
    };
    const FIELD = 'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
    return (
        <Portal>
            <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-900/60 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
                <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add event" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" data-add-event>
                    <div className="flex items-center justify-between gap-2">
                        <p className="flex items-center gap-2 text-lg font-black text-slate-900"><CalendarPlus className="h-5 w-5 text-violet-600" /> Add event</p>
                        <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                    </div>
                    <label className="mt-4 block text-xs font-bold text-slate-600">Event name
                        <input value={f.title} onChange={(e) => set({ title: e.target.value })} maxLength={120} placeholder="e.g. Chess quarter-final" className={FIELD} data-event-title />
                    </label>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="block text-xs font-bold text-slate-600">Date<input type="date" required value={f.date} onChange={(e) => set({ date: e.target.value })} className={FIELD} data-event-date /></label>
                        {/* The time on a 12-hour clock: hour, minute, and AM / PM (2026-11-04). */}
                        <div className="block text-xs font-bold text-slate-600">Time
                            <div className="mt-1 flex items-stretch gap-1.5" data-event-time>
                                {(() => {
                                    const [h24, mi] = f.time.split(':').map(Number);
                                    const pm = h24 >= 12; const h12 = h24 % 12 || 12;
                                    const to24 = (h, m, p) => `${pad((h % 12) + (p ? 12 : 0))}:${pad(m)}`;
                                    const SEL = 'min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-1.5 py-2.5 text-center text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100';
                                    return (<>
                                        <select aria-label="Hour" value={h12} onChange={(e) => set({ time: to24(Number(e.target.value), mi, pm) })} className={SEL}>{Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}</select>
                                        <select aria-label="Minute" value={mi} onChange={(e) => set({ time: to24(h12, Number(e.target.value), pm) })} className={SEL}>{Array.from({ length: 60 }, (_, i) => i).map((m) => <option key={m} value={m}>{pad(m)}</option>)}</select>
                                        <span className="flex shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-200" role="group" aria-label="AM or PM">
                                            {['AM', 'PM'].map((x) => (
                                                <button key={x} type="button" aria-pressed={(x === 'PM') === pm} onClick={() => set({ time: to24(h12, mi, x === 'PM') })}
                                                    className={`px-2 text-xs font-black ${(x === 'PM') === pm ? 'bg-violet-600 text-white' : 'bg-white text-slate-500 hover:bg-violet-50'}`}>{x}</button>
                                            ))}
                                        </span>
                                    </>);
                                })()}
                            </div>
                        </div>
                    </div>
                    <label className="mt-3 block text-xs font-bold text-slate-600">Reminder
                        <select value={f.remindBefore} onChange={(e) => set({ remindBefore: e.target.value })} className={FIELD} data-event-reminder>
                            {REMINDERS.map(([v, l]) => <option key={v || 'none'} value={v}>{l}</option>)}
                        </select>
                    </label>
                    <label className="mt-3 block text-xs font-bold text-slate-600">Note (optional)
                        <input value={f.notes} onChange={(e) => set({ notes: e.target.value })} maxLength={500} placeholder="e.g. Join 10 minutes early with my code" className={FIELD} />
                    </label>
                    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p>}
                    <button type="submit" disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] py-3 text-base font-black text-white shadow-md disabled:opacity-60" data-event-save>
                        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <BellRing className="h-5 w-5" />} Save event
                    </button>
                </form>
            </div>
        </Portal>
    );
};

/** The calendar itself; `compact`: the month and its list one under the other (the first page's). */
export const CalendarView = ({ compact = false }) => {
    const list = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const today = new Date();
    const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
    const [picked, setPicked] = useState(null);
    // The list beside the month, a few at a time (2026-11-04): < and > page through it.
    const [page, setPage] = useState(0);
    // My own events (2026-11-04), and the Add event form.
    const [mine, setMine] = useState([]);
    const [adding, setAdding] = useState(false);
    const [removeError, setRemoveError] = useState('');
    const removeMine = (id) => { setRemoveError(''); myEvents.remove(id).catch((err) => setRemoveError(err.response?.data?.message || err.message || 'Could not delete the event.')); };
    useEffect(() => {
        const load = () => myEvents.list().then(setMine).catch(() => {});
        load();
        window.addEventListener(MY_CHANGED, load);
        return () => window.removeEventListener(MY_CHANGED, load);
    }, []);
    // Every dated thing: a competition's start, its registration opening and closing, a quiz's or hackathon's close.
    const events = useMemo(() => {
        const out = [];
        for (const c of list.data?.competitions || []) {
            if (c.status === 'cancelled') continue;
            const to = `/competitions/${c.id}`;
            if (c.startsAt) out.push({ at: c.startsAt, kind: 'start', title: c.name, sub: c.gameLabel, to });
            if (c.registrationOpensAt) out.push({ at: c.registrationOpensAt, kind: 'opens', title: c.name, sub: c.gameLabel, to });
            if (c.registrationDeadline) out.push({ at: c.registrationDeadline, kind: 'deadline', title: c.name, sub: c.gameLabel, to });
            if (c.endsAt) out.push({ at: c.endsAt, kind: 'ends', title: c.name, sub: c.gameLabel, to });
        }
        for (const c of arena.data || []) {
            if (c.state === 'cancelled') continue;
            const to = `/competitions/arena/${c.id}`;
            if (c.startsAt) out.push({ at: c.startsAt, kind: 'start', title: c.title, sub: 'Quiz Arena', to });
            if (c.registrationDeadline) out.push({ at: c.registrationDeadline, kind: 'deadline', title: c.title, sub: 'Quiz Arena', to });
        }
        for (const e of mine) {
            // Only what was added here (type Competition) is "My event"; the rest are Career Path events, named by their type.
            const own = (e.type || 'Competition') === 'Competition';
            out.push({ at: whenOf(e.date, e.time), kind: own ? 'mine' : 'career', label: own ? null : e.type, title: e.title, sub: e.remindAt ? 'Reminder set' : own ? 'My event' : 'From your Career calendar', to: e.link || null, id: e._id });
        }
        return out.sort((a, b) => new Date(a.at) - new Date(b.at));
    }, [list.data, arena.data, mine]);
    const byDay = useMemo(() => events.reduce((m, e) => { (m[dayKey(e.at)] ||= []).push(e); return m; }, {}), [events]);
    // The month's grid, weeks starting on Monday.
    const first = new Date(month);
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1))];
    const monthEvents = events.filter((e) => { const d = new Date(e.at); return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear(); });
    const all = picked ? byDay[dayKey(picked)] || [] : monthEvents;
    const PER = 4;
    const pages = Math.max(1, Math.ceil(all.length / PER));
    const at = Math.min(page, pages - 1);
    const shown = all.slice(at * PER, at * PER + PER);
    const move = (n) => { setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); setPicked(null); setPage(0); };
    const pick = (d) => { setPicked(d); setPage(0); };
    const error = list.error || arena.error;
    return (
        <>
            {error ? <Failed error={error} onRetry={() => { list.reload(); arena.reload(); }} /> : !list.data || !arena.data ? <Loading list /> : (
                <div className={compact ? 'grid gap-4 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]' : 'grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]'}>
                    <section className={compact ? `${PANEL} p-4` : BOX}>
                        {compact && <h2 className="mb-2 flex items-center gap-2 text-base font-black text-slate-900"><CalendarDays size={18} className="text-violet-600" aria-hidden="true" /> Calendar</h2>}
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <button type="button" onClick={() => move(-1)} aria-label="Previous month" className={`flex items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 ${compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl'}`}><ChevronLeft size={compact ? 15 : 18} /></button>
                            <p className={`font-black text-slate-900 ${compact ? 'text-sm' : 'text-base'}`} data-calendar-month>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
                            <button type="button" onClick={() => move(1)} aria-label="Next month" className={`flex items-center justify-center rounded-full text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 ${compact ? 'h-7 w-7' : 'h-9 w-9 rounded-xl'}`}><ChevronRight size={compact ? 15 : 18} /></button>
                        </div>
                        <div className={`grid grid-cols-7 gap-1 text-center font-bold uppercase text-slate-400 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>{WEEKDAYS.map((d) => <span key={d}>{d}</span>)}</div>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                            {cells.map((d, i) => {
                                if (!d) return <span key={`x${i}`} />;
                                const evs = byDay[dayKey(d)] || [];
                                const isToday = dayKey(d) === dayKey(today);
                                const on = picked && dayKey(picked) === dayKey(d);
                                return (
                                    <button key={i} type="button" onClick={() => pick(on ? null : d)} aria-pressed={!!on} aria-label={`${d.toDateString()}${evs.length ? `, ${evs.length} event${evs.length === 1 ? '' : 's'}` : ''}`}
                                        className={`flex flex-col items-center justify-start rounded-xl p-1 font-semibold transition-colors ${compact ? 'h-8 text-xs' : 'aspect-square text-sm sm:aspect-[5/4]'} ${on ? 'bg-indigo-600 text-white' : isToday ? (compact ? 'bg-violet-600 text-white shadow-md shadow-violet-500/40' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200') : evs.length ? 'bg-slate-50 text-slate-800 hover:bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}>
                                        {d.getDate()}
                                        <span className="mt-auto flex flex-wrap justify-center gap-0.5 pb-0.5">{evs.slice(0, 3).map((e, k) => <span key={k} className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-white' : KIND[e.kind][1]}`} />)}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className={`mt-3 flex flex-wrap text-slate-500 ${compact ? 'gap-2.5 text-[10px]' : 'gap-3 text-xs'}`}>{Object.values(KIND).map(([l, c]) => <span key={l} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c}`} /> {l}</span>)}</div>
                    </section>
                    <section className={compact ? `${PANEL} flex flex-col p-4 sm:p-5` : BOX}>
                        <Heading icon={CalendarDays} aside={(
                            <span className="flex items-center gap-2">
                                <button type="button" onClick={() => setAdding(true)} data-add-event-open className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] px-3.5 py-1.5 text-xs font-black text-white shadow-md hover:brightness-110 sm:text-sm"><Plus size={15} /> Add event</button>
                                {picked && <button type="button" onClick={() => pick(null)} className="text-sm font-bold text-indigo-700 hover:underline">Whole month</button>}
                                {pages > 1 && (<>
                                    <span className="text-xs font-semibold tabular-nums text-slate-500" data-events-page>{at * PER + 1}–{Math.min(all.length, at * PER + PER)} of {all.length}</span>
                                    <button type="button" onClick={() => setPage(at - 1)} disabled={at === 0} aria-label="Earlier events" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
                                    <button type="button" onClick={() => setPage(at + 1)} disabled={at >= pages - 1} aria-label="Later events" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
                                </>)}
                            </span>
                        )}>
                            {picked ? picked.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : 'This month'}
                        </Heading>
                        {removeError && <p role="alert" className="mb-2 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{removeError}</p>}
                        {shown.length ? (
                            <ul className="space-y-2" data-calendar-events>
                                {shown.map((e, i) => (
                                    <li key={i} className="relative">
                                        {e.kind === 'mine' && <button type="button" onClick={() => removeMine(e.id)} aria-label={`Delete ${e.title}`} className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>}
                                        <Link to={e.to || '#'} onClick={(ev) => { if (!e.to) ev.preventDefault(); }} className={`flex items-start gap-3 rounded-xl p-2.5 ring-1 ring-slate-100 hover:bg-slate-50 ${new Date(e.at).getTime() < Date.now() - DAY ? 'opacity-60' : ''}`}>
                                            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${KIND[e.kind][1]}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold text-slate-900">{e.title}</span>
                                                <span className="block pr-6 text-xs text-slate-500">{e.label || KIND[e.kind][0]} · {e.sub} · {fmtDateTime(e.at)}</span>
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : compact ? (
                            <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
                                <img src="/competitions/hub/empty-calendar.png" alt="" className="h-28 w-auto mix-blend-multiply" />
                                <p className="mt-2 text-base font-bold text-slate-600">Nothing {picked ? 'on this day' : 'this month'}.</p>
                            </div>
                        ) : <p className="py-6 text-center text-sm text-slate-500">Nothing {picked ? 'on this day' : 'this month'}.</p>}
                    </section>
                </div>
            )}
            {adding && <AddEvent day={picked} onClose={() => setAdding(false)} />}
        </>
    );
};
