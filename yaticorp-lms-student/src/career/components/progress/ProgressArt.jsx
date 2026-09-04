import { useId } from 'react';
import '../artwork.css';

/**
 * 🏆 The trophy scene in the My Progress header.
 *
 * Original artwork from primitives — a cup on its podium, a ringed planet, a
 * potted sprout and some drifting confetti. The cup rides slowly up and down,
 * the planet drifts, the sprout sways and the confetti twinkles. Purely decorative: every number on
 * this page is stated in text beside it, so the drawing carries no information
 * a screen reader would miss.
 */
export default function ProgressArt({ className = '' }) {
  const uid = useId();
  const gold = `gold-${uid}`;
  const podium = `pod-${uid}`;
  const planet = `pl-${uid}`;
  const pot = `pot-${uid}`;

  return (
    <svg viewBox="0 0 260 180" className={className} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd76e" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={podium} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d4dff" />
        </linearGradient>
        <linearGradient id={planet} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c5cff" />
        </linearGradient>
        <linearGradient id={pot} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      {/* Ringed planet, upper left of the cup. */}
      <g className="yatiArt-float-slow">
        <circle cx="46" cy="40" r="20" fill={`url(#${planet})`} />
        <ellipse cx="46" cy="40" rx="32" ry="8" fill="none" stroke="#ddd6fe" strokeWidth="4" transform="rotate(-20 46 40)" />
      </g>
      <circle className="yatiArt-float-delay" cx="228" cy="34" r="10" fill="#8b5cf6" opacity="0.55" />

      {/* Scattered gems and cubes, drifting on staggered cycles — the loose
          confetti the reference scene has around the podium. */}
      <g>
        <rect className="yatiArt-float-delay" x="60" y="62" width="11" height="11" rx="3" fill="#60a5fa" opacity="0.75" transform="rotate(22 65 67)" />
        <rect className="yatiArt-float-slow" x="196" y="30" width="9" height="9" rx="2.5" fill="#f472b6" opacity="0.7" transform="rotate(-16 200 34)" />
        <rect className="yatiArt-float" x="240" y="96" width="10" height="10" rx="3" fill="#34d399" opacity="0.7" transform="rotate(30 245 101)" />
        <rect className="yatiArt-float-delay" x="46" y="118" width="9" height="9" rx="2.5" fill="#fbbf24" opacity="0.75" transform="rotate(-24 50 122)" />
        <circle className="yatiArt-float-slow" cx="188" cy="112" r="5" fill="#c4b5fd" opacity="0.8" />
        <circle className="yatiArt-float" cx="84" cy="40" r="4" fill="#93c5fd" opacity="0.7" />
      </g>

      {/* Confetti. */}
      <g fill="#ffffff">
        <rect className="yatiArt-twinkle" x="92" y="24" width="7" height="7" rx="2" opacity="0.5" transform="rotate(24 95 27)" />
        <rect className="yatiArt-twinkle" x="176" y="52" width="6" height="6" rx="2" opacity="0.45" transform="rotate(-18 179 55)" />
        <rect className="yatiArt-twinkle" x="72" y="92" width="6" height="6" rx="2" opacity="0.4" transform="rotate(35 75 95)" />
        <path className="yatiArt-twinkle" d="M204 96 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" opacity="0.7" />
        <path className="yatiArt-twinkle" d="M118 46 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" opacity="0.6" />
      </g>

      {/* Trophy: handles behind, then cup, stem and base. */}
      <g className="yatiArt-float">
        <path d="M96 62 a17 17 0 0 0 0 30" fill="none" stroke={`url(#${gold})`} strokeWidth="8" strokeLinecap="round" />
        <path d="M164 62 a17 17 0 0 1 0 30" fill="none" stroke={`url(#${gold})`} strokeWidth="8" strokeLinecap="round" />
        <path d="M98 50 h64 v22 a32 32 0 0 1 -64 0z" fill={`url(#${gold})`} />
        <rect x="122" y="104" width="16" height="16" rx="4" fill="#e08c07" />
        <rect x="106" y="118" width="48" height="10" rx="5" fill={`url(#${gold})`} />
        <path d="M124 62 a10 10 0 0 0 8 12" fill="none" stroke="#fff5d6" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
      </g>

      {/* Podium the cup stands on. */}
      <rect x="82" y="128" width="96" height="30" rx="8" fill={`url(#${podium})`} />
      <rect x="82" y="128" width="96" height="8" rx="4" fill="#ffffff" opacity="0.25" />

      {/* Potted sprout at the right. */}
      <g>
        <g className="yatiArt-sway" style={{ transformBox: 'view-box', transformOrigin: '214px 136px' }}>
        <path d="M214 132 c-14 -6 -16 -22 -4 -28 c8 -4 16 6 12 16z" fill="#34d399" />
        <path d="M216 132 c12 -8 12 -24 0 -28 c-8 -3 -14 8 -8 17z" fill="#10b981" />
        </g>
        <path d="M202 138 h30 l-4 20 h-22z" fill={`url(#${pot})`} />
      </g>
    </svg>
  );
}
