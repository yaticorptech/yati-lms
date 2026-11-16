/**
 * Subjects — each semester's subjects, with credits (they weigh the SGPA) and
 * the teachers who take attendance and enter internal marks for them.
 * Teachers are the organization's teachers (organization panel → Teachers); each takes
 * attendance for their subjects from their own teacher dashboard.
 */
import React, { useState } from 'react';
import { BookOpen, Plus, Pencil, Trash2, Users } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../App';
import { PageHead, Card, Button, Dialog, Field, Input, Select, Banner, Chip, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, useSubmit, semestersOf, plural } from '../ui';

const SubjectDialog = ({ dept, subject, semester, teachers, onClose, onDone }) => {
    const [f, setF] = useState({ semester: subject?.semester || semester || 1, code: subject?.code || '', name: subject?.name || '', credits: subject?.credits ?? 4, kind: subject?.kind || 'theory', teacherIds: (subject?.teacherIds || []).map(String) });
    const { busy, error, run } = useSubmit();
    const toggle = (id) => setF({ ...f, teacherIds: f.teacherIds.includes(id) ? f.teacherIds.filter((x) => x !== id) : [...f.teacherIds, id] });
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = { ...f, departmentId: dept._id, credits: Number(f.credits) };
            onDone((subject ? await api.put(`${CAMPUS}/subjects/${subject._id}`, body) : await api.post(`${CAMPUS}/subjects`, body)).data.message);
        });
    };
    return (
        <Dialog title={subject ? `Edit ${subject.name}` : 'Add a subject'} sub={dept.name} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="subject-form" busy={busy}>{subject ? 'Save' : 'Add subject'}</Button></>}>
            <form id="subject-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Data Structures" required /></Field>
                <Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="CS201" /></Field>
                <Field label="Semester"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                <Field label="Credits"><Input type="number" min={0} max={20} step="0.5" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></Field>
                <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="theory">Theory</option><option value="practical">Practical / lab</option></Select></Field>
                <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">Taught by</span>
                    {teachers.length ? (
                        <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
                            {teachers.map((t) => (
                                <label key={t._id} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${f.teacherIds.includes(String(t._id)) ? 'bg-petrol-50 text-petrol-800' : 'hover:bg-porcelain'}`}>
                                    <input type="checkbox" className="h-4 w-4 accent-petrol-600" checked={f.teacherIds.includes(String(t._id))} onChange={() => toggle(String(t._id))} />
                                    <span className="min-w-0"><span className="block truncate font-medium">{t.name}</span><span className="block truncate text-xs text-ink-3">{t.email}</span></span>
                                </label>
                            ))}
                        </div>
                    ) : <p className="rounded-xl border border-dashed border-line-2 p-3 text-sm text-ink-3">No teachers yet. Add them in the organization panel under Teachers; they then appear here.</p>}
                </div>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

export default function Subjects() {
    const { dept } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const { data, loading, failed, reload } = useData('/subjects', { departmentId: dept._id });
    const [editing, setEditing] = useState(null);   // { subject?, semester? }
    const subjects = data?.subjects || [];
    const done = (m) => { setEditing(null); toast(m); reload(); };
    const remove = async (s) => {
        if (!await confirm({ title: `Remove ${s.name}?`, body: 'It leaves the timetable and exams. Attendance already taken for it stays on students’ records.', action: 'Remove subject', danger: true })) return;
        try { done((await api.delete(`${CAMPUS}/subjects/${s._id}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };

    return (
        <>
            <PageHead eyebrow={dept.name} title="Subjects" sub="The subjects of each semester and who teaches them. Each teacher takes attendance for their own subjects from their teacher dashboard.">
                <Button icon={Plus} onClick={() => setEditing({})}>Add subject</Button>
            </PageHead>
            {loading ? <Card><Skeleton rows={4} /></Card> : failed ? <Card><LoadFailed what="the subjects" onRetry={reload} /></Card> : (
                <div className="space-y-5">
                    {semestersOf(dept).map((n) => {
                        const rows = subjects.filter((s) => s.semester === n);
                        const credits = rows.reduce((t, s) => t + (s.credits || 0), 0);
                        return (
                            <Card key={n} className="overflow-hidden">
                                <div className="flex items-center justify-between gap-3 border-b border-line bg-paper px-5 py-3">
                                    <h2 className="font-display text-lg font-semibold">Semester {n} <span className="ml-1 font-sans text-xs font-normal text-ink-3">{rows.length ? `${plural(rows.length, 'subject')} · ${credits} credits` : ''}</span></h2>
                                    <Button size="sm" variant="ghost" icon={Plus} onClick={() => setEditing({ semester: n })}>Add</Button>
                                </div>
                                {rows.length ? (
                                    <ul className="divide-y divide-line">
                                        {rows.map((s) => (
                                            <li key={s._id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span className="w-16 shrink-0 font-mono text-xs font-semibold text-brass-700">{s.code || '—'}</span>
                                                    <div className="min-w-0"><p className="truncate text-sm font-medium">{s.name}</p>
                                                        <p className="flex items-center gap-1 text-xs text-ink-3"><Users size={12} /> {s.teachers.length ? s.teachers.map((t) => t.name).join(', ') : 'No teacher yet'}</p></div>
                                                </div>
                                                <div className="flex items-center gap-2 pl-[76px] sm:pl-0">
                                                    <Chip>{s.credits} cr</Chip><Chip tone={s.kind === 'practical' ? 'brass' : 'grey'}>{s.kind === 'practical' ? 'Practical' : 'Theory'}</Chip>
                                                    <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing({ subject: s })} aria-label={`Edit ${s.name}`} />
                                                    <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(s)} aria-label={`Remove ${s.name}`} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p className="px-5 py-4 text-sm text-ink-3">No subjects yet.</p>}
                            </Card>
                        );
                    })}
                    {!subjects.length && <Card><Empty icon={BookOpen} title="Build the timetable">Add each semester’s subjects, their credits and teachers.</Empty></Card>}
                </div>
            )}
            {editing && <SubjectDialog dept={dept} subject={editing.subject} semester={editing.semester} teachers={data?.teachers || []} onClose={() => setEditing(null)} onDone={done} />}
            {confirmDialog}
        </>
    );
}
