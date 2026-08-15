/**
 * @author Preethesh Kulal
 * @description Admin login page — email + password, with optional 2FA
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import PasswordStrengthChecker from '../components/PasswordStrengthChecker';

const Login = () => {
    const { admin, login, verify2FA } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [pwFocused, setPwFocused] = useState(false);

    const [needs2FA, setNeeds2FA] = useState(false);
    const [adminId, setAdminId] = useState(null);
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (admin) return <Navigate to="/" replace />;

    // Login with credentials
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await login(email, password);
        if (res.requires2FA) {
            setNeeds2FA(true);
            setAdminId(res.adminId);
        } else if (!res.success) {
            setError(res.error);
        }
        setLoading(false);
    };

    // 2FA verification
    const handle2FA = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const res = await verify2FA(adminId, token);
        if (!res.success) setError(res.error);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[100px]"></div>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 text-center">
                <h2 className="mt-6 text-3xl font-extrabold text-white tracking-tight">
                    YATICORP <span className="text-indigo-400">LMS-ADMIN</span>
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                    {needs2FA ? 'Enter your two-factor code' : 'Sign in to continue'}
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
                <div className="bg-slate-800/80 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-slate-700">

                    {/* Credentials */}
                    {!needs2FA && (
                        <form className="space-y-6" onSubmit={handleLogin}>
                            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-4 py-3 border border-slate-600 rounded-xl bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    placeholder="admin@company.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'} required value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onFocus={() => setPwFocused(true)}
                                        onBlur={() => setPwFocused(false)}
                                        className="appearance-none block w-full px-4 py-3 pr-12 border border-slate-600 rounded-xl bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                        placeholder="••••••••" />
                                    <button type="button" onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1" tabIndex={-1}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <PasswordStrengthChecker password={password} focused={pwFocused} />
                            </div>
                            <button type="submit" disabled={loading}
                                className="w-full py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                {loading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </form>
                    )}

                    {/* 2FA */}
                    {needs2FA && (
                        <form className="space-y-6" onSubmit={handle2FA}>
                            <div className="text-center mb-2">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-900/50 mb-4">
                                    <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-white">Two-Factor Authentication</h3>
                                <p className="text-sm text-slate-400 mt-1">Enter the 6-digit code from your authenticator app.</p>
                            </div>
                            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">{error}</div>}
                            <input type="text" required maxLength="6" value={token} onChange={e => setToken(e.target.value)}
                                className="appearance-none block w-full px-4 py-4 text-center tracking-[0.5em] text-2xl font-mono border border-slate-600 rounded-xl bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="000000" />
                            <button type="submit" disabled={loading}
                                className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all">
                                {loading ? 'Verifying...' : 'Verify Code'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
