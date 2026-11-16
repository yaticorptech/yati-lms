/**
 * Examination board — every department's semester exams, from timetable to
 * marks card:
 *   Set-up        name, marks, fee, timetable, venue, instructions; open applications, release admit cards
 *   Applications  approve or reject each student's application (exam fee shown), print admit cards
 *   Marks entry   the whole class × every subject in one grid
 *   Marks cards   each student's statement of marks (grades, SGPA, result); print; Publish —
 *                 then each student sees only their own marks card in their profile
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Landmark, Plus, ArrowLeft, Save, Trash2, Printer, CheckCircle2, XCircle, Send, EyeOff, FileText, CalendarDays, Users, PenLine, Award } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../context';
import { admitCard, marksCard, printDocs, printLater } from '../print';
import {
    PageHead, Card, Tabs, Button, Dialog, Field, Input, Textarea, Select, Toggle, Banner, Chip, Register, TH, TD, Roll, Person, SectionSelect,
    Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, useSubmit, rupees, day, shortDay, pct, attendanceTone, semestersOf, plural
} from '../ui';

const STEPS = [['Timetable', (e) => e.schedule.length > 0], ['Applications', (e) => e.applicationsOpen || e.applications.approved > 0], ['Admit cards', (e) => e.hallTickets], ['Published', (e) => e.published]];

const NewExam = ({ departments, onClose, onDone }) => {
    const [f, setF] = useState({ departmentId: departments[0]?._id || '', semester: 1, name: '', maxMarks: 100, passMarks: 35, fee: 0, applyUntil: '' });
    const dept = departments.find((d) => d._id === f.departmentId);
    const { busy, error, run } = useSubmit();
    return (
        <Dialog title="New semester exam" onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="exam-form" busy={busy}>Create exam</Button></>}>
            <form id="exam-form" className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(async () => onDone((await api.post(`${CAMPUS}/exams`, { ...f, kind: 'semester' })).data.message)); }}>
                <Field label="Department" className="sm:col-span-2"><Select value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, semester: 1 })}>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select></Field>
                <Field label="Semester"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="End semester examination — Nov 2026" required /></Field>
                <Field label="Maximum marks (each subject)"><Input type="number" min={1} value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} /></Field>
                <Field label="Pass marks"><Input type="number" min={0} value={f.passMarks} onChange={(e) => setF({ ...f, passMarks: e.target.value })} /></Field>
                <Field label="Exam fee (₹)" hint="0 for no fee"><Input type="number" min={0} value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></Field>
                <Field label="Apply by"><Input type="date" value={f.applyUntil} onChange={(e) => setF({ ...f, applyUntil: e.target.value })} /></Field>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

/* ── Set-up ─────────────────────────────────────────────────────────────── */
const Setup = ({ exam, dept, onChanged, onDeleted }) => {
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const subjects = useData('/subjects', { departmentId: exam.departmentId });
    const semSubjects = (subjects.data?.subjects || []).filter((s) => s.semester === exam.semester);
    const [f, setF] = useState({ name: exam.name, maxMarks: exam.maxMarks, passMarks: exam.passMarks, fee: exam.fee, applyUntil: exam.applyUntil, venue: exam.venue, instructions: exam.instructions });
    const [rows, setRows] = useState({});
    useEffect(() => {
        if (!subjects.data) return;
        const by = Object.fromEntries(exam.schedule.map((x) => [x.subjectId, x]));
        setRows(Object.fromEntries(semSubjects.map((s) => [s._id, { on: !exam.schedule.length || Boolean(by[s._id]), date: by[s._id]?.date || '', start: by[s._id]?.start || '10:00', end: by[s._id]?.end || '13:00' }])));
    }, [subjects.data]); // eslint-disable-line react-hooks/exhaustive-deps
    const { busy, error, run } = useSubmit();
    const save = (extra = {}) => run(async () => {
        const schedule = semSubjects.filter((s) => rows[s._id]?.on).map((s) => ({ subjectId: s._id, ...rows[s._id] }));
        toast((await api.put(`${CAMPUS}/exams/${exam._id}`, { ...f, schedule, ...extra })).data.message);
        onChanged();
    });
    const flip = async (key, on, ask) => {
        if (ask && !await confirm(ask)) return;
        try { toast((await api.put(`${CAMPUS}/exams/${exam._id}`, { [key]: on })).data.message); onChanged(); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const remove = async () => {
        if (!await confirm({ title: `Delete ${exam.name}?`, body: 'Its timetable, applications and every mark entered are deleted. Students lose this marks card.', action: 'Delete exam', danger: true })) return;
        try { toast((await api.delete(`${CAMPUS}/exams/${exam._id}`)).data.message); onDeleted(); } catch (err) { toast(errorOf(err), 'error'); }
    };
    return (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
                <Card className="p-5">
                    <h3 className="mb-4 font-display text-lg font-semibold">Details</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
                        <Field label="Maximum marks (each subject)"><Input type="number" value={f.maxMarks} onChange={(e) => setF({ ...f, maxMarks: e.target.value })} /></Field>
                        <Field label="Pass marks"><Input type="number" value={f.passMarks} onChange={(e) => setF({ ...f, passMarks: e.target.value })} /></Field>
                        <Field label="Exam fee (₹)"><Input type="number" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} /></Field>
                        <Field label="Apply by"><Input type="date" value={f.applyUntil} onChange={(e) => setF({ ...f, applyUntil: e.target.value })} /></Field>
                        <Field label="Venue" className="sm:col-span-2"><Input value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} placeholder="Main block, halls 1–4" /></Field>
                        <Field label="Instructions on the admit card" className="sm:col-span-2"><Textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="Report 30 minutes early. Carry this admit card and your AI card…" /></Field>
                    </div>
                </Card>
                <Card className="overflow-hidden">
                    <div className="border-b border-line px-5 py-4"><h3 className="font-display text-lg font-semibold">Timetable</h3><p className="text-sm text-ink-2">Semester {exam.semester} subjects of {dept?.name}. Untick a subject not in this exam.</p></div>
                    {subjects.loading ? <Skeleton rows={3} /> : !semSubjects.length ? <p className="p-5 text-sm text-ink-3">This semester has no subjects yet — the department adds them under Subjects.</p> : (
                        <ul className="divide-y divide-line">{semSubjects.map((s) => {
                            const r = rows[s._id] || {};
                            const set = (k, v) => setRows({ ...rows, [s._id]: { ...r, [k]: v } });
                            return (
                                <li key={s._id} className={`grid gap-3 px-5 py-3 sm:grid-cols-[auto_1fr_150px_110px_110px] sm:items-center ${r.on ? '' : 'opacity-50'}`}>
                                    <input type="checkbox" className="h-4 w-4 accent-petrol-600" checked={Boolean(r.on)} onChange={(e) => set('on', e.target.checked)} aria-label={`Include ${s.name}`} />
                                    <span className="text-sm"><span className="font-mono text-xs text-brass-700">{s.code}</span> {s.name}</span>
                                    <Input type="date" value={r.date || ''} disabled={!r.on} onChange={(e) => set('date', e.target.value)} aria-label="Date" />
                                    <Input type="time" value={r.start || ''} disabled={!r.on} onChange={(e) => set('start', e.target.value)} aria-label="Starts" />
                                    <Input type="time" value={r.end || ''} disabled={!r.on} onChange={(e) => set('end', e.target.value)} aria-label="Ends" />
                                </li>
                            );
                        })}</ul>
                    )}
                </Card>
                {error && <Banner>{error}</Banner>}
                <div className="flex justify-between gap-2"><Button variant="danger" icon={Trash2} onClick={remove}>Delete exam</Button><Button icon={Save} busy={busy} onClick={() => save()}>Save set-up</Button></div>
            </div>
            <div className="space-y-3">
                <Toggle label="Applications open" hint="Students of the semester apply from their Institution dashboard." checked={exam.applicationsOpen} onChange={(v) => flip('applicationsOpen', v)} />
                <Toggle label="Admit cards released" hint="Approved students can download theirs." checked={exam.hallTickets} onChange={(v) => flip('hallTickets', v, v && !exam.schedule.length ? { title: 'Release without a timetable?', body: 'The admit cards will say the timetable is still to be announced. Save the timetable first if you have it.', action: 'Release anyway' } : null)} />
                <Card className="p-4 text-sm text-ink-2">
                    <p className="font-semibold text-ink">How it runs</p>
                    <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                        <li>Save the timetable, then open applications.</li><li>Approve applications (after the exam fee, if any).</li>
                        <li>Release admit cards.</li><li>Enter marks, check the marks cards, and publish.</li>
                    </ol>
                </Card>
            </div>
            {confirmDialog}
        </div>
    );
};

