/**
 * My classes — a teacher's home: the subjects they teach, each class's size,
 * and straight into taking attendance or entering internal marks.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Presentation, CalendarCheck, ClipboardList, Users } from 'lucide-react';
import { useCampus } from '../App';
import { useMySubjects } from './Attendance';
import { PageHead, Card, Chip, Empty, Skeleton, LoadFailed, plural } from '../ui';

export default function MyClasses() {
    const { ctx, role } = useCampus();
    const { subjects, loading, failed, reload } = useMySubjects();
    if (role === 'teacher') {
        return (
            <div className="mx-auto max-w-lg py-20 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white text-petrol-600"><Presentation size={24} /></span>
                <h1 className="font-display text-3xl font-semibold">Attendance is in your teacher dashboard</h1>
                <p className="mt-2 text-sm text-ink-2">Subject teachers take attendance from their own YATICORPX3 teacher dashboard, under <b>Attendance</b>. Your department gives you your subjects.</p>
            </div>
        );
    }
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    return (
        <>
            <PageHead eyebrow={today} title={`Hello, ${ctx.me?.name?.split(' ')[0] || ''}`} sub="Your subjects this term. Take attendance after each period; enter internal marks when an assessment is done." />
            {loading ? <Card><Skeleton rows={3} className="h-28" /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !subjects.length ? (
                <Card><Empty icon={Presentation} title="No subjects yet">Your department gives you subjects under Subjects. Once it does, they appear here.</Empty></Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {subjects.map((s) => (
                        <Card key={s._id} className="flex flex-col overflow-hidden">
                            <div className="relative border-b border-line bg-gradient-to-br from-petrol-800 to-petrol-900 p-5 text-white">
                                <span className="absolute right-4 top-4 font-mono text-xs text-brass-100/80">{s.code}</span>
                                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-brass-100/80">{s.department?.name} · Sem {s.semester}</p>
                                <h2 className="mt-1.5 pr-10 font-display text-xl font-semibold leading-snug">{s.name}</h2>
                                <p className="mt-2 flex items-center gap-1.5 text-sm text-petrol-100/80"><Users size={14} /> {plural(s.students, 'student')}{s.sections.length > 1 ? ` in ${s.sections.length} sections` : ''}</p>
                            </div>
                            <div className="flex flex-1 flex-col gap-3 p-4">
                                {s.sections.length > 1 && <div className="flex flex-wrap gap-1.5">{s.sections.map((x) => <Chip key={x.name}>Section {x.name} · {x.students}</Chip>)}</div>}
                                <div className="mt-auto grid grid-cols-2 gap-2">
                                    <Link to={`/attendance?subject=${s._id}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-petrol-700 text-sm font-semibold text-white hover:bg-petrol-800"><CalendarCheck size={16} /> Attendance</Link>
                                    <Link to={`/internal-marks?subject=${s._id}`} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-2 text-sm font-semibold text-ink hover:bg-petrol-50"><ClipboardList size={16} /> Marks</Link>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </>
    );
}
