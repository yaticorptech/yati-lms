/**
 * The superadmin's Organizations section: every institution on the platform,
 * the queue of registrations waiting for a decision, and the approve / reject /
 * suspend actions.
 *
 * Status and type are filtered on the server, because both are discrete and one
 * fetch per change is cheap. The list is asked for a page at a time (25), with
 * the search sent along a beat after the last keystroke; a server that does not
 * page yet answers with every organization and no `total`, and then the search
 * box filters the rows already in hand, instantly, as it always did.
 *
 * Rejecting or suspending withdraws access and keeps the record, the
 * memberships and every student's learning history. The one deletion is of a
 * registration that never became anything — rejected, never approved, no
 * students — and the server refuses it for anything else.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { startViewingOrganization } from '../utils/viewOrganization';
import {
    Building2, Plus, Users, CheckCircle2, XCircle, AlertTriangle,
    Loader2, Copy, Check, ExternalLink, Ban, RotateCcw, Mail, Phone, MapPin, Globe, X,
    UserPlus, UserMinus, ArrowRight, BookOpen, LayoutDashboard, Trash2, ChevronDown, History
} from 'lucide-react';
import api from '../utils/api';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';
import PasswordField from '../components/PasswordField';
import { formatDate } from '../utils/dates';
import Select from '../components/Select';
import OrgCodeField from '../components/OrgCodeField';
import { orgCodeProblem } from '../utils/orgCode';
import { LoadFailed, SearchInput, Pager } from '../components/orgUi';
import useAutoRefresh from '../hooks/useAutoRefresh';
import useDialog from '../hooks/useDialog';
import useMediaQuery from '../hooks/useMediaQuery';

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

/**
 * A pending organization has not been approved yet, so nobody is put into it;
 * nor into a rejected one, which never will be.
 */
const canAssignTo = (org) => Boolean(org) && !['pending', 'rejected'].includes(org.status);

/** How many organizations, or students in one, a page of the list holds. */
const LIST_PAGE = 25;

/** A ✕ or copy button's 40px tap target, with the icon in the middle. */
const ICON_BTN = 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600';

