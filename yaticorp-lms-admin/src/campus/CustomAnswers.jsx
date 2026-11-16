/**
 * The college's own admission questions (2026-11-16, Admissions → Customize form): one input per
 * question type, and the "More details" section the admission and application forms show them in.
 * Answers live in the details under the question's id; a multi-choice answer is "A, B".
 */
import React from 'react';
import { Field, Input, Select, Textarea } from './ui';

export const QUESTION_TYPES = [
    ['text', 'Short answer'], ['long', 'Paragraph'], ['number', 'Number'], ['date', 'Date'],
    ['select', 'Dropdown (one)'], ['multi', 'Checkboxes (many)'], ['yesno', 'Yes / No']
];

export const AnswerInput = ({ q, value = '', onChange }) => {
    if (q.type === 'select') return <Select value={value} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{(q.options || []).map((o) => <option key={o}>{o}</option>)}</Select>;
    if (q.type === 'yesno') return <Select value={value} onChange={(e) => onChange(e.target.value)}><option value="">—</option><option>Yes</option><option>No</option></Select>;
    if (q.type === 'long') return <Textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={1000} />;
    if (q.type === 'multi') {
        const picked = String(value || '').split(', ').filter(Boolean);
        const toggle = (o) => onChange((picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o]).filter((x) => (q.options || []).includes(x)).join(', '));
        return (
            <div className="flex flex-wrap gap-2">
                {(q.options || []).map((o) => (
                    <label key={o} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 transition ${picked.includes(o) ? 'bg-petrol-50 font-semibold text-petrol-800 ring-petrol-300' : 'bg-white text-ink-2 ring-line hover:bg-paper'}`}>
                        <input type="checkbox" checked={picked.includes(o)} onChange={() => toggle(o)} className="h-4 w-4 accent-petrol-700" /> {o}
                    </label>
                ))}
            </div>
        );
    }
    return <Input type={q.type === 'number' ? 'number' : q.type === 'date' ? 'date' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} />;
};

/** The college's questions as a form section; nothing when it has none. */
export const MoreDetails = ({ fields = [], details, setDetails }) => {
    const custom = fields.filter((f) => f.custom);
    if (!custom.length) return null;
    return (
        <section>
            <h3 className="mb-3 font-display text-base font-semibold">More details</h3>
            <div className="grid gap-4 sm:grid-cols-2">
                {custom.map((q) => (
                    <Field key={q.key} label={`${q.label}${q.required ? ' *' : ''}`} className={['long', 'multi'].includes(q.type) ? 'sm:col-span-2' : ''}>
                        <AnswerInput q={q} value={details[q.key] || ''} onChange={(v) => setDetails({ ...details, [q.key]: v })} />
                    </Field>
                ))}
            </div>
        </section>
    );
};
