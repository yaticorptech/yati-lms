/**
 * The parent dashboard's pages (2026-11-19): the Overview of the child chosen in the switcher, and one page for each
 * item of the sidebar — the institution's (attendance, timetable, results, fees, Student Ranking, extra-curricular) and
 * the AI card's (activity, courses, Multilingo, Career Path, interviews, certificates, Global Quiz, competitions, jobs,
 * badges).
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, Megaphone, Pin, BookOpen, CalendarCheck, ChevronRight, Clock, Compass, Flame, Globe2, GraduationCap, Loader2, Medal, School, Sparkles, Star, Wallet, XCircle } from 'lucide-react';
import useParent from './useParent';
import { Avatar } from './ui';
import { ago } from './when';
import { AbsentAlert, Attendance as AttendanceCard, Timetable as TimetableCard, Results as ResultsCard, Fees as FeesCard, Certificates as CertificatesCard } from './Institution';
import { Bar, Stat, LearningDays, Timeline, Ranking, Extra, Courses as CoursesCard, Multilingo as MultilingoCard, Career as CareerCard, Interviews as InterviewsCard, Quizzes as QuizzesCard, Competitions as CompetitionsCard, Jobs as JobsCard, Badges as BadgesCard } from './cards';

/**
 * Back, on every page but the Overview (2026-11-19, the user: "back buttons for every page"): the page before, or the
 * Overview when this one was opened straight.
 */
function Back() {
    const navigate = useNavigate();
    return (
        <button type="button" onClick={() => ((window.history.state?.idx ?? 0) > 0 ? navigate(-1) : navigate('/parent'))} data-parent-back
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl px-1 py-1.5 text-sm font-bold text-slate-600 transition hover:text-teal-700">
            <ArrowLeft size={18} /> Back
        </button>
    );
}

/** The chosen child's data, or the loading/error state in its place. A page with a title has Back above it. */
function WithChild({ title, children }) {
    const { data, error, loading, reload, child } = useParent();
    const body = error ? <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error} <button type="button" onClick={reload} className="ml-2 underline">Try again</button></p>
        : loading || !data ? <div className="flex items-center justify-center gap-2 py-24 text-slate-500"><Loader2 className="animate-spin" size={20} /> Loading {child?.name ? `${child.name.split(' ')[0]}’s` : 'their'} activity…</div>
            : (
                <>
                    {title && <h1 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title} <span className="font-semibold text-slate-400">· {data.child.name}</span></h1>}
                    {children(data)}
                </>
            );
    return <div className="mx-auto max-w-6xl">{title && <Back />}{body}</div>;
}

const NoInstitution = () => (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
        <School size={28} className="mx-auto text-slate-300" />
        <p className="mt-2 text-sm font-semibold text-slate-600">Your child is not admitted to an institution on YATICORPX3 yet.</p>
        <p className="mt-1 text-xs text-slate-500">Attendance, the timetable, results and fees show here once their institution admits them.</p>
    </div>
);

