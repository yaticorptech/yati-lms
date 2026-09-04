/**
 * A small area chart for the corner of a stat tile: seven numbers, one soft
 * filled curve, no axes. Decoration that happens to be true — it is drawn
 * from the last seven days of what the tile counts.
 */
export default function Sparkline({ values = [], color = '#6366f1', width = 96, height = 36 }) {
    const v = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
    const max = Math.max(1, ...v);
    const stepX = width / (v.length - 1);
    const pts = v.map((n, i) => [i * stepX, height - 4 - (n / max) * (height - 8)]);
    // A smooth line through the points, then closed down to the baseline.
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
        const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i];
        const cx = (x0 + x1) / 2;
        d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    const area = `${d} L ${width} ${height} L 0 ${height} Z`;
    const id = `sp-${color.replace('#', '')}`;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="shrink-0 overflow-visible">
            <defs>
                <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={area} fill={`url(#${id})`} />
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.5" fill={color} />
        </svg>
    );
}
