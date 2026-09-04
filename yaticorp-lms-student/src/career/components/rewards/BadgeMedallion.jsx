import { Lock } from 'lucide-react';
import './badge.css';

const HEX = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

/**
 * 🎖️ One badge, as a medallion rather than a square tile.
 *
 * An earned badge is alive: it drifts, its halo breathes, a band of light
 * crosses it every few seconds, and it tilts toward you on hover. Each of
 * those is offset by the badge's position in the grid, so a row of them
 * shimmers in turn instead of flashing together.
 *
 * A locked one does none of it. It stays grey, still and padlocked — the
 * colour and the movement are the reward, and a locked badge that looked as
 * good as an earned one would make earning it pointless.
 *
 * Size is set by the caller so the same medallion works at 76px in a grid and
 * smaller elsewhere.
 */
export default function BadgeMedallion({ icon: Icon, tier, unlocked, size = 72, delay = 0 }) {
  // Negative delays start each loop already part-way through, so the row is
  // staggered from the first frame rather than waiting to fall out of step.
  const offset = { animationDelay: `${-delay * 3}s` };

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${
        unlocked ? 'yatiBadge-float' : ''
      }`}
      style={{ width: size, height: size, ...(unlocked ? offset : null) }}
    >
      {/* Halo, only on earned badges. */}
      {unlocked && (
        <span
          aria-hidden
          className={`yatiBadge-halo absolute inset-0 rounded-full blur-lg ${tier.halo}`}
          style={offset}
        />
      )}

      {/* Ribbon tails behind the medal, so it hangs like a medal rather than
          sitting like a sticker. Locked badges get none: nothing to hang. */}
      {unlocked && (
        <>
          <span
            aria-hidden
            className={`absolute left-[26%] top-[54%] h-[46%] w-[22%] origin-top -rotate-[18deg] ${tier.inner}`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
          />
          <span
            aria-hidden
            className={`absolute right-[26%] top-[54%] h-[46%] w-[22%] origin-top rotate-[18deg] ${tier.inner}`}
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)' }}
          />
        </>
      )}

      {/* Outer hex in the tier colour, a pale rim, then the inner hex — three
          layers so the medallion reads as bevelled metal rather than one flat
          shape. */}
      <span
        className={`yatiBadge-tilt relative flex h-full w-full items-center justify-center drop-shadow-md ${
          unlocked ? tier.outer : 'bg-line-200'
        }`}
        style={{ clipPath: HEX }}
      >
        <span
          className={`flex items-center justify-center ${unlocked ? 'bg-white/45' : 'bg-surface-50'}`}
          style={{ clipPath: HEX, width: '88%', height: '88%' }}
        >
          <span
            className={`relative flex items-center justify-center overflow-hidden ${
              unlocked ? tier.inner : 'bg-surface-100'
            }`}
            style={{ clipPath: HEX, width: '90%', height: '90%' }}
          >
            {/* A soft highlight in the top-left, the way light lands on a curved face. */}
            {unlocked && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 22%, rgba(255,255,255,0.55), rgba(255,255,255,0) 55%)'
                }}
              />
            )}
            {unlocked && <span aria-hidden className="yatiBadge-shine" style={offset} />}

            {unlocked ? (
              <Icon
                className="animate-badge-burst relative text-white drop-shadow-sm"
                style={{ width: size * 0.36, height: size * 0.36, animationDelay: `${delay}s` }}
                strokeWidth={2.4}
              />
            ) : (
              <Lock className="text-ink-300" style={{ width: size * 0.3, height: size * 0.3 }} />
            )}
          </span>
        </span>
      </span>

      {/* Three sparks, offset like everything else, so a row of medals
          glints in turn. */}
      {unlocked && (
        <>
          <span aria-hidden className="yatiBadge-spark absolute -top-1 right-[14%] text-amber-300" style={offset}>✦</span>
          <span aria-hidden className="yatiBadge-spark absolute top-[38%] -left-1.5 text-[0.55rem] text-white" style={{ animationDelay: `${-delay * 3 - 1.2}s` }}>✦</span>
          <span aria-hidden className="yatiBadge-spark absolute -right-1 bottom-[30%] text-[0.5rem] text-amber-200" style={{ animationDelay: `${-delay * 3 - 2.1}s` }}>✦</span>
        </>
      )}
    </span>
  );
}
