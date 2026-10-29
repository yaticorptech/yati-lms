/**
 * Language Learning — the little pictures on the tabs (asked 2026-10-29, from a learning app's flow: a picture in
 * each stop, the stops joined by a line, each named in a coloured pill under it): an open book to learn, a
 * dumbbell to practise, a sheet and a pencil to write, a medal for the badges. Drawn here, flat, in a few colours.
 */
const svg = (children) => <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden="true">{children}</svg>;

export function LearnArt() {
    return svg(<>
        <path d="M24 13 C18 9 10 9 5 11 V37 C10 35 18 35 24 39 Z" fill="#5B9BE6" />
        <path d="M24 13 C30 9 38 9 43 11 V37 C38 35 30 35 24 39 Z" fill="#8FBDF5" />
        <path d="M24 13 V39" stroke="#3B6FB8" strokeWidth="2" />
        <path d="M9 18 C13 17 17 17 20 18.5 M9 24 C13 23 17 23 20 24.5 M28 18.5 C31 17 35 17 39 18 M28 24.5 C31 23 35 23 39 24" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.85" />
        <path d="M33 9 H38 V20 L35.5 18 L33 20 Z" fill="#F0605D" />
    </>);
}

export function PracticeArt() {
    return svg(<>
        <rect x="14" y="22" width="20" height="4" rx="2" fill="#9AA3AF" />
        <rect x="7" y="14" width="7" height="20" rx="3" fill="#F08A34" />
        <rect x="34" y="14" width="7" height="20" rx="3" fill="#F08A34" />
        <rect x="3" y="18" width="5" height="12" rx="2.5" fill="#F7B26A" />
        <rect x="40" y="18" width="5" height="12" rx="2.5" fill="#F7B26A" />
        <circle cx="38" cy="9" r="3" fill="#FFC83D" />
        <circle cx="10" cy="40" r="2" fill="#FFC83D" />
    </>);
}

export function WritingArt() {
    return svg(<>
        <rect x="8" y="6" width="26" height="34" rx="4" fill="#ECE7F7" />
        <path d="M13 14 H29 M13 20 H29 M13 26 H23" stroke="#A98BDB" strokeWidth="2.5" strokeLinecap="round" />
        <g transform="rotate(40 33 30)">
            <rect x="29" y="14" width="8" height="24" rx="1.5" fill="#FFC83D" />
            <rect x="29" y="12" width="8" height="5" rx="1.5" fill="#F48FB1" />
            <path d="M29 38 H37 L33 45 Z" fill="#F5D9A8" />
            <path d="M31.6 42.5 H34.4 L33 45 Z" fill="#4B4F63" />
        </g>
    </>);
}

export function BadgesArt() {
    return svg(<>
        <path d="M14 4 H22 L26 18 H18 Z" fill="#5B9BE6" />
        <path d="M34 4 H26 L22 18 H30 Z" fill="#F0605D" />
        <circle cx="24" cy="30" r="13" fill="#FFC83D" />
        <circle cx="24" cy="30" r="9.5" fill="#FFDB6E" />
        <path d="M24 23.5 L26 27.6 L30.5 28.2 L27.2 31.3 L28 35.7 L24 33.6 L20 35.7 L20.8 31.3 L17.5 28.2 L22 27.6 Z" fill="#F2A900" />
    </>);
}

/**
 * A stop of the flow: the picture in a white tile with an orange edge (the tabs', and since 2026-10-29 the
 * dashboard's continue, course and mistakes icons). `count` puts a red number on its corner.
 */
