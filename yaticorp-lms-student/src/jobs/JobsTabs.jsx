/**
 * The board's views, as tabs. Each is a different question asked of the same
 * ranker — TABS in pages/Jobs.jsx says what each one changes about the search.
 *
 * Five equal cells in one row at every width. On a laptop each is a tinted
 * icon tile beside the name and a two-word hint; narrower than that the icon
 * sits above the name and the hint stands down; on a phone the name is the
 * tab's short form ("Match", "Part-time") and a count sits on the corner of
 * the icon, because a cell there is a thumb wide. The full name stays on
 * the tab as its accessible label. One row rather than a grid that wraps:
 * five tabs in three rows was a panel, not a strip.
 *
 * The active cell is outlined and underlined by one highlight that slides
 * between tabs.
 */
import { useLayoutEffect, useRef, useState } from 'react';

// Written out in full: Tailwind cannot see a class name assembled at runtime.
const TONES = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-500',
    orange: 'bg-orange-50 text-orange-500',
    sky: 'bg-sky-50 text-sky-500',
    violet: 'bg-violet-50 text-violet-600'
};

export default function JobsTabs({ tabs, active, onChange, counts = {} }) {
    /*
     * The highlight — outline, tint and underline — is one element that
     * slides to whichever tab is active, rather than a style each tab puts
     * on when it is chosen. It is measured from the active tab and moved
     * with a transform, so a switch is something the eye can follow across
     * the strip. Re-measured when the strip changes size, because the cells
     * reflow from a grid on a phone to one row on a laptop.
     */
    const listRef = useRef(null);
    const [pill, setPill] = useState(null);
    useLayoutEffect(() => {
        const list = listRef.current;
        if (!list) return undefined;
        const measure = () => {
            const el = list.querySelector('[role="tab"][aria-selected="true"]');
            if (!el) { setPill(null); return; }
            const a = list.getBoundingClientRect();
            const b = el.getBoundingClientRect();
            setPill({ x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height });
        };
        measure();
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
        ro?.observe(list);
        window.addEventListener('resize', measure);
        return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
    }, [active, tabs.length]);

    // Five tabs in one row need 760px, which no phone has. Rather than
    // scrolling them sideways — where whichever tab is off the edge is the one
    // nobody finds — they wrap onto a grid and the strip fits. The single row,
    // and the dividers that only make sense in one, return when there is room.
    return (
        <nav aria-label="Job views" className="rounded-[28px] border border-slate-100 bg-white shadow-lg shadow-indigo-100/60 lg:overflow-x-auto">
            <div ref={listRef} role="tablist" className="relative grid grid-cols-5 gap-0.5 p-1.5 sm:gap-1 sm:p-2 lg:min-w-[760px] lg:gap-0">
                {pill && (
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 left-0 rounded-2xl bg-indigo-50/40 ring-[1.5px] ring-indigo-500 transition-[transform,width,height] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                        style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
                    >
                        <span className="absolute bottom-[3px] left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-indigo-600 sm:w-10 lg:w-20" />
                    </span>
                )}
                {tabs.map(({ id, label, short, hint, icon: Icon, tone = 'indigo' }, i) => {
                    const on = id === active;
                    const count = counts[id];
                    return (
                        <div key={id} className={`relative px-0.5 sm:px-1 ${i > 0 ? 'lg:before:absolute lg:before:bottom-4 lg:before:left-0 lg:before:top-4 lg:before:w-px lg:before:bg-slate-200' : ''}`}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={on}
                                aria-label={label}
                                onClick={() => onChange(id)}
                                className={`relative flex h-full w-full flex-col items-center gap-1 rounded-2xl px-0 pb-3 pt-2.5 text-center transition-colors duration-200 sm:gap-1.5 sm:px-1.5 sm:pb-4 sm:pt-3 lg:flex-row lg:gap-3 lg:px-3 lg:py-3 lg:text-left ${
                                    on ? '' : 'hover:bg-slate-50'
                                }`}
                            >
                                <span className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 lg:h-12 lg:w-12 ${TONES[tone]}`}>
                                    <Icon size={18} strokeWidth={1.9} className="lg:h-[22px] lg:w-[22px]" />
                                    {/* On a phone the count sits on the tile's corner: beside
                                        a short name it was the one thing that made "Saved"
                                        wrap in a cell a thumb wide. */}
                                    {count > 0 && (
                                        <span className={`absolute -top-1.5 -right-1.5 min-w-[1.1rem] rounded-full px-1 py-px text-center text-[9px] font-bold tabular-nums ring-2 ring-white sm:hidden ${on ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-white'}`}>{count}</span>
                                    )}
                                </span>
                                <span className="min-w-0 w-full lg:w-auto">
                                    <span data-tab-label className={`block whitespace-nowrap text-[10.5px] font-bold leading-tight tracking-tight transition-colors duration-300 sm:whitespace-normal sm:text-[12px] sm:tracking-[-0.01em] sm:text-balance lg:text-[15px] lg:tracking-normal lg:leading-snug ${on ? 'text-indigo-600' : 'text-slate-900'}`}>
                                        <span className="sm:hidden">{short || label}</span>
                                        <span className="hidden sm:inline">{label}</span>
                                        {count > 0 && (
                                            <span className={`ml-1.5 hidden rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold tabular-nums sm:inline ${on ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                                        )}
                                    </span>
                                    <span className={`mt-0.5 hidden text-[13px] transition-colors duration-300 lg:block ${on ? 'text-indigo-500' : 'text-slate-500'}`}>{hint}</span>
                                </span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
