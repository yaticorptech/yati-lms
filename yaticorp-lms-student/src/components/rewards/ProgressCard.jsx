/**
 * "Your Progress": five headline numbers and an overall progress bar, in the
 * pastel-tile style of the design. Lessons, quizzes and XP come from the
 * rewards summary; courses and overall progress from the enrolled courses.
 */
import React from 'react';
import { TrendingUp, BookOpen, CheckCircle2, Star, Sparkles, Flame, CalendarDays, ChevronDown } from 'lucide-react';
import useCountUp from '../../hooks/useCountUp';
import { num } from './format';
import Sparkline from './Sparkline';

const Tile = ({ icon: Icon, label, value, suffix = '', sub, tone, series }) => {
    const n = useCountUp(value);
    return (
        <div className={`lift relative flex items-center gap-3.5 overflow-hidden rounded-2xl border p-4 ${tone.card}`}>
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${tone.icon}`}><Icon size={26} /></span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-600">{label}</p>
                <p className="truncate text-3xl font-black tabular-nums leading-tight text-slate-900">{n.toLocaleString('en-IN')}{suffix}</p>
                {sub && <p className={`truncate text-sm font-semibold ${series ? 'pr-14' : ''} ${tone.sub}`}>{sub}</p>}
            </div>
            {series && <span className="pointer-events-none absolute bottom-2.5 right-3 opacity-90"><Sparkline values={series} color={tone.line} width={64} height={28} /></span>}
        </div>
    );
};

const TONES = {
    indigo: { card: 'border-indigo-100 bg-indigo-50/70', icon: 'bg-indigo-100 text-indigo-600', sub: 'text-indigo-600', line: '#6366f1' },
    emerald: { card: 'border-emerald-100 bg-emerald-50/70', icon: 'bg-emerald-100 text-emerald-600', sub: 'text-emerald-600', line: '#10b981' },
    amber: { card: 'border-amber-100 bg-amber-50/70', icon: 'bg-amber-100 text-amber-500', sub: 'text-amber-600', line: '#f59e0b' },
    sky: { card: 'border-sky-100 bg-sky-50/70', icon: 'bg-sky-100 text-sky-600', sub: 'text-sky-600', line: '#0ea5e9' },
    rose: { card: 'border-rose-100 bg-rose-50/70', icon: 'bg-rose-100 text-rose-500', sub: 'text-rose-600', line: '#f43f5e' }
};

export default function ProgressCard({ summary, courses = [] }) {
    const s = summary.stats || { lessons: {}, quizzes: {}, courses: {}, xpThisWeek: 0 };
    const t = summary.series || {};
    const enrolled = courses.length;
    const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100).length;
    const overall = enrolled ? Math.round(courses.reduce((a, c) => a + (Number(c.progress) || 0), 0) / enrolled) : 0;
    const pct = useCountUp(overall);
    const cheer = overall >= 100 ? 'Everything finished — outstanding! 🏆' : overall >= 60 ? "Keep going! You're doing great! 🚀" : overall > 0 ? 'Good start — one lesson at a time. 💪' : 'Open a course to get your progress moving. ✨';

    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900"><TrendingUp size={22} className="text-indigo-600" /> Your Progress</h2>
                <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"><CalendarDays size={15} /> This week <ChevronDown size={14} className="text-slate-400" /></span>
            </div>
            <div className="stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Tile icon={BookOpen} label="Courses Enrolled" value={enrolled} sub={`${inProgress} in progress`} tone={TONES.indigo} series={t.courses} />
                <Tile icon={CheckCircle2} label="Lessons Completed" value={s.lessons.total || 0} sub={`+${num(s.lessons.thisWeek || 0)} this week`} tone={TONES.emerald} series={t.lessons} />
                <Tile icon={Star} label="Quizzes Passed" value={s.quizzes.passed || 0} sub={s.quizzes.avgScore != null ? `${s.quizzes.avgScore}% success rate` : 'No quizzes yet'} tone={TONES.amber} series={t.quizzes} />
                <Tile icon={Sparkles} label="XP Earned" value={summary.xp} sub={`+${num(s.xpThisWeek || 0)} this week · Level ${summary.level.level}`} tone={TONES.sky} series={t.xp} />
                <Tile icon={Flame} label="Current Streak" value={summary.streak.current} suffix={summary.streak.current === 1 ? ' day' : ' days'} sub={`Best: ${num(summary.streak.longest)} days`} tone={TONES.rose} series={t.streak} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="shrink-0 text-sm font-semibold text-slate-600">Overall Progress</p>
                <div className="h-3 min-w-[140px] flex-1 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-[width] duration-1000 ease-out" style={{ width: `${overall}%` }} />
                </div>
                <span className="shrink-0 text-lg font-black tabular-nums text-indigo-600">{pct}%</span>
                <span className="hidden shrink-0 text-sm font-semibold text-slate-600 lg:block">{cheer}</span>
            </div>
        </section>
    );
}
