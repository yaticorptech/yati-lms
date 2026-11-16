/**
 * My marks cards — on the profile (2026-11-13): the semester exams the
 * institution's examination board has published, each with this student's own
 * marks only, grades, SGPA and result, and a printable statement of marks.
 * Nothing shows until there is a published card.
 * Server: GET /api/organizations/student/campus/marks-cards (src/campus/student.js).
 */
import React, { useEffect, useState } from 'react';
import { Award, Printer, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { marksCard, printDocs } from './print';
import { SOON } from './soon';

export const printCard = (data, card) => printDocs(`Marks card — ${card.name}`, [marksCard({ inst: data.institution, department: data.department, student: { ...data.student, section: data.student.section }, exam: card, result: card })]);

export const CardRows = ({ card }) => (
    <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-sm tabular-nums">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-slate-500"><th className="py-2 pr-3 font-semibold">Subject</th><th className="px-2 text-center font-semibold">Credits</th><th className="px-2 text-center font-semibold">Marks</th><th className="px-2 text-center font-semibold">Grade</th><th className="pl-2 text-right font-semibold">Result</th></tr></thead>
            <tbody>{card.subjects.map((s) => (
                <tr key={s.subjectId} className="border-t border-slate-100">
                    <td className="py-2.5 pr-3"><span className="mr-2 font-mono text-[11px] text-[#7d602a]">{s.code}</span>{s.name}</td>
                    <td className="px-2 text-center text-slate-500">{s.credits}</td>
                    <td className="px-2 text-center font-semibold">{s.marks === undefined ? '—' : s.marks === null ? 'AB' : `${s.marks}/${s.max}`}</td>
                    <td className="px-2 text-center font-bold">{s.grade || '—'}</td>
                    <td className={`pl-2 text-right text-xs font-bold ${s.marks === undefined ? 'text-slate-400' : s.passed ? 'text-[#145250]' : 'text-rose-600'}`}>{s.marks === undefined ? 'Pending' : s.passed ? 'Pass' : 'Fail'}</td>
                </tr>
            ))}</tbody>
        </table>
    </div>
);

export default function MarksCards() {
    const [data, setData] = useState(null);
    const [open, setOpen] = useState(null);
    useEffect(() => {
        let live = true;
        api.get('/organizations/student/campus/marks-cards').then((r) => { if (live) { setData(r.data); setOpen(r.data.cards?.[0]?._id || null); } }).catch(() => {});
        return () => { live = false; };
    }, []);
    // Exams are coming soon (Institution.jsx SOON): no marks cards on the profile until they open.
    if (SOON.has('marks') || !data?.cards?.length) return null;
    return (
        <section aria-labelledby="marks-cards" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#0e3b3a] to-[#145250] px-5 py-4 text-white">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#efdfba]"><Award size={20} /></span>
                <div className="min-w-0"><h2 id="marks-cards" className="text-lg font-bold">My marks cards</h2><p className="truncate text-xs text-white/70">{data.institution.name} · {data.department.name}</p></div>
            </div>
            <ul className="divide-y divide-slate-100">
                {data.cards.map((c) => {
                    const isOpen = open === c._id;
                    return (
                        <li key={c._id}>
                            <button onClick={() => setOpen(isOpen ? null : c._id)} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50">
                                <span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{c.name}</span><span className="text-xs text-slate-500">Semester {c.semester}</span></span>
                                <span className="flex items-center gap-3">
                                    {c.sgpa !== null && <span className="text-right"><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">SGPA</span><span className="text-lg font-black text-slate-800">{c.sgpa.toFixed(2)}</span></span>}
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${!c.complete ? 'bg-slate-100 text-slate-500' : c.failed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{c.result}</span>
                                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                </span>
                            </button>
                            {isOpen && (
                                <div className="px-5 pb-5">
                                    <CardRows card={c} />
                                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                        <p className="text-sm text-slate-500">Total <b className="text-slate-800">{c.total}/{c.max}</b> · {c.max ? Math.round((c.total / c.max) * 1000) / 10 : 0}%</p>
                                        <button onClick={() => printCard(data, c)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><Printer size={16} /> Print / save PDF</button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
