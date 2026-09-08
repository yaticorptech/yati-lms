/**
 * The leaderboard card: a podium for the top three, a table for the rest,
 * the student's own row highlighted, and a "full leaderboard" view that
 * adds the scope filters and the rows around the student.
 */
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Trophy, ChevronDown, ArrowUp, ArrowDown, Minus, ArrowRight, Info, Globe, Building2, GraduationCap, BookOpen } from 'lucide-react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import { num } from './format';
import LeaderboardCelebration from './LeaderboardCelebration';
import LeaderboardPodium, { Avatar } from './LeaderboardPodium';

const PERIODS = [['daily', 'Today'], ['weekly', 'This Week'], ['monthly', 'This Month'], ['all', 'All Time']];
const SCOPES = [['global', 'Global', Globe], ['institution', 'Institution', Building2], ['class', 'Class', GraduationCap], ['course', 'Course', BookOpen]];
const Change = ({ m }) => m == null || m === 0
    ? <span className="inline-flex items-center text-slate-400"><Minus size={13} /></span>
    : m > 0 ? <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600"><ArrowUp size={13} /> {m}</span>
        : <span className="inline-flex items-center gap-0.5 font-bold text-rose-500"><ArrowDown size={13} /> {-m}</span>;

export default function LeaderboardCard({ courses = [] }) {
    const { user } = useContext(AuthContext);
    const [period, setPeriod] = useState('weekly');
    const [scope, setScope] = useState('global');
    const [chosenCourse, setCourseId] = useState('');
    const [full, setFull] = useState(false);
    const [tick, setTick] = useState(0);
    const courseId = chosenCourse || courses[0]?._id || '';
    const query = `${period}|${scope}|${scope === 'course' ? courseId : ''}`;
    const [result, setResult] = useState({ query: null, board: null, error: null, rankUp: null });

    useEffect(() => {
        const bump = () => setTick((t) => t + 1);
        window.addEventListener('yati:progress-changed', bump);
        return () => window.removeEventListener('yati:progress-changed', bump);
    }, []);
    useEffect(() => {
        if (scope === 'course' && !courseId) return;
        let cancelled = false;
        api.get('/rewards/leaderboard', { params: { period, scope, courseId: scope === 'course' ? courseId : undefined } })
            .then((r) => {
                if (cancelled) return;
                const key = `rw:rank:${query}`;
                let rankUp = null;
                try {
                    const prev = Number(localStorage.getItem(key));
                    const now = r.data.me?.rank;
                    if (now && prev && now < prev) rankUp = prev - now;
                    if (now) localStorage.setItem(key, String(now));
                } catch { /* private mode */ }
                setResult({ query, board: r.data, error: null, rankUp });
            })
            .catch((e) => !cancelled && setResult({ query, board: null, error: e.response?.data?.message || 'Could not load the leaderboard', rankUp: null }));
        return () => { cancelled = true; };
    }, [period, scope, courseId, query, tick]);

    const board = result.query === query ? result.board : null;
    const error = result.query === query ? result.error : null;
    const rankUp = result.query === query ? result.rankUp : null;
    const podium = useMemo(() => board ? board.entries.slice(0, 3) : [], [board]);

    // The winner's arrival is celebrated once per winner per session: the
    // key remembers who was on top for this period and scope, and a change
    // of winner (or a first look) sets the confetti off.
    const winner = podium[0] || null;
    const [celebrating, setCelebrating] = useState(null);
    useEffect(() => {
        if (!winner) return;
        const key = `lb-celebrated:${period}:${scope}:${winner.userId}`;
        let seen = false;
        try { seen = sessionStorage.getItem(key) === '1'; } catch { /* storage unavailable */ }
        if (seen) return;
        const t = setTimeout(() => {
            try { sessionStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
            setCelebrating({ name: winner.name, isMe: !!winner.isMe });
        }, 350);
        return () => clearTimeout(t);
    }, [winner, period, scope]);
    const stopCelebrating = useCallback(() => setCelebrating(null), []);
    const rest = useMemo(() => board ? board.entries.slice(3) : [], [board]);
    const me = board?.me;
    const meListed = board ? board.entries.some((e) => e.isMe) : true;
    const emptyReason = scope === 'institution' && !user?.institution ? 'Your institution is not set on your account yet. Ask an administrator to add it.'
        : scope === 'class' && !(user?.institution && user?.className) ? 'Your class is not set on your account yet. Ask an administrator to add it.'
        : null;

    return (
        <section id="leaderboard" className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            {celebrating && <LeaderboardCelebration onDone={stopCelebrating} />}
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2.5 text-xl font-black text-slate-900"><Trophy size={22} className="text-amber-500" /> Leaderboard</h2>
                    <p className="text-sm text-slate-500">Compete with learners and climb the ranks</p>
                </div>
                <label className="relative">
                    <select value={period} onChange={(e) => setPeriod(e.target.value)} className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-slate-700 focus:border-indigo-400 focus:outline-none">
                        {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                </label>
            </div>

            {full && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {SCOPES.map(([v, l, Icon]) => (
                        <button key={v} onClick={() => setScope(v)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${scope === v ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Icon size={13} /> {l}</button>
                    ))}
                    {scope === 'course' && (
                        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">
                            {courses.length === 0 && <option value="">No enrolled courses</option>}
                            {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
                        </select>
                    )}
                </div>
            )}

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
            {emptyReason && <div className="flex items-start gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800"><Info size={16} className="mt-0.5 shrink-0" /> {emptyReason}</div>}
            {!board && !error && <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>}

            {board && board.entries.length === 0 && !emptyReason && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                    <span className="text-4xl" aria-hidden="true">🏁</span>
                    <p className="mt-2 font-bold text-slate-800">Nobody has earned XP in this period yet</p>
                    <p className="text-sm text-slate-500">Complete a lesson and you'll be first.</p>
                </div>
            )}

            {board && podium.length > 0 && (
                <LeaderboardPodium podium={podium} />
            )}

            {board && (rest.length > 0 || (full && board.around.length > 0) || (!meListed && me?.rank)) && (
                <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                        <thead>
                            <tr className="text-xs font-semibold text-slate-500">
                                <th className="px-2 pb-2 font-semibold">Rank</th><th className="px-2 pb-2 font-semibold">Learner</th><th className="px-2 pb-2 font-semibold">Level</th><th className="px-2 pb-2 text-right font-semibold">XP</th><th className="px-2 pb-2 font-semibold">Streak</th><th className="px-2 pb-2 font-semibold">Badge</th><th className="px-2 pb-2 text-right font-semibold">Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rest.map((e) => <Row key={e.userId} e={e} />)}
                            {full && board.around.length > 0 && (
                                <>
                                    <tr><td colSpan="7" className="py-1 text-center text-[11px] font-bold text-slate-400">· · ·</td></tr>
                                    {board.around.map((e) => <Row key={e.userId} e={e} />)}
                                </>
                            )}
                            {!full && !meListed && me?.rank && (
                                <>
                                    <tr><td colSpan="7" className="py-1 text-center text-[11px] font-bold text-slate-400">· · ·</td></tr>
                                    <Row e={me} />
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {board && me && !me.rank && board.entries.length > 0 && (
                <p className="mt-3 rounded-xl bg-indigo-50 p-3 text-center text-xs font-semibold text-indigo-700">You have not earned XP in this period yet — complete a lesson to appear here.</p>
            )}
            {rankUp && <p className="rw-pop mt-3 text-center text-xs font-bold text-emerald-600">🎉 You moved up {rankUp} place{rankUp === 1 ? '' : 's'} since your last visit</p>}

            <div className="mt-auto pt-4 text-center">
                <button onClick={() => setFull((f) => !f)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-700 transition-colors hover:bg-indigo-100">
                    {full ? 'Show less' : 'View Full Leaderboard'} <ArrowRight size={15} className={full ? 'rotate-90 transition-transform' : 'transition-transform'} />
                </button>
            </div>
        </section>
    );
}

const Row = ({ e }) => (
    <tr className={e.isMe ? 'rounded-xl bg-indigo-50/80' : ''}>
        <td className="px-2 py-3 font-bold tabular-nums text-slate-700">{e.rank}</td>
        <td className="px-2 py-3"><div className="flex items-center gap-2"><Avatar e={e} size="h-8 w-8" ring={e.isMe ? 'ring-2 ring-rose-300' : ''} /><span className={`truncate font-semibold ${e.isMe ? 'font-black text-slate-900' : 'text-slate-800'}`}>{e.isMe ? 'You' : e.name}</span></div></td>
        <td className="px-2 py-3"><span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">Lv. {e.level}</span></td>
        <td className="px-2 py-3 text-right font-bold tabular-nums text-slate-800">{num(e.xp)} XP</td>
        <td className="px-2 py-3 whitespace-nowrap text-slate-700">🔥 {e.streak} days</td>
        <td className="px-2 py-3 text-base">{e.badge ? <span title={`${e.badge.title}${e.badge.count > 1 ? ` +${e.badge.count - 1}` : ''}`}>{e.badge.emoji}</span> : <span className="text-slate-300">—</span>}</td>
        <td className="px-2 py-3 text-right"><Change m={e.movement} /></td>
    </tr>
);
