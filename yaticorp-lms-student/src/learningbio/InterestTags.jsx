/** Interests: detected from activity, editable by the student. */
import { useState } from 'react';
import { Plus, X, Sparkles } from 'lucide-react';

export default function InterestTags({ interests = [], onChange, busy }) {
    const [draft, setDraft] = useState('');
    const add = (e) => { e.preventDefault(); const v = draft.trim(); if (!v) return; onChange({ add: [v] }); setDraft(''); };
    return (
        <div>
            <div className="flex flex-wrap gap-2">
                {interests.map((i) => (
                    <span key={i.label} className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold ${i.source === 'manual' ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800'}`}>
                        <span aria-hidden="true">{i.emoji}</span>{i.label}
                        {i.source === 'auto' && <Sparkles size={11} className="text-indigo-400" aria-label="Detected from your learning" />}
                        {onChange && <button type="button" onClick={() => onChange({ remove: [i.label] })} disabled={busy} aria-label={`Remove ${i.label}`} className="ml-0.5 rounded p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"><X size={12} /></button>}
                    </span>
                ))}
                {!interests.length && <p className="text-sm text-slate-500">Interests appear as you take courses and set goals. Add your own below.</p>}
            </div>
            {onChange && (
                <form onSubmit={add} className="mt-3 flex gap-2">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder="Add an interest, e.g. Game Development" aria-label="Add an interest"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    <button type="submit" disabled={busy || !draft.trim()} className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-indigo-200 bg-white px-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"><Plus size={14} /> Add</button>
                </form>
            )}
            <p className="mt-2 text-[11px] text-slate-400"><Sparkles size={10} className="inline -mt-0.5" /> marks interests detected from your courses, skills and goal.</p>
        </div>
    );
}
