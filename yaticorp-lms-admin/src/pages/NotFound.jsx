/**
 * @author Preethesh Kulal
 * @description 404 not found page for admin panel
 */
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-xl w-full">
                {/* Error Code */}
                <div className="mb-8 relative inline-block">
                    <h1 className="text-9xl font-black text-slate-200 tracking-tighter animate-pulse">404</h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-4 bg-white rounded-3xl shadow-xl border border-slate-100 animate-bounce">
                            <AlertCircle size={48} className="text-indigo-600" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
                    Page Not Found
                </h2>
                <p className="text-slate-500 mb-10 text-lg leading-relaxed">
                    Oops! The page you're looking for doesn't exist or has been moved.
                    Let's get you back on track.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full sm:w-auto px-8 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl shadow-sm hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2 group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Go Back
                    </button>
                    <Link
                        to="/"
                        className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
                    >
                        <Home size={18} className="group-hover:scale-110 transition-transform" />
                        Dashboard
                    </Link>
                </div>

                {/* Footer Insight */}
                <div className="mt-16 pt-8 border-t border-slate-200 flex items-center justify-center gap-6 opacity-40 grayscale">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">YATICORP LMS</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Portal</span>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
