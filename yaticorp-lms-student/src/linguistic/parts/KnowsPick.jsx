/**
 * Language Learning — choosing the languages a student already speaks, writes or reads (asked 2026-10-28):
 * a search box and every language the section has, as tiles to tap on and off (blue, with a tick, when
 * chosen). Used on the last start screens (Onboarding.jsx) and on the dashboard (Dashboard.jsx).
 */
import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { COLORS, langOf } from '../meta';

const matches = (q, ...names) => !q.trim() || names.some((n) => String(n || '').toLowerCase().includes(q.trim().toLowerCase()));

/**
 * @param {Array}    props.languages  [{ code, name, native }]
 * @param {string[]} props.picked     the codes chosen
 * @param {Function} props.onChange   with the new list of codes
 * @param {string}   props.kind       'speak' | 'write' | 'read' (for the page's tests and labels)
 */
export default function KnowsPick({ languages, picked, onChange, kind }) {
    const [find, setFind] = useState('');
    // English first (2026-10-28: it was missed among the others), then the rest as the section lists them.
    const list = [...languages.filter((l) => l.code === 'en'), ...languages.filter((l) => l.code !== 'en')];
    const toggle = (code) => onChange(picked.includes(code) ? picked.filter((c) => c !== code) : [...picked, code]);
    return (
        <div data-knows-pick={kind}>
            <label className="relative mb-3 block">
                <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#AFAFAF]" aria-hidden="true" />
                <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Search languages" aria-label={`Search the languages you ${kind}`}
                    className="w-full rounded-2xl border-2 border-[#E5E5E5] bg-white py-3 pl-12 pr-4 text-[17px] font-semibold text-[#4b4b4b] placeholder:text-[#AFAFAF] focus:border-[#84D8FF] focus:outline-none" />
            </label>
            <p className="mb-2 text-sm font-extrabold text-[#777]" data-knows-count>{picked.length ? `${picked.length} chosen` : 'Choose one or more'}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.filter((l) => matches(find, l.name, l.native)).map((l) => {
                    const on = picked.includes(l.code);
                    return (
                        <button key={l.code} type="button" onClick={() => toggle(l.code)} aria-pressed={on} data-knows={l.code}
                            className="lingo-tile flex min-h-14 items-center gap-2.5 px-3 py-2 text-left" style={on ? { borderColor: '#84D8FF', background: COLORS.blue.light } : undefined}>
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: on ? COLORS.blue.face : '#AFAFAF' }} lang={l.code}>{l.code === 'en' ? 'En' : langOf(l.code).mark}</span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[15px] font-extrabold text-[#3c3c3c]" lang={l.code} dir="auto">{l.native}</span>
                                <span className="block truncate text-xs font-semibold text-[#777]">{l.name}</span>
                            </span>
                            {on && <Check size={18} strokeWidth={3.5} className="shrink-0" style={{ color: COLORS.blue.face }} />}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
