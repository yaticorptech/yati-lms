/**
 * "Add your organization": the teacher's college or school on YATICORP, in a
 * popup opened from the dashboard (and from My profile) — no page or menu
 * item of its own. The same steps a student takes: type the Organization ID
 * the college gives you, check it is the right one, and ask to join; the
 * college's admin approves. Colleges can also add their teachers
 * themselves, in which case the teacher is already a member here.
 *
 * A member's college sees their research progress (stages, publication
 * titles, thesis word counts), never the words they write. Leaving an active
 * college is the college's decision; a college that is no longer active can
 * be left from here, so no one is stuck in it.
 */
import { useCallback, useEffect, useState } from 'react';
import { Building2, Search, Loader2, Clock, CheckCircle2, XCircle, LogOut, Copy, Check, ExternalLink, ShieldCheck, Info } from 'lucide-react';
import teacherApi, { messageOf } from './teacherSession';
import { Modal, Loading, ErrorNote, OkNote, Field } from './ui';
import { btn, inputClass, fmtDate } from './kit';
import useConfirmDialog from '../components/useConfirmDialog';

const CopyCode = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* the code is on screen to copy by hand */ }
    };
    return (
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700 hover:bg-slate-200" aria-label={`Copy Organization ID ${code}`}>
            {code} {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
        </button>
    );
};

