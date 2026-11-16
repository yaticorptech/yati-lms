/**
 * YATICORP Institution — Campus, the student management system, as its own app.
 *
 * Four kinds of sign-in, one menu each (the server enforces the same, src/campus/orgAdmin.js):
 *   admin       the organization: every page, every department, Departments and the Exam board
 *   department  a department's office: its own admissions, subjects, attendance, internal marks, fees, feedback
 *   board       the examination board: semester exams, marks entry, marks cards and publishing
 *   admission   the admission office: new admissions for every department, students' records, fees at the counter
 *   teacher     My classes: attendance and internal marks for the subjects they teach
 */
import React, { createContext, Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, UserPlus, BookOpen, CalendarCheck, ClipboardList, Wallet, Landmark, MessageSquareText,
    Building2, Presentation, CalendarRange, LogOut, Loader2, Lock, ChevronDown, Inbox, Megaphone
} from 'lucide-react';
import { useAuth } from './auth';
import { ToastHost, Select, Button, SOON, SoonBadge, ComingSoonPage } from './ui';

const Overview = React.lazy(() => import('./pages/Overview'));
const Admissions = React.lazy(() => import('./pages/Admissions'));
const Requests = React.lazy(() => import('./pages/Requests'));
const Announcements = React.lazy(() => import('./pages/Announcements'));
const Subjects = React.lazy(() => import('./pages/Subjects'));
const Timetable = React.lazy(() => import('./pages/Timetable'));
const Attendance = React.lazy(() => import('./pages/Attendance'));
const Internals = React.lazy(() => import('./pages/Internals'));
const Fees = React.lazy(() => import('./pages/Fees'));
const ExamBoard = React.lazy(() => import('./pages/ExamBoard'));
const Feedback = React.lazy(() => import('./pages/Feedback'));
const Departments = React.lazy(() => import('./pages/Departments'));
const MyClasses = React.lazy(() => import('./pages/MyClasses'));

const PAGES = {
    overview: { to: '/', label: 'Overview', icon: LayoutDashboard, el: Overview, dept: true },
    classes: { to: '/classes', label: 'My classes', icon: Presentation, el: MyClasses },
    requests: { to: '/requests', label: 'Admission requests', icon: Inbox, el: Requests },
    admissions: { to: '/admissions', label: 'Admissions', icon: UserPlus, el: Admissions, dept: true },
    subjects: { to: '/subjects', label: 'Subjects', icon: BookOpen, el: Subjects, dept: true },
    timetable: { to: '/timetable', label: 'Timetable', icon: CalendarRange, el: Timetable, dept: true },
    attendance: { to: '/attendance', label: 'Attendance', icon: CalendarCheck, el: Attendance },
    internals: { to: '/internal-marks', label: 'Internal marks', icon: ClipboardList, el: Internals },
    fees: { to: '/fees', label: 'Fees', icon: Wallet, el: Fees, dept: true },
    board: { to: '/exam-board', label: 'Exam board', icon: Landmark, el: ExamBoard },
    feedback: { to: '/feedback', label: 'Feedback', icon: MessageSquareText, el: Feedback, dept: true },
    announcements: { to: '/announcements', label: 'Announcements', icon: Megaphone, el: Announcements, dept: true },
    departments: { to: '/departments', label: 'Departments', icon: Building2, el: Departments }
};
const MENUS = {
    // Subjects, their teachers and the timetable are the HOD's (teacher dashboard → My department).
    admin: ['overview', 'admissions', 'attendance', 'internals', 'fees', 'board', 'feedback', 'departments'],
    department: ['overview', 'admissions', 'subjects', 'timetable', 'attendance', 'announcements', 'internals', 'fees', 'feedback'],
    board: ['board'],
    admission: ['admissions', 'announcements', 'fees'],
    teacher: ['classes']
};
const ROLE_LABEL = { admin: 'Administrator', department: 'Department', board: 'Examination board', admission: 'Admission office', teacher: 'Teacher' };
/** Who chooses the department they work in (everyone else has one, or none). */
export const picksDept = (role) => role === 'admin' || role === 'admission';
/** The menu's name for a page, by role: a department's Admissions is its Students list. */
const labelOf = (p, role) => (p.to === '/admissions' && role === 'department' ? 'Students' : p.label);

/* ── The department being worked in ─────────────────────────────────────── */
const CampusContext = createContext(null);
/** { ctx, role, departments, dept, setDeptId } — `dept` is the department pages work in. */
export const useCampus = () => useContext(CampusContext);
const DEPT_KEY = 'institution-dept';

