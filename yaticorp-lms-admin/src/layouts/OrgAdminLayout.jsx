/**
 * The shell an organization administrator works inside — the same sidebar,
 * header, session timeout and logout confirmation as the platform panel, with
 * its own four-item navigation — a sidebar on a desktop, a bar along the bottom
 * on a phone — and the organization's name and ID in place of
 * the platform logo's subtitle.
 *
 * It asks the server for its own status before rendering anything. An
 * organization that is pending, suspended, rejected or inactive gets the status
 * screen instead of the dashboard, because the API behind every page would
 * refuse it anyway — this turns a wall of 403s into one clear explanation.
 * The check is a read, not the security boundary: the server enforces it.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, UserPlus, BookOpen, Settings, LogOut, RefreshCw,
    Clock, Ban, XCircle, Copy, Check, Loader2, ExternalLink, Eye, ArrowLeft
} from 'lucide-react';
import api from '../utils/api';
import useAutoLogout from '../utils/useAutoLogout';
import initials from '../utils/initials';
import OrgBottomNav from '../components/OrgBottomNav';
import { getViewedOrganization, stopViewingOrganization } from '../utils/viewOrganization';
import useCenterTabs from '../hooks/useCenterTabs';
import ErrorBoundary from '../components/ErrorBoundary';
import { Dialog, DialogTitle } from '../components/orgUi';

// `short` is the bottom bar's label on a phone, where four full labels do not fit.
const NAV = [
    { to: '/organization', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, exact: true },
    { to: '/organization/students', label: 'Students', short: 'Students', icon: Users },
    { to: '/organization/requests', label: 'Student requests', short: 'Requests', icon: UserPlus, badge: 'pendingRequests' },
    { to: '/organization/courses', label: 'Courses', short: 'Courses', icon: BookOpen },
    { to: '/organization/settings', label: 'Settings', short: 'Settings', icon: Settings }
];

const STUDENT_PORTAL = import.meta.env.VITE_STUDENT_URL || 'http://localhost:5174';

const linkClass = (active) =>
    `flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`;

const MENU_ITEM = 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors';

/** The organization's logo — or, until it has one, its initials on a gradient square. */
const OrgBadge = ({ name, logo, small }) => (logo ? (
    <img src={logo} alt="" className={`shrink-0 rounded-xl bg-white object-contain p-0.5 shadow-lg ring-1 ring-slate-200 ${small ? 'h-9 w-9' : 'h-11 w-11'}`} />
) : (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black text-white shadow-lg shadow-indigo-600/30 ${small ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'}`}>
        {initials(name)}
    </span>
));

/** The ID an organization reads out to its students, one tap to copy. */
const OrgCode = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch { /* refused over plain HTTP; the code is on screen anyway */ }
    };
    return (
        <button onClick={copy} aria-label={`Copy Organization ID ${code}`}
            className="group -my-1.5 inline-flex min-h-10 items-center gap-1.5 font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800">
            {code}
            {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={11} className="text-slate-400 group-hover:text-indigo-600" />}
        </button>
    );
};

/* ── What a pending, suspended, rejected or inactive organization sees ─────── */

const STATUS_SCREEN = {
    pending: {
        icon: Clock,
        tone: 'bg-amber-100 text-amber-600',
        title: 'Your registration is being reviewed',
        body: 'Our administrator is looking at your application. You will be emailed as soon as a decision is made, and this page will open onto your dashboard once you are approved.'
    },
    rejected: {
        icon: XCircle,
        tone: 'bg-red-100 text-red-600',
        title: 'Your registration was not approved',
        body: 'Your organization has not been given access to the platform.'
    },
    suspended: {
        icon: Ban,
        tone: 'bg-orange-100 text-orange-600',
        title: 'Your organization is suspended',
        body: 'Access has been withdrawn for now. Your students and everything they have learned are safely kept — nothing has been deleted.'
    },
    inactive: {
        icon: Ban,
        tone: 'bg-slate-100 text-slate-500',
        title: 'Your organization is not active',
        body: 'This organization is no longer active on the platform. Your students and their learning records are kept as they are.'
    }
};

