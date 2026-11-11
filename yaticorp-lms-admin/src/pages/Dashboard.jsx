/**
 * @description The admin home (2026-11-05). Not a wall of totals — those live
 * on Overall analytics. It answers two questions, in this order:
 *
 *   1. What is waiting on me? Organizations to approve, cards to verify and
 *      open support tickets (the first two for super admins), each with one
 *      button to the page that clears it. "All clear" when nothing is.
 *   2. How is this week going? New students, active students, enrollments
 *      and completions for the last 7 days, each against the 7 before.
 *
 * Below that, the organizations waiting longest and the courses students are
 * joining this month. Everything comes from one call, GET /admin/home.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2, CreditCard, LifeBuoy, CheckCircle2, ArrowRight, UserPlus, Activity,
    BookOpen, GraduationCap, AlertTriangle, RefreshCw, BarChart3
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import useAutoRefresh from '../hooks/useAutoRefresh';

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`;
const daysAgo = (d) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
};
const TYPE_LABELS = { school: 'School', college: 'College', university: 'University', training_institute: 'Training institute', company: 'Company', ngo: 'NGO', government: 'Government', other: 'Other' };

const greeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

/** One queue: how many are waiting, what that means, and the way to clear it. */
const TaskCard = ({ icon: Icon, count, title, note, warn, to, action, loading }) => {
    const clear = !loading && count === 0;
    return (
        <div className={`flex min-w-0 flex-col rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${warn && !clear ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-200'}`}>
            <div className="flex items-start gap-3">
                <div className={`shrink-0 rounded-xl p-2.5 ${clear ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {clear ? <CheckCircle2 size={20} /> : <Icon size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                    {loading
                        ? <div className="h-8 w-12 animate-pulse rounded-lg bg-slate-100" />
                        : <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${clear ? 'text-slate-300' : 'text-slate-900'}`}>{num(count)}</p>}
                    <p className="mt-0.5 text-sm font-semibold text-slate-700">{title}</p>
                </div>
            </div>
            <p className={`mt-3 min-h-[1.25rem] text-xs ${warn && !clear ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
                {warn && !clear && <AlertTriangle size={12} className="mr-1 inline -mt-0.5" />}
                {loading ? '' : clear ? 'All clear.' : note}
            </p>
            <Link to={to}
                className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition-colors ${clear
                    ? 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                    : 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700'}`}>
                {clear ? 'Open' : action} <ArrowRight size={15} />
            </Link>
        </div>
    );
};

/** A week's figure against the week before, in words. */
const WeekStat = ({ icon: Icon, label, now, before, extra, loading }) => {
    const diff = (now || 0) - (before || 0);
    const pct = before ? Math.round((diff / before) * 100) : null;
    const tone = diff > 0 ? 'text-emerald-600 bg-emerald-50' : diff < 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100';
    return (
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-2 text-slate-500">
                <Icon size={16} className="shrink-0" />
                <p className="truncate text-xs font-bold uppercase tracking-wider">{label}</p>
            </div>
            {loading ? <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-slate-100" /> : (<>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">{num(now)}</p>
                    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
                        {diff === 0 ? 'same' : `${diff > 0 ? '+' : '−'}${num(Math.abs(diff))}${pct !== null ? ` (${Math.abs(pct)}%)` : ''}`}
                    </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{num(before)} the week before{extra ? ` · ${extra}` : ''}</p>
            </>)}
        </div>
    );
};

