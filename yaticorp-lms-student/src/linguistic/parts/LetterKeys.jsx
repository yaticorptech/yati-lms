/**
 * The student's own letters to tap, for a device without that keyboard:
 * Kannada (its own keys, as before), Hindi, Japanese kana, French accents, and
 * Korean letters that join into syllables. Inserts at the cursor of the text
 * box it is given.
 */
import { Delete } from 'lucide-react';
import KannadaKeys from './KannadaKeys';
import { LAYOUTS, typeAt, deleteAt } from './letters';
import { isRtl } from '../meta';

/**
 * @param {string}   props.code      the language: kn, hi, ja, fr or ko
 * @param {object}   props.inputRef  the textarea's ref
 * @param {string}   props.value
 * @param {Function} props.onChange
 */
export default function LetterKeys({ code, inputRef, value, onChange, disabled = false }) {
    if (code === 'kn') return <KannadaKeys inputRef={inputRef} value={value} onChange={onChange} disabled={disabled} />;
    const rows = LAYOUTS[code];
    if (!rows) return null;
    const apply = (fn) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
        const out = fn(start, end);
        onChange(out.value);
        // Put the cursor after what changed, once React has written the value.
        requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(out.cursor, out.cursor); } });
    };
    const key = 'lingo-tile h-10 min-w-10 px-1.5 text-lg leading-none text-[#4b4b4b] disabled:opacity-50';
    return (
        <div className="space-y-2 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2.5" lang={code} dir={isRtl(code) ? 'rtl' : undefined} data-letter-keys={code}>
            {rows.map((r) => (
                <div key={r.label}>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">{r.label}</p>
                    <div className="flex flex-wrap gap-1">
                        {r.keys.map((k) => (
                            <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => typeAt(value, s, e, k, code))} aria-label={`Letter ${k}`} className={key}>
                                {r.sign ? `◌${k}` : k}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex gap-1.5">
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => typeAt(value, s, e, ' ', code))} className="lingo-tile h-10 flex-1 text-xs text-[#777]">Space</button>
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => deleteAt(value, s, e, code))} aria-label="Delete one letter" className="lingo-tile inline-flex h-10 items-center gap-1 px-3 text-xs text-[#777]"><Delete size={15} /> Delete</button>
            </div>
        </div>
    );
}
