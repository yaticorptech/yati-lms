/**
 * Fees — the fee structure (admission, tuition, hostel… per semester or for
 * every semester), and the collections ledger: what each student owes, has paid
 * and still owes. Exam fees come from the semester exams students apply for.
 * Collecting a payment issues a numbered receipt the student sees too.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Plus, Pencil, Trash2, Receipt } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../context';
import StudentRecord from './StudentRecord';
import {
    PageHead, Card, Tabs, Button, Dialog, Field, Input, Select, Banner, Chip, Register, TH, TD, Roll, Person, SearchBox, SemesterSelect, SectionSelect,
    Figure, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, useSubmit, rupees, day, semestersOf, FEE_KINDS
} from '../ui';

const FeeDialog = ({ dept, fee, onClose, onDone }) => {
    const [f, setF] = useState({ title: fee?.title || '', kind: fee?.kind || 'tuition', amount: fee?.amount ?? '', semester: fee?.semester ?? 0, dueDate: fee?.dueDate || '' });
    const { busy, error, run } = useSubmit();
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = { ...f, amount: Number(f.amount), departmentId: dept._id };
            onDone((fee ? await api.put(`${CAMPUS}/fees/${fee._id}`, body) : await api.post(`${CAMPUS}/fees`, body)).data.message);
        });
    };
    return (
        <Dialog title={fee ? 'Edit fee' : 'Add a fee'} sub={dept.name} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="fee-form" busy={busy}>{fee ? 'Save' : 'Add fee'}</Button></>}>
            <form id="fee-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="What for" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Tuition fee — odd semester" required /></Field>
                <Field label="Kind"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{FEE_KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field label="Amount (₹)"><Input type="number" min={0} step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
                <Field label="Charged in"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}><option value={0}>Every semester</option>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n} only</option>)}</Select></Field>
                <Field label="Due date"><Input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
                <p className="text-xs text-ink-3 sm:col-span-2">Exam fees are set on each semester exam by the examination board, and charged to the students who apply.</p>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

const Structure = () => {
    const { dept } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const { data, loading, failed, reload } = useData('/fees', { departmentId: dept._id });
    const [editing, setEditing] = useState(null);
    const fees = data?.fees || [];
    const done = (m) => { setEditing(null); toast(m); reload(); };
    const remove = async (f) => {
        if (!await confirm({ title: `Remove ${f.title}?`, body: 'Students will no longer owe it. Payments already received for it stay on their receipts.', action: 'Remove fee', danger: true })) return;
        try { done((await api.delete(`${CAMPUS}/fees/${f._id}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const groups = [0, ...semestersOf(dept)].map((n) => [n, fees.filter((f) => f.semester === n)]).filter(([, rows]) => rows.length);
    return (
        <>
            <div className="mb-4 flex justify-end"><Button icon={Plus} onClick={() => setEditing('new')}>Add fee</Button></div>
            {loading ? <Card><Skeleton rows={3} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !fees.length ? (
                <Card><Empty icon={Wallet} title="Set the fee structure" action={<Button icon={Plus} onClick={() => setEditing('new')}>Add fee</Button>}>Admission, tuition, hostel, transport… for every semester or one.</Empty></Card>
            ) : (
                <div className="space-y-4">
                    {groups.map(([n, rows]) => (
                        <Card key={n} className="overflow-hidden">
                            <div className="flex items-center justify-between border-b border-line bg-paper px-5 py-3">
                                <h3 className="font-display text-base font-semibold">{n ? `Semester ${n}` : 'Every semester'}</h3>
                                <span className="text-sm font-semibold tabular-nums">{rupees(rows.reduce((t, f) => t + f.amount, 0))}</span>
                            </div>
                            <ul className="divide-y divide-line">{rows.map((f) => (
                                <li key={f._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                                    <div><p className="text-sm font-medium">{f.title}</p><p className="text-xs text-ink-3">{(FEE_KINDS.find(([k]) => k === f.kind) || [])[1]}{f.dueDate ? ` · due ${day(f.dueDate)}` : ''}</p></div>
                                    <div className="flex items-center gap-1"><span className="mr-2 font-semibold tabular-nums">{rupees(f.amount)}</span>
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(f)} aria-label="Edit" /><Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(f)} aria-label="Remove" /></div>
                                </li>
                            ))}</ul>
                        </Card>
                    ))}
                </div>
            )}
            {editing && <FeeDialog dept={dept} fee={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={done} />}
            {confirmDialog}
        </>
    );
};

const Ledger = () => {
    const { dept } = useCampus();
    const [f, setF] = useState({ semester: '', section: '', status: '', search: '' });
    const [term, setTerm] = useState('');
    useEffect(() => { const t = setTimeout(() => setTerm(f.search), 250); return () => clearTimeout(t); }, [f.search]);
    const { data, loading, failed, reload } = useData('/fees/ledger', { departmentId: dept._id, semester: f.semester, section: f.section, status: f.status, search: term });
    const [open, setOpen] = useState(null);
    const rows = data?.students || [];
    return (
        <>
            {data && (
                <div className="mb-5 grid grid-cols-3 gap-3">
                    <Figure label="Billed" value={rupees(data.totals.total)} />
                    <Figure label="Collected" value={rupees(data.totals.paid)} tone="text-petrol-700" />
                    <Figure label="Outstanding" value={rupees(data.totals.balance)} tone={data.totals.balance ? 'text-amber-700' : 'text-ink'} />
                </div>
            )}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <SearchBox value={f.search} onChange={(v) => setF({ ...f, search: v })} placeholder="Name, roll or admission no." className="sm:w-72" />
                <SemesterSelect dept={dept} any value={f.semester} onChange={(v) => setF({ ...f, semester: v })} className="sm:w-44" />
                <SectionSelect dept={dept} value={f.section} onChange={(v) => setF({ ...f, section: v })} className="sm:w-40" />
                <Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status" className="sm:w-40"><option value="">Everyone</option><option value="due">With dues</option><option value="paid">Fully paid</option></Select>
            </div>
            {loading && !data ? <Card><Skeleton rows={6} /></Card> : failed ? <Card><LoadFailed onRetry={reload} /></Card> : !rows.length ? <Card><Empty icon={Receipt}>No students match.</Empty></Card> : (
                <Register>
                    <thead><tr><TH>Roll</TH><TH>Student</TH><TH>Class</TH><TH className="text-right">Billed</TH><TH className="text-right">Paid</TH><TH className="text-right">Balance</TH><TH className="text-right">Status</TH></tr></thead>
                    <tbody>{rows.map((s) => (
                        <tr key={s._id} tabIndex={0} onClick={() => setOpen(s._id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(s._id)} className="cursor-pointer hover:bg-petrol-50/60 focus:bg-petrol-50 focus:outline-none">
                            <TD><Roll value={s.rollNo} /></TD><TD><Person name={s.name} sub={s.admissionNo} src={s.picture} /></TD><TD>Sem {s.semester}{s.section && dept.sections.length > 1 ? ` · ${s.section}` : ''}</TD>
                            <TD className="text-right">{rupees(s.total)}</TD><TD className="text-right text-petrol-700">{rupees(s.paid)}</TD>
                            <TD className={`text-right font-semibold ${s.balance ? 'text-amber-700' : ''}`}>{rupees(s.balance)}</TD>
                            <TD className="text-right">{s.balance === 0 ? <Chip tone="green">Paid</Chip> : s.overdue ? <Chip tone="red">Overdue</Chip> : <Chip tone="amber">Due</Chip>}</TD>
                        </tr>
                    ))}</tbody>
                </Register>
            )}
            {open && <StudentRecord studentId={open} startTab="fees" onClose={() => setOpen(null)} onChanged={reload} />}
        </>
    );
};

export default function Fees() {
    const { dept, role } = useCampus();
    const [params, setParams] = useSearchParams();
    const canSet = role === 'admin' || role === 'department';
    const tab = canSet && params.get('tab') === 'structure' ? 'structure' : 'ledger';
    return (
        <>
            <PageHead eyebrow={dept.name} title="Fees" sub="Open a student to collect a payment and print the receipt. Students see their dues and receipts in their Institution dashboard.">
                {canSet && <Tabs value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} options={[['ledger', 'Collections'], ['structure', 'Fee structure']]} />}
            </PageHead>
            {tab === 'ledger' ? <Ledger /> : <Structure />}
        </>
    );
}
