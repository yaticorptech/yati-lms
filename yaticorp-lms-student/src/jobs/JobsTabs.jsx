/**
 * The board's views, as tabs. Each is a different question asked of the same
 * ranker — TABS in pages/Jobs.jsx says what each one changes about the search.
 *
 * Five equal cells in one row: a tinted icon tile, the name, and a two-word
 * hint. The active cell is outlined and underlined.
 * On a phone the row keeps its width and scrolls sideways rather than
 * squashing the names.
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
                                className={`relative flex h-full w-full items-center gap-2.5 rounded-2xl px-2.5 py-3 text-left transition-all duration-200 sm:gap-3 sm:px-3 ${
                                    on ? 'bg-indigo-50/40 ring-[1.5px] ring-indigo-500' : 'hover:bg-slate-50'
                                }`}
                            >
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${TONES[tone]}`}>
                                    <Icon size={20} strokeWidth={1.9} className="sm:h-[22px] sm:w-[22px]" />
                                </span>
                                <span className="min-w-0">
                                    <span className={`block text-sm font-bold leading-snug sm:text-[15px] ${on ? 'text-indigo-600' : 'text-slate-900'}`}>
                                        {label}
                                        {count > 0 && (
                                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 align-middle text-[10px] font-bold tabular-nums ${on ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                                        )}
                                    </span>
                                    <span className={`mt-0.5 hidden text-[13px] sm:block ${on ? 'text-indigo-500' : 'text-slate-500'}`}>{hint}</span>
                                </span>
                                {on && <span aria-hidden="true" className="absolute bottom-[3px] left-1/2 h-[3px] w-20 -translate-x-1/2 rounded-full bg-indigo-600" />}
                            </button>
                        </div>
                    );
                })}
            </div>
        </nav>
    );
}
