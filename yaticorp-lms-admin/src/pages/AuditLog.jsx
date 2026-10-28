/**
 * Admin audit log (super admins see it): what the admin panel's admins —
 * super admins and admins — did, and when. Every change made in this panel
 * and every sign-in to it (recorded on the server by models/AdminAuditLog.js),
 * together with what they did to organizations and inside their panels
 * (OrgAuditLog). Organization admins' own actions are recorded but not listed. Newest first; a row opens to show the
 * request, the address it came from and the safe details kept with it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';
import Select from '../components/Select';
import { ScrollText, Search, Loader2, ChevronDown, AlertTriangle, RefreshCw } from 'lucide-react';

const AREAS = ['Sign-in', 'Students', 'Teachers', 'Courses', 'Enrollments', 'Cards', 'Wallet recharge', 'Rewards', 'Admins', 'Organizations', 'Support', 'Settings', 'Global Quiz', 'Announcements', 'Analytics', 'Competitions', 'Career Path', 'Jobs', 'Linguistic', 'Community', 'Uploads', 'Other'];
const ROLE = { superadmin: 'Super admin', admin: 'Admin' };
const PERIODS = [['1', '24 hours'], ['7', '7 days'], ['30', '30 days'], ['', 'All time']];
const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
// The three filters share one row on a phone, a size smaller there (2026-10-28).
const FILTER = 'w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 sm:px-3 sm:py-2.5 sm:text-sm';
const PAGE = 50;

const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const ago = (d) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const Result = ({ status }) => {
    if (typeof status !== 'number') return null;
    const ok = status < 400;
    return <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{ok ? 'Done' : `Failed ${status}`}</span>;
};

const What = ({ row }) => (
    <>
        <p className="font-medium text-slate-800 break-words">
            {row.label}{row.repeats > 0 && <span className="ml-1.5 text-xs font-semibold text-slate-400">×{row.repeats + 1}</span>}
        </p>
        {(row.target?.name || row.org) && (
            <p className="text-xs text-slate-500 [overflow-wrap:anywhere]">
                {row.target?.name && <>{row.target.name}{row.target.kind ? ` (${row.target.kind})` : ''}</>}
                {row.target?.name && row.org && ' · '}
                {row.org && <>in {row.org.name}</>}
            </p>
        )}
    </>
);

const Details = ({ row }) => {
    const extra = Object.entries(row.details || {}).filter(([k, v]) => k !== 'status' && v !== '' && v != null && typeof v !== 'object');
    return (
        <dl className="grid gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-3 text-xs ring-1 ring-slate-100 sm:grid-cols-2">
            <div className="min-w-0"><dt className="font-bold uppercase tracking-wider text-slate-400">When</dt><dd className="text-slate-700">{when(row.at)}</dd></div>
            <div className="min-w-0"><dt className="font-bold uppercase tracking-wider text-slate-400">Request</dt><dd className="font-mono text-slate-700 [overflow-wrap:anywhere]">{row.method} {row.path || '—'}</dd></div>
            {row.ip && <div className="min-w-0"><dt className="font-bold uppercase tracking-wider text-slate-400">From address</dt><dd className="font-mono text-slate-700">{row.ip}</dd></div>}
            {row.target?.id && <div className="min-w-0"><dt className="font-bold uppercase tracking-wider text-slate-400">Record id</dt><dd className="font-mono text-slate-700 [overflow-wrap:anywhere]">{row.target.id}</dd></div>}
            {extra.map(([k, v]) => <div key={k} className="min-w-0"><dt className="font-bold uppercase tracking-wider text-slate-400">{k.replace(/([A-Z])/g, ' $1')}</dt><dd className="text-slate-700 [overflow-wrap:anywhere]">{String(v)}</dd></div>)}
        </dl>
    );
};

export default function AuditLog() {
    const [q, setQ] = useState('');
    const [adminId, setAdminId] = useState('');
    const [area, setArea] = useState('');
    const [days, setDays] = useState('7');
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [more, setMore] = useState(false);
    const [open, setOpen] = useState(null);

    const params = useCallback((skip) => ({ q: q.trim() || undefined, adminId: adminId || undefined, area: area || undefined, days: days || undefined, skip, limit: PAGE }), [q, adminId, area, days]);
    const load = useCallback(() => {
        setError(null);
        return api.get('/admin/audit-log', { params: params(0) }).then((r) => setData(r.data)).catch((e) => setError(e.response?.data?.message || 'Could not load the audit log'));
    }, [params]);
    useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
    const loadMore = () => {
        setMore(true);
        api.get('/admin/audit-log', { params: params(data.rows.length) })
            .then((r) => setData((d) => ({ ...r.data, rows: [...d.rows, ...r.data.rows] })))
            .catch((e) => setError(e.response?.data?.message || 'Could not load more'))
            .finally(() => setMore(false));
    };
    const toggle = (id) => setOpen((o) => (o === id ? null : id));

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800"><ScrollText className="text-indigo-600" /> Admin audit log</h1>
                    <p className="mt-1 text-sm text-slate-500">What every admin of this panel did: each change, each sign-in and what they did to organizations, with who and when. Passwords and other private details are never kept.</p>
                </div>
                <button type="button" onClick={load} className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:self-auto"><RefreshCw size={15} /> Refresh</button>
            </div>

            {/* Search across the top on a phone, the three filters in one row
                under it; one line with the search from lg. */}
            <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.95fr)] gap-2 sm:gap-3 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))]">
                <div className="relative col-span-3 lg:col-span-1">
                    <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search admin, action, student, course…" aria-label="Search the audit log" className={`${INPUT} pl-9`} />
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                </div>
                <Select value={adminId} onChange={(e) => setAdminId(e.target.value)} aria-label="Admin" className={FILTER}>
                    <option value="">All admins</option>
                    {(data?.admins || []).map((a) => <option key={a._id} value={a._id}>{a.name} ({ROLE[a.role] || a.role}){a.email && a.email !== a.name ? ` · ${a.email}` : ''}</option>)}
                    {data?.removed > 0 && <option value="removed">Removed accounts ({data.removed})</option>}
                </Select>
                <Select value={area} onChange={(e) => setArea(e.target.value)} aria-label="Area" className={FILTER}>
                    <option value="">All areas</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </Select>
                <Select value={days} onChange={(e) => setDays(e.target.value)} aria-label="Period" className={FILTER}>
                    {PERIODS.map(([v, l]) => <option key={l} value={v}>{l}</option>)}
                </Select>
            </div>

            {error && <div role="alert" className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"><AlertTriangle size={16} /> {error}</div>}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {!data ? <div className="p-8 text-center text-slate-500">Loading…</div> : (
                    <>
                        <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-500 sm:px-6">{data.total.toLocaleString('en-IN')} {data.total === 1 ? 'entry' : 'entries'}</p>
                        {data.rows.length === 0 && <p className="px-6 py-12 text-center italic text-slate-400">Nothing recorded for this choice.</p>}

                        {/* From md up: a table; a row opens its details below it. */}
                        {data.rows.length > 0 && (
                            <div className="hidden md:block">
                                <table className="w-full table-fixed border-collapse text-left">
                                    <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                        <th className="w-36 px-4 py-3 font-semibold xl:px-6">When</th>
                                        <th className="w-48 px-4 py-3 font-semibold xl:px-6">Admin</th>
                                        <th className="px-4 py-3 font-semibold xl:px-6">What</th>
                                        <th className="w-44 px-4 py-3 font-semibold xl:px-6">Area</th>
                                        <th className="w-36 px-4 py-3 font-semibold xl:px-6">Result</th>
                                        <th className="w-10" />
                                    </tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {data.rows.map((row) => (
                                            <React.Fragment key={row._id}>
                                                <tr onClick={() => toggle(row._id)} className="cursor-pointer align-top hover:bg-slate-50/60" aria-expanded={open === row._id}>
                                                    <td className="px-4 py-3 text-sm text-slate-600 xl:px-6" title={when(row.at)}>{ago(row.at)}</td>
                                                    <td className="px-4 py-3 xl:px-6"><p className="truncate text-sm font-medium text-slate-800" title={row.adminName}>{row.adminName}</p>{ROLE[row.role] && <p className="text-xs text-slate-500">{ROLE[row.role]}</p>}</td>
                                                    <td className="px-4 py-3 text-sm xl:px-6"><What row={row} /></td>
                                                    <td className="px-4 py-3 xl:px-6"><span className="inline-block max-w-full truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{row.area}</span></td>
                                                    <td className="px-4 py-3 xl:px-6"><Result status={row.status} /></td>
                                                    <td className="py-3 pr-4"><ChevronDown size={16} className={`text-slate-400 transition-transform ${open === row._id ? 'rotate-180' : ''}`} /></td>
                                                </tr>
                                                {open === row._id && <tr><td colSpan="6" className="px-4 pb-4 xl:px-6"><Details row={row} /></td></tr>}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Phones: one card per entry; tapping it opens its details. */}
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {data.rows.map((row) => (
                                <li key={row._id} className="p-4">
                                    <button type="button" onClick={() => toggle(row._id)} aria-expanded={open === row._id} className="block w-full text-left">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 text-sm"><What row={row} /></div>
                                            <Result status={row.status} />
                                        </div>
                                        <p className="mt-1.5 text-xs text-slate-500 [overflow-wrap:anywhere]">{row.adminName}{ROLE[row.role] ? ` · ${ROLE[row.role]}` : ''} · {row.area} · <span title={when(row.at)}>{ago(row.at)}</span></p>
                                    </button>
                                    {open === row._id && <div className="mt-3"><Details row={row} /></div>}
                                </li>
                            ))}
                        </ul>

                        {data.rows.length < data.total && (
                            <div className="border-t border-slate-100 p-4 text-center">
                                <button type="button" onClick={loadMore} disabled={more} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                    {more && <Loader2 size={14} className="animate-spin" />} Show {Math.min(PAGE, data.total - data.rows.length)} more
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
