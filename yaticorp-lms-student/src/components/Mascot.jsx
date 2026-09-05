/**
 * @description The YATICORP mascot for the login page: the blue ring icon with
 *              a white face, a waving hand and a fist on the hip, as in the
 *              brand render.
 *
 * If a render exists in the public folder as mascot.png / .jpg / .webp it is
 * shown untouched; otherwise the SVG below stands in. Both float, and the SVG
 * also blinks and waves.
 */
import { useState } from 'react';

// The render is used untouched when it exists in the app's public folder under
// any of these names. The SVG below is only the stand-in when none is found.
const SOURCES = ['/mascot.png', '/mascot.jpg', '/mascot.jpeg', '/mascot.webp'];

export default function Mascot({ className = '' }) {
    const [index, setIndex] = useState(0);

    if (index < SOURCES.length) {
        return (
            <img
                src={SOURCES[index]}
                alt=""
                onError={() => setIndex((i) => i + 1)}
                className={`mascot-img ${className}`}
                draggable={false}
            />
        );
    }

    return (
        <svg viewBox="0 0 320 340" className={`mascot ${className}`} aria-hidden="true">
            <defs>
                <linearGradient id="mc-body" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#5aa8ff" />
                    <stop offset="0.5" stopColor="#2b7de9" />
                    <stop offset="1" stopColor="#1d5fd0" />
                </linearGradient>
                <radialGradient id="mc-face" cx="0.42" cy="0.32" r="0.75">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.7" stopColor="#f3f7ff" />
                    <stop offset="1" stopColor="#d7e3fb" />
                </radialGradient>
                <linearGradient id="mc-gloss" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
                    <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <filter id="mc-shadow" x="-25%" y="-25%" width="150%" height="150%">
                    <feDropShadow dx="0" dy="10" stdDeviation="9" floodColor="#173a8a" floodOpacity="0.32" />
                </filter>
            </defs>

            <ellipse cx="160" cy="328" rx="84" ry="11" fill="#173a8a" opacity="0.16" />

            {/* legs and rounded shoes */}
            <g fill="url(#mc-body)" filter="url(#mc-shadow)">
                <path d="M118 226 c -2 26 -6 50 -12 74 c -1 6 3 10 9 10 h 28 c 6 0 8 -4 8 -10 c 0 -24 1 -48 2 -74 z" />
                <path d="M170 226 c 1 26 2 50 2 74 c 0 6 2 10 8 10 h 28 c 6 0 10 -4 9 -10 c -6 -24 -10 -48 -12 -74 z" />
                <ellipse cx="126" cy="314" rx="30" ry="12" />
                <ellipse cx="198" cy="314" rx="30" ry="12" />
            </g>

            {/* right arm down, fist on the hip */}
            <g fill="url(#mc-body)" filter="url(#mc-shadow)">
                <path d="M234 176 c 22 8 38 26 42 50 c 2 10 -6 16 -14 14 c -8 -2 -10 -8 -12 -16 c -3 -14 -12 -26 -26 -34 z" />
                <circle cx="268" cy="236" r="19" />
            </g>

            {/* the white face sphere, then the ring wrapped around it */}
            <circle cx="158" cy="140" r="86" fill="url(#mc-face)" filter="url(#mc-shadow)" />
            <g filter="url(#mc-shadow)">
                {/* one thick arc from top-right, round the left, back to the right */}
                <path d="M212 62 A 96 96 0 1 0 224 200" fill="none" stroke="url(#mc-body)" strokeWidth="46" strokeLinecap="butt" />
                {/* diagonal cut faces on the two ring ends */}
                <path d="M196 42 l 32 24 l -26 30 l -32 -24 z" fill="url(#mc-body)" />
                <path d="M244 184 l -32 -20 l -22 30 l 34 20 z" fill="url(#mc-body)" />
                {/* gloss on the top of the ring */}
                <path d="M92 110 c 8 -34 36 -58 74 -62 c 8 -1 16 0 24 2 l -6 10 c -6 -1 -12 -2 -18 -1 c -32 3 -56 24 -64 52 z" fill="url(#mc-gloss)" />
            </g>

            {/* left arm raised, waving hand with fingers */}
            <g className="mascot-arm" fill="url(#mc-body)" filter="url(#mc-shadow)">
                <path d="M84 168 c -22 -12 -40 -32 -46 -58 c -2 -10 5 -17 14 -15 c 7 2 10 8 12 15 c 4 20 16 36 32 46 z" />
                <path d="M50 98 c -14 0 -26 -10 -26 -24 c 0 -8 4 -14 10 -18 l 3 -12 c 1 -5 9 -5 10 0 l 2 10 l 5 -10 c 2 -4 9 -3 9 2 l 1 10 l 6 -6 c 4 -3 9 0 8 5 l -1 12 c 2 4 4 8 4 12 c 0 14 -12 19 -31 19 z" />
            </g>

            {/* face */}
            <g className="mascot-face">
                <g className="mascot-eyes">
                    <ellipse cx="134" cy="132" rx="12" ry="16" fill="#0f172a" />
                    <ellipse cx="184" cy="132" rx="12" ry="16" fill="#0f172a" />
                    <circle cx="138" cy="124" r="4.5" fill="#fff" />
                    <circle cx="188" cy="124" r="4.5" fill="#fff" />
                </g>
                <path d="M122 108 c 6 -5 14 -6 20 -3" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
                <path d="M176 105 c 6 -3 14 -2 20 3" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
                <ellipse cx="116" cy="156" rx="12" ry="7" fill="#fda4af" opacity="0.85" />
                <ellipse cx="204" cy="156" rx="12" ry="7" fill="#fda4af" opacity="0.85" />
                <path d="M136 160 c 10 20 36 20 46 0 c -6 28 -40 28 -46 0 z" fill="#0f172a" />
                <path d="M146 170 c 8 5 18 5 26 0 c -5 10 -21 10 -26 0 z" fill="#f43f5e" />
            </g>
        </svg>
    );
}
