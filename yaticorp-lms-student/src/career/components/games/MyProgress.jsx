/**
 * My progress (2026-11-13): the student's own brain-games record, from the adaptive sessions this browser holds
 * (adaptive.js, merged with the account's copy) and the level ladder (levels.js). Totals, personal bests, accuracy
 * and time, the stage reached in each recent game, a bar per thinking skill, this week and month against the ones
 * before, achievements — and Group games apart, from the server's Group Brain results (GET /games/group-summary), so
 * a group result never touches a solo personal best. Props: { zone, band }.
 *
 * Every figure is a practice indicator for these games, not an IQ score.
 */
import { useEffect, useState } from 'react';
import { BarChart3, BookOpen, Brain, Calculator, Gamepad2, Puzzle, Timer, Trophy } from 'lucide-react';
import api from '../../services/api';
import { allStats, skillSummary, STAGE_LABEL } from './adaptive';
import { levelsCleared, totalStars } from './levels';
import { gameKey } from './gameStorage';
import { BANDS, zoneByKey } from './zones';
import { allSessions, achievements, improvement, gameName, SKILL_EMOJI } from './achievements';

/** The eight skills shown as bars, in this order, with their short names. */
const BARS = [
    ['memory', 'Memory'], ['logic', 'Logic'], ['number', 'Numerical'], ['spatial', 'Spatial'],
    ['verbal', 'Vocabulary'], ['attention', 'Concentration'], ['strategy', 'Strategy'], ['speed', 'Processing speed']
];

