/**
 * Admissions — the register of students, a department at a time.
 *   Admission office and administrator: "New admission" — a new student (their
 *   account made from their AI card) or one already in the organization — with
 *   the admission form: class, roll number, parents, address, previous education.
 *   Department: the same page as "Students" — the list of students the admission
 *   office admitted to it, each record to open; and Promote, a semester at a time.
 */
import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, ArrowUpRight, Users, Search, ChevronRight, CreditCard, UserCheck, CheckCheck, ScanLine } from 'lucide-react';
import CardScanBox from '../../components/CardScanBox';
import api, { CAMPUS, errorOf } from '../api';
import { useCampus } from '../context';
import StudentRecord, { AdmissionForm } from './StudentRecord';
import Applications from './Applications';
import { useSearchParams } from 'react-router-dom';
import {
    PageHead, Tabs, Input, Register, TH, TD, Button, Dialog, Field, Select, SearchBox, SemesterSelect, SectionSelect, Chip, Roll, Person,
    Empty, Skeleton, LoadFailed, Banner, useData, useToast, useSubmit, plural, semestersOf, day
} from '../ui';

/** Step 1 of a new admission: find the student among the organization's. */
export const PickStudent = ({ onPick, onFresh, onClose, title = 'New admission' }) => {
    const [q, setQ] = useState('');
    const [term, setTerm] = useState('');
    useEffect(() => { const t = setTimeout(() => setTerm(q), 250); return () => clearTimeout(t); }, [q]);
    // Nobody listed until a search or a scan (2026-11-14): no recent or joined students shown.
    const { data, loading } = useData(term.trim() ? '/candidates' : null, { search: term });
    const rows = term.trim() ? data?.students || [] : [];
    // Scan card (2026-11-14): checked first — a member opens straight away; a student of no organization
    // can be brought in; an unregistered card starts a new student with it.
    const [scanning, setScanning] = useState(false);
    const [card, setCard] = useState(null);      // { code, result, cardNumber, message, studentName }
    const [joining, setJoining] = useState(false);
    const scanned = useRef('');
    const find = (code) => { scanned.current = code; setQ(code); setTerm(code); };
    const onScan = async (text) => {
        setScanning(false); setCard(null);
        try {
            const a = (await api.post('/organizations/me/cards/check', { code: text })).data;
            if (a.result === 'member') find(text); else setCard({ ...a, code: text });
        } catch (err) { setCard({ code: text, result: 'error', message: errorOf(err, 'That card could not be checked.') }); }
    };
    const bringIn = async () => {
        setJoining(true);
        try { await api.post('/organizations/me/cards', { codes: [card.code] }); const code = card.code; setCard(null); find(code); }
        catch (err) { setCard({ ...card, message: errorOf(err, 'They could not be added.') }); }
        finally { setJoining(false); }
    };
    useEffect(() => {
        if (!scanned.current || loading || term !== scanned.current) return;
        scanned.current = '';
        if (rows.length === 1) onPick(rows[0]);
    }, [loading, term, rows]); // eslint-disable-line react-hooks/exhaustive-deps
    return (
        <Dialog title={title} sub="Choose or scan a student already in your organization who has no class yet." onClose={onClose}>
            <div className="flex gap-2">
                <div className="min-w-0 flex-1"><SearchBox value={q} onChange={setQ} placeholder="Name, email, phone or card number" /></div>
                <Button variant={scanning ? 'primary' : 'secondary'} icon={ScanLine} onClick={() => setScanning((v) => !v)} aria-pressed={scanning}>Scan card</Button>
            </div>
            {scanning && (
                <div className="mt-3">
                    <CardScanBox id="qr-reader-admission" onClose={() => setScanning(false)} onRead={onScan} />
                </div>
            )}
            {card && (
                <div className="mt-3 rounded-xl border border-petrol-200 bg-petrol-50/60 p-4">
                    <p className="text-sm font-semibold text-ink">{card.studentName || (card.cardNumber ? `Card ${card.cardNumber}` : 'This card')}</p>
                    <p className="mt-0.5 text-sm text-ink-2">
                        {card.result === 'student' ? 'Registered, but not in your organization yet.'
                            : card.result === 'ready' || card.result === 'linked' ? 'Nobody has registered with this card yet.' : card.message}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {card.result === 'student' && <Button icon={UserPlus} busy={joining} onClick={bringIn}>Add to your organization</Button>}
                        {onFresh && (card.result === 'ready' || card.result === 'linked') && <Button icon={CreditCard} onClick={() => onFresh({ cardNumber: card.cardNumber || '', qrCodeNumber: card.code !== card.cardNumber ? card.code : '' })}>New student with this card</Button>}
                        <Button variant="ghost" onClick={() => setCard(null)}>Close</Button>
                    </div>
                </div>
            )}
            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl border border-line">
                {!term.trim() ? <div className="p-6 text-center text-sm text-ink-3"><Search size={18} className="mx-auto mb-2" />Search by name, email, phone or card number, or scan their card.</div> : loading ? <div className="p-6 text-center text-sm text-ink-3">Searching…</div> : rows.length ? (
                    <ul className="divide-y divide-line">
                        {rows.map((s) => (
                            <li key={s._id}>
                                <button onClick={() => onPick(s)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-petrol-50">
                                    <Person name={s.name} sub={`${s.email}${s.cardNumber ? ` · ${s.cardNumber}` : ''}`} src={s.picture} />
                                    <ChevronRight size={16} className="shrink-0 text-ink-3" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : <div className="p-6 text-center text-sm text-ink-3"><Search size={18} className="mx-auto mb-2" />{term ? 'No student found who is waiting for admission.' : 'Every student in your organization is admitted.'}</div>}
            </div>
        </Dialog>
    );
};

/** New admission: a new student with their AI card, or one already in the organization. */
const ChooseKind = ({ onPick, onClose }) => (
    <Dialog title="New admission" sub="Who is being admitted?" onClose={onClose}>
        <div className="grid gap-3 sm:grid-cols-2">
            {[['fresh', CreditCard, 'A new student', 'Make their account from their AI card and admit them in one form.'], ['existing', UserCheck, 'Already in the organization', 'An existing student added with their card: choose or scan them and pick their class. No form.']].map(([k, Icon, t, d]) => (
                <button key={k} onClick={() => onPick(k)} className="group rounded-2xl border border-line bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-petrol-200 hover:shadow-md">
                    <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-petrol-50 text-petrol-700 group-hover:bg-petrol-700 group-hover:text-white"><Icon size={20} /></span>
                    <span className="block font-display text-lg font-semibold">{t}</span>
                    <span className="mt-1 block text-sm text-ink-2">{d}</span>
                </button>
            ))}
        </div>
    </Dialog>
);

// New admissions are into the 1st year only (2026-11-14): semesters 1–2.
const firstYearOf = (dept) => (dept ? Array.from({ length: Math.min(2, dept.semesters || 1) }, (_, i) => i + 1) : [1]);
const ORDINAL = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
const yearsOf = (dept) => Math.ceil((dept?.semesters || 0) / 2);

// Promote (2026-11-14): each semester's From → To, fixed. The semester chosen on the page alone, or
// every semester (of the chosen year), last first so classes never merge; each with its own button.
const PromoteDialog = ({ dept, semester, year, counts, onClose, onDone }) => {
    const [busy, setBusy] = useState(0);
    const [done, setDone] = useState({});
    const [error, setError] = useState('');
    const list = semester ? [semester] : semestersOf(dept).filter((n) => !year || Math.ceil(n / 2) === Number(year)).reverse();
    const promote = async (n) => {
        setBusy(n); setError('');
        try { const m = (await api.post(`${CAMPUS}/students/promote`, { departmentId: dept._id, semester: n })).data.message; setDone((d) => ({ ...d, [n]: m })); onDone(m); }
        catch (err) { setError(errorOf(err, 'That did not go through.')); }
        finally { setBusy(0); }
    };
    return (
        <Dialog title="Promote" sub={dept.name} onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Close</Button>}>
            <ul className="space-y-2">
                {list.map((n) => {
                    const last = n >= dept.semesters;
                    const count = counts?.[n] || 0;
                    return (
                        <li key={n} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-white px-3 py-2.5">
                            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
                                <span>Semester {n}</span>
                                <span aria-hidden="true" className="text-ink-3">→</span>
                                {/* The final semester passes out: off the register, onto Alumni (2026-11-14). */}
                                <span className={last ? 'text-emerald-700' : ''}>{last ? 'Alumni' : `Semester ${n + 1}`}</span>
                            </span>
                            <span className="row-span-2">
                                {done[n] ? <Chip tone="green">Done</Chip>
                                    : <Button size="sm" busy={busy === n} disabled={!!busy || !count} onClick={() => promote(n)}>{last ? 'Send to alumni' : 'Promote'}</Button>}
                            </span>
                            <span className={`text-xs ${count ? 'font-semibold text-ink-2' : 'text-ink-3'}`}>{plural(count, 'student')}</span>
                        </li>
                    );
                })}
            </ul>
            {error && <div className="mt-3"><Banner>{error}</Banner></div>}
        </Dialog>
    );
};

/** Admit the ticked students in one go: one semester and section, an admission number each. */
// Existing students added by their card (2026-11-14): straight into their class — department, any semester,
// section — with the next admission number. No admission form: they already study here.
export const BulkAdmitDialog = ({ students, dept: given, onClose, onDone }) => {
    const { departments } = useCampus();
    const year = new Date().getFullYear();
    const [f, setF] = useState({ departmentId: given?._id || (departments.length === 1 ? departments[0]._id : ''), semester: 1, section: '', academicYear: `${year}–${String(year + 1).slice(2)}` });
    const dept = departments.find((d) => d._id === f.departmentId);
    const { busy, error, run } = useSubmit();
    return (
        <Dialog title={students.length === 1 ? `Add ${students[0].name} to a class` : `Add ${plural(students.length, 'student')} to a class`} sub="Existing students: no admission form" onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button busy={busy} icon={CheckCheck} disabled={!dept || (dept.sections?.length > 1 && !f.section)} onClick={() => run(async () => onDone((await api.post(`${CAMPUS}/students/place`, { ...f, userIds: students.map((s) => s._id) })).data.message))}>Add to class</Button></>}>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Department"><Select value={f.departmentId} onChange={(e) => setF({ ...f, departmentId: e.target.value, semester: 1, section: '' })}><option value="" disabled>Choose department</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select></Field>
                <Field label="Semester"><Select value={f.semester} disabled={!dept} onChange={(e) => setF({ ...f, semester: Number(e.target.value) })}>{semestersOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></Field>
                {dept?.sections?.length > 1 && <Field label="Section"><Select value={f.section} onChange={(e) => setF({ ...f, section: e.target.value })}><option value="" disabled>Choose section</option>{dept.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}</Select></Field>}
                <Field label="Academic year"><Input value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })} /></Field>
            </div>
            <p className="mt-4 text-sm text-ink-2">They get an admission number and can use their department straight away.</p>
            {students.length > 1 && <p className="mt-2 max-h-28 overflow-y-auto rounded-xl bg-paper p-3 text-xs text-ink-3">{students.map((x) => x.name).join(', ')}</p>}
            {error && <div className="mt-3"><Banner>{error}</Banner></div>}
        </Dialog>
    );
};

/** 2 · Accepted (2026-11-14), organization-wide: each student's department, semester and section, checked and
 * corrected here; Admit gives the next admission number and puts them in that class. Send back: to Applications. */
const ClassCells = ({ s, departments, onSaved }) => {
    const toast = useToast();
    const [f, setF] = useState({ departmentId: String(s.departmentId || ''), semester: s.semester || 1, section: s.section || '' });
    const dept = departments.find((d) => d._id === f.departmentId);
    const save = async (next) => {
        setF(next);
        const d = departments.find((x) => x._id === next.departmentId);
        if (!d || (d.sections?.length > 1 && !next.section)) return;
        try { await api.put(`${CAMPUS}/admissions/${s._id}/class`, next); onSaved(); }
        catch (err) { toast(errorOf(err, 'The class could not be changed.')); }
    };
    return (
        <>
            <TD><Select value={f.departmentId} onChange={(e) => save({ departmentId: e.target.value, semester: 1, section: '' })} aria-label={`${s.name}: department`} className="min-w-[9rem]">{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select></TD>
            <TD><Select value={f.semester} onChange={(e) => save({ ...f, semester: Number(e.target.value) })} aria-label={`${s.name}: semester`} className="min-w-[7.5rem]">{firstYearOf(dept).map((n) => <option key={n} value={n}>Semester {n}</option>)}</Select></TD>
            <TD>{dept?.sections?.length > 1 ? <Select value={f.section} onChange={(e) => save({ ...f, section: e.target.value })} aria-label={`${s.name}: section`} className="min-w-[6.5rem]"><option value="" disabled>Section</option>{dept.sections.map((x) => <option key={x} value={x}>{x}</option>)}</Select> : <span className="text-ink-3">—</span>}</TD>
        </>
    );
};
const Accepted = ({ data: acc, onChanged }) => {
    const toast = useToast();
    const { data, loading, failed, reload } = acc;
    const departments = data?.departments || [];
    const [only, setOnly] = useState('');
    const rows = (data?.students || []).filter((r) => !only || String(r.departmentId) === only);
    const [picked, setPicked] = useState(new Set());
    const [busy, setBusy] = useState('');
    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const all = rows.length > 0 && rows.every((r) => picked.has(r._id));
    const act = async (path, ids, key) => {
        setBusy(key);
        try { toast((await api.post(`${CAMPUS}/students/${path}`, { userIds: ids })).data.message); setPicked(new Set()); onChanged(); }
        catch (err) { toast(errorOf(err, 'That did not go through.')); }
        finally { setBusy(''); }
    };
    return (
        <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <Select value={only} onChange={(e) => setOnly(e.target.value)} aria-label="Department" className="w-56"><option value="">All departments</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</Select>
                <p className="text-sm text-ink-2">{data ? plural(rows.length, 'student') : ''} — check the class, then admit</p>
                {picked.size > 0 && (
                    <span className="ml-auto flex gap-2">
                        <Button variant="secondary" busy={busy === 'back'} disabled={!!busy} onClick={() => act('send-back', [...picked], 'back')}>Send back</Button>
                        <Button icon={CheckCheck} busy={busy === 'all'} disabled={!!busy} onClick={() => act('admit', [...picked], 'all')}>Admit {picked.size}</Button>
                    </span>
                )}
            </div>
            {loading && !data ? <Register><tbody><tr><td><Skeleton rows={5} /></td></tr></tbody></Register> : failed ? <Register><tbody><tr><td><LoadFailed what="the accepted students" onRetry={reload} /></td></tr></tbody></Register> : !rows.length ? (
                <Register><tbody><tr><td><Empty icon={UserCheck} title="No one waiting to be admitted">Accept applications first; they wait here for their admission.</Empty></td></tr></tbody></Register>
            ) : (
                <Register>
                    <thead><tr>
                        <TH className="w-10"><input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-petrol-600" checked={all} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r._id)) : new Set())} /></TH>
                        <TH>Student</TH><TH>AI card</TH><TH>Department</TH><TH>Semester</TH><TH>Section</TH><TH className="text-right" />
                    </tr></thead>
                    <tbody>{rows.map((s) => (
                        <tr key={s._id} className={picked.has(s._id) ? 'bg-petrol-50/60' : ''}>
                            <TD><input type="checkbox" aria-label={`Select ${s.name}`} className="h-4 w-4 accent-petrol-600" checked={picked.has(s._id)} onChange={() => toggle(s._id)} /></TD>
                            <TD><Person name={s.name} sub={s.email} src={s.picture} /></TD>
                            <TD className="font-mono text-xs text-ink-2">{s.cardNumber || '—'}</TD>
                            <ClassCells s={s} departments={departments} onSaved={reload} />
                            <TD className="text-right"><Button size="sm" icon={UserPlus} busy={busy === s._id} disabled={!!busy} onClick={() => act('admit', [s._id], s._id)}>Admit</Button></TD>
                        </tr>
                    ))}</tbody>
                </Register>
            )}
        </>
    );
};

/** New admission: which department first. */
const ChooseDept = ({ departments, onPick, onClose }) => {
    const [id, setId] = useState(departments.length === 1 ? departments[0]._id : '');
    const d = departments.find((x) => x._id === id);
    return (
        <Dialog title="New admission" sub="Into the 1st year of" onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!d} onClick={() => onPick(d)}>Next</Button></>}>
            <Field label="Department"><Select value={id} onChange={(e) => setId(e.target.value)}><option value="" disabled>Choose department</option>{departments.map((x) => <option key={x._id} value={x._id}>{x.name}</option>)}</Select></Field>
        </Dialog>
    );
};

