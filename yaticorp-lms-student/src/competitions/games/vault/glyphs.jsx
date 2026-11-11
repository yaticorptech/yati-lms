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

/**
 * The same symbols cast solid and bright, as on the bridge in the approved design (2026-11-05): a gold gradient,
 * a thin dark edge, no outlines — big enough to fill a bridge face.
 */
export function BoldGlyph({ name, className = 'h-full w-full' }) {
    const id = `bg-${name}`;
    const fill = `url(#${id})`;
    const edge = { stroke: '#6b4006', strokeWidth: 0.7, strokeLinejoin: 'round' };
    return (
        <svg viewBox="0 0 24 24" className={className} aria-label={name} role="img">
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffe9a0" /><stop offset="55%" stopColor="#ffc93c" /><stop offset="100%" stopColor="#e09412" /></linearGradient>
            </defs>
            {name === 'key' && <path d="M8.5 2.5a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11zm0 3a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM12.3 11.8l1.9-1.9 8 8-1.4 1.4-1.3-1.3-1.6 1.6-1.4-1.4 1.6-1.6-1-1-1.6 1.6-1.4-1.4 1.6-1.6z" fill={fill} {...edge} />}
            {name === 'moon' && <path d="M15.8 2a10 10 0 1 0 6.2 17.2A8.2 8.2 0 0 1 15.8 2z" fill={fill} {...edge} />}
            {name === 'eye' && (
                <g>
                    <path d="M1.5 12C5 6.5 8.5 4.8 12 4.8S19 6.5 22.5 12C19 17.5 15.5 19.2 12 19.2S5 17.5 1.5 12zm10.5-4.6a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2z" fill={fill} {...edge} fillRule="evenodd" />
                    <circle cx="12" cy="12" r="3" fill={fill} {...edge} />
                </g>
            )}
            {name === 'sun' && (
                <g>
                    {Array.from({ length: 12 }, (_, i) => <path key={i} d="M12 0.8 L13.6 5.2 L10.4 5.2 Z" fill={fill} {...edge} transform={`rotate(${i * 30} 12 12)`} />)}
                    <path d="M12 6a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 2.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8z" fill={fill} {...edge} fillRule="evenodd" />
                </g>
            )}
            {name === 'star' && <polygon points="12,1.5 15,8.6 22.6,9.2 16.8,14.1 18.6,21.6 12,17.6 5.4,21.6 7.2,14.1 1.4,9.2 9,8.6" fill={fill} {...edge} />}
            {name === 'triangle' && <path d="M12 2.2 23 21.3H1zm0 5.6L5.6 18.8h12.8z" fill={fill} {...edge} fillRule="evenodd" />}
        </svg>
    );
}
