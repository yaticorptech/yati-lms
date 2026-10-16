/**
 * @author Preethesh Kulal
 * @description Password reset page accessed via email token link
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { forgetStudent } from '../utils/sessionExpiry';
import { GraduationCap, KeyRound, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const getPasswordStrengthError = (pw) => {
    if (!pw || pw.length < 8) return 'Min 8 characters required.';
    if (!/[A-Z]/.test(pw)) return 'Must include an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Must include a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Must include a number.';
    if (!/[^A-Za-z0-9]/.test(pw)) return 'Must include a special character.';
    return null;
};

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const errorRef = useRef(null);

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    // A new error is brought into view, and read out (role="alert").
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
    }, [error]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            document.getElementById('reset-confirm-password')?.focus();
            return;
        }
        const pwError = getPasswordStrengthError(newPassword);
        if (pwError) { setError(pwError); document.getElementById('reset-new-password')?.focus(); return; }
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/student/reset-password', { token, newPassword });
            // The reset ended every session signed in with the old password
            // (the server refuses them now). Any such login saved on this
            // device is forgotten too, so the sign-in page asks for the new
            // password instead of bouncing to a dashboard that cannot load.
            forgetStudent();
            setMessage(res.data.message);
            setDone(true);
            // A full load, so nothing held in memory from that session survives.
            setTimeout(() => window.location.assign('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || (!err.response ? 'Check your connection and try again.' : 'Failed to reset password. The link may have expired.'));
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 max-w-md w-full text-center">
                    <p className="text-red-600 font-semibold">Invalid reset link. Please request a new one.</p>
                    <Link to="/login" className="mt-4 inline-block text-indigo-600 font-bold hover:underline">Back to Login</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]"></div>
                <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[100px]"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 flex flex-col items-center">
                <div className="p-4 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-600/30">
                    <GraduationCap size={40} className="text-white" />
                </div>
                <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                    Reset your <span className="text-indigo-600">Password</span>
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
                <div className="bg-white py-8 px-4 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-slate-100">
                    {done ? (
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} className="text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Password Reset!</h3>
                            <p className="text-slate-500 text-sm">{message}</p>
                            <p className="text-slate-400 text-xs mt-2">Redirecting to login...</p>
                            <a href="/login" className="mt-3 inline-block text-sm font-bold text-indigo-600 hover:underline">Sign in now</a>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {error && (
                                <div ref={errorRef} role="alert" className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm text-center font-medium">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="reset-new-password" className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
                                <div className="relative">
                                    <input
                                        id="reset-new-password"
                                        type={showNew ? 'text' : 'password'}
                                        required
                                        autoComplete="new-password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        onFocus={() => setPwFocused(true)}
                                        onBlur={() => setPwFocused(false)}
                                        className="appearance-none block w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(v => !v)}
                                        aria-label={showNew ? 'Hide password' : 'Show password'}
                                        aria-pressed={showNew}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-500 hover:text-slate-800 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <PasswordStrengthChecker password={newPassword} focused={pwFocused} />
                            </div>

                            <div>
                                <label htmlFor="reset-confirm-password" className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        id="reset-confirm-password"
                                        type={showConfirm ? 'text' : 'password'}
                                        required
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="appearance-none block w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(v => !v)}
                                        aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                        aria-pressed={showConfirm}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-slate-500 hover:text-slate-800 p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                    >
                                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50"
                            >
                                <KeyRound size={18} className="mr-2" />
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>

                            <div className="text-center">
                                <Link to="/login" className="text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                                    Back to Login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
