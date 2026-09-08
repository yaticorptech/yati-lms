/** Achievements as badges that pop in one after another. */
import { Trophy } from 'lucide-react';
import { fmtDate } from './api';
import { Empty } from './ui';

export default function AchievementBadges({ achievements = [], limit }) {
    const rows = limit ? achievements.slice(0, limit) : achievements;
    if (!rows.length) return <Empty icon={Trophy} title="No achievements yet">Streaks, quizzes and course completions unlock badges.</Empty>;
    return (
        <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((a, i) => (
                <li key={`${a.id}-${i}`} className="lift animate-pop-in flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center" style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-rose-100 text-3xl shadow-inner ring-4 ring-white" aria-hidden="true">{a.emoji || '🎖️'}</span>
                    <p className="mt-2 line-clamp-2 text-sm font-bold text-slate-900">{a.title}</p>
                    {a.description && <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{a.description}</p>}
                    {a.earnedAt && <p className="mt-1 text-[11px] text-slate-400">{fmtDate(a.earnedAt)}</p>}
                </li>
            ))}
        </ul>
    );
}
