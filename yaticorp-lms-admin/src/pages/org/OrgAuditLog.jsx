/**
 * Audit log: who did what in this organization's dashboard, newest first —
 * every sign-in and every change its users (and teachers with a panel
 * sign-in) made, and any change YATICORP made while helping. Filter by
 * person; 50 to a page. Server: src/organizations/users.js (GET /me/audit).
 */
import React, { useState } from 'react';
import { ScrollText, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, Rows, Empty, PageHeader, Avatar, LoadFailed } from '../../components/orgUi';

const when = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const OrgAuditLog = () => {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(false);
    const [adminId, setAdminId] = useState('');
    const [page, setPage] = useState(1);

    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const res = await api.get('/organizations/me/audit', { params: { adminId: adminId || undefined, page }, signal });
            if (isCurrent()) { setData(res.data); setFailed(false); }
        } catch { if (isCurrent()) setFailed(true); }
    };
    const reload = useAutoRefresh(load, 30000, [adminId, page]);
    const pick = (id) => { setAdminId(id); setPage(1); };

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={ScrollText} title="Audit log" subtitle="Every sign-in and change made in this dashboard, and by whom.">
                {data?.people?.length > 0 && (
                    <select value={adminId} onChange={(e) => pick(e.target.value)} aria-label="Person"
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700">
                        <option value="">Everyone</option>
                        {data.people.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                )}
            </PageHeader>
            <div className={`${CARD} overflow-hidden`}>
                {!data ? (failed ? <LoadFailed what="the audit log" onRetry={reload} /> : <Rows count={6} />) : data.rows.length === 0 ? (
                    <Empty icon={ScrollText}>Nothing recorded yet. Sign-ins and changes show up here as they happen.</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {data.rows.map((r) => (
                            <li key={r._id} className="flex items-start gap-3 px-4 py-3 sm:px-6">
                                <Avatar name={r.who} size="h-8 w-8 text-xs" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-slate-800">
                                        <span className="font-semibold">{r.who}</span>
                                        {r.platform && <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">YATICORP</span>}
                                        <span className="text-slate-600"> · {r.action}</span>
                                        {r.action === 'Signed in' && <LogIn size={13} className="ml-1 inline text-emerald-600" />}
                                    </p>
                                    <p className="text-xs text-slate-400">{when(r.at)}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                {data && data.pages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm sm:px-6">
                        <span className="text-slate-500">Page {data.page} of {data.pages} · {data.total} entries</span>
                        <span className="flex gap-1">
                            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Newer"><ChevronLeft size={16} /></button>
                            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40" aria-label="Older"><ChevronRight size={16} /></button>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrgAuditLog;