/** The organization's students not admitted to any department yet: admit one (with the form), or many at once. */
export const NotAdmitted = ({ onChanged }) => {
    const toast = useToast();
    const [q, setQ] = useState('');
    const [term, setTerm] = useState('');
    useEffect(() => { const t = setTimeout(() => setTerm(q), 250); return () => clearTimeout(t); }, [q]);
    const { data, loading, failed, reload } = useData('/candidates', { search: term, limit: 1000 });
    const [picked, setPicked] = useState(new Set());
    const [bulk, setBulk] = useState(false);
    const rows = data?.students || [];
    const toggle = (id) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const all = rows.length > 0 && rows.every((r) => picked.has(r._id));
    return (
        <>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchBox value={q} onChange={setQ} placeholder="Name, email, phone or card no." className="sm:w-80" />
                <p className="text-sm text-ink-2 sm:ml-2">{data ? `${plural(data.total, 'student')} in your institution with no class yet` : ''}</p>
                {picked.size > 0 && <Button className="sm:ml-auto" icon={CheckCheck} onClick={() => setBulk(true)}>Add {picked.size} to a class</Button>}
            </div>
            {loading && !data ? <Register><tbody><tr><td><Skeleton rows={6} /></td></tr></tbody></Register> : failed ? <Register><tbody><tr><td><LoadFailed what="your students" onRetry={reload} /></td></tr></tbody></Register> : !rows.length ? (
                <Register><tbody><tr><td><Empty icon={UserCheck} title={term ? 'No one matches' : 'Everyone is admitted'}>{term ? 'Try another search.' : 'Every student in your institution has been admitted to a department.'}</Empty></td></tr></tbody></Register>
            ) : (
                <Register>
                    <thead><tr>
                        <TH className="w-10"><input type="checkbox" aria-label="Select all" className="h-4 w-4 accent-petrol-600" checked={all} onChange={(e) => setPicked(e.target.checked ? new Set(rows.map((r) => r._id)) : new Set())} /></TH>
                        <TH>Student</TH><TH>Phone</TH><TH>AI card</TH><TH>Class (their profile)</TH><TH>Joined</TH><TH className="text-right" />
                    </tr></thead>
                    <tbody>{rows.map((s) => (
                        <tr key={s._id} className={picked.has(s._id) ? 'bg-petrol-50/60' : ''}>
                            <TD><input type="checkbox" aria-label={`Select ${s.name}`} className="h-4 w-4 accent-petrol-600" checked={picked.has(s._id)} onChange={() => toggle(s._id)} /></TD>
                            <TD><Person name={s.name} sub={s.email} src={s.picture} /></TD>
                            <TD className="text-ink-2">{s.phone || '—'}</TD>
                            <TD className="font-mono text-xs text-ink-2">{s.cardNumber || '—'}</TD>
                            <TD className="text-ink-2">{s.className || '—'}</TD>
                            <TD className="text-ink-2">{day(s.joinedAt)}</TD>
                            <TD className="text-right"><Button size="sm" variant="secondary" icon={UserPlus} onClick={() => { setPicked(new Set([s._id])); setBulk(true); }}>Add to class</Button></TD>
                        </tr>
                    ))}</tbody>
                </Register>
            )}
            {bulk && <BulkAdmitDialog students={rows.filter((r) => picked.has(r._id))} onClose={() => setBulk(false)}
                onDone={(m) => { setBulk(false); setPicked(new Set()); toast(m); reload(); onChanged(); }} />}
        </>
    );
};

