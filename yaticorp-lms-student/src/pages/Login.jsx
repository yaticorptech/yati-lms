/**
 * @author Preethesh Kulal
 * @description Student login page with card number, password and forgot password support
 */
import Mascot from '../components/Mascot';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { GraduationCap, Mail, KeyRound, MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, ScanLine, Keyboard, Loader2, CameraOff, QrCode, Lock, ArrowRight, ChevronRight, PlayCircle, CreditCard, BookOpen } from 'lucide-react';

// --- Contact Admin Modal ---
const ContactAdminModal = ({ onClose, page = 'login' }) => {
    const [form, setForm] = useState({ name: '', email: '', cardNumber: '', subject: '', message: '' });
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
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={28} className="text-emerald-600" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Message Sent!</h3>
                        <p className="text-slate-500 text-sm mb-4">We've received your request and will get back to you soon.</p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Name *</label>
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Your name" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="your@email.com" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Card Number (optional)</label>
                            <input value={form.cardNumber} onChange={e => setForm({ ...form, cardNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="If you have one" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                            <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Brief description of your issue" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
                            <textarea required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Describe your issue in detail..." />
                        </div>
                        <div className="flex justify-end space-x-3 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
                            <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center disabled:opacity-50">
                                <Send size={14} className="mr-1.5" />{loading ? 'Sending...' : 'Send Message'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- Forgot Password Modal ---
const ForgotPasswordModal = ({ onClose }) => {
    const [cardNumber, setCardNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/student/forgot-password', { cardNumber });
            setMessage(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><KeyRound size={18} className="text-indigo-600" /></div>
                        <h2 className="text-lg font-bold text-slate-800">Forgot Password</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">
                    {message ? (
                        <div className="text-center">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail size={24} className="text-emerald-600" />
                            </div>
                            <p className="text-slate-700 text-sm font-medium">{message}</p>
                            <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm">Close</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-sm text-slate-500">Enter your Card Number and we'll send a password reset link to your registered email.</p>
                            {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Card Number</label>
                                <input required maxLength={12} inputMode="numeric" pattern="[0-9]*" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-wider text-slate-800"
                                    placeholder="12-Digit Card Number" />
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
                                <button type="submit" disabled={loading} className="px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                    {loading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

// A twinkling star. Module-level so the page's re-renders (every keystroke
// in the password box) do not remount it and restart its animation.
const Sparkle = ({ className, delay = 0, size = 'text-base' }) => (
    <span aria-hidden="true" className={`lg-twinkle pointer-events-none absolute ${size} ${className}`} style={{ animationDelay: `${delay}s` }}>✦</span>
);

// --- Main Login Page ---
const Login = () => {
    const { user, login } = useContext(AuthContext);
    const [cardNumber, setCardNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [showContact, setShowContact] = useState(false);

    /* Signing in by card.
       The number is printed on the card and twelve digits long, which is a
       tedious thing to copy correctly on a phone. The camera reads the card's
       QR instead and the server turns it into the number, so the student only
       has their password left to type. Typing the number by hand is still
       there for a broken camera or a worn card. */
    const [mode, setMode] = useState('scan');          // 'scan' | 'manual'
    const [scanning, setScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [scannedCard, setScannedCard] = useState(false);
    const [showHow, setShowHow] = useState(false);
    const scannerRef = useRef(null);
    const passwordRef = useRef(null);
    const SCANNER_ID = 'login-card-scanner';

    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        if (inst) inst.stop().then(() => inst.clear()).catch(() => {});
    };

    // Hand the scanned code to the server, which answers with the card number.
    const resolveScan = async (decodedText) => {
        stopScanner();
        setScanning(false);
        setScanError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/card-scan', { code: decodedText });
            setCardNumber(res.data.cardNumber);
            setScannedCard(true);
            setError('');
            setTimeout(() => passwordRef.current?.focus(), 60);
        } catch (err) {
            setScanError(err.response?.data?.message || 'That card could not be read. Try again, or type the number.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        const inst = new Html5Qrcode(SCANNER_ID);
        scannerRef.current = inst;
        inst.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decodedText) => { if (!cancelled) resolveScan(decodedText); },
            () => {}   // a frame without a code is not an error
        ).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setScanError('The camera is not available. Type your card number instead.');
            setMode('manual');
        });
        return () => { cancelled = true; stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);

    useEffect(() => () => stopScanner(), []);

    if (user) return <Navigate to="/" replace />;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await login(cardNumber, password);
        if (!res.success) setError(res.error);
        setLoading(false);
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-3 sm:p-6">
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
            {showContact && <ContactAdminModal onClose={() => setShowContact(false)} page="login" />}
            {showHow && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowHow(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={(e) => e.stopPropagation()} className="lg-rise w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
                            <h3 id="how-title" className="flex items-center gap-2 font-bold text-slate-800"><QrCode size={17} className="text-indigo-600" /> Signing in with your card</h3>
                            <button type="button" onClick={() => setShowHow(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button>
                        </div>
                        <ol className="space-y-4 p-5">
                            {[
                                ['Tap the scan area', 'Your browser will ask to use the camera. Allow it.'],
                                ['Hold up your YATICORP card', 'Point the QR code on the card at the camera. It reads in a second.'],
                                ['Enter your password', 'The card number fills itself in, so the password is all you type.']
                            ].map(([t, d], i) => (
                                <li key={t} className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">{i + 1}</span>
                                    <div><p className="font-bold text-slate-800">{t}</p><p className="text-sm text-slate-500">{d}</p></div>
                                </li>
                            ))}
                        </ol>
                        <div className="border-t border-slate-100 px-5 py-4 text-right">
                            <button type="button" onClick={() => setShowHow(false)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Got it</button>
                        </div>
                    </div>
                </div>
            )}

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
                            Welcome<br />to <span className="text-cyan-300">YATICORP<br />LMS</span>
                        </h1>
                        <p className="mt-4 max-w-[240px] text-sm leading-relaxed text-indigo-100">
                            Your smart learning journey starts here. Let&apos;s achieve great things together!
                        </p>
                    </div>

                    {/* The mascot with the floating tiles. */}
                    <div aria-hidden="true" className="relative mt-8 h-72 sm:h-80 lg:absolute lg:inset-x-0 lg:bottom-0 lg:mt-0 lg:h-[52%]">
                        <span className="lg-float absolute right-8 top-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-lg ring-1 ring-white/40 backdrop-blur">🏆</span>
                        <span className="lg-float absolute left-4 top-16 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-2xl shadow-lg ring-1 ring-white/40 backdrop-blur" style={{ animationDelay: '-2.4s' }}>📈</span>
                        <span className="mascot-tag absolute right-4 top-[38%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-2 text-sm font-black leading-tight text-indigo-700 shadow-lg">
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

                {/* ── Right: the sign-in card ──────────────────────────── */}
                <section className="relative bg-white px-5 py-8 sm:px-10 sm:py-10">
                    <div className="mx-auto max-w-md">
                        <div className="lg-rise flex flex-col items-center text-center" style={{ animationDelay: '0.1s' }}>
                            <span className="lg-float flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 ring-1 ring-indigo-100">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-300"><Lock size={18} /></span>
                            </span>
                            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900">Let&apos;s get you signed in</h2>
                            <p className="mt-1.5 text-sm text-slate-500">Scan your YATICORP card or use your password to access your account.</p>
                        </div>

                        <form className="lg-rise mt-6 space-y-5" onSubmit={handleLogin} style={{ animationDelay: '0.2s' }}>
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

                            {scannedCard ? (
                                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold text-emerald-700">Card read</p>
                                        <p className="font-mono text-lg tracking-wider text-slate-800">{cardNumber}</p>
                                    </div>
                                    <button type="button" onClick={() => { setScannedCard(false); setCardNumber(''); setMode('scan'); }}
                                        className="shrink-0 text-xs font-bold text-emerald-700 hover:underline">Change</button>
                                </div>
                            ) : mode === 'scan' ? (
                                <div className="rounded-2xl border-2 border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 p-6 text-center">
                                    {/* html5-qrcode needs this element present before it starts. */}
                                    <div id={SCANNER_ID} className={`overflow-hidden rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`} />
                                    {!scanning ? (
                                        <>
                                            <button type="button" onClick={() => { setScanError(''); setScanning(true); }} disabled={loading} aria-label="Scan your card"
                                                className="lg-scan-ring mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-indigo-500 shadow-lg shadow-indigo-200 transition-transform hover:scale-105 disabled:opacity-60">
                                                {loading ? <Loader2 size={40} className="animate-spin" /> : <ScanLine size={44} strokeWidth={1.8} />}
                                            </button>
                                            <p className="mt-4 text-lg font-bold text-slate-900">{loading ? 'Reading your card…' : 'Scan your YATICORP card'}</p>
                                            <p className="mt-1 text-sm text-slate-500">Hold the QR code on your card up to the camera</p>
                                            <button type="button" onClick={() => setShowHow(true)}
                                                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50">
                                                <PlayCircle size={14} /> How it works?
                                            </button>
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
                                    <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700"><CreditCard size={15} className="text-slate-500" /> Card Number</label>
                                    <input type="text" required maxLength="12" inputMode="numeric" pattern="[0-9]*" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                        className="block w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono tracking-wider text-slate-800 shadow-sm placeholder-slate-400 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="12-Digit Card Number" />
                                </div>
                            )}

                            {scanError && (
                                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                    <CameraOff size={14} className="mt-0.5 shrink-0" /> {scanError}
                                </p>
                            )}

                            <div className="flex items-center gap-3" aria-hidden="true">
                                <span className="h-px flex-1 bg-slate-200" />
                                <span className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-slate-400">OR</span>
                                <span className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Lock size={15} className="text-slate-500" /> Password</label>
                                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800 hover:underline">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative mt-2">
                                    <input
                                        ref={passwordRef}
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="block w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-slate-800 shadow-sm placeholder-slate-400 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter your password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 transition-colors hover:text-slate-700">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:translate-y-0">
                                {loading ? 'Authenticating…' : 'Access Platform'}
                                {!loading && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                            </button>
                        </form>

                        <button type="button" onClick={() => setShowContact(true)}
                            className="lg-rise mt-4 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50" style={{ animationDelay: '0.3s' }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><MessageCircleQuestion size={16} /></span>
                            <span className="flex-1">Having trouble? <span className="font-bold text-indigo-600">Contact Admin</span></span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white ring-1 ring-slate-200"><ChevronRight size={15} className="text-slate-500" /></span>
                        </button>

                        <p className="mt-5 text-center text-xs text-slate-500">
                            Don&apos;t have an account? <Link to="/signup" className="font-bold text-indigo-600 hover:underline">Sign up here</Link>
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;
