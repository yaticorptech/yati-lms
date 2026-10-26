/**
 * Access hours: an organization can open YATICORP to its students only at
 * set times (its Dashboard → Access hours; server:
 * organizations/services/accessSchedule.js). Outside them the student is
 * still signed in, and sees this screen: when the platform opens, the hours,
 * and a countdown. It opens by itself at the time, with no reload
 * (hooks/useAccessHours.js keeps the answer).
 */
import React, { useEffect, useState } from 'react';
import { Clock, LogOut, RotateCw, CalendarClock } from 'lucide-react';

const fmtWhen = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
    const sameDay = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now.getTime() + 864e5).toDateString() === d.toDateString();
    return sameDay ? `today at ${time}` : tomorrow ? `tomorrow at ${time}` : `${d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })} at ${time}`;
};

const countdown = (iso, now) => {
    const ms = Math.max(0, new Date(iso) - now);
    const h = Math.floor(ms / 3.6e6);
    const m = Math.floor((ms % 3.6e6) / 6e4);
    const s = Math.floor((ms % 6e4) / 1000);
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m ${String(s).padStart(2, '0')}s`;
};

export default function PlatformClosed({ access, onCheck, onSignOut, name }) {
    const [now, setNow] = useState(() => Date.now());
    const [checking, setChecking] = useState(false);
    useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
    const recheck = async () => { setChecking(true); try { await onCheck(); } finally { setChecking(false); } };

    return (
        <div role="main" className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white text-center shadow-xl ring-1 ring-slate-200">
                <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 pb-10 pt-8 text-white">
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30"><Clock size={32} aria-hidden /></span>
                    <h1 className="mt-4 text-2xl font-black">The platform is closed now</h1>
                    <p className="mt-1 text-sm text-indigo-100">{name ? `Hi ${name.split(' ')[0]}! ` : ''}{access?.organization || 'Your organization'} has set the hours you can learn here.</p>
                </div>
                <div className="-mt-6 px-6 pb-6">
                    <div className="rounded-2xl bg-white p-5 shadow-md ring-1 ring-slate-100">
                        {access?.opensAt ? (
                            <>
                                <p className="text-sm font-semibold text-slate-500">YATICORP opens</p>
                                <p className="mt-0.5 text-xl font-black text-slate-900">{fmtWhen(access.opensAt)}</p>
                                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700 tabular-nums">in {countdown(access.opensAt, now)}</p>
                            </>
                        ) : (
                            <p className="text-sm font-semibold text-slate-600">Please come back during your organization's hours.</p>
                        )}
                        {access?.hours && (
                            <p className="mt-4 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
                                <CalendarClock size={16} className="shrink-0 text-slate-400" aria-hidden /> Open {access.hours.charAt(0).toLowerCase()}{access.hours.slice(1)}
                            </p>
                        )}
                    </div>
                    <p className="mt-4 text-xs text-slate-500">This page opens by itself when the time comes.</p>
                    <div className="mt-5 flex gap-3">
                        <button type="button" onClick={onSignOut} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"><LogOut size={16} /> Sign out</button>
                        <button type="button" onClick={recheck} disabled={checking} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"><RotateCw size={16} className={checking ? 'animate-spin' : ''} /> Check again</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
