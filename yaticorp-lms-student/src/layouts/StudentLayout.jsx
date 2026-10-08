/**
 * @author Preethesh Kulal
 * @description Main student layout with sidebar, notifications and profile dropdown
 */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContinuePanel from '../components/ContinuePanel';
import WalletShortDialog from '../components/rewards/WalletShortDialog';
import SidebarProgressCard from '../components/SidebarProgressCard';
import MobileBottomNav from '../components/MobileBottomNav';
import GoogleConsentDialog from '../integrations/google/GoogleConsentDialog';
import { LayoutDashboard, User, LogOut, Menu, X, MessageCircleQuestion, Send, CheckCircle2, BookOpen, MessageSquare, Award, Bell, Megaphone, Compass, Briefcase, GraduationCap, ChevronDown, Wallet, Mic, Trophy } from 'lucide-react';
import api from '../utils/api';
import { useRewards } from '../context/useRewards';
import { money, balance } from '../components/rewards/format';
import { pictureUrl } from '../native/pictures';
import PullToRefresh from '../components/PullToRefresh';
import { ADMIN_VIEW_KEY } from '../pages/AdminAccess';
import ProfilePictureGate from '../components/ProfilePictureGate';

// "5m ago", "3h ago", "2d ago", then a plain date once it is over a week old.
const timeAgo = (at) => {
    const mins = Math.floor((Date.now() - new Date(at).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Set when a superadmin opened this dashboard from the admin Users page. */
const readAdminView = () => {
    try { return JSON.parse(localStorage.getItem(ADMIN_VIEW_KEY) || 'null'); } catch { return null; }
};

// Contact Support Modal
const ContactModal = ({ onClose, user }) => {
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', cardNumber: user?.cardNumber || '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
   
    

   

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await api.post('/tickets', { ...form, page: 'dashboard' });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send.');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><MessageCircleQuestion size={18} className="text-indigo-600" /></div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Contact Support</h2>
                            <a href="tel:9535440195" className="text-sm text-indigo-600 font-semibold hover:underline">📞 9535440195</a>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
                </div>
                {done ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} className="text-emerald-600" /></div>
                        <h3 className="font-bold text-slate-800 mb-1">Message Sent!</h3>
                        <p className="text-slate-500 text-sm mb-4">Our team will get back to you soon.</p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-3">
                        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                        <div><label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label><input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="What's your issue about?" /></div>
                        <div><label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label><textarea required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Describe your issue in detail..." /></div>
                        <div className="flex justify-end space-x-2 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm flex items-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"><Send size={13} className="mr-1.5" />{loading ? 'Sending...' : 'Send'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const StudentLayout = () => {
    const { user, logout, isCareerPathEnabled, isJobsEnabled } = useContext(AuthContext);
    const [adminView] = useState(readAdminView);
    // Signs out of the student and closes the tab the admin panel opened; if
    // the browser will not close it, the sign-in page is left showing.
    const exitAdminView = () => { window.close(); logout(); };
    // The page's own scroller, for pull-to-refresh.
    const mainRef = useRef(null);
    // Streak, points and level for the header pills. Null until loaded or
    // when an admin has locked rewards; the pills simply stay away then.
    const rewards = useRewards();
    const rw = rewards.enabled ? rewards.summary : null;
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef(null);

    /**
     * A link with a hash (the header's wallet button → /#wallet) should land on
     * that element; the router changes the URL but does not scroll to it.
     *
     * Two things the single 150ms attempt got wrong. Arriving from another page,
     * the target often does not exist yet — the page it lives on is still
     * fetching — and one look that early finds nothing and never tries again.
     * And `location.key` is in the dependencies so that tapping the same link
     * twice scrolls twice: without it the hash is unchanged, the effect never
     * re-runs, and the second tap appears to do nothing at all.
     */
    useEffect(() => {
        if (!location.hash) return undefined;
        const id = decodeURIComponent(location.hash.slice(1));
        const smooth = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        let timer = null;
        let check = null;
        let tries = 0;

        /** Where the page is scrolled now, whichever box is doing the scrolling. */
        const positionOf = (el) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
                if (p.scrollHeight > p.clientHeight + 1) return { box: p, at: p.scrollTop };
            }
            return { box: null, at: window.scrollY };
        };

        const look = () => {
            const el = document.getElementById(id);
            // Two seconds of looking: long enough for a page to finish loading,
            // short enough that a wrong hash stops rather than polls forever.
            if (!el) { if (tries++ < 20) timer = setTimeout(look, 100); return; }

            const before = positionOf(el);
            el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
            if (!smooth) return;
            // Smooth scrolling is a no-op in some browsers and webviews — the
            // call returns, nothing moves, and the link looks broken. If nothing
            // has budged shortly after, jump there instead of doing nothing.
            check = setTimeout(() => {
                const now = before.box ? before.box.scrollTop : window.scrollY;
                if (now === before.at) el.scrollIntoView({ behavior: 'auto', block: 'start' });
            }, 400);
        };
        timer = setTimeout(look, 100);
        return () => { clearTimeout(timer); clearTimeout(check); };
    }, [location.pathname, location.hash, location.key]);

    const handleLogout = () => { setProfileDropdownOpen(false); setShowLogoutConfirm(true); };
    const confirmLogout = () => { setShowLogoutConfirm(false); logout(); };

    // Announcements / notifications
    //
    // One bell, two sources. Career Path arrived with a bell of its own inside
    // its section, which meant a student could earn a badge, never open Career
    // Path again, and never find out — while the header bell three centimetres
    // away sat empty. Both feeds land here now, tagged so the panel can say
    // where each item came from.
    // XP and level for the sidebar card. The cached `studentData` blob is the
    // login response, and the server rewrites XP every time a task is completed
    // — so a card driven from the cache would sit on the number the student had
    // when they signed in. Refetched on navigation, which is the same thing
    // CareerShell already does for the level chip inside the section.
    const [progressUser, setProgressUser] = useState(null);
    // The streak for the header pill. Server-computed and already returned by
    // the career profile summary, so this is one small request rather than
    // pulling the student's whole task history down to count days here.
    const [streak, setStreak] = useState(0);
    const [announcements, setAnnouncements] = useState([]);
    const [careerNotifs, setCareerNotifs] = useState([]);
    const [jobNotifs, setJobNotifs] = useState([]);
    const [showNotif, setShowNotif] = useState(false);
    const [notifSeen, setNotifSeen] = useState(() => parseInt(localStorage.getItem('notif_seen') || '0'));
    const notifRef = useRef(null);
    // What was unread at the moment the panel opened. Opening marks
    // everything read straight away, so without this snapshot the "new"
    // highlight would vanish before the student had seen it.
    const [freshKeys, setFreshKeys] = useState([]);


    useEffect(() => {
        api.get('/user/announcements').then(r => setAnnouncements(r.data)).catch(() => {});
        // Best-effort: a student with no career goal yet simply has none of these.
        api.get('/career/notifications').then(r => setCareerNotifs(r.data || [])).catch(() => {});
        // Job alerts. Not fetched while the section is locked — the endpoint
        // would only answer 403, and the bell should not mention a tab the
        // student cannot see.
        if (isJobsEnabled) {
            api.get('/jobs/notifications').then(r => setJobNotifs(r.data || [])).catch(() => {});
        }
        // Fresh XP and level for the sidebar card. Falls back to the cached
        // session on failure rather than blanking the card — a stale number is
        // better than an empty panel where progress used to be.
        if (isCareerPathEnabled) {
            api.get('/user/profile')
                .then(r => setProgressUser(r.data?.user ?? r.data))
                .catch(() => {});
        }
        // Only inside Career Path. The pills belong to that section, and asking
        // for a career summary on Dashboard, Courses, Community and Jobs would
        // be four requests a page that never shows the answer.
        if (isCareerPathEnabled && location.pathname.startsWith('/career')) {
            api.get('/career/profile/summary')
                .then(r => setStreak(r.data?.stats?.streak || 0))
                .catch(() => {});
        }
    }, [location.pathname, isJobsEnabled, isCareerPathEnabled]);

    // Career Path awards XP without a navigation, so the sidebar card and the
    // header pills have to be told rather than wait for the next page change.
    useEffect(() => {
        if (!isCareerPathEnabled) return undefined;
        const refetch = () => {
            api.get('/user/profile')
                .then(r => setProgressUser(r.data?.user ?? r.data))
                .catch(() => {});
            if (location.pathname.startsWith('/career')) {
                api.get('/career/profile/summary')
                    .then(r => setStreak(r.data?.stats?.streak || 0))
                    .catch(() => {});
            }
        };
        window.addEventListener('yati:progress-changed', refetch);
        return () => window.removeEventListener('yati:progress-changed', refetch);
    }, [isCareerPathEnabled, location.pathname]);

    // Announcements have no per-user read state on the server, so they are
    // counted against a high-water mark in localStorage the way they always
    // were. Career Path notifications carry their own isRead, so they are
    // counted honestly and stay unread until the student actually opens them.
    const careerUnread = careerNotifs.filter(n => !n.isRead).length;
    const jobsUnread = jobNotifs.filter(n => !n.isRead).length;
    const unreadCount = Math.max(0, announcements.length - notifSeen) + careerUnread + jobsUnread;

    // Merged newest-first. `kind` is what lets one panel render two shapes.
    const feed = [
        ...announcements.map(a => ({
            kind: 'announcement', id: a._id, title: a.title,
            body: a.message, at: a.createdAt, read: true
        })),
        ...careerNotifs.map(n => ({
            kind: 'career', id: n._id, title: n.title,
            body: n.message, at: n.createdAt, read: Boolean(n.isRead),
            // A feature announcement names the page it is about.
            link: n.link || '/career'
        })),
        ...jobNotifs.map(n => ({
            kind: 'jobs', id: n._id, title: n.title,
            body: n.message, at: n.createdAt, read: Boolean(n.isRead),
            // Carries the student back to the exact search the alert is about.
            link: n.link || '/jobs'
        }))
    ].sort((a, b) => new Date(b.at) - new Date(a.at));

    const openNotif = () => {
        const opening = !showNotif;
        setShowNotif(v => !v);
        if (!opening) return;

        setFreshKeys([
            ...careerNotifs.filter(n => !n.isRead).map(n => `career-${n._id}`),
            ...jobNotifs.filter(n => !n.isRead).map(n => `jobs-${n._id}`)
        ]);

        const seen = announcements.length;
        setNotifSeen(seen);
        localStorage.setItem('notif_seen', String(seen));

        // Career items are marked read server-side so the count is right on the
        // student's other device too, not just in this tab.
        const unread = careerNotifs.filter(n => !n.isRead);
        if (unread.length) {
            setCareerNotifs(list => list.map(n => ({ ...n, isRead: true })));
            Promise.all(
                unread.map(n => api.put(`/career/notifications/${n._id}/read`).catch(() => {}))
            );
        }

        // Job alerts follow the same rule: read means read on every device.
        const unreadJobs = jobNotifs.filter(n => !n.isRead);
        if (unreadJobs.length) {
            setJobNotifs(list => list.map(n => ({ ...n, isRead: true })));
            Promise.all(
                unreadJobs.map(n => api.put(`/jobs/notifications/${n._id}/read`).catch(() => {}))
            );
        }
    };

    const clearNotifications = async () => {
        // Both feeds, since the panel shows both. Settled independently: a
        // student with no career goal has no Career Path notifications, and that
        // call failing must not stop announcements being cleared.
        await Promise.allSettled([
            api.post('/user/announcements/clear'),
            api.delete('/career/notifications'),
            api.delete('/jobs/notifications')
        ]);

        setAnnouncements([]);
        setCareerNotifs([]);
        setJobNotifs([]);
        setNotifSeen(0);
        localStorage.setItem('notif_seen', '0');
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setProfileDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isActive = (path) => location.pathname === path;
    // Games & Competitions is laid out to fill the window, edge to edge,
    // rather than sit in the centred column the other pages use.
    const wide = location.pathname === '/competitions' || location.pathname.startsWith('/competitions/');
    // Career Path is the one nav entry with screens beneath it, so it stays lit
    // on /career/planner, /career/roadmap and the rest — not just on /career.
    const isSectionActive = (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`);

    // Get initials from name
    const getInitials = (name = '') =>
        name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    // The menu, in the groups a student thinks in: what to learn, their
    // career, and activities. Dashboard sits alone at the top; My Profile is
    // not in the menu, it is the student's own row in the footer.
    // Jobs and Scholarships (and Career Path) are withdrawn entirely when an
    // admin locks them, rather than shown disabled: a tab that cannot be
    // opened only invites the question of when it will be.
    const groups = [
        { items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true }] },
        { title: 'Learn', items: [
            { to: '/enrolled-courses', label: 'My Courses', icon: BookOpen, exact: true },
            { to: '/community', label: 'Community', icon: MessageSquare }
        ] },
        { title: 'Career', items: [
            isCareerPathEnabled && { to: '/career', label: 'Career Path', icon: Compass },
            { to: '/interview', label: 'Interview Prep', icon: Mic },
            isJobsEnabled && { to: '/jobs', label: 'Jobs', icon: Briefcase },
            isCareerPathEnabled && { to: '/scholarships', label: 'Scholarships', icon: GraduationCap }
        ].filter(Boolean) },
        { title: 'Activities', items: [{ to: '/competitions', label: 'Games & Competitions', icon: Trophy }] }
    ];
    const isLit = (item) => (item.exact ? isActive(item.to) : isSectionActive(item.to));

    // Render helpers, not components: inlining them keeps the subtree from
    // remounting on every parent render.
    const renderNavLinks = (onClick) => groups.map((g, i) => (
        <div key={g.title || 'top'} className={i ? 'pt-1' : ''}>
            {g.title && <p className="mb-0.5 px-2.5 pt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{g.title}</p>}
            <div className="space-y-1">
                {g.items.map((item) => (
                    <Link key={item.to} to={item.to} onClick={onClick} aria-current={isLit(item) ? 'page' : undefined}
                        className={`flex items-center space-x-3 rounded-lg px-2.5 py-2 font-medium transition-colors duration-200 ${isLit(item) ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                        <item.icon size={20} aria-hidden="true" /> <span>{item.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    ));

    const renderNotificationBell = () => (
    <div ref={notifRef} className="relative">
        <button
            onClick={openNotif}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            className="p-2 text-slate-600 md:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
        >
            <Bell size={22} className={location.pathname === '/' ? 'text-indigo-600' : ''} />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                </span>
            )}
        </button>

        {/* On the phone layout the panel spans the screen under the top bar,
            over a dimmed page: a 320px box hung off the bell ran past the
            left edge of a 344px Fold, and without the dim the page behind
            showed through below the list. With the sidebar it is the
            dropdown it always was. The header stays put; only the list
            scrolls. */}
        {showNotif && (
            <>
            <div
                aria-hidden
                onClick={() => setShowNotif(false)}
                className="fixed inset-0 top-[4rem] z-[59] bg-slate-900/25 backdrop-blur-[2px] animate-in fade-in duration-200 sidebar:hidden"
            />
            <div className="fixed inset-x-3 top-[4.5rem] z-[60] flex max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/20 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right sidebar:absolute sidebar:inset-x-auto sidebar:right-0 sidebar:top-12 sidebar:w-96 sidebar:max-h-[28rem] sidebar:rounded-2xl">

                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <p className="text-base font-black text-slate-900">Notifications</p>
                        {freshKeys.length > 0 && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                                {freshKeys.length} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {feed.length > 0 && (
                            <button
                                onClick={clearNotifications}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                                Clear all
                            </button>
                        )}
                        <button
                            onClick={() => setShowNotif(false)}
                            aria-label="Close notifications"
                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sidebar:hidden"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {feed.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                            <Bell size={24} className="text-indigo-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">You&apos;re all caught up</p>
                        <p className="mt-1 text-xs text-slate-400">New badges, XP and job alerts will show up here.</p>
                    </div>
                ) : (
                    <div className="relative flex min-h-0 flex-1 flex-col">
                    {/* Four rows tall; the rest are a scroll away. */}
                    <ul className="max-h-[23rem] min-h-0 space-y-1 overflow-y-auto overscroll-contain py-1.5">
                        {feed.map(item => {
                            const key = `${item.kind}-${item.id}`;
                            const career = item.kind === 'career';
                            const jobs = item.kind === 'jobs';
                            const clickable = career || jobs;
                            const fresh = freshKeys.includes(key);
                            const Icon = career ? Compass : jobs ? Briefcase : Megaphone;
                            return (
                                <li key={key}>
                                    <div
                                        role={clickable ? 'button' : undefined}
                                        tabIndex={clickable ? 0 : undefined}
                                        className={`relative mx-1.5 flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors ${fresh ? 'bg-indigo-50/60' : ''} ${clickable ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' : 'cursor-default'}`}
                                        onClick={clickable ? () => {
                                            setShowNotif(false);
                                            navigate(item.link || (jobs ? '/jobs' : '/career'));
                                        } : undefined}
                                    >
                                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                            career ? 'bg-indigo-100 text-indigo-600' : jobs ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                        }`}>
                                            <Icon size={18} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 pr-4 text-sm leading-snug font-bold text-slate-900">
                                                {item.title}
                                            </p>
                                            {item.body && (
                                                <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-slate-500">
                                                    {item.body}
                                                </p>
                                            )}
                                            <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                                                {career ? 'Career' : jobs ? 'Jobs' : 'Notice'} · {timeAgo(item.at)}
                                            </p>
                                        </div>
                                        {fresh && <span aria-label="New" className="absolute top-4 right-3 h-2 w-2 rounded-full bg-indigo-600" />}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                    </div>
                )}
            </div>
            </>
        )}
    </div>
);
    return (
        <div className="flex h-visible bg-slate-50 text-slate-900 font-sans">
            {/* Raised whenever something wants to write to a student's own
                Google account. Mounted once so the explanation they read is
                written in exactly one place. */}
            <GoogleConsentDialog />

            {/* The six sections under the thumb, mirroring the sidebar. */}
            <MobileBottomNav
                isJobsEnabled={isJobsEnabled}
                isCareerPathEnabled={isCareerPathEnabled}
            />

            {showContact && <ContactModal onClose={() => setShowContact(false)} user={user} />}

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={26} className="text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-1">Log out?</h2>
                            <p className="text-slate-500 text-sm">Are you sure you want to log out of your account?</p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmLogout}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
                            >
                                Yes, Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar */}
            <aside className="hidden sidebar:flex w-64 bg-white text-slate-700 border-r border-slate-200 flex-col z-10">
                <div className="flex items-center justify-center border-b border-slate-100 bg-white px-6 py-4">
                    {/* Dark-lettered logo: the original is white artwork for a dark ground. */}
                    <img src="/assets/YATICORP-dark.png" alt="Yaticorp LMS" className="h-10 object-contain w-full" />
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                    {renderNavLinks()}
                </nav>

                {/* Career Path progress, above the footer. Only when the
                    section is switched on for this student: XP and levels are
                    its currency, and advertising a locked feature from the
                    sidebar of every page is worse than showing nothing. */}
                {isCareerPathEnabled && (
                    <div className="hidden shrink-0 px-4 pb-2 [@media(min-height:960px)]:block">
                        <SidebarProgressCard user={progressUser || user} />
                    </div>
                )}

                {/* Sidebar footer — the student's own row, then contact
                    support. My Profile lives here rather than in the nav, the
                    way ChatGPT and most apps keep the account at the foot. */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-2">
                    <Link
                        to="/profile"
                        aria-label="My Profile"
                        className={`flex items-center gap-3 rounded-lg p-2 transition-colors duration-200 ${isActive('/profile') ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                            {user?.profilePicture ? (
                                <img src={pictureUrl(user.profilePicture)} alt="" className="h-full w-full object-cover" />
                            ) : (
                                getInitials(user?.name)
                            )}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{user?.name}</span>
                            <span className={`block text-xs ${isActive('/profile') ? 'text-indigo-100' : 'text-slate-500'}`}>My Profile</span>
                        </span>
                        <User size={18} className={isActive('/profile') ? 'text-white' : 'text-slate-400'} />
                    </Link>
                    <button
                        onClick={() => setShowContact(true)}
                        className="flex items-center justify-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white w-full py-2.5 rounded-lg transition-all duration-200 font-medium"
                    >
                        <MessageCircleQuestion size={18} /> <span>Contact Support</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div
                data-mobile-header
                className="sidebar:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4"
            >
                <div className="flex min-w-0 shrink items-center">
                    <img src="/assets/YATICORP-dark.png" alt="Yaticorp LMS" className="h-8 max-w-full object-contain" />
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                    {/* The wallet, as a bare icon — no tile behind it, matching
                        the bell beside it. The desktop bar has room to print the
                        figure; a phone bar does not, and the balance is the first
                        thing on the card this opens. Emerald-400 rather than the
                        card's emerald-600: on this navy bar the darker green is
                        almost invisible. The amount still reaches a screen reader
                        through the label. */}
                    {rw?.wallet && (
                        <Link
                            to="/#wallet"
                            aria-label={`Wallet balance ${money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}. Open the wallet.`}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:text-emerald-700"
                        >
                            <Wallet size={20} />
                        </Link>
                    )}
                    {/* The bell sets its own slate colour, so a colour on this
                        wrapper alone never reaches it — these descendant rules
                        do. Emerald to match the wallet beside it; the unread
                        badge keeps its own red. */}
                    <div className="shrink-0 [&_button]:text-emerald-600 [&_button:hover]:bg-slate-100 [&_svg]:text-emerald-600">
                        {renderNotificationBell()}
                    </div>
                    <button onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" className="shrink-0 p-2 text-slate-700">
                        <Menu size={24} aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* Greets a returning student with the one thing to do today.
                Renders nothing on a first sign-in, or without a Career Path goal. */}
            <ContinuePanel />
            <WalletShortDialog />

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="sidebar:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    {/* The whole drawer scrolls, not the menu inside it. On a phone
                        turned sideways — 384px tall — the logo above and the card,
                        Contact Support and Logout below left the menu its own
                        scrolling strip about two items high. The close button stays
                        pinned at the top while the rest moves. */}
                    <div className="relative w-4/5 max-w-sm bg-white text-slate-700 h-full flex flex-col overflow-y-auto shadow-2xl animate-fade-in border-r border-slate-200">
                        <div className="sticky top-0 z-10 p-4 flex items-center justify-between border-b border-slate-100 bg-white">
                            <img src="/assets/YATICORP-dark.png" alt="Yaticorp LMS" className="h-8 object-contain" />
                            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" className="p-2 text-slate-400 hover:text-slate-700">
                                <X size={24} aria-hidden="true" />
                            </button>
                        </div>
                        <nav className="flex-1 p-4">
                            {renderNavLinks(() => setMobileMenuOpen(false))}
                        </nav>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
                            {/* Profile card in mobile drawer — opens My Profile,
                                which is no longer in the nav list above. */}
                            <Link
                                to="/profile"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block bg-white p-4 rounded-xl border transition-colors ${isActive('/profile') ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-200'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Student</p>
                                    {/* The wallet balance, where credits used to be shown. */}
                                    {rw?.wallet && (
                                        <div className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold flex items-center tabular-nums">
                                            <Wallet size={12} className="mr-1" />
                                            {money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}
                                        </div>
                                    )}
                                </div>
                                <p className="font-bold text-slate-900 truncate">{user?.name}</p>
                                <p className="text-xs text-slate-500 font-mono mt-1">{user?.cardNumber}</p>
                                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600"><User size={12} /> My Profile</p>
                            </Link>
                            {/* Logout sits in this pinned footer, beside
                                Contact Support, so it is always on screen. At
                                the end of the scrolling nav it was hidden below
                                the fold, and nothing hinted the list scrolled. */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setMobileMenuOpen(false); setShowContact(true); }}
                                    className="flex items-center justify-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white w-full py-3 rounded-xl transition-all duration-200 font-bold"
                                >
                                    <MessageCircleQuestion size={20} /> <span>Support</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                                    className="flex items-center justify-center space-x-2 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white w-full py-3 rounded-xl transition-all duration-200 font-bold"
                                >
                                    <LogOut size={20} /> <span>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            {/* Drag down at the top of a page to reload it (touch screens). */}
            <PullToRefresh scrollerRef={mainRef} />
            <main ref={mainRef} className="flex-1 overflow-auto overscroll-y-contain bg-slate-50 sidebar:pt-0 pt-16 relative">
                {/* A superadmin working in this student's dashboard: everything
                    they do counts as the student's own, so it is said plainly,
                    with the way out beside it. */}
                {adminView && (
                    <div role="status" className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sidebar:px-8">
                        <p className="min-w-0 flex-1">
                            <span className="font-semibold">Viewing {user?.name || adminView.name}</span>
                            <span className="hidden sm:inline"> as the platform administrator ({adminView.by})</span> · actions count as the student's
                        </p>
                        <button onClick={exitAdminView} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-800 hover:bg-amber-100">
                            Exit
                        </button>
                    </div>
                )}
                {/* Desktop Header */}
                <header className="hidden sidebar:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">
                    {/* Left side kept empty so the pills and profile stay on the right. */}
                    <div className="flex flex-1 items-center" />

                    <div className="flex items-center gap-3">
                        {/* Career Path's two headline numbers, in the section
                            that owns them. The streak only appears once there
                            is one — "0 day streak" in a celebratory pill
                            congratulates a student for nothing. */}
                        {isCareerPathEnabled && isSectionActive('/career') && (
                            <>
                                {streak > 0 && (
                                    <Link
                                        to="/career"
                                        className="hidden lg:inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 px-3.5 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100"
                                    >
                                        <span aria-hidden>🔥</span>
                                        {streak} day streak
                                    </Link>
                                )}
                                <Link
                                    to="/career/badges"
                                    className="hidden lg:inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                >
                                    <span aria-hidden>⭐</span>
                                    {(progressUser || user)?.xp || 0} XP
                                </Link>
                            </>
                        )}

                        {/* The wallet balance, always in view at the top of the
                            dashboard. It opens the wallet card further down the
                            page, where the transactions and rewards live. */}
                        {rw?.wallet && (
                            <Link
                                to="/#wallet"
                                aria-label={`Wallet balance ${money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}`}
                                className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                                <Wallet size={16} />
                                {/* The label waits for xl: at 1024 the header beside the
                                    sidebar is 768px, and with the streak and XP pills
                                    beside it every pill wrapped onto two lines. */}
                                <span className="hidden xl:inline text-xs font-semibold text-emerald-600">Wallet Balance</span>
                                <span className="tabular-nums">{money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}</span>
                            </Link>
                        )}

                        {renderNotificationBell()}
                        <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

                        {/* Profile avatar dropdown — top-right header */}
                        <div ref={profileDropdownRef} className="relative">
                            <button
                                onClick={() => setProfileDropdownOpen(v => !v)}
                                className="flex items-center gap-2.5 rounded-full py-0.5 pr-1 transition-colors hover:bg-slate-50"
                            >
                                <span className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-indigo-100 hover:ring-indigo-300 transition-all duration-200 overflow-hidden">
                                    {user?.profilePicture ? (
                                        <img src={pictureUrl(user.profilePicture)} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        getInitials(user?.name)
                                    )}
                                </span>
                                <span className="hidden lg:block text-left leading-tight">
                                    <span className="block max-w-[140px] truncate text-sm font-bold text-slate-800">{user?.name}</span>
                                    {rw && <span className="block text-[11px] font-semibold text-slate-500">Level {rw.level.level}</span>}
                                </span>
                                <ChevronDown size={14} className="hidden lg:block text-slate-400" aria-hidden="true" />
                            </button>

                            {/* Dropdown panel */}
                            {profileDropdownOpen && (
                                <div className="absolute right-0 top-12 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
                                    {/* User info header */}
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col items-center gap-2 text-center">
                                        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                            {user?.profilePicture ? (
                                                <img src={pictureUrl(user.profilePicture)} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(user?.name)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{user?.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{user?.cardNumber}</p>
                                        </div>
                                        {/* The wallet balance, where credits used to be shown. */}
                                        {rw?.wallet && (
                                            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold tabular-nums">
                                                <Wallet size={12} /> {money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Menu items */}
                                    <div className="p-2">
                                        <Link
                                            to="/profile"
                                            onClick={() => setProfileDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                        >
                                            <User size={16} className="text-slate-400" /> My Profile
                                        </Link>
                                        <div className="my-1 h-px bg-slate-100" />
                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                        >
                                            <LogOut size={16} className="text-red-400" /> Log out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Bottom padding on phones so the floating bar never sits on
                    top of whatever the page ends with — a Save button under an
                    opaque nav is a button that does not exist.

                    No `h-full` here. It pinned this box to the viewport's
                    height, so any page taller than the screen overflowed past
                    it and the padding landed mid-page instead of after the
                    last card — which is why the end of long pages sat under
                    the bar. `min-h` keeps short pages filling the screen. */}
                <div className={`mx-auto min-h-[calc(100vh-4rem)] p-4 pb-[7.5rem] sidebar:p-8 sidebar:pb-8 ${wide ? 'max-w-none' : 'max-w-7xl'}`}>
                    <Outlet />
                </div>
            </main>
            {/* No profile picture yet: choose one before going on. */}
            <ProfilePictureGate />
        </div>
    );
};

export default StudentLayout;