/** 3 · Admitted: one department's register (the department picker on top). */
const AdmittedList = ({ tabs }) => {
    const { dept, role } = useCampus();
    const promotes = role === 'admin' || role === 'department';
    const toast = useToast();
    const [filters, setFilters] = useState({ year: '', semester: '', section: '', status: 'studying', search: '' });
    const [term, setTerm] = useState('');
    useEffect(() => { const t = setTimeout(() => setTerm(filters.search), 250); return () => clearTimeout(t); }, [filters.search]);
    const { data, loading, failed, reload } = useData('/students', { departmentId: dept._id, year: filters.year, semester: filters.semester, section: filters.section, status: filters.status, search: term });
    const [step, setStep] = useState(null);     // 'promote'
    const [open, setOpen] = useState(null);     // a student id
    const rows = data?.students || [];

    return (
        <>
            <PageHead eyebrow={dept.name} title={role === 'department' ? 'Students' : 'Admissions'}
                sub={role === 'department' ? 'The students the admission office admitted to your department. Open one for their admission, attendance, fees and exams.' : 'Each department’s admitted students.'}>
                {promotes && <Button variant="secondary" icon={ArrowUpRight} onClick={() => setStep('promote')}>{filters.semester ? `Promote semester ${filters.semester}` : 'Promote'}</Button>}
            </PageHead>

            {tabs}

            {/* The batches (2026-11-14): 1st, 2nd, 3rd year — two semesters each. */}
            {yearsOf(dept) > 1 && (
                <Tabs className="mb-3" value={String(filters.year)} onChange={(y) => setFilters({ ...filters, year: y, semester: '' })}
                    options={[['', 'All years', Object.values(data?.perSemester || {}).reduce((a, b) => a + b, 0)], ...Array.from({ length: yearsOf(dept) }, (_, i) => [String(i + 1), `${ORDINAL[i]} year`, (data?.perSemester?.[i * 2 + 1] || 0) + (data?.perSemester?.[i * 2 + 2] || 0)])]} />
            )}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <SearchBox value={filters.search} onChange={(v) => setFilters({ ...filters, search: v })} placeholder="Name, roll, admission or card no." className="sm:w-80" />
                <Select value={String(filters.semester)} onChange={(e) => setFilters({ ...filters, semester: e.target.value === '' ? '' : Number(e.target.value) })} aria-label="Semester" className="sm:w-44">
                    <option value="">{filters.year ? `Both semesters` : 'All semesters'}</option>
                    {semestersOf(dept).filter((n) => !filters.year || Math.ceil(n / 2) === Number(filters.year)).map((n) => <option key={n} value={n}>Semester {n}</option>)}
                </Select>
                <SectionSelect dept={dept} value={filters.section} onChange={(v) => setFilters({ ...filters, section: v })} className="sm:w-40" />
            </div>

            {loading && !data ? <Register><tbody><tr><td><Skeleton rows={6} /></td></tr></tbody></Register> : failed ? <Register><tbody><tr><td><LoadFailed what="the students" onRetry={reload} /></td></tr></tbody></Register> : !rows.length ? (
                <Register><tbody><tr><td><Empty icon={Users} title={term || filters.semester ? 'No one matches' : 'No students admitted yet'}>
                    {term || filters.semester ? 'Try another search or semester.' : (role === 'admin' || role === 'admission') ? 'Admit students from the Accepted tab.' : 'Students appear here once the admission office admits them to your department.'}
                </Empty></td></tr></tbody></Register>
            ) : (
                <>
                    <p className="mb-2 text-xs text-ink-3">{plural(rows.length, 'student')}</p>
                    <Register>
                        <thead><tr><TH>Roll</TH><TH>Student</TH><TH>Admission no.</TH><TH>Class</TH><TH>AI card</TH><TH>Admitted</TH><TH className="text-right">Status</TH></tr></thead>
                        <tbody>
                            {rows.map((s) => (
                                <tr key={s._id} onClick={() => setOpen(s._id)} onKeyDown={(e) => e.key === 'Enter' && setOpen(s._id)} tabIndex={0} className="cursor-pointer transition hover:bg-petrol-50/60 focus:bg-petrol-50 focus:outline-none">
                                    <TD><Roll value={s.rollNo} /></TD>
                                    <TD><Person name={s.name} sub={s.email} src={s.picture} /></TD>
                                    <TD className="font-mono text-xs text-ink-2">{s.admissionNo}</TD>
                                    <TD>Sem {s.semester}{s.section && dept.sections.length > 1 ? ` · ${s.section}` : ''}</TD>
                                    <TD className="font-mono text-xs text-ink-2">{s.cardNumber || '—'}</TD>
                                    <TD className="text-ink-2">{day(s.admittedAt)}</TD>
                                    <TD className="text-right"><Chip tone={{ studying: 'green', completed: 'brass', left: 'grey' }[s.status]}>{{ studying: 'Studying', completed: 'Completed', left: 'Left' }[s.status]}</Chip></TD>
                                </tr>
                            ))}
                        </tbody>
                    </Register>
                </>
            )}

            {step === 'promote' && <PromoteDialog dept={dept} semester={Number(filters.semester) || 0} year={filters.year} counts={data?.perSemester} onClose={() => { setStep(null); reload(); }} onDone={(m) => { toast(m); reload(); }} />}
            {open && <StudentRecord studentId={open} onClose={() => setOpen(null)} onChanged={reload} />}
        </>
    );
};