const CampusProvider = ({ ctx, children }) => {
    const [deptId, setDeptId] = useState(() => { try { return localStorage.getItem(DEPT_KEY) || ''; } catch { return ''; } });
    const departments = ctx.departments || [];
    const dept = ctx.department || departments.find((d) => d._id === deptId) || departments[0] || null;
    const choose = (id) => { setDeptId(id); try { localStorage.setItem(DEPT_KEY, id); } catch { /* private mode */ } };
    const value = useMemo(() => ({ ctx, role: ctx.role, departments, dept, setDeptId: choose }), [ctx, dept, departments]); // eslint-disable-line react-hooks/exhaustive-deps
    return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
};

/** The admin's department switcher; a department's sign-in shows its own name. */
const DeptSwitch = ({ compact }) => {
    const { role, departments, dept, setDeptId } = useCampus();
    if (!picksDept(role) || departments.length < 2) return dept ? <span className={`truncate text-sm font-semibold text-ink ${compact ? 'max-w-[10rem]' : ''}`}>{dept.name}</span> : null;
    return (
        <Select value={dept?._id || ''} onChange={(e) => setDeptId(e.target.value)} aria-label="Department" className={compact ? 'w-44' : 'w-64'}>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>
    );
};

/** A page that works in one department: says so when there is none yet. */
const NeedsDept = ({ children }) => {
    const { dept, role } = useCampus();
    if (dept) return children;
    return (
        <div className="mx-auto max-w-lg py-24 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-white text-petrol-600"><Building2 size={24} /></span>
            <h1 className="font-display text-2xl font-semibold">No departments yet</h1>
            <p className="mt-2 text-sm text-ink-2">{role === 'admin' ? 'Add your first department — its subjects, fees and students all live inside it.' : 'Your administrator has not set up any departments yet.'}</p>
            {role === 'admin' && <NavLink to="/departments" className="mt-6 inline-flex h-11 items-center rounded-xl bg-petrol-700 px-4 text-sm font-semibold text-white hover:bg-petrol-800">Add a department</NavLink>}
        </div>
    );
};

