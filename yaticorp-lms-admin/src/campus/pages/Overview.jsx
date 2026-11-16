/**
 * Overview — a department at a glance: who is studying where, attendance this
 * month and who is short of it, fees collected and outstanding, exams coming
 * up and applications waiting.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarCheck, Wallet, Landmark, ArrowRight, AlertTriangle, MessageSquareText, Receipt } from 'lucide-react';
import { useCampus } from '../context';
import { PageHead, Card, Figure, Soon, SOON, Skeleton, LoadFailed, Chip, Meter, Roll, rupees, pct, day, shortDay, attendanceTone, useData, plural } from '../ui';

export default function Overview() {
    const { dept, ctx } = useCampus();
    const { data, loading, failed, reload } = useData('/overview', { departmentId: dept._id });
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (loading) return <><PageHead eyebrow={dept.name} title={`${greeting}, ${ctx.me?.name?.split(' ')[0] || ''}`} /><Card><Skeleton rows={5} className="h-16" /></Card></>;
    if (failed) return <Card><LoadFailed what="the overview" onRetry={reload} /></Card>;
    const sems = Object.entries(data.bySemester || {}).sort(([a], [b]) => a - b);
    const maxSem = Math.max(1, ...sems.map(([, n]) => n));

    return (
        <>
            <PageHead eyebrow={`${dept.name}${dept.head ? ` · HOD ${dept.head}` : ''}`} title={`${greeting}, ${ctx.me?.name?.split(' ')[0] || ''}`} sub={`${plural(data.students, 'student')} studying across ${plural(dept.semesters, 'semester')}, ${plural(data.subjects, 'subject')} on the timetable.`} />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Figure label="Students" value={data.students} icon={Users} sub="currently studying" />
                <Figure label="Attendance · 30 days" value={pct(data.attendance30)} icon={CalendarCheck} tone={attendanceTone(data.attendance30)} sub={data.lowAttendanceCount ? `${data.lowAttendanceCount} below 75%` : 'no shortages'} />
                {SOON.has('fees') ? <>
                    <Soon><Figure label="Fees collected" value="₹ —" icon={Wallet} sub="all receipts" /></Soon>
                    <Soon><Figure label="Outstanding" value="₹ —" icon={Receipt} sub="still to be paid" /></Soon>
                </> : <>
                    <Figure label="Fees collected" value={rupees(data.fees.collected)} icon={Wallet} sub="all receipts" />
                    <Figure label="Outstanding" value={rupees(data.fees.outstanding)} icon={Receipt} tone={data.fees.outstanding ? 'text-amber-700' : 'text-petrol-700'} sub="still to be paid" />
                </>}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                <Card className="p-6">
                    <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Students by semester</h2><Link to="/organization/campus/admissions" className="inline-flex items-center gap-1 text-sm font-medium text-petrol-700 hover:underline">Admissions <ArrowRight size={14} /></Link></div>
                    {sems.length ? (
                        <div className="mt-6 flex h-44 items-end gap-3">
                            {Array.from({ length: dept.semesters }, (_, i) => i + 1).map((s) => {
                                const n = data.bySemester[s] || 0;
                                return (
                                    <div key={s} className="flex flex-1 flex-col items-center gap-2">
                                        <span className="text-xs font-semibold tabular-nums text-ink-2">{n}</span>
                                        <div className="relative w-full max-w-14 overflow-hidden rounded-t-lg bg-petrol-50" style={{ height: '120px' }}>
                                            <div className="absolute inset-x-0 bottom-0 rounded-t-lg bg-gradient-to-t from-petrol-700 to-petrol-500 transition-[height] duration-700" style={{ height: `${(n / maxSem) * 100}%` }} />
                                        </div>
                                        <span className="text-[11px] font-medium text-ink-3">Sem {s}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : <p className="mt-6 text-sm text-ink-3">No students admitted yet. <Link to="/organization/campus/admissions" className="font-medium text-petrol-700 hover:underline">Admit the first one</Link>.</p>}
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold">Attendance shortage</h2><Link to="/organization/campus/attendance?tab=report" className="inline-flex items-center gap-1 text-sm font-medium text-petrol-700 hover:underline">Report <ArrowRight size={14} /></Link></div>
                    {data.lowAttendance.length ? (
                        <ul className="mt-4 space-y-3">
                            {data.lowAttendance.map((s) => (
                                <li key={s._id} className="flex items-center gap-3">
                                    <Roll value={s.rollNo} /><span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                                    <span className="w-24"><Meter value={s.percent} /></span><span className={`w-12 text-right text-sm font-semibold tabular-nums ${attendanceTone(s.percent)}`}>{s.percent}%</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="mt-4 flex items-center gap-2 text-sm text-ink-3"><CalendarCheck size={16} className="text-petrol-500" /> Everyone with classes this month is at 75% or above.</p>}
                </Card>
            </div>

            {SOON.has('board') && SOON.has('fees') ? (
                <Soon className="mt-5">
                    <div className="grid gap-5 lg:grid-cols-3">
                        <Card className="p-6 lg:col-span-2"><h2 className="font-display text-lg font-semibold">Exams</h2><p className="mt-3 text-sm text-ink-3">Exam timetables, applications and marks cards.</p></Card>
                        <Card className="p-6"><h2 className="font-display text-lg font-semibold">Latest receipts</h2><p className="mt-3 text-sm text-ink-3">Fees received at the office.</p></Card>
                    </div>
                </Soon>
            ) : (
                <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <Card className="p-6 lg:col-span-2">
                    <h2 className="font-display text-lg font-semibold">Exams</h2>
                    {data.pendingApplications > 0 && <p className="mt-3 flex items-center gap-2 rounded-xl bg-brass-50 px-3 py-2 text-sm text-brass-700"><AlertTriangle size={15} /> {plural(data.pendingApplications, 'exam application')} waiting for the examination board.</p>}
                    {data.upcomingExams.length ? (
                        <ul className="mt-3 divide-y divide-line">
                            {data.upcomingExams.map((e) => {
                                const next = e.schedule.find((x) => x.date >= ctx.today);
                                return (
                                    <li key={e._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                        <span><span className="block text-sm font-medium">{e.name}</span><span className="text-xs text-ink-3">Semester {e.semester}{next ? ` · next paper ${shortDay(next.date)}: ${next.subject}` : ''}</span></span>
                                        <span className="flex gap-1.5">{e.applicationsOpen && <Chip tone="brass">Applications open</Chip>}{e.hallTickets && <Chip tone="green">Admit cards out</Chip>}<Chip>{e.kind === 'semester' ? 'Semester' : 'Internal'}</Chip></span>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : <p className="mt-3 text-sm text-ink-3">No exams coming up.</p>}
                </Card>
                <Card className="p-6">
                    <h2 className="font-display text-lg font-semibold">Latest receipts</h2>
                    {data.recentPayments.length ? (
                        <ul className="mt-3 space-y-3">
                            {data.recentPayments.map((p) => (
                                <li key={p._id} className="flex items-start justify-between gap-3 text-sm">
                                    <span className="min-w-0"><span className="block truncate font-medium">{p.student}</span><span className="block truncate text-xs text-ink-3">{p.title} · {day(p.at)}</span></span>
                                    <span className="font-semibold tabular-nums">{rupees(p.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="mt-3 text-sm text-ink-3">No fees received yet.</p>}
                    {data.openFeedback > 0 && <Link to="/organization/campus/feedback" className="mt-5 flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-petrol-700 hover:bg-petrol-50"><MessageSquareText size={16} /> {plural(data.openFeedback, 'feedback form')} open</Link>}
                </Card>
            </div>
            )}
            {!SOON.has('board') && <p className="mt-6 flex items-center gap-1.5 text-xs text-ink-3"><Landmark size={13} /> Semester exams, marks and marks cards are handled by the examination board.</p>}
        </>
    );
}
