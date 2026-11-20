/* Card illustrations for group E (Smart maths, Master memory), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'number-pattern-lab': () => (
    <>
      {tile('#312e81')}
      {[[2, 5, 9], [4, 8, 3], [6, 7, 12]].map((row, r) => row.map((v, c) => (
        <g key={`${r}${c}`}>
          <rect x={9 + c * 13} y={9 + r * 13} width="12" height="12" rx="3" fill={[[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]].some(([pr, pc]) => pr === r && pc === c) ? '#fcd34d' : '#ffffff'} />
          <text x={15 + c * 13} y={17.5 + r * 13} textAnchor="middle" fontSize="7" fontWeight="900" fill="#1e1b4b">{v}</text>
        </g>
      )))}
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
  'data-chart-quiz': (...a) => THUMBS['data-dash'](...a),
  'speed-distance': () => (
    <>
      {tile('#1e3a8a')}
      <rect x="6" y="34" width="44" height="5" rx="2.5" fill="#475569" />
      <rect x="6" y="34" width="28" height="5" rx="2.5" fill="#f59e0b" />
      <circle cx="34" cy="36.5" r="5" fill="#fbbf24" stroke="#fff" strokeWidth="2" />
      <text x="20" y="28" textAnchor="middle" fontSize="14">🚆</text>
      <text x="28" y="50" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fff">km</text>
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
