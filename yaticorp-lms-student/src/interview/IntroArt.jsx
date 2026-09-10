/**
 * The welcome screen's scenery: the interviewer robot at its laptop, the
 * note it is saying, the little checklist pinned beside it, and the three
 * chips that say what a mock interview gives you.
 *
 * Everything is drawn in SVG and CSS rather than shipped as an image, so it
 * costs nothing to load and stays sharp at any size. It repeats nothing the
 * page does not also say in words, so it is hidden from screen readers.
 */
import { Mic, MessageSquareText, BarChart3, Check } from 'lucide-react';

/** The interviewer: headphones on, at a laptop, pleased to see you. */
const Robot = ({ className = '' }) => (
    <svg viewBox="0 0 220 210" className={className} aria-hidden="true" focusable="false">
        <defs>
            <linearGradient id="iv-shell" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#ddd6fe" />
            </linearGradient>
            <linearGradient id="iv-cup" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="iv-lid" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ede9fe" />
                <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
        </defs>

        {/* The soft violet ground it sits on */}
        <ellipse cx="110" cy="186" rx="74" ry="14" fill="#ede9fe" />

        {/* Antenna */}
        <line x1="110" y1="34" x2="110" y2="18" stroke="#8b5cf6" strokeWidth="4" strokeLinecap="round" />
        <circle cx="110" cy="13" r="7" fill="#7c3aed" />

        {/* Head, with the face screen */}
        <rect x="60" y="32" width="100" height="82" rx="30" fill="url(#iv-shell)" stroke="#c4b5fd" strokeWidth="2" />
        <rect x="72" y="44" width="76" height="58" rx="24" fill="#1e1b3a" />
        <path d="M92 76c3-8 13-8 16 0" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M120 76c3-8 13-8 16 0" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Headphones */}
        <path d="M56 74a54 54 0 0 1 108 0" stroke="#a78bfa" strokeWidth="8" fill="none" strokeLinecap="round" />
        <rect x="42" y="60" width="26" height="42" rx="13" fill="url(#iv-cup)" />
        <rect x="152" y="60" width="26" height="42" rx="13" fill="url(#iv-cup)" />

        {/* Shoulders */}
        <path d="M74 118h72c16 0 28 12 28 27v13H46v-13c0-15 12-27 28-27z" fill="url(#iv-shell)" stroke="#c4b5fd" strokeWidth="2" />

        {/* The laptop it is working at, with a hand either side */}
        <path d="M76 130h68l14 30H62z" fill="url(#iv-lid)" stroke="#a78bfa" strokeWidth="2" strokeLinejoin="round" />
        <rect x="58" y="160" width="104" height="11" rx="5.5" fill="#c4b5fd" />
        <circle cx="58" cy="152" r="11" fill="#ffffff" stroke="#c4b5fd" strokeWidth="2" />
        <circle cx="162" cy="152" r="11" fill="#ffffff" stroke="#c4b5fd" strokeWidth="2" />
        <path d="M110 136l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5z" fill="#ffffff" />
    </svg>
);

/**
 * The whole picture. The three pieces are placed against the box rather than
 * stacked, so the note sits clear above the robot's head and the checklist
 * meets it only at the shoulder, whatever the box is scaled to.
 */
export const BotScene = ({ className = '' }) => (
    <div className={`relative h-[230px] w-[340px] ${className}`} aria-hidden="true">
        {/* What it is saying */}
        <div className="absolute left-0 top-0 w-[126px] rounded-[1.4rem] rounded-bl-md bg-violet-100/90 px-3.5 py-3 text-center">
            <p className="lb-script text-[14px] leading-tight text-violet-600">Ready<br />when you are!</p>
        </div>
        <span className="absolute left-[-12px] top-4 h-[3px] w-4 -rotate-45 rounded-full bg-violet-300" />
        <span className="absolute left-[-6px] top-9 h-[3px] w-3 rotate-[-20deg] rounded-full bg-violet-300" />

        {/* The interviewer, sitting on the floor of the box */}
        <Robot className="absolute bottom-0 left-[68px] h-[168px] w-auto" />

        {/* The checklist pinned beside it */}
        <div className="absolute right-0 top-0 w-[118px] rotate-3 rounded-2xl bg-white px-3 py-2.5 shadow-md shadow-violet-200/70">
            <span className="absolute -top-1.5 right-6 h-3 w-10 rounded-full bg-violet-400" />
            <ul className="space-y-2">
                {['Practice', 'Learn', 'Get Better'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-[12px] font-bold text-slate-700">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600"><Check size={12} strokeWidth={3.5} /></span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

/** What a mock interview gives you, in three chips under the welcome. */
const FEATURES = [
    { icon: Mic, title: 'Speak naturally', sub: 'Like a real interview', tile: 'bg-violet-100 text-violet-600' },
    { icon: MessageSquareText, title: 'Get instant feedback', sub: 'After each answer', tile: 'bg-sky-100 text-sky-600' },
    { icon: BarChart3, title: 'Improve continuously', sub: 'With AI insights', tile: 'bg-emerald-100 text-emerald-600' }
];

export const FeatureRow = ({ className = '' }) => (
    <ul className={`grid gap-4 sm:grid-cols-3 ${className}`}>
        {FEATURES.map(({ icon: Icon, title, sub, tile }) => (
            <li key={title} className="flex items-center gap-3">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tile}`}><Icon size={21} /></span>
                <span className="min-w-0">
                    <span className="block text-sm font-black text-slate-900">{title}</span>
                    <span className="block text-xs text-slate-500">{sub}</span>
                </span>
            </li>
        ))}
    </ul>
);
