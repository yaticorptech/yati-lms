/**
 * The organization's students, with the learning record an institution asks
 * about: courses, progress, XP, last active, membership status.
 *
 * The server answers only with this organization's students — there is no
 * organization parameter to change — so the search box and the sort here are
 * arranging rows that were already scoped, not filtering a wider set.
 *
 * On a phone the table becomes a list of cards, because seven columns on a
 * 360-pixel screen is a horizontal scroll nobody uses.
 */
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, Search, ChevronRight, Award, Download, UserMinus, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Bar, Pill, Empty, Banner, Rows, BTN2, PageHeader, Segmented, Avatar } from '../../components/orgUi';
import { relativeDay, formatDate } from '../../utils/dates';

const SORTS = [
    ['name', 'Name'],
    ['progress', 'Progress'],
    ['active', 'Last active']
];

const OrgStudents = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState('name');
    const [removing, setRemoving] = useState(null);   // the student being asked about
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');

    const fetchStudents = async () => {
        try {
            const res = await api.get('/organizations/me/students');
            setStudents(res.data.students || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load your students.');
        } finally {
            setLoading(false);
        }
    };

    useAutoRefresh(fetchStudents, 30000);

    /**
     * Take a student out of the organization.
     *
     * Clears the membership only. Their account, courses, progress, XP and
     * certificates are their own and are untouched — which is what the
     * confirmation says, because "remove" sounds like deletion and is not.
     */
    const remove = async () => {
        setBusy(true);
        try {
            const res = await api.delete(`/organizations/me/students/${removing._id}`);
            setRemoving(null);
            setNotice(res.data.message);
            await fetchStudents();
            setTimeout(() => setNotice(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not remove that student.');
            setRemoving(null);
        } finally {
            setBusy(false);
        }
    };

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        const rows = query
            ? students.filter((s) => s.name?.toLowerCase().includes(query) || s.email?.toLowerCase().includes(query))
            : [...students];

        if (sort === 'progress') rows.sort((a, b) => b.progressPercent - a.progressPercent);
        if (sort === 'active') {
            // Students who have never been active sort last rather than first.
            rows.sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0));
        }
        if (sort === 'name') rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return rows;
    }, [students, search, sort]);

    /**
     * A CSV of what is on screen, built in the browser from rows already loaded.
     * Institutions live in spreadsheets, and this needs no new endpoint.
     */
    const exportCsv = () => {
        const header = ['Name', 'Email', 'Status', 'Courses enrolled', 'Courses completed', 'Progress %', 'Lessons completed', 'Quizzes passed', 'Certificates', 'XP', 'Level', 'Joined organization', 'Last active'];
        const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const body = visible.map((s) => [
            s.name, s.email, s.status, s.coursesEnrolled, s.coursesCompleted, s.progressPercent,
            s.lessonsCompleted, s.quizzesPassed, s.certificates, s.xp, s.level,
            s.joinedOrganizationAt ? formatDate(s.joinedOrganizationAt) : '',
            s.lastActive ? formatDate(s.lastActive) : 'Never'
        ].map(escape).join(','));

        const blob = new Blob([[header.map(escape).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Users} title="Students"
                subtitle={loading ? 'Loading…' : `${students.length} student${students.length === 1 ? '' : 's'} in your organization.`}>
                <div className="relative">
                    <input
                        type="search"
                        placeholder="Search name or email..."
                        aria-label="Search students"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600 sm:w-64"
                    />
                    <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                </div>
                <button onClick={exportCsv} disabled={!visible.length} className={`${BTN2} whitespace-nowrap`}>
                    <Download size={16} />Export CSV
                </button>
            </PageHeader>

            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            <div className="flex items-center gap-3">
                <span className="hidden text-xs font-bold uppercase tracking-wider text-slate-400 sm:inline">Sort by</span>
                <Segmented options={SORTS} value={sort} onChange={setSort} />
            </div>

            <div className={`${CARD} overflow-hidden`}>
                {loading ? (
                    <Rows count={4} />
                ) : visible.length === 0 ? (
                    <Empty icon={Users}>
                        {search.trim()
                            ? 'No student matches that search.'
                            : 'No students have joined this organization yet. Share your organization ID so they can ask to join.'}
                    </Empty>
                ) : (
                    <>
                        {/* Desktop: a table */}
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-left border-collapse min-w-[860px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase">
                                        <th className="px-6 py-4 font-semibold">Student</th>
                                        <th className="px-6 py-4 font-semibold">Courses</th>
                                        <th className="px-6 py-4 font-semibold">Progress</th>
                                        <th className="px-6 py-4 font-semibold">XP</th>
                                        <th className="px-6 py-4 font-semibold">Last active</th>
                                        <th className="px-6 py-4 font-semibold">Status</th>
                                        <th className="px-6 py-4 font-semibold text-right">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visible.map((s) => (
                                        <tr key={s._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={s.name} size="h-9 w-9 text-xs" />
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-slate-800">{s.name}</div>
                                                        <div className="text-sm text-slate-500">{s.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">
                                                {s.coursesCompleted}/{s.coursesEnrolled}
                                                {s.certificates > 0 && (
                                                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                                                        <Award size={12} />{s.certificates}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="w-28">
                                                    <div className="mb-1 text-xs font-semibold text-slate-700 tabular-nums">{s.progressPercent}%</div>
                                                    <Bar percent={s.progressPercent} tone={s.progressPercent >= 100 ? 'emerald' : 'indigo'} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 tabular-nums">
                                                {s.xp}
                                                <span className="ml-1 text-xs text-slate-400">L{s.level}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">{relativeDay(s.lastActive)}</td>
                                            <td className="px-6 py-4"><Pill status={s.status} /></td>
                                            <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                                <Link to={`/organization/students/${s._id}`}
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors">
                                                    View
                                                </Link>
                                                <button onClick={() => setRemoving(s)}
                                                    className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors">
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile: cards */}
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {visible.map((s) => (
                                <li key={s._id} className="p-4">
                                    <Link to={`/organization/students/${s._id}`} className="block rounded-xl transition-colors active:bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={s.name} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-800">{s.name}</p>
                                                <p className="truncate text-sm text-slate-500">{s.email}</p>
                                            </div>
                                            <ChevronRight size={18} className="shrink-0 text-slate-300" />
                                        </div>
                                        <div className="mt-3">
                                            <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600 tabular-nums">
                                                <span>{s.coursesCompleted}/{s.coursesEnrolled} courses</span>
                                                <span>{s.progressPercent}%</span>
                                            </div>
                                            <Bar percent={s.progressPercent} tone={s.progressPercent >= 100 ? 'emerald' : 'indigo'} />
                                        </div>
                                    </Link>
                                    {/* Outside the link: a card-wide tap opens the
                                        student, and this must not be part of that. */}
                                    <div className="mt-3 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                            <Pill status={s.status} />
                                            <span className="tabular-nums">{s.xp} XP</span>
                                            {s.certificates > 0 && (
                                                <span className="inline-flex items-center gap-1 font-semibold text-amber-600"><Award size={12} />{s.certificates}</span>
                                            )}
                                            <span>{relativeDay(s.lastActive)}</span>
                                        </div>
                                        <button onClick={() => setRemoving(s)} aria-label={`Remove ${s.name} from organization`}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 active:bg-red-50">
                                            <UserMinus size={13} />Remove
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>

            {removing && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4" role="dialog" aria-modal="true">
                    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[calc(100dvh-1.5rem)]">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 text-center sm:p-6">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                <UserMinus size={24} className="text-amber-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Remove {removing.name}?</h2>
                            <p className="mt-3 text-sm text-slate-500">
                                They stop appearing in your organization and you can no longer see their progress.
                                Their account, courses, progress, XP and certificates are untouched — nothing is deleted.
                            </p>
                            <p className="mt-2 text-sm text-slate-500">They can ask to join again with your organization ID.</p>
                        </div>
                        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                            <button onClick={() => setRemoving(null)} className={BTN2} disabled={busy}>Cancel</button>
                            <button onClick={remove} disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                                {busy && <Loader2 size={16} className="animate-spin" />}
                                Remove student
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrgStudents;
