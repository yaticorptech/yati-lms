/**
 * @description The profile page's small moving parts: a number that counts
 *              up, a ring that draws itself, a week of activity dots, a stat
 *              tile, and the greeting bubble.
 *
 * Every animation here runs once, on arrival, and respects
 * prefers-reduced-motion through the shared keyframes in career.css /
 * index.css — motion is a greeting, not a loop.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import useCountUp from '../hooks/useCountUp';

/** A progress ring that draws in from zero when it mounts. */
export const ProgressRing = ({ percent = 0, size = 56, stroke = 6, color = '#6366f1', track = '#e0e7ff', children, label }) => {
    const [shown, setShown] = useState(0);
    useEffect(() => { const t = setTimeout(() => setShown(Math.max(0, Math.min(100, percent))), 60); return () => clearTimeout(t); }, [percent]);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label || `${percent}%`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)}
                    style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center">{children}</span>
        </div>
    );
};

const TONES = {
    amber: { bg: 'from-amber-50 to-orange-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', ring: '#f59e0b', track: '#fde68a' },
    sky: { bg: 'from-sky-50 to-indigo-50', border: 'border-sky-200', icon: 'bg-sky-100 text-sky-600', ring: '#0ea5e9', track: '#bae6fd' },
    orange: { bg: 'from-orange-50 to-rose-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', ring: '#f97316', track: '#fed7aa' },
    rose: { bg: 'from-rose-50 to-pink-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', ring: '#f43f5e', track: '#fecdd3' },
    emerald: { bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', ring: '#10b981', track: '#a7f3d0' },
    violet: { bg: 'from-violet-50 to-indigo-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', ring: '#8b5cf6', track: '#ddd6fe' }
};

/** One pastel stat tile: big number that counts up, a label, an icon, optional ring. */
export const StatTile = ({ tone = 'amber', icon: Icon, value, suffix = '', label, sub, percent, to, emoji }) => {
    const t = TONES[tone] || TONES.amber;
    const n = useCountUp(value);
    const inner = (
        <>
            <div className="flex items-start justify-between gap-2">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.icon}`}><Icon size={19} /></span>
                {percent != null ? (
                    <ProgressRing percent={percent} size={44} stroke={5} color={t.ring} track={t.track} label={`${percent}% to the next level`}>
                        <span className="text-[10px] font-black tabular-nums text-slate-700">{percent}%</span>
                    </ProgressRing>
                ) : emoji ? (
                    <span aria-hidden="true" className="text-2xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">{emoji}</span>
                ) : null}
            </div>
            <p className="mt-3 text-3xl font-black tabular-nums tracking-tight text-slate-900">{n.toLocaleString()}{suffix}</p>
            <p className="text-sm font-bold text-slate-700">{label}</p>
            {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </>
    );
    const cls = `group lift relative block overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ${t.bg} ${t.border}`;
    return to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>;
};

/** Seven dots, oldest first, the way a calendar reads. */
export const ActivityStrip = ({ days = [] }) => (
    <ol className="flex items-end justify-between gap-1" aria-label="Activity this week">
        {days.map((d, i) => (
            <li key={d.key} className="flex flex-1 flex-col items-center gap-1.5" style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    d.active
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-200'
                        : d.isToday ? 'border-2 border-dashed border-indigo-300 text-indigo-500' : 'bg-slate-100 text-slate-400'
                } ${d.isToday ? 'ring-2 ring-indigo-200 ring-offset-2' : ''}`}
                    title={d.active ? 'Active' : d.isToday ? 'Today' : 'No activity'}>
                    {d.active ? '🔥' : d.dayNum}
                </span>
                <span className={`text-[11px] font-semibold ${d.isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{d.label}</span>
            </li>
        ))}
    </ol>
);

/** The mascot's line — a bubble with a tail, popping in beside the greeting. */
export const SpeechBubble = ({ emoji = '🐿️', children }) => (
    <div className="flex items-center gap-3">
        <span aria-hidden="true" className="drift flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-100 text-3xl shadow-md ring-4 ring-white/70">{emoji}</span>
        <div className="relative animate-pop-in rounded-2xl bg-amber-50 px-4 py-2.5 text-sm font-medium leading-snug text-slate-800 shadow-sm ring-1 ring-amber-200/70">
            <span aria-hidden="true" className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 rounded-sm bg-amber-50 ring-1 ring-amber-200/70 [clip-path:polygon(0_0,0_100%,100%_100%)]" />
            {children}
        </div>
    </div>
);
