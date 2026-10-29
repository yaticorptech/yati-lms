/**
 * @author Preethesh Kulal
 * @description Admin dashboard with stat cards, top courses and quick summary
 */
import React, { useState } from 'react';
import api from '../utils/api';
import { Users, BookOpen, UserPlus, Activity, CheckCircle2 } from 'lucide-react';
import { useAuth } from "../context/AuthContext";
import useAutoRefresh from '../hooks/useAutoRefresh';

// No "XP value" card: XP does not turn into wallet money (2026-10-26).

const StatCard = ({ title, value, icon, colorClass, loading }) => {
    const Icon = icon;
    return (
        <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 lg:p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start gap-2 sm:gap-3">
                <div className="min-w-0">
                    {/* Wraps on a phone, where two cards share a row. */}
                    <p className="text-[11px] sm:text-sm font-semibold text-slate-500 uppercase tracking-wide sm:tracking-wider leading-snug">{title}</p>
                    {loading ? (
                        <div className="animate-pulse h-8 w-16 bg-slate-100 rounded-xl mt-2" />
                    ) : (
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1.5 sm:mt-2 tabular-nums">{value ?? '—'}</p>
                    )}
                </div>
                <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${colorClass}`}>
                    {Icon && <Icon className="h-[18px] w-[18px] sm:h-6 sm:w-6 text-white" />}
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    const { admin } = useAuth();
    const userName = admin?.name || "User";

    const fetchAnalytics = () =>
        api.get('/admin/analytics')
            .then(r => setAnalytics(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));

    useAutoRefresh(fetchAnalytics, 30000);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    const topCourses = analytics?.courseStats
        ? [...analytics.courseStats]
            .filter(c => c.enrolledCount > 0)
            .sort((a, b) => b.enrolledCount - a.enrolledCount)
            .slice(0, 5)
        : [];

    return (
        <div className="space-y-6 lg:space-y-8 animate-fade-in pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight break-words">{getGreeting()}, {userName}! 👋</h1>
                    <p className="text-sm lg:text-base text-slate-500 mt-1">Here's what's happening with YATICORP LMS today.</p>
                </div>
            </div>

            {/* Stat Cards: four across only once each has room for its label and number */}
            {/* Two across on a phone (four tall cards stacked was most of the screen). */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4 lg:gap-6">
                <StatCard loading={loading} title="Total Students" value={analytics?.totalStudents} icon={Users} colorClass="bg-blue-500" />
                <StatCard loading={loading} title="Total Enrollments" value={analytics?.totalEnrollments} icon={UserPlus} colorClass="bg-emerald-500" />
                <StatCard loading={loading} title="Active This Week" value={analytics?.activeThisWeek ?? 0} icon={Activity} colorClass="bg-indigo-500" />
                <StatCard loading={loading} title="Total Courses" value={analytics?.courseStats?.length ?? 0} icon={BookOpen} colorClass="bg-amber-500" />
            </div>

            {/* Side by side from xl: at lg the sidebar leaves the summary column too narrow */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
                {/* Top Courses */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between gap-3 mb-5">
                        <h2 className="text-lg font-bold text-slate-900">Top Courses by Enrollment</h2>
                    </div>
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-xl" />
                            ))}
                        </div>
                    ) : topCourses.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
                            No enrolled courses yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topCourses.map(c => (
                                <div key={c._id.toString()} className="flex items-center gap-3 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-slate-800 truncate min-w-0" title={c.title}>{c.title}</span>
                                            <span className="text-xs text-slate-500 ml-2 flex-shrink-0">{c.enrolledCount} enrolled</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-2 rounded-full transition-all ${c.completionRate >= 80 ? 'bg-emerald-500' : c.completionRate >= 40 ? 'bg-indigo-500' : 'bg-amber-400'}`}
                                                style={{ width: `${Math.max(c.completionRate, 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 w-10 text-right flex-shrink-0">{c.completionRate}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Platform Summary */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-slate-900">Quick Summary</h2>
                    </div>
                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-xl" />)}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {[
                                { label: 'Total Courses', value: analytics?.courseStats?.length ?? 0, icon: BookOpen, color: 'text-indigo-600 bg-indigo-50' },
                                { label: 'Published', value: analytics?.courseStats?.filter(c => c.isPublished).length ?? 0, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
                                { label: 'Active This Week', value: analytics?.activeThisWeek ?? 0, icon: Activity, color: 'text-blue-600 bg-blue-50' },
                            ].map(item => (
                                <div key={item.label} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`p-2 rounded-lg ${item.color}`}>
                                            <item.icon size={16} />
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                                    </div>
                                    <span className="text-lg font-black text-slate-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
