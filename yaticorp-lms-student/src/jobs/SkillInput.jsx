/**
 * @description Skill entry: type to filter the library, Enter to add, chips to remove.
 *
 * Skills are what every listing is ranked against, so the field is deliberately
 * forgiving — anything can be typed, and the suggestions exist to keep one
 * spelling per skill rather than to restrict what may be entered.
 *
 * One field, not two. The chips and the box you type in share a border, the
 * way a recipients field does: the chips are what is in the field, and the
 * cursor sits after the last of them. Split across a loose cloud of chips and
 * a separate input underneath, a resume's thirty skills read as a wall of
 * buttons with a form field lost at the foot of it.
 *
 * Past a dozen chips the rest fold behind "+N more". A student with thirty
 * skills from a resume and a course history does not need to see all of them
 * to search; they need the box and the count, and one tap to get at the rest.
 */
import { useMemo, useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FIELD_LABEL } from './ui';

const FOLD_AT = 12;

export default function SkillInput({ value = [], options = [], popular = [], onChange, error }) {
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [expanded, setExpanded] = useState(false);
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
        // A skill just added should be seen going in, not folded away.
        setExpanded(true);
        inputRef.current?.focus();
    };

    const remove = (skill) => onChange(value.filter((s) => s !== skill));

    const onKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            add(text);
        } else if (e.key === 'Backspace' && !text && value.length) {
            remove(value[value.length - 1]);
        }
    };

    const suggestions = popular.filter((s) => !chosen.has(s.toLowerCase())).slice(0, 8);

    const folded = !expanded && value.length > FOLD_AT;
    const shown = folded ? value.slice(0, FOLD_AT) : value;
    const hidden = value.length - shown.length;

    return (
        <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <label htmlFor="job-skills" className={`${FIELD_LABEL} mb-0`}>
                    Your skills <span className="text-rose-500">*</span>
                </label>
                {value.length > 0 && (
                    <span className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                        <span className="tabular-nums">{value.length} {value.length === 1 ? 'skill' : 'skills'}</span>
                        <span aria-hidden="true">·</span>
                        <button type="button" onClick={() => onChange([])}
                            className="font-bold text-slate-500 transition-colors hover:text-rose-600">
                            Clear all
                        </button>
                    </span>
                )}
            </div>

            {/* The field. A click anywhere in it lands the cursor in the box,
                so the whole bordered area behaves as the input it looks like. */}
            <div
                onClick={(e) => { if (e.target === e.currentTarget || e.target.dataset.field) inputRef.current?.focus(); }}
                className={`relative cursor-text rounded-xl border bg-white px-2 py-1.5 transition-shadow focus-within:ring-2 ${
                    error ? 'border-rose-300 focus-within:ring-rose-500/30' : 'border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-500/25'
                }`}
            >
                <div data-field className="flex flex-wrap items-center gap-1.5">
                    {shown.map((skill) => (
                        <span key={skill} className="inline-flex max-w-full items-center gap-0.5 rounded-lg bg-indigo-50 py-1 pr-1 pl-2.5 text-[13px] leading-snug font-semibold text-indigo-800 ring-1 ring-inset ring-indigo-100">
                            <span className="min-w-0 break-words">{skill}</span>
                            <button type="button" onClick={() => remove(skill)} aria-label={`Remove ${skill}`}
                                className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-indigo-400 transition-colors after:absolute after:-inset-1.5 after:content-[''] hover:bg-indigo-100 hover:text-indigo-700">
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    ))}

                    {hidden > 0 && (
                        <button type="button" onClick={() => setExpanded(true)}
                            className="inline-flex items-center rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-[13px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-600">
                            +{hidden} more
                        </button>
                    )}

                    <input
                        id="job-skills"
                        ref={inputRef}
                        value={text}
                        onChange={(e) => { setText(e.target.value); setOpen(true); }}
                        onKeyDown={onKeyDown}
                        onFocus={() => setOpen(true)}
                        onBlur={() => setTimeout(() => setOpen(false), 120)}
                        placeholder={value.length ? 'Add a skill…' : 'Type a skill and press Enter'}
                        autoComplete="off"
                        className="min-h-8 min-w-[9rem] flex-1 bg-transparent px-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    />
                </div>

                {expanded && value.length > FOLD_AT && (
                    <button type="button" onClick={() => setExpanded(false)}
                        className="mt-1.5 px-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-indigo-600">
                        Show fewer
                    </button>
                )}

                {open && matches.length > 0 && (
                    <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                        {matches.map((opt) => (
                            <li key={opt}>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); add(opt); }}
                                    className="w-full px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700">
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
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">Popular</p>
                    <div className="flex flex-wrap gap-1.5">
                        {suggestions.map((s) => (
                            <button key={s} type="button" onClick={() => add(s)}
                                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 active:scale-[0.97] sm:min-h-9 sm:px-2.5 sm:py-1 sm:text-xs">
                                <Plus size={11} /> {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
