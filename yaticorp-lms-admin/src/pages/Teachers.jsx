/**
 * Teachers: every teacher account on the platform — those who registered a
 * card themselves at sign-in, those added here, and those their organization
 * added. The admin adds teachers (one with a card, or many from the Excel
 * template), approves new ones when approval is switched on, edits details,
 * sets a new password or emails a reset link, blocks, and deletes.
 *
 * A super admin can also put a teacher into an organization (as with
 * students, where assigning is theirs alone); the server says whether this
 * admin may, as canAssignOrganization.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    BookOpenCheck, Loader2, UserPlus, Upload, Eye, Pencil, Ban, CheckCircle2, Trash2, XCircle, ShieldCheck, Clock,
    ChevronRight, Mail, KeyRound, X
} from 'lucide-react';
import api from '../utils/api';
import useMediaQuery from '../hooks/useMediaQuery';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import Select from '../components/Select';
import { Banner, BTN, BTN2, CARD, INPUT, LABEL, Rows, Empty, LoadFailed, SearchInput, Segmented, Pager, Dialog, DialogTitle } from '../components/orgUi';
import AddTeacherModal from '../components/teachers/AddTeacherModal';
import BulkTeachersModal from '../components/teachers/BulkTeachersModal';
import TeacherDetailModal from '../components/teachers/TeacherDetailModal';
import { TeacherStatus, TeacherSummary, Field } from '../components/teachers/TeacherBits';
import { refusal, fmtDay, strongPassword, assignable } from '../components/teachers/teacherUtils';

const STATUS_TABS = [['all', 'All'], ['active', 'Active'], ['pending', 'Waiting'], ['inactive', 'Blocked']];
const PAGE_SIZE = 50;

export default function Teachers() {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState('all');
    const [orgFilter, setOrgFilter] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [organizations, setOrganizations] = useState([]);
    const [busyId, setBusyId] = useState(null);
    const [savingSwitch, setSavingSwitch] = useState(false);
    const [open, setOpen] = useState(null);           // { kind: 'add' | 'bulk' | 'view' | 'edit' | 'decline' | 'delete', teacher? }
    const wide = useMediaQuery('(min-width: 1280px)');

    // The search follows typing after a pause, and starts again on page 1.
    useEffect(() => {
        const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const load = useCallback(() => api.get('/admin/teachers', {
        params: { q: query || undefined, page, status: status === 'all' ? undefined : status, organizationId: orgFilter || undefined }
    })
        .then((r) => { setData(r.data); setLoadFailed(false); })
        .catch((e) => { setLoadFailed(true); setError(e.response?.data?.message || 'Teachers could not be loaded.'); }), [query, page, status, orgFilter]);
    useEffect(() => { load(); }, [load]);

    // Every organization, for the filter and (super admins) for putting a teacher in one.
    useEffect(() => {
        api.get('/organizations/admin/options').then((r) => setOrganizations(r.data.organizations || [])).catch(() => {});
    }, []);

    const say = (message) => { setNotice(message); setError(''); };
    const fail = (e, fallback) => { setError(e.response?.data?.message || fallback); setNotice(''); };

    const setApproval = async (approvalRequired) => {
        setSavingSwitch(true);
        try {
            const r = await api.put('/admin/teachers/settings', { approvalRequired });
            setData((d) => ({ ...d, approvalRequired: r.data.approvalRequired }));
            say(r.data.approvalRequired
                ? 'New teachers who register a card now wait for your approval before they can sign in.'
                : 'New teachers can sign in as soon as they register their card.');
        } catch (e) { fail(e, 'The setting could not be saved.'); } finally { setSavingSwitch(false); }
    };

    const setTeacherStatus = async (t, next, reason) => {
        setBusyId(t._id);
        try {
            await api.patch(`/admin/teachers/${t._id}/status`, { status: next, ...(reason !== undefined ? { reason } : {}) });
            say(t.status === 'pending'
                ? (next === 'active' ? `${t.name} is approved and can sign in now.` : `${t.name} was turned down.`)
                : (next === 'active' ? `${t.name} can sign in again.` : `${t.name} is blocked and signed out.`));
            await load();
        } catch (e) { fail(e, 'The status could not be changed.'); } finally { setBusyId(null); }
    };

    const remove = async (t) => {
        try {
            const r = await api.delete(`/admin/teachers/${t._id}`);
            say(r.data.message);
            load();
        } catch (e) { fail(e, 'The teacher could not be deleted.'); }
    };

    const canAssign = Boolean(data?.canAssignOrganization);
    const close = () => setOpen(null);
    const teachers = data?.teachers || [];

    const actions = (t) => (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {t.status === 'pending' ? (
                <>
                    <button type="button" disabled={busyId === t._id} onClick={() => setTeacherStatus(t, 'active')}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-800 disabled:opacity-50">
                        {busyId === t._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}Approve
                    </button>
                    <button type="button" onClick={() => setOpen({ kind: 'decline', teacher: t })}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700"><XCircle size={14} />Turn down</button>
                </>
            ) : null}
            <button type="button" onClick={() => setOpen({ kind: 'view', teacher: t })} className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-900"><Eye size={14} />View</button>
            <button type="button" onClick={() => setOpen({ kind: 'edit', teacher: t })} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-indigo-600"><Pencil size={14} />Edit</button>
            {t.status !== 'pending' && (
                <button type="button" disabled={busyId === t._id} onClick={() => setTeacherStatus(t, t.status === 'active' ? 'inactive' : 'active')}
                    className={`inline-flex items-center gap-1 text-sm font-semibold disabled:opacity-50 ${t.status === 'active' ? 'text-orange-500 hover:text-orange-700' : 'text-emerald-600 hover:text-emerald-800'}`}>
                    {busyId === t._id ? <Loader2 size={14} className="animate-spin" /> : t.status === 'active' ? <Ban size={14} /> : <CheckCircle2 size={14} />}
                    {t.status === 'active' ? 'Block' : 'Unblock'}
                </button>
            )}
            <button type="button" onClick={() => setOpen({ kind: 'delete', teacher: t })} className="inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-700"><Trash2 size={14} />Delete</button>
        </div>
    );

    const orgName = (t) => t.organization?.name || '—';

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900"><BookOpenCheck className="text-emerald-600" aria-hidden /> Teachers</h1>
                    <p className="mt-1 text-sm text-slate-500">Teacher accounts for the research dashboard: added here, by their organization, or registered with a card at sign-in.</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={() => setOpen({ kind: 'bulk' })} className={BTN2}><Upload size={16} />Bulk upload</button>
                    <button type="button" onClick={() => setOpen({ kind: 'add' })} className={BTN}><UserPlus size={16} />Add teacher</button>
                </div>
            </div>

            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {error && !loadFailed && <Banner onClose={() => setError('')}>{error}</Banner>}

            {/* Approval: who may sign in straight after registering a card. The
                switch stays beside the title on a phone too: stacked under the
                words it sat alone at the bottom left (2026-10-28). */}
            {data && (
                <div className={`${CARD} flex items-start justify-between gap-3 p-4 sm:items-center sm:gap-4 sm:p-5`}>
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="shrink-0 rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><ShieldCheck size={20} aria-hidden /></span>
                        <div className="min-w-0">
                            <p id="approval-label" className="font-bold text-slate-800">Approve new teachers before they can sign in</p>
                            <p className="mt-0.5 text-sm text-slate-500">
                                {data.approvalRequired
                                    ? 'On: a teacher who registers a card waits here until you approve them. Teachers you or an organization add are approved already.'
                                    : 'Off: a teacher who registers a card can sign in at once.'}
                            </p>
                        </div>
                    </div>
                    <button type="button" role="switch" aria-checked={Boolean(data.approvalRequired)} aria-labelledby="approval-label" disabled={savingSwitch}
                        onClick={() => setApproval(!data.approvalRequired)}
                        className={`relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 sm:mt-0 ${data.approvalRequired ? 'bg-emerald-600' : 'bg-slate-300'}`}>
                        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${data.approvalRequired ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            )}

            {data?.pending > 0 && status !== 'pending' && (
                <button type="button" onClick={() => { setStatus('pending'); setPage(1); }}
                    className="flex w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-left text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100">
                    <Clock size={16} className="shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1">{data.pending} teacher{data.pending === 1 ? '' : 's'} waiting for your approval</span>
                    <span className="inline-flex shrink-0 items-center text-xs font-bold uppercase tracking-wider">Review<ChevronRight size={14} /></span>
                </button>
            )}

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <Segmented options={STATUS_TABS} value={status} onChange={(v) => { setStatus(v); setPage(1); }} counts={{ pending: data?.pending || 0 }} />
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="sm:w-60">
                        <Select value={orgFilter} onChange={(e) => { setOrgFilter(e.target.value); setPage(1); }} aria-label="Organization" className={INPUT}>
                            <option value="">All organizations</option>
                            <option value="none">No organization</option>
                            {organizations.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                        </Select>
                    </div>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, card, institution" label="Search teachers" className="sm:w-72" />
                </div>
            </div>

            <div className={`${CARD} overflow-hidden`}>
                {!data && !loadFailed ? (
                    <Rows count={4} height="h-16" />
                ) : loadFailed && !data ? (
                    <LoadFailed what="the teachers" onRetry={() => { setError(''); load(); }} />
                ) : !teachers.length ? (
                    <Empty icon={BookOpenCheck}>
                        {query || status !== 'all' || orgFilter ? 'No teacher matches that search or filter.' : 'No teachers yet. Add one, or upload a spreadsheet.'}
                    </Empty>
                ) : wide ? (
                    <table className="w-full table-fixed text-left text-sm">
                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="w-[24%] px-4 py-3">Teacher</th>
                                <th className="w-[18%] px-4 py-3">Institution</th>
                                <th className="w-[13%] px-4 py-3">Organization</th>
                                <th className="w-[20%] px-4 py-3">Research</th>
                                <th className="w-[8%] px-4 py-3">Status</th>
                                <th className="w-[17%] px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {teachers.map((t) => (
                                <tr key={t._id} className="align-top">
                                    <td className="px-4 py-3">
                                        <p className="truncate font-bold text-slate-800">{t.name}</p>
                                        <p className="truncate text-xs text-slate-500">{t.email}</p>
                                        <p className="font-mono text-xs text-slate-400">{t.cardNumber}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="truncate">{t.institution || '—'}</p>
                                        <p className="truncate text-xs text-slate-500">{[t.designation, t.department].filter(Boolean).join(' · ')}</p>
                                    </td>
                                    <td className="truncate px-4 py-3 text-slate-600">{orgName(t)}</td>
                                    <td className="px-4 py-3"><div className="[&>div]:flex-col [&>div]:gap-1"><TeacherSummary summary={t.summary} /></div></td>
                                    <td className="px-4 py-3"><TeacherStatus status={t.status} /><p className="mt-1 text-[11px] text-slate-400">Since {fmtDay(t.createdAt)}</p></td>
                                    <td className="px-4 py-3">{actions(t)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {teachers.map((t) => (
                            <li key={t._id} className="space-y-2.5 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-slate-800">{t.name}</p>
                                        <p className="break-all text-xs text-slate-500">{t.email} · <span className="font-mono">{t.cardNumber}</span></p>
                                        <p className="mt-0.5 text-xs text-slate-500">{[t.institution, t.department].filter(Boolean).join(' · ') || '—'}{t.organization ? ` · ${t.organization.name}` : ''}</p>
                                    </div>
                                    <TeacherStatus status={t.status} />
                                </div>
                                <TeacherSummary summary={t.summary} />
                                {actions(t)}
                            </li>
                        ))}
                    </ul>
                )}
                {data && <Pager page={data.page} limit={PAGE_SIZE} total={data.total} onPage={setPage} noun="teachers" />}
            </div>

            {open?.kind === 'add' && (
                <AddTeacherModal endpoint="/admin/teachers" organizations={canAssign ? organizations : null} onClose={close}
                    onAdded={(message) => { close(); say(message); load(); }} />
            )}
            {open?.kind === 'bulk' && (
                <BulkTeachersModal endpoint="/admin/teachers/bulk" organizations={canAssign ? organizations : null} onClose={close} onDone={load} />
            )}
            {open?.kind === 'view' && <TeacherDetailModal url={`/admin/teachers/${open.teacher._id}`} onClose={close} />}
            {open?.kind === 'edit' && (
                <EditTeacherModal teacher={open.teacher} organizations={canAssign ? organizations : null} onClose={close}
                    onSaved={(message) => { close(); say(message); load(); }} />
            )}
            {open?.kind === 'decline' && (
                <DeclineModal teacher={open.teacher} onClose={close}
                    onConfirm={async (reason) => { close(); await setTeacherStatus(open.teacher, 'inactive', reason); }} />
            )}
            <DeleteConfirmModal isOpen={open?.kind === 'delete'} onClose={close} onConfirm={() => remove(open.teacher)}
                title="Delete this teacher?" itemName={open?.teacher?.name}
                message="Their account and everything in it — research paths, publications, theses, writing and plagiarism reports — are deleted for good. The card can be used for a new account." />
        </div>
    );
}

/** Turning down a teacher waiting for approval, with a reason they are told. */
const DeclineModal = ({ teacher, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    return (
        <Dialog onClose={onClose}>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
                <DialogTitle>Turn down {teacher.name}?</DialogTitle>
                <p className="mt-2 text-sm text-slate-500">They will not be able to sign in. You can unblock them later from this list.</p>
                <label htmlFor="decline-reason" className={`${LABEL} mt-4`}>Reason (optional)</label>
                <textarea id="decline-reason" rows={3} data-autofocus value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT}
                    placeholder="For example: we could not confirm you teach at a partner institution." />
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-4">
                <button type="button" onClick={onClose} className={BTN2}>Cancel</button>
                <button type="button" onClick={() => onConfirm(reason.trim())} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">Turn down</button>
            </div>
        </Dialog>
    );
};

/**
 * Edit a teacher's details. A new password takes effect at once and signs
 * them out everywhere; "Email a reset link" lets them choose their own. A
 * super admin also sees the organization.
 */
const EditTeacherModal = ({ teacher, organizations, onClose, onSaved }) => {
    const [form, setForm] = useState({
        name: teacher.name || '', email: teacher.email || '', phone: teacher.phone || '',
        institution: teacher.institution || '', department: teacher.department || '', designation: teacher.designation || '',
        password: '', organizationId: teacher.organizationId ? String(teacher.organizationId) : ''
    });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [sending, setSending] = useState(false);
    const set = (key) => (e) => { setForm((f) => ({ ...f, [key]: e.target.value })); setErrors((x) => ({ ...x, [key]: '' })); };
    const choices = organizations ? assignable(organizations) : null;

    const submit = async (e) => {
        e.preventDefault();
        if (form.password && !strongPassword(form.password)) { setErrors({ password: 'Use 8+ characters with a capital, a small letter, a number and a symbol.' }); return; }
        setBusy(true);
        setError('');
        try {
            const body = { ...form };
            if (!body.password) delete body.password;
            if (!choices || body.organizationId === (teacher.organizationId ? String(teacher.organizationId) : '')) delete body.organizationId;
            const r = await api.put(`/admin/teachers/${teacher._id}`, body);
            onSaved(r.data.message || 'Saved.');
        } catch (err) {
            const { field, message } = refusal(err, 'The changes could not be saved.');
            if (field && field in form) setErrors({ [field]: message }); else setError(message);
        } finally { setBusy(false); }
    };

    const sendReset = async () => {
        setSending(true);
        setError('');
        try {
            const r = await api.post(`/admin/teachers/${teacher._id}/send-password-reset`);
            setNotice(r.data.message);
        } catch (err) { setError(refusal(err, 'The email could not be sent.').message); } finally { setSending(false); }
    };

    return (
        <Dialog onClose={() => { if (!busy) onClose(); }} size="max-w-lg">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-800"><Pencil size={18} className="text-indigo-600" /> Edit {teacher.name}</DialogTitle>
                <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-5">
                    {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
                    {error && <Banner onClose={() => setError('')}>{error}</Banner>}
                    <Field id="e-name" label="Full name" value={form.name} onChange={set('name')} error={errors.name} />
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id="e-email" label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
                        <Field id="e-phone" label="Phone" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id="e-institution" label="Institution" value={form.institution} onChange={set('institution')} error={errors.institution} />
                        <Field id="e-department" label="Department" value={form.department} onChange={set('department')} error={errors.department} />
                    </div>
                    <Field id="e-designation" label="Designation" value={form.designation} onChange={set('designation')} error={errors.designation} />
                    {choices && (
                        <Field id="e-org" label="Organization" error={errors.organizationId} hint="Moving a teacher ends any waiting request to join an organization.">
                            <Select id="e-org" value={form.organizationId} onChange={set('organizationId')} aria-label="Organization" className={INPUT}>
                                <option value="">No organization</option>
                                {choices.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                            </Select>
                        </Field>
                    )}
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="flex items-center gap-2 text-sm font-bold text-slate-700"><KeyRound size={15} aria-hidden />Password</p>
                        <p className="mt-1 text-xs text-slate-500">Leave empty to keep it. A new one works at once and signs them out on every device.</p>
                        <div className="mt-2">
                            <Field id="e-password" label="New password" error={errors.password}>
                                <input id="e-password" type="text" value={form.password} onChange={set('password')} autoComplete="new-password" className={INPUT}
                                    aria-invalid={errors.password ? 'true' : undefined} placeholder="Leave empty to keep the current one" />
                                <PasswordStrengthChecker password={form.password} focused={!!form.password} />
                            </Field>
                        </div>
                        <button type="button" onClick={sendReset} disabled={sending} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Or email them a reset link
                        </button>
                    </div>
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-5 py-4">
                    <button type="button" onClick={onClose} className={BTN2} disabled={busy}>Cancel</button>
                    <button type="submit" disabled={busy} className={BTN}>{busy && <Loader2 size={15} className="animate-spin" />} Save</button>
                </div>
            </form>
        </Dialog>
    );
};
