/**
 * The organization admin's landing page: how many students they have, how many
 * are actually learning, average progress, and who has been active lately.
 *
 * Every number comes from one call to /organizations/me/dashboard, which the
 * server scopes to the authenticated organization. Nothing on this page sends an
 * organization id, so there is nothing to tamper with.
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, UserCheck, TrendingUp, Award, UserPlus, GraduationCap, Copy, Check, Activity, Share2, ChevronRight,
    School, University, Presentation, Briefcase, HeartHandshake, Landmark, Building2, IdCard, BookOpen, Clock
} from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Stat, Bar, Empty, Banner, Rows, Avatar, LoadFailed } from '../../components/orgUi';
import { relativeDay } from '../../utils/dates';

// The organization's kind, as an icon beside its name in the welcome banner.
const TYPE_ICON = {
    school: School, college: GraduationCap, university: University, training_institute: Presentation,
    company: Briefcase, ngo: HeartHandshake, government: Landmark, other: Building2
};

// The card stays a card; the link only adds a lift on hover and a focus ring.
const STAT_LINK = 'block rounded-2xl transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 [&>div]:h-full';

const OrgDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/organizations/me/dashboard');
            setData(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchDashboard, 30000);
    const retry = () => { setLoading(true); fetchDashboard(); };

    const organization = data?.organization;
    const stats = data?.stats;
    const TypeIcon = TYPE_ICON[organization?.organizationType] || Building2;

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(organization.orgCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* refused over plain HTTP; the code is on screen anyway */ }
    };

    // A phone's own share sheet where there is one (WhatsApp, SMS, mail), so the
    // ID reaches students in one step; a plain copy everywhere else.
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const shareCode = async () => {
        try {
            await navigator.share({
                title: organization.name,
                text: `Join ${organization.name} on YatiCorp LMS with Organization ID ${organization.orgCode}`
            });
        } catch { /* dismissed — nothing to do */ }
    };

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            {/* ── Welcome, with the ID students need ───────────────────────── */}
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/20">
                <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between lg:p-7">
                    {/* Soft shapes behind the text; decoration only. */}
                    <span aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
                    <span aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-violet-400/30 blur-2xl" />

                    <div className="relative min-w-0">
                        <p className="text-sm text-indigo-100">Welcome back,</p>
                        <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight lg:text-3xl">
                            {organization?.name || 'your organization'}
                        </h1>
                        {organization?.typeLabel && (
                            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-50">
                                <TypeIcon size={13} aria-hidden className="shrink-0" />{organization.typeLabel}
                            </p>
                        )}
                    </div>

                    {organization && (
                        <div className="relative shrink-0 rounded-xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm sm:min-w-[240px]">
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-100"><IdCard size={14} aria-hidden className="shrink-0" />Organization ID</p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <button onClick={copyCode} aria-label={`Copy Organization ID ${organization.orgCode}`}
                                    className="group inline-flex min-h-10 min-w-0 items-center gap-2 font-mono text-lg font-bold hover:text-indigo-100">
                                    <span className="truncate">{organization.orgCode}</span>
                                    {copied
                                        ? <Check size={16} className="shrink-0 text-emerald-300" />
                                        : <Copy size={15} className="shrink-0 text-indigo-200 group-hover:text-white" />}
                                </button>
                                {canShare && (
                                    <button onClick={shareCode} aria-label="Share Organization ID"
                                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50">
                                        <Share2 size={13} />Share
                                    </button>
                                )}
                            </div>
                            <p className="mt-1.5 text-xs text-indigo-100">Share this with your students so they can ask to join.</p>
                        </div>
                    )}
                </div>

                {stats?.pendingRequests > 0 && (
                    <Link to="/organization/requests"
                        className="flex items-center gap-2 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 lg:px-7">
                        <UserPlus size={16} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                            {stats.pendingRequests} student{stats.pendingRequests === 1 ? '' : 's'} waiting for your approval
                        </span>
                        <span className="inline-flex shrink-0 items-center text-xs font-bold uppercase tracking-wider">Review<ChevronRight size={14} /></span>
                    </Link>
                )}
                {stats?.pendingTeacherRequests > 0 && (
                    <Link to="/organization/teachers?tab=requests"
                        className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 lg:px-7">
                        <Presentation size={16} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                            {stats.pendingTeacherRequests} teacher{stats.pendingTeacherRequests === 1 ? '' : 's'} waiting to join
                        </span>
                        <span className="inline-flex shrink-0 items-center text-xs font-bold uppercase tracking-wider">Review<ChevronRight size={14} /></span>
                    </Link>
                )}
            </div>

            {/* A failed refresh keeps the last numbers and says so; a failed
                first load has none, and says that below with a Retry. */}
            {error && data && <Banner onClose={() => setError('')}>{error}</Banner>}

            {/* ── Headline numbers: two across on a phone, three on a desktop ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {/* A number with a list behind it opens that list: the Students
                    page, filtered to exactly the students it counts. */}
                <Link to="/organization/students" aria-label={`Students: ${stats?.students ?? '…'} — see them all`} className={STAT_LINK}>
                    <Stat icon={Users} label="Students" value={stats?.students} loading={loading} tone="indigo"
                        sub="In your organization" />
                </Link>
                <Link to="/organization/students?filter=active30" aria-label={`Active students: ${stats?.activeStudents ?? '…'} — see who`} className={STAT_LINK}>
                    <Stat icon={UserCheck} label="Active students" value={stats?.activeStudents} loading={loading} tone="emerald"
                        sub="Learned in the last 30 days" />
                </Link>
                {/* Progress and completions here count every course a student
                    can open — platform and bundle courses too, not only yours —
                    and Certificates are the ones the platform has issued. */}
                <Stat icon={TrendingUp} label="Average progress" value={stats ? `${stats.averageProgress}%` : undefined} loading={loading} tone="violet"
                    sub="Overall, across all enrolled courses" />
                <Stat icon={Award} label="Certificates" value={stats?.certificates} loading={loading} tone="amber"
                    sub="Issued by the platform" />
                <Stat icon={GraduationCap} label="Courses completed" value={stats?.coursesCompleted} loading={loading} tone="emerald"
                    sub="Across all enrolled courses" />
                <Stat icon={Activity} label="Total XP earned" value={stats?.totalXp} loading={loading} tone="amber"
                    sub="By all your students" />
                {/* Teachers across the whole row: their own section, not one more student number. */}
                <Link to="/organization/teachers" aria-label={`Teachers: ${stats?.teachers ?? '…'} — see them`} className={`${STAT_LINK} col-span-2 lg:col-span-3`}>
                    <Stat icon={Presentation} label="Teachers" value={stats?.teachers} loading={loading} tone="slate"
                        sub={stats?.pendingTeacherRequests > 0
                            ? `${stats.pendingTeacherRequests} waiting to join · their research progress, theses and publications`
                            : 'Their research progress, theses and publications — add more with their card'} />
                </Link>
            </div>

            {/* ── Recent activity ──────────────────────────────────────────── */}
            <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 lg:px-6">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 rounded-xl bg-indigo-100 p-2 text-indigo-600"><Activity size={18} aria-hidden /></span>
                        <h2 className="truncate font-bold text-slate-800"><span className="sm:hidden">Recent activity</span><span className="hidden sm:inline">Recent student activity</span></h2>
                    </div>
                    <Link to="/organization/students" className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        All students<ChevronRight size={16} />
                    </Link>
                </div>

                {loading ? (
                    <Rows count={4} height="h-10" />
                ) : !data ? (
                    <LoadFailed what="your dashboard" onRetry={retry} />
                ) : !data.recentActivity?.length ? (
                    <Empty icon={Activity}>
                        {stats?.students
                            ? 'None of your students has started a course yet.'
                            : 'No students have joined this organization yet.'}
                    </Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {data.recentActivity.map((s) => (
                            <li key={s._id}>
                                <Link to={`/organization/students/${s._id}`}
                                    className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60 active:bg-slate-50 sm:gap-4 lg:px-6">
                                    <Avatar name={s.name} src={s.profilePicture} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-slate-800">{s.name}</p>
                                        <p className="mt-0.5 flex min-w-0 items-center gap-3 overflow-hidden text-xs text-slate-500">
                                            <span className="inline-flex shrink-0 items-center gap-1"><BookOpen size={12} aria-hidden className="text-slate-400" />{s.coursesEnrolled} course{s.coursesEnrolled === 1 ? '' : 's'}</span>
                                            <span className="inline-flex min-w-0 items-center gap-1" title="Last active"><Clock size={12} aria-hidden className="shrink-0 text-slate-400" /><span className="truncate">{relativeDay(s.lastActive)}</span></span>
                                        </p>
                                    </div>
                                    <div className="w-20 shrink-0 sm:w-36" title="Overall progress (all enrolled courses)">
                                        <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600 tabular-nums">
                                            <span className="hidden sm:inline">Overall</span>
                                            <span className="ml-auto">{s.progressPercent}%</span>
                                        </div>
                                        <Bar percent={s.progressPercent} tone={s.progressPercent >= 100 ? 'emerald' : 'indigo'} />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default OrgDashboard;
