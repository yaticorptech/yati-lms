/**
 * My department (Campus, 2026-11-13) — for the teacher chosen as Head of department
 * (Campus → Departments). They post announcements to the department's students and set
 * each class's weekly timetable. Students see both on the Overview of their Institution page.
 * Server: /api/teacher/campus/hod (yaticorp-lms-server/src/campus/orgAdmin.js, `hod`).
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Megaphone, CalendarRange, Pin, PinOff, Trash2, Plus, Minus, Save, Send, Eraser, BookOpen, Pencil, Users, GraduationCap, Mail, Phone, ChevronRight, CalendarCheck, Orbit, Trophy } from 'lucide-react';
import Select from '../../components/Select';
import { LockChip, LockedPage, LockedPreview } from '../../campus/Locked';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, EmptyState, Loading, ErrorNote, OkNote, Field, Modal, TeacherAvatar } from '../ui';
import { btn, selectClass, inputClass, fmtAgo } from '../kit';

const DAYS = [[1, 'Mon', 'Monday'], [2, 'Tue', 'Tuesday'], [3, 'Wed', 'Wednesday'], [4, 'Thu', 'Thursday'], [5, 'Fri', 'Friday'], [6, 'Sat', 'Saturday']];
const pad = (n) => String(n).padStart(2, '0');
const clock = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
const defaultPeriods = (count = 6) => Array.from({ length: count }, (_, i) => { const s = 9 * 60 + i * 55 + (i >= 3 ? 15 : 0); return { start: clock(s), end: clock(s + 50) }; });
const TINTS = ['bg-emerald-50 text-emerald-900 ring-emerald-200', 'bg-amber-50 text-amber-900 ring-amber-200', 'bg-sky-50 text-sky-900 ring-sky-200', 'bg-rose-50 text-rose-900 ring-rose-200', 'bg-violet-50 text-violet-900 ring-violet-200', 'bg-teal-50 text-teal-900 ring-teal-200', 'bg-orange-50 text-orange-900 ring-orange-200', 'bg-slate-100 text-slate-900 ring-slate-300'];

/** GET /campus/hod`path`: { data, error, loading, reload }. */
const useHod = (path, params) => {
    const [state, setState] = useState({ data: null, error: '', loading: true });
    const [tick, setTick] = useState(0);
    const key = JSON.stringify(params || {});
    useEffect(() => {
        let live = true;
        setState((s) => ({ ...s, loading: true, error: '' }));
        teacherApi.get(`/campus/hod${path}`, { params }).then((r) => { if (live) setState({ data: r.data, error: '', loading: false }); })
            .catch((err) => { if (live) setState({ data: null, error: messageOf(err, 'Could not load this.'), loading: false }); });
        return () => { live = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [path, key, tick]);
    return { ...state, reload: () => setTick((t) => t + 1) };
};

/* ── Announcements ──────────────────────────────────────────────────────── */
const Announcements = ({ dept }) => {
    const list = useHod('/announcements', { departmentId: dept._id });
    const empty = { title: '', body: '', semester: '', section: '', pinned: false, toStudents: true, toTeachers: false };
    const [f, setF] = useState(empty);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState({ ok: '', error: '' });
    const semesters = Array.from({ length: dept.semesters || 0 }, (_, i) => i + 1);
    const act = async (fn) => {
        setNote({ ok: '', error: '' });
        try { setNote({ ok: (await fn()).data.message, error: '' }); list.reload(); return true; } catch (err) { setNote({ ok: '', error: messageOf(err, 'That did not work.') }); return false; }
    };
    const post = async (e) => {
        e.preventDefault(); setBusy(true);
        if (await act(() => teacherApi.post('/campus/hod/announcements', { ...f, departmentId: dept._id, semester: f.toStudents ? Number(f.semester) || 0 : 0, section: f.toStudents ? f.section : '' }))) setF(empty);
        setBusy(false);
    };
    const remove = (a) => { if (window.confirm(`Remove “${a.title}”? Students will no longer see it.`)) act(() => teacherApi.delete(`/campus/hod/announcements/${a._id}`, { params: { departmentId: dept._id } })); };
    const rows = list.data?.announcements || [];
    return (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
            <Card className="h-fit">
                <h2 className="mb-4 text-[15px] font-semibold text-slate-900">New announcement</h2>
                <form onSubmit={post} className="space-y-4">
                    <Field id="a-title" label="Title"><input id="a-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={150} required placeholder="Internal test on Monday" className={inputClass} /></Field>
                    <Field id="a-body" label="Message" optional><textarea id="a-body" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} maxLength={3000} rows={5} placeholder="Details students need to know…" className={inputClass} /></Field>
                    <fieldset>
                        <legend className="mb-1.5 block text-sm font-medium text-slate-700">Send to</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {[['toStudents', 'Students', 'Institution page'], ['toTeachers', 'Teachers', 'Attendance page']].map(([k, label, where]) => (
                                <label key={k} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition ${f[k] ? 'border-emerald-600 bg-emerald-50/60' : 'border-slate-300 hover:border-emerald-300'}`}>
                                    <input type="checkbox" checked={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.checked })} className="mt-0.5 h-4 w-4 accent-emerald-700" />
                                    <span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="block text-xs text-slate-500">On their {where}</span></span>
                                </label>
                            ))}
                        </div>
                        {!f.toStudents && !f.toTeachers && <p className="mt-1 text-xs font-semibold text-red-600">Choose students, teachers or both.</p>}
                    </fieldset>
                    {f.toStudents && <div className="grid grid-cols-2 gap-3">
                        <Field id="a-sem" label="For"><Select tone="emerald" id="a-sem" value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })} className={`${selectClass} w-full`}><option value="">All semesters</option>{semesters.map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                        {dept.sections?.length > 1 && <Field id="a-sec" label="Section"><Select tone="emerald" id="a-sec" value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} className={`${selectClass} w-full`}><option value="">All sections</option>{dept.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></Field>}
                    </div>}
                    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} className="h-4 w-4 accent-emerald-700" /> Pin to the top</label>
                    <button type="submit" className={`${btn.primary} w-full`} disabled={busy || !f.title.trim() || (!f.toStudents && !f.toTeachers)}><Send size={15} /> {busy ? 'Posting…' : f.toStudents && f.toTeachers ? 'Post to students and teachers' : f.toTeachers ? 'Post to teachers' : 'Post to students'}</button>
                </form>
            </Card>
            <div className="min-w-0 space-y-3">
                <OkNote>{note.ok}</OkNote>
                <ErrorNote>{note.error}</ErrorNote>
                {list.loading && !list.data ? <Loading label="Loading announcements…" /> : list.error ? <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote> : !rows.length ? (
                    <Card><EmptyState icon={Megaphone} title="No announcements yet" color="amber">Students see announcements on their Institution page (Overview); teachers on their Attendance page.</EmptyState></Card>
                ) : rows.map((a) => (
                    <Card key={a._id} className={a.pinned ? 'border-amber-200 bg-amber-50/40' : ''}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{a.pinned && <Pin size={13} className="mr-1.5 inline -translate-y-px text-amber-600" />}{a.title}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{[a.toStudents && 'Students', a.toTeachers && 'Teachers'].filter(Boolean).join(' & ')}{a.toStudents ? ` · ${a.semester ? `Semester ${a.semester}` : 'All semesters'}${a.section ? ` · Section ${a.section}` : ''}` : ''} · {a.by || 'Department'} · {fmtAgo(a.at)}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <button type="button" className={btn.ghost} onClick={() => act(() => teacherApi.put(`/campus/hod/announcements/${a._id}/pin`, { departmentId: dept._id }))} aria-label={a.pinned ? 'Unpin' : 'Pin'}>{a.pinned ? <PinOff size={14} /> : <Pin size={14} />}</button>
                                <button type="button" className={`${btn.ghost} hover:text-red-600`} onClick={() => remove(a)} aria-label="Remove"><Trash2 size={14} /></button>
                            </div>
                        </div>
                        {a.body && <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{a.body}</p>}
                    </Card>
                ))}
            </div>
        </div>
    );
};

/* ── Students (read-only): section by section, with every admission detail ── */
const fmtDay = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const pctTone = (p) => (p === null || p === undefined ? 'bg-slate-100 text-slate-500' : p < 75 ? 'bg-rose-50 text-rose-700' : p < 85 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700');

const StudentDetails = ({ student: st, fields, dept, onClose }) => {
    const filled = fields.filter((f) => String(st.details?.[f.key] ?? '').trim());
    const groups = [
        ['Personal', ['dob', 'gender', 'bloodGroup', 'category', 'nationality', 'religion', 'motherTongue']],
        ['Family', ['fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'guardianName', 'guardianPhone']],
        ['Address', ['address', 'city', 'state', 'pincode']],
        ['Previous education', ['previousInstitution', 'previousBoard', 'previousPercentage']],
        ['Admission', ['quota', 'hostel', 'transport']]
    ];
    const label = Object.fromEntries(fields.map((f) => [f.key, f.label]));
    return (
        <Modal title={st.name} onClose={onClose} wide labelId="hod-student-title" footer={<button type="button" className={btn.secondary} onClick={onClose}>Close</button>}>
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    {st.picture ? <img src={st.picture} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white">{(st.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>}
                    <div className="min-w-0">
                        <p className="text-sm text-slate-500">{dept.name} · Semester {st.semester}{st.section ? ` · Section ${st.section}` : ''}</p>
                        <p className="mt-0.5 flex flex-wrap gap-1.5"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pctTone(st.attendance)}`}>Attendance {st.attendance ?? 0}%</span></p>
                    </div>
                </div>
                <dl className="grid gap-x-6 gap-y-3 rounded-xl border border-slate-200 p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {[['Roll number', st.rollNo], ['Admission number', st.admissionNo], ['Admitted on', fmtDay(st.admittedAt)], ['Academic year', st.academicYear], ['Card number', st.cardNumber], ['Phone', st.phone], ['Email', st.email]].map(([k, v]) => (
                        <div key={k} className="min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt><dd className="truncate font-medium text-slate-800">{v || '—'}</dd></div>
                    ))}
                </dl>
                {filled.length === 0 ? <p className="text-sm text-slate-500">No admission form details filled in yet.</p> : groups.map(([title, keys]) => {
                    const rows = keys.filter((k) => String(st.details?.[k] ?? '').trim());
                    if (!rows.length) return null;
                    return (
                        <section key={title}>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h3>
                            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                {rows.map((k) => <div key={k} className="min-w-0"><dt className="text-[11px] font-semibold text-slate-400">{label[k] || k}</dt><dd className="break-words font-medium text-slate-800">{String(st.details[k])}</dd></div>)}
                            </dl>
                        </section>
                    );
                })}
            </div>
        </Modal>
    );
};

