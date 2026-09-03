import { useId } from 'react';

/**
 * The skill map: floating islands, and a lit road climbing to a flag.
 *
 * Original artwork, inline for the same reasons as the summit on the calendar
 * and the astronaut in the sidebar — about two kilobytes, no request, sharp at
 * any width, and it inherits the panel's palette rather than being a flat PNG
 * that stops matching the moment the gradient changes.
 *
 * The metaphor is the page's: skills are separate islands, and the road that
 * joins them runs uphill to the flag. Decorative, so it is hidden from
 * assistive technology — everything factual on this banner is written beside it.
 */
export default function SkillMapArt() {
  // Ids scoped per instance: two copies on one page would otherwise share one
  // set of gradients, and `url(#…)` resolves to whichever the document holds
  // first — the trap that once left the sidebar astronaut with no suit.
  const uid = useId().replace(/:/g, '');
  const id = (name) => `sm-${name}-${uid}`;

  return (
    <svg
      viewBox="0 0 360 260"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
      preserveAspectRatio="xMaxYMid meet"
    >
      <defs>
        <radialGradient id={id('halo')}>
          <stop offset="0%" stopColor="#f0abfc" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('peak')} x1="0.2" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#e9d5ff" />
          <stop offset="40%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id={id('rock')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={id('road')} x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="60%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#fff7ed" />
        </linearGradient>
      </defs>

      {/* The glow the whole scene sits in */}
      <ellipse cx="196" cy="150" rx="150" ry="118" fill={`url(#${id('halo')})`} />

      {/* Stars, uneven on purpose — a regular field reads as a texture */}
      {[
        [40, 44, 2.1], [86, 96, 1.3], [128, 38, 1.6], [300, 60, 1.9],
        [332, 128, 1.4], [58, 176, 1.5], [22, 108, 1.2], [274, 34, 1.5], [346, 200, 1.3]
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#ffffff" opacity="0.85" />
      ))}

      {/* Four-point sparkles, the shape the reference uses for magic */}
      {[[104, 66, 7], [292, 96, 9], [62, 214, 6], [322, 168, 6]].map(([x, y, s]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${y - s} Q${x + 1} ${y - 1} ${x + s} ${y} Q${x + 1} ${y + 1} ${x} ${y + s} Q${x - 1} ${y + 1} ${x - s} ${y} Q${x - 1} ${y - 1} ${x} ${y - s} Z`}
          fill="#fde68a"
          opacity="0.9"
        />
      ))}

      {/* --- Small floating island, upper left --- */}
      <g>
        <ellipse cx="118" cy="126" rx="30" ry="9" fill={`url(#${id('grass')})`} />
        <path d="M88 126 L118 160 L148 126 Z" fill={`url(#${id('rock')})`} />
        <path d="M112 126 L112 106 L126 111 L112 116" fill="#fbbf24" />
        <rect x="110" y="104" width="2" height="24" rx="1" fill="#ede9fe" />
      </g>

      {/* --- Small floating island, right --- */}
      <g>
        <ellipse cx="316" cy="176" rx="26" ry="8" fill={`url(#${id('grass')})`} />
        <path d="M290 176 L316 204 L342 176 Z" fill={`url(#${id('rock')})`} />
        {[[306, 168, 9], [318, 166, 11], [329, 169, 8]].map(([x, y, h]) => (
          <path key={x} d={`M${x} ${y - h} L${x + 5} ${y} L${x - 5} ${y} Z`} fill="#c4b5fd" />
        ))}
      </g>

      {/* --- The main island --- */}
      <g>
        <ellipse cx="206" cy="196" rx="96" ry="22" fill={`url(#${id('grass')})`} />
        <path d="M110 196 L206 254 L302 196 Z" fill={`url(#${id('rock')})`} />

        {/* Peak, with a snow cap */}
        <path d="M150 194 L226 82 L292 194 Z" fill={`url(#${id('peak')})`} />
        <path d="M226 82 L250 118 L238 113 L226 122 L214 112 L202 118 Z" fill="#ffffff" opacity="0.95" />

        {/* The lit road: a wide glow, then the ribbon itself */}
        <path
          d="M150 210 C186 198 168 178 198 168 C228 158 210 138 226 124 C234 116 228 104 226 96"
          fill="none"
          stroke="#fbbf24"
          strokeOpacity="0.3"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M150 210 C186 198 168 178 198 168 C228 158 210 138 226 124 C234 116 228 104 226 96"
          fill="none"
          stroke={`url(#${id('road')})`}
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Conifers along the lower slopes */}
        {[[168, 190, 13], [182, 196, 10], [252, 190, 13], [266, 196, 10], [156, 200, 9]].map(
          ([x, y, h]) => (
            <path key={`${x}-${y}`} d={`M${x} ${y - h} L${x + 6} ${y} L${x - 6} ${y} Z`} fill="#5b21b6" />
          )
        )}

        {/* Flag at the summit */}
        <rect x="225" y="62" width="2.5" height="34" rx="1.25" fill="#ede9fe" />
        <path d="M227 64 L252 72 L227 80 Z" fill="#f59e0b" />
      </g>
    </svg>
  );
}
