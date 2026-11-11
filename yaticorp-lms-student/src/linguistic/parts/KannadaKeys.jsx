/**
 * Kannada letters to tap, for a student without a Kannada keyboard (most
 * laptops): vowels, consonants and the vowel signs. A consonant followed by
 * a sign makes a syllable (ಕ + ಾ = ಕಾ); ್ joins two consonants (ನ + ್ + ನ = ನ್ನ).
 * Inserts at the cursor of the text box it is given.
 *
 * Ottakshara (2026-11-05, "add the ottakshara — how can I type that word"): the ಒತ್ತಕ್ಷರ key makes the next
 * consonant join the one before (ನ ಮ, ಒತ್ತಕ್ಷರ, ಮ = ನಮ್ಮ); while it is on, the consonants show their ottakshara
 * shapes. Its keys close together (letters.js KEY_FIT_DENSE), so the answer box stays in view above them.
 */
import { useState } from 'react';
import { Delete } from 'lucide-react';
import { KEY_ROW, KEY_FIT_DENSE } from './letters';
import { COLORS } from '../meta';

const VIRAMA = '್';
const ROWS = [
    { label: 'Vowels', keys: ['ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ', 'ಊ', 'ಋ', 'ಎ', 'ಏ', 'ಐ', 'ಒ', 'ಓ', 'ಔ'] },
    { label: 'Signs', keys: ['ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ', VIRAMA] },
    { label: 'Consonants', keys: ['ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ', 'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ', 'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ', 'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ', 'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ', 'ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ', 'ಷ', 'ಸ', 'ಹ', 'ಳ'] }
];

/**
 * @param {object}   props.inputRef  the textarea's ref
 * @param {string}   props.value
 * @param {Function} props.onChange
 */
export default function KannadaKeys({ inputRef, value, onChange, disabled = false }) {
    const [ottu, setOttu] = useState(false);
    const insert = (text) => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
        const next = value.slice(0, start) + text + value.slice(end);
        onChange(next);
        // Put the cursor after what was added, once React has written the value.
        requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start + text.length, start + text.length); } });
    };
    const back = () => {
        const el = inputRef.current;
        const start = el?.selectionStart ?? value.length, end = el?.selectionEnd ?? value.length;
        if (start !== end) { onChange(value.slice(0, start) + value.slice(end)); return; }
        if (!start) return;
        onChange(value.slice(0, start - 1) + value.slice(start));
        requestAnimationFrame(() => { if (el) { el.focus(); el.setSelectionRange(start - 1, start - 1); } });
    };
    // A consonant as an ottakshara: joined to the one before by ್ (the key once, as Shift is).
    const tap = (row, k) => {
        if (row === 'Consonants' && ottu) { insert(VIRAMA + k); setOttu(false); return; }
        insert(k);
    };
    const key = `lingo-tile kn h-[34px] px-0.5 text-[17px] leading-none text-[#4b4b4b] disabled:opacity-50 ${KEY_FIT_DENSE}`;
    return (
        <div className="@container space-y-1.5 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2" lang="kn" data-kannada-keys data-ottu={ottu || undefined}>
            {ROWS.map((r) => (
                <div key={r.label}>
                    <p className="mb-0.5 text-[10px] font-extrabold uppercase leading-tight tracking-wider text-[#AFAFAF]">{r.label === 'Consonants' && ottu ? 'Consonants · ottakshara' : r.label}</p>
                    {/* Rows as a phone keyboard's (2026-11-03: on a phone, rows that wrapped left a gap on the right). */}
                    <div className={KEY_ROW} data-key-grid>
                        {r.keys.map((k) => (
                            <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => tap(r.label, k)} aria-label={`Kannada ${k}`}
                                className={key} style={r.label === 'Consonants' && ottu ? { borderColor: COLORS.blue.face, background: COLORS.blue.light } : undefined}>
                                {r.label === 'Signs' ? `◌${k}` : r.label === 'Consonants' && ottu ? `◌${VIRAMA}${k}` : k}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex gap-1.5">
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => setOttu((o) => !o)} aria-pressed={ottu}
                    aria-label="Ottakshara: the next consonant joins the one before (ನ ಮ, ottakshara, ಮ = ನಮ್ಮ)"
                    className="lingo-tile kn inline-flex h-[34px] items-center px-2.5 text-[15px] font-bold" style={ottu ? { borderColor: COLORS.blue.face, background: COLORS.blue.face, color: '#fff' } : { color: COLORS.blue.ink }} data-ottu-key>
                    ಒತ್ತಕ್ಷರ
                </button>
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(' ')} className="lingo-tile h-[34px] flex-1 text-xs text-[#777]">Space</button>
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={back} aria-label="Delete one letter" className="lingo-tile inline-flex h-[34px] items-center gap-1 px-3 text-xs text-[#777]"><Delete size={15} /> Delete</button>
            </div>
        </div>
    );
}
