/**
 * The queue of students asking to join this organization, and the approve /
 * reject decision.
 *
 * Approving is the only thing in the whole product that makes someone a member,
 * so both actions confirm first, and a rejection asks for a reason the student
 * will actually be shown.
 *
 * Oldest first: whoever has been waiting longest is dealt with first.
 */
import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle2, XCircle, Loader2, Mail, Phone, Clock } from 'lucide-react';
import api from '../../utils/api';
import { CARD, LABEL, INPUT, BTN2, Empty, Banner, Rows, Pill, PageHeader, Segmented, Avatar } from '../../components/orgUi';
import { formatDate, relativeDay } from '../../utils/dates';

const TABS = [
    ['pending', 'Waiting'],
    ['approved', 'Approved'],
    ['rejected', 'Rejected']
];

const OrgRequests = () => {
    const [tab, setTab] = useState('pending');
    const [requests, setRequests] = useState([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [asking, setAsking] = useState(null);   // { request, decision }

    // Bumped after a decision so the effect below reloads through the one code
    // path that knows which tab is open.
    const [reloadKey, setReloadKey] = useState(0);

    /**
     * Load the open tab, and keep it fresh every 30 seconds.
     *
     * A plain effect keyed on the tab rather than the shared useAutoRefresh hook,
     * whose interval holds its first fetch function for the life of the page — it
     * would keep pulling the "waiting" list back over whichever tab was chosen.
     */
    useEffect(() => {
        let alive = true;

        const load = async (withSkeleton) => {
            if (withSkeleton) setLoading(true);
            try {
                const res = await api.get('/organizations/me/requests', { params: { status: tab } });
                if (!alive) return;
                setRequests(res.data.requests || []);
                setPendingCount(res.data.pendingCount || 0);
                setError('');
            } catch (err) {
                if (alive) setError(err.response?.data?.message || 'Could not load the requests.');
            } finally {
                if (alive) setLoading(false);
            }
        };

        load(true);
        const id = setInterval(() => load(false), 30000);
        return () => { alive = false; clearInterval(id); };
    }, [tab, reloadKey]);

    const decide = async (reason) => {
        const { request, decision } = asking;
        try {
            const res = await api.put(`/organizations/me/requests/${request._id}`, { decision, reason });
            setNotice(res.data.message);
            setAsking(null);
            setReloadKey((n) => n + 1);
            setTimeout(() => setNotice(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'That did not go through.');
            setAsking(null);
        }
    };

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in pb-10">
            <PageHeader icon={UserPlus} title="Student Requests"
                subtitle="Students who entered your organization ID and asked to join. Approving one makes them a member." />

            {notice && <Banner kind="ok" onClose={() => setNotice('')}>{notice}</Banner>}
            {error && <Banner onClose={() => setError('')}>{error}</Banner>}

            <Segmented options={TABS} value={tab} onChange={setTab} counts={{ pending: pendingCount }} />

            <div className={`${CARD} overflow-hidden`}>
                {loading ? (
                    <Rows count={3} height="h-16" />
                ) : requests.length === 0 ? (
                    <Empty icon={tab === 'pending' ? Clock : UserPlus}>
                        {tab === 'pending'
                            ? 'No pending student requests.'
                            : `No ${tab} requests yet.`}
                    </Empty>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {requests.map((r) => (
                            <li key={r._id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:px-6">
                                <div className="flex items-start gap-3.5 min-w-0">
                                    <Avatar name={r.student.name} src={r.student.profilePicture} />
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-800">{r.student.name}</p>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-500">
                                            <span className="inline-flex min-w-0 items-center gap-1.5 break-all"><Mail size={12} className="shrink-0" />{r.student.email}</span>
                                            {r.student.phone && <span className="inline-flex items-center gap-1.5"><Phone size={12} />{r.student.phone}</span>}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Requested {relativeDay(r.requestedAt).toLowerCase()}
                                            {r.student.status !== 'active' && <> · account is {r.student.status}</>}
                                        </p>
                                        {r.decisionReason && (
                                            <p className="mt-1 text-xs text-slate-600">
                                                <span className="font-semibold">Reason given: </span>{r.decisionReason}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {r.status === 'pending' ? (
                                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                                        <button onClick={() => setAsking({ request: r, decision: 'reject' })}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-50">
                                            <XCircle size={15} />Reject
                                        </button>
                                        <button onClick={() => setAsking({ request: r, decision: 'approve' })}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-700">
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

            {asking && <DecideModal asking={asking} onCancel={() => setAsking(null)} onConfirm={decide} />}
        </div>
    );
};

const DecideModal = ({ asking, onCancel, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const approving = asking.decision === 'approve';
    const name = asking.request.student.name;

    const submit = async () => {
        setBusy(true);
        await onConfirm(reason.trim());
        setBusy(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4" role="dialog" aria-modal="true">
            <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[calc(100dvh-1.5rem)]">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                    <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${approving ? 'bg-emerald-100' : 'bg-red-100'}`}>
                        {approving ? <CheckCircle2 size={24} className="text-emerald-600" /> : <XCircle size={24} className="text-red-600" />}
                    </div>
                    <h2 className="text-center text-lg font-bold text-slate-800">
                        {approving ? `Approve ${name}?` : `Reject ${name}?`}
                    </h2>
                    <p className="mt-3 text-center text-sm text-slate-500">
                        {approving
                            ? 'They become a member of your organization, and you will be able to see their learning progress.'
                            : 'They stay outside your organization. They keep their account and everything they have learned, and can ask again later.'}
                    </p>

                    {!approving && (
                        <div className="mt-4">
                            <label className={LABEL} htmlFor="reject-reason">Reason (optional — the student sees this)</label>
                            <textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                                placeholder="For example: we could not find you on our student roll." className={INPUT} />
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                    <button onClick={onCancel} className={BTN2} disabled={busy}>Cancel</button>
                    <button onClick={submit} disabled={busy}
                        className={approving
                            ? 'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50'
                            : 'inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50'}>
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        {approving ? 'Approve' : 'Reject'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrgRequests;
