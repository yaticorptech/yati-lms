/**
 * Linguistic Ability — the teacher's views, shared by platform admins
 * (base '/linguistic/admin', every student) and college coordinators
 * (base '/linguistic/org', their own students only — the server enforces it):
 *   ReviewsPanel   open-ended writing and passage translations to score and comment on
 *   StudentsPanel  progress, quiz results and lessons completed
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronDown, Inbox, Users, X, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { INPUT, LABEL, BTN, CARD, Segmented, Empty, LoadFailed, Rows, SearchInput, Pager, Dialog, DialogTitle, Banner } from '../../components/orgUi';
// A select as wide as its choices, not the whole row.
const SELECT = INPUT.replace('w-full', 'w-auto');
import { MODULE_LABEL, LEVEL_LABEL, MODULES, errorOf, fmtDate } from './shared';

const Chip = ({ children, tone = 'bg-slate-100 text-slate-600' }) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{children}</span>;

/* ── Reviews ──────────────────────────────────────────────────────────── */

function ReviewCard({ s, base, onDone }) {
    const [score, setScore] = useState(s.score ?? '');
    const [comment, setComment] = useState(s.comment || '');
    const [showModel, setShowModel] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const save = () => {
        setBusy(true); setError('');
        api.put(`${base}/submissions/${s.id}`, { score: Number(score), comment }).then((r) => onDone(s.id, r.data)).catch((e) => setError(errorOf(e))).finally(() => setBusy(false));
    };
    const tips = (s.autoFeedback || []).filter((f) => f.kind === 'tip');
    return (
        <li className={`${CARD} p-4`} data-review={s.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-bold text-slate-800">{s.student.name} <span className="text-xs font-medium text-slate-400">{s.student.cardNumber}</span></p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        <Chip tone="bg-indigo-50 text-indigo-700">{MODULE_LABEL[s.module] || s.module}</Chip><Chip>{LEVEL_LABEL[s.level] || s.level}</Chip><Chip tone="bg-amber-50 text-amber-700"><span className="capitalize">{s.taskType || s.kind}</span></Chip>
                        <span>{s.lesson} · sent {fmtDate(s.submittedAt)}</span>
                    </p>
                </div>
                {s.status === 'reviewed' && <Chip tone="bg-emerald-50 text-emerald-700">Reviewed {s.score}/100 by {s.reviewedBy}</Chip>}
            </div>
            {s.prompt && <p className="mt-3 text-sm text-slate-600"><span className="font-bold">Task:</span> {s.prompt}</p>}
            <div className="mt-2 rounded-xl bg-slate-50 p-3"><p className={LABEL}>Student&apos;s answer</p><p className="whitespace-pre-line break-words text-sm text-slate-800" data-answer>{s.answer}</p></div>
            {tips.length > 0 && <div className="mt-2 rounded-xl bg-amber-50/70 p-3"><p className={LABEL}>Automatic tips the student saw</p><ul className="space-y-0.5 text-sm text-slate-700">{tips.map((f) => <li key={f.text}>• {f.text}</li>)}</ul></div>}
            {s.model && (
                <div className="mt-2">
                    <button type="button" onClick={() => setShowModel((v) => !v)} aria-expanded={showModel} className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600"><ChevronDown size={14} className={showModel ? 'rotate-180' : ''} /> {showModel ? 'Hide' : 'Show'} the model answer</button>
                    {showModel && <p className="mt-1 whitespace-pre-line rounded-xl bg-indigo-50/50 p-3 text-sm text-slate-700">{s.model}</p>}
                </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto] sm:items-end">
                <label><span className={LABEL}>Score /100</span><input type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} className={INPUT} aria-label="Score out of 100" /></label>
                <label><span className={LABEL}>Comment for the student</span><input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} className={INPUT} placeholder="What was good, and one thing to improve" /></label>
                <button type="button" onClick={save} disabled={busy || score === ''} className={BTN}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} {s.status === 'reviewed' ? 'Update' : 'Save review'}</button>
            </div>
            {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
        </li>
    );
}

