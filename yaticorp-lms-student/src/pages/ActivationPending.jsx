/**
 * @author YATICORP
 * @description TEMPORARY full-screen notice shown after login while courses are being uploaded
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⚠️  TEMPORARY PAGE — REMOVE WHEN COURSES ARE LIVE
 *
 * While this is active, every signed-in route shows this page instead of the
 * app (dashboard, courses, community, profile are all unreachable).
 *
 * To restore the normal app, do exactly two things:
 *   1. In src/App.jsx set  ACTIVATION_PENDING = false
 *      (or delete the whole block marked "TEMPORARY ACTIVATION_PENDING").
 *   2. Delete this file.
 *
 * The 48-hour wait below is fixed text, not read from the drip-release config.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useContext } from 'react';
import { CheckCircle2, Clock, MessageCircleQuestion, X, Send, LogOut } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

// Compact support form — self-contained so this whole file can be deleted.
const SupportModal = ({ onClose, user }) => {
    const [form, setForm] = useState({
        name: user?.name || '',
        email: user?.email || '',
        cardNumber: user?.cardNumber || '',
        subject: 'Activation status',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await api.post('/tickets', { ...form, page: 'activation-pending' });
            setDone(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-indigo-100 rounded-lg"><MessageCircleQuestion size={18} className="text-indigo-600" /></div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800">Contact Support</h2>
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
                        <h3 className="font-bold text-slate-800 text-lg mb-1">Message sent</h3>
                        <p className="text-slate-500 text-sm mb-4">We've received your request and will get back to you soon.</p>
                        <button onClick={onClose} className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                            <input
                                type="text" required value={form.subject}
                                onChange={e => setForm({ ...form, subject: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
                            <textarea
                                required rows={4} value={form.message}
                                onChange={e => setForm({ ...form, message: e.target.value })}
                                placeholder="Tell us how we can help…"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            />
                        </div>
                        <div className="flex justify-end space-x-3 pt-1">
                            <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-600 font-semibold text-sm hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                            <button
                                type="submit" disabled={loading}
                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
                            >
                                <Send size={15} /> {loading ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

const ActivationPending = () => {
    const { user, logout } = useContext(AuthContext);
    const [showSupport, setShowSupport] = useState(false);

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
            style={{ background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }}
        >
            {showSupport && <SupportModal onClose={() => setShowSupport(false)} user={user} />}

            {/* Brand */}
            <img src="/assets/YATICORP.png" alt="YATICORP" className="w-56 max-w-[70vw] object-contain mb-10" />

            {/* Notice card */}
            <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl w-full max-w-lg p-8 md:p-10">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 size={34} className="text-emerald-600" />
                </div>

                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">
                    You have successfully logged in
                </h1>

                {user?.name && (
                    <p className="text-slate-500 text-sm mb-6">Welcome, {user.name.split(' ')[0]}.</p>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-left">
                    <p className="flex items-start gap-2.5 text-slate-800 font-semibold">
                        <Clock size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                        <span>Your learning path will start after <strong>48 hours</strong> from now.</span>
                    </p>
                    <p className="text-sm text-slate-600 pl-[26px]">
                        Your activation takes some time to process. We're preparing your
                        courses — you'll be able to start learning as soon as it's ready.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
                    <button
                        onClick={() => setShowSupport(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                        <MessageCircleQuestion size={17} /> Contact Support
                    </button>
                    <button
                        onClick={logout}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 text-slate-600 font-semibold text-sm rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                        <LogOut size={17} /> Log out
                    </button>
                </div>
            </div>

            <p className="text-slate-400 text-xs mt-8 tracking-wider uppercase">Secured by YATICORP</p>
        </div>
    );
};

export default ActivationPending;
