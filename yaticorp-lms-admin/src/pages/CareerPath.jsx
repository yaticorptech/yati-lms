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
    Compass, Users, CheckCircle2, Sparkles, AlertTriangle, TrendingUp,
    RefreshCw, Lock, Unlock, GraduationCap, Target
} from 'lucide-react';

/** One headline number: what it is, the figure, one line of context, and an optional bar. */
const Stat = ({ icon: Icon, label, value, sub, percent, tone = 'indigo' }) => {
    const tones = {
        indigo: { chip: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-500' },
        emerald: { chip: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
        amber: { chip: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' }
    };
    const t = tones[tone] || tones.indigo;
    return (
        // Compact on a phone, where two share a row; from sm up, as before.
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
                <p className="text-xs font-semibold leading-snug text-slate-500 sm:text-sm">{label}</p>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${t.chip}`}><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></span>
            </div>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900 tabular-nums sm:mt-2 sm:text-3xl">{value}</p>
            {percent !== undefined && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 sm:mt-3">
                    <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
                </div>
            )}
            {sub && <p className="mt-1.5 text-[11px] leading-snug text-slate-500 sm:mt-2 sm:text-xs">{sub}</p>}
        </div>
    );
};

/**
 * A ranked list as proportional bars.
 *
 * Bars rather than a pie or a table: the question here is always "which of
 * these is biggest and by how much", and a bar answers it without a legend.
 */
const RankedBars = ({ icon: Icon, title, subtitle, rows, empty, tone = 'indigo', limit = 8 }) => {
    const max = Math.max(1, ...rows.map(r => r.count));
    const bar = tone === 'amber' ? 'bg-amber-500' : 'bg-indigo-500';
    return (
        // min-w-0: the truncated names are nowrap, and without it this card
        // would size its grid column to the longest one and run off a phone.
        <div className="min-w-0 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                {Icon && <Icon size={16} className="text-slate-400" />}
                {title}
            </h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 mb-4">{subtitle}</p>}
            {rows.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">{empty}</p>
            ) : (
                <ul className="space-y-2.5 mt-4">
                    {rows.slice(0, limit).map((r) => (
                        <li key={r.name}>
                            <div className="flex justify-between items-baseline gap-3 mb-1">
                                <span className="min-w-0 text-sm font-medium text-slate-700 truncate" title={r.name}>{r.name}</span>
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

// The meter records each AI request under an internal kind ('video-search-query').
// Shown to an admin as plain words.
const FEATURE_NAMES = {
    roadmap: 'Roadmap',
    'roadmap-career-entry': 'Roadmap (career entry)',
    'roadmap-postgrad': 'Roadmap (postgraduate)',
    tasks: 'Tasks',
    'daily-tasks': 'Daily plan',
    recommendations: 'Recommendations',
    scholarships: 'Scholarships',
    mentor: 'AI mentor',
    'study-material': 'Study material',
    'task-lesson-video': 'Video lesson notes',
    'task-lesson-reading': 'Reading lesson',
    'quiz-extra': 'Extra quiz questions',
    'video-search-query': 'Lesson video search',
    'video-choice': 'Lesson video pick',
    'interview-question': 'Interview questions',
    'interview-evaluate': 'Interview feedback',
    'interview-bank': 'Interview question bank',
    'learning-bio': 'Learning bio'
};
const featureName = (kind) => FEATURE_NAMES[kind] || String(kind || 'Other')
    .replace(/[-_]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

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
    const onboarded = overview?.onboarded ?? 0;
    const activeThisWeek = overview?.activeThisWeek ?? 0;
    const activeRate = onboarded ? Math.round((activeThisWeek / onboarded) * 100) : 0;
    const byDay = usage?.byDay || [];
    const dayMax = Math.max(1, ...byDay.map((d) => d.count));
    const fortnightTotal = byDay.reduce((n, d) => n + d.count, 0);

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
                <div className="min-w-0">
                    <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm"><Compass size={20} /></span>
                        Career Path
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5">
                        Student adoption, career goals and AI usage.
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

            {/* ── Headline numbers ─────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Stat icon={Users} label="Students onboarded" value={onboarded}
                      sub="Set a career goal in onboarding" />
                <Stat icon={TrendingUp} label="Active this week" value={activeThisWeek}
                      percent={activeRate}
                      sub={`${activeRate}% of onboarded finished a task in 7 days`} tone="emerald" />
                <Stat icon={CheckCircle2} label="Task completion" value={`${completionRate}%`}
                      percent={completionRate}
                      sub={`${overview?.tasks?.completed ?? 0} of ${overview?.tasks?.total ?? 0} tasks done`} tone="emerald" />
                <Stat icon={Sparkles} label="AI requests today" value={spendToday}
                      percent={perService ? Math.round(spendPressure * 100) : undefined}
                      sub={[
                          perService ? `of ${perService} allowed` : null,
                          `${usage?.today?.failed ?? 0} failed`,
                          atCap ? `${atCap} at daily cap` : null
                      ].filter(Boolean).join(' · ')}
                      tone={spendPressure > 0.8 || atCap > 0 ? 'amber' : 'indigo'} />
            </div>

            {atCap > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                    <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={16} />
                    <p className="text-sm text-amber-900 leading-relaxed">
                        <strong className="font-bold">{atCap}</strong> student{atCap === 1 ? ' has' : 's have'} used
                        their full daily AI allowance ({usage?.limits?.perStudent}/day). Existing content stays
                        available; new generation resumes at midnight. Raise
                        <code className="mx-1 px-1.5 py-0.5 bg-amber-100 rounded text-xs break-all">CAREER_AI_DAILY_PER_STUDENT</code>
                        if this happens during normal use.
                    </p>
                </div>
            )}

            {/* ── Who the students are ─────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <RankedBars
                    icon={Target}
                    title="Career goals"
                    subtitle="What students want to become — a guide to which courses to build next."
                    rows={goals?.careers || []}
                    empty="No career goals recorded yet."
                />
                <RankedBars
                    icon={GraduationCap}
                    title="Education level"
                    subtitle="As given during onboarding."
                    rows={goals?.educationLevels || []}
                    empty="No education levels recorded yet."
                />
            </div>

            {/* ── AI usage ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-3">
                    <div className="mb-5 flex items-baseline justify-between gap-3">
                        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                            <Sparkles size={16} className="text-slate-400" />
                            AI requests, last 14 days
                        </h2>
                        <span className="text-xs text-slate-500 tabular-nums">{fortnightTotal} total</span>
                    </div>
                    {byDay.length === 0 ? (
                        <p className="text-sm text-slate-400 py-6 text-center">Nothing recorded yet.</p>
                    ) : (
                        <div className="flex items-end gap-1.5 h-40">
                            {byDay.map((d) => (
                                <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 group">
                                    <div className="w-full flex flex-col justify-end h-32" title={`${d.day}: ${d.count} requests, ${d.failed} failed`}>
                                        <div className="w-full rounded-t bg-indigo-500 transition-colors group-hover:bg-indigo-600"
                                             style={{ height: `${(d.count / dayMax) * 100}%`, minHeight: d.count ? 2 : 0 }} />
                                    </div>
                                    <span className="text-[10px] text-slate-400 tabular-nums">{d.day.slice(8)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2">
                    <RankedBars
                        title="Today by feature"
                        subtitle="Where today's AI requests went."
                        rows={(usage?.byKind || []).map(k => ({ name: featureName(k.kind), count: k.count }))}
                        empty="No AI requests today."
                        tone="amber"
                        limit={6}
                    />
                </div>
            </div>
        </div>
    );
};

export default CareerPath;
