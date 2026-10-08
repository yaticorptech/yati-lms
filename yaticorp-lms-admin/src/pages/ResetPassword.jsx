/**
 * Choosing a new password from the emailed reset link.
 *
 * Public, like the sign-in page: whoever opens it has no password to sign in
 * with. The link carries a one-use token valid for an hour; the server checks
 * it and the password's strength, and this page only collects the new one.
 * Organization accounts only — see the "Forgot password?" form on the sign-in page.
 */
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import PasswordField from '../components/PasswordField';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const INPUT = 'appearance-none block w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition';

const ResetPassword = () => {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwFocused, setPwFocused] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState('');
    const [loading, setLoading] = useState(false);

    const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

    const submit = async (e) => {
        e.preventDefault();
        if (mismatch) return;
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/auth/admin/reset-password', { token, newPassword, confirmPassword });
            setDone(res.data.message);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not reset the password. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[100px]"></div>
            </div>

            <div className="mx-auto w-full max-w-md z-10 text-center">
                <h2 className="mt-2 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    YATICORP <span className="text-indigo-400">LMS-ADMIN</span>
                </h2>
                <p className="mt-2 text-sm text-slate-400">Choose a new password</p>
            </div>

            <div className="mt-6 sm:mt-8 mx-auto w-full max-w-md z-10">
                <div className="bg-slate-800/80 backdrop-blur-xl py-7 sm:py-8 px-5 shadow-2xl rounded-2xl sm:px-10 border border-slate-700">
                    {done ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-emerald-500/10 border border-emerald-400/40 text-emerald-200 p-3 rounded-lg text-sm">{done}</div>
                            <Link to="/login" className="inline-block w-full py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all">
                                Go to sign in
                            </Link>
                        </div>
                    ) : !token ? (
                        <div className="space-y-6 text-center">
                            <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm">
                                This reset link is incomplete. Open the link from the email again, or ask for a new one.
                            </div>
                            <Link to="/login" className="text-sm font-bold text-indigo-400 hover:text-indigo-300">Back to sign in</Link>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={submit}>
                            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="reset-new">New password</label>
                                <PasswordField id="reset-new" autoComplete="new-password" required value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    onFocus={() => setPwFocused(true)} onBlur={() => setPwFocused(false)}
                                    className={INPUT} placeholder="••••••••" />
                                <PasswordStrengthChecker password={newPassword} focused={pwFocused} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="reset-confirm">Confirm new password</label>
                                <PasswordField id="reset-confirm" autoComplete="new-password" required value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={INPUT} placeholder="••••••••" />
                                {mismatch && <p className="mt-1 text-xs text-red-400">The two passwords do not match.</p>}
                            </div>
                            <button type="submit" disabled={loading || mismatch}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                {loading ? 'Saving...' : 'Set new password'}
                            </button>
                            <div className="text-center">
                                <Link to="/login" className="text-sm font-bold text-indigo-400 hover:text-indigo-300">Back to sign in</Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
