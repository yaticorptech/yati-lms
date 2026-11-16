/**
 * Departments (administrator): each department with its semesters and
 * sections, and the sign-ins of its office; and the examination board's
 * sign-ins. A department's sign-in sees only that department; the board's
 * sees only the Exam board.
 */
import React, { useState } from 'react';
import { Building2, Plus, Pencil, Trash2, KeyRound, Users, BookOpen, Landmark, UserRound, UserPlus } from 'lucide-react';
import api, { CAMPUS, errorOf } from '../api';
import { useAuth } from '../auth';
import { PageHead, Card, Button, Dialog, Field, Input, Select, Banner, Chip, Empty, Skeleton, LoadFailed, useData, useToast, useConfirm, useSubmit, plural } from '../ui';

const DeptDialog = ({ dept, onClose, onDone }) => {
    const [f, setF] = useState({ name: dept?.name || '', code: dept?.code || '', semesters: dept?.semesters || 6, sections: (dept?.sections || ['A']).join(', '), head: dept?.head || '', headId: dept?.headId ? String(dept.headId) : '' });
    const { busy, error, run } = useSubmit();
    const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
    // The head is one of the organization's teachers (those with a sign-in, organization panel → Teachers).
    const { data: staff, loading: staffLoading } = useData('/teachers');
    const teachers = staff?.teachers || [];
    // Older departments kept only the head's name: match it to their account.
    const chosen = f.headId || (teachers.find((t) => t.name === f.head)?._id ? String(teachers.find((t) => t.name === f.head)._id) : '');
    const unlisted = !chosen && f.head;
    const submit = (e) => {
        e.preventDefault();
        run(async () => {
            const body = { ...f, headId: chosen || (unlisted ? undefined : ''), semesters: Number(f.semesters), sections: f.sections };
            const res = dept ? await api.put(`${CAMPUS}/departments/${dept._id}`, body) : await api.post(`${CAMPUS}/departments`, body);
            onDone(res.data.message);
        });
    };
    return (
        <Dialog title={dept ? `Edit ${dept.name}` : 'Add a department'} onClose={onClose}
            footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="dept-form" busy={busy}>{dept ? 'Save' : 'Add department'}</Button></>}>
            <form id="dept-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" className="sm:col-span-2"><Input value={f.name} onChange={set('name')} placeholder="Computer Science" required /></Field>
                <Field label="Short code" hint="Used in admission and admit card numbers."><Input value={f.code} onChange={set('code')} placeholder="CSE" maxLength={12} /></Field>
                <Field label="Semesters"><Input type="number" min={1} max={12} value={f.semesters} onChange={set('semesters')} required /></Field>
                <Field label="Sections" hint="Separate with commas: A, B, C"><Input value={f.sections} onChange={set('sections')} /></Field>
                <Field label="Head of department" hint={!staffLoading && !teachers.length ? 'No teachers yet: add them in the organization panel under Teachers.' : 'From their teacher dashboard they add the subjects and their teachers, set the timetable and post announcements.'}>
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

export default function Departments() {
    const { reload: reloadContext } = useAuth();
    const toast = useToast();
    const [confirm, confirmDialog] = useConfirm();
    const list = useData('/departments');
    const board = useData('/board/logins');
    const office = useData('/office/logins');
    const [editing, setEditing] = useState(null);      // 'new' | dept
    const [login, setLogin] = useState(null);          // { base, who, login }
    const done = (msg) => { setEditing(null); setLogin(null); toast(msg); list.reload(); board.reload(); office.reload(); reloadContext(); };
    const remove = async (d) => {
        if (!await confirm({ title: `Remove ${d.name}?`, body: `Its subjects, fees, exams, feedback forms and sign-ins go with it. A department with admitted students cannot be removed.`, action: 'Remove department', danger: true })) return;
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
                <Button icon={Plus} onClick={() => setEditing('new')}>Add department</Button>
            </PageHead>

            {list.loading ? <Card><Skeleton rows={3} className="h-24" /></Card> : list.failed ? <Card><LoadFailed what="the departments" onRetry={list.reload} /></Card> : !depts.length ? (
                <Card><Empty icon={Building2} title="Add your first department" action={<Button icon={Plus} onClick={() => setEditing('new')}>Add department</Button>}>Computer Science, Commerce, Mechanical… each with its semesters and sections.</Empty></Card>
            ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                    {depts.map((d) => {
                        const base = `${CAMPUS}/departments/${d._id}/logins`;
                        return (
                            <Card key={d._id} className="flex flex-col">
                                <div className="flex items-start justify-between gap-3 border-b border-line p-5">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-display text-xl font-semibold">{d.name}</h2>
                                            {d.code && <Chip tone="brass">{d.code}</Chip>}
                                        </div>
                                        <p className="mt-1 text-sm text-ink-2">{plural(d.semesters, 'semester')} · Section{d.sections.length > 1 ? 's' : ''} {d.sections.join(', ')}{d.head ? ` · HOD ${d.head}` : ''}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(d)} aria-label={`Edit ${d.name}`} />
                                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(d)} aria-label={`Remove ${d.name}`} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
                                    <div className="flex items-center gap-3 p-4"><Users size={18} className="text-brass-500" /><div><p className="font-display text-xl font-semibold tabular-nums">{d.students}</p><p className="text-xs text-ink-3">students studying</p></div></div>
                                    <div className="flex items-center gap-3 p-4"><BookOpen size={18} className="text-brass-500" /><div><p className="font-display text-xl font-semibold tabular-nums">{d.subjects}</p><p className="text-xs text-ink-3">subjects</p></div></div>
                                </div>
                                <div className="flex-1 p-5">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-3">Office sign-ins</p>
                                        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setLogin({ base, who: d.name, login: null })}>Add</Button>
                                    </div>
                                    {d.logins.length ? (
                                        <ul className="mt-2 divide-y divide-line">{d.logins.map((l) => <LoginRow key={l._id} l={l} onEdit={() => setLogin({ base, who: d.name, login: l })} onRemove={() => removeLogin(base, l)} />)}</ul>
                                    ) : <p className="mt-3 rounded-xl border border-dashed border-line-2 p-3 text-sm text-ink-3">No sign-in yet. Add one for the head of department or office.</p>}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 grid gap-4 xl:grid-cols-2">
                <OrgWideLogins kind="office" icon={UserPlus} title="Admission office" text="Takes new admissions for every department — the student’s account from their AI card, and their admission form. Departments then see their students." onAdd={setLogin} onRemove={removeLogin} data={office} />
                <OrgWideLogins kind="board" icon={Landmark} title="Examination board" text="Runs every department’s semester exams: timetable, admit cards, marks entry, and publishing each student’s marks card." onAdd={setLogin} onRemove={removeLogin} data={board} />
            </div>

            {editing && <DeptDialog dept={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onDone={done} />}
            {login && <LoginDialog {...login} onClose={() => setLogin(null)} onDone={done} />}
            {confirmDialog}
        </>
    );
}
