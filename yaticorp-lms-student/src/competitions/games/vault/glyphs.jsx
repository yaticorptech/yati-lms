/** The Final Vault's carved symbols, drawn in gold. */

export function Glyph({ name, className = 'h-full w-full', dim = false }) {
    const gold = dim ? '#8a6a2f' : '#f4c55a';
    const edge = '#5a3a0c';
    const common = { stroke: edge, strokeWidth: 0.8, strokeLinejoin: 'round' };
    return (
        <svg viewBox="0 0 24 24" className={className} aria-label={name} role="img" style={{ filter: dim ? 'none' : 'drop-shadow(0 0 3px rgba(251,191,36,.55))' }}>
            {name === 'star' && <polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6" fill={gold} {...common} />}
            {name === 'moon' && <path d="M15.5 2.5a9.5 9.5 0 1 0 6 16.6A8 8 0 0 1 15.5 2.5z" fill={gold} {...common} />}
            {name === 'sun' && (
                <g>
                    {Array.from({ length: 12 }, (_, i) => <path key={i} d="M12 1.5 L13 5.5 L11 5.5 Z" fill={gold} {...common} transform={`rotate(${i * 30} 12 12)`} />)}
                    <circle cx="12" cy="12" r="5.2" fill={gold} {...common} />
                    <circle cx="12" cy="12" r="2.4" fill="none" stroke={edge} strokeWidth="0.6" />
                </g>
            )}
            {name === 'triangle' && <path d="M12 3 L21.5 20 H2.5 Z M12 7.5 L17.8 17.8 H6.2 Z" fill={gold} fillRule="evenodd" {...common} />}
            {name === 'eye' && <g><path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z" fill={gold} {...common} /><circle cx="12" cy="12" r="3.2" fill={edge} /></g>}
            {name === 'key' && <g><circle cx="8" cy="8" r="4.5" fill="none" stroke={gold} strokeWidth="2.6" /><path d="M11 11 L20 20 M16 16 L18.5 13.5 M18 18 L20.5 15.5" stroke={gold} strokeWidth="2.6" strokeLinecap="round" /></g>}
        </svg>
    );
}
