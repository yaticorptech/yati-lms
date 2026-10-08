/**
 * The Dashboard's welcome: the student's photo and level, a greeting, and how
 * far they are from the next level.
 *
 * The full purple card with the student's details and the ways to change them
 * is My Profile's (pages/Profile.jsx). This one only greets, so it is lighter:
 * a pale card, the name picked out in indigo, and a desk by a window on the
 * right.
 *
 * Every figure is passed in. The XP line is the same levelProgress reading the
 * profile card's mascot uses, so the two pages can never disagree about how
 * far a student is from their next level.
 */
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** A desk by a window: books, a plant, a pencil cup. Drawn rather than
 *  shipped as a picture so it stays sharp at any size and weighs nothing. */
const DeskArt = ({ className = '' }) => (
    <svg viewBox="0 0 260 200" className={className} aria-hidden="true" focusable="false">
        <defs>
            <radialGradient id="wb-sun" cx="0.7" cy="0.25" r="0.7">
                <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wb-desk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f4e9dc" />
                <stop offset="1" stopColor="#ead9c6" />
            </linearGradient>
        </defs>

        {/* The window, and the light through it */}
        <rect x="118" y="0" width="142" height="150" fill="#eef1fb" />
        <g stroke="#dfe4f4" strokeWidth="5">
            <line x1="166" y1="0" x2="166" y2="150" />
            <line x1="216" y1="0" x2="216" y2="150" />
            <line x1="118" y1="72" x2="260" y2="72" />
        </g>
        <rect x="0" y="0" width="260" height="200" fill="url(#wb-sun)" />

        {/* The desk */}
        <rect x="0" y="158" width="260" height="42" fill="url(#wb-desk)" />
        <rect x="0" y="156" width="260" height="4" fill="#efe2d2" />

        {/* Two books */}
        <rect x="30" y="140" width="128" height="17" rx="3" fill="#4f7fe0" />
        <rect x="150" y="142.5" width="6" height="12" rx="1" fill="#ffffff" />
        <rect x="38" y="123" width="114" height="17" rx="3" fill="#7aa3f5" />
        <rect x="144" y="125.5" width="6" height="12" rx="1" fill="#ffffff" />

        {/* The plant, on the books */}
        <g fill="#7cb342">
            <path d="M90 96 C 74 78, 60 66, 52 42 C 72 54, 86 72, 90 96 Z" />
            <path d="M90 96 C 106 78, 122 68, 134 46 C 112 56, 96 74, 90 96 Z" />
        </g>
        <g fill="#9ccc65">
            <path d="M90 96 C 80 72, 76 50, 80 26 C 92 48, 94 72, 90 96 Z" />
            <path d="M90 96 C 100 74, 110 58, 118 36 C 104 50, 94 74, 90 96 Z" />
        </g>
        <g fill="#689f38">
            <path d="M90 96 C 70 90, 54 86, 38 70 C 58 72, 76 80, 90 96 Z" />
            <path d="M90 96 C 108 90, 126 86, 142 74 C 122 74, 104 82, 90 96 Z" />
        </g>
        <rect x="70" y="97" width="40" height="26" rx="6" fill="#f7f6f2" />
        <rect x="66" y="93" width="48" height="8" rx="4" fill="#ffffff" stroke="#ebe7df" />

        {/* Pencils in a cup */}
        <g transform="rotate(-10 204 118)">
            <rect x="199" y="74" width="6" height="46" rx="1" fill="#7c5cff" />
            <path d="M199 74 L202 66 L205 74 Z" fill="#f3d4ae" />
        </g>
        <g transform="rotate(4 212 118)">
            <rect x="209" y="70" width="6" height="50" rx="1" fill="#f59e0b" />
            <path d="M209 70 L212 62 L215 70 Z" fill="#f3d4ae" />
        </g>
        <g transform="rotate(14 220 118)">
            <rect x="218" y="78" width="6" height="42" rx="1" fill="#3b82f6" />
            <path d="M218 78 L221 70 L224 78 Z" fill="#f3d4ae" />
        </g>
        <rect x="192" y="110" width="40" height="48" rx="6" fill="#fbfbfe" stroke="#e7e8f3" />
    </svg>
);

