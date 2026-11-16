/* Card illustrations for group A (Young Thinkers), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'animal-pair-safari': () => (
    <>
      {tile('#ecfccb')}
      <rect x="7" y="10" width="19" height="25" rx="4" fill="#ffffff" stroke="#84cc16" strokeWidth="1.5" />
      {/* a cow face */}
      <ellipse cx="16.5" cy="22" rx="6" ry="6.5" fill="#f5f5f4" stroke="#44403c" strokeWidth="1.2" />
      <circle cx="14" cy="20" r="1.1" fill="#1c1917" />
      <circle cx="19" cy="20" r="1.1" fill="#1c1917" />
      <ellipse cx="16.5" cy="25.5" rx="3.6" ry="2.2" fill="#fda4af" />
      <rect x="30" y="10" width="19" height="25" rx="4" fill="#ffffff" stroke="#0ea5e9" strokeWidth="1.5" />
      {/* a speaker */}
      <path d="M34 19 h3 l4 -3.5 v13 l-4 -3.5 h-3 z" fill="#0369a1" />
      <path d="M43.5 18.5 q2.5 4 0 8" fill="none" stroke="#0369a1" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 39 Q28 49 40 39" fill="none" stroke="#65a30d" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  'whats-missing': () => (
    <>
      {tile('#fae8ff')}
      <rect x="8" y="8" width="18" height="18" rx="4" fill="#ffffff" />
      <circle cx="17" cy="17" r="5.5" fill="#ef4444" />
      <rect x="30" y="8" width="18" height="18" rx="4" fill="#ffffff" />
      <path d="M39 11 l2 4.5 5 .5 -3.8 3.3 1.2 4.9 -4.4 -2.6 -4.4 2.6 1.2 -4.9 -3.8 -3.3 5 -.5z" fill="#facc15" />
      <rect x="8" y="30" width="18" height="18" rx="4" fill="#ffffff" />
      <rect x="12" y="35" width="10" height="8" rx="2" fill="#3b82f6" />
      <rect x="30" y="30" width="18" height="18" rx="4" fill="#ffffff" stroke="#a21caf" strokeWidth="1.6" strokeDasharray="3 2" />
      <text x="39" y="44" textAnchor="middle" fontSize="13" fontWeight="900" fill="#a21caf">?</text>
    </>
  ),
  'shape-builder': () => (
    <>
      {tile('#ffedd5')}
      <rect x="10" y="22" width="36" height="24" fill="#cbd5e1" />
      <path d="M10 22 L28 8 L46 22 Z" fill="#cbd5e1" />
      <rect x="10" y="34" width="12" height="12" fill="#3b82f6" stroke="#fff" strokeWidth="1" />
      <rect x="22" y="22" width="24" height="12" fill="#22c55e" stroke="#fff" strokeWidth="1" />
      <path d="M10 22 L28 8 L28 22 Z" fill="#f97316" stroke="#fff" strokeWidth="1" />
      <path d="M36 40 a6 6 0 1 1 6 6" fill="none" stroke="#c2410c" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  'mini-maze-mission': () => (
    <>
      {tile('#ccfbf1')}
      <rect x="8" y="8" width="40" height="40" rx="3" fill="#f0fdfa" stroke="#334155" strokeWidth="2.5" />
      <path d="M8 20 H32 M20 20 V36 M32 32 H48 M20 36 H40" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="4" fill="#f9a8d4" />
      <ellipse cx="12.5" cy="9.5" rx="1.2" ry="3" fill="#f9a8d4" />
      <ellipse cx="15.5" cy="9.5" rx="1.2" ry="3" fill="#f9a8d4" />
      <path d="M40 38 l4 8 h-1.5 l-4 -7z" fill="#f97316" />
      <path d="M41 38 l-1 -3 M42 37.5 l1 -3" stroke="#16a34a" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M38 13 l1.2 2.6 2.8 .3 -2.1 1.9 .6 2.8 -2.5 -1.5 -2.5 1.5 .6 -2.8 -2.1 -1.9 2.8 -.3z" fill="#facc15" />
    </>
  ),
  'count-and-catch': () => (
    <>
      {tile('#e0f2fe')}
      <circle cx="16" cy="14" r="5.5" fill="#ef4444" />
      <path d="M16 8.5 v-2.5" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="38" cy="20" r="5.5" fill="#ef4444" />
      <path d="M38 14.5 v-2.5" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M27 24 l1.4 3 3.2 .3 -2.4 2.1 .7 3.1 -2.9 -1.7 -2.9 1.7 .7 -3.1 -2.4 -2.1 3.2 -.3z" fill="#facc15" />
      <path d="M10 36 H46 L42 50 H14 Z" fill="#d97706" />
      <path d="M10 36 H46" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
      <text x="28" y="47" textAnchor="middle" fontSize="9" fontWeight="900" fill="#ffffff">7</text>
    </>
  ),
  'number-hop': () => (
    <>
      {tile('#bae6fd')}
      {[[12, 40, '3'], [28, 44, '4'], [44, 40, '5']].map(([x, y, n]) => (
        <g key={n}>
          <ellipse cx={x} cy={y} rx="8" ry="4.5" fill="#22c55e" />
          <text x={x} y={y + 3} textAnchor="middle" fontSize="7" fontWeight="900" fill="#052e16">{n}</text>
        </g>
      ))}
      <path d="M12 32 Q20 10 28 26" fill="none" stroke="#0369a1" strokeWidth="1.6" strokeDasharray="2.5 2" />
      <ellipse cx="30" cy="22" rx="7" ry="5.5" fill="#4ade80" />
      <circle cx="27" cy="17" r="2.4" fill="#ffffff" />
      <circle cx="33" cy="17" r="2.4" fill="#ffffff" />
      <circle cx="27" cy="17" r="1.1" fill="#14532d" />
      <circle cx="33" cy="17" r="1.1" fill="#14532d" />
      <path d="M27 24 q3 2 6 0" fill="none" stroke="#14532d" strokeWidth="1.2" strokeLinecap="round" />
    </>
  )
};
