import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ExternalLink, KeyRound, X, ArrowRight, ArrowLeft, CheckCircle2, Loader2, Eye, EyeOff, Zap, Sparkles, HelpCircle } from 'lucide-react';
import api from '../utils/api';
import Portal from './Portal';
import { KEY_STEPS } from './AiKeySettings';
import { AI_EXHAUSTED_EVENT, AI_CREDIT_USED_EVENT } from '../utils/aiExhausted';
import { busyOnScreen, isBusyPath } from './busyScreen';
import { useLoopHidden } from './loopVisibility';
import useBackClose from '../native/useBackClose';

// Asked at most once in this long after being closed, however many calls fail meanwhile.
const QUIET_MS = 5 * 60 * 1000;
const STUDIO = 'https://aistudio.google.com/app/apikey';
// "You just used free AI credits": once per sign-in, remembered by the sign-in's token.
const NUDGE_KEY = 'yati.aiKeyNudge';
const tokenTail = () => { try { return (localStorage.getItem('studentToken') || '').slice(-24); } catch { return ''; } };
const nudgedThisSignIn = () => { try { return Boolean(tokenTail()) && localStorage.getItem(NUDGE_KEY) === tokenTail(); } catch { return false; } };
const rememberNudge = () => { try { localStorage.setItem(NUDGE_KEY, tokenTail()); } catch { /* storage unavailable */ } };

// What happened, in the student's words: [title, lead, tone].
const HEADLINE = {
    'credit-used': ['You just used free AI credits', 'Career Path, mock interviews and your Learning Bio share a daily AI allowance. Add your own free Gemini key and use AI with no daily limit.', 'nudge'],
    'own-key-quota': ['Your Gemini credits are used up', 'Your key has spent today’s free credits. Paste a new key to keep going right now.', 'out'],
    'own-key-rejected': ['Your Gemini key stopped working', 'Google refused the key you saved. Create a fresh one and paste it below.', 'out'],
    'no-key': ['Add a Gemini key to use AI', 'AI features need a Gemini key. It takes about a minute and is free.', 'out']
};
const PLATFORM = ['Today’s free AI credits are used up', 'Add your own free Gemini key and carry on now, with no daily limit.', 'out'];
const BAND = {
    nudge: 'from-indigo-600 via-violet-600 to-fuchsia-600',
    out: 'from-amber-400 via-orange-400 to-rose-500'
};

