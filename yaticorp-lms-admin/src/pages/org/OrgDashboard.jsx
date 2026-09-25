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
import { Users, UserCheck, TrendingUp, Award, UserPlus, GraduationCap, Copy, Check, Activity, Share2, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Stat, Bar, Empty, Banner, Rows, Avatar } from '../../components/orgUi';
import { relativeDay } from '../../utils/dates';

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

    const organization = data?.organization;
    const stats = data?.stats;

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
                text: `Join ${organization.name} on YatiCorp LMS with organization ID ${organization.orgCode}`
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
                            <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-indigo-50">
                                {organization.typeLabel}
                            </p>
                        )}
                    </div>

                    {organization && (
                        <div className="relative shrink-0 rounded-xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm sm:min-w-[240px]">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-100">Organization ID</p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <button onClick={copyCode} aria-label={`Copy organization ID ${organization.orgCode}`}
                                    className="group inline-flex min-w-0 items-center gap-2 font-mono text-lg font-bold hover:text-indigo-100">
                                    <span className="truncate">{organization.orgCode}</span>
                                    {copied
                                        ? <Check size={16} className="shrink-0 text-emerald-300" />
                                        : <Copy size={15} className="shrink-0 text-indigo-200 group-hover:text-white" />}
                                </button>
                                {canShare && (
                                    <button onClick={shareCode} aria-label="Share organization ID"
                                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50">
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
            </div>

            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            {/* ── Headline numbers: two across on a phone, three on a desktop ── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                <Stat icon={Users} label="Students" value={stats?.students} loading={loading} tone="indigo" />
                <Stat icon={UserCheck} label="Active students" value={stats?.activeStudents} loading={loading} tone="emerald"
                    sub="Learned in the last 30 days" />
                <Stat icon={TrendingUp} label="Average progress" value={stats ? `${stats.averageProgress}%` : undefined} loading={loading} tone="violet"
                    sub="Across students with courses" />
                <Stat icon={Award} label="Certificates" value={stats?.certificates} loading={loading} tone="amber" />
                <Stat icon={GraduationCap} label="Courses completed" value={stats?.coursesCompleted} loading={loading} tone="emerald" />
                <Stat icon={Activity} label="Total XP earned" value={stats?.totalXp} loading={loading} tone="amber" />
            </div>

            {/* ── Recent activity ──────────────────────────────────────────── */}
            <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 lg:px-6">
                    <h2 className="font-bold text-slate-800">Recent student activity</h2>
                    <Link to="/organization/students" className="inline-flex shrink-0 items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                        All students<ChevronRight size={16} />
                    </Link>
                </div>

                {loading ? (
                    <Rows count={4} height="h-10" />
                ) : !data?.recentActivity?.length ? (
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
                                    <Avatar name={s.name} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-slate-800">{s.name}</p>
                                        <p className="truncate text-xs text-slate-500">
                                            {s.coursesEnrolled} course{s.coursesEnrolled === 1 ? '' : 's'} · last active {relativeDay(s.lastActive).toLowerCase()}
                                        </p>
                                    </div>
                                    <div className="w-20 shrink-0 sm:w-36">
                                        <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600 tabular-nums">
                                            <span className="hidden sm:inline">Progress</span>
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
