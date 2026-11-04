/**
 * The Competitions section's pages (2026-11-04), each with the section's navigation (HubLayout) and all from the
 * server: Competitions, Games and a game's own page, My Teams, Leaderboard, Results & Certificates,
 * Calendar and My Performance. Overview is in Overview.jsx.
 */
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
    Trophy, Gamepad2, Swords, UsersRound, BarChart3, Award, CalendarDays, TrendingUp, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
    CheckCircle2, Clock, Medal, Crown, Info, Radio, Target, Flame, BookOpen, ClipboardList, CalendarClock
} from 'lucide-react';
import HubLayout from './HubLayout';
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
    live: { title: 'Live now', icon: Radio, subtitle: 'Competitions being played right now.', comp: (c) => c.status === 'live', arena: (a) => a.state === 'live', empty: 'No competition is live right now.' },
    open: { title: 'Open for registration', icon: ClipboardList, subtitle: 'Every competition the platform and colleges have opened for entries. Ask your college\'s coordinator to enter you.', comp: (c) => OPEN_PHASES.includes(c.phase), arena: (a) => a.state === 'registration', empty: 'No competition is taking entries right now.' },
    upcoming: { title: 'Coming up', icon: CalendarClock, subtitle: 'Registration is over and they have not started yet.', comp: (c) => SOON_PHASES.includes(c.phase), arena: (a) => a.state === 'upcoming', empty: 'Nothing is coming up right now.' },
    completed: { title: 'Completed', icon: CheckCircle2, subtitle: 'Competitions that are over. Open one for its results.', comp: (c) => c.status === 'completed', arena: (a) => ['ended', 'results'].includes(a.state), empty: 'No competition has finished yet.', latest: true }
};

const StagePage = ({ stage }) => {
    const st = STAGES[stage];
    const list = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const error = list.error || arena.error;
    const rows = [
        ...(arena.data || []).filter(st.arena).map((a) => <ArenaGoldCard key={`a-${a.id}`} c={a} />),
        ...(list.data?.competitions || []).filter(st.comp).sort((a, b) => (st.latest ? -1 : 1) * (new Date(a.startsAt) - new Date(b.startsAt))).map((c) => <CompetitionCard key={c.id} c={c} />)
    ];
    return (
        <HubLayout title={st.title} icon={st.icon} subtitle={st.subtitle}>
            {error ? <Failed error={error} onRetry={() => { list.reload(); arena.reload(); }} />
                : !list.data || !arena.data ? <Loading />
                    : rows.length ? <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3" data-stage={stage}>{rows}</div>
                        : <Empty icon={st.icon} title={st.empty}>Competitions appear here as soon as they are published.</Empty>}
        </HubLayout>
    );
};
export const OpenPage = () => <StagePage stage="open" />;
export const UpcomingPage = () => <StagePage stage="upcoming" />;
export const CompletedPage = () => <StagePage stage="completed" />;

/**
 * Live now (2026-11-04), in blue as its reference: a banner — the title on a glass pill, what the page is for, a
 * silver trophy on a blue wave — and the live competitions under it, or a card saying there are none.
 */
