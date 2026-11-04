/**
 * @description The one way to reach support, from the login and signup pages
 * and from inside the dashboard: call the support line (opens the phone's
 * dialer) or raise a ticket, which lands on the admin panel's Tickets page.
 * Signed in, the name, email and card number come from the account.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Phone, Ticket, X, ChevronLeft, ChevronRight, Send, CheckCircle2, Loader2, LifeBuoy, Lock, ScanLine } from 'lucide-react';
import api from '../utils/api';
import useBackClose from '../native/useBackClose';

export const SUPPORT_PHONE = '9535440195';
const SCANNER_ID = 'support-card-scanner';

// Two surfaces: dark over the login screen, light over signup and the dashboard.
const TONES = {
    dark: {
        card: 'bg-[#232838] ring-1 ring-white/10 text-slate-100',
        head: 'border-white/5',
        muted: 'text-slate-400',
        label: 'text-slate-200',
        tile: 'bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08] hover:ring-white/20',
        input: 'bg-white/[0.04] border-white/15 text-slate-100 placeholder-slate-500',
        chip: 'border-white/15 text-slate-300 hover:border-white/30',
        chipOn: 'border-indigo-400 bg-indigo-500/20 text-indigo-100',
        lockedBox: 'bg-white/[0.04] ring-1 ring-white/10',
        ghost: 'text-slate-300 hover:bg-white/10',
        close: 'text-slate-400 hover:text-slate-100 hover:bg-white/10',
        error: 'bg-red-500/10 border-red-400/30 text-red-300',
        fieldErr: 'text-red-300',
    },
    light: {
        card: 'bg-white ring-1 ring-slate-900/5 text-slate-800',
        head: 'border-slate-100',
        muted: 'text-slate-500',
        label: 'text-slate-700',
        tile: 'bg-slate-50 ring-1 ring-slate-200 hover:bg-white hover:ring-indigo-300 hover:shadow-md',
        input: 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
        chip: 'border-slate-200 text-slate-600 hover:border-slate-400',
        chipOn: 'border-indigo-500 bg-indigo-50 text-indigo-700',
        lockedBox: 'bg-slate-50 ring-1 ring-slate-200',
        ghost: 'text-slate-600 hover:bg-slate-100',
        close: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
        error: 'bg-red-50 border-red-200 text-red-600',
        fieldErr: 'text-red-600',
    },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {object}  props
 * @param {Function} props.onClose
 * @param {'login'|'signup'|'dashboard'} props.page  where the ticket came from
 * @param {string}  [props.path]  the in-app address, for dashboard tickets
 * @param {object}  [props.user]  the signed-in student; fills and locks the contact fields
 * @param {'dark'|'light'} [props.tone]
 */
