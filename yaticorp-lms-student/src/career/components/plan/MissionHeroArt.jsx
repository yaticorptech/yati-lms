import { useId } from 'react';
import '../artwork.css';

/**
 * 🚀 The rocket in the Today's Plan header, drawn for a pale panel.
 *
 * Original artwork from primitives. It climbs while there is work left and
 * throws confetti once the day is cleared, so the drawing reports the same
 * fact the ring beside it does rather than being pure decoration. Violet body,
 * amber flame, white clouds — everything reads against a lavender wash, which
 * the old white-on-indigo rocket did not.
 */
export default function MissionHeroArt({ cleared = false, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `mh-${n}-${uid}`;

  return (
    <svg viewBox="0 0 320 200" className={className} aria-hidden preserveAspectRatio="xMaxYMid meet">
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dcd6ff" />
        </linearGradient>
        <linearGradient id={id('nose')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b6cff" />
          <stop offset="100%" stopColor="#5a2ae0" />
        </linearGradient>
        <linearGradient id={id('flame')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <radialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* clouds */}
      <g fill="#ffffff" opacity="0.95">
        <ellipse cx="150" cy="178" rx="70" ry="22" />
        <ellipse cx="205" cy="168" rx="52" ry="24" />
        <ellipse cx="255" cy="180" rx="60" ry="20" />
        <ellipse cx="110" cy="188" rx="50" ry="16" />
      </g>
      <ellipse cx="200" cy="192" rx="120" ry="8" fill="#6c3bff" opacity="0.08" />

      {/* stars & confetti */}
      <g>
        <path className="yatiArt-twinkle" d="M60 60 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" fill="#a78bfa" />
        <path className="yatiArt-twinkle" d="M292 40 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" fill="#c4b5fd" />
        <path className="yatiArt-twinkle" d="M110 20 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z" fill="#a78bfa" />
        {/* The float classes animate `transform`, which would replace any
            transform attribute on the same element — so rotation lives on
            an outer group and the animation on an inner one. */}
        <g transform="rotate(-30 45 122)"><rect className="yatiArt-float-delay" x="40" y="120" width="10" height="4" rx="2" fill="#f472b6" /></g>
        <g transform="rotate(25 285 102)"><rect className="yatiArt-float" x="280" y="100" width="10" height="4" rx="2" fill="#60a5fa" /></g>
        <g transform="rotate(-15 254 28)"><rect className="yatiArt-float-slow" x="250" y="26" width="9" height="4" rx="2" fill="#fbbf24" /></g>
        <circle className="yatiArt-float" cx="86" cy="150" r="3" fill="#34d399" />
        {cleared && (
          <g>
            <g transform="rotate(20 125 75)"><rect className="yatiArt-float-delay" x="120" y="70" width="10" height="10" rx="3" fill="#fbbf24" /></g>
            <g transform="rotate(-25 245 65)"><rect className="yatiArt-float" x="240" y="60" width="10" height="10" rx="3" fill="#f472b6" /></g>
            <g transform="rotate(35 184 34)"><rect className="yatiArt-float-slow" x="180" y="30" width="8" height="8" rx="2" fill="#34d399" /></g>
            <g transform="rotate(-40 74 104)"><rect className="yatiArt-float-delay" x="70" y="100" width="8" height="8" rx="2" fill="#60a5fa" /></g>
          </g>
        )}
      </g>

      {/* the rocket */}
      <g transform="translate(200 96) rotate(28)">
      <g className={cleared ? 'yatiArt-bob' : 'yatiArt-float'}>
        {/* exhaust glow */}
        <ellipse cx="0" cy="92" rx="44" ry="30" fill={`url(#${id('glow')})`} />
        {/* flame */}
        <path d="M-14 54 q14 60 28 0 q-14 22 -28 0z" fill={`url(#${id('flame')})`} />
        <path d="M-7 54 q7 32 14 0 q-7 12 -14 0z" fill="#fff7ed" opacity="0.9" />
        {/* fins */}
        <path d="M-24 22 l-18 30 l18 4 z" fill="#5a2ae0" />
        <path d="M24 22 l18 30 l-18 4 z" fill="#5a2ae0" />
        {/* body */}
        <path d="M0 -70 c22 14 30 46 30 78 v40 a6 6 0 0 1 -6 6 h-48 a6 6 0 0 1 -6 -6 v-40 c0 -32 8 -64 30 -78z" fill={`url(#${id('body')})`} />
        {/* nose */}
        <path d="M0 -70 c14 9 22 26 26 42 h-52 c4 -16 12 -33 26 -42z" fill={`url(#${id('nose')})`} />
        {/* window */}
        <circle cx="0" cy="4" r="15" fill="#5a2ae0" />
        <circle cx="0" cy="4" r="10" fill="#93c5fd" />
        <path d="M-6 0 a8 8 0 0 1 10 -5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
        {/* stripe */}
        <rect x="-30" y="40" width="60" height="7" fill="#7d4fff" opacity="0.7" />
      </g>
      </g>
    </svg>
  );
}
