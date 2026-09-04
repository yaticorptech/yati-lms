import { useId } from 'react';
import './AstronautLoader.css';

/**
 * 🚀 The running astronaut shown while a page is on its way.
 *
 * Original artwork, drawn from primitives: a navy night disc, a few twinkling
 * stars, and a suited figure running on the spot. Each limb is its own group
 * rotating about the joint it hangs from, so the run reads as a stride rather
 * than a wobble.
 *
 * Every gradient id is namespaced with useId(). Two of these can be on screen
 * at once — a route fallback inside a layout that is itself still resolving —
 * and duplicate ids would let the second instance steal the first one's fills,
 * which is exactly how the sidebar astronaut once lost its suit.
 *
 * Announces itself as a live region so a screen reader says "Loading" instead
 * of silently waiting; the drawing itself is decorative and hidden from them.
 */
export default function AstronautLoader({ label = 'Loading…', size = 176, fullScreen = false }) {
  const uid = useId();
  const suit = `suit-${uid}`;
  const visor = `visor-${uid}`;
  const disc = `disc-${uid}`;

  const art = (
    <div className="flex flex-col items-center gap-5">
      <svg
        aria-hidden
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="shrink-0"
      >
        <defs>
          <radialGradient id={disc} cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#1b2a6b" />
            <stop offset="100%" stopColor="#0a1236" />
          </radialGradient>
          <linearGradient id={suit} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#c9d6f7" />
          </linearGradient>
          <linearGradient id={visor} x1="20%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16307d" />
            <stop offset="100%" stopColor="#0a1236" />
          </linearGradient>
        </defs>

        <circle cx="100" cy="100" r="96" fill={`url(#${disc})`} />

        {/* Stars, placed clear of the figure so nothing twinkles behind it. */}
        <g fill="#e9eefc">
          <path className="yatiLoader-star" d="M42 58 l3.2 7.4 7.4 3.2 -7.4 3.2 -3.2 7.4 -3.2 -7.4 -7.4 -3.2 7.4 -3.2z" />
          <path className="yatiLoader-star" d="M160 48 l2.6 6 6 2.6 -6 2.6 -2.6 6 -2.6 -6 -6 -2.6 6 -2.6z" />
          <path className="yatiLoader-star" d="M34 128 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
          <path className="yatiLoader-star" d="M172 116 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2z" />
          <path className="yatiLoader-star" d="M70 34 l2 4.6 4.6 2 -4.6 2 -2 4.6 -2 -4.6 -4.6 -2 4.6 -2z" />
        </g>

        {/* Leaning into the run. The whole figure tips forward about the
            hips, which is what separates a runner from a floating figure. */}
        <g className="yatiLoader-body">
          <g transform="rotate(-8 100 110)">
            {/* Far side of the body, in a deeper tone and drawn first. The
                torso is deliberately narrow (34px): at 42 it swallowed both
                back limbs and the figure read as one-legged. */}
            <g className="yatiLoader-limb yatiLoader-armB">
              <rect x="58" y="87" width="42" height="15" rx="7.5" fill="#8ea3d8" />
              <circle cx="61" cy="94" r="9" fill="#a9bce8" />
            </g>
            <g className="yatiLoader-limb yatiLoader-legB">
              <rect x="91" y="118" width="17" height="52" rx="8.5" fill="#8ea3d8" />
              <rect x="78" y="161" width="30" height="14" rx="7" fill="#a9bce8" />
            </g>

            <rect x="66" y="84" width="20" height="36" rx="9" fill="#b6c6ec" />
            <rect x="83" y="78" width="34" height="50" rx="15" fill={`url(#${suit})`} />
            <rect x="98" y="95" width="13" height="11" rx="4" fill="#dbe4fa" />

            <circle cx="100" cy="55" r="27" fill={`url(#${suit})`} />
            <circle cx="106" cy="56" r="18" fill={`url(#${visor})`} />
            <path
              d="M95 46 a13 13 0 0 1 12 -6 a17 17 0 0 0 -14 11 z"
              fill="#5f7fe0"
              opacity="0.5"
            />
            <rect x="90" y="74" width="21" height="9" rx="4.5" fill="#e6ecfb" />

            {/* Near side, brightest, drawn last so it reads as closest. */}
            <g className="yatiLoader-limb yatiLoader-armA">
              <rect x="100" y="87" width="42" height="15" rx="7.5" fill={`url(#${suit})`} />
              <circle cx="139" cy="94" r="9" fill="#f2f6ff" />
            </g>
            <g className="yatiLoader-limb yatiLoader-legA">
              <rect x="93" y="118" width="18" height="54" rx="9" fill={`url(#${suit})`} />
              <rect x="93" y="163" width="31" height="15" rx="7.5" fill="#f2f6ff" />
            </g>
          </g>
        </g>

      </svg>

      {/* The travelling bar under the disc, as in the reference. */}
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
        <div className="yatiLoader-bar h-full w-1/2 rounded-full bg-indigo-500" />
      </div>
    </div>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        fullScreen
          ? 'flex min-h-screen w-full items-center justify-center bg-slate-50 p-6'
          : 'flex min-h-64 w-full items-center justify-center p-6'
      }
    >
      {art}
      <span className="sr-only">{label}</span>
    </div>
  );
}
