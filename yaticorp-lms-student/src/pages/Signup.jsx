/**
 * @author Preethesh Kulal
 * @description Multi-step student registration with QR code scan/manual entry
 */
import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff, QrCode, Lock, Camera, Keyboard } from 'lucide-react';
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
                        <div className="grid grid-cols-2 gap-3">
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

    // Camera scanner state
    const [scanMode, setScanMode] = useState('manual'); // 'manual' | 'camera'
    const [scannerError, setScannerError] = useState('');
    const scannerRef = useRef(null);
    const scannerDivId = 'qr-reader-signup';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    // Start camera scanner
    const startScanner = async () => {
        setScannerError('');
        try {
            const html5QrCode = new Html5Qrcode(scannerDivId);
            scannerRef.current = html5QrCode;
            await html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 220, height: 220 } },
                (decodedText) => {
                    // On successful scan
                    const value = decodedText.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setQrCodeNumber(value);
                    stopScanner();
                    setScanMode('manual');
                },
                () => {} // ignore per-frame errors
            );
        } catch {
            setScannerError('Camera access denied or not available. Please enter the QR code manually.');
            setScanMode('manual');
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
            scannerRef.current = null;
        }
    };

    useEffect(() => {
        if (scanMode === 'camera') {
            startScanner();
        } else {
            stopScanner();
        }
        return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanMode]);

    // Stop scanner when moving away from step 1
    useEffect(() => {
        if (step !== 1) stopScanner();
    }, [step]);

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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -ml-[40rem] w-[80rem] h-[40rem] opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-300 via-white to-transparent transform -translate-y-1/2 rounded-full pointer-events-none"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg ring-1 ring-slate-200/70 mb-6">
                    <img src="/assets/favicon.ico" alt="YATICORP" className="w-10 h-10 object-contain" />
                </div>
                <h2 className="text-center text-3xl font-black tracking-tight text-slate-900">Create your account</h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                    {step === 1 && 'Step 1: QR Code Verification'}
                    {step === 2 && 'Step 2: Personal Details'}
                    {step === 3 && 'Step 3: Set Your Password'}
                </p>
                {/* Stepper Dots */}
                <div className="flex justify-center items-center space-x-2 mt-4">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={`h-2.5 rounded-full transition-all duration-300 ${step === s ? 'bg-indigo-600 w-6' : step > s ? 'bg-green-500 w-2.5' : 'bg-slate-300 w-2.5'}`}></div>
                    ))}
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full relative z-10 sm:max-w-md">
                <div className="bg-white/80 backdrop-blur-xl py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-white/50">

                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50/50 border border-red-200 flex items-start space-x-3">
                            <span className="text-red-500 mt-0.5">⚠️</span>
                            <div className="text-sm font-medium text-red-800">{error}</div>
                        </div>
                    )}

                    {/* Step 1: QR Code */}
                    {step === 1 && (
                        <form className="space-y-5" onSubmit={handleValidateQR}>
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">QR Code Verification</h3>

                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 flex items-start gap-3">
                                <QrCode size={20} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-indigo-800">
                                    Scan or manually enter the QR Code from your activation card. Your card details will be fetched automatically.
                                </p>
                            </div>

                            {/* Toggle buttons */}
                            <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setScanMode('manual')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${scanMode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Keyboard size={15} /> Manual Entry
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScanMode('camera')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${scanMode === 'camera' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Camera size={15} /> Scan Camera
                                </button>
                            </div>

                            {/* Camera scanner view */}
                            {scanMode === 'camera' && (
                                <div className="space-y-3">
                                    <div id={scannerDivId} className="w-full rounded-xl overflow-hidden border border-slate-200" />
                                    {scannerError && (
                                        <p className="text-xs text-red-500 font-medium">{scannerError}</p>
                                    )}
                                    <p className="text-xs text-slate-400 text-center">Point your camera at the QR code on your card</p>
                                </div>
                            )}

                            {/* Manual entry */}
                            {scanMode === 'manual' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">QR Code *</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={11}
                                        placeholder="Enter QR Code (e.g. QR12345678)"
                                        value={qrCodeNumber}
                                        onChange={(e) => {
                                            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                            setQrCodeNumber(value);
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono tracking-widest text-indigo-900"
                                    />
                                    <p className="mt-1 text-xs text-slate-500">Found on the back of your physical or digital card.</p>
                                </div>
                            )}

                            {/* Show scanned value if camera was used */}
                            {scanMode === 'manual' && qrCodeNumber && (
                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                    <QrCode size={14} className="text-emerald-600 flex-shrink-0" />
                                    <span className="text-xs font-mono text-emerald-800 tracking-widest">{qrCodeNumber}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={qrValidating || !qrCodeNumber.trim()}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                            >
                                {qrValidating ? 'Validating...' : 'Validate QR Code →'}
                            </button>
                        </form>
                    )}

                    {/* Step 2: Personal Details */}
                    {step === 2 && (
                        <form className="space-y-4" onSubmit={handlePersonalDetailsNext}>
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 mb-4 flex items-start space-x-3">
                                <CheckCircle2 size={18} className="text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-indigo-900">QR Code Verified</h4>
                                    <p className="text-xs text-indigo-700 mt-0.5">Card details fetched securely. Please provide your personal details.</p>
                                </div>
                            </div>

                            {/* Read-only card info display */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                                <Lock size={16} className="text-slate-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Card Number (auto-fetched)</p>
                                    <p className="font-mono text-slate-800 text-sm tracking-widest">{cardDetails.CardNumber}</p>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Personal Details</h3>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                                <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email *</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                                <p className="mt-1 text-xs text-slate-400">Only @gmail.com addresses are accepted.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Phone Number *</label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.phoneCode || '+91'}
                                        onChange={e => setFormData({ ...formData, phoneCode: e.target.value })}
                                        className="px-2 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-sm w-24"
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
                                        placeholder="Phone number"
                                        value={formData.phone}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, phone: digits });
                                        }}
                                        className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => { setStep(1); setQrValidated(false); }} className="w-1/3 flex justify-center py-3 px-4 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all">Back</button>
                                <button type="submit" className="w-2/3 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all">Next Step →</button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Password */}
                    {step === 3 && (
                        <form className="space-y-5" onSubmit={handleRegistrationSubmit}>
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Set Your Password</h3>

                            {/* No course to pick any more. Every published bundle is open
                                to a signed-in student, so asking them to choose one thing
                                up front only made the rest look unavailable. */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Set Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            name="password"
                                            required
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            onFocus={() => setPasswordFocused(true)}
                                            onBlur={() => setPasswordFocused(false)}
                                            className="w-full px-4 py-2 pr-11 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1" tabIndex={-1}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>

                                    {/* Live strength checklist — only shown while typing */}
                                    {(passwordFocused || formData.password.length > 0) && (
                                        <div className="mt-2 space-y-1">
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
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password *</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            name="confirmPassword"
                                            required
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-2 pr-11 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 p-1" tabIndex={-1}>
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button type="button" onClick={() => setStep(2)} className="w-1/3 flex justify-center py-3 px-4 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all">Back</button>
                                <button type="submit" disabled={loading} className="w-2/3 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                    {loading ? 'Creating...' : 'Register & Login'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <p className="mt-6 text-center text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors">Sign in here</Link>
                </p>
                <div className="mt-4 text-center">
                    <button onClick={() => setShowContact(true)} className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors group">
                        <MessageCircleQuestion size={15} className="mr-1.5" />Having trouble? Contact Admin
                    </button>
                </div>
            </div>
            {showContact && <ContactAdminModal onClose={() => setShowContact(false)} page="signup" />}
        </div>
    );
};

export default Signup;
