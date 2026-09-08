/**
 * The podium: a pastel stage with confetti drifting down it, a crown and a
 * script "Congratulations!" over the top three, medal rosettes on each card,
 * laurels and a crown for the winner, and a gold, silver and bronze base
 * under each. Everything moves a little, all the time — the confetti
 * drifts, the sparkles twinkle, the crown bobs — and the winner's arrival
 * adds the burst from LeaderboardCelebration on top.
 */
import { useEffect, useState } from 'react';
import { num } from './format';

const initials = (name = '') => name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
export const Avatar = ({ e, size = 'h-9 w-9', ring = '' }) => e.profilePicture
    ? <img src={e.profilePicture} alt="" className={`${size} shrink-0 rounded-full object-cover ${ring}`} />
    : <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-600 ${ring}`}>{initials(e.name)}</span>;

const COLORS = ['#f43f5e', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#fbbf24', '#3b82f6'];

/** Confetti that never stops: each piece falls, sways and spins, then starts over at the top. */
const deal = (count) => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: 7 + Math.random() * 10,
    tall: Math.random() < 0.6,
    color: COLORS[i % COLORS.length],
    dur: 7 + Math.random() * 7,
    delay: -Math.random() * 14,          // negative: the sky is already full on first paint
    sway: (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 50),
    spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 360),
    blur: Math.random() < 0.3
}));

const AmbientConfetti = ({ count = 20 }) => {
    const [pieces, setPieces] = useState([]);
    useEffect(() => { const t = setTimeout(() => setPieces(deal(count)), 0); return () => clearTimeout(t); }, [count]);
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {pieces.map((p) => (
                <span key={p.id} className="lb-drift" style={{
                    left: `${p.left}%`, width: p.size * (p.tall ? 0.55 : 1), height: p.size, background: p.color, borderRadius: 3,
                    filter: p.blur ? 'blur(1.5px)' : 'none', opacity: p.blur ? 0.55 : 0.9,
                    '--sway': `${p.sway}px`, '--spin': `${p.spin}deg`, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`
                }} />
            ))}
        </div>
    );
};

const MEDAL = {
    1: { ring: 'from-amber-300 via-yellow-400 to-amber-500', text: 'text-amber-900', ribbon: 'bg-amber-400', card: 'lb-glass-gold border-amber-200', base: 'lb-base-gold', baseH: 'h-3.5 sm:h-4', lift: 'sm:-translate-y-1.5', xp: 'text-amber-700', avatarRing: 'ring-amber-300' },
    2: { ring: 'from-slate-200 via-slate-300 to-slate-400', text: 'text-slate-700', ribbon: 'bg-slate-300', card: 'lb-glass-silver border-slate-200', base: 'lb-base-silver', baseH: 'h-2.5 sm:h-3', lift: '', xp: 'text-slate-800', avatarRing: 'ring-slate-300' },
    3: { ring: 'from-orange-200 via-orange-300 to-orange-500', text: 'text-orange-900', ribbon: 'bg-orange-400', card: 'lb-glass-bronze border-orange-200', base: 'lb-base-bronze', baseH: 'h-2', lift: '', xp: 'text-orange-800', avatarRing: 'ring-orange-300' }
};

/** A rosette: the numbered disc over two ribbon tails. */
const Medal = ({ rank }) => {
    const m = MEDAL[rank];
    return (
        <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <span className={`absolute left-1/2 top-2.5 h-4 w-2 -translate-x-[6px] rotate-[18deg] rounded-sm ${m.ribbon}`} />
            <span className={`absolute left-1/2 top-2.5 h-4 w-2 translate-x-[2px] -rotate-[18deg] rounded-sm ${m.ribbon}`} />
            <span className={`relative flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${m.ring} text-[11px] font-black ${m.text} shadow-md ring-2 ring-white`}>{rank}</span>
        </span>
    );
};

const Sparkles = () => (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[['left-[6%]', 'top-[22%]', 'bg-amber-400', '-rotate-45', '0s'], ['left-[10%]', 'top-[40%]', 'bg-rose-400', 'rotate-[20deg]', '0.4s'], ['right-[8%]', 'top-[20%]', 'bg-orange-400', 'rotate-45', '0.2s'], ['right-[12%]', 'top-[42%]', 'bg-violet-400', '-rotate-[20deg]', '0.6s'], ['left-[18%]', 'top-[8%]', 'bg-violet-300', 'rotate-[70deg]', '0.8s'], ['right-[20%]', 'top-[6%]', 'bg-amber-300', '-rotate-[70deg]', '1s']].map(([x, y, c, r, d]) => (
            <span key={x + y} className={`lb-twinkle absolute ${x} ${y} h-1.5 w-6 rounded-full ${c} ${r}`} style={{ animationDelay: d }} />
        ))}
        {['left-[3%] top-[55%]', 'right-[4%] top-[60%]', 'left-[46%] top-[2%]', 'right-[30%] top-[70%]', 'left-[28%] top-[75%]'].map((pos, i) => (
            <span key={pos} className={`lb-twinkle absolute ${pos} text-lg text-amber-300`} style={{ animationDelay: `${i * 0.35}s` }}>✦</span>
        ))}
    </span>
);

export default function LeaderboardPodium({ podium }) {
    const order = [podium[1], podium[0], podium[2]];
    return (
        <div className="lb-stage relative overflow-hidden rounded-2xl px-2.5 pb-2.5 pt-2.5 sm:px-3 sm:pt-3">
            <AmbientConfetti />
            <Sparkles />

            {/* Headline */}
            {/* The crown sits on top of the word, tilted, like it was set down on it. */}
            <div className="relative flex justify-center text-center">
                <div className="relative inline-block pt-3">
                    <span className="lb-crown absolute left-1/2 top-0 z-10 text-lg drop-shadow" aria-hidden="true">👑</span>
                    <p className="lb-script bg-gradient-to-r from-violet-600 via-indigo-500 to-rose-500 bg-clip-text text-xl text-transparent sm:text-2xl">Congratulations!</p>
                </div>
            </div>

            {/* Podium */}
            <div className="stagger relative mt-6 grid grid-cols-3 items-end gap-2 sm:mt-7 sm:gap-3">
                {order.map((e, i) => {
                    if (!e) return <div key={`empty-${i}`} />;
                    const m = MEDAL[e.rank];
                    const win = e.rank === 1;
                    return (
                        <div key={e.userId} className={`flex flex-col items-center ${m.lift}`}>
                            <div className={`relative w-full rounded-xl border p-2 pt-5 text-center shadow-md ${m.card} ${e.isMe ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}>
                                {win
                                    ? <span className="lb-bob absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-[62%] text-xl drop-shadow-md sm:text-2xl" aria-hidden="true">👑</span>
                                    : <Medal rank={e.rank} />}
                                <div className="relative flex items-center justify-center">
                                    <Avatar e={e} size={win ? 'h-12 w-12 sm:h-14 sm:w-14' : 'h-10 w-10 sm:h-12 sm:w-12'} ring={`ring-[3px] ${m.avatarRing}`} />
                                </div>
                                <p className="mt-1 truncate text-xs font-bold text-slate-900 sm:text-sm">{e.isMe ? 'You' : e.name}</p>
                                <p className={`font-black tabular-nums leading-tight ${m.xp} ${win ? 'text-base' : 'text-sm'}`}>{num(e.xp)} XP</p>
                                <p className="text-[11px] font-bold text-orange-500">🔥 {e.streak} days</p>
                            </div>
                            <div className={`w-[92%] rounded-b-xl rounded-t-md ${m.base} ${m.baseH} shadow-inner`} aria-hidden="true" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