/**
 * Admissions (2026-11-14): the pipeline, organization-wide — 1 · Applications (requests to join, and members
 * with no class) → 2 · Accepted (class checked, no admission number yet) → 3 · Admitted (each department's
 * register). New admissions are into the 1st year only. A department's own sign-in sees its register alone.
 */
export default function Admissions() {
    const { role, departments } = useCampus();
    const admits = role === 'admin' || role === 'admission';
    const toast = useToast();
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab');
    // Join requests from existing students live in Campus → Students (2026-11-16); this page is new admissions only.
    const view = !admits ? 'admitted' : ['accepted', 'admitted'].includes(tab) ? tab : 'applications';
    const setView = (v) => setParams(v === 'applications' ? {} : { tab: v }, { replace: true });
    // Online applications from the college's admission link (2026-11-16).
    const apps = useData(admits ? '/applications/count' : null);
    const waiting = useData(admits ? '/candidates' : null, { limit: 1 });
    const accepted = useData(admits ? '/admissions/accepted' : null);
    const refreshAll = () => { waiting.reload(); accepted.reload(); apps.reload(); window.dispatchEvent(new Event('campus-counts')); };
    // New admission: the department first, then the student.
    const [step, setStep] = useState(null);    // 'dept' | 'kind' | 'fresh' | 'pick' | { pick } | { fresh }
    const [newDept, setNewDept] = useState(null);
    const done = (m) => { setStep(null); toast(m); refreshAll(); };

    const tabs = admits && (
        <Tabs className="mb-4" value={view} onChange={setView} options={[
            ['applications', '1 · Applications', apps.data?.pending || 0],
            ['accepted', '2 · Waiting for admission', accepted.data?.students?.length || 0],
            ['admitted', '3 · Admitted']
        ]} />
    );
    if (view === 'admitted') return <AdmittedList tabs={tabs} />;
    return (
        <>
            <PageHead eyebrow="Campus" title="Admissions" sub="New students joining in the 1st year: share your admission link so they apply online, or fill their form yourself (New admission). Existing students asking to join are in Campus → Students.">
                <Button icon={UserPlus} onClick={() => setStep('dept')}>New admission</Button>
            </PageHead>
            {tabs}
            {view === 'applications' ? <Applications onCount={refreshAll} /> : <Accepted data={accepted} onChanged={refreshAll} />}

            {step === 'dept' && <ChooseDept departments={departments} onClose={() => setStep(null)} onPick={(d) => { setNewDept(d); setStep('fresh'); }} />}
                        {(step === 'fresh' || step?.fresh) && <AdmissionForm dept={newDept} fresh card={step?.fresh} onBack={() => setStep('dept')} onClose={() => setStep(null)} onDone={done} />}
                                </>
    );
}
