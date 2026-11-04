import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './orgBottomNav.css';

/**
 * The organization panel's navigation on a phone and tablet.
 *
 * The same bar as the student app's MobileBottomNav (2026-11-02): a light
 * floating island, Home pinned on the left, every other section in a strip
 * that scrolls beside it, and a › while there is more to the right. The tab
 * that is on turns indigo, its icon bolder, with a small dot under its label.
 *
 * `items` is the layout's own NAV list, so the sidebar and this bar can never
 * disagree about what the sections are — all of them are here now, the
 * sidebar-only ones too, since the strip scrolls. `short` is the label shown
 * under the icon; the full `label` goes on the accessible name. A `badge`
 * names a key in `counts` — the waiting-requests number rides on its icon.
 */
function Tab({ item, active, count = 0, onClick, className = '' }) {
    const Icon = item.icon;
    return (
        <Link
            to={item.to}
            onClick={onClick}
            data-active-tab={active || undefined}
            aria-label={count > 0 ? `${item.label}, ${count} waiting` : item.label}
            aria-current={active ? 'page' : undefined}
            className={`mbn-press relative z-10 flex shrink-0 flex-col items-center justify-center gap-1 rounded-[22px] pt-2 pb-1.5 text-[0.6rem] tracking-tight transition-colors ${
                active ? 'font-bold text-indigo-600' : 'font-semibold text-slate-500 active:text-slate-700'
            } ${className}`}
        >
            <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon size={21} strokeWidth={active ? 2.4 : 1.9} />
                {count > 0 && (
                    <span aria-hidden className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </span>
            <span className="whitespace-nowrap text-center leading-none">{item.short}</span>
            {/* The only "you are here": a small dot under the label. */}
            <span aria-hidden className={`h-1 w-1 rounded-full ${active ? 'bg-indigo-600' : 'bg-transparent'}`} />
        </Link>
    );
}

export default function OrgBottomNav({ items, counts = {} }) {
    const { pathname } = useLocation();
    const stripRef = useRef(null);
    const [more, setMore] = useState(true);
    // Scrolled along: the left edge fades, so a tab cut at the edge does not show as a stray sliver beside Home.
    const [scrolled, setScrolled] = useState(false);

    const home = items.find((item) => item.exact) || items[0];
    const rest = items.filter((item) => item !== home);
    const isActive = (item) => (item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`));

    // Whether there is more to the right: the › shows until the end is reached.
    const check = () => {
        const el = stripRef.current;
        if (!el) return;
        setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
        setScrolled(el.scrollLeft > 4);
    };
    // Home brings the strip back to its start; any other section scrolls its tab into view.
    useEffect(() => {
        const el = stripRef.current;
        if (!el) return undefined;
        if (home && pathname === home.to) el.scrollTo({ left: 0, behavior: 'smooth' });
        else el.querySelector('[data-active-tab="true"]')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        const t = setTimeout(check, 400);
        window.addEventListener('resize', check);
        return () => { clearTimeout(t); window.removeEventListener('resize', check); };
    }, [pathname, rest.length]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!home) return null;
    return (
        <nav
            aria-label="Organization"
            className="mbn-in fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-xl lg:hidden"
        >
            {/* Solid white with a hairline and a soft shadow, as on the student side: no blur to work out on every scroll. */}
            <div className="mbn-island relative flex items-stretch gap-1 rounded-[28px] border border-slate-200/70 bg-white p-1.5">
                <Tab item={home} active={isActive(home)} count={home.badge ? counts[home.badge] : 0} className="w-[4.4rem]"
                    onClick={() => stripRef.current?.scrollTo({ left: 0, behavior: 'smooth' })} />
                <span aria-hidden className="my-2 w-px shrink-0 bg-slate-200" />
                <div className="relative min-w-0 flex-1">
                    <div ref={stripRef} onScroll={check} className="flex h-full items-stretch gap-1 overflow-x-auto overscroll-x-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {rest.map((item) => (
                            <Tab key={item.to} item={item} active={isActive(item)} count={item.badge ? counts[item.badge] || 0 : 0} className="min-w-[4.4rem] px-2.5" />
                        ))}
                    </div>
                    {scrolled && <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-white via-white to-transparent" />}
                    {more && (
                        <button type="button" aria-label="More sections"
                            onClick={() => stripRef.current?.scrollBy({ left: stripRef.current.clientWidth * 0.8, behavior: 'smooth' })}
                            className="absolute inset-y-0 right-0 z-20 flex w-8 items-center justify-end bg-gradient-to-l from-white via-white/90 to-transparent pr-0.5 text-slate-400">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 shadow-sm"><ChevronRight size={15} strokeWidth={2.6} /></span>
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
