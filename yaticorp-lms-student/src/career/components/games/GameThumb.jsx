import { THUMBS as THUMBS_D } from './thumbs/d';
import { THUMBS as THUMBS_H } from './thumbs/h';
import { THUMBS as THUMBS_G } from './thumbs/g';
import { THUMBS as THUMBS_F } from './thumbs/f';
import { THUMBS as THUMBS_E } from './thumbs/e';
import { THUMBS as THUMBS_C } from './thumbs/c';
import { THUMBS as THUMBS_B } from './thumbs/b';
import { THUMBS as THUMBS_A } from './thumbs/a';
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
  'grid-recall': () => (
    <TileGrid
      cells={[
        { x: 6, y: 6, w: 13, h: 13, r: 3, bg: '#8b5cf6' }, { x: 21.5, y: 6, w: 13, h: 13, r: 3, bg: '#ede9fe' }, { x: 37, y: 6, w: 13, h: 13, r: 3, bg: '#8b5cf6' },
        { x: 6, y: 21.5, w: 13, h: 13, r: 3, bg: '#ede9fe' }, { x: 21.5, y: 21.5, w: 13, h: 13, r: 3, bg: '#c4b5fd' }, { x: 37, y: 21.5, w: 13, h: 13, r: 3, bg: '#ede9fe' },
        { x: 6, y: 37, w: 13, h: 13, r: 3, bg: '#8b5cf6' }, { x: 21.5, y: 37, w: 13, h: 13, r: 3, bg: '#ede9fe' }, { x: 37, y: 37, w: 13, h: 13, r: 3, bg: '#ede9fe' }
      ]}
    />
  ),
  'tic-tac-toe': () => (
    <>
      <path d="M20 8 v40 M36 8 v40 M8 20 h40 M8 36 h40" stroke="#bae6fd" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M10 10 l8 8 M18 10 l-8 8" stroke="#0284c7" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="28" cy="28" r="4.5" stroke="#f43f5e" strokeWidth="3.5" fill="none" />
      <path d="M38 38 l8 8 M46 38 l-8 8" stroke="#0284c7" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="44" cy="12" r="4.5" stroke="#f43f5e" strokeWidth="3.5" fill="none" />
    </>
  ),
  'mini-sudoku': () => (
    <TileGrid
      cells={[
        { x: 6, y: 6, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '1', size: 8 }, { x: 17, y: 6, w: 10, h: 10, r: 2, bg: '#ffffff', fg: '#1d4ed8', label: '', size: 8 },
        { x: 29, y: 6, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '3', size: 8 }, { x: 40, y: 6, w: 10, h: 10, r: 2, bg: '#2563eb', fg: '#ffffff', label: '4', size: 8 },
        { x: 6, y: 17, w: 10, h: 10, r: 2, bg: '#ffffff', fg: '#1d4ed8', label: '', size: 8 }, { x: 17, y: 17, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '4', size: 8 },
        { x: 29, y: 17, w: 10, h: 10, r: 2, bg: '#2563eb', fg: '#ffffff', label: '1', size: 8 }, { x: 40, y: 17, w: 10, h: 10, r: 2, bg: '#ffffff', fg: '#1d4ed8', label: '', size: 8 },
        { x: 6, y: 29, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '2', size: 8 }, { x: 17, y: 29, w: 10, h: 10, r: 2, bg: '#ffffff', fg: '#1d4ed8', label: '', size: 8 },
        { x: 29, y: 29, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '4', size: 8 }, { x: 40, y: 29, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '3', size: 8 },
        { x: 6, y: 40, w: 10, h: 10, r: 2, bg: '#2563eb', fg: '#ffffff', label: '4', size: 8 }, { x: 17, y: 40, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '3', size: 8 },
        { x: 29, y: 40, w: 10, h: 10, r: 2, bg: '#ffffff', fg: '#1d4ed8', label: '', size: 8 }, { x: 40, y: 40, w: 10, h: 10, r: 2, bg: '#dbeafe', fg: '#1d4ed8', label: '1', size: 8 }
      ]}
    />
  ),
  'typing-sprint': () => (
    <>
      <rect {...tile(6, 14, '#fdf4ff', 44, 28, 8)} />
      <rect {...tile(10, 18, '#f0abfc', 8, 6, 2)} /><rect {...tile(20, 18, '#f0abfc', 8, 6, 2)} /><rect {...tile(30, 18, '#f0abfc', 8, 6, 2)} /><rect {...tile(40, 18, '#f0abfc', 6, 6, 2)} />
      <rect {...tile(12, 26, '#e879f9', 8, 6, 2)} /><rect {...tile(22, 26, '#e879f9', 8, 6, 2)} /><rect {...tile(32, 26, '#e879f9', 8, 6, 2)} />
      <rect {...tile(14, 34, '#c026d3', 28, 5, 2)} />
    </>
  ),
  'binary-blitz': () => (
    <>
      <rect {...tile(6, 8, '#d1fae5', 44, 40, 8)} />
      <text x="28" y="26" textAnchor="middle" fontFamily="ui-monospace, monospace" fontSize="12" fontWeight="800" fill="#047857">
        1011
      </text>
      <path d="M22 32 h12 m-3 -3 l3 3 l-3 3" stroke="#10b981" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <text x="28" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#065f46">
        11
      </text>
    </>
  ),
  // New 2026-11-13, for the age zones.
  'shadow-detective': () => (
    <>
      <circle cx="20" cy="28" r="14" fill="#1f2937" />
      <path d="M12 18 l4 -8 l4 8z M24 18 l4 -8 l4 8z" fill="#1f2937" />
      <rect {...tile(36, 14, '#fde68a', 16, 16, 4)} />
      <text x="44" y="26" textAnchor="middle" fontSize="11">🐱</text>
      <rect {...tile(36, 34, '#e0e7ff', 16, 16, 4)} />
      <text x="44" y="46" textAnchor="middle" fontSize="11">🐶</text>
    </>
  ),
  'treasure-path': () => (
    <>
      {[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} {...tile(6 + c * 11, 6 + r * 11, (r + c) % 2 ? '#bbf7d0' : '#dcfce7', 10, 10, 2)} />))}
      <text x="11" y="15" textAnchor="middle" fontSize="8">🧭</text>
      <text x="45" y="48" textAnchor="middle" fontSize="8">💰</text>
      <path d="M11 17 v22 h28" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeDasharray="3 3" strokeLinecap="round" />
    </>
  ),
  'logic-detective': () => (
    <>
      {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} {...tile(8 + c * 13, 8 + r * 13, '#e0f2fe', 12, 12, 2)} />))}
      <text x="14" y="18" textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="800">✓</text>
      <text x="27" y="18" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="800">✗</text>
      <text x="27" y="31" textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="800">✓</text>
      <circle cx="42" cy="40" r="8" fill="none" stroke="#0369a1" strokeWidth="3" />
      <path d="M48 46 l5 5" stroke="#0369a1" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'word-ladder': () => (
    <>
      <rect x="14" y="6" width="4" height="46" rx="2" fill="#92400e" />
      <rect x="38" y="6" width="4" height="46" rx="2" fill="#92400e" />
      {[['WARM', 10, '#fecdd3', '#be123c'], ['CARD', 23, '#bbf7d0', '#047857'], ['COLD', 36, '#ffffff', '#92400e']].map(([w, y, bg, fg]) => (
        <g key={w}>
          <rect x="11" y={y} width="34" height="10" rx="3" fill={bg} stroke="#d97706" strokeWidth="1" />
          <text x="28" y={y + 7.6} textAnchor="middle" fontSize="7" fontWeight="900" fill={fg}>{w}</text>
        </g>
      ))}
      <path d="M50 40 v-26 m-4 4 l4 -4 l4 4" stroke="#7c3aed" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </>
  ),
  'probability-lab': () => (
    <>
      <path d="M10 20 h16 l-2 26 h-12z" fill="#e0f2fe" stroke="#0284c7" strokeWidth="1.5" />
      {[[15, 30, '#ef4444'], [21, 34, '#3b82f6'], [16, 40, '#ef4444'], [21, 42, '#22c55e']].map(([x, y, c]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3" fill={c} />)}
      <rect {...tile(32, 22, '#ffffff', 18, 18, 4)} stroke="#0284c7" strokeWidth="1.5" />
      {[[37, 27], [45, 35], [41, 31]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="2" fill="#0284c7" />)}
      <text x="28" y="12" textAnchor="middle" fontSize="9" fontWeight="800" fill="#0369a1">½</text>
    </>
  ),
  'algorithm-builder': () => (
    <>
      <rect {...tile(8, 8, '#fde68a', 40, 9, 3)} />
      <rect {...tile(14, 20, '#a5b4fc', 34, 9, 3)} />
      <rect {...tile(14, 32, '#a5b4fc', 34, 9, 3)} />
      <rect {...tile(8, 44, '#86efac', 40, 9, 3)} />
      <path d="M11 17 v26" stroke="#b45309" strokeWidth="2" />
      <text x="28" y="15" textAnchor="middle" fontSize="6" fontWeight="800" fill="#92400e">REPEAT 3</text>
    </>
  ),
  // New 2026-11-12.
  'picture-logic': () => (
    <>
      {[[0,1,1,0],[1,1,1,1],[1,1,1,1],[0,1,1,0]].flatMap((row, r) => row.map((on, c) => (
        <rect key={`${r}-${c}`} {...tile(14 + c * 10, 14 + r * 10, on ? '#0ea5e9' : '#e0f2fe', 9, 9, 2)} />
      )))}
      <text x="8" y="22" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0369a1">2</text>
      <text x="8" y="32" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0369a1">4</text>
      <text x="23" y="10" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0369a1">2</text>
      <text x="33" y="10" textAnchor="middle" fontSize="7" fontWeight="800" fill="#0369a1">4</text>
    </>
  ),
  'tower-shift': () => (
    <>
      <rect {...tile(4, 46, '#a16207', 48, 5, 2)} />
      {[12, 28, 44].map((x) => <rect key={x} {...tile(x - 1.5, 16, '#ca8a04', 3, 30, 1.5)} />)}
      <rect {...tile(3, 39, '#6366f1', 18, 7, 3)} />
      <rect {...tile(5, 32, '#0ea5e9', 14, 7, 3)} />
      <rect {...tile(37, 39, '#f43f5e', 14, 7, 3)} />
      <rect {...tile(23, 39, '#10b981', 10, 7, 3)} />
    </>
  ),
  'number-forge': () => (
    <TileGrid
      cells={[
        { x: 15, y: 4, w: 26, h: 14, r: 4, bg: '#f59e0b', fg: '#ffffff', label: '24', size: 10 },
        { x: 4, y: 24, w: 14, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '6', size: 9 }, { x: 21, y: 24, w: 14, h: 13, r: 3, bg: '#fff7ed', fg: '#c2410c', label: '×', size: 10 }, { x: 38, y: 24, w: 14, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '4', size: 9 },
        { x: 4, y: 40, w: 14, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '3', size: 9 }, { x: 21, y: 40, w: 14, h: 13, r: 3, bg: '#fff7ed', fg: '#c2410c', label: '+', size: 10 }, { x: 38, y: 40, w: 14, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '9', size: 9 }
      ]}
    />
  ),
  'speed-sort': () => (
    <TileGrid
      cells={[
        { x: 6, y: 6, w: 13, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '7', size: 9 }, { x: 21.5, y: 6, w: 13, h: 13, r: 3, bg: '#f59e0b', fg: '#ffffff', label: '1', size: 9 }, { x: 37, y: 6, w: 13, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '4', size: 9 },
        { x: 6, y: 21.5, w: 13, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '9', size: 9 }, { x: 21.5, y: 21.5, w: 13, h: 13, r: 3, bg: '#f59e0b', fg: '#ffffff', label: '2', size: 9 }, { x: 37, y: 21.5, w: 13, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '6', size: 9 },
        { x: 6, y: 37, w: 13, h: 13, r: 3, bg: '#f59e0b', fg: '#ffffff', label: '3', size: 9 }, { x: 21.5, y: 37, w: 13, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '8', size: 9 }, { x: 37, y: 37, w: 13, h: 13, r: 3, bg: '#fde68a', fg: '#92400e', label: '5', size: 9 }
      ]}
    />
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
,

  /* ---- Added with the second wave of games ------------------------------ */

  // Digits with an arrow doubling back: the number, then the number reversed.
  'reverse-recall': () => (
    <>
      <TileGrid
        cells={[
          { x: 5, y: 8, bg: '#ede9fe', fg: '#6d28d9', label: '4', w: 14, h: 16, r: 4, size: 11 },
          { x: 21, y: 8, bg: '#ede9fe', fg: '#6d28d9', label: '7', w: 14, h: 16, r: 4, size: 11 },
          { x: 37, y: 8, bg: '#ede9fe', fg: '#6d28d9', label: '2', w: 14, h: 16, r: 4, size: 11 }
        ]}
      />
      <path d="M46 32 A 14 12 0 0 1 10 32" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 32 l5 -5 M10 32 l5 5" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <TileGrid
        cells={[
          { x: 5, y: 36, bg: '#c4b5fd', fg: '#3730a3', label: '2', w: 14, h: 16, r: 4, size: 11 },
          { x: 21, y: 36, bg: '#c4b5fd', fg: '#3730a3', label: '7', w: 14, h: 16, r: 4, size: 11 },
          { x: 37, y: 36, bg: '#c4b5fd', fg: '#3730a3', label: '4', w: 14, h: 16, r: 4, size: 11 }
        ]}
      />
    </>
  ),

  // A set behind a closed eye: it was there a moment ago.
  'seen-before': () => (
    <>
      <rect {...tile(5, 6, '#e0e7ff', 46, 20, 6)} />
      <circle cx="15" cy="16" r="4" fill="#6366f1" />
      <circle cx="28" cy="16" r="4" fill="#a5b4fc" />
      <circle cx="41" cy="16" r="4" fill="#818cf8" />
      <path d="M8 40 Q 28 26 48 40" fill="none" stroke="#4338ca" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="28" cy="38" r="5" fill="#4338ca" />
      <circle cx="29.5" cy="36.5" r="1.6" fill="#ffffff" />
    </>
  ),

  // A balance: one pan lower than the other.
  'scale-balance': () => (
    <>
      <rect {...tile(26, 12, '#0ea5e9', 4, 34, 2)} />
      <rect {...tile(8, 18, '#0284c7', 40, 4, 2)} />
      <rect {...tile(6, 24, '#bae6fd', 16, 12, 4)} />
      <rect {...tile(34, 30, '#7dd3fc', 16, 14, 4)} />
      <rect {...tile(18, 46, '#0369a1', 20, 4, 2)} />
    </>
  ),

  // A three by three grid with the last cell missing.
  'shape-matrix': () => (
    <>
      <TileGrid
        cells={[
          { x: 5, y: 5, bg: '#cffafe', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 21, y: 5, bg: '#a5f3fc', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 37, y: 5, bg: '#67e8f9', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 5, y: 21, bg: '#a5f3fc', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 21, y: 21, bg: '#67e8f9', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 37, y: 21, bg: '#22d3ee', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 5, y: 37, bg: '#67e8f9', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 },
          { x: 21, y: 37, bg: '#22d3ee', fg: '#0e7490', label: '', w: 14, h: 14, r: 4 }
        ]}
      />
      <rect x="37.5" y="37.5" width="13" height="13" rx="4" fill="none" stroke="#0891b2" strokeWidth="2" strokeDasharray="3 2" />
      <text x="44" y="48" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0891b2">?</text>
    </>
  ),

  // Two arrows pulling apart: opposites.
  'antonym-match': () => (
    <>
      <rect {...tile(4, 12, '#f5d0fe', 20, 14, 4)} />
      <rect {...tile(32, 12, '#e9d5ff', 20, 14, 4)} />
      <path d="M24 34 L6 34 M6 34 l6 -5 M6 34 l6 5" fill="none" stroke="#a21caf" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 34 L50 34 M50 34 l-6 -5 M50 34 l-6 5" fill="none" stroke="#7e22ce" strokeWidth="3" strokeLinecap="round" />
      <rect {...tile(24, 42, '#a21caf', 8, 8, 3)} />
    </>
  ),

  // A speech mark: a phrase that does not mean what it says.
  'idiom-sense': () => (
    <>
      <rect {...tile(5, 8, '#fce7f3', 46, 30, 8)} />
      <path d="M18 38 L18 48 L28 38 Z" fill="#fce7f3" />
      <text x="17" y="30" textAnchor="middle" fontSize="22" fontWeight="800" fill="#db2777">“</text>
      <text x="39" y="30" textAnchor="middle" fontSize="22" fontWeight="800" fill="#db2777">”</text>
    </>
  ),

  // Two tiles joining into a target.
  'number-bonds': () => (
    <>
      <TileGrid
        cells={[
          { x: 4, y: 8, bg: '#fef3c7', fg: '#b45309', label: '6', w: 18, h: 18, r: 5, size: 12 },
          { x: 34, y: 8, bg: '#fed7aa', fg: '#c2410c', label: '9', w: 18, h: 18, r: 5, size: 12 }
        ]}
      />
      <path d="M14 28 Q 28 42 42 28" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
      <rect {...tile(17, 34, '#f59e0b', 22, 18, 6)} />
      <text x="28" y="47" textAnchor="middle" fontSize="12" fontWeight="800" fill="#ffffff">15</text>
    </>
  ),

  // A number snapping up to the round one above it.
  'rounding-rush': () => (
    <>
      <text x="28" y="20" textAnchor="middle" fontSize="14" fontWeight="800" fill="#a16207">47</text>
      <path d="M28 24 L28 34 M28 24 l-5 6 M28 24 l5 6" fill="none" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
      <rect {...tile(12, 34, '#fde68a', 32, 16, 5)} />
      <text x="28" y="46" textAnchor="middle" fontSize="13" fontWeight="800" fill="#854d0e">50</text>
    </>
  ),
  'dot-count': () => (
    <>
      {[
        [10, 10, '#f43f5e'], [28, 10, '#0ea5e9'], [46, 10, '#f43f5e'],
        [10, 28, '#10b981'], [28, 28, '#f43f5e'], [46, 28, '#0ea5e9'],
        [10, 46, '#f43f5e'], [28, 46, '#10b981'], [46, 46, '#fbbf24']
      ].map(([x, y, fill]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="6.5" fill={fill} />
      ))}
    </>
  ),
  'match-back': () => (
    <>
      <rect {...tile(4, 18, '#c7d2fe', 22, 22, 6)} />
      <text x="15" y="34" textAnchor="middle" fontSize="14" fontWeight="800" fill="#3730a3">K</text>
      <rect {...tile(30, 18, '#a5b4fc', 22, 22, 6)} />
      <text x="41" y="34" textAnchor="middle" fontSize="14" fontWeight="800" fill="#312e81">K</text>
      <path d="M40 12 C 34 4, 22 4, 16 12" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
      <path d="M16 12 l-1 -6 M16 12 l6 -1" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'spin-match': () => (
    <>
      <rect {...tile(6, 6, '#38bdf8', 9, 9, 2)} />
      <rect {...tile(6, 17, '#38bdf8', 9, 9, 2)} />
      <rect {...tile(6, 28, '#38bdf8', 9, 9, 2)} />
      <rect {...tile(17, 28, '#38bdf8', 9, 9, 2)} />
      <path d="M26 24 a10 10 0 0 1 8 -8" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 16 l-5 -1 M34 16 l0 5" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" />
      <rect {...tile(30, 30, '#0284c7', 9, 9, 2)} />
      <rect {...tile(41, 30, '#0284c7', 9, 9, 2)} />
      <rect {...tile(41, 41, '#0284c7', 9, 9, 2)} />
      <rect {...tile(30, 41, '#0284c7', 9, 9, 2)} />
    </>
  ),
  'last-stone': () => (
    <>
      <circle cx="16" cy="40" r="7" fill="#94a3b8" />
      <circle cx="30" cy="42" r="7" fill="#64748b" />
      <circle cx="44" cy="40" r="7" fill="#94a3b8" />
      <circle cx="23" cy="28" r="7" fill="#cbd5e1" />
      <circle cx="37" cy="28" r="7" fill="#94a3b8" />
      <circle cx="30" cy="15" r="7" fill="#fbbf24" />
      <circle cx="28" cy="13" r="2.5" fill="#fff" opacity="0.7" />
    </>
  ),
  'tense-pick': () => (
    <>
      <rect {...tile(6, 8, '#fae8ff', 44, 16, 5)} />
      <text x="28" y="20" textAnchor="middle" fontSize="11" fontWeight="800" fill="#a21caf">GO</text>
      <path d="M28 27 v6 M28 33 l-4 -4 M28 33 l4 -4" fill="none" stroke="#c026d3" strokeWidth="2.5" strokeLinecap="round" />
      <rect {...tile(6, 36, '#f0abfc', 44, 16, 5)} />
      <text x="28" y="48" textAnchor="middle" fontSize="11" fontWeight="800" fill="#701a75">WENT</text>
    </>
  ),
  'sound-alike': () => (
    <>
      <rect {...tile(4, 8, '#f5d0fe', 48, 16, 5)} />
      <text x="28" y="20" textAnchor="middle" fontSize="10" fontWeight="800" fill="#86198f">THEIR</text>
      <rect {...tile(4, 32, '#fae8ff', 48, 16, 5)} />
      <text x="28" y="44" textAnchor="middle" fontSize="10" fontWeight="800" fill="#a21caf">THERE</text>
      <path d="M22 27 h12" stroke="#d946ef" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 4" />
    </>
  ),
  'fraction-match': () => (
    <>
      <text x="15" y="24" textAnchor="middle" fontSize="13" fontWeight="800" fill="#c2410c">3</text>
      <rect x="8" y="27" width="14" height="2.5" rx="1" fill="#ea580c" />
      <text x="15" y="42" textAnchor="middle" fontSize="13" fontWeight="800" fill="#c2410c">4</text>
      <text x="28" y="34" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fb923c">=</text>
      <text x="41" y="24" textAnchor="middle" fontSize="13" fontWeight="800" fill="#9a3412">6</text>
      <rect x="34" y="27" width="14" height="2.5" rx="1" fill="#ea580c" />
      <text x="41" y="42" textAnchor="middle" fontSize="13" fontWeight="800" fill="#9a3412">8</text>
    </>
  ),
  'clock-read': () => (
    <>
      <circle cx="28" cy="28" r="22" fill="#fff7ed" stroke="#fdba74" strokeWidth="4" />
      <circle cx="28" cy="10" r="1.8" fill="#c2410c" />
      <circle cx="46" cy="28" r="1.8" fill="#c2410c" />
      <circle cx="28" cy="46" r="1.8" fill="#c2410c" />
      <circle cx="10" cy="28" r="1.8" fill="#c2410c" />
      <path d="M28 28 L28 16" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />
      <path d="M28 28 L39 34" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="28" r="2.5" fill="#7c2d12" />
    </>
  )
  ,
  // Group Brain's The Final Vault: a golden vault door.
  vault: () => (
    <>
      <circle cx="28" cy="28" r="20" fill="#78350f" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx="28" cy="28" r="13" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
      <circle cx="28" cy="28" r="5" fill="#fbbf24" />
      {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M28 28 L28 17" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" transform={`rotate(${a} 28 28)`} />)}
    </>
  ),
  // Group Brain's Chess: a king standing on a checkered board.
  chess: () => (
    <>
      <defs><clipPath id="thumb-chess-board"><rect x="6" y="6" width="44" height="44" rx="11" /></clipPath></defs>
      <g clipPath="url(#thumb-chess-board)">
        {[0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={6 + c * 11} y={6 + r * 11} width="11" height="11" fill={(r + c) % 2 ? '#818cf8' : '#e0e7ff'} />
        )))}
      </g>
      <ellipse cx="28" cy="46" rx="11" ry="2.5" fill="#1e1b4b" opacity="0.25" />
      <g fill="#312e81" stroke="#ffffff" strokeWidth="1.4" strokeLinejoin="round">
        <rect x="18" y="40" width="20" height="5" rx="2.5" />
        <rect x="20.5" y="36" width="15" height="4" rx="1.5" />
        <path d="M22.5 36 L24.5 25 H31.5 L33.5 36 Z" />
        <circle cx="28" cy="22" r="4.5" />
        <rect x="26.8" y="10.5" width="2.4" height="8" rx="1" />
        <rect x="24.2" y="12.8" width="7.6" height="2.4" rx="1" />
      </g>
    </>
  )
};

export default function GameThumb({ id, className = '' }) {
  const draw = THUMBS[id] || THUMBS_D[id] || THUMBS_H[id] || THUMBS_G[id] || THUMBS_F[id] || THUMBS_E[id] || THUMBS_C[id] || THUMBS_B[id] || THUMBS_A[id];
  return (
    <svg viewBox="0 0 56 56" className={className} aria-hidden>
      {draw ? draw() : <rect {...tile(8, 8, '#e2e8f0', 40, 40, 10)} />}
    </svg>
  );
}
