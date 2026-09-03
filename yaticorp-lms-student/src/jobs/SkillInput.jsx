/**
 * @description Skill entry: type to filter the library, Enter to add, chips to remove.
 *
 * Skills are what every listing is ranked against, so the field is deliberately
 * forgiving — anything can be typed, and the suggestions exist to keep one
 * spelling per skill rather than to restrict what may be entered.
 */
import { useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function SkillInput({ value = [], options = [], popular = [], onChange, error }) {
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);

    const chosen = useMemo(() => new Set(value.map((s) => s.toLowerCase())), [value]);

    const matches = useMemo(() => {
        const q = text.trim().toLowerCase();
        if (!q) return [];
        // Prefix matches first — typing "java" should offer Java before
        // "JavaScript testing".
        const starts = [], contains = [];
        for (const opt of options) {
            if (chosen.has(opt.toLowerCase())) continue;
            const lower = opt.toLowerCase();
            if (lower.startsWith(q)) starts.push(opt);
            else if (lower.includes(q)) contains.push(opt);
        }
        return [...starts, ...contains].slice(0, 8);
    }, [text, options, chosen]);

    const add = (skill) => {
        const clean = String(skill).trim();
        if (!clean || chosen.has(clean.toLowerCase())) return;
        onChange([...value, clean]);
        setText('');
        setOpen(false);
        inputRef.current?.focus();
    };

    const remove = (skill) => onChange(value.filter((s) => s !== skill));

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            add(matches[0] && text.trim().toLowerCase() !== matches[0].toLowerCase() ? text : text);
        } else if (e.key === 'Backspace' && !text && value.length) {
            remove(value[value.length - 1]);
        }
    };

    const suggestions = popular.filter((s) => !chosen.has(s.toLowerCase())).slice(0, 8);

    return (
        <div>
            <label htmlFor="job-skills" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Your skills <span className="text-rose-500">*</span>
            </label>

            {value.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {value.map((skill) => (
                        <span key={skill} className="inline-flex min-h-10 items-center gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg pl-3 pr-1.5 py-1 text-sm font-medium sm:min-h-0">
                            {skill}
                            <button type="button" onClick={() => remove(skill)} aria-label={`Remove ${skill}`}
                                className="p-0.5 rounded hover:bg-indigo-100 text-indigo-400 hover:text-indigo-700 transition-colors">
                                <X size={13} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <input
                    id="job-skills"
                    ref={inputRef}
                    value={text}
                    onChange={(e) => { setText(e.target.value); setOpen(true); }}
                    onKeyDown={onKeyDown}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 120)}
                    placeholder="Type a skill and press Enter"
                    autoComplete="off"
                    className={`w-full px-4 py-2.5 rounded-xl border bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                        error ? 'border-rose-300 focus:ring-rose-500/40' : 'border-slate-300 focus:ring-indigo-500/40 focus:border-indigo-500'
                    }`}
                />
                {open && matches.length > 0 && (
                    <ul className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                        {matches.map((opt) => (
                            <li key={opt}>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); add(opt); }}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                                    {opt}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}

            {suggestions.length > 0 && value.length === 0 && (
                <div className="mt-2.5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Popular</p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s) => (
                            <button key={s} type="button" onClick={() => add(s)}
                                className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-2 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 active:scale-[0.97] transition-all sm:min-h-9 sm:text-xs sm:px-2.5 sm:py-1">
                                <Plus size={11} /> {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
