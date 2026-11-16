/**
 * Attendance (Campus, 2026-11-13) — the subject teacher takes attendance here,
 * in their own teacher dashboard, for the subjects their department gave them
 * (Campus → Subjects → Taught by). Choose the subject, section, day and
 * period; the class shows as roll-number tiles, everyone present; tap the
 * absentees and save. A period already taken opens as it was, to correct.
 * Report: each student's percentage in the subject (below 75% is a shortage).
 * Internal marks are coming soon.
 * Server: /api/teacher/campus (yaticorp-lms-server/src/campus/orgAdmin.js, `teacher`).
 */
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, Save, UserX, RotateCcw, BarChart3, ClipboardList, Lock, Megaphone, Pin } from 'lucide-react';
import Select from '../../components/Select';
import { LockChip, LockedPreview } from '../../campus/Locked';
import { SOON } from '../../campus/soon';
import teacherApi, { messageOf } from '../teacherSession';
import { PageHeader, Card, EmptyState, Loading, ErrorNote, OkNote } from '../ui';
import { btn, selectClass, inputClass, fmtAgo } from '../kit';

const PERIODS = Array.from({ length: 12 }, (_, i) => i + 1);   // as many as a timetable allows
const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
const tone = (p) => (p === null || p === undefined ? 'text-slate-400' : p < 75 ? 'text-rose-600' : p < 85 ? 'text-amber-600' : 'text-emerald-700');
const bar = (p) => (p === null || p === undefined ? 'bg-slate-200' : p < 75 ? 'bg-rose-500' : p < 85 ? 'bg-amber-500' : 'bg-emerald-500');
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const label = (s) => `${s.code ? `${s.code} · ` : ''}${s.name} — ${s.department?.code || s.department?.name || ''} Sem ${s.semester}`;

