/* Card illustrations for group G (Master Minds, verbal), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'semantic-precision': () => (
    <>
      {tile('#1e1b4b')}
      <rect x="8" y="12" width="12" height="5" rx="2.5" fill="#64748b" />
      <rect x="22" y="10" width="18" height="9" rx="3" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="3 2" />
      <rect x="42" y="12" width="6" height="5" rx="2.5" fill="#64748b" />
      <rect x="20" y="34" width="22" height="10" rx="4" fill="#818cf8" />
      <path d="M31 33 L31 23 M27 26 L31 22 L35 26" fill="none" stroke="#c7d2fe" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="8" y="36" width="9" height="6" rx="3" fill="#475569" />
    </>
  ),
  'argument-analyzer': () => (
    <>
      {tile('#f5f3ff')}
      <rect x="8" y="10" width="17" height="8" rx="3" fill="#38bdf8" />
      <rect x="31" y="10" width="17" height="8" rx="3" fill="#38bdf8" />
      <path d="M16.5 19 L28 33 M39.5 19 L28 33" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="15" y="34" width="26" height="10" rx="4" fill="#7c3aed" />
      <rect x="40" y="26" width="10" height="6" rx="3" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeDasharray="2 1.5" />
    </>
  ),
  'verbal-architect': () => (
    <>
      {tile('#0c4a6e')}
      <rect x="10" y="10" width="30" height="7" rx="2.5" fill="#7dd3fc" />
      <rect x="14" y="20" width="32" height="7" rx="2.5" fill="#38bdf8" />
      <rect x="10" y="30" width="26" height="7" rx="2.5" fill="#0ea5e9" />
      <rect x="16" y="40" width="30" height="7" rx="2.5" fill="#e0f2fe" opacity="0.9" transform="rotate(-6 31 43)" />
      <path d="M46 10 v10 M43 17 l3 3 l3 -3" fill="none" stroke="#fde68a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  'nuance-navigator': () => (
    <>
      {tile('#fdf4ff')}
      <rect x="8" y="36" width="40" height="4" rx="2" fill="#e9d5ff" />
      <rect x="8" y="36" width="40" height="4" rx="2" fill="url(#gNuanceGrad)" />
      <defs>
        <linearGradient id="gNuanceGrad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#c026d3" />
        </linearGradient>
      </defs>
      <rect x="8" y="28" width="8" height="6" rx="2" fill="#7dd3fc" />
      <rect x="19" y="22" width="8" height="12" rx="2" fill="#a78bfa" />
      <rect x="30" y="16" width="8" height="18" rx="2" fill="#c084fc" />
      <rect x="41" y="10" width="8" height="24" rx="2" fill="#c026d3" />
      <circle cx="30" cy="38" r="4" fill="#fff" stroke="#86198f" strokeWidth="2" />
    </>
  ),
  'word-relation-matrix': () => (
    <>
      {tile('#ecfdf5')}
      {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
        <rect
          key={`${r}${c}`}
          x={9 + c * 13.5}
          y={9 + r * 13.5}
          width="11"
          height="11"
          rx="2.5"
          fill={(r + c) % 3 === 1 ? '#fff' : r === 0 ? '#065f46' : '#34d399'}
          stroke={(r + c) % 3 === 1 ? '#10b981' : 'none'}
          strokeDasharray="2 1.5"
          strokeWidth="1.5"
        />
      )))}
    </>
  )
};
