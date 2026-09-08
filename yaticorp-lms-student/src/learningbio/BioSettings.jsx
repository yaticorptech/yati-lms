/** Who can see the bio: only the student, their LMS profile, or anyone with a link. */
import { useState } from 'react';
import { X, Lock, UserRound, Link2, Check, Copy } from 'lucide-react';
import { Btn } from './ui';

const OPTIONS = [
    { id: 'private', icon: Lock, title: 'Private', hint: 'Only you can see your Learning Bio.' },
    { id: 'profile', icon: UserRound, title: 'Visible on my LMS profile', hint: 'Shown on your profile inside the LMS.' },
    { id: 'shareable', icon: Link2, title: 'Shareable by link', hint: 'Anyone with the link can read a public version: bio, skills, courses, certificates, projects, achievements.' }
];

export default function BioSettings({ settings, onSave, onClose }) {
    const [choice, setChoice] = useState(settings.visibility || 'private');
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const link = settings.shareCode ? `${window.location.origin}/learning-bio/shared/${settings.shareCode}` : '';
    const save = async () => { setBusy(true); setError(''); try { await onSave({ visibility: choice }); if (choice !== 'shareable') onClose(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
    const copy = async () => { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ } };
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="bio-settings-title" onClick={(e) => e.stopPropagation()} className="rw-pop w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                    <h3 id="bio-settings-title" className="font-black text-slate-900">Bio settings</h3>
                    <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button>
                </div>
                <div className="space-y-3 p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Who can see it</p>
                    {OPTIONS.map((o) => (
                        <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors ${choice === o.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                            <input type="radio" name="visibility" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                            <span className="flex-1"><span className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><o.icon size={14} className="text-indigo-600" /> {o.title}</span><span className="block text-xs text-slate-500">{o.hint}</span></span>
                        </label>
                    ))}
                    {settings.visibility === 'shareable' && link && (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-600">{link}</span>
                            <button type="button" onClick={copy} className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-indigo-600">{copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button>
                        </div>
                    )}
                    {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
                    <div className="flex justify-end pt-1"><Btn tone="primary" icon={Check} onClick={save} loading={busy}>Save</Btn></div>
                </div>
            </div>
        </div>
    );
}