export const LivePage = () => {
    const list = useLoad(competitionsApi.list);
    const arena = useLoad(arenaApi.list);
    const error = list.error || arena.error;
    const rows = [
        ...(arena.data || []).filter((a) => a.state === 'live').map((a) => <ArenaGoldCard key={`a-${a.id}`} c={a} />),
        ...(list.data?.competitions || []).filter((c) => c.status === 'live').map((c) => <CompetitionCard key={c.id} c={c} />)
    ];
    const CARD = 'relative overflow-hidden rounded-[26px] border border-blue-100 bg-white shadow-[0_18px_40px_-20px_rgba(29,78,216,.45),inset_0_1px_0_#fff]';
    return (
        <HubLayout>
            <section className={`${CARD} min-h-[11rem] bg-gradient-to-r from-[#f4f8ff] via-white to-white sm:min-h-[13.5rem]`} data-live-hero>
                <img src="/competitions/hub/live-hero.png" alt="" aria-hidden="true" className="absolute inset-y-0 right-0 h-full w-auto max-w-[75%] object-cover object-right opacity-90 sm:max-w-[62%] sm:opacity-100"
                    style={{ maskImage: 'linear-gradient(to right, transparent, black 30%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%)' }} />
                <div className="relative flex max-w-xl flex-col gap-3 p-5 sm:p-8">
                    <div className="flex items-center gap-3">
                        <span aria-hidden="true" className="h-12 w-1.5 rounded-full bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] sm:h-14" />
                        <h1 className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-b from-white/90 to-blue-50/80 px-4 py-2 text-3xl font-black tracking-tight text-[#1d4ed8] shadow-[0_10px_24px_-12px_rgba(29,78,216,.5),inset_0_1px_0_#fff] ring-1 ring-blue-100 backdrop-blur sm:text-5xl">
                            <Radio className="h-8 w-8 sm:h-11 sm:w-11" strokeWidth={2.4} aria-hidden="true" /> Live Now
                        </h1>
                    </div>
                    <p className="max-w-[26rem] pl-5 text-sm font-medium leading-relaxed text-slate-600 sm:max-w-md sm:text-lg">View and play ongoing competitions, track real-time progress, and see the latest updates until they finish.</p>
                </div>
            </section>
            {error ? <Failed error={error} onRetry={() => { list.reload(); arena.reload(); }} />
                : !list.data || !arena.data ? <Loading />
                    : rows.length ? <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3" data-stage="live">{rows}</div>
                        : (
                            <section className={`${CARD} flex flex-col items-center px-5 py-8 text-center`} data-live-empty>
                                <img src="/competitions/hub/live-empty.png" alt="" aria-hidden="true" className="h-28 w-auto mix-blend-multiply sm:h-32" />
                                <p className="mt-3 text-lg font-black text-slate-900 sm:text-2xl">No competitions are live right now.</p>
                                <p className="mt-1 text-sm text-slate-600 sm:text-base">Ongoing competitions will appear here once they are published.</p>
                            </section>
                        )}
        </HubLayout>
    );
};

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
    return (
        <HubLayout title={g.label} icon={Gamepad2} subtitle={g.blurb}
            actions={<Link to="/competitions" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={15} aria-hidden="true" /> Back</Link>}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-3xl bg-slate-900 shadow-xl shadow-slate-900/20 [perspective:1000px]">
                    <img src={game === 'quizarena' ? ARENA.image : gameImage(game)} alt="" className="aspect-[16/10] w-full object-cover" />
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
                {loading ? <Loading /> : active.length ? <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">{active}</div>
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
                    {data.competitions.map((c) => {
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
    <HubLayout title="Leaderboard" icon={BarChart3} subtitle="College, team and individual rankings across every game. 3 points a win, 1 a match played, 10 / 6 / 4 for 1st / 2nd / 3rd.">
        <LeaderboardTab />
    </HubLayout>
);

/* ── Results & Certificates ───────────────────────────────────────────── */

export const ResultsPage = () => {
    const [params, setParams] = useSearchParams();
    const show = params.get('show') === 'certificates' ? 'certificates' : 'results';
    return (
        <HubLayout title="Results & Certificates" icon={Award} subtitle="Final rankings of finished competitions, and your certificates to view and download.">
            <div className="flex w-fit gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200" role="tablist" aria-label="Show">
                {[['results', 'Results', Medal], ['certificates', 'My certificates', Award]].map(([id, label, Icon]) => (
                    <button key={id} type="button" role="tab" aria-selected={show === id} onClick={() => setParams(id === 'results' ? {} : { show: id }, { replace: true })}
                        className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition-colors ${show === id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-indigo-700'}`}>
                        <Icon size={16} aria-hidden="true" /> {label}
                    </button>
                ))}
            </div>
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
    ends: ['Closes', 'bg-slate-400']
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
        return out.sort((a, b) => new Date(a.at) - new Date(b.at));
    }, [list.data, arena.data]);
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
                        {shown.length ? (
                            <ul className="space-y-2" data-calendar-events>
                                {shown.map((e, i) => (
                                    <li key={i}>
                                        <Link to={e.to} className={`flex items-start gap-3 rounded-xl p-2.5 ring-1 ring-slate-100 hover:bg-slate-50 ${new Date(e.at).getTime() < Date.now() - DAY ? 'opacity-60' : ''}`}>
                                            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${KIND[e.kind][1]}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-bold text-slate-900">{e.title}</span>
                                                <span className="block text-xs text-slate-500">{KIND[e.kind][0]} · {e.sub} · {fmtDateTime(e.at)}</span>
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
        </>
    );
};
