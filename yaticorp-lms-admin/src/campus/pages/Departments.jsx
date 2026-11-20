/**
 * Departments (administrator): each department with its semesters and
 * sections, and the sign-ins of its office; and the examination board's
 * sign-ins. A department's sign-in sees only that department; the board's
 * sees only the Exam board.
 */
import React, { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, KeyRound, Users, BookOpen, Landmark, UserRound, UserPlus, School, GraduationCap } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useAuth } from '../context';
import { LayoutDashboard } from 'lucide-react';
import { PageHead, Card, Button, Dialog, Field, Input, Select, Banner, Chip, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, useSubmit } from '../ui';

const PUC_STREAMS = ['Arts', 'Commerce', 'Science'];
/**
 * The stream: typed, or picked from a white list under the box (2026-11-19, the user: "make it white, add the Other
 * option, give a typing option also") — Arts, Commerce, Science, and Other… to type one of their own.
 */
const StreamCombo = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const boxRef = React.useRef(null);
    const q = value.trim().toLowerCase();
    // No "Other…" row (2026-11-19, the user asked to remove it): anything not listed is simply typed.
    const options = PUC_STREAMS.filter((x) => !q || x.toLowerCase().includes(q));
    const choose = (x) => { onChange(x); setOpen(false); };
    const key = (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(options.length - 1, i + 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
        else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(options[active]); }
        else if (e.key === 'Escape') setOpen(false);
    };
    return (
        <div ref={boxRef} className="relative" data-stream-combo>
            <Input value={value} onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onKeyDown={key}
                placeholder="Arts, Commerce, Science… or type one" maxLength={40} required role="combobox" aria-expanded={open} aria-autocomplete="list" aria-controls="stream-list" autoComplete="off" />
            {open && options.length > 0 && (
                <ul id="stream-list" role="listbox" className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg">
                    {options.map((x, i) => (
                        <li key={x} role="option" aria-selected={value === x} onMouseDown={(e) => { e.preventDefault(); choose(x); }} onMouseEnter={() => setActive(i)}
                            className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-petrol-50 text-petrol-800' : 'text-ink'}`}>
                            {x}{value === x && <span className="float-right text-petrol-600">✓</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

const DeptDialog = ({ dept, program = 'degree', existingPuc = [], onClose, onDone }) => {
    const puc = program === 'puc';
    // Editing a PUC section: its own class teacher (2026-11-19); a department: its head.
    const ownTeacher = puc && dept ? (dept.sectionTeachers || []).find((x) => x.section === dept.editSection) : null;
    const [f, setF] = useState({ name: dept?.name || '', code: dept?.code || '', semesters: dept?.semesters || 6, sections: (dept?.sections || ['A']).join(', '),
        head: puc ? ownTeacher?.teacher || '' : dept?.head || '', headId: puc ? (ownTeacher?.teacherId ? String(ownTeacher.teacherId) : '') : dept?.headId ? String(dept.headId) : '',
        // A PUC class (2026-11-19, the user: "1st year or 2nd year, 1st sem or 2nd sem, arts, commerce…, class teacher, sections").
        stream: dept?.stream || '', pucYear: dept?.pucYear ? String(dept.pucYear) : '', pucSem: dept?.pucSem ? String(dept.pucSem) : '',
        // One section at a time (2026-11-19), with its own class teacher.
        section: dept?.editSection || '' });
    const { busy, error, run } = useSubmit();
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    // The head is one of the organization's teachers (those with a sign-in, organization panel → Teachers).
    const { data: staff, loading: staffLoading } = useData('/teachers');
    // Only teachers who have completed their profile can head a department (2026-11-14); the current head stays listed.
    // A PUC class teacher can be any of its teachers.
    const teachers = (staff?.teachers || []).filter((t) => puc || t.complete || String(t._id) === String(f.headId || ''));
    const waitingProfile = (staff?.teachers || []).filter((t) => !t.complete).length;
    // Older departments kept only the head's name: match it to their account.
    const chosen = f.headId || (teachers.find((t) => t.name === f.head)?._id ? String(teachers.find((t) => t.name === f.head)._id) : '');
    const unlisted = !chosen && f.head;
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = puc
                ? { program, stream: f.stream.trim(), pucYear: Number(f.pucYear), pucSem: Number(f.pucSem), sections: f.section, section: f.section, headId: chosen || '' }
                : { ...f, program, headId: chosen || (unlisted ? undefined : ''), semesters: Number(f.semesters),
                    // Editing one section: it alone renamed, the others kept (2026-11-19).
                    sections: dept?.editSection ? dept.sections.map((x) => (x === dept.editSection ? f.section || x : x)).join(', ') : f.sections };
            const res = dept ? await api.put(`${CAMPUS}/departments/${dept._id}`, body) : await api.post(`${CAMPUS}/departments`, body);
            onDone(res.data.message);
        });
    };
    return (
        <Dialog title={dept ? (dept.editSection ? `Edit ${dept.name} · Section ${dept.editSection}` : `Edit ${dept.name}`) : puc ? 'Add a PUC class' : 'Add a department'} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="dept-form" busy={busy}>{dept ? 'Save' : puc ? 'Add PUC class' : 'Add department'}</Button></>}>
            <form id="dept-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                {puc ? (
                    <>
                        <Field label="Year">
                            <Select value={f.pucYear} onChange={set('pucYear')} required>
                                <option value="" disabled>Choose</option>
                                <option value="1">1st year</option>
                                <option value="2">2nd year</option>
                            </Select>
                        </Field>
                        <Field label="Semester">
                            <Select value={f.pucSem} onChange={set('pucSem')} required>
                                <option value="" disabled>Choose</option>
                                <option value="1">1st sem</option>
                                <option value="2">2nd sem</option>
                            </Select>
                        </Field>
                        <Field label="Stream" className="sm:col-span-2" hint="Type it, or choose from the list.">
                            <StreamCombo value={f.stream} onChange={(v) => setF({ ...f, stream: v })} />
                        </Field>
                        <Field label="Section" hint={dept ? 'This section’s class teacher is set below.' : (() => { const same = existingPuc.find((x) => x.stream?.toLowerCase() === f.stream.trim().toLowerCase() && String(x.pucYear) === f.pucYear && String(x.pucSem) === f.pucSem); return same ? `Already has ${same.sections.join(', ')}: add the next one.` : 'One section. Add it again for its next section.'; })()}>
                            <Input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value.toUpperCase().replace(/[,\s]/g, '') })} placeholder="A" maxLength={10} required disabled={Boolean(dept)} />
                        </Field>
                    </>
                ) : (
                    <>
                        <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Computer Science" required /></Field>
                        <Field label="Short code" hint="Used in admission and admit card numbers."><Input value={f.code} onChange={set('code')} placeholder="CSE" maxLength={12} /></Field>
                        <Field label="Semesters"><Input type="number" min={1} max={12} value={f.semesters} onChange={set('semesters')} required /></Field>
                        {dept?.editSection
                            ? <Field label="Section" hint="This section only; the department’s other sections stay as they are."><Input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value.toUpperCase().replace(/[,\s]/g, '') })} maxLength={10} required /></Field>
                            : <Field label="Sections"><Input value={f.sections} onChange={set('sections')} /></Field>}
                    </>
                )}
                <Field label={puc ? 'Class teacher' : 'Head of department'} hint={puc ? (!staffLoading && !teachers.length ? 'No teachers yet: add them under Teachers.' : 'One of your teachers.') : !staffLoading && !teachers.length ? (waitingProfile ? 'No teacher has completed their profile yet.' : 'No teachers yet: add them under Teachers.') : waitingProfile ? `Teachers who have completed their profile. ${waitingProfile} still to finish theirs.` : 'Teachers who have completed their profile.'}>
                    <Select value={chosen || (unlisted ? '__name' : '')} onChange={(e) => { const t = teachers.find((x) => String(x._id) === e.target.value); setF({ ...f, headId: t ? String(t._id) : '', head: t ? t.name : '' }); }} disabled={staffLoading}>
                        <option value="">{staffLoading ? 'Loading teachers…' : 'Not chosen'}</option>
                        {unlisted && <option value="__name">{f.head}</option>}
                        {teachers.map((t) => <option key={t._id} value={String(t._id)}>{t.name}{t.email ? ` — ${t.email}` : ''}</option>)}
                    </Select>
                </Field>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

