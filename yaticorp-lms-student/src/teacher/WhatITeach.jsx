/**
 * What I teach (2026-10-30; in the teacher's profile since 2026-10-31, off
 * the 360 Dashboard): each class a teacher with 360 marks — a course, one of
 * its sections and the subject — picked from the lists their organization
 * keeps (organization panel → Teachers → Courses & sections). The
 * organization sees them on its Teachers page. Server: src/three60
 * (GET /api/teacher/360, POST/DELETE /api/teacher/360/classes).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, X, Loader2, ChevronDown, Check } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Card, CardTitle, Loading, ErrorNote, OkNote } from './ui';
import { btn, inputClass, selectClass } from './kit';
import useConfirmDialog from '../components/useConfirmDialog';
import Select from '../components/Select';

const YEARS = [1, 2, 3];
const ORD = { 1: '1st', 2: '2nd', 3: '3rd' };
/** "1st & 2nd year", for a class's years. */
const yearsLabel = (years) => (years?.length ? `${years.map((y) => ORD[y] || y).join(' & ')} year` : '');

/** A dropdown of checkboxes: one or more of `options` ([{ value, label }]). */
const CheckPicker = ({ options, value, onChange, placeholder, summary, label, disabled }) => {
    const [open, setOpen] = useState(false);
    const box = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
        return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
    }, [open]);
    const order = options.map((o) => o.value);
    const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : order.filter((x) => x === v || value.includes(x)));
    return (
        <div ref={box} className="relative">
            <button type="button" aria-haspopup="true" aria-expanded={open} aria-label={label} title={label} disabled={disabled} onClick={() => setOpen((o) => !o)}
                className={`${selectClass} flex w-full items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}>
                <span className={`truncate ${value.length ? 'text-slate-900' : 'text-slate-400'}`}>{value.length ? summary(value) : placeholder}</span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {open && (
                <div role="group" aria-label={label} className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    {options.map(({ value: y, label: text }) => {
                        const on = value.includes(y);
                        return (
                            <label key={y} className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${on ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={on} onChange={() => toggle(y)} className="sr-only" />
                                <span aria-hidden="true" className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${on ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>{on && <Check size={12} strokeWidth={3} />}</span>
                                {text}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/** One line to mark a class: the course, one of its sections, the years, then the subject. */
const AddClassForm = ({ courses, onDone }) => {
    const [programId, setProgramId] = useState(courses.length === 1 ? String(courses[0]._id) : '');
    const [sectionIds, setSectionIds] = useState([]);
    const [subject, setSubject] = useState('');
    const [years, setYears] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const course = courses.find((c) => String(c._id) === programId);
    const sectionOptions = (course?.sections || []).map((x) => ({ value: String(x._id), label: x.name }));
    const sectionsLabel = (ids) => sectionOptions.filter((o) => ids.includes(o.value)).map((o) => o.label.replace(/^Section\s+/i, '')).join(', ').replace(/^/, ids.length > 1 ? 'Sections ' : 'Section ');
    const submit = async (e) => {
        e.preventDefault();
        if (!programId) return setError('Choose the course.');
        if (!sectionIds.length) return setError('Choose the section or sections.');
        if (!years.length) return setError('Choose the year or years you teach.');
        if (!subject.trim()) return setError('Enter the subject you teach.');
        setBusy(true); setError('');
        try {
            const r = await teacherApi.post('/360/classes', { programId, sectionIds, subject, years });
            onDone(r.data, `${course?.name} · ${sectionsLabel(sectionIds)} · ${yearsLabel(years)} · ${subject.trim()} added.`);
            setSubject(''); setSectionIds([]); setYears([]);
        } catch (err) { setError(messageOf(err, 'The class could not be added.')); }
        finally { setBusy(false); }
    };
    return (
        <form onSubmit={submit} className="space-y-2" aria-label="Add a class">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
                {/* Drawn by the page, white, not the system's grey menu (components/Select). */}
                <Select tone="emerald" aria-label="Course" title="Course" placeholder="Course" className={selectClass} value={programId} onChange={(e) => { setProgramId(e.target.value); setSectionIds([]); setSubject(''); setError(''); }}>
                    {courses.map((c) => <option key={c._id} value={String(c._id)}>{c.name}</option>)}
                </Select>
                <CheckPicker label="Sections" options={sectionOptions} value={sectionIds} onChange={(v) => { setSectionIds(v); setError(''); }}
                    placeholder="Section" summary={sectionsLabel} disabled={!course} />
                <CheckPicker label="Years" options={YEARS.map((y) => ({ value: y, label: `${ORD[y]} year` }))} value={years} onChange={(v) => { setYears(v); setSubject(''); setError(''); }} placeholder="Year" summary={yearsLabel} />
                <input aria-label="Subject" className={inputClass} value={subject} onChange={(e) => { setSubject(e.target.value); setError(''); }} maxLength={80} placeholder="Subject you teach" required />
                <button type="submit" disabled={busy} className={btn.primary}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Add</button>
            </div>
            <ErrorNote>{error}</ErrorNote>
        </form>
    );
};

/** The courses named in the teacher's department ("B.Com, BBA"); all of them when none match. */
const coursesFor = (courses, department) => {
    const picked = String(department || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    const mine = courses.filter((c) => picked.includes(String(c.name).trim().toLowerCase()));
    return mine.length ? mine : courses;
};

export default function WhatITeach({ department, onLoaded, step, bare }) {
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
    useEffect(() => { if (data) onLoaded?.(data); }, [data, onLoaded]);

    const removeClass = async (c) => {
        if (!(await confirm({ title: `Remove ${c.course} ${c.section} · ${c.subject}?`, message: 'It comes off your list.', confirmLabel: 'Remove', destructive: true }))) return;
        setBusy(c._id); setNote('');
        try { done((await teacherApi.delete(`/360/classes/${c._id}`)).data, 'Class removed.'); }
        catch (err) { setError(messageOf(err, 'The class could not be removed.')); }
        finally { setBusy(''); }
    };

    const classes = data?.classes || [];
    const allCourses = data?.courses || [];
    const courses = coursesFor(allCourses, department);
    const filtered = courses.length < allCourses.length;
    const Wrap = bare ? 'div' : Card;
    const xBtn = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50';
    return (
        // `bare`: a part of the card it sits in (the profile's details), not a card of its own.
        <Wrap id="what-i-teach" className={bare ? 'scroll-mt-24 mt-6 border-t border-slate-100 pt-5' : 'scroll-mt-24'}>
            <CardTitle icon={BookOpen} color="teal">{step ? `Step ${step} · What I teach` : 'What I teach'}</CardTitle>
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
                    <p className="-mt-1 mb-2 text-xs text-slate-500">Choose the course, section and subject of each class you teach, then press Add. {data.organization.name} sees this list.{filtered ? ' Courses are from your department.' : ''}</p>
                    <AddClassForm key={courses.map((c) => c._id).join()} courses={courses} onDone={done} />
                    {classes.length === 0
                        ? <p className="mt-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-sm text-amber-800">No classes yet. Add at least one above to finish your profile.</p>
                        : (
                            <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100" aria-label="Classes you teach">
                                {classes.map((c) => (
                                    <li key={c._id} className="flex items-center gap-3 py-2">
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-900">{c.subject}</span>
                                            <span className="block truncate text-xs text-slate-500">{[c.course, c.section, yearsLabel(c.years)].filter(Boolean).join(' · ')}</span>
                                        </span>
                                        <button type="button" onClick={() => removeClass(c)} disabled={busy === c._id} aria-label={`Remove ${c.subject}, ${c.course} ${c.section}`} className={xBtn}>
                                            {busy === c._id ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                </>
            )}
            {confirmDialog}
        </Wrap>
    );
}
