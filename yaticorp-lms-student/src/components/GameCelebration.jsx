import { useEffect, useId } from 'react';
import { Trophy, Star, X, ChevronRight, Zap } from 'lucide-react';
import Portal from './Portal';
import { Confetti } from './rewards/RewardCelebration';
import useBackClose from '../native/useBackClose';

// Where the sparkles sit around the screen, and when each one twinkles.
// Fixed rather than random, so a re-render never moves them.
const SPARKS = [
    ['8%', '16%', '0s', 20], ['86%', '12%', '-0.8s', 14], ['14%', '70%', '-1.4s', 14], ['90%', '62%', '-0.4s', 20],
    ['52%', '6%', '-1.9s', 12], ['26%', '88%', '-1.1s', 18], ['74%', '84%', '-0.6s', 12], ['4%', '42%', '-1.6s', 12], ['95%', '36%', '-1s', 16]
];

/**
 * The full-screen moment at the end of a game won: a level cleared in Brain
 * Boosters (GameShell), a match won in Games & Competitions (GamePage).
 *
 * The whole screen goes to night sky with light rays turning behind a gold
 * trophy, the level's stars pop in one by one, confetti falls, and the next
 * step is the big button, so carrying on is still one tap: it takes the
 * student straight on, and the result card behind is there when they close
 * it instead (the ×, Close, a tap on the sky, Escape or Android's back).
 *
 * `stars` (0–3) draws the stars row when given, `xp` the XP pill once the
 * server has paid it, `primary` ({ label, onClick }) the big button.
 */
export default function GameCelebration({ eyebrow = 'Level complete', title, subtitle, detail, stars = null, xp = null, primary = null, onClose }) {
    const titleId = useId();
    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    useBackClose(onClose);

    return (
        <Portal>
            <div role="dialog" aria-modal="true" aria-labelledby={titleId} data-game-celebration
                className="gc-in fixed inset-0 z-[190] flex items-center justify-center overflow-hidden px-6">
                {/* The sky. A tap on it closes. */}
                <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose}
                    className="absolute inset-0 cursor-default bg-[radial-gradient(ellipse_at_50%_36%,#6d28d9_0%,#3730a3_38%,#1e1b4b_70%,#0b1026_100%)]" />
                <div aria-hidden="true" className="gc-rays pointer-events-none" />
                <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[34%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/25 blur-3xl" />
                {SPARKS.map(([left, top, delay, size], i) => (
                    <span key={i} aria-hidden="true" className="gc-twinkle pointer-events-none absolute text-amber-200" style={{ left, top, animationDelay: delay, fontSize: size }}>✦</span>
                ))}
                <Confetti count={110} />

                <button type="button" onClick={onClose} aria-label="Close"
                    className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/20 hover:text-white">
                    <X size={20} />
                </button>

                {/* Everything but the buttons lets a tap through to the sky. */}
                <div className="pointer-events-none relative w-full max-w-md text-center">
                    <p className="gc-rise inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-amber-200 ring-1 ring-white/20 backdrop-blur">
                        <Trophy size={13} aria-hidden="true" /> {eyebrow}
                    </p>

                    <div className="relative mx-auto mt-7 h-32 w-32 sm:h-36 sm:w-36">
                        <span aria-hidden="true" className="gc-halo absolute -inset-4 rounded-full bg-amber-300/40 blur-md" />
                        <span className="gc-medal gc-shine relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 shadow-[0_24px_70px_-12px_rgba(251,191,36,0.75)] ring-4 ring-white/70">
                            <Trophy className="h-14 w-14 text-white drop-shadow-[0_2px_6px_rgba(180,83,9,0.6)] sm:h-16 sm:w-16" strokeWidth={2.2} aria-hidden="true" />
                        </span>
                    </div>

                    {stars !== null && (
                        <div className="mt-6 flex items-end justify-center gap-3" role="img" aria-label={`${stars} of 3 stars`}>
                            {[1, 2, 3].map((n) => (
                                <Star key={n} aria-hidden="true"
                                    className={`gc-star ${n === 2 ? 'h-14 w-14 -translate-y-2' : 'h-11 w-11'} ${n <= stars ? 'fill-amber-300 text-amber-300 drop-shadow-[0_0_14px_rgba(252,211,77,0.75)]' : 'fill-white/10 text-white/25'}`}
                                    style={{ animationDelay: `${0.45 + n * 0.18}s` }} />
                            ))}
                        </div>
                    )}

                    <h2 id={titleId} className="gc-rise mt-5 text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)] sm:text-5xl" style={{ animationDelay: '0.55s' }}>
                        {title}
                    </h2>
                    {(subtitle || detail) && (
                        <p className="gc-rise mt-2 text-base font-semibold text-indigo-100" style={{ animationDelay: '0.65s' }}>
                            {subtitle}{subtitle && detail ? ' · ' : ''}{detail}
                        </p>
                    )}
                    {xp > 0 && (
                        <p className="gc-rise mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-sm font-black text-amber-950 shadow-lg shadow-amber-500/30">
                            <Zap size={15} aria-hidden="true" /> +{xp} XP
                        </p>
                    )}

                    <div className="gc-rise pointer-events-auto mt-8 flex flex-col items-center gap-3" style={{ animationDelay: '0.8s' }}>
                        {primary && (
                            <button type="button" onClick={primary.onClick} autoFocus
                                className="gc-shine relative inline-flex min-h-14 w-full max-w-xs items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-8 text-lg font-black text-indigo-700 shadow-xl shadow-indigo-950/40 transition-transform hover:scale-[1.03] active:scale-95">
                                {primary.label} <ChevronRight size={20} aria-hidden="true" />
                            </button>
                        )}
                        <button type="button" onClick={onClose} autoFocus={!primary}
                            className="rounded-xl px-5 py-2 text-sm font-bold text-white/75 transition-colors hover:text-white">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
}
