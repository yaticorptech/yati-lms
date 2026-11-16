/**
 * Institution — the student's own record at their college (Campus, 2026-11-13),
 * for students with an AI card whose organization has Campus on:
 *   Overview    attendance, dues, the next exam, what needs doing
 *   Attendance  each subject's percentage (75% needed) and the latest classes
 *   Marks       published internal marks, and marks cards (semester results)
 *   Exams       apply for semester exams, the timetable, the admit card
 *   Fees        what is due, what is paid, receipts
 *   Feedback    rate courses and teachers (sent without the student's name)
 *   Admission   the admission details the office recorded
 * Server: /api/organizations/student/campus (yaticorp-lms-server/src/campus/student.js).
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
    Building2, CalendarCheck, ClipboardList, GraduationCap, Wallet, MessageSquareText, IdCard, Printer, Loader2, CheckCircle2,
    Clock, XCircle, AlertTriangle, ArrowRight, Star, X, FileText, Megaphone, Pin, Orbit, CalendarRange
} from 'lucide-react';
import api from '../utils/api';
import useAutoRefresh from '../hooks/useAutoRefresh';
import Portal from '../components/Portal';
import { admitCard, receipt, printDocs, printLater } from './print';
import { CardRows, printCard } from './MarksCards';
import { SOON } from './soon';
import { LockedCard, LockChip, LockedPreview } from './Locked';

const TabLock = ({ on, title, children }) => (on ? <LockedPreview title={title}>{children}</LockedPreview> : children);

const INK = '#0e3b3a';
const SoonBadge = () => <LockChip className="!text-[10px]" />;
const SoonPage = ({ icon: Icon, title }) => (
    <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center grayscale">
        <Icon size={28} className="mx-auto mb-3 text-slate-300" />
        <SoonBadge />
        <p className="mt-3 text-lg font-bold text-slate-500">{title}</p>
        <p className="mt-1 text-sm text-slate-400"></p>
    </div>
);
const rupees = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const day = (d) => (d ? new Date(String(d).length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const shortDay = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '—');
const tone = (p) => (p === null || p === undefined ? 'text-slate-400' : p < 75 ? 'text-rose-600' : p < 85 ? 'text-amber-600' : 'text-emerald-600');
const bar = (p) => (p === null || p === undefined ? 'bg-slate-200' : p < 75 ? 'bg-rose-500' : p < 85 ? 'bg-amber-500' : 'bg-emerald-500');
const MODES = { cash: 'Cash', upi: 'UPI', card: 'Card', bank: 'Bank transfer', cheque: 'Cheque', dd: 'Demand draft', online: 'Online' };

const Card = ({ className = '', children }) => <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
const H2 = ({ children, action }) => <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-base font-bold text-slate-800">{children}</h2>{action}</div>;
const Meter = ({ value }) => <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar(value)}`} style={{ width: `${Math.min(100, value || 0)}%` }} /></div>;
const Btn = ({ children, variant = 'primary', className = '', ...rest }) => (
    <button type="button" {...rest} className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition disabled:opacity-50 ${variant === 'primary' ? 'bg-[#145250] text-white hover:bg-[#0e3b3a]' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'} ${className}`}>{children}</button>
);
const Empty = ({ icon: Icon, children }) => <div className="px-6 py-10 text-center text-sm text-slate-500">{Icon && <Icon size={22} className="mx-auto mb-2 text-slate-300" />}{children}</div>;

/** The attendance ring of the ID card. */
const Ring = ({ value }) => {
    const r = 30; const c = 2 * Math.PI * r;
    return (
        <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90" aria-hidden>
            <circle cx="36" cy="36" r={r} fill="none" stroke="#e3efec" strokeWidth="7" />
            <circle cx="36" cy="36" r={r} fill="none" stroke={value === null ? 'transparent' : value < 75 ? '#e11d48' : '#1b6a66'} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * (value || 0)) / 100} />
        </svg>
    );
};