const Dashboard = () => {
    const { admin } = useAuth();
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);

    const refresh = useAutoRefresh(({ signal, isCurrent, fresh }) => api.get('/admin/home', { signal, params: fresh ? { fresh: 1 } : {} })
        .then((r) => { if (isCurrent()) { setData(r.data); setFailed(false); } })
        .catch((e) => { if (isCurrent() && e?.name !== 'CanceledError' && !data) setFailed(true); }), 30000);

    const loading = !data;
    const a = data?.attention || {};
    const w = data?.week || {};
    const superAdmin = data ? data.superAdmin : admin?.role === 'superadmin';
    const waiting = (a.orgsPending || 0) + (a.cardsWaiting || 0) + (a.ticketsOpen || 0);
    const oldestOrg = data?.pendingOrgs?.[0];
    const topMax = Math.max(1, ...(data?.topCourses || []).map((c) => c.enrolled));

    return (
        <div className="mx-auto max-w-7xl space-y-6 pb-10 animate-fade-in lg:space-y-8">
            <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{greeting()}, {admin?.name || 'Admin'}</h1>
                <p className="mt-1 text-sm text-slate-500 lg:text-base">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {!loading && (waiting ? ` · ${plural(waiting, 'thing is', 'things are')} waiting on you` : ' · nothing is waiting on you')}
                </p>
            </div>

            {failed && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    The dashboard could not be loaded just now.
                    <button onClick={() => refresh()} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                        <RefreshCw size={14} /> Try again
                    </button>
                </div>
            )}

            {/* 1. What is waiting */}
            <section aria-labelledby="todo-title">
                <h2 id="todo-title" className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Needs your attention</h2>
                <div className={`grid grid-cols-1 gap-3 sm:gap-4 ${superAdmin ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:max-w-sm'}`}>
                    {superAdmin && (
                        <TaskCard loading={loading} icon={Building2} count={a.orgsPending} title="Organizations to approve"
                            note={oldestOrg ? `Oldest: ${oldestOrg.name}, ${daysAgo(oldestOrg.createdAt)}` : 'Waiting for your review'}
                            warn={a.orgsStale > 0}
                            to="/organizations?status=pending" action="Review" />
                    )}
                    {superAdmin && (
                        <TaskCard loading={loading} icon={CreditCard} count={a.cardsWaiting} title="Cards to verify"
                            note="Students cannot sign up with these until they are verified"
                            to="/verify-cards" action="Verify" />
                    )}
                    <TaskCard loading={loading} icon={LifeBuoy} count={a.ticketsOpen} title="Open support tickets"
                        note={a.ticketsStale ? `${plural(a.ticketsStale, 'has', 'have')} waited more than 2 days` : `${num(a.ticketsInProgress)} more in progress`}
                        warn={a.ticketsStale > 0}
                        to="/tickets?status=open" action="Answer" />
                </div>
            </section>

            {/* 2. This week against last */}
            <section aria-labelledby="week-title">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 id="week-title" className="text-sm font-bold uppercase tracking-wider text-slate-500">This week</h2>
                    <span className="text-xs text-slate-400">Last 7 days, against the 7 before</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                    <WeekStat loading={loading} icon={UserPlus} label="New students" now={w.students?.now} before={w.students?.before} extra={`${num(w.students?.total)} in all`} />
                    <WeekStat loading={loading} icon={Activity} label="Active students" now={w.active?.now} before={w.active?.before} />
                    <WeekStat loading={loading} icon={BookOpen} label="Enrollments" now={w.enrollments?.now} before={w.enrollments?.before} />
                    <WeekStat loading={loading} icon={GraduationCap} label="Courses completed" now={w.completions?.now} before={w.completions?.before} />
                </div>
            </section>

            {/* 3. Detail worth a glance */}
            <div className={`grid grid-cols-1 gap-4 lg:gap-6 ${superAdmin && data?.pendingOrgs?.length ? 'xl:grid-cols-2' : ''}`}>
                <section aria-labelledby="courses-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 id="courses-title" className="text-base font-bold text-slate-900">Most joined courses <span className="font-medium text-slate-400">· last 30 days</span></h2>
                        <Link to="/analytics" className="shrink-0 text-sm font-bold text-indigo-600 hover:underline">Course analytics</Link>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
                    ) : data.topCourses.length === 0 ? (
                        <p className="py-6 text-center text-sm text-slate-400">No one has joined a course in the last 30 days.</p>
                    ) : (
                        <ol className="space-y-3">
                            {data.topCourses.map((c) => (
                                <li key={c._id} className="min-w-0">
                                    <div className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="truncate font-semibold text-slate-700" title={c.title}>{c.title}</span>
                                        <span className="shrink-0 tabular-nums text-slate-500">{plural(c.enrolled, 'student', 'students')}</span>
                                    </div>
                                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(c.enrolled / topMax) * 100}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>

                {superAdmin && data?.pendingOrgs?.length > 0 && (
                    <section aria-labelledby="orgs-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 id="orgs-title" className="text-base font-bold text-slate-900">Waiting longest</h2>
                            <Link to="/organizations?status=pending" className="shrink-0 text-sm font-bold text-indigo-600 hover:underline">All waiting</Link>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {data.pendingOrgs.map((o) => (
                                <li key={o._id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Building2 size={17} /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800" title={o.name}>{o.name}</p>
                                        <p className="text-xs text-slate-500">{[TYPE_LABELS[o.type], `registered ${daysAgo(o.createdAt)}`].filter(Boolean).join(' · ')}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <Link to="/overall-analytics" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600">
                <BarChart3 size={16} /> Everything else is on Overall analytics <ArrowRight size={14} />
            </Link>
        </div>
    );
};

export default Dashboard;
