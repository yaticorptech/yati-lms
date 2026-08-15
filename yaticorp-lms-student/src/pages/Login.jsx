/**
 * @author Preethesh Kulal
 * @description Student login page with card number, password and forgot password support
 */
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import api from '../utils/api';
import { GraduationCap, Mail, KeyRound, MessageCircleQuestion, X, CheckCircle2, Send, Eye, EyeOff } from 'lucide-react';

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
                        <div className="grid grid-cols-2 gap-3">
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
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
            {showContact && <ContactAdminModal onClose={() => setShowContact(false)} page="login" />}

            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px]"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center">
                <div className="p-4 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/30">
                    <GraduationCap size={40} className="text-white" />
                </div>
                <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome to <span className="text-indigo-600">YATICORP LMS</span>
                </h2>
                <p className="mt-2 text-center text-sm text-slate-500">
                    Sign in using your assigned Card Number
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
                    <form className="space-y-6" onSubmit={handleLogin}>
                        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm text-center font-medium">{error}</div>}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700">Card Number</label>
                            <div className="mt-2">
                                <input type="text" required maxLength="12" inputMode="numeric" pattern="[0-9]*" value={cardNumber} onChange={e => setCardNumber(e.target.value.replace(/\D/g, ''))}
                                    className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 text-slate-800 font-mono tracking-wider"
                                    placeholder="12-Digit Card Number" />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center">
                                <label className="block text-sm font-semibold text-slate-700">Password</label>
                                <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 hover:underline transition-colors">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="mt-2 relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition duration-200 text-slate-800"
                                    placeholder="Enter password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 transition-colors p-1"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50">
                                {loading ? 'Authenticating...' : 'Access Platform'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-5 text-center">
                        <button onClick={() => setShowContact(true)} className="inline-flex items-center text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors group">
                            <MessageCircleQuestion size={15} className="mr-1.5 group-hover:text-indigo-600 transition-colors" />
                            Having trouble? Contact Admin
                        </button>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <Link to="/signup" className="text-sm font-bold text-indigo-600 hover:text-indigo-500 hover:underline transition-colors drop-shadow-sm">
                        Don't have an account? Sign up here
                    </Link>
                    <p className="mt-6 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        Secured by YATICORP
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
