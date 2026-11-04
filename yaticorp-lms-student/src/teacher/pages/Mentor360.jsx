/**
 * 360 Dashboard (2026-10-30). What the teacher teaches (course, section,
 * subject) is marked in their profile instead (../WhatITeach.jsx, moved
 * there 2026-10-31); here:
 *   My students      — their own set of the organization's students, whose
 *                      activities they track (separate from the classes: each
 *                      subject has its own students), with their marks so far;
 *   A student        — (2026-10-31) tapped in My students: the proof they
 *                      uploaded for the organization's activities (its 360
 *                      Activities page) — a corrected sheet, a marks card… — and
 *                      the marks: "up to N" one mark for the activity, 0–N,
 *                      from all its proof; "per proof" N for each accepted;
 *                      proof can be sent back with a reason (StudentSheet).
 *                      No separate "Proofs to check" or activity list cards
 *                      (the user removed them, 2026-10-31); the tile counts
 *                      what is waiting.
 * Locked (2026-11-04) until the platform's superadmin unlocks 360 for the
 * organization: the page shows blurred behind a note, and the server sends
 * no students (What I teach, in the profile, still works).
 * Server: src/three60 (/api/teacher/360, ./activities.js for the proofs).
 */
import { useCallback, useEffect, useState } from 'react';
import { Orbit, Users, UserPlus, X, Search, Loader2, ClipboardCheck, FileText, CheckCircle2, XCircle, ChevronRight, Lock } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { useTeacher } from '../useTeacher';
import { PageHeader, Card, CardTitle, StatTile, EmptyState, Loading, ErrorNote, OkNote, Modal, Badge, TeacherAvatar } from '../ui';
import { btn, inputClass, selectClass, fmtAgo } from '../kit';
import useConfirmDialog from '../../components/useConfirmDialog';
import Select from '../../components/Select';

const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;
const fmt = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');
const markText = (a, mark) => (a.mode === 'each' ? `${fmt(a.got)} mark${a.got === 1 ? '' : 's'}` : mark ? `${fmt(mark.marks)} / ${fmt(a.marks)}` : 'Not marked yet');

