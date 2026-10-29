/**
 * The Dashboard's welcome: the student's photo and level, a greeting, and how
 * far they are from the next level.
 *
 * The full purple card with the student's details and the ways to change them
 * is My Profile's (pages/Profile.jsx). This one only greets (redesigned
 * 2026-10-28): a light card in the site's own colours — white, slate text and
 * one accent, indigo — with a soft indigo wash and faint contour lines behind;
 * on the left the photo, the greeting and today's date; on the right the
 * level as a ring with a track to the next and the way to the full progress.
 *
 * Every figure is passed in. The XP line is the same levelProgress reading the
 * profile card's mascot uses, so the two pages can never disagree about how
 * far a student is from their next level.
 */
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import ProfileImage from './ProfileImage';
import './welcomeBanner.css';

const R = 30;
const C = 2 * Math.PI * R;

/**
 * The moving background: sine waves flowing sideways across the card, each
 * at its own height, length and speed, faint and in the one accent colour.
 * They fade almost away behind the greeting, so the words stay clear, and
 * show fully on the right. A wave is drawn one wavelength longer than the card and slides back by
 * exactly one wavelength, so the loop has no seam.
 */
const W = 600;
const WAVES = [
    // [middle y, amplitude, wavelength, seconds per wavelength, stroke opacity, width]
    [50, 10, 200, 7, 0.8, 1.2],
    [85, 14, 300, 11, 0.65, 1],
    [120, 9, 150, 6, 0.85, 1.3],
    [155, 16, 240, 9, 0.6, 1],
    [190, 11, 200, 8, 0.75, 1.2]
];
const sine = (y, amp, len) => {
    let d = `M 0 ${y}`;
    for (let x = 4; x <= W + len; x += 4) d += ` L ${x} ${(y + amp * Math.sin((2 * Math.PI * x) / len)).toFixed(2)}`;
    return d;
};
function Contours() {
    return (
        // Stretched across the whole card, edge to edge; strokes keep their width.
        <svg aria-hidden="true" viewBox={`0 0 ${W} 240`} preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full text-indigo-200 [mask-image:linear-gradient(to_right,rgba(0,0,0,0.25),rgba(0,0,0,0.15)_40%,black_70%)] sm:block">
            {WAVES.map(([y, amp, len, secs, op, sw], i) => (
                <path key={i} className="wb-sine" d={sine(y, amp, len)} fill="none" stroke="currentColor" strokeOpacity={op} strokeWidth={sw}
                    vectorEffect="non-scaling-stroke" style={{ '--wl': `${-len}px`, animationDuration: `${secs}s`, animationDirection: i % 2 ? 'reverse' : 'normal' }} />
            ))}
        </svg>
    );
}

/** Small bubbles rising through the card. */
const BUBBLES = [[8, 0, 10], [22, 3.5, 6], [38, 1.2, 8], [55, 5, 5], [68, 2.4, 9], [82, 4.2, 6], [93, 0.8, 7]];
function Bubbles() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {BUBBLES.map(([left, delay, size]) => (
                <span key={left} className="wb-bubble absolute bottom-[-12px] rounded-full bg-indigo-300/40 ring-1 ring-indigo-300/50"
                    style={{ left: `${left}%`, width: size, height: size, animationDelay: `${delay}s` }} />
            ))}
        </div>
    );
}

/**
 * The level as a ring, the number inside. The words are drawn in the ring's
 * own picture, so they scale with it and always sit clear of the arc,
 * whatever size the ring is shown at.
 */
function LevelRing({ level, percent }) {
    return (
        <svg viewBox="0 0 72 72" className="h-16 w-16 shrink-0 sm:h-[4.5rem] sm:w-[4.5rem]" aria-hidden="true">
            <g transform="rotate(-90 36 36)">
                <circle cx="36" cy="36" r={R} fill="white" stroke="#e0e7ff" strokeWidth="6" />
                <circle className="wb-arc" cx="36" cy="36" r={R} fill="none" stroke="#4f46e5" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - percent / 100)} style={{ '--wb-c': C }} />
            </g>
            <text x="36" y="29" textAnchor="middle" fontSize="7" fontWeight="700" letterSpacing="0.8" fill="#94a3b8">LEVEL</text>
            <text x="36" y="49" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a" style={{ fontVariantNumeric: 'tabular-nums' }}>{level ?? '–'}</text>
        </svg>
    );
}

