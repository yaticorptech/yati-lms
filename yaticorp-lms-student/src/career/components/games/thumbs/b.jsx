/* Card illustrations for group B (Young Thinkers), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'picture-word-hunt': () => (
    <>
      {tile('#fef3c7')}
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect key={`${r}${c}`} x={9 + c * 13} y={9 + r * 13} width="11" height="11" rx="2.5" fill={r === 1 ? '#fbbf24' : '#ffffff'} stroke="#f59e0b" strokeWidth="1" />
      )))}
      {['c', 'a', 't'].map((ch, i) => (
        <text key={ch} x={14.5 + i * 13} y={30} textAnchor="middle" fontSize="9" fontWeight="900" fill="#78350f">{ch}</text>
      ))}
      <circle cx="44" cy="44" r="7" fill="none" stroke="#b45309" strokeWidth="2.5" />
      <path d="M49 49 L53 53" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  'rhyme-detective': () => (
    <>
      {tile('#f5d0fe')}
      <rect x="7" y="10" width="19" height="15" rx="4" fill="#ffffff" />
      <text x="16.5" y="21" textAnchor="middle" fontSize="8" fontWeight="900" fill="#86198f">cat</text>
      <rect x="30" y="10" width="19" height="15" rx="4" fill="#ffffff" />
      <text x="39.5" y="21" textAnchor="middle" fontSize="8" fontWeight="900" fill="#86198f">hat</text>
      <path d="M16 27 Q28 36 40 27" fill="none" stroke="#a21caf" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="40" r="8" fill="none" stroke="#4338ca" strokeWidth="3" />
      <path d="M30 46 L37 52" stroke="#4338ca" strokeWidth="3.5" strokeLinecap="round" />
    </>
  ),
  'word-balloon-pop': () => (
    <>
      {tile('#e0f2fe')}
      <ellipse cx="18" cy="22" rx="9" ry="11" fill="#f43f5e" />
      <path d="M18 33 Q16 40 19 48" fill="none" stroke="#64748b" strokeWidth="1" />
      <ellipse cx="37" cy="17" rx="9" ry="11" fill="#3b82f6" />
      <path d="M37 28 Q39 36 36 44" fill="none" stroke="#64748b" strokeWidth="1" />
      <rect x="29" y="14" width="16" height="7" rx="2" fill="#ffffff" opacity="0.9" />
      <text x="37" y="19.6" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#1e3a8a">word</text>
      <path d="M44 38 l2 -4 l2 4 l4 -1 l-3 3 l3 3 l-4 -1 l-2 4 l-2 -4 l-4 1 l3 -3 l-3 -3z" fill="#facc15" />
    </>
  ),
  'fruit-shop': () => (
    <>
      {tile('#ecfccb')}
      <path d="M8 18 H48 L44 22 H12 Z" fill="#f43f5e" />
      <path d="M8 18 Q13 24 18 18 Q23 24 28 18 Q33 24 38 18 Q43 24 48 18" fill="#fda4af" />
      <path d="M12 32 H44 L40 48 H16 Z" fill="#d97706" />
      <path d="M16 32 Q28 22 40 32" fill="none" stroke="#92400e" strokeWidth="2.5" />
      <circle cx="22" cy="31" r="5" fill="#ef4444" />
      <path d="M22 26 v-2" stroke="#166534" strokeWidth="1.5" />
      <path d="M28 30 Q34 22 38 30 Q33 27 28 30z" fill="#facc15" />
      <circle cx="46" cy="44" r="6" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" />
      <text x="46" y="46.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#78350f">₹</text>
    </>
  ),
  'missing-number-race': () => (
    <>
      {tile('#ffe4e6')}
      <rect x="4" y="36" width="48" height="12" rx="3" fill="#475569" />
      <path d="M8 42 H48" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="3 3" />
      {[{ x: 6, l: '2' }, { x: 19, l: '4' }, { x: 32, l: '?' }].map((c) => (
        <g key={c.x}>
          <rect x={c.x} y="12" width="12" height="13" rx="3" fill={c.l === '?' ? '#ffffff' : '#fb7185'} stroke={c.l === '?' ? '#f59e0b' : 'none'} strokeWidth="1.5" />
          <text x={c.x + 6} y="22" textAnchor="middle" fontSize="9" fontWeight="900" fill={c.l === '?' ? '#b45309' : '#ffffff'}>{c.l}</text>
          <circle cx={c.x + 3} cy="27" r="1.8" fill="#334155" />
          <circle cx={c.x + 9} cy="27" r="1.8" fill="#334155" />
        </g>
      ))}
      <path d="M16 39 h10 l3 3 h4 v4 H16z" fill="#ef4444" />
      <circle cx="19" cy="46" r="2" fill="#111827" />
      <circle cx="30" cy="46" r="2" fill="#111827" />
      <rect x="45" y="10" width="2" height="16" fill="#334155" />
      <path d="M47 10 h6 v5 h-6z" fill="#111827" />
    </>
  ),
  'shape-count-dash': () => (
    <>
      {tile('#dcfce7')}
      <rect x="22" y="8" width="14" height="10" rx="2" fill="#047857" />
      <text x="29" y="15.8" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">12</text>
      <rect x="4" y="44" width="48" height="2" fill="#475569" />
      <rect x="5" y="28" width="15" height="13" rx="3" fill="#dc2626" />
      <rect x="7" y="22" width="4" height="7" fill="#334155" />
      <rect x="22" y="29" width="12" height="12" rx="2" fill="#3b82f6" />
      <rect x="36" y="29" width="12" height="12" rx="2" fill="#f59e0b" />
      <text x="28" y="38" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">5</text>
      <text x="42" y="38" textAnchor="middle" fontSize="7" fontWeight="900" fill="#ffffff">7</text>
      {[9, 17, 25, 31, 39, 45].map((x) => <circle key={x} cx={x} cy="42.5" r="2" fill="#1e293b" />)}
    </>
  )
};
