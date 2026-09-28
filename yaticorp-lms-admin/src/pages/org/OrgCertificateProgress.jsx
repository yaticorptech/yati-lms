/**
 * Certificate progress: how each of the organization's students is doing on
 * the organization's own courses, and which of them they have completed.
 *
 * A finished course shows as "Completed", with its date, in the student's
 * details the moment their progress reaches 100% — nobody has to add it.
 *
 * Everything comes from /organizations/me/certificate-progress, which the
 * server scopes to this organization's current students and its own courses.
 */
import React, { useMemo, useState } from 'react';
import { Award, BookOpen, ChevronDown, Search, Users } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Bar, Empty, Banner, Rows, Avatar } from '../../components/orgUi';
import { formatDate } from '../../utils/dates';

const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

/** One figure in the summary row. */
const Figure = ({ label, value, sub }) => (
    <div className="min-w-0 bg-white px-3 py-3 sm:px-4">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-bold tabular-nums text-slate-900">{value}</p>
        {sub && <p className="text-[11px] leading-snug text-slate-400">{sub}</p>}
    </div>
);

/** A section heading with a count, and optional controls on the right. */
const SectionHead = ({ icon: Icon, title, count, children }) => (
    <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Icon size={15} className="text-slate-400" /> {title}
            <span className="rounded bg-slate-100 px-1.5 text-xs font-medium text-slate-500 tabular-nums">{count}</span>
        </h2>
        {children}
    </div>
);

/** Column headings, shown from tablet width up. */
const Head = ({ cols, children }) => (
    <div className={`hidden gap-4 bg-slate-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:grid ${cols}`}>{children}</div>
);

// Bars have a set, short width with their figure right beside them; on a wide
// screen the spare room collects at the end of the row, before Details. A
// student's course rows use the same columns as the student's own row.
const COURSE_COLS = 'md:grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_17rem]';
const STUDENT_COLS = 'md:grid-cols-[minmax(0,1fr)_23rem_5rem] lg:grid-cols-[minmax(0,1fr)_32rem_5rem]';

