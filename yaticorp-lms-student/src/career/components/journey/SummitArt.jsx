import { useId } from 'react';

/**
 * The summit, drawn rather than downloaded.
 *
 * Original artwork, and deliberately an inline SVG rather than an image file:
 * it weighs about a kilobyte, needs no request, scales to any width without a
 * second asset, and picks up the panel's own colours instead of shipping a
 * flat PNG that would clash the moment the gradient behind it changed.
 *
 * The metaphor is the section's: a path winding up through the hills to a flag
 * at the top. Purely decorative, so it is hidden from assistive technology —
 * every fact on this banner is stated in text beside it.
 */
export default function SummitArt() {
  // Ids are scoped per instance. Two copies of this SVG on one page would
  // otherwise share one set of gradient ids, and `url(#…)` resolves to whichever
  // the document holds first — the trap that left the sidebar astronaut with no
  // suit until it was fixed there.
  const uid = useId().replace(/:/g, '');
  const id = (name) => `mt-${name}-${uid}`;

  return (
    <svg
      viewBox="0 0 340 200"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
      preserveAspectRatio="xMaxYMax meet"
    >
      <defs>
        {/* Warm dusk behind the peak — the sky is what makes a mountain read as
            a destination rather than as a grey shape. */}
        <linearGradient id={id('sky')} x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#c084fc" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('sun')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
        <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id={id('mid')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#6d28d9" stopOpacity="0.65" />
        </linearGradient>
        <linearGradient id={id('near')} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ddd6fe" />
          <stop offset="45%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="340" height="200" fill={`url(#${id('sky')})`} />

      {/* Sun, with the haze around it */}
      <circle cx="243" cy="62" r="52" fill={`url(#${id('glow')})`} />
      <circle cx="243" cy="62" r="23" fill={`url(#${id('sun')})`} />

      {[
        [40, 28, 1.6], [74, 52, 1.1], [122, 22, 1.3],
        [298, 30, 1.4], [318, 78, 1], [16, 70, 1.1], [190, 18, 1]
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" opacity="0.8" />
      ))}

      {/* Far range */}
      <path
        d="M0 172 L54 112 L92 144 L146 86 L204 152 L250 120 L300 158 L340 132 L340 200 L0 200 Z"
        fill={`url(#${id('far')})`}
      />
      {/* Middle range, offset so the ridgelines do not sit on top of each other */}
      <path
        d="M0 190 L46 150 L104 182 L150 128 L212 186 L268 148 L340 186 L340 200 L0 200 Z"
        fill={`url(#${id('mid')})`}
      />

      {/* The peak the path climbs */}
      <path d="M64 200 L182 54 L306 200 Z" fill={`url(#${id('near')})`} />
      {/* Snow cap, with the ragged lower edge snow actually has */}
      <path d="M182 54 L214 96 L200 90 L190 100 L178 88 L166 98 L152 92 Z" fill="#ffffff" opacity="0.95" />

      {/* The route: a broad pale ribbon, then the dashes walking up it */}
      <path
        d="M88 200 C126 184 112 158 144 148 C176 138 156 116 178 106 C193 99 182 84 182 70"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M88 200 C126 184 112 158 144 148 C176 138 156 116 178 106 C193 99 182 84 182 70"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.95"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="1 9"
      />

      {/* Flag at the summit */}
      <line x1="182" y1="70" x2="182" y2="38" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M182 40 L210 49 L182 58 Z" fill="#f59e0b" />

      {/* Soft cloud bank, low and unhurried */}
      <g opacity="0.5" fill="#ffffff">
        <ellipse cx="52" cy="150" rx="30" ry="8" />
        <ellipse cx="74" cy="146" rx="20" ry="7" />
        <ellipse cx="292" cy="128" rx="26" ry="7" />
        <ellipse cx="272" cy="132" rx="16" ry="6" />
      </g>
    </svg>
  );
}

