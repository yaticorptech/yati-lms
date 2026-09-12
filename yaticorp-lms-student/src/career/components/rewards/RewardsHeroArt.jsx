import { useId } from 'react';
import '../artwork.css';

/**
 * 🏆 The picture in the Rewards header.
 *
 * A trophy, with the shape this page actually hands out floating around it —
 * the same hexagonal badge the shelf below is full of. A cup belongs to no
 * subject in particular, so a learner of any field sees their own in it, and
 * nothing here is a person or a character.
 *
 * It reports rather than decorates, like the ring beside it: the hexes that
 * are lit are the badges already earned, the dim one is the next still to
 * come. A student with nothing yet gets an empty shelf floating beside an
 * empty cup, which is the honest picture.
 *
 * Original artwork from primitives, for the usual reasons — a few kilobytes,
 * no request, sharp at any width, and it takes the page's own palette instead
 * of being a PNG that stops matching when the theme moves.
 *
 * Depth comes from the same four things used across the Career Path heroes:
 * a darker copy of a shape offset downwards to stand in for its thickness, a
 * gradient across the face, a bright crown where the light lands, and a soft
 * shadow beneath. One light source, up and to the left.
 *
 * Motion is the shared `.yatiArt-*` vocabulary in artwork.css — slow, small,
 * and already stopped dead under prefers-reduced-motion.
 */

/** A pointy-top hexagon of the given radius, centred on the origin. */
const hex = (r) => {
  const w = 0.866 * r;
  return `M0 ${-r} L${w} ${-r / 2} L${w} ${r / 2} L0 ${r} L${-w} ${r / 2} L${-w} ${-r / 2} Z`;
};

const Sparkle = ({ x, y, s = 1, fill = '#fbbf24' }) => (
  <path
    className="yatiArt-twinkle"
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill={fill}
  />
);

/**
 * One badge, floating. `earned` is what decides whether it is lit or waiting,
 * so the shelf beside the cup counts the same badges the shelf below it does.
 */
const Badge = ({ x, y, r = 0, size = 30, earned, lift, drift, tone }) => (
  <g className={drift}>
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d={hex(size)} transform={`translate(0 7)`} fill={earned ? tone.lip : '#cbd5e1'} opacity="0.9" />
      <path d={hex(size)} fill={earned ? tone.face : '#eef2f7'} filter={lift} />
      {/* The crown, where the light lands. */}
      <path
        d={`M${-0.866 * size + 5} ${-size / 2 + 4} L0 ${-size + 4}`}
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        opacity={earned ? 0.45 : 0.6}
      />
      {earned ? (
        <path
          d="M-9 0 l6 6 l12 -13"
          fill="none"
          stroke="#fff"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        /* Still locked: a padlock rather than a mark it has not earned. */
        <g>
          <rect x="-7" y="-1" width="14" height="12" rx="3" fill="#94a3b8" />
          <path d="M-4 -1 v-4 a4 4 0 0 1 8 0 v4" fill="none" stroke="#94a3b8" strokeWidth="3" />
        </g>
      )}
    </g>
  </g>
);

const TONES = [
  { face: '#34d399', lip: '#047857' },
  { face: '#60a5fa', lip: '#1d4ed8' }
];

export default function RewardsHeroArt({ earned = 0, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `rw-${n}-${uid}`;
  const url = (n) => `url(#${id(n)})`;

  // Three slots beside the cup, filled from the left by what has been won.
  // More than three earned still shows three: this is a picture of a shelf,
  // not a count — the number itself is stated twice already in the words to
  // the left of it.
  const slots = [0, 1, 2].map((i) => i < earned);

  return (
    /* 1.33:1, which is the proportion of the frame this is given, not of the
       scene. `meet` fits the whole viewBox inside the frame, so a viewBox
       squarer than its frame scales to the frame's HEIGHT and leaves a band of
       nothing down one side. Both numbers move together. */
    <svg viewBox="0 0 360 270" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id={id('lift')} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#4c1d95" floodOpacity="0.18" />
        </filter>
        <filter id={id('cast')} x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="0" dy="13" stdDeviation="12" floodColor="#78350f" floodOpacity="0.26" />
        </filter>
        <linearGradient id={id('gold')} x1="0.15" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="42%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fcd34d" />
        </linearGradient>
        <radialGradient id={id('halo')}>
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('wash')}>
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="180" cy="132" rx="176" ry="130" fill={url('wash')} />

      <Sparkle x={72} y={44} s={1.1} />
      <Sparkle x={300} y={48} s={1.2} />
      <Sparkle x={332} y={168} s={0.85} fill="#c4b5fd" />
      <Sparkle x={40} y={150} s={0.8} fill="#f9a8d4" />

      {/* The light coming off it. */}
      <circle className="yatiArt-bob" cx="180" cy="112" r="92" fill={url('halo')} />

      {/* What it stands on. */}
      <ellipse cx="180" cy="232" rx="66" ry="10" fill="#1e1b4b" opacity="0.13" />

      <g filter={url('cast')}>
        {/* The plinth: a darker copy for its thickness, then the face. */}
        <rect x="126" y="204" width="108" height="24" rx="8" fill="#92400e" />
        <rect x="126" y="198" width="108" height="24" rx="8" fill={url('gold')} />
        <rect x="142" y="178" width="76" height="22" rx="6" fill="#b45309" />
        <rect x="142" y="174" width="76" height="22" rx="6" fill={url('gold')} />

        {/* The stem. */}
        <path d="M166 150 L194 150 L198 176 L162 176 Z" fill="#d97706" />

        {/* The handles, behind the bowl so they read as coming off its sides. */}
        <path d="M128 70 C 100 68, 94 108, 124 122" fill="none" stroke="#f59e0b" strokeWidth="11" strokeLinecap="round" />
        <path d="M232 70 C 260 68, 266 108, 236 122" fill="none" stroke="#f59e0b" strokeWidth="11" strokeLinecap="round" />

        {/* The bowl. */}
        <path d="M128 60 L232 60 C 232 112, 214 148, 180 154 C 146 148, 128 112, 128 60 Z" fill={url('gold')} />
        {/* The opening, which is what makes it a cup rather than a shield. */}
        <ellipse cx="180" cy="60" rx="52" ry="12" fill={url('rim')} />
        <ellipse cx="180" cy="61" rx="42" ry="8" fill="#d97706" opacity="0.55" />
        {/* The edge the light actually lands on. */}
        <path d="M140 74 C 140 104, 148 128, 162 140" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
        {/* A star on the cup, because a blank cup reads as unfinished. */}
        <path
          d="M0 -19 L5.5 -6.5 L19 -5.5 L8.5 3 L11.5 16 L0 9 L-11.5 16 L-8.5 3 L-19 -5.5 L-5.5 -6.5 Z"
          transform="translate(180 106)"
          fill="#fffbeb"
          opacity="0.92"
        />
      </g>

      {/* ---- The shelf ----
              Two beside the cup and one below, so the group reads as a row of
              badges rather than as a ring around the trophy. */}
      <Badge x={62} y={104} r={-8} size={30} earned={slots[0]} tone={TONES[0]} lift={url('lift')} drift="yatiArt-float-slow" />
      <Badge x={302} y={112} r={8} size={30} earned={slots[1]} tone={TONES[1]} lift={url('lift')} drift="yatiArt-float-delay" />
      <Badge x={72} y={204} r={6} size={25} earned={slots[2]} tone={TONES[0]} lift={url('lift')} drift="yatiArt-float" />
    </svg>
  );
}
