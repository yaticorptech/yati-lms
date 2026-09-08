/** Six boxes: typing moves forward, backspace back, arrows either way, paste fills all. The value only leaves through onChange. */
import { useEffect, useRef } from 'react';
const LENGTH = 6;
export default function OtpInput({ value, onChange, disabled, invalid, autoFocus = true, onComplete }) {
    const refs = useRef([]); const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || '');
    useEffect(() => { if (autoFocus) refs.current[0]?.focus(); }, [autoFocus]);
    const set = (next) => { const clean = next.replace(/\D/g, '').slice(0, LENGTH); onChange(clean); if (clean.length === LENGTH) onComplete?.(clean); };
    const onKey = (i, e) => { if (e.key === 'Backspace') { e.preventDefault(); if (digits[i]) set(value.slice(0, i) + value.slice(i + 1)); else if (i > 0) { refs.current[i - 1]?.focus(); set(value.slice(0, i - 1) + value.slice(i)); } } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus(); else if (e.key === 'ArrowRight' && i < LENGTH - 1) refs.current[i + 1]?.focus(); };
    const onInput = (i, e) => { const typed = e.target.value.replace(/\D/g, ''); if (!typed) return; set((value.slice(0, i) + typed + value.slice(i + typed.length)).slice(0, LENGTH)); refs.current[Math.min(i + typed.length, LENGTH - 1)]?.focus(); };
    const onPaste = (e) => { e.preventDefault(); const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LENGTH); if (!t) return; set(t); refs.current[Math.min(t.length, LENGTH - 1)]?.focus(); };
    return (
        <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Enter 6-digit OTP">
            {digits.map((d, i) => (
                <input key={i} ref={(el) => { refs.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} pattern="[0-9]*" maxLength={LENGTH} aria-label={`Digit ${i + 1}`} value={d} disabled={disabled}
                    onChange={(e) => onInput(i, e)} onKeyDown={(e) => onKey(i, e)} onPaste={onPaste} onFocus={(e) => e.target.select()}
                    className={`h-12 w-10 rounded-xl border-2 bg-white text-center text-xl font-black tabular-nums text-slate-900 shadow-sm transition-all focus:outline-none focus:ring-2 sm:h-14 sm:w-12 ${invalid ? 'border-rose-300 focus:ring-rose-200' : d ? 'border-indigo-400 focus:ring-indigo-200' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-200'} disabled:bg-slate-50 disabled:opacity-60`} />
            ))}
        </div>
    );
}
