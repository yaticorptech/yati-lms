/**
 * The superadmin's Organizations section: every institution on the platform,
 * the queue of registrations waiting for a decision, and the approve / reject /
 * suspend actions.
 *
 * Status and type are filtered on the server, because both are discrete and one
 * fetch per change is cheap. The search box filters the rows already in hand, so
 * typing stays instant and does not hit the API per keystroke — the same
 * client-side search every other list in this panel uses.
 *
 * Nothing here deletes an organization. Rejecting or suspending withdraws access
 * and keeps the record, the memberships and every student's learning history.
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Building2, Search, Plus, Users, CheckCircle2, XCircle, AlertTriangle,
    Loader2, Copy, Check, ExternalLink, Ban, RotateCcw, Mail, Phone, MapPin, Globe, X,
    UserPlus, UserMinus, ArrowRight
} from 'lucide-react';
import api from '../utils/api';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import PasswordField from '../components/PasswordField';
import { formatDate } from '../utils/dates';
import Select from '../components/Select';

const INPUT = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';
const LABEL = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
const BTN = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:opacity-50';
const BTN2 = 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50';

const STATUS_TONE = {
    pending: 'bg-amber-100 text-amber-800',
    active: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    suspended: 'bg-orange-100 text-orange-800',
    inactive: 'bg-slate-100 text-slate-600'
};

/** A pending organization has not been approved yet, so nobody is put into it. */
const canAssignTo = (org) => Boolean(org) && org.status !== 'pending';

