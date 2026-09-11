/**
 * The Global Quiz's scenery: the globe-and-books picture in the banner, the
 * soft waves behind the page, and the handwritten note beside the title.
 *
 * All of it is drawn — SVG and CSS, no image files — so it costs nothing to
 * load, scales to any width and follows the violet the rest of the tab uses.
 * None of it carries information the page does not also say in words, so it
 * is hidden from screen readers.
 */

/** The globe with its books and clouds, as the banner's picture. */
export const GlobeScene = ({ className = '' }) => (
    <svg viewBox="0 0 260 170" className={className} aria-hidden="true" focusable="false">
        <defs>
            <radialGradient id="gq-globe" cx="35%" cy="28%" r="80%">
                <stop offset="0%" stopColor="#8fdcff" />
                <stop offset="55%" stopColor="#42b4f0" />
                <stop offset="100%" stopColor="#1f74c8" />
            </radialGradient>
            <linearGradient id="gq-land" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7ed07a" />
                <stop offset="100%" stopColor="#3f9d52" />
            </linearGradient>
            <clipPath id="gq-sphere"><circle cx="150" cy="72" r="56" /></clipPath>
        </defs>

        {/* Clouds, tucked in under the globe */}
        <g fill="#ffffff" opacity="0.92">
            <ellipse cx="104" cy="112" rx="26" ry="15" />
            <ellipse cx="124" cy="106" rx="18" ry="12" />
            <ellipse cx="88" cy="107" rx="14" ry="10" />
            <ellipse cx="228" cy="122" rx="20" ry="12" />
            <ellipse cx="212" cy="126" rx="13" ry="9" />
        </g>

        {/* The globe */}
        <circle cx="150" cy="72" r="56" fill="url(#gq-globe)" />
        <g clipPath="url(#gq-sphere)" fill="url(#gq-land)">
            <path d="M104 40c14-9 30-6 38 3s3 20-8 25-27 3-34-6-8-16 4-22z" />
            <path d="M150 74c16-6 34 2 38 15s-6 27-20 30-28-4-31-16 1-25 13-29z" />
            <path d="M188 30c11-4 24 3 24 13s-11 15-21 13-16-9-14-16 5-9 11-10z" />
            <path d="M96 92c9-3 18 3 18 11s-8 13-16 12-13-7-12-13 4-9 10-10z" />
        </g>
        <circle cx="150" cy="72" r="56" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
        <ellipse cx="131" cy="47" rx="20" ry="11" fill="#ffffff" opacity="0.28" transform="rotate(-24 131 47)" />

        {/* A stack of books at the globe's foot */}
        <g>
            <rect x="176" y="128" width="72" height="14" rx="4" fill="#f5a623" />
            <rect x="176" y="128" width="12" height="14" rx="4" fill="#e08e12" />
            <rect x="182" y="114" width="72" height="14" rx="4" fill="#8b5cf6" />
            <rect x="182" y="114" width="12" height="14" rx="4" fill="#6d38ea" />
            <rect x="172" y="100" width="66" height="14" rx="4" fill="#4f86f7" />
            <rect x="172" y="100" width="12" height="14" rx="4" fill="#2f66d8" />
        </g>

        {/* Sparkles */}
        <g fill="#ffc93c">
            <path d="M74 24l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
            <path d="M232 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
            <path d="M244 72l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        </g>
    </svg>
);

/** The soft rolling shapes behind the banner and the page. */
export const Waves = ({ className = '' }) => (
    <svg viewBox="0 0 1200 220" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
        <path d="M0 96c150-52 280 24 430 12s250-84 400-70 250 92 370 60v122H0z" fill="#ffffff" opacity="0.45" />
        <path d="M0 150c170-46 300 20 450 8s260-70 410-56 220 74 340 46v72H0z" fill="#ffffff" opacity="0.55" />
    </svg>
);

/** A handwritten aside, in the Pacifico the LMS already loads. */
export const ScriptNote = ({ lines, className = '', tilt = -6 }) => (
    <p aria-hidden="true" className={`lb-script pointer-events-none select-none ${className}`} style={{ transform: `rotate(${tilt}deg)` }}>
        {lines.map((line) => <span key={line} className="block">{line}</span>)}
    </p>
);
