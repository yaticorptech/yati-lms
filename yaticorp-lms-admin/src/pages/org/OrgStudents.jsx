/**
 * The organization's students, with the learning record an institution asks
 * about: courses, progress, XP, last active, membership status.
 *
 * The server answers only with this organization's students — there is no
 * organization parameter to change — so the search box, the filter chips and
 * the sort are arranging rows that were already scoped, not a wider set.
 *
 * One page of 25 at a time: an institution with a few thousand students must
 * not be sent all of them every 30 seconds. The search, sort, filter and page
 * live in the address (?q=…&filter=…&page=2), so a refresh or a shared link
 * opens the same list, and the Dashboard's numbers can link straight to it.
 * Against a server that does not page yet (no `total` in the answer) the same
 * arranging happens here, over the full list, exactly as it used to.
 *
 * Below a wide desktop the table becomes a list of cards, because seven
 * columns on a phone or a tablet is a horizontal scroll nobody uses — and only
 * the one that is showing is built.
 */
import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import OrgCertificateProgress from './OrgCertificateProgress';
import { Users, ChevronRight, Award, Download, UserMinus, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import useMediaQuery from '../../hooks/useMediaQuery';
import { CARD, Bar, Pill, Empty, Banner, Rows, BTN2, PageHeader, Segmented, Avatar, LoadFailed, SearchInput, Pager, RemoveStudentDialog } from '../../components/orgUi';
import { relativeDay, formatDate } from '../../utils/dates';
import { saveBlob } from '../../native/saveFile';

const PAGE_SIZE = 25;

const SORTS = [
    ['name', 'Name'],
    ['progress', 'Progress'],
    ['active', 'Last active']
];

const FILTERS = [
    ['all', 'All'],
    ['active30', 'Active 30d'],
    ['inactive', 'Inactive'],
    ['notStarted', 'Not started'],
    ['completed', 'Completed'],
    ['blocked', 'Blocked']
];

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

/**
 * What each filter chip means, for a server that does not filter yet. The
 * same rules the server applies, and "Active 30d" is the Dashboard's "Active
 * students": a usable account that has learned something in the last 30 days.
 */
const FILTER_TEST = {
    all: () => true,
    active30: (s, cutoff) => s.status === 'active' && Boolean(s.lastActive) && new Date(s.lastActive) >= cutoff,
    inactive: (s, cutoff) => s.status === 'active' && !(s.lastActive && new Date(s.lastActive) >= cutoff),
    notStarted: (s) => (typeof s.coursesStarted === 'number' ? s.coursesStarted === 0 : !s.progressPercent && !s.lessonsCompleted),
    completed: (s) => s.coursesEnrolled > 0 && s.coursesCompleted >= s.coursesEnrolled,
    // Any account that cannot be used, so the chips add up: all = active 30d + inactive + blocked.
    blocked: (s) => s.status !== 'active'
};

/** The search, filter and sort, applied in the browser — the fallback, and the export. */
const arrange = (students, { q, filter, sort }) => {
    const query = q.trim().toLowerCase();
    const cutoff = new Date(Date.now() - THIRTY_DAYS);
    const test = FILTER_TEST[filter] || FILTER_TEST.all;
    const rows = students.filter((s) => test(s, cutoff)
        && (!query || s.name?.toLowerCase().includes(query) || s.email?.toLowerCase().includes(query)));

    if (sort === 'progress') rows.sort((a, b) => b.progressPercent - a.progressPercent);
    if (sort === 'active') {
        // Students who have never been active sort last rather than first.
        rows.sort((a, b) => new Date(b.lastActive || 0) - new Date(a.lastActive || 0));
    }
    if (sort === 'name') rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return rows;
};

const pick = (value, options, fallback) => (options.some(([key]) => key === value) ? value : fallback);

const StudentList = ({ tabs }) => {
    const [params, setParams] = useSearchParams();
    const q = params.get('q') || '';
    const sort = pick(params.get('sort'), SORTS, 'name');
    const filter = pick(params.get('filter'), FILTERS, 'all');
    const page = Math.max(1, parseInt(params.get('page'), 10) || 1);

    /** Change some of the list's settings in the address, keeping the rest. */
    const update = (changes, { replace = false } = {}) => {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([key, value]) => {
            const isDefault = value === '' || value == null
                || (key === 'sort' && value === 'name') || (key === 'filter' && value === 'all') || (key === 'page' && value === 1);
            if (isDefault) next.delete(key); else next.set(key, String(value));
        });
        setParams(next, { replace });
    };

    // What is typed shows at once; the address — and so the request — follows
    // a beat after the last keystroke, one request per pause, not per letter.
    const [searchText, setSearchText] = useState(q);
    const [lastQ, setLastQ] = useState(q);
    if (lastQ !== q) { setLastQ(q); setSearchText(q); }
    useEffect(() => {
        if (searchText.trim() === q.trim()) return undefined;
        const timer = setTimeout(() => update({ q: searchText.trim(), page: 1 }, { replace: true }), 300);
        return () => clearTimeout(timer);
    }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

    const [list, setList] = useState({ rows: [], total: 0 });
    const [loading, setLoading] = useState(true);
    // Whether the list has ever arrived. A failed first load has no rows to
    // fall back on and must not read as "no students yet".
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [removeError, setRemoveError] = useState('');
    const [removing, setRemoving] = useState(null);   // the student being asked about
    const [busy, setBusy] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [notice, setNotice] = useState('');

    const wide = useMediaQuery('(min-width: 1280px)');

    const fetchStudents = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const query = { page, limit: PAGE_SIZE, sort, filter };
            if (q.trim()) query.search = q.trim();
            const res = await api.get('/organizations/me/students', { params: query, signal });
            if (!isCurrent()) return;
            const students = res.data.students || [];
            if (typeof res.data.total === 'number') {
                // The server paged it.
                setList({ rows: students, total: res.data.total });
                const last = Math.max(1, Math.ceil(res.data.total / PAGE_SIZE));
                if (page > last) update({ page: last }, { replace: true });
            } else {
                // The whole list came back: arrange and page it here.
                const rows = arrange(students, { q, filter, sort });
                const last = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
                const at = Math.min(page, last);
                setList({ rows: rows.slice((at - 1) * PAGE_SIZE, at * PAGE_SIZE), total: rows.length, page: at });
            }
            setLoaded(true);
            setError('');
        } catch (err) {
            if (!isCurrent()) return;
            setError(err.response?.data?.message || 'Could not load your students.');
        } finally {
            if (isCurrent()) setLoading(false);
        }
    };

    const refresh = useAutoRefresh(fetchStudents, 30000, [q, sort, filter, page]);
    const retry = () => { setLoading(true); refresh(); };

    /**
     * Take a student out of the organization.
     *
     * Clears the membership only. Their account, courses, progress, XP and
     * certificates are their own and are untouched — which is what the
     * confirmation says, because "remove" sounds like deletion and is not.
     */
    const remove = async () => {
        setBusy(true);
        setRemoveError('');
        try {
            const res = await api.delete(`/organizations/me/students/${removing._id}`);
            setRemoving(null);
            setNotice(res.data.message);
            refresh();
            setTimeout(() => setNotice(''), 5000);
        } catch (err) {
            // Said inside the dialog that asked, which stays open: the page
            // banner sits behind it, and may be scrolled out of view.
            setRemoveError(err.response?.data?.message || 'Could not remove that student.');
        } finally {
            setBusy(false);
        }
    };

    /**
     * A CSV of every student matching the search and filter — all pages, not
     * just the one on screen — built in the browser. Institutions live in
     * spreadsheets, and this needs no new endpoint: the unpaged list is the
     * old answer, and the search, filter and sort are applied to it here.
     */
    const exportCsv = async () => {
        setExporting(true);
        try {
            const query = { sort, filter };
            if (q.trim()) query.search = q.trim();
            const res = await api.get('/organizations/me/students', { params: query });
            const rows = arrange(res.data.students || [], { q, filter, sort });

            const header = ['Name', 'Email', 'Status', 'Courses enrolled', 'Courses completed', 'Overall progress % (all enrolled courses)', 'Lessons completed', 'Quizzes passed', 'Certificates', 'XP', 'Level', 'Joined organization', 'Last active'];
            const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
            const body = rows.map((s) => [
                s.name, s.email, s.status, s.coursesEnrolled, s.coursesCompleted, s.progressPercent,
                s.lessonsCompleted, s.quizzesPassed, s.certificates, s.xp, s.level,
                s.joinedOrganizationAt ? formatDate(s.joinedOrganizationAt) : '',
                s.lastActive ? formatDate(s.lastActive) : 'Never'
            ].map(escape).join(','));

            const blob = new Blob([[header.map(escape).join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
            saveBlob(blob, `students-${new Date().toISOString().slice(0, 10)}.csv`, { title: 'Students (CSV)' });
        } catch (err) {
            setError(err.response?.data?.message || 'Could not export your students.');
        } finally {
            setExporting(false);
        }
    };

    const visible = list.rows;
    const shownPage = list.page || page;
    const narrowed = Boolean(q.trim()) || filter !== 'all';

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Users} title="Students"
                subtitle={loading ? 'Loading…' : loaded && !narrowed ? `${list.total} student${list.total === 1 ? '' : 's'} in your organization.` : 'The students in your organization.'}>
                <SearchInput value={searchText} onChange={setSearchText} placeholder="Search name or email..." label="Search students" />
                <button onClick={exportCsv} disabled={!list.total || exporting} className={`${BTN2} whitespace-nowrap`}>
                    {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}Export CSV
                </button>
            </PageHeader>

            {tabs}

            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {/* A failed refresh over a list already on screen; a failed first
                load says so in the list itself, with a Retry. */}
            {error && loaded && <Banner onClose={() => setError('')}>{error}</Banner>}

            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="hidden text-xs font-bold uppercase tracking-wider text-slate-400 sm:inline">Show</span>
                    <Segmented options={FILTERS} value={filter} onChange={(f) => update({ filter: f, page: 1 })} />
                </div>
                <div className="flex min-w-0 items-center gap-3">
                    <span className="hidden text-xs font-bold uppercase tracking-wider text-slate-400 sm:inline">Sort by</span>
                    <Segmented options={SORTS} value={sort} onChange={(v) => update({ sort: v, page: 1 })} />
                </div>
            </div>

            <div className={`${CARD} overflow-hidden`}>
                {loading ? (
                    <Rows count={4} />
                ) : !loaded ? (
                    <LoadFailed what="your students" onRetry={retry} />
                ) : visible.length === 0 ? (
                    <Empty icon={Users}>
                        {q.trim()
                            ? 'No student matches that search.'
                            : filter !== 'all'
                                ? 'No student matches that filter.'
                                : 'No students have joined this organization yet. Share your Organization ID so they can ask to join.'}
                    </Empty>
                ) : wide ? (
                    /* A wide desktop: a table */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[860px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase">
                                    <th className="px-6 py-4 font-semibold">Student</th>
                                    <th className="px-6 py-4 font-semibold">Courses</th>
                                    {/* progressPercent averages every course the student can
                                        open, platform and bundle courses included. */}
                                    <th className="px-6 py-4 font-semibold" title="Average across all the student's enrolled courses, not only yours">Overall progress</th>
                                    <th className="px-6 py-4 font-semibold">XP</th>
                                    <th className="px-6 py-4 font-semibold">Last active</th>
                                    <th className="px-6 py-4 font-semibold">Account status</th>
                                    <th className="sticky right-0 bg-slate-50 px-6 py-4 font-semibold text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.map((s) => (
                                    <tr key={s._id} className="group hover:bg-slate-50/50 transition-colors">
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
                                            {s.coursesCompleted} of {s.coursesEnrolled} courses
                                            {s.certificates > 0 && (
                                                <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-600" title="Certificates issued">
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
                                        <td className="sticky right-0 bg-white px-4 py-2 text-right whitespace-nowrap shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.12)] group-hover:bg-slate-50">
                                            <Link to={`/organization/students/${s._id}`}
                                                className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-900 font-medium text-sm transition-colors">
                                                View
                                            </Link>
                                            <button onClick={() => setRemoving(s)}
                                                className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-red-500 hover:bg-red-50 hover:text-red-700 font-medium text-sm transition-colors">
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Phones and tablets: cards */
                    <ul className="divide-y divide-slate-100">
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
                                            <span>{s.coursesCompleted} of {s.coursesEnrolled} courses</span>
                                            <span title="Overall progress (all enrolled courses)">{s.progressPercent}% overall</span>
                                        </div>
                                        <Bar percent={s.progressPercent} tone={s.progressPercent >= 100 ? 'emerald' : 'indigo'} />
                                    </div>
                                </Link>
                                {/* Outside the link: a card-wide tap opens the
                                    student, and this must not be part of that. */}
                                <div className="mt-3 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                        <span title="Account status"><Pill status={s.status} /></span>
                                        <span className="tabular-nums">{s.xp} XP</span>
                                        {s.certificates > 0 && (
                                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600" title="Certificates issued"><Award size={12} />{s.certificates}</span>
                                        )}
                                        <span>{relativeDay(s.lastActive)}</span>
                                    </div>
                                    <button onClick={() => setRemoving(s)} aria-label={`Remove ${s.name} from organization`}
                                        className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 active:bg-red-50">
                                        <UserMinus size={13} />Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {loaded && !loading && (
                    <Pager page={shownPage} limit={PAGE_SIZE} total={list.total} onPage={(n) => update({ page: n })} />
                )}
            </div>

            {removing && (
                <RemoveStudentDialog student={removing} busy={busy} error={removeError}
                    onCancel={() => { setRemoving(null); setRemoveError(''); }} onConfirm={remove} />
            )}
        </div>
    );
};

const VIEWS = [
    ['students', 'All students'],
    ['certificates', 'Certificate progress']
];

/**
 * The Students section: the student list, and each student's certificate
 * progress on the organization's own courses. The open tab lives in the
 * address (?view=certificates), so it survives a refresh and can be linked to.
 */
const OrgStudents = () => {
    const [params, setParams] = useSearchParams();
    const view = params.get('view') === 'certificates' ? 'certificates' : 'students';
    // Under the page's title, not above it: the title says where you are, the
    // tabs which view of it.
    const tabs = <Segmented options={VIEWS} value={view} onChange={(v) => setParams(v === 'students' ? {} : { view: v })} />;
    if (view === 'students') return <StudentList tabs={tabs} />;
    return (
        // Certificate progress is a narrower view, centred — tabs and all.
        <div className="mx-auto max-w-5xl space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Users} title="Students"
                subtitle="How your students are doing on your organization's own courses." />
            {tabs}
            <OrgCertificateProgress />
        </div>
    );
};

export default OrgStudents;
