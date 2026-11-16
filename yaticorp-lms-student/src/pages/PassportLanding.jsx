/**
 * Where an AI Passport sticker's QR lands — <app>/passport/<ID> — and /passport
 * to scan one. No sign-in: the passport, then the student's card (scanned, or
 * its number typed), and the two are linked for good.
 *  - The card has an account: the wallet bonus is added there and then.
 *  - It has none yet: the card is verified, and the bonus is paid when the
 *    account is made — "Create my account" opens sign-up with this card.
 * Server: POST /api/auth/passport/claim.
 */
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookMarked, CreditCard, ScanLine, X, Loader2, CheckCircle2, AlertCircle, Gift, ArrowRight, Wallet, UserPlus } from 'lucide-react';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { cleanPassport, clearPendingPassport } from '../components/rewards/passportPending';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const spaced = (d) => String(d || '').replace(/\D/g, '').slice(0, 12).replace(/(\d{4})(?=\d)/g, '$1 ');
const SCANNER_ID = 'passport-landing-scanner';

/** The camera, reading one QR, then off. */
function Camera({ onRead, onFail }) {
    const readRef = useRef(onRead); readRef.current = onRead;
    const failRef = useRef(onFail); failRef.current = onFail;
    useEffect(() => {
        let cancelled = false;
        let inst = null;
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            inst = new Html5Qrcode(SCANNER_ID);
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => {
                if (cancelled) return;
                cancelled = true;
                readRef.current(text.trim());
            }, () => {});
        }).catch(() => { if (!cancelled) failRef.current(); });
        return () => {
            cancelled = true;
            if (inst) { try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* clear */ } }).catch(() => {}); } catch { /* not running */ } }
        };
    }, []);
    return <div id={SCANNER_ID} className="overflow-hidden rounded-2xl bg-black ring-1 ring-white/10" />;
}

