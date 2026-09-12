import { useId } from 'react';
import './ideasHero.css';

/**
 * The picture that opens the Ideas page.
 *
 * An idea, lit, with the shapes a resource comes in floating around it — a
 * book, a video, a snippet of code, a certificate. That is the whole of what
 * this page holds, said in one object, and a bulb belongs to no subject in
 * particular: a learner of any field can see their own idea in it. Nothing
 * here is a person or a character.
 *
 * Drawn rather than photographed, for the usual reasons — a few kilobytes, no
 * request, sharp at any width, and it takes the page's own palette instead of
 * being a PNG that stops matching when the theme moves.
 *
 * Depth comes from the same four things used across the Career Path heroes,
 * applied consistently: a darker copy of a shape offset downwards to stand in
 * for its thickness, a gradient across the face, a bright crown where the
 * light lands, and a soft shadow beneath. One light source, up and to the
 * left — except inside the glass, where the filament is the light and the
 * highlights answer to it instead.
 */

const Sparkle = ({ x, y, s = 1, o = 0.85, fill = '#c4b5fd', delay = '0s' }) => (
  <path
    className="ih-twinkle"
    style={{ animationDelay: delay }}
    d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z"
    transform={`translate(${x} ${y}) scale(${s})`}
    fill={fill}
    opacity={o}
  />
);

/** One of the shapes a resource comes in, floating beside the idea. */
const Tile = ({ x, y, r = 0, s = 62, face, lip, shadow, delay, children }) => (
  <g className="ih-bob" style={{ animationDelay: delay }}>
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-s / 2} y={-s / 2 + 9} width={s} height={s} rx="17" fill={lip} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx="17" fill={face} filter={shadow} />
      <rect x={-s / 2 + 7} y={-s / 2 + 6} width={s - 14} height="12" rx="6" fill="#fff" opacity="0.5" />
      {children}
    </g>
  </g>
);

