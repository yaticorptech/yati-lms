/**
 * Kannada letters to tap, for a student without a Kannada keyboard (most
 * laptops): vowels, consonants and the vowel signs. A consonant followed by
 * a sign makes a syllable (ಕ + ಾ = ಕಾ); ್ joins two consonants (ನ + ್ + ನ = ನ್ನ).
 * Inserts at the cursor of the text box it is given.
 */
import { Delete } from 'lucide-react';

const ROWS = [
    { label: 'Vowels', keys: ['ಅ', 'ಆ', 'ಇ', 'ಈ', 'ಉ', 'ಊ', 'ಋ', 'ಎ', 'ಏ', 'ಐ', 'ಒ', 'ಓ', 'ಔ'] },
    { label: 'Signs', keys: ['ಾ', 'ಿ', 'ೀ', 'ು', 'ೂ', 'ೃ', 'ೆ', 'ೇ', 'ೈ', 'ೊ', 'ೋ', 'ೌ', 'ಂ', 'ಃ', '್'] },
    { label: 'Consonants', keys: ['ಕ', 'ಖ', 'ಗ', 'ಘ', 'ಙ', 'ಚ', 'ಛ', 'ಜ', 'ಝ', 'ಞ', 'ಟ', 'ಠ', 'ಡ', 'ಢ', 'ಣ', 'ತ', 'ಥ', 'ದ', 'ಧ', 'ನ', 'ಪ', 'ಫ', 'ಬ', 'ಭ', 'ಮ', 'ಯ', 'ರ', 'ಲ', 'ವ', 'ಶ', 'ಷ', 'ಸ', 'ಹ', 'ಳ'] }
];

/**
 * @param {object}   props.inputRef  the textarea's ref
 * @param {string}   props.value
 * @param {Function} props.onChange
 */
export default function KannadaKeys({ inputRef, value, onChange, disabled = false }) {
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
    return (
        <div className="space-y-2 rounded-2xl border-2 border-[#E5E5E5] bg-[#F7F7F7] p-2.5" lang="kn" data-kannada-keys>
            {ROWS.map((r) => (
                <div key={r.label}>
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#AFAFAF]">{r.label}</p>
                    <div className="flex flex-wrap gap-1">
                        {r.keys.map((k) => (
                            <button key={k} type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(k)} aria-label={`Kannada ${k}`}
                                className="lingo-tile kn h-10 min-w-10 px-1.5 text-lg leading-none text-[#4b4b4b] disabled:opacity-50">
                                {r.label === 'Signs' ? `◌${k}` : k}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <div className="flex gap-1.5">
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(' ')} className="lingo-tile h-10 flex-1 text-xs text-[#777]">Space</button>
                <button type="button" disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={back} aria-label="Delete one letter" className="lingo-tile inline-flex h-10 items-center gap-1 px-3 text-xs text-[#777]"><Delete size={15} /> Delete</button>
            </div>
        </div>
    );
}
