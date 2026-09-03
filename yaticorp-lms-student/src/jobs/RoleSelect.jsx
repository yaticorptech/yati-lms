/**
 * @description Target-role picker: search the 135-role taxonomy, or type your own.
 *
 * Grouped by category, because a flat list of 135 titles is unreadable and the
 * category is usually how someone knows what they are looking for. Anything can
 * still be typed — an unrecognised role falls back to keyword matching on the
 * server and says so, rather than being rejected.
 */
import { useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { FIELD_LABEL, FIELD_INPUT, FIELD_OK, FIELD_BAD } from './ui';

export default function RoleSelect({ value = '', roles = [], onChange, error }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const boxRef = useRef(null);

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const matching = q
            ? roles.filter((r) =>
                r.name.toLowerCase().includes(q) ||
                (r.aliases || []).some((a) => a.toLowerCase().includes(q)))
            : roles;

        const byCategory = new Map();
        for (const role of matching) {
            const key = role.category || 'Other';
            if (!byCategory.has(key)) byCategory.set(key, []);
            byCategory.get(key).push(role);
        }
        return [...byCategory.entries()];
    }, [roles, query]);

    const choose = (name) => {
        onChange(name);
        setQuery('');
        setOpen(false);
    };

    return (
        <div ref={boxRef}>
            <label htmlFor="job-role" className={FIELD_LABEL}>
                Target role <span className="text-rose-500">*</span>
            </label>

            <div className="relative">
                <input
                    id="job-role"
                    value={open ? query : value}
                    onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
                    onFocus={() => { setQuery(''); setOpen(true); }}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    placeholder="e.g. Data Scientist — or type your own"
                    autoComplete="off"
                    className={`${FIELD_INPUT} pr-10 ${error ? FIELD_BAD : FIELD_OK}`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    {open ? <Search size={15} /> : <ChevronDown size={16} />}
                </span>

                {open && (
                    <div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                        {groups.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500">
                                No role called that — press Enter to search on it anyway.
                            </p>
                        ) : (
                            groups.map(([category, list]) => (
                                <div key={category}>
                                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{category}</p>
                                    {list.map((role) => (
                                        <button key={role.name} type="button"
                                            onMouseDown={(e) => { e.preventDefault(); choose(role.name); }}
                                            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                                role.name === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-700 hover:bg-slate-50'
                                            }`}>
                                            {role.name}
                                        </button>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
        </div>
    );
}
