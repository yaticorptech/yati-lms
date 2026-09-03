/*
 * A small illustration for each game, in place of one repeated category icon.
 *
 * The reference gives every card its own picture — number tiles for the recall
 * game, a padlock for the code breaker, W-O-R-D blocks for the scramble — so a
 * student can find a game by its shape before reading a word of it. Twenty
 * icons of the same brain would tell them nothing.
 *
 * All drawn on one 56×56 grid so they sit identically in the card.
 */

const tile = (x, y, fill, w = 22, h = 22, r = 6) => ({ x, y, width: w, height: h, rx: r, fill });

/** Small helper for the several thumbs that are just a grid of labelled tiles. */
function TileGrid({ cells }) {
  return (
    <>
      {cells.map((c, i) => (
        <g key={i}>
          <rect {...tile(c.x, c.y, c.bg, c.w, c.h, c.r)} />
          {c.label && (
            <text
              x={c.x + (c.w || 22) / 2}
              y={c.y + (c.h || 22) / 2 + 5}
              textAnchor="middle"
              fontSize={c.size || 14}
              fontWeight="800"
              fill={c.fg}
            >
              {c.label}
            </text>
          )}
        </g>
      ))}
    </>
  );
}

const THUMBS = {
  'memory-match': () => (
    <>
      <path d="M18 14 a10 10 0 0 0 -8 16 a9 9 0 0 0 8 12 v-28z" fill="#c084fc" />
      <path d="M20 14 a10 10 0 0 1 8 16 a9 9 0 0 1 -8 12 z" fill="#a855f7" />
      <path d="M36 14 a10 10 0 0 1 8 16 a9 9 0 0 1 -8 12 v-28z" fill="#f472b6" />
      <path d="M34 14 a10 10 0 0 0 -8 16 a9 9 0 0 0 8 12 z" fill="#ec4899" />
      <circle cx="27" cy="27" r="3" fill="#fff" opacity="0.7" />
    </>
  ),
  'sequence-recall': () => (
    <TileGrid
      cells={[
        { x: 6, y: 6, bg: '#ddd6fe', fg: '#6d28d9', label: '▲' },
        { x: 30, y: 6, bg: '#fef08a', fg: '#a16207', label: '★' },
        { x: 6, y: 30, bg: '#fbcfe8', fg: '#be185d', label: '●' },
        { x: 30, y: 30, bg: '#bfdbfe', fg: '#1d4ed8', label: '■' }
      ]}
    />
  ),
  'number-recall': () => (
    <TileGrid
      cells={[
        { x: 6, y: 6, bg: '#dcfce7', fg: '#15803d', label: '7' },
        { x: 30, y: 6, bg: '#dbeafe', fg: '#1d4ed8', label: '4' },
        { x: 6, y: 30, bg: '#fee2e2', fg: '#b91c1c', label: '2' },
        { x: 30, y: 30, bg: '#ede9fe', fg: '#6d28d9', label: '9' }
      ]}
    />
  ),
  'colour-match': () => (
    <>
      <rect {...tile(4, 10, '#fee2e2', 48, 16, 5)} />
      <text x="28" y="22" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2563eb">
        RED
      </text>
      <rect {...tile(4, 32, '#dbeafe', 48, 16, 5)} />
      <text x="28" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#16a34a">
        BLUE
      </text>
    </>
  ),
  'spot-the-change': () => (
    <TileGrid
      cells={[
        { x: 5, y: 5, bg: '#c4b5fd', w: 14, h: 14, r: 4 },
        { x: 21, y: 5, bg: '#a5b4fc', w: 14, h: 14, r: 4 },
        { x: 37, y: 5, bg: '#c4b5fd', w: 14, h: 14, r: 4 },
        { x: 5, y: 21, bg: '#a5b4fc', w: 14, h: 14, r: 4 },
        { x: 21, y: 21, bg: '#f472b6', w: 14, h: 14, r: 4 },
        { x: 37, y: 21, bg: '#c4b5fd', w: 14, h: 14, r: 4 },
        { x: 5, y: 37, bg: '#c4b5fd', w: 14, h: 14, r: 4 },
        { x: 21, y: 37, bg: '#a5b4fc', w: 14, h: 14, r: 4 },
        { x: 37, y: 37, bg: '#a5b4fc', w: 14, h: 14, r: 4 }
      ]}
    />
  ),
  'code-breaker': () => (
    <>
      <path d="M18 24 v-5 a10 10 0 0 1 20 0 v5" fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinecap="round" />
      <rect {...tile(12, 24, '#60a5fa', 32, 24, 7)} />
      <text x="28" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill="#fff">
        ****
      </text>
    </>
  ),
  'next-in-sequence': () => (
    <TileGrid
      cells={[
        { x: 3, y: 20, bg: '#dbeafe', fg: '#1d4ed8', label: '2', w: 15, h: 16, r: 4, size: 11 },
        { x: 20, y: 20, bg: '#dbeafe', fg: '#1d4ed8', label: '4', w: 15, h: 16, r: 4, size: 11 },
        { x: 37, y: 20, bg: '#bfdbfe', fg: '#1d4ed8', label: '8', w: 15, h: 16, r: 4, size: 11 },
        { x: 20, y: 38, bg: '#fde68a', fg: '#b45309', label: '?', w: 15, h: 16, r: 4, size: 11 }
      ]}
    />
  ),
  'odd-one-out': () => (
    <>
      <circle cx="15" cy="16" r="9" fill="#60a5fa" />
      <circle cx="41" cy="16" r="9" fill="#f87171" />
      <path d="M15 30 l9 15 h-18z" fill="#34d399" />
      <path d="M41 30 l2.8 6.4 6.9 0.7 -5.2 4.6 1.5 6.8 -6 -3.5 -6 3.5 1.5 -6.8 -5.2 -4.6 6.9 -0.7z" fill="#fbbf24" />
    </>
  ),
  deduction: () => (
    <>
      <rect {...tile(6, 8, '#dbeafe', 44, 11, 4)} />
      <rect {...tile(6, 23, '#dbeafe', 44, 11, 4)} />
      <path d="M28 36 l0 6 m-4 -3 l4 4 4 -4" stroke="#1d4ed8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect {...tile(10, 43, '#1d4ed8', 36, 9, 4)} />
    </>
  ),
  'lights-out': () => (
    <TileGrid
      cells={[
        { x: 5, y: 5, bg: '#fbbf24', w: 14, h: 14, r: 4 },
        { x: 21, y: 5, bg: '#e2e8f0', w: 14, h: 14, r: 4 },
        { x: 37, y: 5, bg: '#fbbf24', w: 14, h: 14, r: 4 },
        { x: 5, y: 21, bg: '#e2e8f0', w: 14, h: 14, r: 4 },
        { x: 21, y: 21, bg: '#fbbf24', w: 14, h: 14, r: 4 },
        { x: 37, y: 21, bg: '#e2e8f0', w: 14, h: 14, r: 4 },
        { x: 5, y: 37, bg: '#fbbf24', w: 14, h: 14, r: 4 },
        { x: 21, y: 37, bg: '#e2e8f0', w: 14, h: 14, r: 4 },
        { x: 37, y: 37, bg: '#e2e8f0', w: 14, h: 14, r: 4 }
      ]}
    />
  ),
  'word-scramble': () => (
    <TileGrid
      cells={[
        { x: 2, y: 18, bg: '#fce7f3', fg: '#be185d', label: 'W', w: 12, h: 20, r: 4, size: 10 },
        { x: 16, y: 18, bg: '#f3e8ff', fg: '#7e22ce', label: 'O', w: 12, h: 20, r: 4, size: 10 },
        { x: 30, y: 18, bg: '#fce7f3', fg: '#be185d', label: 'R', w: 12, h: 20, r: 4, size: 10 },
        { x: 44, y: 18, bg: '#f3e8ff', fg: '#7e22ce', label: 'D', w: 12, h: 20, r: 4, size: 10 }
      ]}
    />
  ),
  'synonym-match': () => (
    <>
      <path d="M6 12 h26 a5 5 0 0 1 5 5 v10 a5 5 0 0 1 -5 5 h-16 l-6 6 v-6 h-4 a5 5 0 0 1 -5 -5 v-10 a5 5 0 0 1 5 -5z" fill="#f9a8d4" />
      <path d="M26 26 h24 a5 5 0 0 1 5 5 v9 a5 5 0 0 1 -5 5 h-4 v5 l-6 -5 h-14 a5 5 0 0 1 -5 -5 v-9 a5 5 0 0 1 5 -5z" fill="#ec4899" />
    </>
  ),
  'sentence-gap': () => (
    <>
      <rect {...tile(4, 12, '#fdf2f8', 48, 32, 6)} />
      <rect {...tile(9, 19, '#fbcfe8', 16, 4, 2)} />
      <rect {...tile(28, 19, '#fbcfe8', 18, 4, 2)} />
      <rect {...tile(9, 28, '#fbcfe8', 12, 4, 2)} />
      <rect {...tile(24, 27, '#ec4899', 22, 6, 3)} />
      <rect {...tile(9, 37, '#fbcfe8', 26, 4, 2)} />
    </>
  ),
  'spelling-fix': () => (
    <>
      <rect {...tile(4, 14, '#fee2e2', 48, 12, 4)} />
      <path d="M12 20 l4 4 8 -8" stroke="#dc2626" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
      <text x="28" y="24" textAnchor="middle" fontSize="10" fontWeight="800" fill="#b91c1c">
        neccesary
      </text>
      <rect {...tile(4, 30, '#dcfce7', 48, 12, 4)} />
      <text x="24" y="40" textAnchor="middle" fontSize="10" fontWeight="800" fill="#15803d">
        necessary
      </text>
      <path d="M44 34 l3 4 5 -7" stroke="#15803d" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'word-roots': () => (
    <>
      <rect {...tile(6, 16, '#ede9fe', 24, 18, 5)} />
      <text x="18" y="29" textAnchor="middle" fontSize="10" fontWeight="800" fill="#6d28d9">
        RE-
      </text>
      <path d="M34 34 c-6 -3 -7 -11 -1 -14 c4 -2 8 3 6 8z" fill="#34d399" />
      <path d="M36 34 c6 -4 6 -12 0 -14 c-4 -2 -7 4 -4 9z" fill="#10b981" />
      <rect {...tile(30, 36, '#a78bfa', 14, 10, 3)} />
    </>
  ),
  'math-sprint': () => (
    <TileGrid
      cells={[
        { x: 6, y: 6, bg: '#fef3c7', fg: '#b45309', label: '+' },
        { x: 30, y: 6, bg: '#ffedd5', fg: '#c2410c', label: '−' },
        { x: 6, y: 30, bg: '#ffedd5', fg: '#c2410c', label: '×' },
        { x: 30, y: 30, bg: '#fef3c7', fg: '#b45309', label: '÷' }
      ]}
    />
  ),
  'quick-compare': () => (
    <>
      <rect {...tile(4, 14, '#fed7aa', 18, 28, 5)} />
      <rect {...tile(34, 20, '#fdba74', 18, 22, 5)} />
      <text x="28" y="34" textAnchor="middle" fontSize="16" fontWeight="800" fill="#c2410c">
        &gt;
      </text>
    </>
  ),
  'missing-operator': () => (
    <>
      <text x="10" y="34" textAnchor="middle" fontSize="15" fontWeight="800" fill="#9a3412">
        6
      </text>
      <rect {...tile(17, 18, '#fde68a', 18, 18, 5)} />
      <text x="26" y="32" textAnchor="middle" fontSize="14" fontWeight="800" fill="#b45309">
        ?
      </text>
      <text x="42" y="34" textAnchor="middle" fontSize="15" fontWeight="800" fill="#9a3412">
        3
      </text>
      <rect {...tile(14, 42, '#fed7aa', 28, 5, 2.5)} />
    </>
  ),
  'percent-snap': () => (
    <>
      <circle cx="28" cy="28" r="20" fill="#d9f99d" />
      <circle cx="28" cy="28" r="20" fill="none" stroke="#65a30d" strokeWidth="4" strokeDasharray="80 45" transform="rotate(-90 28 28)" />
      <text x="28" y="34" textAnchor="middle" fontSize="17" fontWeight="800" fill="#3f6212">
        %
      </text>
    </>
  ),
  'running-total': () => (
    <>
      <rect {...tile(8, 6, '#d1fae5', 40, 12, 4)} />
      <text x="28" y="15" textAnchor="middle" fontSize="10" fontWeight="800" fill="#047857">
        + 5
      </text>
      <rect {...tile(8, 22, '#a7f3d0', 40, 12, 4)} />
      <text x="28" y="31" textAnchor="middle" fontSize="10" fontWeight="800" fill="#047857">
        + 3
      </text>
      <rect {...tile(8, 38, '#059669', 40, 13, 4)} />
      <text x="28" y="48" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
        = 8
      </text>
    </>
  )
};

export default function GameThumb({ id, className = '' }) {
  const draw = THUMBS[id];
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden>
      {draw ? draw() : <rect {...tile(8, 8, '#e2e8f0', 40, 40, 10)} />}
    </svg>
  );
}
