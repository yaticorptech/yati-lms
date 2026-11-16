/* Card illustrations for group E (Smart maths, Master memory), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'number-pattern-lab': () => (
    <>
      {tile('#cffafe')}
      <rect x="21" y="9" width="14" height="11" rx="3" fill="#0891b2" />
      <text x="28" y="17.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#fff">?</text>
      <rect x="14" y="22" width="14" height="11" rx="3" fill="#ffffff" />
      <rect x="28" y="22" width="14" height="11" rx="3" fill="#ffffff" />
      <text x="21" y="30.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#155e75">7</text>
      <text x="35" y="30.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#155e75">9</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={7 + i * 14} y="35" width="14" height="11" rx="3" fill={i === 1 ? '#67e8f9' : '#ffffff'} />
          <text x={14 + i * 14} y="43.5" textAnchor="middle" fontSize="7" fontWeight="900" fill="#155e75">{[3, 4, 5][i]}</text>
        </g>
      ))}
    </>
  ),
  'ratio-relay': () => (
    <>
      {tile('#ffedd5')}
      <path d="M8 40 H48" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" />
      {[10, 24, 38].map((x, i) => (
        <circle key={x} cx={x + 4} cy="40" r="5" fill={i < 2 ? '#f97316' : '#ffffff'} stroke="#ea580c" strokeWidth="1.5" />
      ))}
      <rect x="12" y="12" width="32" height="16" rx="5" fill="#ffffff" />
      <text x="28" y="23.5" textAnchor="middle" fontSize="10" fontWeight="900" fill="#c2410c">2 : 3</text>
      <rect x="33" y="30" width="12" height="4" rx="2" fill="#e11d48" transform="rotate(-25 39 32)" />
    </>
  ),
  'data-dash': () => (
    <>
      {tile('#d1fae5')}
      <path d="M10 46 H47" stroke="#065f46" strokeWidth="1.5" />
      <rect x="12" y="30" width="7" height="16" rx="1.5" fill="#10b981" />
      <rect x="22" y="20" width="7" height="26" rx="1.5" fill="#0ea5e9" />
      <rect x="32" y="26" width="7" height="20" rx="1.5" fill="#f59e0b" />
      <path d="M13 24 L25 14 L35 19 L45 9" fill="none" stroke="#e11d48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="45" cy="9" r="2.5" fill="#e11d48" />
    </>
  ),
  'mental-math-circuit': () => (
    <>
      {tile('#1e293b')}
      <rect x="20" y="6" width="16" height="9" rx="3" fill="#06b6d4" />
      <path d="M28 15 V20 M28 20 H17 V24 M28 20 H39 V24" stroke="#fbbf24" strokeWidth="2" fill="none" />
      <rect x="9" y="24" width="16" height="9" rx="3" fill="#fbbf24" />
      <text x="17" y="31" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#1e293b">×2</text>
      <rect x="31" y="24" width="16" height="9" rx="3" fill="#475569" />
      <text x="39" y="31" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#cbd5e1">+5</text>
      <path d="M17 33 V40 H28 V42" stroke="#fbbf24" strokeWidth="2" fill="none" />
      <rect x="20" y="42" width="16" height="9" rx="3" fill="#10b981" />
    </>
  ),
  'matrix-recall': () => (
    <>
      {tile('#ede9fe')}
      {[0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) => {
        const lit = (r === 1 && c === 2) || (r === 3 && c === 0);
        return <rect key={`${r}${c}`} x={9 + c * 10} y={9 + r * 10} width="8.5" height="8.5" rx="2" fill={lit ? '#7c3aed' : r === 0 ? '#ffffff' : '#ddd6fe'} />;
      }))}
      {['4', '7', '2', '9'].map((d, i) => (
        <text key={i} x={13.25 + i * 10} y="15.5" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#4c1d95">{d}</text>
      ))}
    </>
  ),
  'departure-board': () => (
    <>
      {tile('#1e293b')}
      <text x="28" y="15" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fcd34d" letterSpacing="1">DEPARTURES</text>
      {[['TOKYO', 'B4'], ['PARIS', 'A7'], ['DUBAI', 'C2']].map(([c, g], i) => (
        <g key={c}>
          <rect x="8" y={19 + i * 9} width="28" height="7" rx="1.5" fill="#0f172a" />
          <text x="10" y={24.5 + i * 9} fontSize="5.5" fontWeight="900" fill="#fcd34d" fontFamily="monospace">{c}</text>
          <rect x="38" y={19 + i * 9} width="10" height="7" rx="1.5" fill={i === 1 ? '#f59e0b' : '#0f172a'} />
          <text x="43" y={24.5 + i * 9} textAnchor="middle" fontSize="5.5" fontWeight="900" fill={i === 1 ? '#1e293b' : '#fcd34d'} fontFamily="monospace">{g}</text>
        </g>
      ))}
    </>
  )
};