/** Pick the organization's students to track; those already on the list are ticked and fixed. */
const AddStudentsModal = ({ onClose, onDone }) => {
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState(null);
    const [picked, setPicked] = useState(() => new Set());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        let live = true;
        const t = setTimeout(() => {
            teacherApi.get('/360/students', { params: { search: search.trim() || undefined } })
                .then((r) => { if (live) setStudents(r.data.students || []); })
                .catch((err) => { if (live) setError(messageOf(err, 'Your organization’s students could not be loaded.')); });
        }, search ? 300 : 0);
        return () => { live = false; clearTimeout(t); };
    }, [search]);
    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const submit = async () => {
        setBusy(true); setError('');
        try { onDone((await teacherApi.post('/360/students', { studentIds: [...picked] })).data, `${plural(picked.size, 'student')} added.`); }
        catch (err) { setError(messageOf(err, 'The students could not be added.')); setBusy(false); }
    };
    return (
        <Modal title="Add students to track" onClose={onClose} wide
            footer={(
                <>
                    <button type="button" onClick={onClose} className={btn.secondary}>Cancel</button>
                    <button type="button" onClick={submit} disabled={busy || !picked.size} className={btn.primary}>{busy ? 'Adding…' : `Add ${picked.size || ''}`.trim()}</button>
                </>
            )}>
            <div className="space-y-3">
                <div className="relative">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, card, mobile or email" aria-label="Search students" className={`${inputClass} pl-9`} />
                </div>
                <ErrorNote>{error}</ErrorNote>
                {!students ? <Loading label="Loading students…" /> : students.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">{search ? 'No student matches.' : 'Your organization has no students yet.'}</p>
                ) : (
                    <ul className="max-h-[50dvh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                        {students.map((st) => {
                            const id = String(st._id);
                            return (
                                <li key={id}>
                                    <label className={`flex items-center gap-3 px-3 py-2.5 ${st.mine ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50'}`}>
                                        <input type="checkbox" checked={st.mine || picked.has(id)} disabled={st.mine} onChange={() => toggle(id)} className="h-4 w-4 shrink-0 accent-emerald-600" />
                                        <TeacherAvatar teacher={st} className="h-8 w-8 text-[11px]" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-900">{st.name}</span>
                                            <span className="block truncate text-xs text-slate-500">{st.cardNumber || st.phone || st.email}</span>
                                        </span>
                                        {st.mine && <Badge tone="bg-emerald-50 text-emerald-700">On your list</Badge>}
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </Modal>
    );
};

/** The proof file: a picture shown small, a PDF as an icon; both open in full. */
const ProofThumb = ({ proof: p, size = 'h-16 w-16' }) => {
    // Proof in the student's Drive (2026-11-02): Drive's picture of it (a PDF's first page too),
    // and the link opens it there. A picture Drive has not drawn yet shows the file icon.
    const [failed, setFailed] = useState(false);
    const picture = !failed && (p.previewUrl || (p.fileType !== 'pdf' ? p.fileUrl : ''));
    return (
        <a href={p.fileUrl} target="_blank" rel="noreferrer" aria-label={`Open the proof ${p.fileName || ''}`}
            className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 hover:ring-2 hover:ring-emerald-500/40`}>
            {picture
                ? <img src={picture} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
                : <FileText size={22} className="text-slate-400" aria-hidden="true" />}
        </a>
    );
};

/** "Send back": a reason, then the button; or the button that asks for it. */
const SendBack = ({ who, busy, onSend, onCancel }) => {
    const [note, setNote] = useState('');
    return (
        <div className="space-y-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} autoFocus
                placeholder="Why? e.g. The marks on the sheet are not readable" aria-label={`Why ${who}'s proof is sent back`} className={inputClass} />
            <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={onCancel} disabled={busy} className={btn.secondary}>Cancel</button>
                <button type="button" onClick={() => onSend(note.trim())} disabled={busy}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}Send back
                </button>
            </div>
        </div>
    );
};

/**
 * One student, opened from My students: every activity they have proof for
 * (or all of them), each proof, and the marks. "Up to N": one mark for the
 * activity from all its proof, which also accepts the proof still waiting.
 * "Per proof": each proof accepted on its own.
 */
const hasProof = (a, status) => a.proofs.some((p) => p.status === status);
// What the student's activities can be narrowed to (the "Show" dropdown, 2026-10-31): [key, label, test, empty].
const SHOW = [
    ['proof', 'With proof', (a) => a.proofs.length > 0 || Boolean(a.mark), (who) => `${who} has not uploaded any proof yet.`],
    ['waiting', 'To check', (a) => hasProof(a, 'pending'), () => 'Nothing to check: all their proof is checked.'],
    ['accepted', 'Accepted', (a) => hasProof(a, 'approved') || Boolean(a.mark), () => 'Nothing accepted or marked yet.'],
    ['rejected', 'Sent back', (a) => hasProof(a, 'rejected'), () => 'No proof sent back.'],
    ['unmarked', 'Not marked yet', (a) => (a.mode === 'each' ? !hasProof(a, 'approved') : !a.mark), () => 'Every activity has its marks.'],
    ['all', 'Every activity', () => true, () => 'Your organization has not listed any activities yet.']
];

