import { useId } from 'react';
import '../artwork.css';

/**
 * 🏅 The medal scene in the Rewards header.
 *
 * Original artwork from primitives — a starburst, a ribboned medal and loose
 * confetti. The medal rises and settles, the burst turns slowly behind it and
 * the confetti twinkles, so the page opens with the thing it is about moving.
 */
export default function RewardsArt({ className = '' }) {
  const uid = useId();
  const gold = `rw-gold-${uid}`;
  const inner = `rw-in-${uid}`;
  const ribbon = `rw-rb-${uid}`;

  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={inner} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff6d8" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id={ribbon} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d4dff" />
        </linearGradient>
      </defs>

      {/* Rays behind everything, turning slowly. */}
      <g className="yatiArt-sway" style={{ transformBox: 'view-box', transformOrigin: '120px 82px' }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <rect
            key={a}
            x="117"
            y="20"
            width="6"
            height="20"
            rx="3"
            fill="#ffffff"
            opacity="0.28"
            transform={`rotate(${a} 120 82)`}
          />
        ))}
      </g>

      <g className="yatiArt-float">
        {/* Ribbon tails, drawn under the medal. */}
        <path d="M104 96 l-20 46 22 -8 10 18 16 -44z" fill={`url(#${ribbon})`} />
        <path d="M136 96 l20 46 -22 -8 -10 18 -16 -44z" fill="#8b6cff" />

        {/* Medal. */}
        <circle cx="120" cy="82" r="34" fill={`url(#${gold})`} />
        <circle cx="120" cy="82" r="25" fill={`url(#${inner})`} />
        <path
          d="M120 66 l5.2 10.6 11.8 1.7 -8.5 8.3 2 11.7 -10.5 -5.5 -10.5 5.5 2 -11.7 -8.5 -8.3 11.8 -1.7z"
          fill="#b45309"
        />
        <path d="M104 62 a22 22 0 0 1 14 -8 a26 26 0 0 0 -18 14z" fill="#fffaf0" opacity="0.7" />
      </g>

      {/* Confetti, on staggered cycles. */}
      <g>
        <rect className="yatiArt-float-delay" x="42" y="42" width="11" height="11" rx="3" fill="#60a5fa" opacity="0.8" transform="rotate(20 47 47)" />
        <rect className="yatiArt-float-slow" x="188" y="34" width="10" height="10" rx="3" fill="#f472b6" opacity="0.8" transform="rotate(-18 193 39)" />
        <rect className="yatiArt-float" x="200" y="112" width="9" height="9" rx="2.5" fill="#34d399" opacity="0.8" transform="rotate(28 204 116)" />
        <rect className="yatiArt-float-delay" x="30" y="112" width="9" height="9" rx="2.5" fill="#fbbf24" opacity="0.85" transform="rotate(-26 34 116)" />
        <g fill="#ffffff">
          <path className="yatiArt-twinkle" d="M64 22 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" />
          <path className="yatiArt-twinkle" d="M176 96 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" />
          <path className="yatiArt-twinkle" d="M58 92 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" />
        </g>
      </g>
    </svg>
  );
}