export default function SupportDialog({ onClose, page = 'other', path, user, tone = 'light' }) {
    const t = TONES[tone] || TONES.light;
    const signedIn = Boolean(user);
    const [view, setView] = useState('choose');          // choose | ticket | done
    const [form, setForm] = useState({
        name: user?.name || '', email: user?.email || '', cardNumber: user?.cardNumber || '', subject: '', message: ''
    });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [ref, setRef] = useState('');
    const cardRef = useRef(null);

    // Signed in, only what the account is missing can be typed.
    const locked = {
        name: signedIn && Boolean(user?.name),
        email: signedIn && Boolean(user?.email),
        cardNumber: signedIn && Boolean(user?.cardNumber),
    };
    const allLocked = locked.name && locked.email && locked.cardNumber;

    // The card's QR code, read by the camera; the server turns it into the number.
    const [scanning, setScanning] = useState(false);
    const [resolving, setResolving] = useState(false);
    const [scannedName, setScannedName] = useState('');
    const [scanError, setScanError] = useState('');
    const scannerRef = useRef(null);
    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        if (!inst) return;
        try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {}); } catch { /* was not running */ }
    };
    // The card's owner, from a scan or a typed number: fills the name and
    // email, both still editable.
    const lookedUpRef = useRef('');
    const autoRef = useRef({ name: '', email: '' });
    const lookUp = async (code, typed) => {
        setResolving(true); setScanError('');
        try {
            const res = await api.post('/auth/card-scan', { code, typed });
            const number = String(res.data.cardNumber);
            lookedUpRef.current = number;
            const owner = { name: res.data.name || '', email: res.data.email || '' };
            // Only over what nobody typed: empty, or what this filled in before.
            const pick = (cur, k) => (!cur.trim() || cur === autoRef.current[k] ? owner[k] || cur : cur);
            setForm(f => ({ ...f, cardNumber: number, name: pick(f.name, 'name'), email: pick(f.email, 'email') }));
            autoRef.current = owner;
            setScannedName(owner.name);
            setErrors(er => ({ ...er, cardNumber: '', name: '', email: '' }));
        } catch (err) {
            setScannedName('');
            setScanError(err.response?.data?.message || (typed ? 'That card number could not be checked.' : 'That card could not be read. Try again, or type the number.'));
        } finally { setResolving(false); }
    };
    const resolveScan = (code) => { stopScanner(); setScanning(false); lookUp(code, false); };
    const checkTyped = () => {
        const number = form.cardNumber.trim();
        if (locked.cardNumber || scanning || !number || lookedUpRef.current === number) return;
        lookedUpRef.current = number;
        if (!/^\d{12}$/.test(number)) { setScannedName(''); setScanError('A card number has 12 digits.'); return; }
        lookUp(number, true);
    };
    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        setScanError('');
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode(SCANNER_ID);
            scannerRef.current = inst;
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 200, height: 200 } },
                (text) => { if (!cancelled) resolveScan(text); }, () => {});
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your card number instead.');
        });
        return () => { cancelled = true; stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);
    useEffect(() => () => stopScanner(), []);
    useEffect(() => { if (view !== 'ticket') setScanning(false); }, [view]);

    useBackClose(onClose);
    useEffect(() => { cardRef.current?.focus({ preventScroll: true }); }, [view]);
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const set = (k) => (e) => {
        setForm(f => ({ ...f, [k]: e.target.value }));
        if (errors[k]) setErrors(er => ({ ...er, [k]: '' }));
    };

    const validate = () => {
        const er = {};
        if (!form.name.trim()) er.name = 'Enter your name.';
        if (!form.email.trim()) er.email = 'Enter your email.';
        else if (!EMAIL_RE.test(form.email.trim())) er.email = 'Enter a valid email.';
        if (!form.cardNumber.trim()) er.cardNumber = 'Enter your card number.';
        if (!form.subject.trim()) er.subject = 'Enter a subject.';
        if (form.message.trim().length < 10) er.message = 'Tell us a little more (at least 10 characters).';
        setErrors(er);
        return Object.keys(er).length === 0;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true); setError('');
        try {
            const where = page === 'dashboard' && path && path !== '/' ? path : '';
            const { data } = await api.post('/tickets', {
                name: form.name.trim(),
                email: form.email.trim(),
                cardNumber: form.cardNumber.trim(),
                subject: form.subject.trim(),
                message: where ? `${form.message.trim()}\n\n— Sent from ${where}` : form.message.trim(),
                page,
                ...(page === 'dashboard' && path ? { path } : {}),
            });
            setRef(data?.ticketId ? String(data.ticketId).slice(-6).toUpperCase() : '');
            setView('done');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send your ticket. Please try again, or call us.');
        } finally { setLoading(false); }
    };

    const inputCls = (bad) => `w-full rounded-xl border px-3.5 py-2.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${t.input} ${bad ? '!border-red-400' : ''}`;
    const Err = ({ id, k }) => (errors[k] ? <p id={id} className={`mt-1 text-xs font-semibold ${t.fieldErr}`}>{errors[k]}</p> : null);

    const field = (k, label, props = {}) => (
        <div>
            <label htmlFor={`support-${k}`} className={`mb-1 block text-xs font-semibold ${t.label}`}>{label} <span aria-hidden="true" className="text-red-400">*</span></label>
            <input id={`support-${k}`} value={form[k]} onChange={set(k)} aria-required="true"
                aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `support-${k}-err` : undefined}
                className={inputCls(errors[k])} {...props} />
            <Err id={`support-${k}-err`} k={k} />
        </div>
    );

    const title = view === 'ticket' ? 'Create a ticket' : view === 'done' ? 'Ticket raised' : (signedIn ? 'Contact Support' : 'Contact Admin');

    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={cardRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="support-title"
                className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl shadow-2xl focus:outline-none sm:max-w-md sm:rounded-3xl ${t.card}`}>
                {/* Header */}
                <div className={`flex items-center gap-3 border-b px-5 py-4 ${t.head}`}>
                    {view === 'ticket' ? (
                        <button type="button" onClick={() => setView('choose')} aria-label="Back"
                            className={`-ml-1 flex h-9 w-9 items-center justify-center rounded-xl transition ${t.close}`}><ChevronLeft size={20} /></button>
                    ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                            <LifeBuoy size={20} aria-hidden="true" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 id="support-title" className="text-base font-bold leading-tight">{title}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${t.close}`}><X size={18} /></button>
                </div>

                <div className="overflow-y-auto">
                    {view === 'choose' && (
                        <div className="grid gap-3 p-5">
                            <a href={`tel:${SUPPORT_PHONE}`}
                                className={`group flex items-center gap-4 rounded-2xl p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${t.tile}`}>
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500"><Phone size={22} aria-hidden="true" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold">Call support</span>
                                    <span className="block text-base font-bold tracking-wide text-emerald-500">{SUPPORT_PHONE}</span>
                                </span>
                                <ChevronRight size={18} aria-hidden="true" className={`${t.muted} transition group-hover:translate-x-0.5`} />
                            </a>
                            <button type="button" onClick={() => setView('ticket')}
                                className={`group flex items-center gap-4 rounded-2xl p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${t.tile}`}>
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500"><Ticket size={22} aria-hidden="true" /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold">Create a ticket</span>
                                </span>
                                <ChevronRight size={18} aria-hidden="true" className={`${t.muted} transition group-hover:translate-x-0.5`} />
                            </button>
                        </div>
                    )}

                    {view === 'ticket' && (
                        <form onSubmit={submit} noValidate className="space-y-4 p-5">
                            {error && <div role="alert" className={`rounded-xl border p-3 text-sm ${t.error}`}>{error}</div>}

                            {allLocked ? (
                                <div className={`rounded-2xl p-3.5 ${t.lockedBox}`}>
                                    <div className={`mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${t.muted}`}>
                                        <Lock size={11} aria-hidden="true" /> From your account
                                    </div>
                                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                        <dt className={t.muted}>Name</dt><dd className="truncate font-semibold">{form.name}</dd>
                                        <dt className={t.muted}>Email</dt><dd className="truncate font-semibold">{form.email}</dd>
                                        <dt className={t.muted}>Card</dt><dd className="truncate font-mono font-semibold">{form.cardNumber}</dd>
                                    </dl>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label htmlFor="support-cardNumber" className={`mb-1 block text-xs font-semibold ${t.label}`}>Card number <span aria-hidden="true" className="text-red-400">*</span></label>
                                        <div className="flex gap-2">
                                            <input id="support-cardNumber" value={form.cardNumber} inputMode="numeric" maxLength={12} aria-required="true" autoComplete="off"
                                                onChange={(e) => { setForm(f => ({ ...f, cardNumber: e.target.value.replace(/\D/g, '') })); setErrors(er => ({ ...er, cardNumber: '' })); setScannedName(''); setScanError(''); lookedUpRef.current = ''; }}
                                                onBlur={checkTyped}
                                                readOnly={locked.cardNumber || resolving} placeholder={resolving ? 'Checking card…' : '12-digit card number'}
                                                aria-invalid={Boolean(errors.cardNumber || scanError)} aria-describedby={errors.cardNumber ? 'support-cardNumber-err' : undefined}
                                                className={`${inputCls(errors.cardNumber || scanError)} font-mono tracking-wider ${scannedName ? '!border-emerald-500/60' : ''}`} />
                                            {!locked.cardNumber && (
                                                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setScanning(v => !v)} disabled={resolving} aria-pressed={scanning}
                                                    className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60 ${scanning ? t.chipOn : t.chip}`}>
                                                    {resolving ? <Loader2 size={16} className="animate-spin" /> : scanning ? <X size={16} /> : <ScanLine size={16} />}
                                                    {scanning ? 'Stop' : 'Scan'}
                                                </button>
                                            )}
                                        </div>
                                        <div id={SCANNER_ID} className={`mt-2 overflow-hidden rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`} />
                                        {resolving && <p role="status" className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${t.muted}`}><Loader2 size={13} className="shrink-0 animate-spin" /> Checking card…</p>}
                                        {scannedName && !scanning && !resolving && <p role="status" className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-500"><CheckCircle2 size={13} className="shrink-0" /> <span className="truncate">Card of {scannedName}</span></p>}
                                        {scanError && !resolving && <p role="alert" className={`mt-1 text-xs font-semibold ${t.fieldErr}`}>{scanError}</p>}
                                        <Err id="support-cardNumber-err" k="cardNumber" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        {field('name', 'Name', { autoComplete: 'name', placeholder: 'Your name', readOnly: locked.name })}
                                        {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'your@email.com', readOnly: locked.email })}
                                    </div>
                                </>
                            )}

                            {field('subject', 'Subject', { placeholder: 'Brief description of your issue', maxLength: 150 })}

                            <div>
                                <label htmlFor="support-message" className={`mb-1 block text-xs font-semibold ${t.label}`}>Message <span aria-hidden="true" className="text-red-400">*</span></label>
                                <textarea id="support-message" rows={4} value={form.message} onChange={set('message')} aria-required="true"
                                    aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? 'support-message-err' : undefined}
                                    className={`${inputCls(errors.message)} resize-none`} placeholder="Describe your issue in detail…" />
                                <Err id="support-message-err" k="message" />
                            </div>

                            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                                <button type="button" onClick={() => setView('choose')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${t.ghost}`}>Back</button>
                                <button type="submit" disabled={loading}
                                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-60">
                                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    {loading ? 'Sending…' : 'Submit ticket'}
                                </button>
                            </div>
                        </form>
                    )}

                    {view === 'done' && (
                        <div role="status" className="p-8 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
                                <CheckCircle2 size={28} className="text-emerald-500" />
                            </div>
                            <h3 className="mb-1 text-lg font-bold">We have your ticket</h3>
                            {ref && <p className={`mb-1 text-sm ${t.muted}`}>Reference <span className="font-mono font-bold">#{ref}</span></p>}
                            <p className={`mb-5 text-sm ${t.muted}`}>Our team will reply to {form.email.trim() || "your email"}. Need it sooner? Call <a href={`tel:${SUPPORT_PHONE}`} className="font-bold text-indigo-500 hover:underline">{SUPPORT_PHONE}</a>.</p>
                            <button type="button" onClick={onClose} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700">Done</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
