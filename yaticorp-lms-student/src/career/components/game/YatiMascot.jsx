import { useId } from 'react';

/**
 * 🤖 YATI — the Career Path companion.
 *
 * Original artwork, drawn as inline SVG for the same reasons as the summit and
 * the astronaut: about two kilobytes, no request, sharp at any size, and it
 * inherits the section's palette rather than being a flat PNG that stops
 * matching the moment the gradient behind it changes.
 *
 * Five expressions, because a mascot with one face stops being a character the
 * second time you see it. What changes between them is small and deliberate —
 * the eyes, the mouth, and where the arms are — so it always reads as the same
 * robot in a different mood:
 *
 *   idle        · resting, both arms down
 *   happy       · wide smile, one arm raised
 *   celebrating · eyes shut with joy, both arms up
 *   thinking    · looking up, one hand near the chin
 *   pointing    · one arm out toward whatever it is introducing
 *
 * Decorative in every placement, so it is hidden from assistive technology —
 * anything YATI is "saying" is real text next to it.
 */
export default function YatiMascot({ mood = 'idle', className = '', float = false }) {
  // Gradient ids must be unique per instance: two YATIs on one page would
  // otherwise share one set of defs, and `url(#…)` resolves to whichever the
  // document holds first — the trap that once left the sidebar astronaut with
  // no suit at all.
  const uid = useId().replace(/:/g, '');
  const id = (name) => `yati-${name}-${uid}`;

  const celebrating = mood === 'celebrating';
  const happy = mood === 'happy';
  const thinking = mood === 'thinking';
  const pointing = mood === 'pointing';

  return (
    <svg
      viewBox="0 0 200 220"
      aria-hidden="true"
      focusable="false"
      className={`${float ? 'fp-float-settle' : ''} ${className}`}
    >
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbd7f5" />
        </linearGradient>
        <linearGradient id={id('visor')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b2a7a" />
          <stop offset="55%" stopColor="#241a52" />
          <stop offset="100%" stopColor="#140e33" />
        </linearGradient>
        <linearGradient id={id('cape')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6c3bff" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The ground-glow it hovers over */}
      <ellipse cx="100" cy="200" rx="52" ry="12" fill={`url(#${id('glow')})`} />

      {/* Cape, so the silhouette is not a plain capsule */}
      <path
        d={pointing ? 'M62 96 L46 168 L100 152 Z' : 'M64 96 L52 166 L100 150 Z'}
        fill={`url(#${id('cape')})`}
        opacity="0.95"
      />
      <path d="M136 96 L150 164 L100 150 Z" fill={`url(#${id('cape')})`} opacity="0.75" />

      {/* Arms behind the torso, so the joints need no drawing */}
      {celebrating ? (
        <>
          <rect x="40" y="86" width="18" height="42" rx="9" fill={`url(#${id('body')})`} transform="rotate(28 49 107)" />
          <rect x="142" y="86" width="18" height="42" rx="9" fill={`url(#${id('body')})`} transform="rotate(-28 151 107)" />
        </>
      ) : happy || pointing ? (
        <>
          <rect x="44" y="112" width="18" height="40" rx="9" fill={`url(#${id('body')})`} />
          <rect
            x="138" y="94" width="18" height="44" rx="9" fill={`url(#${id('body')})`}
            transform={pointing ? 'rotate(52 147 116)' : 'rotate(-32 147 116)'}
          />
        </>
      ) : thinking ? (
        <>
          <rect x="44" y="112" width="18" height="40" rx="9" fill={`url(#${id('body')})`} />
          <rect x="132" y="96" width="18" height="36" rx="9" fill={`url(#${id('body')})`} transform="rotate(-58 141 114)" />
        </>
      ) : (
        <>
          <rect x="44" y="112" width="18" height="40" rx="9" fill={`url(#${id('body')})`} />
          <rect x="138" y="112" width="18" height="40" rx="9" fill={`url(#${id('body')})`} />
        </>
      )}

      {/* Torso */}
      <rect x="60" y="92" width="80" height="76" rx="26" fill={`url(#${id('body')})`} />
      {/* Chest emblem — the same shield the product uses for progress */}
      <path d="M100 112 L114 118 V131 C114 139 108 145 100 148 C92 145 86 139 86 131 V118 Z" fill="#6c3bff" />
      <path d="M94 130 l4.5 4.5 L109 124" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />

      {/* Head */}
      <rect x="52" y="26" width="96" height="72" rx="30" fill={`url(#${id('body')})`} />
      {/* Ears */}
      <rect x="42" y="52" width="12" height="24" rx="6" fill="#c4b5fd" />
      <rect x="146" y="52" width="12" height="24" rx="6" fill="#c4b5fd" />
      {/* Antenna */}
      <line x1="100" y1="26" x2="100" y2="12" stroke="#c4b5fd" strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="9" r="6" fill="#ffb800" />

      {/* Visor */}
      <rect x="63" y="38" width="74" height="48" rx="22" fill={`url(#${id('visor')})`} />
      {/* A single soft reflection, not a shine on every curve */}
      <ellipse cx="80" cy="50" rx="11" ry="6" fill="#ffffff" opacity="0.18" transform="rotate(-22 80 50)" />

      {/* Eyes */}
      {celebrating ? (
        <>
          <path d="M74 62 q9 -11 18 0" stroke="#7dd3fc" strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M108 62 q9 -11 18 0" stroke="#7dd3fc" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="83" cy={thinking ? 56 : 60} r="7.5" fill="#7dd3fc" />
          <circle cx="117" cy={thinking ? 56 : 60} r="7.5" fill="#7dd3fc" />
          <circle cx={thinking ? 85.5 : 85} cy={thinking ? 54 : 58} r="2.6" fill="#ffffff" />
          <circle cx={thinking ? 119.5 : 119} cy={thinking ? 54 : 58} r="2.6" fill="#ffffff" />
        </>
      )}

      {/* Mouth */}
      {thinking ? (
        <line x1="92" y1="76" x2="108" y2="76" stroke="#7dd3fc" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path
          d={celebrating || happy ? 'M88 72 q12 13 24 0' : 'M91 73 q9 8 18 0'}
          stroke="#7dd3fc"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* A thought dot when it is working something out */}
      {thinking && <circle cx="152" cy="34" r="4" fill="#c4b5fd" />}
    </svg>
  );
}
