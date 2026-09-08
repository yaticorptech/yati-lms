/**
 * The moment the podium shows a winner: confetti bursts in from both sides
 * of the card over the podium's own headline. Plays once per winner per
 * session, so a returning visit is not a party every time.
 *
 * Scoped to the card (absolute, not fixed): it is the leaderboard
 * celebrating, not the whole page.
 */
import { useEffect, useState } from 'react';

const COLORS = ['#f43f5e', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#6366f1', '#a855f7', '#ec4899', '#fbbf24'];

// Pieces are dealt after mount, never during render, so React's purity
// rules hold and StrictMode's double render cannot change the pattern.
const deal = (count) => Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const round = Math.random() < 0.3;
    return {
        id: i,
        side: fromLeft ? 'left' : 'right',
        top: 5 + Math.random() * 40,                         // where on the edge it launches from
        size: 6 + Math.random() * 8,
        round,
        color: COLORS[i % COLORS.length],
        dx: (fromLeft ? 1 : -1) * (80 + Math.random() * 260), // how far it flies across
        dy: 120 + Math.random() * 220,                       // how far it falls
        rise: -(20 + Math.random() * 90),                    // the arc's peak
        spin: (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540),
        dur: 1.8 + Math.random() * 1.4,
        delay: Math.random() * 0.5
    };
});

export default function LeaderboardCelebration({ onDone }) {
    const [pieces, setPieces] = useState([]);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setPieces(deal(70)));
        const timer = setTimeout(onDone, 4500);
        return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
    }, [onDone]);

    return (
        <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-3xl" aria-hidden="true">
            {pieces.map((p) => (
                <span
                    key={p.id}
                    className="lb-confetti"
                    style={{
                        [p.side]: -6, top: `${p.top}%`, width: p.size, height: p.round ? p.size : p.size * 0.55,
                        background: p.color, borderRadius: p.round ? '50%' : 2,
                        '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, '--rise': `${p.rise}px`, '--spin': `${p.spin}deg`,
                        animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`
                    }}
                />
            ))}
        </div>
    );
}
