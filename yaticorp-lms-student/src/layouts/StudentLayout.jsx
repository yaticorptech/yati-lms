/**
 * @author Preethesh Kulal
 * @description Main student layout with sidebar, search, notifications and profile dropdown
 */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContinuePanel from '../components/ContinuePanel';
import SidebarProgressCard from '../components/SidebarProgressCard';
import MentorFab from '../components/MentorFab';
import MobileBottomNav from '../components/MobileBottomNav';
import { LayoutDashboard, User, LogOut, Menu, X, MessageCircleQuestion, Send, CheckCircle2, BookOpen, MessageSquare, Award, Bell, Search, Megaphone, Compass, Briefcase, Bot, ChevronDown } from 'lucide-react';
import api from '../utils/api';
import { useRewards } from '../context/useRewards';

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

/** How many Career Path hits a search returned, across all three groups. */
const careerHitCount = (career) =>
    (career?.phases?.length || 0) + (career?.tasks?.length || 0) + (career?.skills?.length || 0);

const StudentLayout = () => {
    const { user, logout, isCreditSystemEnabled, isCareerPathEnabled, isJobsEnabled } = useContext(AuthContext);
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

    // Search
    const [searchQ, setSearchQ] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const searchRef = useRef(null);
    const searchTimer = useRef(null);

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
            if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults(null);
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setProfileDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSearch = (val) => {
        setSearchQ(val);
        clearTimeout(searchTimer.current);
        if (val.length < 2) { setSearchResults(null); return; }
        searchTimer.current = setTimeout(async () => {
            // Two endpoints, merged here. The LMS search covers courses and
            // lessons; Career Path searches its own roadmap, tasks and skills.
            // Kept separate on the server so the LMS never reads career_* data —
            // composing them is the frontend's job.
            const [lms, career] = await Promise.allSettled([
                api.get(`/user/search?q=${encodeURIComponent(val)}`),
                api.get(`/career/search?q=${encodeURIComponent(val)}`)
            ]);
            if (lms.status === 'rejected' && career.status === 'rejected') return;
            setSearchResults({
                ...(lms.value?.data || { courses: [], lessons: [] }),
                career: career.value?.data || null
            });
        }, 350);
    };

    const goToLesson = (lesson) => {
        setSearchQ(''); setSearchResults(null);
        navigate(`/learn/${lesson.courseId}`);
    };
    const goToCourse = (course) => {
        setSearchQ(''); setSearchResults(null);
        navigate(`/learn/${course._id}`);
    };
    const goToCareer = (path) => {
        setSearchQ(''); setSearchResults(null);
        navigate(path);
    };

    const isActive = (path) => location.pathname === path;
    // Career Path is the one nav entry with screens beneath it, so it stays lit
    // on /career/planner, /career/roadmap and the rest — not just on /career.
    const isSectionActive = (path) =>
        location.pathname === path || location.pathname.startsWith(`${path}/`);

    // Get initials from name
    const getInitials = (name = '') =>
        name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    // Render helpers, not components: inlining them keeps the subtree from
    // remounting on every parent render.
    const renderNavLinks = (onClick) => (
        <>
            <Link to="/" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isActive('/') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <LayoutDashboard size={20} /> <span>Dashboard</span>
            </Link>
            <Link to="/enrolled-courses" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isActive('/enrolled-courses') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <BookOpen size={20} /> <span>Enrolled Courses</span>
            </Link>
            <Link to="/community" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isActive('/community') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <MessageSquare size={20} /> <span>Community</span>
            </Link>
            {/* Both sections are withdrawn entirely when an admin locks them,
                rather than shown disabled: a tab that cannot be opened only
                invites the question of when it will be. */}
            {isJobsEnabled && (
                <Link to="/jobs" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isActive('/jobs') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Briefcase size={20} /> <span>Jobs</span>
                </Link>
            )}
            {isCareerPathEnabled && (
                <Link to="/career" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isSectionActive('/career') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Compass size={20} /> <span>Career Path</span>
                </Link>
            )}
            {/* Its own section rather than a Career Path tab. It still rides on
                the same admin switch, because every request it makes goes to
                /api/career/chat and the server keeps that behind the flag. */}
            {isCareerPathEnabled && (
                <Link to="/mentor" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isSectionActive('/mentor') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                    <Bot size={20} /> <span>AI Mentor</span>
                </Link>
            )}
            <Link to="/profile" onClick={onClick} className={`flex items-center space-x-3 rounded-lg p-2.5 font-medium transition-colors duration-200 ${isActive('/profile') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <User size={20} /> <span>My Profile</span>
            </Link>
        </>
    );

    const renderNotificationBell = () => (
    <div ref={notifRef} className="relative">
        <button
            onClick={openNotif}
            className="p-2 text-slate-600 md:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
        >
            <Bell size={22} className={location.pathname === '/' ? 'text-indigo-600' : ''} />
            {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                </span>
            )}
        </button>

        {showNotif && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] max-h-80 overflow-y-auto animate-in fade-in zoom-in duration-200 origin-top-right">

                {/* ✅ HEADER */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <p className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <Megaphone size={16} className="text-indigo-600" />
                        Notifications
                    </p>

                    {/* ✅ MODERN GLASS BUTTON */}
                    {feed.length > 0 && (
                        <button
                            onClick={clearNotifications}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg 
                                       bg-white/70 backdrop-blur-md 
                                       text-indigo-600 border border-indigo-100
                                       hover:bg-indigo-50 hover:text-indigo-700
                                       shadow-sm hover:shadow-md 
                                       transition-all duration-200"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* ✅ CONTENT */}
                {feed.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Nothing yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {feed.map(item => {
                            const career = item.kind === 'career';
                            const jobs = item.kind === 'jobs';
                            const clickable = career || jobs;
                            return (
                                <div
                                    key={`${item.kind}-${item.id}`}
                                    className={`px-4 py-4 transition-colors ${clickable ? 'cursor-pointer hover:bg-indigo-50/50' : 'cursor-default hover:bg-slate-50'}`}
                                    onClick={clickable ? () => {
                                        setShowNotif(false);
                                        navigate(jobs ? (item.link || '/jobs') : (item.link || '/career'));
                                    } : undefined}
                                >
                                    <div className="flex items-start gap-2">
                                        <span
                                            className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                                                career
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : jobs
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-600'
                                            }`}
                                        >
                                            {career ? 'Career' : jobs ? 'Jobs' : 'Notice'}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-slate-800 text-sm leading-tight">
                                                {item.title}
                                            </p>
                                            <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                                                {item.body}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                                    {new Date(item.at).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        )}
    </div>
);
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
            {isCareerPathEnabled && <MentorFab />}

            {/* The seven sections under the thumb, mirroring the sidebar. */}
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
            <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col z-10 shadow-xl">
                <div className="p-6 flex items-center justify-center border-b border-slate-800 bg-slate-900">
                    <img src="/assets/YATICORP.png" alt="Yaticorp LMS" className="h-10 object-contain w-full" />
                </div>

                <nav className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
                    {renderNavLinks()}
                </nav>

                {/* Career Path progress, above the footer. Only when the
                    section is switched on for this student: XP and levels are
                    its currency, and advertising a locked feature from the
                    sidebar of every page is worse than showing nothing. */}
                {isCareerPathEnabled && (
                    <div className="hidden shrink-0 px-4 pb-2 [@media(min-height:820px)]:block">
                        <SidebarProgressCard user={progressUser || user} />
                    </div>
                )}

                {/* Sidebar footer — contact support only */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                    <button
                        onClick={() => setShowContact(true)}
                        className="flex items-center justify-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-600 hover:text-white w-full py-2.5 rounded-lg transition-all duration-200 font-medium"
                    >
                        <MessageCircleQuestion size={18} /> <span>Contact Support</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
                <div className="flex items-center">
                    <img src="/assets/YATICORP.png" alt="Yaticorp LMS" className="h-8 object-contain" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-slate-400">
                        {renderNotificationBell()}
                    </div>
                    <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-white ml-1">
                        <Menu size={24} />
                    </button>
                </div>
            </div>

            {/* Greets a returning student with the one thing to do today.
                Renders nothing on a first sign-in, or without a Career Path goal. */}
            <ContinuePanel />

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
                    <div className="relative w-4/5 max-w-sm bg-slate-900 text-white h-full flex flex-col shadow-2xl animate-fade-in border-r border-slate-800">
                        <div className="p-4 flex items-center justify-between border-b border-slate-800">
                            <img src="/assets/YATICORP.png" alt="Yaticorp LMS" className="h-8 object-contain" />
                            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <nav className="flex-1 p-4 space-y-2">
                            {renderNavLinks(() => setMobileMenuOpen(false))}
                        </nav>
                        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-2">
                            {/* Profile card in mobile drawer */}
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 mb-4">
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Student</p>
                                    {isCreditSystemEnabled && (
                                        <div className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-xs font-bold flex items-center">
                                            <Award size={12} className="mr-1" />
                                            {user?.credits || 0} Credits
                                        </div>
                                    )}
                                </div>
                                <p className="font-bold text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400 font-mono mt-1">{user?.cardNumber}</p>
                            </div>

                            {isCareerPathEnabled && (
                                <div className="mb-4">
                                    <SidebarProgressCard
                                        user={progressUser || user}
                                        onNavigate={() => setMobileMenuOpen(false)}
                                    />
                                </div>
                            )}

                            <button
                                onClick={() => { setMobileMenuOpen(false); setShowContact(true); }}
                                className="flex items-center justify-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-600 hover:text-white w-full py-3 rounded-xl transition-all duration-200 font-bold"
                            >
                                <MessageCircleQuestion size={20} /> <span>Contact Support</span>
                            </button>
                            <button
                                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                                className="flex items-center justify-center space-x-2 bg-red-50 text-red-600 w-full py-3 rounded-xl transition-all duration-200 font-bold"
                            >
                                <LogOut size={20} /> <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto bg-slate-50 md:pt-0 pt-16 relative">
                {/* Desktop Header */}
                <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">
                    <div className="flex flex-1 items-center">
                    {/* Search — the design puts it at the head of the page, not in the rail. */}
                    <div ref={searchRef} className="relative w-full max-w-md">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search for courses, lessons, quizzes..."
                                value={searchQ}
                                onChange={e => handleSearch(e.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-10 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <span className="pointer-events-none absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-200/70 text-slate-500"><Search size={14} /></span>
                        </div>
                        {searchResults && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 max-h-72 overflow-y-auto">
                                {searchResults.courses?.length === 0 &&
                                 searchResults.lessons?.length === 0 &&
                                 !careerHitCount(searchResults.career) ? (
                                    <p className="text-slate-400 text-sm px-4 py-3">No results found.</p>
                                ) : (
                                    <>
                                        {searchResults.courses?.length > 0 && (
                                            <div className="px-3 pt-2">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Courses</p>
                                                {searchResults.courses.map(c => (
                                                    <button key={c._id} onClick={() => goToCourse(c)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm">
                                                        <BookOpen size={14} className="text-indigo-500 flex-shrink-0" />
                                                        <span className="text-slate-800 font-medium truncate">{c.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {searchResults.lessons?.length > 0 && (
                                            <div className="px-3 pb-2 pt-1">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lessons</p>
                                                {searchResults.lessons.map(l => (
                                                    <button key={l._id} onClick={() => goToLesson(l)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{l.type}</span>
                                                        <span className="text-slate-700 truncate">{l.title}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {careerHitCount(searchResults.career) > 0 && (
                                            <div className="px-3 pb-2 pt-1 border-t border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 mt-1">Career Path</p>
                                                {searchResults.career.phases?.map(p => (
                                                    <button key={`p${p.index}`} onClick={() => goToCareer('/career/roadmap')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm">
                                                        <Compass size={14} className="text-indigo-500 flex-shrink-0" />
                                                        <span className="text-slate-700 truncate">{p.title}</span>
                                                        {p.completed && <span className="ml-auto text-[9px] font-bold text-emerald-600 uppercase flex-shrink-0">Done</span>}
                                                    </button>
                                                ))}
                                                {searchResults.career.tasks?.map(t => (
                                                    <button key={t._id} onClick={() => goToCareer('/career/planner')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">task</span>
                                                        <span className="text-slate-700 truncate">{t.title}</span>
                                                    </button>
                                                ))}
                                                {searchResults.career.skills?.map(sk => (
                                                    <button key={sk._id} onClick={() => goToCareer('/career/skills')} className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 flex items-center gap-2 text-sm">
                                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono flex-shrink-0">skill</span>
                                                        <span className="text-slate-700 truncate">{sk.skillName}</span>
                                                        <span className="ml-auto text-[10px] text-slate-400 flex-shrink-0">{sk.progress}%</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* `min-h-0` is what makes the scroll actually work. A flex
                        child will not shrink below its content without it, so the
                        nav kept its full height and pushed the progress card up
                        over the last link instead of scrolling — adding a seventh
                        section left "My Profile" half-hidden behind the astronaut. */}
                    </div>

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
                                        className="hidden lg:inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3.5 py-2 text-sm font-bold text-orange-700 transition-colors hover:bg-orange-100"
                                    >
                                        <span aria-hidden>🔥</span>
                                        {streak} day streak
                                    </Link>
                                )}
                                <Link
                                    to="/career/badges"
                                    className="hidden lg:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                >
                                    <span aria-hidden>⭐</span>
                                    {(progressUser || user)?.xp || 0} XP
                                </Link>
                            </>
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
                                        <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
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
                                                <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(user?.name)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{user?.name}</p>
                                            <p className="text-xs text-slate-400 font-mono">{user?.cardNumber}</p>
                                        </div>
                                        {isCreditSystemEnabled && (
                                            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold">
                                                <Award size={12} /> {user?.credits || 0} Credits
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

                {/* `pb-28` on phones so the fixed bottom bar never sits on top
                    of whatever the page ends with — a Save button under an
                    opaque nav is a button that does not exist. */}
                <div className="mx-auto h-full min-h-[calc(100vh-4rem)] max-w-7xl p-4 pb-28 md:p-8 md:pb-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
