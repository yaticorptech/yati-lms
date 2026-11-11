/**
 * 360 toppers (2026-11-05): the three students with the highest 360 score in each
 * department (course) the organization added under Teachers → Courses & sections.
 * A student is in a department when a 360 teacher who teaches one of its sections
 * has them on their list. Server: GET /organizations/me/classes/toppers.
 * Hidden while 360 is locked or no department has been added.
 */
import React, { useState } from 'react';
import { Trophy, Users, GraduationCap } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Avatar, Rows } from '../orgUi';

const fmt = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const MEDALS = [
    { label: '1st', ring: 'ring-amber-300', badge: 'bg-amber-400 text-amber-950' },
    { label: '2nd', ring: 'ring-slate-300', badge: 'bg-slate-300 text-slate-800' },
    { label: '3rd', ring: 'ring-orange-300', badge: 'bg-orange-300 text-orange-950' }
];

const Org360Toppers = () => {
    const [departments, setDepartments] = useState(null);
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const r = await api.get('/organizations/me/classes/toppers', { signal });
            if (isCurrent()) setDepartments(r.data.departments || []);
        } catch { if (isCurrent()) setDepartments((d) => d || []); }
    };
    useAutoRefresh(load, 60000, []);

    if (departments === null) return <div className={CARD}><div className="p-5"><Rows count={2} height="h-16" /></div></div>;
    if (!departments.length) return null;

    return (
        <section className={CARD} aria-labelledby="toppers-title">
            <div className="flex items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Trophy size={18} aria-hidden /></span>
                <div className="min-w-0">
                    <h2 id="toppers-title" className="text-base font-bold text-slate-800">Top 360 scorers by department</h2>
                    <p className="text-xs text-slate-500">The three highest 360 scores in each course, from marks your 360 teachers have given.</p>
                </div>
            </div>
            <ul className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
                {departments.map((d) => (
                    <li key={d._id} className="bg-white p-4 sm:p-5">
                        <div className="mb-3 flex items-baseline justify-between gap-2">
                            <h3 className="truncate text-sm font-bold text-slate-800" title={d.name}>{d.name}</h3>
                            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400 tabular-nums"><Users size={12} aria-hidden />{d.students}</span>
                        </div>
                        {d.top.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                                {d.students ? 'No marks given yet.' : 'No students tracked by this course’s 360 teachers yet.'}
                            </p>
                        ) : (
                            <ol className="space-y-2">
                                {d.top.map((s, i) => (
                                    <li key={s._id} className="flex items-center gap-3 rounded-xl bg-slate-50/70 px-3 py-2">
                                        <div className="relative shrink-0">
                                            <div className={`rounded-full ring-2 ${MEDALS[i].ring}`}><Avatar name={s.name} src={s.profilePicture} size="h-9 w-9 text-xs" /></div>
                                            <span className={`absolute -bottom-1 -right-1 rounded-full px-1 text-[9px] font-black leading-4 ${MEDALS[i].badge}`}>{i + 1}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-800">{s.name}</p>
                                            {s.cardNumber && <p className="truncate text-[11px] text-slate-400 tabular-nums">{s.cardNumber}</p>}
                                            {s.mentors?.length > 0 && (
                                                <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-slate-500" title={`Mentor: ${s.mentors.join(', ')}`}>
                                                    <GraduationCap size={12} className="shrink-0 text-indigo-400" aria-hidden />
                                                    <span className="truncate"><span className="font-semibold text-slate-600">{s.mentors.length > 1 ? 'Mentors' : 'Mentor'}:</span> {s.mentors.join(', ')}</span>
                                                </p>
                                            )}
                                        </div>
                                        <span className="shrink-0 rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-700 tabular-nums" aria-label={`${MEDALS[i].label}, score ${fmt(s.score)}`}>{fmt(s.score)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default Org360Toppers;
