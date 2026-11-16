/**
 * Internal marks — internal assessments (IA 1, IA 2, assignments…). The
 * department sets them up for a semester; each subject's teacher enters the
 * marks; the department publishes them, and students then see their own.
 * Semester exams are the examination board's (Exam board).
 */
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, Save, Trash2, Eye, EyeOff, Table2 } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../App';
import { useMySubjects, subjectLabel } from './Attendance';
import {
    PageHead, Card, Tabs, Button, Dialog, Field, Input, Select, Banner, Chip, Register, TH, TD, Roll, Empty, Skeleton, LoadFailed,
    useData, useToast, useConfirm, useSubmit, semestersOf
} from '../ui';

/** A marks sheet: one column of inputs, Enter moves down, "AB" for absent. */
export const MarksSheet = ({ examId, subjectId, section, onSaved }) => {
    const toast = useToast();
    const { data, loading, failed, reload } = useData('/marks/sheet', { examId, subjectId, section });
    const [vals, setVals] = useState({});
    const [saving, setSaving] = useState(false);
    const inputs = useRef([]);
    useEffect(() => {
        if (!data) return;
        setVals(Object.fromEntries(data.students.map((s) => [s._id, s.marks === undefined ? '' : s.marks === null ? 'AB' : String(s.marks)])));
    }, [data]);
    if (loading) return <Card><Skeleton rows={6} /></Card>;
    if (failed) return <Card><LoadFailed what="the marks sheet" onRetry={reload} /></Card>;
    const max = data.exam.maxMarks;
    const bad = Object.values(vals).some((v) => v !== '' && v !== 'AB' && !(Number(v) >= 0 && Number(v) <= max));
    const entered = Object.values(vals).filter((v) => v !== '').length;
    const save = async () => {
        setSaving(true);
        try {
            const marks = data.students.map((s) => ({ studentId: s._id, marks: vals[s._id] === 'AB' ? null : vals[s._id] === '' ? '' : Number(vals[s._id]) }));
            toast((await api.put(`${CAMPUS}/marks/sheet`, { examId, subjectId, section, marks })).data.message);
            reload(); onSaved?.();
        } catch (err) { toast(errorOf(err), 'error'); } finally { setSaving(false); }
    };
    if (!data.students.length) return <Card><Empty icon={ClipboardList}>No students in this class yet.</Empty></Card>;
    return (
        <>
            <Register min="min-w-[520px]">
                <thead><tr><TH className="w-24">Roll</TH><TH>Student</TH><TH className="w-48 text-right">Marks / {max}</TH><TH className="w-24 text-center">Absent</TH></tr></thead>
                <tbody>
                    {data.students.map((s, i) => {
                        const v = vals[s._id] ?? '';
                        const wrong = v !== '' && v !== 'AB' && !(Number(v) >= 0 && Number(v) <= max);
                        return (
                            <tr key={s._id} className={v === 'AB' ? 'bg-rose-50/40' : ''}>
                                <TD><Roll value={s.rollNo} /></TD>
                                <TD className="font-medium">{s.name}</TD>
                                <TD className="text-right">
                                    <input ref={(el) => { inputs.current[i] = el; }} inputMode="decimal" aria-label={`Marks for ${s.name}`} value={v === 'AB' ? '' : v} disabled={v === 'AB'} placeholder={v === 'AB' ? 'AB' : '—'}
                                        onChange={(e) => setVals({ ...vals, [s._id]: e.target.value.replace(/[^\d.]/g, '') })}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); inputs.current[i + 1]?.focus(); } }}
                                        className={`h-10 w-28 rounded-lg border bg-white px-3 text-right font-mono text-sm focus:outline-none focus:ring-4 ${wrong ? 'border-rose-400 focus:ring-rose-100' : 'border-line-2 focus:border-petrol-500 focus:ring-petrol-100'} disabled:bg-rose-50`} />
                                </TD>
                                <TD className="text-center"><input type="checkbox" className="h-4 w-4 accent-rose-600" aria-label={`${s.name} absent`} checked={v === 'AB'} onChange={(e) => setVals({ ...vals, [s._id]: e.target.checked ? 'AB' : '' })} /></TD>
                            </tr>
                        );
                    })}
                </tbody>
            </Register>
            <div className="sticky bottom-24 z-20 mt-4 lg:bottom-6">
                <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-lg">
                    <p className="text-sm text-ink-2"><b className="text-ink">{entered}</b> of {data.students.length} entered{bad && <span className="ml-2 font-semibold text-rose-700">Some marks are above {max}.</span>}{data.exam.published && <span className="ml-2"><Chip tone="green">Published — students see changes</Chip></span>}</p>
                    <Button icon={Save} busy={saving} disabled={bad} onClick={save}>Save marks</Button>
                </Card>
            </div>
        </>
    );
};

