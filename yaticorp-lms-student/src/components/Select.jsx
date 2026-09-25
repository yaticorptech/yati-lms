/**
 * A dropdown drawn by the page — a drop-in replacement for a native <select>.
 *
 * Used by the Scholarships section's profile form. A native <select> opens
 * a list the operating system draws: a grey macOS menu on a laptop, a system
 * wheel on a phone, never the app's own look. This one is the app's:
 *
 *   - on a laptop, a list under the field, flipping above it when there is no
 *     room below, never taller than the screen;
 *   - on a phone, a popup in the middle of the screen — where a thumb reaches
 *     easily — headed with the field's name, with large rows;
 *   - a search box once there are more than eight choices;
 *   - keyboard-complete, and announced as a listbox.
 *
 * Same interface as <select>: `value`, `onChange` (called with
 * `{ target: { value, name, id } }`), `className` for the closed field,
 * `disabled`, `id`, `aria-label`, and <option> children.
 *
 * The same component as the admin panel's (yaticorp-lms-admin/src/components/
 * Select.jsx); the two apps are built separately, so it lives in each.
 */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import './select.css';

const SHOW_TAGS = 3;         // tags shown in a closed multiple field before "+N more"

const SEARCH_FROM = 9;       // more options than this gets a search box
const MAX_LIST = 320;        // tallest the desktop list grows, in px
const PHONE = '(max-width: 639px)';

/** The visible text of an option's children, for the field, search and typeahead. */
const textOf = (node) => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(textOf).join('');
    if (React.isValidElement(node)) return textOf(node.props.children);
    return '';
};

/** Every <option> among the children, through arrays, fragments and conditionals. */
const readOptions = (children) => {
    const out = [];
    const walk = (nodes) => React.Children.forEach(nodes, (child) => {
        if (!React.isValidElement(child)) return;
        if (child.type === React.Fragment) return walk(child.props.children);
        if (child.type === 'option') {
            const label = textOf(child.props.children).replace(/\s+/g, ' ').trim();
            out.push({
                value: String(child.props.value ?? label),
                label,
                disabled: !!child.props.disabled
            });
        }
    });
    walk(children);
    return out;
};

const usePhone = () => {
    const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(PHONE).matches;
    const [phone, setPhone] = useState(get);
    useEffect(() => {
        const mq = window.matchMedia?.(PHONE);
        if (!mq) return undefined;
        const on = () => setPhone(mq.matches);
        mq.addEventListener?.('change', on);
        return () => mq.removeEventListener?.('change', on);
    }, []);
    return phone;
};