/* ── Applications ───────────────────────────────────────────────────────── */
const Applications = ({ exam, dept, onChanged }) => {
    const toast = useToast();
    const [section, setSection] = useState('');
    const { data, loading, failed, reload } = useData(`/exams/${exam._id}/applications`, { section });
    const [picked, setPicked] = useState(new Set());
    const rows = data?.students || [];
    const decide = async (ids, status) => {
        try {
            const res = ids.length === 1 ? await api.put(`${CAMPUS}/exams/${exam._id}/applications/${ids[0]}`, { status }) : await api.post(`${CAMPUS}/exams/${exam._id}/applications/bulk`, { studentIds: ids, status });
            toast(res.data.message); setPicked(new Set()); reload(); onChanged();
        } catch (err) { toast(errorOf(err), 'error'); }
    };
    const print = async (ids) => {
        const done = printLater();
        try {
            const tickets = await Promise.all(ids.map((id) => api.get(`${CAMPUS}/exams/${exam._id}/hall-ticket/${id}`).then((r) => r.data)));
            done(`Admit cards — ${exam.name}`, tickets.map(admitCard));
        } catch (err) { done.fail(); toast(errorOf(err), 'error'); }
    };
    const approved = rows.filter((r) => r.application?.status === 'approved').map((r) => r._id);
    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <SectionSelect dept={dept} value={section} onChange={setSection} className="w-40" />
                {data && <p className="text-sm text-ink-2">{plural(rows.filter((r) => r.application).length, 'application')} · {approved.length} approved</p>}
                <div className="ml-auto flex flex-wrap gap-2">
                    {picked.size > 0 && <><Button size="sm" variant="secondary" icon={CheckCircle2} onClick={() => decide([...picked], 'approved')}>Approve {picked.size}</Button><Button size="sm" variant="danger" icon={XCircle} onClick={() => decide([...picked], 'rejected')}>Reject {picked.size}</Button></>}
                    {approved.length > 0 && <Button size="sm" variant="secondary" icon={Printer} onClick={() => print(approved)}>Print {approved.length} admit cards</Button>}
                </div>
            </div>
            {loading ? <Card><Skeleton rows={5} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !rows.length ? <Card><Empty icon={Users}>No students in semester {exam.semester} yet.</Empty></Card> : (
                <Register>
                    <thead><tr><TH className="w-10"><input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-petrol-600" checked={picked.size === rows.length} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r._id)) : new Set())} /></TH><TH>Roll</TH><TH>Student</TH><TH className="text-right">Attendance</TH>{exam.fee > 0 && <TH className="text-right">Exam fee</TH>}<TH>Application</TH><TH className="text-right">Actions</TH></tr></thead>
                    <tbody>{rows.map((r) => {
                        const st = r.application?.status;
                        return (
                            <tr key={r._id}>
                                <TD><input type="checkbox" className="h-4 w-4 accent-petrol-600" aria-label={`Select ${r.name}`} checked={picked.has(r._id)} onChange={() => toggle(r._id)} /></TD>
                                <TD><Roll value={r.rollNo} /></TD><TD><Person name={r.name} sub={r.section ? `Section ${r.section}` : undefined} src={r.picture} /></TD>
                                <TD className={`text-right font-semibold ${attendanceTone(r.attendance)}`}>{pct(r.attendance)}</TD>
                                {exam.fee > 0 && <TD className="text-right">{r.feeDue ? <Chip tone="amber">{rupees(r.feeDue)} due</Chip> : r.application ? <Chip tone="green">Paid</Chip> : '—'}</TD>}
                                <TD>{st ? <Chip tone={{ approved: 'green', rejected: 'red', applied: 'amber' }[st]}>{{ approved: 'Approved', rejected: 'Rejected', applied: 'Waiting' }[st]}</Chip> : <span className="text-xs text-ink-3">Not applied</span>}</TD>
                                <TD className="text-right"><span className="inline-flex gap-1">
                                    {st !== 'approved' && <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => decide([r._id], 'approved')}>Approve</Button>}
                                    {st && st !== 'rejected' && <Button size="sm" variant="ghost" icon={XCircle} onClick={() => decide([r._id], 'rejected')} aria-label="Reject" />}
                                    {st === 'approved' && <Button size="sm" variant="ghost" icon={Printer} onClick={() => print([r._id])} aria-label="Print admit card" />}
                                </span></TD>
                            </tr>
                        );
                    })}</tbody>
                </Register>
            )}
        </>
    );
};