/* ── A student's whole attendance (open: attendance is unlocked) ─────────── */
const AttendanceDetail = ({ student, dept, onClose }) => {
    const data = useHod(`/students/${student._id}/attendance`, { departmentId: dept._id });
    const rows = data.data?.subjects || [];
    const sum = data.data?.summary;
    return (
        <Modal title={`${student.name} · attendance`} onClose={onClose} wide labelId="hod-att-title" footer={<button type="button" className={btn.secondary} onClick={onClose}>Close</button>}>
            {data.loading && !data.data ? <Loading label="Loading attendance…" /> : data.error ? <ErrorNote onRetry={data.reload}>{data.error}</ErrorNote> : (
                <div className="space-y-3">
                    <p className="text-sm text-slate-600">Roll {student.rollNo || '—'} · Semester {student.semester}{student.section ? ` · Section ${student.section}` : ''} · Overall <b className={sum?.percent !== null && sum?.percent < 75 ? 'text-rose-700' : 'text-emerald-700'}>{sum?.percent ?? 0}%</b> <span className="text-slate-400">({sum?.present || 0}/{sum?.held || 0})</span></p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[760px] text-sm tabular-nums">
                            <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="px-3 py-2.5">Code</th><th className="px-3 py-2.5">Subject</th><th className="px-2 py-2.5 text-center">Conducted</th><th className="px-2 py-2.5 text-center">Attended</th><th className="px-2 py-2.5 text-center">Total %</th><th className="px-2 py-2.5 text-center">Excused</th><th className="px-2 py-2.5 text-center">Allowed</th><th className="px-2 py-2.5 text-center">Remedial</th><th className="px-3 py-2.5">Absent dates</th><th className="px-3 py-2.5">Last attended</th>
                            </tr></thead>
                            <tbody>{rows.length ? rows.map((x) => (
                                <tr key={x._id} className="border-b border-slate-100 align-top last:border-0">
                                    <td className="px-3 py-2.5 font-mono text-xs font-semibold text-amber-700">{x.code || '—'}</td>
                                    <td className="px-3 py-2.5 font-medium text-slate-800">{x.name}{x.semester !== student.semester && <span className="ml-1 text-xs text-slate-400">(Sem {x.semester})</span>}</td>
                                    <td className="px-2 py-2.5 text-center">{x.held}</td><td className="px-2 py-2.5 text-center">{x.present}</td>
                                    <td className="px-2 py-2.5 text-center"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${pctTone(x.held ? x.percent : null)}`}>{x.percent ?? 0}%</span></td>
                                    <td className="px-2 py-2.5 text-center">{x.excused}</td><td className="px-2 py-2.5 text-center">{x.allowed}</td><td className="px-2 py-2.5 text-center">{x.remedial}</td>
                                    <td className="px-3 py-2.5">{x.absent.length ? <div className="flex max-w-[16rem] flex-wrap gap-1">{x.absent.map((a, i) => <span key={i} className="rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700">{fmtDay(a.date)} · P{a.period}</span>)}</div> : <span className="text-slate-400">0</span>}</td>
                                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{x.lastAttended ? fmtDay(x.lastAttended) : '—'}</td>
                                </tr>
                            )) : <tr><td colSpan={10} className="px-3 py-6 text-center text-slate-500">No subjects yet.</td></tr>}</tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
};

const Students = ({ dept, view = 'details' }) => {
    const [semester, setSemester] = useState('');
    const list = useHod('/students', { departmentId: dept._id, semester: semester || undefined });
    const [section, setSection] = useState('');
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);
    const students = list.data?.students || [];
    const sections = [...new Set([...(dept.sections || []), ...students.map((x) => x.section).filter(Boolean)])].sort();
    const current = section && sections.includes(section) ? section : sections[0] || '';
    const term = q.trim().toLowerCase();
    const rows = students.filter((x) => (sections.length < 2 || x.section === current) && (!term || `${x.name} ${x.rollNo} ${x.admissionNo} ${x.cardNumber}`.toLowerCase().includes(term)));
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <label className="block w-full sm:w-auto"><span className="mb-1 block text-xs font-semibold text-slate-500">Semester</span>
                    <Select tone="emerald" value={semester} onChange={(e) => setSemester(e.target.value)} className={`${selectClass} w-full sm:w-40`}><option value="">All semesters</option>{Array.from({ length: dept.semesters || 0 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>Semester {n}</option>)}</Select></label>
                <label className="block min-w-0 flex-1 sm:max-w-xs"><span className="mb-1 block text-xs font-semibold text-slate-500">Search</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, roll or admission no." className={inputClass} /></label>
            </div>
            {sections.length > 1 && (
                <div role="tablist" aria-label="Section" className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
                    {sections.map((x) => {
                        const n = students.filter((st) => st.section === x).length;
                        return (
                            <button key={x} type="button" role="tab" aria-selected={current === x} onClick={() => setSection(x)}
                                className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition ${current === x ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                                Section {x} <span className={`ml-1 text-xs ${current === x ? 'text-emerald-100' : 'text-slate-400'}`}>{n}</span>
                            </button>
                        );
                    })}
                </div>
            )}
            {list.loading && !list.data ? <Loading label="Loading students…" /> : list.error ? <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote> : !rows.length ? (
                <Card><EmptyState icon={Users} title={students.length ? 'No one matches' : 'No students yet'} color="emerald">{students.length ? 'Try another name or number.' : 'Students appear once the admission office admits them to your department.'}</EmptyState></Card>
            ) : (
                <Card className="overflow-hidden !p-0">
                    <p className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600"><b className="text-slate-900">{sections.length > 1 ? `Section ${current}` : 'All students'}</b> · {rows.length} student{rows.length === 1 ? '' : 's'}{semester ? ` · Semester ${semester}` : ''}</p>
                    <ul className="divide-y divide-slate-100">
                        {rows.map((st) => (
                            <li key={st._id}>
                                <button type="button" onClick={() => setOpen(st)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-emerald-50">
                                    {st.picture ? <img src={st.picture} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{(st.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>}
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold text-slate-900">{st.name}</span>
                                        <span className="block truncate font-mono text-[11px] text-slate-500">Roll {st.rollNo || '—'} · Adm. {st.admissionNo || '—'}{!semester ? ` · Sem ${st.semester}` : ''}</span>
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${pctTone(st.attendance)}`}>{st.attendance ?? 0}%</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </Card>
            )}
            {open && (view === 'attendance' ? <AttendanceDetail student={open} dept={dept} onClose={() => setOpen(null)} /> : <StudentDetails student={open} fields={list.data?.detailFields || []} dept={dept} onClose={() => setOpen(null)} />)}
        </div>
    );
};

/* ── Mentors: which teacher mentors which students ────────────────────── */
const MentorDialog = ({ dept, teacher, students, mentorOf, onClose, onDone }) => {
    const [picked, setPicked] = useState(new Set(teacher.studentIds));
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const term = q.trim().toLowerCase();
    // Students another mentor already has are not offered (2026-11-14): only the free ones and this mentor's own.
    const free = students.filter((x) => teacher.studentIds.includes(String(x._id)) || !(mentorOf[String(x._id)] || []).some((n) => n !== teacher.name));
    const taken = students.length - free.length;
    const list = free.filter((x) => !term || `${x.name} ${x.rollNo}`.toLowerCase().includes(term));
    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const save = async () => {
        setBusy(true); setError('');
        try { onDone((await teacherApi.put(`/campus/hod/mentors/${teacher._id}`, { departmentId: dept._id, studentIds: [...picked] })).data.message); }
        catch (err) { setError(messageOf(err, 'Could not save.')); setBusy(false); }
    };
    return (
        <Modal title={`${teacher.name} mentors`} onClose={onClose} wide labelId="mentor-title"
            footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="button" className={btn.primary} onClick={save} disabled={busy}>{busy ? 'Saving…' : `Save · ${picked.size}`}</button></>}>
            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll" aria-label="Search students" className={`${inputClass} sm:flex-1`} />
                    <div className="flex gap-1.5">
                        <button type="button" className={btn.ghost} onClick={() => setPicked(new Set([...picked, ...list.map((x) => String(x._id))]))}>Select shown</button>
                        <button type="button" className={btn.ghost} onClick={() => setPicked(new Set())}>Clear</button>
                    </div>
                </div>
                {taken > 0 && <p className="text-xs text-slate-500">{taken} student{taken === 1 ? ' has' : 's have'} another mentor already.</p>}
                {!list.length && <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">{term ? 'No one matches.' : 'Every student in the department has a mentor.'}</p>}
                <ul className="grid max-h-[55vh] gap-1.5 overflow-y-auto sm:grid-cols-2">
                    {list.map((x) => {
                        const id = String(x._id); const on = picked.has(id);
                        const other = (mentorOf[id] || []).filter((n) => n !== teacher.name);
                        return (
                            <li key={id}>
                                <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 ${on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300'}`}>
                                    <input type="checkbox" checked={on} onChange={() => toggle(id)} className="h-4 w-4 accent-emerald-700" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-900">{x.name}</span>
                                        <span className="block truncate font-mono text-[11px] text-slate-500">Roll {x.rollNo || '—'} · Sem {x.semester}{x.section ? ` ${x.section}` : ''}{other.length ? ` · ${other.join(', ')}` : ''}</span>
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                    {!list.length && <li className="p-3 text-sm text-slate-500">No student matches.</li>}
                </ul>
                <ErrorNote>{error}</ErrorNote>
            </div>
        </Modal>
    );
};

const Mentors = ({ dept }) => {
    const data = useHod('/mentors', { departmentId: dept._id });
    const [open, setOpen] = useState(null);
    const [note, setNote] = useState('');
    const students = data.data?.students || [];
    const teachers = data.data?.teachers || [];
    const mentorOf = {};
    teachers.forEach((t) => t.studentIds.forEach((id) => { (mentorOf[id] = mentorOf[id] || []).push(t.name); }));
    const without = students.filter((x) => !mentorOf[String(x._id)]).length;
    if (data.loading && !data.data) return <Loading label="Loading mentors…" />;
    if (data.error) return <ErrorNote onRetry={data.reload}>{data.error}</ErrorNote>;
    return (
        <div className="space-y-4">
            <OkNote>{note}</OkNote>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Card className="!p-4"><p className="text-xs font-semibold text-slate-500">Students</p><p className="text-2xl font-bold text-slate-900">{students.length}</p></Card>
                <Card className="!p-4"><p className="text-xs font-semibold text-slate-500">With a mentor</p><p className="text-2xl font-bold text-emerald-700">{students.length - without}</p></Card>
                <Card className="col-span-2 !p-4 sm:col-span-1"><p className="text-xs font-semibold text-slate-500">Without a mentor</p><p className={`text-2xl font-bold ${without ? 'text-amber-600' : 'text-slate-400'}`}>{without}</p></Card>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {teachers.map((t) => (
                    <li key={t._id}>
                        <button type="button" onClick={() => setOpen(t)} className={`group flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm ${t.studentIds.length ? 'border-emerald-200' : 'border-slate-200'}`}>
                            <TeacherAvatar teacher={{ name: t.name, profilePicture: t.picture }} className="h-10 w-10 text-sm" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold text-slate-900">{t.name}</span>
                                <span className="block text-xs text-slate-500">{t.inDepartment ? 'Teaches here' : 'Other department'}</span>
                            </span>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${t.studentIds.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{t.studentIds.length}</span>
                            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-300 group-hover:text-emerald-600" />
                        </button>
                    </li>
                ))}
            </ul>
            {open && <MentorDialog dept={dept} teacher={open} students={students} mentorOf={mentorOf} onClose={() => setOpen(null)} onDone={(m) => { setOpen(null); setNote(m); data.reload(); }} />}
        </div>
    );
};

/* ── Student Ranking: the department's marks and top three (read-only) ── */
const MEDAL = ['bg-amber-400 text-white', 'bg-slate-300 text-slate-800', 'bg-orange-300 text-orange-900'];
const Ranking = ({ dept }) => {
    const data = useHod('/ranking', { departmentId: dept._id });
    const [q, setQ] = useState('');
    if (data.loading && !data.data) return <Loading label="Loading the ranking…" />;
    if (data.error) return <ErrorNote onRetry={data.reload}>{data.error}</ErrorNote>;
    const title = data.data?.title || 'Student Ranking';
    if (!data.data?.enabled) return <Card><EmptyState icon={Orbit} title={`${title} is not on`} color="teal">Your organization has not unlocked it yet.</EmptyState></Card>;
    const all = data.data.students || [];
    const top = all.filter((x) => x.marks > 0).slice(0, 3);
    const term = q.trim().toLowerCase();
    const rows = all.filter((x) => !term || `${x.name} ${x.rollNo}`.toLowerCase().includes(term));
    const fmt = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN');
    return (
        <div className="space-y-4">
            {top.length > 0 && (
                <ol className="grid gap-3 sm:grid-cols-3">
                    {top.map((x, i) => (
                        <li key={x._id} className={`flex items-center gap-3 rounded-2xl border p-4 ${i === 0 ? 'border-amber-200 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${MEDAL[i]}`}>{i + 1}</span>
                            <TeacherAvatar teacher={{ name: x.name, profilePicture: x.picture }} className="h-10 w-10 text-xs" />
                            <span className="min-w-0 flex-1"><span className="block truncate font-semibold text-slate-900">{x.name}</span><span className="block truncate text-xs text-slate-500">Sem {x.semester}{x.section ? ` ${x.section}` : ''}</span></span>
                            <span className="shrink-0 text-right"><span className="block text-xl font-black tabular-nums text-slate-900">{fmt(x.marks)}</span><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">marks</span></span>
                        </li>
                    ))}
                </ol>
            )}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or roll" aria-label="Search students" className={`${inputClass} sm:max-w-xs`} />
            <Card className="overflow-hidden !p-0">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                        <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"><th className="px-4 py-2.5">#</th><th className="px-4 py-2.5">Student</th><th className="px-4 py-2.5">Mentor</th><th className="px-4 py-2.5 text-right">Marks</th></tr></thead>
                        <tbody>{rows.map((x) => (
                            <tr key={x._id} className="border-b border-slate-100 last:border-0">
                                <td className="px-4 py-2.5 font-bold tabular-nums text-slate-400">{all.indexOf(x) + 1}</td>
                                <td className="px-4 py-2.5"><span className="block font-semibold text-slate-900">{x.name}</span><span className="font-mono text-[11px] text-slate-500">Roll {x.rollNo || '—'} · Sem {x.semester}{x.section ? ` ${x.section}` : ''}</span></td>
                                <td className="px-4 py-2.5 text-slate-600">{x.mentors.length ? x.mentors.join(', ') : <span className="text-amber-600">No mentor</span>}{x.waiting > 0 && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{x.waiting} to check</span>}</td>
                                <td className="px-4 py-2.5 text-right text-base font-bold tabular-nums text-slate-900">{fmt(x.marks)}</td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

/* ── Teachers (read-only): who teaches in the department, and what ─────── */
const Teachers = ({ dept }) => {
    const list = useHod('/teachers', { departmentId: dept._id });
    const [open, setOpen] = useState(null);
    const rows = list.data?.teachers || [];
    if (list.loading && !list.data) return <Loading label="Loading teachers…" />;
    if (list.error) return <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote>;
    if (!rows.length) return <Card><EmptyState icon={Users} title="No teachers yet" color="emerald">Teachers appear here once you assign them to subjects in the Subjects tab.</EmptyState></Card>;
    return (
        <>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((t) => (
                    <li key={t._id}>
                        <button type="button" onClick={() => setOpen(t)} aria-label={`${t.name}: more details`}
                            className={`group flex w-full items-center gap-3 rounded-xl border bg-white p-3 text-left transition hover:border-emerald-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${t.hod ? 'border-amber-200' : 'border-slate-200'}`}>
                            <TeacherAvatar teacher={{ name: t.name, profilePicture: t.picture }} className="h-10 w-10 text-sm" />
                            <span className="min-w-0 flex-1 truncate font-semibold text-slate-900">{t.name}</span>
                            {t.hod && <span className="shrink-0 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">HOD</span>}
                            <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-slate-300 group-hover:text-emerald-600" />
                        </button>
                    </li>
                ))}
            </ul>
            {open && (
                <Modal title={open.name} onClose={() => setOpen(null)} labelId="hod-teacher-title" footer={<button type="button" className={btn.secondary} onClick={() => setOpen(null)}>Close</button>}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <TeacherAvatar teacher={{ name: open.name, profilePicture: open.picture }} className="h-14 w-14 text-lg" />
                            <div className="min-w-0">
                                <p className="flex items-center gap-1.5 font-semibold text-slate-900">{open.name}{open.hod && <span className="rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">HOD</span>}</p>
                                <p className="text-sm text-slate-500">{open.designation && open.designation !== 'HOD' ? open.designation : open.hod ? 'Head of department' : 'Teacher'}</p>
                            </div>
                        </div>
                        <div className="space-y-1.5 rounded-xl border border-slate-200 p-3 text-sm">
                            {open.email ? <a href={`mailto:${open.email}`} className="flex items-center gap-2 text-slate-700 hover:text-emerald-700"><Mail size={14} className="shrink-0 text-slate-400" /><span className="truncate">{open.email}</span></a> : null}
                            {open.phone ? <a href={`tel:${open.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-emerald-700"><Phone size={14} className="shrink-0 text-slate-400" />{open.phone}</a> : null}
                            {!open.email && !open.phone && <p className="text-slate-400">No contact details.</p>}
                        </div>
                        <div>
                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Subjects</p>
                            {open.subjects.length ? <ul className="flex flex-wrap gap-1.5">{open.subjects.map((x) => <li key={x._id} className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">{x.code ? `${x.code} · ` : ''}{x.name} <span className="font-normal text-emerald-600">Sem {x.semester}</span></li>)}</ul>
                                : <p className="text-sm text-slate-400">No subjects yet</p>}
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};

/* ── Subjects ───────────────────────────────────────────────────────────── */
const SubjectDialog = ({ dept, subject, semester, teachers, onClose, onDone }) => {
    const [f, setF] = useState({ semester: subject?.semester || semester || 1, code: subject?.code || '', name: subject?.name || '', credits: subject?.credits ?? 4, kind: subject?.kind || 'theory', teacherIds: (subject?.teacherIds || []).map(String) });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const toggle = (id) => setF({ ...f, teacherIds: f.teacherIds.includes(id) ? f.teacherIds.filter((x) => x !== id) : [...f.teacherIds, id] });
    const submit = async (e) => {
        e.preventDefault(); setBusy(true); setError('');
        try {
            const body = { ...f, departmentId: dept._id, credits: Number(f.credits) };
            onDone((subject ? await teacherApi.put(`/campus/hod/subjects/${subject._id}`, body) : await teacherApi.post('/campus/hod/subjects', body)).data.message);
        } catch (err) { setError(messageOf(err, 'The subject could not be saved.')); setBusy(false); }
    };
    const list = teachers.filter((t) => !q.trim() || `${t.name} ${t.email || ''} ${t.department || ''}`.toLowerCase().includes(q.trim().toLowerCase()));
    return (
        <Modal title={subject ? `Edit ${subject.name}` : 'Add a subject'} onClose={onClose} wide labelId="hod-subject-title"
            footer={<><button type="button" className={btn.secondary} onClick={onClose}>Cancel</button><button type="submit" form="hod-subject" className={btn.primary} disabled={busy}>{busy ? 'Saving…' : subject ? 'Save' : 'Add subject'}</button></>}>
            <form id="hod-subject" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><Field id="s-name" label="Subject name"><input id="s-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={120} placeholder="Data Structures" className={inputClass} /></Field></div>
                <Field id="s-code" label="Code" optional><input id="s-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} maxLength={20} placeholder="CS201" className={`${inputClass} font-mono uppercase`} /></Field>
                <Field id="s-sem" label="Semester / grade"><Select tone="emerald" id="s-sem" value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })} className={`${selectClass} w-full`}>{Array.from({ length: dept.semesters || 0 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                <Field id="s-cr" label="Credits"><input id="s-cr" type="number" min={0} max={20} step="0.5" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} className={inputClass} /></Field>
                <Field id="s-kind" label="Type"><Select tone="emerald" id="s-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={`${selectClass} w-full`}><option value="theory">Theory</option><option value="practical">Practical / lab</option></Select></Field>
                <div className="sm:col-span-2">
                    <div className="mb-1.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="text-sm font-medium text-slate-700">Taught by <span className="font-normal text-slate-400">({f.teacherIds.length} chosen)</span></span>
                        {teachers.length > 6 && <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search teachers" aria-label="Search teachers" className={`${inputClass} !w-full !py-1.5 sm:!w-48`} />}</div>
                    {teachers.length ? (
                        <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
                            {list.map((t) => {
                                const on = f.teacherIds.includes(String(t._id));
                                return (
                                    <label key={t._id} className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm ${on ? 'bg-emerald-50 text-emerald-900' : 'hover:bg-slate-50'}`}>
                                        <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={on} onChange={() => toggle(String(t._id))} />
                                        <span className="min-w-0"><span className="block truncate font-medium">{t.name}</span><span className="block truncate text-xs text-slate-500">{[t.designation, t.department].filter(Boolean).join(' · ') || t.email}</span></span>
                                    </label>
                                );
                            })}
                            {!list.length && <p className="p-2 text-sm text-slate-500">No teacher matches “{q}”.</p>}
                        </div>
                    ) : <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">No teachers in your organization yet.</p>}
                    <p className="mt-1 text-xs text-slate-500">They take attendance for this subject from their own Attendance page.</p>
                </div>
                {error && <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>}
            </form>
        </Modal>
    );
};

const Subjects = ({ dept }) => {
    const list = useHod('/subjects', { departmentId: dept._id });
    const [editing, setEditing] = useState(null);   // { subject?, semester? }
    const [note, setNote] = useState({ ok: '', error: '' });
    const subjects = list.data?.subjects || [];
    const teachers = list.data?.teachers || [];
    const done = (m) => { setEditing(null); setNote({ ok: m, error: '' }); list.reload(); };
    const remove = async (sub) => {
        if (!window.confirm(`Remove ${sub.name}? It leaves the timetable. Attendance already taken stays on students’ records.`)) return;
        try { done((await teacherApi.delete(`/campus/hod/subjects/${sub._id}`, { params: { departmentId: dept._id } })).data.message); }
        catch (err) { setNote({ ok: '', error: messageOf(err, 'The subject could not be removed.') }); }
    };
    return (
        <div className="space-y-4">
            <OkNote>{note.ok}</OkNote>
            <ErrorNote>{note.error}</ErrorNote>
            {list.loading && !list.data ? <Loading label="Loading subjects…" /> : list.error ? <ErrorNote onRetry={list.reload}>{list.error}</ErrorNote> : (
                Array.from({ length: dept.semesters || 0 }, (_, i) => i + 1).map((n) => {
                    const rows = subjects.filter((x) => x.semester === n);
                    const credits = rows.reduce((t, x) => t + (x.credits || 0), 0);
                    return (
                        <Card key={n} className="overflow-hidden !p-0">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                                <h3 className="min-w-0 text-sm font-bold text-slate-900">Semester {n} <span className="ml-1 block text-xs font-normal text-slate-500 sm:inline">{rows.length ? `${rows.length} subject${rows.length === 1 ? '' : 's'} · ${credits} credits` : 'No subjects yet'}</span></h3>
                                <button type="button" className={btn.ghost} onClick={() => setEditing({ semester: n })}><Plus size={13} /> Add</button>
                            </div>
                            {rows.length > 0 && (
                                <ul className="divide-y divide-slate-100">
                                    {rows.map((x) => (
                                        <li key={x._id} className="flex items-start gap-3 px-4 py-3 sm:items-center">
                                            <span className="hidden w-20 shrink-0 font-mono text-xs font-semibold text-amber-700 sm:block">{x.code || '—'}</span>
                                            <span className="min-w-0 flex-1">
                                                {x.code && <span className="block font-mono text-[11px] font-semibold text-amber-700 sm:hidden">{x.code}</span>}
                                                <span className="block font-semibold text-slate-900">{x.name}</span>
                                                <span className="block text-xs text-slate-500">{x.credits} credits · {x.kind === 'practical' ? 'Practical' : 'Theory'}</span>
                                                <span className="mt-1 flex flex-wrap gap-1">{x.teachers?.length ? x.teachers.map((t) => <span key={t._id} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">{t.name}</span>) : <span className="text-xs font-semibold text-amber-700">No teacher yet</span>}</span>
                                            </span>
                                            <span className="flex shrink-0 gap-0.5">
                                                <button type="button" className={btn.ghost} onClick={() => setEditing({ subject: x })} aria-label={`Edit ${x.name}`}><Pencil size={14} /><span className="hidden sm:inline"> Edit</span></button>
                                                <button type="button" className={`${btn.ghost} hover:text-red-600`} onClick={() => remove(x)} aria-label={`Remove ${x.name}`}><Trash2 size={14} /></button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    );
                })
            )}
            {editing && <SubjectDialog dept={dept} subject={editing.subject} semester={editing.semester} teachers={teachers} onClose={() => setEditing(null)} onDone={done} />}
        </div>
    );
};

/* ── Timetable ──────────────────────────────────────────────────────────── */
const Timetable = ({ dept }) => {
    const [semester, setSemester] = useState(1);
    const [section, setSection] = useState(dept.sections?.length > 1 ? dept.sections[0] : '');
    const tt = useHod('/timetable', { departmentId: dept._id, semester, section });
    const subjects = useMemo(() => tt.data?.subjects || [], [tt.data]);
    const tint = (id) => TINTS[Math.max(0, subjects.findIndex((s) => s._id === id)) % TINTS.length];
    const [periods, setPeriods] = useState(defaultPeriods());
    const [slots, setSlots] = useState({});
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState({ ok: '', error: '' });
    const [day, setDay] = useState(() => { const d = new Date(Date.now() + 5.5 * 3600e3).getUTCDay(); return d >= 1 && d <= 6 ? d : 1; });
    useEffect(() => {
        if (!tt.data) return;
        const t = tt.data.timetable;
        setPeriods(t?.periods?.length ? t.periods.map((p) => ({ start: p.start || '', end: p.end || '' })) : defaultPeriods());
        setSlots(Object.fromEntries((t?.slots || []).map((x) => [`${x.day}-${x.p}`, { subjectId: String(x.subjectId), room: x.room || '' }])));
        setDirty(false);
    }, [tt.data]);
    const change = (fn) => { fn(); setDirty(true); setNote({ ok: '', error: '' }); };
    const setSlot = (key, v) => change(() => setSlots((s) => { const n = { ...s }; if (!v.subjectId) delete n[key]; else n[key] = v; return n; }));
    const setTime = (i, k, v) => change(() => setPeriods((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: v } : p))));
    const addPeriod = () => change(() => setPeriods((ps) => { const [h, m] = (ps[ps.length - 1]?.end || '15:00').split(':').map(Number); const s = h * 60 + m + 5; return [...ps, { start: clock(s), end: clock(s + 50) }].slice(0, 12); }));
    const removePeriod = () => change(() => { const n = periods.length; setPeriods((ps) => ps.slice(0, -1)); setSlots((s) => Object.fromEntries(Object.entries(s).filter(([k]) => Number(k.split('-')[1]) < n))); });
    const save = async () => {
        setSaving(true); setNote({ ok: '', error: '' });
        try {
            const body = { departmentId: dept._id, semester, section, periods, slots: Object.entries(slots).map(([k, v]) => { const [day, p] = k.split('-').map(Number); return { day, p, ...v }; }) };
            setNote({ ok: (await teacherApi.put('/campus/hod/timetable', body)).data.message, error: '' }); setDirty(false); tt.reload();
        } catch (err) { setNote({ ok: '', error: messageOf(err, 'The timetable could not be saved.') }); } finally { setSaving(false); }
    };
    const filled = Object.keys(slots).length;
    return (
        <>
            <Card className="mb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Semester</span>
                        <Select tone="emerald" value={semester} onChange={(e) => setSemester(Number(e.target.value))} className={`${selectClass} w-full sm:w-40`}>{Array.from({ length: dept.semesters || 0 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></label>
                    {dept.sections?.length > 1 && <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Section</span>
                        <Select tone="emerald" value={section} onChange={(e) => setSection(e.target.value)} className={`${selectClass} w-full sm:w-32`}>{dept.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></label>}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                    <span className="text-xs font-semibold text-slate-500">Periods a day</span>
                    <button type="button" className={`${btn.secondary} !px-2.5`} onClick={removePeriod} disabled={periods.length <= 1} aria-label="One period fewer"><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{periods.length}</span>
                    <button type="button" className={`${btn.secondary} !px-2.5`} onClick={addPeriod} disabled={periods.length >= 12} aria-label="One period more"><Plus size={14} /></button>
                    <button type="button" className={btn.ghost} onClick={() => { if (window.confirm('Clear every period? Nothing changes for students until you save.')) change(() => setSlots({})); }} disabled={!filled}><Eraser size={14} /> Clear</button>
                    <button type="button" className={`${btn.primary} w-full sm:ml-auto sm:w-auto`} onClick={save} disabled={saving || !dirty || !tt.data}><Save size={15} /> {saving ? 'Saving…' : 'Save timetable'}</button>
                </div>
            </Card>
            <OkNote>{note.ok}</OkNote>
            <ErrorNote>{note.error}</ErrorNote>
            {tt.loading && !tt.data ? <Loading label="Loading the timetable…" /> : tt.error ? <ErrorNote onRetry={tt.reload}>{tt.error}</ErrorNote> : !subjects.length ? (
                <Card><EmptyState icon={CalendarRange} title={`No subjects in semester ${semester} yet`} color="amber">Add them in the Subjects tab first; then place them in the week here.</EmptyState></Card>
            ) : (
                <>
                {/* Phones: one day at a time, its periods listed down the page. */}
                <div className="space-y-3 sm:hidden">
                    <div role="tablist" aria-label="Day" className="grid grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                        {DAYS.map(([d, short]) => {
                            const n = periods.filter((_, i) => slots[`${d}-${i + 1}`]).length;
                            return (
                                <button key={d} type="button" role="tab" aria-selected={day === d} onClick={() => setDay(d)}
                                    className={`flex flex-col items-center rounded-lg py-1.5 text-xs font-bold transition ${day === d ? 'bg-emerald-700 text-white' : 'text-slate-600'}`}>
                                    {short}<span className={`text-[10px] font-semibold ${day === d ? 'text-emerald-100' : 'text-slate-400'}`}>{n}/{periods.length}</span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="px-1 text-xs text-slate-500">{DAYS.find(([d]) => d === day)?.[2]} · Semester {semester}{section ? ` · Section ${section}` : ''}{dirty ? ' · unsaved changes' : ''}</p>
                    <ul className="space-y-2">
                        {periods.map((p, i) => {
                            const key = `${day}-${i + 1}`; const v = slots[key];
                            return (
                                <li key={key} className={`rounded-xl p-3 ring-1 ${v ? tint(v.subjectId) : 'bg-white ring-slate-200'}`}>
                                    <div className="mb-2 flex items-center gap-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Period {i + 1}</span>
                                        <span className="ml-auto flex items-center gap-1">
                                            <input type="time" value={p.start} onChange={(e) => setTime(i, 'start', e.target.value)} aria-label={`Period ${i + 1} starts`} className="h-8 w-[5.6rem] rounded-md border border-slate-300 bg-white px-1 text-xs tabular-nums" />
                                            <span className="text-slate-400">–</span>
                                            <input type="time" value={p.end} onChange={(e) => setTime(i, 'end', e.target.value)} aria-label={`Period ${i + 1} ends`} className="h-8 w-[5.6rem] rounded-md border border-slate-300 bg-white px-1 text-xs tabular-nums" />
                                        </span>
                                    </div>
                                    <Select tone="emerald" value={v?.subjectId || ''} onChange={(e) => setSlot(key, { subjectId: e.target.value, room: v?.room || '' })} aria-label={`Period ${i + 1} subject`} className={`${selectClass} w-full`}>
                                        <option value="">— Free —</option>
                                        {subjects.map((x) => <option key={x._id} value={x._id}>{x.code ? `${x.code} · ` : ''}{x.name}</option>)}
                                    </Select>
                                    {v && <input value={v.room} onChange={(e) => setSlot(key, { ...v, room: e.target.value })} placeholder="Room (optional)" maxLength={30} aria-label={`Period ${i + 1} room`} className={`${inputClass} mt-2`} />}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <Card className="hidden overflow-hidden !p-0 sm:block">
                    <p className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600"><b className="text-slate-900">Semester {semester}{section ? ` · Section ${section}` : ''}</b> · {filled} of {periods.length * 6} periods set{dirty ? ' · unsaved changes' : tt.data?.timetable ? '' : ' · not saved yet'}</p>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm" style={{ minWidth: `${110 + periods.length * 150}px` }}>
                            <thead><tr>
                                <th className="sticky left-0 z-10 w-20 border-b border-r border-slate-200 bg-white px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Day</th>
                                {periods.map((p, i) => (
                                    <th key={i} className="border-b border-slate-200 px-2 py-2 text-left align-top">
                                        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Period {i + 1}</span>
                                        <span className="mt-1 flex items-center gap-1">
                                            <input type="time" value={p.start} onChange={(e) => setTime(i, 'start', e.target.value)} aria-label={`Period ${i + 1} starts`} className="h-8 w-full min-w-0 rounded-md border border-slate-300 px-1 text-xs tabular-nums" />
                                            <span className="text-slate-400">–</span>
                                            <input type="time" value={p.end} onChange={(e) => setTime(i, 'end', e.target.value)} aria-label={`Period ${i + 1} ends`} className="h-8 w-full min-w-0 rounded-md border border-slate-300 px-1 text-xs tabular-nums" />
                                        </span>
                                    </th>
                                ))}
                            </tr></thead>
                            <tbody>{DAYS.map(([d, short, long]) => (
                                <tr key={d}>
                                    <th scope="row" className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 text-left font-semibold text-slate-800"><abbr title={long} className="no-underline">{short}</abbr></th>
                                    {periods.map((_, i) => {
                                        const key = `${d}-${i + 1}`; const v = slots[key];
                                        return (
                                            <td key={key} className="border-b border-slate-100 p-1.5 align-top">
                                                <div className={`rounded-lg p-1.5 ring-1 ${v ? tint(v.subjectId) : 'bg-white ring-slate-200 hover:ring-emerald-300'}`}>
                                                    <Select tone="emerald" value={v?.subjectId || ''} onChange={(e) => setSlot(key, { subjectId: e.target.value, room: v?.room || '' })} aria-label={`${long}, period ${i + 1}`} className="w-full cursor-pointer bg-transparent text-xs font-semibold focus:outline-none">
                                                        <option value="">— Free —</option>
                                                        {subjects.map((s) => <option key={s._id} value={s._id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>)}
                                                    </Select>
                                                    {v && <input value={v.room} onChange={(e) => setSlot(key, { ...v, room: e.target.value })} placeholder="Room" maxLength={30} aria-label={`${long}, period ${i + 1} room`} className="mt-1 h-6 w-full rounded bg-white/70 px-1.5 text-[11px] focus:outline-none" />}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </Card>
                </>
            )}
        </>
    );
};

export default function Department() {
    const [info, setInfo] = useState({ loading: true, depts: [], error: '' });
    useEffect(() => {
        let live = true;
        teacherApi.get('/campus').then((r) => { if (live) setInfo({ loading: false, depts: r.data?.hodOf || [], error: '' }); })
            .catch((err) => { if (live) setInfo({ loading: false, depts: [], error: messageOf(err, 'Could not load your department.') }); });
        return () => { live = false; };
    }, []);
    const [deptId, setDeptId] = useState('');
    // Each part is its own item in the sidebar's Department section (2026-11-14): /teacher/department/:part.
    const tab = useParams().part || 'subjects';
    const dept = info.depts.find((d) => d._id === deptId) || info.depts[0];
    const TABS = [['subjects', 'Subjects', BookOpen, 'from-emerald-400 to-teal-600'], ['attendance', 'Attendance', CalendarCheck, 'from-teal-400 to-emerald-600'], ['timetable', 'Timetable', CalendarRange, 'from-sky-400 to-blue-600'], ['announcements', 'Announcements', Megaphone, 'from-amber-400 to-orange-500'], ['students', 'Students', GraduationCap, 'from-indigo-400 to-violet-600'], ['teachers', 'Teachers', Users, 'from-rose-400 to-pink-600'], ['mentors', 'Mentors', Orbit, 'from-cyan-400 to-sky-600'], ['ranking', 'Student Ranking', Trophy, 'from-amber-400 to-orange-500']];
    // Only attendance is open (2026-11-14), with the subjects and teachers it needs; the rest is locked.
    const LOCKED = {};
    return (
        <div className="space-y-5">
            <PageHeader icon={Megaphone} color="amber" title="My department" subtitle={dept ? `${dept.name} · Head of department. Run its subjects and teachers, timetable and announcements.` : 'For the head of a department.'}
                actions={info.depts.length > 1 && <Select tone="emerald" value={dept?._id || ''} onChange={(e) => setDeptId(e.target.value)} className={`${selectClass} w-full sm:w-56`} aria-label="Department">{info.depts.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select>} />
            {info.loading ? <Loading label="Loading your department…" /> : info.error ? <ErrorNote>{info.error}</ErrorNote> : !dept ? (
                <Card><EmptyState icon={Megaphone} title="You are not a head of department" color="amber">Your organization chooses the head of each department in Campus → Departments.</EmptyState></Card>
            ) : (
                <>
                    {LOCKED[tab] ? (
                        // Locked for now, but shown whole (2026-11-14): the real page, greyed, under a lock.
                        tab === 'timetable' ? <LockedPreview title="Timetable"><Timetable key={dept._id} dept={dept} /></LockedPreview>
                            : tab === 'announcements' ? <LockedPreview title="Announcements"><Announcements key={dept._id} dept={dept} /></LockedPreview>
                                : tab === 'teachers' ? <LockedPreview title="Teachers"><Teachers key={dept._id} dept={dept} /></LockedPreview>
                                    : <Card><LockedPage icon={TABS.find((t) => t[0] === tab)?.[2]} title={TABS.find((t) => t[0] === tab)?.[1]} text={LOCKED[tab]} /></Card>
                    ) : tab === 'attendance' ? <Students key={`a-${dept._id}`} dept={dept} view="attendance" /> : tab === 'mentors' ? <Mentors key={`m-${dept._id}`} dept={dept} /> : tab === 'ranking' ? <Ranking key={`r-${dept._id}`} dept={dept} /> : tab === 'students' ? <Students key={dept._id} dept={dept} /> : tab === 'teachers' ? <Teachers key={dept._id} dept={dept} /> : tab === 'subjects' ? <Subjects key={dept._id} dept={dept} /> : tab === 'announcements' ? <Announcements key={dept._id} dept={dept} /> : <Timetable key={dept._id} dept={dept} />}
                </>
            )}
        </div>
    );
}
