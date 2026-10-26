/**
 * The teacher dashboard's frame. From the sidebar breakpoint up: a sidebar
 * with the six tools grouped as Research and Writing, and the teacher at its
 * foot. Below it: a top bar with a menu, and a bottom bar with the five
 * places a teacher goes most.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FlaskConical, Route, BookMarked, FileText, ShieldCheck, PenLine, LogOut, Menu, X, UserCircle2, Users
} from 'lucide-react';
import { useTeacher } from './useTeacher';
import useBackClose from '../native/useBackClose';
import { isEmbedded } from './teacherSession';

const NAV = [
    { items: [{ to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
    {
        title: 'Research', items: [
            { to: '/teacher/methods', label: 'Research Methodologies', short: 'Methods', icon: FlaskConical },
            { to: '/teacher/research-path', label: 'Research Path', short: 'Path', icon: Route },
            { to: '/teacher/publications', label: 'Publications Map', short: 'Papers', icon: BookMarked }
        ]
    },
    {
        title: 'Writing', items: [
            { to: '/teacher/thesis', label: 'Thesis Writing', short: 'Thesis', icon: FileText },
            { to: '/teacher/writing', label: 'Independent Writing', short: 'Writing', icon: PenLine },
            { to: '/teacher/plagiarism', label: 'Plagiarism Check', short: 'Check', icon: ShieldCheck }
        ]
    },
    // The clubs the organization put this teacher in charge of (pages/Clubs.jsx).
    { title: 'Activities', items: [{ to: '/teacher/clubs', label: 'My Clubs', short: 'Clubs', icon: Users }] }
];
const BOTTOM = ['/teacher', '/teacher/research-path', '/teacher/publications', '/teacher/thesis', '/teacher/writing'];
const ALL = NAV.flatMap((g) => g.items);

const initials = (name) => (name || '').trim().split(/\s+/).filter((w) => !/^(dr|prof|mr|mrs|ms)\.?$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'T';

const navClass = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

const NavList = ({ onPick }) => (
    <nav aria-label="Teacher" className="space-y-5">
        {NAV.map((group, i) => (
            <div key={group.title || i}>
                {group.title && <p className="mb-1.5 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{group.title}</p>}
                <div className="space-y-1">
                    {group.items.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} onClick={onPick} className={navClass}>
                            <item.icon size={19} aria-hidden="true" /> <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
        ))}
    </nav>
);

const Brand = () => (
    <Link to="/teacher" className="flex min-w-0 items-center gap-2">
        <img src="/assets/YATICORP-dark.png" alt="Yaticorp" className="h-7 max-w-[8.5rem] object-contain" />
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">Teacher</span>
    </Link>
);

const Me = ({ teacher }) => (
    <Link to="/teacher/profile" className="flex min-w-0 items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-3 text-white shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-black">{initials(teacher?.name)}</span>
        <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{teacher?.name || 'Teacher'}</span>
            <span className="block truncate text-xs text-emerald-100">{teacher?.designation || teacher?.institution || 'My profile'}</span>
        </span>
    </Link>
);

export default function TeacherLayout() {
    const { teacher, signOut } = useTeacher();
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    useBackClose(() => setMenuOpen(false), menuOpen);
    useEffect(() => { window.scrollTo?.(0, 0); }, [location.pathname]);

    // Opened from the organization panel's Research tab: the page alone; the panel has the tabs.
    if (isEmbedded()) return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><Outlet /></main>;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white sidebar:flex">
                <div className="flex h-16 items-center border-b border-slate-100 px-5"><Brand /></div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5"><NavList /></div>
                <div className="space-y-2 border-t border-slate-100 p-3">
                    <Me teacher={teacher} />
                    <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><LogOut size={16} aria-hidden="true" /> Sign out</button>
                </div>
            </aside>

            {/* Phone and tablet top bar */}
            <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sidebar:hidden">
                <Brand />
                <div className="flex items-center gap-1">
                    <Link to="/teacher/profile" aria-label="My profile" className="rounded-full p-2 text-slate-600 hover:bg-slate-100"><UserCircle2 size={22} /></Link>
                    <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="rounded-full p-2 text-slate-600 hover:bg-slate-100"><Menu size={22} /></button>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-[60] sidebar:hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-white shadow-2xl">
                        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
                            <span className="text-sm font-black text-slate-900">Menu</span>
                            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4"><NavList onPick={() => setMenuOpen(false)} /></div>
                        <div className="space-y-2 border-t border-slate-100 p-3" onClick={(e) => { if (e.target.closest('a')) setMenuOpen(false); }}>
                            <Me teacher={teacher} />
                            <button type="button" onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"><LogOut size={16} aria-hidden="true" /> Sign out</button>
                        </div>
                    </div>
                </div>
            )}

            <main className="px-4 pb-28 pt-20 sidebar:ml-64 sidebar:px-8 sidebar:pb-10 sidebar:pt-8">
                <div className="mx-auto w-full max-w-6xl">
                    <Outlet />
                </div>
            </main>

            {/* Phone bottom bar */}
            <nav aria-label="Teacher shortcuts" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sidebar:hidden">
                <div className="mx-auto grid max-w-lg grid-cols-5">
                    {BOTTOM.map((to) => {
                        const item = ALL.find((x) => x.to === to);
                        return (
                            <NavLink key={to} to={to} end={item.end}
                                className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                                <item.icon size={20} aria-hidden="true" />
                                <span>{item.short || 'Home'}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
