/**
 * "Your Progress", small (redesigned 2026-10-31): a slim title row with a
 * word of encouragement, the overall course progress as a small ring beside
 * Enrolled / Learning / Finished, and four compact measures — lessons,
 * quizzes, XP and streak. Lessons, quizzes and XP come from the rewards
 * summary; courses and overall progress from the enrolled courses.
 */
import React from 'react';
import { TrendingUp, CheckCircle2, Star, Sparkles, Flame } from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';
import { num } from './format';
import Sparkline from './Sparkline';

/**
 * One measure, small: its icon and label, the figure, what changed this week,
 * and a thin trend along the bottom. Two to a row on a phone, four across
 * from sm (redesigned small, 2026-10-31).
 */
const Tile = ({ icon: Icon, label, value, suffix = '', sub, tone, series }) => {
    const n = useCountUp(value);
    return (
        <div className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-white p-3 ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(30,22,80,0.4)] sm:p-3.5">
            {/* A thin bar of the measure's colour along the top. */}
            <span aria-hidden className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone.bar}`} />
            <span aria-hidden className={`pointer-events-none absolute -top-8 -right-8 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-70 ${tone.glow}`} />
            <div className="relative flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${tone.badge}`}><Icon size={14} /></span>
                <p className="truncate text-[10px] font-semibold tracking-[0.1em] text-slate-500 uppercase">{label}</p>
            </div>
            <p className="relative mt-2.5 text-2xl leading-none font-bold text-slate-900 tabular-nums">{n.toLocaleString('en-IN')}<span className="text-sm font-semibold text-slate-500">{suffix}</span></p>
            {sub && <p className={`relative mt-1 truncate text-[11px] font-semibold ${tone.sub}`}>{sub}</p>}
            {series && <span className="relative mt-auto block pt-2 opacity-90 [&>svg]:h-auto [&>svg]:w-full"><Sparkline values={series} color={tone.line} width={160} height={20} /></span>}
        </div>
    );
};

const TONES = {
    emerald: { bar: 'from-emerald-300 to-emerald-500', badge: 'from-emerald-400 to-emerald-600', glow: 'bg-emerald-200', sub: 'text-emerald-600', line: '#10b981' },
    amber: { bar: 'from-amber-300 to-orange-400', badge: 'from-amber-400 to-orange-500', glow: 'bg-amber-200', sub: 'text-amber-600', line: '#f59e0b' },
    sky: { bar: 'from-sky-300 to-blue-500', badge: 'from-sky-400 to-blue-600', glow: 'bg-sky-200', sub: 'text-sky-600', line: '#0ea5e9' },
    rose: { bar: 'from-rose-300 to-pink-500', badge: 'from-rose-400 to-pink-600', glow: 'bg-rose-200', sub: 'text-rose-600', line: '#f43f5e' }
};

/** The overall course progress as a ring that fills, white on the violet tile. */
const Ring = ({ value }) => {
    const r = 54;
    const c = 2 * Math.PI * r;
    return (
        <svg viewBox="0 0 128 128" className="h-20 w-20 -rotate-90" aria-hidden>
            <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="12" />
            <circle cx="64" cy="64" r={r} fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round"
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

    return (
        // The same slowly shifting border as My Profile's card (index.css, ph-frame).
        <div className="ph-frame rounded-2xl p-[1.5px] shadow-[0_18px_40px_-28px_rgba(79,70,229,0.45)]">
        <section aria-labelledby="your-progress-title" className="overflow-hidden rounded-[0.9rem] bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
                <h2 id="your-progress-title" className="flex shrink-0 items-center gap-2 text-sm font-bold text-slate-800">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm"><TrendingUp size={14} /></span>
                    Your progress
                </h2>
            </div>
            <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
                {/* ── Overall: the ring, and the courses behind it, on a bold violet tile ── */}
                <div className="relative isolate flex items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-3.5 text-white shadow-[0_14px_30px_-18px_rgba(109,40,217,0.8)]">
                    <span aria-hidden className="ph-blob pointer-events-none absolute -top-10 -right-8 -z-10 h-28 w-28 rounded-full bg-white/15 blur-xl" />
                    <span aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-20 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.5)_0_1px,transparent_1px_12px)]" />
                    <div className="relative shrink-0">
                        <Ring value={overall} />
                        <span className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-lg leading-none font-bold tabular-nums">{pct}%</span>
                            <span className="mt-0.5 text-[8px] font-bold tracking-[0.14em] text-white/70 uppercase">Overall</span>
                        </span>
                    </div>
                    <dl className="grid min-w-0 flex-1 grid-cols-3 gap-1.5 text-center lg:grid-cols-1 lg:text-left">
                        {[[enrolled, 'Enrolled'], [inProgress, 'Learning'], [done, 'Finished']].map(([v, l]) => (
                            <div key={l} className="flex flex-col items-center rounded-lg bg-white/15 px-1.5 py-1 backdrop-blur-sm lg:flex-row lg:items-baseline lg:gap-2 lg:px-2.5">
                                {/* The label first, as a dl wants; the number is shown first. */}
                                <dt className="order-2 mt-0.5 text-[10px] font-semibold tracking-wide text-white/75 uppercase lg:mt-0">{l}</dt>
                                <dd className="order-1 text-base leading-none font-bold tabular-nums lg:w-5 lg:text-right">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                {/* ── The measures, each with its week ── */}
                <div className="stagger grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
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
        </div>
    );
}
