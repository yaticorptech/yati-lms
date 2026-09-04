/**
 * @author Preethesh Kulal
 * @description Main admin panel layout with sidebar navigation and header
 */
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, BookOpen, Layers, LogOut,
    Network, Shield, MessageCircleQuestion, RefreshCw,
    ExternalLink, MessageSquare, Menu, X, BarChart2, Megaphone, Settings, User, Compass, Briefcase, Gift } from 'lucide-react';
import api from '../utils/api';
import useAutoLogout from "../utils/useAutoLogout";

const AdminLayout = () => {
    const { showSessionModal, confirmLogout } = useAutoLogout(); 
    const { admin, logout } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [openTickets, setOpenTickets] = useState(0);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const profileDropdownRef = useRef(null);

    const handleLogout = () => { setProfileDropdownOpen(false); setShowLogoutConfirm(true); };
    const confirmManualLogout = () => { setShowLogoutConfirm(false); logout(); };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

    // Get initials from name
    const getInitials = (name = '') =>
        name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

    useEffect(() => {
        api.get('/admin/tickets?status=open').then(r => setOpenTickets(r.data.length)).catch(() => { });
    }, [location.pathname]);

    // Collapse the mobile sidebar on navigation. Adjusting during render (the
    // pattern React documents for "reset state when a value changes") avoids
    // the extra commit an effect would cause.
    const [lastPath, setLastPath] = useState(location.pathname);
    if (lastPath !== location.pathname) {
        setLastPath(location.pathname);
        setIsSidebarOpen(false);
    }

    // Close profile dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* ✅ SESSION TIMEOUT MODAL (ADD THIS FIRST) */}
    {showSessionModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                
                <div className="p-6 text-center">
                    <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        ⏳
                    </div>

                    <h2 className="text-lg font-bold text-slate-800 mb-1">
                        Session Expired
                    </h2>

                    <p className="text-slate-500 text-sm">
                        Your session has expired. Please login again.
                    </p>
                </div>

                <div className="px-6 pb-6">
                    <button
                        onClick={confirmLogout}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
                    >
                        OK
                    </button>
                </div>

            </div>
        </div>
    )}
            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                        <div className="p-6 text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <LogOut size={26} className="text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-1">Log out?</h2>
                            <p className="text-slate-500 text-sm">Are you sure you want to log out of the admin panel?</p>
                        </div>
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                              onClick={confirmManualLogout}
                                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors"
                            >
                                Yes, Log out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar Overlay (Mobile only) */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-50 
                transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <img src="/assets/YATICORP.png" alt="Yaticorp LMS" className="h-8 object-contain" />
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white p-1">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
                    <Link to="/" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
                    </Link>
                    <Link to="/users" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/users') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Users size={20} /> <span className="font-medium">Users</span>
                    </Link>
                    <Link to="/courses" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/courses') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <BookOpen size={20} /> <span className="font-medium">Courses</span>
                    </Link>
                    <Link to="/bundles" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/bundles') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Layers size={20} /> <span className="font-medium">Bundles</span>
                    </Link>
                    <Link to="/community" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/community') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <MessageSquare size={20} /> <span className="font-medium">Community</span>
                    </Link>
                    <Link to="/enrollments" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/enrollments') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Network size={20} /> <span className="font-medium">Enrollments</span>
                    </Link>
                    <Link to="/tickets" className={`flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${isActive('/tickets') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <div className="flex items-center space-x-3">
                            <MessageCircleQuestion size={20} /> <span className="font-medium">Support</span>
                        </div>
                        {openTickets > 0 && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isActive('/tickets') ? 'bg-white/20 text-white' : 'bg-red-500 text-white animate-pulse'}`}>{openTickets}</span>}
                    </Link>
                    <Link to="/analytics" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/analytics') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <BarChart2 size={20} /> <span className="font-medium">Analytics</span>
                    </Link>
                    <Link to="/career-path" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/career-path') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Compass size={20} /> <span className="font-medium">Career Path</span>
                    </Link>
                    <Link to="/jobs" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/jobs') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Briefcase size={20} /> <span className="font-medium">Jobs</span>
                    </Link>
                    <Link to="/rewards" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/rewards') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Gift size={20} /> <span className="font-medium">Rewards</span>
                    </Link>
                    <Link to="/announcements" className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${isActive('/announcements') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Megaphone size={20} /> <span className="font-medium">Announcements</span>
                    </Link>
                </nav>

                {/* Sidebar footer — student portal link only */}
                <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                    <a
                        href={import.meta.env.VITE_STUDENT_URL || 'http://localhost:5174'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-3 p-3 text-indigo-400 hover:text-white hover:bg-indigo-600/10 rounded-xl transition-all"
                    >
                        <ExternalLink size={18} /> <span className="font-medium text-sm">Student Portal</span>
                    </a>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden">
                {/* Top Bar */}
                <header className="h-16 lg:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shrink-0 relative z-30">
                    {/* Mobile hamburger */}
                    <div className="flex items-center lg:hidden">
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                            <Menu size={24} />
                        </button>
                    </div>

                    <div className="hidden lg:block flex-1" />

                    <div className="flex items-center space-x-3">
                        {/* Refresh button */}
                        <button
                            onClick={() => window.location.reload()}
                            className="flex items-center justify-center bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white w-10 h-10 rounded-xl shadow-sm transition-all group"
                            title="Refresh Data"
                        >
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
                        </button>

                        {/* Profile avatar + dropdown */}
                        <div ref={profileDropdownRef} className="relative">
                            <button
                                onClick={() => setProfileDropdownOpen(v => !v)}
                                className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-indigo-100 hover:ring-indigo-300 transition-all duration-200 overflow-hidden"
                            >
                                {admin?.profilePicture ? (
                                    <img src={admin.profilePicture} alt={admin.name} className="w-full h-full object-cover" />
                                ) : (
                                    getInitials(admin?.name)
                                )}
                            </button>

                            {/* Dropdown panel */}
                            {profileDropdownOpen && (
                                <div className="absolute right-0 top-13 mt-1 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] overflow-hidden">
                                    {/* Admin info header */}
                                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col items-center gap-2 text-center">
                                        <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                                            {admin?.profilePicture ? (
                                                <img src={admin.profilePicture} alt={admin.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getInitials(admin?.name)
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{admin?.name}</p>
                                            <p className="text-xs text-slate-400">{admin?.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                            Administrator
                                        </div>
                                    </div>

                                    {/* Menu items */}
                                    <div className="p-2">
                                        <Link
                                            to="/settings"
                                            onClick={() => setProfileDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                        >
                                            <Settings size={16} className="text-slate-400" /> Settings
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

                {/* Page Content Area */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;