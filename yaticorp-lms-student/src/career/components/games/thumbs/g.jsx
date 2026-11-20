/* Card illustrations for group G (Master Minds, verbal), on the shared 56×56 grid: flat shapes on a rounded tile. */

const tile = (fill) => <rect x="2" y="2" width="52" height="52" rx="12" fill={fill} />;

export const THUMBS = {
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
