/**
 * @description Filters — a bottom sheet on a phone, a side panel on a
 *              desktop. Only the facets the student's band allows are
 *              offered: a minor cannot filter their way to a category the
 *              rules hide, because the option is not there to tap.
 */
import { useEffect, useState } from 'react';
import { X, SlidersHorizontal, BadgeCheck, CalendarRange } from 'lucide-react';
import { EMPTY_FILTERS, countActive } from './helpers';

const Group = ({ label, children }) => (
    <fieldset>
        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</legend>
        <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
);

const Opt = ({ on, onClick, children }) => (
    <button type="button" onClick={onClick} aria-pressed={on}
        className={`min-h-10 rounded-xl border px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${
            on ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
        }`}>
        {children}
    </button>
);

/* Mounted only while open, so the draft starts from the live filters each
   time without an effect to copy them in. */
const Panel = ({ onClose, filters, onApply, vocab, rules, categories }) => {
    const [draft, setDraft] = useState(filters);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
    const pick = (key, value) => set({ [key]: draft[key] === value ? '' : value });
    const types = vocab.types.filter((t) => rules.allowedTypes.includes(t.id));
    const verifiedForced = rules.verifiedOnly;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm md:items-stretch md:justify-end" onClick={onClose}>
            <aside role="dialog" aria-modal="true" aria-labelledby="opp-filters-title" onClick={(e) => e.stopPropagation()}
                className="opp-sheet flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-white shadow-2xl md:h-full md:max-h-none md:w-[400px] md:rounded-none">
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <h2 id="opp-filters-title" className="flex items-center gap-2 font-bold text-slate-800">
                        <SlidersHorizontal size={17} className="text-indigo-500" aria-hidden="true" /> Filters
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Close filters" autoFocus
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto p-4 opp-scroll">
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3">
                        <input type="checkbox" checked={draft.anyDate} onChange={(e) => set({ anyDate: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="flex-1 text-sm font-semibold text-slate-700"><CalendarRange size={14} className="mr-1 inline text-indigo-500" aria-hidden="true" /> Include jobs on other dates</span>
                    </label>
                    <Group label="Job type">
                        {types.map((t) => <Opt key={t.id} on={draft.type === t.id} onClick={() => pick('type', t.id)}>{t.label}</Opt>)}
                    </Group>
                    <Group label="Category">
                        {categories.map((c) => (
                            <Opt key={c.id} on={draft.category === c.id} onClick={() => pick('category', c.id)}>
                                <span aria-hidden="true">{c.icon}</span> {c.label}{c.count ? <span className="ml-1 text-xs text-slate-400">{c.count}</span> : null}
                            </Opt>
                        ))}
                    </Group>
                    <label className={`flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 ${verifiedForced ? 'bg-emerald-50/60' : 'cursor-pointer'}`}>
                        <input type="checkbox" checked={verifiedForced || draft.verified} disabled={verifiedForced}
                            onChange={(e) => set({ verified: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                        <span className="flex-1 text-sm font-semibold text-slate-700"><BadgeCheck size={14} className="mr-1 inline text-emerald-600" aria-hidden="true" /> Verified organisations only</span>
                        {verifiedForced && <span className="text-xs text-emerald-700">always on for your age</span>}
                    </label>
                </div>

                <div className="flex gap-2 border-t border-slate-100 p-4">
                    <button type="button" onClick={() => { onApply(EMPTY_FILTERS); onClose(); }}
                        className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-600 hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40">
                        Clear
                    </button>
                    <button type="button" onClick={() => { onApply(draft); onClose(); }}
                        className="min-h-11 flex-1 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2">
                        Show jobs{countActive(draft) ? ` (${countActive(draft)} filter${countActive(draft) === 1 ? '' : 's'})` : ''}
                    </button>
                </div>
            </aside>
        </div>
    );
};

export default function FiltersDrawer({ open, ...rest }) {
    return open ? <Panel {...rest} /> : null;
}
