/**
 * The student's own letters to tap, for a device without that keyboard:
 * Kannada (its own keys, as before), Hindi, Japanese kana, French accents, and
 * Korean letters that join into syllables. Inserts at the cursor of the text
 * box it is given.
 */
import { createPortal } from 'react-dom';
import { Delete, Keyboard, X } from 'lucide-react';
import KannadaKeys from './KannadaKeys';
import { useState } from 'react';
import { LAYOUTS, typeAt, deleteAt, keySay, KANA_CHART, katakanaOf, modifyKana } from './letters';
import { isRtl } from '../meta';

/**
 * @param {string}   props.code      the language: kn, hi, ja, fr or ko
 * @param {object}   props.inputRef  the textarea's ref
 * @param {string}   props.value
 * @param {Function} props.onChange
 */
export default function LetterKeys({ code, inputRef, value, onChange, disabled = false }) {
    if (code === 'kn') return <KannadaKeys inputRef={inputRef} value={value} onChange={onChange} disabled={disabled} />;
    if (code === 'ja') return <JapaneseKeys inputRef={inputRef} value={value} onChange={onChange} disabled={disabled} />;
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
    const key = 'lingo-tile flex min-h-10 min-w-10 flex-col items-center justify-center px-1.5 py-1 text-lg leading-none text-[#4b4b4b] disabled:opacity-50';
    return (
        <div className="space-y-2 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2.5" lang={code} dir={isRtl(code) ? 'rtl' : undefined} data-letter-keys={code}>
            {rows.map((r) => (
                <div key={r.label}>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">{r.label}</p>
                    <div className="flex flex-wrap gap-1">
                        {r.keys.map((k) => (
                            <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => typeAt(value, s, e, k, code))} aria-label={`Letter ${k}`} className={key}>
                                {r.sign ? `◌${k}` : k}
                                {/* Its sound in English letters, under it (Japanese, 2026-10-29). */}
                                {keySay(code, k) && <span className="mt-0.5 text-[10px] font-bold leading-none text-[#9AA3AF]" lang="en" data-key-say>{keySay(code, k)}</span>}
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

/** Writes `fn`'s change into the text box and puts the cursor after it. */
const applyTo = (inputRef, value, onChange) => (fn) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
    const out = fn(start, end);
    onChange(out.value);
    requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(out.cursor, out.cursor); } });
};

/**
 * Japanese kana as their chart, the way a Japanese keyboard and the kana table show them (2026-10-29, "show the
 * keyboard correctly"): Hiragana or Katakana, a column for each consonant with its five vowels down it, each key's
 * sound in English letters under it; ゛ ゜ 小 change the kana just typed (か → が, は → ぱ, つ → っ).
 */
function JapaneseKeys({ inputRef, value, onChange, disabled }) {
    const [kata, setKata] = useState(false);
    const apply = applyTo(inputRef, value, onChange);
    const mark = (m) => apply((s, e) => {
        if (s !== e || !s) return { value, cursor: e };
        const head = value.slice(0, s - 1) + modifyKana(value.slice(s - 1, s), m);
        return { value: head + value.slice(s), cursor: head.length };
    });
    const key = 'lingo-tile flex h-11 min-w-0 flex-col items-center justify-center px-0 text-[17px] leading-none text-[#4b4b4b] disabled:opacity-50 sm:h-12 sm:text-xl';
    const small = 'lingo-tile inline-flex h-10 min-w-0 flex-1 items-center justify-center px-1 text-base text-[#4b4b4b] disabled:opacity-50';
    const tab = 'lingo-btn inline-flex h-9 flex-1 items-center justify-center px-2 text-xs';
    return (
        <div className="space-y-2 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2" lang="ja" data-letter-keys="ja" data-kana={kata ? 'katakana' : 'hiragana'}>
            <div className="flex gap-1.5">
                {[[false, 'ひらがな Hiragana'], [true, 'カタカナ Katakana']].map(([k, label]) => (
                    <button key={label} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setKata(k)} aria-pressed={kata === k} className={tab}
                        style={kata === k ? { background: '#DDF4FF', borderColor: '#84D8FF', color: '#1899D6' } : { background: '#fff', borderColor: '#E5E5E5', color: '#777' }} data-kana-tab={k ? 'katakana' : 'hiragana'}>{label}</button>
                ))}
            </div>
            {/* Down the columns: あいうえお, then かきくけこ… — in the order the chart is read. */}
            <div className="grid grid-flow-col grid-rows-5 gap-1" style={{ gridTemplateColumns: `repeat(${KANA_CHART.length}, minmax(0, 1fr))` }}>
                {KANA_CHART.flat().map((h, i) => {
                    const k = kata ? katakanaOf(h) : h;
                    return k
                        ? <button key={`${k}${i}`} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => typeAt(value, s, e, k, 'ja'))} aria-label={`Letter ${k}`} className={key}>
                            {k}<span className="mt-0.5 text-[9px] font-bold leading-none text-[#9AA3AF] sm:text-[10px]" lang="en" data-key-say>{keySay('ja', k)}</span>
                        </button>
                        : <span key={`gap${i}`} aria-hidden="true" />;
                })}
            </div>
            <div className="flex gap-1">
                {['゛', '゜', '小'].map((m) => (
                    <button key={m} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => mark(m)} className={small} aria-label={{ '゛': 'Voiced: か to が', '゜': 'Half-voiced: は to ぱ', '小': 'Small: つ to っ' }[m]} data-kana-mark={m}>{m}</button>
                ))}
                {['ー', '、', '。', '？', '！'].map((k) => (
                    <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => typeAt(value, s, e, k, 'ja'))} aria-label={`Letter ${k}`} className={small}>{k}</button>
                ))}
            </div>
            <div className="flex gap-1.5">
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => typeAt(value, s, e, ' ', 'ja'))} className="lingo-tile h-10 flex-1 text-xs text-[#777]">Space</button>
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => deleteAt(value, s, e, 'ja'))} aria-label="Delete one letter" className="lingo-tile inline-flex h-10 items-center gap-1 px-3 text-xs text-[#777]"><Delete size={15} /> Delete</button>
            </div>
        </div>
    );
}

