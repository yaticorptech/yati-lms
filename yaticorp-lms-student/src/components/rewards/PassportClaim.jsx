/**
 * AI Passport claim: a student scans the QR on the last page of their AI
 * Passport book (or types the ID under it). The first scan links the book to
 * their card for good and adds the welcome reward once. Server: /api/user/passport.
 *
 *   variant="card"  — the box at the top of the wallet; once linked, which book is theirs.
 *   variant="modal" — the body of the popup (PassportClaimPopup): opens ready to
 *                     scan, or with the ID filled in when the QR link opened the app.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookMarked, ScanLine, X, Loader2, CheckCircle2, AlertCircle, Gift, Sparkles } from 'lucide-react';
import api from '../../utils/api';
import { clearPendingPassport } from './passportPending';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

/** The camera, reading one QR, then off. */
function Camera({ id, onRead, onFail }) {
    const readRef = useRef(onRead); readRef.current = onRead;
    const failRef = useRef(onFail); failRef.current = onFail;
    useEffect(() => {
        let cancelled = false;
        let inst = null;
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            inst = new Html5Qrcode(id);
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => {
                if (cancelled) return;
                cancelled = true;
                readRef.current(text);
            }, () => {});
        }).catch(() => { if (!cancelled) failRef.current(); });
        return () => {
            cancelled = true;
            if (inst) { try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* clear */ } }).catch(() => {}); } catch { /* not running */ } }
        };
    }, [id]);
    return <div id={id} className="mx-auto w-full max-w-xs overflow-hidden rounded-xl bg-slate-900" />;
}

/** The scan / type form, and what the claim said. */
function ClaimForm({ idBase, initialCode = '', autoScan, reward, onDone, onCancel, compact }) {
    const [typed, setTyped] = useState(initialCode);
    const [scanning, setScanning] = useState(Boolean(autoScan && !initialCode));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const claim = async (raw) => {
        const code = String(raw || '').trim();
        if (!code || busy) return;
        setBusy(true); setError(''); setScanning(false);
        try {
            const r = await api.post('/user/passport/claim', { code });
            clearPendingPassport();
            window.dispatchEvent(new Event('yati:progress-changed'));
            onDone(r.data);
        } catch (err) {
            if (['PASSPORT_TAKEN', 'CARD_HAS_PASSPORT', 'PASSPORT_NOT_FOUND', 'PASSPORT_INACTIVE'].includes(err.response?.data?.code)) clearPendingPassport();
            setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'Your AI Passport could not be linked. Please try again.'));
        } finally { setBusy(false); }
    };

    return (
        <div className="space-y-3">
            {scanning && (
                <div>
                    <Camera id={`${idBase}-camera`} onRead={(t) => { setTyped(''); claim(t); }}
                        onFail={() => { setScanning(false); setError('The camera is not available. Type the ID printed under the QR instead.'); }} />
                    <p className="mt-2 text-center text-xs text-slate-500">Hold the QR on your passport's last page up to the camera</p>
                </div>
            )}
            <form onSubmit={(e) => { e.preventDefault(); claim(typed); }} className="flex gap-2">
                <label htmlFor={`${idBase}-id`} className="sr-only">AI Passport ID</label>
                <input id={`${idBase}-id`} value={typed} onChange={(e) => { setTyped(e.target.value.toUpperCase()); setError(''); }} maxLength={64} autoComplete="off"
                    placeholder={scanning ? 'Or type the ID under the QR' : 'AI Passport ID'}
                    className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm tracking-wider outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
                <button type="submit" disabled={busy || !typed.trim()} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50">
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Gift size={14} />} {compact ? 'Link' : reward > 0 ? 'Claim' : 'Link'}
                </button>
            </form>
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => { setError(''); setScanning((s) => !s); }} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-bold text-violet-700 hover:underline">
                    <ScanLine size={13} aria-hidden /> {scanning ? 'Stop camera' : 'Scan with camera'}
                </button>
                {onCancel && (
                    <button type="button" onClick={onCancel} className="inline-flex min-h-[32px] items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800">
                        <X size={13} aria-hidden /> {compact ? 'Cancel' : 'Later'}
                    </button>
                )}
            </div>
            {busy && <p className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" /> Linking your passport…</p>}
            {error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}</p>}
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400"><BookMarked size={12} aria-hidden /> One passport links to one card, for good.</p>
        </div>
    );
}

