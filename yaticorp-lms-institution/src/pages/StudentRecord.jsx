/**
 * One student's record, opened from Admissions or Fees: the admission (and its
 * form), attendance by subject, fees with receipts (collect a payment, print or
 * cancel a receipt), and exams. Also the admission form itself (AdmissionForm),
 * shared by "New admission" and "Edit admission".
 */
import React, { useState } from 'react';
import { Pencil, Printer, Plus, Wallet, CalendarCheck, GraduationCap, X } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../App';
import { receipt as receiptDoc, printDocs } from '../print';
import {
    Drawer, Dialog, Tabs, Card, Button, Field, Input, Select, Banner, Chip, Meter, Skeleton, LoadFailed, Empty, Person,
    useData, useToast, useConfirm, useSubmit, rupees, day, pct, attendanceTone, semestersOf, MODES, SOON, ComingSoonPage
} from '../ui';

const GROUPS = [
    ['Personal', ['dob', 'gender', 'bloodGroup', 'category', 'nationality', 'religion', 'motherTongue']],
    ['Parents and guardian', ['fatherName', 'fatherPhone', 'fatherOccupation', 'motherName', 'motherPhone', 'guardianName', 'guardianPhone']],
    ['Address', ['address', 'city', 'state', 'pincode']],
    ['Previous education', ['previousInstitution', 'previousBoard', 'previousPercentage']],
    ['Other', ['quota', 'hostel', 'transport']]
];
const CHOICES = { gender: ['Female', 'Male', 'Other'], bloodGroup: ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'], category: ['General', 'OBC', 'SC', 'ST', 'EWS', 'Other'], quota: ['Merit', 'Management', 'NRI', 'Sports', 'Other'], hostel: ['Yes', 'No'], transport: ['Yes', 'No'] };

/**
 * The admission form: class placement and the details. `student` set: edit;
 * `pick`: admit that existing student; `fresh`: a new student — their account is
 * made from their AI card (number, CVV, QR code number) and their sign-in emailed.
 */
export const AdmissionForm = ({ dept, student, pick, fresh, card, onClose, onDone, onBack }) => {
    const [person, setPerson] = useState({ name: '', email: '', phone: '', cardNumber: card?.cardNumber || '', cvv: '', qrCodeNumber: card?.qrCodeNumber || '' });
    const setP = (k) => (e) => setPerson({ ...person, [k]: e.target.value });
    const { ctx } = useCampus();
    const labels = Object.fromEntries((ctx.detailFields || []).map((f) => [f.key, f.label]));
    const year = new Date().getFullYear();
    const [f, setF] = useState({
        semester: student?.semester || 1, section: student?.section || dept.sections?.[0] || '', rollNo: student?.rollNo || '',
        admissionNo: student?.admissionNo || '', academicYear: student?.academicYear || `${year}–${String(year + 1).slice(2)}`,
        admittedAt: (student?.admittedAt || new Date().toISOString()).slice(0, 10), status: student?.status || 'studying'
    });
    const [details, setDetails] = useState(student?.details || {});
    const { busy, error, run } = useSubmit();
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = { ...f, details, departmentId: dept._id };
            const res = student ? await api.put(`${CAMPUS}/students/${student._id}`, body)
                : fresh ? await api.post(`${CAMPUS}/students/new`, { ...body, student: person })
                    : await api.post(`${CAMPUS}/students`, { ...body, userId: pick._id });
            onDone(res.data.message, res.data.studentId);
        });
    };
    const who = student || pick || { name: person.name || 'New student' };
    return (
        <Dialog size="max-w-3xl" title={student ? 'Edit admission' : fresh ? 'New admission' : 'Admission form'} sub={`${who.name} · ${dept.name}`} onClose={onClose}
            footer={<>{onBack && <Button variant="ghost" onClick={onBack} className="mr-auto">Back</Button>}<Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="admission-form" busy={busy}>{student ? 'Save admission' : 'Admit student'}</Button></>}>
            <form id="admission-form" onSubmit={submit} className="space-y-7">
                {/* Who is being admitted (2026-11-14): their account's details — the ones they registered with their AI card. */}
                {!fresh && (
                    <section>
                        <h3 className="mb-3 font-display text-base font-semibold">Student</h3>
                        <dl className="grid gap-3 rounded-xl border border-line bg-paper p-4 sm:grid-cols-4">
                            {[['Name', who.name], ['Mobile', who.phone], ['Email', who.email], ['AI card', who.cardNumber]].map(([k, v]) => (
                                <div key={k} className="min-w-0">
                                    <dt className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">{k}</dt>
                                    <dd className={`mt-0.5 truncate text-sm font-semibold ${v ? 'text-ink' : 'text-ink-3'} ${k === 'AI card' ? 'font-mono' : ''}`} title={v || undefined}>{v || 'Not given'}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                )}
                {fresh && (
                    <section>
                        <h3 className="mb-3 font-display text-base font-semibold">Student</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Full name" className="sm:col-span-3"><Input value={person.name} onChange={setP('name')} required autoFocus /></Field>
                            <Field label="Email" hint="Their sign-in details are sent here."><Input type="email" value={person.email} onChange={setP('email')} required /></Field>
                            <Field label="Phone"><Input type="tel" inputMode="tel" value={person.phone} onChange={setP('phone')} required /></Field>
                            <div className="hidden sm:block" />
                            <Field label="AI card number"><Input value={person.cardNumber} onChange={setP('cardNumber')} className="font-mono" required /></Field>
                            <Field label="CVV"><Input value={person.cvv} onChange={setP('cvv')} inputMode="numeric" className="font-mono" required /></Field>
                            <Field label="QR code number"><Input value={person.qrCodeNumber} onChange={setP('qrCodeNumber')} className="font-mono" required /></Field>
                        </div>
                        <p className="mt-2 text-xs text-ink-3">From the student’s YATICORP AI card. The card gives them their Institution dashboard.</p>
                    </section>
                )}
                <section>
                    <h3 className="mb-3 font-display text-base font-semibold">Class</h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Semester"><Select value={f.semester} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}>{semestersOf(dept).filter((n) => student || n <= 2).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                        {dept.sections?.length > 1 && <Field label="Section"><Select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })}>{dept.sections.map((s) => <option key={s} value={s}>Section {s}</option>)}</Select></Field>}
                        <Field label="Roll number"><Input value={f.rollNo} onChange={(e) => setF({ ...f, rollNo: e.target.value })} placeholder="e.g. 24CS001" /></Field>
                        {/* Given automatically from Settings → Admission numbers (2026-11-14); only an existing record's can be corrected. */}
                        {student && <Field label="Admission number"><Input value={f.admissionNo} onChange={(e) => setF({ ...f, admissionNo: e.target.value })} /></Field>}
                        <Field label="Academic year"><Input value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })} /></Field>
                        <Field label="Date of admission"><Input type="date" value={f.admittedAt} onChange={(e) => setF({ ...f, admittedAt: e.target.value })} /></Field>
                        {student && <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="studying">Studying</option><option value="completed">Course completed</option><option value="left">Left / transferred</option></Select></Field>}
                    </div>
                </section>
                {GROUPS.map(([title, keys]) => (
                    <section key={title}>
                        <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {keys.map((k) => (
                                <Field key={k} label={labels[k] || k} className={k === 'address' ? 'sm:col-span-3' : ''}>
                                    {CHOICES[k] ? (
                                        <Select value={details[k] || ''} onChange={(e) => setDetails({ ...details, [k]: e.target.value })}><option value="">—</option>{CHOICES[k].map((c) => <option key={c}>{c}</option>)}</Select>
                                    ) : <Input type={k === 'dob' ? 'date' : 'text'} inputMode={/Phone|pincode|Percentage/.test(k) ? 'numeric' : undefined} value={details[k] || ''} onChange={(e) => setDetails({ ...details, [k]: e.target.value })} />}
                                </Field>
                            ))}
                        </div>
                    </section>
                ))}
                {error && <Banner>{error}</Banner>}
            </form>
        </Dialog>
    );
};

