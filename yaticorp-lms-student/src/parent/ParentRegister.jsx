/**
 * A parent registers their own card (2026-11-19): its number, typed or scanned from its QR code (no CVV, 2026-11-19,
 * the user: "cvv not needed, add scan option"), their name, mobile number and a password. Shown on the sign-up page as its third choice, after Student and Teacher (2026-11-19, the user: "keep
 * parent option here only, after teacher") — in that page's own look. Then they sign in at the usual sign-in page.
 */
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CameraOff, CheckCircle2, CreditCard, Eye, EyeOff, Loader2, Lock, Mail, Phone, ScanLine, User, X } from 'lucide-react';
import api from '../utils/api';
import parentApi, { enterParent } from './parentSession';

const input = 'block w-full appearance-none rounded-xl border border-white/10 bg-black/15 px-4 py-3.5 text-slate-100 shadow-sm placeholder-slate-500 transition duration-200 focus:border-transparent focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-teal-500';
const bad = ' ring-2 ring-rose-400/70 border-transparent';

function Field({ id, label, icon: Icon, error, hint, children }) {
    return (
        <div>
            <label htmlFor={id} className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-200"><Icon size={15} className="text-slate-400" /> {label}</label>
            {children}
            {error ? <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-rose-300">{error}</p> : hint ? <p className="mt-1.5 text-xs text-slate-400">{hint}</p> : null}
        </div>
    );
}

export default function ParentRegister() {
    const [form, setForm] = useState({ cardNumber: '', name: '', phone: '', email: '', password: '', confirm: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [show, setShow] = useState(false);
    // Scanning the card's QR code: the camera, and the card it names (the same look-up as the student sign-up).
    const [scanning, setScanning] = useState(false);
    const [reading, setReading] = useState(false);
    const [scanError, setScanError] = useState('');
    // The card is checked first (2026-11-19, the user: "first verify card number"): the rest of the form opens after.
    const [verified, setVerified] = useState(false);
    const cardProblem = (e) => (e.response?.data?.code === 'CARD_USED' ? 'This card already has an account. Sign in instead.'
        : e.response?.data?.message || (!e.response ? 'Check your connection and try again.' : 'That card could not be checked.'));
    const checkCard = (body) => {
        setReading(true);
        return api.post('/auth/validate-qr', body)
            .then((r) => { setForm((f) => ({ ...f, cardNumber: String(r.data.cardNumber || '').replace(/\D/g, '').slice(0, 12) })); setErrors({}); setVerified(true); })
            .catch((e) => setErrors((x) => ({ ...x, cardNumber: cardProblem(e) })))
            .finally(() => setReading(false));
    };
    const verify = (e) => {
        e.preventDefault();
        if (form.cardNumber.length !== 12) { setErrors({ cardNumber: 'A card number has 12 digits.' }); return; }
        setScanning(false);
        checkCard({ cardNumber: form.cardNumber });
    };
    const scannerRef = useRef(null);
    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        if (!inst) return;
        try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {}); } catch { /* was not running */ }
    };
    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode('parent-card-scanner');
            scannerRef.current = inst;
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, (text) => {
                if (cancelled) return;
                setScanning(false);
                checkCard({ qrCodeNumber: text.trim() });
            }, () => {});
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your card number instead.');
        });
        return () => { cancelled = true; stopScanner(); };
        // checkCard only sets state; the camera restarts only with `scanning`.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);
    const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: k === 'cardNumber' ? e.target.value.replace(/\D/g, '').slice(0, 12) : e.target.value })); setErrors((x) => ({ ...x, [k]: '' })); };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        const problems = {};
        if (form.cardNumber.length !== 12) problems.cardNumber = 'A card number has 12 digits.';
        if (form.name.trim().length < 2) problems.name = 'Please enter your full name.';
        if (form.phone.replace(/\D/g, '').length < 10) problems.phone = 'Please enter a valid mobile number.';
        if (!form.password) problems.password = 'Please choose a password.';
        else if (form.password !== form.confirm) problems.confirm = 'The two passwords are not the same.';
        setErrors(problems);
        if (Object.keys(problems).length) return;
        setBusy(true);
        try {
            const { confirm: _c, ...body } = form;
            enterParent((await parentApi.post('/auth/register', body)).data);
        } catch (err) {
            const d = err.response?.data || {};
            const key = d.field === 'card' ? 'cardNumber' : d.field;
            if (key && key in form) setErrors({ [key]: d.message });
            else setError(d.message || (!err.response ? 'Check your connection and try again.' : 'Your account could not be created.'));
            setBusy(false);
        }
    };
    const aria = (k) => (errors[k] ? { 'aria-invalid': true, 'aria-describedby': `p-${k}-error` } : {});
    const cls = (k) => input + (errors[k] ? bad : '');

    return (
        !verified ? (
        <form onSubmit={verify} noValidate className="lg-rise mt-6 space-y-5" data-parent-verify>
            <Field id="p-cardNumber" label="Your card number" icon={CreditCard} error={errors.cardNumber} hint="The 12-digit number on your card, or scan its QR code.">
                <div className="relative">
                    <input id="p-cardNumber" inputMode="numeric" autoComplete="off" value={form.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')} onChange={set('cardNumber')} placeholder="e.g. 2401 0001 9664" className={`${cls('cardNumber')} pr-14 font-mono tracking-widest`} {...aria('cardNumber')} />
                    <button type="button" disabled={reading} onClick={() => { setScanError(''); setScanning((on) => !on); }}
                        aria-label={scanning ? 'Stop scanning' : 'Scan your card'} aria-pressed={scanning} title={scanning ? 'Stop scanning' : 'Scan your card'}
                        className={`absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:opacity-60 ${scanning ? 'bg-teal-500 text-white' : 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/30 hover:bg-teal-500/25'}`}>
                        {reading ? <Loader2 size={18} className="animate-spin" /> : scanning ? <X size={18} /> : <ScanLine size={19} />}
                    </button>
                </div>
                {/* html5-qrcode needs this element present before it starts. */}
                <div className={scanning ? 'mt-3' : 'hidden'}>
                    <div id="parent-card-scanner" className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10" />
                    <p className="mt-2 text-xs text-slate-400">Hold the QR code on your card up to the camera</p>
                </div>
                {scanError && <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200"><CameraOff size={14} className="mt-0.5 shrink-0" /> {scanError}</p>}
            </Field>
            <button type="submit" disabled={reading} className="group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0">
                {reading ? 'Checking your card…' : 'Verify Card'}
                {!reading && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
            </button>
        </form>
        ) : (
        <form onSubmit={submit} noValidate className="lg-rise mt-6 space-y-5" data-parent-register>
            <div className="flex items-center gap-3 rounded-xl bg-teal-500/10 px-4 py-3 ring-1 ring-teal-400/30" data-card-verified>
                <CheckCircle2 size={20} className="shrink-0 text-teal-300" />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-teal-200">Card verified</p>
                    <p className="font-mono text-sm font-bold tracking-widest text-white">{form.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}</p>
                </div>
                <button type="button" onClick={() => { setVerified(false); setError(''); }} className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-teal-200 hover:bg-white/10">Change</button>
            </div>
            {errors.cardNumber && <p role="alert" className="text-xs font-semibold text-rose-300">{errors.cardNumber}</p>}
            <Field id="p-name" label="Your name" icon={User} error={errors.name}>
                <input id="p-name" autoComplete="name" value={form.name} onChange={set('name')} className={cls('name')} {...aria('name')} />
            </Field>
            <Field id="p-phone" label="Mobile number" icon={Phone} error={errors.phone} hint="You can sign in with this number too.">
                <input id="p-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={cls('phone')} {...aria('phone')} />
            </Field>
            <Field id="p-email" label="Email (optional)" icon={Mail} error={errors.email}>
                <input id="p-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} className={cls('email')} {...aria('email')} />
            </Field>
            <Field id="p-password" label="Password" icon={Lock} error={errors.password} hint="At least 8 characters, with a capital letter, a number and a symbol.">
                <div className="relative">
                    <input id="p-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={set('password')} className={`${cls('password')} pr-12`} {...aria('password')} />
                    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 hover:text-white">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
            </Field>
            <Field id="p-confirm" label="Password again" icon={Lock} error={errors.confirm}>
                <input id="p-confirm" type={show ? 'text' : 'password'} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} className={cls('confirm')} {...aria('confirm')} />
            </Field>
            {error && <p role="alert" className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200 ring-1 ring-rose-400/30">{error}</p>}
            <button type="submit" disabled={busy} className="group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-500/25 transition-all hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0">
                {busy ? 'Creating your account…' : 'Create parent account'}
                {!busy && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
            </button>
        </form>
        )
    );
}
