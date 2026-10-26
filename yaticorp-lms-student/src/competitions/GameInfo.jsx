/**
 * What every competition page shares, whatever the game: the coloured top
 * banner, the "what do I do now" card with Join (off until the organizer
 * starts, then my own code), the game's rules, and the colleges taking
 * part. Chess, Rapid Fire, Code Clash, Brain Sprint and
 * Quiz Arena pages are all built from these.
 */
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Trophy, Building2, Play, CheckCircle2, Wallet, Loader2 } from 'lucide-react';
import { HERO } from './gameRules';

/** The coloured banner at the top. */
export const GameHero = ({ game, bannerUrl, chips, title, subtitle, description, meta }) => (
    <header className={`relative flex min-h-[13rem] flex-col justify-center overflow-hidden rounded-[22px] bg-gradient-to-br ${HERO[game] || HERO.quizarena} p-6 text-white shadow-lg sm:min-h-[17rem] sm:p-10`} data-game-hero={game}>
        {bannerUrl && <img src={bannerUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
        <div className="relative">
            <div className="flex flex-wrap gap-1.5">{chips}</div>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">{title}</h1>
            {subtitle && <p className="mt-1 text-base font-semibold text-white/80">{subtitle}</p>}
            {description && <p className="mt-2 max-w-2xl text-sm text-white/90 sm:text-base">{description}</p>}
            <p className="mt-5 flex flex-wrap gap-x-6 gap-y-1.5 text-sm font-semibold text-white/90 sm:text-base">
                {meta.filter(Boolean).map(([Icon, text]) => <span key={text} className="inline-flex items-center gap-1.5"><Icon size={15} aria-hidden="true" /> {text}</span>)}
            </p>
        </div>
    </header>
);

/**
 * What to do now: my status, and Join — off until the organizer starts, then
 * my own code beside it. `to`: where Join leads (the page asks for the code).
 */
export const JoinCard = ({ ok, title, note, started, code, joined, to, showJoin, label = 'Join' }) => (
    <section className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-join-card>
        <div className="min-w-0 flex-1 basis-60">
            <p className={`flex items-center gap-2 font-black ${ok ? 'text-emerald-700' : 'text-slate-900'}`}>{ok && <CheckCircle2 size={18} aria-hidden="true" />} {title}</p>
            {note && <p className="text-sm text-slate-600">{note}</p>}
        </div>
        {started && code && !joined && (
            <p className="rounded-xl bg-indigo-50 px-3 py-2 text-center text-xs font-bold text-indigo-700" data-my-code translate="no">Your joining code<span className="block font-mono text-xl tracking-[0.3em] text-indigo-900">{code}</span></p>
        )}
        {showJoin && (started && to
            ? <Link to={to} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-black text-white shadow-md hover:bg-rose-700"><Play size={16} aria-hidden="true" /> {joined ? 'Back to the game' : label}</Link>
            : <button type="button" disabled title="Opens when the organizer starts it" className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl bg-slate-200 px-5 text-sm font-black text-slate-500"><Play size={16} aria-hidden="true" /> {label}</button>)}
    </section>
);

export const HowItWorks = ({ items, extra }) => (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-how>
        <h2 className="flex items-center gap-2 font-black text-slate-900"><Trophy size={18} className="text-indigo-600" aria-hidden="true" /> Rules</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((t) => <li key={t}>{t}</li>)}</ul>
        {extra}
    </section>
);

/**
 * The entry fee, owed: pay it online (Razorpay) to enroll. Until it is paid
 * there is no joining code. `pay()` returns a promise; `onPaid` refreshes.
 */
export const PayCard = ({ amount, pay, onPaid }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const go = () => {
        setBusy(true); setError('');
        pay().then(onPaid).catch((e) => setError(e.message || 'The payment did not go through.')).finally(() => setBusy(false));
    };
    return (
        <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm" data-pay-card>
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md"><Wallet size={22} aria-hidden="true" /></span>
            <div className="min-w-0 flex-1 basis-60">
                <p className="font-black text-slate-900">Pay ₹{amount} to enroll</p>
                <p className="text-sm text-slate-600">You are approved. Pay the entry fee online (UPI, card or net banking, through Razorpay) to take part — your joining code comes only after it is paid.</p>
                {error && <p className="mt-1 text-sm font-semibold text-rose-700" role="alert">{error}</p>}
            </div>
            <button type="button" onClick={go} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-500 px-5 text-sm font-black text-white shadow-md hover:bg-amber-600 disabled:opacity-60">
                {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Wallet size={16} aria-hidden="true" />} Pay ₹{amount} online
            </button>
        </section>
    );
};

/** `rows`: [{ key, title, sub, names, mine }]. */
export const CollegesCard = ({ title = 'Participating colleges', rows, empty }) => (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-900"><Building2 size={19} className="text-indigo-600" aria-hidden="true" /> {title} <span className="text-sm font-semibold text-slate-400">({rows.length})</span></h2>
        {rows.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : (
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map((r) => (
                    <li key={r.key} className={`rounded-2xl border p-3 ${r.mine ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200'}`}>
                        <p className="truncate text-sm font-bold text-slate-900">{r.title}</p>
                        {r.sub && <p className="truncate text-xs text-slate-500">{r.sub}</p>}
                        <p className="mt-1 truncate text-xs text-slate-600">{r.names}</p>
                    </li>
                ))}
            </ul>
        )}
    </section>
);
