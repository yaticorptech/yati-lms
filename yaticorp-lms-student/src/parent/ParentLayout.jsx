/**
 * The parent dashboard's frame (2026-11-19, the user: "dashboard should be an overview page … scan and add child in a
 * drop down so the parent can switch the student … a side bar: Institution, and a drop down comes — fees, result,
 * attendance, student ranking — and the next option is AI card, with the other options").
 *   Top: the logo, the child switcher (with "Add a child") and Sign out.
 *   Left: Overview, Institution ▾ and AI Card ▾ — a drawer on a phone.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
    Activity, Award, BookOpen, Briefcase, CalendarCheck, CalendarDays, Check, ChevronDown, Compass, CreditCard, Globe2,
    GraduationCap, HeartHandshake, LayoutDashboard, Loader2, LogOut, Medal, Megaphone, Menu, Mic, Plus, School, Trash2, Trophy, Users, Wallet, X, Zap
} from 'lucide-react';
import useParent from './useParent';
import { SECTIONS } from './parentStore';
import { Avatar } from './ui';
import AddChildForm from './AddChildForm';
import { signOutParent } from './parentSession';
import InstallAppButton from '../components/InstallAppButton';

const ICONS = {
    attendance: CalendarCheck, timetable: CalendarDays, results: GraduationCap, fees: Wallet, ranking: Medal, 'extra-curricular': Users,
    activity: Activity, courses: BookOpen, multilingo: Globe2, career: Compass, interviews: Mic, certificates: Award, quizzes: Zap,
    competitions: Trophy, jobs: Briefcase, badges: Award
};
const GROUP_ICONS = { institution: School, ai: CreditCard };

/**
 * A popup over the whole page, drawn at the end of <body> (2026-11-19, the user: "for delete child give popup"): inside
 * the top bar, whose blur holds anything fixed in it, the "Remove this child?" popup could not show.
 */
function Modal({ title, onClose, children, labelId }) {
    useEffect(() => {
        const esc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onClose]);
    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby={labelId} onClick={(e) => e.stopPropagation()} className="lg-rise max-h-[90dvh] w-full max-w-sm overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 id={labelId} className="text-lg font-extrabold text-slate-900">{title}</h2>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
}

