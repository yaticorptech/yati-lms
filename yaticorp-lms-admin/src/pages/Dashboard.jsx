/**
 * @author Preethesh Kulal
 * @description Admin dashboard with stat cards, top courses and quick summary
 */
import React, { useState } from 'react';
import api from '../utils/api';
import { Users, BookOpen, Layers, UserPlus, Activity, Award, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import useAutoRefresh from '../hooks/useAutoRefresh';

const StatCard = ({ title, value, icon, colorClass, loading }) => {
    const Icon = icon;
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
                    {loading ? (
                        <div className="animate-pulse h-9 w-20 bg-slate-100 rounded-xl mt-2" />
                    ) : (
                        <p className="text-3xl font-bold text-slate-900 mt-2">{value ?? '—'}</p>
                    )}
                </div>
                <div className={`p-3 rounded-xl ${colorClass}`}>
                    {Icon && <Icon size={24} className="text-white" />}
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
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{getGreeting()}, {userName}! 👋</h1>
                    <p className="text-sm lg:text-base text-slate-500 mt-1">Here's what's happening with YATICORP LMS today.</p>
                </div>
                <Link to="/analytics" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors">
                    <TrendingUp size={16} /> Full Analytics →
                </Link>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                <StatCard loading={loading} title="Total Students" value={analytics?.totalStudents} icon={Users} colorClass="bg-blue-500" />
                <StatCard loading={loading} title="Total Enrollments" value={analytics?.totalEnrollments} icon={UserPlus} colorClass="bg-emerald-500" />
                <StatCard loading={loading} title="Active This Week" value={analytics?.activeThisWeek ?? 0} icon={Activity} colorClass="bg-indigo-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Top Courses */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 lg:p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-slate-900">Top Courses by Enrollment</h2>
                        <Link to="/analytics" className="text-xs font-bold text-indigo-600 hover:underline">View all</Link>
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
                                <div key={c._id.toString()} className="flex items-center gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-semibold text-slate-800 truncate max-w-[200px]" title={c.title}>{c.title}</span>
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
                                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-3">
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
                    <Link to="/analytics" className="w-full mt-5 py-3 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2 block">
                        <TrendingUp size={15} /> View Full Analytics
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