/** The organization's logo, or its first letters until it has uploaded one. */
const OrgLogo = ({ org, size = 'h-10 w-10' }) => (org?.logo ? (
    <img src={org.logo} alt="" className={`${size} shrink-0 rounded-xl bg-white object-contain p-0.5 ring-1 ring-slate-200`} />
) : (
    <span aria-hidden className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold uppercase text-slate-400 ring-1 ring-slate-200`}>
        {String(org?.name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
    </span>
));

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
/**
 * Whether an organization may publish its own courses, on its row: one small
 * button — "Enable" while courses are off, "2 / 5" (made / allowed) once they
 * are on. It opens the Course access popup, where the switch and limit are.
 */
const CoursesCell = ({ org, onOpen }) => {
    const on = org.courseAccess?.enabled;
    return (
        <button onClick={() => onOpen(org)} aria-label={`Course access for ${org.name}`}
            title={on ? `${org.courseCount || 0} of ${org.courseAccess.limit} courses used — change` : 'Let this organization publish its own courses'}
            className={`inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors ${on
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700'}`}>
            <BookOpen size={13} />
            {on ? <span className="tabular-nums">{org.courseCount || 0} / {org.courseAccess.limit}</span> : 'Enable'}
        </button>
    );
};

/** The Course access settings on their own, opened from a row's Courses button. */
const CourseAccessModal = ({ org, onClose, onSaved }) => {
    const { dialogProps, titleId } = useDialog(onClose);
    return (
    // Centred at every width — on a phone too, rather than a sheet at the bottom.
    <div {...dialogProps} className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 p-4 outline-none backdrop-blur-sm" aria-label={`Course access: ${org.name}`}
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="min-w-0">
                    <h2 id={titleId} className="truncate text-lg font-bold text-slate-800">{org.name}</h2>
                    <p className="font-mono text-xs text-slate-500">{org.orgCode}</p>
                </div>
                <button onClick={onClose} className={ICON_BTN} aria-label="Close"><X size={20} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                <CourseAccessCard organization={org} courseCount={org.courseCount} onSaved={onSaved} />
            </div>
        </div>
    </div>
    );
};

const RowActions = ({ org, onDetail, onDecide }) => {
    const navigate = useNavigate();
    // The organization's own panel, as it sees it — editable, no password.
    const openDashboard = () => { startViewingOrganization(org); navigate('/organization'); };
    return (
    <>
        <button onClick={() => onDetail(org._id)} className="text-indigo-600 hover:text-indigo-900 font-medium text-sm transition-colors">
            {org.status === 'pending' ? 'Review' : 'View'}
        </button>
        {org.status === 'active' && (
            <button onClick={openDashboard} title={`Open and manage ${org.name}'s dashboard`}
                className="inline-flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium text-sm transition-colors">
                <LayoutDashboard size={14} />Dashboard
            </button>
        )}
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
};

const FILTERS = [
    ['all', 'All'],
    ['pending', 'Pending'],
    ['active', 'Active'],
    ['suspended', 'Suspended'],
    ['inactive', 'Inactive'],
    ['rejected', 'Rejected']
];

/** The Organization ID is meant to be handed to students, so make it one tap to copy. */
const CopyableCode = ({ code, small = false }) => {
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
            title="Copy Organization ID"
            aria-label={`Copy Organization ID ${code}`}
            // 40px tall to tap, without making the row it sits in any taller.
            // Not for the small ID under a name: it can wrap past 40px, and the
            // negative margin then drew it over the name above.
            className={`group ${small ? '' : '-my-3 min-h-10'} inline-flex min-w-0 items-center gap-1.5 font-mono hover:text-indigo-600 ${small ? 'text-xs font-medium text-slate-600' : 'whitespace-nowrap text-sm font-semibold text-slate-700'}`}
        >
            <span className={small ? 'break-all text-left' : 'truncate'}>{code}</span>
            {copied
                ? <Check size={small ? 12 : 14} className="shrink-0 text-emerald-600" />
                : <Copy size={small ? 12 : 13} className="shrink-0 text-slate-300 group-hover:text-indigo-500" />}
        </button>
    );
};

const Organizations = () => {
    const [organizations, setOrganizations] = useState([]);
    const [totals, setTotals] = useState({});
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // The list's own load failed with these filters, so there is nothing to
    // show for them — not the same as no organizations.
    const [loadFailed, setLoadFailed] = useState(false);
    const [notice, setNotice] = useState('');

    const [status, setStatus] = useState('all');
    const [type, setType] = useState('all');
    const [search, setSearch] = useState('');
    // The search as sent to the server: a beat behind the box, one request
    // per pause in typing rather than per letter.
    const [query, setQuery] = useState('');
    const [page, setPage] = useState(1);
    // Set when the server paged the list (its answer carried `total`).
    const [total, setTotal] = useState(null);

    const [detail, setDetail] = useState(null);       // { organization, admins, studentCount, pendingRequests }
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailFocus, setDetailFocus] = useState(null);   // 'courses' to open at the Course access card
    const [courseAccessFor, setCourseAccessFor] = useState(null);   // the row whose Course access popup is open
    const [students, setStudents] = useState(null);   // { organization, students }
    const [decision, setDecision] = useState(null);   // { org, status, needsReason, title, verb }
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        const next = search.trim();
        if (next === query) return undefined;
        const timer = setTimeout(() => { setQuery(next); setPage(1); }, 300);
        return () => clearTimeout(timer);
    }, [search, query]);

    /**
     * Load the list, again whenever a filter, the search or the page changes,
     * and keep it fresh every 30 seconds.
     *
     * Through the shared useAutoRefresh hook, which calls the newest load on
     * each tick (it used to hold the first one forever, which is why this page
     * once polled on its own), pauses while the browser tab is hidden, skips a
     * tick while the last request is still out, and drops an answer that a
     * newer request has overtaken — so a slow reply for the old filter can
     * never land on top of the new one.
     */
    const load = async ({ signal, isCurrent = () => true, fresh = true } = {}) => {
        // A background refresh leaves the rows in place; only a filter change
        // is worth blanking the table for.
        if (fresh) setLoading(true);
        try {
            const params = { page, limit: LIST_PAGE };
            if (status !== 'all') params.status = status;
            if (type !== 'all') params.type = type;
            if (query) params.search = query;
            const res = await api.get('/organizations/admin', { params, signal });
            if (!isCurrent()) return;
            setOrganizations(res.data.organizations || []);
            setTotals(res.data.totals || {});
            setTypes(res.data.types || []);
            const paged = typeof res.data.total === 'number';
            setTotal(paged ? res.data.total : null);
            if (paged && page > 1 && page > Math.ceil(res.data.total / LIST_PAGE)) setPage(Math.max(1, Math.ceil(res.data.total / LIST_PAGE)));
            setLoadFailed(false);
            setError('');
        } catch (err) {
            if (!isCurrent()) return;
            setError(err.response?.data?.message || 'Could not load organizations.');
            // A filter change has no rows of its own yet; the ones in state
            // were for the previous filter and must not show under this one.
            if (fresh) { setOrganizations([]); setLoadFailed(true); }
        } finally {
            if (isCurrent()) setLoading(false);
        }
    };

    const reload = useAutoRefresh(load, 30000, [status, type, query, page]);
    const pickStatus = (value) => { setStatus(value); setPage(1); };
    const pickType = (value) => { setType(value); setPage(1); };

    // A paging server has already searched; without one, the search box
    // narrows the rows in hand, as it always has.
    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (total !== null || !q) return organizations;
        return organizations.filter((o) =>
            o.name?.toLowerCase().includes(q) ||
            o.orgCode?.toLowerCase().includes(q) ||
            o.email?.toLowerCase().includes(q) ||
            o.contactPerson?.toLowerCase().includes(q)
        );
    }, [organizations, search, total]);

    // Only the layout that is showing is built: the table from md up, cards below.
    const wide = useMediaQuery('(min-width: 768px)');

    const openDetail = async (organizationId, focus = null) => {
        setDetailFocus(typeof focus === 'string' ? focus : null);
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

    /**
     * One organization's students, a page at a time with the popup's search
     * applied. A server that does not page answers with everyone and no
     * `total`; the popup then searches what it has, as before.
     *
     * Numbered, so an answer for an older page or search that arrives late is
     * dropped rather than shown under the newer one.
     */
    const studentsSeq = useRef(0);
    const fetchStudents = async (organization, { page: at = 1, search: text = '' } = {}) => {
        const seq = ++studentsSeq.current;
        const params = { page: at, limit: LIST_PAGE };
        if (text.trim()) params.search = text.trim();
        const res = await api.get(`/organizations/admin/${organization._id}/students`, { params });
        if (seq !== studentsSeq.current) return null;
        return { ...res.data, page: at, search: text };
    };

    const openStudents = async (organization, query = {}) => {
        setStudents((prev) => (prev && prev.organization?._id === organization._id && query.page
            ? { ...prev, busy: true }
            : { organization, students: null, search: query.search || '' }));
        try {
            const data = await fetchStudents(organization, query);
            if (data) setStudents(data);
        } catch {
            // Said inside the popup, with a Retry: it may have been opened from
            // the detail popup, which would hide the page banner.
            setStudents({ organization, students: null, failed: true, search: query.search || '' });
        }
    };

    /** After assigning or removing, both this popup and the counts behind it. */
    const refreshStudents = async (current) => {
        try {
            const data = await fetchStudents(current.organization, { page: current.page || 1, search: current.search || '' });
            if (data) setStudents(data);
        } catch { /* the popup keeps what it has rather than emptying */ }
        reload();
    };

    /** A registration that never became an organization, gone. */
    const onDeleted = (message) => {
        setDetail(null);
        setNotice(message || 'The registration was deleted.');
        reload();
        setTimeout(() => setNotice(''), 5000);
    };

    /** Resolves to an error message for the confirmation to show, or nothing on success. */
    const applyDecision = async (reason) => {
        const { org, status: next } = decision;
        try {
            const res = await api.put(`/organizations/admin/${org._id}/status`, { status: next, reason });
            setNotice(res.data.message);
            setDecision(null);
            setDetail(null);
            reload();
            setTimeout(() => setNotice(''), 5000);
            return '';
        } catch (err) {
            // The confirmation stays open with the reason still typed: the page
            // banner would sit under the detail popup it was opened from.
            return err.response?.data?.message || 'That did not go through.';
        }
    };

    const ask = (org, next) => {
        const wording = {
            active: org.status === 'pending'
                ? { title: 'Approve this organization?', verb: 'Approve', needsReason: false }
                : { title: 'Reinstate this organization?', verb: 'Reinstate', needsReason: false },
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
                    <SearchInput value={search} onChange={setSearch} placeholder="Search by name, ID, email or contact..." label="Search organizations" className="sm:w-72" />
                    <button onClick={() => setShowCreate(true)} className={`${BTN} whitespace-nowrap`}>
                        <Plus size={18} /><span>Add Organization</span>
                    </button>
                </div>
            </div>

            {notice && (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{notice}</span>
                    <button onClick={() => setNotice('')} aria-label="Dismiss" className="-my-2.5 -mr-2.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}
            {error && !loadFailed && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                    <XCircle size={16} className="mt-0.5 shrink-0" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError('')} aria-label="Dismiss" className="-my-2.5 -mr-2.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            {/* ── Filters ──────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* One row that scrolls sideways on a phone; the chosen one is brought into view. */}
                <div className="flex min-w-0 gap-1.5 overflow-x-auto overscroll-x-contain rounded-xl bg-slate-100 p-1 no-scrollbar snap-x">
                    {FILTERS.map(([value, label]) => (
                        <button
                            key={value}
                            onClick={(e) => { pickStatus(value); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' }); }}
                            aria-pressed={status === value}
                            className={`shrink-0 snap-start rounded-full px-4 py-1.5 text-sm font-semibold transition-all whitespace-nowrap ${status === value ? 'bg-white text-indigo-600 shadow' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                            {totals[value === 'all' ? 'all' : value] > 0 && (
                                <span className="ml-1.5 text-[11px] font-black opacity-60">{totals[value === 'all' ? 'all' : value]}</span>
                            )}
                        </button>
                    ))}
                </div>
                <Select value={type} onChange={(e) => pickType(e.target.value)} className={`${INPUT} sm:max-w-[220px]`} aria-label="Filter by organization type">
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
                ) : loadFailed ? (
                    <LoadFailed what="organizations" onRetry={reload} />
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
                        card list underneath — only one of them is built. */}
                    {wide ? (
                    <div className="overflow-x-auto">
                        {/* The ID sits under the name rather than in a column of
                            its own, and Actions is pinned to the right edge: with
                            eight columns the actions were the part that fell off
                            the end, half a button showing at a normal laptop width. */}
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs tracking-wider text-slate-500 uppercase">
                                    <th className="px-5 py-3.5 font-semibold">Organization</th>
                                    <th className="px-3 py-3.5 font-semibold">Contact</th>
                                    <th className="px-3 py-3.5 font-semibold">Students</th>
                                    <th className="px-3 py-3.5 font-semibold">Courses</th>
                                    <th className="px-3 py-3.5 font-semibold">Status</th>
                                    <th className="px-3 py-3.5 font-semibold">Registered</th>
                                    <th className="sticky right-0 bg-slate-50 px-5 py-3.5 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visible.map((org) => (
                                    <tr key={org._id} className="group transition-colors hover:bg-slate-50">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <OrgLogo org={org} />
                                                {/* This truncation width is what sets the column's
                                                    width. Kept narrow until 2xl, where the whole table
                                                    fits beside the sidebar; below that it scrolls under
                                                    the pinned actions, and a narrow name shows more of
                                                    the other columns before it has to. */}
                                                <div className="min-w-0 max-w-[11rem] 2xl:max-w-[16rem]">
                                                    <div className="truncate font-semibold text-slate-800" title={org.name}>{org.name}</div>
                                                    <div className="mt-0.5 flex items-center gap-2">
                                                        <CopyableCode code={org.orgCode} small />
                                                        <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-px text-[11px] font-medium text-slate-500">{org.typeLabel}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5">
                                            <div className="max-w-[10rem] 2xl:max-w-[11rem]">
                                                <div className="truncate text-sm font-medium text-slate-700" title={org.contactPerson}>{org.contactPerson || '—'}</div>
                                                <div className="truncate text-sm text-slate-500" title={org.email}>{org.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3.5">
                                            {/* Never disabled. An organization with no
                                                students is the one most likely to need
                                                one assigning, and the popup behind this
                                                is where that is done — unless it is still
                                                pending, when it only shows who is there. */}
                                            <button
                                                onClick={() => openStudents(org)}
                                                title={org.studentCount || !canAssignTo(org) ? 'View its students' : 'No students yet — assign one'}
                                                className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-slate-700 hover:text-indigo-600"
                                            >
                                                <Users size={14} />{org.studentCount}
                                                {org.studentCount === 0 && canAssignTo(org) && (
                                                    <span className="text-xs font-bold text-indigo-600">· Assign</span>
                                                )}
                                            </button>
                                            {org.pendingRequests > 0 && (
                                                <div className="mt-1 inline-block whitespace-nowrap rounded-full bg-amber-100 px-2 py-px text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                                    {org.pendingRequests} waiting
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-3.5"><CoursesCell org={org} onOpen={setCourseAccessFor} /></td>
                                        <td className="px-3 py-3.5"><StatusPill status={org.status} /></td>
                                        <td className="whitespace-nowrap px-3 py-3.5 text-sm text-slate-600">{formatDate(org.createdAt)}</td>
                                        <td className="sticky right-0 bg-white px-5 py-3.5 transition-colors group-hover:bg-slate-50">
                                            <div className="flex items-center justify-end gap-1 whitespace-nowrap [&>button]:min-h-10 [&>button]:rounded-lg [&>button]:px-2.5 [&>button]:py-1.5 [&>button:hover]:bg-slate-100">
                                                <RowActions org={org} onDetail={openDetail} onDecide={ask} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    ) : (
                    /* Phones: one card per organization, same information. */
                    <ul className="divide-y divide-slate-100">
                        {visible.map((org) => (
                            <li key={org._id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <OrgLogo org={org} size="h-11 w-11" />
                                    {/* Nothing cut short: the name wraps; the ID and type below get the card's full width. */}
                                    <p className="min-w-0 flex-1 break-words pt-0.5 text-[15px] font-semibold leading-snug text-slate-900">{org.name}</p>
                                    <span className="shrink-0"><StatusPill status={org.status} /></span>
                                </div>
                                <div className="pl-14">
                                    <CopyableCode code={org.orgCode} small />
                                    <p className="text-xs text-slate-500">{org.typeLabel}</p>
                                </div>

                                {/* Students, courses, registered: side by side, the same size each. */}
                                <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-2.5 text-center ring-1 ring-slate-100">
                                    <div className="min-w-0 px-1">
                                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Students</dt>
                                        <dd className="mt-1">
                                            <button onClick={() => openStudents(org)}
                                                title={org.studentCount || !canAssignTo(org) ? 'View its students' : 'No students yet — assign one'}
                                                className="inline-flex min-h-10 items-center gap-1 text-sm font-bold tabular-nums text-indigo-600">
                                                <Users size={13} />{org.studentCount}
                                                {org.studentCount === 0 && canAssignTo(org) && <span className="text-xs">· Assign</span>}
                                            </button>
                                        </dd>
                                        {org.pendingRequests > 0 && (
                                            <dd className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-px text-[10px] font-bold text-amber-700">{org.pendingRequests} waiting</dd>
                                        )}
                                    </div>
                                    <div className="min-w-0 px-1">
                                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Courses</dt>
                                        <dd className="mt-1"><CoursesCell org={org} onOpen={setCourseAccessFor} /></dd>
                                    </div>
                                    <div className="min-w-0 px-1">
                                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Registered</dt>
                                        <dd className="mt-1 text-xs font-medium text-slate-700">{formatDate(org.createdAt)}</dd>
                                    </div>
                                </dl>

                                <p className="mt-3 text-xs text-slate-500">
                                    <span className="font-medium text-slate-700">{org.contactPerson || '—'}</span>
                                    <span className="break-all"> · {org.email}</span>
                                </p>

                                <div className="mt-3 flex flex-wrap gap-2 [&>button]:min-h-10 [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-200 [&>button]:px-3.5 [&>button]:py-1.5">
                                    <RowActions org={org} onDetail={openDetail} onDecide={ask} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    )}
                    {total !== null && <Pager page={page} limit={LIST_PAGE} total={total} onPage={setPage} noun="organizations" />}
                    </>
                )}
            </div>

            {/* The popups go on <body>. This page is its own layer (relative z-0), so
                inside it even the highest popup stays under the app's top bar — which
                hid the top of each popup on a phone. */}
            {createPortal(<>
                {detail && (
                    <DetailModal
                        detail={detail}
                        focus={detailFocus}
                        onCourseAccessSaved={reload}
                        loading={detailLoading}
                        onClose={() => setDetail(null)}
                        onDecide={ask}
                        onStudents={openStudents}
                        onDeleted={onDeleted}
                    />
                )}
                {courseAccessFor && (
                    <CourseAccessModal org={courseAccessFor} onClose={() => setCourseAccessFor(null)} onSaved={reload} />
                )}
                {students && (
                    <StudentsModal
                        data={students}
                        onRetry={() => openStudents(students.organization, { page: students.page || 1, search: students.search || '' })}
                        onQuery={(query) => openStudents(students.organization, query)}
                        onClose={() => setStudents(null)}
                        onChanged={(message) => {
                            setNotice(message);
                            refreshStudents(students);
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
            </>, document.body)}
        </div>
    );
};

/* ── One organization in full, with the decision buttons ──────────────────── */

const Row = ({ icon: Icon, label, children }) => (
    <div className="flex items-start gap-2.5 text-sm">
        <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span className="w-28 shrink-0 text-slate-500">{label}</span>
        {/* wrap-anywhere, not break-words: only it lowers the min-content width,
            so one long email or URL cannot widen the whole grid column. */}
        <span className="min-w-0 flex-1 wrap-anywhere font-medium text-slate-800">{children || '—'}</span>
    </div>
);

/* ── Whether an organization may publish its own courses, and how many ──── */

/**
 * Off until a superadmin switches it on. The limit counts every course the
 * organization has made, published or not. Lowering it below what they
 * already have only stops new ones; switching it off stops building and
 * editing, while the courses already published stay with their students.
 */
const CourseAccessCard = ({ organization, courseCount, onSaved, highlight }) => {
    const initial = organization.courseAccess || { enabled: false, limit: 5 };
    const [enabled, setEnabled] = useState(Boolean(initial.enabled));
    const [limit, setLimit] = useState(String(initial.limit || 5));
    const [saved, setSaved] = useState({ enabled: Boolean(initial.enabled), limit: String(initial.limit || 5) });
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);   // { kind: 'ok' | 'error', text }

    const n = Number(limit);
    const validLimit = Number.isInteger(n) && n >= 1 && n <= 500;
    const changed = enabled !== saved.enabled || limit !== saved.limit;

    const save = async () => {
        setBusy(true); setMessage(null);
        try {
            const r = await api.put(`/organizations/admin/${organization._id}/course-access`, { enabled, limit: n });
            setSaved({ enabled: r.data.courseAccess.enabled, limit: String(r.data.courseAccess.limit) });
            setMessage({ kind: 'ok', text: r.data.message });
            onSaved?.();
        } catch (err) {
            setMessage({ kind: 'error', text: err.response?.data?.message || 'Could not save course access.' });
        } finally { setBusy(false); }
    };

    return (
        <section aria-label="Course access" className={`rounded-2xl border p-4 sm:p-5 ${highlight ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-indigo-100' : 'border-slate-200 bg-slate-50/60'}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><BookOpen size={16} className="text-indigo-600" /> Course access</h3>
                    <p className="mt-0.5 text-xs text-slate-500">Let this organization publish its own courses. Only its own students will see them.</p>
                </div>
                <button type="button" role="switch" aria-checked={enabled} aria-label="Let this organization publish its own courses"
                    onClick={() => setEnabled((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                    <span className={LABEL}>Most courses allowed</span>
                    <input type="number" min={1} max={500} value={limit} disabled={!enabled} aria-label="Most courses allowed"
                        onChange={(e) => setLimit(e.target.value)} className={INPUT} />
                    {!validLimit && enabled && <span className="mt-1 block text-xs font-semibold text-red-600">A whole number from 1 to 500.</span>}
                </label>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Made so far</p>
                    <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-800">{courseCount ?? 0}{enabled && validLimit ? <span className="text-sm font-semibold text-slate-400"> of {n}</span> : null}</p>
                </div>
            </div>
            {enabled && validLimit && (courseCount || 0) > n && (
                <p className="mt-2 text-xs text-amber-700">They already have {courseCount}. Nothing is deleted — they just cannot add more until they are under {n}.</p>
            )}
            {!enabled && (courseCount || 0) > 0 && (
                <p className="mt-2 text-xs text-slate-500">Switched off, they cannot add or edit courses. The {courseCount} they made stay available to their students.</p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                {message && <p role="status" className={`mr-auto text-xs font-semibold ${message.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</p>}
                <button type="button" onClick={save} disabled={busy || !changed || (enabled && !validLimit)}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                    {busy && <Loader2 size={14} className="animate-spin" />} Save course access
                </button>
            </div>
        </section>
    );
};

/**
 * For an organization locked out of its account. Emails its admin the same
 * one-hour, one-use link as "Forgot password?" on the sign-in page; there is
 * deliberately no way here to type a password in for them.
 */
const SendResetLink = ({ organization }) => {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState(null);   // { kind: 'ok' | 'error', text }
    const send = async () => {
        if (!window.confirm(`Email ${organization.name}'s administrator a link to choose a new password?`)) return;
        setBusy(true); setMessage(null);
        try {
            const r = await api.post(`/organizations/admin/${organization._id}/send-password-reset`);
            setMessage({ kind: 'ok', text: r.data.message });
        } catch (err) {
            setMessage({ kind: 'error', text: err.response?.data?.message || 'Could not send the reset link.' });
        } finally { setBusy(false); }
    };
    return (
        <span className="mt-1 block">
            <button type="button" onClick={send} disabled={busy}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline disabled:opacity-50">
                {busy && <Loader2 size={12} className="animate-spin" />} Send password reset link
            </button>
            {message && <span role="status" className={`mt-0.5 block text-xs font-semibold ${message.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{message.text}</span>}
        </span>
    );
};

/**
 * Deleting a registration — offered only for one that never became anything:
 * rejected, never approved, and with no students. Everything else is kept and
 * reinstated instead, and the server refuses the rest (409) with its reason,
 * which is shown here, in the popup that asked.
 */
const canDelete = (org, studentCount) => Boolean(org) && org.status === 'rejected' && !org.approvedAt && !studentCount;

const DeleteRegistration = ({ organization, onDeleted }) => {
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const remove = async () => {
        setBusy(true);
        setError('');
        try {
            const res = await api.delete(`/organizations/admin/${organization._id}`);
            onDeleted(res.data?.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not delete this registration.');
            setBusy(false);
        }
    };

    if (!asking) {
        return (
            <button type="button" onClick={() => setAsking(true)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50">
                <Trash2 size={16} />Delete registration
            </button>
        );
    }
    return (
        <section aria-label="Delete registration" className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-red-800"><Trash2 size={16} /> Delete this registration?</h3>
            <p className="mt-1 text-sm text-red-700">
                {organization.name} was rejected, never approved and has no students. Deleting removes the registration
                and its sign-in for good; it cannot be undone. Its activity log is kept.
            </p>
            {error && <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button type="button" onClick={() => { setAsking(false); setError(''); }} disabled={busy} className={BTN2} data-autofocus>Cancel</button>
                <button type="button" onClick={remove} disabled={busy}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                    {busy && <Loader2 size={16} className="animate-spin" />}Delete registration
                </button>
            </div>
        </section>
    );
};

/** What the server's audit log calls each action, said in words. */
const AUDIT_ACTIONS = {
    'course-access': 'Changed course access',
    edit: 'Edited details',
    'send-password-reset': 'Sent a password reset link',
    status: 'Changed status',
    'assign-student': 'Assigned a student',
    'unassign-student': 'Removed a student',
    delete: 'Deleted the registration'
};

/**
 * Who did what to this organization from the platform side — the latest 100
 * entries of its audit log. Closed until asked for, and only then fetched.
 */
const ActivityLog = ({ organizationId }) => {
    const [open, setOpen] = useState(false);
    const [entries, setEntries] = useState(null);
    const [failed, setFailed] = useState(false);

    const load = async () => {
        setFailed(false);
        try {
            const res = await api.get(`/organizations/admin/${organizationId}/audit`);
            const data = res.data;
            setEntries(Array.isArray(data) ? data : data?.entries || []);
        } catch {
            setFailed(true);
        }
    };
    const toggle = () => {
        setOpen((v) => !v);
        if (!open && entries === null) load();
    };

    const describe = (entry) => {
        const d = entry.details || {};
        if (entry.action === 'status' && d.to) return `Status ${d.from ? `${d.from} → ` : 'set to '}${d.to}${d.reason ? ` — ${d.reason}` : ''}`;
        if (d.movedFrom?.name && d.studentName) return `Moved ${d.studentName} here from ${d.movedFrom.name}`;
        if (d.movedTo?.name && d.studentName) return `Moved ${d.studentName} to ${d.movedTo.name}`;
        if (Array.isArray(d.fields) && d.fields.length) return `${AUDIT_ACTIONS[entry.action] || entry.action}: ${d.fields.join(', ')}`;
        if (d.studentName) return `${AUDIT_ACTIONS[entry.action] || entry.action}: ${d.studentName}`;
        return AUDIT_ACTIONS[entry.action] || String(entry.action || '').replace(/[-_]/g, ' ');
    };

    return (
        <div>
            <button type="button" onClick={toggle} aria-expanded={open}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold uppercase tracking-wider text-slate-500 hover:bg-slate-100">
                <History size={15} /> Activity log
                <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="mt-2">
                    {failed ? (
                        <LoadFailed what="the activity log" onRetry={load} />
                    ) : entries === null ? (
                        <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div>
                    ) : entries.length === 0 ? (
                        <p className="text-sm text-slate-500">Nothing has been recorded for this organization yet.</p>
                    ) : (
                        <ol className="space-y-2" aria-label="Activity log entries">
                            {entries.map((entry, i) => (
                                <li key={entry._id || i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                                    <span className="font-medium text-slate-800">{describe(entry)}</span>
                                    <span className="text-slate-500">{formatDate(entry.at)}</span>
                                    {(entry.adminName || entry.name) && <span className="text-slate-500">by {entry.adminName || entry.name}</span>}
                                    {/* An action without a name of its own: what was asked of the server. */}
                                    {!AUDIT_ACTIONS[entry.action] && entry.path && (
                                        <span className="w-full break-all font-mono text-xs text-slate-400">{entry.method} {entry.path}</span>
                                    )}
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}
        </div>
    );
};

const DetailModal = ({ detail, focus, onCourseAccessSaved, loading, onClose, onDecide, onStudents, onDeleted }) => {
    const org = detail.organization;
    const coursesRef = useRef(null);
    const { dialogProps, titleId } = useDialog(onClose);
    // Opened from the Courses column: go straight to the Course access card.
    useEffect(() => {
        if (focus === 'courses' && org && !loading) coursesRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [focus, org, loading]);

    return (
        /* Centred, and the panel alone scrolls.
           The overlay used to scroll too, and the body inside the panel was a
           `flex-1` child without `min-h-0` — which in a flex column refuses to
           shrink below its content, so a long list pushed the header up and out
           of the panel and the organization's name disappeared off the top of
           the screen. `min-h-0` on the body is what actually fixes that; the
           rest keeps the panel inside the viewport on a phone, where `dvh`
           accounts for the browser's own chrome. */
        <div {...dialogProps} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in text-left outline-none" aria-label="Organization details">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
                <div className="flex shrink-0 justify-between items-center gap-3 p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
                    <div className="flex min-w-0 items-center gap-3">
                        {org && <OrgLogo org={org} size="h-12 w-12" />}
                        <div className="min-w-0">
                            <h2 id={titleId} className="text-lg font-bold text-slate-800 truncate">{org?.name || 'Loading…'}</h2>
                            {org && <p className="mt-0.5 font-mono text-sm text-slate-500">{org.orgCode}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className={`text-xl leading-none ${ICON_BTN}`} aria-label="Close">✕</button>
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

                            {/* grid-cols-1 (minmax(0,1fr)) rather than the implicit auto
                                column, which grew to the longest website on a phone. */}
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="min-w-0 space-y-2.5">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Contact</h3>
                                    <Row icon={Users} label="Person">{org.contactPerson}</Row>
                                    <Row icon={Mail} label="Email">{org.email}</Row>
                                    <Row icon={Phone} label="Phone">{org.phone}</Row>
                                    <Row icon={MapPin} label="Address">{org.address}</Row>
                                    <Row icon={Globe} label="Website">
                                        {org.website
                                            ? <a href={/^https?:\/\//i.test(org.website) ? org.website : `https://${org.website}`}
                                                target="_blank" rel="noreferrer"
                                                className="inline-flex max-w-full items-start gap-1 text-indigo-600 hover:underline">
                                                <span className="min-w-0 break-all">{org.website}</span><ExternalLink size={12} className="mt-1 shrink-0" />
                                            </a>
                                            : null}
                                    </Row>
                                </div>
                                <div className="min-w-0 space-y-2.5">
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
                                        {detail.admins?.length > 0 && <SendResetLink organization={org} />}
                                    </Row>
                                </div>
                            </div>

                            <div ref={coursesRef}>
                                <CourseAccessCard key={org._id} organization={org} courseCount={detail.courseCount} onSaved={onCourseAccessSaved} highlight={focus === 'courses'} />
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

                            <ActivityLog key={org._id} organizationId={org._id} />

                            {canDelete(org, detail.studentCount) && (
                                <DeleteRegistration key={`delete-${org._id}`} organization={org} onDeleted={onDeleted} />
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
    const [error, setError] = useState('');
    const blocked = decision.needsReason && !reason.trim();
    const { dialogProps, titleId } = useDialog(() => { if (!busy) onCancel(); });

    const submit = async () => {
        if (blocked) return;
        setBusy(true);
        setError('');
        const failed = await onConfirm(reason.trim());
        if (failed) setError(failed);
        setBusy(false);
    };

    return (
        <div {...dialogProps} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 outline-none sm:p-4"
            aria-label="Confirm this decision">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[calc(100dvh-1.5rem)] overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle size={24} className="text-amber-600" />
                    </div>
                    <h2 id={titleId} className="text-center text-lg font-bold text-slate-800">{decision.title}</h2>
                    <p className="mt-2 text-center text-sm text-slate-500">
                        {decision.org.name} · <span className="font-mono">{decision.org.orgCode}</span>
                    </p>
                    <p className="mt-3 text-center text-sm text-slate-500">
                        {decision.status === 'active'
                            ? 'Its administrator will be able to sign in, and students will be able to join with its Organization ID.'
                            : 'Its administrator loses access and no new students can join. Existing members and all their learning progress are kept.'}
                    </p>

                    {decision.needsReason && (
                        <div className="mt-4">
                            <label className={LABEL} htmlFor="decision-reason">Reason (the organization is told this)</label>
                            <textarea
                                id="decision-reason"
                                data-autofocus
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Say briefly why, so they know what to do next."
                                className={INPUT}
                            />
                        </div>
                    )}
                    {error && (
                        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
                    )}
                </div>
                <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                    <button onClick={onCancel} className={BTN2} disabled={busy} data-autofocus={!decision.needsReason || undefined}>Cancel</button>
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
const StudentsModal = ({ data, onClose, onChanged, onRetry, onQuery }) => {
    const [adding, setAdding] = useState(false);
    const { dialogProps, titleId } = useDialog(onClose);
    // The table from sm up; one card per student below that — only one is built.
    const wide = useMediaQuery('(min-width: 640px)');

    // A server that pages answered with `total`: it searches, a beat after the
    // last keystroke. One that does not sent everyone; the box narrows those here.
    const paged = typeof data.total === 'number';
    const [text, setText] = useState(data.search || '');
    useEffect(() => {
        if (!paged || text.trim() === (data.search || '').trim()) return undefined;
        const timer = setTimeout(() => onQuery({ page: 1, search: text }), 300);
        return () => clearTimeout(timer);
    }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

    const rows = useMemo(() => {
        const list = data.students || [];
        const q = text.trim().toLowerCase();
        if (paged || !q) return list;
        return list.filter((s) => s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
    }, [data.students, text, paged]);
    const searching = Boolean((paged ? data.search : text)?.trim());

    return (
    <div {...dialogProps} className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 outline-none sm:p-4" aria-label="Organization students">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-4 sm:p-6">
            <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                    <h2 id={titleId} className="truncate text-lg font-bold text-slate-800">{data.organization?.name}</h2>
                    <p className="mt-0.5 font-mono text-sm text-slate-500">{data.organization?.orgCode}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {/* Named as well as labelled: on a phone the words beside the
                        icon are hidden to save width, which would otherwise leave
                        a button with no name at all.

                        Not offered while the organization is pending: it has to
                        be approved before anyone is put into it — nor once it is
                        rejected. A suspended one can still be stocked; the picker
                        says plainly when its administrator cannot see the
                        students yet. */}
                    {canAssignTo(data.organization) && (
                        <button onClick={() => setAdding(true)}
                            aria-label="Assign student"
                            title="Assign student"
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700">
                            <UserPlus size={15} /><span className="hidden sm:inline">Assign student</span>
                        </button>
                    )}
                    <button onClick={onClose} className={`text-xl leading-none ${ICON_BTN}`} aria-label="Close">✕</button>
                </div>
            </div>
            {/* Only once there is somebody to look for. */}
            {(searching || (data.students?.length > 0) || (paged && data.total > 0)) && (
                <div className="mt-4">
                    <SearchInput value={text} onChange={setText} placeholder="Search students by name or email..." label="Search this organization's students" className="sm:max-w-sm" />
                </div>
            )}
            </div>
            <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar ${data.busy ? 'opacity-60' : ''}`} aria-busy={data.busy || undefined}>
                {data.failed ? (
                    <LoadFailed what="these students" onRetry={onRetry} />
                ) : data.students === null ? (
                    <div className="p-8 space-y-3">
                        {[0, 1, 2].map((i) => <div key={i} className="animate-pulse h-10 bg-slate-100 rounded-xl" />)}
                    </div>
                ) : rows.length === 0 && searching ? (
                    <div className="px-6 py-16 text-center">
                        <p className="font-medium text-slate-500">No student matches that search.</p>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <p className="font-medium text-slate-500">No students have joined this organization yet.</p>
                        {data.organization?.status === 'pending' ? (
                            <p className="mx-auto mt-3 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                                This organization is pending. Approve it before assigning students to it.
                            </p>
                        ) : canAssignTo(data.organization) ? (
                            <p className="mt-1 text-sm text-slate-400">Use “Assign student” to put one in directly.</p>
                        ) : null}
                        {data.organization?.status && !['active', 'pending', 'rejected'].includes(data.organization.status) && (
                            <p className="mx-auto mt-3 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                                This organization is {data.organization.status}. You can add students now, but its
                                administrator cannot sign in to see them until it is active.
                            </p>
                        )}
                    </div>
                ) : wide ? (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                                <th className="px-4 py-3 sm:px-6">Student</th>
                                <th className="px-4 py-3 sm:px-6">Courses</th>
                                <th className="px-4 py-3 sm:px-6" title="Average across all the student's enrolled courses">Overall progress</th>
                                <th className="px-4 py-3 sm:px-6">XP</th>
                                <th className="px-4 py-3 sm:px-6">Last active</th>
                                <th className="px-4 py-3 sm:px-6" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((s) => (
                                <tr key={s._id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 sm:px-6">
                                        <div className="font-medium text-slate-800">{s.name}</div>
                                        <div className="text-sm text-slate-500 break-all">{s.email}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600 tabular-nums sm:px-6">{s.coursesCompleted} of {s.coursesEnrolled}</td>
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
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {rows.map((s) => (
                            <li key={s._id} className="p-4">
                                <p className="font-medium text-slate-800">{s.name}</p>
                                <p className="break-all text-sm text-slate-500">{s.email}</p>
                                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                    <div><dt className="inline text-slate-400">Courses: </dt><dd className="inline font-medium text-slate-700 tabular-nums">{s.coursesCompleted} of {s.coursesEnrolled}</dd></div>
                                    <div><dt className="inline text-slate-400">Overall progress: </dt><dd className="inline font-medium text-slate-700 tabular-nums">{s.progressPercent}%</dd></div>
                                    <div><dt className="inline text-slate-400">XP: </dt><dd className="inline font-medium text-slate-700 tabular-nums">{s.xp}</dd></div>
                                    <div><dt className="inline text-slate-400">Last active: </dt><dd className="inline text-slate-600">{s.lastActive ? formatDate(s.lastActive) : 'Never'}</dd></div>
                                </dl>
                                <div className="mt-2">
                                    <RemoveFromOrganization organization={data.organization} student={s} onDone={onChanged} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {paged && !data.failed && (
                <Pager page={data.page || 1} limit={data.limit || LIST_PAGE} total={data.total}
                    onPage={(n) => onQuery({ page: n, search: data.search || '' })} />
            )}
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
    const [error, setError] = useState('');

    const remove = async () => {
        setBusy(true);
        setError('');
        try {
            const res = await api.delete(`/organizations/admin/${organization._id}/students/${student._id}`);
            setAsking(false);
            onDone(res.data.message);
        } catch (err) {
            // Shown here, in red, in the dialog that asked. Handed to onDone it
            // became the page's green notice, under the students popup.
            setError(err.response?.data?.message || 'Could not remove that student.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <button onClick={() => setAsking(true)}
                className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-700">
                Remove
            </button>

            {asking && (
                <ConfirmDialog
                    label={`Remove ${student.name}`}
                    icon={<UserMinus size={24} className="text-amber-600" />}
                    title={`Remove ${student.name}?`}
                    busy={busy}
                    error={error}
                    confirm="Remove"
                    onCancel={() => { setAsking(false); setError(''); }}
                    onConfirm={remove}
                >
                    They leave {organization.name}. Their account, courses, progress, XP and certificates
                    are untouched — nothing is deleted.
                </ConfirmDialog>
            )}
        </>
    );
};

/**
 * A small "are you sure?" over another popup — removing a student, moving one
 * between organizations. Escape and Cancel back out; nothing is sent until the
 * red or amber button is pressed, and an error stays in here, in red.
 */
const ConfirmDialog = ({ label, icon, title, children, busy, error, confirm, tone = 'red', onCancel, onConfirm }) => {
    const { dialogProps, titleId } = useDialog(() => { if (!busy) onCancel(); });
    return (
        <div {...dialogProps} aria-label={label} className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 outline-none sm:p-4">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="p-5 text-center sm:p-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">{icon}</div>
                    <h3 id={titleId} className="text-lg font-bold text-slate-800">{title}</h3>
                    <p className="mt-3 text-sm text-slate-500">{children}</p>
                    {error && (
                        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
                    )}
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 px-4 py-4 sm:px-6">
                    <button onClick={onCancel} className={BTN2} disabled={busy} data-autofocus>Cancel</button>
                    <button onClick={onConfirm} disabled={busy}
                        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${tone === 'amber' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {busy && <Loader2 size={16} className="animate-spin" />}{confirm}
                    </button>
                </div>
            </div>
        </div>
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
    // A student who already belongs elsewhere, waiting for "Move here" to be confirmed.
    const [moving, setMoving] = useState(null);
    const { dialogProps, titleId } = useDialog(() => { if (!assigning) onClose(); });

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
            setMoving(null);
            onAssigned(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not assign that student.');
            setAssigning(null);
        }
    };

    // Taking a student out of their institution is asked about first; adding
    // one who belongs nowhere is not.
    const choose = (student) => (student.currentOrganization ? setMoving(student) : assign(student));

    return (
        <div {...dialogProps} className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 outline-none sm:p-4"
            aria-label="Assign a student">
            <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]">
                <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 id={titleId} className="text-lg font-bold text-slate-800">Assign a student</h2>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                                into {organization.name} · <span className="font-mono">{organization.orgCode}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className={`text-xl leading-none ${ICON_BTN}`} aria-label="Close">✕</button>
                    </div>

                    {organization.status && organization.status !== 'active' && (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                            {organization.name} is <strong>{organization.status}</strong>. Students you add now will belong
                            to it straight away, but its administrator cannot sign in to see them until it is active.
                        </p>
                    )}

                    <div className="mt-4">
                        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or card number..." label="Search students to assign" className="" data-autofocus />
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
                                        onClick={() => choose(student)}
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

            {moving && (
                <ConfirmDialog
                    label="Confirm move"
                    icon={<ArrowRight size={24} className="text-amber-600" />}
                    title={`Move ${moving.name} from ${moving.currentOrganization.name} to ${organization.name}?`}
                    busy={assigning === moving._id}
                    error={error}
                    confirm="Move"
                    tone="amber"
                    onCancel={() => { setMoving(null); setError(''); }}
                    onConfirm={() => assign(moving)}
                >
                    They leave {moving.currentOrganization.name}, which can no longer see their progress, and
                    join {organization.name}. Their account, courses, progress, XP and certificates are untouched.
                </ConfirmDialog>
            )}
        </div>
    );
};

/* ── Create an organization directly ──────────────────────────────────────── */

const CreateModal = ({ types, onClose, onCreated }) => {
    const [form, setForm] = useState({
        name: '', orgCode: '', organizationType: 'school', contactPerson: '', email: '',
        phone: '', address: '', website: '', expectedStudents: '', password: ''
    });
    const [pwFocused, setPwFocused] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [codeError, setCodeError] = useState('');
    const [codeStatus, setCodeStatus] = useState({ state: '' });

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
    const { dialogProps, titleId } = useDialog(() => { if (!busy) onClose(); });

    const submit = async (e) => {
        e.preventDefault();
        // Refused here when the box already knows: no ID, a malformed one, or one that exists.
        const problem = orgCodeProblem(form.orgCode) || (codeStatus.state === 'taken' ? codeStatus.message : '');
        if (problem) return setCodeError(problem);
        setBusy(true); setError('');
        try {
            const res = await api.post('/organizations/admin', form);
            onCreated(res.data.message);
        } catch (err) {
            const data = err.response?.data;
            if (data?.field === 'orgCode') setCodeError(data.message);
            else setError(data?.message || 'Could not create the organization.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div {...dialogProps} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 outline-none sm:p-4" aria-label="Add organization">
            <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)] overflow-hidden">
                <div className="flex shrink-0 justify-between items-center p-4 sm:p-6 border-b border-slate-200 bg-slate-50">
                    <h2 id={titleId} className="text-lg font-bold text-slate-800">Add an organization</h2>
                    <button type="button" onClick={onClose} className={`text-xl leading-none ${ICON_BTN}`} aria-label="Close">✕</button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4">
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        An organization you add here opens <strong>active</strong> straight away — you are admitting it
                        yourself, so there is nothing left to approve. Type the Organization ID its students will use.
                    </p>

                    <div>
                        <label className={LABEL} htmlFor="org-name">Organization name <span className="text-red-500">*</span></label>
                        <input id="org-name" required value={form.name} onChange={set('name')} className={INPUT} data-autofocus />
                    </div>
                    <div>
                        <label className={LABEL} htmlFor="org-code">Organization ID <span className="text-red-500">*</span></label>
                        <OrgCodeField id="org-code" value={form.orgCode} name={form.name} error={codeError}
                            onChange={(code) => { setForm((f) => ({ ...f, orgCode: code })); setCodeError(''); }}
                            onStatus={setCodeStatus} />
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