/**
 * The letters as a keyboard that pops up (2026-10-29: "give this like a popup keyboard: when the user wants it, they
 * click the keyboard icon and the popup comes"): from the foot of the screen, over the lesson, the text box still in
 * view above it; Done closes it. What is tapped goes into the text box, as before.
 */
export function KeysPopup({ code, title, onClose, ...keys }) {
    return createPortal(
        <div className="lingo fixed inset-x-0 bottom-0 z-[96] flex justify-center px-2 pb-2 sm:px-4 sm:pb-4" role="dialog" aria-label={title} data-keys-popup={code}>
            <div className="lingo-pop w-full max-w-3xl rounded-3xl border-2 border-[#E5E5E5] bg-white p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-[#4b4b4b]"><Keyboard size={18} /> {title}</p>
                    <button type="button" onClick={onClose} onMouseDown={(e) => e.preventDefault()} className="lingo-btn inline-flex h-9 items-center gap-1.5 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: '#777' }} data-keys-close>
                        <X size={15} strokeWidth={3} /> Done
                    </button>
                </div>
                {/* What is typed, in view while the keyboard covers the box (2026-10-29). */}
                <p className="mb-2 min-h-10 truncate rounded-xl border-2 border-[#E5E5E5] bg-white px-3 py-2 text-[17px] font-semibold text-[#4b4b4b]" dir="auto" lang={code} data-keys-typed>
                    {keys.value ? (keys.value.length > 60 ? `…${keys.value.slice(-60)}` : keys.value) : <span className="text-[#AFAFAF]">…</span>}
                </p>
                <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
                    <LetterKeys code={code} {...keys} />
                </div>
            </div>
        </div>,
        document.body
    );
}
