/**
 * The app's own dropdown, shared by the interview, jobs and rewards sections.
 *
 * A native <select> can be styled shut but not open: the list is drawn by the
 * operating system, which is why these came out as a grey macOS menu on a
 * laptop and a full-height wheel on a phone — neither of them the app's. This
 * draws its own list, so it looks the same everywhere and can be sized for the
 * screen it is on.
 *
 * Two placements, because two sections want different things:
 *
 *   'popup' (the default) — on a phone the list is a popup in the middle of
 *   the screen over a dimmed page. A sheet along the bottom edge sat behind
 *   the app's own thumb bar, which hid its last option. From sm up it is a
 *   panel under the field.
 *
 *   'panel' — a panel under the field at every width, phone included. The job
 *   search form's own Target role box already behaves that way, and a
 *   neighbour answering with a full-screen popup reads as a different kind of
 *   control on the same form.
 *
 * Either way it caps its height and scrolls rather than running off the
 * screen.
 *
 * The list is portalled to document.body. Drawn inside the page it sat in the
 * card's stacking context, so on a laptop the cards and the Start button that
 * come after it in the page painted over the open list. At the top level it
 * is above everything, placed from the field's position and kept there as the
 * page scrolls.
 */
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

// The section's own accent. Written out in full: Tailwind cannot see a class
// name assembled at runtime.
const ACCENTS = {
    violet: { icon: 'text-violet-500', on: 'bg-violet-50 text-violet-700', tick: 'text-violet-600', ring: 'focus-visible:ring-violet-500/50' },
    indigo: { icon: 'text-indigo-500', on: 'bg-indigo-50 text-indigo-700', tick: 'text-indigo-600', ring: 'focus-visible:ring-indigo-500/50' }
};

// A panel narrower than this is hard to read — the leaderboard's period field
// is 116px wide, and "This Month" in a 116px panel is not a menu.
const MIN_PANEL_WIDTH = 176;

const PHONE = '(max-width: 639px)';
const MAX_PANEL = 288;   // the laptop panel's tallest, in px (was max-h-72)

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

export default function Dropdown({
    value, options, onChange, disabled = false,
    label, icon: Icon, className = '', panelClassName = '',
    accent = 'violet', placement = 'popup'
}) {
    const tone = ACCENTS[accent] || ACCENTS.violet;
    const [open, setOpen] = useState(false);
    // Which row the keyboard is on. -1 until an arrow key is pressed, so
    // opening with the mouse does not paint a highlight nobody asked for.
    const [cursor, setCursor] = useState(-1);
    const [place, setPlace] = useState(null);   // the laptop panel's fixed position
    const rootRef = useRef(null);
    const panelRef = useRef(null);
    const listRef = useRef(null);
    const id = useId();
    const onPhone = usePhone();
    // 'panel' is placed against its field at every width, so the phone popup
    // is only for the default placement.
    const phone = onPhone && placement !== 'panel';

    const selected = options.find((o) => o.value === value);
    const close = () => { setOpen(false); setCursor(-1); };

    // Under the field, or above it when the space below is the smaller; as
    // wide as the field; never taller than the room it has.
    const measure = useCallback(() => {
        const box = rootRef.current?.getBoundingClientRect();
        if (!box) return;
        const gap = 8;
        const edge = 8;
        const below = window.innerHeight - box.bottom - gap - 8;
        const above = box.top - gap - 8;
        const up = below < Math.min(MAX_PANEL, 200) && above > below;
        // Wide enough to read, never wider than the screen, and nudged back
        // inside it rather than hanging off an edge — a narrow field near one
        // side would otherwise put half the panel out of reach.
        const width = Math.min(Math.max(box.width, MIN_PANEL_WIDTH), window.innerWidth - edge * 2);
        const left = Math.min(Math.max(box.left, edge), window.innerWidth - width - edge);
        setPlace({
            left, width,
            maxHeight: Math.min(MAX_PANEL, up ? above : below),
            ...(up ? { bottom: window.innerHeight - box.top + gap } : { top: box.bottom + gap })
        });
    }, []);

    const openList = (withCursor) => {
        if (!phone) measure();
        setOpen(true);
        setCursor(withCursor ? Math.max(0, options.findIndex((o) => o.value === value)) : -1);
    };

    // The page scrolling or resizing moves the field; the panel follows it.
    useEffect(() => {
        if (!open || phone) return undefined;
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [open, phone, measure]);

    // Pointer or focus leaving the control closes it, the same as a real menu.
    // The list lives in a portal, so "inside" is the field or the panel.
    useEffect(() => {
        if (!open) return undefined;
        const away = (e) => {
            if (rootRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
            close();
        };
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
            openList(true);
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

    // The one list of options, shown in the phone popup or the laptop panel.
    const list = (
        <ul
            ref={listRef} role="listbox" id={id} tabIndex={-1} aria-label={label} onKeyDown={onKeyDown}
            className="min-h-0 flex-1 overflow-y-auto p-2"
        >
            {options.map((o, i) => {
                const on = o.value === value;
                return (
                    <li key={o.value} role="option" aria-selected={on}
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => pick(o.value)}
                        className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors sm:py-2.5 ${
                            on ? tone.on : cursor === i ? 'bg-slate-100 text-slate-800' : 'text-slate-700'
                        }`}>
                        <Check size={15} aria-hidden="true" className={on ? `shrink-0 ${tone.tick}` : 'shrink-0 text-transparent'} />
                        <span className="min-w-0 flex-1">{o.label}</span>
                    </li>
                );
            })}
        </ul>
    );

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button" disabled={disabled}
                aria-haspopup="listbox" aria-expanded={open} aria-label={label}
                onClick={() => { if (disabled) return; if (open) close(); else openList(false); }}
                onKeyDown={onKeyDown}
                className={className}
            >
                {Icon && <Icon size={17} className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 ${tone.icon}`} aria-hidden="true" />}
                <span className="block truncate text-left">{selected ? selected.label : ''}</span>
                <ChevronDown size={17} aria-hidden="true"
                    className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && createPortal(
                phone ? (
                    <>
                        {/* Dims the page, and catches the tap that dismisses. */}
                        <div className="fixed inset-0 z-[150] bg-slate-900/40" onClick={close} aria-hidden="true" />
                        {/* Centres the panel; a tap on it beside the panel closes. */}
                        <div className="fixed inset-0 z-[151] flex items-center justify-center p-5"
                            onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
                            <div ref={panelRef} className={`flex max-h-[min(70dvh,32rem)] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${panelClassName}`}>
                                {/* The popup covers the field that opened it, so
                                    the way out is on the popup itself. */}
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
                                <button type="button" onClick={close} aria-label="Close"
                                    className={`-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 ${tone.ring}`}>
                                    <X size={18} aria-hidden="true" />
                                </button>
                            </div>
                            {list}
                            </div>
                        </div>
                    </>
                ) : place && (
                    // On a laptop the panel sits against its field; clicking
                    // away is the exit, so it carries no close bar.
                    <div ref={panelRef}
                        style={{ position: 'fixed', left: place.left, width: place.width, top: place.top, bottom: place.bottom, maxHeight: place.maxHeight }}
                        className={`z-[151] flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${panelClassName}`}>
                        {list}
                    </div>
                ),
                document.body
            )}
        </div>
    );
}
