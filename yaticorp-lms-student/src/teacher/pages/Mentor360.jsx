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
import { Link } from 'react-router-dom';
import { Orbit, Users, UserPlus, X, Search, Loader2, ClipboardCheck, Trophy, FileText, CheckCircle2, XCircle, ChevronRight, Lock, BookOpen, Phone, Mail, GraduationCap, Landmark, Building2, PencilLine } from 'lucide-react';
import teacherApi, { messageOf } from '../teacherSession';
import { useTeacher, hasResearch } from '../useTeacher';
import { PageHeader, Card, CardTitle, StatTile, EmptyState, Loading, ErrorNote, OkNote, Modal, Badge, TeacherAvatar } from '../ui';
import { btn, inputClass, selectClass, fmtAgo } from '../kit';
import useConfirmDialog from '../../components/useConfirmDialog';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { missingOf } from '../profileGate';
import CompleteProfileFirst from '../CompleteProfileFirst';
import Select from '../../components/Select';

const RANKS = [
    { card: 'border-amber-200 bg-amber-50/60', badge: 'bg-amber-400 text-amber-950' },
    { card: 'border-slate-200 bg-slate-50/80', badge: 'bg-slate-300 text-slate-800' },
    { card: 'border-orange-200 bg-orange-50/50', badge: 'bg-orange-300 text-orange-950' }
];
const plural = (n, word, words = `${word}s`) => `${n} ${n === 1 ? word : words}`;
const fmt = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');
const markText = (a, mark) => (a.mode === 'each' ? (a.cap != null ? `${fmt(a.got)} / ${fmt(a.cap)}` : `${fmt(a.got)} mark${a.got === 1 ? '' : 's'}`)
    : a.got > 0 || mark || (a.proofs || []).some((p) => p.status === 'approved') ? `${fmt(a.got ?? mark?.marks ?? 0)} / ${fmt(a.marks)}` : 'Not marked yet');

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
    useAutoRefresh(load, 15000);
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
    // "Up to N": marks for each proof, typed in its own box (2026-11-04).
    const [marks, setMarks] = useState(() => Object.fromEntries(a.proofs.map((p) => [p._id, p.status === 'approved' && p.marks ? String(p.marks) : ''])));
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [sendingBack, setSendingBack] = useState(null);   // proof id
    const given = a.proofs.filter((p) => p.status === 'approved').reduce((n, p) => n + (Number(p.marks) || 0), 0);
    // What is left of the top for this proof: the top less the other accepted proofs' marks.
    const roomFor = (p) => Math.max(0, a.marks - (given - (p.status === 'approved' ? Number(p.marks) || 0 : 0)));
    // "Per proof" with a most (2026-11-06): past it, proof is still accepted, for the record, with 0 marks.
    const gets = each ? (a.cap != null ? Math.max(0, Math.min(a.marks || 0, a.cap - given)) : a.marks || 0) : 0;
    const full = each && a.cap != null && gets < (a.marks || 0);
    // Bonus (2026-11-06): the teacher may add up to bonusMax in all, on accepting proof.
    const [bonusIn, setBonusIn] = useState(() => Object.fromEntries(a.proofs.map((p) => [p._id, p.bonusMarks ? String(p.bonusMarks) : ''])));
    const bonusGiven = a.proofs.filter((p) => p.status === 'approved').reduce((n, p) => n + (Number(p.bonusMarks) || 0), 0);
    const bonusRoomFor = (p) => Math.max(0, (a.bonusMax || 0) - (bonusGiven - (p.status === 'approved' ? Number(p.bonusMarks) || 0 : 0)));
    const bonusBox = (p) => (a.bonusMax > 0 ? (
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            Bonus
            <input type="number" inputMode="decimal" min={0} max={bonusRoomFor(p)} step="any" value={bonusIn[p._id] ?? ''}
                onChange={(e) => { setBonusIn((m) => ({ ...m, [p._id]: e.target.value })); setError(''); }}
                placeholder={`0–${fmt(bonusRoomFor(p))}`} aria-label={`Bonus for ${p.fileName || 'this proof'}, up to ${fmt(bonusRoomFor(p))}`}
                className={`${inputClass} !w-16 !py-1.5 tabular-nums`} />
        </label>
    ) : null);
    const decide = async (p, decision, note = '') => {
        if (decision === 'reject' && !note) { setError('Say why, so the student can upload the right proof.'); return; }
        let body = { decision, note };
        if (decision === 'approve' && a.bonusMax > 0) {
            const raw = bonusIn[p._id] ?? '';
            const b = raw === '' ? 0 : Number(raw);
            const room = bonusRoomFor(p);
            if (!Number.isFinite(b) || b < 0 || b > room) { setError(`Bonus: 0 to ${fmt(room)}.`); return; }
            body.bonus = b;
        }
        if (decision === 'approve' && !each) {
            const raw = marks[p._id] ?? '';
            const n = Number(raw);
            const room = roomFor(p);
            if (raw === '' || !Number.isFinite(n) || n < 0 || n > room) { setError(`Give this proof 0 to ${fmt(room)} marks.`); return; }
            body = { ...body, decision, marks: n, note: p.reviewNote || '' };
        }
        setBusy(p._id); setError('');
        try {
            const r = await teacherApi.put(`/360/proofs/${studentId}/${p._id}`, body);
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
                    <p className="text-xs text-slate-500">{each ? `${fmt(a.marks)} for each accepted proof${a.cap != null ? `, at most ${fmt(a.cap)}` : ''}` : `Up to ${fmt(a.marks)} marks · each proof gets its own`}{a.bonusMax > 0 ? ` · bonus up to ${fmt(a.bonusMax)} (${fmt(bonusGiven)} given)` : ''}{a.bonus ? ' · extra' : ''}{a.mark?.byName ? ` · marked by ${a.mark.byName}` : ''}</p>
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
                                        {p.status === 'approved' && <Badge tone="bg-emerald-50 text-emerald-700">Accepted{p.marks ? ` · +${fmt(p.marks)}` : ' · no marks'}{p.bonusMarks ? ` · +${fmt(p.bonusMarks)} bonus` : ''}</Badge>}
                                        {p.status === 'rejected' && <Badge tone="bg-red-50 text-red-700">Sent back</Badge>}
                                        {p.status === 'rejected' && p.reviewNote && <span className="text-[11px] text-slate-500">“{p.reviewNote}”</span>}
                                    </div>
                                </div>
                                {p.status === 'pending' && sendingBack !== p._id && (
                                    <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
                                        {each && bonusBox(p)}
                                        {each && (
                                            <button type="button" onClick={() => decide(p, 'approve')} disabled={!!busy}
                                                title={full ? `${a.name} already has its most, ${fmt(a.cap)} marks: accepted for the record` : undefined}
                                                className={`${full ? btn.secondary : btn.primary} !px-2.5 !py-1.5 !text-xs`}>
                                                {busy === p._id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}{gets > 0 ? `Accept +${fmt(gets)}` : 'Accept · no marks'}
                                            </button>
                                        )}
                                        <button type="button" onClick={() => { setSendingBack(p._id); setError(''); }} disabled={!!busy} className={`${btn.secondary} !px-2.5 !py-1.5 !text-xs`}>Send back</button>
                                    </div>
                                )}
                            </div>
                            {!each && p.status !== 'rejected' && sendingBack !== p._id && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-2">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        Marks
                                        <input type="number" inputMode="decimal" min={0} max={roomFor(p)} step="any" value={marks[p._id] ?? ''}
                                            onChange={(e) => { setMarks((m) => ({ ...m, [p._id]: e.target.value })); setError(''); }}
                                            placeholder={`0–${fmt(roomFor(p))}`} aria-label={`Marks for ${p.fileName || 'this proof'}, up to ${fmt(roomFor(p))}`}
                                            className={`${inputClass} !w-20 !py-1.5 tabular-nums`} />
                                        <span className="font-normal text-slate-400">of {fmt(roomFor(p))} left</span>
                                    </label>
                                    {bonusBox(p)}
                                    <button type="button" onClick={() => decide(p, 'approve')} disabled={!!busy} className={`${btn.primary} !px-2.5 !py-1.5 !text-xs`}>
                                        {busy === p._id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}{p.status === 'pending' ? 'Accept with marks' : 'Update marks'}
                                    </button>
                                </div>
                            )}
                            {sendingBack === p._id && (
                                <div className="mt-2"><SendBack who={who} busy={busy === p._id} onSend={(note) => decide(p, 'reject', note)} onCancel={() => setSendingBack(null)} /></div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {!each && a.proofs.length > 0 && (
                <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                    In all: <strong className="text-slate-800 tabular-nums">{fmt(a.got)} / {fmt(a.marks)}</strong>{given === 0 && a.got > 0 ? ' (given on the whole activity before; marks on each proof replace it)' : ''}
                </p>
            )}
            {!each && !a.proofs.length && <p className="mt-2 text-xs text-slate-500">No proof to mark yet.</p>}
            {full && a.proofs.some((p) => p.status === 'pending') && (
                <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">{a.name} already has its most ({fmt(a.cap)} marks). More proof is accepted for the record with no marks{a.bonusMax > 0 ? ', but you can still add bonus' : ''}.</p>
            )}
            <ErrorNote>{error}</ErrorNote>
        </li>
    );
};

/** The teacher's whole profile at a glance, with what is still missing and a way to fill it in. */
const ProfileCard = ({ teacher, organization, classes, missing }) => {
    const rows = [
        [GraduationCap, 'Designation', teacher?.designation],
        [Landmark, 'Department', teacher?.department],
        [Phone, 'Mobile', teacher?.phone],
        [Mail, 'Email', teacher?.email],
        [Building2, 'Organization', organization?.name]
    ];
    return (
        <Card className="!p-0">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                    <TeacherAvatar teacher={teacher} className="h-14 w-14 text-base" />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-slate-900">{teacher?.name || 'Teacher'}</p>
                        <p className="truncate text-sm text-slate-500">{[teacher?.designation, organization?.name].filter(Boolean).join(' · ') || 'Your profile'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {missing.length > 0 && <Badge tone="bg-amber-50 text-amber-700">{missing.length} to add</Badge>}
                    <Link to="/teacher/profile" className={missing.length ? btn.primary : btn.secondary}><PencilLine size={15} aria-hidden="true" /> {missing.length ? 'Complete profile' : 'Edit profile'}</Link>
                </div>
            </div>
            <dl className="grid grid-cols-1 border-t border-slate-100 sm:grid-cols-2 lg:grid-cols-5">
                {rows.map(([Icon, label, value]) => (
                    <div key={label} className="min-w-0 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:px-5 lg:border-b-0 lg:border-r lg:last:border-r-0">
                        <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Icon size={13} aria-hidden="true" /> {label}</dt>
                        <dd className={`mt-1 truncate text-sm ${value ? 'font-medium text-slate-800' : 'text-slate-400'}`} title={value || undefined}>{value || 'Not added'}</dd>
                    </div>
                ))}
            </dl>
            {teacher?.mentor360 && (
                <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><BookOpen size={13} aria-hidden="true" /> What I teach</p>
                    {classes?.length ? (
                        <ul className="mt-2 flex flex-wrap gap-2">
                            {classes.map((c) => (
                                <li key={c._id} className="rounded-lg border border-teal-100 bg-teal-50/60 px-2.5 py-1 text-sm text-slate-700">
                                    <span className="font-semibold text-slate-900">{c.course}</span> · {c.section}{c.years?.length ? ` · ${c.years.map((y) => ({ 1: '1st', 2: '2nd', 3: '3rd' })[y] || y).join(' & ')} year` : ''}{c.subject ? <> · <span className="text-teal-800">{c.subject}</span></> : null}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="mt-1 text-sm text-slate-400">No classes added. Add the course, section and subject you teach in your profile.</p>}
                </div>
            )}
        </Card>
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
    // New proof from students shows without a refresh: asked again every 15s while on screen.
    useAutoRefresh(load, 15000);
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
    const research = hasResearch(teacher);
    const missing = data ? missingOf(teacher, data.classes || [], data.courses) : [];
    const waiting = students.reduce((n, st) => n + (st.waiting || 0), 0);
    // Their highest 360 marks (2026-11-05): the top three of their students with marks above 0.
    const toppers = students.filter((st) => Number(st.marks) > 0).sort((a, b) => b.marks - a.marks || a.name.localeCompare(b.name)).slice(0, 3);

    return (
        <div className="space-y-6">
            <PageHeader icon={Orbit} title="360 Dashboard" color="teal"
                subtitle={data?.organization ? `${data.organization.name} · your students and their activities` : `Welcome, ${teacher?.name || 'teacher'}`} />
            <ErrorNote onRetry={!data ? load : undefined}>{error}</ErrorNote>
            <OkNote>{note}</OkNote>
            {/* Only while something is missing: once complete, the dashboard is theirs. */}
            {missing.length > 0 && <ProfileCard teacher={teacher} organization={data?.organization} classes={data?.classes} missing={missing} />}

            {missing.length > 0 && !research ? (
                <CompleteProfileFirst missing={missing} />
            ) : data && !data.organization ? (
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
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                        <StatTile icon={Users} label="My students" value={students.length} color="emerald" />
                        <StatTile icon={ClipboardCheck} label="Proofs to check" value={waiting} sub={waiting ? 'Tap a student below.' : 'All checked.'} color="amber" />
                        <div className="col-span-2 lg:col-span-1">
                            <StatTile icon={Trophy} label="Highest marks" value={toppers.length ? fmt(toppers[0].marks) : '—'}
                                sub={toppers.length ? toppers[0].name : 'No marks given yet.'} color="violet" />
                        </div>
                    </div>
                    {toppers.length > 0 && (
                        <Card>
                            <CardTitle icon={Trophy} color="violet">Top scorers</CardTitle>
                            <p className="-mt-1 mb-3 text-xs text-slate-500">Your students with the highest 360 marks so far. Tap one to open their proof.</p>
                            <ol className="grid gap-2 sm:grid-cols-3">
                                {toppers.map((st, i) => (
                                    <li key={st._id}>
                                        <button type="button" onClick={() => setOpening(st)} aria-label={`Rank ${i + 1}: ${st.name}, ${fmt(st.marks)} marks`}
                                            className={`flex w-full min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${RANKS[i].card}`}>
                                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${RANKS[i].badge}`}>{i + 1}</span>
                                            <TeacherAvatar teacher={st} className="h-9 w-9 text-xs" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-slate-900">{st.name}</span>
                                                <span className="block truncate text-[11px] text-slate-500 tabular-nums">{st.cardNumber || st.email}</span>
                                            </span>
                                            <span className="shrink-0 text-right">
                                                <span className="block text-lg font-bold leading-none text-slate-900 tabular-nums">{fmt(st.marks)}</span>
                                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">marks</span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    )}
                    <Card>
                        <CardTitle icon={Users} color="emerald" right={<button type="button" onClick={() => setAdding(true)} className={btn.primary}><UserPlus size={15} /> Add students</button>}>
                            My students
                        </CardTitle>
                        <p className="-mt-1 mb-2 text-xs text-slate-500">The students whose activities you track. Only they see 360; tap one to see all their proof and give marks.</p>
                        {students.length === 0
                            ? <p className="py-2 text-sm text-slate-500">No students yet. Add the ones you will track.</p>
                            : (
                                <ul className="max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
                                    {students.map((st) => (
                                        <li key={st._id} className={`flex items-center gap-2 rounded-xl border p-1.5 transition-colors ${st.waiting > 0 ? 'border-amber-200 bg-amber-50/50 hover:border-amber-300' : 'border-emerald-100 bg-emerald-50/40 hover:border-emerald-300'}`}>
                                            <button type="button" onClick={() => setOpening(st)} aria-label={`Open ${st.name}'s activities and proof`}
                                                className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">
                                                <TeacherAvatar teacher={st} className="h-8 w-8 text-[11px]" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-slate-900">{st.name}</span>
                                                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                                        <span className="truncate">{st.cardNumber || st.phone || st.email}</span>
                                                        <Badge tone="bg-emerald-50 text-emerald-700">{fmt(st.marks)} marks</Badge>
                                                        {st.waiting > 0 && <Badge tone="bg-amber-50 text-amber-700">{st.waiting} to check</Badge>}
                                                    </span>
                                                </span>
                                                <span className="hidden shrink-0 items-center gap-1 rounded-lg border border-emerald-600/30 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 shadow-sm group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white sm:inline-flex">
                                                    {st.waiting > 0 ? 'Check proof' : 'Open'} <ChevronRight size={14} aria-hidden="true" />
                                                </span>
                                                <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-400 sm:hidden" />
                                            </button>
                                            <button type="button" onClick={() => removeStudent(st)} disabled={busy === `student:${st._id}`} aria-label={`Stop tracking ${st.name}`} title="Remove from my list"
                                                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
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
