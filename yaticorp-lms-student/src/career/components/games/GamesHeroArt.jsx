import { useId } from 'react';
import '../artwork.css';

/**
 * 🎮 The gamepad on the left of the Games header.
 *
 * Original artwork from primitives, drawn in the reference's palette: a violet
 * body, coloured face buttons and a scatter of confetti. Floats gently.
 */
export function ControllerArt({ className = '' }) {
  const uid = useId();
  const body = `pad-${uid}`;
  const grip = `grip-${uid}`;

  return (
    <svg viewBox="0 0 200 170" className={className} aria-hidden>
      <defs>
        <linearGradient id={body} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d4dff" />
        </linearGradient>
        <linearGradient id={grip} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8b6cff" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>

      {/* Confetti around the pad. */}
      <g>
        <circle className="yatiArt-float-delay" cx="26" cy="40" r="6" fill="#f472b6" />
        <rect className="yatiArt-float-slow" x="168" y="30" width="11" height="11" rx="3" fill="#38bdf8" transform="rotate(20 173 35)" />
        <circle className="yatiArt-float" cx="180" cy="120" r="5" fill="#fbbf24" />
        <rect className="yatiArt-float-delay" x="20" y="120" width="9" height="9" rx="2.5" fill="#34d399" transform="rotate(-18 24 124)" />
      </g>

      <g className="yatiArt-float">
        {/* Grips, then the body over them. */}
        <path d="M56 66 c-22 4 -34 26 -32 52 c1 16 16 22 26 12 l22 -22z" fill={`url(#${grip})`} />
        <path d="M144 66 c22 4 34 26 32 52 c-1 16 -16 22 -26 12 l-22 -22z" fill={`url(#${grip})`} />
        <rect x="42" y="52" width="116" height="66" rx="30" fill={`url(#${body})`} />
        <rect x="52" y="60" width="96" height="26" rx="13" fill="#ffffff" opacity="0.16" />

        {/* D-pad. */}
        <rect x="62" y="80" width="10" height="30" rx="4" fill="#ede9fe" />
        <rect x="52" y="90" width="30" height="10" rx="4" fill="#ede9fe" />

        {/* Face buttons, in the reference's four colours. */}
        <circle cx="134" cy="80" r="7" fill="#fbbf24" />
        <circle cx="148" cy="95" r="7" fill="#f472b6" />
        <circle cx="120" cy="95" r="7" fill="#38bdf8" />
        <circle cx="134" cy="110" r="7" fill="#34d399" />

        {/* Sticks. */}
        <circle cx="86" cy="108" r="11" fill="#4c1d95" />
        <circle cx="86" cy="108" r="6" fill="#c4b5fd" />
        <circle cx="112" cy="70" r="6" fill="#ffffff" opacity="0.5" />
      </g>
    </svg>
  );
}

/**
 * 🏆 The trophy on its podium, right of the header text.
 *
 * A gold cup on a violet plinth with a flag, stars and floating tokens — the
 * reference's centrepiece, drawn from primitives.
 */
export function TrophyPodiumArt({ className = '' }) {
  const uid = useId();
  const gold = `tp-gold-${uid}`;
  const block = `tp-block-${uid}`;

  return (
    <svg viewBox="0 0 240 180" className={className} aria-hidden>
      <defs>
        <linearGradient id={gold} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffe08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={block} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c5cff" />
        </linearGradient>
      </defs>

      {/* Floating tokens and stars. */}
      <g>
        <circle className="yatiArt-float-delay" cx="30" cy="66" r="13" fill="#f9a8d4" />
        <path className="yatiArt-twinkle" d="M30 60 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffffff" />
        <circle className="yatiArt-float-slow" cx="62" cy="104" r="11" fill="#a5b4fc" />
        <circle className="yatiArt-float" cx="214" cy="60" r="10" fill="#93c5fd" />
        <path className="yatiArt-twinkle" d="M196 28 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" fill="#60a5fa" />
        <path className="yatiArt-twinkle" d="M92 24 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" fill="#fbbf24" />
        <rect className="yatiArt-float-delay" x="204" y="112" width="12" height="12" rx="3.5" fill="#fda4af" transform="rotate(22 210 118)" />
      </g>

      {/* Flag beside the podium. */}
      <g className="yatiArt-float-slow">
        <rect x="176" y="70" width="4" height="58" rx="2" fill="#8b6cff" />
        <path d="M180 74 h30 l-8 10 8 10 h-30z" fill="#a78bfa" />
      </g>

      {/* Trophy. */}
      <g className="yatiArt-float">
        <path d="M104 44 a15 15 0 0 0 0 26" fill="none" stroke={`url(#${gold})`} strokeWidth="7" strokeLinecap="round" />
        <path d="M156 44 a15 15 0 0 1 0 26" fill="none" stroke={`url(#${gold})`} strokeWidth="7" strokeLinecap="round" />
        <path d="M106 34 h48 v20 a24 24 0 0 1 -48 0z" fill={`url(#${gold})`} />
        <rect x="123" y="78" width="14" height="14" rx="4" fill="#e08c07" />
        <rect x="110" y="90" width="40" height="9" rx="4.5" fill={`url(#${gold})`} />
        <path d="M120 44 a9 9 0 0 0 7 11" fill="none" stroke="#fff6d8" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      </g>

      {/* Podium: a tall centre block with a lower step either side. */}
      <g>
        <rect x="76" y="128" width="34" height="30" rx="6" fill={`url(#${block})`} opacity="0.75" />
        <rect x="110" y="100" width="42" height="58" rx="7" fill={`url(#${block})`} />
        <rect x="152" y="122" width="34" height="36" rx="6" fill={`url(#${block})`} opacity="0.85" />
        <rect x="110" y="100" width="42" height="9" rx="4.5" fill="#ffffff" opacity="0.3" />
        <ellipse cx="131" cy="164" rx="66" ry="8" fill="#c4b5fd" opacity="0.35" />
      </g>
    </svg>
  );
}
