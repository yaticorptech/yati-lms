/**
 * Linguistic Ability — the teacher's view, shared by platform admins
 * (base '/linguistic/admin', every student) and college coordinators
 * (base '/linguistic/org', their own students only — the server enforces it):
 *   StudentsPanel  progress, quiz results and lessons completed
 * Writing is checked in the lesson, its grammar corrected there, and is the
 * student's own: no review here (2026-10-26).
 */
import { useCallback, useEffect, useState } from 'react';
import { Users, X } from 'lucide-react';
import api from '../../utils/api';
import { LABEL, CARD, Empty, LoadFailed, Rows, SearchInput, Pager, Dialog, DialogTitle } from '../../components/orgUi';
import { MODULE_LABEL, LEVEL_LABEL, errorOf, fmtDate } from './shared';

const Chip = ({ children, tone = 'bg-slate-100 text-slate-600' }) => <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${tone}`}>{children}</span>;

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
                <Empty icon={Users}>{query ? 'No student matches that search.' : 'No student has opened Language Learning yet.'}</Empty>
            ) : (
                <>
                    <div className={`${CARD} overflow-x-auto`}>
                        <table className="w-full min-w-[46rem] text-left text-sm" data-students>
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-2.5">Student</th><th className="px-3 py-2.5">Level</th><th className="px-3 py-2.5">Placement</th><th className="px-3 py-2.5 text-right">Lessons</th><th className="px-3 py-2.5 text-right">Avg score</th><th className="px-3 py-2.5">Certificates</th><th className="px-3 py-2.5">Last active</th></tr></thead>
                            <tbody>{data.students.map((s) => (
                                <tr key={s.id} className="cursor-pointer border-t border-slate-100 hover:bg-indigo-50/40" onClick={() => setOpen(s.id)} data-student={s.id}>
                                    <td className="px-4 py-2.5"><button type="button" className="text-left font-bold text-slate-800 hover:text-indigo-700" onClick={(e) => { e.stopPropagation(); setOpen(s.id); }}>{s.name}</button><p className="text-xs text-slate-400">{s.cardNumber || s.email}</p></td>
                                    <td className="px-3 py-2.5">{LEVEL_LABEL[s.level]}</td><td className="px-3 py-2.5 text-slate-500">{s.placement ? LEVEL_LABEL[s.placement] : '—'}</td>
                                    <td className="px-3 py-2.5 text-right tabular-nums">{s.completed} / {data.totalLessons}</td><td className="px-3 py-2.5 text-right tabular-nums">{s.average === null ? '—' : `${s.average}%`}</td>
                                    <td className="px-3 py-2.5">{s.certificates.length ? s.certificates.map((c) => LEVEL_LABEL[c]).join(', ') : '—'}</td>
                                    <td className="px-3 py-2.5 text-slate-500">{fmtDate(s.lastActiveAt)}</td>
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
