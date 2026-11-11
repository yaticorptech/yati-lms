/**
 * The Competitions section's frame (2026-11-04): its own navigation — Competitions (the section's first page;
 * "Live now" folded into it 2026-11-07), Registration, Registered, Completed, My Teams, Leaderboard, Results — each a page of its own, and the page's
 * title under it when it has one.
 *
 * The tabs are Career Path's (career/CareerShell.jsx, its styles in career/career.css): folder tabs on a lavender
 * band, each with its icon on a colour tile half above its edge; the open one is a white folder joined to the
 * page, which springs along the band to the next tab, and the page arrives from the side the student moved to.
 * Each page draws this frame afresh, so where the folder was, which tab was open and the band's scroll are kept
 * from page to page — the folder springs from the old tab, not from nowhere.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Trophy, ClipboardList, ClipboardCheck, CheckCircle2, UsersRound, BarChart3, Award } from 'lucide-react';

const HUB_PAGES = [
    { to: '/competitions', label: 'Competitions', icon: Trophy, end: true, tone: 'from-violet-500 to-indigo-600 shadow-violet-500/40', edge: '#7c3aed' },
    { to: '/competitions/open', label: 'Registration', icon: ClipboardList, tone: 'from-emerald-400 to-green-600 shadow-emerald-500/40', edge: '#16a34a' },
    { to: '/competitions/registered', label: 'Registered', icon: ClipboardCheck, tone: 'from-amber-400 to-orange-500 shadow-orange-500/40', edge: '#f97316' },
    { to: '/competitions/completed', label: 'Completed', icon: CheckCircle2, tone: 'from-indigo-400 to-violet-600 shadow-indigo-500/40', edge: '#6366f1' },
    { to: '/competitions/teams', label: 'My Teams', icon: UsersRound, tone: 'from-orange-400 to-red-500 shadow-orange-500/40', edge: '#ef4444' },
    { to: '/competitions/leaderboard', label: 'Leaderboard', icon: BarChart3, tone: 'from-fuchsia-500 to-violet-600 shadow-fuchsia-500/40', edge: '#c026d3' },
    { to: '/competitions/results', label: 'Results', icon: Award, tone: 'from-slate-400 to-slate-600 shadow-slate-500/40', edge: '#64748b' }
];

// Kept from page to page: the band's scroll, the folder's place, and which tab was open.
let barScroll = 0;
let lastSlider = null;
let lastIndex = -1;

export default function HubLayout({ title, subtitle, icon: Icon, actions = null, tone = null, children }) {
    const { pathname } = useLocation();
    const index = HUB_PAGES.findIndex((p) => (p.end ? pathname === p.to : pathname.startsWith(p.to)));
    // Which way the student moved along the band, so the page arrives from that side.
    const [direction] = useState(() => (lastIndex < 0 || index >= lastIndex ? 'right' : 'left'));
    const [slider, setSlider] = useState(lastSlider);
    const railRef = useRef(null);

    useLayoutEffect(() => {
        const rail = railRef.current;
        if (!rail) return undefined;
        // The band's scroll put back at once; it moves only when the open tab would be out of sight (a phone).
        rail.scrollLeft = barScroll;
        const active = rail.querySelector('[aria-current="page"]');
        if (active && rail.scrollWidth > rail.clientWidth) {
            const left = active.offsetLeft - 16; const right = active.offsetLeft + active.offsetWidth + 16;
            if (left < rail.scrollLeft) rail.scrollLeft = left;
            else if (right > rail.scrollLeft + rail.clientWidth) rail.scrollLeft = right - rail.clientWidth;
        }
        // The folder: from where it was, springing (career.css .fp-tab-slider) to the open tab on the next frame.
        const measure = () => {
            const on = rail.querySelector('[aria-current="page"]');
            const next = on ? { left: on.offsetLeft, width: on.offsetWidth } : null;
            lastSlider = next;
            setSlider(next);
        };
        const frame = requestAnimationFrame(measure);
        window.addEventListener('resize', measure);
        lastIndex = index;
        // The whole page white, edge to edge (2026-11-04): the page scroller's own background, while the section is open.
        const page = rail.closest('main');
        if (page) page.style.backgroundColor = '#ffffff';
        const keep = () => { barScroll = rail.scrollLeft; };
        keep();
        rail.addEventListener('scroll', keep, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener('resize', measure);
            rail.removeEventListener('scroll', keep);
            if (page) page.style.backgroundColor = '';
        };
    }, [index]);

    return (
        <div className="flex flex-col gap-4 bg-white pb-10" data-competitions-hub>
            <div className="sticky top-0 z-20 -mx-4 -mt-4 bg-white px-3 pt-3 sidebar:top-16 sidebar:-mx-8 sidebar:-mt-8 sidebar:px-7">
                <div className="fp-band-sheen relative overflow-hidden rounded-t-3xl bg-gradient-to-b from-journey-200/70 via-journey-100 to-journey-100 px-2 pt-1 sm:px-3">
                    <div aria-hidden className="fp-float pointer-events-none absolute -top-16 right-1/4 h-40 w-40 rounded-full bg-pink-200/50 blur-3xl" />
                    <div aria-hidden className="fp-float-slow pointer-events-none absolute -top-10 left-10 h-32 w-32 rounded-full bg-journey-200/50 blur-3xl" />
                    {/* On a phone not every tab fits: the band fades at both ends to say it scrolls. */}
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-journey-100 to-transparent md:hidden" />
                    <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-journey-100 to-transparent md:hidden" />
                    <nav ref={railRef} aria-label="Competitions" data-section-tabs className="relative snap-x overflow-x-auto pt-5 [scrollbar-width:none] sm:pt-6 [&::-webkit-scrollbar]:hidden">
                        <div className="relative flex w-max min-w-full items-end gap-1 sm:gap-1.5">
                            {slider && <span aria-hidden className="fp-tab-slider" style={{ left: slider.left, width: slider.width, borderColor: HUB_PAGES[index]?.edge }} />}
                            {HUB_PAGES.map((p) => (
                                <NavLink key={p.to} to={p.to} end={p.end} title={p.label}
                                    className={({ isActive }) => `fp-press group relative z-10 flex min-w-[5.4rem] flex-1 flex-col items-center rounded-t-[1.1rem] px-1.5 pt-1 pb-2.5 text-center transition-all duration-300 sm:min-w-[6.6rem] ${isActive
                                        ? '-mb-px text-ink-900'
                                        : 'mb-1 bg-surface/55 text-journey-700 ring-1 ring-journey-200/70 ring-inset hover:-translate-y-1 hover:bg-surface/90'}`}>
                                    {({ isActive }) => (<>
                                        {/* The icon half above the tab's top edge on its own colour tile — bigger, and bobbing, on the open one. */}
                                        <span aria-hidden className={`fp-wiggle -mt-4 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ring-2 ring-surface transition-transform duration-300 sm:-mt-5 sm:h-10 sm:w-10 ${p.tone} ${isActive ? 'fp-bob-soft scale-110' : 'scale-95 group-hover:scale-105'}`}>
                                            <p.icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2.4} />
                                        </span>
                                        <span className="mt-1.5 max-w-full text-[0.66rem] leading-tight font-black sm:text-xs">{p.label}</span>
                                    </>)}
                                </NavLink>
                            ))}
                        </div>
                    </nav>
                </div>
                {/* The white base the open tab stands on. */}
                <div className="min-h-3.5 rounded-b-3xl border border-t-0 border-journey-200/70 bg-surface shadow-card" />
            </div>
            {/* The page, arriving from the side the student moved to. */}
            <div className={`flex flex-col gap-4 ${direction === 'right' ? 'fp-page-in-right' : 'fp-page-in-left'}`}>
                {title && <header className="flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-2.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                            {Icon && <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${tone || 'from-indigo-500 to-violet-600 shadow-indigo-500/30'}`}><Icon size={22} aria-hidden="true" /></span>}
                            {title}
                        </h1>
                        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    {actions}
                </header>}
                {children}
            </div>
        </div>
    );
}