/** The child switcher: every child, the one shown ticked; "Add a child" at the bottom. */
function ChildSwitcher({ onAdd }) {
    const { children, child, select, remove } = useParent();
    const [open, setOpen] = useState(false);
    const [asking, setAsking] = useState(null);
    const [removeError, setRemoveError] = useState('');
    const [removing, setRemoving] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('pointerdown', away);
        window.addEventListener('keydown', esc);
        return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc); };
    }, [open]);
    return (
        <div ref={ref} className="relative min-w-0" data-child-switcher>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
                className="flex min-w-0 max-w-[15rem] items-center gap-2.5 rounded-2xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-left transition hover:border-teal-300 sm:max-w-xs">
                {child ? <Avatar src={child.profilePicture} name={child.name} size="h-8 w-8" /> : <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-teal-700"><Plus size={16} /></span>}
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900">{child?.name || 'Add your child'}</span>
                    {children.length > 1 && <span className="block text-[11px] font-semibold text-slate-500">{children.length} children · switch</span>}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div role="menu" className="absolute right-0 z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl sm:left-0 sm:right-auto">
                    {children.length > 0 && <p className="px-4 pt-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Your children</p>}
                    <ul className="max-h-72 overflow-y-auto p-1.5">
                        {children.map((c) => {
                            const on = child && String(c._id) === String(child._id);
                            return (
                                <li key={c._id} className="group flex items-center gap-1">
                                    <button type="button" role="menuitemradio" aria-checked={on} onClick={() => { select(c._id); setOpen(false); }}
                                        className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 py-2 text-left ${on ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                                        <Avatar src={c.profilePicture} name={c.name} size="h-9 w-9" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-bold text-slate-900">{c.name}</span>
                                            <span className={`block truncate text-xs ${c.absentToday ? 'font-bold text-rose-600' : 'text-slate-500'}`}>{c.absentToday ? `Absent today · ${c.absentToday} class${c.absentToday === 1 ? '' : 'es'}` : c.organization || 'Not in an institution'}</span>
                                        </span>
                                        {on && <Check size={16} className="shrink-0 text-teal-600" />}
                                    </button>
                                    <button type="button" onClick={() => { setAsking(c); setOpen(false); }} aria-label={`Remove ${c.name}`} title="Remove" className="shrink-0 rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={15} /></button>
                                </li>
                            );
                        })}
                    </ul>
                    <button type="button" role="menuitem" onClick={() => { setOpen(false); onAdd(); }} className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-3 text-sm font-bold text-teal-700 hover:bg-teal-50" data-open-add-child>
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white"><Plus size={16} /></span> Add a child — scan or type their card
                    </button>
                </div>
            )}
            {asking && (
                <Modal title="Remove this child?" onClose={() => { setAsking(null); setRemoveError(''); }} labelId="remove-child-h">
                    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                        <Avatar src={asking.profilePicture} name={asking.name} size="h-12 w-12" />
                        <div className="min-w-0"><p className="truncate font-bold text-slate-900">{asking.name}</p><p className="truncate text-xs text-slate-500">{asking.organization || 'Not in an institution'}</p></div>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">They will no longer be on your dashboard. Nothing in their account changes, and you can add them again with their card.</p>
                    {removeError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{removeError}</p>}
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setAsking(null)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                        <button type="button" disabled={removing} onClick={async () => { setRemoving(true); const err = await remove(asking); setRemoving(false); if (err) setRemoveError(err); else { setAsking(null); setRemoveError(''); } }} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60" data-confirm-remove>{removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Remove</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

/** The group a page of the sidebar is in ('institution' | 'ai'), or null for the Overview. */
const groupOf = (path) => { const here = path.replace(/^\/parent\/?/, ''); return SECTIONS.find((g) => g.items.some(([to]) => to === here))?.key || null; };

/**
 * The sidebar: Overview, then Institution ▾ and AI Card ▾ — one open at a time (2026-11-19, the user: "if I open the AI
 * card drop down, the institution drop down should close automatically") — and at the bottom, as in the students'
 * sidebar, Download app and Sign out.
 */
function Sidebar({ onNavigate, onSignOut }) {
    const { pathname } = useLocation();
    const { unseen } = useParent();
    const [openKey, setOpenKey] = useState(() => groupOf(pathname) || SECTIONS[0].key);
    // Opening a page of the other group (from an Overview tile) opens its group.
    const [seen, setSeen] = useState(pathname);
    if (seen !== pathname) { setSeen(pathname); const g = groupOf(pathname); if (g && g !== openKey) setOpenKey(g); }
    const link = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`;
    const current = groupOf(pathname);
    return (
        <div className="flex h-full flex-col">
            <nav aria-label="Parent dashboard" className="flex-1 space-y-1.5 overflow-y-auto p-3">
                <NavLink to="/parent" end onClick={onNavigate} className={link}><LayoutDashboard size={18} /> Overview</NavLink>
                {SECTIONS.map((g) => {
                    const GroupIcon = GROUP_ICONS[g.key];
                    const shown = openKey === g.key;
                    return (
                        <div key={g.key} className="pt-1">
                            <button type="button" onClick={() => setOpenKey(shown ? null : g.key)} aria-expanded={shown}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${current === g.key ? 'text-teal-700' : 'text-slate-800'} hover:bg-slate-100`} data-nav-group={g.key}>
                                <GroupIcon size={18} /> <span className="flex-1 text-left">{g.group}</span>
                                <ChevronDown size={16} className={`text-slate-400 transition ${shown ? 'rotate-180' : ''}`} />
                            </button>
                            {shown && (
                                <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-2.5">
                                    {g.items.map(([to, label]) => { const Icon = ICONS[to] || Activity; return (
                                        <NavLink key={to} to={`/parent/${to}`} onClick={onNavigate} className={link}><Icon size={16} /> {label}</NavLink>
                                    ); })}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div className="pt-1">
                {/* From the children's institutions (2026-11-19): the new ones counted. Last in the list (the user's ask). */}
                <NavLink to="/parent/announcements" onClick={onNavigate} className={link} data-nav-announcements>
                    <Megaphone size={18} /> <span className="flex-1">Announcements</span>
                    {unseen > 0 && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white" aria-label={`${unseen} new`}>{unseen}</span>}
                </NavLink>
                </div>
            </nav>
            <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3" data-sidebar-footer>
                {/* Renders nothing inside the native app or once installed. */}
                <InstallAppButton className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white transition hover:bg-teal-700" />
                <button type="button" onClick={onSignOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-600 hover:text-white" data-sidebar-signout>
                    <LogOut size={17} /> Sign out
                </button>
            </div>
        </div>
    );
}

export default function ParentLayout() {
    const { me, meError, reloadMe, children, added } = useParent();
    const [drawer, setDrawer] = useState(false);
    const [adding, setAdding] = useState(false);
    const [asking, setAsking] = useState(false);
    const { pathname } = useLocation();
    // A new page closes the phone's drawer.
    const [lastPath, setLastPath] = useState(pathname);
    if (lastPath !== pathname) { setLastPath(pathname); setDrawer(false); }

    return (
        <div className="min-h-screen bg-slate-50" data-parent-shell>
            <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/95 backdrop-blur">
                <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-5">
                    <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu size={20} /></button>
                    <Link to="/parent" className="hidden shrink-0 items-center gap-2.5 sm:flex lg:w-56">
                        <img src="/assets/YATICORP-dark.png" alt="YATICORPX3" className="h-7 max-w-[7.5rem] object-contain" />
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700"><HeartHandshake size={13} /> Parent</span>
                    </Link>
                    <div className="min-w-0 flex-1">{me && <ChildSwitcher onAdd={() => setAdding(true)} />}</div>
                    <button type="button" onClick={() => setAsking(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"><LogOut size={17} /><span className="hidden sm:inline">Sign out</span></button>
                </div>
            </header>

            <div className="flex">
                <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 border-r border-slate-200/70 bg-white lg:block">
                    <Sidebar onSignOut={() => setAsking(true)} />
                </aside>
                {drawer && (
                    <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setDrawer(false)}>
                        <div className="absolute inset-0 bg-slate-900/40" />
                        <aside onClick={(e) => e.stopPropagation()} className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
                            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
                                <img src="/assets/YATICORP-dark.png" alt="YATICORPX3" className="h-7 object-contain" />
                                <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                            </div>
                            <div className="min-h-0 flex-1"><Sidebar onNavigate={() => setDrawer(false)} onSignOut={() => { setDrawer(false); setAsking(true); }} /></div>
                        </aside>
                    </div>
                )}
                <main className="min-w-0 flex-1 overflow-x-clip px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
                    {meError ? (
                        <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm font-semibold text-rose-700">{meError} <button type="button" onClick={reloadMe} className="ml-2 underline">Try again</button></p>
                    ) : !me ? (
                        <div className="flex items-center justify-center gap-2 py-24 text-slate-500"><Loader2 className="animate-spin" size={20} /> Loading…</div>
                    ) : !children.length ? (
                        <div className="mx-auto max-w-lg">
                            <section className="rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-600 p-6 text-white shadow-lg shadow-teal-700/20">
                                <p className="text-sm font-semibold text-teal-50/90">Parent dashboard</p>
                                <h1 className="mt-1 text-2xl font-extrabold">Hello{me.name ? `, ${me.name.split(' ')[0]}` : ''}</h1>
                                <p className="mt-1.5 text-sm leading-relaxed text-teal-50/95">Add your child to see their attendance, results, fees, courses and everything they learn.</p>
                            </section>
                            <div className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                                <h2 className="mb-3 text-base font-extrabold text-slate-900">Add your child</h2>
                                <AddChildForm onAdded={added} />
                            </div>
                        </div>
                    ) : <Outlet />}
                </main>
            </div>

            {adding && (
                <Modal title="Add a child" onClose={() => setAdding(false)} labelId="add-child-h">
                    <p className="mb-4 text-sm text-slate-600">Scan the QR code on your child’s YATICORPX3 card, or type its 12-digit number.</p>
                    <AddChildForm onAdded={(c) => { added(c); setAdding(false); }} />
                </Modal>
            )}
            {asking && (
                <Modal title="Sign out?" onClose={() => setAsking(false)} labelId="parent-signout">
                    <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600 shadow-sm"><LogOut size={20} /></span>
                        <p className="text-sm font-semibold text-rose-800">You will leave the parent dashboard on this device.</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">You can sign in again with your card number or mobile number.</p>
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" onClick={() => setAsking(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button>
                        <button type="button" onClick={signOutParent} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700" data-confirm-signout><LogOut size={15} /> Sign out</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