/** Add a sign-in (`login` null) or set a new name/password for one. `base`: the API path of the list. */
const LoginDialog = ({ base, login, who, onClose, onDone }) => {
    const [f, setF] = useState({ name: login?.name || '', email: login?.email || '', password: '' });
    const { busy, error, run } = useSubmit();
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const res = login ? await api.put(`${base}/${login._id}`, { name: f.name, ...(f.password ? { password: f.password } : {}) }) : await api.post(base, f);
            onDone(res.data.message);
        });
    };
    return (
        <Dialog title={login ? `Edit ${login.name}` : `Add a sign-in for ${who}`} sub={login ? undefined : 'They sign in to this app with this email and password, and see only their own pages.'} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="login-form" busy={busy}>{login ? 'Save' : 'Add sign-in'}</Button></>}>
            <form id="login-form" onSubmit={submit} className="space-y-4">
                <Field label="Name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="CSE Office" required /></Field>
                <Field label="Email"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} disabled={!!login} required={!login} /></Field>
                <Field label={login ? 'New password (leave blank to keep)' : 'Password'} hint="At least 8 characters, with upper and lower case, a number and a symbol.">
                    <Input type="text" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required={!login} />
                </Field>
                {error && <Banner>{error}</Banner>}
            </form>
        </Dialog>
    );
};

