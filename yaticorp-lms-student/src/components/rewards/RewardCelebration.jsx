/**
 * The reward moments: a quiet toast for XP, a full-screen card with confetti
 * for milestones, badges, levels and payouts. Styled in the LMS's own
 * slate/indigo language (not the Career Path palette) so it fits wherever it
 * appears — the course player, the profile, the dashboard.
 */
import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';

const PALETTE = ['#6366f1', '#a855f7', '#f59e0b', '#10b981', '#f43f5e', '#0ea5e9'];

const buildPieces = (count) => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 2.6 + Math.random() * 1.8,
    drift: (Math.random() - 0.5) * 160,
    spin: (Math.random() - 0.5) * 900,
    size: 6 + Math.random() * 6,
    color: PALETTE[i % PALETTE.length],
    round: Math.random() > 0.6
}));

export const Confetti = ({ count = 60 }) => {
    // Randomness belongs outside render: the pieces are dealt in a frame
    // callback once the overlay is on screen.
    const [pieces, setPieces] = useState([]);
    useEffect(() => {
        const id = requestAnimationFrame(() => setPieces(buildPieces(count)));
        return () => cancelAnimationFrame(id);
    }, [count]);
    return (
        <div className="rw-confetti pointer-events-none fixed inset-0 z-[210] overflow-hidden" aria-hidden="true">
            {pieces.map((p) => (
                <span
                    key={p.id}
                    className="rw-confetti-piece"
                    style={{
                        left: `${p.left}%`, width: p.size, height: p.size * (p.round ? 1 : 0.6), background: p.color,
                        borderRadius: p.round ? '50%' : 2,
                        '--rw-drift': `${p.drift}px`, '--rw-spin': `${p.spin}deg`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`
                    }}
                />
            ))}
        </div>
    );
};

const LOOK = {
    streak_milestone: { emoji: '🔥', ring: 'from-orange-400 to-rose-500', chip: 'bg-orange-50 text-orange-700 ring-orange-200' },
    badge: { emoji: '🎖️', ring: 'from-violet-500 to-fuchsia-500', chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
    level_up: { emoji: '⭐', ring: 'from-amber-400 to-orange-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
    leaderboard_reward: { emoji: '🏆', ring: 'from-yellow-400 to-amber-500', chip: 'bg-yellow-50 text-yellow-800 ring-yellow-200' },
    wallet: { emoji: '💰', ring: 'from-emerald-400 to-teal-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    reward_points: { emoji: '🎁', ring: 'from-pink-400 to-rose-500', chip: 'bg-pink-50 text-pink-700 ring-pink-200' },
    xp: { emoji: '✨', ring: 'from-indigo-400 to-violet-500', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200' }
};

const money = (n, c = 'INR') => `${c === 'INR' ? '₹' : `${c} `}${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const CelebrationOverlay = ({ event, onClose, remaining = 0 }) => {
    const look = LOOK[event.kind] || LOOK.xp;
    const p = event.payload || {};
    const emoji = p.emoji || look.emoji;
    const [leaving, setLeaving] = useState(false);
    const close = () => { setLeaving(true); setTimeout(onClose, 180); };

    useEffect(() => {
        const t = setTimeout(close, 7000);
        const onKey = (e) => e.key === 'Escape' && close();
        window.addEventListener('keydown', onKey);
        return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const chips = [];
    if (p.rewardPoints > 0) chips.push({ text: `+${p.rewardPoints.toLocaleString()} Reward Points`, cls: 'bg-pink-50 text-pink-700 ring-pink-200' });
    if (p.xp > 0) chips.push({ text: `+${p.xp} XP`, cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' });
    if (p.value > 0 && event.kind !== 'wallet') chips.push({ text: `≈ ${money(p.value, p.currency)} eligible value`, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' });
    if (event.kind === 'wallet' && p.amount > 0) chips.push({ text: `+${money(p.amount, p.currency)}`, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' });
    if (event.kind === 'level_up' && p.level) chips.push({ text: `Level ${p.level}`, cls: look.chip });
    if (event.kind === 'leaderboard_reward' && p.rank) chips.push({ text: `Rank #${p.rank}`, cls: look.chip });

    return (
        <div className={`fixed inset-0 z-[205] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm ${leaving ? 'rw-fade-out' : 'animate-fade-in'}`} onClick={close} role="dialog" aria-modal="true" aria-label={event.title}>
            <Confetti count={event.kind === 'xp' ? 20 : 70} />
            <div className={`relative w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl ${leaving ? '' : 'rw-pop'}`} onClick={(e) => e.stopPropagation()}>
                <button onClick={close} className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Close"><X size={16} /></button>
                <div className={`rw-burst mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${look.ring} text-5xl shadow-lg`} aria-hidden="true">{emoji}</div>
                <p className="mt-5 text-2xl font-black tracking-tight text-slate-900">{event.title}</p>
                {event.message && <p className="mt-1 text-sm text-slate-500">{event.message}</p>}
                {chips.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {chips.map((c, i) => (
                            <span key={i} className={`rw-rise inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold ring-1 ${c.cls}`} style={{ animationDelay: `${0.2 + i * 0.12}s` }}>{c.text}</span>
                        ))}
                    </div>
                )}
                <button onClick={close} className="mt-6 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white transition-colors hover:bg-indigo-700">
                    {remaining > 0 ? `Next (${remaining} more)` : 'Keep learning'}
                </button>
            </div>
        </div>
    );
};

export const RewardToast = ({ text, onClose }) => (
    <div className="fixed bottom-24 right-4 z-[200] animate-fade-in sm:bottom-6 sm:right-6" role="status">
        <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><Sparkles size={18} /></span>
            <p className="text-sm font-bold text-slate-800">{text}</p>
            <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600" aria-label="Dismiss"><X size={14} /></button>
        </div>
    </div>
);
