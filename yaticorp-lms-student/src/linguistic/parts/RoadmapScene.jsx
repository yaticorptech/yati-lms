/**
 * Language Learning — the roadmap as a road over green hills (asked 2026-10-27, "make it like this
 * picture"): Start at the signpost, five days of the plan along the road (today's lit up in purple,
 * the ones passed in light purple), and the goal — a trophy and a flag — on the mountain at the end.
 * Drawn on a 1000 × 300 grid; the day labels are laid over it, so they keep their size on a phone.
 */
import { useId } from 'react';
import { markedDays } from './plan';

const W = 1000, H = 300;
/** Where the five days stand on the road, start to end. */
const MARKS = [[250, 236], [410, 206], [560, 232], [705, 206], [835, 228]];
const ROAD = 'M 60 252 C 150 252, 190 236, 250 236 S 340 206, 410 206 S 500 232, 560 232 S 640 206, 705 206 S 790 228, 835 228 S 885 190, 905 122';


const Tree = ({ x, y, s = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
        <rect x="-4" y="-6" width="8" height="26" rx="3" fill="#9A6B43" />
        <ellipse cx="0" cy="-26" rx="20" ry="26" fill="#4CB84C" />
        <ellipse cx="-6" cy="-34" rx="9" ry="12" fill="#7AD66A" opacity=".8" />
    </g>
);
const Bush = ({ x, y, s = 1 }) => (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#46A93F">
        <ellipse cx="-12" cy="0" rx="12" ry="9" /><ellipse cx="0" cy="-5" rx="13" ry="12" fill="#58BD4C" /><ellipse cx="13" cy="0" rx="11" ry="8" />
    </g>
);

/**
 * @param {number} props.day   today's day of the plan
 * @param {number} props.days  the plan's length in days
 */
export default function RoadmapScene({ day, days }) {
    const id = useId().replace(/:/g, '');
    const marks = markedDays(Math.max(1, days)).slice(0, MARKS.length);
    const today = Math.min(Math.max(1, day), days);
    // Today's marker: the last day marked that has come.
    const at = marks.reduce((k, d, i) => (d <= today ? i : k), 0);
    const spots = marks.map((d, i) => ({ d, x: MARKS[i][0], y: MARKS[i][1], state: i < at ? 'passed' : i === at ? 'today' : 'ahead' }));
    return (
        <div className="relative mt-4 overflow-hidden rounded-2xl" style={{ aspectRatio: `${W} / ${H}` }} data-roadmap-scene={today}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
                <defs>
                    <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F3F8FF" /><stop offset="1" stopColor="#E6F6FF" /></linearGradient>
                    <linearGradient id={`${id}far`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C9F0C0" /><stop offset="1" stopColor="#A9E39A" /></linearGradient>
                    <linearGradient id={`${id}near`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#A7E58A" /><stop offset="1" stopColor="#6FC24E" /></linearGradient>
                    <linearGradient id={`${id}hill`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7FD36A" /><stop offset="1" stopColor="#2E9E5B" /></linearGradient>
                    <radialGradient id={`${id}glow`}><stop offset="0" stopColor="#A78BFA" stopOpacity=".55" /><stop offset="1" stopColor="#A78BFA" stopOpacity="0" /></radialGradient>
                </defs>
                <rect width={W} height={H} fill={`url(#${id}sky)`} />
                {/* Hills far, the mountain of the goal, hills near. */}
                <path d="M0 200 C 120 150, 230 170, 330 185 S 520 150, 640 172 S 820 150, 1000 165 L1000 300 L0 300 Z" fill={`url(#${id}far)`} />
                <path d="M780 300 L 880 112 C 893 92, 917 92, 930 112 L 1000 222 L1000 300 Z" fill={`url(#${id}hill)`} />
                <path d="M880 112 C 893 92, 917 92, 930 112 L 918 124 L 905 114 L 892 126 Z" fill="#fff" opacity=".9" />
                <path d="M0 238 C 140 210, 260 230, 380 228 S 600 206, 720 226 S 860 214, 1000 236 L1000 300 L0 300 Z" fill={`url(#${id}near)`} />
                {/* The road, white with a dashed middle. */}
                <path d={ROAD} fill="none" stroke="#DCE6F0" strokeWidth="34" strokeLinecap="round" />
                <path d={ROAD} fill="none" stroke="#fff" strokeWidth="28" strokeLinecap="round" />
                <path d={ROAD} fill="none" stroke="#C3CEDC" strokeWidth="3" strokeDasharray="14 12" strokeLinecap="round" />
                <Tree x={185} y={196} s={0.95} /><Tree x={482} y={176} s={0.9} /><Tree x={640} y={180} s={0.85} /><Tree x={965} y={252} s={0.8} />
                <Bush x={130} y={284} /><Bush x={455} y={272} s={0.9} /><Bush x={760} y={270} s={0.85} /><Bush x={310} y={276} s={0.7} />
                <ellipse cx="600" cy="282" rx="22" ry="12" fill="#A9B3C2" /><ellipse cx="594" cy="278" rx="10" ry="6" fill="#C7CFDA" />
                {/* Start: a wooden signpost. */}
                <g transform="translate(70 172) rotate(-8)">
                    <rect x="22" y="22" width="12" height="78" rx="4" fill="#A86B3C" />
                    <path d="M -18 0 L 92 -6 L 116 18 L 94 42 L -16 46 Z" fill="#F7A246" stroke="#D9772A" strokeWidth="3" strokeLinejoin="round" />
                    <text x="46" y="31" textAnchor="middle" fontSize="34" fontWeight="900" fill="#5B3416" fontFamily="Nunito, system-ui, sans-serif">Start</text>
                </g>
                {/* The goal: a trophy at the top and a red flag. */}
                <g transform="translate(905 22)">
                    {[[-44, 10, -26, 22], [44, 10, 26, 22], [0, -14, 0, 2], [-30, -6, -18, 8], [30, -6, 18, 8]].map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FBBF24" strokeWidth="5" strokeLinecap="round" />)}
                    <text x="0" y="80" textAnchor="middle" fontSize="62">🏆</text>
                </g>
                <g transform="translate(936 104)">
                    <rect x="-3" y="-14" width="5" height="60" rx="2" fill="#8B5E3C" />
                    <path d="M 2 -14 L 62 -2 L 52 14 L 60 30 L 2 24 Z" fill="#F43F5E" />
                    <text x="28" y="14" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" fontFamily="Nunito, system-ui, sans-serif" transform="rotate(8 28 10)">Goal</text>
                </g>
                {/* The days along the road. */}
                {spots.map(({ d, x, y, state }) => (
                    <g key={d}>
                        {state === 'today' && <>
                            <circle cx={x} cy={y} r="34" fill={`url(#${id}glow)`} />
                            {[-50, -20, 10].map((a) => <line key={a} x1={x + 26 * Math.sin((a * Math.PI) / 180)} y1={y - 26 * Math.cos((a * Math.PI) / 180)} x2={x + 36 * Math.sin((a * Math.PI) / 180)} y2={y - 36 * Math.cos((a * Math.PI) / 180)} stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" />)}
                        </>}
                        <circle cx={x} cy={y} r={state === 'today' ? 17 : 14} fill="#fff" stroke={state === 'today' ? '#7C3AED' : state === 'passed' ? '#C4B5FD' : '#C7CFDA'} strokeWidth={state === 'today' ? 8 : 6} />
                        <circle cx={x} cy={y} r={state === 'today' ? 6 : 5} fill={state === 'ahead' ? '#E2E8F0' : '#EDE9FE'} />
                    </g>
                ))}
            </svg>
            {/* The day labels, over their markers. */}
            {spots.map(({ d, x, y, state }) => (
                <span key={d} className="absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg px-2 py-0.5 text-[11px] font-extrabold shadow-sm sm:text-xs"
                    style={{ left: `${(x / W) * 100}%`, top: `${((y - 26) / H) * 100}%`, background: state === 'today' ? '#7C3AED' : '#EEF1FA', color: state === 'today' ? '#fff' : '#334155' }}
                    data-roadmap-day={d} data-state={state}>
                    Day {d}
                </span>
            ))}
        </div>
    );
}