export default function WelcomeBanner({
    name = '', firstName, photo, level, greeting, greetingIcon,
    xpRemaining, percent, xpTo, onViewPhoto
}) {
    const initials = name.trim().split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

    const xp = (
        <>
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl ring-4 ring-white sm:h-12 sm:w-12">🐿️</span>
            <span className="min-w-0 flex-1">
                {/* The level the student is at, first. "260 XP to reach Level 4"
                    named only the next one, and read as though they were on it. */}
                <span className="block text-sm text-slate-700">
                    <strong className="font-bold text-indigo-600">Level {level}</strong>
                    {/* Left out until the admin's level ladder has loaded, rather
                        than claiming "0 XP to the next level" for a moment. */}
                    {xpRemaining != null && (
                        <>
                            <span className="text-slate-400"> · </span>
                            {xpRemaining.toLocaleString('en-IN')} XP to the next level
                        </>
                    )}
                </span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-indigo-100"
                    role="progressbar" aria-label={`Progress through level ${level}`}
                    aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
                    <span className="block h-full rounded-full bg-indigo-600 transition-[width] duration-700" style={{ width: `${percent}%` }} />
                </span>
            </span>
        </>
    );
    // Straight after the greeting, and as wide as the room up to the picture.
    // Under the greeting until there is room beside it (xl, with the sidebar
    // taken off); then straight after it, as wide as the room up to the picture.
    const pill = 'flex w-full items-center gap-3 rounded-2xl border border-indigo-100 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm sm:max-w-lg sm:px-5 sm:py-4 xl:min-w-[18rem] xl:max-w-md xl:flex-1';

    return (
        <section data-welcome aria-label="Welcome"
            className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50 via-white to-amber-50/40 p-5 shadow-sm sm:p-6">
            {/* The soft shape behind the photo */}
            <span aria-hidden="true" className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-100/70" />

            {/* The desk, on screens with room for it, fading in from the left */}
            <DeskArt className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-auto [mask-image:linear-gradient(to_right,transparent,black_35%)] xl:block" />

            {/* xl:pr-44 keeps the row clear of the picture's visible part; its
                left third fades out and may sit behind the pill. */}
            <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-6 xl:pr-44">
                <div className="flex min-w-0 items-center gap-3 min-[400px]:gap-4 sm:gap-6">
                    {/* The photo, in a white ring with a lavender halo */}
                    <div className="relative shrink-0">
                        <button type="button" onClick={photo ? onViewPhoto : undefined} disabled={!photo}
                            aria-label={photo ? 'View your photo' : undefined}
                            className="block rounded-full bg-indigo-100/80 p-1.5 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:cursor-default">
                            <span data-photo className="block h-16 w-16 overflow-hidden rounded-full border-4 border-white bg-indigo-50 min-[400px]:h-20 min-[400px]:w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28">
                                {photo
                                    ? <img src={photo} alt={name} className="h-full w-full object-cover" />
                                    : <span className="flex h-full w-full items-center justify-center text-2xl font-black text-indigo-600">{initials}</span>}
                            </span>
                        </button>
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-indigo-600 shadow-sm ring-4 ring-indigo-50">
                            Lv {level}
                        </span>
                    </div>

                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-sm text-slate-600 sm:text-base">
                            <span aria-hidden="true">{greetingIcon}</span> {greeting},
                        </p>
                        {/* Sized to the screen on a phone. At a fixed 30px a
                            name like "Bhagyashree!" was wider than the room
                            beside the photo on a 360px screen, and broke into
                            "Bhagyashre / e!". 7vw reaches the full 30px by
                            430px, and under 400px the photo is a size smaller
                            to give the name the room: a 13-letter name fits
                            at 344px, "Bhagyashree!" at 320px. break-words
                            stays only as the last resort for a longer one. */}
                        <h1 className="mt-0.5 break-words text-[clamp(1.5rem,7vw,1.875rem)] font-black tracking-tight text-indigo-950 sm:text-4xl">
                            Hello, <span className="text-indigo-600">{firstName}!</span>
                        </h1>
                        <p className="mt-1.5 text-sm text-slate-500 sm:text-base">
                            Keep learning and make progress today! <span aria-hidden="true">🌱</span>
                        </p>
                    </div>
                </div>

                {/* How far to the next level. A link to Career Path, where XP
                    and levels are earned, when that section is switched on. */}
                {xpTo ? (
                    <Link to={xpTo} className={`${pill} transition-colors hover:border-indigo-200 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}>
                        {xp}
                        <ChevronRight size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
                    </Link>
                ) : (
                    <div className={pill}>{xp}</div>
                )}
            </div>
        </section>
    );
}