/* ── Marks entry: the class × every subject ─────────────────────────────── */
const MarksEntry = ({ exam, dept, onChanged }) => {
    const toast = useToast();
    const [section, setSection] = useState('');
    const { data, loading, failed, reload } = useData(`/exams/${exam._id}/results`, { section });
    const [vals, setVals] = useState({});     // `${student}:${subject}` → '' | 'AB' | number text
    const [dirty, setDirty] = useState(new Set());
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!data) return;
        const v = {};
        for (const s of data.students) for (const x of s.subjects) v[`${s._id}:${x.subjectId}`] = x.marks === undefined ? '' : x.marks === null ? 'AB' : String(x.marks);
        setVals(v); setDirty(new Set());
    }, [data]);
    const max = exam.maxMarks;
    const okVal = (v) => v === '' || v === 'AB' || (Number(v) >= 0 && Number(v) <= max);
    const set = (k, v) => { setVals((o) => ({ ...o, [k]: v })); setDirty((d) => new Set(d).add(k)); };
    const bad = [...dirty].some((k) => !okVal(vals[k]));
    const save = async () => {
        setSaving(true);
        try {
            const bySubject = {};
            for (const k of dirty) { const [st, sub] = k.split(':'); (bySubject[sub] = bySubject[sub] || []).push({ studentId: st, marks: vals[k] === 'AB' ? null : vals[k] === '' ? '' : Number(vals[k]) }); }
            for (const [subjectId, marks] of Object.entries(bySubject)) await api.put(`${CAMPUS}/marks/sheet`, { examId: exam._id, subjectId, section, marks });
            toast(`Marks saved for ${plural(Object.keys(bySubject).length, 'subject')}.`);
            reload(); onChanged();
        } catch (err) { toast(errorOf(err), 'error'); } finally { setSaving(false); }
    };
    const cols = data?.subjects || [];
    const move = (e, r, c) => {
        const go = { ArrowDown: [1, 0], Enter: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] }[e.key];
        if (!go || (['ArrowLeft', 'ArrowRight'].includes(e.key) && e.target.selectionStart !== (e.key === 'ArrowLeft' ? 0 : e.target.value.length))) return;
        e.preventDefault();
        document.getElementById(`m-${r + go[0]}-${c + go[1]}`)?.focus();
    };
    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <SectionSelect dept={dept} value={section} onChange={setSection} className="w-40" />
                <p className="text-sm text-ink-2">Out of {max} · pass {exam.passMarks}. Type <b>AB</b> for absent. Arrow keys and Enter move between cells.</p>
            </div>
            {loading ? <Card><Skeleton rows={6} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !data.students.length ? <Card><Empty icon={PenLine}>No students in semester {exam.semester}.</Empty></Card> : !cols.length ? <Card><Empty icon={PenLine}>Add subjects to the timetable first.</Empty></Card> : (
                <>
                    <Card className="overflow-hidden">
                        <div className="max-h-[65vh] overflow-auto">
                            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm tabular-nums">
                                <thead className="sticky top-0 z-10"><tr>
                                    <TH className="sticky left-0 z-20 bg-paper">Student</TH>
                                    {cols.map((s) => <TH key={s._id} className="text-center"><span className="block font-mono text-brass-700">{s.code || '—'}</span><span className="block max-w-[9rem] truncate normal-case tracking-normal" title={s.name}>{s.name}</span></TH>)}
                                    <TH className="text-right">Total</TH>
                                </tr></thead>
                                <tbody>{data.students.map((st, r) => {
                                    let total = 0;
                                    return (
                                        <tr key={st._id} className="group">
                                            <td className="sticky left-0 z-[5] border-b border-line/70 bg-white px-4 py-2 group-hover:bg-paper"><span className="flex items-center gap-2"><Roll value={st.rollNo} /><span className="max-w-[12rem] truncate font-medium">{st.name}</span></span></td>
                                            {cols.map((s, c) => {
                                                const k = `${st._id}:${s._id}`;
                                                const v = vals[k] ?? '';
                                                if (v !== '' && v !== 'AB' && okVal(v)) total += Number(v);
                                                const fail = v === 'AB' || (v !== '' && okVal(v) && Number(v) < exam.passMarks);
                                                return (
                                                    <td key={s._id} className="border-b border-line/70 px-2 py-1.5 text-center">
                                                        <input id={`m-${r}-${c}`} value={v} aria-label={`${st.name}, ${s.name}`} inputMode="decimal"
                                                            onChange={(e) => { const t = e.target.value.toUpperCase(); set(k, /^A/.test(t) ? 'AB' : t.replace(/[^\d.]/g, '')); }} onKeyDown={(e) => move(e, r, c)}
                                                            className={`h-9 w-[4.5rem] rounded-lg border text-center font-mono text-sm focus:outline-none focus:ring-4 ${!okVal(v) ? 'border-rose-400 bg-rose-50 focus:ring-rose-100' : dirty.has(k) ? 'border-brass-500 bg-brass-50 focus:ring-brass-100' : 'border-line bg-white focus:border-petrol-500 focus:ring-petrol-100'} ${fail ? 'text-rose-700' : ''}`} />
                                                    </td>
                                                );
                                            })}
                                            <td className="border-b border-line/70 px-4 text-right font-semibold">{total}</td>
                                        </tr>
                                    );
                                })}</tbody>
                            </table>
                        </div>
                    </Card>
                    <div className="sticky bottom-24 z-20 mt-4 lg:bottom-6">
                        <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-lg">
                            <p className="text-sm text-ink-2">{dirty.size ? <><b className="text-brass-700">{dirty.size}</b> unsaved change{dirty.size === 1 ? '' : 's'}</> : 'All saved'}{bad && <span className="ml-2 font-semibold text-rose-700">Marks must be 0–{max} or AB.</span>}</p>
                            <Button icon={Save} busy={saving} disabled={!dirty.size || bad} onClick={save}>Save marks</Button>
                        </Card>
                    </div>
                </>
            )}
        </>
    );
};