/** Every student × subject of an exam, read-only (internal assessments; the board has its own editable grid). */
const ResultsDialog = ({ exam, onClose }) => {
    const { data, loading } = useData(`/exams/${exam._id}/results`);
    return (
        <Dialog size="max-w-5xl" title={exam.name} sub={`Semester ${exam.semester} · out of ${exam.maxMarks}`} onClose={onClose}>
            {loading || !data ? <Skeleton rows={5} /> : !data.students.length ? <p className="text-sm text-ink-3">No students.</p> : (
                <div className="overflow-x-auto rounded-xl border border-line">
                    <table className="w-full min-w-[600px] text-sm tabular-nums">
                        <thead><tr><TH>Roll</TH><TH>Student</TH>{data.subjects.map((s) => <TH key={s._id} className="text-center"><span title={s.name}>{s.code || s.name.slice(0, 12)}</span></TH>)}</tr></thead>
                        <tbody>{data.students.map((r) => (
                            <tr key={r._id}><TD><Roll value={r.rollNo} /></TD><TD className="font-medium">{r.name}</TD>
                                {r.subjects.map((x) => <TD key={x.subjectId} className={`text-center ${x.marks !== undefined && !x.passed ? 'text-rose-700' : ''}`}>{x.marks === undefined ? <span className="text-ink-3">·</span> : x.marks === null ? 'AB' : x.marks}</TD>)}</tr>
                        ))}</tbody>
                    </table>
                </div>
            )}
        </Dialog>
    );
};

const AssessmentDialog = ({ dept, onClose, onDone }) => {
    const [f, setF] = useState({ name: 'Internal Assessment 1', semester: 1, maxMarks: 30, passMarks: 12 });
    const { busy, error, run } = useSubmit();
    return (
        <Dialog title="New internal assessment" sub={dept.name} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="ia-form" busy={busy}>Create</Button></>}>
            <form id="ia-form" onSubmit={(e) => { e.preventDefault(); run(async () => onDone((await api.post(`${CAMPUS}/exams`, { ...f, kind: 'internal', departmentId: dept._id })).data.message)); }} className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></Field>
                <Field label="Semester"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                <div />
                <Field label="Maximum marks"><Input type="number" min={1} value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} /></Field>
                <Field label="Pass marks"><Input type="number" min={0} value={f.passMarks} onChange={(e) => setF({ ...f, passMarks: e.target.value })} /></Field>
                <p className="text-xs text-ink-3 sm:col-span-2">It covers every subject of the semester. Each subject’s teacher enters their marks.</p>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

