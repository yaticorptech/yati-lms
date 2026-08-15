/**
 * @author Preethesh Kulal
 * @description Analytics dashboard with course stats, completion rates and CSV/Excel export
 */
import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import {
    BarChart2, Users, BookOpen, Activity, TrendingUp, Award,
    ChevronUp, ChevronDown, X, CheckCircle2, Clock, AlertCircle, Download
} from 'lucide-react';
import useAutoRefresh from '../hooks/useAutoRefresh';

// ─── Student List Slide Panel ────────────────────────────────────────────────
const StudentPanel = ({ course, onClose }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    // The panel is keyed by course id, so each course mounts a fresh instance
    // that already starts in the loading state.
    useEffect(() => {
        if (!course) return;
        api.get(`/admin/courses/${course._id}/students`)
            .then(r => setStudents(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [course]);

    const statusColor = (pct) => {
        if (pct >= 100) return 'bg-emerald-100 text-emerald-700';
        if (pct > 0) return 'bg-blue-100 text-blue-700';
        return 'bg-slate-100 text-slate-500';
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
                onClick={onClose}
            />
            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                    <div>
                        <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <Users size={20} className="text-indigo-600" />
                            Enrolled Students
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5 truncate max-w-sm" title={course.title}>
                            {course.title}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all">
                        <X size={20} />
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 p-4 border-b border-slate-100 flex-shrink-0">
                    <div className="bg-indigo-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-indigo-700">{course.enrolledCount}</p>
                        <p className="text-xs text-indigo-500 font-semibold mt-0.5">Enrolled</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-emerald-700">{course.completedCount}</p>
                        <p className="text-xs text-emerald-500 font-semibold mt-0.5">Completed</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                        <p className="text-2xl font-black text-amber-700">{course.completionRate}%</p>
                        <p className="text-xs text-amber-500 font-semibold mt-0.5">Rate</p>
                    </div>
                </div>

                {/* Student list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400">
                            <div className="animate-spin w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full mr-3" />
                            Loading students...
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-16 text-slate-400">
                            <Users size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No students enrolled yet.</p>
                        </div>
                    ) : students.map(s => (
                        <div key={s.userId} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 hover:border-indigo-200 transition-colors">
                            {/* Student header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-sm flex-shrink-0">
                                        {s.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                                        <p className="text-xs text-slate-500">{s.email}</p>
                                    </div>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor(s.percentage)}`}>
                                    {s.percentage >= 100 ? '✓ Completed' : s.percentage > 0 ? `${s.percentage}% Done` : 'Not Started'}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-3">
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-2 rounded-full transition-all ${s.percentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(100, s.percentage)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5">
                                    <BookOpen size={12} className="text-slate-400" />
                                    <span>{s.completedLessons} lessons done</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Award size={12} className="text-slate-400" />
                                    <span>{s.passedQuizzes} quizzes passed</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock size={12} className="text-slate-400" />
                                    <span>Enrolled {new Date(s.enrolledAt).toLocaleDateString()}</span>
                                </div>
                                {s.lastActivity && (
                                    <div className="flex items-center gap-1.5">
                                        <Activity size={12} className="text-slate-400" />
                                        <span>Active {new Date(s.lastActivity).toLocaleDateString()}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-slate-400">{s.cardNumber}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className={`capitalize font-semibold ${s.status === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {s.status || 'active'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

// ─── Presentational bits ─────────────────────────────────────────────────────
// Defined at module scope so they keep a stable identity across renders —
// re-creating them inside Analytics() remounts the subtree on every render.
const SortIcon = ({ field, sortField, sortDir }) => (
    <span className="ml-1 inline-flex flex-col">
        <ChevronUp size={10} className={sortField === field && sortDir === 'asc' ? 'text-indigo-600' : 'text-slate-300'} />
        <ChevronDown size={10} className={sortField === field && sortDir === 'desc' ? 'text-indigo-600' : 'text-slate-300'} />
    </span>
);

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon size={24} className="text-white" />
        </div>
        <div>
            <p className="text-3xl font-black text-slate-900">{value ?? '—'}</p>
            <p className="text-sm font-semibold text-slate-500 mt-0.5">{label}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
    </div>
);

// ─── Analytics Page ──────────────────────────────────────────────────────────
const Analytics = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState('enrolledCount');
    const [sortDir, setSortDir] = useState('desc');
    const [selectedCourse, setSelectedCourse] = useState(null);

    const fetchAnalytics = () =>
        api.get('/admin/analytics')
            .then(r => setData(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));

    useAutoRefresh(fetchAnalytics, 30000);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('desc'); }
    };

    const sorted = data?.courseStats ? [...data.courseStats].filter(c => c.isPublished).sort((a, b) => {
        const v = sortDir === 'asc' ? 1 : -1;
        return a[sortField] > b[sortField] ? v : -v;
    }) : [];

    if (loading) return (
        <div className="flex items-center justify-center py-32 text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mr-3" />
            Loading analytics...
        </div>
    );

    return (
        <>
            {selectedCourse && (
                <StudentPanel key={selectedCourse._id} course={selectedCourse} onClose={() => setSelectedCourse(null)} />
            )}

            <div className="space-y-8 animate-fade-in pb-12">

                {/* Header + Buttons */}
                <div className="flex items-center justify-between gap-4">

                    {/* LEFT: Title */}
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <BarChart2 size={28} className="text-indigo-600" /> Analytics
                    </h1>

                    {/* RIGHT: Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={async () => {
                                try {
                                    const res = await api.get('/admin/reports/export/csv', { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `analytics_${new Date().toISOString().slice(0, 10)}.csv`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                } catch { alert('Export failed'); }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download size={15} /> CSV
                        </button>

                        <button
                            onClick={async () => {
                                try {
                                    const res = await api.get('/admin/reports/export/excel', { responseType: 'blob' });
                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `analytics_${new Date().toISOString().slice(0, 10)}.xlsx`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                } catch { alert('Export failed'); }
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                            <Download size={15} /> Export
                        </button>
                    </div>
                </div>

                {/* BELOW HEADER TEXT */}
                <p className="text-slate-500 text-sm mt-2">
                    Platform-wide stats.
                    <span className="text-indigo-600 font-semibold">
                        {' '}Click any course row to see its enrolled students & details.
                    </span>
                </p>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <StatCard icon={Users} label="Total Students" value={data?.totalStudents} color="bg-indigo-600" />
                    <StatCard icon={BookOpen} label="Total Enrollments" value={data?.totalEnrollments} color="bg-violet-600" />
                    <StatCard icon={Activity} label="Active This Week" value={data?.activeThisWeek} color="bg-emerald-600" sub="Students who accessed content" />
                    {/* <StatCard icon={Award} label="Total Quiz Passes" value={data?.totalPassedQuizzes} color="bg-amber-500" /> */}
                </div>

                {/* Per-course table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                        <TrendingUp size={20} className="text-indigo-600" />
                        <h2 className="font-bold text-lg text-slate-800">Course Completion Rates</h2>
                        <span className="ml-auto text-xs text-slate-400">{sorted.length} courses</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                                    <th className="px-6 py-4">Course</th>
                                    <th className="px-6 py-4 cursor-pointer select-none" onClick={() => handleSort('enrolledCount')}>
                                        Enrolled <SortIcon field="enrolledCount" sortField={sortField} sortDir={sortDir} />
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer select-none" onClick={() => handleSort('completedCount')}>
                                        Completed <SortIcon field="completedCount" sortField={sortField} sortDir={sortDir} />
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer select-none" onClick={() => handleSort('completionRate')}>
                                        Rate <SortIcon field="completionRate" sortField={sortField} sortDir={sortDir} />
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer select-none" onClick={() => handleSort('avgCompletion')}>
                                        Avg % <SortIcon field="avgCompletion" sortField={sortField} sortDir={sortDir} />
                                    </th>
                                    {/* <th className="px-6 py-4">Status</th> */}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sorted.map(c => (
                                    <tr
                                        key={c._id}
                                        onClick={() => c.isPublished && setSelectedCourse(c)}
                                        className="hover:bg-indigo-50/60 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-slate-800 max-w-[200px] truncate group-hover:text-indigo-700 transition-colors" title={c.title}>{c.title}</span>
                                                <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">View students →</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 font-semibold">{c.enrolledCount}</td>
                                        <td className="px-6 py-4 text-emerald-700 font-bold">{c.completedCount}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                    <div className="h-2 rounded-full bg-indigo-500 transition-all" style={{ width: `${Math.min(100, c.completionRate)}%` }} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-700">{c.completionRate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-semibold text-slate-700">{c.avgCompletion}%</span>
                                        </td>
                                        {/* <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-md ${c.isPublished ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {c.isPublished ? 'Published' : 'Draft'}
                                            </span>
                                        </td> */}
                                    </tr>
                                ))}
                                {sorted.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">No course data available.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Analytics;