/* ── Marks cards and publishing ─────────────────────────────────────────── */
const MarksCards = ({ exam, dept, onChanged }) => {
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const [section, setSection] = useState('');
    const { data, loading, failed, reload } = useData(`/exams/${exam._id}/results`, { section });
    const cardOf = (s) => marksCard({ inst: data.institution, department: data.department, student: s, exam, result: s });
    const publish = async (on) => {
        const incomplete = (data?.summary.students || 0) - (data?.summary.complete || 0);
        const ok = await confirm(on
            ? { title: `Publish ${exam.name}?`, body: `Each student will see only their own marks card in their profile and Institution dashboard.${incomplete ? ` ${plural(incomplete, 'student')} still ${incomplete === 1 ? 'has' : 'have'} subjects without marks — their card will show those as pending.` : ''}`, action: 'Publish marks cards' }
            : { title: 'Unpublish?', body: 'Students will no longer see these marks cards until you publish again.', action: 'Unpublish', danger: true });
        if (!ok) return;
        try { toast((await api.put(`${CAMPUS}/exams/${exam._id}`, { published: on })).data.message); onChanged(); } catch (err) { toast(errorOf(err), 'error'); }
    };
    return (
        <>
            {exam.published
                ? <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-petrol-200 bg-petrol-50 p-4"><p className="flex items-center gap-2 text-sm text-petrol-800"><CheckCircle2 size={17} /> Published{exam.publishedAt ? ` on ${day(exam.publishedAt)}` : ''}. Each student sees their own marks card.</p><Button size="sm" variant="secondary" icon={EyeOff} onClick={() => publish(false)}>Unpublish</Button></Card>
                : <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-brass-100 bg-brass-50 p-4"><p className="text-sm text-brass-700">Not published. Check the marks cards below, then publish them to students.</p><Button variant="brass" icon={Send} onClick={() => publish(true)} disabled={!data?.summary.students}>Publish to students</Button></Card>}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <SectionSelect dept={dept} value={section} onChange={setSection} className="w-40" />
                {data && <p className="text-sm text-ink-2">{data.summary.complete} of {data.summary.students} complete · <span className="text-petrol-700">{data.summary.passed} passed</span>{data.summary.complete - data.summary.passed > 0 && <> · <span className="text-rose-700">{data.summary.complete - data.summary.passed} failed</span></>}</p>}
                {data?.students.length > 0 && <Button size="sm" variant="secondary" icon={Printer} className="ml-auto" onClick={() => printDocs(`Marks cards — ${exam.name}`, data.students.map(cardOf))}>Print all</Button>}
            </div>
            {loading ? <Card><Skeleton rows={5} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !data.students.length ? <Card><Empty icon={Award}>No students.</Empty></Card> : (
                <Register>
                    <thead><tr><TH>Roll</TH><TH>Student</TH><TH className="text-right">Total</TH><TH className="text-right">%</TH><TH className="text-right">SGPA</TH><TH>Result</TH><TH className="text-right">Marks card</TH></tr></thead>
                    <tbody>{data.students.map((s) => (
                        <tr key={s._id}>
                            <TD><Roll value={s.rollNo} /></TD><TD className="font-medium">{s.name}</TD>
                            <TD className="text-right">{s.total}/{s.max}</TD><TD className="text-right">{s.max ? Math.round((s.total / s.max) * 1000) / 10 : '—'}</TD>
                            <TD className="text-right font-display text-base font-semibold">{s.sgpa ?? '—'}</TD>
                            <TD>{!s.complete ? <Chip>Pending</Chip> : s.failed ? <Chip tone="red">{s.result}</Chip> : <Chip tone="green">Pass</Chip>}</TD>
                            <TD className="text-right"><Button size="sm" variant="ghost" icon={FileText} onClick={() => printDocs(`Marks card — ${s.name}`, [cardOf(s)])}>View</Button></TD>
                        </tr>
                    ))}</tbody>
                </Register>
            )}
            {confirmDialog}
        </>
    );
};

/* ── The page ───────────────────────────────────────────────────────────── */
const ExamDetail = ({ exam, departments, onBack, reload }) => {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'setup';
    const dept = departments.find((d) => d._id === String(exam.departmentId));
    return (
        <>
            <button onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-petrol-700 hover:underline"><ArrowLeft size={15} /> All exams</button>
            <PageHead eyebrow={`${dept?.name || ''} · Semester ${exam.semester}`} title={exam.name} sub={`Out of ${exam.maxMarks} per subject · pass ${exam.passMarks}${exam.fee ? ` · exam fee ${rupees(exam.fee)}` : ''}${exam.applyUntil ? ` · apply by ${day(exam.applyUntil)}` : ''}`}>
                {exam.published ? <Chip tone="green">Published</Chip> : <Chip tone="brass">Draft</Chip>}
            </PageHead>
            <Tabs className="mb-5" value={tab} onChange={(t) => { const p = new URLSearchParams(params); p.set('tab', t); setParams(p, { replace: true }); }}
                options={[['setup', 'Set-up'], ['applications', 'Applications', exam.applications.applied], ['marks', 'Marks entry'], ['cards', 'Marks cards']]} />
            {tab === 'setup' && <Setup key={exam._id} exam={exam} dept={dept} onChanged={reload} onDeleted={onBack} />}
            {tab === 'applications' && <Applications exam={exam} dept={dept} onChanged={reload} />}
            {tab === 'marks' && <MarksEntry exam={exam} dept={dept} onChanged={reload} />}
            {tab === 'cards' && <MarksCards exam={exam} dept={dept} onChanged={reload} />}
        </>
    );
};

export default function ExamBoard() {
    const { departments } = useCampus();
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const [deptFilter, setDeptFilter] = useState('');
    const { data, loading, failed, reload } = useData('/exams', { kind: 'semester' });
    const [adding, setAdding] = useState(false);
    const exams = useMemo(() => (data?.exams || []).filter((e) => !deptFilter || String(e.departmentId) === deptFilter), [data, deptFilter]);
    const openId = params.get('exam');
    const open = (data?.exams || []).find((e) => e._id === openId);

    if (openId && open) return <ExamDetail exam={open} departments={departments} reload={reload} onBack={() => { setParams({}, { replace: false }); reload(); }} />;

    return (
        <>
            <PageHead eyebrow="Examination board" title="Semester exams" sub="Timetables, applications, admit cards, marks and marks cards for every department. Nothing reaches students until you publish.">
                {departments.length > 1 && <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} aria-label="Department" className="w-56"><option value="">All departments</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select>}
                <Button icon={Plus} onClick={() => setAdding(true)} disabled={!departments.length}>New exam</Button>
            </PageHead>
            {loading ? <Card><Skeleton rows={4} className="h-20" /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !exams.length ? (
                <Card><Empty icon={Landmark} title="No semester exams yet" action={departments.length > 0 && <Button icon={Plus} onClick={() => setAdding(true)}>New exam</Button>}>{departments.length ? 'Create one for a department’s semester to set its timetable and take applications.' : 'The administrator adds departments first.'}</Empty></Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {exams.map((e) => {
                        const next = e.schedule.find((x) => x.date);
                        return (
                            <button key={e._id} onClick={() => setParams({ exam: e._id })} className="group text-left">
                                <Card className="flex h-full flex-col p-5 transition group-hover:-translate-y-0.5 group-hover:border-petrol-200 group-hover:shadow-md">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-brass-700">{e.department?.code || e.department?.name} · Sem {e.semester}</p>
                                        {e.published ? <Chip tone="green">Published</Chip> : e.applications.applied > 0 ? <Chip tone="amber">{e.applications.applied} waiting</Chip> : null}
                                    </div>
                                    <h3 className="mt-1.5 font-display text-lg font-semibold leading-snug">{e.name}</h3>
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-3"><CalendarDays size={13} /> {next ? `From ${shortDay(next.date)}` : 'Timetable not set'} · {plural(e.subjects.length, 'subject')}</p>
                                    {/* The exam's progress, as a row of milestones. */}
                                    <ol className="mt-5 flex items-center gap-1" aria-label="Progress">
                                        {STEPS.map(([label, done], i) => (
                                            <li key={label} className="flex flex-1 flex-col gap-1.5">
                                                <span className={`h-1 rounded-full ${done(e) ? 'bg-petrol-500' : 'bg-line'}`} />
                                                <span className={`text-[10px] font-medium ${done(e) ? 'text-petrol-700' : 'text-ink-3'}`}>{i + 1}. {label}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </Card>
                            </button>
                        );
                    })}
                </div>
            )}
            {adding && <NewExam departments={departments} onClose={() => setAdding(false)} onDone={(m) => { setAdding(false); toast(m); reload(); }} />}
        </>
    );
}
