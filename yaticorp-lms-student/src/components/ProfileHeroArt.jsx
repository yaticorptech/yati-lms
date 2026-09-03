/**
 * @description The profile hero's illustration: a student with a laptop by
 *              a window, shelf and plants — flat vector, drawn inline so it
 *              is crisp at any size, themed to the LMS purple, and never a
 *              broken image. A few pieces drift gently; nothing loops fast.
 */
export default function ProfileHeroArt({ className = '' }) {
    return (
        <svg viewBox="0 0 420 520" className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pha-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ede9fe" /><stop offset="1" stopColor="#e0e7ff" /></linearGradient>
                <linearGradient id="pha-window" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c7d2fe" /></linearGradient>
                <linearGradient id="pha-laptop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e879f9" /><stop offset="1" stopColor="#c026d3" /></linearGradient>
                <linearGradient id="pha-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a5b4fc" /><stop offset="1" stopColor="#6366f1" /></linearGradient>
                <linearGradient id="pha-hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c3f1d" /><stop offset="1" stopColor="#4a2412" /></linearGradient>
                <clipPath id="pha-clip"><rect x="0" y="0" width="420" height="520" rx="28" /></clipPath>
            </defs>

            <g clipPath="url(#pha-clip)">
                {/* Wall + floor */}
                <rect width="420" height="520" fill="url(#pha-wall)" />
                <path d="M0 400 L420 400 L420 520 L0 520 Z" fill="#c4b5fd" opacity="0.55" />
                <path d="M0 400 L420 400 L420 404 L0 404 Z" fill="#a78bfa" opacity="0.6" />
                <g stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2">
                    <line x1="60" y1="404" x2="30" y2="520" /><line x1="150" y1="404" x2="140" y2="520" /><line x1="250" y1="404" x2="265" y2="520" /><line x1="340" y1="404" x2="370" y2="520" />
                    <line x1="0" y1="450" x2="420" y2="450" /><line x1="0" y1="490" x2="420" y2="490" />
                </g>

                {/* Window */}
                <rect x="250" y="20" width="200" height="300" rx="10" fill="url(#pha-window)" />
                <g stroke="#a5b4fc" strokeWidth="6"><line x1="250" y1="120" x2="450" y2="120" /><line x1="250" y1="220" x2="450" y2="220" /><line x1="350" y1="20" x2="350" y2="320" /></g>
                <rect x="244" y="14" width="212" height="312" rx="12" fill="none" stroke="#818cf8" strokeWidth="8" />
                <path d="M270 40 L330 40" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.8" />

                {/* Shelf with books */}
                <rect x="0" y="248" width="120" height="10" rx="3" fill="#7c3aed" />
                <rect x="0" y="258" width="120" height="6" fill="#5b21b6" opacity="0.7" />
                <g className="pha-books">
                    <rect x="14" y="196" width="54" height="16" rx="3" fill="#4338ca" /><rect x="10" y="212" width="58" height="16" rx="3" fill="#6d28d9" /><rect x="18" y="228" width="50" height="20" rx="3" fill="#7c3aed" />
                    <rect x="20" y="200" width="42" height="3" fill="#a5b4fc" /><rect x="16" y="216" width="46" height="3" fill="#c4b5fd" /><rect x="24" y="234" width="38" height="3" fill="#ddd6fe" />
                </g>
                {/* Picture frame */}
                <rect x="36" y="286" width="46" height="46" rx="4" fill="#fff" stroke="#c2410c" strokeWidth="5" />
                <path d="M44 322 L58 300 L70 314 L76 306 L76 326 L44 326 Z" fill="#a5b4fc" />

                {/* Desk + mug */}
                <rect x="40" y="356" width="330" height="14" rx="4" fill="#ea580c" />
                <rect x="60" y="370" width="8" height="34" fill="#c2410c" /><rect x="340" y="370" width="8" height="34" fill="#c2410c" />
                <rect x="300" y="322" width="36" height="34" rx="6" fill="#4f46e5" />
                <path d="M336 330 q16 0 16 12 q0 12 -16 12" fill="none" stroke="#4f46e5" strokeWidth="6" />
                <path d="M310 312 q4 -8 0 -14 M320 316 q4 -8 0 -14" stroke="#c7d2fe" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />

                {/* Plant on the desk (drifts) */}
                <g className="pha-plant" style={{ transformOrigin: '380px 356px' }}>
                    <rect x="366" y="326" width="30" height="30" rx="8" fill="#e9d5ff" />
                    <path d="M381 328 C 372 300, 350 290, 344 264 C 366 272, 380 296, 381 328 Z" fill="#65a30d" />
                    <path d="M381 328 C 388 296, 404 286, 424 268 C 414 300, 396 316, 381 328 Z" fill="#84cc16" />
                    <path d="M381 330 C 380 300, 386 276, 400 250 C 396 284, 390 310, 381 330 Z" fill="#4d7c0f" />
                </g>
                {/* Floor plant, left */}
                <g className="pha-plant-2" style={{ transformOrigin: '52px 470px' }}>
                    <path d="M52 468 C 30 440, 8 430, 0 400 C 30 412, 48 436, 52 468 Z" fill="#16a34a" />
                    <path d="M54 470 C 62 430, 84 414, 110 398 C 92 432, 74 452, 54 470 Z" fill="#22c55e" />
                    <path d="M53 470 C 44 444, 46 418, 60 390 C 62 424, 58 448, 53 470 Z" fill="#15803d" />
                </g>
                <path d="M20 470 L86 470 L80 520 L26 520 Z" fill="#f5f3ff" stroke="#c4b5fd" strokeWidth="3" />

                {/* Person */}
                {/* skirt */}
                <path d="M120 520 L128 372 Q170 356 214 372 L226 520 Z" fill="#312e81" />
                <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2"><path d="M136 420 L212 420 M132 470 L216 470 M150 372 L146 520 M178 366 L180 520 M200 372 L206 520" /></g>
                <g fill="#0f172a"><circle cx="178" cy="392" r="3" /><circle cx="179" cy="420" r="3" /><circle cx="180" cy="448" r="3" /><circle cx="181" cy="476" r="3" /><circle cx="182" cy="504" r="3" /></g>
                {/* torso */}
                <path d="M132 380 C 124 320, 132 272, 170 262 C 208 272, 218 320, 212 380 Z" fill="url(#pha-top)" />
                <circle cx="170" cy="292" r="3" fill="#fff" /><circle cx="170" cy="306" r="3" fill="#fff" />
                {/* neck + head */}
                <rect x="160" y="238" width="20" height="30" rx="8" fill="#f1c9a5" />
                <ellipse cx="172" cy="214" rx="34" ry="38" fill="#f6d2b0" />
                {/* hair back */}
                <path d="M138 214 C 128 260, 130 300, 148 318 C 154 296, 150 262, 154 236 Z" fill="url(#pha-hair)" />
                <path d="M206 214 C 216 262, 216 302, 198 322 C 192 298, 196 262, 192 236 Z" fill="url(#pha-hair)" />
                {/* hair top */}
                <path d="M136 210 C 134 168, 160 156, 178 158 C 204 160, 214 184, 208 214 C 200 196, 190 190, 178 192 C 164 194, 150 200, 136 210 Z" fill="url(#pha-hair)" />
                {/* face */}
                <ellipse cx="160" cy="216" rx="3" ry="4.5" fill="#1f2937" /><ellipse cx="184" cy="214" rx="3" ry="4.5" fill="#1f2937" />
                <path d="M156 206 q5 -4 10 -1 M180 204 q5 -3 10 0" stroke="#1f2937" strokeWidth="2" strokeLinecap="round" fill="none" />
                <path d="M164 232 q8 6 16 -1" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                <circle cx="152" cy="226" r="5" fill="#fb7185" opacity="0.5" /><circle cx="192" cy="224" r="5" fill="#fb7185" opacity="0.5" />
                {/* arms */}
                <path d="M134 300 C 112 316, 108 336, 128 350 L 176 348 L 176 330 L 146 330 C 140 322, 144 312, 150 306 Z" fill="url(#pha-top)" />
                <path d="M208 300 C 232 314, 240 334, 224 350 L 176 348 L 176 330 L 202 330 C 206 322, 204 312, 198 306 Z" fill="url(#pha-top)" />
                <ellipse cx="132" cy="350" rx="10" ry="7" fill="#f1c9a5" /><ellipse cx="226" cy="350" rx="10" ry="7" fill="#f1c9a5" />
                {/* laptop */}
                <path d="M120 352 L 246 352 L 258 344 L 132 344 Z" fill="#a21caf" />
                <path d="M132 344 L 258 344 L 292 246 L 166 246 Z" fill="url(#pha-laptop)" />
                <path d="M144 340 L 252 340 L 282 252 L 174 252 Z" fill="#f0abfc" opacity="0.35" />
                <path d="M228 286 a10 10 0 1 0 0.1 0 M232 290 a7 7 0 1 1 -0.1 0" fill="#fdf4ff" opacity="0.9" />
                <path d="M110 352 L 262 352 Q 264 362, 256 362 L 116 362 Q 108 362, 110 352 Z" fill="#701a75" />

                {/* Sparkles */}
                <g className="pha-spark" fill="#fbbf24"><path d="M300 200 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" /></g>
                <g className="pha-spark-2" fill="#f472b6"><path d="M110 120 l3 7 l7 3 l-7 3 l-3 7 l-3 -7 l-7 -3 l7 -3 Z" /></g>
            </g>
        </svg>
    );
}