export function ArtTile({ children, count = 0, active = false, className = '', ...rest }) {
    return (
        <span className={`relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[18px] border-4 border-[#F5A524] bg-white p-1.5 shadow-[0_3px_0_rgba(0,0,0,0.08)] transition-transform group-hover:-translate-y-0.5 sm:h-[68px] sm:w-[68px] sm:rounded-[22px] sm:p-2 ${active ? 'scale-110' : ''} ${className}`} {...rest}>
            {children}
            {count > 0 && <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#E8605E] px-1 text-xs font-black text-white ring-2 ring-white" data-count={count}>{count > 99 ? '99+' : count}</span>}
        </span>
    );
}

export function ContinueArt() {
    return svg(<>
        <circle cx="24" cy="24" r="19" fill="#58CC02" />
        <circle cx="24" cy="24" r="19" fill="none" stroke="#46A302" strokeWidth="3" />
        <path d="M19 15 L34 24 L19 33 Z" fill="#fff" strokeLinejoin="round" stroke="#fff" strokeWidth="2" />
        <circle cx="40" cy="8" r="2.5" fill="#FFC83D" /><circle cx="7" cy="40" r="2" fill="#8FBDF5" />
    </>);
}

/** The course: a card with the language's own letter on it (日 for Japanese). */
export function CourseArt({ mark = 'A' }) {
    return svg(<>
        <rect x="6" y="8" width="30" height="34" rx="5" fill="#2D9CDB" />
        <rect x="12" y="6" width="30" height="34" rx="5" fill="#8CCBF2" />
        <rect x="12" y="6" width="30" height="34" rx="5" fill="none" stroke="#2D9CDB" strokeWidth="2" />
        <text x="27" y="30" textAnchor="middle" fontSize="17" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">{mark}</text>
    </>);
}

/** The level found or chosen: three steps going up. */
export function LevelArt() {
    return svg(<>
        <rect x="6" y="28" width="10" height="14" rx="2.5" fill="#8FBDF5" />
        <rect x="19" y="19" width="10" height="23" rx="2.5" fill="#5B9BE6" />
        <rect x="32" y="9" width="10" height="33" rx="2.5" fill="#2D6FD0" />
        <path d="M37 3 L38.4 5.9 L41.6 6.3 L39.3 8.5 L39.9 11.7 L37 10.2 L34.1 11.7 L34.7 8.5 L32.4 6.3 L35.6 5.9 Z" fill="#FFC83D" />
    </>);
}

/** Mistakes to put right: a sheet with a cross and two ticks. */
export function MistakesArt() {
    return svg(<>
        <rect x="8" y="5" width="32" height="38" rx="5" fill="#FDECEC" />
        <path d="M13 13 L18 18 M18 13 L13 18" stroke="#E8605E" strokeWidth="3" strokeLinecap="round" />
        <path d="M13 26 L15.5 28.5 L19 24 M13 36 L15.5 38.5 L19 34" stroke="#58CC02" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M23 15.5 H35 M23 27 H35 M23 37 H31" stroke="#F3A3A1" strokeWidth="3" strokeLinecap="round" />
    </>);
}

/* ── The skills (2026-10-29): a picture for each ──────────────────────── */

/** Vocabulary: word cards. */
export function VocabArt() {
    return svg(<>
        <rect x="5" y="12" width="26" height="30" rx="4" fill="#A6E36B" transform="rotate(-8 18 27)" />
        <rect x="15" y="7" width="27" height="31" rx="4" fill="#58CC02" />
        <text x="28.5" y="28" textAnchor="middle" fontSize="15" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">Aa</text>
    </>);
}

/** Grammar: a sentence of blocks, checked. */
export function GrammarArt() {
    return svg(<>
        <rect x="4" y="16" width="12" height="10" rx="3" fill="#CE82FF" />
        <rect x="18" y="16" width="16" height="10" rx="3" fill="#A568CC" />
        <rect x="36" y="16" width="8" height="10" rx="3" fill="#E4C2FF" />
        <circle cx="34" cy="35" r="8" fill="#58CC02" />
        <path d="M30.5 35 L33 37.5 L37.5 32.5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="4" y="30" width="20" height="4" rx="2" fill="#E4C2FF" />
    </>);
}

/** Speaking: a microphone. */
export function SpeakingArt() {
    return svg(<>
        <rect x="17" y="5" width="14" height="24" rx="7" fill="#FF9600" />
        <path d="M21 11 H27 M21 16 H27" stroke="#FFD08A" strokeWidth="2" strokeLinecap="round" />
        <path d="M11 22 C11 30 16 34 24 34 C32 34 37 30 37 22" stroke="#9AA3AF" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M24 34 V41 M17 42 H31" stroke="#9AA3AF" strokeWidth="3" strokeLinecap="round" />
        <path d="M41 9 C43.5 12 43.5 16 41 19 M6 13 C4.5 15 4.5 17 6 19" stroke="#FFC83D" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </>);
}

/** Translation: two speech bubbles, a letter in each. */
export function TranslationArt() {
    return svg(<>
        <path d="M4 8 H26 A4 4 0 0 1 30 12 V24 A4 4 0 0 1 26 28 H14 L8 33 V28 H8 A4 4 0 0 1 4 24 V12 A4 4 0 0 1 8 8 Z" fill="#FF4B4B" />
        <text x="17" y="23" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">A</text>
        <path d="M22 20 H40 A4 4 0 0 1 44 24 V35 A4 4 0 0 1 40 39 H40 V44 L34 39 H22 A4 4 0 0 1 18 35 V24 A4 4 0 0 1 22 20 Z" fill="#1CB0F6" />
        <text x="31" y="34.5" textAnchor="middle" fontSize="12" fontWeight="900" fill="#fff" fontFamily="system-ui, sans-serif">文</text>
    </>);
}

/** A level's medal, in the level's colour: bright once its certificate is earned. */
export function LevelMedalArt({ color = '#58CC02', earned = false }) {
    return svg(<g opacity={earned ? 1 : 0.55}>
        <path d="M15 3 H23 L27 17 H19 Z" fill="#5B9BE6" />
        <path d="M33 3 H25 L21 17 H29 Z" fill="#F0605D" />
        <circle cx="24" cy="29" r="13" fill={color} />
        <circle cx="24" cy="29" r="9" fill="#fff" opacity="0.35" />
        <path d="M24 22.5 L26 26.6 L30.5 27.2 L27.2 30.3 L28 34.7 L24 32.6 L20 34.7 L20.8 30.3 L17.5 27.2 L22 26.6 Z" fill="#fff" />
    </g>);
}
