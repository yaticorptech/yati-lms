/**
 * @description The board's views, as tabs. Each is a different question asked
 *              of the same ranker — TABS in pages/Jobs.jsx says what each one
 *              changes about the search.
 */
export default function JobsTabs({ tabs, active, onChange, counts = {} }) {
    return (
        <nav aria-label="Job views" className="rounded-2xl border border-slate-200 bg-slate-50/80 p-1.5">
            <div role="tablist" className="flex gap-1 overflow-x-auto">
                {tabs.map(({ id, label, icon: Icon }) => {
                    const on = id === active;
                    const count = counts[id];
                    return (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => onChange(id)}
                            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                on
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                            }`}
                        >
                            <Icon size={16} className={on ? 'text-indigo-600' : 'text-slate-400'} />
                            {label}
                            {count > 0 && (
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                    on ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-200 text-slate-600'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
