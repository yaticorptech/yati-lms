/**
 * The part-time banner's picture: someone at a laptop, a plant on the desk,
 * and the note above them.
 *
 * Drawn in SVG and CSS rather than shipped as an image, so it costs nothing
 * to load and stays sharp at any width. It says nothing the banner does not
 * also say in words, so it is hidden from screen readers.
 */

const SKIN = '#f0c3a4';
const HAIR = '#2b2a45';
const SWEATER = '#8b7bf0';
const SWEATER_DARK = '#7565e8';
const DESK = '#2b2a45';

/** Someone working at a laptop, with a plant for company. */
const Worker = ({ className = '' }) => (
    <svg viewBox="0 0 280 190" className={className} aria-hidden="true" focusable="false">
        {/* A frond behind the laptop, on the left */}
        <g fill="#6d5fd6">
            <path d="M44 176c0-16 5-28 12-34-1 11 0 23 3 34z" />
            <path d="M56 176c-6-15-6-28-3-36 5 10 10 21 12 36z" />
            <path d="M68 176c-1-16 2-28 8-34-2 11-3 23-2 34z" />
        </g>

        {/* The person */}
        <g>
            {/* The bun, sitting above the head */}
            <circle cx="208" cy="28" r="12" fill={HAIR} />
            {/* Hair mass, with the face drawn over it so it frames rather than hides */}
            <ellipse cx="196" cy="64" rx="28" ry="31" fill={HAIR} />
            <ellipse cx="196" cy="72" rx="21" ry="24" fill={SKIN} />
            {/* A fringe across the forehead */}
            <path d="M175 62c2-11 10-17 21-17s19 6 21 17c-6-6-13-9-21-9s-15 3-21 9z" fill={HAIR} />
            {/* Ears */}
            <circle cx="175" cy="74" r="4" fill={SKIN} />
            <circle cx="217" cy="74" r="4" fill={SKIN} />

            <circle cx="189" cy="72" r="2.6" fill={HAIR} />
            <circle cx="203" cy="72" r="2.6" fill={HAIR} />
            <path d="M192 82c2.5 2.5 6.5 2.5 9 0" stroke={HAIR} strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <circle cx="182" cy="80" r="3.5" fill="#f0a48f" opacity="0.55" />
            <circle cx="210" cy="80" r="3.5" fill="#f0a48f" opacity="0.55" />

            {/* Neck, then the sweater with arms reaching to the keys */}
            <rect x="188" y="90" width="16" height="14" rx="6" fill={SKIN} />
            <path d="M180 100h32c16 0 28 12 28 28v48h-88v-48c0-16 12-28 28-28z" fill={SWEATER} />
            <path d="M156 148c8-12 19-18 32-18v20c-13 0-23 5-32 14z" fill={SWEATER_DARK} />
            <path d="M236 148c-6-10-14-16-24-18v20c9 2 17 6 24 12z" fill={SWEATER_DARK} />
        </g>

        {/* The laptop */}
        <path d="M116 108h84a6 6 0 0 1 6 6v46h-96v-46a6 6 0 0 1 6-6z" fill={DESK} />
        <circle cx="158" cy="134" r="6" fill="#4a4870" />
        <path d="M100 160h116l10 12H90z" fill="#3a3960" />
        <rect x="88" y="170" width="140" height="6" rx="3" fill={DESK} />
        {/* Hands resting on it */}
        <ellipse cx="106" cy="158" rx="9" ry="6" fill={SKIN} />
        <ellipse cx="210" cy="158" rx="9" ry="6" fill={SKIN} />

        {/* The plant */}
        <g>
            <path d="M258 152c-6-14-5-27 2-34 4 11 5 23 3 34z" fill="#3f7d5b" />
            <path d="M248 152c-11-9-15-21-13-30 8 7 15 17 19 30z" fill="#4e9a6c" />
            <path d="M268 152c8-9 12-20 10-28-7 7-13 16-16 28z" fill="#4e9a6c" />
            <path d="M244 152h32l-4 24h-24z" fill="#d98a5f" />
            <rect x="242" y="148" width="36" height="8" rx="4" fill="#e29a70" />
        </g>

        {/* The desk they are all sitting on */}
        <rect x="0" y="176" width="280" height="6" rx="3" fill="#d7d2f5" />
    </svg>
);

/** The picture, with the note the worker is thinking. */
export const WorkerScene = ({ className = '' }) => (
    <div className={`relative h-[190px] w-[360px] ${className}`} aria-hidden="true">
        <div className="absolute left-2 top-2 z-10 w-[132px] -rotate-2 rounded-2xl rounded-br-md bg-white px-4 py-3 shadow-sm">
            <p className="lb-script text-[13px] leading-tight text-slate-800">Good opportunities start here!</p>
        </div>
        <span className="absolute left-[128px] top-0 h-[3px] w-4 -rotate-[35deg] rounded-full bg-orange-400" />
        <span className="absolute left-[140px] top-4 h-[3px] w-4 rotate-[6deg] rounded-full bg-orange-400" />
        <span className="absolute left-[134px] top-9 h-[3px] w-4 rotate-[45deg] rounded-full bg-orange-400" />
        <Worker className="absolute bottom-0 right-0 h-[190px] w-auto" />
    </div>
);
