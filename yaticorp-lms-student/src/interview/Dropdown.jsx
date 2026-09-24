/**
 * The interview section's own dropdown.
 *
 * A native <select> can be styled shut but not open: the list is drawn by the
 * operating system, which is why these came out as a grey macOS menu on a
 * laptop and a full-height wheel on a phone — neither of them the app's. This
 * draws its own list, so it looks the same everywhere and can be sized for the
 * screen it is on.
 *
 * On a phone the list is a sheet along the bottom edge, where a thumb reaches;
 * from sm up it is a panel under the field. Either way it caps its height and
 * scrolls rather than running off the screen.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

export default function Dropdown({
    value, options, onChange, disabled = false,
    label, icon: Icon, className = '', panelClassName = ''
}) {
    const [open, setOpen] = useState(false);
    // Which row the keyboard is on. -1 until an arrow key is pressed, so
    // opening with the mouse does not paint a highlight nobody asked for.
    const [cursor, setCursor] = useState(-1);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const id = useId();

    const selected = options.find((o) => o.value === value);
    const close = () => { setOpen(false); setCursor(-1); };

    // Pointer or focus leaving the control closes it, the same as a real menu.
    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) close(); };
        document.addEventListener('mousedown', away);
        document.addEventListener('touchstart', away);
        return () => {
            document.removeEventListener('mousedown', away);
            document.removeEventListener('touchstart', away);
        };
    }, [open]);

    // Bring the highlighted row into view when the arrows walk past the fold.
    useEffect(() => {
        if (!open || cursor < 0) return;
        listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
    }, [open, cursor]);

    const pick = (v) => { onChange(v); close(); };

    const onKeyDown = (e) => {
        if (disabled) return;
        if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setOpen(true);
            setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
            return;
        }
        if (!open) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(options.length - 1, c + 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); return; }
        if (e.key === 'Home') { e.preventDefault(); setCursor(0); return; }
        if (e.key === 'End') { e.preventDefault(); setCursor(options.length - 1); return; }
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (cursor >= 0) pick(options[cursor].value);
        }
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button" disabled={disabled}
                aria-haspopup="listbox" aria-expanded={open} aria-label={label}
                onClick={() => { if (!disabled) { setOpen((v) => !v); setCursor(-1); } }}
                onKeyDown={onKeyDown}
                className={className}
            >
                {Icon && <Icon size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" aria-hidden="true" />}
                <span className="block truncate text-left">{selected ? selected.label : ''}</span>
                <ChevronDown size={17} aria-hidden="true"
                    className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <>
                    {/* The sheet needs something behind it on a phone, both to
                        dim the page and to catch the tap that dismisses it. */}
                    <div className="fixed inset-0 z-[150] bg-slate-900/40 sm:hidden" onClick={close} aria-hidden="true" />
                    <div className={`fixed inset-x-0 bottom-0 z-[151] flex max-h-[70vh] flex-col rounded-t-3xl border border-slate-200 bg-white shadow-2xl
                                     sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:right-0 sm:top-full sm:mt-2 sm:max-h-72 sm:rounded-2xl ${panelClassName}`}>
                        {/* A phone has nothing to click beside the sheet — it
                            covers the field that opened it — so the way out has
                            to be on the sheet itself. On a desktop the panel
                            sits under its own field and clicking away is
                            obvious, so the bar would only be clutter. */}
                        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:hidden">
                            <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
                            <button type="button" onClick={close} aria-label="Close"
                                className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50">
                                <X size={18} aria-hidden="true" />
                            </button>
                        </div>
                    <ul
                        ref={listRef} role="listbox" id={id} tabIndex={-1} aria-label={label} onKeyDown={onKeyDown}
                        className="min-h-0 flex-1 overflow-y-auto p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:pb-2"
                    >
                        {options.map((o, i) => {
                            const on = o.value === value;
                            return (
                                <li key={o.value} role="option" aria-selected={on}
                                    onMouseEnter={() => setCursor(i)}
                                    onClick={() => pick(o.value)}
                                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors sm:py-2.5 ${
                                        on ? 'bg-violet-50 text-violet-700' : cursor === i ? 'bg-slate-100 text-slate-800' : 'text-slate-700'
                                    }`}>
                                    <Check size={15} aria-hidden="true" className={on ? 'shrink-0 text-violet-600' : 'shrink-0 text-transparent'} />
                                    <span className="min-w-0 flex-1">{o.label}</span>
                                </li>
                            );
                        })}
                    </ul>
                    </div>
                </>
            )}
        </div>
    );
}