/** GET `path` under /campus with `params`: { data, error, loading, reload }. */
const useCampus = (path, params) => {
    const [state, setState] = useState({ data: null, error: '', loading: Boolean(path) });
    const key = path ? `${path}?${JSON.stringify(params || {})}` : '';
    const [tick, setTick] = useState(0);
    useEffect(() => {
        if (!path) return undefined;
        let live = true;
        setState((s) => ({ ...s, loading: true, error: '' }));
        teacherApi.get(`/campus${path}`, { params }).then((r) => { if (live) setState({ data: r.data, error: '', loading: false }); })
            .catch((err) => { if (live) setState({ data: null, error: messageOf(err, 'Could not load this.'), code: err.response?.data?.code, loading: false }); });
        return () => { live = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, tick]);
    return { ...state, reload: () => setTick((t) => t + 1) };
};

// A student's mark in the register: tap cycles present → absent → excused (leave granted) → present.
const NEXT = { present: 'absent', absent: 'excused', excused: 'present' };
const LOOK = {
    present: { tile: 'border-slate-200 bg-white hover:border-emerald-300', roll: 'text-emerald-700', name: 'text-slate-800', chip: 'bg-emerald-50 text-emerald-700', letter: 'P' },
    absent: { tile: 'border-rose-300 bg-rose-50', roll: 'text-rose-700', name: 'text-rose-900 line-through decoration-rose-300', chip: 'bg-rose-600 text-white', letter: 'A' },
    excused: { tile: 'border-sky-300 bg-sky-50', roll: 'text-sky-700', name: 'text-sky-900', chip: 'bg-sky-600 text-white', letter: 'E' }
};

const Register = ({ subject, today }) => {
    const sections = subject.department?.sections || [];
    // Nothing chosen at first (2026-11-14): the class shows once the section (if more than one) and the period are picked.
    const [section, setSection] = useState('');
    const date = today;   // teachers mark today's attendance only
    const [period, setPeriod] = useState(null);
    useEffect(() => { setSection(''); setPeriod(null); }, [subject._id]);
    const ready = Boolean(period) && (sections.length < 2 || Boolean(section));
    const session = useCampus(ready ? '/attendance/session' : null, { subjectId: subject._id, date, period, section });
    const [marks, setMarks] = useState({});           // id → 'absent' | 'excused' (everyone else present)
    const [remedial, setRemedial] = useState(false);   // an extra class: makes up for missed ones
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [note, setNote] = useState({ ok: '', error: '' });
    useEffect(() => {
        if (!session.data) return;
        setMarks(Object.fromEntries(session.data.students.filter((s) => s.status === 'absent' || s.status === 'excused').map((s) => [s._id, s.status])));
        setRemedial(Boolean(session.data.remedial));
        setDirty(false);
    }, [session.data]);
    const students = session.data?.students || [];
    const taken = session.data?.taken;
    const marked = session.data?.markedPeriods || [];
    const heldBy = session.data?.heldBy || {};
    const busy = heldBy[period];
    const stateOf = (id) => marks[id] || 'present';
    const set = (id, v) => { setDirty(true); setMarks((m) => { const n = { ...m }; if (v === 'present') delete n[id]; else n[id] = v; return n; }); };
    const ids = (v) => Object.keys(marks).filter((k) => marks[k] === v);
    const nAbsent = ids('absent').length; const nExcused = ids('excused').length;
    // Saved (2026-11-14): a popup says so, and the button stays "Saved ✓" — dimmed — until something changes.
    const [saved, setSaved] = useState(false);
    const [toast, setToast] = useState('');
    useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t); }, [toast]);
    useEffect(() => { if (dirty) setSaved(false); }, [dirty]);
    useEffect(() => { setSaved(false); }, [period, section, subject._id]);
    const save = async () => {
        if (saving || saved || !dirty && taken) return;
        setSaving(true); setNote({ ok: '', error: '' });
        try {
            const r = await teacherApi.put('/campus/attendance/session', { subjectId: subject._id, date, period, section, absent: ids('absent'), excused: ids('excused'), remedial });
            setNote({ ok: '', error: '' }); setDirty(false); setSaved(true); setToast(r.data.message); session.reload();
        } catch (err) { setNote({ ok: '', error: messageOf(err, 'Attendance could not be saved.') }); }
        finally { setSaving(false); }
    };
    const notPresent = students.filter((s) => stateOf(s._id) !== 'present');

    return (
        <>
            <Card className="mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr] lg:grid-cols-[160px_180px_1fr_auto]">
                {sections.length > 1 && (
                    <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Section</span>
                        <Select tone="emerald" value={section} onChange={(e) => setSection(e.target.value)} className={`${selectClass} w-full`}><option value="" disabled>Choose the section</option>{sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select>
                    </label>
                )}
                <label className="block"><span className="mb-1 block text-xs font-semibold text-slate-500">Date</span>
                    <div aria-readonly="true" className={`${inputClass} flex items-center bg-slate-50 font-semibold text-slate-700`}>{new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · Today</div>
                </label>
                <div className="sm:col-span-2 lg:col-span-1">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Period</span>
                    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Period">
                        {PERIODS.map((p) => (
                            <button key={p} type="button" role="radio" aria-checked={p === period} onClick={() => setPeriod(p)} title={heldBy[p] ? `Taken by ${heldBy[p]}` : undefined}
                                className={`relative h-9 min-w-10 rounded-lg border px-2.5 text-sm font-semibold transition ${p === period ? (heldBy[p] ? 'border-slate-400 bg-slate-400 text-white' : 'border-emerald-700 bg-emerald-700 text-white') : heldBy[p] ? 'border-slate-200 bg-slate-100 text-slate-400 line-through' : 'border-slate-300 bg-white text-slate-600 hover:border-emerald-300'}`}>
                                {p}{marked.includes(p) && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-white" title="Taken"><Check size={10} strokeWidth={3} /></span>}
                            </button>
                        ))}
                    </div>
                </div>
                <label className={`flex cursor-pointer items-start gap-2.5 self-end rounded-lg border px-3 py-2 transition sm:col-span-2 lg:col-span-1 ${remedial ? 'border-violet-400 bg-violet-50' : 'border-slate-300 hover:border-violet-300'}`}>
                    <input type="checkbox" checked={remedial} onChange={(e) => { setRemedial(e.target.checked); setDirty(true); }} className="mt-0.5 h-4 w-4 accent-violet-600" />
                    <span><span className="block text-sm font-semibold text-slate-800">Remedial class</span><span className="block text-xs text-slate-500">Extra class; makes up for missed ones</span></span>
                </label>
            </Card>

            {busy && <ErrorNote>Period {period} is already marked for {busy}. Choose another period.</ErrorNote>}
            <OkNote>{note.ok}</OkNote>
            <ErrorNote>{note.error}</ErrorNote>

            {!ready ? (
                <Card className="p-6"><EmptyState icon={CalendarCheck} title={sections.length > 1 && !section ? 'Choose the section and period' : 'Choose the period'} color="emerald">The class list opens once you pick {sections.length > 1 && !section ? 'them' : 'it'}.</EmptyState></Card>
            ) : session.loading && !session.data ? <Loading label="Loading the class…" /> : session.error ? <ErrorNote onRetry={session.reload}>{session.error}</ErrorNote> : !students.length ? (
                <Card className="p-6"><EmptyState icon={CalendarCheck} title="No students in this class yet" color="emerald">Students appear once the admission office admits them to semester {subject.semester}{section ? `, section ${section}` : ''}.</EmptyState></Card>
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${taken ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'}`}>{taken ? 'Taken — editing' : 'New'}</span>
                            {remedial && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">Remedial</span>}
                            <span>Tap a student: <b className="text-rose-700">A</b> absent → <b className="text-sky-700">E</b> excused (leave) → <b className="text-emerald-700">P</b> present.</span>
                        </p>
                        <button type="button" className={btn.ghost} onClick={() => { setMarks({}); setDirty(true); }}><RotateCcw size={14} /> All present</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {students.map((s) => {
                            const st = stateOf(s._id); const L = LOOK[st];
                            return (
                                <button key={s._id} type="button" onClick={() => set(s._id, NEXT[st])} aria-label={`${s.name}, ${st}. Tap to mark ${NEXT[st]}.`}
                                    className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition active:scale-[.98] ${L.tile}`}>
                                    {s.picture
                                        ? <img src={s.picture} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                                        : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{initials(s.name)}</span>}
                                    <span className="min-w-0 flex-1">
                                        <span className={`block font-mono text-[11px] font-semibold ${L.roll}`}>{s.rollNo || '—'}</span>
                                        <span className={`block truncate text-[13px] font-medium ${L.name}`}>{s.name}</span>
                                    </span>
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${L.chip}`}>{L.letter}</span>
                                </button>
                            );
                        })}
                    </div>
                    <Card className="mt-4 min-w-0 overflow-hidden p-4">
                        <div className={`flex items-center justify-between gap-2 ${notPresent.length ? 'mb-3' : ''}`}>
                            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><UserX size={16} className="text-rose-600" /> Absent &amp; excused</h3>
                            <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${notPresent.length ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{notPresent.length} of {students.length}</span>
                        </div>
                        {notPresent.length ? (
                            <ol className="grid min-w-0 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                                {notPresent.map((s, i) => {
                                    const ex = stateOf(s._id) === 'excused';
                                    return (
                                        <li key={s._id} className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${ex ? 'border-sky-100 bg-sky-50/60' : 'border-rose-100 bg-rose-50/60'}`}>
                                            <span className={`shrink-0 text-xs font-semibold tabular-nums ${ex ? 'text-sky-400' : 'text-rose-400'}`}>{i + 1}.</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-medium text-slate-800">{s.name}</span>
                                                <span className={`block font-mono text-[11px] font-semibold ${ex ? 'text-sky-700' : 'text-rose-700'}`}>{s.rollNo || '—'}</span>
                                            </span>
                                            <button type="button" onClick={() => set(s._id, ex ? 'absent' : 'excused')} className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${ex ? 'bg-sky-100 text-sky-800 hover:bg-sky-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`} title={ex ? 'Excused — tap to make absent' : 'Absent — tap to excuse'}>{ex ? 'Excused' : 'Absent'}</button>
                                            <button type="button" onClick={() => set(s._id, 'present')} className="shrink-0 rounded-md px-1.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50" aria-label={`Mark ${s.name} present`}>Present</button>
                                        </li>
                                    );
                                })}
                            </ol>
                        ) : null}
                    </Card>
                    <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mt-4 lg:bottom-4">
                        <Card className="flex flex-nowrap items-center justify-between gap-2 !px-3 !py-2 shadow-lg sm:gap-3 sm:!px-4 sm:!py-3">
                            <p className="flex min-w-0 items-center gap-x-3 text-xs text-slate-600 sm:gap-x-4 sm:text-sm">
                                <span className="whitespace-nowrap"><b className="text-base text-emerald-700 sm:text-lg">{students.length - nAbsent - nExcused}</b> <span className="hidden min-[400px]:inline">present</span><span className="min-[400px]:hidden">P</span></span>
                                <span className="flex items-center gap-1 whitespace-nowrap"><UserX size={14} className="text-rose-600" /><b className="text-base text-rose-700 sm:text-lg">{nAbsent}</b> <span className="hidden min-[400px]:inline">absent</span><span className="min-[400px]:hidden">A</span></span>
                                {nExcused > 0 && <span className="whitespace-nowrap"><b className="text-base text-sky-700 sm:text-lg">{nExcused}</b> <span className="hidden min-[400px]:inline">excused</span><span className="min-[400px]:hidden">E</span></span>}
                                <span className="hidden sm:inline">· period {period}{remedial ? ' (remedial)' : ''}, {date === today ? 'today' : date}</span>
                            </p>
                            {(saved || (taken && !dirty)) && !saving ? (
                                <span role="status" className="inline-flex shrink-0 cursor-default items-center gap-1.5 rounded-lg bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200"><Check size={15} strokeWidth={3} /> Saved</span>
                            ) : (
                                <button type="button" className={`${btn.primary} shrink-0`} onClick={save} disabled={saving || !!busy}><Save size={15} /> {saving ? 'Saving…' : taken ? 'Save changes' : 'Save'}</button>
                            )}
                        </Card>
                    </div>
                </>
            )}
            {toast && (
                <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-[120] flex justify-center px-4 lg:bottom-8">
                    <div className="flex max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500"><Check size={16} strokeWidth={3} /></span>
                        <span>{toast}</span>
                        <button type="button" onClick={() => setToast('')} aria-label="Close" className="ml-1 rounded p-1 text-white/60 hover:text-white"><span aria-hidden="true">✕</span></button>
                    </div>
                </div>
            )}
        </>
    );
};

