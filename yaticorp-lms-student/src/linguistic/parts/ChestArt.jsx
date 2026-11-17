/**
 * The treasure chest stop on the path, drawn (2026-11-14, the user's picture of a golden chest: "make the gift the
 * same"): a gold chest with corner posts, a lid and a keyhole, on a soft grey shadow — shut until opened, then its lid
 * up; grey while the lessons before it are not done. Our own drawing.
 */
export default function ChestArt({ opened = false, locked = false, className = '' }) {
    const lid = opened ? -12 : 0;
    return (
        <svg viewBox="0 0 100 92" className={className} style={locked ? { filter: 'grayscale(1)', opacity: 0.55 } : undefined} aria-hidden="true">
            {/* Its shadow on the path. */}
            <rect x="6" y="56" width="88" height="32" rx="7" fill="#000" opacity="0.12" />
            {/* The body: a gold frame round a brown front, two boards across it. */}
            <rect x="14" y="40" width="72" height="44" rx="4" fill="#E8A934" />
            <rect x="22" y="48" width="56" height="28" rx="2" fill="#8F5B1C" />
            <rect x="22" y="58" width="56" height="3" fill="#7A4C16" />
            <rect x="22" y="68" width="56" height="3" fill="#7A4C16" />
            <rect x="14" y="78" width="72" height="6" rx="2" fill="#D18F22" />
            {opened && <rect x="18" y="38" width="64" height="8" rx="2" fill="#5E3A10" />}
            {/* The lid, its corner posts, and the keyhole plate — raised when opened. */}
            <g transform={`translate(0 ${lid})`}>
                <rect x="10" y="26" width="80" height="16" rx="4" fill="#FFD447" />
                <path d="M10 34 L90 30 L90 34 Q90 42 82 42 L18 42 Q10 42 10 34 Z" fill="#F2BE2E" />
                <rect x="12" y="10" width="15" height="34" rx="3" fill="#FFCF3D" />
                <rect x="73" y="10" width="15" height="34" rx="3" fill="#FFCF3D" />
                <path d="M12 22 L27 14 L27 20 L12 28 Z" fill="#FFE57A" opacity="0.9" />
                <path d="M73 22 L88 14 L88 20 L73 28 Z" fill="#FFE57A" opacity="0.9" />
                {!opened && (
                    <g>
                        <rect x="41" y="27" width="18" height="17" rx="4" fill="#F5C531" stroke="#D99A1C" strokeWidth="1.5" />
                        <circle cx="50" cy="33.5" r="3.2" fill="#7A4C16" />
                        <path d="M48.4 35 L51.6 35 L52.4 40 L47.6 40 Z" fill="#7A4C16" />
                    </g>
                )}
            </g>
        </svg>
    );
}
