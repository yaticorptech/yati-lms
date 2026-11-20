/**
 * Campus — the student management system — inside the organization dashboard (2026-11-14),
 * under /organization/campus: the department picker on top, the page below. The menu is the
 * sidebar's Campus dropdown (layouts/OrgAdminLayout.jsx). Server: /api/organizations/me/campus.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Building2, Loader2, School, Lock } from 'lucide-react';
import { campusMenuFor, labelOf } from './menu';
import { useCampusCounts, countOf } from './counts';
import api, { CAMPUS, errorOf } from './api';
import { CampusContext, picksDept } from './context';
import { ToastHost, Select } from './ui';

const DEPT_KEY = 'campus-dept';

export default function CampusLayout() {
    const [state, setState] = useState({ loading: true, ctx: null, error: '' });
    // The waiting badges are the organization's and the admission office's; nobody else is asked.
    const campusCounts = useCampusCounts(['admin', 'admission'].includes(state.ctx?.role), useLocation().pathname);
    const load = useCallback(() => api.get(`${CAMPUS}/context`)
        .then((r) => setState({ loading: false, ctx: r.data, error: '' }))
        .catch((err) => setState({ loading: false, ctx: null, error: errorOf(err, 'Campus could not be opened.') })), []);
    useEffect(() => { load(); }, [load]);

    // No department chosen at first (2026-11-14): the organization picks one; kept for this visit only.
    const [deptId, setDeptId] = useState(() => { try { return sessionStorage.getItem(DEPT_KEY) || ''; } catch { return ''; } });
    const ctx = state.ctx;
    const departments = ctx?.departments || [];
    const dept = ctx?.department || departments.find((d) => d._id === deptId) || (departments.length === 1 ? departments[0] : null);
    const choose = (id) => { setDeptId(id); try { sessionStorage.setItem(DEPT_KEY, id); } catch { /* private mode */ } };
    const value = useMemo(() => (ctx ? { ctx, role: ctx.role, departments, dept, setDeptId: choose, reload: load } : null), [ctx, dept, departments, load]); // eslint-disable-line react-hooks/exhaustive-deps
    const { pathname, search } = useLocation();
    // Organization-wide pages: no department picker, and open without a department. Admissions too, on its
    // Applications and Accepted tabs (2026-11-14): only its Admitted tab is a department's register.
    const admissionsWide = pathname.startsWith('/organization/campus/admissions') && ['admin', 'admission'].includes(ctx?.role) && new URLSearchParams(search).get('tab') !== 'admitted';
    // The examination board's page is the whole organization's too: its sign-in has no department.
    const onDepartments = admissionsWide || ['/organization/campus/departments', '/organization/campus/alumni', '/organization/campus/students', '/organization/campus/exam-board'].some((p) => pathname.startsWith(p));

    if (state.loading) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-slate-400" /></div>;
    if (!ctx) {
        return (
            <div className="mx-auto max-w-lg py-20 text-center">
                <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><School size={24} /></span>
                <h1 className="text-xl font-bold text-slate-800">Campus is not available</h1>
                <p className="mt-2 text-sm text-slate-500">{state.error}</p>
            </div>
        );
    }
    return (
        <CampusContext.Provider value={value}>
            <ToastHost>
                <div className="campus w-full">
                    {/* Phones and tablets have no sidebar: Campus's menu as a strip to swipe along. */}
                    <nav aria-label="Campus" className="-mx-1 mb-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
                        <div className="flex w-max gap-1.5">
                            {campusMenuFor(ctx.role).map((item) => ({ ...item, label: labelOf(item) })).map(({ to, label, icon: Icon, exact, soon, badge }) => (
                                <NavLink key={to} to={to} end={exact}
                                    className={({ isActive }) => `inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-sm font-semibold transition ${isActive ? (soon ? 'border-slate-300 bg-slate-200 text-slate-600' : 'border-indigo-600 bg-indigo-600 text-white') : soon ? 'border-slate-200 bg-white text-slate-400 grayscale' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                                    <Icon size={15} aria-hidden="true" /> {label}{soon && <Lock size={11} aria-label="Locked" />}
                                    {!soon && countOf(campusCounts, badge) > 0 && <span className="ml-0.5 rounded-full bg-red-500 px-1.5 py-px text-[10px] font-bold text-white" aria-label={`${countOf(campusCounts, badge)} new`}>{countOf(campusCounts, badge)}</span>}
                                </NavLink>
                            ))}
                        </div>
                    </nav>
                    {!onDepartments && picksDept(ctx.role) && departments.length > 1 && (
                        <div className="mb-5 flex flex-col gap-2 rounded-2xl sm:flex-row sm:items-center sm:gap-3 border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Building2 size={15} /> Department</span>
                            <Select value={dept?._id || ''} onChange={(e) => choose(e.target.value)} aria-label="Department" className="w-full sm:w-64">
                                <option value="" disabled>Choose a department</option>
                                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
                            </Select>
                        </div>
                    )}
                    {!onDepartments && !dept && departments.length > 1 ? (
                        <div className="mx-auto max-w-lg py-16 text-center">
                            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Building2 size={24} /></span>
                            <h1 className="text-xl font-bold text-slate-800">Choose a department</h1>
                            <p className="mt-2 text-sm text-slate-500">Pick one above to see its students and records.</p>
                        </div>
                    ) : !onDepartments && !dept ? (
                        <div className="mx-auto max-w-lg py-20 text-center">
                            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><Building2 size={24} /></span>
                            <h1 className="text-xl font-bold text-slate-800">No departments yet</h1>
                            <p className="mt-2 text-sm text-slate-500">{ctx.role === 'admin' ? 'Add your first department and choose its head — its subjects, students and timetable live inside it.' : 'Your administrator has not set up any departments yet.'}</p>
                            {ctx.role === 'admin' && <NavLink to="/organization/campus/departments" className="mt-6 inline-flex h-11 items-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">Add a department</NavLink>}
                        </div>
                    ) : <Outlet />}
                </div>
            </ToastHost>
        </CampusContext.Provider>
    );
}
