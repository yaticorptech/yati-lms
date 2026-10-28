/**
 * Language Learning — a badge (asked 2026-10-27: "attractive badges, like a diamond", then "make it like
 * this picture"): a glossy hexagon or diamond frame in the badge's colours, a picture inside, splashes
 * and little stars around it, and a sparkle once earned. Looks in gemLooks.js.
 */
import { useId } from 'react';
import { lookOf } from './gemLooks';

const HEX = [[50, 3], [91, 26.5], [91, 73.5], [50, 97], [9, 73.5], [9, 26.5]];
const DIAMOND = [[50, 2], [98, 50], [50, 98], [2, 50]];
const scale = (list, k) => list.map(([x, y]) => [50 + (x - 50) * k, 50 + (y - 50) * k]);
const pts = (list) => list.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
/** Splashes round the frame: angle (degrees, 0 = right), length, and whether light. */
const SPLASHES = [[-150, 9, 0], [-30, 9, 0], [180, 7, 1], [0, 7, 1], [150, 8, 0], [30, 8, 0], [-115, 5, 1], [-65, 5, 1]];

const Star = ({ x, y, r, fill }) => {
    const p = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r * 0.45 : r; return [x + d * Math.cos(a), y + d * Math.sin(a)]; });
    return <polygon points={pts(p)} fill={fill} stroke="#fff" strokeWidth="0.8" strokeLinejoin="round" />;
};

/** Two letter tiles, 文 and A: translating. */
const Translate = ({ size }) => (
    <span className="relative block" style={{ width: size * 0.5, height: size * 0.42 }}>
        <span className="absolute left-0 top-0 flex items-center justify-center rounded-md bg-white font-black text-[#2563EB] shadow" style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.18, transform: 'rotate(-10deg)' }}>文</span>
        <span className="absolute bottom-0 right-0 flex items-center justify-center rounded-md font-black text-[#C2410C] shadow" style={{ width: size * 0.3, height: size * 0.3, fontSize: size * 0.2, background: 'linear-gradient(160deg,#FDE68A,#F59E0B)', transform: 'rotate(8deg)' }}>A</span>
    </span>
);

/**
 * @param {string}  props.badge   the achievement's key (its look), or pass `look`
 * @param {boolean} props.earned  a sparkle when earned
 * @param {number}  props.size    the whole badge, splashes included (84 by default)
 */
export default function GemBadge({ badge, look: given, earned = false, size = 84, index = 0, className = '' }) {
    const id = useId().replace(/:/g, '');
    const look = given || lookOf(badge, index);
    const diamond = look.shape === 'diamond';
    const outline = diamond ? DIAMOND : HEX;
    const frame = size * 0.74;                    // the frame, inside the splashes
    const art = look.art === 'translate' ? <Translate size={frame} /> : <span style={{ fontSize: frame * (diamond ? 0.36 : 0.42), lineHeight: 1, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.25))' }}>{look.art}</span>;
    return (
        <span className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} aria-hidden="true" data-gem={look.shape} data-gem-hue={look.hue}>
            {/* Splashes and stars round the frame. */}
            <svg viewBox="-20 -20 140 140" width={size} height={size} className="absolute inset-0 overflow-visible">
                {SPLASHES.map(([a, len, light], i) => {
                    const r = (a * Math.PI) / 180, d = 60;
                    const x = 50 + d * Math.cos(r), y = 50 + d * Math.sin(r);
                    return <rect key={i} x={x - 2.3} y={y - len / 2} width="4.6" height={len} rx="2.3" fill={look.splash} opacity={light ? 0.45 : 0.85} transform={`rotate(${a + 90} ${x} ${y})`} />;
                })}
                {look.extra === 'stars' && <><Star x={-6} y={76} r={8} fill="#FBBF24" /><Star x={106} y={76} r={8} fill="#FBBF24" /><Star x={104} y={10} r={5} fill="#FDE68A" /></>}
            </svg>
            <svg viewBox="0 0 100 100" width={frame} height={frame} className="relative" style={{ filter: `drop-shadow(0 4px 6px ${look.rim[1]}55)` }}>
                <defs>
                    <linearGradient id={`${id}r`} x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stopColor={look.rim[0]} /><stop offset="1" stopColor={look.rim[1]} /></linearGradient>
                    <radialGradient id={`${id}f`} cx="0.35" cy="0.3" r="0.85"><stop offset="0" stopColor={look.face[0]} /><stop offset="1" stopColor={look.face[1]} /></radialGradient>
                </defs>
                <polygon points={pts(outline)} fill={`url(#${id}r)`} stroke={look.rim[1]} strokeWidth="2" strokeLinejoin="round" />
                <polygon points={pts(scale(outline, 0.8))} fill={`url(#${id}f)`} stroke="#fff" strokeOpacity=".7" strokeWidth="2" strokeLinejoin="round" />
                {diamond && <path d="M50 14 L50 86 M14 50 L86 50" stroke="#fff" strokeOpacity=".25" strokeWidth="1.5" />}
                {/* Gloss across the top. */}
                <polygon points={pts(diamond ? [[50, 14], [86, 50], [68, 50], [50, 32]] : [[50, 13], [83, 32], [83, 44], [50, 30], [17, 44], [17, 32]])} fill="#fff" opacity=".28" />
                {look.extra === 'star' && <Star x={50} y={diamond ? 86 : 88} r={7} fill="#FCD34D" />}
            </svg>
            <span className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: look.extra === 'star' ? size * 0.05 : 0 }}>{art}</span>
            {look.extra === 'crown' && <span className="absolute left-1/2 -translate-x-1/2" style={{ top: -size * 0.06, fontSize: size * 0.2, lineHeight: 1 }}>👑</span>}
            {earned && (
                <svg viewBox="0 0 20 20" width={size * 0.22} height={size * 0.22} className="absolute motion-safe:animate-pulse" style={{ top: size * 0.06, right: size * 0.1 }} data-gem-sparkle>
                    <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="#fff" stroke={look.splash} strokeWidth="1" />
                </svg>
            )}
        </span>
    );
}
