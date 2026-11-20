/* Card illustrations for group F (Master Minds), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
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
};
