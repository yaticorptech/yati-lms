/**
 * Past institutions (2026-11-14): the Campus record of every institution the student left — kept
 * for good, on their profile. Nothing shows until there is one.
 * Server: GET /api/organizations/student/campus/history (src/campus/student.js).
 */
import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import api from '../utils/api';

const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function PastInstitutions() {
    const [rows, setRows] = useState([]);
    useEffect(() => {
        let live = true;
        api.get('/organizations/student/campus/history').then((r) => { if (live) setRows(r.data?.history || []); }).catch(() => {});
        return () => { live = false; };
    }, []);
    if (!rows.length) return null;
    return (
        <section aria-labelledby="past-inst" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><GraduationCap size={20} /></span>
                <div><h2 id="past-inst" className="text-lg font-bold text-slate-900">Past institutions</h2><p className="text-xs text-slate-500">Your records, kept after you left</p></div>
            </div>
            <ul className="divide-y divide-slate-100">
                {rows.map((h, i) => (
                    <li key={i} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]">
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{h.organizationName || 'Institution'}</p>
                            <p className="text-sm text-slate-600">{h.department}{h.departmentCode ? ` (${h.departmentCode})` : ''} · last in semester {h.semester}{h.section ? ` ${h.section}` : ''}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-slate-500">Adm. {h.admissionNo || '—'}{h.rollNo ? ` · Roll ${h.rollNo}` : ''}</p>
                        </div>
                        <div className="sm:text-right">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${h.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{h.status === 'completed' ? 'Passed out' : 'Left'}</span>
                            <p className="mt-1 text-xs text-slate-500">{day(h.admittedAt)} – {day(h.endedAt)}</p>
                            {h.attendance?.held > 0 && <p className="text-xs text-slate-500">Attendance {h.attendance.percent}% ({h.attendance.present}/{h.attendance.held})</p>}
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
