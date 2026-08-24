/**
 * @description Career Path reporting — adoption, what students are aiming for,
 *              and how much Gemini the section is spending.
 *
 * Reporting only, with one exception: the lock in the header, which opens or
 * closes the section to students. Career Path is a student feature; this page
 * exists because two things about it are an operator's business and were
 * invisible:
 * what careers students are actually targeting (the clearest signal available
 * about which course to build next), and how close the day's AI spend is to the
 * free-tier ceiling (which you otherwise discover as a wall of failures during
 * a class).
 *
 * No student's roadmap, tasks or mentor conversation is reachable from here,
 * and nothing here deletes anything — locking the section hides it and keeps
 * every roadmap intact.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
    Compass, Users, Map, CheckCircle2, MessageSquare, Award,
    Sparkles, AlertTriangle, TrendingUp, RefreshCw, Lock, Unlock
} from 'lucide-react';

const Stat = ({ icon: Icon, label, value, sub, tone = 'indigo' }) => {
    const tones = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        slate: 'bg-slate-100 text-slate-600'
    };
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg ${tones[tone]}`}><Icon size={15} /></span>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            </div>
            <p className="text-3xl font-bold text-slate-800 tabular-nums">{value}</p>
            {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
    );
};

/**
 * A ranked list as proportional bars.
 *
 * Bars rather than a pie or a table: the question here is always "which of
 * these is biggest and by how much", and a bar answers it without a legend.
 */
