/**
 * Interview Ready's animated pieces: a readiness ring that draws itself,
 * numbers that count up, the coach's tip
 * bubble, a smooth collapse, and a small celebration for a good report.
 * All motion is CSS or requestAnimationFrame, and every animation is off
 * under prefers-reduced-motion (see index.css).
 */
import { useEffect, useState } from 'react';
import { useCountUp } from './useCountUp';
import { TIPS } from './tips';
import { Bot } from 'lucide-react';

export const CountUp = ({ value, suffix = '', className = '' }) => { const n = useCountUp(value); return <span className={`tabular-nums ${className}`}>{n}{suffix}</span>; };

/** A ring that draws to `value`% with the number counting up inside. */
export const ScoreRing = ({ value = 0, size = 128, stroke = 10, label = '', light = false, children }) => {
    const [drawn, setDrawn] = useState(0);
    useEffect(() => { const t = setTimeout(() => setDrawn(value), 120); return () => clearTimeout(t); }, [value]);
    const n = useCountUp(value);
    const r = (size - stroke) / 2; const c = 2 * Math.PI * r; const id = `ring-${size}-${light ? 'l' : 'd'}`;
    const [from, to] = light ? ['#ffffff', '#c7d2fe'] : value >= 75 ? ['#10b981', '#14b8a6'] : value >= 50 ? ['#6366f1', '#8b5cf6'] : ['#f59e0b', '#f97316'];
    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={`${label || 'Score'} ${value}%`}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={from} /><stop offset="100%" stopColor={to} /></linearGradient></defs>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? 'rgba(255,255,255,0.25)' : '#e2e8f0'} strokeWidth={stroke} />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * drawn) / 100} className="iv-ring-draw" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {children || <><span className={`font-black tabular-nums leading-none ${size >= 120 ? 'text-4xl' : 'text-2xl'} ${light ? 'text-white' : 'text-slate-900'}`}>{n}<span className="text-base font-bold opacity-70">%</span></span>{label && <span className={`mt-1 text-[10px] font-bold uppercase tracking-wider ${light ? 'text-white/80' : 'text-slate-500'}`}>{label}</span>}</>}
            </div>
        </div>
    );
};

/** The coach speaks: one tip a day, chosen by the date so it is stable within a day. */
export const CoachTip = ({ name = '' }) => {
    const [day] = useState(() => Math.floor(Date.now() / 86_400_000)); const tip = TIPS[day % TIPS.length];
    return (
        <div className="flex items-start gap-3 animate-fade-in-up">
            <span className="iv-breathe flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200"><Bot size={22} /></span>
            <div className="relative rounded-2xl rounded-tl-sm border border-indigo-100 bg-indigo-50/70 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Your AI interviewer{name ? ` · tip for ${name}` : ''}</p>
                <p className="mt-0.5 text-sm text-slate-800">{tip}</p>
            </div>
        </div>
    );
};

/** Opens and closes smoothly (grid-rows trick), keeping the content in the tree. */
export const Collapse = ({ open, children }) => (
    <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }} aria-hidden={!open}>
        <div className={`min-h-0 overflow-hidden transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>{children}</div>
    </div>
);

/** A short burst of confetti over a good result. Positions come from the index, never from Math.random. */
const PIECES = Array.from({ length: 18 }, (_, i) => ({ left: (i * 53) % 100, delay: ((i * 37) % 10) / 10, color: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'][i % 5], size: 6 + (i % 3) * 3, spin: (i % 2 ? 1 : -1) * (180 + (i * 41) % 360) }));
export const Celebration = () => (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {PIECES.map((p, i) => <span key={i} className="iv-confetti absolute -top-3 rounded-sm" style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color, animationDelay: `${p.delay}s`, '--spin': `${p.spin}deg` }} />)}
    </div>
);

