import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './orgBottomNav.css';

/**
 * The organization panel's navigation on a phone and tablet.
 *
 * Deliberately the same bar as the student app's MobileBottomNav: a floating
 * dark glass pill, a gradient bubble that slides to the active icon and
 * springs into place, the icon popping up as it lands, and a dot under the
 * label. An organization admin who has seen the student side should find
 * this one already familiar.
 *
 * `items` is the layout's own NAV list, so the sidebar and this bar can never
 * disagree about what the sections are. `short` is the one-word label shown
 * under the icon; the full `label` goes on the accessible name. A `badge`
 * names a key in `counts` — the waiting-requests number rides on its icon.
 */
export default function OrgBottomNav({ items, counts = {} }) {
    const { pathname } = useLocation();
    const rowRef = useRef(null);
    const [bubble, setBubble] = useState(null);

    const isActive = (item) =>
        item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);

    // Where the bubble sits: under the active icon, re-measured when the route
    // or the screen width changes. The CSS springs it there.
    useEffect(() => {
        const measure = () => {
            const row = rowRef.current;
            const icon = row?.querySelector('[data-active-icon="true"]');
            if (!row || !icon) {
                setBubble(null);
                return;
            }
            const rowBox = row.getBoundingClientRect();
            const box = icon.getBoundingClientRect();
            setBubble({ left: box.left - rowBox.left, width: box.width });
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [pathname, items.length]);

    return (
        <nav
            aria-label="Organization"
            className="mbn-in fixed inset-x-2 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-md lg:hidden"
        >
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-[0_18px_40px_-16px_rgba(15,23,42,0.8)] backdrop-blur-xl supports-[backdrop-filter]:bg-slate-900/90">
                {/* A faint sheen across the top edge, so the bar reads as glass. */}
                <span aria-hidden className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                <div ref={rowRef} className="relative flex items-stretch px-1 pt-1.5 pb-1.5">
                    {bubble && (
                        <span aria-hidden className="mbn-bubble" style={{ left: bubble.left, width: bubble.width }} />
                    )}

                    {items.map((item) => {
                        const active = isActive(item);
                        const count = item.badge ? counts[item.badge] || 0 : 0;
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                aria-label={count > 0 ? `${item.label}, ${count} waiting` : item.label}
                                aria-current={active ? 'page' : undefined}
                                className={`mbn-press relative z-10 flex min-w-0 flex-1 flex-col items-center justify-start gap-0.5 pt-0.5 pb-1.5 text-[0.65rem] font-bold tracking-tight transition-colors duration-300 ${
                                    active ? 'text-white' : 'text-slate-400'
                                }`}
                            >
                                {/* The icon's box is what the bubble is measured from, so the
                                    bubble always fits the icon rather than the whole cell. */}
                                <span
                                    data-active-icon={active || undefined}
                                    key={active ? `${item.to}-on` : `${item.to}-off`}
                                    className={`relative flex h-10 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                                        active ? 'mbn-icon-active text-white' : 'text-slate-400'
                                    }`}
                                >
                                    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                                    {count > 0 && (
                                        <span aria-hidden className="absolute -top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-slate-900">
                                            {count > 99 ? '99+' : count}
                                        </span>
                                    )}
                                </span>

                                <span className="w-full truncate px-px text-center leading-none">{item.short}</span>

                                {active && <span aria-hidden className="mbn-dot absolute bottom-0 h-1 w-1 rounded-full bg-indigo-300" />}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}
