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

      {/* Outer hex in the tier colour, then an inner hex so the medallion has
          a rim rather than reading as one flat shape. */}
      <span
        className={`yatiBadge-tilt relative flex h-full w-full items-center justify-center ${
          unlocked ? tier.outer : 'bg-line-200'
        }`}
        style={{ clipPath: HEX }}
      >
        <span
          className={`relative flex items-center justify-center overflow-hidden ${
            unlocked ? tier.inner : 'bg-surface-100'
          }`}
          style={{ clipPath: HEX, width: '82%', height: '82%' }}
        >
          {unlocked && <span aria-hidden className="yatiBadge-shine" style={offset} />}

          {unlocked ? (
            <Icon
              className="animate-badge-burst relative text-white"
              style={{ width: size * 0.38, height: size * 0.38, animationDelay: `${delay}s` }}
            />
          ) : (
            <Lock className="text-ink-300" style={{ width: size * 0.32, height: size * 0.32 }} />
          )}
        </span>
      </span>
    </span>
  );
}