const OrgCertificateProgress = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(() => new Set());

    const load = async () => {
        try {
            const res = await api.get('/organizations/me/certificate-progress');
            setData(res.data);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not load certificate progress.');
        }
    };
    useAutoRefresh(load, 30000);

    const students = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = data?.students || [];
        return q ? rows.filter((s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)) : rows;
    }, [data, search]);

    // Per course: how many of the students have started it, and finished it.
    const perCourse = useMemo(() => (data?.courses || []).map((c) => ({
        ...c,
        completed: (data?.students || []).filter((s) => s.courses.some((x) => x.courseId === String(c._id) && x.completed)).length,
        started: (data?.students || []).filter((s) => s.courses.some((x) => x.courseId === String(c._id) && x.started)).length
    })), [data]);

    const toggle = (id) => setOpen((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    if (error && !data) return <Banner onClose={() => setError('')}>{error}</Banner>;
    if (!data) return <div className={CARD}><Rows count={4} height="h-12" /></div>;

    if (!data.courses.length) {
        return (
            <div className={CARD}>
                <Empty icon={BookOpen}>Your organization has no courses yet. Once you add courses and your students finish them, their progress shows here.</Empty>
            </div>
        );
    }

    const { totals } = data;
    const possible = totals.students * data.courses.length;

    return (
        // Its width is set, and centred, by the Students page around it.
        <div className="space-y-4">
            {/* Summary. */}
            <div aria-label="Summary" className={`${CARD} overflow-hidden`}>
                <div className="grid grid-cols-3 gap-px bg-slate-100">
                    <Figure label="Students" value={totals.students} />
                    {/* Courses finished, and by how many of the students — one figure, not two. */}
                    <Figure label="Certificates earned" value={totals.certificates} sub={`by ${totals.studentsWithCertificate} of ${totals.students} ${totals.students === 1 ? 'student' : 'students'}`} />
                    <Figure label="Completion rate" value={`${pct(totals.certificates, possible)}%`} sub={`${totals.certificates} of ${possible} possible`} />
                </div>
            </div>

            {/* Courses. */}
            <section aria-label="By course" className={`${CARD} overflow-hidden`}>
                <SectionHead icon={BookOpen} title="Courses" count={perCourse.length} />
                <Head cols={COURSE_COLS}>
                    <span>Course</span><span className="text-right">Started</span><span className="text-right">Completed</span><span>Completion</span>
                </Head>
                <ul className="divide-y divide-slate-100">
                    {perCourse.map((c) => {
                        const done = pct(c.completed, totals.students);
                        return (
                            <li key={c._id} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-2.5 ${COURSE_COLS}`}>
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="truncate text-sm font-medium text-slate-900" title={c.title}>{c.title}</span>
                                    {!c.isPublished && <span className="shrink-0 rounded border border-amber-200 bg-amber-50 px-1.5 text-[10px] font-semibold uppercase text-amber-700">Draft</span>}
                                </div>
                                <span className="text-right text-sm tabular-nums text-slate-600"><span className="text-xs text-slate-400 md:hidden">Started </span>{c.started}</span>
                                <span className="hidden text-right text-sm tabular-nums text-slate-600 md:block">{c.completed} / {totals.students}</span>
                                <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                                    <div className="flex-1 md:max-w-56"><Bar percent={done} tone="emerald" /></div>
                                    <span className="text-right text-xs tabular-nums text-slate-500 md:w-9 md:text-left">
                                        <span className="md:hidden">{c.completed} / {totals.students} · </span>{done}%
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            {/* Students. */}
            <section aria-label="Students" className={`${CARD} overflow-hidden`}>
                <SectionHead icon={Users} title="Students" count={students.length}>
                    <div className="relative sm:w-64">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email"
                            aria-label="Search students"
                            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    </div>
                </SectionHead>

                {students.length === 0 ? (
                    <Empty icon={Users}>{search.trim() ? 'No student matches that search.' : 'No students have joined your organization yet.'}</Empty>
                ) : (
                    <>
                        <Head cols={STUDENT_COLS}><span>Student</span><span>Progress</span><span /></Head>
                        <ul className="divide-y divide-slate-100">
                            {students.map((s) => {
                                const expanded = open.has(s._id);
                                const done = pct(s.earned.length, s.courses.length);
                                return (
                                    <li key={s._id} aria-label={`Certificate progress: ${s.name}`}>
                                        <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-2.5 ${STUDENT_COLS}`}>
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <Avatar name={s.name} src={s.profilePicture} size="h-8 w-8 text-xs" />
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
                                                    <p className="truncate text-xs text-slate-500">{s.email}</p>
                                                </div>
                                            </div>

                                            <button type="button" onClick={() => toggle(s._id)} aria-expanded={expanded}
                                                className="-mr-2 inline-flex items-center gap-1 justify-self-end rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:order-last">
                                                Details <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                            </button>

                                            <div className="col-span-2 flex items-center gap-3 md:col-span-1">
                                                <span className="w-28 shrink-0 text-xs font-medium tabular-nums text-slate-700">{s.earned.length} of {s.courses.length} completed</span>
                                                <div className="flex-1 md:w-36 md:flex-none lg:w-56"><Bar percent={done} tone="emerald" /></div>
                                            </div>
                                        </div>

                                        {/* Every course: finished ones by name, with the date — added the moment they finish. */}
                                        {expanded && (
                                            <ul className="border-t border-slate-100 bg-slate-50/70 px-4 py-1.5">
                                                {s.courses.map((c) => (
                                                    <li key={c.courseId} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-1 ${STUDENT_COLS}`}>
                                                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-slate-700 md:pl-[2.625rem]" title={c.title}>
                                                            {c.completed && <Award size={13} className="shrink-0 text-amber-500" />}
                                                            <span className="truncate">{c.title}</span>
                                                        </span>
                                                        {/* Lined up under the student's bar, with where they are right beside it. */}
                                                        <div className="flex items-center gap-3">
                                                            <span className="hidden w-28 shrink-0 md:block" />
                                                            {/* No bar for a course they have not opened — "Not started" says it. */}
                                                            <div className="hidden w-36 shrink-0 md:block lg:w-56">{c.started && <Bar percent={c.percentage} tone={c.completed ? 'emerald' : 'indigo'} />}</div>
                                                            <span className={`whitespace-nowrap text-xs tabular-nums ${c.completed ? 'font-medium text-emerald-700' : c.started ? 'text-slate-700' : 'text-slate-400'}`}>
                                                                {c.completed ? 'Completed' : c.started ? `${c.percentage}%` : 'Not started'}
                                                                {c.completed && c.completedAt && <span className="font-normal text-slate-400"> · {formatDate(c.completedAt)}</span>}
                                                            </span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}
            </section>
        </div>
    );
};

export default OrgCertificateProgress;
