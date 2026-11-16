/**
 * Attendance — the register. Choose the subject, section, day and period; the
 * class appears as roll-number tiles, everyone present; tap the absentees and
 * save. A period already taken opens as it was saved, to correct. The report
 * shows each student's percentage, with shortages (below 75%) in red.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarCheck, Check, RotateCcw, Save, UserX } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../context';
import { PageHead, Card, Tabs, Button, Field, Input, Select, SemesterSelect, SectionSelect, Register, TH, TD, Roll, Meter, Avatar, Empty, Skeleton, LoadFailed, useData, useToast, pct, attendanceTone, plural } from '../ui';

const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

/** The subjects this sign-in can take attendance for, in the department being worked in (teachers: all theirs). */
export const useMySubjects = () => {
    const { role, dept } = useCampus();
    const { data, loading, failed, reload } = useData('/teach');
    const subjects = useMemo(() => (data?.subjects || []).filter((s) => role === 'teacher' || String(s.departmentId) === String(dept?._id)), [data, role, dept]);
    return { subjects, loading, failed, reload };
};
export const subjectLabel = (s) => `${s.code ? `${s.code} · ` : ''}${s.name} — ${s.department?.code || s.department?.name || ''} Sem ${s.semester}`;

const TakeAttendance = ({ subjects, today }) => {
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const subjectId = params.get('subject') || subjects[0]?._id || '';
    const subject = subjects.find((s) => s._id === subjectId);
    const sections = subject?.department?.sections || [];
    const section = sections.length > 1 ? (params.get('section') || sections[0]) : '';
    const date = params.get('date') || today;
    const period = Number(params.get('period')) || 1;
    const set = (k, v) => { const p = new URLSearchParams(params); p.set(k, v); setParams(p, { replace: true }); };

    const session = useData(subject ? '/attendance/session' : null, { subjectId, date, period, section });
    const [absent, setAbsent] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    useEffect(() => {
        if (!session.data) return;
        setAbsent(new Set(session.data.students.filter((s) => s.status === 'absent').map((s) => s._id)));
        setDirty(false);
    }, [session.data]);
    const students = session.data?.students || [];
    const toggle = (id) => { setDirty(true); setAbsent((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
    const save = async () => {
        setSaving(true);
        try { toast((await api.put(`${CAMPUS}/attendance/session`, { subjectId, date, period, section, absent: [...absent] })).data.message); setDirty(false); session.reload(); }
        catch (err) { toast(errorOf(err), 'error'); }
        finally { setSaving(false); }
    };

    if (!subjects.length) return <Card><Empty icon={CalendarCheck} title="No subjects to take attendance for">Subjects, and who teaches them, are set by the department under Subjects.</Empty></Card>;
    const taken = session.data?.taken;
    const marked = session.data?.markedPeriods || [];

    return (
        <>
            <Card className="mb-5 grid gap-4 p-4 sm:p-5 lg:grid-cols-[2fr_1fr_1fr]">
                <Field label="Subject"><Select value={subjectId} onChange={(e) => { const p = new URLSearchParams(params); p.set('subject', e.target.value); p.delete('section'); setParams(p, { replace: true }); }}>{subjects.map((s) => <option key={s._id} value={s._id}>{subjectLabel(s)}</option>)}</Select></Field>
                {sections.length > 1 ? <Field label="Section"><Select value={section} onChange={(e) => set('section', e.target.value)}>{sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></Field> : <div className="hidden lg:block" />}
                <Field label="Date"><Input type="date" value={date} max={today} onChange={(e) => e.target.value && set('date', e.target.value)} /></Field>
                <div className="lg:col-span-3">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">Period</span>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Period">
                        {PERIODS.map((p) => (
                            <button key={p} role="radio" aria-checked={p === period} onClick={() => set('period', p)}
                                className={`relative h-10 min-w-12 rounded-xl border px-3 text-sm font-semibold transition ${p === period ? 'border-petrol-700 bg-petrol-700 text-white' : 'border-line-2 bg-white text-ink-2 hover:border-petrol-200'}`}>
                                {p}{marked.includes(p) && <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full ${p === period ? 'bg-brass-500' : 'bg-petrol-500'} text-white`} title="Taken"><Check size={10} strokeWidth={3} /></span>}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {session.loading ? <Card><Skeleton rows={3} className="h-20" /></Card> : session.failed ? <Card><LoadFailed what="the class" onRetry={session.reload} /></Card> : !students.length ? (
                <Card><Empty icon={CalendarCheck} title="No students in this class">Students appear once they are admitted to semester {subject.semester}{section ? `, section ${section}` : ''}.</Empty></Card>
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink-2">
                            {taken ? <span className="mr-2 rounded-full bg-petrol-50 px-2 py-0.5 text-xs font-semibold text-petrol-700">Taken — editing</span> : <span className="mr-2 rounded-full bg-brass-50 px-2 py-0.5 text-xs font-semibold text-brass-700">New</span>}
                            Tap a student to mark them absent.
                        </p>
                        <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setAbsent(new Set()); setDirty(true); }}>All present</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                        {students.map((s) => {
                            const out = absent.has(s._id);
                            return (
                                <button key={s._id} onClick={() => toggle(s._id)} aria-pressed={out} aria-label={`${s.name}, ${out ? 'absent' : 'present'}`}
                                    className={`group relative flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition active:scale-[.98] ${out ? 'border-rose-300 bg-rose-50' : 'border-line bg-white hover:border-petrol-200'}`}>
                                    <Avatar name={s.name} src={s.picture} />
                                    <span className="min-w-0 flex-1">
                                        <span className={`block font-mono text-[11px] font-semibold ${out ? 'text-rose-700' : 'text-brass-700'}`}>{s.rollNo || '—'}</span>
                                        <span className={`block truncate text-[13px] font-medium ${out ? 'text-rose-900 line-through decoration-rose-300' : 'text-ink'}`}>{s.name}</span>
                                    </span>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${out ? 'bg-rose-600 text-white' : 'bg-petrol-50 text-petrol-700'}`}>{out ? 'A' : 'P'}</span>
                                </button>
                            );
                        })}
                    </div>
                    {/* The tally and Save stay in reach while scrolling a long class. */}
                    <div className="sticky bottom-24 z-20 mt-5 lg:bottom-6">
                        <Card className="flex flex-wrap items-center justify-between gap-3 border-petrol-200 px-4 py-3 shadow-lg">
                            <p className="flex items-center gap-4 text-sm">
                                <span><b className="font-display text-lg text-petrol-700">{students.length - absent.size}</b> present</span>
                                <span className="flex items-center gap-1"><UserX size={15} className="text-rose-600" /><b className="font-display text-lg text-rose-700">{absent.size}</b> absent</span>
                                <span className="hidden text-ink-3 sm:inline">· {subject.name}, period {period}, {date === today ? 'today' : date}</span>
                            </p>
                            <Button icon={Save} busy={saving} onClick={save} disabled={!dirty && taken}>{taken ? 'Save changes' : 'Save attendance'}</Button>
                        </Card>
                    </div>
                </>
            )}
        </>
    );
};

const Report = ({ subjects }) => {
    const { role, dept } = useCampus();
    const office = role !== 'teacher';
    const [mode, setMode] = useState(office ? 'semester' : 'subject');
    const [subjectId, setSubjectId] = useState(subjects[0]?._id || '');
    const [semester, setSemester] = useState(1);
    const [section, setSection] = useState('');
    const subject = subjects.find((s) => s._id === subjectId);
    const sectDept = mode === 'subject' ? subject?.department : dept;
    const { data, loading, failed, reload } = useData(mode === 'subject' ? (subjectId ? '/attendance/report' : null) : '/attendance/report',
        mode === 'subject' ? { subjectId, section } : { departmentId: dept?._id, semester, section });
    const rows = data?.students || [];
    const short = rows.filter((r) => r.percent !== null && r.percent < 75).length;

    return (
        <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {office && <Tabs value={mode} onChange={(m) => { setMode(m); setSection(''); }} options={[['semester', 'Whole semester'], ['subject', 'One subject']]} />}
                {mode === 'subject' ? <Select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setSection(''); }} className="sm:w-96" aria-label="Subject">{subjects.map((s) => <option key={s._id} value={s._id}>{subjectLabel(s)}</option>)}</Select>
                    : <SemesterSelect dept={dept} value={semester} onChange={setSemester} className="sm:w-44" />}
                <SectionSelect dept={sectDept} value={section} onChange={setSection} className="sm:w-40" />
                {rows.length > 0 && <p className="text-sm text-ink-2 sm:ml-auto">{short ? <span className="font-semibold text-rose-700">{plural(short, 'student')} below 75%</span> : 'No shortages'}</p>}
            </div>
            {loading ? <Card><Skeleton rows={5} /></Card> : failed ? <Card><LoadFailed what="the report" onRetry={reload} /></Card> : !rows.length ? <Card><Empty icon={CalendarCheck}>No students in this class yet.</Empty></Card> : (
                <Register min={mode === 'semester' ? 'min-w-[820px]' : undefined}>
                    <thead><tr><TH>Roll</TH><TH>Student</TH>
                        {mode === 'semester' && (data.subjects || []).map((s) => <TH key={s._id} className="text-center" ><span title={s.name}>{s.code || s.name.slice(0, 10)}</span></TH>)}
                        <TH className="text-right">Classes</TH><TH className="w-56">Overall</TH></tr></thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r._id}>
                                <TD><Roll value={r.rollNo} /></TD>
                                <TD className="font-medium">{r.name}</TD>
                                {mode === 'semester' && data.subjects.map((s) => { const x = r.bySubject?.[s._id]; return <TD key={s._id} className={`text-center ${attendanceTone(x?.percent)}`}>{x ? `${Math.round(x.percent)}%` : '—'}</TD>; })}
                                <TD className="text-right text-ink-2">{r.present}/{r.held}</TD>
                                <TD><span className="flex items-center gap-3"><Meter value={r.percent} /><span className={`w-14 text-right font-semibold ${attendanceTone(r.percent)}`}>{pct(r.percent)}</span></span></TD>
                            </tr>
                        ))}
                    </tbody>
                </Register>
            )}
        </>
    );
};

export default function Attendance() {
    const { ctx, dept, role } = useCampus();
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'report' ? 'report' : 'take';
    const { subjects, loading, failed, reload } = useMySubjects();
    return (
        <>
            <PageHead eyebrow={role === 'teacher' ? 'My classes' : dept?.name} title="Attendance" sub="Take attendance period by period. Students see their own percentage in their Institution dashboard.">
                <Tabs value={tab} onChange={(t) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }); }} options={[['take', 'Take attendance'], ['report', 'Report']]} />
            </PageHead>
            {loading ? <Card><Skeleton rows={4} /></Card> : failed ? <Card><LoadFailed what="your subjects" onRetry={reload} /></Card>
                : tab === 'take' ? <TakeAttendance subjects={subjects} today={ctx.today} /> : <Report subjects={subjects} />}
        </>
    );
}
