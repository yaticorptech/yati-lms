import { useEffect, useState } from 'react';
import { ExternalLink, KeyRound, X, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff, Zap } from 'lucide-react';
import api from '../utils/api';
import Portal from './Portal';
import { KEY_STEPS } from './AiKeySettings';
import { AI_EXHAUSTED_EVENT } from '../utils/aiExhausted';

// Asked at most once in this long after being closed, however many calls fail meanwhile.
const QUIET_MS = 5 * 60 * 1000;
const STUDIO = 'https://aistudio.google.com/app/apikey';

// What ran out, in the student's words.
const HEADLINE = {
    'own-key-quota': ['Your Gemini credits are used up', 'Your key has spent today’s free credits. Paste a new key to keep going right now.'],
    'own-key-rejected': ['Your Gemini key stopped working', 'Google refused the key you saved. Create a fresh one and paste it below.'],
    'no-key': ['Add a Gemini key to use AI', 'AI features need a Gemini key. It takes about a minute and is free.']
};
const PLATFORM = ['Today’s free AI credits are used up', 'Add your own free Gemini key and carry on now, with no daily limit.'];

/**
 * The popup for spent Gemini credits: why it appeared, then three steps — open Google AI Studio,
 * create a key, paste it here — with the key checked live by the server before it is saved.
 * Mounted once in the layout; opened by the AI_EXHAUSTED_EVENT that every API client raises.
 */
export default function GeminiExhaustedDialog() {
    const [info, setInfo] = useState(null);     // { code, message }
    const [step, setStep] = useState(0);
    const [key, setKey] = useState('');
    const [show, setShow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [saved, setSaved] = useState(false);
    const [quietUntil, setQuietUntil] = useState(0);

    useEffect(() => {
        const open = (e) => {
            if (Date.now() < quietUntil) return;
            setInfo((cur) => cur || e.detail);
        };
        window.addEventListener(AI_EXHAUSTED_EVENT, open);
        return () => window.removeEventListener(AI_EXHAUSTED_EVENT, open);
    }, [quietUntil]);

    const close = () => {
        setInfo(null); setStep(0); setKey(''); setError(''); setSaved(false); setShow(false);
        setQuietUntil(Date.now() + QUIET_MS);
    };
    useEffect(() => {
        if (!info) return undefined;
        const esc = (e) => { if (e.key === 'Escape' && !saving) close(); };
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }); // eslint-disable-line react-hooks/exhaustive-deps

    if (!info) return null;
    const [title, lead] = HEADLINE[info.code] || PLATFORM;

    const save = async (e) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) { setError('Paste the key you copied from Google AI Studio.'); return; }
        setSaving(true); setError('');
        try {
            await api.put('/user/ai-key', { key: trimmed });
            setSaved(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not save that key. Check it and try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-fade-in" onClick={() => !saving && close()}>
                <div role="dialog" aria-modal="true" aria-labelledby="gemini-out-title" onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)]">
                    {/* The headline band: what ran out. */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 px-6 pt-6 pb-5 text-white">
                        <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
                        <button type="button" onClick={close} disabled={saving} aria-label="Close" className="absolute top-4 right-4 rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white">
                            <X size={18} />
                        </button>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40"><Zap size={22} className="fill-white/30" /></span>
                        <h2 id="gemini-out-title" className="mt-3 text-xl font-black leading-tight">{saved ? 'You’re all set' : title}</h2>
                        <p className="mt-1 text-sm text-white/90">{saved ? 'Your new key is saved and checked. Try that again — it will run on your key now.' : lead}</p>

                        {/* Where they are in the three steps. */}
                        {!saved && (
                            <ol className="mt-4 flex items-center gap-2" aria-label="Steps">
                                {KEY_STEPS.map((s, i) => (
                                    <li key={s.img} className="flex flex-1 items-center gap-2">
                                        <button type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}
                                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all ${step === i ? 'scale-110 bg-white text-orange-600 shadow-lg' : step > i ? 'bg-white/90 text-emerald-600' : 'bg-white/25 text-white'}`}>
                                            {step > i ? <CheckCircle2 size={15} /> : i + 1}
                                        </button>
                                        {i < KEY_STEPS.length - 1 && <span className={`h-1 flex-1 rounded-full transition-colors ${step > i ? 'bg-white' : 'bg-white/30'}`} />}
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>

                    {saved ? (
                        <div className="p-6 text-center">
                            <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
                            <button type="button" onClick={close} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">Continue</button>
                        </div>
                    ) : (
                        <div className="p-6">
                            <div key={step} className="animate-fade-in-up">
                                <img src={`/illustrations/ai-key/${KEY_STEPS[step].img}`} alt="" className="w-full rounded-2xl border border-slate-200 bg-slate-50" />
                                <p className="mt-4 text-[11px] font-black tracking-[0.14em] text-orange-600 uppercase">Step {step + 1} of 3</p>
                                <h3 className="mt-0.5 text-lg font-black text-slate-900">{KEY_STEPS[step].title}</h3>
                                <p className="mt-1 text-sm text-slate-500">{KEY_STEPS[step].text}</p>

                                {step === 0 && (
                                    <a href={STUDIO} target="_blank" rel="noreferrer" onClick={() => setStep(1)}
                                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:brightness-105">
                                        Open Google AI Studio <ExternalLink size={15} />
                                    </a>
                                )}
                                {step === 2 && (
                                    <form onSubmit={save} className="mt-4 space-y-2">
                                        <label htmlFor="gemini-new-key" className="sr-only">Gemini API key</label>
                                        <div className="relative">
                                            <KeyRound size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" />
                                            <input id="gemini-new-key" type={show ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)} autoFocus autoComplete="off" spellCheck={false}
                                                placeholder="Paste your key (AIza…)" className="w-full rounded-xl border border-slate-300 py-3 pr-11 pl-10 font-mono text-sm outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
                                            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide key' : 'Show key'} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {show ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {error && <p role="alert" className="text-sm font-semibold text-rose-600">{error}</p>}
                                        <button type="submit" disabled={saving}
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-500/30 hover:brightness-105 disabled:opacity-60">
                                            {saving ? <><Loader2 size={16} className="animate-spin" /> Checking with Google…</> : <>Save key &amp; continue</>}
                                        </button>
                                        <p className="text-center text-xs text-slate-400">Checked live, then stored encrypted. Change it any time in My Profile.</p>
                                    </form>
                                )}
                            </div>

                            <div className="mt-5 flex items-center justify-between">
                                <button type="button" onClick={() => setStep((s) => s - 1)} disabled={step === 0}
                                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 disabled:invisible">
                                    <ArrowLeft size={15} /> Back
                                </button>
                                {step < 2 && (
                                    <button type="button" onClick={() => setStep((s) => s + 1)}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">
                                        {step === 0 ? 'I’m signed in' : 'I’ve copied my key'} <ArrowRight size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Portal>
    );
}
