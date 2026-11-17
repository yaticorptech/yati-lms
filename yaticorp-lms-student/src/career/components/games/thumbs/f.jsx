/* Card illustrations for group F (Master Minds), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
  'spatial-rotation-vault': () => (
    <>
      {tile('#1e293b')}
      {[[10, 14], [18, 14], [18, 22], [18, 30], [26, 30]].map(([x, y], i) => (
        <rect key={`a${i}`} x={x} y={y} width="7" height="7" rx="1.5" fill={i === 1 ? '#fbbf24' : '#94a3b8'} />
      ))}
      <path d="M30 12 a10 10 0 0 1 10 10" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M37 21 l3 2 l2 -3" fill="none" stroke="#a5b4fc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {[[30, 34], [30, 42], [38, 42], [46, 42], [46, 34]].map(([x, y], i) => (
        <rect key={`b${i}`} x={x - 2} y={y - 4} width="7" height="7" rx="1.5" fill={i === 3 ? '#fbbf24' : '#6366f1'} />
      ))}
    </>
  ),
  'interference-recall': () => (
    <>
      {tile('#eef2ff')}
      <rect x="8" y="10" width="26" height="8" rx="3" fill="#f59e0b" />
      <rect x="8" y="22" width="20" height="8" rx="3" fill="#f59e0b" />
      <rect x="20" y="28" width="28" height="8" rx="3" fill="#38bdf8" opacity="0.85" />
      <rect x="24" y="40" width="22" height="8" rx="3" fill="#38bdf8" opacity="0.85" />
      <path d="M38 12 l8 0 M42 8 l0 8" stroke="#4338ca" strokeWidth="2.4" strokeLinecap="round" />
    </>
  ),
  'cipher-lab': () => (
    <>
      {tile('#064e3b')}
      {[14, 22, 30, 18, 10, 26, 12].map((h, i) => (
        <rect key={i} x={8 + i * 6} y={46 - h} width="4.5" height={h} rx="1" fill={i === 2 ? '#34d399' : '#6ee7b7'} opacity={i === 2 ? 1 : 0.55} />
      ))}
      <text x="28" y="15" textAnchor="middle" fontSize="10" fontWeight="800" fill="#d1fae5" fontFamily="ui-monospace, monospace">QXL→THE</text>
    </>
  ),
  'boolean-breaker': () => (
    <>
      {tile('#1c1917')}
      <path d="M6 18 H16 M6 34 H16" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M16 12 H26 A14 14 0 0 1 26 40 H16 Z" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
      <path d="M40 26 H44" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="48" cy="26" r="5" fill="#fde047" />
      <circle cx="48" cy="26" r="8" fill="none" stroke="#fde047" strokeWidth="1.5" opacity="0.6" />
    </>
  )
};