const OrgCard = ({ org, children }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
        {org.logo
            ? <img src={org.logo} alt="" className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-contain" />
            : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Building2 size={24} aria-hidden="true" /></span>}
        <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900 [overflow-wrap:anywhere]">{org.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {org.typeLabel && <span>{org.typeLabel}</span>}
                {org.orgCode && <CopyCode code={org.orgCode} />}
                {org.website && <a href={org.website} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline">Website <ExternalLink size={11} aria-hidden="true" /></a>}
            </div>
        </div>
        {children}
    </div>
);

/** `onChanged` runs after a request, a withdrawal or leaving, so the page behind can refresh. */
export default function OrganizationDialog({ onClose, onChanged }) {
    const [state, setState] = useState(null);
    const [error, setError] = useState('');
    const [note, setNote] = useState('');
    const [code, setCode] = useState('');
    const [found, setFound] = useState(null);
    const [findError, setFindError] = useState('');
    const [busy, setBusy] = useState('');                 // 'find' | 'join' | 'withdraw' | 'leave'
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = useCallback(() => teacherApi.get('/organization')
        .then((r) => { setState(r.data); setError(''); })
        .catch((e) => setError(messageOf(e, 'Your organization could not be loaded.'))), []);
    useEffect(() => { load(); }, [load]);

    const changed = async (message) => { setNote(message); await load(); onChanged?.(); };

    const find = async (e) => {
        e.preventDefault();
        setFindError(''); setFound(null); setNote('');
        if (!code.trim()) { setFindError('Enter the Organization ID your college gave you.'); return; }
        setBusy('find');
        try { const r = await teacherApi.get(`/organization/lookup/${encodeURIComponent(code.trim())}`); setFound(r.data); }
        catch (err) { setFindError(messageOf(err, 'That organization could not be looked up just now.')); } finally { setBusy(''); }
    };

    const join = async () => {
        setBusy('join'); setFindError('');
        try {
            const r = await teacherApi.post('/organization/requests', { orgCode: found.organization.orgCode });
            setFound(null); setCode('');
            await changed(r.data.message);
        } catch (err) { setFindError(messageOf(err, 'Your request could not be sent.')); } finally { setBusy(''); }
    };

    const withdraw = async () => {
        if (!(await confirm({ title: 'Withdraw your request?', message: `Your request to join ${state.request.organization?.name || 'this organization'} is cancelled. You can ask again later.`, confirmLabel: 'Withdraw' }))) return;
        setBusy('withdraw'); setError('');
        try { const r = await teacherApi.delete(`/organization/requests/${state.request._id}`); await changed(r.data.message); }
        catch (err) { setError(messageOf(err, 'The request could not be withdrawn.')); } finally { setBusy(''); }
    };

    const leave = async () => {
        if (!(await confirm({ title: `Leave ${state.organization.name}?`, message: 'You can join another organization afterwards. Your research stays yours.', confirmLabel: 'Leave', destructive: true }))) return;
        setBusy('leave'); setError('');
        try { const r = await teacherApi.post('/organization/leave'); await changed(r.data.message); }
        catch (err) { setError(messageOf(err, 'You could not leave just now.')); } finally { setBusy(''); }
    };

    const request = state?.request;
    const pending = request?.status === 'pending';
    const rejected = request?.status === 'rejected' && !state?.member;
    const title = state?.member ? 'Your organization' : pending ? 'Waiting for approval' : 'Add your organization';

    return (
        <Modal title={title} onClose={onClose} labelId="organization-dialog-title"
            footer={<button type="button" onClick={onClose} className={btn.secondary}>Close</button>}>
            <div className="space-y-3">
                <ErrorNote onRetry={!state ? load : undefined}>{error}</ErrorNote>
                <OkNote>{note}</OkNote>
                {!state && !error && <Loading label="Loading…" />}

                {state?.member && (
                    <>
                        <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><CheckCircle2 size={16} aria-hidden="true" /> You are a member</p>
                        <OrgCard org={state.organization}>
                            {state.organization.status && state.organization.status !== 'active' && (
                                <button type="button" onClick={leave} disabled={busy === 'leave'} className={btn.danger}>{busy === 'leave' ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />} Leave</button>
                            )}
                        </OrgCard>
                        {state.organization.joinedAt && <p className="text-xs text-slate-500">Member since {fmtDate(state.organization.joinedAt)}</p>}
                        {state.organization.accessNote && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{state.organization.accessNote} You can leave it and join another.</p>}
                        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                            <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>Your organization sees your progress — research stages, publication titles and status, thesis word counts — to support your research. It never sees the words you write. To leave, ask your organization to remove you.</span>
                        </p>
                    </>
                )}

                {state && !state.member && pending && (
                    <>
                        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700"><Clock size={16} aria-hidden="true" /> Your request is with the organization</p>
                        <OrgCard org={request.organization || { name: 'Your organization' }}>
                            <button type="button" onClick={withdraw} disabled={busy === 'withdraw'} className={btn.secondary}>{busy === 'withdraw' && <Loader2 size={15} className="animate-spin" />} Withdraw</button>
                        </OrgCard>
                        <p className="text-sm text-slate-600">You asked to join on {fmtDate(request.requestedAt)}. Their admin will approve or decline it; the answer shows here.</p>
                    </>
                )}

                {state && !state.member && !pending && (
                    <>
                        {state.removed && (
                            <p className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                <Info size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                                You are no longer a member of {state.removed.organizationName} ({state.removed.reason.toLowerCase()}{state.removed.at ? `, ${fmtDate(state.removed.at)}` : ''}).
                            </p>
                        )}
                        {rejected && (
                            <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                                <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                <span>{request.organization?.name || 'The organization'} declined your request{request.decisionReason ? `: “${request.decisionReason}”` : '.'} You can ask again, or join another.</span>
                            </p>
                        )}
                        <p className="text-sm text-slate-600">Ask your college or school for its <strong>Organization ID</strong> (for example <span className="font-mono">xxx_college</span>). Find it, check it is the right one, and ask to join — their admin approves.</p>
                        <form onSubmit={find} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                                <Field id="org-code" label="Organization ID" error={findError}>
                                    <input id="org-code" value={code} onChange={(e) => { setCode(e.target.value); setFound(null); setFindError(''); }} autoCapitalize="none" autoCorrect="off" spellCheck={false} maxLength={60}
                                        className={`${inputClass} font-mono`} placeholder="xxx_college" />
                                </Field>
                            </div>
                            <button type="submit" disabled={busy === 'find'} className={btn.secondary}>{busy === 'find' ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Find</button>
                        </form>
                        {found && (
                            <div className="space-y-2">
                                <OrgCard org={found.organization}>
                                    {found.alreadyMember ? <span className="text-sm font-bold text-emerald-700">You are a member</span>
                                        : <button type="button" onClick={join} disabled={busy === 'join' || found.hasPendingRequest} className={btn.primary}>{busy === 'join' && <Loader2 size={15} className="animate-spin" />} Ask to join</button>}
                                </OrgCard>
                                {found.pendingElsewhere && <p className="text-xs text-amber-700">You have a request waiting with another organization. Withdraw it first.</p>}
                            </div>
                        )}
                    </>
                )}
            </div>
            {confirmDialog}
        </Modal>
    );
}
