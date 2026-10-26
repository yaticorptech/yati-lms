/**
 * Date and time fields with a 12-hour clock and an AM / PM choice, the same
 * on every browser (a datetime-local or time input follows the computer's
 * own clock setting, often 24-hour). Values stay in the forms' usual shapes:
 * TimeInput "HH:mm" (24-hour), DateTimeInput "YYYY-MM-DDTHH:mm".
 */
import { useState } from 'react';
import { INPUT } from './orgUi';

const pad = (n) => String(n).padStart(2, '0');

/** "HH:mm" (24-hour) → { h12, m, pm }, or blanks. */
const split = (hhmm) => {
    const [h, m] = String(hhmm || '').split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return { h12: '', m: '', pm: false };
    return { h12: h % 12 === 0 ? 12 : h % 12, m, pm: h >= 12 };
};
const join = (h12, m, pm) => `${pad((Number(h12) % 12) + (pm ? 12 : 0))}:${pad(Number(m))}`;

const SELECT = `${INPUT} !w-[4.25rem] shrink-0 !px-2`;
/** Typed "h:mm" / "hmm" → [hour 1–12, minute], or null. */
const parse = (v) => {
    const m = String(v).match(/^(\d{1,2}):?(\d{2})$/);
    return m && +m[1] >= 1 && +m[1] <= 12 && +m[2] <= 59 ? [+m[1], +m[2]] : null;
};
const shown = (t) => (t.h12 === '' ? '' : `${t.h12}:${pad(t.m)}`);

/** Typed hh:mm (12-hour) and an AM / PM choice. `value` and `onChange` use "HH:mm" (24-hour). */
export const TimeInput = ({ value, onChange, required, disabled, label = 'Time' }) => {
    const t = split(value);
    // What is being typed; null shows the saved value.
    const [draft, setDraft] = useState(null);
    const text = draft ?? shown(t);
    const type = (raw) => {
        const v = raw.replace(/[^\d:]/g, '').slice(0, 5);
        setDraft(v);
        const m = parse(v);
        if (m) onChange(join(m[0], m[1], t.pm));
    };
    const valid = !draft || !!parse(draft);
    return (
        <span className="flex gap-1.5" role="group" aria-label={label}>
            <input type="text" inputMode="numeric" placeholder="hh:mm" aria-label="Time (hh:mm)" required={required} disabled={disabled}
                value={text} onChange={(e) => type(e.target.value)} onBlur={() => valid && setDraft(null)}
                className={`${INPUT} !w-[4.75rem] shrink-0 text-center ${valid ? '' : 'border-rose-400'}`} />
            <select aria-label="AM or PM" disabled={disabled} value={t.pm ? 'PM' : 'AM'}
                onChange={(e) => onChange(join(t.h12 || 10, t.m === '' ? 0 : t.m, e.target.value === 'PM'))} className={SELECT}>
                <option value="AM">AM</option><option value="PM">PM</option>
            </select>
        </span>
    );
};

/** A date, then hour, minute and AM / PM. `value` and `onChange` use "YYYY-MM-DDTHH:mm" ('' when empty). */
export const DateTimeInput = ({ value, onChange, required, disabled, label = 'Date and time' }) => {
    const [date, time] = value ? [value.slice(0, 10), value.slice(11, 16)] : ['', ''];
    return (
        <span className="flex flex-wrap gap-1.5 sm:flex-nowrap" role="group" aria-label={label}>
            <input type="date" required={required} disabled={disabled} value={date} aria-label="Date"
                onChange={(e) => onChange(e.target.value ? `${e.target.value}T${time || '10:00'}` : '')} className={`${INPUT} min-w-0 flex-1`} />
            <TimeInput value={time} required={required} disabled={disabled} label="Time"
                onChange={(t) => onChange(`${date || new Date().toISOString().slice(0, 10)}T${t}`)} />
        </span>
    );
};
