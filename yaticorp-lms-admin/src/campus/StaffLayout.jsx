/**
 * The shell of a Campus-only sign-in (2026-11-19): a department's office, the examination board
 * or the admission office. These sign-ins reach Campus and nothing else of the organization, so
 * they get Campus's pages (under /organization/campus) with their own menu instead of the
 * organization's dashboard. Rendered by layouts/OrgAdminLayout.jsx, which keeps the session
 * timeout and the sign-out confirmation; phones get the menu as the strip on top of every Campus
 * page (CampusLayout.jsx).
 */
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { LogOut, Lock, RefreshCw, School } from 'lucide-react';
import initials from '../utils/initials';
import { campusMenuFor, CAMPUS_ROLE_LABEL } from './menu';

const inside = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

export default function CampusStaffLayout({ role, organization, admin, badge, badgeSmall, onLogout, children }) {
    const { pathname } = useLocation();
    const menu = campusMenuFor(role);
    const [accountOpen, setAccountOpen] = useState(false);
    const accountRef = useRef(null);
    // A new page closes the account menu.
    const [lastPath, setLastPath] = useState(pathname);
    if (lastPath !== pathname) { setLastPath(pathname); setAccountOpen(false); }
    useEffect(() => {
        const away = (e) => { if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false); };
        const key = (e) => { if (e.key === 'Escape') setAccountOpen(false); };
        document.addEventListener('mousedown', away);
        document.addEventListener('keydown', key);
        return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key); };
    }, []);

    // Anywhere outside its own menu — the organization's dashboard, another role's page — goes home.
    if (!menu.some((m) => inside(pathname, m.to))) return <Navigate to={menu[0].to} replace />;

    return (
        <div className="flex h-dvh overflow-hidden bg-slate-50 font-sans text-gray-900">
            <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white text-slate-700 lg:flex">
                <div className="border-b border-slate-100 p-5">
                    <div className="flex items-center gap-3">
                        {badge}
                        <div className="min-w-0">
                            <p className="truncate font-bold text-slate-900" title={organization.name}>{organization.name}</p>
                            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-600"><School size={12} aria-hidden="true" /> Campus</p>
                        </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{CAMPUS_ROLE_LABEL[role]}</p>
                        <p className="truncate text-sm font-semibold text-slate-800" title={admin?.name}>{admin?.name}</p>
                    </div>
                </div>
                <nav className="flex-1 space-y-1.5 overflow-y-auto p-4 custom-scrollbar" aria-label="Campus">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Menu</p>
                    {menu.map(({ to, label, icon: Icon, soon }) => {
                        const active = inside(pathname, to);
                        return (
                            <Link key={to} to={to} aria-current={active ? 'page' : undefined}
                                className={`flex items-center justify-between rounded-xl p-3 transition-all duration-200 ${active ? (soon ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20') : soon ? 'text-slate-400 grayscale hover:bg-slate-50' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
                                <span className="flex items-center space-x-3"><Icon size={20} aria-hidden="true" /> <span className="font-medium">{label}</span></span>
                                {soon && <Lock size={13} aria-label="Locked" />}
                            </Link>
                        );
                    })}
                </nav>
                <div className="shrink-0 border-t border-slate-100 p-4">
                    <button type="button" onClick={onLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                        <LogOut size={17} aria-hidden="true" /> Log out
                    </button>
                </div>
            </aside>

            <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
                <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:h-20 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <span className="lg:hidden">{badgeSmall}</span>
                        <p className="min-w-0 truncate text-base font-bold text-slate-900 lg:hidden">{organization.name}</p>
                        <span className="hidden items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 ring-1 ring-indigo-100 sm:inline-flex">
                            <School size={13} aria-hidden="true" /> {CAMPUS_ROLE_LABEL[role]}
                        </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                        <button onClick={() => window.location.reload()} title="Refresh data" aria-label="Refresh data"
                            className="group hidden h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-sm transition-all hover:bg-indigo-600 hover:text-white sm:flex">
                            <RefreshCw size={18} className="transition-transform duration-700 group-hover:rotate-180" />
                        </button>
                        <div ref={accountRef} className="relative">
                            <button onClick={() => setAccountOpen((v) => !v)} aria-label="Account menu" aria-expanded={accountOpen}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white ring-2 ring-indigo-100 transition-all duration-200 hover:ring-indigo-300">
                                {initials(admin?.name)}
                            </button>
                            {accountOpen && (
                                <div className="absolute right-0 top-12 z-[60] w-64 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
                                    <div className="flex flex-col items-center gap-2 border-b border-slate-100 bg-slate-50 p-4 text-center">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">{initials(admin?.name)}</div>
                                        <div className="min-w-0 max-w-full">
                                            <p className="truncate text-sm font-bold text-slate-800">{admin?.name}</p>
                                            <p className="truncate text-xs text-slate-400">{admin?.email}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600">
                                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> {CAMPUS_ROLE_LABEL[role]}
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <button onClick={() => { setAccountOpen(false); onLogout(); }}
                                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600">
                                            <LogOut size={16} className="text-red-400" /> Log out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 pb-10 custom-scrollbar lg:p-8">
                    <div className="w-full">{children}</div>
                </div>
            </main>
        </div>
    );
}
