/**
 * The teacher dashboard's frame. From the sidebar breakpoint up: a sidebar
 * with the six tools grouped as Research and Writing, and the teacher at its
 * foot. Below it: a top bar with a menu, and a bottom bar with the five
 * places a teacher goes most.
 */
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FlaskConical, Route, BookMarked, FileText, ShieldCheck, PenLine, LogOut, Menu, X, Users, Compass
} from 'lucide-react';
import { useTeacher, hasResearch } from './useTeacher';
import useBackClose from '../native/useBackClose';
import TeacherBottomNav from './TeacherBottomNav';
import { colorOf } from './kit';
import { TeacherAvatar } from './ui';
import { isEmbedded } from './teacherSession';

const NAV = [
    { items: [{ to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true, color: 'emerald' }] },
    {
        title: 'Research', items: [
            { to: '/teacher/methods', label: 'Research Methodologies', short: 'Methods', icon: FlaskConical, color: 'sky' },
            { to: '/teacher/research-path', label: 'Research Path', short: 'Path', icon: Route, color: 'emerald' },
            { to: '/teacher/publications', label: 'Publications Map', short: 'Papers', icon: BookMarked, color: 'violet' }
        ]
    },
    {
        title: 'Writing', items: [
            { to: '/teacher/thesis', label: 'Thesis Writing', short: 'Thesis', icon: FileText, color: 'amber' },
            { to: '/teacher/writing', label: 'Independent Writing', short: 'Writing', icon: PenLine, color: 'rose' },
            { to: '/teacher/plagiarism', label: 'Plagiarism Check', short: 'Check', icon: ShieldCheck, color: 'indigo' }
        ]
    },
    // The clubs the organization put this teacher in charge of (pages/Clubs.jsx),
    // and the Scouts & Guides units it made them a leader of (pages/ScoutUnits.jsx).
    { title: 'Activities', items: [
        { to: '/teacher/clubs', label: 'My Clubs', short: 'Clubs', icon: Users },
        { to: '/teacher/scout-units', label: 'My Units', short: 'Units', icon: Compass }
    ] }
];
const BOTTOM = ['/teacher', '/teacher/research-path', '/teacher/publications', '/teacher/thesis', '/teacher/writing'];
const ALL = NAV.flatMap((g) => g.items);
// A teacher without an AI card (a club or Scouts leader) has only their units and clubs.
const ACTIVITIES_NAV = [{ title: 'Activities', items: [
    { to: '/teacher/scout-units', label: 'My Units', short: 'Units', icon: Compass, color: 'amber' },
    { to: '/teacher/clubs', label: 'My Clubs', short: 'Clubs', icon: Users, color: 'violet' }
] }];


// Every item's icon in its section's colour; the current page's row tinted with it.
const navClass = (color) => ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? colorOf(color).nav : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;

const NavList = ({ onPick, nav }) => (
    <nav aria-label="Teacher" className="space-y-6">
        {nav.map((group, i) => (
            <div key={group.title || i}>
                {group.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.title}</p>}
                <div className="space-y-0.5">
                    {group.items.map((item) => (
                        <NavLink key={item.to} to={item.to} end={item.end} onClick={onPick} className={navClass(item.color)}>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${colorOf(item.color).soft}`}><item.icon size={16} aria-hidden="true" /></span> <span>{item.label}</span>
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
        <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">Teacher</span>
    </Link>
);

const Me = ({ teacher }) => (
    <Link to="/teacher/profile" className="flex min-w-0 items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50">
        <TeacherAvatar teacher={teacher} />
        <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">{teacher?.name || 'Teacher'}</span>
            <span className="block truncate text-xs text-slate-500">{teacher?.designation || teacher?.institution || 'My profile'}</span>
        </span>
    </Link>
);

const SignOut = ({ onClick }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
        <LogOut size={18} className="text-slate-400" aria-hidden="true" /> Sign out
    </button>
);

export default function TeacherLayout() {
    const { teacher, signOut } = useTeacher();
    const research = hasResearch(teacher);
    const nav = research ? NAV : ACTIVITIES_NAV;
    const [menuOpen, setMenuOpen] = useState(false);
    const location = useLocation();
    useBackClose(() => setMenuOpen(false), menuOpen);
    useEffect(() => { window.scrollTo?.(0, 0); }, [location.pathname]);
    // Inter on the teacher side, popups included (they render outside this tree).
    useEffect(() => {
        document.body.classList.add('teacher-ui');
        return () => document.body.classList.remove('teacher-ui');
    }, []);

    // Opened from the organization panel's Research tab: the page alone; the panel has the tabs.
    if (isEmbedded()) return <main className="min-h-screen bg-slate-50 p-4 sm:p-6"><Outlet /></main>;

    return (
        <div className="min-h-screen bg-slate-50/80">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white sidebar:flex">
                <div className="flex h-16 items-center border-b border-slate-200 px-5"><Brand /></div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5"><NavList nav={nav} /></div>
                <div className="space-y-1 border-t border-slate-200 p-3">
                    <Me teacher={teacher} />
                    <SignOut onClick={signOut} />
                </div>
            </aside>

            {/* Phone and tablet top bar */}
            <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sidebar:hidden">
                <Brand />
                <div className="flex items-center gap-1">
                    <Link to="/teacher/profile" aria-label="My profile" className="rounded-full p-1 hover:bg-slate-100"><TeacherAvatar teacher={teacher} className="h-8 w-8 text-[11px]" /></Link>
                    <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" aria-expanded={menuOpen} className="rounded-full p-2 text-slate-600 hover:bg-slate-100"><Menu size={22} /></button>
                </div>
            </header>

            {menuOpen && (
                <div className="fixed inset-0 z-[60] sidebar:hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col bg-white shadow-2xl">
                        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
                            <span className="text-sm font-semibold text-slate-900">Menu</span>
                            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4"><NavList nav={nav} onPick={() => setMenuOpen(false)} /></div>
                        <div className="space-y-1 border-t border-slate-200 p-3" onClick={(e) => { if (e.target.closest('a')) setMenuOpen(false); }}>
                            <Me teacher={teacher} />
                            <SignOut onClick={signOut} />
                        </div>
                    </div>
                </div>
            )}

            <main className="px-4 pb-28 pt-20 sidebar:ml-64 sidebar:px-8 sidebar:pb-10 sidebar:pt-8">
                <div className="mx-auto w-full max-w-6xl">
                    <Outlet />
                </div>
            </main>

            {/* Phone bottom bar, in the students' style */}
            <TeacherBottomNav items={research ? BOTTOM.map((to) => ALL.find((x) => x.to === to)) : ACTIVITIES_NAV[0].items} />
        </div>
    );
}