const StatusPill = ({ status }) => (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${STATUS_TONE[status] || 'bg-slate-100 text-slate-600'}`}>
        {status}
    </span>
);

/**
 * The decision buttons for one row, shared by the table and the phone cards.
 *
 * Written once rather than twice: these are the approve/reject controls, and two
 * copies that could disagree about which organization offers which action is
 * exactly the sort of thing nobody notices until a phone shows the wrong one.
 */
const RowActions = ({ org, onDetail, onDecide }) => (
    <>
        <button onClick={() => onDetail(org._id)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors">
            {org.status === 'pending' ? 'Review' : 'View'}
        </button>
        {org.status === 'pending' && (
            <>
                <button onClick={() => onDecide(org, 'active')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm transition-colors">Approve</button>
                <button onClick={() => onDecide(org, 'rejected')} className="text-red-500 hover:text-red-700 font-medium text-sm transition-colors">Reject</button>
            </>
        )}
        {org.status === 'active' && (
            <button onClick={() => onDecide(org, 'suspended')} className="text-orange-500 hover:text-orange-700 font-medium text-sm transition-colors">Suspend</button>
        )}
        {['suspended', 'inactive', 'rejected'].includes(org.status) && (
            <button onClick={() => onDecide(org, 'active')} className="text-emerald-600 hover:text-emerald-800 font-medium text-sm transition-colors">Reinstate</button>
        )}
    </>
);

const FILTERS = [
    ['all', 'All'],
    ['pending', 'Pending'],
    ['active', 'Active'],
    ['suspended', 'Suspended'],
    ['inactive', 'Inactive'],
    ['rejected', 'Rejected']
];

/** The organization ID is meant to be handed to students, so make it one tap to copy. */
const CopyableCode = ({ code }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Clipboard access is refused in some browsers and over plain HTTP.
            // The code is on screen either way, so this is not worth an error.
        }
    };

    return (
        <button
            onClick={copy}
            title="Copy organization ID"
            aria-label={`Copy organization ID ${code}`}
            className="group inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-slate-700 hover:text-indigo-600"
        >
            {code}
            {copied
                ? <Check size={14} className="text-emerald-600" />
                : <Copy size={13} className="text-slate-300 group-hover:text-indigo-500" />}
        </button>
    );
};

const Organizations = () => {
    const [organizations, setOrganizations] = useState([]);
    const [totals, setTotals] = useState({});
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const [status, setStatus] = useState('all');
    const [type, setType] = useState('all');
    const [search, setSearch] = useState('');

    const [detail, setDetail] = useState(null);       // { organization, admins, studentCount, pendingRequests }
    const [detailLoading, setDetailLoading] = useState(false);
    const [students, setStudents] = useState(null);   // { organization, students }
    const [decision, setDecision] = useState(null);   // { org, status, needsReason, title, verb }
    const [showCreate, setShowCreate] = useState(false);

    // Bumped after a decision to make the effect below re-run, so the list is
    // reloaded through the one code path that knows the current filters.
    const [reloadKey, setReloadKey] = useState(0);

    /**
     * Load the list, and keep it fresh every 30 seconds.
     *
     * Written as a plain effect keyed on the filters rather than through the
     * shared useAutoRefresh hook: that hook deliberately has an empty dependency
     * array, so its interval would hold the very first fetch function forever and
     * a tick 30 seconds later would quietly replace the filtered list with the
     * unfiltered one. Restarting the interval whenever the filters change is
     * what keeps the screen showing what was asked for.
     */
    useEffect(() => {
        let alive = true;

        const load = async (withSkeleton) => {
            if (withSkeleton) setLoading(true);
            try {
                const params = {};
                if (status !== 'all') params.status = status;
                if (type !== 'all') params.type = type;
                const res = await api.get('/organizations/admin', { params });
                if (!alive) return;
                setOrganizations(res.data.organizations || []);
                setTotals(res.data.totals || {});
                setTypes(res.data.types || []);
                setError('');
            } catch (err) {
                if (alive) setError(err.response?.data?.message || 'Could not load organizations.');
            } finally {
                if (alive) setLoading(false);
            }
        };

        load(true);
        // A background refresh leaves the rows in place; only a filter change
        // is worth blanking the table for.
        const id = setInterval(() => load(false), 30000);
        return () => { alive = false; clearInterval(id); };
    }, [status, type, reloadKey]);

    const reload = () => setReloadKey((n) => n + 1);

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return organizations;
        return organizations.filter((o) =>
            o.name?.toLowerCase().includes(query) ||
            o.orgCode?.toLowerCase().includes(query) ||
            o.email?.toLowerCase().includes(query) ||
            o.contactPerson?.toLowerCase().includes(query)
        );
    }, [organizations, search]);

    const openDetail = async (organizationId) => {
        setDetailLoading(true);
        setDetail({ organization: null });
        try {
            const res = await api.get(`/organizations/admin/${organizationId}`);
            setDetail(res.data);
        } catch (err) {
            setDetail(null);
            setError(err.response?.data?.message || 'Could not open that organization.');
        } finally {
            setDetailLoading(false);
        }
    };

    const openStudents = async (organization) => {
        setStudents({ organization, students: null });
        try {
            const res = await api.get(`/organizations/admin/${organization._id}/students`);
            setStudents(res.data);
        } catch (err) {
            setStudents(null);
            setError(err.response?.data?.message || 'Could not load those students.');
        }
    };

    /** After assigning or removing, both this popup and the counts behind it. */
    const refreshStudents = async (organization) => {
        try {
            const res = await api.get(`/organizations/admin/${organization._id}/students`);
            setStudents(res.data);
        } catch { /* the popup keeps what it has rather than emptying */ }
        reload();
    };

    const applyDecision = async (reason) => {
        const { org, status: next } = decision;
        try {
            const res = await api.put(`/organizations/admin/${org._id}/status`, { status: next, reason });
            setNotice(res.data.message);
            setDecision(null);
            setDetail(null);
            reload();
            setTimeout(() => setNotice(''), 5000);
        } catch (err) {
            setError(err.response?.data?.message || 'That did not go through.');
            setDecision(null);
        }
    };

    const ask = (org, next) => {
        const wording = {
            active: { title: org.status === 'pending' ? 'Approve this organization?' : 'Reinstate this organization?', verb: 'Approve', needsReason: false },
            rejected: { title: 'Reject this registration?', verb: 'Reject', needsReason: true },
            suspended: { title: 'Suspend this organization?', verb: 'Suspend', needsReason: true },
            inactive: { title: 'Deactivate this organization?', verb: 'Deactivate', needsReason: true }
        }[next];
        setDecision({ org, status: next, ...wording });
    };

    return (
        <div className="space-y-4 lg:space-y-6 animate-fade-in relative z-0 pb-10">
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600"><Building2 size={20} /></span>
                        Organizations
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Schools, colleges and companies that bring their own students. Approve a registration to give it access.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by name, ID, email or contact..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-sm shadow-sm transition-all"
                        />
                        <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    </div>
                    <button onClick={() => setShowCreate(true)} className={`${BTN} whitespace-nowrap`}>
                        <Plus size={18} /><span>Add Organization</span>
                    </button>
                </div>
            </div>

            {notice && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{notice}</span>
                    <button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button>
                </div>
            )}
            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError('')} aria-label="Dismiss"><X size={14} /></button>
                </div>
            )}

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto custom-scrollbar">
                    {FILTERS.map(([value, label]) => (
                        <button
                            key={value}
                            onClick={() => setStatus(value)}
                            aria-pressed={status === value}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${status === value ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                            {totals[value === 'all' ? 'all' : value] > 0 && (
                                <span className="ml-1.5 text-[11px] font-black opacity-60">{totals[value === 'all' ? 'all' : value]}</span>
                            )}
                        </button>
                    ))}
                </div>
                <Select value={type} onChange={(e) => setType(e.target.value)} className={`${INPUT} sm:max-w-[220px]`} aria-label="Filter by organization type">
                    <option value="all">All types</option>
                    {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
            </div>

            {/* ── The list ─────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-3">
                        {[0, 1, 2].map((i) => <div key={i} className="animate-pulse h-12 bg-slate-100 rounded-xl" />)}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Building2 size={22} className="text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium">
                            {search.trim()
                                ? 'No organization matches that search.'
                                : status === 'all'
                                    ? 'No organizations have been registered yet.'
                                    : `No ${status} organizations.`}
                        </p>
                    </div>
                ) : (
                    <>
                    {/* From md up, the full table. Seven columns on a phone is a
                        sideways scroll nobody uses, so below that it becomes the
                        card list underneath. */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full text-left border-collapse min-w-[960px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-sm tracking-wide text-slate-500 uppercase">
                                    <th className="px-6 py-4 font-semibold">Organization ID</th>
                                    <th className="px-6 py-4 font-semibold">Organization</th>
                                    <th className="px-6 py-4 font-semibold">Contact</th>
                                    <th className="px-6 py-4 font-semibold">Students</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold">Registered</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.map((org) => (
                                    <tr key={org._id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4"><CopyableCode code={org.orgCode} /></td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{org.name}</div>
                                            <div className="text-sm text-slate-500">{org.typeLabel}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">{org.contactPerson || '—'}</div>
                                            <div className="text-sm text-slate-500">{org.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Never disabled. An organization with no
                                                students is the one most likely to need
                                                one assigning, and the popup behind this
                                                is where that is done — unless it is still
                                                pending, when it only shows who is there. */}
                                            <button
                                                onClick={() => openStudents(org)}
                                                title={org.studentCount || !canAssignTo(org) ? 'View its students' : 'No students yet — assign one'}
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-indigo-600"
                                            >
                                                <Users size={14} />{org.studentCount}
                                                {org.studentCount === 0 && canAssignTo(org) && (
                                                    <span className="text-xs font-bold text-indigo-600">· Assign</span>
                                                )}
                                            </button>
                                            {org.pendingRequests > 0 && (
                                                <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-amber-600">
                                                    {org.pendingRequests} waiting
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4"><StatusPill status={org.status} /></td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{formatDate(org.createdAt)}</td>
                                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                            <RowActions org={org} onDetail={openDetail} onDecide={ask} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Phones: one card per organization, same information. */}
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {visible.map((org) => (
                            <li key={org._id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-slate-800">{org.name}</p>
                                        <CopyableCode code={org.orgCode} />
                                        <p className="mt-0.5 text-xs text-slate-500">{org.typeLabel}</p>
                                    </div>
                                    <StatusPill status={org.status} />
                                </div>

                                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                    <div className="min-w-0">
                                        <dt className="text-slate-400">Contact</dt>
                                        <dd className="truncate font-medium text-slate-700">{org.contactPerson || '—'}</dd>
                                        <dd className="truncate text-slate-500">{org.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-slate-400">Students</dt>
                                        <dd className="font-medium text-slate-700 tabular-nums">
                                            <button onClick={() => openStudents(org)}
                                                title={org.studentCount || !canAssignTo(org) ? 'View its students' : 'No students yet — assign one'}
                                                className="inline-flex items-center gap-1.5 text-indigo-600">
                                                <Users size={12} />{org.studentCount}
                                                {org.studentCount === 0 && canAssignTo(org) && <span className="font-bold">· Assign</span>}
                                            </button>
                                        </dd>
                                        {org.pendingRequests > 0 && (
                                            <dd className="font-bold uppercase tracking-wider text-amber-600">{org.pendingRequests} waiting</dd>
                                        )}
                                        <dt className="mt-1 text-slate-400">Registered</dt>
                                        <dd className="text-slate-600">{formatDate(org.createdAt)}</dd>
                                    </div>
                                </dl>

                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                                    <RowActions org={org} onDetail={openDetail} onDecide={ask} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>

            {detail && (
                <DetailModal
                    detail={detail}
                    loading={detailLoading}
                    onClose={() => setDetail(null)}
                    onDecide={ask}
                    onStudents={openStudents}
                />
            )}
            {students && (
                <StudentsModal
                    data={students}
                    onClose={() => setStudents(null)}
                    onChanged={(message) => {
                        setNotice(message);
                        refreshStudents(students.organization);
                        setTimeout(() => setNotice(''), 5000);
                    }}
                />
            )}
            {decision && <DecisionModal decision={decision} onCancel={() => setDecision(null)} onConfirm={applyDecision} />}
            {showCreate && (
                <CreateModal
                    types={types}
                    onClose={() => setShowCreate(false)}
                    onCreated={(message) => {
                        setShowCreate(false);
                        setNotice(message);
                        reload();
                        setTimeout(() => setNotice(''), 5000);
                    }}
                />
            )}
        </div>
    );
};

/* ── One organization in full, with the decision buttons ──────────────────── */

const Row = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-2.5 text-sm">
        <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span className="w-28 shrink-0 text-slate-500">{label}</span>
        <span className="min-w-0 flex-1 break-words font-medium text-slate-800">{children || '—'}</span>
    </div>
);

const DetailModal = ({ detail, loading, onClose, onDecide, onStudents }) => {
    const org = detail.organization;

    return (
        /* Centred, and the panel alone scrolls.
           The overlay used to scroll too, and the body inside the panel was a
           `flex-1` child without `min-h-0` — which in a flex column refuses to
           shrink below its content, so a long list pushed the header up and out
           of the panel and the organization's name disappeared off the top of
           the screen. `min-h-0` on the body is what actually fixes that; the
           rest keeps the panel inside the viewport on a phone, where `dvh`
           accounts for the browser's own chrome. */
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in text-left" role="dialog" aria-modal="true" aria-label="Organization details">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
                <div className="flex shrink-0 justify-between items-center gap-3 p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 truncate">{org?.name || 'Loading…'}</h2>
                        {org && <p className="mt-0.5 font-mono text-sm text-slate-500">{org.orgCode}</p>}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Close">✕</button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-6 custom-scrollbar">
                    {loading || !org ? (
                        <div className="space-y-3">
                            {[0, 1, 2].map((i) => <div key={i} className="animate-pulse h-20 bg-slate-100 rounded-xl" />)}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-center gap-3">
                                <StatusPill status={org.status} />
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{org.typeLabel}</span>
                                {org.approvedAt && (
                                    <span className="text-xs text-slate-500">Approved {formatDate(org.approvedAt)}</span>
                                )}
                            </div>

                            {org.statusReason && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    <span className="font-bold">Reason on record: </span>{org.statusReason}
                                </div>
                            )}

                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="space-y-2.5">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contact</h3>
                                    <Row icon={Users} label="Person">{org.contactPerson}</Row>
                                    <Row icon={Mail} label="Email">{org.email}</Row>
                                    <Row icon={Phone} label="Phone">{org.phone}</Row>
                                    <Row icon={MapPin} label="Address">{org.address}</Row>
                                    <Row icon={Globe} label="Website">
                                        {org.website
                                            ? <a href={/^https?:\/\//i.test(org.website) ? org.website : `https://${org.website}`}
                                                target="_blank" rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                                                {org.website}<ExternalLink size={12} />
                                            </a>
                                            : null}
                                    </Row>
                                </div>
                                <div className="space-y-2.5">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">On the platform</h3>
                                    <Row icon={Users} label="Students">
                                        <button onClick={() => onStudents(org)} className="text-indigo-600 hover:underline">
                                            {detail.studentCount > 0 ? `${detail.studentCount} — view` : '0 — assign one'}
                                        </button>
                                    </Row>
                                    <Row icon={AlertTriangle} label="Requests">{detail.pendingRequests} waiting</Row>
                                    <Row icon={Building2} label="Expected">{org.expectedStudents ?? 'Not stated'}</Row>
                                    <Row icon={CheckCircle2} label="Registered">{formatDate(org.createdAt)}</Row>
                                    <Row icon={Mail} label="Admin login">
                                        {detail.admins?.length
                                            ? detail.admins.map((a) => a.email).join(', ')
                                            : 'No account — this organization cannot sign in'}
                                    </Row>
                                </div>
                            </div>

                            {org.statusHistory?.length > 0 && (
                                <div>
                                    <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wider">History</h3>
                                    <ol className="space-y-2">
                                        {[...org.statusHistory].reverse().map((entry, i) => (
                                            <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                                                <StatusPill status={entry.status} />
                                                <span className="text-slate-500">{formatDate(entry.at)}</span>
                                                {entry.byName && <span className="text-slate-500">by {entry.byName}</span>}
                                                {entry.reason && <span className="w-full text-slate-600">{entry.reason}</span>}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {org && (
                    <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 p-4 sm:gap-3 sm:p-5">
                        <button onClick={onClose} className={BTN2}>Close</button>
                        {org.status === 'pending' && (
                            <>
                                <button onClick={() => onDecide(org, 'rejected')} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">
                                    <XCircle size={16} />Reject
                                </button>
                                <button onClick={() => onDecide(org, 'active')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                                    <CheckCircle2 size={16} />Approve
                                </button>
                            </>
                        )}
                        {org.status === 'active' && (
                            <button onClick={() => onDecide(org, 'suspended')} className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50">
                                <Ban size={16} />Suspend
                            </button>
                        )}
                        {['suspended', 'inactive', 'rejected'].includes(org.status) && (
                            <button onClick={() => onDecide(org, 'active')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700">
                                <RotateCcw size={16} />Reinstate
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Confirm, with a reason where a reason is owed ────────────────────────── */

const DecisionModal = ({ decision, onCancel, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const blocked = decision.needsReason && !reason.trim();

    const submit = async () => {
        if (blocked) return;
        setBusy(true);
        await onConfirm(reason.trim());
        setBusy(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4"
            role="dialog" aria-modal="true" aria-label="Confirm this decision">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle size={24} className="text-amber-600" />
                    </div>
                    <h2 className="text-center text-lg font-bold text-slate-800">{decision.title}</h2>
                    <p className="mt-2 text-center text-sm text-slate-500">
                        {decision.org.name} · <span className="font-mono">{decision.org.orgCode}</span>
                    </p>
                    <p className="mt-3 text-center text-sm text-slate-500">
                        {decision.status === 'active'
                            ? 'Its administrator will be able to sign in, and students will be able to join with its organization ID.'
                            : 'Its administrator loses access and no new students can join. Existing members and all their learning progress are kept.'}
                    </p>

                    {decision.needsReason && (
                        <div className="mt-4">
                            <label className={LABEL} htmlFor="decision-reason">Reason (the organization is told this)</label>
                            <textarea
                                id="decision-reason"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Say briefly why, so they know what to do next."
                                className={INPUT}
                            />
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                    <button onClick={onCancel} className={BTN2} disabled={busy}>Cancel</button>
                    <button
                        onClick={submit}
                        disabled={blocked || busy}
                        className={decision.status === 'active'
                            ? 'inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50'
                            : 'inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50'}
                    >
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        {decision.verb}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── One organization's students ──────────────────────────────────────────── */

/**
 * One organization's students, and the way to put another one in.
 *
 * Assigning here is the only path to a membership that does not go through the
 * organization approving a request. It is a superadmin acting deliberately, so
 * it may also move a student who already belongs elsewhere — and the picker says
 * which organization each candidate is currently in, so that is never a surprise.
 */
const StudentsModal = ({ data, onClose, onChanged }) => {
    const [adding, setAdding] = useState(false);

    return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Organization students">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
            <div className="flex shrink-0 justify-between items-center gap-3 p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
                <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-800">{data.organization?.name}</h2>
                    <p className="mt-0.5 font-mono text-sm text-slate-500">{data.organization?.orgCode}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {/* Named as well as labelled: on a phone the words beside the
                        icon are hidden to save width, which would otherwise leave
                        a button with no name at all.

                        Not offered while the organization is pending: it has to
                        be approved before anyone is put into it. A suspended one
                        can still be stocked; the picker says plainly when its
                        administrator cannot see the students yet. */}
                    {canAssignTo(data.organization) && (
                        <button onClick={() => setAdding(true)}
                            aria-label="Assign student"
                            title="Assign student"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700">
                            <UserPlus size={15} /><span className="hidden sm:inline">Assign student</span>
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Close">✕</button>
                </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                {data.students === null ? (
                    <div className="p-8 space-y-3">
                        {[0, 1, 2].map((i) => <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-xl" />)}
                    </div>
                ) : data.students.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="font-medium text-slate-500">No students have joined this organization yet.</p>
                        {data.organization?.status === 'pending' ? (
                            <p className="mx-auto mt-3 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                                This organization is pending. Approve it before assigning students to it.
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-slate-400">Use “Assign student” to put one in directly.</p>
                        )}
                        {data.organization?.status && !['active', 'pending'].includes(data.organization.status) && (
                            <p className="mx-auto mt-3 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                                This organization is {data.organization.status}. You can add students now, but its
                                administrator cannot sign in to see them until it is active.
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                    {/* The table from sm up; one card per student below that. */}
                    <table className="hidden w-full text-left border-collapse sm:table">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                                <th className="px-4 py-3 sm:px-6">Student</th>
                                <th className="px-4 py-3 sm:px-6">Courses</th>
                                <th className="px-4 py-3 sm:px-6">Progress</th>
                                <th className="px-4 py-3 sm:px-6">XP</th>
                                <th className="px-4 py-3 sm:px-6">Last active</th>
                                <th className="px-4 py-3 sm:px-6" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.students.map((s) => (
                                <tr key={s._id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 sm:px-6">
                                        <div className="font-medium text-slate-800">{s.name}</div>
                                        <div className="text-sm text-slate-500 break-all">{s.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums sm:px-6">{s.coursesCompleted}/{s.coursesEnrolled}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 tabular-nums sm:px-6">{s.progressPercent}%</td>
                                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums sm:px-6">{s.xp}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500 sm:px-6">{s.lastActive ? formatDate(s.lastActive) : 'Never'}</td>
                                    <td className="px-4 py-3 text-right sm:px-6">
                                        <RemoveFromOrganization organization={data.organization} student={s} onDone={onChanged} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <ul className="divide-y divide-slate-100 sm:hidden">
                        {data.students.map((s) => (
                            <li key={s._id} className="p-4">
                                <p className="font-medium text-slate-800">{s.name}</p>
                                <p className="break-all text-sm text-slate-500">{s.email}</p>
                                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                    <div><dt className="inline text-slate-400">Courses: </dt><dd className="inline font-medium text-slate-700 tabular-nums">{s.coursesCompleted}/{s.coursesEnrolled}</dd></div>
                                    <div><dt className="inline text-slate-400">Progress: </dt><dd className="inline font-medium text-slate-700 tabular-nums">{s.progressPercent}%</dd></div>
                                    <div><dt className="inline text-slate-400">XP: </dt><dd className="inline font-medium text-slate-700 tabular-nums">{s.xp}</dd></div>
                                    <div><dt className="inline text-slate-400">Last active: </dt><dd className="inline text-slate-600">{s.lastActive ? formatDate(s.lastActive) : 'Never'}</dd></div>
                                </dl>
                                <div className="mt-2">
                                    <RemoveFromOrganization organization={data.organization} student={s} onDone={onChanged} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    </>
                )}
            </div>
        </div>

        {adding && (
            <AssignStudentModal
                organization={data.organization}
                onClose={() => setAdding(false)}
                onAssigned={(message) => { setAdding(false); onChanged(message); }}
            />
        )}
    </div>
    );
};

/** One student, out of one organization. Confirms, because it is not undoable by them. */
const RemoveFromOrganization = ({ organization, student, onDone }) => {
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);

    const remove = async () => {
        setBusy(true);
        try {
            const res = await api.delete(`/organizations/admin/${organization._id}/students/${student._id}`);
            setAsking(false);
            onDone(res.data.message);
        } catch (err) {
            onDone(err.response?.data?.message || 'Could not remove that student.');
            setAsking(false);
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button onClick={() => setAsking(true)}
                className="text-sm font-medium text-red-500 transition-colors hover:text-red-700">
                Remove
            </button>

            {asking && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4" role="dialog" aria-modal="true">
                    <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
                        <div className="p-5 text-center sm:p-6">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                                <UserMinus size={24} className="text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Remove {student.name}?</h3>
                            <p className="mt-3 text-sm text-slate-500">
                                They leave {organization.name}. Their account, courses, progress, XP and certificates
                                are untouched — nothing is deleted.
                            </p>
                        </div>
                        <div className="flex justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                            <button onClick={() => setAsking(false)} className={BTN2} disabled={busy}>Cancel</button>
                            <button onClick={remove} disabled={busy}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                                {busy && <Loader2 size={16} className="animate-spin" />}Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

/* ── Putting a student into an organization ───────────────────────────────── */

/**
 * The picker behind "Assign student".
 *
 * Search-driven rather than a full list: a platform with thousands of students
 * cannot send all of them to fill a dropdown, and the server caps what it
 * returns. Anyone already in another organization is shown with that
 * organization's name and an explicit "Move" rather than "Add", because taking a
 * student out of their institution is not something to do by accident.
 */
/** How many candidates the picker shows before you ask for more. */
const PAGE = 5;

const AssignStudentModal = ({ organization, onClose, onAssigned }) => {
    const [search, setSearch] = useState('');
    const [students, setStudents] = useState(null);
    const [capped, setCapped] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(null);   // the id being sent
    const [error, setError] = useState('');
    /**
     * How many of the matches are on screen.
     *
     * Five to begin with, because the picker is for finding one person, not for
     * reading the roll: a full list pushes the search box — the thing that
     * actually narrows it — off the top of a short window. More are revealed on
     * request, and the count is reset whenever the search changes so a new
     * search always starts short.
     */
    const [showing, setShowing] = useState(PAGE);

    // Reloads as the search is typed, a beat after the last keystroke so it is
    // one request per pause rather than one per letter.
    useEffect(() => {
        let alive = true;
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get(`/organizations/admin/${organization._id}/assignable`, {
                    params: search.trim() ? { search: search.trim() } : {}
                });
                if (!alive) return;
                setStudents(res.data.students || []);
                setCapped(Boolean(res.data.capped));
                setShowing(PAGE);
                setError('');
            } catch (err) {
                if (alive) setError(err.response?.data?.message || 'Could not load students.');
            } finally {
                if (alive) setLoading(false);
            }
        }, search ? 300 : 0);
        return () => { alive = false; clearTimeout(timer); };
    }, [search, organization._id]);

    const assign = async (student) => {
        setAssigning(student._id);
        setError('');
        try {
            const res = await api.post(`/organizations/admin/${organization._id}/students`, { studentId: student._id });
            onAssigned(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not assign that student.');
            setAssigning(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4"
            role="dialog" aria-modal="true" aria-label="Assign a student">
            <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]">
                <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-800">Assign a student</h2>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                                into {organization.name} · <span className="font-mono">{organization.orgCode}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Close">✕</button>
                    </div>

                    {organization.status && organization.status !== 'active' && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                            {organization.name} is <strong>{organization.status}</strong>. Students you add now will belong
                            to it straight away, but its administrator cannot sign in to see them until it is active.
                        </p>
                    )}

                    <div className="relative mt-4">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, email or card number..."
                            autoFocus
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600"
                        />
                        <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {error && (
                        <div className="m-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
                    )}

                    {loading ? (
                        <div className="space-y-3 p-4">
                            {[0, 1, 2].map((i) => <div key={i} className="animate-pulse h-12 rounded-xl bg-slate-100" />)}
                        </div>
                    ) : !students?.length ? (
                        <div className="px-6 py-14 text-center">
                            <p className="font-medium text-slate-500">
                                {search.trim() ? 'No student matches that search.' : 'Every student is already in this organization.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {students.slice(0, showing).map((student) => (
                                <li key={student._id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-800">{student.name}</p>
                                        <p className="truncate text-sm text-slate-500">{student.email}</p>
                                        {student.currentOrganization ? (
                                            <p className="mt-0.5 text-xs font-semibold text-amber-600">
                                                Currently in {student.currentOrganization.name}
                                            </p>
                                        ) : (
                                            <p className="mt-0.5 text-xs text-slate-400">No organization</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => assign(student)}
                                        disabled={Boolean(assigning)}
                                        className={student.currentOrganization
                                            ? 'inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50'
                                            : 'inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50'}
                                    >
                                        {assigning === student._id
                                            ? <Loader2 size={15} className="animate-spin" />
                                            : student.currentOrganization ? <ArrowRight size={15} /> : <UserPlus size={15} />}
                                        {student.currentOrganization ? 'Move here' : 'Add'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {students?.length > showing && (
                        <div className="border-t border-slate-100 p-4 text-center">
                            <p className="text-xs text-slate-500">
                                Showing {showing} of {students.length}{capped ? '+' : ''} matches
                            </p>
                            <div className="mt-2 flex justify-center gap-2">
                                <button onClick={() => setShowing((n) => n + PAGE)} className={BTN2}>
                                    Show {Math.min(PAGE, students.length - showing)} more
                                </button>
                                <button onClick={() => setShowing(students.length)}
                                    className="rounded-xl px-4 py-2.5 text-sm font-bold text-indigo-600 hover:bg-indigo-50">
                                    Show all {students.length}
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">Or search to narrow it down.</p>
                        </div>
                    )}

                    {capped && students?.length <= showing && (
                        <p className="px-4 pb-4 text-center text-xs text-slate-400">
                            These are the first 50 matches. Narrow the search to see others.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Create an organization directly ──────────────────────────────────────── */

const CreateModal = ({ types, onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: '', organizationType: 'school', contactPerson: '', email: '',
        phone: '', address: '', website: '', expectedStudents: '', password: ''
    });
    const [pwFocused, setPwFocused] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try {
            const res = await api.post('/organizations/admin', form);
            onCreated(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not create the organization.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Add organization">
            <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
                <div className="flex shrink-0 justify-between items-center p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">Add an organization</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none" aria-label="Close">✕</button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        An organization you add here opens <strong>active</strong> straight away — you are admitting it
                        yourself, so there is nothing left to approve. Its ID is generated automatically.
                    </p>

                    <div>
                        <label className={LABEL} htmlFor="org-name">Organization name <span className="text-red-500">*</span></label>
                        <input id="org-name" required value={form.name} onChange={set('name')} className={INPUT} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={LABEL} htmlFor="org-type">Type <span className="text-red-500">*</span></label>
                            <Select id="org-type" value={form.organizationType} onChange={set('organizationType')} className={INPUT}>
                                {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </Select>
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="org-contact">Contact person</label>
                            <input id="org-contact" value={form.contactPerson} onChange={set('contactPerson')} className={INPUT} />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={LABEL} htmlFor="org-email">Official email <span className="text-red-500">*</span></label>
                            <input id="org-email" type="email" required value={form.email} onChange={set('email')} className={INPUT} />
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="org-phone">Phone</label>
                            <input id="org-phone" value={form.phone} onChange={set('phone')} className={INPUT} />
                        </div>
                    </div>
                    <div>
                        <label className={LABEL} htmlFor="org-address">Address</label>
                        <input id="org-address" value={form.address} onChange={set('address')} className={INPUT} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={LABEL} htmlFor="org-website">Website</label>
                            <input id="org-website" value={form.website} onChange={set('website')} className={INPUT} placeholder="example.edu" />
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="org-expected">Expected students</label>
                            <input id="org-expected" type="number" min="0" value={form.expectedStudents} onChange={set('expectedStudents')} className={INPUT} />
                        </div>
                    </div>
                    <div>
                        <label className={LABEL} htmlFor="org-password">Administrator password <span className="text-red-500">*</span></label>
                        <PasswordField
                            id="org-password" required autoComplete="new-password"
                            value={form.password} onChange={set('password')}
                            onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                            className={INPUT}
                        />
                        <PasswordStrengthChecker password={form.password} focused={pwFocused} />
                        <p className="mt-1.5 text-xs text-slate-500">
                            They sign in with the official email above and this password.
                        </p>
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                    <button type="button" onClick={onClose} className={BTN2} disabled={busy}>Cancel</button>
                    <button type="submit" className={BTN} disabled={busy}>
                        {busy && <Loader2 size={16} className="animate-spin" />}
                        Create organization
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Organizations;