const Report = ({ subject }) => {
    const sections = subject.department?.sections || [];
    const [section, setSection] = useState('');
    const { data, loading, error, reload } = useCampus('/attendance/report', { subjectId: subject._id, section });
    const rows = data?.students || [];
    const short = rows.filter((r) => r.percent !== null && r.percent < 75).length;
    return (
        <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
                {sections.length > 1 && <Select tone="emerald" value={section} onChange={(e) => setSection(e.target.value)} className={`${selectClass} w-40`} aria-label="Section"><option value="">All sections</option>{sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select>}
                {rows.length > 0 && <p className="text-sm text-slate-600">{short ? <span className="font-semibold text-rose-600">{short} below 75%</span> : 'No shortages'}</p>}
            </div>
            {loading ? <Loading /> : error ? <ErrorNote onRetry={reload}>{error}</ErrorNote> : !rows.length ? (
                <Card className="p-6"><EmptyState icon={BarChart3} title="No students yet" color="emerald" /></Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] text-sm tabular-nums">
                            <thead><tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="px-4 py-2.5 font-semibold">Roll</th><th className="px-4 font-semibold">Student</th><th className="px-4 text-right font-semibold">Classes</th><th className="w-56 px-4 font-semibold">Attendance</th></tr></thead>
                            <tbody>{rows.map((r) => (
                                <tr key={r._id} className="border-b border-slate-100">
                                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.rollNo || '—'}</td>
                                    <td className="px-4 font-medium text-slate-800">{r.name}</td>
                                    <td className="px-4 text-right text-slate-500">{r.present}/{r.held}</td>
                                    <td className="px-4"><span className="flex items-center gap-3"><span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${bar(r.percent)}`} style={{ width: `${Math.min(100, r.percent || 0)}%` }} /></span><span className={`w-12 text-right font-semibold ${tone(r.percent)}`}>{r.percent === null ? '—' : `${r.percent}%`}</span></span></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                </Card>
            )}
        </>
    );
};

/** Announcements to teachers from the departments they teach in (posted by the HOD). */
const TeacherNotices = () => {
    const [rows, setRows] = useState([]);
    const [open, setOpen] = useState(null);
    useEffect(() => {
        let live = true;
        teacherApi.get('/campus/announcements').then((r) => { if (live) setRows(r.data?.announcements || []); }).catch(() => {});
        return () => { live = false; };
    }, []);
    if (!rows.length) return null;
    return (
        <Card className="!p-0 overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Megaphone size={16} /></span>
                <h2 className="text-[15px] font-semibold text-slate-900">From your department</h2>
            </div>
            <ul className="divide-y divide-slate-100">
                {rows.slice(0, 5).map((a) => {
                    const long = (a.body || '').length > 160; const isOpen = open === a._id;
                    return (
                        <li key={a._id} className={`px-4 py-3 ${a.pinned ? 'bg-amber-50/40' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 font-semibold text-slate-800">{a.pinned && <Pin size={13} className="mr-1.5 inline -translate-y-px text-amber-600" />}{a.title}</p>
                                <span className="shrink-0 text-xs text-slate-400">{fmtAgo(a.at)}</span>
                            </div>
                            {a.body && <p className={`mt-1 whitespace-pre-line text-sm text-slate-600 ${long && !isOpen ? 'line-clamp-2' : ''}`}>{a.body}</p>}
                            <p className="mt-1 text-xs text-slate-400">{[a.by, a.department].filter(Boolean).join(' · ')}{long && <button type="button" onClick={() => setOpen(isOpen ? null : a._id)} className="ml-2 font-semibold text-emerald-700">{isOpen ? 'Less' : 'Read more'}</button>}</p>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
};

export default function TeacherAttendance() {
    // Today in India time, rolling over at midnight for a page left open (checked when it comes back and each minute).
    const [today, setToday] = useState(todayIST);
    useEffect(() => {
        const tick = () => setToday(todayIST());
        const t = setInterval(tick, 60000);
        document.addEventListener('visibilitychange', tick);
        return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick); };
    }, []);
    const mine = useCampus('/', {});
    const subjects = mine.data?.subjects || [];
    const [subjectId, setSubjectId] = useState('');
    const [tab, setTab] = useState('take');
    const subject = subjects.find((s) => s._id === subjectId) || subjects[0];

    return (
        <div className="space-y-4">
            <PageHeader icon={CalendarCheck} title="Attendance" color="emerald" subtitle="Take attendance for the subjects you teach, period by period. Your students see their own percentage." />
            {/* Announcements are locked for now (2026-11-14): only attendance is open. */}
            {SOON.has('announcements') ? <LockedPreview title="Announcements"><TeacherNotices /></LockedPreview> : <TeacherNotices />}
            {mine.loading ? <Loading /> : mine.code === 'CAMPUS_LOCKED' ? (
                <Card className="p-6"><EmptyState icon={Lock} title="Not switched on yet" color="emerald">{mine.error}</EmptyState></Card>
            ) : mine.error ? <ErrorNote onRetry={mine.reload}>{mine.error}</ErrorNote> : !subjects.length ? (
                <Card className="p-6"><EmptyState icon={CalendarCheck} title="No classes assigned yet" color="emerald">You are not teaching any class yet. Your department’s HOD assigns your subjects; once they do, you take attendance for them here.</EmptyState></Card>
            ) : (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Select tone="emerald" value={subject._id} onChange={(e) => setSubjectId(e.target.value)} className={`${selectClass} sm:w-[28rem]`} aria-label="Subject">
                            {subjects.map((s) => <option key={s._id} value={s._id}>{label(s)}</option>)}
                        </Select>
                        <div role="tablist" aria-label="Attendance" className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:inline-grid sm:w-auto">
                            {[['take', 'Take attendance', 'Take', CalendarCheck], ['report', 'Report', 'Report', BarChart3], ['marks', 'Internal marks', 'Marks', ClipboardList]].map(([k, l, short, Icon]) => (
                                <button key={k} type="button" role="tab" aria-selected={tab === k} aria-label={l} onClick={() => k !== 'marks' && setTab(k)} disabled={k === 'marks'} title={k === 'marks' ? 'Locked' : undefined}
                                    className={`relative inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-sm font-semibold transition sm:px-3 ${tab === k ? 'bg-emerald-700 text-white' : k === 'marks' ? 'cursor-not-allowed text-slate-400 grayscale' : 'text-slate-600 hover:text-slate-900'}`}>
                                    <Icon size={15} aria-hidden="true" /><span className="sm:hidden">{short}</span><span className="hidden sm:inline">{l}</span>
                                    {k === 'marks' && <LockChip className="ml-0.5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    {tab === 'take' ? <Register key={subject._id} subject={subject} today={today} /> : <Report key={subject._id} subject={subject} />}
                </>
            )}
        </div>
    );
}