const Assessments = () => {
    const { dept } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const { data, loading, failed, reload } = useData('/exams', { departmentId: dept._id, kind: 'internal' });
    const [adding, setAdding] = useState(false);
    const [viewing, setViewing] = useState(null);
    const exams = data?.exams || [];
    const publish = async (e, on) => {
        if (on && !await confirm({ title: `Publish ${e.name}?`, body: 'Each student will see their own marks in their Institution dashboard.', action: 'Publish' })) return;
        try { toast((await api.put(`${CAMPUS}/exams/${e._id}`, { published: on })).data.message); reload(); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const remove = async (e) => {
        if (!await confirm({ title: `Delete ${e.name}?`, body: 'All marks entered for it are deleted too.', action: 'Delete', danger: true })) return;
        try { toast((await api.delete(`${CAMPUS}/exams/${e._id}`)).data.message); reload(); } catch (err) { toast(errorOf(err), 'error'); }
    };
    return (
        <>
            <div className="mb-4 flex justify-end"><Button icon={Plus} onClick={() => setAdding(true)}>New assessment</Button></div>
            {loading ? <Card><Skeleton rows={3} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !exams.length ? (
                <Card><Empty icon={ClipboardList} title="No internal assessments yet" action={<Button icon={Plus} onClick={() => setAdding(true)}>New assessment</Button>}>Create IA 1, IA 2 or an assignment for a semester; teachers then enter marks for their subjects.</Empty></Card>
            ) : (
                <Register>
                    <thead><tr><TH>Assessment</TH><TH>Semester</TH><TH className="text-right">Max / pass</TH><TH>Status</TH><TH className="text-right">Actions</TH></tr></thead>
                    <tbody>{exams.map((e) => (
                        <tr key={e._id}>
                            <TD className="font-medium">{e.name}</TD><TD>Semester {e.semester}</TD><TD className="text-right">{e.maxMarks} / {e.passMarks}</TD>
                            <TD>{e.published ? <Chip tone="green">Published</Chip> : <Chip>Draft</Chip>}</TD>
                            <TD className="text-right"><span className="inline-flex gap-1">
                                <Button size="sm" variant="ghost" icon={Table2} onClick={() => setViewing(e)}>Marks</Button>
                                <Button size="sm" variant={e.published ? 'ghost' : 'secondary'} icon={e.published ? EyeOff : Eye} onClick={() => publish(e, !e.published)}>{e.published ? 'Unpublish' : 'Publish'}</Button>
                                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(e)} aria-label={`Delete ${e.name}`} />
                            </span></TD>
                        </tr>
                    ))}</tbody>
                </Register>
            )}
            {adding && <AssessmentDialog dept={dept} onClose={() => setAdding(false)} onDone={(m) => { setAdding(false); toast(m); reload(); }} />}
            {viewing && <ResultsDialog exam={viewing} onClose={() => setViewing(null)} />}
            {confirmDialog}
        </>
    );
};

const EnterMarks = () => {
    const { subjects, loading, failed, reload } = useMySubjects();
    const [params, setParams] = useSearchParams();
    const subjectId = params.get('subject') || subjects[0]?._id || '';
    const subject = subjects.find((s) => s._id === subjectId);
    const exams = (subject?.exams || []).filter((e) => e.kind === 'internal');
    const examId = exams.find((e) => e._id === params.get('exam'))?._id || exams[0]?._id || '';
    const sections = subject?.department?.sections || [];
    const section = sections.length > 1 ? (params.get('section') || sections[0]) : '';
    const set = (k, v) => { const p = new URLSearchParams(params); p.set(k, v); if (k === 'subject') { p.delete('exam'); p.delete('section'); } setParams(p, { replace: true }); };
    if (loading) return <Card><Skeleton rows={4} /></Card>;
    if (failed) return <Card><LoadFailed onRetry={reload} /></Card>;
    if (!subjects.length) return <Card><Empty icon={ClipboardList} title="No subjects">Subjects and their teachers are set by the department.</Empty></Card>;
    return (
        <>
            <Card className="mb-5 grid gap-4 p-4 sm:p-5 lg:grid-cols-[2fr_1.4fr_1fr]">
                <Field label="Subject"><Select value={subjectId} onChange={(e) => set('subject', e.target.value)}>{subjects.map((s) => <option key={s._id} value={s._id}>{subjectLabel(s)}</option>)}</Select></Field>
                <Field label="Assessment"><Select value={examId} onChange={(e) => set('exam', e.target.value)} disabled={!exams.length}>{exams.length ? exams.map((e) => <option key={e._id} value={e._id}>{e.name} (out of {e.maxMarks})</option>) : <option>None for this semester yet</option>}</Select></Field>
                {sections.length > 1 && <Field label="Section"><Select value={section} onChange={(e) => set('section', e.target.value)}>{sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></Field>}
            </Card>
            {examId ? <MarksSheet key={`${examId}${subjectId}${section}`} examId={examId} subjectId={subjectId} section={section} />
                : <Card><Empty icon={ClipboardList} title="No assessment yet">The department creates internal assessments for semester {subject?.semester}; they then appear here.</Empty></Card>}
        </>
    );
};

export default function Internals() {
    const { role, dept } = useCampus();
    const [params, setParams] = useSearchParams();
    const office = role === 'admin' || role === 'department';
    const tab = office && params.get('tab') === 'manage' ? 'manage' : 'enter';
    return (
        <>
            <PageHead eyebrow={role === 'teacher' ? 'My classes' : dept?.name} title="Internal marks" sub="Internal assessments for each subject. Students see their own marks once the department publishes them.">
                {office && <Tabs value={tab} onChange={(t) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }); }} options={[['enter', 'Enter marks'], ['manage', 'Assessments']]} />}
            </PageHead>
            {tab === 'manage' ? (dept ? <Assessments /> : <Card><Empty icon={ClipboardList} title="No departments yet">Add a department first.</Empty></Card>) : <EnterMarks />}
        </>
    );
}