/** Step dots: passport → card → bonus. */
function Steps({ at }) {
    const items = [['Passport', BookMarked], ['Card', CreditCard], ['Bonus', Gift]];
    return (
        <ol className="flex items-center justify-center gap-2" aria-label="Steps">
            {items.map(([label, Icon], i) => {
                const state = i < at ? 'done' : i === at ? 'now' : 'next';
                return (
                    <li key={label} className="flex items-center gap-2" aria-current={state === 'now' ? 'step' : undefined}>
                        <span className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold ring-1 transition-colors ${state === 'done' ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30' : state === 'now' ? 'bg-amber-400/15 text-amber-100 ring-amber-300/40' : 'text-slate-500 ring-white/10'}`}>
                            {state === 'done' ? <CheckCircle2 size={13} aria-hidden /> : <Icon size={13} aria-hidden />} {label}
                        </span>
                        {i < items.length - 1 && <span aria-hidden className="h-px w-3 bg-white/15" />}
                    </li>
                );
            })}
        </ol>
    );
}

export default function PassportLanding() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const fromLink = cleanPassport(useParams().code);
    const [passport, setPassport] = useState(fromLink);
    const [passportTyped, setPassportTyped] = useState('');
    // A signed-in student's own card is offered to save typing it.
    const [card, setCard] = useState(user?.cardNumber ? spaced(user.cardNumber) : '');
    const [scanning, setScanning] = useState(!fromLink);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const step = result ? 2 : passport ? 1 : 0;

    const claim = async (body) => {
        setBusy(true); setError(''); setScanning(false);
        try {
            const r = await api.post('/auth/passport/claim', { passport, ...body });
            setResult(r.data);
            clearPendingPassport();
            window.dispatchEvent(new Event('yati:progress-changed'));
        } catch (err) {
            setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'That did not go through. Please try again.'));
            // A passport the server does not know, or one taken: start again at the passport.
            if (['PASSPORT_NOT_FOUND', 'PASSPORT_INACTIVE', 'PASSPORT_EMPTY'].includes(err.response?.data?.code)) { setPassport(''); }
        } finally { setBusy(false); }
    };

    const onScan = (text) => {
        if (!passport) {
            // Reading the passport: its QR is a link ending in the ID, or the ID.
            const id = cleanPassport(text.split(/[?#/=&]/).filter(Boolean).pop() || text);
            if (!id) { setError('That QR could not be read. Try again.'); return; }
            setPassport(id); setError(''); setScanning(true);
            return;
        }
        claim({ qrCodeNumber: text });
    };

    const cardDigits = card.replace(/\D/g, '');

    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#171a2b] p-4 text-slate-100">
            <span aria-hidden className="pointer-events-none absolute -top-40 right-1/4 -z-10 h-[28rem] w-[34rem] rounded-full bg-violet-600/25 blur-[130px]" />
            <span aria-hidden className="pointer-events-none absolute -bottom-48 -left-32 -z-10 h-[26rem] w-[26rem] rounded-full bg-amber-500/15 blur-[130px]" />
            <main className="w-full max-w-sm rounded-[28px] bg-[#232740] p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.08] sm:p-7">
                <img src="/assets/YATICORP.png" alt="YATICORP" className="mx-auto mb-5 h-7 w-auto object-contain" />
                <Steps at={step} />

                {/* ── Done ── */}
                {result ? (
                    <div className="mt-6 text-center" role="status">
                        <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-8 ${result.registered ? 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/10' : 'bg-amber-400/20 text-amber-200 ring-amber-400/10'}`}>
                            {result.registered ? <Wallet size={28} aria-hidden /> : <Gift size={28} aria-hidden />}
                        </span>
                        <h1 className="mt-5 text-2xl font-black tracking-tight text-white">
                            {result.registered
                                ? (result.reward?.paid ? `${inr(result.reward.amount)} added!` : 'Passport linked')
                                : `${inr(result.reward?.amount)} is waiting`}
                        </h1>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{result.registered && result.firstName ? <>{result.firstName}, </> : null}{result.message}</p>
                        <div className="mt-4 rounded-2xl bg-black/20 px-4 py-3 text-left text-xs ring-1 ring-white/10">
                            <p className="flex justify-between gap-3"><span className="text-slate-400">AI Passport</span><span className="font-mono text-slate-100">{result.passportCode}</span></p>
                            <p className="mt-1.5 flex justify-between gap-3"><span className="text-slate-400">Student card</span><span className="font-mono text-slate-100">{spaced(result.cardNumber)}</span></p>
                        </div>
                        {result.registered ? (
                            <Link to={user ? '/enrolled-courses#wallet' : '/login'} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:brightness-110">
                                {user ? 'Open my wallet' : 'Sign in to see your wallet'} <ArrowRight size={16} aria-hidden />
                            </Link>
                        ) : (
                            <button type="button" onClick={() => navigate(`/signup?card=${result.cardNumber}`)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 hover:brightness-110">
                                <UserPlus size={16} aria-hidden /> Create my account
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="mt-6 text-center">
                            <h1 className="text-2xl font-black tracking-tight text-white">{passport ? 'Now scan your card' : 'Scan your AI Passport'}</h1>
                            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                                {passport
                                    ? 'Scan the QR on your student card to link it to this passport and claim your wallet bonus.'
                                    : 'Scan the QR on the last page of your AI Passport book.'}
                            </p>
                        </div>

                        {passport && (
                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5">
                                <BookMarked size={18} className="shrink-0 text-emerald-300" aria-hidden />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[11px] font-semibold text-emerald-300">AI Passport</p>
                                    <p className="truncate font-mono text-sm tracking-wider text-slate-100">{passport}</p>
                                </div>
                                {!fromLink && <button type="button" onClick={() => { setPassport(''); setError(''); setScanning(true); }} className="text-xs font-semibold text-slate-400 hover:text-white">Change</button>}
                            </div>
                        )}

                        <div className="mt-4">
                            {scanning ? (
                                <div>
                                    <Camera key={passport ? 'card' : 'passport'} onRead={onScan} onFail={() => { setScanning(false); setError(passport ? 'The camera is not available. Type your card number instead.' : 'The camera is not available. Type the ID under the QR instead.'); }} />
                                    <button type="button" onClick={() => setScanning(false)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white"><X size={13} aria-hidden /> Stop camera — type instead</button>
                                </div>
                            ) : passport ? (
                                <form onSubmit={(e) => { e.preventDefault(); if (cardDigits.length === 12) claim({ cardNumber: cardDigits }); }} className="space-y-3">
                                    <label htmlFor="passport-card" className="flex items-center gap-1.5 text-sm font-semibold text-slate-200"><CreditCard size={15} className="text-slate-400" /> Card number</label>
                                    <input id="passport-card" inputMode="numeric" autoComplete="off" value={card} maxLength={14} onChange={(e) => { setCard(spaced(e.target.value)); setError(''); }}
                                        placeholder="e.g. 2401 0001 9664" className="block w-full rounded-xl border border-white/10 bg-black/15 px-4 py-3.5 font-mono tracking-widest text-slate-100 placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <button type="submit" disabled={busy || cardDigits.length !== 12} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} aria-hidden />} {busy ? 'Linking…' : 'Link & claim bonus'}
                                    </button>
                                    <button type="button" onClick={() => { setError(''); setScanning(true); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"><ScanLine size={15} aria-hidden /> Scan card QR instead</button>
                                </form>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); const id = cleanPassport(passportTyped); if (id) { setPassport(id); setScanning(true); } }} className="space-y-3">
                                    <label htmlFor="passport-id" className="flex items-center gap-1.5 text-sm font-semibold text-slate-200"><BookMarked size={15} className="text-slate-400" /> AI Passport ID</label>
                                    <input id="passport-id" autoComplete="off" value={passportTyped} maxLength={64} onChange={(e) => { setPassportTyped(e.target.value.toUpperCase()); setError(''); }}
                                        placeholder="The ID under the QR" className="block w-full rounded-xl border border-white/10 bg-black/15 px-4 py-3.5 font-mono tracking-widest text-slate-100 placeholder-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                    <button type="submit" disabled={!passportTyped.trim()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-sm font-bold text-white disabled:opacity-50">Next <ArrowRight size={16} aria-hidden /></button>
                                    <button type="button" onClick={() => { setError(''); setScanning(true); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-bold text-slate-200 hover:bg-white/10"><ScanLine size={15} aria-hidden /> Scan passport QR</button>
                                </form>
                            )}
                        </div>

                        {busy && scanning === false && passport && <p className="sr-only" role="status">Linking</p>}
                        {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm font-medium text-red-300"><AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}</p>}
                        <p className="mt-5 text-center text-xs text-slate-500">One passport links to one card, for good. The bonus is paid once.</p>
                    </>
                )}
            </main>
        </div>
    );
}