/**
 * The popup for a Gemini key, mounted once in the layout (2026-11-02):
 *   - when an answer has just spent the platform's free AI credits (AI_CREDIT_USED_EVENT), once
 *     per sign-in, and not while the student is busy (busyScreen.js: a lesson, an interview, a
 *     popup, typing…) — it waits until they are free;
 *   - when the credits are spent or the student's key is refused (AI_EXHAUSTED_EVENT), at once.
 * Like My Profile → Your own AI key: the key box first (checked live by the server, stored
 * encrypted), then "How to get a key" in three steps with pictures. It fits a phone: the steps
 * scroll inside the popup, the key box and the close button stay in view.
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
    const [nudgeWaiting, setNudgeWaiting] = useState(false);
    const { pathname } = useLocation();
    const loopHidden = useLoopHidden();
    const input = useRef(null);

    useEffect(() => {
        const out = (e) => {
            if (Date.now() < quietUntil) return;
            setNudgeWaiting(false);
            setInfo((cur) => (cur && cur.code !== 'credit-used' ? cur : e.detail));
        };
        const used = () => { if (!nudgedThisSignIn()) setNudgeWaiting(true); };
        window.addEventListener(AI_EXHAUSTED_EVENT, out);
        window.addEventListener(AI_CREDIT_USED_EVENT, used);
        return () => { window.removeEventListener(AI_EXHAUSTED_EVENT, out); window.removeEventListener(AI_CREDIT_USED_EVENT, used); };
    }, [quietUntil]);

    // The "credits used" note waits for a free moment: looked at twice a second while it waits.
    useEffect(() => {
        if (!nudgeWaiting || info) return undefined;
        const look = () => {
            if (loopHidden || isBusyPath(pathname) || busyOnScreen() || nudgedThisSignIn()) return;
            rememberNudge();
            setNudgeWaiting(false);
            setInfo({ code: 'credit-used' });
        };
        const timer = setInterval(look, 500);
        return () => clearInterval(timer);
    }, [nudgeWaiting, info, loopHidden, pathname]);

    const close = () => {
        if (saving) return;
        if (info && info.code !== 'credit-used') setQuietUntil(Date.now() + QUIET_MS);
        setInfo(null); setStep(0); setKey(''); setError(''); setSaved(false); setShow(false);
    };
    useBackClose(close, Boolean(info));
    useEffect(() => {
        if (!info) return undefined;
        const esc = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', esc);
        const before = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = before; };
    });

    if (!info) return null;
    const [title, lead, tone] = HEADLINE[info.code] || PLATFORM;
    const nudge = tone === 'nudge';

    const save = async (e) => {
        e.preventDefault();
        const trimmed = key.trim();
        if (!trimmed) { setError('Paste the key you copied from Google AI Studio.'); input.current?.focus(); return; }
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
    const s = KEY_STEPS[step];

    return (
        <Portal>
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm animate-fade-in sm:p-4" onClick={close}>
                <div role="dialog" aria-modal="true" aria-labelledby="gemini-out-title" onClick={(e) => e.stopPropagation()} data-loop-avoid
                    className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.55)]">
                    {/* The band: what happened. */}
                    <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br px-5 pt-5 pb-4 text-white sm:px-6 sm:pt-6 ${BAND[tone]}`}>
                        <span aria-hidden className="pointer-events-none absolute -top-10 -right-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
                        <button type="button" onClick={close} disabled={saving} aria-label="Close" className="absolute top-3.5 right-3.5 rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white">
                            <X size={18} />
                        </button>
                        <div className="flex items-start gap-3 pr-8">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/40">
                                {nudge ? <Sparkles size={20} /> : <Zap size={20} className="fill-white/30" />}
                            </span>
                            <div className="min-w-0">
                                <h2 id="gemini-out-title" className="text-lg font-black leading-tight sm:text-xl">{saved ? 'You’re all set' : title}</h2>
                                <p className="mt-1 text-sm text-white/90">{saved ? 'Your key is saved and checked. AI now runs on your own key, with no daily limit.' : lead}</p>
                            </div>
                        </div>
                    </div>

                    {saved ? (
                        <div className="p-6 text-center">
                            <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
                            <p className="mt-2 text-sm text-slate-500">You can change or remove it any time in My Profile → Your own AI key.</p>
                            <button type="button" onClick={close} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800">Continue</button>
                        </div>
                    ) : (
                        <>
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
                                {/* The key box, as in My Profile → Your own AI key. */}
                                <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                                    <label htmlFor="gemini-new-key" className="flex items-center gap-2 text-sm font-black text-slate-900">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><KeyRound size={15} aria-hidden="true" /></span>
                                        Your own AI key
                                    </label>
                                    <div className="relative mt-2.5">
                                        <input ref={input} id="gemini-new-key" type={show ? 'text' : 'password'} value={key} onChange={(e) => { setKey(e.target.value); setError(''); }} autoComplete="off" spellCheck={false}
                                            placeholder="Paste your Gemini API key" className="w-full rounded-xl border border-slate-300 bg-white py-3 pr-11 pl-3.5 font-mono text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
                                        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide key' : 'Show key'} className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {show ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                    {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-600">{error}</p>}
                                    <button type="submit" disabled={saving}
                                        className="mt-2.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 disabled:opacity-60">
                                        {saving ? <><Loader2 size={16} className="animate-spin" /> Checking with Google…</> : 'Save key'}
                                    </button>
                                    <p className="mt-2 text-xs text-slate-500">
                                        Get a free key at <a href={STUDIO} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 hover:underline">Google AI Studio <ExternalLink size={11} className="inline" aria-hidden="true" /></a>. No card needed; we check it with Google and store it encrypted.
                                    </p>
                                </form>

                                {/* How to get one: three steps, a picture each. */}
                                <div className="mt-5">
                                    <p className="flex items-center gap-1.5 text-sm font-black text-slate-900"><HelpCircle size={16} className="text-indigo-600" aria-hidden="true" />How to get a key — 3 steps</p>
                                    <ol className="mt-2.5 grid grid-cols-3 gap-1.5" aria-label="Steps">
                                        {KEY_STEPS.map((k, i) => (
                                            <li key={k.img}>
                                                <button type="button" onClick={() => setStep(i)} aria-current={step === i ? 'step' : undefined}
                                                    className={`flex w-full items-center gap-1.5 rounded-xl border px-2 py-1.5 text-left text-[11px] font-bold leading-tight transition-colors ${step === i ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
                                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${step === i ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{i + 1}</span>
                                                    <span className="min-w-0 truncate">{['Open', 'Create', 'Paste'][i]}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ol>
                                    <div key={step} className="mt-3 animate-fade-in-up">
                                        <img src={`/illustrations/ai-key/${s.img}`} alt={`Step ${step + 1}: ${s.title}`} className="w-full rounded-2xl border border-slate-200 bg-slate-50" />
                                        <p className="mt-3 text-[11px] font-black tracking-[0.14em] text-indigo-600 uppercase">Step {step + 1} of 3</p>
                                        <h3 className="mt-0.5 text-base font-black text-slate-900">{s.title}</h3>
                                        <p className="mt-1 text-sm text-slate-500">{s.text}</p>
                                        {step === 0 && (
                                            <a href={STUDIO} target="_blank" rel="noreferrer"
                                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-2.5 text-sm font-black text-indigo-700 hover:bg-indigo-50">
                                                Open Google AI Studio <ExternalLink size={15} />
                                            </a>
                                        )}
                                        <div className="mt-3 flex items-center justify-between">
                                            <button type="button" onClick={() => setStep((v) => v - 1)} disabled={step === 0}
                                                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-500 hover:text-slate-800 disabled:invisible">
                                                <ArrowLeft size={15} /> Back
                                            </button>
                                            {step < 2 ? (
                                                <button type="button" onClick={() => setStep((v) => v + 1)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-black text-white hover:bg-slate-800">
                                                    Next step <ArrowRight size={15} />
                                                </button>
                                            ) : (
                                                <button type="button" onClick={() => { input.current?.focus(); input.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                                                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-sm font-black text-white hover:bg-slate-800">
                                                    Paste it above <ArrowRight size={15} className="-rotate-90" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-3 sm:px-6">
                                <p className="min-w-0 text-[11px] text-slate-400">Also in My Profile → Your own AI key.</p>
                                <button type="button" onClick={close} className="shrink-0 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">{nudge ? 'Maybe later' : 'Close'}</button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Portal>
    );
}
