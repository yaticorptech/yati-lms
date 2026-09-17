/**
 * @description Bring your own Gemini key. The student pastes a Google AI
 * Studio key; the server checks it live, stores it sealed, and from then on
 * Career Path, the mock interviewer and the Learning Bio writer run on it
 * instead of the platform's key, with no daily allowance.
 */
import React, { useEffect, useState } from 'react';
import { KeyRound, ExternalLink, Trash2, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';

const AiKeySettings = () => {
    const [status, setStatus] = useState(null);      // { hasKey, masked, addedAt, platformKeyAvailable }
    const [key, setKey] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [notice, setNotice] = useState(null);      // { type: 'ok' | 'error', text }

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
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <KeyRound size={20} />
                </div>
                <div className="min-w-0">
                    <h2 className="font-bold text-slate-800 text-lg">Your own AI key</h2>
                    <p className="text-sm text-slate-500">
                        Use your own free Google Gemini key for Career Path, mock interviews and your Learning Bio.
                        With your own key there is no daily AI allowance.
                    </p>
                </div>
            </div>

            {status?.hasKey ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
                    <div className="flex-1 min-w-0 text-sm">
                        <p className="font-semibold text-emerald-800">Your key is active</p>
                        <p className="text-emerald-700 font-mono truncate">{status.masked}</p>
                        {status.addedAt && <p className="text-emerald-600 text-xs mt-0.5">Added {new Date(status.addedAt).toLocaleDateString()}</p>}
                    </div>
                    <button
                        onClick={remove}
                        disabled={removing}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg disabled:opacity-50"
                    >
                        {removing ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Remove key
                    </button>
                </div>
            ) : (
                <form onSubmit={save} className="space-y-3">
                    {status && !status.platformKeyAvailable && (
                        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
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
                                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" aria-label={show ? 'Hide key' : 'Show key'}>
                                {show ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !key.trim()}
                            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                        >
                            {saving ? <><Loader2 size={16} className="animate-spin" /> Checking…</> : 'Save key'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        Get a free key at{' '}
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline inline-flex items-center gap-0.5">
                            Google AI Studio <ExternalLink size={11} />
                        </a>
                        . No card is needed. We check the key with Google before saving it, and store it encrypted.
                    </p>
                </form>
            )}

            {notice && (
                <p className={`mt-3 flex items-start gap-2 text-sm rounded-lg px-3 py-2 border ${notice.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {notice.type === 'ok' ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                    <span>{notice.text}</span>
                </p>
            )}
        </section>
    );
};

export default AiKeySettings;
