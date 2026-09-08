/**
 * Edit the wording. The student's text is stored apart from the AI's, and
 * the page says which one is showing; switching back to the AI text never
 * loses what they wrote.
 */
import { useState } from 'react';
import { X, Save, Sparkles, PenLine } from 'lucide-react';
import { Btn } from './ui';

export default function BioEditor({ bio, onSave, onClose }) {
    const [headline, setHeadline] = useState(bio.custom.headline || bio.ai.headline || '');
    const [text, setText] = useState(bio.custom.bio || bio.ai.bio || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const save = async (useCustom) => {
        setBusy(true); setError('');
        try { await onSave(useCustom ? { headline, bio: text, useCustom: true } : { useCustom: false }); onClose(); }
        catch (e) { setError(e.message); }
        finally { setBusy(false); }
    };
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="bio-edit-title" onClick={(e) => e.stopPropagation()} className="rw-pop w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h3 id="bio-edit-title" className="flex items-center gap-2 font-black text-slate-900"><PenLine size={17} className="text-indigo-600" /> Edit your bio</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button>
                </div>
                <div className="space-y-4 p-5">
                    <p className="rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-800">Your own wording is kept separately from the AI-written bio and shown in its place. The AI version stays available under <span className="font-bold">Use AI version</span>.</p>
                    <div>
                        <label htmlFor="bio-headline" className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Headline</label>
                        <input id="bio-headline" value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={80} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" placeholder="Aspiring Full-Stack Developer" />
                    </div>
                    <div>
                        <label htmlFor="bio-text" className="mb-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Bio</label>
                        <textarea id="bio-text" value={text} onChange={(e) => setText(e.target.value)} rows={6} maxLength={1200} className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                        <p className="mt-1 flex justify-between text-[11px] text-slate-400"><span>Two or three sentences about you as a learner: your interests, the skills you are developing and how.</span><span>{text.length}/1200</span></p>
                    </div>
                    {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                        {bio.useCustom && <Btn icon={Sparkles} onClick={() => save(false)} loading={busy}>Use AI version</Btn>}
                        <Btn tone="primary" icon={Save} onClick={() => save(true)} loading={busy} disabled={!text.trim()}>Save my wording</Btn>
                    </div>
                </div>
            </div>
        </div>
    );
}
