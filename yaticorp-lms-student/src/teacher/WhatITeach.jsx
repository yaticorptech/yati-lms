/**
 * What I teach (2026-10-30; in the teacher's profile since 2026-10-31, off
 * the 360 Dashboard): each class a teacher with 360 marks — a course, one of
 * its sections and the subject — picked from the lists their organization
 * keeps (organization panel → Teachers → Courses & sections). The
 * organization sees them on its Teachers page. Server: src/three60
 * (GET /api/teacher/360, POST/DELETE /api/teacher/360/classes).
 */
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus, X, Loader2 } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Card, CardTitle, Loading, ErrorNote, OkNote } from './ui';
import { btn, inputClass, selectClass } from './kit';
import useConfirmDialog from '../components/useConfirmDialog';
import Select from '../components/Select';

/** One line to mark a class: the course, then one of its sections, then the subject. */
const AddClassForm = ({ courses, onDone }) => {
    const [programId, setProgramId] = useState(courses.length === 1 ? String(courses[0]._id) : '');
    const [sectionId, setSectionId] = useState('');
    const [subject, setSubject] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const course = courses.find((c) => String(c._id) === programId);
    const submit = async (e) => {
        e.preventDefault();
        if (!programId) return setError('Choose the course.');
        if (!sectionId) return setError('Choose the section.');
        if (!subject.trim()) return setError('Enter the subject you teach.');
        setBusy(true); setError('');
        try {
            const r = await teacherApi.post('/360/classes', { programId, sectionId, subject });
            onDone(r.data, `${course?.name} · ${course?.sections.find((x) => String(x._id) === sectionId)?.name} · ${subject.trim()} added.`);
            setSubject(''); setSectionId('');
        } catch (err) { setError(messageOf(err, 'The class could not be added.')); }
        finally { setBusy(false); }
    };
    return (
        <form onSubmit={submit} className="mt-3 space-y-2 border-t border-slate-100 pt-3" aria-label="Add a class">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                {/* Drawn by the page, white, not the system's grey menu (components/Select). */}
                <Select tone="emerald" aria-label="Course" title="Course" placeholder="Course" className={selectClass} value={programId} onChange={(e) => { setProgramId(e.target.value); setSectionId(''); setError(''); }}>
                    {courses.map((c) => <option key={c._id} value={String(c._id)}>{c.name}</option>)}
                </Select>
                <Select tone="emerald" aria-label="Section" title="Section" placeholder={course ? 'Section' : 'Section (choose the course first)'} className={selectClass} value={sectionId} onChange={(e) => { setSectionId(e.target.value); setError(''); }} disabled={!course}>
                    {(course?.sections || []).map((x) => <option key={x._id} value={String(x._id)}>{x.name}</option>)}
                </Select>
                <input aria-label="Subject" className={inputClass} value={subject} onChange={(e) => { setSubject(e.target.value); setError(''); }} maxLength={80} placeholder="Subject you teach" required />
                <button type="submit" disabled={busy} className={btn.primary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add</button>
            </div>
            <ErrorNote>{error}</ErrorNote>
        </form>
    );
};

export default function WhatITeach() {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState('');
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = useCallback(() => teacherApi.get('/360')
        .then((r) => { setData(r.data); setError(''); })
        .catch((err) => setError(messageOf(err, 'What you teach could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);
    const done = (next, message) => { setData(next); setNote(message || ''); };

    const removeClass = async (c) => {
        if (!(await confirm({ title: `Remove ${c.course} ${c.section} · ${c.subject}?`, message: 'It comes off your list.', confirmLabel: 'Remove', destructive: true }))) return;
        setBusy(c._id); setNote('');
        try { done((await teacherApi.delete(`/360/classes/${c._id}`)).data, 'Class removed.'); }
        catch (err) { setError(messageOf(err, 'The class could not be removed.')); }
        finally { setBusy(''); }
    };

    const classes = data?.classes || [];
    const courses = data?.courses || [];
    const xBtn = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50';
    return (
        <Card>
            <CardTitle icon={BookOpen} color="teal">What I teach</CardTitle>
            {/* Room under a notice, so it never sits on the help line below. */}
            <div className="mb-3 space-y-2 empty:hidden">
                <ErrorNote onRetry={!data ? load : undefined}>{error}</ErrorNote>
                <OkNote>{note}</OkNote>
            </div>
            {!data ? (!error && <Loading label="Loading…" />) : !data.organization ? (
                <p className="text-sm text-slate-500">Once your college or school adds you, you mark the classes you teach here.</p>
            ) : courses.length === 0 ? (
                <p className="text-sm text-slate-500">Your organization has not listed its courses yet. Once it does, you pick yours here.</p>
            ) : (
                <>
                    <p className="-mt-1 mb-2 text-xs text-slate-500">The course, section and subject of each class you teach. {data.organization.name} sees this list.</p>
                    {classes.length === 0
                        ? <p className="text-sm text-slate-500">Nothing marked yet: add each class you teach.</p>
                        : (
                            <ul className="divide-y divide-slate-100">
                                {classes.map((c) => (
                                    <li key={c._id} className="flex items-center gap-3 py-2">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-900">{c.subject}</span>
                                            <span className="block truncate text-xs text-slate-500">{c.course} · {c.section}</span>
                                        </span>
                                        <button type="button" onClick={() => removeClass(c)} disabled={busy === c._id} aria-label={`Remove ${c.subject}, ${c.course} ${c.section}`} className={xBtn}>
                                            {busy === c._id ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    <AddClassForm courses={courses} onDone={done} />
                </>
            )}
            {confirmDialog}
        </Card>
    );
}