export function ReviewsPanel({ base }) {
    const [status, setStatus] = useState('pending');
    const [module, setModule] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [notice, setNotice] = useState('');
    const load = useCallback(() => api.get(`${base}/submissions`, { params: { status, module, page } }).then((r) => { setData(r.data); setError(false); }).catch(() => setError(true)), [base, status, module, page]);
    useEffect(() => { load(); }, [load]);
    const done = (id, r) => {
        setNotice(`Saved: ${r.score}/100.`);
        setData((d) => ({ ...d, submissions: status === 'pending' ? d.submissions.filter((x) => x.id !== id) : d.submissions.map((x) => (x.id === id ? { ...x, ...r } : x)), total: status === 'pending' ? d.total - 1 : d.total }));
    };
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <Segmented options={[['pending', 'Waiting'], ['reviewed', 'Reviewed']]} value={status} onChange={(v) => { setStatus(v); setPage(1); }} />
                <select value={module} onChange={(e) => { setModule(e.target.value); setPage(1); }} className={SELECT} aria-label="Module"><option value="">All modules</option>{MODULES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div>
            {notice && <Banner kind="success" onClose={() => setNotice('')}>{notice}</Banner>}
            {error ? <LoadFailed what="the reviews" onRetry={load} /> : !data ? <Rows count={3} height="h-40" /> : !data.submissions.length ? (
                <Empty icon={Inbox}>{status === 'pending' ? 'Nothing waiting for review. Paragraphs, emails, letters and passage translations students send will appear here.' : 'No reviewed work yet.'}</Empty>
            ) : (
                <>
                    <ul className="space-y-3">{data.submissions.map((s) => <ReviewCard key={s.id} s={s} base={base} onDone={done} />)}</ul>
                    <Pager page={data.page} limit={20} total={data.total} onPage={setPage} noun="submissions" />
                </>
            )}
        </div>
    );
}

/* ── Students ─────────────────────────────────────────────────────────── */

