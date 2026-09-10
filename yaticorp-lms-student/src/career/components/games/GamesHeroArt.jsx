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

/**
 * The scene behind the games banner: sky, clouds, rolling hills, and a path
 * that winds up from the bottom to a trophy waiting on a podium.
 *
 * The viewBox is close to the banner's own shape so that nothing important is
 * cropped away when the picture is scaled to cover it. The path is a filled
 * ribbon rather than a stroke, so it narrows as it climbs and reads as
 * distance, and it has to arrive somewhere: a path that leaves the picture is
 * just a stripe, and the whole scene is meant to say the climb ends at
 * something.
 *
 * Everything is low contrast on purpose. The headline sits on top of it and
 * has to stay the loudest thing on the card.
 */
export function HeroScene({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1200 270"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="gh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9ed5fa" />
          <stop offset="62%" stopColor="#cfeafd" />
          <stop offset="100%" stopColor="#e8f6ff" />
        </linearGradient>
        <linearGradient id="gh-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b2e7c1" />
          <stop offset="100%" stopColor="#8fd8a4" />
        </linearGradient>
        <linearGradient id="gh-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#79cf92" />
          <stop offset="100%" stopColor="#4fbb75" />
        </linearGradient>
        <linearGradient id="gh-path" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#efd699" />
          <stop offset="100%" stopColor="#faeecd" />
        </linearGradient>
      </defs>

      <rect width="1200" height="270" fill="url(#gh-sky)" />

      {/* Everything is kept inside x 160-1040. The banner is wider than it is
          tall relative to this viewBox, so `slice` crops roughly 130 units off
          each side; anything drawn outside that band loses its edge. That is
          what was cutting the flag off the podium. */}

      {/* Soft, overlapping clouds. */}
      <g fill="#ffffff" opacity="0.92">
        <g>
          <ellipse cx="248" cy="56" rx="50" ry="17" />
          <ellipse cx="230" cy="48" rx="29" ry="19" />
          <ellipse cx="272" cy="47" rx="23" ry="15" />
        </g>
        <g opacity="0.85">
          <ellipse cx="640" cy="42" rx="44" ry="14" />
          <ellipse cx="624" cy="36" rx="26" ry="16" />
        </g>
        <g opacity="0.8">
          <ellipse cx="960" cy="62" rx="42" ry="14" />
          <ellipse cx="978" cy="55" rx="26" ry="16" />
        </g>
      </g>

      {/* Two ranges, low on the left and rising to the right.
          The shape is the whole trick: the words live on the left, so that
          side stays sky and stays readable, while the ground climbs on the
          right to carry the path and the trophy. A level horizon would put
          body text on dark green, which is what made it muddy. */}
      <path
        d="M0 212 C 160 202, 300 214, 440 200 C 580 186, 700 168, 860 156 C 990 146, 1100 140, 1200 136 L1200 270 L0 270 Z"
        fill="url(#gh-far)"
      />
      <path
        d="M0 246 C 180 240, 320 250, 470 236 C 620 222, 760 200, 900 190 C 1030 181, 1120 180, 1200 178 L1200 270 L0 270 Z"
        fill="url(#gh-near)"
      />

      {/* The path: broad in the foreground at the bottom left, tapering as it
          climbs away to the podium. A road that keeps one width is a stripe. */}
      <path
        d="M852 205
           C 736 213, 656 238, 512 249
           C 384 258, 198 253, 30 247
           L 30 274
           C 210 279, 392 276, 528 265
           C 668 254, 762 226, 862 213 Z"
        fill="url(#gh-path)"
      />
      <path
        d="M62 262 C 206 266, 388 264, 518 257 C 654 249, 758 224, 850 210"
        fill="none"
        stroke="#ffffff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray="14 20"
        opacity="0.8"
      />

      {/* Bushes along the way. */}
      <g fill="#5fc383">
        <circle cx="430" cy="252" r="14" />
        <circle cx="452" cy="256" r="9" />
        <circle cx="654" cy="230" r="12" />
        <circle cx="672" cy="234" r="8" />
        <circle cx="978" cy="204" r="15" opacity="0.9" />
        <circle cx="1004" cy="209" r="10" opacity="0.9" />
      </g>

      {/* Stars clustered around the mascot, which is where they belong and,
          just as importantly, well clear of the headline. One of them used to
          land squarely on the word "next". */}
      <g fill="#fbbf24">
        <path d="M74 44 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 Z" />
        <path d="M152 92 l5 11 12 2 -9 8 2 12 -10 -6 -10 6 2 -12 -9 -8 12 -2 Z" opacity="0.9" />
        <path d="M126 18 l4 9 10 1 -7 6 2 10 -9 -5 -9 5 2 -10 -7 -6 10 -1 Z" opacity="0.75" />
      </g>
    </svg>
  );
}

