/**
 * A reminder's moment (2026-11-04): wherever the student is in the app, a pop-up with a clock — the event, its day and
 * time, and the way to its competition — and a notification from the browser too, if allowed. Shown once (the server
 * keeps that it was), for reminders due in the last day.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, ArrowRight, X } from 'lucide-react';
import Portal from '../components/Portal';
import { CHANGED, myEvents, whenOf } from './myEvents';

const DAY = 86400e3;
const fmt = (d) => d.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** A gold alarm clock, drawn, ringing (2026-11-04): it shakes, its hammer beats the bells, and rings spread out. */
const RING_CSS = `
@keyframes rp-shake { 0%,100% { transform: rotate(0) } 10% { transform: rotate(-9deg) } 20% { transform: rotate(9deg) } 30% { transform: rotate(-8deg) } 40% { transform: rotate(8deg) } 50% { transform: rotate(-5deg) } 60% { transform: rotate(5deg) } 70%,90% { transform: rotate(0) } }
@keyframes rp-hammer { 0%,100% { transform: rotate(-24deg) } 50% { transform: rotate(24deg) } }
@keyframes rp-bell { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
@keyframes rp-wave { 0% { opacity: .9; transform: scale(.6) } 100% { opacity: 0; transform: scale(1.35) } }
@keyframes rp-tick { from { transform: rotate(0) } to { transform: rotate(360deg) } }
.rp-shake { animation: rp-shake 1.1s ease-in-out infinite; transform-origin: 100px 128px; }
.rp-hammer { animation: rp-hammer .12s linear infinite; transform-origin: 100px 46px; }
.rp-bell { animation: rp-bell .12s linear infinite; }
.rp-wave { animation: rp-wave 1.1s ease-out infinite; transform-box: fill-box; transform-origin: center; }
.rp-wave.d2 { animation-delay: .35s; } .rp-wave.d3 { animation-delay: .7s; }
.rp-sec { animation: rp-tick 2s steps(12) infinite; transform-origin: 100px 128px; }
@media (prefers-reduced-motion: reduce) { .rp-shake, .rp-hammer, .rp-bell, .rp-wave, .rp-sec { animation: none; } }
`;
const RingingClock = () => (
    <svg viewBox="0 0 200 220" className="mx-auto h-48 w-48 drop-shadow-[0_24px_28px_rgba(180,83,9,.45)]" aria-hidden="true" data-ringing-clock>
        <style>{RING_CSS}</style>
        <defs>
            <linearGradient id="rp-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset=".45" stopColor="#f5b53f" /><stop offset="1" stopColor="#b45309" /></linearGradient>
            <linearGradient id="rp-gold2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3c4" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#92400e" /></linearGradient>
            <radialGradient id="rp-face" cx="45%" cy="38%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset=".8" stopColor="#f5f1e8" /><stop offset="1" stopColor="#ddd3bf" /></radialGradient>
        </defs>
        {/* The rings, both sides. */}
        {['', 'd2', 'd3'].map((d) => (
            <g key={d} stroke="#f59e0b" strokeWidth="5" fill="none" strokeLinecap="round">
                <path className={`rp-wave ${d}`} d="M30 70 Q14 92 22 118" />
                <path className={`rp-wave ${d}`} d="M170 70 Q186 92 178 118" />
            </g>
        ))}
        <ellipse cx="100" cy="208" rx="58" ry="7" fill="#000" opacity=".18" />
        <g className="rp-shake">
            {/* Legs. */}
            <path d="M58 178 L44 202" stroke="url(#rp-gold)" strokeWidth="11" strokeLinecap="round" />
            <path d="M142 178 L156 202" stroke="url(#rp-gold)" strokeWidth="11" strokeLinecap="round" />
            {/* The bells and their hammer. */}
            <g className="rp-bell"><path d="M38 64 A34 34 0 0 1 86 36 Z" fill="url(#rp-gold2)" stroke="#92400e" strokeWidth="2" /><circle cx="56" cy="44" r="4" fill="#fff7d6" opacity=".8" /></g>
            <g className="rp-bell"><path d="M162 64 A34 34 0 0 0 114 36 Z" fill="url(#rp-gold2)" stroke="#92400e" strokeWidth="2" /><circle cx="144" cy="44" r="4" fill="#fff7d6" opacity=".8" /></g>
            <rect x="96" y="30" width="8" height="18" rx="3" fill="url(#rp-gold)" />
            <g className="rp-hammer"><rect x="98" y="14" width="4" height="34" rx="2" fill="#92400e" /><circle cx="100" cy="14" r="7" fill="url(#rp-gold)" stroke="#92400e" strokeWidth="1.5" /></g>
            {/* The body and face. */}
            <circle cx="100" cy="128" r="70" fill="url(#rp-gold)" stroke="#92400e" strokeWidth="2.5" />
            <circle cx="100" cy="128" r="70" fill="none" stroke="#fff7d6" strokeWidth="3" opacity=".5" strokeDasharray="70 400" transform="rotate(-140 100 128)" />
            <circle cx="100" cy="128" r="56" fill="url(#rp-face)" stroke="#b45309" strokeWidth="3" />
            {Array.from({ length: 12 }, (_, i) => (
                <line key={i} x1="100" y1="78" x2="100" y2={i % 3 ? 84 : 88} stroke="#1f2937" strokeWidth={i % 3 ? 2 : 3.5} strokeLinecap="round" transform={`rotate(${i * 30} 100 128)`} />
            ))}
            <line x1="100" y1="128" x2="100" y2="96" stroke="#111827" strokeWidth="5" strokeLinecap="round" />
            <line x1="100" y1="128" x2="124" y2="140" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
            <g className="rp-sec"><line x1="100" y1="136" x2="100" y2="84" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" /></g>
            <circle cx="100" cy="128" r="5" fill="#b45309" stroke="#fff" strokeWidth="1.5" />
            <ellipse cx="78" cy="98" rx="20" ry="9" fill="#fff" opacity=".55" transform="rotate(-30 78 98)" />
        </g>
    </svg>
);

