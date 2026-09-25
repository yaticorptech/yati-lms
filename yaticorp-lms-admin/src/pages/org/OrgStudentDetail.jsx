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
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, BookOpen, Award, Compass, Flame, TrendingUp, GraduationCap,
    CheckCircle2, UserMinus, Loader2, AlertTriangle, Mail, Phone
} from 'lucide-react';
import api from '../../utils/api';
import { CARD, Stat, Bar, Pill, Empty, Banner, BTN2, Avatar } from '../../components/orgUi';
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

const OrgStudentDetail = () => {
    const { studentId } = useParams();
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
    const [actionError, setActionError] = useState('');
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [removing, setRemoving] = useState(false);

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
            setActionError(err.response?.data?.message || 'Could not remove that student.');
            setRemoving(false);
            setConfirmRemove(false);
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
                <Link to="/organization/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
                    <ArrowLeft size={16} />Back to students
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
            <Link to="/organization/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
                <ArrowLeft size={16} />Back to students
            </Link>

            {actionError && <Banner onClose={() => setActionError('')}>{actionError}</Banner>}

            {/* ── Who they are ─────────────────────────────────────────────── */}
            <div className={`${CARD} p-5 lg:p-6`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4 min-w-0">
                        <Avatar name={student.name} src={student.profilePicture} size="h-14 w-14 text-lg" />
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{student.name}</h1>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><Mail size={13} className="shrink-0" />{student.email}</span>
                                {student.phone && <span className="inline-flex items-center gap-1.5"><Phone size={13} />{student.phone}</span>}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                <Pill status={student.status} />
                                {student.joinedOrganizationAt && <span>Joined you {formatDate(student.joinedOrganizationAt)}</span>}
                                <span>· On the platform since {formatDate(student.accountCreatedAt)}</span>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setConfirmRemove(true)}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
                        <UserMinus size={15} />Remove from organization
                    </button>
                </div>
            </div>

            {/* ── Overview ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
                <Stat icon={TrendingUp} label="Overall progress" value={`${overview.overallPercent}%`} tone="violet" />
                <Stat icon={BookOpen} label="Courses" value={`${overview.coursesCompleted}/${overview.coursesEnrolled}`} sub="Completed of enrolled" tone="indigo" />
                <Stat icon={GraduationCap} label="Lessons done" value={overview.lessonsCompleted} tone="emerald" />
                <Stat icon={Award} label="XP" value={overview.xp} sub={`Level ${overview.level}`} tone="amber" />
            </div>

            <div className={`${CARD} grid gap-4 p-5 sm:grid-cols-3`}>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last active</p>
                    <p className="mt-1 font-semibold text-slate-800">{relativeDay(overview.lastActive)}</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Quizzes passed</p>
                    <p className="mt-1 font-semibold text-slate-800 tabular-nums">{overview.quizzesPassed}</p>
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">First enrolled</p>
                    <p className="mt-1 font-semibold text-slate-800">{formatDate(overview.enrolledAt)}</p>
                </div>
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
                <Section icon={Flame} title="Streak and badges">
                    <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current streak</p>
                            <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{rewards.currentStreak}<span className="ml-1 text-sm font-medium text-slate-500">days</span></p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Longest streak</p>
                            <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{rewards.longestStreak}<span className="ml-1 text-sm font-medium text-slate-500">days</span></p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Badges earned</p>
                            <p className="mt-1 text-2xl font-bold text-slate-800 tabular-nums">{rewards.badges}</p>
                        </div>
                    </div>
                </Section>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4" role="dialog" aria-modal="true">
                    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[calc(100dvh-1.5rem)]">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 text-center sm:p-6">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                <UserMinus size={24} className="text-amber-600" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800">Remove {student.name}?</h2>
                            <p className="mt-3 text-sm text-slate-500">
                                They stop appearing in your organization and you can no longer see their progress.
                                Their account, courses, progress, XP and certificates are untouched — nothing is deleted.
                            </p>
                            <p className="mt-2 text-sm text-slate-500">They can ask to join again with your organization ID.</p>
                        </div>
                        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                            <button onClick={() => setConfirmRemove(false)} className={BTN2} disabled={removing}>Cancel</button>
                            <button onClick={remove} disabled={removing}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                                {removing && <Loader2 size={16} className="animate-spin" />}
                                Remove student
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrgStudentDetail;