export default function Select({
    value, onChange, children, className = '', disabled = false,
    id, name, placeholder = 'Select…', 'aria-label': ariaLabel, title, multiple = false
}) {
    const options = useMemo(() => readOptions(children), [children]);
    const current = options.find((o) => o.value === String(value ?? ''));
    const picked = useMemo(() => new Set(multiple ? (Array.isArray(value) ? value : []).map(String) : []), [multiple, value]);
    const pickedOptions = options.filter((o) => picked.has(o.value));
    const isSelected = (o) => (multiple ? picked.has(o.value) : o.value === String(value ?? ''));
    const phone = usePhone();
    const listId = useId();

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(-1);          // index into `shown`
    const [place, setPlace] = useState(null);           // desktop position
    const [heading, setHeading] = useState('');         // the phone popup's title
    const justOpened = useRef(false);
    const triggerRef = useRef(null);
    const listRef = useRef(null);
    const panelRef = useRef(null);
    const searchRef = useRef(null);
    const typed = useRef({ text: '', at: 0 });

    const searchable = options.length >= SEARCH_FROM;
    const shown = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    }, [options, query]);

    const close = useCallback((refocus = true) => {
        setOpen(false);
        setQuery('');
        // preventScroll: handing focus back must not scroll the form behind
        // it, which on a phone had already moved while the sheet was open.
        if (refocus) triggerRef.current?.focus({ preventScroll: true });
    }, []);

    const choose = (option) => {
        if (!option || option.disabled) return;
        if (multiple) {
            // Toggle, in the list's own order, and stay open for the next one.
            const next = picked.has(option.value) ? new Set([...picked].filter((v) => v !== option.value)) : new Set([...picked, option.value]);
            onChange?.({ target: { value: options.filter((o) => next.has(o.value)).map((o) => o.value), name, id } });
            return;
        }
        if (option.value !== String(value ?? '')) onChange?.({ target: { value: option.value, name, id } });
        close();
    };

    const openList = () => {
        if (disabled) return;
        setQuery('');
        setActive(Math.max(0, options.findIndex((o) => isSelected(o))));
        if (!phone) measure();   // placed before it paints, not a frame later
        else setHeading(fieldName());
        justOpened.current = true;
        setOpen(true);
    };

    // What the phone popup is headed with: the aria-label or title if given,
    // otherwise the text of the field's own <label> — the one pointing at it,
    // or the one sitting beside it in the same wrapper, which is how every
    // form in this panel lays its fields out.
    const fieldName = () => {
        if (ariaLabel || title) return ariaLabel || title;
        const trigger = triggerRef.current;
        const byFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
        const beside = trigger?.parentElement && Array.from(trigger.parentElement.children).find((el) => el.tagName === 'LABEL' && !el.contains(trigger));
        return ((byFor || beside)?.textContent || '').replace(/\s+/g, ' ').trim();
    };

    // Where the desktop list goes: under the field, or above it when the
    // space below is the smaller of the two; as wide as the field (at least
    // 12rem), and kept inside the window on both sides.
    const measure = useCallback(() => {
        const box = triggerRef.current?.getBoundingClientRect();
        if (!box) return;
        const gap = 6;
        const below = window.innerHeight - box.bottom - gap - 8;
        const above = box.top - gap - 8;
        const up = below < Math.min(MAX_LIST, 200) && above > below;
        const width = Math.max(box.width, 192);
        const left = Math.min(Math.max(8, box.left), window.innerWidth - width - 8);
        setPlace({
            left, width,
            maxHeight: Math.min(MAX_LIST, up ? above : below),
            ...(up ? { bottom: window.innerHeight - box.top + gap } : { top: box.bottom + gap })
        });
    }, []);

    useEffect(() => {
        if (!open || phone) return undefined;
        // Capture: the field may sit inside a scrolling modal, not the page.
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [open, phone, measure]);

    // Outside press closes; the list lives in a portal, so "inside" is either
    // the field or the panel.
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (e) => {
            if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            close(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('touchstart', onDown);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('touchstart', onDown);
        };
    }, [open, close]);

    // Focus the search box (or the list) on open, so typing works at once.
    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => (searchable && !phone ? searchRef.current : listRef.current)?.focus({ preventScroll: true }), 0);
        return () => clearTimeout(t);
    }, [open, searchable, phone]);

    // Keep the highlighted row in view.
    useEffect(() => {
        if (!open || active < 0) return;
        // On opening, the current choice sits in the middle of the list with
        // its neighbours around it; after that, arrow keys only nudge.
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: justOpened.current ? 'center' : 'nearest' });
        justOpened.current = false;
    }, [open, active]);

    const move = (from, step) => {
        if (!shown.length) return -1;
        let i = from;
        for (let n = 0; n < shown.length; n += 1) {
            i = (i + step + shown.length) % shown.length;
            if (!shown[i].disabled) return i;
        }
        return from;
    };

    const onKeyDown = (e) => {
        if (!open) {
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openList(); }
            return;
        }
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
        if (e.key === 'Tab') { close(false); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => move(i, 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => move(i < 0 ? 0 : i, -1)); return; }
        if (e.key === 'Home') { e.preventDefault(); setActive(move(-1, 1)); return; }
        if (e.key === 'End') { e.preventDefault(); setActive(move(0, -1)); return; }
        if (e.key === 'Enter') { e.preventDefault(); choose(shown[active]); return; }
        // Typeahead, when there is no search box taking the letters.
        if (!searchable && e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
            const now = Date.now();
            typed.current = { text: (now - typed.current.at < 600 ? typed.current.text : '') + e.key.toLowerCase(), at: now };
            const hit = shown.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(typed.current.text));
            if (hit >= 0) setActive(hit);
        }
    };

    const list = (
        <ul ref={listRef} id={listId} role="listbox" tabIndex={-1} aria-label={ariaLabel || title} aria-multiselectable={multiple || undefined}
            aria-activedescendant={active >= 0 && shown[active] ? `${listId}-${active}` : undefined}
            onKeyDown={onKeyDown}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 outline-none">
            {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">Nothing matches “{query}”.</li>}
            {shown.map((o, i) => {
                const selected = isSelected(o);
                return (
                    <li key={`${o.value}-${i}`} id={`${listId}-${i}`} data-index={i} role="option"
                        aria-selected={selected} aria-disabled={o.disabled || undefined}
                        onMouseEnter={() => !o.disabled && setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(o)}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 text-sm transition-colors ${phone ? 'py-3' : 'py-2'} ${
                            o.disabled ? 'cursor-not-allowed text-slate-300'
                                : i === active ? 'bg-indigo-50 text-indigo-700'
                                    : selected ? 'text-indigo-700' : 'text-slate-700'
                        }`}>
                        {multiple && (
                            <span aria-hidden className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${selected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                                {selected && <Check size={12} strokeWidth={3} />}
                            </span>
                        )}
                        <span className={`min-w-0 flex-1 ${selected ? 'font-semibold' : ''}`}>{o.label}</span>
                        {!multiple && selected && <Check size={16} className="shrink-0 text-indigo-600" />}
                    </li>
                );
            })}
        </ul>
    );

    const footer = multiple && (
        <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 p-2">
            <span className="flex-1 pl-2 text-xs font-semibold text-slate-500">{picked.size} selected</span>
            {picked.size > 0 && (
                <button type="button" onClick={() => onChange?.({ target: { value: [], name, id } })}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Clear</button>
            )}
            <button type="button" onClick={() => close()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700">Done</button>
        </div>
    );

    const searchBox = searchable && (
        <div className="relative shrink-0 border-b border-slate-100 p-2">
            <Search size={15} className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={query} onKeyDown={onKeyDown}
                onChange={(e) => { setQuery(e.target.value); setActive(0); }}
                placeholder="Search…" aria-label="Search options" aria-controls={listId}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm text-slate-800 focus:border-indigo-400 focus:bg-white focus:outline-none" />
        </div>
    );

    return (
        <>
            <button
                ref={triggerRef} type="button" id={id} disabled={disabled} title={title}
                role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
                aria-label={ariaLabel}
                onClick={() => (open ? close() : openList())}
                onKeyDown={onKeyDown}
                // The caller's classes style the closed field exactly as they
                // styled the <select>; flex and the chevron are added here.
                className={`${className} inline-flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60`}
            >
                {multiple ? (
                    pickedOptions.length ? (
                        <span className="flex min-w-0 flex-1 flex-wrap gap-1.5 py-0.5">
                            {pickedOptions.slice(0, SHOW_TAGS).map((o) => (
                                <span key={o.value} className="max-w-full truncate rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">{o.label}</span>
                            ))}
                            {pickedOptions.length > SHOW_TAGS && (
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">+{pickedOptions.length - SHOW_TAGS} more</span>
                            )}
                        </span>
                    ) : <span className="min-w-0 flex-1 truncate text-slate-400">{placeholder}</span>
                ) : (
                    <span className={`min-w-0 flex-1 truncate ${current ? '' : 'text-slate-400'}`}>{current ? current.label : placeholder}</span>
                )}
                <ChevronDown size={16} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                phone ? (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-[2px]">
                        <div ref={panelRef} role="dialog" aria-modal="true" aria-label={heading || 'Choose an option'}
                            className="sel-pop flex max-h-[70dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 py-3 pl-4 pr-2">
                                <p className="min-w-0 truncate text-sm font-bold text-slate-800">{heading || 'Choose an option'}</p>
                                <button type="button" onClick={() => close()} aria-label="Close"
                                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                            </div>
                            {searchBox}
                            {list}
                            {footer}
                        </div>
                    </div>
                ) : place && (
                    <div ref={panelRef}
                        style={{ position: 'fixed', left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
                        className="z-[300] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                        {searchBox}
                        {list}
                        {footer}
                    </div>
                ),
                document.body
            )}
        </>
    );
}
