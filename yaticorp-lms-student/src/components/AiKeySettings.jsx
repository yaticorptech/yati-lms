/**
 * @description Bring your own Gemini key. The student pastes a Google AI
 * Studio key; the server checks it live, stores it sealed, and from then on
 * Career Path, the mock interviewer and the Learning Bio writer run on it
 * instead of the platform's key, with no daily allowance.
 */
import React, { useEffect, useState } from 'react';
import { KeyRound, ExternalLink, Trash2, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, HelpCircle, X } from 'lucide-react';
import api from '../utils/api';
import useJobsAccess from '../hooks/useJobsAccess';
import useConfirmDialog from './useConfirmDialog';

// The three screens a student goes through in Google AI Studio, drawn as
// mock-ups in public/illustrations/ai-key.
const KEY_STEPS = [
    { img: 'step1.svg', title: 'Open Google AI Studio', text: 'Go to aistudio.google.com/app/apikey and sign in with your Google account.' },
    { img: 'step2.svg', title: 'Create an API key', text: 'Click "Create API key", pick the default project, then "Create key".' },
    { img: 'step3.svg', title: 'Copy and paste it here', text: 'Copy the key (it starts with AIza), paste it in the box and tap "Save key".' }
];

const KeyGuide = () => {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg"
            >
                <HelpCircle size={14} /> How to get a key — 3 steps
            </button>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="How to get a Gemini API key"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5"
                    >
                        <div className="flex items-start justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-black text-slate-900">Get your free Gemini key in 3 steps</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Takes about a minute. No card needed.</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <ol className="grid gap-3 sm:grid-cols-3">
                            {KEY_STEPS.map((s, i) => (
                                <li key={s.img} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                    <img
                                        src={`/illustrations/ai-key/${s.img}`}
                                        alt={`Step ${i + 1}: ${s.title}`}
                                        className="w-full rounded-lg border border-slate-200 bg-white"
                                    />
                                    <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[0.65rem] flex items-center justify-center shrink-0">{i + 1}</span>
                                        {s.title}
                                    </p>
                                    <p className="mt-1 text-[0.7rem] text-slate-500">{s.text}</p>
                                </li>
                            ))}
                        </ol>
                        <div className="mt-4 flex justify-end">
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold"
                            >
                                Open Google AI Studio <ExternalLink size={13} />
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const AiKeyForm = () => {
    const [status, setStatus] = useState(null);      // { hasKey, masked, addedAt, platformKeyAvailable }
    const [key, setKey] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [notice, setNotice] = useState(null);      // { type: 'ok' | 'error', text }
    // Asked first, in the app's own dialog, as removing a resume or a
    // certificate is: the key is gone the moment the server hears.
    const [confirm, confirmDialog] = useConfirmDialog();

    const load = async () => {
        try {
            const res = await api.get('/user/ai-key');
            setStatus(res.data);
        } catch {
            setStatus({ hasKey: false, platformKeyAvailable: true });
        }
    };

    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) return;
        setSaving(true); setNotice(null);
        try {
            const res = await api.put('/user/ai-key', { key: trimmed });
            setNotice({ type: 'ok', text: res.data.message });
            setKey('');
            await load();
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.message || 'Could not save the key. Try again.' });
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        const ok = await confirm({
            title: 'Remove your AI key?',
            message: status?.platformKeyAvailable === false
                ? 'AI features turn off until you add a key again.'
                : 'Career Path, mock interviews and your Learning Bio go back to the platform key and its daily allowance. You can add a key again any time.',
            confirmLabel: 'Remove key',
            destructive: true
        });
        if (!ok) return;
        setRemoving(true); setNotice(null);
        try {
            const res = await api.delete('/user/ai-key');
            setNotice({ type: 'ok', text: res.data.message });
            await load();
        } catch (err) {
            setNotice({ type: 'error', text: err.response?.data?.message || 'Could not remove the key.' });
        } finally {
            setRemoving(false);
        }
    };

    return (
        // Sized to sit beside the Google account card on My Profile: the same
        // padding, icon and type scale, so the pair reads as one row of settings.
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <KeyRound size={20} />
                </div>
                <div className="min-w-0">
                    <h2 className="font-black text-slate-900 text-sm">Your own AI key</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Use your own free Gemini key for Career Path, mock interviews and your Learning Bio — with no daily AI allowance.
                    </p>
                </div>
            </div>

            {status?.hasKey ? (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                    <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-emerald-800">Your key is active</p>
                        <p className="text-emerald-700 font-mono truncate">{status.masked}</p>
                        {status.addedAt && <p className="text-emerald-600 text-xs mt-0.5">Added {new Date(status.addedAt).toLocaleDateString()}</p>}
                    </div>
                    <button
                        onClick={remove}
                        disabled={removing}
                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                    >
                        {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        Remove key
                    </button>
                </div>
            ) : (
                <form onSubmit={save} className="space-y-2">
                    {status && !status.platformKeyAvailable && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            AI features are off until you add a key.
                        </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                            <input
                                type={show ? 'text' : 'password'}
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                placeholder="Paste your Gemini API key"
                                autoComplete="off"
                                spellCheck={false}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 after:absolute after:-inset-2 after:content-['']" aria-label={show ? 'Hide key' : 'Show key'}>
                                {show ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !key.trim()}
                            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50"
                        >
                            {saving ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : 'Save key'}
                        </button>
                    </div>
                    <p className="text-[0.7rem] text-slate-500">
                        Get a free key at{' '}
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                            Google AI Studio <ExternalLink size={11} />
                        </a>
                        . No card needed; we check it with Google and store it encrypted.
                    </p>
                    <KeyGuide />
                </form>
            )}

            {notice && (
                <p className={`mt-3 flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {notice.type === 'ok' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                    <span>{notice.text}</span>
                </p>
            )}
            {confirmDialog}
        </section>
    );
};

/**
 * Not shown to the demo cards (the account owner's rule, 2026-10-08; the
 * list is on the server, services/fullAccess.js). Shown once the check says
 * this is not one of them, so it never flashes up for a demo card first; a
 * check that fails shows it, as it always did.
 */
const AiKeySettings = () => {
    const { loading, fullAccess } = useJobsAccess();
    if (loading || fullAccess) return null;
    return <AiKeyForm />;
};

export default AiKeySettings;