function StudentDialog({ base, id, onClose }) {
    const [d, setD] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => { api.get(`${base}/students/${id}`).then((r) => setD(r.data)).catch((e) => setError(errorOf(e))); }, [base, id]);
    return (
        <Dialog onClose={onClose} size="max-w-3xl">
            <div className="max-h-[85vh] overflow-y-auto p-5">
                <div className="flex items-start justify-between gap-2">
                    <DialogTitle>{d ? d.student.name : 'Student'}</DialogTitle>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                </div>
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
                {!d && !error && <div className="mt-3"><Rows count={4} /></div>}
                {d && (
                    <div className="mt-2 space-y-4" data-student-detail>
                        <p className="text-sm text-slate-600">Level <b>{LEVEL_LABEL[d.level]}</b> · placement {d.placement ? `${LEVEL_LABEL[d.placement.level]} (${d.placement.score}/${d.placement.total})` : 'not taken'} · {d.mistakes} mistakes to revise · certificates: {d.certificates.length ? d.certificates.map((c) => LEVEL_LABEL[c.level]).join(', ') : 'none yet'}</p>
                        <div>
                            <p className={LABEL}>Lessons</p>
                            <div className="overflow-x-auto rounded-xl border border-slate-100">
                                <table className="w-full min-w-[34rem] text-left text-sm">
                                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-2">Lesson</th><th className="px-3 py-2">Module</th><th className="px-3 py-2">Level</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Best</th><th className="px-3 py-2 text-right">Tries</th></tr></thead>
                                    <tbody>{d.lessons.map((l) => (
                                        <tr key={l.id} className="border-t border-slate-100"><td className="px-3 py-1.5 font-medium text-slate-800">{l.title}</td><td className="px-3 py-1.5 text-slate-500">{MODULE_LABEL[l.module]}</td><td className="px-3 py-1.5 text-slate-500">{LEVEL_LABEL[l.level]}</td>
                                            <td className="px-3 py-1.5">{l.status === 'completed' ? <Chip tone="bg-emerald-50 text-emerald-700">Completed</Chip> : l.status === 'started' ? <Chip tone="bg-indigo-50 text-indigo-700">Started</Chip> : <span className="text-xs text-slate-400">—</span>}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{l.bestScore ?? '—'}{l.bestScore !== null ? '%' : ''}</td><td className="px-3 py-1.5 text-right tabular-nums">{l.attempts || '—'}</td></tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                            <p className={LABEL}>Recent results</p>
                            {d.attempts.length ? <ul className="divide-y divide-slate-100 text-sm">{d.attempts.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 py-1.5"><span className="min-w-0 truncate">{a.kind === 'placement' ? 'Placement test' : a.kind === 'daily' ? 'Daily challenge' : a.lesson} <span className="text-xs text-slate-400">{fmtDate(a.createdAt)}</span></span><span className={`shrink-0 font-bold tabular-nums ${a.kind === 'quiz' ? (a.passed ? 'text-emerald-600' : 'text-amber-600') : 'text-slate-600'}`}>{a.score}/{a.total} ({a.percent}%)</span></li>)}</ul> : <p className="text-sm text-slate-500">No results yet.</p>}
                        </div>
                    </div>
                )}
            </div>
        </Dialog>
    );
}

export function StudentsPanel({ base }) {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [error, setError] = useState(false);
    const [open, setOpen] = useState(null);
    useEffect(() => { const t = setTimeout(() => { setQuery(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
    const load = useCallback(() => api.get(`${base}/students`, { params: { search: query, page } }).then((r) => { setData(r.data); setError(false); }).catch(() => setError(true)), [base, query, page]);
    useEffect(() => { load(); }, [load]);
    return (
        <div className="space-y-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or card…" label="Search students" />
            {error ? <LoadFailed what="the students" onRetry={load} /> : !data ? <Rows count={5} /> : !data.students.length ? (
                <Empty icon={Users}>{query ? 'No student matches that search.' : 'No student has opened Linguistic Ability yet.'}</Empty>
            ) : (
                <>
                    <div className={`${CARD} overflow-x-auto`}>
                        <table className="w-full min-w-[46rem] text-left text-sm" data-students>
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2.5">Student</th><th className="px-3 py-2.5">Level</th><th className="px-3 py-2.5">Placement</th><th className="px-3 py-2.5 text-right">Lessons</th><th className="px-3 py-2.5 text-right">Avg score</th><th className="px-3 py-2.5">Certificates</th><th className="px-3 py-2.5 text-right">To review</th><th className="px-3 py-2.5">Last active</th></tr></thead>
                            <tbody>{data.students.map((s) => (
                                <tr key={s.id} className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50/40" onClick={() => setOpen(s.id)} data-student={s.id}>
                                    <td className="px-4 py-2.5"><button type="button" className="text-left font-bold text-slate-800 hover:text-indigo-700" onClick={(e) => { e.stopPropagation(); setOpen(s.id); }}>{s.name}</button><p className="text-xs text-slate-400">{s.cardNumber || s.email}</p></td>
                                    <td className="px-3 py-2.5">{LEVEL_LABEL[s.level]}</td><td className="px-3 py-2.5 text-slate-500">{s.placement ? LEVEL_LABEL[s.placement] : '—'}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{s.completed} / {data.totalLessons}</td><td className="px-3 py-2.5 text-right tabular-nums">{s.average === null ? '—' : `${s.average}%`}</td>
                                    <td className="px-3 py-2.5">{s.certificates.length ? s.certificates.map((c) => LEVEL_LABEL[c]).join(', ') : '—'}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{s.pendingReviews || '—'}</td><td className="px-3 py-2.5 text-slate-500">{fmtDate(s.lastActiveAt)}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                    <Pager page={data.page} limit={20} total={data.total} onPage={setPage} noun="students" />
                </>
            )}
            {open && <StudentDialog base={base} id={open} onClose={() => setOpen(null)} />}
        </div>
    );
}
