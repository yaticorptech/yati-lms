import { useId } from 'react';
import '../artwork.css';

/**
 * 🚀 The rocket in the Today's Plan header.
 *
 * Original artwork from primitives. It climbs while there is work left and
 * bursts into confetti once the day is cleared, so the drawing reports the
 * same fact the ring beside it does rather than being pure decoration.
 */
export default function MissionArt({ cleared = false, className = '' }) {
  const uid = useId();
  const body = `ms-b-${uid}`;
  const flame = `ms-f-${uid}`;

  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden>
      <defs>
        <linearGradient id={body} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id={flame} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
      </defs>

      {/* Stars, always drifting. */}
      <g fill="#ffffff">
        <path className="yatiArt-twinkle" d="M34 34 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" opacity="0.85" />
        <path className="yatiArt-twinkle" d="M168 26 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" opacity="0.8" />
        <path className="yatiArt-twinkle" d="M158 108 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" opacity="0.7" />
        <path className="yatiArt-twinkle" d="M28 100 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z" opacity="0.6" />
      </g>

      {/* Confetti, only once the day is cleared. */}
      {cleared && (
        <g>
          <rect className="yatiArt-float-delay" x="52" y="46" width="10" height="10" rx="3" fill="#fbbf24" transform="rotate(20 57 51)" />
          <rect className="yatiArt-float-slow" x="140" y="52" width="9" height="9" rx="2.5" fill="#f472b6" transform="rotate(-18 144 56)" />
          <rect className="yatiArt-float" x="148" y="92" width="9" height="9" rx="2.5" fill="#34d399" transform="rotate(28 152 96)" />
          <rect className="yatiArt-float-delay" x="44" y="88" width="8" height="8" rx="2.5" fill="#60a5fa" transform="rotate(-24 48 92)" />
        </g>
      )}

      <g className="yatiArt-float">
        {/* Exhaust, only while there is still climbing to do. */}
        {!cleared && (
          <g className="yatiArt-bob">
            <path d="M92 118 l8 22 8 -22z" fill={`url(#${flame})`} />
            <path d="M96 118 l4 13 4 -13z" fill="#fde68a" />
          </g>
        )}

        {/* Fins, hull, window. */}
        <path d="M84 96 l-12 14 12 2z" fill="#a5b4fc" />
        <path d="M116 96 l12 14 -12 2z" fill="#a5b4fc" />
        <path d="M100 24 c14 12 20 30 20 48 v30 h-40 v-30 c0 -18 6 -36 20 -48z" fill={`url(#${body})`} />
        <circle cx="100" cy="62" r="11" fill="#4f46e5" />
        <circle cx="96" cy="58" r="3.5" fill="#c7d2fe" opacity="0.8" />
        <path d="M80 102 h40 v6 h-40z" fill="#c7d2fe" />

        {/* A tick on the hull once everything is done. */}
        {cleared && (
          <path
            d="M92 62 l5 6 11 -13"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}
