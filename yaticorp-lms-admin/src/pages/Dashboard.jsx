/**
 * @author Preethesh Kulal
 * @description Admin dashboard with stat cards, top courses and quick summary
 */
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, BookOpen, Layers, UserPlus, Activity, Award, TrendingUp, CheckCircle2, Zap, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from "../context/AuthContext";
import useAutoRefresh from '../hooks/useAutoRefresh';

/** The conversion as numbers plus the currency symbol to print it with. */
const rateOf = (cfg) => {
    const points = Number(cfg?.conversion?.pointsPerUnit);
    const value = Number(cfg?.conversion?.unitValue);
    if (!points || value == null || Number.isNaN(value)) return null;
    return { points, value, symbol: cfg.conversion.currency === 'INR' ? '₹' : `${cfg.conversion.currency} ` };
};

/** "100 XP = ₹10". */
const rateText = (r) => `${r.points.toLocaleString('en-IN')} XP = ${r.symbol}${r.value.toLocaleString('en-IN')}`;

/**
 * What XP is worth, changed here rather than on the Rewards page.
 *
 * The same setting, not a copy: read from and written to the rewards config,
 * so the two screens cannot drift apart. Only the two numbers are sent, and
 * the server merges what it is given — the currency, the minimum redemption
 * and the withdrawal caps are left exactly as they are.
 */
const XpValueCard = () => {
    const [state, setState] = useState({ loading: true, rate: null, error: '' });
    const [edit, setEdit] = useState(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let alive = true;
        api.get('/rewards/admin/config')
            .then((r) => alive && setState({ loading: false, rate: rateOf(r.data), error: '' }))
            .catch(() => alive && setState({ loading: false, rate: null, error: 'Could not load' }));
        return () => { alive = false; };
    }, []);

    const save = () => {
        // The server wants at least 1 XP per unit; a blank or zero box would be
        // refused, so it is corrected here rather than bounced back.
        const points = Math.max(1, Math.round(Number(edit.points) || 0));
        const value = Math.max(0, Number(edit.value) || 0);
        setSaving(true);
        api.put('/rewards/admin/config', { conversion: { pointsPerUnit: points, unitValue: value } })
            .then((r) => {
                setState((v) => ({ ...v, rate: rateOf(r.data) ?? v.rate, error: '' }));
                setEdit(null);
            })
            .catch((e) => setState((v) => ({ ...v, error: e.response?.data?.message || 'Could not save' })))
            .finally(() => setSaving(false));
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow duration-200">
            <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">XP value</p>

                    {state.loading ? (
                        <div className="animate-pulse h-9 w-32 bg-slate-100 rounded-xl mt-2" />
                    ) : !state.rate ? (
                        <p className="mt-2 text-sm text-slate-400">Not set</p>
                    ) : edit ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-bold text-amber-700">
                            <input
                                type="number" min="1" step="1" autoFocus value={edit.points}
                                onChange={(e) => setEdit({ ...edit, points: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEdit(null); }}
                                className="w-20 rounded-md border border-amber-300 px-2 py-1 outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                            <span>XP =</span>
                            <span>{state.rate.symbol}</span>
                            <input
                                type="number" min="0" step="0.01" value={edit.value}
                                onChange={(e) => setEdit({ ...edit, value: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEdit(null); }}
                                className="w-20 rounded-md border border-amber-300 px-2 py-1 outline-none focus:ring-2 focus:ring-amber-500/30"
                            />
                            <button type="button" onClick={save} disabled={saving}
                                className="rounded-md bg-amber-500 px-2.5 py-1 text-white hover:bg-amber-600 disabled:opacity-60">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" onClick={() => setEdit(null)}
                                className="rounded-md px-1.5 py-1 text-slate-500 hover:bg-slate-100">Cancel</button>
                        </div>
                    ) : (
                        <button type="button"
                            onClick={() => setEdit({ points: String(state.rate.points), value: String(state.rate.value) })}
                            className="group mt-2 flex items-center gap-2 text-left">
                            <span className="text-2xl font-bold text-slate-900">{rateText(state.rate)}</span>
                            <Pencil size={14} className="text-slate-300 transition-colors group-hover:text-amber-500" />
                        </button>
                    )}

                    {state.error && <p className="mt-1 text-xs font-semibold text-rose-600">{state.error}</p>}
                </div>
                <div className="p-3 rounded-xl bg-amber-500">
                    <Zap size={24} className="text-white" />
                </div>
            </div>
        </div>
    );
};

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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                <StatCard loading={loading} title="Total Students" value={analytics?.totalStudents} icon={Users} colorClass="bg-blue-500" />
                <StatCard loading={loading} title="Total Enrollments" value={analytics?.totalEnrollments} icon={UserPlus} colorClass="bg-emerald-500" />
                <StatCard loading={loading} title="Active This Week" value={analytics?.activeThisWeek ?? 0} icon={Activity} colorClass="bg-indigo-500" />
                <XpValueCard />
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