export default function PassportClaim({ variant = 'card', initialCode = '', status: given, onClaimed, onClose }) {
    const [status, setStatus] = useState(given || null);
    const [open, setOpen] = useState(false);
    const [done, setDone] = useState(null);

    useEffect(() => {
        if (given) return;
        api.get('/user/passport').then((r) => setStatus(r.data)).catch(() => setStatus(null));
    }, [given]);

    const finished = (data) => {
        setDone(data);
        setStatus((s) => ({ ...(s || {}), linked: true, code: data.passportCode, rewardedAt: data.reward?.paid ? new Date().toISOString() : s?.rewardedAt, rewardAmount: data.reward?.amount || 0 }));
        setOpen(false);
        onClaimed?.(data);
    };

    if (!status) return null;

    // ── The popup ──
    if (variant === 'modal') {
        if (done) {
            return (
                <div className="px-6 pt-8 pb-6 text-center">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50"><CheckCircle2 size={30} aria-hidden /></span>
                    <h2 className="mt-5 text-xl font-black text-slate-900">{done.reward?.paid ? `${inr(done.reward.amount)} added!` : 'Passport linked'}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{done.message}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">AI Passport {done.passportCode}</p>
                    <button type="button" onClick={onClose} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800">Done</button>
                </div>
            );
        }
        return (
            <div>
                <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-600 px-6 pt-7 pb-6 text-white">
                    <span aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.12) 0 7rem, transparent 7rem), radial-gradient(circle at 0% 100%, rgba(251,191,36,0.28), transparent 60%)' }} />
                    <p className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-white/20"><Sparkles size={12} aria-hidden /> Welcome bonus</p>
                    <h2 id="passport-popup-title" className="relative mt-3 text-2xl font-black leading-tight">{status.reward > 0 ? <>Claim {inr(status.reward)}</> : 'Link your AI Passport'}</h2>
                    <p className="relative mt-1.5 text-sm leading-relaxed text-violet-100">Scan the QR on the <span className="font-bold text-white">last page of your AI Passport</span> book. It links the book to your card and adds the bonus to your wallet — once.</p>
                </div>
                <div className="p-5 sm:p-6">
                    <ClaimForm idBase="popup-passport" initialCode={initialCode} autoScan={!initialCode} reward={status.reward} onDone={finished} onCancel={onClose} />
                </div>
            </div>
        );
    }

    // ── The wallet box ──
    if (status.linked) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={19} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">AI Passport linked</p>
                    <p className="truncate text-xs text-slate-600"><span className="font-mono">{status.code}</span>{status.rewardedAt && status.rewardAmount > 0 ? <> · {inr(status.rewardAmount)} reward added</> : ' · linked to your card'}</p>
                    {done && <p role="status" className="mt-1 text-xs font-semibold text-emerald-700">{done.message}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50">
            <div className="flex items-start gap-3 p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Gift size={19} aria-hidden /></span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">Claim your AI Passport reward</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">Scan the QR on the last page of your AI Passport book to link it to your card{status.reward > 0 ? <> and get <span className="font-bold text-slate-800">{inr(status.reward)}</span> in your wallet</> : ''}. One time only.</p>
                </div>
                {!open && (
                    <button type="button" onClick={() => setOpen(true)}
                        className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400">
                        <ScanLine size={15} aria-hidden /> Scan
                    </button>
                )}
            </div>
            {open && (
                <div className="border-t border-amber-100 bg-white/70 p-3.5">
                    <ClaimForm idBase="wallet-passport" autoScan compact reward={status.reward} onDone={finished} onCancel={() => setOpen(false)} />
                </div>
            )}
        </div>
    );
}
