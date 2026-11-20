import { useEffect, useRef } from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

/**
 * Group E's number pad (2026-11-14): ten digits, delete and enter, big enough to tap, with the keyboard too
 * (digits, Backspace, Enter) while `active`. Controlled: `value` is a string, `onChange` gets the next string.
 */
export default function ENumPad({ value, onChange, onEnter, active = true, maxLen = 4, enterLabel = 'Enter', premium = false, disabled = false }) {
  const live = useRef({ value, onChange, onEnter });
  useEffect(() => { live.current = { value, onChange, onEnter }; });

  useEffect(() => {
    if (!active || disabled) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const { value: v, onChange: change, onEnter: enter } = live.current;
      if (/^[0-9]$/.test(e.key)) { if (v.length < maxLen) change(v + e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { change(v.slice(0, -1)); e.preventDefault(); }
      else if (e.key === 'Enter' && enter) { enter(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, disabled, maxLen]);

  const key = premium
    ? 'bg-white text-[#1b2456] ring-1 ring-[#e4e1f5] ring-inset shadow-sm hover:bg-violet-50'
    : 'bg-white text-ink-900 ring-1 ring-sky-100 ring-inset shadow-sm hover:bg-sky-50';
  const press = (d) => { if (!disabled && value.length < maxLen) onChange(value + d); };
  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2" role="group" aria-label="Number pad">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
        <button key={d} type="button" disabled={disabled} onClick={() => press(d)} className={`fp-press h-12 rounded-xl text-xl font-black tabular-nums transition disabled:opacity-40 ${key}`}>{d}</button>
      ))}
      <button type="button" disabled={disabled} onClick={() => onChange(value.slice(0, -1))} aria-label="Delete" className={`fp-press flex h-12 items-center justify-center rounded-xl transition disabled:opacity-40 ${key}`}>
        <Delete className="h-5 w-5" />
      </button>
      <button type="button" disabled={disabled} onClick={() => press('0')} className={`fp-press h-12 rounded-xl text-xl font-black transition disabled:opacity-40 ${key}`}>0</button>
      <button
        type="button"
        disabled={disabled || !value || !onEnter}
        onClick={() => onEnter && onEnter()}
        aria-label={enterLabel}
        className={`fp-press flex h-12 items-center justify-center gap-1 rounded-xl text-sm font-black text-white transition disabled:opacity-40 ${premium ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
      >
        <CornerDownLeft className="h-4 w-4" /> {enterLabel}
      </button>
    </div>
  );
}
