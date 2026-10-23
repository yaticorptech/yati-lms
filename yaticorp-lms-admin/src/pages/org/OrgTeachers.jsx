/**
 * The organization's teachers, in two tabs (kept in the address, ?tab=):
 *
 *   Teachers  — who they are and how their research is going, with View and
 *               Remove; and the ways to add more: their own card (Add teacher,
 *               Bulk upload), or the teacher asks to join: "Add your
 *               organization" on their dashboard, with this Organization ID.
 *   Requests  — teachers who asked to join: approve or reject, as for students.
 *
 * Every request goes to /organizations/me/teachers…, scoped on the server to
 * the signed-in organization; nothing here sends an organization id.
 */
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Presentation, UserPlus, Upload, Eye, UserMinus, Copy, Check, CheckCircle2, XCircle, Mail, Phone, Clock, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import { CARD, LABEL, INPUT, BTN, BTN2, Empty, Banner, Rows, Pill, PageHeader, Segmented, Avatar, LoadFailed, SearchInput, Dialog, DialogTitle } from '../../components/orgUi';
import AddTeacherModal from '../../components/teachers/AddTeacherModal';
import BulkTeachersModal from '../../components/teachers/BulkTeachersModal';
import TeacherDetailModal from '../../components/teachers/TeacherDetailModal';
import { TeacherStatus, TeacherSummary } from '../../components/teachers/TeacherBits';
import { formatDate, relativeDay } from '../../utils/dates';

const TABS = [['teachers', 'Teachers'], ['requests', 'Requests']];
const REQUEST_TABS = [['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']];

/** The layout's badge beside "Teachers" listens for this. */
const changed = () => window.dispatchEvent(new Event('organization-teacher-requests-changed'));

const OrgTeachers = () => {
    const [params, setParams] = useSearchParams();
    const tab = params.get('tab') === 'requests' ? 'requests' : 'teachers';
    const [pending, setPending] = useState(0);
    const [notice, setNotice] = useState('');

    const switchTab = (next) => setParams(next === 'teachers' ? {} : { tab: next }, { replace: true });

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={Presentation} title="Teachers"
                subtitle="Your teachers and their research progress. Add them with their card, or approve those who ask to join." />
            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            <Segmented options={TABS} value={tab} onChange={switchTab} counts={{ requests: pending }} />
            {tab === 'teachers'
                ? <TeachersTab onNotice={setNotice} onPending={setPending} />
                : <RequestsTab onNotice={setNotice} onPending={setPending} />}
        </div>
    );
};

/* ── Teachers ──────────────────────────────────────────────────────────── */