/* ── The shell ──────────────────────────────────────────────────────────── */
const Shell = () => {
    const { context: ctx, logout } = useAuth();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menu = MENUS[ctx.role] || [];
    const home = PAGES[menu[0]].to;
    const org = ctx.organization;
    useEffect(() => setMenuOpen(false), [location.pathname]);
    const current = menu.map((k) => PAGES[k]).find((p) => (p.to === '/' ? location.pathname === '/' : location.pathname.startsWith(p.to)));

    return (
        <CampusProvider ctx={ctx}>
            <ToastHost>
                <div className="flex min-h-full">
                    {/* The rail: deep petrol, the institution's crest, a brass spine. */}
                    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-white text-ink lg:flex">
                        <div className="relative px-6 pb-6 pt-7">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line">
                                    {org.logo ? <img src={org.logo} alt="" className="h-full w-full object-contain p-1" /> : <span className="font-display text-lg font-bold text-petrol-800">{org.name?.[0]}</span>}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-display text-[15px] font-semibold leading-snug text-ink">{org.name}</p>
                                    <p className="text-[11px] uppercase tracking-[.16em] text-brass-700">Campus</p>
                                </div>
                            </div>
                            <div className="mt-5 rounded-xl border border-line bg-paper px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-brass-700">{ROLE_LABEL[ctx.role]}</p>
                                <p className="truncate text-sm font-medium text-ink">{ctx.department?.name || ctx.me?.name}</p>
                            </div>
                        </div>
                        <nav aria-label="Campus" className="flex-1 space-y-0.5 overflow-y-auto px-3">
                            {menu.map((k) => {
                                const p = PAGES[k];
                                return (
                                    <NavLink key={k} to={p.to} end={p.to === '/'}
                                        className={({ isActive }) => `group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${isActive ? 'bg-petrol-50 font-semibold text-petrol-800' : 'text-ink-2 hover:bg-porcelain hover:text-ink'}`}>
                                        {({ isActive }) => (<>
                                            <span className={`absolute left-0 top-2.5 h-6 w-[3px] rounded-r-full bg-brass-500 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0'}`} aria-hidden />
                                            <span className={`flex flex-1 items-center gap-3 ${SOON.has(k) ? 'opacity-50 grayscale' : ''}`}><p.icon size={18} className={isActive ? 'text-petrol-600' : 'text-ink-3 group-hover:text-ink-2'} /> {labelOf(p, ctx.role)}</span>
                                            {SOON.has(k) && <Lock size={13} className="text-ink-3" aria-label="Locked" />}
                                        </>)}
                                    </NavLink>
                                );
                            })}
                        </nav>
                        <div className="border-t border-line p-3">
                            <button onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-ink-2 hover:bg-porcelain hover:text-ink"><LogOut size={18} /> Sign out</button>
                        </div>
                    </aside>

                    <div className="flex min-w-0 flex-1 flex-col">
                        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-porcelain/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-line lg:hidden">
                                    {org.logo ? <img src={org.logo} alt="" className="h-full w-full bg-white object-contain p-0.5" /> : <span className="font-display font-bold text-petrol-800">{org.name?.[0]}</span>}
                                </span>
                                <p className="hidden truncate text-sm text-ink-3 sm:block lg:hidden">{org.name}</p>
                                {current?.dept && <div className="hidden min-w-0 items-center gap-2 lg:flex"><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-3">Department</span><DeptSwitch /></div>}
                            </div>
                            <div className="relative">
                                <button onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} className="flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-ink hover:bg-white">
                                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-petrol-700 text-xs font-bold text-white">{(ctx.me?.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('')}</span>
                                    <span className="hidden max-w-[12rem] truncate sm:block">{ctx.me?.name}</span><ChevronDown size={15} className="text-ink-3" />
                                </button>
                                {menuOpen && (
                                    <div className="absolute right-0 top-12 w-60 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-rise">
                                        <p className="px-3 py-2 text-xs text-ink-3">{ROLE_LABEL[ctx.role]}{ctx.department ? ` · ${ctx.department.name}` : ''}</p>
                                        <button onClick={logout} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-sm text-ink hover:bg-porcelain"><LogOut size={16} /> Sign out</button>
                                    </div>
                                )}
                            </div>
                        </header>
                        {current?.dept && picksDept(ctx.role) && ctx.departments.length > 1 && (
                            <div className="flex items-center gap-2 border-b border-line bg-paper px-4 py-2 sm:px-6 lg:hidden"><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-ink-3">Department</span><DeptSwitch compact /></div>
                        )}
                        <main className="ruled flex-1 px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-12">
                            <div className="mx-auto max-w-[1240px] animate-rise" key={location.pathname}>
                                <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="animate-spin text-petrol-600" /></div>}>
                                    <Routes>
                                        {menu.map((k) => {
                                            const p = PAGES[k];
                                            const El = p.el;
                                            const page = SOON.has(k) ? <ComingSoonPage title={p.label} icon={p.icon} /> : p.dept ? <NeedsDept><El /></NeedsDept> : <El />;
                                            return <Route key={k} path={p.to === '/' ? '/' : `${p.to}/*`} element={page} />;
                                        })}
                                        <Route path="*" element={<Navigate to={home} replace />} />
                                    </Routes>
                                </Suspense>
                            </div>
                        </main>
                    </div>

                    {/* A phone: the menu along the bottom. */}
                    <nav aria-label="Campus" className="no-scrollbar fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto border-t border-line bg-white/95 px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">
                        {menu.map((k) => {
                            const p = PAGES[k];
                            return (
                                <NavLink key={k} to={p.to} end={p.to === '/'} className={({ isActive }) => `flex min-w-[4.5rem] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium ${isActive ? 'bg-petrol-50 text-petrol-800' : 'text-ink-3'}`}>
                                    <span className={`flex flex-col items-center gap-1 ${SOON.has(k) ? 'opacity-50 grayscale' : ''}`}><p.icon size={20} /> <span className="whitespace-nowrap">{labelOf(p, ctx.role)}{SOON.has(k) ? ' · soon' : ''}</span></span>
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>
            </ToastHost>
        </CampusProvider>
    );
};

const Blocked = () => {
    const { message, code, logout, reload } = useAuth();
    return (
        <div className="ruled flex min-h-full items-center justify-center p-6">
            <div className="max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-sm">
                <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brass-50 text-brass-700"><Lock size={22} /></span>
                <h1 className="font-display text-2xl font-semibold">{code === 'CAMPUS_LOCKED' ? 'Campus is not switched on yet' : 'Campus is not available'}</h1>
                <p className="mt-2 text-sm text-ink-2">{message}</p>
                <div className="mt-6 flex justify-center gap-2"><Button variant="secondary" onClick={() => reload()}>Try again</Button><Button variant="ghost" onClick={logout}>Sign out</Button></div>
            </div>
        </div>
    );
};

export default function App() {
    const { status } = useAuth();
    const location = useLocation();
    // Signed out: on the way to the admin app's sign-in page (auth.jsx).
    if (status === 'loading' || status === 'out') return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-petrol-600" /></div>;
    if (status === 'blocked') return <Blocked />;
    if (location.pathname === '/login') return <Navigate to="/" replace />;
    return <Shell />;
}
