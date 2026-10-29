/**
 * One student's whole learning record, as their organization sees it.
 *
 * Every section is drawn from data the LMS already holds. Where a student has
 * nothing — no courses, no Career Path, no certificates — the section says so
 * rather than showing an invented number or a persuasive-looking zero chart.
 * Career Path and rewards are absent entirely from the response unless the
 * student has used them, so those blocks simply do not render.
 *
 * The URL carries a student id, and putting someone else's in it answers 404:
 * the server looks the student up with the organization in the query, so it
 * cannot match a student who is not a member.
 */
import useGoBack from '../../hooks/useGoBack';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, Award, Compass, Flame, TrendingUp, GraduationCap,
    CheckCircle2, UserMinus, AlertTriangle, Mail, Phone, Clock, ListChecks, CalendarDays, Trophy, Medal, UserPlus
} from 'lucide-react';
import api from '../../utils/api';
import StudentDevicesCard from '../../components/StudentDevicesCard';
import { CARD, Stat, Bar, Pill, Empty, Avatar, RemoveStudentDialog } from '../../components/orgUi';
import { formatDate, relativeDay } from '../../utils/dates';

const Section = ({ icon: Icon, title, subtitle, children, action }) => (
    <div className={`${CARD} overflow-hidden`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
                {Icon && <span className="p-2 rounded-xl bg-indigo-100 text-indigo-600 shrink-0"><Icon size={18} /></span>}
                <div className="min-w-0">
                    <h2 className="font-bold text-slate-800 truncate">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
        {children}
    </div>
);

const days = (n) => `${n} day${n === 1 ? '' : 's'}`;

/** One of the three facts in the activity strip: an icon, the value, what it is. */
const Fact = ({ icon: Icon, tone, value, label }) => (
    <div className="flex min-w-0 flex-col items-center gap-1.5 px-2 py-4 text-center sm:flex-row sm:gap-3 sm:px-5 sm:text-left">
        <span className={`shrink-0 rounded-xl p-2 ${tone}`}><Icon size={17} /></span>
        <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 tabular-nums sm:text-base">{value}</p>
            <p className="text-[11px] font-semibold leading-tight text-slate-500">{label}</p>
        </div>
    </div>
);

const dayName = (key) => new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// "5 days ago", "on 12 Sep 2026": relativeDay's words, fitted into a sentence.
const whenInSentence = (value) => { const r = relativeDay(value); return r === formatDate(value) ? `on ${r}` : r.toLowerCase(); };

/**
 * The streak as the student sees it, in one small card: the run they are on
 * (none, once a day has been missed) and how it stands today, the last seven
 * days one dot each, and under it their best run and their badges.
 */
const StreakCard = ({ rewards }) => {
    const { currentStreak: current, longestStreak: longest, doneToday, lastActivityDay, week, badges } = rewards;
    const on = current > 0;
    const status = doneToday ? 'Learned today'
        : on ? 'Learned yesterday'
            : lastActivityDay ? `Last learned ${whenInSentence(lastActivityDay)}` : 'Not started yet';
    const activeDays = (week || []).filter((d) => d.active).length;
    return (
        <div className={`${CARD} p-4 sm:p-5`}>
            <h2 className="sr-only">Streak and badges</h2>
            <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/25' : 'bg-slate-100 text-slate-400'}`}>
                    <Flame size={20} strokeWidth={2.25} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800">{on ? `${current}-day streak` : 'No streak running'}</p>
                    <p className={`text-xs font-medium ${doneToday ? 'text-emerald-600' : on ? 'text-amber-600' : 'text-slate-500'}`}>{status}</p>
                </div>
                {week?.length === 7 && (
                    <div className="shrink-0 text-right" role="img" aria-label={`Learned on ${activeDays} of the last 7 days`}>
                        <div className="flex gap-1">
                            {week.map((d, i) => (
                                <span key={d.day} title={`${dayName(d.day)}${d.active ? ' · learned' : ''}`}
                                    className={`h-3 w-3 rounded-full ${d.active ? 'bg-gradient-to-br from-orange-400 to-rose-500' : 'bg-slate-200'} ${i === 6 ? 'ring-2 ring-orange-200 ring-offset-1' : ''}`} />
                            ))}
                        </div>
                        <p className="mt-1 text-[10px] font-medium text-slate-400">Last 7 days</p>
                    </div>
                )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-100 pt-3 text-sm">
                <p className="flex items-center gap-1.5">
                    <Trophy size={15} className="shrink-0 text-amber-500" />
                    <span className="text-slate-500">Best streak</span>
                    <span className="font-bold text-slate-800 tabular-nums">{days(longest)}</span>
                </p>
                <p className="flex items-center gap-1.5">
                    <Medal size={15} className="shrink-0 text-violet-500" />
                    <span className="font-bold text-slate-800 tabular-nums">{badges}</span>
                    <span className="text-slate-500">badge{badges === 1 ? '' : 's'} earned</span>
                </p>
            </div>
        </div>
    );
};

const OrgStudentDetail = () => {
    const { studentId } = useParams();
    // Back: to wherever they came from (the students list, the dashboard…).
    const goBack = useGoBack();
    const navigate = useNavigate();

    /**
     * The loaded student, tagged with whose record it is.
     *
     * Kept as one value with its id rather than as separate `data` and `loading`
     * flags, so "still loading" is derived from `loaded.id !== studentId` instead
     * of being switched on at the top of the effect. Navigating from one student
     * to another therefore shows the skeleton immediately, with no render in
     * between where the previous student's record sits under the new name.
     */
    const [loaded, setLoaded] = useState({ id: null, data: null, error: '' });
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState('');

    const loading = loaded.id !== studentId;

    useEffect(() => {
        let alive = true;
        api.get(`/organizations/me/students/${studentId}`)
            .then((res) => { if (alive) setLoaded({ id: studentId, data: res.data, error: '' }); })
            .catch((err) => {
                if (alive) {
                    setLoaded({
                        id: studentId,
                        data: null,
                        error: err.response?.data?.message || 'Could not open that student.'
                    });
                }
            });
        return () => { alive = false; };
    }, [studentId]);

    const remove = async () => {
        setRemoving(true);
        try {
            await api.delete(`/organizations/me/students/${studentId}`);
            navigate('/organization/students', { replace: true });
        } catch (err) {
            // Said in the dialog that asked, which stays open — as on the list.
            setRemoveError(err.response?.data?.message || 'Could not remove that student.');
            setRemoving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-fade-in">
                <div className="animate-pulse h-20 bg-slate-100 rounded-2xl" />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[0, 1, 2, 3].map((i) => <div key={i} className="animate-pulse h-28 bg-slate-100 rounded-2xl" />)}
                </div>
                <div className="animate-pulse h-64 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    // A 200 that does not carry a student is as useless as a 404, and reads far
    // better as the error screen below than as a crash on `student.name`.
    if (loaded.error || !loaded.data?.student) {
        return (
            <div className="space-y-4 animate-fade-in">
                <Link to="/organization/students" onClick={goBack} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
                    <ArrowLeft size={16} />Back
                </Link>
                <div className={`${CARD} p-10 text-center`}>
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle size={24} className="text-red-600" />
                    </div>
                    <p className="font-semibold text-slate-800">
                        {loaded.error || 'That student\'s record could not be read.'}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">This student may have left your organization, or the link may be wrong.</p>
                </div>
            </div>
        );
    }

    const { student, overview, courses, certificates, careerPath, rewards } = loaded.data;

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <Link to="/organization/students" onClick={goBack} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
                <ArrowLeft size={16} />Back
            </Link>

            {/* ── Who they are ─────────────────────────────────────────────── */}
            <div className={`${CARD} overflow-hidden`}>
                <div className="flex items-center gap-3.5 p-4 sm:gap-4 sm:p-5 lg:p-6">
                    <div className="shrink-0 rounded-full ring-4 ring-indigo-50">
                        <Avatar name={student.name} src={student.profilePicture} size="h-16 w-16 text-xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">{student.name}</h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <Pill status={student.status} />
                            {student.joinedOrganizationAt && (
                                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-slate-500" title="When they joined your organization">
                                    <UserPlus size={13} className="shrink-0 text-slate-400" />Joined {formatDate(student.joinedOrganizationAt)}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* From a tablet up, beside the name; a phone has it, smaller, on the card's last line. */}
                    <button onClick={() => setConfirmRemove(true)}
                        className="hidden h-10 shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 sm:inline-flex">
                        <UserMinus size={16} />Remove from organization
                    </button>
                </div>

                {/* How to reach them: tap to write or to call. */}
                <div className="grid divide-y divide-slate-100 border-t border-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                    <a href={`mailto:${student.email}`} className="flex min-w-0 items-center gap-3 px-4 py-2.5 sm:py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:px-5 lg:px-6">
                        <span className="shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600"><Mail size={15} /></span>
                        <span className="min-w-0">
                            <span className="block text-[11px] font-semibold text-slate-400">Email</span>
                            <span className="block truncate text-sm font-medium text-slate-700" title={student.email}>{student.email}</span>
                        </span>
                    </a>
                    {student.phone && (
                        <a href={`tel:${student.phone}`} className="flex min-w-0 items-center gap-3 px-4 py-2.5 sm:py-3 transition-colors hover:bg-slate-50 active:bg-slate-100 sm:px-5 lg:px-6">
                            <span className="shrink-0 rounded-lg bg-emerald-50 p-2 text-emerald-600"><Phone size={15} /></span>
                            <span className="min-w-0">
                                <span className="block text-[11px] font-semibold text-slate-400">Phone</span>
                                <span className="block truncate text-sm font-medium text-slate-700 tabular-nums">{student.phone}</span>
                            </span>
                        </a>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-500 sm:px-5 sm:py-2.5 lg:px-6">
                    <p className="flex min-w-0 items-center gap-1.5" title="When they made their account">
                        <CalendarDays size={13} className="shrink-0 text-slate-400" /><span className="truncate">On the platform since {formatDate(student.accountCreatedAt)}</span>
                    </p>
                    <button onClick={() => setConfirmRemove(true)} aria-label="Remove from organization"
                        className="-my-1 inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 font-semibold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 sm:hidden">
                        <UserMinus size={14} />Remove
                    </button>
                </div>
            </div>

            {/* ── Devices: where they sign in, residential card, reset ──────── */}
            <StudentDevicesCard base={`/organizations/me/students/${studentId}/devices`} />

            {/* ── Overview ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                {/* Every course they can open, platform and bundle ones included — not
                    only yours (Certificate progress on Students shows those). */}
                <Stat icon={TrendingUp} label="Overall progress" value={`${overview.overallPercent}%`} sub="All enrolled courses" tone="violet" />
                <Stat icon={BookOpen} label="Courses" value={`${overview.coursesCompleted} of ${overview.coursesEnrolled}`} sub="Completed of enrolled" tone="indigo" />
                <Stat icon={GraduationCap} label="Lessons done" value={overview.lessonsCompleted} tone="emerald" />
                <Stat icon={Award} label="XP" value={overview.xp} sub={`Level ${overview.level}`} tone="amber" />
            </div>

            {/* Three facts side by side, a phone included: one short strip, not a tall card. */}
            <div className={`${CARD} grid grid-cols-3 divide-x divide-slate-100`}>
                <Fact icon={Clock} tone="bg-sky-100 text-sky-600" value={relativeDay(overview.lastActive)} label="Last active" />
                <Fact icon={ListChecks} tone="bg-emerald-100 text-emerald-600" value={overview.quizzesPassed} label="Quizzes passed" />
                <Fact icon={CalendarDays} tone="bg-violet-100 text-violet-600" value={formatDate(overview.enrolledAt)} label="First enrolled" />
            </div>

            {/* ── Courses ──────────────────────────────────────────────────── */}
            <Section icon={BookOpen} title="Courses" subtitle={`${courses.length} course${courses.length === 1 ? '' : 's'} available to this student`}>
                {courses.length === 0 ? (
                    <Empty icon={BookOpen}>This student is not enrolled in any course yet.</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {courses.map((c) => (
                            <li key={c.courseId} className="px-5 py-4 sm:px-6">
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <p className="font-medium text-slate-800">{c.title}</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        {c.completed && <CheckCircle2 size={15} className="text-emerald-600" />}
                                        <span className="font-semibold text-slate-700 tabular-nums">{c.percentage}%</span>
                                    </div>
                                </div>
                                <div className="mt-2"><Bar percent={c.percentage} tone={c.completed ? 'emerald' : 'indigo'} /></div>
                                <p className="mt-2 text-xs text-slate-500">
                                    {c.lessonsCompleted} lesson{c.lessonsCompleted === 1 ? '' : 's'} done ·
                                    {' '}{c.quizzesPassed} quiz{c.quizzesPassed === 1 ? '' : 'zes'} passed ·
                                    {' '}last worked on {relativeDay(c.lastActivity).toLowerCase()}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* ── Career Path, only if they have used it ───────────────────── */}
            {careerPath && (
                <Section icon={Compass} title="Career Path" subtitle={careerPath.careerGoal ? `Working towards ${careerPath.careerGoal}` : 'No goal set yet'}>
                    <div className="space-y-5 p-5 sm:p-6">
                        {careerPath.hasRoadmap && careerPath.roadmapStepsTotal > 0 && (
                            <div>
                                <div className="mb-1.5 flex justify-between text-sm">
                                    <span className="font-semibold text-slate-700">Roadmap</span>
                                    <span className="text-slate-600 tabular-nums">
                                        {careerPath.roadmapStepsCompleted}/{careerPath.roadmapStepsTotal} steps · {careerPath.roadmapPercent}%
                                    </span>
                                </div>
                                <Bar percent={careerPath.roadmapPercent} tone="amber" />
                            </div>
                        )}

                        {careerPath.educationLevel && (
                            <p className="text-sm text-slate-600">
                                <span className="font-semibold text-slate-700">Education: </span>{careerPath.educationLevel}
                                {careerPath.dreamCompany && <> · aiming for {careerPath.dreamCompany}</>}
                            </p>
                        )}

                        {careerPath.skills.length > 0 ? (
                            <div>
                                <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Skills being tracked</p>
                                <div className="space-y-3">
                                    {careerPath.skills.map((s) => (
                                        <div key={s.name}>
                                            <div className="mb-1 flex justify-between text-sm">
                                                <span className="text-slate-700">{s.name}</span>
                                                <span className="text-slate-500 tabular-nums">{s.level} · {s.progress}%</span>
                                            </div>
                                            <Bar percent={s.progress} tone="violet" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">No skills are being tracked yet.</p>
                        )}
                    </div>
                </Section>
            )}

            {/* ── Streak and badges, only if rewards is in use ─────────────── */}
            {rewards && (
                <StreakCard rewards={rewards} />
            )}

            {/* ── Certificates ─────────────────────────────────────────────── */}
            <Section icon={Award} title="Certificates" subtitle={`${certificates.length} issued by the platform`}>
                {certificates.length === 0 ? (
                    <Empty icon={Award}>No certificates yet — they are issued when a course is finished.</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {certificates.map((c, i) => (
                            <li key={`${c.courseId}-${i}`} className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3.5 sm:px-6">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-800">{c.courseTitle || 'Course'}</p>
                                    {c.certificateNumber && <p className="font-mono text-xs text-slate-500">{c.certificateNumber}</p>}
                                </div>
                                <span className="text-sm text-slate-500">{formatDate(c.issuedAt)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Section>

            {/* ── Remove confirmation ──────────────────────────────────────── */}
            {confirmRemove && (
                <RemoveStudentDialog student={student} busy={removing} error={removeError}
                    onCancel={() => { setConfirmRemove(false); setRemoveError(''); }} onConfirm={remove} />
            )}
        </div>
    );
};

export default OrgStudentDetail;