const TeachersTab = ({ onNotice, onPending }) => {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(null);       // { kind: 'add' | 'bulk' | 'view' | 'remove', teacher? }

    useEffect(() => {
        const t = setTimeout(() => setQuery(search.trim()), 400);
        return () => clearTimeout(t);
    }, [search]);

    const load = async ({ signal, isCurrent = () => true } = {}) => {
        try {
            const r = await api.get('/organizations/me/teachers', { params: { search: query || undefined }, signal });
            if (!isCurrent()) return;
            setData(r.data);
            onPending(r.data.pendingRequests || 0);
            setLoadFailed(false);
            setError('');
        } catch (err) {
            if (!isCurrent()) return;
            setError(err.response?.data?.message || 'Could not load your teachers.');
            setLoadFailed(true);
        } finally {
            if (isCurrent()) setLoading(false);
        }
    };
    const reload = useAutoRefresh(load, 30000, [query]);

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(data.orgCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* refused over plain HTTP; the ID is on screen anyway */ }
    };

    const close = () => setOpen(null);
    const teachers = data?.teachers || [];

    return (
        <>
            {/* The ways in: their own card here, or the Organization ID from their dashboard. */}
            <div className={`${CARD} flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between`}>
                <div className="min-w-0">
                    <p className="font-bold text-slate-800">Add teachers</p>
                    <p className="mt-1 text-sm text-slate-500">
                        Add a teacher with their YATICORP card, or upload a spreadsheet of them. Teachers who already have an account can ask to join:
                        they open their teacher dashboard, tap <strong>Add your organization</strong> and enter this Organization ID.
                    </p>
                    {data?.orgCode && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Organization ID</span>
                            <code className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-sm font-bold text-slate-800">{data.orgCode}</code>
                            <button type="button" onClick={copyCode} aria-label="Copy Organization ID" className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50">
                                {copied ? <Check size={14} /> : <Copy size={14} />}{copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                    <button type="button" onClick={() => setOpen({ kind: 'bulk' })} className={BTN2}><Upload size={16} />Bulk upload</button>
                    <button type="button" onClick={() => setOpen({ kind: 'add' })} className={BTN}><UserPlus size={16} />Add teacher</button>
                </div>
            </div>

            {error && !loadFailed && <Banner onClose={() => setError('')}>{error}</Banner>}

            <div className={`${CARD} overflow-hidden`}>
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <p className="text-sm font-semibold text-slate-600">{data ? `${teachers.length} teacher${teachers.length === 1 ? '' : 's'}` : 'Teachers'}</p>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, email, card, department" label="Search teachers" className="sm:w-72" />
                </div>
                {loading ? (
                    <Rows count={3} height="h-16" />
                ) : loadFailed && !data ? (
                    <LoadFailed what="your teachers" onRetry={reload} />
                ) : !teachers.length ? (
                    <Empty icon={Presentation}>{query ? 'No teacher matches that search.' : 'No teachers yet. Add one with their card, or share your Organization ID.'}</Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {teachers.map((t) => (
                            <li key={t._id} className="flex flex-col gap-3 p-4 sm:px-6 xl:flex-row xl:items-center xl:justify-between">
                                <div className="flex min-w-0 items-start gap-3.5">
                                    <Avatar name={t.name} />
                                    <div className="min-w-0 space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate font-semibold text-slate-800">{t.name}</p>
                                            {t.status !== 'active' && <TeacherStatus status={t.status} />}
                                        </div>
                                        <p className="break-all text-xs text-slate-500">{[t.designation, t.department].filter(Boolean).join(' · ') || 'Teacher'} · {t.email}</p>
                                        <TeacherSummary summary={t.summary} />
                                        <p className="text-[11px] text-slate-400">Member since {formatDate(t.organizationJoinedAt || t.createdAt)} · last sign-in {t.lastLoginAt ? relativeDay(t.lastLoginAt).toLowerCase() : 'never'}</p>
                                    </div>
                                </div>
                                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                                    <button type="button" onClick={() => setOpen({ kind: 'view', teacher: t })} className={BTN2}><Eye size={15} />View</button>
                                    <button type="button" onClick={() => setOpen({ kind: 'remove', teacher: t })}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
                                        <UserMinus size={15} />Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {open?.kind === 'add' && (
                <AddTeacherModal endpoint="/organizations/me/teachers" onClose={close}
                    onAdded={(message) => { close(); onNotice(message); reload(); }} />
            )}
            {open?.kind === 'bulk' && <BulkTeachersModal endpoint="/organizations/me/teachers/bulk" onClose={close} onDone={reload} />}
            {open?.kind === 'view' && <TeacherDetailModal url={`/organizations/me/teachers/${open.teacher._id}`} onClose={close} />}
            {open?.kind === 'remove' && (
                <RemoveTeacherDialog teacher={open.teacher} onCancel={close}
                    onRemoved={(message) => { close(); onNotice(message); reload(); }} />
            )}
        </>
    );
};

/** "Remove {teacher}?" — said plainly that their account and research stay theirs. */
const RemoveTeacherDialog = ({ teacher, onCancel, onRemoved }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const remove = async () => {
        setBusy(true);
        setError('');
        try {
            const r = await api.delete(`/organizations/me/teachers/${teacher._id}`);
            onRemoved(r.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'That did not go through.');
            setBusy(false);
        }
    };
    return (
        <Dialog onClose={() => { if (!busy) onCancel(); }}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 text-center sm:p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                    <UserMinus size={24} className="text-amber-600" />
                </div>
                <DialogTitle>Remove {teacher.name}?</DialogTitle>
                <p className="mt-3 text-sm text-slate-500">
                    They stop appearing in your organization and you can no longer see their progress.
                    Their account and all their research — paths, publications, thesis and writing — stay theirs. Nothing is deleted.
                </p>
                <p className="mt-2 text-sm text-slate-500">They can ask to join again with your Organization ID.</p>
                {error && <div className="mt-4 text-left"><Banner>{error}</Banner></div>}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                <button type="button" onClick={onCancel} className={BTN2} disabled={busy} data-autofocus>Cancel</button>
                <button type="button" onClick={remove} disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                    {busy && <Loader2 size={16} className="animate-spin" />}Remove teacher
                </button>
            </div>
        </Dialog>
    );
};

/* ── Requests ──────────────────────────────────────────────────────────── */

const RequestsTab = ({ onNotice, onPending }) => {
    const [status, setStatus] = useState('pending');
    const [requests, setRequests] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [error, setError] = useState('');
    const [asking, setAsking] = useState(null);   // { request, decision }

    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        if (fresh) setLoading(true);
        try {
            const r = await api.get('/organizations/me/teachers/requests', { params: { status }, signal });
            if (!isCurrent()) return;
            setRequests(r.data.requests || []);
            setPendingCount(r.data.pendingCount || 0);
            onPending(r.data.pendingCount || 0);
            setLoadFailed(false);
            setError('');
        } catch (err) {
            if (!isCurrent()) return;
            setError(err.response?.data?.message || 'Could not load the requests.');
            if (fresh) { setRequests([]); setLoadFailed(true); }
        } finally {
            if (isCurrent()) setLoading(false);
        }
    };
    const reload = useAutoRefresh(load, 30000, [status]);

    /** Resolves to an error message for the dialog, or nothing on success. */
    const decide = async (reason) => {
        const { request, decision } = asking;
        try {
            const r = await api.put(`/organizations/me/teachers/requests/${request._id}`, { decision, reason });
            onNotice(r.data.message);
            setAsking(null);
            reload();
            changed();
            return '';
        } catch (err) {
            // Usually decided elsewhere already, or the teacher joined another
            // organization meanwhile (409 JOINED_ELSEWHERE): the list shows it.
            reload();
            changed();
            return err.response?.data?.message || 'That did not go through.';
        }
    };

    return (
        <>
            {error && !loadFailed && <Banner onClose={() => setError('')}>{error}</Banner>}
            <Segmented options={REQUEST_TABS} value={status} onChange={setStatus} counts={{ pending: pendingCount }} />
            <div className={`${CARD} overflow-hidden`}>
                {loading ? (
                    <Rows count={3} height="h-16" />
                ) : loadFailed ? (
                    <LoadFailed what="the requests" onRetry={reload} />
                ) : !requests.length ? (
                    <Empty icon={status === 'pending' ? Clock : UserPlus}>
                        {status === 'pending' ? 'No teachers are waiting to join.' : `No ${status} requests yet.`}
                    </Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {requests.map((r) => (
                            <li key={r._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-6">
                                <div className="flex min-w-0 items-start gap-3.5">
                                    <Avatar name={r.teacher.name} />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-800">{r.teacher.name}</p>
                                        {r.teacher.contactHidden ? (
                                            <p className="text-xs italic text-slate-400">Contact hidden (not a member)</p>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-600">{[r.teacher.designation, r.teacher.department, r.teacher.institution].filter(Boolean).join(' · ')}</p>
                                                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                                                    <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><Mail size={12} className="shrink-0" />{r.teacher.email}</span>
                                                    {r.teacher.phone && <span className="inline-flex items-center gap-1.5"><Phone size={12} />{r.teacher.phone}</span>}
                                                </div>
                                            </>
                                        )}
                                        <p className="mt-1 text-xs text-slate-500">Asked {relativeDay(r.requestedAt).toLowerCase()}</p>
                                        {r.decisionReason && <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Reason: </span>{r.decisionReason}</p>}
                                    </div>
                                </div>
                                {r.status === 'pending' ? (
                                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                                        <button type="button" onClick={() => setAsking({ request: r, decision: 'reject' })}
                                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
                                            <XCircle size={15} />Reject
                                        </button>
                                        <button type="button" onClick={() => setAsking({ request: r, decision: 'approve' })}
                                            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700">
                                            <CheckCircle2 size={15} />Approve
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex shrink-0 items-center gap-3">
                                        <Pill status={r.status} />
                                        <span className="text-xs text-slate-500">{formatDate(r.decidedAt)}</span>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {asking && <DecideDialog asking={asking} onCancel={() => setAsking(null)} onConfirm={decide} />}
        </>
    );
};

const DecideDialog = ({ asking, onCancel, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const approving = asking.decision === 'approve';
    const name = asking.request.teacher.name;

    const submit = async () => {
        setBusy(true);
        setError('');
        const failed = await onConfirm(reason.trim());
        if (failed) setError(failed);
        setBusy(false);
    };

    return (
        <Dialog onClose={() => { if (!busy) onCancel(); }}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${approving ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {approving ? <CheckCircle2 size={24} className="text-emerald-600" /> : <XCircle size={24} className="text-red-600" />}
                </div>
                <DialogTitle className="text-center text-lg font-bold text-slate-800">{approving ? `Approve ${name}?` : `Reject ${name}?`}</DialogTitle>
                <p className="mt-3 text-center text-sm text-slate-500">
                    {approving
                        ? 'They become a teacher of your organization, and you will see how their research is going.'
                        : 'They stay outside your organization. They keep their account and their research, and can ask again later.'}
                </p>
                {!approving && (
                    <div className="mt-4">
                        <label className={LABEL} htmlFor="teacher-reject-reason">Reason (optional — the teacher sees this)</label>
                        <textarea id="teacher-reject-reason" rows={3} data-autofocus value={reason} onChange={(e) => setReason(e.target.value)}
                            placeholder="For example: we could not find you on our staff list." className={INPUT} />
                    </div>
                )}
                {error && <div className="mt-4"><Banner>{error}</Banner></div>}
            </div>
            <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                <button type="button" onClick={onCancel} className={BTN2} disabled={busy} data-autofocus={approving || undefined}>Cancel</button>
                <button type="button" onClick={submit} disabled={busy}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${approving ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}>
                    {busy && <Loader2 size={16} className="animate-spin" />}{approving ? 'Approve' : 'Reject'}
                </button>
            </div>
        </Dialog>
    );
};

export default OrgTeachers;
