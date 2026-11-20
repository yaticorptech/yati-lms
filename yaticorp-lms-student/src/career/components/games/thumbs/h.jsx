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
