/**
 * The board's views, as tabs. Each is a different question asked of the same
 * ranker — TABS in pages/Jobs.jsx says what each one changes about the search.
 *
 * Five equal cells in one row: a tinted icon tile, the name, and a two-word
 * hint. The active cell is outlined and underlined.
 *
 * On a phone the cells wrap onto a grid, and the icon sits above the name
 * rather than beside it. Beside it, the name was left a 94px column — narrow
 * enough that "Hidden Opportunities" broke across two cramped lines. Stacked,
 * the name has the whole cell to use.
 */
// Written out in full: Tailwind cannot see a class name assembled at runtime.
const TONES = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-500',
    orange: 'bg-orange-50 text-orange-500',
    sky: 'bg-sky-50 text-sky-500',
    violet: 'bg-violet-50 text-violet-600'
};

export default function JobsTabs({ tabs, active, onChange, counts = {} }) {
    // Five tabs in one row need 760px, which no phone has. Rather than
    // scrolling them sideways — where whichever tab is off the edge is the one
    // nobody finds — they wrap onto a grid and the strip fits. The single row,
    // and the dividers that only make sense in one, return when there is room.
    return (
        <nav aria-label="Job views" className="rounded-[28px] border border-slate-100 bg-white shadow-lg shadow-indigo-100/60 lg:overflow-x-auto">
            <div role="tablist" className="grid grid-cols-2 gap-1 p-2 sm:grid-cols-3 lg:min-w-[760px] lg:grid-cols-5 lg:gap-0">
                {tabs.map(({ id, label, hint, icon: Icon, tone = 'indigo' }, i) => {
                    const on = id === active;
                    const count = counts[id];
                    return (
                        <div key={id} className={`relative px-1 ${i > 0 ? 'lg:before:absolute lg:before:bottom-4 lg:before:left-0 lg:before:top-4 lg:before:w-px lg:before:bg-slate-200' : ''}`}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={on}
                                onClick={() => onChange(id)}
                                className={`relative flex h-full w-full flex-col items-center gap-1.5 rounded-2xl px-1.5 pb-4 pt-3 text-center transition-all duration-200 sm:flex-row sm:gap-3 sm:px-3 sm:py-3 sm:text-left ${
                                    on ? 'bg-indigo-50/40 ring-[1.5px] ring-indigo-500' : 'hover:bg-slate-50'
                                }`}
                            >
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${TONES[tone]}`}>
                                    <Icon size={19} strokeWidth={1.9} className="sm:h-[22px] sm:w-[22px]" />
                                </span>
                                <span className="min-w-0 w-full sm:w-auto">
                                    <span className={`block text-[12px] font-bold leading-tight tracking-[-0.01em] text-balance sm:text-[15px] sm:tracking-normal sm:leading-snug ${on ? 'text-indigo-600' : 'text-slate-900'}`}>
                                        {label}
                                        {count > 0 && (
                                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold tabular-nums ${on ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                                        )}
                                    </span>
                                    <span className={`mt-0.5 hidden text-[13px] sm:block ${on ? 'text-indigo-500' : 'text-slate-500'}`}>{hint}</span>
                                </span>
                                {on && <span aria-hidden="true" className="absolute bottom-[3px] left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-full bg-indigo-600 sm:w-20" />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