/** The level panel: the ring, how far to the next level, the track and the link. */
function LevelPanel({ level, percent, xpRemaining, xpTo }) {
    const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
    return (
        <div className="wb-in relative min-w-0 rounded-2xl border border-indigo-100 bg-white/80 p-4 shadow-[0_12px_32px_-20px_rgba(79,70,229,0.45)] backdrop-blur-sm sm:p-5 lg:w-[25rem] lg:shrink-0" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3 sm:gap-4">
                <LevelRing level={level} percent={p} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-500">Progress to level {level == null ? '–' : level + 1}</p>
                    {level == null ? (
                        <span className="skeleton mt-2 block h-6 w-36 max-w-full rounded-md" aria-label="Loading your level" />
                    ) : (
                        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                            <span className="text-2xl font-black tracking-tight text-slate-900 tabular-nums sm:text-3xl">{p}%</span>
                            {/* Left out until the admin's level ladder has loaded, rather than claiming "0 XP" for a moment. */}
                            {xpRemaining != null && <span className="text-sm font-medium text-slate-500"><span className="font-bold text-indigo-600">{xpRemaining.toLocaleString('en-IN')} XP</span> to go</span>}
                        </p>
                    )}
                </div>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-indigo-100 sm:mt-4"
                role="progressbar" aria-label={level == null ? 'Progress through your level' : `Progress through level ${level}`}
                aria-valuemin={0} aria-valuemax={100} aria-valuenow={p}>
                <span className="wb-fill relative block h-full rounded-full bg-indigo-600" style={{ width: `${p}%` }}>
                    <span className="wb-shine absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                </span>
            </div>

            {xpTo && (
                <Link to={xpTo} className="group mt-3 flex items-center justify-between rounded-xl sm:mt-4 bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2">
                    See progress
                    <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
                </Link>
            )}
        </div>
    );
}

export default function WelcomeBanner({
    name = '', firstName, photo, level, greeting, greetingIcon,
    xpRemaining, percent, xpTo, onViewPhoto
}) {
    const initials = name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
    const todayShort = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

    return (
        <section data-welcome aria-label="Welcome"
            className="relative isolate overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white p-4 shadow-sm sm:bg-white sm:bg-none sm:p-7">
            {/* A soft indigo wash, flowing sine waves and rising bubbles — one colour throughout. */}
            <span aria-hidden="true" className="wb-glow pointer-events-none absolute -top-24 -left-20 -z-10 h-72 w-72 rounded-full bg-indigo-100/80 blur-3xl" />
            <span aria-hidden="true" className="wb-glow pointer-events-none absolute -right-16 -bottom-28 -z-10 h-72 w-72 rounded-full bg-indigo-50 blur-3xl" style={{ animationDelay: '-6s' }} />
            <Contours />
            <Bubbles />

            <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                <div className="flex min-w-0 items-center gap-3.5 sm:gap-6">
                    {/* The photo in an indigo ring, with the level on a badge. */}
                    <div className="relative shrink-0">
                        <button type="button" onClick={photo ? onViewPhoto : undefined} disabled={!photo}
                            aria-label={photo ? 'View your photo' : undefined}
                            className="relative block rounded-full bg-white p-1 shadow-[0_0_0_2px_#4f46e5,0_10px_24px_-10px_rgba(79,70,229,0.5)] focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-default">
                            <span data-photo className="block h-16 w-16 overflow-hidden rounded-full bg-indigo-50 min-[400px]:h-20 min-[400px]:w-20 sm:h-24 sm:w-24">
                                <ProfileImage src={photo} alt={name} className="h-full w-full object-cover"
                                    fallback={<span className="flex h-full w-full items-center justify-center text-2xl font-black text-indigo-600">{initials}</span>} />
                            </span>
                        </button>
                        {level != null && (
                            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-0.5 text-[0.65rem] font-black whitespace-nowrap text-white shadow-md ring-2 ring-white">
                                Lv {level}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <p className="wb-in flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold sm:text-sm">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-indigo-700 ring-1 ring-indigo-100 sm:gap-1.5 sm:bg-indigo-50 sm:px-2.5 sm:py-1 sm:ring-0">
                                <span aria-hidden="true">{greetingIcon}</span> {greeting}
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-500"><CalendarDays size={13} aria-hidden="true" /> <span className="sm:hidden">{todayShort}</span><span className="hidden sm:inline">{today}</span></span>
                        </p>
                        {/* Sized to the screen on a phone so a long name like "Bhagyashree" fits beside the photo. */}
                        <h1 className="wb-in mt-1.5 break-words text-[clamp(1.4rem,6.5vw,1.875rem)] leading-tight sm:mt-2 font-black tracking-tight text-slate-900 sm:text-4xl" style={{ animationDelay: '0.08s' }}>
                            Hello, <span className="text-indigo-600">{firstName}</span> <span className="wb-wave inline-block" aria-hidden="true">👋</span>
                        </h1>
                        <p className="wb-in mt-1 max-w-md text-[13px] leading-snug text-slate-500 sm:mt-1.5 sm:text-base" style={{ animationDelay: '0.12s' }}>
                            Keep learning and make progress today!
                        </p>
                    </div>
                </div>

                <LevelPanel level={level} percent={percent} xpRemaining={xpRemaining} xpTo={xpTo} />
            </div>
        </section>
    );
}
