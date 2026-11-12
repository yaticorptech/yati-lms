/**
 * The student's own letters to tap, for a device without that keyboard:
 * Kannada (its own keys, as before), Hindi, Japanese kana, a whole keyboard for
 * Spanish, French, German and Portuguese, and Korean letters that join into syllables. Inserts at the cursor of the text
 * box it is given.
 */
import { createPortal } from 'react-dom';
import { ArrowBigUp, Delete, Keyboard, X } from 'lucide-react';
import KannadaKeys from './KannadaKeys';
import { useLayoutEffect, useRef, useState } from 'react';
import { LAYOUTS, LATIN, capitalOf, typeAt, deleteAt, keySay, KANA_CHART, katakanaOf, modifyKana, KEY_ROW, KEY_FIT } from './letters';
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
    if (LATIN[code]) return <LatinKeys code={code} inputRef={inputRef} value={value} onChange={onChange} disabled={disabled} />;
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
    const key = `lingo-tile flex min-h-10 flex-col items-center justify-center px-0.5 py-1 text-lg leading-none text-[#4b4b4b] disabled:opacity-50 ${KEY_FIT}`;
    return (
        <div className="@container space-y-2 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2.5" lang={code} dir={isRtl(code) ? 'rtl' : undefined} data-letter-keys={code}>
            {rows.map((r) => (
                <div key={r.label}>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">{r.label}</p>
                    {/* Rows as a phone keyboard's (2026-11-03, as the Kannada keys). */}
                    <div className={KEY_ROW} data-key-grid>
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
 * A whole keyboard for a language in the English alphabet (2026-10-31, `LATIN`): its letters in its own keyboard's
 * rows, Shift for one capital (held on with a second tap), then its accents and marks; Space and Delete.
 */
function LatinKeys({ code, inputRef, value, onChange, disabled }) {
    const [shift, setShift] = useState(0);              // 0 off, 1 the next letter, 2 on until tapped again
    const apply = applyTo(inputRef, value, onChange);
    const { rows, accents, marks } = LATIN[code];
    const big = (k) => (shift ? capitalOf(k) : k);
    const type = (k) => { apply((s, e) => typeAt(value, s, e, k, code)); if (shift === 1) setShift(0); };
    const key = 'lingo-tile flex h-11 min-w-0 flex-1 items-center justify-center px-0 text-[17px] leading-none text-[#4b4b4b] disabled:opacity-50 sm:h-12 sm:text-xl';
    const letter = (k) => <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => type(big(k))} aria-label={`Letter ${big(k)}`} className={key} data-key={k}>{big(k)}</button>;
    const width = Math.max(...rows.map((r) => [...r].length));
    return (
        <div className="@container space-y-1.5 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2" lang={code} data-letter-keys={code} data-latin data-shift={shift}>
            {rows.map((r, i) => (
                // Each row as wide as its keys, the keys one size, centred as a keyboard's are.
                <div key={r} className="mx-auto flex gap-1" style={{ width: `${(([...r].length + (i === rows.length - 1 ? 1.5 : 0)) / width) * 100}%` }}>
                    {i === rows.length - 1 && (
                        <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => setShift((x) => (x ? (x === 1 ? 2 : 0) : 1))} aria-pressed={!!shift} aria-label={shift === 2 ? 'Capitals on' : 'Shift: a capital letter'}
                            className="lingo-tile flex h-11 min-w-0 flex-[1.5] items-center justify-center px-0 disabled:opacity-50 sm:h-12" style={shift ? { background: '#DDF4FF', borderColor: '#84D8FF', color: '#1899D6' } : { color: '#777' }} data-shift-key>
                            <ArrowBigUp size={20} fill={shift === 2 ? 'currentColor' : 'none'} />
                        </button>
                    )}
                    {[...r].map(letter)}
                </div>
            ))}
            {accents.length > 0 && (
                <div>
                    <p className="mb-1 mt-1 text-[10px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">Accents</p>
                    <div className={KEY_ROW} data-key-grid>{accents.map((k) => <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => type(big(k))} aria-label={`Letter ${big(k)}`} className={`lingo-tile flex h-10 items-center justify-center px-0.5 text-lg leading-none text-[#4b4b4b] disabled:opacity-50 ${KEY_FIT}`} data-key={k}>{big(k)}</button>)}</div>
                </div>
            )}
            <div className="flex gap-1">
                {marks.map((k) => <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => type(k)} aria-label={`Mark ${k}`} className="lingo-tile flex h-10 min-w-0 flex-1 items-center justify-center px-0 text-lg leading-none text-[#4b4b4b] disabled:opacity-50" data-key={k}>{k}</button>)}
            </div>
            <div className="flex gap-1.5">
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => type(' ')} className="lingo-tile h-10 flex-1 text-xs text-[#777]">Space</button>
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => apply((s, e) => deleteAt(value, s, e, code))} aria-label="Delete one letter" className="lingo-tile inline-flex h-10 items-center gap-1 px-3 text-xs text-[#777]"><Delete size={15} /> Delete</button>
            </div>
        </div>
    );
}

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
 *
 * The answer box itself in view (2026-11-05, "the keyboard hides the answer space"): the page gets room at its foot as
 * tall as the keyboard, and the box is scrolled up over it — so no copy of what is typed on the keyboard (from
 * 2026-10-29 until then).
 */
export function KeysPopup({ code, title, onClose, ...keys }) {
    const box = useRef(null);
    const { inputRef } = keys;
    useLayoutEffect(() => {
        const pop = box.current, input = inputRef?.current;
        const page = input?.closest('main');
        if (!pop || !input || !page) return undefined;
        const was = page.style.paddingBottom;
        const fit = () => {
            // The frame at the foot of the screen (not the card in it, which pops in grown from smaller).
            const top = pop.getBoundingClientRect().top;
            page.style.paddingBottom = `${pop.offsetHeight + 16}px`;
            // The box's foot just above the keyboard (its head not above the page's).
            const r = input.getBoundingClientRect(), head = page.getBoundingClientRect().top;
            const by = Math.min(r.bottom - (top - 12), r.top - head);
            if (by > 0) page.scrollTop += by;
        };
        fit();
        const ro = new ResizeObserver(fit);
        ro.observe(pop);
        return () => { ro.disconnect(); page.style.paddingBottom = was; };
    }, [inputRef]);
    return createPortal(
        <div ref={box} className="lingo fixed inset-x-0 bottom-0 z-[96] flex justify-center px-2 pb-2 sm:px-4 sm:pb-4" role="dialog" aria-label={title} data-keys-popup={code}>
            <div className="lingo-pop w-full max-w-3xl rounded-3xl border-2 border-[#E5E5E5] bg-white p-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.15)]">
                <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-[#4b4b4b]"><Keyboard size={18} /> {title}</p>
                    <button type="button" onClick={onClose} onMouseDown={(e) => e.preventDefault()} className="lingo-btn inline-flex h-8 items-center gap-1.5 px-3 text-xs" style={{ background: '#fff', borderColor: '#E5E5E5', color: '#777' }} data-keys-close>
                        <X size={15} strokeWidth={3} /> Done
                    </button>
                </div>
                <div className="max-h-[46vh] overflow-y-auto overscroll-contain">
                    <LetterKeys code={code} {...keys} />
                </div>
            </div>
        </div>,
        document.body
    );
}