/** Record a payment against a fee item (or anything else). */
const CollectDialog = ({ student, items, preset, onClose, onDone }) => {
    const due = items.filter((i) => i.balance > 0);
    const first = preset || due[0];
    const [f, setF] = useState({ item: first ? (first._id || `exam:${first.examId}`) : 'other', amount: first?.balance || '', mode: 'cash', ref: '', date: new Date().toISOString().slice(0, 10), title: '' });
    const { busy, error, run } = useSubmit();
    const chosen = items.find((i) => (i._id || `exam:${i.examId}`) === f.item);
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = { amount: Number(f.amount), mode: f.mode, ref: f.ref, date: f.date, title: f.item === 'other' ? f.title : undefined };
            if (chosen?._id) body.feeId = chosen._id;
            if (chosen?.examId) body.examId = chosen.examId;
            const res = await api.post(`${CAMPUS}/students/${student._id}/payments`, body);
            onDone(res.data.message, res.data.payment);
        });
    };
    return (
        <Dialog title="Collect a payment" sub={student.name} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="collect-form" busy={busy} icon={Wallet}>Record &amp; issue receipt</Button></>}>
            <form id="collect-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Towards" className="sm:col-span-2">
                    <Select value={f.item} onChange={(e) => { const it = items.find((i) => (i._id || `exam:${i.examId}`) === e.target.value); setF({ ...f, item: e.target.value, amount: it ? it.balance || it.amount : '' }); }}>
                        {items.map((i) => <option key={i._id || i.examId} value={i._id || `exam:${i.examId}`}>{i.title} — {i.balance ? `${rupees(i.balance)} due` : 'paid'}</option>)}
                        <option value="other">Something else…</option>
                    </Select>
                </Field>
                {f.item === 'other' && <Field label="What for" className="sm:col-span-2"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Library fine, ID card…" required /></Field>}
                <Field label="Amount (₹)"><Input type="number" min="0.01" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
                <Field label="Date"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} max={new Date().toISOString().slice(0, 10)} /></Field>
                <Field label="Mode"><Select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })}>{MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field label="Reference" hint="UTR, cheque or DD number"><Input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></Field>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

const Detail = ({ label, value }) => (
    <div className="min-w-0"><dt className="text-[11px] font-semibold uppercase tracking-[.12em] text-ink-3">{label}</dt><dd className="mt-0.5 truncate text-sm text-ink">{value || '—'}</dd></div>
);

export default function StudentRecord({ studentId, onClose, onChanged, startTab = 'profile' }) {
    const { ctx, role } = useCampus();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const { data, loading, failed, reload } = useData(`/students/${studentId}`);
    const [tab, setTab] = useState(startTab);
    const [editing, setEditing] = useState(false);
    const [collect, setCollect] = useState(null);   // true | an item
    const changed = (msg) => { if (msg) toast(msg); reload(); onChanged?.(); };
    const labels = Object.fromEntries((ctx.detailFields || []).map((f) => [f.key, f.label]));
    const s = data?.student;
    const printReceipt = (p) => printDocs(`Receipt ${p.receipt}`, [receiptDoc(ctx.organization, s, { ...p, mode: (MODES.find(([k]) => k === p.mode) || [])[1] || p.mode })]);
    const cancel = async (p) => {
        if (!await confirm({ title: `Cancel receipt ${p.receipt}?`, body: `${rupees(p.amount)} towards ${p.title} will no longer count as paid.`, action: 'Cancel receipt', danger: true })) return;
        try { changed((await api.delete(`${CAMPUS}/students/${studentId}/payments/${p._id}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const removeAdmission = async () => {
        if (!await confirm({ title: `Remove ${s.name}’s admission?`, body: 'Their admission, attendance, marks, receipts and applications are deleted. To keep the record, edit the admission and set the status to “Left” instead.', action: 'Remove admission', danger: true })) return;
        try { toast((await api.delete(`${CAMPUS}/students/${studentId}`)).data.message); onChanged?.(); onClose(); } catch (err) { toast(errorOf(err), 'error'); }
    };

    return (
        <Drawer onClose={onClose} title={s?.name || 'Student'} sub={s ? `${data.department?.name} · Semester ${s.semester}${s.section ? ` ${s.section}` : ''} · Roll ${s.rollNo || '—'}` : ''}
            actions={s && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>}>
            {loading ? <Skeleton rows={6} /> : failed ? <LoadFailed what="this record" onRetry={reload} /> : (
                <>
                    <Card className="mb-5 flex flex-wrap items-center justify-between gap-4 p-4">
                        <Person name={s.name} sub={`${s.email}${s.phone ? ` · ${s.phone}` : ''}`} src={s.picture} />
                        <div className="flex gap-6 text-sm">
                            <div><p className="text-[11px] uppercase tracking-[.12em] text-ink-3">Attendance</p><p className={`font-display text-lg font-semibold ${attendanceTone(data.attendance.percent)}`}>{pct(data.attendance.percent)}</p></div>
                            {!SOON.has('fees') && <div><p className="text-[11px] uppercase tracking-[.12em] text-ink-3">Fee balance</p><p className={`font-display text-lg font-semibold ${data.fees.balance ? 'text-amber-700' : 'text-petrol-700'}`}>{rupees(data.fees.balance)}</p></div>}
                        </div>
                    </Card>
                    <Tabs className="mb-5" value={tab} onChange={setTab} options={[['profile', 'Admission'], ['attendance', 'Attendance'], ['fees', SOON.has('fees') ? 'Fees · soon' : 'Fees'], ['exams', SOON.has('board') ? 'Exams · soon' : 'Exams']]} />
                    {tab === 'fees' && SOON.has('fees') && <ComingSoonPage title="Fees" icon={Wallet} text="Fee structure, collections and receipts are on their way." />}
                    {tab === 'exams' && SOON.has('board') && <ComingSoonPage title="Exams" icon={GraduationCap} text="Exam applications, admit cards and marks cards are on their way." />}

                    {tab === 'profile' && (
                        <div className="space-y-4">
                            <Card className="p-5">
                                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                    <Detail label="Admission no." value={s.admissionNo} /><Detail label="Roll no." value={s.rollNo} /><Detail label="AI card" value={s.cardNumber} />
                                    <Detail label="Academic year" value={s.academicYear} /><Detail label="Admitted" value={day(s.admittedAt)} />
                                    <Detail label="Status" value={{ studying: 'Studying', completed: 'Completed', left: 'Left' }[s.status]} />
                                </dl>
                            </Card>
                            {GROUPS.map(([title, keys]) => keys.some((k) => s.details?.[k]) && (
                                <Card key={title} className="p-5">
                                    <h3 className="mb-3 font-display text-base font-semibold">{title}</h3>
                                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">{keys.filter((k) => s.details[k]).map((k) => <Detail key={k} label={labels[k]} value={k === 'dob' ? day(s.details[k]) : s.details[k]} />)}</dl>
                                </Card>
                            ))}
                            {(role === 'admin' || role === 'admission') && <button onClick={removeAdmission} className="text-sm font-medium text-rose-700 hover:underline">Remove admission…</button>}
                        </div>
                    )}

                    {tab === 'attendance' && (data.attendance.subjects.length ? (
                        <Card className="divide-y divide-line">
                            {data.attendance.subjects.map((x) => (
                                <div key={x._id} className="flex items-center gap-4 p-4">
                                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{x.name}</p><p className="text-xs text-ink-3">{x.code ? `${x.code} · ` : ''}Semester {x.semester} · {x.present} of {x.held} classes</p></div>
                                    <div className="w-32"><Meter value={x.percent} /></div>
                                    <span className={`w-14 text-right font-semibold tabular-nums ${attendanceTone(x.percent)}`}>{pct(x.percent)}</span>
                                </div>
                            ))}
                        </Card>
                    ) : <Card><Empty icon={CalendarCheck} title="No classes recorded yet">Attendance appears here as teachers take it.</Empty></Card>)}

                    {tab === 'fees' && !SOON.has('fees') && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-ink-2">{rupees(data.fees.paid)} paid of {rupees(data.fees.total)}</p>
                                <Button icon={Plus} onClick={() => setCollect(true)}>Collect payment</Button>
                            </div>
                            <Card className="divide-y divide-line">
                                {data.fees.items.length ? data.fees.items.map((i) => (
                                    <div key={i._id || i.examId} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                        <div><p className="text-sm font-medium">{i.title}</p><p className="text-xs text-ink-3">{rupees(i.amount)}{i.dueDate ? ` · due ${day(i.dueDate)}` : ''}</p></div>
                                        <div className="flex items-center gap-3">
                                            <Chip tone={{ paid: 'green', partial: 'brass', overdue: 'red', due: 'amber' }[i.status]}>{{ paid: 'Paid', partial: `${rupees(i.balance)} left`, overdue: 'Overdue', due: 'Due' }[i.status]}</Chip>
                                            {i.balance > 0 && <Button size="sm" variant="secondary" onClick={() => setCollect(i)}>Collect</Button>}
                                        </div>
                                    </div>
                                )) : <Empty icon={Wallet}>No fees set for this semester. Add them under Fees.</Empty>}
                            </Card>
                            <h3 className="pt-2 font-display text-base font-semibold">Receipts</h3>
                            <Card className="divide-y divide-line">
                                {data.fees.payments.length ? data.fees.payments.map((p) => (
                                    <div key={p._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                        <div><p className="text-sm font-medium">{p.title} <span className="font-mono text-xs text-ink-3">· {p.receipt}</span></p><p className="text-xs text-ink-3">{day(p.at)} · {(MODES.find(([k]) => k === p.mode) || [])[1]}{p.ref ? ` · ${p.ref}` : ''}{p.by ? ` · by ${p.by}` : ''}</p></div>
                                        <div className="flex items-center gap-1"><span className="mr-2 font-semibold tabular-nums">{rupees(p.amount)}</span>
                                            <Button size="sm" variant="ghost" icon={Printer} onClick={() => printReceipt(p)} aria-label="Print receipt" /><Button size="sm" variant="ghost" icon={X} onClick={() => cancel(p)} aria-label="Cancel receipt" /></div>
                                    </div>
                                )) : <p className="p-4 text-sm text-ink-3">No payments yet.</p>}
                            </Card>
                        </div>
                    )}

                    {tab === 'exams' && !SOON.has('board') && (data.exams.length ? (
                        <div className="space-y-3">
                            {data.exams.map((e) => (
                                <Card key={e._id} className="p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-medium">{e.name} <span className="text-xs text-ink-3">· Semester {e.semester}</span></p>
                                        <span className="flex gap-1.5">
                                            {e.application && <Chip tone={{ approved: 'green', rejected: 'red', applied: 'amber' }[e.application.status]}>Application {e.application.status}</Chip>}
                                            {e.kind === 'semester' && e.result.complete && <Chip tone={e.result.failed ? 'red' : 'green'}>{e.result.result}{e.result.sgpa ? ` · SGPA ${e.result.sgpa}` : ''}</Chip>}
                                            {!e.published && <Chip>Not published</Chip>}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">{e.result.subjects.filter((x) => x.marks !== undefined).map((x) => <span key={x.subjectId} className="rounded-lg bg-porcelain px-2 py-1 text-xs">{x.name}: <b className={x.passed ? '' : 'text-rose-700'}>{x.marks === null ? 'AB' : x.marks}</b></span>)}</div>
                                </Card>
                            ))}
                        </div>
                    ) : <Card><Empty icon={GraduationCap} title="No exams yet">Applications and marks appear here.</Empty></Card>)}

                    {editing && <AdmissionForm dept={data.department} student={s} onClose={() => setEditing(false)} onDone={(m) => { setEditing(false); changed(m); }} />}
                    {collect && <CollectDialog student={s} items={data.fees.items} preset={collect === true ? null : collect} onClose={() => setCollect(null)} onDone={(m) => { setCollect(null); changed(m); setTab('fees'); }} />}
                    {confirmDialog}
                </>
            )}
        </Drawer>
    );
}