const StatusScreen = ({ organization, onLogout, viewing }) => {
    const screen = STATUS_SCREEN[organization.status] || STATUS_SCREEN.pending;
    const Icon = screen.icon;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${screen.tone}`}>
                    <Icon size={28} />
                </div>
                <h1 className="text-xl font-bold text-slate-900">{screen.title}</h1>
                <p className="mt-3 text-sm text-slate-600">{screen.body}</p>

                {organization.statusReason && (
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800">
                        <span className="font-bold">Reason: </span>{organization.statusReason}
                    </div>
                )}

                <div className="mt-6 rounded-xl bg-slate-50 p-4 text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Organization</p>
                    <p className="mt-1 font-semibold text-slate-900">{organization.name}</p>
                    <p className="mt-0.5 font-mono text-sm text-slate-500">{organization.orgCode}</p>
                    <p className="mt-2 text-xs capitalize text-slate-500">Status: {organization.status}</p>
                </div>

                <p className="mt-5 text-xs text-slate-500">
                    If you think this is wrong, reply to the email we sent you or contact the platform administrator.
                </p>

                <button onClick={onLogout}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                    {viewing ? <><ArrowLeft size={16} />Back to Organizations</> : <><LogOut size={16} />Sign out</>}
                </button>
            </div>
        </div>
    );
};

const OrgAdminLayout = () => {
    // Tapping a tab in a sideways-scrolling strip centres it (phones).
    useCenterTabs();
    const { showSessionModal, confirmLogout } = useAutoLogout();
    const { admin, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // A superadmin working in this organization's panel, with its edits. "Exit"
    // takes them back to Organizations; there is nothing to sign out of here.
    const viewing = admin?.role === 'superadmin' ? getViewedOrganization() : null;
    const exitView = () => { stopViewingOrganization(); navigate('/organizations'); };
    const leave = viewing ? exitView : logout;

    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const profileDropdownRef = useRef(null);

    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState('');
    const [counts, setCounts] = useState({ pendingRequests: 0 });

    const isActive = (path, exact) => (exact ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/'));

    // What the header says. Every section page opens with its own title (the
    // Dashboard with "Welcome back"), so repeating it here only said it twice:
    // the header carries whose panel this is instead — on a phone, where there
    // is no sidebar to say so. A single student's page has no section title of
    // its own (its heading is the student's name), so that one is named here.
    const studentPage = location.pathname.startsWith('/organization/students/');

    // Status first. This endpoint is the one organization route that works
    // before approval, which is exactly why it is what the shell asks for.
    useEffect(() => {
        api.get('/organizations/me/status')
            .then((res) => setOrganization(res.data.organization))
            .catch((err) => setFailed(err.response?.data?.message || 'Could not reach your organization.'))
            .finally(() => setLoading(false));
    }, []);

    // A logo uploaded from a page (the Courses logo step, Settings) shows here at once.
    useEffect(() => {
        const onLogo = (e) => setOrganization((o) => (o ? { ...o, logo: e.detail } : o));
        window.addEventListener('organization-logo', onLogo);
        return () => window.removeEventListener('organization-logo', onLogo);
    }, []);

    /**
     * The waiting-requests badge, refreshed on navigation like the support
     * badge in the platform panel, and the moment a request is decided (the
     * Requests page says so with an 'organization-requests-changed' event), so
     * the number beside "Student requests" is never one behind.
     *
     * It asks the small count endpoint; a server without it answers with no
     * `pending`, and the badge falls back to the full request list it used to
     * read, without asking the count endpoint again. Silent on failure: a
     * missing number must not put an error in front of someone trying to work.
     */
    const countEndpoint = useRef(true);
    const countSeq = useRef(0);
    const active = organization?.status === 'active';
    useEffect(() => {
        if (!active) return undefined;
        const loadCount = async () => {
            const seq = ++countSeq.current;
            let pending;
            if (countEndpoint.current) {
                try {
                    const r = await api.get('/organizations/me/requests/count');
                    if (typeof r.data?.pending === 'number') pending = r.data.pending;
                    else countEndpoint.current = false;
                } catch (err) {
                    if (err.response?.status === 404) countEndpoint.current = false;
                    else return;
                }
            }
            if (pending === undefined) {
                try {
                    const r = await api.get('/organizations/me/requests');
                    pending = r.data.pendingCount || 0;
                } catch { return; }
            }
            // An older answer arriving after a newer one does not win.
            if (seq === countSeq.current) setCounts({ pendingRequests: pending });
        };
        loadCount();
        window.addEventListener('organization-requests-changed', loadCount);
        return () => window.removeEventListener('organization-requests-changed', loadCount);
    }, [location.pathname, active]);

    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setProfileDropdownOpen(false);
    }

    useEffect(() => {
        const handler = (e) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 size={32} className="mx-auto animate-spin text-indigo-600" />
                    <p className="mt-3 text-sm font-medium text-slate-500">Opening your organization…</p>
                </div>
            </div>
        );
    }

    if (failed || !organization) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <XCircle size={24} className="text-red-600" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-900">We could not open {viewing ? viewing.name : 'your organization'}</h1>
                    <p className="mt-2 text-sm text-slate-600">{failed || 'Please try signing in again.'}</p>
                    <button onClick={leave} className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
                        {viewing ? 'Back to Organizations' : 'Sign out'}
                    </button>
                </div>
            </div>
        );
    }

    if (organization.status !== 'active') {
        return <StatusScreen organization={organization} onLogout={leave} viewing={Boolean(viewing)} />;
    }

    return (
        <div className="flex h-dvh bg-slate-50 text-gray-900 font-sans overflow-hidden">
            {showSessionModal && (
                <Dialog onClose={confirmLogout} size="max-w-sm" z="z-[200]">
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">⏳</div>
                        <DialogTitle className="text-lg font-bold text-slate-800 mb-1">Session Expired</DialogTitle>
                        <p className="text-slate-500 text-sm">Your session has expired. Please login again.</p>
                    </div>
                    <div className="px-6 pb-6">
                        <button onClick={confirmLogout} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm">OK</button>
                    </div>
                </Dialog>
            )}

            {showLogoutConfirm && (
                <Dialog onClose={() => setShowLogoutConfirm(false)} size="max-w-sm">
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut size={26} className="text-red-500" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-slate-800 mb-1">Log out?</DialogTitle>
                        <p className="text-slate-500 text-sm">Are you sure you want to log out?</p>
                    </div>
                    <div className="flex gap-3 px-6 pb-6">
                        <button onClick={() => setShowLogoutConfirm(false)} data-autofocus
                            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={() => { setShowLogoutConfirm(false); logout(); }}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors">
                            Yes, Log out
                        </button>
                    </div>
                </Dialog>
            )}

            {/* ── Desktop: the sidebar ─────────────────────────────────────
                Phones use the bar along the bottom instead, so there is no
                drawer to open and every section is one tap away. */}
            <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 lg:flex">
                <div className="border-b border-slate-100 p-5">
                    <div className="flex items-center gap-3">
                        <OrgBadge name={organization.name} logo={organization.logo} />
                        <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900" title={organization.name}>{organization.name}</p>
                            <OrgCode code={organization.orgCode} />
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-1.5 overflow-y-auto p-4 custom-scrollbar" aria-label="Organization">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Menu</p>
                    {NAV.map(({ to, label, icon: Icon, exact, badge }) => {
                        const active = isActive(to, exact);
                        const count = badge ? counts[badge] : 0;
                        return (
                            <Link key={to} to={to} className={linkClass(active)} aria-current={active ? 'page' : undefined}>
                                <span className="flex items-center space-x-3">
                                    <Icon size={20} /> <span className="font-medium">{label}</span>
                                </span>
                                {count > 0 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'}`}>
                                        {count}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-slate-100 bg-slate-50/60 p-4">
                    <a href={STUDENT_PORTAL} target="_blank" rel="noopener noreferrer"
                        className="flex items-center space-x-3 rounded-xl p-3 text-indigo-600 transition-all hover:bg-indigo-50 hover:text-indigo-700">
                        <ExternalLink size={18} /> <span className="text-sm font-medium">Student Portal</span>
                    </a>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
                {viewing && (
                    <div role="status" className="flex shrink-0 items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 lg:px-8">
                        <Eye size={16} className="shrink-0 text-amber-600" />
                        <p className="min-w-0 flex-1">
                            <span className="font-semibold">Managing {organization.name}</span>
                            <span className="hidden sm:inline"> as the platform administrator</span> · changes are saved to this organization
                        </p>
                        <button onClick={exitView} className="-my-1.5 inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100">
                            <ArrowLeft size={14} /> Exit
                        </button>
                    </div>
                )}
                <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:h-20 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        {/* On a phone the sidebar is gone, so the header carries
                            whose panel this is. */}
                        <span className="lg:hidden"><OrgBadge name={organization.name} logo={organization.logo} small /></span>
                        {studentPage ? (
                            <div className="min-w-0">
                                <p className="truncate text-base font-bold text-slate-900 lg:text-xl">Student details</p>
                                <p className="truncate text-xs text-slate-500 lg:hidden">{organization.name}</p>
                            </div>
                        ) : (
                            // The sidebar names the organization on a desktop.
                            <p className="min-w-0 truncate text-base font-bold text-slate-900 lg:hidden">{organization.name}</p>
                        )}
                        <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 lg:inline-flex">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Active
                        </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <button onClick={() => window.location.reload()} title="Refresh data" aria-label="Refresh data"
                            className="group hidden h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm transition-all hover:bg-indigo-600 hover:text-white sm:flex">
                            <RefreshCw size={18} className="transition-transform duration-700 group-hover:rotate-180" />
                        </button>

                        <div ref={profileDropdownRef} className="relative">
                            <button onClick={() => setProfileDropdownOpen((v) => !v)} aria-label="Account menu" aria-expanded={profileDropdownOpen}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white ring-2 ring-indigo-100 transition-all duration-200 hover:ring-indigo-300">
                                {initials(admin?.name)}
                            </button>

                            {profileDropdownOpen && (
                                <div className="absolute right-0 top-12 z-[60] w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
                                    <div className="flex flex-col items-center gap-2 border-b border-slate-100 bg-slate-50 p-4 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                                            {initials(admin?.name)}
                                        </div>
                                        <div className="min-w-0 max-w-full">
                                            <p className="truncate text-sm font-bold text-slate-800">{admin?.name}</p>
                                            <p className="truncate text-xs text-slate-400">{admin?.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                            {viewing ? 'Super Admin · viewing' : 'Organization Admin'}
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <Link to="/organization/settings" onClick={() => setProfileDropdownOpen(false)} className={MENU_ITEM}>
                                            <Settings size={16} className="text-slate-400" /> Organization settings
                                        </Link>
                                        {/* The sidebar's portal link, for phones where there is no sidebar. */}
                                        <a href={STUDENT_PORTAL} target="_blank" rel="noopener noreferrer" className={`${MENU_ITEM} lg:hidden`}>
                                            <ExternalLink size={16} className="text-slate-400" /> Student Portal
                                        </a>
                                        <button onClick={() => window.location.reload()} className={`${MENU_ITEM} w-full sm:hidden`}>
                                            <RefreshCw size={16} className="text-slate-400" /> Refresh data
                                        </button>
                                        <div className="my-1 h-px bg-slate-100" />
                                        {viewing ? (
                                            <button onClick={() => { setProfileDropdownOpen(false); exitView(); }}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                                                <ArrowLeft size={16} className="text-slate-400" /> Back to Organizations
                                            </button>
                                        ) : (
                                            <button onClick={() => { setProfileDropdownOpen(false); setShowLogoutConfirm(true); }}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">
                                                <LogOut size={16} className="text-red-400" /> Log out
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Bottom padding on phones keeps the last card clear of the floating nav bar. */}
                <div className="flex-1 overflow-y-auto p-4 pb-28 custom-scrollbar lg:p-8">
                    <div className="mx-auto w-full max-w-7xl">
                        <ErrorBoundary resetKey={location.pathname}><Outlet /></ErrorBoundary>
                    </div>
                </div>
            </main>

            {/* ── Phones and tablets: the floating bar along the bottom ────── */}
            <OrgBottomNav items={NAV} counts={counts} />
        </div>
    );
};

export default OrgAdminLayout;
