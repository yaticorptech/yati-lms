/**
 * Overall analytics: the whole platform on one page — students and who is
 * active, sign-ups over the last 30 days, learning, every feature's use,
 * rewards and the wallet, cards, organizations and support. Course-level
 * numbers stay on Course analytics.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
    ChartNoAxesCombined, Users, Activity, BookOpenCheck, Building2, RefreshCw, GraduationCap, Sparkles, Wallet, CreditCard,
    MessageCircleQuestion, AlertTriangle
} from 'lucide-react';

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const TYPE_LABEL = { school_student: 'School students', college_student: 'College students', adult: 'Adults', professional: 'Professionals', instructor: 'Instructors' };
const ROLE_LABEL = { superadmin: 'Super admins', admin: 'Admins', orgadmin: 'Organization admins' };
const ROLE_ORDER = ['superadmin', 'admin', 'orgadmin'];
const CARD = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';

const Kpi = ({ icon: Icon, label, value, sub, tone }) => (
    <div className={`${CARD} min-w-0`}>
        <div className="flex items-center gap-2">
            <span className={`shrink-0 rounded-lg p-1.5 ${tone}`}><Icon size={15} /></span>
            <p className="min-w-0 text-[11px] font-bold uppercase leading-snug tracking-wider text-slate-500">{label}</p>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-slate-800 [overflow-wrap:anywhere] sm:text-3xl">{value}</p>
        {sub && <p className="mt-1 text-xs leading-snug text-slate-500">{sub}</p>}
    </div>
);

const Section = ({ icon: Icon, title, sub, children, className = '' }) => (
    <section className={`${CARD} ${className}`}>
        <div className="mb-4 flex items-start gap-2.5">
            <span className="shrink-0 rounded-lg bg-indigo-50 p-1.5 text-indigo-600"><Icon size={16} /></span>
            <div className="min-w-0">
                <h2 className="font-bold text-slate-800">{title}</h2>
                {sub && <p className="text-xs text-slate-500">{sub}</p>}
            </div>
        </div>
        {children}
    </section>
);

// A labelled number with a bar against the biggest in its list.
const BarRow = ({ label, value, max, right, tone = 'bg-indigo-500' }) => (
    <li className="min-w-0">
        <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-slate-700" title={label}>{label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-800">{right ?? num(value)}</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${tone}`} style={{ width: `${max ? Math.max(value ? 2 : 0, (value / max) * 100) : 0}%` }} />
        </div>
    </li>
);

const Figure = ({ label, value, sub }) => (
    <div className="min-w-0 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 text-lg font-bold tabular-nums text-slate-800 [overflow-wrap:anywhere]">{value}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
);

// 30 days of active students and sign-ups, one pair of bars a day.
const DailyChart = ({ daily }) => {
    const max = Math.max(1, ...daily.map((d) => Math.max(d.active, d.signups)));
    const short = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-indigo-500" /> Active students</span>
                <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" /> New sign-ups</span>
            </div>
            <div className="flex h-44 items-end gap-[2px] border-b border-slate-200 sm:gap-1" role="img" aria-label="Active students and new sign-ups per day for the last 30 days">
                {daily.map((d) => (
                    <div key={d.day} className="flex h-full min-w-0 flex-1 items-end justify-center gap-px" title={`${short(d.day)}: ${d.active} active, ${d.signups} signed up`}>
                        <div className="w-1/2 max-w-[10px] rounded-t-sm bg-indigo-500" style={{ height: `${(d.active / max) * 100}%` }} />
                        <div className="w-1/2 max-w-[10px] rounded-t-sm bg-emerald-400" style={{ height: `${(d.signups / max) * 100}%` }} />
                    </div>
                ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
                <span>{short(daily[0].day)}</span><span>{short(daily[14].day)}</span><span>Today</span>
            </div>
        </div>
    );
};

export default function OverallAnalytics() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const fetchData = useCallback((fresh) => api.get('/admin/overall-analytics', { params: fresh ? { fresh: 1 } : {} })
        .then((r) => { setData(r.data); setError(null); })
        .catch((e) => setError(e.response?.data?.message || 'Could not load the analytics'))
        .finally(() => setLoading(false)), []);
    useEffect(() => { fetchData(false); }, [fetchData]);
    // Refresh skips the server's one-minute cache.
    const load = () => { setLoading(true); setError(null); fetchData(true); };

    const p = data?.people;
    const l = data?.learning;
    const rw = data?.rewards;
    const orgs = p?.organizations || {};
    const featureMax = Math.max(1, ...(data?.features || []).map((f) => f.last30));
    const typeMax = Math.max(1, ...(p?.accountTypes || []).map((t) => t.n));
    const topCourseMax = Math.max(1, ...(l?.topCourses || []).map((c) => c.enrollments));
    const topOrgMax = Math.max(1, ...(data?.topOrganizations || []).map((o) => o.students));
    const cards = data?.cards?.byStatus || {};
    const cardsTotal = Object.values(cards).reduce((a, b) => a + b, 0);
    const completionRate = l?.enrollments ? Math.min(100, Math.round((l.completions / l.enrollments) * 100)) : 0;

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><ChartNoAxesCombined className="text-indigo-600" /> Overall analytics</h1>
                    <p className="mt-1 text-sm text-slate-500">Everything happening across the platform: students, learning, every feature, rewards, cards and organizations. Course by course numbers are on <Link to="/analytics" className="font-semibold text-indigo-600 hover:underline">Course analytics</Link>.</p>
                </div>
                <button type="button" onClick={load} disabled={loading} className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:self-auto">
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {data ? `Updated ${new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : 'Refresh'}
                </button>
            </div>

            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    <span className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</span>
                    <button type="button" onClick={load} className="rounded-xl border border-red-200 bg-white px-3 py-1.5 font-bold hover:bg-red-100">Try again</button>
                </div>
            )}

            {!data && !error ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-200/70" />)}</div>
            ) : data && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Kpi icon={Users} tone="bg-blue-100 text-blue-600" label="Students" value={num(p.students)} sub={`+${num(p.new7)} this week · +${num(p.new30)} in 30 days`} />
                        <Kpi icon={Activity} tone="bg-indigo-100 text-indigo-600" label="Active today" value={num(data.active.today)} sub={`${num(data.active.week)} this week · ${num(data.active.month)} in 30 days`} />
                        <Kpi icon={BookOpenCheck} tone="bg-emerald-100 text-emerald-600" label="Teachers" value={num(p.teachers)} sub={`+${num(p.teachersNew30)} in 30 days`} />
                        <Kpi icon={Building2} tone="bg-amber-100 text-amber-600" label="Organizations" value={num(orgs.active || 0)} sub={`active · ${num(orgs.pending || 0)} waiting for approval`} />
                    </div>

                    <Section icon={Activity} title="The last 30 days" sub="A student counts as active on a day they learn, practise, play, search jobs or earn XP.">
                        <DailyChart daily={data.daily} />
                    </Section>

                    {/* Paired cards share a row and its height; the long lists
                        (feature use) and the eight wallet figures take the full
                        width, so no card leaves a hole beside it (2026-10-28). */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section icon={GraduationCap} title="Learning" sub="Courses, enrollments and what students finish">
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                                <Figure label="Courses" value={num(l.publishedCourses)} sub={`published of ${num(l.courses)}`} />
                                <Figure label="Enrollments" value={num(l.enrollments)} sub={`+${num(l.enrollments30)} in 30 days`} />
                                <Figure label="Completed" value={num(l.completions)} sub={`+${num(l.completions30)} in 30 days`} />
                                <Figure label="Completion rate" value={`${completionRate}%`} sub="of enrollments finished" />
                                <Figure label="Certificates" value={num(l.certificates)} sub={`+${num(l.certificates30)} in 30 days`} />
                                <Figure label="Average progress" value={`${l.avgProgress}%`} sub="across every enrollment" />
                            </div>
                            {l.topCourses.length > 0 && (
                                <>
                                    <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Most enrolled courses</p>
                                    <ul className="space-y-3">{l.topCourses.map((c) => <BarRow key={c.id} label={c.title} value={c.enrollments} max={topCourseMax} />)}</ul>
                                </>
                            )}
                        </Section>

                        <Section icon={Users} title="People" sub="Students, and who runs the platform">
                            <div className="grid grid-cols-2 gap-2.5">
                                {ROLE_ORDER.map((role) => <Figure key={role} label={ROLE_LABEL[role]} value={num(p.admins[role] || 0)} />)}
                                <Figure label="In an organization" value={num(p.inOrganizations)} sub={`of ${num(p.students)} students`} />
                            </div>
                            <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">Students by type</p>
                            <ul className="space-y-3">{p.accountTypes.map((t) => <BarRow key={t.type} label={TYPE_LABEL[t.type] || t.type} value={t.n} max={typeMax} tone="bg-blue-500" />)}</ul>
                        </Section>
                    </div>

                    <Section icon={Sparkles} title="Feature use" sub="Last 30 days, with the all-time total">
                        <ul className="grid gap-x-10 gap-y-3 md:grid-cols-2">
                            {[...data.features].sort((a, b) => b.last30 - a.last30).map((f) => (
                                <BarRow key={f.key} label={f.label} value={f.last30} max={featureMax} right={<>{num(f.last30)} <span className="font-normal text-slate-400">/ {num(f.total)}</span></>} />
                            ))}
                        </ul>
                    </Section>

                    <Section icon={Wallet} title="Rewards and wallet">
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            <Figure label="XP earned" value={num(rw.xp30)} sub="in 30 days" />
                            <Figure label="XP all time" value={num(rw.xpTotal)} sub="every student together" />
                            <Figure label="Badges unlocked" value={num(rw.badges)} sub="all time" />
                            <Figure label="Streaks running" value={num(rw.streaks)} sub="two days or more" />
                            <Figure label="Wallet balances" value={money(rw.walletAvailable)} sub="held by students now" />
                            <Figure label="Spent in the LMS" value={money(rw.walletSpent)} sub="courses and features" />
                            <Figure label="Feature charges" value={money(rw.charges30)} sub="in 30 days" />
                            <Figure label="Wallet recharges" value={money(rw.recharged)} sub="added by admins" />
                        </div>
                    </Section>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Section icon={Building2} title="Organizations" sub="Most students first">
                            <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
                                {Object.entries(orgs).map(([s, n]) => <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 capitalize text-slate-600">{s} {num(n)}</span>)}
                            </div>
                            {data.topOrganizations.length ? (
                                <ul className="space-y-3">{data.topOrganizations.map((o) => <BarRow key={o.id} label={o.name} value={o.students} max={topOrgMax} tone="bg-amber-500" />)}</ul>
                            ) : <p className="text-sm italic text-slate-400">No students in an organization yet.</p>}
                        </Section>

                        <Section icon={CreditCard} title="Cards and support">
                            <div className="grid grid-cols-3 gap-2.5">
                                <Figure label="Cards" value={num(cardsTotal)} sub={`${num(data.cards.verified)} verified`} />
                                <Figure label="Registered" value={num(cards.used || 0)} sub="used to sign up" />
                                <Figure label="Not registered" value={num((cards.activated || 0) + (cards.unactivated || 0))} sub="still free" />
                            </div>
                            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                <MessageCircleQuestion size={18} className="shrink-0 text-slate-500" />
                                <p className="min-w-0 flex-1 text-sm text-slate-700"><span className="font-bold tabular-nums">{num(data.support.open || 0)}</span> open support {data.support.open === 1 ? 'ticket' : 'tickets'}{Object.entries(data.support).filter(([st]) => st !== 'open').map(([st, n]) => ` · ${num(n)} ${st}`).join('')}</p>
                                <Link to="/tickets" className="shrink-0 text-sm font-bold text-indigo-600 hover:underline">Open</Link>
                            </div>
                        </Section>
                    </div>
                </>
            )}
        </div>
    );
}