const FeedbackDialog = ({ form, target, onClose, onDone }) => {
    const [answers, setAnswers] = useState(form.questions.map(() => ''));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const send = async () => {
        setBusy(true); setError('');
        try { onDone((await api.post(`/organizations/student/campus/feedback/${form._id}`, { subjectId: target.subjectId, answers })).data.message); }
        catch (err) { setError(err.response?.data?.message || 'Could not send. Please try again.'); setBusy(false); }
    };
    const ready = form.questions.every((q, i) => q.kind === 'text' || answers[i]);
    return (
        <Portal>
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={form.title}>
                <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
                        <div><p className="text-xs font-bold uppercase tracking-wider text-[#7d602a]">{form.title}</p><h3 className="text-lg font-bold text-slate-800">{target.name}</h3><p className="text-xs text-slate-500">Your name is not sent with your answers.</p></div>
                        <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                    </div>
                    <div className="space-y-5 overflow-y-auto p-5">
                        {form.questions.map((q, i) => (
                            <div key={i}>
                                <p className="mb-2 text-sm font-medium text-slate-700">{q.text}</p>
                                {q.kind === 'rating' ? (
                                    <div className="flex gap-1.5" role="radiogroup" aria-label={q.text}>
                                        {[1, 2, 3, 4, 5].map((n) => (
                                            <button key={n} role="radio" aria-checked={answers[i] === n} aria-label={`${n} of 5`} onClick={() => setAnswers(answers.map((a, j) => (j === i ? n : a)))}
                                                className={`flex h-11 flex-1 items-center justify-center rounded-xl border text-sm font-bold transition ${answers[i] >= n ? 'border-[#b08a3e] bg-[#f8f1e2] text-[#7d602a]' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                                                <Star size={16} fill={answers[i] >= n ? 'currentColor' : 'none'} />
                                            </button>
                                        ))}
                                    </div>
                                ) : <textarea value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} maxLength={1000} className="min-h-20 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-[#23847f] focus:outline-none focus:ring-2 focus:ring-[#d6ebe7]" placeholder="Optional" />}
                            </div>
                        ))}
                        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
                    </div>
                    <div className="flex justify-end gap-2 border-t border-slate-100 p-4"><Btn variant="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={send} disabled={!ready || busy}>{busy && <Loader2 size={16} className="animate-spin" />}Send feedback</Btn></div>
                </div>
            </div>
        </Portal>
    );
};

// Each tab's icon tile, as Career Path's folder tabs have them.
// The attendance register, a subject a row — on Overview and the Attendance tab.
const AttendanceTable = ({ s, att }) => (
    <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div><h2 className="text-base font-bold text-slate-800">Attendance by subject</h2><p className="text-xs text-slate-500">Semester {s.semester}{s.section ? ` · Section ${s.section}` : ''} · 75% needed in each subject</p></div>
            <p className="text-sm text-slate-600">Overall <b className={`text-lg ${tone(att.percent)}`}>{att.percent ?? 0}%</b> <span className="text-slate-400">· {att.present}/{att.held} classes</span></p>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm tabular-nums">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Code</th><th className="px-4 py-3">Subject</th>
                        <th className="px-3 py-3 text-center">Conducted</th><th className="px-3 py-3 text-center">Attended</th>
                        <th className="px-3 py-3 text-center">Total %</th><th className="px-3 py-3 text-center">Excused</th>
                        <th className="px-3 py-3 text-center">Allowed</th><th className="px-3 py-3 text-center">Remedial</th>
                        <th className="px-4 py-3">Absent dates</th><th className="px-4 py-3">Last attended</th>
                    </tr>
                </thead>
                <tbody>
                    {att.subjects.length ? att.subjects.map((x) => {
                        const p = x.percent ?? 0;
                        return (
                            <tr key={x._id} className="border-b border-slate-100 align-top last:border-0">
                                <td className="px-4 py-3 font-mono text-xs font-semibold text-[#7d602a]">{x.code || '—'}</td>
                                <td className="px-4 py-3 font-medium text-slate-800">{x.name}{x.semester !== s.semester && <span className="ml-1 text-xs text-slate-400">(Sem {x.semester})</span>}</td>
                                <td className="px-3 py-3 text-center">{x.held || 0}</td>
                                <td className="px-3 py-3 text-center">{x.present || 0}</td>
                                <td className="px-3 py-3 text-center">
                                    <span className={`inline-flex min-w-[3.5rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${!x.held ? 'bg-slate-100 text-slate-500' : p < 75 ? 'bg-rose-50 text-rose-700' : p < 85 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{p}%</span>
                                </td>
                                <td className="px-3 py-3 text-center">{x.excused || 0}</td>
                                <td className="px-3 py-3 text-center">{x.allowed || 0}</td>
                                <td className="px-3 py-3 text-center">{x.remedial || 0}</td>
                                <td className="px-4 py-3">
                                    {x.absent?.length ? (
                                        <div className="flex max-w-xs flex-wrap gap-1">
                                            {x.absent.map((d, i) => <span key={i} className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[11px] font-semibold text-rose-700" title={`Period ${d.period}`}>{day(d.date)}{d.period ? ` · P${d.period}` : ''}</span>)}
                                        </div>
                                    ) : <span className="text-slate-400">0</span>}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{x.lastAttended ? day(x.lastAttended) : '—'}</td>
                            </tr>
                        );
                    }) : (
                        <tr><td colSpan={10}><Empty icon={CalendarCheck}>Your subjects appear here once your department adds them.</Empty></td></tr>
                    )}
                </tbody>
            </table>
        </div>
    </Card>
);

// The department's announcements to this class (HOD or office), pinned first.
const AnnouncementsCard = ({ list }) => {
    const [open, setOpen] = useState(null);
    const [all, setAll] = useState(false);
    if (!list?.length) return null;
    const shown = all ? list : list.slice(0, 4);
    const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 6e4); return m < 60 ? `${Math.max(1, m)}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : day(d); };
    return (
        <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f8f1e2] text-[#7d602a]"><Megaphone size={18} /></span><div><h2 className="text-base font-bold text-slate-800">Announcements</h2><p className="text-xs text-slate-500">From your department</p></div></div>
                {list.length > 4 && <button onClick={() => setAll(!all)} className="text-sm font-semibold text-[#145250]">{all ? 'Show fewer' : `All ${list.length}`}</button>}
            </div>
            <ul className="divide-y divide-slate-100">
                {shown.map((a) => {
                    const isOpen = open === a._id; const long = (a.body || '').length > 180;
                    return (
                        <li key={a._id} className={`px-5 py-3.5 ${a.pinned ? 'bg-[#fbf7ee]' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 font-semibold text-slate-800">{a.pinned && <Pin size={13} className="mr-1.5 inline -translate-y-px text-[#7d602a]" aria-label="Pinned" />}{a.title}</p>
                                <span className="shrink-0 text-xs text-slate-400">{ago(a.at)}</span>
                            </div>
                            {a.body && <p className={`mt-1 whitespace-pre-line text-sm text-slate-600 ${long && !isOpen ? 'line-clamp-2' : ''}`}>{a.body}</p>}
                            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                                {a.by && <span>{a.by}</span>}
                                {(a.semester || a.section) ? <span>· {a.semester ? `Semester ${a.semester}` : ''}{a.section ? ` Section ${a.section}` : ''}</span> : null}
                                {long && <button onClick={() => setOpen(isOpen ? null : a._id)} className="font-semibold text-[#145250]">{isOpen ? 'Less' : 'Read more'}</button>}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
};

// The class's weekly timetable, set by the department (HOD). Today's row is lit.
const WEEK = [[1, 'Mon', 'Monday'], [2, 'Tue', 'Tuesday'], [3, 'Wed', 'Wednesday'], [4, 'Thu', 'Thursday'], [5, 'Fri', 'Friday'], [6, 'Sat', 'Saturday']];
const hm = (t) => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`; };
const TimetableCard = ({ tt, s }) => {
    const todayNum = new Date(Date.now() + 5.5 * 3600e3).getUTCDay();   // 0 Sunday … 6 Saturday, India time
    const nowHM = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(11, 16);
    if (!tt || !tt.slots.length) {
        return (
            <Card className="p-5">
                <H2>Timetable</H2>
                <Empty icon={Clock}>Your department has not set the timetable for semester {s.semester}{s.section ? `, section ${s.section}` : ''} yet.</Empty>
            </Card>
        );
    }
    const at = (day, p) => tt.slots.find((x) => x.day === day && x.p === p);
    const days = WEEK.filter(([d]) => d <= 5 || tt.slots.some((x) => x.day === d));
    const todays = tt.slots.filter((x) => x.day === todayNum).sort((a, b) => a.p - b.p);
    const timeOf = (p) => tt.periods.find((x) => x.n === p) || {};
    const next = todays.find((x) => (timeOf(x.p).end || '99') > nowHM);
    return (
        <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div><h2 className="text-base font-bold text-slate-800">Timetable</h2><p className="text-xs text-slate-500">Semester {s.semester}{s.section ? ` · Section ${s.section}` : ''} · set by your department</p></div>
                {todayNum >= 1 && todayNum <= 6 && (
                    <p className="text-sm text-slate-600">{next
                        ? <>Next: <b className="text-slate-800">{next.name}</b>{timeOf(next.p).start ? <span className="text-slate-400"> · {hm(timeOf(next.p).start)}</span> : <span className="text-slate-400"> · period {next.p}</span>}{next.room ? <span className="text-slate-400"> · {next.room}</span> : null}</>
                        : <span className="text-slate-400">{todays.length ? 'No more classes today' : 'No classes today'}</span>}</p>
                )}
            </div>
            <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                <table className="w-full text-sm" style={{ minWidth: `${110 + tt.periods.length * 130}px` }}>
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                            <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Day</th>
                            {tt.periods.map((p) => (
                                <th key={p.n} className="px-2 py-3"><span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Period {p.n}</span>{p.start && <span className="block text-[11px] font-medium tabular-nums text-slate-400">{hm(p.start)}{p.end ? ` – ${hm(p.end)}` : ''}</span>}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {days.map(([d, short, long]) => {
                            const isToday = d === todayNum;
                            return (
                                <tr key={d} className={`border-b border-slate-100 last:border-0 ${isToday ? 'bg-[#f2f7f6]' : ''}`}>
                                    <th scope="row" className={`sticky left-0 z-10 px-4 py-2 text-left ${isToday ? 'bg-[#f2f7f6]' : 'bg-white'}`}>
                                        <abbr title={long} className="font-bold text-slate-800 no-underline">{short}</abbr>
                                        {isToday && <span className="ml-1.5 rounded-full bg-[#145250] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Today</span>}
                                    </th>
                                    {tt.periods.map((p) => {
                                        const x = at(d, p.n);
                                        const live = isToday && x && p.start && p.end && p.start <= nowHM && nowHM < p.end;
                                        return (
                                            <td key={p.n} className="px-1.5 py-1.5 align-top">
                                                {x ? (
                                                    <div className={`rounded-lg px-2.5 py-1.5 ${live ? 'bg-[#145250] text-white shadow-sm' : x.kind === 'practical' ? 'bg-[#f8f1e2] text-[#5c4620]' : 'bg-slate-50 text-slate-800 ring-1 ring-slate-200'}`}>
                                                        <span className={`block font-mono text-[10px] font-semibold ${live ? 'text-[#efdfba]' : 'text-[#7d602a]'}`}>{x.code || '—'}</span>
                                                        <span className="block truncate text-[13px] font-semibold" title={x.name}>{x.name}</span>
                                                        {x.room && <span className={`block text-[11px] ${live ? 'text-white/70' : 'text-slate-500'}`}>{x.room}</span>}
                                                    </div>
                                                ) : <div className="px-2.5 py-1.5 text-xs text-slate-300">—</div>}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const TABS = [
    ['overview', 'Overview', Building2, 'from-[#1b6a66] to-[#0e3b3a]'],
    ['attendance', 'Attendance', CalendarCheck, 'from-emerald-400 to-teal-600'],
    ['marks', 'Result', ClipboardList, 'from-indigo-400 to-violet-600'],
    ['exams', 'Exam application', GraduationCap, 'from-sky-400 to-blue-600'],
    ['fees', 'Fees', Wallet, 'from-amber-400 to-orange-500'],
    ['feedback', 'Feedback', MessageSquareText, 'from-fuchsia-500 to-violet-600'],
    ['admission', 'Personal details', IdCard, 'from-[#b08a3e] to-[#7d602a]']
];

export default function Institution() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') || 'overview';
    const setTab = (k) => setParams(k === 'overview' ? {} : { tab: k }, { replace: true });
    const [notice, setNotice] = useState(null);
    const [busy, setBusy] = useState('');
    const [giving, setGiving] = useState(null);
    const load = async ({ isCurrent = () => true } = {}) => {
        try { const r = await api.get('/organizations/student/campus/dashboard'); if (isCurrent()) { setData(r.data); setError(null); } }
        catch (err) { if (isCurrent()) setError(err.response?.data?.message || 'Could not load your institution just now.'); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    // Placed in a class, or removed, while here (2026-11-16): re-read at once.
    useEffect(() => { window.addEventListener('yati:organization-changed', reload); return () => window.removeEventListener('yati:organization-changed', reload); }, [reload]);
    const say = (text, kind = 'ok') => { setNotice({ text, kind }); setTimeout(() => setNotice(null), 6000); };

    if (error && !data) return <div className="mx-auto max-w-md py-24 text-center"><AlertTriangle className="mx-auto mb-3 text-amber-500" /><p className="text-slate-600">{error}</p><Btn variant="secondary" className="mt-4" onClick={reload}>Try again</Btn></div>;
    if (!data) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#145250]" /></div>;
    if (!data.admitted) {
        return (
            <div className="mx-auto max-w-lg py-16 text-center">
                <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef6f4] text-[#145250]"><Building2 size={28} /></span>
                <h1 className="text-2xl font-black text-slate-800">{data.institution.name}</h1>
                <p className="mt-2 text-slate-600">Your admission has not been recorded yet. Once your department completes it, your attendance, marks, fees and exams appear here.</p>
            </div>
        );
    }

    const { student: s, department: d, attendance: att, fees, exams, internals, results, feedback } = data;
    const nextPaper = exams.flatMap((e) => e.schedule.map((x) => ({ ...x, exam: e.name }))).filter((x) => x.date >= data.today).sort((a, b) => a.date.localeCompare(b.date))[0];
    const toApply = exams.filter((e) => e.canApply);
    const pendingFeedback = feedback.reduce((t, f) => t + f.targets.filter((x) => !x.done).length, 0);

    const apply = async (e, withdraw) => {
        setBusy(e._id);
        try { const r = withdraw ? await api.delete(`/organizations/student/campus/exams/${e._id}/apply`) : await api.post(`/organizations/student/campus/exams/${e._id}/apply`); say(r.data.message); reload(); }
        catch (err) { say(err.response?.data?.message || 'Could not do that just now.', 'error'); } finally { setBusy(''); }
    };
    const admit = async (e) => {
        const done = printLater();
        try { done(`Admit card — ${e.name}`, [admitCard((await api.get(`/organizations/student/campus/exams/${e._id}/hall-ticket`)).data)]); }
        catch (err) { done.fail(); say(err.response?.data?.message || 'Could not open your admit card.', 'error'); }
    };
    const marksData = { institution: data.institution, department: d, student: s };

    return (
        <div className="w-full space-y-5 pb-10">
            {/* Passed out or left (2026-11-14): their record stays here, read-only. */}
            {s.status && s.status !== 'studying' && (
                <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 ${s.status === 'completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    <GraduationCap size={22} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <div><p className="font-bold">{s.status === 'completed' ? 'You passed out' : 'You left the institution'}{s.endedAt ? ` on ${day(s.endedAt)}` : ''}</p>
                        <p className="text-sm opacity-80">Your admission, attendance and records are kept here.{s.endReason && !['Passed out', 'Left the institution'].includes(s.endReason) ? ` ${s.endReason}` : ''}</p></div>
                </div>
            )}
            {/* The campus ID: who and where, with the three numbers that matter. */}
            <section className="relative overflow-hidden rounded-3xl border border-[#acd5ce]/70 bg-gradient-to-br from-white via-[#f4faf8] to-[#e6f2ef] p-5 text-slate-900 shadow-sm sm:p-7">
                <div className="pointer-events-none absolute inset-0 opacity-[.35]" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0 27px, #e3efec 27px 28px)' }} aria-hidden />
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border border-[#b08a3e]/30" aria-hidden />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#b08a3e]/40">
                            {data.institution.logo ? <img src={data.institution.logo} alt="" className="h-full w-full object-contain p-1" /> : <Building2 className="text-[#145250]" />}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-xs font-bold uppercase tracking-[.18em] text-[#7d602a]">{data.institution.name}</p>
                            <h1 className="mt-0.5 truncate text-2xl font-black text-[#0e3b3a] sm:text-3xl">{s.name}</h1>
                            <p className="mt-1 text-sm text-slate-600">{d.name} · Semester {s.semester}{s.section ? ` · Section ${s.section}` : ''}</p>
                            <p className="mt-1 font-mono text-xs text-slate-500">Roll {s.rollNo || '—'} · Adm. {s.admissionNo || '—'}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        <button onClick={() => setTab('attendance')} className="flex items-center gap-2 rounded-2xl bg-white/80 p-2 text-left ring-1 ring-[#acd5ce]/80 hover:bg-white hover:shadow-sm sm:p-3">
                            <span className="relative hidden sm:block"><Ring value={att.percent} /><span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#0e3b3a]">{att.percent ?? '—'}{att.percent !== null && '%'}</span></span>
                            <span><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Attendance</span><span className={`text-lg font-black sm:hidden ${att.percent !== null && att.percent < 75 ? 'text-rose-600' : ''}`}>{att.percent ?? '—'}%</span><span className="hidden text-xs text-slate-500 sm:block">{att.present}/{att.held} classes</span></span>
                        </button>
                        <button onClick={() => setTab('fees')} className={`rounded-2xl bg-white/80 p-2 text-left ring-1 ring-[#acd5ce]/80 hover:bg-white hover:shadow-sm sm:p-3 ${SOON.has('fees') ? 'opacity-50 grayscale' : ''}`}>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Fees due</span>
                            <span className={`block text-lg font-black sm:text-2xl ${fees.balance ? 'text-[#7d602a]' : ''}`}>{SOON.has('fees') ? '—' : rupees(fees.balance)}</span>
                        </button>
                        <button onClick={() => setTab('exams')} className={`rounded-2xl bg-white/80 p-2 text-left ring-1 ring-[#acd5ce]/80 hover:bg-white hover:shadow-sm sm:p-3 ${SOON.has('exams') ? 'opacity-50 grayscale' : ''}`}>
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Next exam</span>
                            <span className="block text-sm font-black sm:text-base">{SOON.has('exams') ? '—' : nextPaper ? shortDay(nextPaper.date) : '—'}</span>
                            {nextPaper && !SOON.has('exams') && <span className="hidden truncate text-xs text-slate-500 sm:block">{nextPaper.subject}</span>}
                        </button>
                    </div>
                </div>
            </section>

            {/* Folder tabs, as Career Path has them: an icon tile rising above each tab on a
                tinted band; the open one turns white and joins the base below. */}
            <div>
                <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-[#d6ebe7] via-[#eef6f4] to-[#eef6f4] px-2 pt-1 sm:px-3">
                    <div aria-hidden className="pointer-events-none absolute -top-16 right-1/4 h-40 w-40 rounded-full bg-[#efdfba]/50 blur-3xl" />
                    <nav role="tablist" aria-label="Institution" className="relative overflow-x-auto pt-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:pt-6">
                        <div className="relative flex w-max min-w-full items-end gap-1 sm:gap-1.5">
                            {TABS.map(([k, l, Icon, toneOf]) => {
                                const label = l;
                                const on = tab === k;
                                const soon = SOON.has(k);
                                return (
                                    <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)} title={soon ? `${label} — locked` : label}
                                        className={`group relative z-10 flex min-w-[5.4rem] flex-1 flex-col items-center rounded-t-[1.1rem] px-1.5 pb-2.5 pt-1 text-center transition-all duration-300 sm:min-w-[6.2rem] ${on ? '-mb-px bg-white text-slate-900' : 'mb-1 bg-white/55 text-[#145250] ring-1 ring-inset ring-[#acd5ce]/70 hover:-translate-y-1 hover:bg-white/90'}`}>
                                        <span aria-hidden className={`-mt-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ring-2 ring-white transition-transform duration-300 sm:-mt-5 sm:h-10 sm:w-10 ${toneOf} ${soon ? 'grayscale opacity-60' : ''} ${on ? 'scale-110' : 'scale-95 group-hover:scale-105'}`}>
                                            <Icon size={19} strokeWidth={2.4} />
                                        </span>
                                        <span className={`mt-1.5 max-w-full text-[0.66rem] font-black leading-tight sm:text-xs ${soon ? 'text-slate-400' : ''}`}>{label}</span>
                                        {soon && <LockChip className="mt-0.5" />}
                                        {!soon && k === 'feedback' && pendingFeedback > 0 && <span className="absolute right-2 top-1 rounded-full bg-[#b08a3e] px-1.5 text-[10px] font-bold text-white">{pendingFeedback}</span>}
                                        {!soon && k === 'exams' && toApply.length > 0 && <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-[#b08a3e]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </nav>
                </div>
                <div className="min-h-3.5 rounded-b-3xl border border-t-0 border-[#acd5ce]/70 bg-white shadow-sm" />
            </div>

            {notice && <p role="status" className={`rounded-xl p-3 text-sm font-medium ${notice.kind === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{notice.text}</p>}

            {tab === 'overview' && (
                // One column while everything beside attendance is still coming soon.
                <div className={`grid gap-5 ${['exams', 'feedback', 'fees', 'marks'].every((k) => SOON.has(k)) ? '' : 'lg:grid-cols-[1.4fr_1fr]'}`}>
                    <div className="min-w-0 space-y-5">
                        <TabLock on={SOON.has('timetable')} title="Timetable"><TimetableCard tt={data.timetable} s={s} /></TabLock>
                        <TabLock on={SOON.has('announcements')} title="Announcements">{data.announcements?.length ? <AnnouncementsCard list={data.announcements} /> : <LockedCard icon={Megaphone} title="Announcements" text="Notices from your department, the office and the examination board." />}</TabLock>
                    </div>
                    <div className="space-y-5">
                        {!SOON.has('exams') && toApply.length > 0 && <Card className="border-[#efdfba] bg-[#f8f1e2] p-5"><p className="text-sm font-bold text-[#7d602a]">Exam applications are open</p><p className="mt-1 text-sm text-slate-700">{toApply.map((e) => e.name).join(', ')}</p><Btn className="mt-3" onClick={() => setTab('exams')}>Apply now</Btn></Card>}
                        {!SOON.has('feedback') && pendingFeedback > 0 && <Card className="p-5"><p className="text-sm font-bold text-slate-800">Your feedback is asked for</p><p className="mt-1 text-sm text-slate-600">{pendingFeedback} to give. It goes without your name.</p><Btn variant="secondary" className="mt-3" onClick={() => setTab('feedback')}>Give feedback</Btn></Card>}
                        {!SOON.has('fees') && <Card className="p-5">
                            <H2>Fees</H2>
                            <p className="text-sm text-slate-600">{rupees(fees.paid)} paid of {rupees(fees.total)}</p>
                            <div className="mt-2"><Meter value={fees.total ? (fees.paid / fees.total) * 100 : 100} /></div>
                            {fees.items.some((i) => i.status === 'overdue') && <p className="mt-3 text-sm font-semibold text-rose-600">Some fees are overdue. Pay at the office.</p>}
                        </Card>}
                        {!SOON.has('marks') && results[0] && <Card className="p-5"><H2>Latest marks card</H2><p className="text-sm font-semibold text-slate-800">{results[0].name}</p><p className="text-sm text-slate-500">{results[0].result}{results[0].sgpa !== null ? ` · SGPA ${results[0].sgpa.toFixed(2)}` : ''}</p><Btn variant="secondary" className="mt-3" onClick={() => setTab('marks')}>View</Btn></Card>}
                    </div>
                </div>
            )}


            {tab === 'attendance' && (
                <div className="space-y-5">
                    {/* The register, a subject a row (2026-11-13): conducted, attended, %, excused,
                        allowed (more classes that can be missed at 75%), remedial, the days absent
                        and the last day present. Every subject of the semester shows, 0 until classes start. */}
                    <AttendanceTable s={s} att={att} />
                    <Card className="p-5">
                        <H2>Latest classes</H2>
                        {att.recent.length ? <ul className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">{att.recent.map((r, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0"><span className="block truncate text-slate-800">{r.subject}</span><span className="text-xs text-slate-500">{shortDay(r.date)} · period {r.period}</span></span>
                                {r.present ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={14} /> Present{r.remedial ? ' · remedial' : ''}</span> : r.excused ? <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600"><CheckCircle2 size={14} /> Excused</span> : <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"><XCircle size={14} /> Absent</span>}</li>
                        ))}</ul> : <p className="text-sm text-slate-500">No classes recorded yet.</p>}
                    </Card>
                </div>
            )}

            {/* Locked tabs show their real content, greyed under a lock (2026-11-14). */}
            <TabLock on={SOON.has(tab)} title={TABS.find((t) => t[0] === tab)?.[1]}>
            {tab === 'marks' && (
                <div className="space-y-5">
                    <div>
                        <H2>Marks cards</H2>
                        {results.length ? results.map((c) => (
                            <Card key={c._id} className="mb-3 p-5">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                    <div><p className="font-bold text-slate-800">{c.name}</p><p className="text-xs text-slate-500">Semester {c.semester} · Total {c.total}/{c.max}</p></div>
                                    <div className="flex items-center gap-3">
                                        {c.sgpa !== null && <span className="text-right"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">SGPA</span><span className="text-xl font-black">{c.sgpa.toFixed(2)}</span></span>}
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${!c.complete ? 'bg-slate-100 text-slate-500' : c.failed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{c.result}</span>
                                        <Btn variant="secondary" onClick={() => printCard(marksData, c)}><Printer size={15} /> Print</Btn>
                                    </div>
                                </div>
                                <CardRows card={c} />
                            </Card>
                        )) : <Card><Empty icon={FileText}>Your marks cards appear here when the examination board publishes them.</Empty></Card>}
                    </div>
                    <div>
                        <H2>Internal marks</H2>
                        {internals.length ? (
                            <div className="grid gap-3 md:grid-cols-2">{internals.map((e) => (
                                <Card key={e._id} className="p-5">
                                    <p className="font-bold text-slate-800">{e.name}</p><p className="mb-3 text-xs text-slate-500">Semester {e.semester} · out of {e.maxMarks}</p>
                                    <ul className="space-y-2">{e.subjects.map((x) => (
                                        <li key={x._id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate">{x.name}</span>
                                            <span className={`font-bold tabular-nums ${x.marks !== undefined && x.marks !== null && x.marks < e.passMarks ? 'text-rose-600' : 'text-slate-800'}`}>{x.marks === undefined ? '—' : x.marks === null ? 'AB' : `${x.marks}/${e.maxMarks}`}</span></li>
                                    ))}</ul>
                                </Card>
                            ))}</div>
                        ) : <Card><Empty icon={ClipboardList}>Internal marks appear once your department publishes them.</Empty></Card>}
                    </div>
                </div>
            )}

            {tab === 'exams' && (exams.length ? (
                <div className="space-y-4">{exams.map((e) => {
                    const st = e.application?.status;
                    return (
                        <Card key={e._id} className="p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div><p className="text-lg font-bold text-slate-800">{e.name}</p>
                                    <p className="text-sm text-slate-500">Semester {e.semester}{e.fee ? ` · exam fee ${rupees(e.fee)}` : ''}{e.applyUntil ? ` · apply by ${day(e.applyUntil)}` : ''}{e.venue ? ` · ${e.venue}` : ''}</p></div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {st === 'applied' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><Clock size={13} /> Waiting for approval</span>}
                                    {st === 'approved' && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={13} /> Approved</span>}
                                    {st === 'rejected' && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700"><XCircle size={13} /> Not approved{e.application.note ? `: ${e.application.note}` : ''}</span>}
                                    {e.canApply && <Btn onClick={() => apply(e)} disabled={busy === e._id}>{busy === e._id && <Loader2 size={15} className="animate-spin" />}Apply</Btn>}
                                    {st === 'applied' && <Btn variant="secondary" onClick={() => apply(e, true)} disabled={busy === e._id}>Withdraw</Btn>}
                                    {e.hallTicket && <Btn onClick={() => admit(e)}><Printer size={15} /> Admit card</Btn>}
                                </div>
                            </div>
                            {e.feeDue > 0 && <p className="mt-3 rounded-xl bg-[#f8f1e2] p-3 text-sm text-[#7d602a]">Pay the exam fee of {rupees(e.feeDue)} at the office for your application to be approved.</p>}
                            {st === 'approved' && !e.hallTicket && <p className="mt-3 text-sm text-slate-500">Your admit card will be here once the examination board releases it.</p>}
                            {e.schedule.length > 0 && (
                                <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-2 font-semibold">Date</th><th className="font-semibold">Time</th><th className="font-semibold">Subject</th></tr></thead>
                                    <tbody>{e.schedule.map((x) => <tr key={x.subjectId} className="border-t border-slate-100"><td className="py-2.5 font-medium">{shortDay(x.date)}</td><td className="text-slate-600">{x.start}{x.end ? `–${x.end}` : ''}</td><td><span className="mr-2 font-mono text-[11px] text-[#7d602a]">{x.code}</span>{x.subject}</td></tr>)}</tbody></table></div>
                            )}
                        </Card>
                    );
                })}</div>
            ) : <Card><Empty icon={GraduationCap}>No semester exams announced yet.</Empty></Card>)}

            {tab === 'fees' && (
                <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
                    <Card className="overflow-hidden">
                        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                            {[['Total', fees.total, 'text-slate-800'], ['Paid', fees.paid, 'text-emerald-600'], ['Due', fees.balance, fees.balance ? 'text-amber-600' : 'text-slate-800']].map(([l, v, c]) => (
                                <div key={l} className="p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p><p className={`text-xl font-black ${c}`}>{rupees(v)}</p></div>
                            ))}
                        </div>
                        <ul className="divide-y divide-slate-100">{fees.items.length ? fees.items.map((i) => (
                            <li key={i._id || i.examId} className="flex items-center justify-between gap-3 p-4">
                                <div><p className="text-sm font-semibold text-slate-800">{i.title}</p><p className="text-xs text-slate-500">{rupees(i.amount)}{i.dueDate ? ` · due ${day(i.dueDate)}` : ''}</p></div>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${{ paid: 'bg-emerald-50 text-emerald-700', partial: 'bg-amber-50 text-amber-700', overdue: 'bg-rose-50 text-rose-700', due: 'bg-slate-100 text-slate-600' }[i.status]}`}>{{ paid: 'Paid', partial: `${rupees(i.balance)} left`, overdue: 'Overdue', due: 'Due' }[i.status]}</span>
                            </li>
                        )) : <Empty icon={Wallet}>No fees set yet.</Empty>}</ul>
                        <p className="border-t border-slate-100 p-4 text-xs text-slate-500">Pay at your institution’s office; your receipt appears here.</p>
                    </Card>
                    <Card className="p-5">
                        <H2>Receipts</H2>
                        {fees.payments.length ? <ul className="space-y-3">{fees.payments.map((p) => (
                            <li key={p._id} className="flex items-center justify-between gap-3">
                                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{p.title}</span><span className="block font-mono text-[11px] text-slate-500">{p.receipt} · {day(p.at)}</span></span>
                                <span className="flex items-center gap-2"><b className="text-sm">{rupees(p.amount)}</b><button onClick={() => printDocs(`Receipt ${p.receipt}`, [receipt(data.institution, s, { ...p, mode: MODES[p.mode] || p.mode })])} aria-label={`Print receipt ${p.receipt}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Printer size={16} /></button></span>
                            </li>
                        ))}</ul> : <p className="text-sm text-slate-500">No payments yet.</p>}
                    </Card>
                </div>
            )}

            {tab === 'feedback' && (feedback.length ? (
                <div className="grid gap-4 md:grid-cols-2">{feedback.map((f) => (
                    <Card key={f._id} className="p-5">
                        <p className="font-bold text-slate-800">{f.title}</p><p className="mb-3 text-xs text-slate-500">Sent without your name.</p>
                        <ul className="divide-y divide-slate-100">{f.targets.map((t) => (
                            <li key={t.subjectId || 'all'} className="flex items-center justify-between gap-3 py-2.5">
                                <span className="min-w-0 truncate text-sm">{t.name}</span>
                                {t.done ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={14} /> Sent</span> : <Btn variant="secondary" className="h-9" onClick={() => setGiving({ form: f, target: t })}>Give feedback</Btn>}
                            </li>
                        ))}</ul>
                    </Card>
                ))}</div>
            ) : <Card><Empty icon={MessageSquareText}>No feedback forms open right now.</Empty></Card>)}

            </TabLock>
            {tab === 'admission' && (
                <Card className="p-5">
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                        {[['Department', d.name], ['Semester', `${s.semester}${s.section ? ` · Section ${s.section}` : ''}`], ['Roll number', s.rollNo], ['Admission number', s.admissionNo], ['Academic year', s.academicYear], ['Admitted', day(s.admittedAt)], ['AI card', s.cardNumber],
                            ...data.detailFields.filter((f) => s.details?.[f.key]).map((f) => [f.label, f.key === 'dob' ? day(s.details[f.key]) : s.details[f.key]])].map(([l, v]) => (
                            <div key={l} className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</dt><dd className="mt-0.5 truncate text-sm text-slate-800">{v || '—'}</dd></div>
                        ))}
                    </dl>
                    <p className="mt-5 text-xs text-slate-500">Something wrong? Ask your department office to correct it. Your marks cards are also on <Link to="/profile" className="font-semibold text-[#145250] hover:underline">your profile</Link>.</p>
                </Card>
            )}

            {giving && <FeedbackDialog {...giving} onClose={() => setGiving(null)} onDone={(m) => { setGiving(null); say(m); reload(); }} />}
        </div>
    );
}
