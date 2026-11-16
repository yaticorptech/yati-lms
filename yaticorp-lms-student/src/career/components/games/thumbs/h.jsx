/* Card illustrations for group H (Master Minds: logic and math), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'network-logic': () => (
    <>
      {tile('#e0e7ff')}
      <path d="M13 15 L28 12 L43 18 M13 15 L18 38 L36 42 L43 18 M28 12 L36 42" fill="none" stroke="#a5b4fc" strokeWidth="2" />
      <path d="M13 15 L18 38 L36 42" fill="none" stroke="#4f46e5" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="15" r="5" fill="#4f46e5" />
      <circle cx="28" cy="12" r="4" fill="#ffffff" stroke="#334155" strokeWidth="1.3" />
      <circle cx="43" cy="18" r="4" fill="#ffffff" stroke="#334155" strokeWidth="1.3" />
      <circle cx="18" cy="38" r="4" fill="#ffffff" stroke="#334155" strokeWidth="1.3" />
      <circle cx="36" cy="42" r="5" fill="#0f766e" />
    </>
  ),
  'strategic-constraint-lab': () => (
    <>
      {tile('#ede9fe')}
      {[8, 22, 36].map((x) => <rect key={x} x={x} y="9" width="12" height="30" rx="3" fill="#ffffff" stroke="#c4b5fd" />)}
      <rect x="9.5" y="13" width="9" height="6" rx="2" fill="#7c3aed" />
      <rect x="23.5" y="13" width="9" height="6" rx="2" fill="#a78bfa" />
      <rect x="23.5" y="21" width="9" height="6" rx="2" fill="#7c3aed" />
      <rect x="37.5" y="13" width="9" height="6" rx="2" fill="#a78bfa" />
      <circle cx="13" cy="46" r="3.5" fill="#10b981" />
      <circle cx="24" cy="46" r="3.5" fill="#10b981" />
      <circle cx="35" cy="46" r="3.5" fill="#f43f5e" />
      <path d="M11.4 46 l1.2 1.2 2.2 -2.4 M22.4 46 l1.2 1.2 2.2 -2.4" fill="none" stroke="#fff" strokeWidth="1.2" />
    </>
  ),
  'quantitative-arena': () => (
    <>
      {tile('#e0f2fe')}
      <rect x="7" y="12" width="19" height="22" rx="4" fill="#ffffff" stroke="#7dd3fc" />
      <rect x="30" y="12" width="19" height="22" rx="4" fill="#ffffff" stroke="#7dd3fc" />
      <text x="16.5" y="28" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0369a1" fontFamily="serif">x²</text>
      <text x="39.5" y="28" textAnchor="middle" fontSize="12" fontWeight="800" fill="#0369a1" fontFamily="serif">x</text>
      <text x="28" y="48" textAnchor="middle" fontSize="11" fontWeight="900" fill="#0c4a6e">A ? B</text>
    </>
  ),
  'numerical-optimization': () => (
    <>
      {tile('#d1fae5')}
      <path d="M17 20 q0 -8 11 -8 q11 0 11 8" fill="none" stroke="#047857" strokeWidth="2.5" />
      <rect x="11" y="19" width="34" height="26" rx="6" fill="#059669" />
      <rect x="15" y="25" width="10" height="7" rx="2" fill="#a7f3d0" />
      <rect x="27" y="25" width="14" height="7" rx="2" fill="#6ee7b7" />
      <rect x="15" y="36" width="26" height="4" rx="2" fill="#064e3b" />
      <rect x="15" y="36" width="19" height="4" rx="2" fill="#fbbf24" />
    </>
  ),
  'statistical-inference': () => (
    <>
      {tile('#ccfbf1')}
      <line x1="8" y1="44" x2="48" y2="44" stroke="#115e59" strokeWidth="1.5" />
      {[[12, 1], [18, 2], [24, 4], [30, 3], [36, 2], [44, 1]].map(([x, n]) =>
        Array.from({ length: n }, (_, k) => <circle key={`${x}-${k}`} cx={x} cy={40 - k * 6} r="2.6" fill={x === 44 ? '#e11d48' : '#0d9488'} />))}
      <line x1="25" y1="10" x2="25" y2="44" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />
    </>
  ),
  'decision-theory-arena': () => (
    <>
      {tile('#fef3c7')}
      <path d="M14 28 L26 16 L40 16 M14 28 L26 40 L32 40 M26 40 L38 34 M26 40 L38 46" fill="none" stroke="#92400e" strokeWidth="1.8" />
      <rect x="9" y="23" width="10" height="10" rx="2" fill="#1e293b" />
      <circle cx="26" cy="40" r="4.5" fill="#f59e0b" />
      <text x="44" y="19" textAnchor="middle" fontSize="8" fontWeight="900" fill="#047857">+20</text>
      <text x="44" y="37" textAnchor="middle" fontSize="8" fontWeight="900" fill="#047857">+50</text>
      <text x="44" y="49" textAnchor="middle" fontSize="8" fontWeight="900" fill="#be123c">−30</text>
    </>
  )
};