const LoginRow = ({ l, onEdit, onRemove }) => (
    <li className="flex items-center justify-between gap-3 py-2.5">
        <span className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-porcelain text-ink-3"><UserRound size={15} /></span>
            <span className="min-w-0"><span className="block truncate text-sm font-medium">{l.name}</span><span className="block truncate text-xs text-ink-3">{l.email}</span></span></span>
        <span className="flex gap-1"><Button size="sm" variant="ghost" icon={KeyRound} onClick={onEdit}>Edit</Button><Button size="sm" variant="ghost" icon={Trash2} onClick={onRemove} aria-label={`Remove ${l.name}`} /></span>
    </li>
);

/** The admission office's or the examination board's sign-ins. */
const OrgWideLogins = ({ kind, icon: Icon, title, text, data, onAdd, onRemove }) => {
    const base = `${CAMPUS}/${kind}/logins`;
    const who = `the ${title.toLowerCase()}`;
    return (
        <Card className="overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line bg-gradient-to-r from-brass-50 to-white p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brass-700 ring-1 ring-brass-100"><Icon size={19} /></span>
                    <div><h2 className="font-display text-xl font-semibold">{title}</h2><p className="text-sm text-ink-2">{text}</p></div>
                </div>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => onAdd({ base, who, login: null })}>Add sign-in</Button>
            </div>
            <div className="px-5 pb-3">
                {data.loading ? <Skeleton rows={1} /> : (data.data?.logins || []).length ? (
                    <ul className="divide-y divide-line">{data.data.logins.map((l) => <LoginRow key={l._id} l={l} onEdit={() => onAdd({ base, who, login: l })} onRemove={() => onRemove(base, l)} />)}</ul>
                ) : <p className="py-4 text-sm text-ink-3">No sign-in yet. Until there is one, you do this yourself.</p>}
            </div>
        </Card>
    );
};

/**
 * Adding a class (2026-11-19, the user: "add another button like Add class — the organization can add a class and
 * section: 9th, section A, the number of students, the number of subjects, and the class teacher from a drop down").
 */
const ClassDialog = ({ cls, existing = [], onClose, onDone }) => {
    const [f, setF] = useState({ name: cls?.name || '', section: cls?.section || '', subjects: cls?.subjects ?? '', teacherId: cls?.teacherId ? String(cls.teacherId) : '' });
    const { busy, error, run } = useSubmit();
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    const { data: staff, loading: staffLoading } = useData('/teachers');
    const teachers = staff?.teachers || [];
    // This class's sections already added (not the one being edited).
    const taken = existing.filter((x) => x.name.toLowerCase() === f.name.trim().toLowerCase() && String(x._id) !== String(cls?._id || '') && x.section).map((x) => x.section);
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = { ...f, subjects: f.subjects === '' ? 0 : Number(f.subjects) };
            const res = cls ? await api.put(`${CAMPUS}/classes/${cls._id}`, body) : await api.post(`${CAMPUS}/classes`, body);
            onDone(res.data.message);
        });
    };
    return (
        <Dialog title={cls ? `Edit ${cls.name}${cls.section ? ` · ${cls.section}` : ''}` : 'Add a class'} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="class-form" busy={busy}>{cls ? 'Save' : 'Add class'}</Button></>}>
            <form id="class-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Class"><Input value={f.name} onChange={set('name')} placeholder="9th" maxLength={40} required /></Field>
                {/* One section at a time, typed (2026-11-19: the user asked for one section per add, and no drop down). */}
                <Field label="Section" hint={taken.length ? `${f.name.trim()} already has ${taken.join(', ')}.` : 'One section. Add the class again for its next section.'}>
                    <Input value={f.section} onChange={(e) => setF({ ...f, section: e.target.value.toUpperCase().replace(/[,\s]/g, '') })} placeholder="A" maxLength={10} aria-invalid={taken.includes(f.section) || undefined} />
                </Field>
                <Field label="Number of subjects"><Input type="number" min={0} max={50} value={f.subjects} onChange={set('subjects')} placeholder="6" /></Field>
                <Field label="Number of students" hint="Counted for you: students who join your organization in this class.">
                    <div className="flex h-11 items-center rounded-xl border border-line bg-porcelain px-3 text-sm font-semibold text-ink-2"><Users size={15} className="mr-2 text-ink-3" />{cls ? cls.students : 0}</div>
                </Field>
                <Field label="Class teacher" className="sm:col-span-2" hint={!staffLoading && !teachers.length ? 'No teachers yet: add them under Teachers.' : 'One of your teachers.'}>
                    <Select value={f.teacherId} onChange={set('teacherId')} disabled={staffLoading}>
                        <option value="">{staffLoading ? 'Loading teachers…' : 'Not chosen'}</option>
                        {teachers.map((t) => <option key={t._id} value={String(t._id)}>{t.name}{t.email ? ` — ${t.email}` : ''}</option>)}
                    </Select>
                </Field>
                {error && <div className="sm:col-span-2"><Banner>{error}</Banner></div>}
            </form>
        </Dialog>
    );
};

