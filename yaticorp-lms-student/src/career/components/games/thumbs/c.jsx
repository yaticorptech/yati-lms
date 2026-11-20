/* Card illustrations for group C (Rising Brains: memory & focus, logic), on the shared 56×56 grid. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  get 'chess-master'() { return THUMBS['chess-challenge']; }, // Master Minds' Chess (2026-11-17)
  'sequence-vault': () => (
    <>
      {tile('#e0e7ff')}
      <rect x="8" y="10" width="12" height="30" rx="3" fill="#ef4444" />
      <rect x="22" y="10" width="12" height="30" rx="3" fill="#3b82f6" />
      <rect x="36" y="10" width="12" height="30" rx="3" fill="#10b981" />
      {[14, 28, 42].map((x) => <circle key={x} cx={x} cy="25" r="2.5" fill="#ffffff" />)}
      <rect x="10" y="43" width="36" height="8" rx="3" fill="#1e293b" />
      <text x="28" y="49.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#fde047" letterSpacing="1.5">4 7 2</text>
    </>
  ),
  'grid-navigator': () => (
    <>
      {tile('#0f1d3d')}
      <rect x="8" y="8" width="18" height="18" rx="4" fill="#f59e0b" />
      <rect x="30" y="8" width="18" height="18" rx="4" fill="#e11d48" />
      <rect x="8" y="30" width="18" height="18" rx="4" fill="#7c3aed" />
      <rect x="30" y="30" width="18" height="18" rx="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
      <text x="17" y="21" textAnchor="middle" fontSize="10">🔔</text>
      <text x="39" y="21" textAnchor="middle" fontSize="10">🥁</text>
      <text x="17" y="43" textAnchor="middle" fontSize="10">🎹</text>
      <text x="39" y="43" textAnchor="middle" fontSize="10">💧</text>
    </>
  ),
  'pattern-recall': () => (
    <>
      {tile('#ffedd5')}
      <rect x="10" y="8" width="36" height="12" rx="3" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1" />
      <text x="28" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#92400e">2🍅 1🧅</text>
      <path d="M10 28 H46 V36 Q46 47 28 47 Q10 47 10 36 Z" fill="#334155" />
      <ellipse cx="28" cy="29" rx="17" ry="3.5" fill="#fdba74" />
      <rect x="5" y="29" width="5" height="3" rx="1.5" fill="#334155" />
      <rect x="46" y="29" width="5" height="3" rx="1.5" fill="#334155" />
      <path d="M22 24 q2 -3 0 -5 M28 24 q2 -3 0 -5 M34 24 q2 -3 0 -5" fill="none" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
    </>
  ),
  'focus-filter': () => (
    <>
      {tile('#fae8ff')}
      {[0, 1, 3, 4].map((i) => <path key={i} d={`M${14 + i * 8} 14 l-5 4 l5 4`} fill="none" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />)}
      <path d="M27 14 l5 4 l-5 4" fill="none" stroke="#4338ca" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {['d', 'b', 'q', 'p', 'b', 'd'].map((ch, i) => (
        <text key={i} x={12 + (i % 3) * 16} y={38 + Math.floor(i / 3) * 11} textAnchor="middle" fontSize="10" fontWeight="900" fill={ch === 'b' ? '#c026d3' : '#94a3b8'}>{ch}</text>
      ))}
      <circle cx="28" cy="35" r="6" fill="none" stroke="#c026d3" strokeWidth="2" />
    </>
  ),
  'dual-image-recall': () => (
    <>
      {tile('#e0f2fe')}
      <rect x="6" y="12" width="20" height="20" rx="4" fill="#ffffff" stroke="#0ea5e9" strokeWidth="1.5" />
      <rect x="30" y="24" width="20" height="20" rx="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="1.5" />
      <circle cx="12" cy="18" r="3" fill="#f43f5e" />
      <rect x="17" y="23" width="6" height="6" rx="1" fill="#22c55e" />
      <circle cx="36" cy="30" r="3" fill="#f43f5e" />
      <path d="M41 35 l3 -5 l3 5 z" fill="#f59e0b" />
      <circle cx="44" cy="33" r="7" fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="2.5 2" />
    </>
  ),
  'chess-challenge': () => (
    <>
      {tile('#fef3c7')}
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => <rect key={`${r}${c}`} x={8 + c * 10} y={8 + r * 10} width="10" height="10" fill={(r + c) % 2 ? '#92400e' : '#fde68a'} />))}
      <text x="22" y="34" textAnchor="middle" fontSize="16">♞</text>
      <text x="36" y="44" textAnchor="middle" fontSize="16" fill="#ffffff" stroke="#000" strokeWidth="0.6">♛</text>
    </>
  ),
  'clue-chain': () => (
    <>
      {tile('#fef3c7')}
      {[[8, 8, '#fecdd3'], [28, 8, '#bae6fd'], [8, 28, '#bbf7d0'], [28, 28, '#ddd6fe']].map(([x, y, f]) => <rect key={`${x}${y}`} x={x} y={y} width="20" height="20" fill={f} stroke="#334155" strokeWidth="1.5" />)}
      <text x="18" y="22" textAnchor="middle" fontSize="11">👑</text>
      <text x="38" y="42" textAnchor="middle" fontSize="11">👑</text>
    </>
  ),
  'tower-strategy': () => (
    <>
      {tile('#ede9fe')}
      {[14, 28, 42].map((x) => <rect key={x} x={x - 1.2} y="12" width="2.4" height="34" rx="1.2" fill="#b45309" />)}
      <rect x="6" y="45" width="44" height="3" rx="1.5" fill="#92400e" />
      <rect x="7" y="38" width="14" height="6" rx="3" fill="#e11d48" /><rect x="7" y="31" width="14" height="6" rx="3" fill="#2563eb" />
      <rect x="21" y="38" width="14" height="6" rx="3" fill="#f59e0b" />
      <rect x="35" y="38" width="14" height="6" rx="3" fill="#2563eb" /><rect x="35" y="31" width="14" height="6" rx="3" fill="#e11d48" />
      <rect x="21" y="18" width="14" height="6" rx="3" fill="#f59e0b" />
    </>
  ),
};