/** The hand-lettered "Play · Learn · Grow" burst from the banner. */
export function PlayLearnGrow({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 130 120" aria-hidden focusable="false">
      {/* The burst behind the words. */}
      <g stroke="#fbbf24" strokeWidth="4" strokeLinecap="round">
        <line x1="12" y1="26" x2="2" y2="18" />
        <line x1="20" y1="12" x2="16" y2="2" />
        <line x1="112" y1="24" x2="124" y2="16" />
        <line x1="104" y1="12" x2="108" y2="2" />
        <line x1="14" y1="92" x2="4" y2="100" />
        <line x1="114" y1="92" x2="126" y2="100" />
      </g>
      <ellipse cx="65" cy="58" rx="54" ry="42" fill="#ffffff" opacity="0.9" />
      <g
        fontFamily="inherit"
        fontWeight="800"
        fontSize="21"
        fill="#4c1d95"
        textAnchor="middle"
        transform="rotate(-7 65 58)"
      >
        <text x="65" y="42">Play</text>
        <text x="65" y="64">Learn</text>
        <text x="65" y="86">Grow</text>
      </g>
    </svg>
  );
}

/**
 * A loose stack of game tokens for the banner, one per category: memory,
 * logic, words and numbers.
 *
 * It stands where the mascot used to. Four tiles rather than one object
 * because the point of the page is that there is a range of games, and the
 * colours are the same four the category headings use, so the banner and the
 * grid below it are visibly the same family.
 */
export function GameTokensArt({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden focusable="false">
      <defs>
        <linearGradient id="gt-violet" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="gt-sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="gt-fuchsia" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#a21caf" />
        </linearGradient>
        <linearGradient id="gt-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* A soft light under the stack, so it sits on the scene. */}
      <ellipse cx="100" cy="166" rx="54" ry="9" fill="#0f172a" opacity="0.1" />

      {/* Numbers, at the back. */}
      <g transform="rotate(-13 62 118)">
        <rect x="26" y="82" width="72" height="72" rx="20" fill="url(#gt-amber)" />
        <rect x="34" y="90" width="56" height="56" rx="15" fill="#ffffff" opacity="0.22" />
        <text x="62" y="132" textAnchor="middle" fontSize="38" fontWeight="800" fill="#ffffff">
          7
        </text>
      </g>

      {/* Words. */}
      <g transform="rotate(11 140 116)">
        <rect x="106" y="80" width="72" height="72" rx="20" fill="url(#gt-fuchsia)" />
        <rect x="114" y="88" width="56" height="56" rx="15" fill="#ffffff" opacity="0.22" />
        <text x="142" y="130" textAnchor="middle" fontSize="30" fontWeight="800" fill="#ffffff">
          Aa
        </text>
      </g>

      {/* Logic, in front on the left. */}
      <g transform="rotate(-7 74 62)">
        <rect x="38" y="26" width="72" height="72" rx="20" fill="url(#gt-sky)" />
        <rect x="46" y="34" width="56" height="56" rx="15" fill="#ffffff" opacity="0.22" />
        {/* A puzzle piece. */}
        <path
          d="M60 50 h12 a7 7 0 0 1 14 0 h12 v12 a7 7 0 0 0 0 14 v12 h-12 a7 7 0 0 0 -14 0 h-12 v-12 a7 7 0 0 1 0 -14 Z"
          fill="#ffffff"
          opacity="0.95"
        />
      </g>

      {/* Memory, front and centre. */}
      <g transform="rotate(8 132 52)">
        <rect x="98" y="16" width="68" height="68" rx="19" fill="url(#gt-violet)" />
        <rect x="106" y="24" width="52" height="52" rx="14" fill="#ffffff" opacity="0.22" />
        {/* Two cards, face down and overlapping. A brain drawn at fifty pixels
            reads as a white blob; a pair of cards reads instantly, and it is
            what the memory games actually look like. */}
        <rect x="110" y="34" width="26" height="34" rx="6" fill="#ffffff" opacity="0.75" transform="rotate(-12 123 51)" />
        <rect x="130" y="32" width="26" height="34" rx="6" fill="#ffffff" opacity="0.98" transform="rotate(9 143 49)" />
      </g>

      {/* Sparkles, the same language as the cards. */}
      <g fill="#fbbf24">
        <path d="M22 44 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1 Z" />
        <path d="M176 40 l3 6 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" opacity="0.85" />
        <path d="M186 148 l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1 Z" opacity="0.7" />
      </g>
    </svg>
  );
}
