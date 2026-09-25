/**
 * @author Preethesh Kulal
 * @description Admin enrollment management with search, filters and export
 */
import React, { useState } from 'react';
import api from '../utils/api';
import { Network, Search, Trash2, CheckCircle2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import useAutoRefresh from '../hooks/useAutoRefresh';

const FILTERS = [
    { label: 'All', value: 'ALL' },
    { label: 'Courses', value: 'COURSE' },
    { label: 'Bundles', value: 'BUNDLE' }
];

const contentTitle = (enr) => (enr.type === 'Course' ? enr.courseId?.title : enr.bundleId?.title);

const TypeTag = ({ type }) => (
    <span className={`shrink-0 px-2.5 py-1 text-[10px] font-bold rounded-lg border shadow-sm ${type === 'Course'
        ? 'bg-blue-50 text-blue-600 border-blue-100'
        : 'bg-purple-50 text-purple-600 border-purple-100'
        }`}>
        {String(type || '').toUpperCase()}
    </span>
);

const Enrollments = () => {
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null);

    const fetchEnrollments = async () => {
        try {
            const res = await api.get('/admin/enrollments'); // We assume getAll is implemented from previous steps or we reuse user fetching logic
            setEnrollments(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchEnrollments, 30000);

    const deleteEnrollment = async () => {
        try {
            await api.delete(`/admin/enrollments/${selectedEnrollmentId}`);
            fetchEnrollments();
            setShowDeleteModal(false);
            setSelectedEnrollmentId(null);
        } catch (err) {
            console.error(err);
            alert('Failed to delete enrollment');
        }
    };

    const askRevoke = (id) => {
        setSelectedEnrollmentId(id);
        setShowDeleteModal(true);
    };

    const exportReport = async () => {
        try {
            const res = await api.get('/admin/reports/completion');
            const rows = res.data.map(r => ({
                'Student Name': r.studentName,
                'Email': r.studentEmail,
                'Card Number': r.cardNumber,
                'Course': r.courseTitle,
                'Enrolled At': new Date(r.enrolledAt).toLocaleDateString(),
                'Completion %': r.completion,
                'Completed': r.completed,
                'Passed Quizzes': r.passedQuizzes
            }));
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Completion Report');
            XLSX.writeFile(wb, `completion_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch {
            alert('Failed to generate report');
        }
    };

    const filtered = enrollments.filter(e => {
        const query = search.toLowerCase();
        const matchesSearch =
            (e.userId?.name || '').toLowerCase().includes(query) ||
            (e.userId?.email || '').toLowerCase().includes(query);

        const matchesType =
            filterType === 'ALL' ||
            (filterType === 'COURSE' && e.type === 'Course') ||
            (filterType === 'BUNDLE' && e.type === 'Bundle');

        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in relative z-0 pb-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-4 sm:p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Enrollments & Sync</h1>
                    <p className="text-sm text-slate-500 mt-1">Track all content assignments across the platform.</p>
                </div>
                {/* Stacked on a phone, one row from sm up. Nothing here has a
                    fixed width wider than a phone, so the page never scrolls
                    sideways. */}
                <div className="flex min-w-0 flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                    <div className="flex w-full sm:w-auto bg-slate-200 p-1 rounded-xl">
                        {FILTERS.map(item => (
                            <button
                                key={item.value}
                                onClick={() => setFilterType(item.value)}
                                aria-pressed={filterType === item.value}
                                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${filterType === item.value
                                    ? 'bg-white text-indigo-600 shadow'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-56">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search student or email..."
                            aria-label="Search enrollments"
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-sm text-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={exportReport}
                        className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/20 transition-all whitespace-nowrap"
                    >
                        <Download size={16} /> Export Report
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-400">
                        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="font-medium">Loading records...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-400 italic">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Search size={24} className="text-slate-300" />
                        </div>
                        No enrollments found matching your query.
                    </div>
                ) : (
                    <>
                    {/* Desktop and tablet: the table. */}
                    <div className="hidden md:block overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] tracking-widest text-slate-500 uppercase font-bold">
                                    <th className="px-6 py-4">Student Details</th>
                                    <th className="px-6 py-4">Content Type</th>
                                    <th className="px-6 py-4">Assigned Content</th>
                                    <th className="px-6 py-4">Enrollment Date</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map(enr => (
                                    <tr key={enr._id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{enr.userId?.name || <span className="italic font-medium text-slate-400">Deleted student</span>}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 break-all">{enr.userId?.email}</div>
                                        </td>
                                        <td className="px-6 py-4"><TypeTag type={enr.type} /></td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-700 max-w-xs truncate" title={contentTitle(enr)}>
                                                {contentTitle(enr)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-600">
                                                {new Date(enr.createdAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(enr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => askRevoke(enr._id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                title="Revoke Access"
                                                aria-label={`Revoke ${enr.userId?.name || 'this student'}'s access`}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Phones: one card per enrollment, same information. */}
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {filtered.map(enr => (
                            <li key={enr._id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate">{enr.userId?.name || <span className="italic font-medium text-slate-400">Deleted student</span>}</p>
                                        <p className="text-xs text-slate-500 mt-0.5 break-all">{enr.userId?.email}</p>
                                    </div>
                                    <button
                                        onClick={() => askRevoke(enr._id)}
                                        className="shrink-0 p-2 -m-1 text-slate-400 hover:text-red-600 active:bg-red-50 rounded-xl transition-all"
                                        aria-label={`Revoke ${enr.userId?.name || 'this student'}'s access`}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center gap-2 min-w-0">
                                    <TypeTag type={enr.type} />
                                    <p className="min-w-0 truncate text-sm font-semibold text-slate-700" title={contentTitle(enr)}>{contentTitle(enr)}</p>
                                </div>
                                <p className="mt-2 text-xs text-slate-400">
                                    Enrolled {new Date(enr.createdAt).toLocaleDateString()} · {new Date(enr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>
            {showDeleteModal && (
                <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-50">

                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-[350px] mx-4 animate-fade-in">

                        <h2 className="text-lg font-bold text-slate-800 mb-2">
                            Revoke Enrollment?
                        </h2>

                        <p className="text-sm text-slate-500 mb-6">
                            The user will lose access immediately. This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">

                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-sm rounded-xl bg-slate-100 hover:bg-slate-200"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={deleteEnrollment}
                                className="px-4 py-2 text-sm rounded-xl bg-red-600 text-white hover:bg-red-700"
                            >
                                Revoke
                            </button>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Enrollments;