export default function ReminderPopup() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [due, setDue] = useState(null);
    const shown = useRef(new Set());
    const load = useCallback(() => { if (document.visibilityState !== 'hidden') myEvents.list().then(setEvents).catch(() => {}); }, []);
    useEffect(() => {
        load();
        const t = setInterval(load, 120000);
        window.addEventListener(CHANGED, load);
        document.addEventListener('visibilitychange', load);
        return () => { clearInterval(t); window.removeEventListener(CHANGED, load); document.removeEventListener('visibilitychange', load); };
    }, [load]);
    // Every 15 seconds: the first reminder now due, not yet shown.
    useEffect(() => {
        const look = () => {
            if (due) return;
            const now = Date.now();
            const next = events.find((e) => e.remindAt && !e.reminderShownAt && !shown.current.has(e._id) && new Date(e.remindAt).getTime() <= now && now - new Date(e.remindAt).getTime() < DAY);
            if (!next) return;
            shown.current.add(next._id);
            setDue({ ...next, soon: whenOf(next.date, next.time).getTime() > now });
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                try { new Notification(`Reminder: ${next.title}`, { body: fmt(whenOf(next.date, next.time)), tag: `reminder-${next._id}` }); } catch { /* not supported */ }
            }
        };
        look();
        const t = setInterval(look, 15000);
        return () => clearInterval(t);
    }, [events, due]);
    if (!due) return null;
    const close = () => { myEvents.reminded(due._id); setDue(null); };
    const open = () => { const to = due.link; close(); if (to) navigate(to); };
    const at = whenOf(due.date, due.time);
    return (
        <Portal>
            <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="reminder-title" data-reminder-popup>
                <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-gradient-to-b from-[#fff8eb] to-white text-center shadow-[0_40px_80px_-24px_rgba(0,0,0,.6)] ring-1 ring-amber-200">
                    <button type="button" onClick={close} aria-label="Close" className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-white"><X size={18} /></button>
                    <div className="relative bg-[radial-gradient(60%_70%_at_50%_45%,#ffe7b0,transparent_72%)] px-6 pt-6">
                        <RingingClock />
                    </div>
                    <div className="px-6 pt-4 pb-6">
                        <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-black tracking-wide text-amber-800 uppercase"><AlarmClock size={14} /> Reminder</p>
                        <h2 id="reminder-title" className="mt-3 text-xl font-black text-slate-900">{due.title}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{due.soon ? 'Coming up' : 'Now'} · {fmt(at)}</p>
                        {due.notes && <p className="mt-2 text-sm text-slate-500">{due.notes}</p>}
                        <div className="mt-5 flex gap-2">
                            <button type="button" onClick={close} className="flex-1 rounded-xl py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">Dismiss</button>
                            {due.link && <button type="button" onClick={open} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#8b5cf6] to-[#6d28d9] py-3 text-sm font-black text-white shadow-md">Open <ArrowRight size={15} /></button>}
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
