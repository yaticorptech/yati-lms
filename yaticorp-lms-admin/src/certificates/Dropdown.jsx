/**
 * A dropdown drawn by the page, not the system (2026-11-02): on a Mac the browser hands a <select>'s list to macOS,
 * which shows it grey and see-through whatever the page asks. This one looks like the Mac's own menu — grey, softly blurred, white text, a tick by the choice — and works
 * with the mouse and the keyboard (arrows, Enter, Escape).
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

/** @param options [[value, label], …] */
export default function Dropdown({ value, onChange, options, placeholder = '', className = '', small = false, ...rest }) {
    const [open, setOpen] = useState(false);
    const [hi, setHi] = useState(-1);
    const box = useRef(null);
    const current = options.find(([v]) => v === value);

    useEffect(() => {
        if (!open) return undefined;
        const out = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', out);
        return () => document.removeEventListener('mousedown', out);
    }, [open]);

    const choose = (v) => { onChange(v); setOpen(false); };
    const onKey = (e) => {
        if (e.key === 'Escape') { setOpen(false); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) { setOpen(true); setHi(Math.max(0, options.findIndex(([v]) => v === value))); return; }
            setHi((i) => (e.key === 'ArrowDown' ? Math.min(options.length - 1, i + 1) : Math.max(0, i - 1)));
        }
        if ((e.key === 'Enter' || e.key === ' ') && open && hi >= 0) { e.preventDefault(); choose(options[hi][0]); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); setHi(Math.max(0, options.findIndex(([v]) => v === value))); }
    };

    return (
        <div ref={box} className="relative">
            <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => { setOpen((o) => !o); setHi(options.findIndex(([v]) => v === value)); }} onKeyDown={onKey}
                className={`${className} flex items-center justify-between gap-2 text-left`} {...rest}>
                <span className={`truncate ${current ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>{current ? current[1] : placeholder}</span>
                <ChevronDown size={small ? 14 : 16} className={`shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <ul role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-white/15 bg-[#5e5e5e]/90 p-1 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-xl">
                    {options.map(([v, label], i) => (
                        <li key={v} role="option" aria-selected={v === value} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(v)} onMouseEnter={() => setHi(i)}
                            className={`flex cursor-default items-center gap-2 rounded-md ${small ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-[15px]'} text-white ${i === hi ? 'bg-[#0a64d8]' : ''}`}>
                            {/* As the Mac's own menu: the tick on the left of the one chosen. */}
                            <span className={`flex shrink-0 justify-center ${small ? 'w-3.5' : 'w-4'}`}>{v === value && <Check size={small ? 12 : 14} strokeWidth={3} />}</span>
                            <span className="truncate">{label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
