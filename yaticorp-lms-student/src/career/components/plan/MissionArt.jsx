import { useId } from 'react';
import '../artwork.css';

/**
 * 🎯 The picture in the Today's Plan header.
 *
 * A target, and an arrow on its way to it — which is what a day's plan is.
 * The drawing reports the same fact the ring beside it does rather than being
 * pure decoration: while there is work left the arrow is still in flight, and
 * once the day is cleared it is in the gold and the bullseye bursts. A target
 * belongs to no subject in particular, so a learner of any field sees their
 * own day in it. Nothing here is a person or a character.
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
 * and already stopped dead under prefers-reduced-motion. Nothing here needs a
 * sheet of its own.
 */

/** The rings, outermost first: half-width, half-height, colour. */
const RINGS = [
  [78, 72, '#7c3aed'],
  [62, 57, '#f1ecff'],
  [46, 42, '#fb7185'],
  [30, 28, '#fff1f2'],
  [14, 13, '#fbbf24']
];

const CX = 206;
const CY = 120;

const Sparkle = ({ x, y, s = 1, fill = '#c4b5fd' }) => (
  <path
    className="yatiArt-twinkle"
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill={fill}
  />
);

/** One of the things a finished task hands back, floating beside the target. */
const Tile = ({ x, y, r = 0, s = 56, lift, drift, children }) => (
  <g className={drift}>
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-s / 2} y={-s / 2 + 8} width={s} height={s} rx="16" fill="#c7d2fe" />
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx="16" fill="#fff" filter={lift} />
      <rect x={-s / 2 + 6} y={-s / 2 + 5} width={s - 12} height="11" rx="5.5" fill="#fff" opacity="0.6" />
      {children}
    </g>
  </g>
);

/**
 * The arrow, drawn along +x and rotated into place, so only the head's
 * position and the direction of travel have to be reasoned about.
 */
const Arrow = ({ hx, hy, angle = 140, len = 96 }) => (
  <g transform={`translate(${hx} ${hy}) rotate(${angle})`}>
    <path d={`M-${len} 0 L-14 0`} stroke="#64748b" strokeWidth="5" strokeLinecap="round" />
    <path d="M0 0 L-16 -8 L-16 8 Z" fill="#334155" />
    <path d={`M-${len} 0 l16 -9 l7 5 l-16 4 Z`} fill="#fb7185" />
    <path d={`M-${len} 0 l16 9 l7 -5 l-16 -4 Z`} fill="#e11d48" />
  </g>
);

export default function MissionArt({ cleared = false, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `ms-${n}-${uid}`;
  const url = (n) => `url(#${id(n)})`;

  return (
    /* 1.56:1, which is the proportion of the frame this is given, not of the
       scene. `meet` fits the whole viewBox inside the frame, so a viewBox
       squarer than its frame scales to the frame's HEIGHT and leaves a band of
       nothing down one side. Both numbers move together. */
    <svg viewBox="0 0 420 270" className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <defs>
        <filter id={id('lift')} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#4c1d95" floodOpacity="0.16" />
        </filter>
        <filter id={id('cast')} x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="0" dy="13" stdDeviation="12" floodColor="#3b0764" floodOpacity="0.24" />
        </filter>
        <radialGradient id={id('wash')}>
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id('gold')}>
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="210" cy="128" rx="204" ry="128" fill={url('wash')} />

      <Sparkle x={104} y={34} s={1.1} />
      <Sparkle x={44} y={168} s={0.85} />
      <Sparkle x={392} y={118} s={1.15} fill="#fbbf24" />
      <Sparkle x={302} y={244} s={0.8} fill="#f9a8d4" />

      {/* What it stands on. */}
      <ellipse cx={CX} cy="218" rx="76" ry="11" fill="#1e1b4b" opacity="0.12" />

      {/* ---- The target ----
              A darker copy of the outer ring, dropped, is the board's own
              thickness; the rings above it are squashed a little so the whole
              thing reads as tilted back rather than lying flat on the page. */}
      <ellipse cx={CX} cy={CY + 12} rx="78" ry="72" fill="#4c1d95" />
      <g filter={url('cast')}>
        {RINGS.map(([rx, ry, fill]) => (
          <ellipse key={rx} cx={CX} cy={CY} rx={rx} ry={ry} fill={fill} />
        ))}
      </g>
      {/* The edge the light actually lands on. */}
      <path
        d={`M${CX - 66} ${CY - 22} A 74 68 0 0 1 ${CX - 16} ${CY - 68}`}
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.4"
      />

      {cleared ? (
        <>
          {/* In the gold, and the gold saying so. */}
          <circle className="yatiArt-bob" cx={CX} cy={CY} r="54" fill={url('gold')} />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={a}
                className="yatiArt-twinkle"
                x1={CX + Math.cos(rad) * 24}
                y1={CY + Math.sin(rad) * 22}
                x2={CX + Math.cos(rad) * 38}
                y2={CY + Math.sin(rad) * 35}
                stroke="#f59e0b"
                strokeWidth="5"
                strokeLinecap="round"
              />
            );
          })}
          <g className="yatiArt-bob">
            <Arrow hx={CX} hy={CY} />
          </g>
        </>
      ) : (
        <>
          {/* Still on its way. The trail says where it came from, so the
              arrow reads as travelling rather than as hanging in the air.

              The head is held clear of the outer ring on purpose: anywhere
              on the board and it stops reading as an arrow in flight and
              starts reading as one that has already landed, badly. It is
              also the short arrow — the long one needs room above the board
              that this frame does not have, and its flights ran off the top
              edge. */}
          <path
            d="M400 12 C 376 20, 358 26, 344 32"
            fill="none"
            stroke="#c4b5fd"
            strokeWidth="3"
            strokeDasharray="1 8"
            strokeLinecap="round"
          />
          <g className="yatiArt-float">
            <Arrow hx={286} hy={70} angle={145} len={64} />
          </g>
        </>
      )}

      {/* ---- What a finished task hands back ---- */}
      <Tile x={62} y={86} r={-9} s={54} lift={url('lift')} drift="yatiArt-float-slow">
        <path d="M-13 0 l8 8 l16 -17" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </Tile>

      <Tile x={352} y={206} r={8} s={50} lift={url('lift')} drift="yatiArt-float-delay">
        <circle cx="0" cy="0" r="14" fill="#fbbf24" />
        <circle cx="0" cy="-2" r="14" fill="#fde68a" opacity="0.55" />
        <path
          d="M0 -9 L2.6 -3.2 L9 -2.6 L4.2 1.6 L5.6 8 L0 4.8 L-5.6 8 L-4.2 1.6 L-9 -2.6 L-2.6 -3.2 Z"
          fill="#b45309"
        />
      </Tile>
    </svg>
  );
}
