/**
 * Admission requests (2026-11-14) — students who asked to join with the organization ID, with
 * the department, semester and section they chose. The office (or the organization) checks it,
 * changes the class if need be, and approves: the student joins and is admitted there, and shows
 * on that department's HOD lists. Or rejects, with a reason.
 * Server: GET|POST /api/organizations/me/campus/requests (src/campus/orgAdmin.js).
 */
import React, { useState } from 'react';
import { Inbox, Check, X } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { PageHead, Card, Button, Select, Empty, Skeleton, LoadFailed, Avatar, Chip, Banner, useData, useToast } from '../ui';

const Row = ({ r, departments, onDone }) => {
    const [f, setF] = useState({ departmentId: r.choice?.departmentId || '', semester: r.choice?.semester ? String(r.choice.semester) : '', section: r.choice?.section || '' });
    const [busy, setBusy] = useState('');
    const [error, setError] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [reason, setReason] = useState('');
    const dept = departments.find((d) => d._id === f.departmentId);
    const changed = r.choice && (f.departmentId !== String(r.choice.departmentId) || f.semester !== String(r.choice.semester) || f.section !== (r.choice.section || ''));
    const decide = async (decision) => {
        setBusy(decision); setError('');
        try {
            const body = decision === 'approve' ? { decision, departmentId: f.departmentId, semester: Number(f.semester), section: f.section } : { decision, reason };
            onDone((await api.post(`${CAMPUS}/requests/${r._id}`, body)).data.message);
        } catch (err) { setError(errorOf(err, 'That did not go through.')); setBusy(''); }
    };
    return (
        <li className="p-4">
            <div className="flex flex-wrap items-start gap-3">
                <Avatar name={r.student.name} src={r.student.picture} />
                <div className="min-w-0 flex-1">
                    <p className="font-semibold text-ink">{r.student.name}</p>
                    <p className="truncate text-xs text-ink-3">{[r.student.cardNumber, r.student.phone, r.student.email].filter(Boolean).join(' · ')}</p>
                    <p className="mt-1 text-xs text-ink-3">Asked {new Date(r.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{r.choice ? <> · chose <b className="text-ink-2">{r.choice.department || 'a department'}, semester {r.choice.semester}{r.choice.section ? ` ${r.choice.section}` : ''}</b></> : ' · no class chosen'}</p>
                </div>
                {changed && <Chip tone="amber">Edited</Chip>}
            </div>
            {!rejecting ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
                    <Select value={f.departmentId} onChange={(e) => setF({ departmentId: e.target.value, semester: '', section: '' })} aria-label="Department">
                        <option value="" disabled>Department</option>
                        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </Select>
                    <Select value={f.semester} onChange={(e) => setF({ ...f, semester: e.target.value })} disabled={!dept} aria-label="Semester">
                        <option value="" disabled>Semester</option>
                        {Array.from({ length: dept?.semesters || 0 }, (_, i) => i + 1).map((n) => <option key={n} value={String(n)}>Semester {n}</option>)}
                    </Select>
                    {dept?.sections?.length > 1 ? (
                        <Select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })} aria-label="Section">
                            <option value="" disabled>Section</option>
                            {dept.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}
                        </Select>
                    ) : <span className="hidden sm:block" />}
                    <div className="flex gap-2">
                        <Button icon={Check} busy={busy === 'approve'} disabled={!!busy || !f.departmentId || !f.semester || (dept?.sections?.length > 1 && !f.section)} onClick={() => decide('approve')}>Add to class</Button>
                        <Button variant="secondary" icon={X} disabled={!!busy} onClick={() => setRejecting(true)}>Reject</Button>
                    </div>
                </div>
            ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                    <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Why? (the student sees this)" className="h-11 min-w-0 flex-1 rounded-xl border border-line-2 px-3 text-sm" />
                    <Button variant="danger" busy={busy === 'reject'} onClick={() => decide('reject')}>Reject request</Button>
                    <Button variant="ghost" onClick={() => setRejecting(false)}>Cancel</Button>
                </div>
            )}
            {error && <div className="mt-2"><Banner>{error}</Banner></div>}
        </li>
    );
};

// `embedded` (2026-11-14): a tab of Admissions, so no page heading of its own.
export default function Requests({ embedded = false, onCount }) {
    const toast = useToast();
    const { data, loading, failed, error, reload } = useData('/requests');
    const rows = data?.requests || [];
    return (
        <>
            {!embedded && <PageHead eyebrow="Admissions" title="Admission requests" sub="Students asking to join with your organization ID, and the department and semester they chose. Change the class if needed, then approve — they are admitted and show on that HOD’s lists." />}
            {loading ? <Card><Skeleton rows={4} /></Card> : failed ? <Card><LoadFailed what="the requests" onRetry={reload} error={error} /></Card> : !rows.length ? (
                <Card><Empty icon={Inbox} title="No requests to join">When an existing student links their card to your organization, it shows here. Check their class, then add them — they get an admission number automatically.</Empty></Card>
            ) : (
                <Card className="overflow-hidden"><ul className="divide-y divide-line">{rows.map((r) => <Row key={r._id} r={r} departments={data.departments || []} onDone={(m) => { toast(m); reload(); onCount?.(); }} />)}</ul></Card>
            )}
        </>
    );
}
