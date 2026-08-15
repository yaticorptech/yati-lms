/**
 * @author Preethesh Kulal
 * @description Main student layout with sidebar, search, notifications and profile dropdown
 */
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, User, LogOut, Menu, X, MessageCircleQuestion, Send, CheckCircle2, BookOpen, MessageSquare, Award, Bell, Search, Megaphone } from 'lucide-react';
import api from '../utils/api';

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
    const { user, logout, isCreditSystemEnabled } = useContext(AuthContext);
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
    const [announcements, setAnnouncements] = useState([]);
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
    }, [location.pathname]);

    const unreadCount = Math.max(0, announcements.length - notifSeen);

    const openNotif = () => {
        setShowNotif(v => !v);
        const seen = announcements.length;
        setNotifSeen(seen);
        localStorage.setItem('notif_seen', String(seen));
    };

    const clearNotifications = async () => {
    console.log("CLEAR CLICKED");

    try {
        await api.post('/user/announcements/clear');

        // clear UI
        setAnnouncements([]);

        // reset badge
        setNotifSeen(0);
        localStorage.setItem('notif_seen', '0');

    } catch (err) {
        console.error(err);
    }
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
            try {
                const res = await api.get(`/user/search?q=${encodeURIComponent(val)}`);
                setSearchResults(res.data);
            } catch {
                // Search is best-effort; a failed lookup just shows no results.
            }
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

    const isActive = (path) => location.pathname === path;

    // Get initials from name
    const getInitials = (name = '') =>
        name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    // Render helpers, not components: inlining them keeps the subtree from
    // remounting on every parent render.
    const renderNavLinks = (onClick) => (
        <>
            <Link to="/" onClick={onClick} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 font-medium ${isActive('/') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <LayoutDashboard size={20} /> <span>Dashboard</span>
            </Link>
            <Link to="/enrolled-courses" onClick={onClick} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 font-medium ${isActive('/enrolled-courses') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <BookOpen size={20} /> <span>Enrolled Courses</span>
            </Link>
            <Link to="/community" onClick={onClick} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 font-medium ${isActive('/community') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
                <MessageSquare size={20} /> <span>Community</span>
            </Link>
            <Link to="/profile" onClick={onClick} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 font-medium ${isActive('/profile') ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
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
                        Announcements
                    </p>

                    {/* ✅ MODERN GLASS BUTTON */}
                    {announcements.length > 0 && (
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
                {announcements.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No announcements yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {[...announcements].reverse().map(a => (
                            <div
                                key={a._id}
                                className="px-4 py-4 hover:bg-slate-50 transition-colors cursor-default"
                            >
                                <p className="font-bold text-slate-800 text-sm leading-tight">
                                    {a.title}
                                </p>
                                <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                                    {a.message}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                    <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                        {new Date(a.createdAt).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
    </div>
);
    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
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

                {/* Search bar in sidebar */}
                <div ref={searchRef} className="px-4 pt-4 relative">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search lessons, courses..."
                            value={searchQ}
                            onChange={e => handleSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-800 text-slate-200 placeholder-slate-500 text-sm rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none"
                        />
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    </div>
                    {searchResults && (
                        <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 max-h-72 overflow-y-auto">
                            {searchResults.courses?.length === 0 && searchResults.lessons?.length === 0 ? (
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
                                </>
                            )}
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-2">
                    {renderNavLinks()}
                </nav>

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
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-slate-800">
                            {isActive('/') ? 'My Learning Dashboard' :
                             isActive('/enrolled-courses') ? 'Enrolled Courses' :
                             isActive('/community') ? 'Student Community' :
                             isActive('/profile') ? 'My Profile' : ''}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        {renderNotificationBell()}
                        <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>

                        {/* Profile avatar dropdown — top-right header */}
                        <div ref={profileDropdownRef} className="relative">
                            <button
                                onClick={() => setProfileDropdownOpen(v => !v)}
                                className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-indigo-100 hover:ring-indigo-300 transition-all duration-200 overflow-hidden"
                            >
                                {user?.profilePicture ? (
                                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(user?.name)
                                )}
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

                <div className="p-4 md:p-8 max-w-7xl mx-auto h-full min-h-[calc(100vh-4rem)]">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;
