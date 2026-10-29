/**
 * @author Preethesh Kulal
 * @description Student login page with card number, password and forgot password support
 */
import ProfileImage from '../components/ProfileImage';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import DeviceLimitDialog from '../components/DeviceLimitDialog';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { isNative } from '../native/platform';
import useBackClose from '../native/useBackClose';
import { SESSION_ENDED_KEY, safeNextPath } from '../utils/sessionExpiry';
import teacherApi, { enterTeacher, hasTeacherSession, readSigninAs, rememberSigninAs, TEACHER_SESSION_ENDED } from '../teacher/teacherSession';
import { Mail, KeyRound, MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, ScanLine, Keyboard, Loader2, CameraOff, QrCode, Lock, ArrowRight, ChevronRight, PlayCircle, CreditCard, Info, GraduationCap, BookOpenCheck } from 'lucide-react';

// --- Contact Admin Modal ---
const ContactAdminModal = ({ onClose, page = 'login' }) => {
    const [form, setForm] = useState({ name: '', email: '', cardNumber: '', subject: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    // Android's back button closes this, rather than leaving the page.
    useBackClose(onClose);

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
            <div role="dialog" aria-modal="true" aria-labelledby="contact-admin-title" className="bg-[#2a2f45] rounded-2xl shadow-2xl ring-1 ring-white/10 w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.04]">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><MessageCircleQuestion size={20} className="text-indigo-300" /></div>
                        <div>
                            <h2 id="contact-admin-title" className="text-lg font-bold text-slate-100">Contact Admin</h2>
                            <a href="tel:9535440195" className="text-sm text-indigo-300 font-semibold hover:underline">📞 9535440195</a>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-200 transition-colors"><X size={20} /></button>
                </div>

                {done ? (
                    <div className="p-8 text-center">
                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={28} className="text-emerald-400" />
                        </div>
                        <h3 className="font-bold text-slate-100 text-lg mb-1">Message Sent!</h3>
                        <p className="text-slate-400 text-sm mb-4">We've received your request and will get back to you soon.</p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && <div role="alert" className="bg-red-500/10 border border-red-400/30 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-200 mb-1">Name *</label>
                                <input id="contact-name" required autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Your name" />
                            </div>
                            <div>
                                <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-200 mb-1">Email *</label>
                                <input id="contact-email" required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="your@email.com" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="contact-card" className="block text-xs font-semibold text-slate-200 mb-1">Card Number (optional)</label>
                            <input id="contact-card" autoComplete="off" value={form.cardNumber} onChange={e => setForm({ ...form, cardNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="If you have one" />
                        </div>
                        <div>
                            <label htmlFor="contact-subject" className="block text-xs font-semibold text-slate-200 mb-1">Subject *</label>
                            <input id="contact-subject" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                                className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Brief description of your issue" />
                        </div>
                        <div>
                            <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-200 mb-1">Message *</label>
                            <textarea id="contact-message" required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                                className="w-full px-3 py-2 border border-white/15 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" placeholder="Describe your issue in detail..." />
                        </div>
                        <div className="flex justify-end space-x-3 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Cancel</button>
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
// Three steps: the card (scanned, or its number typed), then whose account it
// is — the name and a partly hidden email, from the server — to confirm, and
// only then the link is sent.
const FORGOT_SCANNER_ID = 'forgot-card-scanner';
const ForgotPasswordModal = ({ onClose, role = 'student' }) => {
    const client = role === 'teacher' ? teacherApi : api;
    const base = role === 'teacher' ? '/auth/forgot-password' : '/auth/student/forgot-password';
    const [step, setStep] = useState('card');          // 'card' | 'confirm' | 'sent'
    const [mode, setMode] = useState('scan');          // 'scan' | 'manual'
    const [scanning, setScanning] = useState(false);
    const [cardNumber, setCardNumber] = useState('');
    // A teacher with no AI card (a club or Scouts leader) is found by email instead.
    const [email, setEmail] = useState('');
    const byEmail = role === 'teacher' && mode === 'email';
    const who = () => (byEmail ? { email: email.trim() } : { cardNumber });
    const [account, setAccount] = useState(null);      // { name, email }
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const scannerRef = useRef(null);
    // Android's back button closes this, rather than leaving the page.
    useBackClose(onClose);

    const stopScanner = () => {
        const inst = scannerRef.current;
        scannerRef.current = null;
        if (!inst) return;
        try { Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {}); } catch { /* was not running */ }
    };

    // The card's account, to confirm.
    const lookUp = async (number) => {
        setLoading(true);
        setError('');
        try {
            const res = await client.post(`${base}/preview`, byEmail ? { email: email.trim() } : { cardNumber: number });
            setCardNumber(number);
            setAccount(res.data);
            setStep('confirm');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not look up that card. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // A scanned code: the server turns it into the card number, then the account.
    const resolveScan = async (code) => {
        stopScanner();
        setScanning(false);
        setLoading(true);
        setError('');
        try {
            const res = await client.post('/auth/card-scan', { code });
            await lookUp(String(res.data.cardNumber));
        } catch (err) {
            setLoading(false);
            setError(err.response?.data?.message || 'That card could not be read. Try again, or type the number.');
        }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode(FORGOT_SCANNER_ID);
            scannerRef.current = inst;
            return inst.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 200, height: 200 } },
                (text) => { if (!cancelled) resolveScan(text); }, () => {});
        }).catch(() => {
            if (cancelled) return;
            scannerRef.current = null;
            setScanning(false);
            setError('The camera is not available. Type your card number instead.');
            setMode('manual');
        });
        return () => { cancelled = true; stopScanner(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanning]);
    useEffect(() => () => stopScanner(), []);

    const send = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await client.post(base, who());
            setMessage(res.data.message);
            setStep('sent');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const startOver = () => { setAccount(null); setCardNumber(''); setError(''); setStep('card'); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div role="dialog" aria-modal="true" aria-labelledby="forgot-password-title" className="bg-[#2a2f45] rounded-2xl shadow-2xl ring-1 ring-white/10 w-full max-w-sm overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.04]">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg"><KeyRound size={18} className="text-indigo-300" /></div>
                        <h2 id="forgot-password-title" className="text-lg font-bold text-slate-100">Forgot Password</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-slate-200 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">
                    {step === 'sent' ? (
                        <div className="text-center">
                            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail size={24} className="text-emerald-400" />
                            </div>
                            <p className="text-slate-100 font-bold">Check your email</p>
                            <p className="mt-1 text-slate-300 text-sm">We sent a reset link to <span className="font-semibold text-slate-100">{account?.email}</span>. It works for 1 hour.</p>
                            {message && <p className="sr-only">{message}</p>}
                            <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm">Close</button>
                        </div>
                    ) : step === 'confirm' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Is this your account? The reset link will go to this email.</p>
                            <div className="flex items-center gap-3 rounded-2xl border border-indigo-400/20 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-md ring-2 ring-white">
                                    <ProfileImage src={account?.photo} alt="" className="h-full w-full object-cover" fallback={(account?.name || '?').trim()[0]?.toUpperCase()} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-bold text-white">{account?.name}</p>
                                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-300"><Mail size={13} className="shrink-0 text-indigo-300" /> {account?.email}</p>
                                    <p className="mt-0.5 font-mono text-xs tracking-wider text-slate-400">{cardNumber}</p>
                                </div>
                            </div>
                            {error && <div role="alert" className="bg-red-500/10 border border-red-400/30 text-red-300 p-3 rounded-lg text-sm">{error}</div>}
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={startOver} disabled={loading} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Not me</button>
                                <button type="button" onClick={send} disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Yes, send link</>}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-400">Scan your card or type its number. We'll show you the account before sending a reset link to its email.</p>

                            <div className={`grid overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] p-1 ${role === 'teacher' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                {[['scan', 'Scan Card', ScanLine], ['manual', 'Type Instead', Keyboard], ...(role === 'teacher' ? [['email', 'Email', Mail]] : [])].map(([id, label, Icon]) => (
                                    <button key={id} type="button" onClick={() => { setError(''); setScanning(false); setMode(id); }}
                                        className={`inline-flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold transition-all ${mode === id ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/15' : 'text-slate-400 hover:text-white'}`}>
                                        <Icon size={15} /> {label}
                                    </button>
                                ))}
                            </div>

                            {error && <div role="alert" className="bg-red-500/10 border border-red-400/30 text-red-300 p-3 rounded-lg text-sm">{error}</div>}

                            {byEmail ? (
                                <form onSubmit={(e) => { e.preventDefault(); lookUp(''); }} className="space-y-4">
                                    <div>
                                        <label htmlFor="forgot-email" className="block text-sm font-semibold text-slate-200 mb-1">Email</label>
                                        <input id="forgot-email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-white/15 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-100"
                                            placeholder="The email you sign in with" />
                                        <p className="mt-1 text-xs text-slate-400">For a teacher account without a card.</p>
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Cancel</button>
                                        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <>Continue <ArrowRight size={15} /></>}
                                        </button>
                                    </div>
                                </form>
                            ) : mode === 'scan' ? (
                                <div className="rounded-2xl border-2 border-dashed border-indigo-400/40 bg-gradient-to-br from-indigo-50/70 via-white to-violet-50/70 p-5 text-center">
                                    {/* html5-qrcode needs this element present before it starts. */}
                                    <div id={FORGOT_SCANNER_ID} className={`overflow-hidden rounded-xl bg-slate-900 ${scanning ? 'block' : 'hidden'}`} />
                                    {!scanning ? (
                                        <>
                                            <button type="button" onClick={() => { setError(''); setScanning(true); }} disabled={loading} aria-label="Scan your card"
                                                className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-200 shadow-lg shadow-black/40 ring-1 ring-indigo-400/30 transition-transform hover:scale-105 disabled:opacity-60">
                                                {loading ? <Loader2 size={34} className="animate-spin" /> : <ScanLine size={38} strokeWidth={1.8} />}
                                            </button>
                                            <p className="mt-3 font-bold text-white">{loading ? 'Finding your account…' : 'Scan your card'}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">Hold the QR code on your card up to the camera</p>
                                        </>
                                    ) : (
                                        <button type="button" onClick={() => setScanning(false)}
                                            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-[#2a2f45] py-2 text-xs font-bold text-slate-300 hover:bg-white/5">
                                            <X size={13} /> Stop the camera
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <form onSubmit={(e) => { e.preventDefault(); lookUp(cardNumber); }} className="space-y-4">
                                    <div>
                                        <label htmlFor="forgot-card-number" className="block text-sm font-semibold text-slate-200 mb-1">Card Number</label>
                                        <input id="forgot-card-number" required maxLength={12} inputMode="numeric" pattern="[0-9]*" autoComplete="username" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                            className="w-full px-4 py-3 border border-white/15 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono tracking-wider text-slate-100"
                                            placeholder="12-Digit Card Number" />
                                    </div>
                                    <div className="flex justify-end space-x-3">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-300 font-medium hover:bg-white/10 rounded-lg transition-colors text-sm">Cancel</button>
                                        <button type="submit" disabled={loading} className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50">
                                            {loading ? <><Loader2 size={15} className="animate-spin" /> Checking…</> : <>Continue <ArrowRight size={15} /></>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * "Who's signing in?" — asked the first time this device opens the sign-in
 * page. Students and teachers use the same cards, so the card cannot tell;
 * the person says. The answer is remembered, and the switch at the top of
 * the form changes it any time.
 */
const RoleChooser = ({ onChoose }) => (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
        <div role="dialog" aria-modal="true" aria-labelledby="role-chooser-title" className="lg-rise w-full max-w-lg overflow-hidden rounded-3xl bg-[#2a2f45] shadow-2xl ring-1 ring-white/10">
            <div className="border-b border-white/5 bg-gradient-to-br from-indigo-50 to-violet-50 px-6 py-5 text-center">
                <h2 id="role-chooser-title" className="text-xl font-black tracking-tight text-white">Who&apos;s signing in?</h2>
                <p className="mt-1 text-sm text-slate-400">Choose once — you can switch any time at the top of the form.</p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
                {[
                    ['student', 'Student', 'Courses, Career Path, jobs, interviews and games.', GraduationCap, 'from-indigo-500 to-violet-600'],
                    ['teacher', 'Teacher', 'Research path, publications, thesis writing and plagiarism checks.', BookOpenCheck, 'from-emerald-500 to-teal-600']
                ].map(([id, label, hint, Icon, tone]) => (
                    <button key={id} type="button" onClick={() => onChoose(id)}
                        className="group flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-[#2a2f45] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-md`}><Icon size={24} aria-hidden="true" /></span>
                        <span>
                            <span className="block text-base font-black text-white">I&apos;m a {label.toLowerCase()}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-slate-400">{hint}</span>
                        </span>
                        <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-indigo-300">Continue <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></span>
                    </button>
                ))}
            </div>
        </div>
    </div>
);

// A twinkling star. Module-level so the page's re-renders (every keystroke
// in the password box) do not remount it and restart its animation.
// --- Main Login Page ---
const Login = () => {
    const { user, login, replaceDevice, enterApp } = useContext(AuthContext);
    // A 3rd device: the popup to swap it in (components/DeviceLimitDialog).
    const [deviceConflict, setDeviceConflict] = useState(null);
    // Where the student was heading when they were asked to sign in (a link
    // to a lesson, a page left when the session ended). Only a path in this
    // app is taken; anything else means the dashboard.
    const [searchParams] = useSearchParams();
    const next = safeNextPath(searchParams.get('next') || '/');
    const [cardNumber, setCardNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showForgot, setShowForgot] = useState(false);
    const [showContact, setShowContact] = useState(false);
    const errorRef = useRef(null);
    const scanButtonRef = useRef(null);
    // Sent here because the server no longer accepted the saved login
    // (utils/sessionExpiry): said once, so it is not a mystery why they are
    // signing in again. Read on the first render; cleared below.
    const [sessionEnded] = useState(() => { try { return ['device', 'replaced'].includes(sessionStorage.getItem(SESSION_ENDED_KEY)) ? sessionStorage.getItem(SESSION_ENDED_KEY) : sessionStorage.getItem(SESSION_ENDED_KEY) === '1' || sessionStorage.getItem(TEACHER_SESSION_ENDED) === '1'; } catch { return false; } });
    useEffect(() => { try { sessionStorage.removeItem(SESSION_ENDED_KEY); sessionStorage.removeItem(TEACHER_SESSION_ENDED); } catch { /* storage off */ } }, []);

    /* Student or teacher. ?as= decides when a link carries it (a teacher's
       reset email, "Choose Teacher"); otherwise the choice this device made
       last; otherwise nobody has said yet, and the chooser asks. */
    const [role, setRole] = useState(() => {
        const asked = searchParams.get('as');
        return asked === 'teacher' || asked === 'student' ? asked : readSigninAs();
    });
    const isTeacher = role === 'teacher';
    // A card of the other kind: the error offers the right sign-in.
    const [otherKind, setOtherKind] = useState(null);
    const chooseRole = (r) => {
        rememberSigninAs(r);
        setRole(r);
        setError('');
        setOtherKind(null);
        setScannedCard(false);
        setCardNumber('');
    };

    /* Signing in by card.
       The number is printed on the card and twelve digits long, which is a
       tedious thing to copy correctly on a phone. The camera reads the card's
       QR instead and the server turns it into the number, so the student only
       has their password left to type. Typing the number by hand is still
       there for a broken camera or a worn card. A teacher with no AI card (a
       club or Scouts leader) signs in with email instead ('email'). */
    const [mode, setMode] = useState('manual');        // 'manual' (the card number, scan inside it) | 'email' (teachers)
    const [teacherEmail, setTeacherEmail] = useState('');
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
        // stop() and clear() throw synchronously when the camera is not
        // running (start still pending, or already stopped) — guard both.
        if (!inst) return;
        try {
            Promise.resolve(inst.stop()).then(() => { try { inst.clear(); } catch { /* already clear */ } }).catch(() => {});
        } catch { /* was not running */ }
    };

    // Hand the scanned code to the server, which answers with the card number.
    const resolveScan = async (decodedText) => {
        stopScanner();
        setScanning(false);
        setScanError('');
        setLoading(true);
        try {
            const res = isTeacher
                ? await teacherApi.post('/auth/card-scan', { code: decodedText })
                : await api.post('/auth/card-scan', { code: decodedText });
            // A demo (presentation) card signs in by its scan alone: straight to the dashboard.
            if (!isTeacher && res.data?.token) { enterApp(res.data, next); return; }
            setCardNumber(res.data.cardNumber);
            setScannedCard(true);
            setError('');
            setTimeout(() => passwordRef.current?.focus(), 60);
        } catch (err) {
            const code = err.response?.data?.code;
            if (code === 'TEACHER_CARD' || code === 'STUDENT_CARD') setOtherKind(code === 'TEACHER_CARD' ? 'teacher' : 'student');
            setScanError(
                err.response?.data?.message
                    || (!err.response
                        ? 'Could not reach the server to check that card. Make sure the server is running and you are online, then try again or type the number.'
                        : 'That card could not be read. Try again, or type the number.')
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!scanning) { stopScanner(); return undefined; }
        let cancelled = false;
        // The scanner library is fetched when the camera is first asked for,
        // not with the page: most sign-ins never open it.
        import('html5-qrcode').then(({ Html5Qrcode }) => {
            if (cancelled) return undefined;
            const inst = new Html5Qrcode(SCANNER_ID);
            scannerRef.current = inst;
            return inst.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText) => { if (!cancelled) resolveScan(decodedText); },
                () => {}   // a frame without a code is not an error
            );
        }).catch(() => {
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

    // Android's back button closes the "How it works" sheet, rather than leaving the page.
    useBackClose(() => setShowHow(false), showHow);

    // A new error is brought into view (role="alert" also reads it out).
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [error]);

    // Email sign-in is the teacher side's only; a student on 'email' is shown the typed card.
    const emailMode = isTeacher && mode === 'email';

    if (user) return <Navigate to={next} replace />;
    // A teacher is signed in on this device: their dashboard.
    if (hasTeacherSession()) return <Navigate to="/teacher" replace />;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (emailMode) {
            if (!teacherEmail.trim()) { setError('Enter your email first.'); document.getElementById('login-teacher-email')?.focus(); return; }
            setLoading(true);
            setOtherKind(null);
            try {
                enterTeacher((await teacherApi.post('/auth/login', { email: teacherEmail.trim(), password })).data);
            } catch (err) {
                setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'Sign-in failed'));
                setLoading(false);
                passwordRef.current?.focus();
            }
            return;
        }
        // In scan mode there is no number box for the browser to insist on,
        // so an empty card went to the server and came back as "Invalid card
        // number or password" — about a password the student had typed right.
        if (!cardNumber) {
            setError('Enter your card number, or scan your card.');
            document.getElementById('login-card-number')?.focus();
            return;
        }
        setLoading(true);
        setOtherKind(null);
        if (isTeacher) {
            try {
                const res = await teacherApi.post('/auth/login', { cardNumber, password });
                enterTeacher(res.data);
            } catch (err) {
                if (err.response?.data?.code === 'STUDENT_CARD') setOtherKind('student');
                setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'Sign-in failed'));
                setLoading(false);
                passwordRef.current?.focus();
            }
            return;
        }
        const res = await login(cardNumber, password, next);
        // On success the page is already on its way to the dashboard: the
        // button keeps saying so until it gets there.
        if (!res.success) {
            if (res.code === 'TEACHER_CARD') setOtherKind('teacher');
            if (res.code === 'DEVICE_LIMIT' && res.device) { setDeviceConflict(res.device); setLoading(false); return; }
            setError(res.error);
            setLoading(false);
            passwordRef.current?.focus();
        }
    };

    return (
        <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#232840] via-[#1f2336] to-[#272240] p-4 text-slate-100 sm:p-6">
            {/* A soft dark backdrop with two quiet glows — nothing to compete with the form. */}
            <span aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[30rem] w-[44rem] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
            <span aria-hidden className="pointer-events-none absolute -right-40 -bottom-48 -z-10 h-[28rem] w-[28rem] rounded-full bg-violet-500/10 blur-[120px]" />
            {!role && <RoleChooser onChoose={chooseRole} />}
            {showForgot && <ForgotPasswordModal role={isTeacher ? 'teacher' : 'student'} onClose={() => setShowForgot(false)} />}
            {showContact && <ContactAdminModal onClose={() => setShowContact(false)} page="login" />}
            {deviceConflict && (
                <DeviceLimitDialog conflict={deviceConflict} onClose={() => setDeviceConflict(null)}
                    onReplace={(removeId) => replaceDevice(deviceConflict.ticket, removeId, next)} />
            )}
            {showHow && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setShowHow(false)}>
                    <div role="dialog" aria-modal="true" aria-labelledby="how-title" onClick={(e) => e.stopPropagation()} className="lg-rise w-full max-w-md overflow-hidden rounded-3xl bg-[#2a2f45] shadow-2xl ring-1 ring-white/10">
                        <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.04] px-5 py-4">
                            <h3 id="how-title" className="flex items-center gap-2 font-bold text-slate-100"><QrCode size={17} className="text-indigo-300" /> Signing in with your card</h3>
                            <button type="button" onClick={() => setShowHow(false)} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"><X size={16} /></button>
                        </div>
                        <ol className="space-y-4 p-5">
                            {[
                                ['Tap the scan area', 'Your browser will ask to use the camera. Allow it.'],
                                ['Hold up your card', 'Point the QR code on the card at the camera. It reads in a second.'],
                                ['Enter your password', 'The card number fills itself in, so the password is all you type.']
                            ].map(([t, d], i) => (
                                <li key={t} className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">{i + 1}</span>
                                    <div><p className="font-bold text-slate-100">{t}</p><p className="text-sm text-slate-400">{d}</p></div>
                                </li>
                            ))}
                        </ol>
                        <div className="border-t border-white/5 px-5 py-4 text-right">
                            <button type="button" onClick={() => setShowHow(false)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Got it</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="lg-rise w-full max-w-[28rem] overflow-hidden rounded-3xl bg-[#2a2f45] shadow-[0_30px_70px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/10">

                {/* ── Right: the sign-in card ──────────────────────────── */}
                <section className="relative px-6 py-8 sm:px-9 sm:py-9">
                    <div className="mx-auto max-w-md">
                        <div className="lg-rise flex flex-col items-center text-center" style={{ animationDelay: '0.1s' }}>
                            <img src="/assets/YATICORP.png" alt="YATICORP" className="mb-6 h-8 w-auto object-contain" />
                            {/* Student or teacher, as one switch: the chooser's answer, changeable. */}
                            <div role="radiogroup" aria-label="Signing in as" className="mb-6 grid w-full grid-cols-2 overflow-hidden rounded-xl border border-white/10 bg-black/15 p-1">
                                {[['student', 'Student', GraduationCap], ['teacher', 'Teacher', BookOpenCheck]].map(([id, label, Icon]) => (
                                    <button key={id} type="button" role="radio" aria-checked={role === id} onClick={() => chooseRole(id)}
                                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition-all ${role === id ? (id === 'teacher' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm') : 'text-slate-400 hover:text-white'}`}>
                                        <Icon size={15} aria-hidden="true" /> {label}
                                    </button>
                                ))}
                            </div>
                            <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{isTeacher ? 'Teacher sign in' : 'Welcome back'}</h2>
                            <p className="mt-1.5 text-sm text-slate-400">{isTeacher ? 'Sign in to your teacher dashboard.' : 'Sign in to continue learning.'}</p>
                        </div>

                        <form className="lg-rise mt-6 space-y-5" onSubmit={handleLogin} style={{ animationDelay: '0.2s' }}>
                            {sessionEnded && !error && (
                                <p role="status" className="flex items-start gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/15 p-3 text-sm font-medium text-indigo-200">
                                    <Info size={16} className="mt-0.5 shrink-0" /> {sessionEnded === 'device' ? 'This device was removed from your account (you can use only 2 devices). Sign in to choose your devices.' : sessionEnded === 'replaced' ? 'Your account was signed in on another device, so you were signed out here. Only one sign-in at a time is allowed.' : 'Your session has ended — please sign in again.'}
                                </p>
                            )}
                            {error && (
                                <div ref={errorRef} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-center text-sm font-medium text-red-300">
                                    {error}
                                    {otherKind && (
                                        <> <button type="button" onClick={() => chooseRole(otherKind)} className="font-bold text-indigo-300 underline">Switch to {otherKind === 'teacher' ? 'Teacher' : 'Student'}</button></>
                                    )}
                                </div>
                            )}

                            {/* One standard form: the card number, with the scanner inside the field
                                (asked 2026-10-29) — no separate Scan / Type step. Teachers without a card
                                can switch to their email below it. */}
                            {emailMode ? (
                                <div>
                                    <label htmlFor="login-teacher-email" className="mb-2 block text-sm font-semibold text-slate-200">Email address</label>
                                    <input id="login-teacher-email" type="email" autoComplete="username" value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)}
                                        className="block w-full appearance-none rounded-xl border border-white/10 bg-black/15 px-4 py-3.5 text-slate-100 shadow-sm placeholder-slate-500 transition duration-200 focus:border-transparent focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="name@school.edu" />
                                    <button type="button" onClick={() => { setError(''); setMode('manual'); }} className="mt-2 text-xs font-semibold text-indigo-300 hover:text-indigo-100 hover:underline">Sign in with your card instead</button>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="login-card-number" className="mb-2 block text-sm font-semibold text-slate-200">Card number</label>
                                    <div className="relative">
                                        <input id="login-card-number" type="text" maxLength="12" inputMode="numeric" pattern="[0-9]*" autoComplete="username" value={cardNumber}
                                            onChange={e => { setCardNumber(e.target.value.replace(/\D/g, '')); setScannedCard(false); }}
                                            className={`block w-full appearance-none rounded-xl border bg-black/15 py-3.5 pr-14 pl-4 font-mono tracking-[0.12em] text-slate-100 shadow-sm placeholder:font-sans placeholder:tracking-normal placeholder-slate-500 transition duration-200 focus:border-transparent focus:bg-white/[0.07] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${scannedCard ? 'border-emerald-400/40' : 'border-white/10'}`}
                                            placeholder="12-digit card number" />
                                        {/* Scan, inside the field: the camera opens below and fills the number in. */}
                                        <button ref={scanButtonRef} type="button" disabled={loading}
                                            onClick={() => { setScanError(''); setError(''); setScanning((on) => !on); }}
                                            aria-label={scanning ? 'Stop scanning' : 'Scan your card'} aria-pressed={scanning} title={scanning ? 'Stop scanning' : 'Scan your card'}
                                            className={`absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-60 ${scanning ? 'bg-indigo-500 text-white' : 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30 hover:bg-indigo-500/25'}`}>
                                            {loading && !cardNumber ? <Loader2 size={18} className="animate-spin" /> : scanning ? <X size={18} /> : <ScanLine size={19} />}
                                        </button>
                                    </div>
                                    {scannedCard && <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-300"><CheckCircle2 size={13} /> Card read from the scan</p>}
                                    {/* html5-qrcode needs this element present before it starts. */}
                                    <div className={scanning ? 'mt-3' : 'hidden'}>
                                        <div id={SCANNER_ID} className="overflow-hidden rounded-xl bg-black ring-1 ring-white/10" />
                                        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                            <span className="text-slate-400">Hold the QR code on your card up to the camera.</span>
                                            <button type="button" onClick={() => setShowHow(true)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-indigo-300 hover:text-indigo-100"><PlayCircle size={13} /> How it works</button>
                                        </div>
                                    </div>
                                    {isTeacher && !scanning && (
                                        <button type="button" onClick={() => { setError(''); setScanning(false); setMode('email'); }} className="mt-2 text-xs font-semibold text-indigo-300 hover:text-indigo-100 hover:underline">No card? Sign in with your email</button>
                                    )}
                                </div>
                            )}

                            {scanError && (
                                <p className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-200">
                                    <CameraOff size={14} className="mt-0.5 shrink-0" />
                                    <span>{scanError}{otherKind && !error && <> <button type="button" onClick={() => chooseRole(otherKind)} className="font-bold text-indigo-300 underline">Switch to {otherKind === 'teacher' ? 'Teacher' : 'Student'}</button></>}</span>
                                </p>
                            )}

                            <div>
                                <div className="flex items-center justify-between">
                                    <label htmlFor="login-password" className="text-sm font-semibold text-slate-200">Password</label>
                                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs font-semibold text-indigo-300 transition-colors hover:text-indigo-100 hover:underline">
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative mt-2">
                                    <input
                                        ref={passwordRef}
                                        id="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="block w-full appearance-none rounded-xl border border-white/10 bg-white/5 focus:bg-white/[0.07] px-4 py-3.5 pr-12 text-slate-100 shadow-sm placeholder-slate-500 transition duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Enter your password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" disabled={loading}
                                className="group relative flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:hover:translate-y-0">
                                {loading ? 'Authenticating…' : isTeacher ? 'Open Teacher Dashboard' : 'Access Platform'}
                                {!loading && <span className="absolute right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1"><ArrowRight size={15} /></span>}
                            </button>
                        </form>

                        <button type="button" onClick={() => setShowContact(true)}
                            className="lg-rise mt-4 flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-indigo-200 hover:bg-indigo-500/15" style={{ animationDelay: '0.3s' }}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300"><MessageCircleQuestion size={16} /></span>
                            <span className="flex-1">Having trouble? <span className="font-bold text-indigo-300">Contact Admin</span></span>
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2a2f45] ring-1 ring-white/10"><ChevronRight size={15} className="text-slate-400" /></span>
                        </button>

                        <p className="mt-5 text-center text-xs text-slate-400">
                            {isTeacher
                                ? <>New teacher? <Link to="/signup?as=teacher" className="font-bold text-emerald-300 hover:underline">Register your card</Link></>
                                : <>Don&apos;t have an account? <Link to={next === '/' ? '/signup' : `/signup?next=${encodeURIComponent(next)}`} className="font-bold text-indigo-300 hover:underline">Sign up here</Link></>}
                        </p>
                        <p className="mt-3 text-center text-[11px] text-slate-400">
                            <Link to="/terms" className="hover:text-indigo-200 hover:underline">Terms and Conditions</Link> · <Link to="/privacy" className="hover:text-indigo-200 hover:underline">Privacy Policy</Link>
                        </p>
                        {/* Inside the app the admin console travels in the same bundle, under
                            /admin/. On the website it is its own site, so no link here. */}
                        {isNative() && (
                            <p className="mt-3 text-center text-xs text-slate-400">
                                Staff? <a href="/admin/index.html" className="font-bold text-indigo-300 hover:underline">Admin sign in</a>
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Login;
