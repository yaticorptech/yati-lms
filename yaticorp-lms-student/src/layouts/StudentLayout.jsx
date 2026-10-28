/**
 * @author Preethesh Kulal
 * @description Main student layout with sidebar, notifications and profile dropdown
 */
import React, { useCallback, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ContinuePanel from '../components/ContinuePanel';
import WalletShortDialog from '../components/rewards/WalletShortDialog';
import MobileBottomNav from '../components/MobileBottomNav';
import GoogleConsentDialog from '../integrations/google/GoogleConsentDialog';
import LanguageToggle from '../components/LanguageToggle';
import { LayoutDashboard, User, LogOut, Menu, X, MessageCircleQuestion, Send, CheckCircle2, BookOpen, Award, Bell, Megaphone, Compass, Briefcase, ChevronDown, ChevronRight, Wallet, Mic, Trophy, Gamepad2, Globe, Shield } from 'lucide-react';
import api from '../utils/api';
import { useRewards } from '../context/useRewards';
import { money, balance } from '../components/rewards/format';
// The wallet popup is fetched when it is first opened.
const WalletSheet = React.lazy(() => import('../components/rewards/WalletCard').then((m) => ({ default: m.WalletSheet })));
import PullToRefresh from '../components/PullToRefresh';
import { ADMIN_VIEW_KEY } from '../utils/sessionExpiry';
import ProfilePictureGate from '../components/ProfilePictureGate';
import GlobalQuizAlert from '../components/GlobalQuizAlert';
import RankUpWatcher from '../components/rewards/RankUpWatcher';
import useBackClose from '../native/useBackClose';
import { dayKey as platformDay } from '../career/utils/progress';
import ProfileImage from '../components/ProfileImage';
import PlatformClosed from '../components/PlatformClosed';
import useAccessHours from '../hooks/useAccessHours';
import CompetitionAlerts from '../competitions/CompetitionAlerts';

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

// How often the bell looks for new notices while the page is in front.
const BELL_REFRESH_MS = 2 * 60 * 1000;

/** What each kind of notice looks like in the bell, and what it is called. */
const KINDS = {
    announcement: { label: 'Notice', icon: Megaphone, tone: 'bg-amber-100 text-amber-600' },
    career: { label: 'Career', icon: Compass, tone: 'bg-indigo-100 text-indigo-600' },
    // XP, badges and the wallet. They travel in the career feed but belong to
    // the rewards system, and come whether or not Career Path is switched on.
    reward: { label: 'Rewards', icon: Award, tone: 'bg-violet-100 text-violet-600' },
    // Games & Competitions: a team accepted, the draw, a match open, a result.
    // Same feed and same rule: shown whatever the Career Path switch says.
    competition: { label: 'Competitions', icon: Trophy, tone: 'bg-orange-100 text-orange-600' },
    jobs: { label: 'Jobs', icon: Briefcase, tone: 'bg-emerald-100 text-emerald-600' }
};

/**
 * Which kind a notice from the career feed is. Competition notices written
 * before they had a type of their own were saved as rewards notices; their
 * link (to a competition) still tells them apart.
 */
const careerFeedKind = (n) => {
    if (n.type === 'competition' || (n.type === 'reward' && String(n.link || '').startsWith('/competitions'))) return 'competition';
    return n.type === 'reward' ? 'reward' : 'career';
};
/** Notices from the career feed that are shown with Career Path switched off. */
const alwaysShown = (n) => careerFeedKind(n) !== 'career';

const atOf = (x) => new Date(x?.createdAt || 0).getTime() || 0;

// The newest announcement this student has opened the bell on, per student.
const seenAtKey = (userId) => `yati.notifSeenAt.${userId || 'me'}`;
const readSeenAt = (userId) => { try { return Number(localStorage.getItem(seenAtKey(userId))) || 0; } catch { return 0; } };
const writeSeenAt = (userId, at) => { try { localStorage.setItem(seenAtKey(userId), String(at)); } catch { /* counted again next visit */ } };
/**
 * The old marker was a count of announcements, shared by the whole device
 * ('notif_seen'). Read once: if it covered every announcement there is now,
 * they had all been seen, and this student starts from the newest. Then it
 * is dropped. Returns the time adopted, or null.
 */
const adoptLegacySeen = (userId, list) => {
    try {
        const legacy = localStorage.getItem('notif_seen');
        if (legacy === null) return null;
        localStorage.removeItem('notif_seen');
        if (localStorage.getItem(seenAtKey(userId)) !== null || Number(legacy) < list.length) return null;
        const newest = list.reduce((max, a) => Math.max(max, atOf(a)), 0);
        if (newest) writeSeenAt(userId, newest);
        return newest || null;
    } catch { return null; }
};

/**
 * Every page starts at its top. The pages scroll inside the layout's <main>,
 * which the router never touches, so a new page opened wherever the last one
 * had been scrolled to — the middle of a course list, the foot of a post.
 *
 * Only for a PUSH (a link, a tap) without a #hash: a hash is scrolled to by
 * the layout's own effect, the browser's back (POP) is left where it was, and
 * a page that rewrites its own address (REPLACE: a tab, a search) stays put.
 * Rendered just before the page in <main>, so its layout effect runs before
 * the page's own: the interview dashboard putting the student back where they
 * left it (interview/scrollMemory.js) still has the last word.
 */
function ScrollReset({ scrollerRef }) {
    const location = useLocation();
    const navType = useNavigationType();
    const lastKey = useRef(location.key);
    useLayoutEffect(() => {
        if (lastKey.current === location.key) return;
        lastKey.current = location.key;
        if (navType !== 'PUSH' || location.hash) return;
        if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    }, [location.key, location.hash, navType, scrollerRef]);
    return null;
}

/** Set when a superadmin opened this dashboard from the admin Users page. */
const readAdminView = () => {
    try { return JSON.parse(localStorage.getItem(ADMIN_VIEW_KEY) || 'null'); } catch { return null; }
};

// Contact Support Modal
// A real dialog: named, Escape and Android's back button close it, and the
// focus is moved into it so the keyboard and a screen reader start there.
const ContactModal = ({ onClose, user, page }) => {
    const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', cardNumber: user?.cardNumber || '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const cardRef = useRef(null);

    useBackClose(onClose);
    useEffect(() => {
        cardRef.current?.focus({ preventScroll: true });
    }, []);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            // Which page the student wrote from. The ticket's `page` only
            // knows a few fixed values (login, signup, dashboard, other), so
            // the address itself goes as `path`, and on the message's last
            // line where support reads it today — it always said "dashboard".
            const where = page && page !== '/' ? page : '';
            await api.post('/tickets', {
                ...form,
                page: 'dashboard',
                path: page || '/',
                message: where ? `${form.message}\n\n— Sent from ${where}` : form.message
            });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send.');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="contact-support-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden focus:outline-none">
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><MessageCircleQuestion size={18} aria-hidden="true" className="text-indigo-600" /></div>
                        <div>
                            <h2 id="contact-support-title" className="text-base font-bold text-slate-800">Contact Support</h2>
                            <a href="tel:9535440195" className="text-sm text-indigo-600 font-semibold hover:underline">📞 9535440195</a>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-600 p-1"><X size={18} aria-hidden="true" /></button>
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
                        {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                        <div><label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label><input id="contact-subject" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="What's your issue about?" /></div>
                        <div><label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700 mb-1">Message *</label><textarea id="contact-message" required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Describe your issue in detail..." /></div>
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
    const { user, logout, isCareerPathEnabled, isJobsEnabled, isLinguisticEnabled } = useContext(AuthContext);
    // The organization's access hours: outside them, the closed screen (components/PlatformClosed).
    const accessHours = useAccessHours(Boolean(user));
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
    const [showContact, setShowContact] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileDropdownRef = useRef(null);
    const profileButtonRef = useRef(null);

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
    // One bell, three sources. Career Path arrived with a bell of its own inside
    // its section, which meant a student could earn a badge, never open Career
    // Path again, and never find out — while the header bell three centimetres
    // away sat empty. Announcements, the career feed (which also carries the
    // rewards notices: XP, badges, wallet) and job alerts all land here now,
    // tagged so the panel can say where each item came from.
    // XP and level for the sidebar card. The cached `studentData` blob is the
    // login response, and the server rewrites XP every time a task is completed
    // — so a card driven from the cache would sit on the number the student had
    // when they signed in. Read on arrival and whenever progress changes.
    const [progressUser, setProgressUser] = useState(null);
    // The streak for the header pill. Server-computed and already returned by
    // the career profile summary, so this is one small request rather than
    // pulling the student's whole task history down to count days here.
    const [streak, setStreak] = useState(0);
    const [announcements, setAnnouncements] = useState([]);
    const [careerNotifs, setCareerNotifs] = useState([]);
    const [jobNotifs, setJobNotifs] = useState([]);
    // Whether the career feed answered. With Career Path switched off it may
    // still carry the rewards notices, or it may be closed (403) — then it is
    // not asked again this visit, and "Clear all" leaves it alone.
    const [careerFeedOk, setCareerFeedOk] = useState(false);
    const careerFeedClosed = useRef(false);
    const [showNotif, setShowNotif] = useState(false);
    // Announcements have no per-student read state on the server, so what this
    // student has seen is remembered here: the newest announcement they have
    // opened the bell on, by time, per student. It used to be a count shared by
    // everyone on the device ('notif_seen'), which miscounted the moment an
    // announcement was deleted, and handed one student's "seen" to the next.
    const userId = user?._id || user?.id;
    const [notifSeenAt, setNotifSeenAt] = useState(() => readSeenAt(userId));
    const [seenFor, setSeenFor] = useState(userId);
    if (seenFor !== userId) { setSeenFor(userId); setNotifSeenAt(readSeenAt(userId)); }
    // Two bells are drawn — one in the phone's top bar, one in the desktop
    // header — and only one is ever on screen. Each has its own box: with one
    // shared ref it pointed at the hidden desktop copy, so every tap inside
    // the phone's panel counted as a tap outside it, the panel closed on
    // mousedown, and its items and "Clear all" never received the click.
    const notifMobileRef = useRef(null);
    const notifDesktopRef = useRef(null);
    // What was unread at the moment the panel opened. Opening marks
    // everything read straight away, so without this snapshot the "new"
    // highlight would vanish before the student had seen it.
    const [freshKeys, setFreshKeys] = useState([]);
    const [clearError, setClearError] = useState('');
    const inCareer = location.pathname === '/career' || location.pathname.startsWith('/career/');

    /**
     * The three feeds, fetched together. On arrival, when the bell is opened,
     * every couple of minutes while the page is in front, and when progress
     * changes (a badge or an XP notice may just have been written). They used
     * to be fetched again on every page change — five requests a click, one of
     * them a 403 whenever Career Path was off. Resolves with what came back.
     */
    const loadBell = useCallback(() => {
        const asks = [
            api.get('/user/announcements')
                .then((r) => {
                    const list = Array.isArray(r.data) ? r.data : [];
                    setAnnouncements(list);
                    const adopted = adoptLegacySeen(userId, list);
                    if (adopted) setNotifSeenAt((at) => Math.max(at, adopted));
                    return list;
                })
                .catch(() => null)
        ];
        // With Career Path on, always; with it off, until the feed says it is
        // closed — it still carries the rewards notices when the server allows.
        if (isCareerPathEnabled || !careerFeedClosed.current) {
            asks.push(api.get('/career/notifications')
                .then((r) => { const list = r.data || []; setCareerNotifs(list); setCareerFeedOk(true); return list; })
                .catch((e) => {
                    if (e.response?.status === 403) { careerFeedClosed.current = true; setCareerNotifs([]); setCareerFeedOk(false); }
                    return null;
                }));
        } else asks.push(Promise.resolve(null));
        // Job alerts. Not fetched while the section is locked — the endpoint
        // would only answer 403, and the bell should not mention a tab the
        // student cannot see.
        if (isJobsEnabled) {
            asks.push(api.get('/jobs/notifications')
                .then((r) => { const list = r.data || []; setJobNotifs(list); return list; })
                .catch(() => null));
        } else asks.push(Promise.resolve(null));
        return Promise.all(asks).then(([a, c, j]) => ({ announcements: a, careerNotifs: c, jobNotifs: j }));
    }, [isCareerPathEnabled, isJobsEnabled, userId]);

    useEffect(() => {
        if (!userId) return undefined;
        if (isCareerPathEnabled) careerFeedClosed.current = false;
        loadBell();
        const timer = setInterval(() => { if (document.visibilityState === 'visible') loadBell(); }, BELL_REFRESH_MS);
        const again = () => loadBell();
        window.addEventListener('yati:progress-changed', again);
        window.addEventListener('yati:rewards', again);
        return () => {
            clearInterval(timer);
            window.removeEventListener('yati:progress-changed', again);
            window.removeEventListener('yati:rewards', again);
        };
    }, [loadBell, userId, isCareerPathEnabled]);

    // Fresh XP and level for the sidebar card, on arrival and whenever Career
    // Path, a lesson or a quiz says progress changed — not on every page
    // change. Falls back to the cached session on failure rather than
    // blanking the card: a stale number is better than an empty panel.
    useEffect(() => {
        if (!isCareerPathEnabled) return undefined;
        const refetch = () => api.get('/user/profile')
            .then((r) => setProgressUser(r.data?.user ?? r.data))
            .catch(() => {});
        refetch();
        window.addEventListener('yati:progress-changed', refetch);
        return () => window.removeEventListener('yati:progress-changed', refetch);
    }, [isCareerPathEnabled, userId]);

    // The streak pill belongs to Career Path's section, so its summary is only
    // asked for there: on entering the section (not on each of its pages) and
    // when progress changes while inside it.
    useEffect(() => {
        if (!isCareerPathEnabled || !inCareer) return undefined;
        const refetch = () => api.get('/career/profile/summary')
            .then((r) => setStreak(r.data?.stats?.streak || 0))
            .catch(() => {});
        refetch();
        window.addEventListener('yati:progress-changed', refetch);
        return () => window.removeEventListener('yati:progress-changed', refetch);
    }, [isCareerPathEnabled, inCareer]);

    // Only today's notifications, on the platform's day (the one the streak
    // and Career Path's plan turn over in): older ones are not shown and not
    // counted in the red badge (asked 2026-10-14). The feeds refresh every
    // couple of minutes, so yesterday's drop off soon after midnight.
    const today = platformDay(Date.now());
    const ofToday = (x) => platformDay(x?.createdAt) === today;
    const todaysAnnouncements = announcements.filter(ofToday);
    // Career items from a switched-off Career Path are not shown — the bell
    // should not send anyone to a section they cannot open — but the rewards
    // notices that travel in the same feed are.
    const careerShown = careerNotifs.filter((n) => ofToday(n) && (isCareerPathEnabled || alwaysShown(n)));
    const jobsShown = isJobsEnabled ? jobNotifs.filter(ofToday) : [];
    const freshAnnouncements = todaysAnnouncements.filter((a) => atOf(a) > notifSeenAt);
    const unreadCount = freshAnnouncements.length
        + careerShown.filter((n) => !n.isRead).length
        + jobsShown.filter((n) => !n.isRead).length;

    // Merged newest-first. `kind` is what lets one panel render four shapes.
    const feed = [
        ...todaysAnnouncements.map((a) => ({
            kind: 'announcement', id: a._id, title: a.title,
            body: a.message, at: a.createdAt
        })),
        ...careerShown.map((n) => (careerFeedKind(n) === 'competition' ? {
            // A competition notice opens the competition it is about.
            kind: 'competition', id: n._id, title: n.title,
            body: n.message, at: n.createdAt, link: n.link || '/competitions'
        } : careerFeedKind(n) === 'reward' ? {
            // XP, a badge, the wallet: the rewards system's notices. They say
            // where to look (the wallet card, the badges page); the wallet is
            // the place for one that does not.
            kind: 'reward', id: n._id, title: n.title,
            body: n.message, at: n.createdAt, link: n.link || '/#wallet'
        } : {
            kind: 'career', id: n._id, title: n.title,
            body: n.message, at: n.createdAt,
            // A feature announcement names the page it is about.
            link: n.link || '/career'
        })),
        ...jobsShown.map((n) => ({
            kind: 'jobs', id: n._id, title: n.title,
            body: n.message, at: n.createdAt,
            // Carries the student back to the exact search the alert is about.
            link: n.link || '/jobs'
        }))
    ].sort((a, b) => new Date(b.at) - new Date(a.at));

    /**
     * Everything unread in these lists becomes read: highlighted as new in the
     * panel for as long as it is open, and marked read on the server (career
     * and job items) so the count is right on the student's other device too.
     */
    const markSeen = (lists, { append = false } = {}) => {
        // Only today's: the panel shows nothing older, so its "N new" counts
        // nothing older either (worked out afresh, in case midnight has passed).
        const day = platformDay(Date.now());
        const onDay = (x) => platformDay(x?.createdAt) === day;
        const anns = (lists.announcements || []).filter(onDay);
        const careers = (lists.careerNotifs || []).filter((n) => onDay(n) && (isCareerPathEnabled || alwaysShown(n)));
        const jobs = isJobsEnabled ? (lists.jobNotifs || []).filter(onDay) : [];
        const unreadCareer = careers.filter((n) => !n.isRead);
        const unreadJobs = jobs.filter((n) => !n.isRead);
        const keys = [
            ...anns.filter((a) => atOf(a) > notifSeenAt).map((a) => `announcement-${a._id}`),
            ...unreadCareer.map((n) => `${careerFeedKind(n)}-${n._id}`),
            ...unreadJobs.map((n) => `jobs-${n._id}`)
        ];
        setFreshKeys((prev) => [...new Set([...(append ? prev : []), ...keys])]);

        const newest = anns.reduce((max, a) => Math.max(max, atOf(a)), 0);
        if (newest > notifSeenAt) { setNotifSeenAt(newest); writeSeenAt(userId, newest); }

        if (unreadCareer.length) {
            const ids = new Set(unreadCareer.map((n) => n._id));
            setCareerNotifs((list) => list.map((n) => (ids.has(n._id) ? { ...n, isRead: true } : n)));
            unreadCareer.forEach((n) => api.put(`/career/notifications/${n._id}/read`).catch(() => {}));
        }
        // Job alerts follow the same rule: read means read on every device.
        if (unreadJobs.length) {
            const ids = new Set(unreadJobs.map((n) => n._id));
            setJobNotifs((list) => list.map((n) => (ids.has(n._id) ? { ...n, isRead: true } : n)));
            unreadJobs.forEach((n) => api.put(`/jobs/notifications/${n._id}/read`).catch(() => {}));
        }
    };

    const openNotif = () => {
        if (showNotif) { setShowNotif(false); return; }
        setShowNotif(true);
        setClearError('');
        // What is in the bell now is read at once; anything newer that the
        // fresh look brings in is added to the "new" highlight as it lands.
        markSeen({ announcements, careerNotifs, jobNotifs });
        loadBell().then((fresh) => markSeen(fresh, { append: true }));
    };

    /** The bell button that is on screen (the other one is display: none). */
    const visibleBellButton = () => [notifMobileRef, notifDesktopRef]
        .map((r) => r.current?.querySelector('button[data-bell]'))
        .find((b) => b && b.getClientRects().length);
    const closeNotif = ({ refocus = false } = {}) => {
        setShowNotif(false);
        if (refocus) visibleBellButton()?.focus({ preventScroll: true });
    };
    // Escape and Android's back button close the panel, as a tap outside does.
    useBackClose(() => closeNotif({ refocus: true }), showNotif);
    useEffect(() => {
        if (!showNotif) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') closeNotif({ refocus: true }); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // closeNotif only reads refs.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showNotif]);

    /**
     * Clears every feed the student can see, and only what the server really
     * cleared. Each feed is asked on its own, and only one whose request
     * succeeded is emptied here — they used to be emptied regardless, so a
     * failed clear looked done and the items came back on the next page.
     * A feed that is locked (Jobs off, the career feed closed) is not asked.
     */
    const clearNotifications = async () => {
        setClearError('');
        const asks = [
            ['announcements', () => api.post('/user/announcements/clear')],
            careerFeedOk && ['career', () => api.delete('/career/notifications')],
            isJobsEnabled && ['jobs', () => api.delete('/jobs/notifications')]
        ].filter(Boolean);
        const results = await Promise.allSettled(asks.map(([, ask]) => ask()));
        let failed = false;
        results.forEach((r, i) => {
            if (r.status !== 'fulfilled') { failed = true; return; }
            const which = asks[i][0];
            if (which === 'announcements') setAnnouncements([]);
            if (which === 'career') setCareerNotifs([]);
            if (which === 'jobs') setJobNotifs([]);
        });
        if (failed) setClearError('Some notifications could not be cleared. Please try again.');
    };

    // Close dropdowns on outside click. "Inside" the bell is either bell's box:
    // the one on screen is the one that can be tapped.
    useEffect(() => {
        const handler = (e) => {
            const inBell = [notifMobileRef, notifDesktopRef].some((r) => r.current?.contains(e.target));
            if (!inBell) setShowNotif(false);
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) setProfileDropdownOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // The account menu: Escape closes it and hands the focus back to the avatar.
    useEffect(() => {
        if (!profileDropdownOpen) return undefined;
        const onKey = (e) => {
            if (e.key !== 'Escape') return;
            setProfileDropdownOpen(false);
            profileButtonRef.current?.focus({ preventScroll: true });
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [profileDropdownOpen]);

    // The phone's menu drawer. It is open on the page it was opened on, so
    // going anywhere else (a link in it, the back button) closes it by itself.
    const [menuOpenOn, setMenuOpenOn] = useState(null);
    const mobileMenuOpen = menuOpenOn === location.pathname;
    const menuButtonRef = useRef(null);
    const drawerCloseRef = useRef(null);
    // While closing, the drawer stays a moment so it can slide back out.
    const [menuClosing, setMenuClosing] = useState(false);
    const openMenu = () => { setMenuClosing(false); setMenuOpenOn(location.pathname); };
    // Closed from the drawer itself (its X, the dim, Escape, back): the focus
    // goes back to the menu button that opened it.
    const closeMenu = () => {
        setMenuClosing(true);
        setTimeout(() => {
            setMenuOpenOn(null);
            setMenuClosing(false);
            menuButtonRef.current?.focus({ preventScroll: true });
        }, 240);
    };
    useBackClose(closeMenu, mobileMenuOpen);
    useEffect(() => {
        if (!mobileMenuOpen) return undefined;
        // Into the drawer, so the keyboard and a screen reader start there.
        drawerCloseRef.current?.focus({ preventScroll: true });
        const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mobileMenuOpen]);

    // The logout question: Escape and Android's back button answer "Cancel".
    useBackClose(() => setShowLogoutConfirm(false), showLogoutConfirm);
    useEffect(() => {
        if (!showLogoutConfirm) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') setShowLogoutConfirm(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [showLogoutConfirm]);

    const isActive = (path) => location.pathname === path;
    // Competitions is laid out to fill the window, edge to edge,
    // rather than sit in the centred column the other pages use.
    // So are Job Preparation (/interview, /jobs), Extra Curricular, Career Path and Scholarships.
    // The Dashboard (/) too, since 2026-10-27 — matched exactly, or every page would count.
    const wide = location.pathname === '/' || ['/competitions', '/interview', '/jobs', '/extracurricular', '/career'].some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`));
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
            // English learning; withdrawn like the others when an admin locks it.
            // Opens on its dashboard (2026-10-26), and stays lit on every page of the section.
            isLinguisticEnabled && { to: '/linguistic/dashboard', section: '/linguistic', label: 'Multilingo', icon: Globe }
        ].filter(Boolean) },
        { title: 'Career', items: [
            isCareerPathEnabled && { to: '/career', label: 'Career Path', icon: Compass },
            // Job Preparation holds the mock interviews, aptitude tests and Jobs (/jobs) as tabs.
            // Scholarships is inside Career Path, after Skills, since 2026-10-27.
            { to: '/interview', label: 'Job Preparation', icon: Mic, also: '/jobs' }
        ].filter(Boolean) },
        // Games (the brain games) and Competitions (Chess, Rapid Fire, Code Clash, Brain Sprint, Quiz and Hackathon): two sections since 2026-10-23.
        { title: 'Activities', items: [{ to: '/extracurricular', label: 'Extra Curricular', icon: Shield }, { to: '/competitions', label: 'Competitions', icon: Trophy }, { to: '/games', label: 'Games', icon: Gamepad2 }] }
    ];
    const isLit = (item) => (item.exact ? isActive(item.to) : isSectionActive(item.section || item.to) || (item.also && isSectionActive(item.also)));

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

    // `where` is 'mobile' or 'desktop': which of the two bells this is, for
    // its own box (see notifMobileRef) and its own element ids.
    // The wallet in the top bar: the balance and its history, in a popup over any page.
    const [walletOpen, setWalletOpen] = useState(false);
    const closeWallet = useCallback(() => setWalletOpen(false), []);
    const renderWalletButton = (where) => rw?.wallet && (
        <button type="button" onClick={() => setWalletOpen(true)} aria-haspopup="dialog"
            aria-label={`Wallet, ${money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}`}
            className={where === 'mobile'
                ? 'rounded-full p-2 text-emerald-600 transition-colors hover:bg-slate-100'
                : 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-700 tabular-nums transition-colors hover:bg-emerald-100'}>
            <Wallet size={where === 'mobile' ? 22 : 16} aria-hidden="true" />
            {where !== 'mobile' && money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}
        </button>
    );

    const renderNotificationBell = (where) => (
    <div ref={where === 'mobile' ? notifMobileRef : notifDesktopRef} className="relative">
        <button
            type="button"
            data-bell
            onClick={openNotif}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            aria-expanded={showNotif}
            aria-controls={showNotif ? `notifications-${where}` : undefined}
            className="p-2 text-slate-600 md:text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
        >
            <Bell size={22} aria-hidden="true" className={location.pathname === '/' ? 'text-indigo-600' : ''} />
            {unreadCount > 0 && (
                <span aria-hidden="true" className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
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
                className="fixed inset-0 top-[4rem] z-[59] bg-slate-900/25 backdrop-blur-[2px] sidebar:hidden"
            />
            {/* data-loop-avoid: Loop keeps off it while it is open (loop-walker.js, AVOID). */}
            <div id={`notifications-${where}`} role="dialog" aria-labelledby={`notifications-${where}-title`} data-loop-avoid className="fixed inset-x-3 top-[4.5rem] z-[60] flex max-h-[calc(100dvh-10rem)] flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-900/20 origin-top-right sidebar:absolute sidebar:inset-x-auto sidebar:right-0 sidebar:top-12 sidebar:w-96 sidebar:max-h-[28rem] sidebar:rounded-2xl">

                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <h2 id={`notifications-${where}-title`} className="text-base font-black text-slate-900">Notifications</h2>
                        {freshKeys.length > 0 && (
                            <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-black text-white">
                                {freshKeys.length} new
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {feed.length > 0 && (
                            <button
                                type="button"
                                onClick={clearNotifications}
                                className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                                Clear all
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => closeNotif({ refocus: true })}
                            aria-label="Close notifications"
                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sidebar:hidden"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                {clearError && (
                    <p role="alert" className="shrink-0 border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700">{clearError}</p>
                )}

                {feed.length === 0 ? (
                    <div className="px-6 py-10 text-center">
                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                            <Bell size={24} aria-hidden="true" className="text-indigo-400" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Nothing new today</p>
                        <p className="mt-1 text-xs text-slate-400">Today&apos;s badges, XP and job alerts will show up here.</p>
                    </div>
                ) : (
                    <div className="relative flex min-h-0 flex-1 flex-col">
                    {/* Four rows tall; the rest are a scroll away. */}
                    <ul className="max-h-[23rem] min-h-0 space-y-1 overflow-y-auto overscroll-contain py-1.5">
                        {feed.map(item => {
                            const key = `${item.kind}-${item.id}`;
                            const look = KINDS[item.kind];
                            const fresh = freshKeys.includes(key);
                            const Icon = look.icon;
                            const rowClass = `relative mx-1.5 flex w-[calc(100%-0.75rem)] items-start gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${fresh ? 'bg-indigo-50/60' : ''}`;
                            const body = (
                                <>
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${look.tone}`}>
                                        <Icon size={18} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        {/* Said first, before the title: the dot alone tells a screen reader nothing. */}
                                        {fresh && <span className="sr-only">Unread: </span>}
                                        <span className="block line-clamp-2 pr-4 text-sm leading-snug font-bold text-slate-900">
                                            {item.title}
                                        </span>
                                        {item.body && (
                                            <span className="mt-0.5 block line-clamp-2 text-[13px] leading-snug text-slate-500">
                                                {item.body}
                                            </span>
                                        )}
                                        <span className="mt-1.5 block text-[11px] font-semibold text-slate-400">
                                            {look.label} · {timeAgo(item.at)}
                                        </span>
                                    </span>
                                    {fresh && <span aria-hidden="true" className="absolute top-4 right-3 h-2 w-2 rounded-full bg-indigo-600" />}
                                </>
                            );
                            return (
                                <li key={key}>
                                    {/* A real button where the item leads somewhere, so
                                        Enter and Space open it as a tap does; a plain
                                        notice is just text. */}
                                    {item.link ? (
                                        <button
                                            type="button"
                                            className={`${rowClass} cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 active:bg-slate-100`}
                                            onClick={() => { setShowNotif(false); navigate(item.link); }}
                                        >
                                            {body}
                                        </button>
                                    ) : (
                                        <div className={`${rowClass} cursor-default`}>{body}</div>
                                    )}
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
    if (accessHours.closed) return <PlatformClosed access={accessHours.access} onCheck={accessHours.check} onSignOut={logout} name={user?.name} />;

    return (
        <div className="flex h-visible bg-slate-50 text-slate-900 font-sans">
            {/* Raised whenever something wants to write to a student's own
                Google account. Mounted once so the explanation they read is
                written in exactly one place. */}
            <GoogleConsentDialog />
            {walletOpen && <React.Suspense fallback={null}><WalletSheet onClose={closeWallet} /></React.Suspense>}

            {/* The six sections under the thumb, mirroring the sidebar. */}
            <MobileBottomNav
                isJobsEnabled={isJobsEnabled}
                isCareerPathEnabled={isCareerPathEnabled}
                user={user}
                rewards={rw}
                onOpenWallet={() => setWalletOpen(true)}
            />

            {showContact && <ContactModal onClose={() => setShowContact(false)} user={user} page={location.pathname} />}

            {/* Logout Confirmation Modal — a named dialog; Escape and back answer Cancel. */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" aria-describedby="logout-text" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={26} aria-hidden="true" className="text-red-500" />
                            </div>
                            <h2 id="logout-title" className="text-lg font-bold text-slate-800 mb-1">Log out?</h2>
                            <p id="logout-text" className="text-slate-500 text-sm">Are you sure you want to log out of your account?</p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmLogout}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
                            >
                                Yes, Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop Sidebar. data-loop-skip, here and on the other bars:
                Loop the mascot leaves the navigation alone (see App.jsx). */}
            <aside data-loop-skip className="hidden sidebar:flex w-64 bg-white text-slate-700 border-r border-slate-200 flex-col z-10">
                <div className="flex items-center justify-center border-b border-slate-100 bg-white px-6 py-4">
                    {/* Dark-lettered logo: the original is white artwork for a dark ground. */}
                    <Link to="/" aria-label="Yaticorp LMS, go to Dashboard" className="block w-full rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"><img src="/assets/YATICORP-dark.png" alt="Yaticorp LMS" className="h-10 object-contain w-full" /></Link>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                    {renderNavLinks()}
                </nav>

                {/* Sidebar footer — contact support. My Profile opens from the
                    photo menu in the top bar (and the mobile drawer). */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-2">
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
                data-loop-skip
                className="sidebar:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4"
            >
                <div className="flex min-w-0 shrink items-center">
                    <Link to="/" aria-label="Yaticorp LMS, go to Dashboard" className="flex min-w-0 rounded-lg active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"><img src="/assets/YATICORP-dark.png" alt="Yaticorp LMS" className="h-8 max-w-full object-contain" /></Link>
                </div>
                <div className="flex min-w-0 items-center gap-1.5">
                    {/* The bell sets its own slate colour, so a colour on this
                        wrapper alone never reaches it — these descendant rules
                        do. Emerald to match the wallet beside it; the unread
                        badge keeps its own red. Scoped to the bell button
                        itself ([data-bell]): the panel it opens is inside this
                        wrapper too, and its rows and icons turned emerald with it. */}
                    <div className="flex shrink-0 items-center gap-1 [&_[data-bell]]:text-emerald-600 [&_[data-bell]:hover]:bg-slate-100 [&_[data-bell]_svg]:text-emerald-600">
                        <LanguageToggle />
                        {renderNotificationBell('mobile')}
                    </div>
                    {/* data-loop-quiet: the mascot does not explain the menu
                        button (or its Close partner) — it talked over every
                        opening of the sidebar. */}
                    <button ref={menuButtonRef} type="button" onClick={openMenu} aria-label="Open menu" aria-expanded={mobileMenuOpen} aria-controls={mobileMenuOpen ? 'mobile-menu' : undefined} data-loop-quiet className="shrink-0 p-2 text-slate-700">
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
                <div id="mobile-menu" data-loop-skip className={`sidebar:hidden fixed inset-0 z-50 flex ${menuClosing ? 'drawer-closing' : ''}`} role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="drawer-dim fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closeMenu}></div>
                    {/* The whole drawer scrolls, not the menu inside it. On a phone
                        turned sideways — 384px tall — the logo above and the card,
                        Contact Support and Logout below left the menu its own
                        scrolling strip about two items high. The close button stays
                        pinned at the top while the rest moves. */}
                    <div className="drawer-panel relative w-4/5 max-w-sm bg-white text-slate-700 h-full flex flex-col overflow-y-auto shadow-2xl border-r border-slate-200">
                        <div className="sticky top-0 z-10 p-4 flex items-center justify-between border-b border-slate-100 bg-white">
                            <Link to="/" onClick={() => setMenuOpenOn(null)} aria-label="Yaticorp LMS, go to Dashboard" className="flex rounded-lg active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"><img src="/assets/YATICORP-dark.png" alt="Yaticorp LMS" className="h-8 object-contain" /></Link>
                            <button ref={drawerCloseRef} type="button" onClick={closeMenu} aria-label="Close menu" data-loop-quiet className="p-2 text-slate-400 hover:text-slate-700">
                                <X size={24} aria-hidden="true" />
                            </button>
                        </div>
                        <nav className="drawer-nav flex-1 p-4">
                            {renderNavLinks(() => setMenuOpenOn(null))}
                        </nav>
                        <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-3">
                            {/* Profile card in mobile drawer — opens My Profile,
                                which is no longer in the nav list above. */}
                            <Link
                                to="/profile"
                                onClick={() => setMenuOpenOn(null)}
                                aria-label="My Profile"
                                className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-4 text-white shadow-lg shadow-indigo-500/25 transition-transform active:scale-[0.98] ${isActive('/profile') ? 'ring-2 ring-indigo-300 ring-offset-2' : ''}`}
                            >
                                {/* Soft light and a ring of glass behind, like a member card. */}
                                <span aria-hidden="true" className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
                                <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full border-[14px] border-white/10" />

                                <div className="relative flex items-center gap-3">
                                    <span className="relative shrink-0">
                                        <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-bold ring-2 ring-white/70">
                                            <ProfileImage src={user?.profilePicture} alt={user?.name} className="h-full w-full object-cover" fallback={getInitials(user?.name)} />
                                        </span>
                                        {rw?.level && (
                                            <span className="absolute -right-1.5 -bottom-1 rounded-full bg-amber-300 px-1.5 text-[10px] leading-4 font-black text-amber-950 ring-2 ring-violet-600">Lv {rw.level.level}</span>
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[10px] font-bold tracking-[0.18em] text-white/70 uppercase">Student</span>
                                        <span className="block truncate text-base leading-tight font-bold">{user?.name}</span>
                                        {user?.cardNumber && <span className="mt-0.5 block truncate font-mono text-[11px] tracking-wider text-white/75" translate="no">{user.cardNumber}</span>}
                                    </span>
                                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 transition-transform group-hover:translate-x-0.5">
                                        <ChevronRight size={16} />
                                    </span>
                                </div>

                                <div className="relative mt-3.5 flex items-center justify-between gap-2 rounded-xl bg-white/12 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-white/85"><User size={13} aria-hidden="true" /> My Profile</span>
                                    {/* The wallet balance, where credits used to be shown. */}
                                    {rw?.wallet && (
                                        <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-emerald-700 tabular-nums shadow-sm">
                                            <Wallet size={12} aria-hidden="true" />
                                            {money(balance(rw.wallet.available), rw.wallet.currency || 'INR')}
                                        </span>
                                    )}
                                </div>
                            </Link>
                            {/* Logout sits in this pinned footer, beside
                                Contact Support, so it is always on screen. At
                                the end of the scrolling nav it was hidden below
                                the fold, and nothing hinted the list scrolled. */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setMenuOpenOn(null); setShowContact(true); }}
                                    className="flex items-center justify-center space-x-2 bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-600 hover:text-white w-full py-3 rounded-xl transition-all duration-200 font-bold"
                                >
                                    <MessageCircleQuestion size={20} /> <span>Support</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMenuOpenOn(null); handleLogout(); }}
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
            {/* scroll-pt-16: the top 4rem of this scroller is under a header —
                the phone's fixed top bar, the desktop's sticky one — so
                anything scrolled to (a #wallet link, a tab strip, a focused
                field) lands below it rather than behind it. */}
            <main ref={mainRef} className="flex-1 overflow-auto overscroll-y-contain scroll-pt-16 bg-slate-50 sidebar:pt-0 pt-16 relative">
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
                <header data-loop-skip className="hidden sidebar:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">
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

                        {renderWalletButton('desktop')}
                        <LanguageToggle />
                        {renderNotificationBell('desktop')}
                        <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

                        {/* Profile avatar dropdown — top-right header */}
                        <div ref={profileDropdownRef} className="relative">
                            <button
                                ref={profileButtonRef}
                                type="button"
                                onClick={() => setProfileDropdownOpen(v => !v)}
                                aria-haspopup="true"
                                aria-expanded={profileDropdownOpen}
                                aria-controls={profileDropdownOpen ? 'account-menu' : undefined}
                                aria-label="Account menu"
                                className="flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 transition-colors hover:bg-slate-50"
                            >
                                <span className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-indigo-100 hover:ring-indigo-300 transition-all duration-200 overflow-hidden">
                                    <ProfileImage src={user?.profilePicture} alt={user?.name} className="w-full h-full object-cover" fallback={getInitials(user?.name)} />
                                </span>
                                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${profileDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                            </button>

                            {/* Dropdown panel */}
                            {profileDropdownOpen && (
                                <div id="account-menu" data-loop-avoid className="absolute right-0 top-12 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
                                    {/* User info header */}
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col items-center gap-2 text-center">
                                        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                            <ProfileImage src={user?.profilePicture} alt={user?.name} className="w-full h-full object-cover" fallback={getInitials(user?.name)} />
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
                    the bar. `min-h` keeps short pages filling the screen.

                    And room for Yati standing in its corner (asked
                    2026-10-15, "loop walker is hiding the background"): the
                    walker sets --yati-room to how far up the screen it
                    reaches, so the last card can always be scrolled clear of
                    it. 0 while Yati is hidden (learning screens). */}
                <ScrollReset scrollerRef={mainRef} />
                <div className={`mx-auto min-h-[calc(100vh-4rem)] p-4 pb-[max(7.5rem,var(--yati-room,0px))] sidebar:p-8 sidebar:pb-[max(2rem,var(--yati-room,0px))] ${wide ? 'max-w-none' : 'max-w-7xl'}`}>
                    <Outlet />
                </div>
            </main>
            {/* A match or Quiz Arena just opened for me: my joining code, on screen. */}
            <CompetitionAlerts />
            {/* No profile picture yet: choose one before going on. */}
            <ProfilePictureGate />
            {/* "A new Global Quiz is live", when one is published; waits while the student is busy. */}
            <GlobalQuizAlert />
            {/* The leaderboard climb, on whichever page the student is on. */}
            <RankUpWatcher />
        </div>
    );
};

export default StudentLayout;