/**
 * Degree departments and PUC streams, each in their own card (2026-11-19, the user: "make separate cards for degree and
 * PUC, so PUC can be added like Commerce, Arts and all"); a table like Classes.
 */
/**
 * Who they are (2026-11-19, the user: "the students' names can be viewed"): the students counted in a row, from its
 * Students number — a department's (or one PUC section's) admitted students, or a class's members.
 */
const StudentsDialog = ({ title, path, params, onClose }) => {
    const { data, loading, failed, reload } = useData(path, params);
    const list = data?.students || [];
    // Just their names (2026-11-19: the per-student section drop down was taken out — the table's Section chooses).
    return (
        <Dialog title={title} sub={loading ? undefined : `${list.length} student${list.length === 1 ? '' : 's'}`} onClose={onClose} size="max-w-xl">
            {loading ? <Skeleton rows={4} className="h-12" /> : failed ? <LoadFailed what="the students" onRetry={reload} />
                : !list.length ? <p className="text-sm text-ink-2">No students here yet.</p> : (
                    <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto" data-students-list>
                        {list.map((u) => (
                            <li key={u._id} className="flex items-center gap-3 py-2.5">
                                {u.picture ? <img src={u.picture} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol-50 text-xs font-bold text-petrol-700">{String(u.name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>}
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-ink">{u.name}</p>
                                    <p className="truncate text-xs text-ink-3">{[u.rollNo && `Roll ${u.rollNo}`, u.semester && `Sem ${u.semester}`, u.section && `Section ${u.section}`, u.cardNumber].filter(Boolean).join(' · ')}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
        </Dialog>
    );
};

/** A students number that opens their names. */
const StudentsCount = ({ n, extra, onOpen }) => (
    <button type="button" onClick={onOpen} className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 font-semibold text-petrol-700 hover:bg-petrol-50 hover:underline" title="See the students">
        <Users size={14} className="text-ink-3" />{n}{extra}
    </button>
);

/** A degree department's row; edit acts on the section chosen in it (2026-11-19, the user: "only one section's popup"). */
const DegreeRow = ({ d, onEdit, onRemove, onOpenHod, onStudents }) => {
    const puc = false;
    const [section, setSection] = useState(d.sections[0] || '');
    return (
        <tr key={d._id} className="border-t border-line" data-dept-row={d.name}>
            {puc && d.stream ? (
                <>
                    <td className="px-5 py-3 font-semibold text-ink">{['', '1st', '2nd'][d.pucYear] || '—'} year</td>
                    <td className="px-3 py-3">{['', '1st', '2nd'][d.pucSem] || '—'} sem</td>
                    <td className="px-3 py-3 font-semibold text-ink">{d.stream}</td>
                </>
            ) : (
                <>
                    <td className="px-5 py-3" colSpan={puc ? 3 : 1}><span className="font-semibold text-ink">{d.name}</span>{d.code && <span className="ml-2"><Chip tone="brass">{d.code}</Chip></span>}{puc && <span className="ml-2 text-xs text-amber-700">Edit to set its year, semester and stream</span>}</td>
                    {!puc && <td className="px-3 py-3 tabular-nums">{d.semesters}</td>}
                </>
            )}
            <SectionCells d={d} section={section} setSection={setSection} onStudents={onStudents} />
            {!puc && <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><BookOpen size={14} className="text-ink-3" />{d.subjects}</span></td>}
            <td className="px-3 py-3">
                {/* The head runs it from their teacher dashboard, which the organization opens from here. */}
                {d.headId
                    ? <button type="button" onClick={() => onOpenHod(d)} className="inline-flex items-center gap-1.5 font-semibold text-petrol-700 hover:underline" title="Open their dashboard"><LayoutDashboard size={14} /> {d.head}</button>
                    : d.head ? <span className="text-amber-700" title="Not linked to a teacher account — edit to pick them from the list.">{d.head} · not linked</span>
                        : <span className="text-ink-3">Not chosen</span>}
            </td>
            <td className="px-5 py-3">
                <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit({ ...d, editSection: section })} aria-label={`Edit ${d.name}`} />
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => onRemove(d)} aria-label={`Remove ${d.name}`} />
                </div>
            </td>
        </tr>
    );
};

/**
 * A degree department's Sections and Students cells (2026-11-19, the user: "give the option to choose the section"): a
 * drop down — all sections, or one — and the students of the one chosen.
 */
const SectionCells = ({ d, section, setSection, onStudents }) => {
    // Section A, Section B… no "All sections" (2026-11-19, the user's ask): the first is shown first.
    const n = section ? d.sectionStudents?.[section] ?? 0 : d.students;
    return (
        <>
            <td className="px-3 py-3">
                {d.sections.length > 1 ? (
                    <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label={`${d.name}: section`} small className="w-36">
                        {d.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}
                    </Select>
                ) : <Chip tone="brass">{d.sections[0] || '—'}</Chip>}
            </td>
            <td className="px-3 py-3">
                <StudentsCount n={n}
                    onOpen={() => onStudents({ title: `${d.name}${section ? ` · Section ${section}` : ' · students'}`, path: '/students', params: { departmentId: d._id, ...(section ? { section } : {}) }, sections: d.sections })} />
            </td>
        </>
    );
};

const KIND_INFO = {
    degree: [Building2, 'Degree departments', 'BBA, BCA, BCom… with semesters, sections and a head of department.'],
    puc: [GraduationCap, 'PUC classes', '1st and 2nd year PUC — Arts, Commerce, Science — with sections and class teachers.'],
    classes: [School, 'School classes', 'Class 1 to 12, each section with its subjects and class teacher.']
};

/** The first time here: what the institution has — the rest stays locked until unlocked. */
const KindsSetup = ({ start, onSave }) => {
    const [picked, setPicked] = useState(start);
    const toggle = (k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
    return (
        <Dialog title="What does your institution have?" onClose={() => onSave(picked.length ? picked : start)}
            footer={<Button disabled={!picked.length} onClick={() => onSave(['degree', 'puc', 'classes'].filter((k) => picked.includes(k)))}>Continue</Button>}>
            <p className="mb-4 text-sm text-ink-2">Choose what your institution runs. Only these will show on this page.</p>
            <div className="space-y-2.5" data-kinds-setup>
                {['degree', 'puc', 'classes'].map((k) => {
                    const [Icon, title, text] = KIND_INFO[k];
                    const on = picked.includes(k);
                    return (
                        <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(k)}
                            className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${on ? 'border-petrol-600 bg-petrol-50' : 'border-line bg-white hover:border-petrol-200'}`}>
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-petrol-600 text-white' : 'bg-porcelain text-ink-2'}`}><Icon size={20} /></span>
                            <span className="min-w-0 flex-1"><span className="block font-semibold text-ink">{title}</span><span className="block text-sm text-ink-2">{text}</span></span>
                            <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold ${on ? 'border-petrol-600 bg-petrol-600 text-white' : 'border-line-2'}`}>{on ? '✓' : ''}</span>
                        </button>
                    );
                })}
            </div>
        </Dialog>
    );
};

/**
 * A PUC class once, its sections in a drop down — like Classes (2026-11-19): the students and class teacher shown are
 * the section chosen's; edit and remove act on that section.
 */
const PucRow = ({ d, onEdit, onRemove, onRemoveSection, onStudents }) => {
    const [section, setSection] = useState(d.sections[0] || '');
    const t = (d.sectionTeachers || []).find((x) => x.section === section);
    const count = d.sectionStudents?.[section] ?? 0;
    return (
        <tr className="border-t border-line" data-dept-row={d.name}>
            {d.stream ? (
                <>
                    <td className="px-5 py-3 font-semibold text-ink">{['', '1st', '2nd'][d.pucYear] || '—'} year</td>
                    <td className="px-3 py-3">{['', '1st', '2nd'][d.pucSem] || '—'} sem</td>
                    <td className="px-3 py-3 font-semibold text-ink">{d.stream}</td>
                </>
            ) : <td className="px-5 py-3" colSpan={3}><span className="font-semibold text-ink">{d.name}</span><span className="ml-2 text-xs text-amber-700">Edit to set its year, semester and stream</span></td>}
            <td className="px-3 py-3">
                <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label={`${d.name}: section`} small className="w-32">
                    {d.sections.map((x) => <option key={x} value={x}>Section {x}</option>)}
                </Select>
            </td>
            <td className="px-3 py-3"><StudentsCount n={count} onOpen={() => onStudents({ title: `${d.name} · Section ${section}`, path: '/students', params: { departmentId: d._id, section }, sections: d.sections })} /></td>
            <td className="px-3 py-3">{t?.teacher || <span className="text-ink-3">Not chosen</span>}</td>
            <td className="px-5 py-3">
                <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit({ ...d, editSection: section })} aria-label={`Edit ${d.name} Section ${section}`} />
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => (d.sections.length > 1 ? onRemoveSection(d, section) : onRemove(d))} aria-label={`Remove ${d.name} Section ${section}`} />
                </div>
            </td>
        </tr>
    );
};

const DeptTable = ({ program, rows, onAdd, onEdit, onRemove, onRemoveSection, onOpenHod, onStudents }) => {
    const puc = program === 'puc';
    return (
        <Card data-departments={program}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-petrol-50 text-petrol-700">{puc ? <GraduationCap size={20} /> : <Building2 size={20} />}</span>
                    <div>
                        <h2 className="font-display text-xl font-semibold">{puc ? 'PUC' : 'Degree departments'}</h2>
                        <p className="text-sm text-ink-2">{puc ? 'Each PUC class: its year, semester, stream (Arts, Commerce, Science…), sections and class teacher.' : 'Each degree department with its semesters, sections, students, subjects and head.'}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button icon={Plus} onClick={onAdd}>{puc ? 'Add PUC class' : 'Add department'}</Button>
                </div>
            </div>
            {!rows.length ? <p className="p-5 text-sm text-ink-2">{puc ? 'No PUC classes yet. Add one: 1st year · 1st sem · Commerce · Sections A, B · its class teacher.' : 'No degree departments yet. Add BBA, BCA, BCom…'}</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] text-left text-sm">
                        <thead className="bg-porcelain text-xs font-bold uppercase tracking-wider text-ink-2">
                            {puc
                                ? <tr><th className="px-5 py-3">Year</th><th className="px-3 py-3">Semester</th><th className="px-3 py-3">Stream</th><th className="px-3 py-3">Sections</th><th className="px-3 py-3">Students</th><th className="px-3 py-3">Class teacher</th><th className="px-5 py-3" /></tr>
                                : <tr><th className="px-5 py-3">Department</th><th className="px-3 py-3">Semesters</th><th className="px-3 py-3">Sections</th><th className="px-3 py-3">Students</th><th className="px-3 py-3">Subjects</th><th className="px-3 py-3">Head of department</th><th className="px-5 py-3" /></tr>}
                        </thead>
                        <tbody>
                            {puc ? rows.map((d) => <PucRow key={`${d._id}:${d.sections.join(',')}`} d={d} onEdit={onEdit} onRemove={onRemove} onRemoveSection={onRemoveSection} onStudents={onStudents} />) : rows.map((d) => <DegreeRow key={`${d._id}:${d.sections.join(',')}`} d={d} onEdit={onEdit} onRemove={onRemove} onOpenHod={onOpenHod} onStudents={onStudents} />)}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

/**
 * One row of the classes list: a class once, its sections in a drop down (2026-11-19, the user: "1 A … there 1, and the
 * section should be in a drop down"); the students, subjects and class teacher are the section chosen's.
 */
const ClassRow = ({ name, sections, onEdit, onRemove, onStudents }) => {
    const [pickedId, setPickedId] = useState(String(sections[0]._id));
    const c = sections.find((x) => String(x._id) === pickedId) || sections[0];
    return (
        <tr className="border-t border-line" data-class-row={name}>
            <td className="px-5 py-3 font-semibold text-ink">{name}</td>
            <td className="px-3 py-3">
                {sections.length > 1 || c.section ? (
                    <Select value={String(c._id)} onChange={(e) => setPickedId(e.target.value)} aria-label={`${name}: section`} small className="w-28">
                        {sections.map((x) => <option key={x._id} value={String(x._id)}>{x.section ? `Section ${x.section}` : 'No section'}</option>)}
                    </Select>
                ) : <span className="text-ink-3">—</span>}
            </td>
            <td className="px-3 py-3"><StudentsCount n={c.students} onOpen={() => onStudents({ title: `${name}${c.section ? ` · Section ${c.section}` : ''}`, path: `/classes/${c._id}/students` })} /></td>
            <td className="px-3 py-3"><span className="inline-flex items-center gap-1.5"><BookOpen size={14} className="text-ink-3" />{c.subjects}</span></td>
            <td className="px-3 py-3">{c.teacher || <span className="text-ink-3">Not chosen</span>}</td>
            <td className="px-5 py-3">
                <div className="flex justify-end gap-1.5">
                    <Button size="sm" variant="secondary" icon={Pencil} onClick={() => onEdit(c)} aria-label={`Edit ${name} ${c.section}`} />
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => onRemove(c)} aria-label={`Remove ${name} ${c.section}`} />
                </div>
            </td>
        </tr>
    );
};

/** The classes, under the departments: each class once, with its sections, subjects and class teacher. */
const ClassesCard = ({ data, onAdd, onEdit, onRemove, onStudents }) => {
    const groups = [];
    for (const c of data.data?.classes || []) {
        const g = groups.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
        if (g) g.sections.push(c); else groups.push({ name: c.name, sections: [c] });
    }
    return (
        <Card className="mt-8" data-classes>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-petrol-50 text-petrol-700"><School size={20} /></span>
                    <div>
                        <h2 className="font-display text-xl font-semibold">Classes</h2>
                        <p className="text-sm text-ink-2">Each class with its sections, subjects and class teacher. Students are counted as they join in their class.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button icon={Plus} onClick={onAdd}>Add class</Button>
                </div>
            </div>
            {data.loading ? <div className="p-5"><Skeleton rows={3} className="h-12" /></div> : data.failed ? <div className="p-5"><LoadFailed what="the classes" onRetry={data.reload} /></div>
                : !groups.length ? <p className="p-5 text-sm text-ink-2">No classes yet. Add one: 9th, Section A, 6 subjects, and its class teacher; then 9th again for Section B.</p> : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[36rem] text-left text-sm">
                            <thead className="bg-porcelain text-xs font-bold uppercase tracking-wider text-ink-2">
                                <tr><th className="px-5 py-3">Class</th><th className="px-3 py-3">Section</th><th className="px-3 py-3">Students</th><th className="px-3 py-3">Subjects</th><th className="px-3 py-3">Class teacher</th><th className="px-5 py-3" /></tr>
                            </thead>
                            <tbody>
                                {groups.map((g) => <ClassRow key={`${g.name}:${g.sections.map((x) => x._id).join(',')}`} name={g.name} sections={g.sections} onEdit={onEdit} onRemove={onRemove} onStudents={onStudents} />)}
                            </tbody>
                        </table>
                    </div>
                )}
        </Card>
    );
};

export default function Departments() {
    const { reload: reloadContext } = useAuth();
    // The HOD's own teacher dashboard, live, in a new tab (2026-11-14) — as the super admin opens a teacher's.
    // The tab is opened first so a popup blocker sees it come from the click.
    const openHod = async (d) => {
        const tab = window.open('', '_blank');
        try {
            const { data: r } = await api.post(`${CAMPUS}/departments/${d._id}/hod-dashboard`);
            const target = `${(import.meta.env.VITE_STUDENT_URL || 'http://localhost:5173').replace(/\/$/, '')}/admin-access/teacher#code=${encodeURIComponent(r.code)}`;
            if (tab) tab.location.href = target; else window.location.assign(target);
        } catch (err) { if (tab) tab.close(); toast(errorOf(err, 'Could not open the HOD’s dashboard.'), 'error'); }
    };
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const list = useData('/departments');
    const classes = useData('/classes');
    // What the institution has (2026-11-19): degree departments, PUC classes, school classes.
    const kindsData = useData('/kinds');
    const [kinds, setKinds] = useState({ list: null, saving: false });
    const current = kinds.list || kindsData.data?.kinds || ['degree', 'puc', 'classes'];
    const has = (k) => current.includes(k);
    // The first time here (2026-11-19, the user: "while initially entering, give a popup with the selection, then display
    // based on that"): what the institution has.
    const needsSetup = kindsData.data && !kindsData.data.chosen && !kinds.list;
    const [classEdit, setClassEdit] = useState(null);   // 'new' | class
    const [studentsOf, setStudentsOf] = useState(null); // { title, path, params }: the students popup
    const board = useData('/board/logins');
    const office = useData('/office/logins');
    const [editing, setEditing] = useState(null);      // 'new' | dept
    const [login, setLogin] = useState(null);          // { base, who, login }
    const done = (msg) => { setEditing(null); setLogin(null); setClassEdit(null); toast(msg); list.reload(); classes.reload(); board.reload(); office.reload(); reloadContext(); };
    const removeClass = async (c) => {
        if (!await confirm({ title: `Remove ${c.name}${c.section ? ` · ${c.section}` : ''}?`, body: 'It is taken off the list of classes.', action: 'Remove class', danger: true })) return;
        try { done((await api.delete(`${CAMPUS}/classes/${c._id}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const removeSection = async (d, section) => {
        if (!await confirm({ title: `Remove Section ${section} of ${d.name}?`, body: 'Its class teacher goes with it. A section with students cannot be removed.', action: 'Remove section', danger: true })) return;
        try { done((await api.delete(`${CAMPUS}/departments/${d._id}/sections/${encodeURIComponent(section)}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const remove = async (d) => {
        // A PUC class in its own words (2026-11-19 QA: its last section's removal said "department").
        const puc = d.program === 'puc';
        if (!await confirm(puc
            ? { title: `Remove ${d.name}?`, body: `${d.sections.length === 1 ? `Section ${d.sections[0]} is its only section, so the class goes` : 'The class goes'} with its class teachers. A class with students cannot be removed.`, action: 'Remove class', danger: true }
            : { title: `Remove ${d.name}?`, body: `Its subjects, fees, exams, feedback forms and sign-ins go with it. A department with admitted students cannot be removed.`, action: 'Remove department', danger: true })) return;
        try { done((await api.delete(`${CAMPUS}/departments/${d._id}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const removeLogin = async (base, l) => {
        if (!await confirm({ title: `Remove ${l.name}?`, body: 'They will no longer be able to sign in. What they recorded stays.', action: 'Remove sign-in', danger: true })) return;
        try { done((await api.delete(`${base}/${l._id}`)).data.message); } catch (err) { toast(errorOf(err), 'error'); }
    };
    const depts = list.data?.departments || [];

    return (
        <>
            <PageHead eyebrow="Set-up" title="Departments" sub="Each department keeps its subjects, attendance, fees and feedback, and sees the students admitted to it. Give its office a sign-in and it sees only its own department.">
                {/* No add buttons up here (2026-11-19, the user: "this at the top is not needed"): each table has its own. */}
            </PageHead>


            {(has('degree') || has('puc')) && (list.loading ? <Card><Skeleton rows={3} className="h-24" /></Card> : list.failed ? <Card><LoadFailed what="the departments" onRetry={list.reload} /></Card> : (
                <div className="space-y-6">
                    {has('degree') && <DeptTable program="degree" rows={depts.filter((d) => d.program !== 'puc')} onAdd={() => setEditing({ new: 'degree' })} onEdit={setEditing} onRemove={remove} onOpenHod={openHod} onStudents={setStudentsOf} />}
                    {has('puc') && <DeptTable program="puc" rows={depts.filter((d) => d.program === 'puc')} onAdd={() => setEditing({ new: 'puc' })} onEdit={setEditing} onRemove={remove} onRemoveSection={removeSection} onOpenHod={openHod} onStudents={setStudentsOf} />}
                </div>
            ))}

            {has('classes') && <ClassesCard data={classes} onAdd={() => setClassEdit('new')} onEdit={setClassEdit} onRemove={removeClass} onStudents={setStudentsOf} />}

            {/* No lock or unlock here (2026-11-19, the user: "not needed"): the first visit's popup chooses; what was not
                chosen is simply not shown. */}

            <div className="mt-8 grid gap-4 xl:grid-cols-2">
                <OrgWideLogins kind="office" icon={UserPlus} title="Admission office" text="Takes new admissions for every department — the student’s account from their AI card, and their admission form. Departments then see their students." onAdd={setLogin} onRemove={removeLogin} data={office} />
                <OrgWideLogins kind="board" icon={Landmark} title="Examination board" text="Runs every department’s semester exams: timetable, admit cards, marks entry, and publishing each student’s marks card." onAdd={setLogin} onRemove={removeLogin} data={board} />
            </div>

            {editing && <DeptDialog dept={editing.new ? null : editing} program={editing.new || editing.program} existingPuc={depts.filter((d) => d.program === 'puc')} onClose={() => setEditing(null)} onDone={done} />}
            {classEdit && <ClassDialog cls={classEdit === 'new' ? null : classEdit} existing={classes.data?.classes || []} onClose={() => setClassEdit(null)} onDone={done} />}
            {login && <LoginDialog {...login} onClose={() => setLogin(null)} onDone={done} />}
            {needsSetup && <KindsSetup start={current} onSave={async (list) => {
                setKinds({ list, saving: true });
                try { await api.put(`${CAMPUS}/kinds`, { kinds: list }); setKinds({ list, saving: false }); toast('Saved.'); }
                catch (err) { setKinds({ list: null, saving: false }); toast(errorOf(err), 'error'); }
            }} />}
            {studentsOf && <StudentsDialog {...studentsOf} onClose={() => setStudentsOf(null)} onChanged={list.reload} />}
            {confirmDialog}
        </>
    );
}