const RankedBars = ({ title, subtitle, rows, empty, tone = 'indigo' }) => {
    const max = Math.max(1, ...rows.map(r => r.count));
    const bar = tone === 'amber' ? 'bg-amber-500' : 'bg-indigo-500';
    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h2 className="font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
            {rows.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>
            ) : (
                <ul className="space-y-2.5 mt-4">
                    {rows.map((r) => (
                        <li key={r.name}>
                            <div className="flex justify-between items-baseline gap-3 mb-1">
                                <span className="text-sm font-medium text-slate-700 truncate">{r.name}</span>
                                <span className="text-sm font-bold text-slate-800 tabular-nums shrink-0">{r.count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full ${bar} rounded-full`} style={{ width: `${(r.count / max) * 100}%` }} />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const CareerPath = () => {
    const [overview, setOverview] = useState(null);
    const [goals, setGoals] = useState(null);
    const [usage, setUsage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [locked, setLocked] = useState(false);
    const [savingLock, setSavingLock] = useState(false);

    // The error is cleared when the new data lands, not when the request starts.
    // Clearing it up front would be a setState in the body of the effect below,
    // and it also blanks a visible error for the second it takes to fail again.
    const load = React.useCallback(() => {
        Promise.all([
            api.get('/career/admin/overview'),
            api.get('/career/admin/goals'),
            api.get('/career/admin/ai-usage'),
            // Whether students can currently reach the section at all. Reporting
            // stays available either way, so a flat day has to be explainable as
            // "locked" rather than read as "nobody used it".
            api.get('/admin/settings')
        ])
            .then(([o, g, u, s]) => {
                setOverview(o.data); setGoals(g.data); setUsage(u.data);
                setLocked(s.data?.isCareerPathEnabled === false);
                setError(null);
            })
            .catch((err) => setError(err.response?.data?.message || 'Could not load Career Path reporting.'))
            .finally(() => setLoading(false));
    }, []);

    /**
     * Open or close the section to students.
     *
     * The one thing on this otherwise read-only page that changes what students
     * see, so it asks first — this takes the section away from everybody at
     * once, not just from the admin pressing it.
     */
    const toggleLock = async () => {
        const next = locked;
        if (!next && !window.confirm(
            'Lock Career Path?\n\nEvery student loses the tab immediately. Their roadmaps, tasks and progress are kept and come back when you unlock it.'
        )) return;

        setSavingLock(true);
        try {
            const res = await api.put('/admin/settings', { isCareerPathEnabled: next });
            setLocked(res.data?.isCareerPathEnabled === false);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not change the lock.');
        } finally {
            setSavingLock(false);
        }
    };

    useEffect(() => { load(); }, [load]);

    if (loading) return <div className="p-8 text-slate-500">Loading Career Path reporting…</div>;
    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm font-medium">
                {error}
            </div>
        );
    }

    const spendToday = usage?.today?.total || 0;
    const perService = usage?.limits?.perService;
    // Amber before it is a problem: finding out the ceiling was reached is far
    // less useful than seeing it coming while there is still a day left to act.
    const spendPressure = perService ? spendToday / perService : 0;
    const atCap = usage?.studentsAtCap || 0;

    const completionRate = overview?.tasks?.total
        ? Math.round((overview.tasks.completed / overview.tasks.total) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {locked && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Lock size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-bold text-amber-800">Career Path is locked</p>
                        <p className="text-amber-700 mt-0.5">
                            Students cannot open the section, so the figures below will not move.
                            Nothing has been deleted — unlock it in{' '}
                            <Link to="/settings" className="font-semibold underline hover:text-amber-900">Platform Settings</Link>.
                        </p>
                    </div>
                </div>
            )}

            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><Compass size={20} /></span>
                        Career Path
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Adoption, what students are aiming for, and today&apos;s AI spend.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Sits here as well as in Platform Settings: this is the
                        page an operator is on when they decide to close the
                        section, and hunting for a settings screen is not part of
                        that decision. Both read and write the same setting. */}
                    <button
                        onClick={toggleLock}
                        disabled={savingLock}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                            locked
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        title={locked
                            ? 'Give students the Career Path tab back'
                            : 'Hide Career Path from every student'}
                    >
                        {locked ? <Unlock size={15} /> : <Lock size={15} />}
                        {savingLock ? 'Saving…' : locked ? 'Unlock for students' : 'Lock for students'}
                    </button>
                    <button
                        onClick={load}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <RefreshCw size={15} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Adoption ─────────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={Users} label="Onboarded" value={overview?.onboarded ?? 0}
                      sub="Students who set a career goal" />
                <Stat icon={Map} label="Roadmaps" value={overview?.roadmaps ?? 0}
                      sub="Generated so far" tone="slate" />
                <Stat icon={CheckCircle2} label="Tasks done" value={overview?.tasks?.completed ?? 0}
                      sub={`${completionRate}% of ${overview?.tasks?.total ?? 0} assigned`} tone="emerald" />
                <Stat icon={TrendingUp} label="Active this week" value={overview?.activeThisWeek ?? 0}
                      sub="Finished a task in the last 7 days" tone="emerald" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat icon={MessageSquare} label="Used the mentor" value={overview?.mentorUsers ?? 0}
                      sub="Students who have asked at least once" tone="slate" />
                <Stat icon={Award} label="Milestone badges" value={overview?.milestoneBadges ?? 0}
                      sub="Roadmap phases completed and shared" tone="amber" />
                <Stat icon={Sparkles} label="AI calls today" value={spendToday}
                      sub={perService ? `of ${perService} allowed` : `${usage?.today?.failed ?? 0} failed`}
                      tone={spendPressure > 0.8 ? 'amber' : 'indigo'} />
                <Stat icon={AlertTriangle} label="Students at their cap" value={atCap}
                      sub={`Personal limit is ${usage?.limits?.perStudent ?? '—'}/day`}
                      tone={atCap > 0 ? 'amber' : 'slate'} />
            </div>

            {atCap > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={16} />
                    <p className="text-sm text-amber-900 leading-relaxed">
                        <strong className="font-bold">{atCap}</strong> student{atCap === 1 ? ' has' : 's have'} used
                        their full daily AI allowance ({usage?.limits?.perStudent}/day). They can still read
                        everything already generated — only new generation is paused until midnight. Raise
                        <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-xs">CAREER_AI_DAILY_PER_STUDENT</code>
                        if this is happening to students doing normal work.
                    </p>
                </div>
            )}

            {/* ── The course-planning signal ───────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2">
                <RankedBars
                    title="What students want to become"
                    subtitle="Typed in during onboarding. The clearest signal you have about which course to build next."
                    rows={goals?.careers || []}
                    empty="No career goals recorded yet."
                />
                <RankedBars
                    title="Where they are studying"
                    subtitle="Education level at onboarding."
                    rows={goals?.educationLevels || []}
                    empty="No education levels recorded yet."
                />
                <RankedBars
                    title="Branches and specialisations"
                    rows={goals?.specialisations || []}
                    empty="No specialisations recorded yet."
                />
                <RankedBars
                    title="Where they are"
                    subtitle="State, as given during onboarding."
                    rows={goals?.states || []}
                    empty="No locations recorded yet."
                />
            </div>

            {/* ── AI spend ─────────────────────────────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-2">
                <RankedBars
                    title="Today's AI calls by feature"
                    subtitle="Where the day's Gemini quota is going."
                    rows={(usage?.byKind || []).map(k => ({ name: k.kind, count: k.count }))}
                    empty="No AI calls today."
                    tone="amber"
                />
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="font-bold text-slate-800">AI calls, last 14 days</h2>
                    <p className="text-xs text-slate-500 mt-0.5 mb-5">Failed calls do not consume the provider&apos;s quota.</p>
                    {(usage?.byDay || []).length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">Nothing recorded yet.</p>
                    ) : (
                        <div className="flex items-end gap-1.5 h-36">
                            {usage.byDay.map((d) => {
                                const max = Math.max(1, ...usage.byDay.map(x => x.count));
                                return (
                                    <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                                        <div className="w-full flex flex-col justify-end h-28" title={`${d.day}: ${d.count} calls, ${d.failed} failed`}>
                                            <div className="w-full bg-indigo-500 rounded-t group-hover:bg-indigo-600 transition-colors"
                                                 style={{ height: `${(d.count / max) * 100}%` }} />
                                        </div>
                                        <span className="text-[9px] text-slate-400 tabular-nums">{d.day.slice(8)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {(usage?.topSpenders || []).length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                    <h2 className="font-bold text-slate-800">Heaviest AI users today</h2>
                    <p className="text-xs text-slate-500 mt-0.5 mb-4">
                        Useful for spotting a stuck retry loop, not for judging students.
                    </p>
                    <ul className="divide-y divide-slate-50">
                        {usage.topSpenders.map((s, i) => (
                            <li key={i} className="flex items-center justify-between py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate">{s.name}</p>
                                    {s.cardNumber && <p className="text-xs text-slate-400 font-mono">{s.cardNumber}</p>}
                                </div>
                                <span className={`text-sm font-bold tabular-nums shrink-0 ${
                                    s.count >= (usage?.limits?.perStudent || Infinity) ? 'text-amber-600' : 'text-slate-700'
                                }`}>
                                    {s.count}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CareerPath;