const secs = (ms) => (ms ? (ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${Math.round(ms / 1000)}s`) : '—');
const avg = (xs) => (xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : null);

/** Levels finished with three stars, from the ladder's own record (all of it, not just the recent sessions). */
const threeStarLevels = () => {
    try { return Object.values(JSON.parse(localStorage.getItem(gameKey('yati:gameStars')) || '{}')).filter((n) => Number(n) === 3).length; }
    catch { return 0; }
};

function Stat({ label, value }) {
    return (
        <div className="min-w-0 rounded-xl bg-white px-3 py-2 ring-1 ring-line-100">
            <p className="truncate text-[11px] font-bold tracking-wide text-ink-400 uppercase">{label}</p>
            <p className="truncate text-base font-black text-ink-900">{value}</p>
        </div>
    );
}

function Change({ label, p }) {
    const c = p.change;
    return (
        <div className="min-w-0 rounded-xl bg-white px-3 py-2 ring-1 ring-line-100">
            <p className="truncate text-[11px] font-bold tracking-wide text-ink-400 uppercase">{label}</p>
            {p.score == null ? <p className="text-sm font-bold text-ink-400">No rounds yet</p> : (
                <>
                    <p className="text-base font-black text-ink-900">{p.score}<span className="text-xs text-ink-400">/100</span>
                        {c != null && <span className={`ml-1.5 text-xs font-black ${c > 0 ? 'text-emerald-600' : c < 0 ? 'text-amber-600' : 'text-ink-400'}`}>{c > 0 ? '▲' : c < 0 ? '▼' : '='} {Math.abs(c)}</span>}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">{p.sessions} round{p.sessions === 1 ? '' : 's'}{p.previousScore != null ? ` · before: ${p.previousScore}` : ' · nothing to compare yet'}</p>
                </>
            )}
        </div>
    );
}

function GroupBlock() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let alive = true;
        api.get('/games/group-summary').then(({ data: d }) => alive && setData(d)).catch(() => alive && setError(true));
        return () => { alive = false; };
    }, []);
    if (error) return <p className="text-xs font-semibold text-ink-500">Group games could not load right now.</p>;
    if (!data) return <p className="text-xs font-semibold text-ink-400">Loading…</p>;
    if (!data.played) return <p className="text-xs font-semibold text-ink-500">No group games yet. Play with friends in a room to see them here.</p>;
    const ord = (n) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10 < 4 ? n % 10 : 0]}`;
    return (
        <>
            <div className="grid grid-cols-3 gap-2">
                <Stat label="Played" value={data.played} />
                <Stat label="Wins" value={data.wins} />
                <Stat label="Podiums" value={data.podiums} />
            </div>
            {data.recent?.length > 0 && (
                <ul className="mt-2 space-y-1">
                    {data.recent.map((r, i) => (
                        <li key={`${r.game}-${i}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-white px-2 py-1.5 text-xs ring-1 ring-line-100">
                            <span aria-hidden>{r.emoji}</span>
                            <span className="min-w-0 flex-1 truncate font-bold text-ink-800">{r.label}</span>
                            <span className={`shrink-0 font-black ${r.won ? 'text-emerald-600' : 'text-ink-500'}`}>{r.won ? 'Won' : r.draw ? 'Shared 1st' : r.place ? `${ord(r.place)} of ${r.players}` : '—'}</span>
                        </li>
                    ))}
                </ul>
            )}
            <p className="mt-2 text-[11px] text-ink-400">Group results are kept apart from your solo personal bests.</p>
        </>
    );
}

const CATEGORY_LOOK = {
    memory: { name: 'Memory & Focus', Icon: Brain, grad: 'from-violet-500 to-fuchsia-500', soft: 'bg-violet-50', ring: '#8b5cf6', text: 'text-violet-700' },
    logic: { name: 'Logic & Deduction', Icon: Puzzle, grad: 'from-sky-500 to-indigo-500', soft: 'bg-sky-50', ring: '#3b82f6', text: 'text-sky-700' },
    vocab: { name: 'Vocabulary & Linguistics', Icon: BookOpen, grad: 'from-emerald-500 to-teal-500', soft: 'bg-emerald-50', ring: '#10b981', text: 'text-emerald-700' },
    math: { name: 'Math & Speed Processing', Icon: Calculator, grad: 'from-amber-500 to-orange-500', soft: 'bg-amber-50', ring: '#f59e0b', text: 'text-amber-700' }
};
const ACH_EMOJI = { 'first-game': '🎉', 'memory-champion': '🧠', 'logic-explorer': '🧩', 'word-master': '📚', 'number-ninja': '🥷', 'accuracy-streak': '🎯', 'personal-best': '🏆', 'consistency-champion': '📅', 'multiplayer-challenger': '👥', 'category-specialist': '🎖️' };

/** The account's own record (2026-11-14, GET /games/performance): every device's play, kept on the server. */
function usePerformance(tick) {
    const [data, setData] = useState(null);
    useEffect(() => {
        let alive = true;
        api.get('/games/performance').then(({ data: d }) => alive && setData(d)).catch(() => {});
        return () => { alive = false; };
    }, [tick]);
    return data;
}

/** A ring showing a percentage (null: an empty ring and a dash). */
function Ring({ value, color = '#8b5cf6', size = 56, label = null }) {
    const r = 22, c = 2 * Math.PI * r, v = value == null ? 0 : Math.max(0, Math.min(100, value));
    return (
        <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label || (value == null ? 'No data yet' : `${value}%`)}>
            <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
                <circle cx="28" cy="28" r={r} fill="none" stroke="#eef0f6" strokeWidth="6" />
                <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(v / 100) * c} ${c}`} />
            </svg>
            <span className="relative font-black tracking-tight text-slate-800 tabular-nums" style={{ fontSize: Math.max(9, Math.round(size * 0.2)) }}>{value == null ? '—' : `${value}%`}</span>
        </span>
    );
}

/** A small line of the last rounds' accuracy, oldest first. */
function Trend({ points, color }) {
    if (!points?.length) return <span className="text-[11px] font-semibold text-slate-400">No rounds yet</span>;
    const w = 96, h = 28;
    const xy = points.map((p, i) => `${points.length === 1 ? w / 2 : (i * w) / (points.length - 1)},${h - 2 - (Math.max(0, Math.min(100, p)) / 100) * (h - 4)}`).join(' ');
    return <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" role="img" aria-label={`Accuracy trend: ${points.join(', ')}`}><polyline points={xy} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function StatTile({ Icon, grad, label, value, children }) {
    return (
        <div className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_6px_20px_-12px_rgba(30,41,99,.25)] ring-1 ring-slate-100 sm:gap-3 sm:p-4">
            {children || <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md sm:h-11 sm:w-11 ${grad}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span>}
            <span className="min-w-0">
                <span className="block truncate text-[10px] font-bold tracking-wide text-slate-500 uppercase sm:text-[11px]">{label}</span>
                <span className="block truncate text-lg font-black text-slate-900 tabular-nums sm:text-xl">{value}</span>
            </span>
        </div>
    );
}

function CategoryCard({ k, c, strength, practice }) {
    const look = CATEGORY_LOOK[k];
    const { Icon } = look;
    return (
        <div className="relative min-w-0 overflow-hidden rounded-2xl bg-white p-3 shadow-[0_6px_20px_-12px_rgba(30,41,99,.25)] ring-1 ring-slate-100 sm:p-4" data-category={k}>
            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${look.grad}`} />
            <div className="flex items-center gap-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow sm:h-9 sm:w-9 ${look.grad}`}><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-black text-slate-900 sm:text-sm">{look.name}</span>
                {strength && <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">Strength</span>}
                {practice && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">Practise more</span>}
            </div>
            <div className="mt-2.5 flex items-center gap-3 sm:mt-3 sm:gap-4">
                <Ring value={c.accuracy ?? null} color={look.ring} size={52} label={`${look.name} accuracy`} />
                <div className="min-w-0 flex-1 space-y-0.5 text-xs text-slate-600 sm:text-[13px]">
                    <p><b className="text-slate-900 tabular-nums">{c.completed || 0}</b> levels completed</p>
                    <p><b className="text-slate-900 tabular-nums">{c.stars || 0}</b> stars</p>
                    <p className="truncate">{c.best ? <>Best: <b className={look.text}>{c.best.title}</b></> : <span className="text-slate-400">No best game yet</span>}</p>
                </div>
                <div className="hidden shrink-0 sm:block"><Trend points={c.trend} color={look.ring} /></div>
            </div>
        </div>
    );
}

const TABS = [['skills', 'Skills'], ['improve', 'Improvement'], ['bests', 'Personal bests'], ['badges', 'Achievements'], ['group', 'Group games']];

export default function MyProgress({ zone, band, inSheet = false }) {
    const [tick, setTick] = useState(0);
    const [tab, setTab] = useState('skills');
    useEffect(() => {
        const bump = () => setTick((t) => t + 1);
        window.addEventListener('yati:game-session', bump);
        window.addEventListener('yati:games-synced', bump);
        return () => { window.removeEventListener('yati:game-session', bump); window.removeEventListener('yati:games-synced', bump); };
    }, []);

    const all = allStats();
    const sessions = allSessions(all);
    const cleared = levelsCleared();
    const accs = sessions.filter((s) => s.accuracy != null).map((s) => s.accuracy);
    const times = sessions.filter((s) => s.ms > 0).map((s) => s.ms);
    const avgAcc = avg(accs);
    const recentGames = Object.entries(all)
        .filter(([, g]) => g?.sessions?.length)
        .sort((a, b) => b[1].sessions.at(-1).at - a[1].sessions.at(-1).at)
        .slice(0, 6);
    const skills = Object.fromEntries(skillSummary().map((x) => [x.skill, x]));
    const change = improvement(all);
    const perf = usePerformance(tick);
    // Achievements from the account's saved record when it has answered (every device), else this browser's.
    const badges = perf?.achievements?.length
        ? perf.achievements.map((x) => ({ key: x.key, emoji: ACH_EMOJI[x.key] || '🏅', title: x.title, text: x.description, earned: x.earned, progress: x.progress?.need ? Math.min(1, x.progress.have / x.progress.need) : 0 }))
        : achievements(all, { zone, levelsCleared: cleared, threeStarLevels: threeStarLevels() });
    const earned = badges.filter((b) => b.earned).length;
    const z = zoneByKey(zone);
    const cats = perf?.individual?.categories || {};
    const strengths = new Set(perf?.individual?.strengths || []), practice = new Set(perf?.individual?.practice || []);

    return (
        <section className={`min-w-0 bg-gradient-to-b from-[#f7f8ff] to-white p-3 sm:p-6 ${inSheet ? '' : 'rounded-[24px]'}`} data-my-progress>
            {/* Header */}
            {/* In the popup the sheet's own title bar says this; only the section shows. */}
            {inSheet ? (z && <p className="mb-1 flex justify-end"><span className="truncate rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-100">{z.name}{BANDS[band] ? ` · ${BANDS[band].label}` : ''}</span></p>) : (
            <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30"><BarChart3 className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">My progress</h2>
                    <p className="text-xs font-semibold text-slate-500 sm:text-sm">How you are doing across the brain games</p>
                </div>
                {z && <span className="truncate rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm ring-1 ring-violet-100">{z.name}{BANDS[band] ? ` · ${BANDS[band].label}` : ''}</span>}
            </div>
            )}

            {/* Totals */}
            <div className={`${inSheet ? 'mt-1' : 'mt-4'} grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4`}>
                <StatTile Icon={Gamepad2} grad="from-violet-500 to-indigo-500" label="Rounds played" value={sessions.length} />
                <StatTile Icon={Trophy} grad="from-amber-400 to-orange-500" label="Levels done" value={cleared} />
                <StatTile label="Avg accuracy" value={avgAcc != null ? `${Math.round(avgAcc)}%` : '—'}><Ring value={avgAcc != null ? Math.round(avgAcc) : null} color="#10b981" size={40} /></StatTile>
                <StatTile Icon={Timer} grad="from-sky-500 to-cyan-500" label="Avg time" value={secs(avg(times))} />
            </div>

            {/* By category */}
            <h3 className="mt-5 mb-2 text-xs font-black tracking-wide text-slate-700 uppercase sm:mt-6 sm:mb-2.5 sm:text-sm">By category</h3>
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3" data-category-performance>
                {Object.keys(CATEGORY_LOOK).map((k) => <CategoryCard key={k} k={k} c={cats[k] || {}} strength={strengths.has(k)} practice={practice.has(k)} />)}
            </div>

            {/* The rest, as tabs */}
            <div className="mt-5 flex flex-wrap justify-center gap-1 rounded-2xl bg-slate-100/80 p-1 sm:mt-6 sm:flex-nowrap sm:justify-start sm:gap-1.5 sm:overflow-x-auto" role="tablist" aria-label="More about your progress">
                {TABS.map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-black whitespace-nowrap transition sm:px-3.5 sm:py-2 sm:text-sm ${tab === key ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        {label}{key === 'badges' && <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{earned}/{badges.length}</span>}
                    </button>
                ))}
            </div>
            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100 sm:p-4" role="tabpanel">
                {tab === 'skills' && (
                    <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                        {BARS.map(([key, label]) => {
                            const x = skills[key];
                            return (
                                <li key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-1 text-[13px] sm:grid-cols-[minmax(0,8rem)_1fr_auto] sm:gap-2.5">
                                    <span className="truncate font-bold text-slate-700">{SKILL_EMOJI[key]} {label}</span>
                                    <span className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:col-span-1 sm:row-start-auto sm:h-2.5" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={x?.level ?? 0}>
                                        <span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${x?.level ?? 0}%` }} />
                                    </span>
                                    <span className="w-12 text-right font-black text-slate-800 tabular-nums sm:col-start-3 sm:row-start-1">{x ? <>{x.level}{x.trend ? <span className={`ml-0.5 text-[10px] ${x.trend > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{x.trend > 0 ? '▲' : '▼'}</span> : null}</> : <span className="text-slate-300">—</span>}</span>
                                </li>
                            );
                        })}
                    </ul>
                )}
                {tab === 'improve' && (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        <Change label="This week vs last" p={change.week} />
                        <Change label="This month vs last" p={change.month} />
                    </div>
                )}
                {tab === 'bests' && (recentGames.length === 0 ? <p className="text-sm font-semibold text-slate-500">Play a game to see your stage and personal best here.</p> : (
                    <>
                        <ul className="divide-y divide-slate-100">
                            {recentGames.map(([id, g]) => (
                                <li key={id} className="flex min-w-0 items-center gap-3 py-2 text-sm">
                                    <span className="min-w-0 flex-1 truncate font-bold text-slate-800">{gameName(id)}</span>
                                    <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-black text-violet-700">{STAGE_LABEL[g.stage] || 'Medium'}</span>
                                    <span className="w-20 shrink-0 text-right font-black text-slate-800 tabular-nums" title="Personal best">🏆 {g.best ? (g.best.score ?? (g.best.accuracy != null ? `${g.best.accuracy}%` : Math.round((g.best.mark || 0) * 100))) : '—'}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-2 text-xs font-semibold text-slate-500">⭐ {totalStars()} stars earned in all</p>
                    </>
                ))}
                {tab === 'badges' && (
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {badges.map((b) => (
                            <li key={b.key} className={`flex min-w-0 items-center gap-3 rounded-xl p-2.5 ring-1 ${b.earned ? 'bg-gradient-to-r from-amber-50 to-white ring-amber-200' : 'bg-slate-50/60 ring-slate-100'}`} data-achievement={b.key} data-earned={b.earned}>
                                <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xl ${b.earned ? 'bg-white shadow-sm' : 'bg-white/70 opacity-50 grayscale'}`}>{b.emoji}</span>
                                <span className="min-w-0 flex-1">
                                    <span className={`block truncate text-sm font-black ${b.earned ? 'text-amber-900' : 'text-slate-700'}`}>{b.title}</span>
                                    <span className="block text-xs leading-snug text-slate-500">{b.text}</span>
                                    {!b.earned && b.progress > 0 && <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-200"><span className="block h-full rounded-full bg-amber-400" style={{ width: `${Math.round(b.progress * 100)}%` }} /></span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
                {tab === 'group' && <GroupBlock />}
            </div>
        </section>
    );
}