function ChildHeader({ c, campus }) {
    return (
        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex items-center gap-3.5 sm:gap-5">
                <Avatar src={c.profilePicture} name={c.name} size="h-14 w-14 sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{c.name}</h1>
                    <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-600 sm:text-sm">{[c.organization, campus && `${campus.department} · Sem ${campus.semester}${campus.section ? ` · Sec ${campus.section}` : ''}`].filter(Boolean).join(' · ') || 'Not in an institution'}</p>
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"><Clock size={13} /> {c.lastActive ? `Last active ${ago(c.lastActive)}` : 'No activity yet'}</p>
                </div>
            </div>
            {!c.active && <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-rose-600"><XCircle size={15} /> This student account is switched off.</p>}
        </section>
    );
}

/** A tile on the overview: one number, and the page it opens. */
function Tile({ to, icon: Icon, label, value, sub, tone, alert = false }) {
    return (
        <Link to={to} className={`group flex min-w-0 items-center gap-3.5 rounded-3xl border bg-white p-4 shadow-sm transition hover:shadow-md ${alert ? 'border-rose-200' : 'border-slate-100'}`}>
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={22} /></span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <span className={`block truncate text-xl font-extrabold ${alert ? 'text-rose-600' : 'text-slate-900'}`}>{value}</span>
                {sub && <span className="block truncate text-xs text-slate-500">{sub}</span>}
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-300 group-hover:text-teal-600" />
        </Link>
    );
}

export function Overview() {
    return (
        <WithChild>
            {(d) => {
                const { child: c, campus, ranking360: r360, courses, multilingo: m, career, certificates = [], rewards, timeline } = d;
                const ov = courses?.overview || {};
                const lastResult = campus?.results?.[0];
                return (
                    <>
                        <ChildHeader c={c} campus={campus} />
                        <AbsentAlert campus={campus} />
                        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
                            <Stat icon={Sparkles} label="XP" value={c.xp.toLocaleString('en-IN')} tone="amber" />
                            <Stat icon={Star} label="Level" value={c.level} tone="indigo" />
                            <Stat icon={Flame} label="Day streak" value={c.streak} tone="orange" />
                            <Stat icon={BookOpen} label="Courses done" value={`${ov.coursesCompleted || 0}/${ov.coursesEnrolled || 0}`} tone="sky" />
                            <Stat icon={Award} label="Certificates" value={certificates.length} tone="emerald" />
                            <Stat icon={Globe2} label="Language lessons" value={m?.lessonsCompleted || 0} tone="violet" />
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {campus && <Tile to="/parent/attendance" icon={CalendarCheck} label="Attendance" value={`${campus.attendance.percent ?? 0}%`} sub={campus.attendance.lastPresent ? `Last attended ${ago(`${campus.attendance.lastPresent.date}T12:00:00`)} · ${campus.attendance.absences.length} absent in 30 days` : `${campus.attendance.absences.length} absent in 30 days`} tone="bg-sky-50 text-sky-700" alert={campus.attendance.held > 0 && campus.attendance.percent < 75} />}
                            {campus && <Tile to="/parent/results" icon={GraduationCap} label="Results" value={lastResult ? (lastResult.sgpa != null ? `SGPA ${lastResult.sgpa}` : lastResult.result) : 'None yet'} sub={lastResult ? lastResult.name : 'No results published'} tone="bg-indigo-50 text-indigo-700" />}
                            {campus && <Tile to="/parent/fees" icon={Wallet} label="Fees due" value={`₹${(campus.fees.balance || 0).toLocaleString('en-IN')}`} sub={`Paid ₹${(campus.fees.paid || 0).toLocaleString('en-IN')} of ₹${(campus.fees.total || 0).toLocaleString('en-IN')}`} tone="bg-amber-50 text-amber-700" alert={campus.fees.balance > 0} />}
                            <Tile to="/parent/ranking" icon={Medal} label={r360?.name || 'Student Ranking'} value={r360 ? `${r360.total} / ${r360.possible}` : 'Not open'} sub={r360 ? `${r360.proofs.length} proofs sent` : 'At their institution'} tone="bg-indigo-50 text-indigo-700" />
                            <Tile to="/parent/certificates" icon={Award} label="Certificates" value={certificates.length} sub={certificates[0] ? `Latest: ${certificates[0].title}` : 'None yet'} tone="bg-emerald-50 text-emerald-700" />
                            <Tile to="/parent/career" icon={Compass} label="Career Path" value={career?.goal || 'Not started'} sub={career ? `${career.roadmapPercent ?? 0}% of the roadmap · ${career.tasks.completed} tasks done` : ''} tone="bg-emerald-50 text-emerald-700" />
                        </div>
                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                            <div className="min-w-0 lg:col-span-2"><Timeline days={timeline} limit={3} /></div>
                            <LearningDays rewards={rewards} />
                        </div>
                    </>
                );
            }}
        </WithChild>
    );
}

/** A page of the institution: its card in full, or why there is none. */
const institutionPage = (title, render) => function InstitutionPage() {
    return <WithChild title={title}>{(d) => (<><AbsentAlert campus={d.campus} />{d.campus ? <div className="mt-4">{render(d)}</div> : <NoInstitution />}</>)}</WithChild>;
};
export const AttendancePage = institutionPage('Attendance', (d) => <AttendanceCard campus={d.campus} Bar={Bar} full />);
export const TimetablePage = institutionPage('Timetable', (d) => <TimetableCard campus={d.campus} />);
export const ResultsPage = institutionPage('Results', (d) => <ResultsCard campus={d.campus} full />);
export const FeesPage = institutionPage('Fees', (d) => <FeesCard campus={d.campus} full />);
export function RankingPage() { return <WithChild title="Student Ranking">{(d) => <Ranking r360={d.ranking360} />}</WithChild>; }
export function ExtraPage() { return <WithChild title="Extra-curricular">{(d) => <Extra extra={d.extraCurricular} />}</WithChild>; }

export function ActivityPage() {
    return (
        <WithChild title="Activity">
            {(d) => (
                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="min-w-0 lg:col-span-2"><Timeline days={d.timeline} /></div>
                    <LearningDays rewards={d.rewards} />
                </div>
            )}
        </WithChild>
    );
}
export function CoursesPage() { return <WithChild title="Courses">{(d) => <CoursesCard courses={d.courses} />}</WithChild>; }
export function MultilingoPage() { return <WithChild title="Multilingo">{(d) => <MultilingoCard m={d.multilingo} />}</WithChild>; }
export function CareerPage() { return <WithChild title="Career Path">{(d) => <CareerCard career={d.career} />}</WithChild>; }
export function InterviewsPage() { return <WithChild title="Interview practice">{(d) => <InterviewsCard interviews={d.interviews} />}</WithChild>; }
export function CertificatesPage() { return <WithChild title="Certificates">{(d) => <CertificatesCard list={d.certificates || []} full />}</WithChild>; }
export function QuizzesPage() { return <WithChild title="Global Quiz">{(d) => <QuizzesCard quizzes={d.quizzes} />}</WithChild>; }
export function CompetitionsPage() { return <WithChild title="Competitions">{(d) => <CompetitionsCard competitions={d.competitions} />}</WithChild>; }
export function JobsPage() { return <WithChild title="Part-time jobs">{(d) => <JobsCard jobs={d.jobs} />}</WithChild>; }
export function BadgesPage() { return <WithChild title="Badges">{(d) => <BadgesCard rewards={d.rewards} />}</WithChild>; }

/**
 * Announcements from the institutions of the parent's children (2026-11-19): pinned first, then the newest; each says
 * which institution sent it and which of their children it is for. Opening the page marks them seen.
 */
export function AnnouncementsPage() {
    const { notices, markSeen, reloadNotices, child } = useParent();
    // Only the child chosen in the switcher's (2026-11-19, the user: "if I switch the child, only that child's activity and
    // announcements should be shown"); another child's: switch at the top.
    const shown = (notices || []).filter((a) => !child || (a.forIds || []).includes(String(child._id)));
    const name = child?.name?.split(' ')[0] || '';
    useEffect(() => { if (notices) markSeen(); }, [notices, markSeen]);
    const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    return (
        <div className="mx-auto max-w-3xl">
            <Back />
            <h1 className="mb-4 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Megaphone size={20} /></span> Announcements{child && <span className="font-semibold text-slate-400">· {child.name}</span>}</h1>
            {!notices ? <div className="flex items-center justify-center gap-2 py-24 text-slate-500"><Loader2 className="animate-spin" size={20} /> Loading…</div>
                : !shown.length ? (
                    <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
                        <Megaphone size={28} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-sm font-semibold text-slate-600">{name ? `No announcements for ${name} yet.` : 'No announcements yet.'}</p>
                        <p className="mt-1 text-xs text-slate-500">When {name ? `${name}’s` : 'your child’s'} institution sends a message to parents, it shows here.</p>
                        <button type="button" onClick={reloadNotices} className="mt-3 text-sm font-bold text-teal-700 hover:underline">Check again</button>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {shown.map((a) => (
                            <li key={a._id} className={`rounded-3xl border bg-white p-5 shadow-sm ${a.pinned ? 'border-amber-200 ring-1 ring-amber-100' : 'border-slate-100'}`} data-announcement>
                                <div className="flex items-start gap-3">
                                    {a.logo ? <img src={a.logo} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain ring-1 ring-slate-100" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><School size={18} /></span>}
                                    <div className="min-w-0 flex-1">
                                        <p className="flex items-start gap-1.5 font-extrabold leading-snug text-slate-900">{a.pinned && <Pin size={15} className="mt-0.5 shrink-0 text-amber-500" aria-label="Pinned" />}<span className="break-words">{a.title}</span></p>
                                        <p className="mt-0.5 text-xs text-slate-500">{a.organization} · {when(a.createdAt)}</p>
                                    </div>
                                </div>
                                {a.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{a.body}</p>}
                                {a.for?.length > 0 && <p className="mt-3 inline-flex flex-wrap items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">For: {a.for.join(', ')}</p>}
                            </li>
                        ))}
                    </ul>
                )}
        </div>
    );
}
