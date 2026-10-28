/** Party poppers: a burst of confetti over the page, for a few seconds. */
const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#3b82f6', '#f97316'];
const CSS = '@keyframes cf-fall{0%{transform:translate3d(0,-10vh,0) rotate(0)}100%{transform:translate3d(var(--dx),110vh,0) rotate(var(--r))}}';

export default function Confetti({ pieces = 90 }) {
    return (
        <div className="pointer-events-none fixed inset-0 z-[310] overflow-hidden" aria-hidden="true" data-confetti>
            <style>{CSS}</style>
            {Array.from({ length: pieces }, (_, i) => (
                <span key={i} className="absolute top-0 block rounded-[2px]"
                    style={{ left: `${(i * 37) % 100}%`, width: 6 + (i % 4) * 2, height: 10 + (i % 3) * 3, background: COLORS[i % COLORS.length], '--dx': `${((i * 53) % 40) - 20}vw`, '--r': `${(i % 2 ? 1 : -1) * (360 + (i % 5) * 180)}deg`, animation: `cf-fall ${2.6 + (i % 7) * 0.35}s cubic-bezier(.2,.6,.4,1) ${(i % 10) * 0.08}s 2 both` }} />
            ))}
        </div>
    );
}
