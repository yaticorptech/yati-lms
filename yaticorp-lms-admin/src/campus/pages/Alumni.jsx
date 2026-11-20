/**
 * Alumni (2026-11-14): the organization's students, every department, who passed out or left — still members, and those
 * who left the institution (their record kept in their own history). Nothing is deleted when a
 * student's time ends. Server: GET /api/organizations/me/campus/alumni (src/campus/orgAdmin.js).
 */
import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { PageHead, Card, Chip, Empty, Skeleton, LoadFailed, Person, Roll, Register, TH, TD, SearchBox, Select, useData, plural } from '../ui';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function Alumni() {
    const { data, loading, failed, error, reload } = useData('/alumni');
    const [q, setQ] = useState('');
    const [kind, setKind] = useState('all');
    const [deptId, setDeptId] = useState('');
    const term = q.trim().toLowerCase();
    const inDept = (data?.alumni || []).filter((r) => !deptId || String(r.departmentId) === deptId);
    const rows = inDept.filter((r) => (kind === 'all' || r.status === kind) && (!term || `${r.name} ${r.rollNo} ${r.admissionNo} ${r.cardNumber}`.toLowerCase().includes(term)));
    const count = (k) => inDept.filter((r) => r.status === k).length;
    const head = <PageHead eyebrow="Your institution" title="Alumni" sub="Every student who passed out or left, from every department — with their record, kept for good." />;
    if (loading && !data) return <>{head}<Card><Skeleton rows={5} /></Card></>;
    if (failed) return <>{head}<Card><LoadFailed what="the alumni" onRetry={reload} error={error} /></Card></>;
    return (
        <>
            {head}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <SearchBox value={q} onChange={setQ} placeholder="Name, roll, admission or card no." className="sm:w-80" />
                {(data?.departments || []).length > 1 && <Select value={deptId} onChange={(e) => setDeptId(e.target.value)} aria-label="Department" className="sm:w-56"><option value="">All departments</option>{data.departments.map((d) => <option key={d._id} value={String(d._id)}>{d.name}</option>)}</Select>}
                <div className="flex gap-1 rounded-xl border border-line bg-white p-1">
                    {[['all', 'All', inDept.length], ['completed', 'Passed out', count('completed')], ['left', 'Left', count('left')]].map(([k, l, n]) => (
                        <button key={k} type="button" onClick={() => setKind(k)} className={`flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${kind === k ? 'bg-petrol-700 text-white' : 'text-ink-2 hover:bg-porcelain'}`}>{l} <span className="text-xs opacity-70">{n}</span></button>
                    ))}
                </div>
            </div>
            {!rows.length ? (
                <Card><Empty icon={GraduationCap} title={inDept.length || (data?.alumni || []).length ? 'No one matches' : 'No alumni yet'}>Students who pass out or leave stay here, with their whole record.</Empty></Card>
            ) : (
                <>
                    <p className="mb-2 text-xs text-ink-3">{plural(rows.length, 'student')}</p>
                    <Register min="min-w-[720px]">
                        <thead><tr><TH>Roll</TH><TH>Student</TH><TH>Admission no.</TH><TH>Department · last class</TH><TH>Status</TH><TH>Admitted</TH><TH>Ended</TH></tr></thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={`${r._id}-${i}`}>
                                    <TD><Roll value={r.rollNo} /></TD>
                                    <TD><Person name={r.name} sub={r.cardNumber || r.email} src={r.picture} /></TD>
                                    <TD className="font-mono text-xs">{r.admissionNo || '—'}</TD>
                                    <TD className="text-sm">{r.department || '—'}<span className="block text-xs text-ink-3">Sem {r.semester}{r.section ? ` · ${r.section}` : ''}</span></TD>
                                    <TD><Chip tone={r.status === 'completed' ? 'green' : 'grey'}>{r.status === 'completed' ? 'Passed out' : 'Left'}</Chip>{!r.member && <span className="ml-1 text-[11px] text-ink-3">left the institution</span>}{r.endReason && r.endReason !== 'Passed out' && <span className="block text-[11px] text-ink-3">{r.endReason}</span>}</TD>
                                    <TD className="whitespace-nowrap text-sm">{fmt(r.admittedAt)}</TD>
                                    <TD className="whitespace-nowrap text-sm">{fmt(r.endedAt)}</TD>
                                </tr>
                            ))}
                        </tbody>
                    </Register>
                </>
            )}
        </>
    );
}