const StudentSheet = ({ student, onClose, onChanged }) => {
    const [sheet, setSheet] = useState(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [show, setShow] = useState('proof');
    const url = `/360/students/${student._id}/activities`;
    const load = useCallback(() => teacherApi.get(url)
        .then((r) => { setSheet(r.data); setError(''); })
        .catch((err) => setError(messageOf(err, 'This student\'s activities could not be loaded.'))), [url]);
    useEffect(() => { load(); }, [load]);
    const changed = (next, message) => { if (next) setSheet(next); else load(); setNote(message); onChanged(); };

    const every = (sheet?.groups || []).flatMap((g) => g.activities);
    const [, , test, empty] = SHOW.find(([key]) => key === show);
    const groups = (sheet?.groups || []).map((g) => ({ ...g, activities: g.activities.filter(test) })).filter((g) => g.activities.length);
    return (
        <Modal title={`${student.name} · 360 activities`} onClose={onClose} wide labelId="student-sheet-title"
            footer={<button type="button" onClick={onClose} className={btn.secondary}>Close</button>}>
            <ErrorNote onRetry={!sheet ? load : undefined}>{error}</ErrorNote>
            {!sheet ? (!error && <Loading label="Loading activities…" />) : (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="bg-emerald-50 text-emerald-700 !text-xs">{fmt(sheet.total)} marks in all</Badge>
                        {sheet.waiting > 0 && <Badge tone="bg-amber-50 text-amber-700 !text-xs">{sheet.waiting} to check</Badge>}
                        <span className="flex-1" />
                        <div className="w-full sm:w-56">
                            <Select tone="emerald" aria-label="Show" title="Show" className={selectClass} value={show} onChange={(e) => setShow(e.target.value)}>
                                {SHOW.map(([key, label, t]) => <option key={key} value={key}>{`${label} (${every.filter(t).length})`}</option>)}
                            </Select>
                        </div>
                    </div>
                    <OkNote>{note}</OkNote>
                    {groups.length === 0 ? (
                        <p className="py-4 text-center text-sm text-slate-500">{empty(student.name)}</p>
                    ) : groups.map((g) => (
                        <section key={g._id} aria-label={g.name}>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">{g.name}</p>
                            <ul className="space-y-2">
                                {g.activities.map((a) => <SheetActivity key={a._id} studentId={student._id} who={student.name} activity={a} onChanged={changed} />)}
                            </ul>
                        </section>
                    ))}
                </div>
            )}
        </Modal>
    );
};

const SheetActivity = ({ studentId, who, activity: a, onChanged }) => {
    const each = a.mode === 'each';
    const [marks, setMarks] = useState(a.mark ? String(a.mark.marks) : '');
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [sendingBack, setSendingBack] = useState(null);   // proof id
    const counted = a.proofs.filter((p) => p.status !== 'rejected').length;
    const saveMarks = async () => {
        const n = Number(marks);
        if (marks === '' || !Number.isFinite(n) || n < 0 || n > a.marks) { setError(`Give 0 to ${fmt(a.marks)} marks.`); return; }
        setBusy('marks'); setError('');
        try { onChanged((await teacherApi.put(`/360/students/${studentId}/activities/${a._id}`, { marks: n })).data, `${a.name}: ${fmt(n)} / ${fmt(a.marks)} saved.`); }
        catch (err) { setError(messageOf(err, 'The marks could not be saved.')); }
        finally { setBusy(''); }
    };
    const decide = async (p, decision, note = '') => {
        if (decision === 'reject' && !note) { setError('Say why, so the student can upload the right proof.'); return; }
        setBusy(p._id); setError('');
        try {
            const r = await teacherApi.put(`/360/proofs/${studentId}/${p._id}`, { decision, note });
            setSendingBack(null);
            onChanged(null, `${a.name}: ${r.data.message}`);
        } catch (err) { setError(messageOf(err, 'That did not go through.')); }
        finally { setBusy(''); }
    };
    return (
        <li className="rounded-xl border border-slate-200 p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">{each ? `${fmt(a.marks)} for each accepted proof` : `Up to ${fmt(a.marks)} marks`}{a.mark?.byName ? ` · marked by ${a.mark.byName}` : ''}</p>
                </div>
                <Badge tone={a.got ? 'bg-emerald-50 text-emerald-700 !text-xs' : 'bg-slate-100 text-slate-600 !text-xs'}>{markText(a, a.mark)}</Badge>
            </div>
            {a.proofs.length > 0 && (
                <ul className="mt-2 space-y-2">
                    {a.proofs.map((p) => (
                        <li key={p._id} className="rounded-lg bg-slate-50 p-2">
                            <div className="flex items-start gap-2.5">
                                <ProofThumb proof={p} size="h-12 w-12" />
                                <div className="min-w-0 flex-1">
                                    <a href={p.fileUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold text-emerald-700 hover:underline">{p.fileName || 'Proof'}</a>
                                    <p className="text-[11px] text-slate-500">sent {fmtAgo(p.createdAt)}</p>
                                    {p.note && <p className="text-xs text-slate-600">“{p.note}”</p>}
                                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                        {p.status === 'pending' && <Badge tone="bg-amber-50 text-amber-700">Waiting</Badge>}
                                        {p.status === 'approved' && <Badge tone="bg-emerald-50 text-emerald-700">Accepted{each ? ` · +${fmt(p.marks)}` : ''}</Badge>}
                                        {p.status === 'rejected' && <Badge tone="bg-red-50 text-red-700">Sent back</Badge>}
                                        {p.status === 'rejected' && p.reviewNote && <span className="text-[11px] text-slate-500">“{p.reviewNote}”</span>}
                                    </div>
                                </div>
                                {p.status === 'pending' && sendingBack !== p._id && (
                                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                                        {each && (
                                            <button type="button" onClick={() => decide(p, 'approve')} disabled={!!busy} className={`${btn.primary} !px-2.5 !py-1.5 !text-xs`}>
                                                {busy === p._id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}Accept +{fmt(a.marks)}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => { setSendingBack(p._id); setError(''); }} disabled={!!busy} className={`${btn.secondary} !px-2.5 !py-1.5 !text-xs`}>Send back</button>
                                    </div>
                                )}
                            </div>
                            {sendingBack === p._id && (
                                <div className="mt-2"><SendBack who={who} busy={busy === p._id} onSend={(note) => decide(p, 'reject', note)} onCancel={() => setSendingBack(null)} /></div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {!each && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                    {counted ? (
                        <>
                            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                Marks
                                <input type="number" inputMode="decimal" min={0} max={a.marks} step="any" value={marks} onChange={(e) => { setMarks(e.target.value); setError(''); }}
                                    placeholder={`0–${fmt(a.marks)}`} aria-label={`Marks for ${a.name}, out of ${fmt(a.marks)}`} className={`${inputClass} !w-24 tabular-nums`} />
                                <span className="text-slate-500">/ {fmt(a.marks)}</span>
                            </label>
                            <button type="button" onClick={saveMarks} disabled={!!busy} className={btn.primary}>
                                {busy === 'marks' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{a.mark ? 'Update marks' : 'Give marks'}
                            </button>
                            {a.proofs.some((p) => p.status === 'pending') && <span className="text-[11px] text-slate-500">Accepts the proof waiting here.</span>}
                        </>
                    ) : <p className="text-xs text-slate-500">No proof to mark yet.</p>}
                </div>
            )}
            <ErrorNote>{error}</ErrorNote>
        </li>
    );
};

export default function Mentor360() {
    const { teacher } = useTeacher();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [adding, setAdding] = useState(false);
    const [opening, setOpening] = useState(null);       // a student whose activities are open
    const [busy, setBusy] = useState('');
    const [confirm, confirmDialog] = useConfirmDialog();
    const closeSheet = useCallback(() => setOpening(null), []);

    const load = useCallback(() => teacherApi.get('/360')
        .then((r) => { setData(r.data); setError(''); })
        .catch((err) => setError(messageOf(err, 'Could not load your 360 dashboard.'))), []);
    useEffect(() => { load(); }, [load]);
    const done = (next, message) => { setData(next); setAdding(false); setNote(message || ''); };

    const removeStudent = async (st) => {
        if (!(await confirm({ title: `Stop tracking ${st.name}?`, message: 'They come off your list of students.', confirmLabel: 'Remove', destructive: true }))) return;
        setBusy(`student:${st._id}`); setNote('');
        try { done((await teacherApi.delete(`/360/students/${st._id}`)).data, `${st.name} is off your list.`); }
        catch (err) { setError(messageOf(err, 'The student could not be removed.')); }
        finally { setBusy(''); }
    };

    if (!data && !error) return <Loading label="Loading your 360 dashboard…" />;
    const students = data?.students || [];
    const waiting = students.reduce((n, st) => n + (st.waiting || 0), 0);
    const xBtn = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50';

    return (
        <div className="space-y-6">
            <PageHeader icon={Orbit} title="360 Dashboard" color="teal"
                subtitle={data?.organization ? `${data.organization.name} · your students and their activities` : `Welcome, ${teacher?.name || 'teacher'}`} />
            <ErrorNote onRetry={!data ? load : undefined}>{error}</ErrorNote>
            <OkNote>{note}</OkNote>

            {data && !data.organization ? (
                <EmptyState icon={Orbit} title="No organization yet" color="teal">Once your college or school adds you, you track your students’ activities here.</EmptyState>
            ) : data?.locked ? (
                /* Not unlocked by the platform: the dashboard, blurred and out of reach, behind the note. */
                <div className="relative min-h-[20rem]">
                    <div aria-hidden="true" inert="" className="pointer-events-none select-none space-y-6 opacity-60 blur-[3px]">
                        <div className="grid grid-cols-2 gap-3">
                            <StatTile icon={Users} label="My students" value={0} color="emerald" />
                            <StatTile icon={ClipboardCheck} label="Proofs to check" value={0} color="amber" />
                        </div>
                        <Card>
                            <CardTitle icon={Users} color="emerald">My students</CardTitle>
                            <div className="space-y-2 py-1">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-lg bg-slate-100" />)}</div>
                        </Card>
                    </div>
                    <div className="absolute inset-0 flex items-start justify-center p-4 pt-10">
                        <div role="status" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
                            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-teal-600"><Lock size={22} aria-hidden="true" /></span>
                            <h2 className="mt-3 text-lg font-bold text-slate-800">360 is locked</h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">360 is not unlocked for {data.organization.name} yet. Ask your organization to have the YATICORP team unlock it. The classes you teach stay in your profile meanwhile.</p>
                        </div>
                    </div>
                </div>
            ) : data && (
                <>
                    <div className="grid grid-cols-2 gap-3">
                        <StatTile icon={Users} label="My students" value={students.length} color="emerald" />
                        <StatTile icon={ClipboardCheck} label="Proofs to check" value={waiting} sub={waiting ? 'Tap a student below.' : 'All checked.'} color="amber" />
                    </div>
                    <Card>
                        <CardTitle icon={Users} color="emerald" right={<button type="button" onClick={() => setAdding(true)} className={btn.secondary}><UserPlus size={15} /> Add students</button>}>
                            My students
                        </CardTitle>
                        <p className="-mt-1 mb-2 text-xs text-slate-500">The students whose activities you track. Only they see 360; tap one to see all their proof and give marks.</p>
                        {students.length === 0
                            ? <p className="py-2 text-sm text-slate-500">No students yet. Add the ones you will track.</p>
                            : (
                                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                                    {students.map((st) => (
                                        <li key={st._id} className="flex items-center gap-1 py-1">
                                            <button type="button" onClick={() => setOpening(st)} aria-label={`Open ${st.name}'s activities and proof`}
                                                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left hover:bg-slate-50">
                                                <TeacherAvatar teacher={st} className="h-8 w-8 text-[11px]" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-slate-900">{st.name}</span>
                                                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                                        <span className="truncate">{st.cardNumber || st.phone || st.email}</span>
                                                        <Badge tone="bg-emerald-50 text-emerald-700">{fmt(st.marks)} marks</Badge>
                                                        {st.waiting > 0 && <Badge tone="bg-amber-50 text-amber-700">{st.waiting} to check</Badge>}
                                                    </span>
                                                </span>
                                                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-300" />
                                            </button>
                                            <button type="button" onClick={() => removeStudent(st)} disabled={busy === `student:${st._id}`} aria-label={`Stop tracking ${st.name}`} className={xBtn}>
                                                {busy === `student:${st._id}` ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </Card>
                </>
            )}

            {adding && <AddStudentsModal onClose={() => setAdding(false)} onDone={done} />}
            {opening && <StudentSheet student={opening} onClose={closeSheet} onChanged={load} />}
            {confirmDialog}
        </div>
    );
}