export default function IdeasHeroArt() {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `ih-${n}-${uid}`;
  const url = (n) => `url(#${id(n)})`;

  // Six rays around the top half of the glass, listed rather than looped so
  // each can carry its own delay and none of them pulse together.
  const RAYS = [
    { a: -158, delay: '0s' },
    { a: -128, delay: '0.5s' },
    { a: -98, delay: '1s' },
    { a: -82, delay: '1.5s' },
    { a: -52, delay: '2s' },
    { a: -22, delay: '2.6s' }
  ];

  return (
    /* 2.03:1, which is the proportion of the frame this is given, not of the
       scene. `meet` fits the whole viewBox inside the frame, so a viewBox
       squarer than its frame scales to the frame's HEIGHT and leaves a band
       of nothing down one side. Both numbers move together. */
    <svg
      viewBox="0 0 520 256"
      className="ih-art h-full w-full"
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={id('lift')} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#4c1d95" floodOpacity="0.16" />
        </filter>
        <filter id={id('cast')} x="-45%" y="-45%" width="190%" height="190%">
          <feDropShadow dx="0" dy="12" stdDeviation="11" floodColor="#7c2d12" floodOpacity="0.2" />
        </filter>

        {/* The glass: lit from inside, so the warmth pools low and the rim
            stays pale. */}
        <radialGradient id={id('glass')} cx="0.42" cy="0.34" r="0.78">
          <stop offset="0%" stopColor="#fffdf3" />
          <stop offset="42%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <radialGradient id={id('halo')}>
          <stop offset="0%" stopColor="#fde68a" stopOpacity="0.9" />
          <stop offset="52%" stopColor="#fbbf24" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id('screw')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="32%" stopColor="#e2e8f0" />
          <stop offset="70%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id={id('white')} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef2ff" />
        </linearGradient>
        {/* A wash of colour behind everything, so the scene sits in light
            rather than on white. */}
        <radialGradient id={id('wash')}>
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="266" cy="128" rx="252" ry="126" fill={url('wash')} />

      <Sparkle x={128} y={40} s={1.1} delay="0s" />
      <Sparkle x={398} y={36} s={1.25} fill="#fbbf24" delay="0.9s" />
      <Sparkle x={62} y={150} s={0.9} delay="1.8s" />
      <Sparkle x={470} y={158} s={0.95} fill="#f9a8d4" delay="2.5s" />

      {/* ---- The light it throws ---- */}
      <circle className="ih-glow" cx="266" cy="106" r="104" fill={url('halo')} />

      {RAYS.map(({ a, delay }) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 266 + Math.cos(rad) * 70;
        const y1 = 106 + Math.sin(rad) * 70;
        const x2 = 266 + Math.cos(rad) * 90;
        const y2 = 106 + Math.sin(rad) * 90;
        return (
          <line
            key={a}
            className="ih-ray"
            style={{ animationDelay: delay }}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#fbbf24"
            strokeWidth="6"
            strokeLinecap="round"
          />
        );
      })}

      {/* ---- The idea ---- */}
      <g className="ih-pop">
        {/* What it stands on. */}
        <ellipse cx="266" cy="228" rx="54" ry="9" fill="#1e1b4b" opacity="0.1" />

        {/* The screw base: a darker copy for its thickness, then the metal. */}
        <rect x="244" y="176" width="44" height="36" rx="7" fill="#64748b" />
        <rect x="244" y="172" width="44" height="36" rx="7" fill={url('screw')} />
        <path d="M246 181 h40 M246 189 h40 M246 197 h40" stroke="#94a3b8" strokeWidth="2.5" opacity="0.75" />
        <rect x="254" y="207" width="24" height="9" rx="4.5" fill="#475569" />

        {/* The neck, narrowing into the base. */}
        <path d="M240 150 L292 150 L286 176 L246 176 Z" fill="#fcd34d" />

        {/* The glass. */}
        <circle cx="266" cy="106" r="56" fill={url('glass')} filter={url('cast')} />
        {/* Rim light, and the specular the eye reads as glass. */}
        <path
          d="M222 84 a54 54 0 0 1 30 -30"
          fill="none"
          stroke="#fff"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.55"
        />
        <ellipse cx="244" cy="82" rx="12" ry="8" fill="#fff" opacity="0.6" transform="rotate(-34 244 82)" />

        {/* The filament, and the light pooling around it. Both come up a beat
            after the bulb lands, so it reads as switching on. */}
        <g className="ih-lit">
          <circle cx="266" cy="112" r="30" fill="#fffbeb" opacity="0.55" />
          <path
            d="M252 132 L252 116 a14 14 0 0 1 28 0 L280 132"
            fill="none"
            stroke="#fff7ed"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M258 116 q8 -12 16 0"
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* ---- What an idea turns into ----
              A book, a video, a snippet and a certificate: the four shapes
              every resource on the page below arrives in. */}
      <Tile x={92} y={92} r={-9} s={62} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="0.1s">
        <rect x="-15" y="-13" width="30" height="24" rx="4" fill="#60a5fa" />
        <rect x="-15" y="-13" width="8" height="24" rx="3" fill="#2563eb" />
        <path d="M-2 -7 h12 M-2 -1 h12 M-2 5 h8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
      </Tile>

      <Tile x={104} y={196} r={7} s={58} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="0.22s">
        <rect x="-16" y="-12" width="32" height="24" rx="6" fill="#fb7185" />
        <path d="M-4 -6 L8 0 L-4 6 Z" fill="#fff" />
      </Tile>

      <Tile x={428} y={90} r={9} s={62} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="0.34s">
        <text
          x="0"
          y="8"
          textAnchor="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontSize="21"
          fontWeight="700"
          fill="#6c3bff"
        >
          {'</>'}
        </text>
      </Tile>

      <Tile x={440} y={194} r={-7} s={58} face={url('white')} lip="#c7d2fe" shadow={url('lift')} delay="0.46s">
        <circle cx="0" cy="-4" r="12" fill="#34d399" />
        <circle cx="0" cy="-6" r="12" fill="#6ee7b7" opacity="0.5" />
        <path d="M-5 -5 l3.5 3.5 l7 -7.5" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-7 6 l-3 14 l10 -6 l10 6 l-3 -14 Z" fill="#10b981" />
      </Tile>
    </svg>
  );
}
