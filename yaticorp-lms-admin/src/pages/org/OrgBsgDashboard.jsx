/**
 * A BSG office's home: its Scouts & Guides — how many through institutions,
 * how many direct (with no institution, national office only), by section —
 * the institutions and units behind them, and its next exams, camps and
 * trainings. Server: src/nccnss/notices.js (GET /me/bsg/overview).
 */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Compass, Building2, UserCheck, Tent, Megaphone } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Stat, Rows, Empty, PageHeader, LoadFailed } from '../../components/orgUi';
import { formatDate } from '../../utils/dates';
import { NOTICE_KIND_LABEL } from '../../utils/bsg';

const OrgBsgDashboard = () => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const res = await api.get('/organizations/me/bsg/overview', { signal });
            if (isCurrent()) { setData(res.data); setFailed(false); }
        } catch { if (isCurrent()) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 60000, []);
    const t = data?.totals;
    const national = data?.office?.level === 'national';
    const where = national ? 'across India' : `in ${data?.office?.state || 'your state'}`;

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Compass} title={national ? 'BSG National' : `BSG ${data?.office?.state || 'State'}`} subtitle={`Scouts & Guides ${where}.`} />
            {failed && !data ? <div className={CARD}><LoadFailed what="your overview" onRetry={reload} /></div> : (
                <>
                    <div className={`grid grid-cols-2 gap-3 ${national ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                        <Stat icon={Building2} label="Through institutions" value={t?.throughInstitutions} sub={t && `in ${t.institutions} institution${t.institutions === 1 ? '' : 's'}`} loading={!data} />
                        {national && <Stat icon={UserCheck} tone="emerald" label="Direct members" value={t?.direct} sub="No institution — they joined BSG National" loading={!data} />}
                        <Stat icon={Compass} tone="amber" label="Total" value={t && t.throughInstitutions + t.direct} loading={!data} />
                        <Stat icon={Tent} tone="violet" label="Units" value={t?.units} sub="in institutions" loading={!data} />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className={`${CARD} overflow-hidden`}>
                            <p className="border-b border-slate-100 px-5 py-3 text-sm font-bold text-slate-800">By section</p>
                            {!data ? <Rows count={4} /> : !data.sections.length ? <Empty icon={Compass}>No Scouts &amp; Guides yet.</Empty> : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <tr><th className="px-5 py-2.5">Section</th><th className="px-3 py-2.5 text-right">Through institutions</th>{national && <th className="px-5 py-2.5 text-right">Direct</th>}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.sections.map((r) => (
                                            <tr key={r.section || 'none'}>
                                                <td className="px-5 py-2.5 font-semibold text-slate-700">{r.label}</td>
                                                <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{r.throughInstitutions}</td>
                                                {national && <td className="px-5 py-2.5 text-right tabular-nums text-slate-700">{r.direct}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className={`${CARD} overflow-hidden`}>
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                                <p className="text-sm font-bold text-slate-800">Coming up</p>
                                <Link to="/organization/bsg-notices" className="text-xs font-bold text-indigo-600">All notices →</Link>
                            </div>
                            {!data ? <Rows count={3} /> : !data.upcoming.length ? <Empty icon={Megaphone}>No exams, camps or trainings coming up. Publish one under BSG notices.</Empty> : (
                                <ul className="divide-y divide-slate-100">
                                    {data.upcoming.map((n) => (
                                        <li key={n._id} className="px-5 py-3">
                                            <p className="font-semibold text-slate-800">{n.title}</p>
                                            <p className="text-xs text-slate-500">{NOTICE_KIND_LABEL[n.kind]} · {formatDate(n.date)}{n.place ? ` · ${n.place}` : ''}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OrgBsgDashboard;
