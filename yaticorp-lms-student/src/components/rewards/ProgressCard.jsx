/**
 * "Your Progress": five headline numbers and an overall progress bar, in the
 * pastel-tile style of the design. Lessons, quizzes and XP come from the
 * rewards summary; courses and overall progress from the enrolled courses.
 */
import React from 'react';
import { TrendingUp, CheckCircle2, Star, Sparkles, Flame } from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';
import { num } from './format';
import Sparkline from './Sparkline';

/**
 * One measure: an icon chip, the figure, what changed this week, and its trend along the bottom.
 * Two to a row on a phone, four across from xl.
 */
const Tile = ({ icon: Icon, label, value, suffix = '', sub, tone, series }) => {
    const n = useCountUp(value);
    return (
        <div className={`group relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white p-4 ring-1 ring-slate-200/80 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(30,22,80,0.45)] ${tone.ring}`}>
            <span aria-hidden className={`pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100 ${tone.glow}`} />
            <div className="relative flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-black tracking-[0.1em] text-slate-400 uppercase">{label}</p>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.icon}`}><Icon size={18} /></span>
            </div>
            <p className="relative mt-2 text-3xl leading-none font-black text-slate-900 tabular-nums">{n.toLocaleString('en-IN')}<span className="text-lg text-slate-500">{suffix}</span></p>
            {sub && <p className={`relative mt-1.5 truncate text-xs font-bold ${tone.sub}`}>{sub}</p>}
            {series && <span className="relative mt-3 block opacity-90 [&>svg]:h-auto [&>svg]:w-full"><Sparkline values={series} color={tone.line} width={160} height={26} /></span>}
        </div>
    );
};

const TONES = {
    emerald: { ring: 'hover:ring-emerald-200', glow: 'bg-emerald-200', icon: 'bg-emerald-100 text-emerald-600', sub: 'text-emerald-600', line: '#10b981' },
    amber: { ring: 'hover:ring-amber-200', glow: 'bg-amber-200', icon: 'bg-amber-100 text-amber-600', sub: 'text-amber-600', line: '#f59e0b' },
    sky: { ring: 'hover:ring-sky-200', glow: 'bg-sky-200', icon: 'bg-sky-100 text-sky-600', sub: 'text-sky-600', line: '#0ea5e9' },
    rose: { ring: 'hover:ring-rose-200', glow: 'bg-rose-200', icon: 'bg-rose-100 text-rose-500', sub: 'text-rose-600', line: '#f43f5e' }
};

/** The overall course progress as a ring that fills. */
const Ring = ({ value }) => {
    const r = 54;
    const c = 2 * Math.PI * r;
    return (
        <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90" aria-hidden>
            <defs>
                <linearGradient id="pc-ring" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#6366f1" /><stop offset="1" stopColor="#d946ef" /></linearGradient>
            </defs>
            <circle cx="64" cy="64" r={r} fill="none" stroke="#e0e7ff" strokeWidth="11" />
            <circle cx="64" cy="64" r={r} fill="none" stroke="url(#pc-ring)" strokeWidth="11" strokeLinecap="round"
                strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
        </svg>
    );
};

export default function ProgressCard({ summary, courses = [] }) {
    const s = summary.stats || { lessons: {}, quizzes: {}, courses: {}, xpThisWeek: 0 };
    const t = summary.series || {};
    const enrolled = courses.length;
    const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100).length;
    const done = courses.filter((c) => Number(c.progress) >= 100).length;
    const overall = enrolled ? Math.round(courses.reduce((a, c) => a + (Number(c.progress) || 0), 0) / enrolled) : 0;
    const pct = useCountUp(overall);
    const cheer = overall >= 100 ? 'Everything finished — outstanding! 🏆' : overall >= 60 ? "Keep going! You're doing great! 🚀" : overall > 0 ? 'Good start — one lesson at a time. 💪' : 'Open a course to get your progress moving. ✨';

    return (
        <section aria-labelledby="your-progress-title" className="rounded-3xl bg-white p-3 shadow-[0_24px_60px_-34px_rgba(30,22,80,0.55)] ring-1 ring-slate-200/70 sm:p-4">
            <div className="grid gap-3 lg:grid-cols-[19rem_minmax(0,1fr)] sm:gap-4">
                {/* ── Overall: the one number that sums it up ── */}
                <div className="relative isolate flex flex-col items-center overflow-hidden rounded-[1.4rem] bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-6 text-center text-indigo-950 ring-1 ring-indigo-100">
                    <span aria-hidden className="pointer-events-none absolute -top-20 -left-16 -z-10 h-56 w-56 rounded-full bg-indigo-200/50 blur-3xl" />
                    <span aria-hidden className="pointer-events-none absolute -right-16 -bottom-20 -z-10 h-56 w-56 rounded-full bg-fuchsia-200/50 blur-3xl" />
                    <h2 id="your-progress-title" className="flex items-center gap-2 self-start text-sm font-black tracking-[0.12em] text-indigo-700 uppercase"><TrendingUp size={16} className="text-indigo-500" /> Your progress</h2>
                    <div className="relative mt-4">
                        <Ring value={overall} />
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 bg-clip-text text-4xl font-black text-transparent tabular-nums">{pct}%</span>
                            <span className="text-[10px] font-bold tracking-[0.14em] text-slate-400 uppercase">Overall</span>
                        </span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-600">{cheer}</p>
                    <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
                        {[[enrolled, 'Enrolled'], [inProgress, 'Learning'], [done, 'Finished']].map(([v, l]) => (
                            <div key={l} className="rounded-xl bg-white px-2 py-2 shadow-sm ring-1 ring-indigo-100">
                                <p className="text-lg leading-none font-black tabular-nums">{v}</p>
                                <p className="mt-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">{l}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── The measures, each with its week ── */}
                <div className="stagger grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <Tile icon={CheckCircle2} label="Lessons done" value={s.lessons.total || 0} sub={`+${num(s.lessons.thisWeek || 0)} this week`} tone={TONES.emerald} series={t.lessons} />
                    {/* The figure is the average quiz score, not a pass rate:
                        "80% success rate" read as "passed 8 in 10". Passes from
                        before scores were recorded have no average to show. */}
                    <Tile icon={Star} label="Quizzes passed" value={s.quizzes.passed || 0} sub={s.quizzes.avgScore != null ? `${s.quizzes.avgScore}% average score` : s.quizzes.passed ? `+${num(s.quizzes.thisWeek || 0)} this week` : 'No quizzes yet'} tone={TONES.amber} series={t.quizzes} />
                    <Tile icon={Sparkles} label="XP earned" value={summary.xp} sub={`+${num(s.xpThisWeek || 0)} this week · Lv ${summary.level.level}`} tone={TONES.sky} series={t.xp} />
                    <Tile icon={Flame} label="Streak" value={summary.streak.current} suffix={summary.streak.current === 1 ? ' day' : ' days'} sub={`Best: ${num(summary.streak.longest)} ${summary.streak.longest === 1 ? 'day' : 'days'}`} tone={TONES.rose} series={t.streak} />
                </div>
            </div>
        </section>
    );
}
