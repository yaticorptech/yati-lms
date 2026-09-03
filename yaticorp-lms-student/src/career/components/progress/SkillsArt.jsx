import { useId } from 'react';
import '../artwork.css';

/**
 * 💻 A student at a laptop with their work floating around them.
 *
 * Original artwork from primitives, drawn to match the reference: dark hair,
 * purple hoodie, a laptop, a code window and a bar chart. The forearms tap
 * while the panels drift, so the drawing reads as work in progress — which is
 * exactly what the skill bars beside it are measuring.
 *
 * Decorative only: every figure it illustrates is stated in text next to it,
 * so it is hidden from screen readers rather than described.
 */
export default function SkillsArt({ className = '' }) {
  const uid = useId();
  const screen = `scr-${uid}`;
  const hoodie = `hd-${uid}`;
  const lid = `lid-${uid}`;

  return (
    <svg viewBox="0 0 220 180" className={className} aria-hidden>
      <defs>
        <linearGradient id={screen} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef1ff" />
        </linearGradient>
        <linearGradient id={hoodie} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b6cff" />
          <stop offset="100%" stopColor="#5b34d6" />
        </linearGradient>
        <linearGradient id={lid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e6ebfd" />
          <stop offset="100%" stopColor="#c3cff0" />
        </linearGradient>
      </defs>

      <circle cx="110" cy="96" r="80" fill="#ede9fe" opacity="0.5" />

      {/* Bar-chart panel, drifting behind the shoulder. Bars rise once. */}
      <g className="yatiArt-float-slow">
        <rect x="142" y="26" width="64" height="52" rx="10" fill={`url(#${screen})`} stroke="#ddd6fe" strokeWidth="2" />
        <rect className="yatiArt-grow" x="152" y="56" width="8" height="12" rx="2.5" fill="#c4b5fd" />
        <rect className="yatiArt-grow" x="165" y="48" width="8" height="20" rx="2.5" fill="#a78bfa" />
        <rect className="yatiArt-grow" x="178" y="40" width="8" height="28" rx="2.5" fill="#7c5cff" />
        <rect className="yatiArt-grow" x="191" y="34" width="8" height="34" rx="2.5" fill="#5b21b6" />
      </g>

      {/* Code panel on the other side. */}
      <g className="yatiArt-float-delay">
        <rect x="12" y="46" width="66" height="50" rx="10" fill={`url(#${screen})`} stroke="#ddd6fe" strokeWidth="2" />
        <circle cx="23" cy="57" r="3" fill="#fca5a5" />
        <circle cx="33" cy="57" r="3" fill="#fcd34d" />
        <circle cx="43" cy="57" r="3" fill="#86efac" />
        <g fill="#c7d2fe">
          <rect x="22" y="68" width="34" height="5" rx="2.5" />
          <rect x="22" y="78" width="46" height="5" rx="2.5" />
        </g>
        <rect x="22" y="78" width="18" height="5" rx="2.5" fill="#7c5cff" />
      </g>

      {/* The student. Head and torso ride one gentle bob together. */}
      <g className="yatiArt-bob">
        {/* Hair behind, then face, then fringe over the forehead. */}
        <path d="M83 78 c0 -17 9 -27 21 -27 s21 10 21 27 z" fill="#2f2a44" />
        <circle cx="104" cy="78" r="18" fill="#f7c9a6" />
        <path d="M86 74 c2 -13 9 -20 18 -20 s16 7 18 20 c-5 -8 -10 -10 -18 -10 s-13 2 -18 10z" fill="#2f2a44" />
        <circle cx="98" cy="80" r="1.7" fill="#2f2a44" />
        <circle cx="110" cy="80" r="1.7" fill="#2f2a44" />
        <path d="M100 87 a5 5 0 0 0 8 0" fill="none" stroke="#2f2a44" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="99" y="93" width="10" height="8" rx="3" fill="#efb694" />

        {/* Hoodie. */}
        <path d="M104 99 c-16 0 -28 11 -28 26 v19 h56 v-19 c0 -15 -12 -26 -28 -26z" fill={`url(#${hoodie})`} />
        <path d="M104 99 c-9 0 -17 3 -22 9 a26 26 0 0 0 44 0 c-5 -6 -13 -9 -22 -9z" fill="#6d4dff" />
        <path d="M104 106 v10" stroke="#4c1d95" strokeWidth="2" strokeLinecap="round" opacity="0.5" />

        {/* Forearms tapping. Each rotates about its own elbow. */}
        <g className="yatiArt-type" style={{ transformOrigin: '84px 126px' }}>
          <rect x="74" y="120" width="26" height="12" rx="6" fill="#8b6cff" />
          <circle cx="78" cy="126" r="6.5" fill="#f7c9a6" />
        </g>
        <g className="yatiArt-type" style={{ transformOrigin: '124px 126px', animationDelay: '-0.45s' }}>
          <rect x="108" y="120" width="26" height="12" rx="6" fill="#8b6cff" />
          <circle cx="130" cy="126" r="6.5" fill="#f7c9a6" />
        </g>
      </g>

      {/* Laptop, in front of the hands. */}
      <g>
        <rect x="74" y="126" width="60" height="26" rx="4" fill={`url(#${lid})`} stroke="#b9c5ef" strokeWidth="2" />
        <circle cx="104" cy="139" r="4.5" fill="#7c5cff" opacity="0.55" />
        <path d="M68 152 h72 l7 8 h-86z" fill="#d7ddf6" />
        <path d="M68 152 h72 l2 2 h-76z" fill="#b9c5ef" />
      </g>

      {/* Sparkles, so something is always moving even when the panels rest. */}
      <g fill="#a78bfa">
        <path className="yatiArt-twinkle" d="M40 118 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" />
        <path className="yatiArt-twinkle" d="M176 100 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" />
        <path className="yatiArt-twinkle" d="M154 146 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6z" />
      </g>
    </svg>
  );
}
