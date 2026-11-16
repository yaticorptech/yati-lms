/* Group D (Rising Brains) card pictures, on the shared 56×56 grid (see GameThumb.jsx). */

/** A centred label (a plain helper, not a component, so the file only exports data). */
const label = (x, y, size, fill, text) => (
  <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="800" fill={fill}>{text}</text>
);

export const THUMBS = {
  'constraint-grid': () => (
    <>
      <rect x="2" y="2" width="52" height="52" rx="12" fill="#dcfce7" />
      <rect x="8" y="14" width="40" height="28" rx="4" fill="#fef3c7" />
      <path d="M4 24 H20 V36 H34 V24 H52" fill="none" stroke="#64748b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 24 H20 V36 H34 V24 H52" fill="none" stroke="#0ea5e9" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="48" y="14" textAnchor="middle" fontSize="9">🌻</text>
    </>
  ),
  'analogy-master': () => (
    <>
      <rect x="4" y="8" width="20" height="16" rx="5" fill="#ede9fe" />
      <rect x="32" y="8" width="20" height="16" rx="5" fill="#ddd6fe" />
      <rect x="4" y="32" width="20" height="16" rx="5" fill="#ede9fe" />
      <rect x="32" y="32" width="20" height="16" rx="5" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="3 2" />
      {label(14, 20, 10, '#6d28d9', 'A')}
      {label(42, 20, 10, '#6d28d9', 'B')}
      {label(14, 44, 10, '#6d28d9', 'C')}
      {label(42, 44, 12, '#c026d3', '?')}
      {label(28, 31, 10, '#a855f7', '::')}
    </>
  ),
  'context-detective': () => (
    <>
      <rect x="4" y="8" width="40" height="5" rx="2.5" fill="#99f6e4" />
      <rect x="4" y="18" width="16" height="6" rx="3" fill="#fcd34d" />
      <rect x="23" y="18" width="21" height="5" rx="2.5" fill="#99f6e4" />
      <rect x="4" y="29" width="30" height="5" rx="2.5" fill="#99f6e4" />
      <circle cx="38" cy="38" r="10" fill="#ffffff" fillOpacity="0.7" stroke="#0f766e" strokeWidth="3.5" />
      <path d="M45 45 L52 52" stroke="#0f766e" strokeWidth="4.5" strokeLinecap="round" />
    </>
  ),
  'word-association-grid': () => (
    <>
      <rect x="5" y="6" width="46" height="10" rx="4" fill="#fcd34d" />
      {[0, 1, 2, 3].map((i) => <rect key={`a${i}`} x={5 + i * 12} y="20" width="10" height="10" rx="3" fill={i === 1 ? '#334155' : '#ffedd5'} />)}
      {[0, 1, 2, 3].map((i) => <rect key={`b${i}`} x={5 + i * 12} y="33" width="10" height="10" rx="3" fill={i === 2 ? '#334155' : '#ffedd5'} />)}
      <circle cx="21" cy="50" r="2" fill="#334155" />
      <circle cx="28" cy="50" r="2" fill="#334155" />
      <circle cx="35" cy="50" r="2" fill="#cbd5e1" />
    </>
  ),
  'equation-rush': () => (
    <>
      <rect x="4" y="6" width="48" height="44" rx="7" fill="#1e293b" />
      {label(28, 19, 8, '#ffffff', '3x+5=20')}
      {label(28, 31, 8, '#cbd5e1', '3x=15')}
      {label(28, 44, 11, '#fdba74', 'x=5')}
    </>
  ),
  'fraction-battle': () => (
    <>
      <rect x="4" y="10" width="20" height="30" rx="5" fill="#d1fae5" stroke="#10b981" strokeWidth="2" />
      <rect x="32" y="16" width="20" height="30" rx="5" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="2" />
      {label(14, 23, 10, '#065f46', '3')}
      <path d="M8 26 H20" stroke="#065f46" strokeWidth="2" />
      {label(14, 36, 10, '#065f46', '4')}
      {label(42, 29, 10, '#9f1239', '5')}
      <path d="M36 32 H48" stroke="#9f1239" strokeWidth="2" />
      {label(42, 42, 10, '#9f1239', '6')}
      {label(28, 54, 9, '#0f766e', 'VS')}
    </>
  )
};
