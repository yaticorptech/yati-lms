/**
 * Beside the leaderboard on the Dashboard when the student is in no club (the clubs card takes
 * that place otherwise): where they stand this week, how far it is to pass the next learner,
 * and the quickest ways to earn the XP — so the board is something to act on, not just read.
 */
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Target, ListChecks, Mic, BookOpen, Gamepad2, ArrowRight, Crown } from 'lucide-react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { useXpRule } from '../../context/useRewards';
import { num } from './format';

export default function RankClimbCard({ className = '' }) {
    const { isCareerPathEnabled } = useContext(AuthContext);
    const taskXp = useXpRule('career_task');
    const mockXp = useXpRule('mock_interview');
    const [board, setBoard] = useState(null);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const bump = () => setTick((t) => t + 1);
        window.addEventListener('yati:progress-changed', bump);
        return () => window.removeEventListener('yati:progress-changed', bump);
    }, []);
    useEffect(() => {
        let live = true;
        api.get('/rewards/leaderboard', { params: { period: 'weekly', scope: 'global', limit: 3 } })
            .then((r) => { if (live) setBoard(r.data); })
            .catch(() => { if (live) setBoard({ failed: true }); });
        return () => { live = false; };
    }, [tick]);

    if (!board) return <section className={`min-h-[22rem] animate-pulse rounded-3xl border border-slate-200 bg-white ${className}`} />;
    if (board.failed) return null;

    const me = board.me || {};
    const ahead = me.rank > 1 ? [...(board.around || []), ...(board.entries || [])].find((e) => e.rank === me.rank - 1) : null;
    const gap = ahead ? Math.max(1, (ahead.xp || 0) - (me.xp || 0) + 1) : 0;
    const pct = ahead && ahead.xp ? Math.min(100, Math.round(((me.xp || 0) / ahead.xp) * 100)) : 100;

    const ways = [
        isCareerPathEnabled && { to: '/career/planner', icon: ListChecks, label: "Finish today's task", xp: taskXp, tone: 'bg-indigo-50 text-indigo-600' },
        { to: '/interview', icon: Mic, label: 'Take a mock interview', xp: mockXp, tone: 'bg-rose-50 text-rose-600' },
        { to: '/enrolled-courses', icon: BookOpen, label: 'Complete a lesson', tone: 'bg-emerald-50 text-emerald-600' },
        { to: '/games', icon: Gamepad2, label: 'Play a brain game', tone: 'bg-amber-50 text-amber-600' }
    ].filter(Boolean);

    return (
        <section aria-labelledby="climb-title" className={`flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 id="climb-title" className="flex items-center gap-2 text-lg font-black text-slate-900"><TrendingUp size={20} className="text-indigo-600" /> Climb the ranks</h2>
                    <p className="text-sm text-slate-500">Your week, and how to move up</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">This week</span>
            </div>

            {/* Where they stand, and the next learner to pass */}
            <div className="mt-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-4 ring-1 ring-indigo-100">
                <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-200">
                        <span className="text-[9px] font-bold tracking-wider uppercase opacity-80">Rank</span>
                        <span className="text-xl leading-none font-black tabular-nums">{me.rank ? `#${me.rank}` : '—'}</span>
                    </span>
                    <div className="min-w-0">
                        <p className="text-2xl leading-tight font-black text-slate-900 tabular-nums">{num(me.xp || 0)} <span className="text-sm font-bold text-slate-500">XP this week</span></p>
                        <p className="text-xs text-slate-500">{board.total ? `of ${num(board.total)} learners` : 'Earn XP to join the board'}</p>
                    </div>
                </div>
                {ahead ? (
                    <div className="mt-4">
                        <p className="flex items-center gap-1.5 text-sm text-slate-700">
                            <Target size={15} className="shrink-0 text-indigo-500" />
                            <span><span className="font-black text-indigo-700">{num(gap)} XP</span> to pass <span className="font-bold">{ahead.name}</span> (#{ahead.rank})</span>
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-indigo-100">
                            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                ) : me.rank === 1 ? (
                    <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-amber-700"><Crown size={15} /> You're on top this week — keep it.</p>
                ) : null}
            </div>

            {/* The quickest ways to earn it */}
            <p className="mt-5 text-[11px] font-black tracking-[0.12em] text-slate-400 uppercase">Earn XP</p>
            <ul className="mt-2 flex-1 space-y-1.5">
                {ways.map(({ to, icon: Icon, label, xp, tone }) => (
                    <li key={to}>
                        <Link to={to} className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={17} /></span>
                            <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{label}</span>
                            {xp > 0 && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-black text-amber-700 ring-1 ring-amber-100">+{xp} XP</span>}
                            <ArrowRight size={15} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
