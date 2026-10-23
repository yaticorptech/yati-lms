/**
 * Focus mode: the page alone, filling the screen — no menus, no sidebar —
 * with the focus timer, the word count and the save status always in sight
 * at the top. On a phone it is the whole screen, sized to the space left
 * by the keyboard. Escape, the back button or "Exit" returns to the editor.
 */
import { useEffect, useRef } from 'react';
import { Minimize2 } from 'lucide-react';
import Portal from '../components/Portal';
import useBackClose from '../native/useBackClose';
import FocusTimer from './FocusTimer';
import { SaveStatus, Progress } from './ui';
import { countWords, fmtNum } from './kit';

export default function FocusWriter({ title, value, onChange, onBlur, onClose, status, timer, goal = 0, placeholder }) {
    const area = useRef(null);
    // Held in a ref: a new onClose on every keystroke must not re-run the
    // effect below, which would put the caret back at the end each time.
    const close = useRef(onClose);
    useEffect(() => { close.current = onClose; }, [onClose]);
    useBackClose(onClose);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') close.current(); };
        window.addEventListener('keydown', onKey);
        // Nothing behind it scrolls while it is open.
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        // The caret where the writing ends, ready to carry on.
        const el = area.current;
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
    }, []);

    const words = countWords(value);
    return (
        <Portal>
            <div role="dialog" aria-modal="true" aria-label={`Focus mode: ${title}`}
                className="fixed inset-0 z-[160] flex h-[100dvh] flex-col bg-[#fbfaf6]">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-[#fbfaf6]/95 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6">
                    <p className="order-1 min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{title}</p>
                    <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto">
                        <FocusTimer timer={timer} dark={false} />
                        <span className="shrink-0 text-xs font-bold text-slate-600">{fmtNum(words)}{goal > 0 ? ` / ${fmtNum(goal)}` : ''} words</span>
                        <span className="hidden sm:inline"><SaveStatus status={status} /></span>
                    </div>
                    <button type="button" onClick={onClose} className="order-2 inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 sm:order-3">
                        <Minimize2 size={14} aria-hidden="true" /> Exit focus
                    </button>
                </div>
                {goal > 0 && <div className="px-3 sm:px-6"><Progress value={(words / goal) * 100} tone="bg-emerald-400" label="Word goal" /></div>}
                <label htmlFor="focus-text" className="sr-only">Your writing</label>
                <textarea id="focus-text" ref={area} value={value} spellCheck onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
                    placeholder={placeholder}
                    className="mx-auto block min-h-0 w-full max-w-3xl flex-1 resize-none bg-transparent px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] font-serif text-[17px] leading-8 text-slate-800 placeholder:text-slate-400 focus:outline-none sm:px-8 sm:text-[19px] sm:leading-9" />
                <div className="px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-right sm:hidden"><SaveStatus status={status} /></div>
            </div>
        </Portal>
    );
}
