/**
 * @author Preethesh Kulal
 * @description Multi-step student registration with QR code scan/manual entry
 */
import Mascot from '../components/Mascot';
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, QrCode, Lock, Keyboard, ScanLine, CameraOff, ArrowRight, ArrowLeft, ChevronRight, BookOpen, UserPlus, User, Mail, Phone, CreditCard } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

// Password strength validator
const getPasswordStrengthError = (pw) => {
    if (!pw || pw.length < 8) return 'Min 8 characters required.';
    if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Must include a number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character.';
    return null;
};

// Contact Admin Modal
const ContactAdminModal = ({ onClose, page = 'signup' }) => {
    const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/tickets', { ...form, page });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><MessageCircleQuestion size={20} className="text-indigo-600" /></div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Contact Admin</h2>
                            <a href="tel:9535440195" className="text-sm text-indigo-600 font-semibold hover:underline">📞 9535440195</a>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                {done ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} className="text-emerald-600" /></div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Message Sent!</h3>
                        <p className="text-slate-500 text-sm mb-4">We've received your request and will get back to you soon.</p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Your name" /></div>
                            <div><label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label><input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="your@email.com" /></div>
                        </div>
                        <div><label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label><input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Brief description of your issue" /></div>
                        <div><label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label><textarea required rows="3" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Describe your issue..." /></div>
                        <div className="flex justify-end space-x-3 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center disabled:opacity-50"><Send size={14} className="mr-1.5" />{loading ? 'Sending...' : 'Send Message'}</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


// A twinkling star, shared look with the login page. Module-level so the
// page's re-renders do not remount it and restart its animation.
const Sparkle = ({ className, delay = 0, size = 'text-base' }) => (
    <span aria-hidden="true" className={`lg-twinkle pointer-events-none absolute ${size} ${className}`} style={{ animationDelay: `${delay}s` }}>✦</span>
);

const STEPS = [
    ['Verify your card', 'Scan the QR code on your YATICORP card, or type it in.'],
    ['Your details', 'Tell us your name, email and phone number.'],
    ['Set a password', 'Choose a strong password to protect your account.'],
];

const inputClass = 'block w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-sm placeholder-slate-400 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500';
const primaryBtn = 'group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:translate-y-0';
const backBtn = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50';

const Signup = () => {
    const { setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showContact, setShowContact] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    // QR validation state
    const [qrCodeNumber, setQrCodeNumber] = useState('');
    const [_qrValidated, setQrValidated] = useState(false);
    const [qrValidating, setQrValidating] = useState(false);
    // Card details fetched from backend after QR validation (stored internally)
    const [cardDetails, setCardDetails] = useState({ CardNumber: '', CVV: '' });

    /* Reading the card. Same shape as the login page: a scan / type switch,
       a camera that only runs while `scanning` is true, and a fallback to
       typing when the camera is not available. */
    const [mode, setMode] = useState('scan');          // 'scan' | 'manual'
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const scannerRef = useRef(null);
    const SCANNER_ID = 'signup-card-scanner';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        // stop() and clear() throw synchronously when the camera is not
        // running (start still pending, or already stopped) — guard both.
        if (!inst) return;
        try {
            Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {});
        } catch { /* was not running */ }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        const inst = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = inst;
        inst.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => {
                if (cancelled) return;
                setQrCodeNumber(decodedText.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setScanError('');
                setScanning(false);
            },
            () => {}   // a frame without a code is not an error
        ).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your QR code instead.');
            setMode('manual');
        });
        return () => { cancelled = true; stopScanner(); };
    }, [scanning]);

    // Stop the camera when moving away from step 1, and on unmount.
    useEffect(() => { if (step !== 1) setScanning(false); }, [step]);
    useEffect(() => () => stopScanner(), []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Step 1: Validate QR code
    const handleValidateQR = async (e) => {
        e.preventDefault();
        setError(null);

        if (!qrCodeNumber.trim()) {
            return setError('Please enter your QR Code.');
        }

        setQrValidating(true);
        try {
            const res = await api.post('/auth/validate-qr', { qrCodeNumber: qrCodeNumber.trim() });
            // Store card details internally — never shown as editable inputs
            setCardDetails({ CardNumber: res.data.cardNumber, CVV: res.data.cvv });
            setQrValidated(true);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid QR Code. Please try again.');
        } finally {
            setQrValidating(false);
        }
    };

    const handlePersonalDetailsNext = (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
            return setError('Only @gmail.com email addresses are allowed.');
        }

        setStep(3);
    };

    const handleRegistrationSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (formData.password !== formData.confirmPassword) {
            return setError('Passwords do not match.');
        }

        const pwError = getPasswordStrengthError(formData.password);
        if (pwError) return setError(pwError);

        setLoading(true);
        try {
            const res = await api.post('/auth/register', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                CardNumber: cardDetails.CardNumber,
                CVV: cardDetails.CVV,
                qrCodeNumber: qrCodeNumber.trim(),
                password: formData.password
            });

            localStorage.setItem('studentToken', res.data.token);
            localStorage.setItem('studentData', JSON.stringify(res.data));
            setUser(res.data);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            setStep(1);
            setQrValidated(false);
            setCardDetails({ CardNumber: '', CVV: '' });
        } finally {
            setLoading(false);
        }
    };

    const [stepTitle, stepHint] = STEPS[step - 1];

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-3 sm:p-6">
            {showContact && <ContactAdminModal onClose={() => setShowContact(false)} page="signup" />}

            <div className="lg-rise grid w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-indigo-200/70 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">

                {/* ── Left: the welcome panel ──────────────────────────── */}
                <aside className="relative overflow-hidden bg-gradient-to-b from-indigo-600 via-violet-600 to-violet-200 p-7 text-white sm:p-9 lg:min-h-[640px]">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                        <div className="lg-blob absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
                        <div className="absolute right-10 top-24 h-12 w-12 rounded-full bg-white/15" />
                        <div className="absolute right-24 top-64 h-7 w-7 rounded-full bg-white/15" />
                        <div className="absolute left-8 top-1/2 h-4 w-4 rounded-full bg-white/20" />
                        <Sparkle className="left-[46%] top-[9%] text-white" delay={0.3} size="text-xs" />
                        <Sparkle className="left-[70%] top-[22%] text-white" delay={1.4} size="text-sm" />
                        <Sparkle className="left-[16%] top-[40%] text-white" delay={0.9} size="text-xs" />
                        <Sparkle className="left-[58%] top-[45%] text-white" delay={2.1} size="text-base" />
                        <Sparkle className="left-[30%] top-[52%] text-white" delay={1.8} size="text-xs" />
                        <Sparkle className="left-[80%] top-[58%] text-white" delay={0.6} size="text-sm" />
                        {/* The pale foreground wave the illustration stands on. */}
                        <div className="absolute -bottom-24 -left-10 h-56 w-[140%] rounded-[50%] bg-white/70 blur-md" />
                    </div>

                    <div className="relative flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/40 backdrop-blur"><BookOpen size={22} /></span>
                        <div className="leading-tight">
                            <p className="text-lg font-black tracking-tight">YATICORP</p>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-100">LMS Platform</p>
                        </div>
                    </div>

                    <div className="relative mt-10 max-w-xs sm:mt-14">
                        <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-[2.6rem]">
                            Welcome<br />to <span className="text-cyan-300">YatiSphere</span>
                        </h1>
                        <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-indigo-100">
                            Your smart learning journey starts here. Let&apos;s achieve great things together!
                        </p>
                    </div>

                    {/* The mascot with the floating tiles. */}
                    <div aria-hidden="true" className="relative mt-8 h-72 sm:h-80 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:h-[52%]">
                        <span className="lg-float absolute right-8 top-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-lg ring-1 ring-white/40 backdrop-blur">🏆</span>
                        <span className="lg-float absolute left-4 top-16 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-lg ring-1 ring-white/40 backdrop-blur" style={{ animationDelay: '-2.4s' }}>📈</span>
                        <span className="mascot-tag absolute right-4 top-[38%] z-10 whitespace-nowrap rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm font-black leading-tight text-indigo-700 shadow-lg">
                            Hi! Let&apos;s learn<br />together 👋
                        </span>
                        {/* A box capped by both height and width, so the character is
                            never wider than the panel and never cut off. */}
                        <div className="mascot-enter absolute bottom-0 left-1/2 aspect-[16/17] h-[92%] max-w-[70%] -translate-x-1/2">
                            <div className="lg-float h-full w-full" style={{ animationDelay: '-1.2s' }}>
                                <Mascot className="h-full w-full object-contain drop-shadow-2xl" />
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ── Right: the sign-up card ──────────────────────────── */}
                <section className="relative bg-white px-5 py-8 sm:px-10 sm:py-10">
                    <div className="mx-auto max-w-md">
                        <div className="lg-rise flex flex-col items-center text-center" style={{ animationDelay: '0.1s' }}>
                            <span className="lg-float flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 ring-1 ring-indigo-100">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-300"><UserPlus size={18} /></span>
                            </span>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Create your account</h2>
                            <p className="mt-1.5 text-sm text-slate-500">{stepHint}</p>

                            {/* Stepper: which of the three steps we are on. */}
                            <div className="mt-4 flex items-center gap-2" aria-label={`Step ${step} of 3: ${stepTitle}`}>
                                {[1, 2, 3].map(s => (
                                    <span key={s} className={`h-2.5 rounded-full transition-all duration-300 ${step === s ? 'w-7 bg-indigo-600' : step > s ? 'w-2.5 bg-emerald-500' : 'w-2.5 bg-slate-200'}`} />
                                ))}
                                <span className="ml-1 text-xs font-bold uppercase tracking-wider text-slate-400">Step {step} of 3</span>
                            </div>
                        </div>

                        {/* Step 1: card QR */}
                        {step === 1 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handleValidateQR} style={{ animationDelay: '0.2s' }}>
                                {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">{error}</div>}

                                {/* Scan / type, as one bordered switch */}
                                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                                    {[['scan', 'Scan Card', ScanLine], ['manual', 'Type Instead', Keyboard]].map(([id, label, Icon]) => (
                                        <button key={id} type="button"
                                            onClick={() => { setScanError(''); setScanning(false); setMode(id); }}
                                            className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${mode === id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'}`}>
                                            <Icon size={16} /> {label}
                                        </button>
                                    ))}
                                </div>

                                {mode === 'scan' && qrCodeNumber ? (
                                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                        <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-emerald-700">Card read</p>
                                            <p className="font-mono text-lg tracking-widest text-slate-800">{qrCodeNumber}</p>
                                        </div>
                                        <button type="button" onClick={() => { setQrCodeNumber(''); setScanError(''); }}
                                            className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">Change</button>
                                    </div>
                                ) : mode === 'scan' ? (
                                    <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 p-6 text-center">
                                        {/* html5-qrcode needs this element present before it starts. */}
                                        <div id={SCANNER_ID} className={`overflow-hidden rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`} />
                                        {!scanning ? (
                                            <>
                                                <button type="button" onClick={() => { setScanError(''); setScanning(true); }} aria-label="Scan your card"
                                                    className="lg-scan-ring mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-indigo-500 shadow-lg shadow-indigo-200 transition-transform hover:scale-105">
                                                    <ScanLine size={44} strokeWidth={1.8} />
                                                </button>
                                                <p className="mt-4 text-lg font-bold text-slate-900">Scan your YATICORP card</p>
                                                <p className="mt-1 text-sm text-slate-500">Hold the QR code on your card up to the camera</p>
                                            </>
                                        ) : (
                                            <button type="button" onClick={() => setScanning(false)}
                                                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                                <X size={13} /> Stop the camera
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><QrCode size={15} className="text-slate-500" /> QR Code</label>
                                        <input type="text" required maxLength={11} value={qrCodeNumber}
                                            onChange={(e) => setQrCodeNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                            className={`${inputClass} font-mono tracking-widest`}
                                            placeholder="e.g. QR12345678" />
                                        <p className="mt-1.5 text-xs text-slate-500">Found on the back of your physical or digital card.</p>
                                    </div>
                                )}

                                {scanError && (
                                    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                        <CameraOff size={14} className="mt-0.5 shrink-0" /> {scanError}
                                    </p>
                                )}

                                <button type="submit" disabled={qrValidating || !qrCodeNumber.trim()} className={primaryBtn}>
                                    {qrValidating ? 'Verifying your card…' : 'Verify Card'}
                                    {!qrValidating && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                </button>
                            </form>
                        )}

                        {/* Step 2: personal details */}
                        {step === 2 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handlePersonalDetailsNext} style={{ animationDelay: '0.2s' }}>
                                {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">{error}</div>}

                                {/* The card we verified in step 1, read-only. */}
                                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-emerald-700">Card verified</p>
                                        <p className="font-mono text-lg tracking-wider text-slate-800">{cardDetails.CardNumber}</p>
                                    </div>
                                    <CreditCard size={18} className="shrink-0 text-emerald-600/70" />
                                </div>

                                <div>
                                    <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><User size={15} className="text-slate-500" /> Full Name</label>
                                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className={inputClass} placeholder="Your full name" />
                                </div>
                                <div>
                                    <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Mail size={15} className="text-slate-500" /> Email</label>
                                    <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className={inputClass} placeholder="you@gmail.com" />
                                    <p className="mt-1.5 text-xs text-slate-500">Only @gmail.com addresses are accepted.</p>
                                </div>
                                <div>
                                    <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Phone size={15} className="text-slate-500" /> Phone Number</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.phoneCode || '+91'}
                                            onChange={e => setFormData({ ...formData, phoneCode: e.target.value })}
                                            className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-3 text-sm text-slate-800 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="+91">🇮🇳 +91</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+971">🇦🇪 +971</option>
                                            <option value="+61">🇦🇺 +61</option>
                                            <option value="+65">🇸🇬 +65</option>
                                            <option value="+60">🇲🇾 +60</option>
                                        </select>
                                        <input
                                            type="tel"
                                            name="phone"
                                            required
                                            inputMode="numeric"
                                            placeholder="Phone number"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                            className={`${inputClass} flex-1`}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setError(null); setStep(1); setQrValidated(false); }} className={backBtn}><ArrowLeft size={15} /> Back</button>
                                    <button type="submit" className={primaryBtn}>
                                        Continue
                                        <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Step 3: password */}
                        {step === 3 && (
                            <form className="lg-rise mt-6 space-y-5" onSubmit={handleRegistrationSubmit} style={{ animationDelay: '0.2s' }}>
                                {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-600">{error}</div>}

                                <div>
                                    <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" /> Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            className={`${inputClass} pr-12`}
                                            placeholder="Create a password"
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-700">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>

                                    {/* Live strength checklist — only shown while typing */}
                                    {(passwordFocused || formData.password.length > 0) && (
                                        <div className="mt-3 grid grid-cols-1 gap-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-2">
                                            {[
                                                { label: 'At least 8 characters', ok: formData.password.length >= 8 },
                                                { label: 'One uppercase letter', ok: /[A-Z]/.test(formData.password) },
                                                { label: 'One lowercase letter', ok: /[a-z]/.test(formData.password) },
                                                { label: 'One number', ok: /[0-9]/.test(formData.password) },
                                                { label: 'One special character', ok: /[^A-Za-z0-9]/.test(formData.password) },
                                            ].map(rule => (
                                                <div key={rule.label} className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${rule.ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <span>{rule.ok ? '✓' : '○'}</span>
                                                    <span>{rule.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" /> Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className={`${inputClass} pr-12`}
                                            placeholder="Repeat your password"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)} tabIndex={-1}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-700">
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => { setError(null); setStep(2); }} className={backBtn}><ArrowLeft size={15} /> Back</button>
                                    <button type="submit" disabled={loading} className={primaryBtn}>
                                        {loading ? 'Creating your account…' : 'Create Account'}
                                        {!loading && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                                    </button>
                                </div>
                            </form>
                        )}

                        <button type="button" onClick={() => setShowContact(true)}
                            className="lg-rise mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50" style={{ animationDelay: '0.3s' }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><MessageCircleQuestion size={16} /></span>
                            <span className="flex-1">Having trouble? <span className="font-bold text-indigo-600">Contact Admin</span></span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"><ChevronRight size={15} className="text-slate-500" /></span>
                        </button>

                        <p className="mt-5 text-center text-xs text-slate-500">
                            Already have an account? <Link to="/login" className="font-bold text-indigo-600 hover:underline">Sign in here</Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Signup;
